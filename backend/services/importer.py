import hashlib
import json
import os
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Set, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.db.models import (
    Dataset, Course, Faculty, Offering, Meeting,
    Review, ReviewMatch, FacultyRating, ImportRun, Favourite, Preference
)
from core.ingest.models import KNOWN_COURSE_CREDITS
from core.ingest.cli import run_ingestion
from core.slots.slot_map import get_offering_meetings
from core.reviews.cli import run_review_pipeline
from core.matching.cli import run_matching

BACKUP_DIR = Path("data/backups")
MAX_BACKUPS_TO_KEEP = 5

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
    into SQLite with dataset versioning, automatic backups, offering diffs,
    and rollback capabilities.
    """
    def __init__(self, db: Session):
        self.db = db

    def create_database_backup(self, db_path: str = "data/app.db") -> Optional[str]:
        """
        Creates an automatic timestamped DB backup before commit and retains up to 5 recent backups.
        """
        if not os.path.exists(db_path):
            return None

        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        ts_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        backup_file = BACKUP_DIR / f"app_backup_{ts_str}.db"

        # Safely copy database file
        shutil.copy2(db_path, backup_file)

        # Rotate backups to keep only 5
        all_backups = sorted(BACKUP_DIR.glob("app_backup_*.db"), key=os.path.getmtime, reverse=True)
        for old_backup in all_backups[MAX_BACKUPS_TO_KEEP:]:
            try:
                os.remove(old_backup)
            except OSError:
                pass

        return str(backup_file)

    def compute_dataset_diff(
        self,
        new_offerings: List[Dict[str, Any]],
        new_faculty_map: Dict[str, str],
        active_dataset_id: Optional[str]
    ) -> Dict[str, Any]:
        """
        Computes a structural diff of new offerings vs the active dataset offerings in SQLite:
        - Added offerings
        - Removed offerings
        - Modified offerings (same course & faculty, but changed slots/venue)
        - Renamed faculty candidates
        - Stale favourites check
        """
        if not active_dataset_id:
            return {
                "active_dataset_present": False,
                "added_count": len(new_offerings),
                "removed_count": 0,
                "modified_count": 0,
                "renamed_faculty_candidates": [],
                "affected_favourites_count": 0
            }

        existing_offerings = self.db.query(Offering).filter(Offering.dataset_id == active_dataset_id).all()
        existing_keys = {off.stable_key: off for off in existing_offerings}

        # Build new keys
        new_keys_map: Dict[str, Dict[str, Any]] = {}
        for off in new_offerings:
            c_code = off["course_code"]
            f_name = new_faculty_map.get(off["faculty_id"], "Unknown")
            th_slots = off.get("theory_slots", [])
            lab_info = off.get("lab_session")
            lab_labels = lab_info.get("labels", []) if lab_info else []
            stable_k = make_stable_offering_key(c_code, f_name, th_slots, lab_labels, off.get("venue"))
            new_keys_map[stable_k] = {
                "course_code": c_code,
                "faculty_name": f_name,
                "theory_slots": th_slots,
                "lab_labels": lab_labels,
                "venue": off.get("venue"),
                "offering": off
            }

        added_keys = set(new_keys_map.keys()) - set(existing_keys.keys())
        removed_keys = set(existing_keys.keys()) - set(new_keys_map.keys())

        # Check for modified offerings (same course and same faculty, but slot or venue changed)
        modified_list = []
        renamed_faculty_candidates = []

        existing_pairs: Dict[Tuple[str, str], List[Offering]] = {}
        for off in existing_offerings:
            parts = off.stable_key.split("::")
            if len(parts) >= 2:
                pair = (parts[0], parts[1])
                existing_pairs.setdefault(pair, []).append(off)

        for ak in list(added_keys):
            info = new_keys_map[ak]
            pair = (info["course_code"].upper(), info["faculty_name"].upper())
            if pair in existing_pairs:
                # Same course & faculty exists in active dataset with different slot
                modified_list.append({
                    "course_code": info["course_code"],
                    "faculty_name": info["faculty_name"],
                    "new_key": ak,
                    "old_key": existing_pairs[pair][0].stable_key
                })

        # Check for renamed faculty candidates (same course code & same slots, different faculty name)
        existing_slot_fingerprints: Dict[Tuple[str, str, str], str] = {}
        for off in existing_offerings:
            parts = off.stable_key.split("::")
            if len(parts) >= 5:
                # (course, theory_slots, lab_slots) -> faculty_name
                existing_slot_fingerprints[(parts[0], parts[2], parts[3])] = parts[1]

        for ak in added_keys:
            info = new_keys_map[ak]
            t_str = "+".join(sorted(info["theory_slots"])) if info["theory_slots"] else "NONE"
            l_str = "+".join(sorted(info["lab_labels"])) if info["lab_labels"] else "NONE"
            fingerprint = (info["course_code"].upper(), t_str, l_str)
            if fingerprint in existing_slot_fingerprints:
                old_fac = existing_slot_fingerprints[fingerprint]
                if old_fac != info["faculty_name"].upper():
                    renamed_faculty_candidates.append({
                        "course_code": info["course_code"],
                        "previous_faculty": old_fac,
                        "candidate_new_faculty": info["faculty_name"],
                        "slots": f"Theory: {t_str}, Lab: {l_str}"
                    })

        # Check affected favourites
        affected_favs = self.db.query(Favourite).filter(Favourite.offering_key.in_(list(removed_keys))).count()

        return {
            "active_dataset_present": True,
            "added_count": len(added_keys),
            "removed_count": len(removed_keys),
            "modified_count": len(modified_list),
            "added_sample": list(added_keys)[:5],
            "removed_sample": list(removed_keys)[:5],
            "modified_sample": modified_list[:5],
            "renamed_faculty_candidates": renamed_faculty_candidates,
            "affected_favourites_count": affected_favs
        }

    def import_dataset(
        self,
        excel_path: str = "data/raw/subject_teachers_slots_reviews_corrected_v2.xlsx",
        zip_paths: Optional[List[str]] = None,
        dataset_name: str = "Default VIT Dataset",
        force: bool = False,
        dry_run: bool = False,
        column_mapping: Optional[Dict[str, str]] = None
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

        # Active dataset check for diffing
        active_ds = self.db.query(Dataset).filter(Dataset.is_active == True).first()
        active_ds_id = active_ds.id if active_ds else None

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

        faculty_name_map = {f["id"]: f["canonical_name"] for f in faculty_data}

        # Compute structural diff against current active dataset
        dataset_diff = self.compute_dataset_diff(offerings_data, faculty_name_map, active_ds_id)

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

        # If dry run, return validation report and diff without committing DB
        if dry_run:
            return {
                "status": "dry_run_success",
                "message": "Dry-run validation completed with zero DB writes.",
                "stats": stats,
                "ingest_reconciliation": ingest_res.get("reconciliation", {}),
                "dataset_diff": dataset_diff
            }

        # COMMIT PATH: Create automatic DB backup first
        backup_path = self.create_database_backup()

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
                source_files={"excel": excel_path, "zips": zip_paths, "backup_before_import": backup_path},
                stats=stats
            )
            self.db.add(ds)
            self.db.flush()

            # Insert Courses
            course_id_map: Dict[str, str] = {}
            for c in courses_data:
                c_scoped_id = f"{dataset_id}_{c['id']}"
                db_c = Course(
                    id=c_scoped_id,
                    dataset_id=dataset_id,
                    code=c["code"],
                    title=c["title"],
                    credits=c.get("credits") or KNOWN_COURSE_CREDITS.get(c["code"], 3),
                    course_type=c.get("course_type"),
                    raw_data=c.get("raw_data")
                )
                self.db.add(db_c)
                course_id_map[c["code"]] = c_scoped_id

            # Insert Faculty
            fac_id_map: Dict[str, str] = {}
            fac_name_map: Dict[str, str] = {}
            for f_item in faculty_data:
                f_scoped_id = f"{dataset_id}_{f_item['id']}"
                db_f = Faculty(
                    id=f_scoped_id,
                    dataset_id=dataset_id,
                    canonical_name=f_item["canonical_name"],
                    raw_name=f_item["raw_name"],
                    clean_tokens=f_item.get("clean_tokens"),
                    is_placeholder=f_item.get("is_placeholder", False)
                )
                self.db.add(db_f)
                fac_id_map[f_item["id"]] = f_scoped_id
                fac_name_map[f_item["id"]] = f_item["canonical_name"]

            self.db.flush()

            # Insert Offerings & Meetings
            for off in offerings_data:
                c_code = off["course_code"]
                course_id = course_id_map.get(c_code)
                fac_raw_id = off["faculty_id"]
                fac_id = fac_id_map.get(fac_raw_id)
                fac_name = fac_name_map.get(fac_raw_id, "Unknown")
                th_slots = off.get("theory_slots", [])
                lab_info = off.get("lab_session")
                lab_labels = lab_info.get("labels", []) if lab_info else []
                stable_k = make_stable_offering_key(c_code, fac_name, th_slots, lab_labels, off.get("venue"))

                off_scoped_id = f"{dataset_id}_{off['id']}"
                db_off = Offering(
                    id=off_scoped_id,
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
                        offering_id=off_scoped_id,
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
                matched_raw_fac = m.get("matched_faculty_id")
                matched_scoped_fac = fac_id_map.get(matched_raw_fac) if matched_raw_fac else None
                db_m = ReviewMatch(
                    id=f"rm_{uuid.uuid4().hex[:12]}",
                    dataset_id=dataset_id,
                    review_id=m["review_id"],
                    status=m["status"],
                    faculty_id=matched_scoped_fac,
                    score=m.get("score", 0.0),
                    candidates=m.get("candidates"),
                    override_applied=m.get("override_applied", False)
                )
                self.db.add(db_m)

            # Insert Faculty Ratings
            for f_id, rat in ratings_data.items():
                scoped_fid = fac_id_map.get(f_id)
                if not scoped_fid:
                    continue
                db_rat = FacultyRating(
                    id=f"fr_{uuid.uuid4().hex[:12]}",
                    dataset_id=dataset_id,
                    faculty_id=scoped_fid,
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
                logs={"stats": stats, "files": all_files, "backup": backup_path},
                created_at=datetime.utcnow()
            )
            self.db.add(run_log)

            self.db.commit()

            return {
                "status": "success",
                "dataset_id": dataset_id,
                "is_active": True,
                "backup_path": backup_path,
                "stats": stats,
                "dataset_diff": dataset_diff
            }

        except Exception as e:
            self.db.rollback()
            raise RuntimeError(f"Database transaction failed: {str(e)}")

    def activate_dataset(self, dataset_id: str) -> Dict[str, Any]:
        """Activates a specific dataset version."""
        target = self.db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not target:
            raise ValueError(f"Dataset {dataset_id} not found.")

        self.db.query(Dataset).filter(Dataset.is_active == True).update({"is_active": False})
        target.is_active = True
        self.db.commit()
        return {"status": "activated", "dataset_id": dataset_id}

    def rollback_dataset(self, current_dataset_id: str) -> Dict[str, Any]:
        """Rolls back from current active dataset to the immediately preceding version."""
        current = self.db.query(Dataset).filter(Dataset.id == current_dataset_id).first()
        if not current:
            raise ValueError(f"Dataset {current_dataset_id} not found.")

        # Find previous dataset
        prev = self.db.query(Dataset).filter(
            Dataset.imported_at < current.imported_at
        ).order_by(Dataset.imported_at.desc()).first()

        if not prev:
            raise ValueError("No previous dataset version found to roll back to.")

        current.is_active = False
        prev.is_active = True
        self.db.commit()
        return {
            "status": "rolled_back",
            "deactivated_dataset_id": current.dataset_id if hasattr(current, "dataset_id") else current.id,
            "activated_dataset_id": prev.id
        }

    def run_integrity_check(self) -> Dict[str, Any]:
        """Executes SQLite PRAGMA integrity_check and validates foreign keys."""
        integrity_res = self.db.execute(text("PRAGMA integrity_check")).fetchall()
        fk_res = self.db.execute(text("PRAGMA foreign_key_check")).fetchall()

        is_ok = len(integrity_res) == 1 and integrity_res[0][0] == "ok" and len(fk_res) == 0

        return {
            "is_valid": is_ok,
            "integrity_check": [row[0] for row in integrity_res],
            "foreign_key_violations": len(fk_res)
        }

    def export_backup_bundle(self) -> Dict[str, Any]:
        """Exports bundle of favourites, preferences, match overrides, and active dataset metadata."""
        active_ds = self.db.query(Dataset).filter(Dataset.is_active == True).first()
        favs = self.db.query(Favourite).all()
        prefs = self.db.query(Preference).all()

        overrides_data = {}
        if os.path.exists("data/manual/match_overrides.json"):
            try:
                with open("data/manual/match_overrides.json", "r", encoding="utf-8") as f:
                    overrides_data = json.load(f)
            except Exception:
                pass

        return {
            "schema_version": 1,
            "exported_at": datetime.utcnow().isoformat(),
            "active_dataset": {
                "id": active_ds.id,
                "name": active_ds.name,
                "checksum": active_ds.checksum,
                "stats": active_ds.stats
            } if active_ds else None,
            "favourites": [
                {
                    "id": f.id,
                    "offering_key": f.offering_key,
                    "name": f.name,
                    "notes": f.notes,
                    "payload": f.payload,
                    "created_at": f.created_at.isoformat()
                }
                for f in favs
            ],
            "preferences": [
                {
                    "id": p.id,
                    "name": p.name,
                    "payload": p.payload
                }
                for p in prefs
            ],
            "match_overrides": overrides_data
        }

    def restore_backup_bundle(self, bundle: Dict[str, Any]) -> Dict[str, Any]:
        """Restores bundle data into database."""
        fav_count = 0
        for f_data in bundle.get("favourites", []):
            existing = self.db.query(Favourite).filter(Favourite.offering_key == f_data["offering_key"]).first()
            if not existing:
                fav = Favourite(
                    id=f_data["id"],
                    offering_key=f_data["offering_key"],
                    name=f_data.get("name"),
                    notes=f_data.get("notes"),
                    payload=f_data.get("payload"),
                    created_at=datetime.fromisoformat(f_data["created_at"]) if "created_at" in f_data else datetime.utcnow()
                )
                self.db.add(fav)
                fav_count += 1

        pref_count = 0
        for p_data in bundle.get("preferences", []):
            existing = self.db.query(Preference).filter(Preference.name == p_data["name"]).first()
            if existing:
                existing.payload = p_data["payload"]
            else:
                pref = Preference(
                    id=p_data["id"],
                    name=p_data["name"],
                    payload=p_data["payload"]
                )
                self.db.add(pref)
            pref_count += 1

        # Restore overrides
        if bundle.get("match_overrides"):
            os.makedirs("data/manual", exist_ok=True)
            with open("data/manual/match_overrides.json", "w", encoding="utf-8") as f:
                json.dump(bundle["match_overrides"], f, indent=2, ensure_ascii=False)

        self.db.commit()
        return {
            "status": "restored",
            "restored_favourites_count": fav_count,
            "restored_preferences_count": pref_count
        }
