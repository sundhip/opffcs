import os
import shutil
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
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

@router.post("/upload")
async def upload_dataset_file(
    file: UploadFile = File(...),
    dataset_name: str = Form("Uploaded Dataset"),
    dry_run: bool = Form(True),
    force: bool = Form(False),
    db: Session = Depends(get_db)
):
    """Handles direct upload of an Excel or WhatsApp ZIP file, running validation/dry-run."""
    os.makedirs("data/raw", exist_ok=True)
    filename = file.filename or "uploaded_file"
    file_ext = os.path.splitext(filename)[1].lower()

    if file_ext not in [".xlsx", ".xls", ".zip"]:
        raise HTTPException(status_code=400, detail="Only .xlsx or .zip files are supported.")

    dest_path = os.path.join("data/raw", f"upload_{filename}")
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    importer = DatasetImporter(db)
    try:
        if file_ext in [".xlsx", ".xls"]:
            res = importer.import_dataset(
                excel_path=dest_path,
                dataset_name=dataset_name,
                force=force,
                dry_run=dry_run
            )
        else:
            res = importer.import_dataset(
                zip_paths=[dest_path],
                dataset_name=dataset_name,
                force=force,
                dry_run=dry_run
            )
        return {
            "filename": filename,
            "saved_as": dest_path,
            "result": res
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File validation/import failed: {str(e)}")

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

@router.get("/system/integrity")
def get_db_integrity(db: Session = Depends(get_db)):
    importer = DatasetImporter(db)
    return importer.run_integrity_check()

@router.get("/system/backup/bundle")
def export_backup_bundle(db: Session = Depends(get_db)):
    importer = DatasetImporter(db)
    return importer.export_backup_bundle()

@router.post("/system/restore/bundle")
def restore_backup_bundle(bundle: Dict[str, Any], db: Session = Depends(get_db)):
    importer = DatasetImporter(db)
    try:
        return importer.restore_backup_bundle(bundle)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Restore failed: {str(e)}")

