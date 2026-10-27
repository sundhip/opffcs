import re
import hashlib
from typing import Tuple, List

# Known text-wrapping splits from PDF/Excel narrow column export
KNOWN_WRAPPED_WORD_FIXES = {
    "VIJAYAKUMA R": "VIJAYAKUMAR",
    "PRIYADARSHI NI": "PRIYADARSHINI",
    "SIVABALAKRI SHNAN": "SIVABALAKRISHNAN",
    "DHANASEKA R": "DHANASEKAR",
    "PRABHAKAR AN": "PRABHAKARAN",
    "MEIGNANAM OORTHI": "MEIGNANAMOORTHI",
    "THANIKACHA LAM": "THANIKACHALAM",
    "NEELANARAY ANAN": "NEELANARAYANAN",
    "PANDIYARAJ U": "PANDIYARAJU",
    "KARTHIKEYA N": "KARTHIKEYAN",
}

HONORIFICS_REGEX = re.compile(r'^(?:Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.|Doctor|Professor)\s+', re.IGNORECASE)

def normalize_course_code(raw: str) -> str:
    if not raw:
        return ""
    # Strip spaces and uppercase
    cleaned = re.sub(r'\s+', '', str(raw)).upper()
    return cleaned

def normalize_course_title(raw: str) -> str:
    if not raw:
        return ""
    # Trim and collapse spaces
    cleaned = " ".join(str(raw).strip().split())
    return cleaned

def normalize_faculty_name(raw: str) -> Tuple[str, bool, str]:
    """
    Returns: (canonical_name, is_placeholder, faculty_id)
    """
    if not raw or str(raw).strip() == "" or str(raw).strip().lower() in ["none", "nil", "null", "-", "tba", "no matching teacher found"]:
        return "[Unassigned]", True, "faculty_unassigned"
        
    s = " ".join(str(raw).strip().split())
    
    # Strip honorifics
    s = HONORIFICS_REGEX.sub('', s).strip()
    
    # Check known wrapped word fixes
    for wrapped, fixed in KNOWN_WRAPPED_WORD_FIXES.items():
        if wrapped in s:
            s = s.replace(wrapped, fixed)
            
    # Uppercase
    s = s.upper()
    
    # Generate stable deterministic ID
    h = hashlib.sha256(s.encode('utf-8')).hexdigest()[:12]
    faculty_id = f"fac_{h}"
    
    return s, False, faculty_id

def normalize_slot_string(raw: str) -> str:
    """
    Normalizes a slot string:
    - Uppercase, trim whitespace around separators
    - Converts separators like '/', ',', ' ' (when used as delimiter) to '+'
    """
    if not raw:
        return ""
    s = str(raw).strip().upper()
    if s in ["NONE", "NIL", "NULL", "-", ""]:
        return ""
        
    # Replace slashes, semicolons, or commas with +
    s = re.sub(r'[\s]*[;,/]+[\s]*', '+', s)
    # Split by + and clean tokens
    tokens = [t.strip() for t in s.split('+') if t.strip()]
    return "+".join(tokens)
