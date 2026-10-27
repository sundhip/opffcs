import argparse
import glob
import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any

from core.reviews.privacy import get_or_create_salt, hash_sender, scrub_pii, assert_no_pii
from core.reviews.zip_reader import read_whatsapp_zip
from core.reviews.parser import parse_chat_lines
from core.reviews.filter import CandidateFilter
from core.reviews.rating_extractor import extract_explicit_rating
from core.reviews.linker import link_candidate_messages
from core.reviews.deduper import deduplicate_reviews

def run_review_pipeline(
    zip_paths: List[str],
    out_dir: str = "data/processed",
    salt_file: str = ".salt"
) -> Dict[str, Any]:
    out_path = Path(out_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    salt = get_or_create_salt(salt_file)

    candidate_filter = CandidateFilter()

    total_stats = {
        "files_processed": 0,
        "total_raw_lines": 0,
        "total_messages": 0,
        "message_types": {"normal": 0, "system": 0, "media_omitted": 0, "deleted": 0},
        "file_details": []
    }

    all_raw_candidates: List[Dict[str, Any]] = []

    for zp in zip_paths:
        zname = os.path.basename(zp)
        extracted_files = read_whatsapp_zip(zp)

        for chat_file in extracted_files:
            file_name = chat_file["filename"]
            lines = chat_file["lines"]
            total_stats["total_raw_lines"] += len(lines)

            parsed = parse_chat_lines(lines, source_zip=zname, source_file=file_name)
            total_stats["files_processed"] += 1
            total_stats["total_messages"] += len(parsed["messages"])

            for msg in parsed["messages"]:
                mtype = msg["message_type"]
                total_stats["message_types"][mtype] = total_stats["message_types"].get(mtype, 0) + 1

                if mtype == "normal":
                    # Anonymize sender
                    sender_hash = hash_sender(msg["sender"], salt)
                    # Scrub text
                    clean_text = scrub_pii(msg["text"])
                    # Privacy guarantee assertion
                    assert_no_pii(clean_text)

                    # Extract explicit rating first
                    rating = extract_explicit_rating(clean_text)

                    # Candidate filter evaluation
                    cand = candidate_filter.evaluate_candidate(clean_text, explicit_rating=rating)
                    if cand.get("is_candidate"):
                        cand["text"] = clean_text
                        cand["message_id"] = msg["message_id"]
                        cand["timestamp"] = msg["timestamp"]
                        cand["epoch_seconds"] = msg["epoch_seconds"]
                        cand["sender_hash"] = sender_hash
                        cand["source_zip"] = zname
                        cand["source_file"] = file_name
                        cand["start_line"] = msg["start_line"]
                        cand["end_line"] = msg["end_line"]
                        cand["explicit_rating"] = rating

                        all_raw_candidates.append(cand)

            total_stats["file_details"].append({
                "zip": zname,
                "file": file_name,
                "lines": len(lines),
                "messages": len(parsed["messages"]),
                "format_detected": parsed["format_detected"],
                "stats": parsed["stats"]
            })

    # Sort raw candidates chronologically
    all_raw_candidates.sort(key=lambda c: (c["source_file"], c["epoch_seconds"], c["start_line"]))

    # Step: Link multi-message reviews
    linked_reviews = link_candidate_messages(all_raw_candidates, max_gap_seconds=180)

    # Step: Deduplicate across reviews
    deduped_reviews, dedupe_stats = deduplicate_reviews(linked_reviews)

    # Output JSONL
    jsonl_path = out_path / "reviews.jsonl"
    with open(jsonl_path, "w", encoding="utf-8") as f:
        for rev in deduped_reviews:
            record = {
                "review_id": rev["review_id"],
                "text": rev["text"],
                "timestamp": rev["timestamp"],
                "epoch_seconds": rev["epoch_seconds"],
                "sender_hash": rev["sender_hash"],
                "source_zip": rev.get("source_zip"),
                "source_file": rev.get("source_file"),
                "line_range": [rev["start_line"], rev["end_line"]],
                "linked_ids": rev.get("linked_ids", [rev.get("message_id")]),
                "explicit_rating": rev.get("explicit_rating"),
                "raw_mentions": rev.get("raw_mentions", {}),
                "candidate_confidence": rev.get("confidence", 0.0),
                "reasons": rev.get("reasons", []),
                "duplicate_group_id": rev.get("duplicate_group_id"),
                "is_primary": rev.get("is_primary", True),
                "duplicate_of": rev.get("duplicate_of"),
                "duplicate_count": rev.get("duplicate_count", 0),
                "duplicate_sources": rev.get("duplicate_sources", [])
            }
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    # Generate Markdown Report
    report_path = out_path / "reviews_report.md"
    generate_markdown_report(report_path, total_stats, all_raw_candidates, linked_reviews, deduped_reviews, dedupe_stats)

    return {
        "status": "success",
        "total_messages": total_stats["total_messages"],
        "raw_candidates": len(all_raw_candidates),
        "linked_reviews": len(linked_reviews),
        "deduped_reviews": len(deduped_reviews),
        "dedupe_stats": dedupe_stats,
        "jsonl_path": str(jsonl_path),
        "report_path": str(report_path)
    }

def generate_markdown_report(
    report_path: Path,
    stats: Dict[str, Any],
    raw_candidates: List[Dict[str, Any]],
    linked: List[Dict[str, Any]],
    deduped: List[Dict[str, Any]],
    dedupe_stats: Dict[str, Any]
) -> None:
    rated_count = sum(1 for r in deduped if r.get("explicit_rating"))
    high_conf = sum(1 for r in deduped if r.get("confidence", 0) >= 0.7)
    med_conf = sum(1 for r in deduped if 0.4 <= r.get("confidence", 0) < 0.7)
    low_conf = sum(1 for r in deduped if r.get("confidence", 0) < 0.4)

    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# Resumio FFCS: WhatsApp Chat Reviews Ingestion Report\n\n")
        f.write(f"Generated from {len(stats['file_details'])} chat file(s) across {stats['files_processed']} processed files.\n\n")

        f.write("## 1. Executive Summary\n\n")
        f.write(f"- **Total Raw Chat Messages Parsed**: {stats['total_messages']:,}\n")
        f.write(f"  - Normal Messages: {stats['message_types'].get('normal', 0):,}\n")
        f.write(f"  - System Notices: {stats['message_types'].get('system', 0):,}\n")
        f.write(f"  - Media Placeholders Omitted: {stats['message_types'].get('media_omitted', 0):,}\n")
        f.write(f"  - Deleted Messages Omitted: {stats['message_types'].get('deleted', 0):,}\n")
        f.write(f"- **Candidate Review Messages Identified**: {len(raw_candidates):,}\n")
        f.write(f"- **Multi-Message Units Linked (<= 180s)**: {len(linked):,}\n")
        f.write(f"- **Unique Duplicate Groups**: {dedupe_stats['unique_groups']:,}\n")
        f.write(f"- **Duplicate Copies Flagged**: {dedupe_stats['duplicate_copies']:,}\n")
        f.write(f"- **Explicit Ratings Extracted (0.0 - 5.0 scale)**: {rated_count:,}\n\n")

        f.write("## 2. Confidence Distribution\n\n")
        f.write(f"- High Confidence ($\ge 0.70$): **{high_conf}**\n")
        f.write(f"- Medium Confidence ($0.40 - 0.69$): **{med_conf}**\n")
        f.write(f"- Low / Borderline Confidence ($< 0.40$): **{low_conf}**\n\n")

        f.write("## 3. Privacy & Safety Verification\n\n")
        f.write("- **Sender Anonymization**: All sender names and phone numbers are hashed using a salted SHA-256 HMAC (`usr_<16hex>`). Salt is stored locally in `.salt` and never committed.\n")
        f.write("- **Zero-PII Assurance**: Pre-assertion regex verification ensures 0 unmasked phone numbers, emails, or sender names in `reviews.jsonl`.\n\n")

        f.write("## 4. Input File Details\n\n")
        f.write("| ZIP Archive | Extracted File | Messages | Format Detected |\n")
        f.write("|-------------|----------------|----------|-----------------|\n")
        for fd in stats["file_details"]:
            f.write(f"| `{fd['zip']}` | `{fd['file']}` | {fd['messages']:,} | `{fd['format_detected']}` |\n")
        f.write("\n")

        f.write("## 5. Sample Extracted & Scrubbed Reviews (15 Diverse Examples)\n\n")
        sample_reviews = [r for r in deduped if r.get("is_primary")]
        # Pick 15 evenly spaced samples
        step = max(1, len(sample_reviews) // 15)
        picked = sample_reviews[::step][:15]

        for i, s in enumerate(picked, 1):
            rating_str = f"{s['explicit_rating']['normalized_rating']}/5.0 (raw: `{s['explicit_rating']['raw_rating']}`)" if s.get("explicit_rating") else "None (opinion only)"
            f.write(f"### Example {i}: Review ID `{s['review_id']}`\n")
            f.write(f"- **Source**: `{s.get('source_zip')}` (lines {s['start_line']}-{s['end_line']})\n")
            f.write(f"- **Timestamp**: `{s['timestamp']}` | **Sender**: `{s['sender_hash']}`\n")
            f.write(f"- **Confidence**: `{s.get('confidence', 0):.2f}` | **Explicit Rating**: {rating_str}\n")
            f.write(f"- **Mentions**: Names: {s['raw_mentions']['names']}, Courses: {s['raw_mentions']['course_codes']}, Slots: {s['raw_mentions']['slot_labels']}\n")
            f.write(f"- **Reasons**: {', '.join(s['reasons'])}\n")
            clean_display_text = s['text'].replace('\n', ' ')
            if len(clean_display_text) > 250:
                clean_display_text = clean_display_text[:247] + "..."
            f.write(f"> \"{clean_display_text}\"\n\n")

def main():
    parser = argparse.ArgumentParser(description="Ingest WhatsApp chat exports and extract privacy-safe candidate reviews.")
    parser.add_argument("--zips", nargs="*", help="Paths to WhatsApp chat ZIP archives.")
    parser.add_argument("--out", default="data/processed", help="Output directory for processed reviews.")
    parser.add_argument("--salt-file", default=".salt", help="Path to local salt file.")
    args = parser.parse_args()

    zip_paths = args.zips
    if not zip_paths:
        zip_paths = glob.glob("data/raw/WhatsApp Chat - *.zip")
        if not zip_paths:
            zip_paths = glob.glob("data/raw/*.zip")

    if not zip_paths:
        print("Error: No WhatsApp chat ZIP files found.", file=sys.stderr)
        sys.exit(1)

    print(f"Ingesting reviews from {len(zip_paths)} ZIP archives...")
    for zp in zip_paths:
        print(f"  - {zp}")

    res = run_review_pipeline(zip_paths, out_dir=args.out, salt_file=args.salt_file)
    print("\nReview ingestion complete!")
    print(f"Total messages parsed: {res['total_messages']}")
    print(f"Raw candidate reviews: {res['raw_candidates']}")
    print(f"Linked review units:   {res['linked_reviews']}")
    print(f"Unique review groups:  {res['dedupe_stats']['unique_groups']}")
    print(f"Duplicates identified: {res['dedupe_stats']['duplicate_copies']}")
    print(f"Output JSONL:          {res['jsonl_path']}")
    print(f"Report:                {res['report_path']}")

if __name__ == "__main__":
    main()
