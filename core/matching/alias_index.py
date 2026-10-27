import json
import os
import re
from typing import Dict, List, Set, Any, Optional

HONORIFICS_REGEX = re.compile(r'^(?:DR|PROF|PROFESSOR|MR|MS|MRS)\.?\s+', re.IGNORECASE)

COMMON_GENERIC_TOKENS = {
    "KUMAR", "SINGH", "SHARMA", "BASKAR", "CHANDRA", "SARKAR", "RAO", "REDDY",
    "PATEL", "GUPTA", "VERMA", "MISHRA", "DAS", "DUTTA", "ROY", "SEN", "BOSE"
}

class AliasIndex:
    """
    Builds and manages an alias search index for canonical faculty members.
    Includes full names, initials permutations, honorific-stripped forms,
    and tracks aliases shared by multiple faculty.
    """
    def __init__(
        self,
        faculty_json_path: str = "data/processed/faculty.json",
        offerings_json_path: str = "data/processed/offerings.json",
        alias_overrides_path: str = "data/manual/alias_overrides.json"
    ):
        self.faculty_map: Dict[str, Dict[str, Any]] = {}
        self.faculty_context: Dict[str, Dict[str, Set[str]]] = {}
        self.alias_to_faculty: Dict[str, Set[str]] = {}
        self.shared_aliases: Set[str] = set()

        self._load_faculty(faculty_json_path)
        self._load_offerings(offerings_json_path)
        self._build_aliases()
        self._load_alias_overrides(alias_overrides_path)
        self._identify_shared_aliases()

    def _load_faculty(self, path: str) -> None:
        if not os.path.exists(path):
            return
        with open(path, "r", encoding="utf-8") as f:
            faculty_list = json.load(f)
            for fac in faculty_list:
                if not fac.get("is_placeholder"):
                    self.faculty_map[fac["id"]] = fac
                    self.faculty_context[fac["id"]] = {
                        "courses": set(),
                        "slots": set(),
                        "venues": set()
                    }

    def _load_offerings(self, path: str) -> None:
        if not os.path.exists(path):
            return
        with open(path, "r", encoding="utf-8") as f:
            offerings = json.load(f)
            for off in offerings:
                fac_id = off.get("faculty_id")
                if fac_id in self.faculty_context:
                    if off.get("course_code"):
                        self.faculty_context[fac_id]["courses"].add(off["course_code"].upper())
                    for s in off.get("theory_slots", []):
                        self.faculty_context[fac_id]["slots"].add(s.upper())
                    lab = off.get("lab_session")
                    if lab and lab.get("labels"):
                        for l in lab["labels"]:
                            self.faculty_context[fac_id]["slots"].add(l.upper())
                    if off.get("venue"):
                        self.faculty_context[fac_id]["venues"].add(off["venue"].upper())

    def _clean_token(self, s: str) -> str:
        return re.sub(r'[^A-Z0-9]', '', s.upper())

    def _build_aliases(self) -> None:
        for fac_id, fac in self.faculty_map.items():
            cname = fac.get("canonical_name", "").strip().upper()
            if not cname:
                continue

            # Strip honorifics
            clean_name = HONORIFICS_REGEX.sub('', cname).strip()
            tokens = [self._clean_token(t) for t in clean_name.split() if self._clean_token(t)]

            if not tokens:
                continue

            aliases: Set[str] = set()

            # 1. Full canonical string
            aliases.add(clean_name)
            aliases.add(" ".join(tokens))
            aliases.add("".join(tokens))

            # 2. Token classification: single-letter initials vs word tokens
            words = [t for t in tokens if len(t) > 1]
            initials = [t for t in tokens if len(t) == 1]

            # 3. Words only (e.g. "VIJAYAKUMAR" from "VIJAYAKUMAR K P")
            if words:
                word_phrase = " ".join(words)
                aliases.add(word_phrase)
                if len(words) == 1 and len(words[0]) >= 4:
                    aliases.add(words[0])
                elif len(words) > 1:
                    for w in words:
                        if len(w) >= 4:
                            aliases.add(w)

            # 4. Initials combinations: "K P VIJAYAKUMAR", "KP VIJAYAKUMAR", "VIJAYAKUMAR KP"
            if initials and words:
                init_joined = "".join(initials)
                init_spaced = " ".join(initials)
                w_str = " ".join(words)
                aliases.add(f"{init_joined} {w_str}")
                aliases.add(f"{init_spaced} {w_str}")
                aliases.add(f"{w_str} {init_joined}")
                aliases.add(f"{w_str} {init_spaced}")

            # Register aliases
            for al in aliases:
                norm_al = re.sub(r'\s+', ' ', al).strip().upper()
                if len(norm_al) >= 3:
                    if norm_al not in self.alias_to_faculty:
                        self.alias_to_faculty[norm_al] = set()
                    self.alias_to_faculty[norm_al].add(fac_id)

    def _load_alias_overrides(self, path: str) -> None:
        if not os.path.exists(path):
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                overrides = json.load(f)
                for fac_id, custom_aliases in overrides.items():
                    if fac_id in self.faculty_map:
                        for ca in custom_aliases:
                            norm_ca = re.sub(r'\s+', ' ', ca).strip().upper()
                            if norm_ca:
                                if norm_ca not in self.alias_to_faculty:
                                    self.alias_to_faculty[norm_ca] = set()
                                self.alias_to_faculty[norm_ca].add(fac_id)
        except Exception:
            pass

    def _identify_shared_aliases(self) -> None:
        self.shared_aliases = {
            alias for alias, fac_ids in self.alias_to_faculty.items() if len(fac_ids) > 1 or alias in COMMON_GENERIC_TOKENS
        }

    def get_candidates_for_alias(self, alias: str) -> Set[str]:
        norm = re.sub(r'[^A-Z0-9\s]', ' ', alias.upper())
        norm = re.sub(r'\s+', ' ', norm).strip()
        return self.alias_to_faculty.get(norm, set())

    def is_shared(self, alias: str) -> bool:
        norm = re.sub(r'[^A-Z0-9\s]', ' ', alias.upper())
        norm = re.sub(r'\s+', ' ', norm).strip()
        return norm in self.shared_aliases

    def get_faculty_context(self, fac_id: str) -> Dict[str, Set[str]]:
        return self.faculty_context.get(fac_id, {"courses": set(), "slots": set(), "venues": set()})
