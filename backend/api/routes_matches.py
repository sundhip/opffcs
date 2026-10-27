import json
import os
import statistics
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.db.models import Dataset, ReviewMatch, Review, Faculty, FacultyRating

router = APIRouter(prefix="/matches", tags=["Matches"])

OVERRIDES_FILE = "data/manual/match_overrides.json"

class MatchDecisionRequest(BaseModel):
    review_id: str
    decision: str  # MATCHED or IGNORE or UNMATCHED
    faculty_id: Optional[str] = None
    notes: Optional[str] = None

def get_active_dataset_id(db: Session) -> str:
    active = db.query(Dataset).filter(Dataset.is_active == True).first()
    if not active:
        raise HTTPException(status_code=400, detail="No active dataset found.")
    return active.id

def recalculate_faculty_rating(db: Session, faculty_id: str, dataset_id: str):
    """
    Recalculates rating metrics for a given faculty and updates or creates their FacultyRating record.
    """
    fac = db.query(Faculty).filter(Faculty.id == faculty_id, Faculty.dataset_id == dataset_id).first()
    if not fac:
        return

    matches = db.query(ReviewMatch).filter(
        ReviewMatch.faculty_id == faculty_id,
        ReviewMatch.dataset_id == dataset_id,
        ReviewMatch.status == "MATCHED"
    ).all()

    rev_ids = [m.review_id for m in matches]
    reviews = db.query(Review).filter(
        Review.review_id.in_(rev_ids),
        Review.dataset_id == dataset_id
    ).all() if rev_ids else []

    review_count = len(reviews)
    ratings = [r.explicit_rating for r in reviews if r.explicit_rating is not None]
    rated_count = len(ratings)

    rating_mean = round(float(sum(ratings) / rated_count), 2) if rated_count > 0 else None
    rating_median = round(float(statistics.median(ratings)), 2) if rated_count > 0 else None
    rating_min = min(ratings) if rated_count > 0 else None
    rating_max = max(ratings) if rated_count > 0 else None

    # Distribution 1..5
    dist = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
    for r in ratings:
        bucket = str(max(1, min(5, round(r))))
        dist[bucket] += 1

    low_sample = (rated_count < 3)

    # Bayesian smoothed: prior 3.5, C=5
    bayesian_smoothed = None
    if rated_count > 0 and rating_mean is not None:
        bayesian_smoothed = round((5 * 3.5 + rated_count * rating_mean) / (5 + rated_count), 2)

    fr = db.query(FacultyRating).filter(
        FacultyRating.faculty_id == faculty_id,
        FacultyRating.dataset_id == dataset_id
    ).first()

    if not fr:
        fr = FacultyRating(
            faculty_id=faculty_id,
            dataset_id=dataset_id,
            review_count=review_count,
            rated_count=rated_count,
            rating_mean=rating_mean,
            rating_median=rating_median,
            rating_min=rating_min,
            rating_max=rating_max,
            rating_distribution=dist,
            bayesian_smoothed=bayesian_smoothed,
            low_sample=low_sample
        )
        db.add(fr)
    else:
        fr.review_count = review_count
        fr.rated_count = rated_count
        fr.rating_mean = rating_mean
        fr.rating_median = rating_median
        fr.rating_min = rating_min
        fr.rating_max = rating_max
        fr.rating_distribution = dist
        fr.bayesian_smoothed = bayesian_smoothed
        fr.low_sample = low_sample

    db.commit()

@router.get("/queue")
def get_match_queue(
    status_filter: Optional[str] = Query(None, description="AMBIGUOUS, WEAK, or ALL"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    ds_id = get_active_dataset_id(db)
    query = db.query(ReviewMatch, Review).join(
        Review, Review.review_id == ReviewMatch.review_id
    ).filter(
        ReviewMatch.dataset_id == ds_id,
        Review.dataset_id == ds_id
    )

    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(ReviewMatch.status == status_filter.upper())
    else:
        # Default: show ambiguous and weak items needing human review
        query = query.filter(ReviewMatch.status.in_(["AMBIGUOUS", "WEAK"]))

    total = query.count()
    pairs = query.offset(offset).limit(limit).all()

    items = []
    for m, rev in pairs:
        # Enrich candidates with canonical names
        enriched_candidates = []
        if m.candidates:
            for cand in m.candidates:
                cid = cand.get("faculty_id")
                fac = db.query(Faculty).filter(Faculty.id == cid, Faculty.dataset_id == ds_id).first()
                enriched_candidates.append({
                    "faculty_id": cid,
                    "canonical_name": fac.canonical_name if fac else "Unknown",
                    "score": cand.get("score", 0.0),
                    "reasons": cand.get("reasons", [])
                })

        items.append({
            "review_id": rev.review_id,
            "status": m.status,
            "score": m.score,
            "override_applied": m.override_applied,
            "text": rev.text,
            "timestamp": rev.timestamp,
            "explicit_rating": rev.explicit_rating,
            "source_zip": rev.source_zip,
            "source_file": rev.source_file,
            "candidates": enriched_candidates
        })

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": items
    }

@router.post("/decide")
def submit_match_decision(req: MatchDecisionRequest, db: Session = Depends(get_db)):
    ds_id = get_active_dataset_id(db)
    dec = req.decision.strip().upper()
    if dec not in ["MATCHED", "IGNORE", "UNMATCHED"]:
        raise HTTPException(status_code=400, detail="Decision must be MATCHED, IGNORE, or UNMATCHED.")

    if dec == "MATCHED" and not req.faculty_id:
        raise HTTPException(status_code=400, detail="faculty_id is required when decision is MATCHED.")

    # 1. Update JSON overrides file
    os.makedirs(os.path.dirname(os.path.abspath(OVERRIDES_FILE)), exist_ok=True)
    overrides = {}
    if os.path.exists(OVERRIDES_FILE):
        try:
            with open(OVERRIDES_FILE, "r", encoding="utf-8") as f:
                overrides = json.load(f)
        except Exception:
            overrides = {}

    overrides[req.review_id] = {
        "decision": dec,
        "faculty_id": req.faculty_id if dec == "MATCHED" else None,
        "notes": req.notes or "Manual decision via API"
    }

    with open(OVERRIDES_FILE, "w", encoding="utf-8") as f:
        json.dump(overrides, f, indent=2, ensure_ascii=False)

    # 2. Update DB ReviewMatch records across datasets
    matches = db.query(ReviewMatch).filter(ReviewMatch.review_id == req.review_id).all()
    affected_faculty_ids = set()
    for m in matches:
        old_fid = m.faculty_id
        if old_fid:
            affected_faculty_ids.add(old_fid)

        m.status = dec
        m.faculty_id = req.faculty_id if dec == "MATCHED" else None
        m.override_applied = True
        m.score = 1.0

        if req.faculty_id:
            affected_faculty_ids.add(req.faculty_id)

    db.commit()

    # 3. Recalculate affected faculty ratings
    for fid in affected_faculty_ids:
        recalculate_faculty_rating(db, fid, ds_id)

    return {
        "status": "success",
        "review_id": req.review_id,
        "decision": dec,
        "faculty_id": req.faculty_id if dec == "MATCHED" else None,
        "recalculated_faculty": list(affected_faculty_ids)
    }
