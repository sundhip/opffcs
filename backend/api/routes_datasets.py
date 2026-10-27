from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.db.models import Dataset
from backend.services.importer import DatasetImporter

router = APIRouter(prefix="/datasets", tags=["Datasets"])

class ImportRequest(BaseModel):
    excel_path: Optional[str] = "data/raw/subject_teachers_slots_reviews_corrected_v2.xlsx"
    zip_paths: Optional[List[str]] = None
    dataset_name: Optional[str] = "VIT Timetable Dataset"
    force: bool = False
    dry_run: bool = False

@router.get("")
def list_datasets(db: Session = Depends(get_db)):
    datasets = db.query(Dataset).order_by(Dataset.imported_at.desc()).all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "checksum": d.checksum,
            "imported_at": d.imported_at.isoformat(),
            "is_active": d.is_active,
            "source_files": d.source_files,
            "stats": d.stats
        }
        for d in datasets
    ]

@router.post("/import")
def import_dataset(req: ImportRequest, db: Session = Depends(get_db)):
    importer = DatasetImporter(db)
    try:
        res = importer.import_dataset(
            excel_path=req.excel_path,
            zip_paths=req.zip_paths,
            dataset_name=req.dataset_name,
            force=req.force,
            dry_run=req.dry_run
        )
        return res
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")

@router.post("/{dataset_id}/activate")
def activate_dataset(dataset_id: str, db: Session = Depends(get_db)):
    importer = DatasetImporter(db)
    try:
        return importer.activate_dataset(dataset_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{dataset_id}/rollback")
def rollback_dataset(dataset_id: str, db: Session = Depends(get_db)):
    importer = DatasetImporter(db)
    try:
        return importer.rollback_dataset(dataset_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
