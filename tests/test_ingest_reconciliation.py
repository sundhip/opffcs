import json
import os
import shutil
import pytest
from core.ingest.cli import run_ingestion

CANONICAL_EXCEL = r"D:\ffcs-maker\data\raw\subject_teachers_slots_reviews_corrected_v2.xlsx"

@pytest.fixture
def tmp_out(tmp_path):
    out_dir = tmp_path / "processed"
    out_dir.mkdir()
    return str(out_dir)

def test_full_file_reconciliation(tmp_out):
    """
    Asserts raw_data_rows = kept_offerings + exact_duplicates + rejected_rows,
    and the difference must be exactly zero.
    """
    res = run_ingestion(CANONICAL_EXCEL, tmp_out)
    recon = res["reconciliation"]
    assert recon["status"] == "PASS"
    assert recon["difference"] == 0
    assert recon["raw_data_rows"] == 58
    assert recon["kept_offerings"] == 58
    assert recon["exact_duplicates_removed"] == 0
    assert recon["rejected_rows"] == 0

def test_golden_10_plus_offerings(tmp_out):
    """
    Golden test asserting structure and values of real offerings from the canonical dataset.
    """
    run_ingestion(CANONICAL_EXCEL, tmp_out)
    with open(os.path.join(tmp_out, "offerings.json"), "r", encoding="utf-8") as f:
        offerings = json.load(f)

    assert len(offerings) >= 10
    
    # Check specific well-known offerings
    # 1. Software Engineering with lab L55+L56
    se_offerings = [o for o in offerings if o["course_code"] == "BACSE204"]
    assert len(se_offerings) == 6
    assert any("B1" in o["theory_slots"] and o["lab_session"] and "L55" in o["lab_session"]["slots"] for o in se_offerings)

    # 2. Discrete Mathematics (pure theory C1+TC1+TCC1)
    dm_offerings = [o for o in offerings if o["course_code"] == "BAMAT205"]
    assert len(dm_offerings) == 15
    for o in dm_offerings:
        assert o["theory_slots"] == ["C1", "TC1", "TCC1"]
        assert o["lab_session"] is None

    # 3. AI & ML with lab L43+L44
    aiml_offerings = [o for o in offerings if o["course_code"] == "BACSE205"]
    assert len(aiml_offerings) == 11
    assert all("E1" in o["theory_slots"] and "TE1" in o["theory_slots"] for o in aiml_offerings)

    # 4. Aptitude course with vendor trainers
    apt_offerings = [o for o in offerings if o["course_code"] == "BASTS102"]
    assert len(apt_offerings) == 3

    # 5. Placeholder teacher handling
    mgmt_offerings = [o for o in offerings if o["course_code"] == "BAHSM100"]
    assert len(mgmt_offerings) == 1
    assert mgmt_offerings[0]["faculty_name"] == "[Unassigned]"
    assert mgmt_offerings[0]["theory_slots"] == ["D1", "TD1"]

def test_faculty_name_spacing_cleanup(tmp_out):
    """
    Verifies that wrapped faculty names (e.g. VIJAYAKUMA R K P)
    are cleaned to canonical format (VIJAYAKUMAR K P).
    """
    run_ingestion(CANONICAL_EXCEL, tmp_out)
    with open(os.path.join(tmp_out, "faculty.json"), "r", encoding="utf-8") as f:
        faculty = json.load(f)

    names = [fac["canonical_name"] for fac in faculty]
    assert "VIJAYAKUMAR K P" in names
    assert "PRIYADARSHINI J" in names
    assert "SIVABALAKRISHNAN M" in names
    assert "PRABHAKARAN R" in names

def test_ingestion_idempotency(tmp_path):
    """
    Runs ingestion twice on the same input into separate directories.
    Outputs must be byte-for-byte identical.
    """
    out1 = str(tmp_path / "out1")
    out2 = str(tmp_path / "out2")
    
    run_ingestion(CANONICAL_EXCEL, out1)
    run_ingestion(CANONICAL_EXCEL, out2)

    for fname in ["courses.json", "faculty.json", "offerings.json", "validation_report.json"]:
        p1 = os.path.join(out1, fname)
        p2 = os.path.join(out2, fname)
        with open(p1, "r", encoding="utf-8") as f1, open(p2, "r", encoding="utf-8") as f2:
            assert f1.read() == f2.read(), f"Idempotency failed for {fname}"
