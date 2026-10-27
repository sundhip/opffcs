import os
import tempfile
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.db.session import Base
from backend.db.models import Dataset, Course, Offering
from backend.services.importer import DatasetImporter

@pytest.fixture
def test_db_session():
    # Use temporary in-memory or file SQLite
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    engine = create_engine(f"sqlite:///{db_path}")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    yield session

    session.close()
    engine.dispose()
    if os.path.exists(db_path):
        os.remove(db_path)

def test_importer_idempotency_and_dry_run(test_db_session):
    importer = DatasetImporter(test_db_session)
    excel_path = "data/raw/subject_teachers_slots_reviews_corrected_v2.xlsx"
    zip_paths = [
        "data/raw/WhatsApp Chat - '29 FFCS 1.2.zip"
    ]

    # 1. Dry-run test: should validate and report stats without writing to DB
    dry_res = importer.import_dataset(
        excel_path=excel_path,
        zip_paths=zip_paths,
        dataset_name="Dry Run Test",
        dry_run=True
    )
    assert dry_res["status"] == "dry_run_success"
    assert test_db_session.query(Dataset).count() == 0
    assert test_db_session.query(Course).count() == 0

    # 2. Real import test
    res1 = importer.import_dataset(
        excel_path=excel_path,
        zip_paths=zip_paths,
        dataset_name="Real Dataset 1",
        force=False,
        dry_run=False
    )
    assert res1["status"] == "success"
    assert test_db_session.query(Dataset).count() == 1
    assert test_db_session.query(Course).count() == 16
    assert test_db_session.query(Offering).count() == 70

    # 3. Idempotent re-import test: identical checksum should skip
    res2 = importer.import_dataset(
        excel_path=excel_path,
        zip_paths=zip_paths,
        dataset_name="Real Dataset 1 Duplicate",
        force=False,
        dry_run=False
    )
    assert res2["status"] == "skipped"
    # Counts should be unchanged
    assert test_db_session.query(Dataset).count() == 1
    assert test_db_session.query(Course).count() == 16

def test_importer_rollback_on_failure(test_db_session):
    importer = DatasetImporter(test_db_session)

    # Intentionally provide invalid excel path to trigger failure
    with pytest.raises(FileNotFoundError):
        importer.import_dataset(
            excel_path="data/raw/non_existent_file.xlsx",
            zip_paths=[],
            dataset_name="Failure Test"
        )

    # Database must remain completely clean
    assert test_db_session.query(Dataset).count() == 0
    assert test_db_session.query(Course).count() == 0
