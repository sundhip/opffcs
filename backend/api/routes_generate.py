from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.db.models import Dataset, Course, Offering, Faculty, FacultyRating
from core.generator.models import GenerateRequest
from core.generator.worker import job_manager

router = APIRouter(prefix="/generate", tags=["Generator"])

def get_active_dataset_id(db: Session) -> str:
    active = db.query(Dataset).filter(Dataset.is_active == True).first()
    if not active:
        raise HTTPException(status_code=400, detail="No active dataset found. Please import a dataset first.")
    return active.id

@router.post("")
def start_generation(req: GenerateRequest, db: Session = Depends(get_db)):
    ds_id = get_active_dataset_id(db)

    # 1. Fetch offerings for active dataset
    offerings_db = db.query(Offering).filter(Offering.dataset_id == ds_id).all()
    if not offerings_db:
        raise HTTPException(status_code=400, detail="No course offerings found in active dataset.")

    offerings_data = []
    for off in offerings_db:
        course = db.query(Course).filter(Course.id == off.course_id).first()
        fac = db.query(Faculty).filter(Faculty.id == off.faculty_id).first()
        offerings_data.append({
            "id": off.id,
            "course_id": off.course_id,
            "course_code": course.code if course else "UNKNOWN",
            "course_title": course.title if course else "Unknown",
            "faculty_id": off.faculty_id,
            "canonical_name": fac.canonical_name if fac else "Unknown",
            "raw_name": fac.raw_name if fac else "Unknown",
            "theory_slots": off.theory_slots,
            "lab_session": off.lab_session,
            "venue": off.venue,
            "stable_key": off.stable_key
        })

    # 2. Fetch courses metadata
    courses_db = db.query(Course).filter(Course.dataset_id == ds_id).all()
    courses_meta = {c.code.upper(): {"title": c.title, "credits": c.credits} for c in courses_db}

    # 3. Fetch faculty ratings
    ratings_db = db.query(FacultyRating).filter(FacultyRating.dataset_id == ds_id).all()
    fac_ratings = {r.faculty_id: r.rating_mean for r in ratings_db}

    # 4. Submit to background worker
    job_id = job_manager.submit_job(
        request=req,
        offerings_data=offerings_data,
        courses_metadata=courses_meta,
        faculty_ratings=fac_ratings
    )

    return {
        "job_id": job_id,
        "status": "running",
        "message": "Timetable generation job submitted."
    }

@router.get("/{job_id}")
def get_generation_status(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job

@router.delete("/{job_id}")
def cancel_generation_job(job_id: str):
    success = job_manager.cancel_job(job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found.")
    return {"status": "cancelled", "job_id": job_id}
