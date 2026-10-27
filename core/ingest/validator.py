import difflib
from typing import Dict, List, Any, Optional, Tuple, Set
from core.ingest.models import Course, Faculty, Offering, SourceRef
from core.slots.clash import meetings_to_bitmask
from core.slots.slot_map import default_slot_map

class IngestionValidator:
    def __init__(self, slot_map=None):
        self.slot_map = slot_map or default_slot_map

    def validate_and_deduplicate(
        self,
        raw_rows_count: int,
        raw_items: List[Dict[str, Any]],
        rejected_rows: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Deduplicates valid offerings, identifies near-duplicates, computes bitmasks,
        and verifies row reconciliation.
        """
        courses_dict: Dict[str, Course] = {}
        faculty_dict: Dict[str, Faculty] = {}
        
        # Exact-duplicate key: (course_code, faculty_id, tuple(theory_slots), lab_raw, venue)
        offerings_map: Dict[Tuple, Offering] = {}
        exact_duplicates_count = 0
        duplicate_details: List[Dict[str, Any]] = []
        
        for item in raw_items:
            c_code = item["course_code"]
            c_title = item["course_title"]
            f_id = item["faculty_id"]
            f_name = item["faculty_name"]
            f_raw = item["raw_faculty_name"]
            f_is_placeholder = item["is_placeholder"]
            theory_slots = item["theory_slots"]
            lab_session = item["lab_session"]
            venue = item.get("venue")
            review_text = item.get("review")
            source_ref = item["source_ref"]
            
            # Course model
            if c_code not in courses_dict:
                courses_dict[c_code] = Course(
                    id=c_code,
                    code=c_code,
                    title=c_title,
                    source_refs=[source_ref]
                )
            else:
                courses_dict[c_code].source_refs.append(source_ref)
                
            # Faculty model
            if f_id not in faculty_dict:
                faculty_dict[f_id] = Faculty(
                    id=f_id,
                    raw_name=f_raw,
                    canonical_name=f_name,
                    is_placeholder=f_is_placeholder,
                    clean_tokens=f_name.split(),
                    source_refs=[source_ref]
                )
            else:
                faculty_dict[f_id].source_refs.append(source_ref)
                
            # Offering deduplication key
            t_key = tuple(sorted(theory_slots))
            l_key = tuple(sorted(lab_session.slots)) if lab_session else ()
            dup_key = (c_code, f_id, t_key, l_key, venue)
            
            if dup_key in offerings_map:
                exact_duplicates_count += 1
                existing_off = offerings_map[dup_key]
                existing_off.source_refs.append(source_ref)
                duplicate_details.append({
                    "course_code": c_code,
                    "faculty_name": f_name,
                    "theory_slots": theory_slots,
                    "lab_slots": lab_session.slots if lab_session else [],
                    "venue": venue,
                    "first_seen": existing_off.source_refs[0].model_dump(),
                    "duplicate_ref": source_ref.model_dump()
                })
            else:
                # Compute bitmask for this offering
                try:
                    meetings = self.slot_map.get_meetings_for_offering(
                        theory_slots,
                        lab_session.slots if lab_session else None
                    )
                    mask = meetings_to_bitmask(meetings)
                except Exception:
                    mask = 0

                offering_id = f"off_{c_code}_{f_id}_{'_'.join(t_key)}_{'_'.join(l_key)}"
                offering = Offering(
                    id=offering_id,
                    course_code=c_code,
                    faculty_id=f_id,
                    faculty_name=f_name,
                    theory_slots=theory_slots,
                    raw_theory_slot=item.get("raw_theory_slot"),
                    lab_session=lab_session,
                    raw_lab_slot=item.get("raw_lab_slot"),
                    venue=venue,
                    review_text=review_text,
                    bitmask=mask,
                    source_refs=[source_ref]
                )
                offerings_map[dup_key] = offering

        unique_offerings = list(offerings_map.values())
        kept_rows = len(unique_offerings)
        rejected_count = len(rejected_rows)
        
        # Reconciliation check: raw_rows = kept + duplicates_removed + rejected
        reconciled_total = kept_rows + exact_duplicates_count + rejected_count
        diff = raw_rows_count - reconciled_total
        
        # Near-duplicate detection (same course, same slots, but slight faculty variant or different venue)
        near_duplicates: List[Dict[str, Any]] = []
        for i in range(len(unique_offerings)):
            for j in range(i + 1, len(unique_offerings)):
                o1 = unique_offerings[i]
                o2 = unique_offerings[j]
                if o1.course_code == o2.course_code:
                    t1 = tuple(sorted(o1.theory_slots))
                    t2 = tuple(sorted(o2.theory_slots))
                    l1 = tuple(sorted(o1.lab_session.slots if o1.lab_session else []))
                    l2 = tuple(sorted(o2.lab_session.slots if o2.lab_session else []))
                    if t1 == t2 and l1 == l2 and o1.faculty_id != o2.faculty_id:
                        # Check name similarity
                        ratio = difflib.SequenceMatcher(None, o1.faculty_name, o2.faculty_name).ratio()
                        if ratio > 0.8:
                            near_duplicates.append({
                                "course_code": o1.course_code,
                                "slots": t1,
                                "faculty_a": o1.faculty_name,
                                "faculty_b": o2.faculty_name,
                                "similarity": round(ratio, 3),
                                "ref_a": o1.source_refs[0].model_dump(),
                                "ref_b": o2.source_refs[0].model_dump()
                            })

        # Probable faculty name variants across entire dataset
        all_faculty_names = [f.canonical_name for f in faculty_dict.values() if not f.is_placeholder]
        name_variants: List[Dict[str, Any]] = []
        for i, name_a in enumerate(all_faculty_names):
            matches = difflib.get_close_matches(name_a, all_faculty_names[i+1:], n=3, cutoff=0.82)
            for m in matches:
                name_variants.append({
                    "name_a": name_a,
                    "name_b": m,
                    "similarity": round(difflib.SequenceMatcher(None, name_a, m).ratio(), 3)
                })

        return {
            "reconciliation": {
                "raw_data_rows": raw_rows_count,
                "kept_offerings": kept_rows,
                "exact_duplicates_removed": exact_duplicates_count,
                "rejected_rows": rejected_count,
                "reconciled_sum": reconciled_total,
                "difference": diff,
                "status": "PASS" if diff == 0 else "FAIL"
            },
            "summary_counts": {
                "distinct_courses": len(courses_dict),
                "distinct_faculty": len(faculty_dict),
                "kept_offerings": kept_rows,
                "exact_duplicates": exact_duplicates_count,
                "rejected_rows": rejected_count
            },
            "courses": list(courses_dict.values()),
            "faculty": list(faculty_dict.values()),
            "offerings": unique_offerings,
            "duplicate_details": duplicate_details,
            "near_duplicates": near_duplicates,
            "faculty_name_variants": name_variants,
            "rejected_details": rejected_rows
        }
