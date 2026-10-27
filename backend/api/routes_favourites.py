import uuid
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.db.models import Favourite, Offering, Course, Faculty

router = APIRouter(prefix="/favourites", tags=["Favourites"])

class AddFavouriteRequest(BaseModel):
    offering_key: str
    notes: Optional[str] = None

@router.get("")
def list_favourites(db: Session = Depends(get_db)):
    favs = db.query(Favourite).order_by(Favourite.created_at.desc()).all()
    results = []
    for f in favs:
        # Try to find corresponding offering in any active dataset
        off = db.query(Offering).filter(Offering.stable_key == f.offering_key).first()
        course_info = None
        faculty_info = None
        if off:
            course = db.query(Course).filter(Course.id == off.course_id).first()
            faculty = db.query(Faculty).filter(Faculty.id == off.faculty_id).first()
            if course:
                course_info = {"code": course.code, "title": course.title}
            if faculty:
                faculty_info = {"canonical_name": faculty.canonical_name}

        results.append({
            "id": f.id,
            "offering_key": f.offering_key,
            "notes": f.notes,
            "created_at": f.created_at.isoformat(),
            "course": course_info,
            "faculty": faculty_info,
            "offering_details": {
                "theory_slots": off.theory_slots,
                "lab_session": off.lab_session,
                "venue": off.venue
            } if off else None
        })

    return results

@router.post("")
def add_favourite(req: AddFavouriteRequest, db: Session = Depends(get_db)):
    key = req.offering_key.strip()
    existing = db.query(Favourite).filter(Favourite.offering_key == key).first()
    if existing:
        if req.notes:
            existing.notes = req.notes
            db.commit()
        return {"status": "exists", "id": existing.id, "offering_key": existing.offering_key}

    fav = Favourite(
        id=f"fav_{uuid.uuid4().hex[:12]}",
        offering_key=key,
        notes=req.notes,
        created_at=datetime.utcnow()
    )
    db.add(fav)
    db.commit()
    return {"status": "created", "id": fav.id, "offering_key": fav.offering_key}

@router.delete("/{fav_id}")
def delete_favourite(fav_id: str, db: Session = Depends(get_db)):
    fav = db.query(Favourite).filter((Favourite.id == fav_id) | (Favourite.offering_key == fav_id)).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Favourite not found.")
    db.delete(fav)
    db.commit()
    return {"status": "deleted", "id": fav.id}
