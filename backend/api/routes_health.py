from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.db.session import get_db
from backend.db.models import Dataset

router = APIRouter(tags=["Health"])

@router.get("/health")
def get_health(db: Session = Depends(get_db)):
    db_connected = False
    active_dataset = None
    try:
        db.execute(text("SELECT 1"))
        db_connected = True
        active_ds = db.query(Dataset).filter(Dataset.is_active == True).first()
        if active_ds:
            active_dataset = {
                "id": active_ds.id,
                "name": active_ds.name,
                "checksum": active_ds.checksum,
                "imported_at": active_ds.imported_at.isoformat(),
                "stats": active_ds.stats
            }
    except Exception as e:
        db_connected = False

    return {
        "status": "healthy" if db_connected else "degraded",
        "database_connected": db_connected,
        "active_dataset": active_dataset,
        "version": "1.0.0"
    }
