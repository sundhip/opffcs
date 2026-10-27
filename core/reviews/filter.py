import re
import json
import os
from typing import Dict, List, Any, Tuple, Optional

# Keywords for academic reviews & faculty evaluations
STRONG_REVIEW_KEYWORDS = {
    "marks", "grade", "grading", "strict", "chill", "lenient", "cat", "fat",
    "da", "assignment", "assignments", "quiz", "quizzes", "attendance", "teach",
    "teaching", "ppt", "friendly", "temper", "internal", "internals", "review",
    "rating", "blacklist", "blacklisted", "ez", "easy", "partiality", "average"
}

TITLE_REGEX = re.compile(r'\b(?:dr|prof|professor|sir|mam|ma\'am|faculty|teacher)\b', re.IGNORECASE)
COURSE_CODE_REGEX = re.compile(r'\b(?:BA)?[A-Z]{3}\s*\d{3}\b', re.IGNORECASE)
SLOT_REGEX = re.compile(r'\b(?:[A-G][12]|T[A-G][12]|T[A-Z]{2}[12]|L(?:[1-9]|[1-5][0-9]|60))\b', re.IGNORECASE)

class CandidateFilter:
    def __init__(self, faculty_json_path: Optional[str] = None):
        if faculty_json_path is None:
            faculty_json_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "processed", "faculty.json")
            
        self.known_faculty_names: List[str] = []
        self.known_faculty_tokens: Dict[str, str] = {}
        
        if os.path.exists(faculty_json_path):
            with open(faculty_json_path, "r", encoding="utf-8") as f:
                faculty_list = json.load(f)
                for fac in faculty_list:
                    cname = fac.get("canonical_name", "").strip().upper()
                    if cname and not fac.get("is_placeholder"):
                        self.known_faculty_names.append(cname)
                        for tok in cname.split():
                            if len(tok) >= 4:  # Significant name tokens like 'VIJAYAKUMAR', 'RAJESH'
                                self.known_faculty_tokens[tok] = cname

    def evaluate_candidate(self, text: str, explicit_rating: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Rule-based scoring of review relevance.
        Returns:
          - is_candidate: bool
          - confidence: float (0.0 to 1.0)
          - reasons: list of strings
          - raw_mentions: dict with names, course_codes, slot_labels
        """
        if not text or len(text.strip()) < 5:
            return {
                "is_candidate": False,
                "confidence": 0.0,
                "reasons": ["text_too_short"],
                "raw_mentions": {"names": [], "course_codes": [], "slot_labels": []}
            }

        text_upper = text.upper()
        reasons = []
        raw_names = []
        raw_courses = []
        raw_slots = []
        score = 0.0

        # 1. Check known faculty names / significant tokens
        found_faculty = False
        for cname in self.known_faculty_names:
            if cname in text_upper:
                found_faculty = True
                raw_names.append(cname)
                break
                
        if not found_faculty:
            for tok, cname in self.known_faculty_tokens.items():
                if re.search(rf'\b{re.escape(tok)}\b', text_upper):
                    found_faculty = True
                    raw_names.append(tok)
                    break

        if found_faculty:
            score += 0.45
            reasons.append("found_known_faculty")

        # 2. Check academic titles (Dr., Prof, Sir, Mam)
        if TITLE_REGEX.search(text):
            score += 0.20
            reasons.append("found_academic_title")

        # 3. Check explicit rating pattern
        if explicit_rating:
            score += 0.35
            reasons.append(f"found_explicit_rating:{explicit_rating['raw_rating']}")

        # 4. Check review keywords
        words = set(re.findall(r'[a-zA-Z]+', text.lower()))
        matched_keywords = words.intersection(STRONG_REVIEW_KEYWORDS)
        if matched_keywords:
            kw_boost = min(len(matched_keywords) * 0.10, 0.30)
            score += kw_boost
            reasons.append(f"matched_keywords:{','.join(list(matched_keywords)[:3])}")

        # 5. Check course codes
        course_matches = COURSE_CODE_REGEX.findall(text)
        if course_matches:
            raw_courses.extend([c.strip().upper() for c in course_matches])
            score += 0.15
            reasons.append(f"found_course_code:{','.join(raw_courses[:2])}")

        # 6. Check slot labels
        slot_matches = SLOT_REGEX.findall(text)
        if slot_matches:
            raw_slots.extend([s.strip().upper() for s in slot_matches])
            score += 0.10
            reasons.append(f"found_slot_label:{','.join(raw_slots[:3])}")

        confidence = round(min(score, 1.0), 2)
        is_candidate = confidence >= 0.30

        return {
            "is_candidate": is_candidate,
            "confidence": confidence,
            "reasons": reasons,
            "raw_mentions": {
                "names": list(set(raw_names)),
                "course_codes": list(set(raw_courses)),
                "slot_labels": list(set(raw_slots))
            }
        }
