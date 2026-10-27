import argparse
import json
import os
import sys
import yaml
from typing import Dict, List, Any

from core.ingest.loader import ExcelLoader
from core.ingest.models import SourceRef
from core.ingest.normalizer import (
    normalize_course_code,
    normalize_course_title,
    normalize_faculty_name,
    normalize_slot_string
)
from core.ingest.slot_parser import SlotParser, SlotParseError
from core.ingest.validator import IngestionValidator
from core.slots.slot_map import default_slot_map

def run_ingestion(excel_path: str, out_dir: str, mapping_path: str = None) -> Dict[str, Any]:
    if mapping_path is None:
        mapping_path = os.path.join(os.path.dirname(__file__), "mapping.yaml")
        
    with open(mapping_path, "r", encoding="utf-8") as f:
        mapping_config = yaml.safe_load(f)
        
    file_basename = os.path.basename(excel_path)
    file_conf = None
    for pattern, conf in mapping_config.get("files", {}).items():
        if pattern in file_basename or file_basename in pattern:
            file_conf = conf
            break
            
    if not file_conf:
        # Default to standard per_course header mapping
        file_conf = {
            "sheet_mode": "per_course",
            "has_header": true,
            "columns": {
                "course_code": "Course Code",
                "course_title": "Subject",
                "faculty_name": "Teacher Name",
                "theory_slot": "Theory Slot",
                "lab_slot": "Lab Slot",
                "review": "Reviews / Ratings"
            }
        }
        
    loader = ExcelLoader(excel_path)
    sheets_data = loader.load_all_sheets()
    slot_parser = SlotParser(default_slot_map)
    validator = IngestionValidator(default_slot_map)
    
    raw_valid_items: List[Dict[str, Any]] = []
    rejected_rows: List[Dict[str, Any]] = []
    total_data_rows = 0
    
    for sheet_name, s_data in sheets_data.items():
        # Check sheet skip
        sheet_conf = file_conf.get("sheets", {}).get(sheet_name, {})
        if sheet_conf.get("skip") is True:
            continue
            
        rows = s_data["rows"]
        if not rows:
            continue
            
        # Determine column indices
        col_indices: Dict[str, int] = {}
        data_rows_start = 0
        
        if file_conf.get("sheet_mode") == "mixed" and sheet_conf.get("columns"):
            col_indices = sheet_conf["columns"]
            data_rows_start = 0
        else:
            # Header row lookup
            header_vals = rows[0][1]
            data_rows_start = 1
            for idx, val in enumerate(header_vals):
                if val is not None:
                    col_indices[str(val).strip().lower()] = idx
                    
        for r_idx, r_vals in rows[data_rows_start:]:
            # Check for completely blank row
            if all(v is None or str(v).strip() == "" for v in r_vals):
                continue
                
            total_data_rows += 1
            source_ref = SourceRef(
                file=file_basename,
                sheet=sheet_name,
                row=r_idx,
                raw_data={f"col_{i}": v for i, v in enumerate(r_vals) if v is not None}
            )
            
            # Helper to extract
            def get_val(key_name, header_title=None):
                if isinstance(col_indices.get(key_name), int):
                    idx = col_indices[key_name]
                    return r_vals[idx] if idx < len(r_vals) else None
                if header_title and header_title.lower() in col_indices:
                    idx = col_indices[header_title.lower()]
                    return r_vals[idx] if idx < len(r_vals) else None
                return None

            raw_code = get_val("course_code", "Course Code")
            raw_title = get_val("course_title", "Subject")
            raw_teacher = get_val("faculty_name", "Teacher Name")
            raw_tslot = get_val("theory_slot", "Theory Slot")
            raw_lslot = get_val("lab_slot", "Lab Slot")
            raw_venue = get_val("venue", "Venue")
            raw_review = get_val("review", "Reviews / Ratings")
            
            # Fallback if course_code is missing in row: check sheet name
            norm_code = normalize_course_code(raw_code)
            if not norm_code:
                # Some sheets put course code in row or sheet title
                if "software" in sheet_name.lower(): norm_code = "BACSE204"
                elif "ai ml" in sheet_name.lower(): norm_code = "BACSE205"
                elif "maths" in sheet_name.lower(): norm_code = "BAMAT205"
                elif "cloud" in sheet_name.lower(): norm_code = "BACSE345"
                elif "embedded" in sheet_name.lower(): norm_code = "BACSE324"

            norm_title = normalize_course_title(raw_title) or sheet_name
            canonical_faculty, is_placeholder, faculty_id = normalize_faculty_name(raw_teacher)
            norm_tslot = normalize_slot_string(raw_tslot)
            norm_lslot = normalize_slot_string(raw_lslot)
            
            # Validate mandatory elements
            if not norm_code:
                rejected_rows.append({
                    "ref": source_ref.model_dump(),
                    "reason": "Missing course code",
                    "raw_values": r_vals
                })
                continue
                
            if not norm_tslot and not norm_lslot:
                rejected_rows.append({
                    "ref": source_ref.model_dump(),
                    "reason": "Missing both theory and lab slot",
                    "raw_values": r_vals
                })
                continue
                
            # Parse theory slots
            parsed_theory_slots = []
            if norm_tslot:
                try:
                    parsed_theory_slots = slot_parser.parse_theory_slots(norm_tslot)
                except SlotParseError as e:
                    rejected_rows.append({
                        "ref": source_ref.model_dump(),
                        "reason": f"Theory slot error: {e}",
                        "raw_values": r_vals
                    })
                    continue

            # Parse lab session
            parsed_lab_session = None
            if norm_lslot:
                try:
                    parsed_lab_session = slot_parser.parse_lab_session(norm_lslot)
                except SlotParseError as e:
                    rejected_rows.append({
                        "ref": source_ref.model_dump(),
                        "reason": f"Lab slot error: {e}",
                        "raw_values": r_vals
                    })
                    continue

            raw_valid_items.append({
                "course_code": norm_code,
                "course_title": norm_title,
                "faculty_id": faculty_id,
                "faculty_name": canonical_faculty,
                "raw_faculty_name": str(raw_teacher) if raw_teacher else "",
                "is_placeholder": is_placeholder,
                "theory_slots": parsed_theory_slots,
                "raw_theory_slot": norm_tslot if norm_tslot else None,
                "lab_session": parsed_lab_session,
                "raw_lab_slot": norm_lslot if norm_lslot else None,
                "venue": str(raw_venue).strip() if raw_venue else None,
                "review": str(raw_review).strip() if raw_review else None,
                "source_ref": source_ref
            })

    # Validate, deduplicate, and reconcile
    result = validator.validate_and_deduplicate(
        raw_rows_count=total_data_rows,
        raw_items=raw_valid_items,
        rejected_rows=rejected_rows
    )
    
    # Save outputs
    os.makedirs(out_dir, exist_ok=True)
    
    courses_out = os.path.join(out_dir, "courses.json")
    with open(courses_out, "w", encoding="utf-8") as f:
        json.dump([c.model_dump() for c in result["courses"]], f, indent=2)
        
    faculty_out = os.path.join(out_dir, "faculty.json")
    with open(faculty_out, "w", encoding="utf-8") as f:
        json.dump([fac.model_dump() for fac in result["faculty"]], f, indent=2)
        
    offerings_out = os.path.join(out_dir, "offerings.json")
    with open(offerings_out, "w", encoding="utf-8") as f:
        json.dump([o.model_dump() for o in result["offerings"]], f, indent=2)
        
    report_json_out = os.path.join(out_dir, "validation_report.json")
    with open(report_json_out, "w", encoding="utf-8") as f:
        json.dump({
            "reconciliation": result["reconciliation"],
            "summary_counts": result["summary_counts"],
            "duplicates": result["duplicate_details"],
            "near_duplicates": result["near_duplicates"],
            "name_variants": result["faculty_name_variants"],
            "rejected_rows": result["rejected_details"]
        }, f, indent=2)
        
    # Generate Markdown Report
    report_md_out = os.path.join(out_dir, "validation_report.md")
    with open(report_md_out, "w", encoding="utf-8") as f:
        f.write(f"# Ingestion & Validation Report: {file_basename}\n\n")
        f.write(f"**Status**: **{result['reconciliation']['status']}** (Reconciliation difference: {result['reconciliation']['difference']})\n\n")
        f.write("## 1. Row Reconciliation\n\n")
        f.write("| Metric | Count |\n| :--- | :---: |\n")
        f.write(f"| **Raw Data Rows** | **{result['reconciliation']['raw_data_rows']}** |\n")
        f.write(f"| **Kept Valid Offerings** | **{result['reconciliation']['kept_offerings']}** |\n")
        f.write(f"| **Exact Duplicates Removed** | **{result['reconciliation']['exact_duplicates_removed']}** |\n")
        f.write(f"| **Rejected Rows** | **{result['reconciliation']['rejected_rows']}** |\n")
        f.write(f"| **Reconciled Sum** | **{result['reconciliation']['reconciled_sum']}** |\n")
        f.write(f"| **Reconciliation Difference** | **{result['reconciliation']['difference']}** |\n\n")
        
        f.write("## 2. Summary Counts\n\n")
        f.write(f"- **Distinct Courses**: {result['summary_counts']['distinct_courses']}\n")
        f.write(f"- **Distinct Faculty**: {result['summary_counts']['distinct_faculty']}\n")
        f.write(f"- **Total Offerings Saved**: {result['summary_counts']['kept_offerings']}\n\n")
        
        f.write("## 3. Probable Faculty Name Variants for Review\n\n")
        if result['faculty_name_variants']:
            f.write("| Faculty Name A | Faculty Name B | Similarity |\n| :--- | :--- | :---: |\n")
            for nv in result['faculty_name_variants']:
                f.write(f"| {nv['name_a']} | {nv['name_b']} | {nv['similarity']} |\n")
        else:
            f.write("None detected above 0.82 threshold.\n")
            
        f.write("\n## 4. Near-Duplicates (Same Slot & Course, Different Faculty/Venue)\n\n")
        if result['near_duplicates']:
            for nd in result['near_duplicates']:
                f.write(f"- Course `{nd['course_code']}` in slots `{nd['slots']}`: `{nd['faculty_a']}` vs `{nd['faculty_b']}` (Sim: {nd['similarity']})\n")
        else:
            f.write("None detected.\n")
            
        f.write("\n## 5. Rejected Rows\n\n")
        if result['rejected_details']:
            for rr in result['rejected_details']:
                f.write(f"- Row `{rr['ref']['row']}` in Sheet `{rr['ref']['sheet']}`: {rr['reason']}\n")
        else:
            f.write("Zero rejected rows.\n")

    print(f"\n=======================================================")
    print(f"INGESTION COMPLETE: {file_basename}")
    print(f"Reconciliation: {result['reconciliation']['raw_data_rows']} raw = {result['reconciliation']['kept_offerings']} kept + {result['reconciliation']['exact_duplicates_removed']} dups + {result['reconciliation']['rejected_rows']} rejected (Diff: {result['reconciliation']['difference']})")
    print(f"Courses: {result['summary_counts']['distinct_courses']}, Faculty: {result['summary_counts']['distinct_faculty']}, Offerings: {result['summary_counts']['kept_offerings']}")
    print(f"Outputs written to: {out_dir}")
    print(f"=======================================================")
    return result

def main():
    parser = argparse.ArgumentParser(description="FFCS Excel Ingestion & Validation CLI")
    parser.add_argument("--excel", required=True, help="Path to input Excel file (.xlsx)")
    parser.add_argument("--out", default="data/processed", help="Output directory for JSON and validation report")
    parser.add_argument("--mapping", default=None, help="Path to custom mapping.yaml")
    args = parser.parse_args()

    run_ingestion(args.excel, args.out, args.mapping)

if __name__ == "__main__":
    main()
