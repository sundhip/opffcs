import re
from typing import Optional, Dict, Any

# Regexes for explicit ratings
# 1. Fractions like "8/10", "8.5/10", "4/5", "4.5/5", "9 / 10", "3.5 / 5"
FRACTION_RATING_REGEX = re.compile(
    r'(?<!\d)(?<![a-zA-Z])([0-9]|10)(?:\.([0-9]{1,2}))?\s*/\s*(5|10)(?![0-9])',
    re.IGNORECASE
)

# 2. Stars like "4 stars", "4.5 stars", "5 star"
STARS_RATING_REGEX = re.compile(
    r'(?<!\d)([1-5](?:\.[0-9]{1,2})?)\s*(?:stars?|★)\b',
    re.IGNORECASE
)

# 3. Explicit labels like "rating: 8", "rating - 4.5", "rating is 9/10"
LABEL_RATING_REGEX = re.compile(
    r'\brating\s*(?::|-|is|=)?\s*([0-9]|10)(?:\.([0-9]{1,2}))?(?:\s*/\s*(5|10))?\b',
    re.IGNORECASE
)

# Date indicators to reject false positive fractions
DATE_CONTEXT_REGEX = re.compile(
    r'\b(?:on|dated?|deadline|exam|due|submission|until|before|after|from)\s*$',
    re.IGNORECASE
)

def extract_explicit_rating(text: str) -> Optional[Dict[str, Any]]:
    """
    Extracts an explicit numeric rating from review text.
    Returns None if no explicit rating pattern exists. Never infers from sentiment.
    Normalized score is strictly mapped to the 0.0 - 5.0 range.
    """
    if not text:
        return None

    # 1. Check explicit label first ("rating: 8", "rating: 4.5/5")
    label_match = LABEL_RATING_REGEX.search(text)
    if label_match:
        whole = label_match.group(1)
        dec = label_match.group(2)
        denom = label_match.group(3)
        val = float(f"{whole}.{dec}" if dec else whole)
        
        if denom == "10":
            norm = round(val / 2.0, 2)
        elif denom == "5":
            norm = round(min(val, 5.0), 2)
        else:
            # If no denom specified: if val > 5, assume out of 10, else out of 5
            norm = round(val / 2.0 if val > 5.0 else val, 2)
            
        return {
            "raw_rating": label_match.group(0).strip(),
            "normalized_rating": norm,
            "scale": "5_star"
        }

    # 2. Check stars ("4 stars", "5 star")
    stars_match = STARS_RATING_REGEX.search(text)
    if stars_match:
        val = float(stars_match.group(1))
        return {
            "raw_rating": stars_match.group(0).strip(),
            "normalized_rating": round(min(val, 5.0), 2),
            "scale": "5_star"
        }

    # 3. Check fraction ("8/10", "4.5/5")
    for m in FRACTION_RATING_REGEX.finditer(text):
        start_pos = m.start()
        prefix = text[:start_pos].strip()
        # Check if preceded by a date preposition
        if DATE_CONTEXT_REGEX.search(prefix):
            continue  # Likely a calendar date (e.g. "due on 10/10")

        whole = m.group(1)
        dec = m.group(2)
        denom = int(m.group(3))
        val = float(f"{whole}.{dec}" if dec else whole)

        if denom == 10:
            if val > 10.0:
                continue
            norm = round(val / 2.0, 2)
        elif denom == 5:
            if val > 5.0:
                continue
            norm = round(val, 2)
        else:
            continue

        return {
            "raw_rating": m.group(0).strip(),
            "normalized_rating": norm,
            "scale": "5_star"
        }

    return None
