import hashlib
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

from sqlalchemy.orm import Session

from backend.db.models import (
    Dataset, Course, Faculty, Offering, Meeting,
    Review, ReviewMatch, FacultyRating, ImportRun
)
from core.ingest.cli import run_ingestion
from core.slots.slot_map import get_offering_meetings
from core.reviews.cli import run_review_pipeline
from core.matching.cli import run_matching

def compute_file_checksum(file_paths: List[str]) -> str:
    """Computes a combined SHA-256 checksum across one or more files."""
    hasher = hashlib.sha256()
    for fp in sorted(file_paths):
        if os.path.exists(fp):
            with open(fp, "rb") as f:
                while chunk := f.read(65536):
                    hasher.update(chunk)
    return hasher.hexdigest()

def make_stable_offering_key(course_code: str, faculty_name: str, theory_slots: List[str], lab_slots: List[str], venue: Optional[str]) -> str:
    t_str = "+".join(sorted(theory_slots)) if theory_slots else "NONE"
    l_str = "+".join(sorted(lab_slots)) if lab_slots else "NONE"
    v_str = venue.strip().upper() if venue else "NONE"
    return f"{course_code.upper()}::{faculty_name.upper()}::{t_str}::{l_str}::{v_str}"

class DatasetImporter:
    """
    Transactional, idempotent dataset importer wrapping /core pipelines
    into SQLite with dataset versioning.
    """
    def __init__(self, db: Session):
        self.db = db

    def import_dataset(
        self,
        excel_path: str = "data/raw/subject_teachers_slots_reviews_corrected_v2.xlsx",
        zip_paths: Optional[List[str]] = None,
        dataset_name: str = "Default VIT Dataset",
        force: bool = False,
        dry_run: bool = False
    ) -> Dict[str, Any]:
        if zip_paths is None:
            zip_paths = [
                "data/raw/WhatsApp Chat - '29 FFCS 1.2.zip",
                "data/raw/WhatsApp Chat - '29 FFCS 2.1.zip",
                "data/raw/WhatsApp Chat - ffcs'29.zip"
            ]

        # Verify files exist
        all_files = [excel_path] + [zp for zp in zip_paths if os.path.exists(zp)]
        if not os.path.exists(excel_path):
            raise FileNotFoundError(f"Excel file not found: {excel_path}")

        checksum = compute_file_checksum(all_files)

        # Idempotency check: see if dataset with same checksum already exists
        existing_ds = self.db.query(Dataset).filter(Dataset.checksum == checksum).first()
        if existing_ds and not force and not dry_run:
            return {
                "status": "skipped",
                "message": "Dataset with identical checksum already exists.",
                "dataset_id": existing_ds.id,
                "is_active": existing_ds.is_active,
                "stats": existing_ds.stats
            }

        # 1. Run core ingest
        temp_ingest_dir = "data/processed"
        ingest_res = run_ingestion(excel_path, out_dir=temp_ingest_dir)

        # Load generated ingest artifacts
        with open(f"{temp_ingest_dir}/courses.json", "r", encoding="utf-8") as f:
            courses_data = json.load(f)
        with open(f"{temp_ingest_dir}/faculty.json", "r", encoding="utf-8") as f:
            faculty_data = json.load(f)
        with open(f"{temp_ingest_dir}/offerings.json", "r", encoding="utf-8") as f:
            offerings_data = json.load(f)

        # 2. Run reviews ingestion
        reviews_res = run_review_pipeline(zip_paths, out_dir=temp_ingest_dir)
        reviews_data: List[Dict[str, Any]] = []
        with open(f"{temp_ingest_dir}/reviews.jsonl", "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    reviews_data.append(json.loads(line))

        # 3. Run matching
        matching_res = run_matching(
            reviews_path=f"{temp_ingest_dir}/reviews.jsonl",
            faculty_path=f"{temp_ingest_dir}/faculty.json",
            offerings_path=f"{temp_ingest_dir}/offerings.json",
            out_dir=temp_ingest_dir
        )
        matches_data: List[Dict[str, Any]] = []
        with open(f"{temp_ingest_dir}/review_matches.jsonl", "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    matches_data.append(json.loads(line))

        with open(f"{temp_ingest_dir}/faculty_ratings.json", "r", encoding="utf-8") as f:
            ratings_data = json.load(f)

        stats = {
            "courses_count": len(courses_data),
            "faculty_count": len(faculty_data),
            "offerings_count": len(offerings_data),
            "reviews_count": len(reviews_data),
            "matches_count": len(matches_data),
            "rated_faculty_count": len(ratings_data),
            "checksum": checksum
        }

        # If dry run, return validation report without committing DB
        if dry_run:
            return {
                "status": "dry_run_success",
                "message": "Dry-run validation completed with zero DB writes.",
                "stats": stats,
                "ingest_reconciliation": ingest_res.get("reconciliation", {})
            }

        dataset_id = f"ds_{uuid.uuid4().hex[:12]}"
        import_run_id = f"run_{uuid.uuid4().hex[:12]}"

        try:
            # If force-importing existing checksum, remove old one first
            if existing_ds and force:
                self.db.delete(existing_ds)
                self.db.flush()

            # Deactivate previous active datasets
            self.db.query(Dataset).filter(Dataset.is_active == True).update({"is_active": False})

            # Create Dataset
            ds = Dataset(
                id=dataset_id,
                checksum=checksum,
                name=dataset_name,
                imported_at=datetime.utcnow(),
                is_active=True,
                source_files={"excel": excel_path, "zips": zip_paths},
                stats=stats
            )
            self.db.add(ds)
            self.db.flush()

            # Insert Courses
            course_id_map: Dict[str, str] = {}
            for c in courses_data:
                db_c = Course(
                    id=c["id"],
                    dataset_id=dataset_id,
                    code=c["code"],
                    title=c["title"],
                    credits=c.get("credits", 0),
                    course_type=c.get("course_type"),
                    raw_data=c.get("raw_data")
                )
                self.db.add(db_c)
                course_id_map[c["code"]] = c["id"]

            # Insert Faculty
            fac_name_map: Dict[str, str] = {}
            for f_item in faculty_data:
                db_f = Faculty(
                    id=f_item["id"],
                    dataset_id=dataset_id,
                    canonical_name=f_item["canonical_name"],
                    raw_name=f_item["raw_name"],
                    clean_tokens=f_item.get("clean_tokens"),
                    is_placeholder=f_item.get("is_placeholder", False)
                )
                self.db.add(db_f)
                fac_name_map[f_item["id"]] = f_item["canonical_name"]

            self.db.flush()

            # Insert Offerings & Meetings
            for off in offerings_data:
                c_code = off["course_code"]
                course_id = course_id_map.get(c_code, off["id"])
                fac_id = off["faculty_id"]
                fac_name = fac_name_map.get(fac_id, "Unknown")
                th_slots = off.get("theory_slots", [])
                lab_info = off.get("lab_session")
                lab_labels = lab_info.get("labels", []) if lab_info else []
                stable_k = make_stable_offering_key(c_code, fac_name, th_slots, lab_labels, off.get("venue"))

                db_off = Offering(
                    id=off["id"],
                    dataset_id=dataset_id,
                    course_id=course_id,
                    faculty_id=fac_id,
                    theory_slots=th_slots,
                    lab_session=lab_info,
                    venue=off.get("venue"),
                    stable_key=stable_k,
                    raw_row_ref=off.get("source_refs")
                )
                self.db.add(db_off)

                # Generate Meetings
                meetings = get_offering_meetings(off)
                for m in meetings:
                    m_id = f"mtg_{uuid.uuid4().hex[:12]}"
                    db_m = Meeting(
                        id=m_id,
                        dataset_id=dataset_id,
                        offering_id=off["id"],
                        day=m.day,
                        start_min=m.start_min,
                        end_min=m.end_min,
                        kind=m.kind,
                        slot_label=m.slot_label
                    )
                    self.db.add(db_m)

            # Insert Reviews
            for r in reviews_data:
                db_r = Review(
                    id=f"r_{uuid.uuid4().hex[:12]}",
                    dataset_id=dataset_id,
                    review_id=r["review_id"],
                    text=r["text"],
                    timestamp=r.get("timestamp"),
                    sender_hash=r["sender_hash"],
                    source_zip=r.get("source_zip"),
                    source_file=r.get("source_file"),
                    line_range=r.get("line_range"),
                    explicit_rating=r.get("explicit_rating"),
                    confidence=r.get("candidate_confidence", 0.0),
                    reasons=r.get("reasons"),
                    duplicate_group_id=r.get("duplicate_group_id"),
                    is_primary=r.get("is_primary", True)
                )
                self.db.add(db_r)

            # Insert Review Matches
            for m in matches_data:
                db_m = ReviewMatch(
                    id=f"rm_{uuid.uuid4().hex[:12]}",
                    dataset_id=dataset_id,
                    review_id=m["review_id"],
                    status=m["status"],
                    faculty_id=m.get("matched_faculty_id"),
                    score=m.get("score", 0.0),
                    candidates=m.get("candidates"),
                    override_applied=m.get("override_applied", False)
                )
                self.db.add(db_m)

            # Insert Faculty Ratings
            for f_id, rat in ratings_data.items():
                db_rat = FacultyRating(
                    id=f"fr_{uuid.uuid4().hex[:12]}",
                    dataset_id=dataset_id,
                    faculty_id=f_id,
                    review_count=rat["review_count"],
                    rated_count=rat["rated_count"],
                    rating_mean=rat["rating_mean"],
                    rating_median=rat["rating_median"],
                    rating_min=rat["rating_min"],
                    rating_max=rat["rating_max"],
                    rating_distribution=rat["rating_distribution"],
                    bayesian_smoothed=rat["bayesian_smoothed_rating_separate"],
                    last_review_date=rat["last_review_date"],
                    recurring_keywords=rat["recurring_keywords"],
                    low_sample=rat["low_sample"]
                )
                self.db.add(db_rat)

            # Success import run
            run_log = ImportRun(
                id=import_run_id,
                dataset_id=dataset_id,
                status="success",
                logs={"stats": stats, "files": all_files},
                created_at=datetime.utcnow()
            )
            self.db.add(run_log)

            self.db.commit()

            return {
                "status": "success",
                "message": "Dataset successfully imported and activated.",
                "dataset_id": dataset_id,
                "stats": stats
            }

        except Exception as e:
            self.db.rollback()
            # Log failure run
            fail_log = ImportRun(
                id=import_run_id,
                dataset_id=None,
                status="failed",
                logs={"error": str(e), "files": all_files},
                created_at=datetime.utcnow()
            )
            try:
                self.db.add(fail_log)
                self.db.commit()
            except Exception:
                pass
            raise e

    def activate_dataset(self, dataset_id: str) -> Dict[str, Any]:
        ds = self.db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not ds:
            raise ValueError(f"Dataset {dataset_id} not found.")

        self.db.query(Dataset).filter(Dataset.is_active == True).update({"is_active": False})
        ds.is_active = True
        self.db.commit()
        return {"status": "success", "active_dataset_id": dataset_id}

    def rollback_dataset(self, dataset_id: str) -> Dict[str, Any]:
        """Rollback/delete a dataset and activate the most recent remaining one."""
        ds = self.db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not ds:
            raise ValueError(f"Dataset {dataset_id} not found.")

        was_active = ds.is_active
        self.db.delete(ds)
        self.db.flush()

        if was_active:
            # Activate latest remaining dataset
            latest = self.db.query(Dataset).order_by(Dataset.imported_at.desc()).first()
            if latest:
                latest.is_active = True

        self.db.commit()
        return {"status": "success", "deleted_dataset_id": dataset_id}
