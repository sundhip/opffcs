import collections
import statistics
import re
from typing import Dict, List, Any, Optional

# Basic academic stopwords for keyword extraction
STOPWORDS = {
    "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "of", "with",
    "is", "was", "are", "were", "be", "been", "being", "have", "has", "had",
    "i", "you", "he", "she", "it", "we", "they", "this", "that", "these", "those",
    "my", "your", "his", "her", "its", "our", "their", "me", "him", "us", "them",
    "dr", "prof", "sir", "mam", "maam", "faculty", "teacher", "sir's", "mam's",
    "good", "bad", "give", "gives", "gave", "given", "take", "takes", "took",
    "class", "classes", "subject", "slot", "slots", "opt", "option", "poll",
    "bro", "guy", "guys", "tell", "ask", "know", "anyone", "anybody", "please"
}

def aggregate_faculty_ratings(
    faculty_list: List[Dict[str, Any]],
    matched_reviews: List[Dict[str, Any]],
    reviews_by_id: Dict[str, Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Aggregates rating statistics for faculty strictly from MATCHED reviews.
    Ambiguous and weak reviews are strictly excluded.
    Returns:
      Dict mapping faculty_id to comprehensive aggregated metrics.
    """
    # Group matched review_ids by faculty_id
    fac_to_reviews: Dict[str, List[Dict[str, Any]]] = collections.defaultdict(list)

    for match in matched_reviews:
        if match.get("status") == "MATCHED":
            fid = match.get("matched_faculty_id")
            rid = match.get("review_id")
            if fid and rid in reviews_by_id:
                fac_to_reviews[fid].append(reviews_by_id[rid])

    results: Dict[str, Any] = {}

    for fac in faculty_list:
        fid = fac["id"]
        cname = fac.get("canonical_name", "[Unknown]")
        if fac.get("is_placeholder"):
            continue

        revs = fac_to_reviews.get(fid, [])
        review_count = len(revs)

        # Ratings
        ratings = []
        for r in revs:
            exp = r.get("explicit_rating")
            if exp and exp.get("normalized_rating") is not None:
                ratings.append(float(exp["normalized_rating"]))

        rated_count = len(ratings)

        if rated_count > 0:
            rating_mean = round(sum(ratings) / rated_count, 2)
            rating_median = round(statistics.median(ratings), 2)
            rating_min = round(min(ratings), 2)
            rating_max = round(max(ratings), 2)
            
            # Star distribution (1 to 5)
            dist = {f"{star}_star": 0 for star in range(1, 6)}
            for val in ratings:
                bucket = max(1, min(5, round(val)))
                dist[f"{bucket}_star"] += 1
                
            # Bayesian smoothed score (prior: mean=3.5, weight=2.0)
            prior_mean = 3.5
            prior_weight = 2.0
            bayesian_smoothed = round((prior_weight * prior_mean + sum(ratings)) / (prior_weight + rated_count), 2)
        else:
            rating_mean = None
            rating_median = None
            rating_min = None
            rating_max = None
            dist = {f"{star}_star": 0 for star in range(1, 6)}
            bayesian_smoothed = None

        # Last review date
        timestamps = [r.get("timestamp") for r in revs if r.get("timestamp")]
        last_review_date = max(timestamps) if timestamps else None

        # Source breakdown
        source_counts: Dict[str, int] = collections.defaultdict(int)
        for r in revs:
            src = r.get("source_zip") or r.get("source_file") or "unknown"
            source_counts[src] += 1

        # Recurring keywords
        word_counts: Dict[str, int] = collections.defaultdict(int)
        for r in revs:
            tokens = re.findall(r'[a-zA-Z]{3,}', r.get("text", "").lower())
            for t in tokens:
                if t not in STOPWORDS:
                    word_counts[t] += 1

        top_keywords = sorted(
            [{"word": w, "count": c} for w, c in word_counts.items() if c >= 2],
            key=lambda x: x["count"],
            reverse=True
        )[:10]

        low_sample = review_count < 3 or rated_count < 2

        results[fid] = {
            "faculty_id": fid,
            "canonical_name": cname,
            "review_count": review_count,
            "rated_count": rated_count,
            "rating_mean": rating_mean,
            "rating_median": rating_median,
            "rating_min": rating_min,
            "rating_max": rating_max,
            "rating_distribution": dist,
            "bayesian_smoothed_rating_separate": bayesian_smoothed,
            "last_review_date": last_review_date,
            "source_breakdown": dict(source_counts),
            "recurring_keywords": top_keywords,
            "low_sample": low_sample,
            "review_ids": [r["review_id"] for r in revs]
        }

    return results
