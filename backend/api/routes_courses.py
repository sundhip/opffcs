from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.db.models import Dataset, Course, Offering, Faculty, Meeting

router = APIRouter(prefix="/courses", tags=["Courses"])

def get_active_dataset_id(db: Session) -> str:
    active = db.query(Dataset).filter(Dataset.is_active == True).first()
    if not active:
        raise HTTPException(status_code=400, detail="No active dataset found. Please import a dataset first.")
    return active.id

@router.get("")
def list_courses(
    search: Optional[str] = None,
    course_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    ds_id = get_active_dataset_id(db)
    query = db.query(Course).filter(Course.dataset_id == ds_id)

    if search:
        s = f"%{search.strip().upper()}%"
        query = query.filter((Course.code.ilike(s)) | (Course.title.ilike(s)))

    if course_type:
        query = query.filter(Course.course_type == course_type)

    total = query.count()
    courses = query.order_by(Course.code.asc()).offset(offset).limit(limit).all()

    items = []
    for c in courses:
        off_count = db.query(Offering).filter(Offering.course_id == c.id, Offering.dataset_id == ds_id).count()
        items.append({
            "id": c.id,
            "code": c.code,
            "title": c.title,
            "credits": c.credits,
            "course_type": c.course_type,
            "offerings_count": off_count
        })

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": items
    }

@router.get("/{course_id}/offerings")
def get_course_offerings(course_id: str, db: Session = Depends(get_db)):
    ds_id = get_active_dataset_id(db)
    course = db.query(Course).filter(Course.id == course_id, Course.dataset_id == ds_id).first()
    if not course:
        # Check if course_id is code
        course = db.query(Course).filter(Course.code == course_id.upper(), Course.dataset_id == ds_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    offerings = db.query(Offering).filter(Offering.course_id == course.id, Offering.dataset_id == ds_id).all()
    results = []
    for off in offerings:
        fac = db.query(Faculty).filter(Faculty.id == off.faculty_id, Faculty.dataset_id == ds_id).first()
        meetings = db.query(Meeting).filter(Meeting.offering_id == off.id, Meeting.dataset_id == ds_id).all()

        results.append({
            "id": off.id,
            "stable_key": off.stable_key,
            "course_code": course.code,
            "course_title": course.title,
            "faculty": {
                "id": fac.id if fac else None,
                "canonical_name": fac.canonical_name if fac else "Unknown",
                "is_placeholder": fac.is_placeholder if fac else False
            },
            "theory_slots": off.theory_slots,
            "lab_session": off.lab_session,
            "venue": off.venue,
            "meetings": [
                {
                    "day": m.day,
                    "start_min": m.start_min,
                    "end_min": m.end_min,
                    "kind": m.kind,
                    "slot_label": m.slot_label
                }
                for m in meetings
            ]
        })

    return {
        "course_id": course.id,
        "code": course.code,
        "title": course.title,
        "credits": course.credits,
        "offerings": results
    }
