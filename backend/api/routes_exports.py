from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.db.models import Offering, Course, Faculty, FacultyRating, Favourite
from backend.services.exporter import TimetableExporter

router = APIRouter(prefix="/exports", tags=["Exports"])

class ExportPayload(BaseModel):
    timetable: Dict[str, Any]
    courses: Optional[List[Dict[str, Any]]] = None
    scale: Optional[int] = 2

class FavouritesExportPayload(BaseModel):
    favourite_ids: Optional[List[str]] = None

def enrich_course_details(db: Session, timetable: Dict[str, Any], provided_courses: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """If course details are not fully provided, enriches them from the database."""
    if provided_courses and len(provided_courses) > 0:
        return provided_courses

    offering_ids = timetable.get("offering_ids", [])
    if not offering_ids:
        # Extract unique courses from timeline
        timeline = timetable.get("per_day_timeline", {})
        seen = set()
        details = []
        for day, meetings in timeline.items():
            for m in meetings:
                cc = m.get("course_code")
                if cc and cc not in seen:
                    seen.add(cc)
                    details.append({
                        "course_code": cc,
                        "course_title": m.get("course_title") or cc,
                        "faculty_name": m.get("faculty_name", "Staff"),
                        "credits": 3,
                        "theory_slots": [m.get("slot_label")] if m.get("kind") == "theory" else [],
                        "lab_slots": [m.get("slot_label")] if m.get("kind") == "lab" else [],
                        "venue": m.get("venue"),
                        "rating_mean": 0.0,
                        "review_count": 0
                    })
        return details

    offerings = db.query(Offering).filter(Offering.id.in_(offering_ids)).all()
    results = []
    for off in offerings:
        course = db.query(Course).filter(Course.id == off.course_id).first()
        faculty = db.query(Faculty).filter(Faculty.id == off.faculty_id).first()
        rating = db.query(FacultyRating).filter(FacultyRating.faculty_id == off.faculty_id).first() if faculty else None

        lab_slots = []
        if isinstance(off.lab_session, dict):
            lab_slots = off.lab_session.get("slots") or off.lab_session.get("labels", [])
        elif isinstance(off.lab_session, list):
            lab_slots = off.lab_session

        c_code = course.code if course else "UNKNOWN"
        c_title = course.title if course else c_code
        c_credits = course.credits if course else 3
        f_name = faculty.canonical_name if faculty else "Staff"

        results.append({
            "course_code": c_code,
            "course_title": c_title,
            "credits": c_credits,
            "faculty_name": f_name,
            "theory_slots": off.theory_slots or [],
            "lab_slots": lab_slots or [],
            "venue": off.venue,
            "rating_mean": rating.rating_mean if (rating and rating.rating_mean is not None) else 0.0,
            "review_count": rating.review_count if (rating and rating.review_count is not None) else 0
        })
    return results

@router.post("/excel")
def export_excel(payload: ExportPayload, db: Session = Depends(get_db)):
    try:
        courses = enrich_course_details(db, payload.timetable, payload.courses)
        excel_bytes = TimetableExporter.export_to_excel(payload.timetable, courses)
        tt_id = payload.timetable.get("timetable_id", "timetable")
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{tt_id}.xlsx"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Excel export failed: {str(e)}")

@router.post("/csv")
def export_csv(payload: ExportPayload, db: Session = Depends(get_db)):
    try:
        courses = enrich_course_details(db, payload.timetable, payload.courses)
        csv_str = TimetableExporter.export_to_csv(payload.timetable, courses)
        tt_id = payload.timetable.get("timetable_id", "timetable")
        return Response(
            content=csv_str.encode("utf-8-sig"),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{tt_id}.csv"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV export failed: {str(e)}")

@router.post("/pdf")
def export_pdf(payload: ExportPayload, db: Session = Depends(get_db)):
    try:
        courses = enrich_course_details(db, payload.timetable, payload.courses)
        pdf_bytes = TimetableExporter.export_to_pdf(payload.timetable, courses)
        tt_id = payload.timetable.get("timetable_id", "timetable")
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{tt_id}.pdf"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF export failed: {str(e)}")

@router.post("/png")
def export_png(payload: ExportPayload, db: Session = Depends(get_db)):
    try:
        courses = enrich_course_details(db, payload.timetable, payload.courses)
        png_bytes = TimetableExporter.export_to_png(payload.timetable, courses, scale=payload.scale or 2)
        tt_id = payload.timetable.get("timetable_id", "timetable")
        return Response(
            content=png_bytes,
            media_type="image/png",
            headers={"Content-Disposition": f'attachment; filename="{tt_id}.png"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PNG export failed: {str(e)}")

@router.post("/bundle")
def export_bundle(payload: ExportPayload, db: Session = Depends(get_db)):
    try:
        courses = enrich_course_details(db, payload.timetable, payload.courses)
        zip_bytes = TimetableExporter.export_zip_bundle(payload.timetable, courses)
        tt_id = payload.timetable.get("timetable_id", "timetable")
        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{tt_id}_bundle.zip"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ZIP export failed: {str(e)}")

@router.post("/favourites")
def export_favourites_zip(payload: FavouritesExportPayload, db: Session = Depends(get_db)):
    try:
        query = db.query(Favourite)
        if payload.favourite_ids:
            query = query.filter(Favourite.id.in_(payload.favourite_ids))
        favs = query.all()
        if not favs:
            raise HTTPException(status_code=404, detail="No favourites found to export.")

        fav_dicts = []
        for f in favs:
            raw_payload = f.payload or {}
            # Unwrap timetable if nested
            tt = raw_payload.get("timetable", raw_payload)
            if not isinstance(tt, dict) or "per_day_timeline" not in tt:
                continue

            courses = enrich_course_details(db, tt, raw_payload.get("courses_data"))
            fav_dicts.append({
                "id": f.id,
                "name": f.name or f"Timetable_{f.id[:6]}",
                "timetable": tt,
                "courses": courses,
                "payload": raw_payload
            })

        if not fav_dicts:
            raise HTTPException(status_code=400, detail="None of the selected favourites contain full timetable data to export.")

        zip_bytes = TimetableExporter.export_favourites_bundle(fav_dicts)
        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={"Content-Disposition": 'attachment; filename="favourites_bundle.zip"'}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Favourites export failed: {str(e)}")
