import argparse
import csv
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional

from core.matching.alias_index import AliasIndex
from core.matching.matcher import FacultyMatcher
from core.matching.aggregator import aggregate_faculty_ratings

def run_matching(
    reviews_path: str = "data/processed/reviews.jsonl",
    faculty_path: str = "data/processed/faculty.json",
    offerings_path: str = "data/processed/offerings.json",
    overrides_dir: str = "data/manual",
    out_dir: str = "data/processed"
) -> Dict[str, Any]:
    out_path = Path(out_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    overrides_path = Path(overrides_dir)
    overrides_path.mkdir(parents=True, exist_ok=True)
    
    alias_overrides_file = overrides_path / "alias_overrides.json"
    match_overrides_file = overrides_path / "match_overrides.json"

    # 1. Initialize Alias Index & Matcher
    index = AliasIndex(
        faculty_json_path=faculty_path,
        offerings_json_path=offerings_path,
        alias_overrides_path=str(alias_overrides_file)
    )
    matcher = FacultyMatcher(
        alias_index=index,
        match_overrides_path=str(match_overrides_file)
    )

    # 2. Load Reviews
    if not os.path.exists(reviews_path):
        raise FileNotFoundError(f"Reviews file not found: {reviews_path}")

    reviews: List[Dict[str, Any]] = []
    reviews_by_id: Dict[str, Dict[str, Any]] = {}
    with open(reviews_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                rev = json.loads(line)
                reviews.append(rev)
                reviews_by_id[rev["review_id"]] = rev

    # 3. Match Reviews
    matches: List[Dict[str, Any]] = []
    status_counts = {"MATCHED": 0, "AMBIGUOUS": 0, "WEAK": 0, "UNMATCHED": 0}
    overrides_applied_count = 0

    for rev in reviews:
        res = matcher.match_review(rev)
        matches.append(res)
        st = res["status"]
        status_counts[st] = status_counts.get(st, 0) + 1
        if res.get("override_applied"):
            overrides_applied_count += 1

    # 4. Save review_matches.jsonl
    matches_file = out_path / "review_matches.jsonl"
    with open(matches_file, "w", encoding="utf-8") as f:
        for m in matches:
            f.write(json.dumps(m, ensure_ascii=False) + "\n")

    # 5. Generate Review Queue CSV for AMBIGUOUS & WEAK items
    queue_file = out_path / "match_review_queue.csv"
    queue_rows = []
    for m in matches:
        if m["status"] in ["AMBIGUOUS", "WEAK"]:
            rev = reviews_by_id.get(m["review_id"], {})
            clean_text = rev.get("text", "").replace("\n", " ").replace('"', "'")
            preview = clean_text[:140] + ("..." if len(clean_text) > 140 else "")
            cand_str = "; ".join([
                f"{c['canonical_name']} (id:{c['faculty_id']}, score:{c['score']})"
                for c in m.get("candidates", [])
            ])
            queue_rows.append({
                "review_id": m["review_id"],
                "status": m["status"],
                "score": m["score"],
                "text_preview": preview,
                "top_candidates": cand_str,
                "decision": "",            # To be filled by human: MATCHED / IGNORE
                "chosen_faculty_id": "",   # e.g. fac_xxx
                "notes": ""
            })

    with open(queue_file, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "review_id", "status", "score", "text_preview", "top_candidates", "decision", "chosen_faculty_id", "notes"
        ])
        writer.writeheader()
        writer.writerows(queue_rows)

    # 6. Faculty Ratings Aggregation (only MATCHED)
    with open(faculty_path, "r", encoding="utf-8") as f:
        faculty_list = json.load(f)

    ratings_agg = aggregate_faculty_ratings(faculty_list, matches, reviews_by_id)
    ratings_file = out_path / "faculty_ratings.json"
    with open(ratings_file, "w", encoding="utf-8") as f:
        json.dump(ratings_agg, f, indent=2, ensure_ascii=False)

    # 7. Generate Matching Report
    report_file = out_path / "matching_report.md"
    generate_matching_report(
        report_file,
        total_reviews=len(reviews),
        status_counts=status_counts,
        queue_count=len(queue_rows),
        overrides_count=overrides_applied_count,
        ratings_agg=ratings_agg,
        matches=matches,
        reviews_by_id=reviews_by_id
    )

    return {
        "status": "success",
        "total_reviews": len(reviews),
        "status_counts": status_counts,
        "queue_count": len(queue_rows),
        "overrides_applied": overrides_applied_count,
        "matches_file": str(matches_file),
        "ratings_file": str(ratings_file),
        "queue_file": str(queue_file),
        "report_file": str(report_file)
    }

def generate_matching_report(
    report_path: Path,
    total_reviews: int,
    status_counts: Dict[str, int],
    queue_count: int,
    overrides_count: int,
    ratings_agg: Dict[str, Any],
    matches: List[Dict[str, Any]],
    reviews_by_id: Dict[str, Dict[str, Any]]
) -> None:
    matched_count = status_counts.get("MATCHED", 0)
    match_rate = (matched_count / total_reviews * 100) if total_reviews else 0.0

    rated_faculty = [f for f in ratings_agg.values() if f["review_count"] > 0]
    faculty_with_ratings = [f for f in ratings_agg.values() if f["rated_count"] > 0]

    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# Resumio FFCS: Faculty Review Matching & Rating Report\n\n")

        f.write("## 1. Matching Performance Summary\n\n")
        f.write(f"- **Total Ingested Reviews Processed**: {total_reviews:,}\n")
        f.write(f"- **Confident Faculty Matches (`MATCHED`)**: **{matched_count:,}** ({match_rate:.1f}%)\n")
        f.write(f"- **Ambiguous Candidate Mentions (`AMBIGUOUS`)**: **{status_counts.get('AMBIGUOUS', 0):,}**\n")
        f.write(f"- **Weak Candidate Mentions (`WEAK`)**: **{status_counts.get('WEAK', 0):,}**\n")
        f.write(f"- **Unmatched Reviews (`UNMATCHED`)**: **{status_counts.get('UNMATCHED', 0):,}**\n")
        f.write(f"- **Manual Overrides Applied**: **{overrides_count}**\n")
        f.write(f"- **Review Queue Size for Human Verification**: **{queue_count:,}** items (saved to `match_review_queue.csv`)\n\n")

        f.write("## 2. Faculty Coverage & Ratings Summary\n\n")
        f.write(f"- **Total Canonical Faculty**: {len(ratings_agg)}\n")
        f.write(f"- **Faculty with at least 1 Matched Review**: {len(rated_faculty)}\n")
        f.write(f"- **Faculty with Numeric Explicit Ratings (0-5 scale)**: {len(faculty_with_ratings)}\n")
        f.write(f"- **Faculty with Low Sample (< 3 reviews or < 2 ratings)**: {sum(1 for f in ratings_agg.values() if f['low_sample'])}\n\n")

        f.write("## 3. Top-Reviewed Faculty Breakdown\n\n")
        top_reviewed = sorted(rated_faculty, key=lambda f: f["review_count"], reverse=True)[:15]
        f.write("| Faculty Name | Faculty ID | Review Count | Rated Count | Rating Mean | Distribution [1-5] | Low Sample |\n")
        f.write("|--------------|------------|--------------|-------------|-------------|--------------------|------------|\n")
        for f_data in top_reviewed:
            mean_str = f"{f_data['rating_mean']:.2f}" if f_data["rating_mean"] is not None else "N/A"
            dist_str = f"[{f_data['rating_distribution']['1_star']},{f_data['rating_distribution']['2_star']},{f_data['rating_distribution']['3_star']},{f_data['rating_distribution']['4_star']},{f_data['rating_distribution']['5_star']}]"
            f.write(f"| {f_data['canonical_name']} | `{f_data['faculty_id']}` | {f_data['review_count']} | {f_data['rated_count']} | {mean_str} | {dist_str} | {f_data['low_sample']} |\n")
        f.write("\n")

        f.write("## 4. Sample Matches with Explainability Chains (5 Examples)\n\n")
        sample_matched = [m for m in matches if m["status"] == "MATCHED"][:5]
        for idx, sm in enumerate(sample_matched, 1):
            rev = reviews_by_id.get(sm["review_id"], {})
            cand = sm["candidates"][0] if sm["candidates"] else {}
            f.write(f"### Match Example {idx}: `{sm['review_id']}` -> {sm['canonical_name']}\n")
            f.write(f"- **Score**: {sm['score']:.2f}\n")
            f.write(f"- **Reasons**: {', '.join(cand.get('reasons', []))}\n")
            clean_text = rev.get("text", "").replace("\n", " ")
            f.write(f"> \"{clean_text[:200]}\"\n\n")

def apply_queue_decisions(queue_csv_path: str, overrides_json_path: str = "data/manual/match_overrides.json") -> int:
    """
    Reads human decisions from an edited review queue CSV and writes them
    into data/manual/match_overrides.json.
    """
    if not os.path.exists(queue_csv_path):
        raise FileNotFoundError(f"Review queue file not found: {queue_csv_path}")

    existing_overrides: Dict[str, Any] = {}
    if os.path.exists(overrides_json_path):
        try:
            with open(overrides_json_path, "r", encoding="utf-8") as f:
                existing_overrides = json.load(f)
        except Exception:
            existing_overrides = {}

    applied_count = 0
    with open(queue_csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            dec = row.get("decision", "").strip().upper()
            fid = row.get("chosen_faculty_id", "").strip()
            rid = row.get("review_id", "").strip()
            notes = row.get("notes", "").strip()

            if dec in ["MATCHED", "IGNORE", "UNMATCHED"] and rid:
                existing_overrides[rid] = {
                    "decision": dec,
                    "faculty_id": fid if dec == "MATCHED" else None,
                    "notes": notes or f"Manual decision from {os.path.basename(queue_csv_path)}"
                }
                applied_count += 1

    os.makedirs(os.path.dirname(os.path.abspath(overrides_json_path)), exist_ok=True)
    with open(overrides_json_path, "w", encoding="utf-8") as f:
        json.dump(existing_overrides, f, indent=2, ensure_ascii=False)

    return applied_count

def main():
    parser = argparse.ArgumentParser(description="Match reviews to faculty and compute aggregated ratings.")
    subparsers = parser.add_subparsers(dest="subcommand")

    # Run subcommand
    run_parser = subparsers.add_parser("run", help="Run review matching and aggregation.")
    run_parser.add_argument("--reviews", default="data/processed/reviews.jsonl", help="Path to reviews.jsonl")
    run_parser.add_argument("--faculty", default="data/processed/faculty.json", help="Path to faculty.json")
    run_parser.add_argument("--offerings", default="data/processed/offerings.json", help="Path to offerings.json")
    run_parser.add_argument("--overrides-dir", default="data/manual", help="Path to manual overrides directory")
    run_parser.add_argument("--out", default="data/processed", help="Output directory")

    # Apply-decisions subcommand
    apply_parser = subparsers.add_parser("apply-decisions", help="Apply decisions from edited review queue CSV.")
    apply_parser.add_argument("--queue-csv", default="data/processed/match_review_queue.csv", help="Path to review queue CSV")
    apply_parser.add_argument("--overrides-json", default="data/manual/match_overrides.json", help="Target overrides JSON file")

    args = parser.parse_args()

    if args.subcommand == "apply-decisions":
        count = apply_queue_decisions(args.queue_csv, args.overrides_json)
        print(f"Applied {count} manual review decisions to {args.overrides_json}.")
    else:
        # Default to run
        revs = getattr(args, "reviews", "data/processed/reviews.jsonl")
        fac = getattr(args, "faculty", "data/processed/faculty.json")
        off = getattr(args, "offerings", "data/processed/offerings.json")
        ov = getattr(args, "overrides_dir", "data/manual")
        out = getattr(args, "out", "data/processed")

        print("Executing faculty review matching and aggregation...")
        res = run_matching(revs, fac, off, ov, out)
        print("\nMatching Complete!")
        print(f"Total reviews processed: {res['total_reviews']}")
        print(f"Matches breakdown:       {res['status_counts']}")
        print(f"Review queue items:      {res['queue_count']}")
        print(f"Output files:")
        print(f"  - Matches JSONL:       {res['matches_file']}")
        print(f"  - Aggregated Ratings:  {res['ratings_file']}")
        print(f"  - Review Queue CSV:    {res['queue_file']}")
        print(f"  - Report:              {res['report_file']}")

if __name__ == "__main__":
    main()
