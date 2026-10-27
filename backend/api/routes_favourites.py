import uuid
from typing import Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.db.models import Favourite, Offering, Course, Faculty, Dataset

router = APIRouter(prefix="/favourites", tags=["Favourites"])

class AddFavouriteRequest(BaseModel):
    offering_key: str
    name: Optional[str] = None
    notes: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None

class UpdateFavouriteRequest(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None

@router.get("")
def list_favourites(db: Session = Depends(get_db)):
    active_ds = db.query(Dataset).filter(Dataset.is_active == True).first()
    active_ds_id = active_ds.id if active_ds else None

    favs = db.query(Favourite).order_by(Favourite.created_at.desc()).all()
    results = []

    for f in favs:
        # Check staleness:
        is_stale = False
        stale_reasons = []

        off = None
        course_info = None
        faculty_info = None

        if active_ds_id:
            # Check offering_key
            off = db.query(Offering).filter(
                Offering.stable_key == f.offering_key,
                Offering.dataset_id == active_ds_id
            ).first()

            if not off and not (f.payload and "offering_keys" in f.payload):
                is_stale = True
                stale_reasons.append(f"Offering key '{f.offering_key}' does not exist in active dataset.")

            if off:
                course = db.query(Course).filter(Course.id == off.course_id).first()
                faculty = db.query(Faculty).filter(Faculty.id == off.faculty_id).first()
                if course:
                    course_info = {"code": course.code, "title": course.title}
                if faculty:
                    faculty_info = {"canonical_name": faculty.canonical_name}

            # If this favourite represents a full timetable with payload
            if f.payload and "offering_keys" in f.payload:
                missing_keys = []
                for k in f.payload["offering_keys"]:
                    exists = db.query(Offering).filter(
                        Offering.stable_key == k,
                        Offering.dataset_id == active_ds_id
                    ).count() > 0
                    if not exists:
                        missing_keys.append(k)
                if missing_keys:
                    is_stale = True
                    stale_reasons.append(f"{len(missing_keys)} offering(s) no longer exist in active dataset ({', '.join(missing_keys[:3])}).")

        results.append({
            "id": f.id,
            "offering_key": f.offering_key,
            "name": f.name or f.offering_key,
            "notes": f.notes,
            "payload": f.payload,
            "created_at": f.created_at.isoformat(),
            "is_stale": is_stale,
            "stale_reason": "; ".join(stale_reasons) if stale_reasons else None,
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
        if req.name:
            existing.name = req.name
        if req.notes is not None:
            existing.notes = req.notes
        if req.payload is not None:
            existing.payload = req.payload
        db.commit()
        return {"status": "exists", "id": existing.id, "offering_key": existing.offering_key}

    fav = Favourite(
        id=f"fav_{uuid.uuid4().hex[:12]}",
        offering_key=key,
        name=req.name,
        notes=req.notes,
        payload=req.payload,
        created_at=datetime.utcnow()
    )
    db.add(fav)
    db.commit()
    return {"status": "created", "id": fav.id, "offering_key": fav.offering_key}

@router.patch("/{fav_id}")
def update_favourite(fav_id: str, req: UpdateFavouriteRequest, db: Session = Depends(get_db)):
    fav = db.query(Favourite).filter((Favourite.id == fav_id) | (Favourite.offering_key == fav_id)).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Favourite not found.")

    if req.name is not None:
        fav.name = req.name.strip()
    if req.notes is not None:
        fav.notes = req.notes

    db.commit()
    return {"status": "updated", "id": fav.id, "name": fav.name, "notes": fav.notes}

@router.delete("/{fav_id}")
def delete_favourite(fav_id: str, db: Session = Depends(get_db)):
    fav = db.query(Favourite).filter((Favourite.id == fav_id) | (Favourite.offering_key == fav_id)).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Favourite not found.")
    db.delete(fav)
    db.commit()
    return {"status": "deleted", "id": fav.id}
