import json
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.db.models import Dataset, ReviewMatch, Faculty

router = APIRouter(prefix="/matches", tags=["Matches"])

OVERRIDES_FILE = "data/manual/match_overrides.json"

class MatchDecisionRequest(BaseModel):
    review_id: str
    decision: str  # MATCHED or IGNORE
    faculty_id: Optional[str] = None
    notes: Optional[str] = None

@router.post("/decide")
def submit_match_decision(req: MatchDecisionRequest, db: Session = Depends(get_db)):
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
    for m in matches:
        m.status = dec
        m.faculty_id = req.faculty_id if dec == "MATCHED" else None
        m.override_applied = True
        m.score = 1.0

    db.commit()

    return {
        "status": "success",
        "review_id": req.review_id,
        "decision": dec,
        "faculty_id": req.faculty_id if dec == "MATCHED" else None
    }
