import difflib
import json
import os
import re
from typing import Dict, List, Set, Any, Optional, Tuple

from core.matching.alias_index import AliasIndex

INITIAL_SEARCH_REGEX = re.compile(r'\b([A-Z])(?:\.|\s+([A-Z]))?\b')

class FacultyMatcher:
    """
    Matches candidate student reviews to canonical faculty members.
    Uses exact aliases, fuzzy token matching, offering context (courses/slots/venues),
    penalizes shared aliases, detects conflicting initials, and respects manual overrides.
    """
    def __init__(
        self,
        alias_index: Optional[AliasIndex] = None,
        match_overrides_path: str = "data/manual/match_overrides.json"
    ):
        self.index = alias_index or AliasIndex()
        self.match_overrides: Dict[str, Dict[str, Any]] = {}
        self.overrides_path = match_overrides_path
        self._load_match_overrides(match_overrides_path)

    def _load_match_overrides(self, path: str) -> None:
        if not os.path.exists(path):
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                self.match_overrides = json.load(f)
        except Exception:
            pass

    def _extract_initials_for_faculty(self, fac: Dict[str, Any]) -> Set[str]:
        cname = fac.get("canonical_name", "").upper()
        tokens = cname.split()
        return {t for t in tokens if len(t) == 1 and t.isalpha()}

    def _detect_conflicting_initials(self, text_upper: str, matched_token: str, faculty_initials: Set[str]) -> bool:
        """
        If text contains initials immediately preceding or following matched_token
        (e.g. 'Revathi A R' or 'Dr. A R Revathi') that do not overlap with faculty's initials.
        """
        if not matched_token:
            return False
        # Look for patterns like "Dr. X Y <token>" or "<token> X Y"
        pat_after = rf'\b{re.escape(matched_token)}\s+([A-Z])(?:\s+([A-Z]))?\b'
        m_after = re.search(pat_after, text_upper)
        if m_after:
            inits = {g for g in m_after.groups() if g}
            if inits and not inits.intersection(faculty_initials):
                return True

        pat_before = rf'\b([A-Z])(?:\s+([A-Z]))?\s+{re.escape(matched_token)}\b'
        m_before = re.search(pat_before, text_upper)
        if m_before:
            inits = {g for g in m_before.groups() if g}
            if inits and not inits.intersection(faculty_initials):
                return True

        return False

    def match_review(self, review: Dict[str, Any]) -> Dict[str, Any]:
        review_id = review.get("review_id", "")
        text = review.get("text", "")
        text_upper = text.upper()
        raw_mentions = review.get("raw_mentions", {})
        mentioned_courses = set([c.upper() for c in raw_mentions.get("course_codes", [])])
        mentioned_slots = set([s.upper() for s in raw_mentions.get("slot_labels", [])])

        # 1. Check manual override
        if review_id in self.match_overrides:
            ov = self.match_overrides[review_id]
            fac_id = ov.get("faculty_id")
            fac = self.index.faculty_map.get(fac_id, {})
            cname = fac.get("canonical_name", "[Unknown]")
            return {
                "review_id": review_id,
                "status": ov.get("decision", "MATCHED"),
                "matched_faculty_id": fac_id,
                "canonical_name": cname,
                "score": 1.0,
                "candidates": [{
                    "faculty_id": fac_id,
                    "canonical_name": cname,
                    "score": 1.0,
                    "reasons": [f"manual_override: {ov.get('notes', 'applied')}"]
                }],
                "override_applied": True
            }

        # Track best name score per faculty: fac_id -> {"score": float, "matched_alias": str, "reasons": list}
        name_scores: Dict[str, Dict[str, Any]] = {}

        def record_name_score(fid: str, pts: float, alias: str, reason: str):
            if fid not in name_scores or pts > name_scores[fid]["score"]:
                name_scores[fid] = {
                    "score": pts,
                    "matched_alias": alias,
                    "reasons": [reason]
                }
            elif pts == name_scores[fid]["score"]:
                name_scores[fid]["reasons"].append(reason)

        # 2. Check exact aliases in text
        for alias, fac_ids in self.index.alias_to_faculty.items():
            if len(alias) >= 3 and re.search(rf'\b{re.escape(alias)}\b', text_upper):
                is_shared = alias in self.index.shared_aliases
                is_multiword = len(alias.split()) > 1
                if is_multiword:
                    pts = 0.85
                elif is_shared:
                    pts = 0.35
                else:
                    pts = 0.60

                for fid in fac_ids:
                    reason = f"exact_alias:{alias}" + (" (shared)" if is_shared else "")
                    record_name_score(fid, pts, alias, reason)

        # 3. Fuzzy matching for significant tokens (only if no exact match above 0.50)
        words = set(re.findall(r'[A-Za-z]{5,}', text_upper))
        for w in words:
            for alias, fac_ids in self.index.alias_to_faculty.items():
                if len(alias) >= 5 and abs(len(alias) - len(w)) <= 2:
                    sim = round(difflib.SequenceMatcher(None, w, alias).ratio(), 2)
                    if sim >= 0.88:
                        pts = round(0.50 * sim, 2)
                        for fid in fac_ids:
                            record_name_score(fid, pts, alias, f"fuzzy_alias:{alias}~{w}({sim:.2f})")

        # 4. Integrate offering context and check initial clash
        candidate_list: List[Dict[str, Any]] = []

        for fid, n_data in name_scores.items():
            fac = self.index.faculty_map.get(fid, {})
            cname = fac.get("canonical_name", "[Unknown]")
            score = n_data["score"]
            reasons = list(n_data["reasons"])
            matched_alias = n_data["matched_alias"]

            # Check conflicting initials
            fac_inits = self._extract_initials_for_faculty(fac)
            if fac_inits and self._detect_conflicting_initials(text_upper, matched_alias, fac_inits):
                score -= 0.50
                reasons.append("initial_clash_penalty")

            # Context Boost
            ctx = self.index.get_faculty_context(fid)
            course_hits = mentioned_courses.intersection(ctx["courses"])
            if course_hits:
                score += 0.25 * len(course_hits)
                reasons.append(f"course_context:{','.join(course_hits)}")

            slot_hits = mentioned_slots.intersection(ctx["slots"])
            if slot_hits:
                score += 0.15 * len(slot_hits)
                reasons.append(f"slot_context:{','.join(slot_hits)}")

            final_score = round(max(0.0, min(score, 1.0)), 3)
            candidate_list.append({
                "faculty_id": fid,
                "canonical_name": cname,
                "score": final_score,
                "reasons": reasons
            })

        candidate_list.sort(key=lambda c: c["score"], reverse=True)

        if not candidate_list or candidate_list[0]["score"] < 0.25:
            return {
                "review_id": review_id,
                "status": "UNMATCHED",
                "matched_faculty_id": None,
                "canonical_name": None,
                "score": candidate_list[0]["score"] if candidate_list else 0.0,
                "candidates": candidate_list[:3],
                "override_applied": False
            }

        top = candidate_list[0]
        s1 = top["score"]

        # Check for ambiguity
        if len(candidate_list) > 1:
            runner_up = candidate_list[1]
            s2 = runner_up["score"]
            if s1 >= 0.50 and (s1 - s2) < 0.15:
                return {
                    "review_id": review_id,
                    "status": "AMBIGUOUS",
                    "matched_faculty_id": None,
                    "canonical_name": None,
                    "score": s1,
                    "candidates": candidate_list[:3],
                    "override_applied": False
                }

        # Status decision
        if s1 >= 0.60:
            status = "MATCHED"
            matched_id = top["faculty_id"]
            matched_cname = top["canonical_name"]
        elif s1 >= 0.35:
            status = "WEAK"
            matched_id = None
            matched_cname = None
        else:
            status = "UNMATCHED"
            matched_id = None
            matched_cname = None

        return {
            "review_id": review_id,
            "status": status,
            "matched_faculty_id": matched_id,
            "canonical_name": matched_cname,
            "score": s1,
            "candidates": candidate_list[:3],
            "override_applied": False
        }
