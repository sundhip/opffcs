import hashlib
import re
from typing import List, Dict, Any, Tuple

def _normalize_for_dedupe(text: str) -> str:
    """
    Normalizes text for duplicate detection by lowering, stripping emoji/punctuation,
    and collapsing whitespace.
    """
    t = text.lower()
    # Strip common whatsapp forward prefixes or boilerplate
    t = re.sub(r'forwarded\s*message', '', t)
    # Remove non-alphanumeric except spaces
    t = re.sub(r'[^a-z0-9\s]', ' ', t)
    # Collapse whitespace
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def deduplicate_reviews(reviews: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Identifies exact and near-duplicate reviews across and within chat exports.
    All reviews are kept in the returned list, but tagged with:
      - duplicate_group_id: str
      - is_primary: bool
      - duplicate_of: Optional[str] (review_id of primary)
      - duplicate_count: int (for primary)
    Returns:
      (tagged_reviews, dedupe_stats)
    """
    if not reviews:
        return [], {"total_reviews": 0, "unique_groups": 0, "duplicate_copies": 0}

    # Group by normalized text hash
    text_to_group: Dict[str, List[int]] = {}
    
    for idx, rev in enumerate(reviews):
        norm = _normalize_for_dedupe(rev["text"])
        if not norm or len(norm) < 10:
            # Very short text, key on raw text
            norm = rev["text"].strip().lower()
        
        norm_hash = hashlib.sha256(norm.encode('utf-8')).hexdigest()[:12]
        if norm_hash not in text_to_group:
            text_to_group[norm_hash] = []
        text_to_group[norm_hash].append(idx)

    tagged_reviews = [dict(r) for r in reviews]
    unique_groups = len(text_to_group)
    duplicate_copies = 0

    for norm_hash, indices in text_to_group.items():
        group_id = f"grp_{norm_hash}"
        # Primary is the first occurrence (earliest)
        primary_idx = indices[0]
        primary_id = tagged_reviews[primary_idx]["review_id"]

        tagged_reviews[primary_idx]["duplicate_group_id"] = group_id
        tagged_reviews[primary_idx]["is_primary"] = True
        tagged_reviews[primary_idx]["duplicate_of"] = None
        tagged_reviews[primary_idx]["duplicate_count"] = len(indices) - 1

        # Sources for primary
        all_sources = [{
            "source_zip": tagged_reviews[primary_idx].get("source_zip"),
            "source_file": tagged_reviews[primary_idx].get("source_file"),
            "line_range": [tagged_reviews[primary_idx]["start_line"], tagged_reviews[primary_idx]["end_line"]],
            "timestamp": tagged_reviews[primary_idx]["timestamp"]
        }]

        for dup_idx in indices[1:]:
            duplicate_copies += 1
            tagged_reviews[dup_idx]["duplicate_group_id"] = group_id
            tagged_reviews[dup_idx]["is_primary"] = False
            tagged_reviews[dup_idx]["duplicate_of"] = primary_id
            tagged_reviews[dup_idx]["duplicate_count"] = 0
            all_sources.append({
                "source_zip": tagged_reviews[dup_idx].get("source_zip"),
                "source_file": tagged_reviews[dup_idx].get("source_file"),
                "line_range": [tagged_reviews[dup_idx]["start_line"], tagged_reviews[dup_idx]["end_line"]],
                "timestamp": tagged_reviews[dup_idx]["timestamp"]
            })

        tagged_reviews[primary_idx]["duplicate_sources"] = all_sources

    stats = {
        "total_reviews": len(reviews),
        "unique_groups": unique_groups,
        "duplicate_copies": duplicate_copies,
        "duplicate_groups_with_multiples": sum(1 for indices in text_to_group.values() if len(indices) > 1)
    }

    return tagged_reviews, stats
