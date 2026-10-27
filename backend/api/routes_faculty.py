from typing import Optional, List
from collections import Counter
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.db.models import Dataset, Faculty, FacultyRating, ReviewMatch, Review, Offering, Course

router = APIRouter(prefix="/faculty", tags=["Faculty"])

def get_active_dataset_id(db: Session) -> str:
    active = db.query(Dataset).filter(Dataset.is_active == True).first()
    if not active:
        raise HTTPException(status_code=400, detail="No active dataset found.")
    return active.id

@router.get("")
def list_faculty(
    search: Optional[str] = None,
    min_rating: Optional[float] = None,
    has_reviews_only: bool = False,
    sort_by: str = Query("name", pattern="^(name|rating|reviews)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    ds_id = get_active_dataset_id(db)
    query = db.query(Faculty).filter(Faculty.dataset_id == ds_id, Faculty.is_placeholder == False)

    if search:
        s = f"%{search.strip().upper()}%"
        query = query.filter(Faculty.canonical_name.ilike(s))

    faculty_list = query.all()
    results = []

    for fac in faculty_list:
        rat = db.query(FacultyRating).filter(FacultyRating.faculty_id == fac.id, FacultyRating.dataset_id == ds_id).first()
        review_count = rat.review_count if rat else 0
        mean_rating = rat.rating_mean if rat else None

        if has_reviews_only and review_count == 0:
            continue
        if min_rating is not None and (mean_rating is None or mean_rating < min_rating):
            continue

        results.append({
            "id": fac.id,
            "canonical_name": fac.canonical_name,
            "review_count": review_count,
            "rated_count": rat.rated_count if rat else 0,
            "rating_mean": mean_rating,
            "bayesian_smoothed": rat.bayesian_smoothed if rat else None,
            "low_sample": rat.low_sample if rat else True
        })

    # In-memory sort
    if sort_by == "rating":
        results.sort(key=lambda x: (x["rating_mean"] is not None, x["rating_mean"] or 0), reverse=True)
    elif sort_by == "reviews":
        results.sort(key=lambda x: x["review_count"], reverse=True)
    else:
        results.sort(key=lambda x: x["canonical_name"])

    total = len(results)
    paginated = results[offset:offset+limit]

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": paginated
    }

@router.get("/compare")
def compare_faculty(
    faculty_ids: str = Query(..., description="Comma separated list of faculty IDs (2 to 4)"),
    db: Session = Depends(get_db)
):
    ds_id = get_active_dataset_id(db)
    ids = [i.strip() for i in faculty_ids.split(",") if i.strip()]
    if len(ids) < 2 or len(ids) > 6:
        raise HTTPException(status_code=400, detail="Please provide between 2 and 6 faculty IDs to compare.")

    comparison_results = []
    for fid in ids:
        fac = db.query(Faculty).filter(Faculty.id == fid, Faculty.dataset_id == ds_id).first()
        if not fac:
            continue
        rat = db.query(FacultyRating).filter(FacultyRating.faculty_id == fac.id, FacultyRating.dataset_id == ds_id).first()
        offerings = db.query(Offering).filter(Offering.faculty_id == fac.id, Offering.dataset_id == ds_id).all()

        courses_set = set()
        for off in offerings:
            c = db.query(Course).filter(Course.id == off.course_id).first()
            if c:
                courses_set.add(f"{c.code} - {c.title}")

        rating_summary = None
        if rat:
            rating_summary = {
                "review_count": rat.review_count,
                "rated_count": rat.rated_count,
                "rating_mean": rat.rating_mean,
                "rating_median": rat.rating_median,
                "rating_distribution": rat.rating_distribution,
                "recurring_keywords": rat.recurring_keywords,
                "low_sample": rat.low_sample
            }

        comparison_results.append({
            "id": fac.id,
            "canonical_name": fac.canonical_name,
            "raw_name": fac.raw_name,
            "courses_taught": sorted(list(courses_set)),
            "offering_count": len(offerings),
            "rating_summary": rating_summary
        })

    return {
        "count": len(comparison_results),
        "items": comparison_results
    }

@router.get("/{faculty_id}")
def get_faculty_detail(
    faculty_id: str,
    search: Optional[str] = None,
    reviews_limit: int = Query(20, ge=1, le=100),
    reviews_offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    ds_id = get_active_dataset_id(db)
    fac = db.query(Faculty).filter(Faculty.id == faculty_id, Faculty.dataset_id == ds_id).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty not found.")

    rat = db.query(FacultyRating).filter(FacultyRating.faculty_id == fac.id, FacultyRating.dataset_id == ds_id).first()

    # Get offerings taught
    offerings = db.query(Offering).filter(Offering.faculty_id == fac.id, Offering.dataset_id == ds_id).all()
    off_data = []
    for off in offerings:
        c = db.query(Course).filter(Course.id == off.course_id).first()
        off_data.append({
            "id": off.id,
            "course_code": c.code if c else "Unknown",
            "course_title": c.title if c else "Unknown",
            "stable_key": off.stable_key,
            "theory_slots": off.theory_slots,
            "lab_session": off.lab_session,
            "venue": off.venue
        })

    # Get matched reviews query
    matches_query = db.query(ReviewMatch, Review).join(
        Review, Review.review_id == ReviewMatch.review_id
    ).filter(
        ReviewMatch.faculty_id == fac.id,
        ReviewMatch.dataset_id == ds_id,
        Review.dataset_id == ds_id,
        ReviewMatch.status == "MATCHED"
    )

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        matches_query = matches_query.filter(Review.text.ilike(term))

    total_reviews = matches_query.count()
    paginated_pairs = matches_query.offset(reviews_offset).limit(reviews_limit).all()

    reviews_list = []
    sources_counter = Counter()

    # Query all matches for source breakdown (if reasonable)
    all_matched_reviews = db.query(Review.source_zip, Review.source_file).join(
        ReviewMatch, ReviewMatch.review_id == Review.review_id
    ).filter(
        ReviewMatch.faculty_id == fac.id,
        ReviewMatch.dataset_id == ds_id,
        Review.dataset_id == ds_id,
        ReviewMatch.status == "MATCHED"
    ).all()

    for s_zip, s_file in all_matched_reviews:
        src = s_zip or s_file or "Direct"
        sources_counter[src] += 1

    for m, rev in paginated_pairs:
        reviews_list.append({
            "review_id": rev.review_id,
            "text": rev.text,
            "timestamp": rev.timestamp,
            "sender_hash": rev.sender_hash,
            "source_zip": rev.source_zip,
            "source_file": rev.source_file,
            "explicit_rating": rev.explicit_rating,
            "confidence": rev.confidence,
            "match_score": m.score,
            "match_reasons": m.candidates[0].get("reasons", []) if m.candidates else []
        })

    # Count ambiguous matches where this faculty was one of the candidates
    ambiguous_count = 0
    ambiguous_matches = db.query(ReviewMatch).filter(
        ReviewMatch.dataset_id == ds_id,
        ReviewMatch.status.in_(["AMBIGUOUS", "WEAK"])
    ).all()
    for am in ambiguous_matches:
        if am.candidates:
            if any(cand.get("faculty_id") == fac.id for cand in am.candidates):
                ambiguous_count += 1

    rating_summary = None
    if rat:
        rating_summary = {
            "review_count": rat.review_count,
            "rated_count": rat.rated_count,
            "rating_mean": rat.rating_mean,
            "rating_median": rat.rating_median,
            "rating_min": rat.rating_min,
            "rating_max": rat.rating_max,
            "rating_distribution": rat.rating_distribution,
            "bayesian_smoothed": rat.bayesian_smoothed,
            "last_review_date": rat.last_review_date,
            "recurring_keywords": rat.recurring_keywords,
            "low_sample": rat.low_sample
        }

    return {
        "id": fac.id,
        "canonical_name": fac.canonical_name,
        "raw_name": fac.raw_name,
        "is_placeholder": fac.is_placeholder,
        "rating_summary": rating_summary,
        "source_breakdown": dict(sources_counter),
        "ambiguous_count": ambiguous_count,
        "offerings": off_data,
        "reviews": {
            "total": total_reviews,
            "limit": reviews_limit,
            "offset": reviews_offset,
            "items": reviews_list
        }
    }
