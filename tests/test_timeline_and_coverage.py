import os
import io
import pytest
from fastapi.testclient import TestClient

from backend.app import app
from core.slots.timeline import TimelineBuilder, TimelineBlock
from core.slots.slot_map import default_slot_map

def test_timeline_builder_single_offering():
    tb = TimelineBuilder(default_slot_map)
    blocks = tb.build_timeline_for_offering(
        course_code="MAT1011",
        course_title="Calculus",
        faculty_name="Dr. Ramanujan",
        theory_slots=["B1", "TB1"],
        lab_slots=["L1", "L2"],
        venue="AB1-301"
    )
    assert len(blocks) > 0
    # Check block structure
    b0 = blocks[0]
    assert isinstance(b0, TimelineBlock)
    d = b0.to_dict()
    assert d["course_code"] == "MAT1011"
    assert d["faculty_name"] == "Dr. Ramanujan"
    assert d["venue"] == "AB1-301"
    assert "start_minute" in d
    assert "end_minute" in d

def test_timeline_builder_schedule_timeline():
    tb = TimelineBuilder(default_slot_map)
    offerings = [
        {
            "course_code": "MAT1011",
            "course_title": "Calculus",
            "faculty_name": "Dr. Ramanujan",
            "theory_slots": ["B1", "TB1"],
            "lab_slots": [],
            "venue": "AB1-301"
        },
        {
            "course_code": "CSE1001",
            "course_title": "Programming",
            "faculty_name": "Dr. Turing",
            "theory_slots": ["A1", "TA1"],
            "lab_slots": ["L37", "L38"],
            "venue": "SJ-101"
        }
    ]
    schedule = tb.build_schedule_timeline(offerings)
    assert "MON" in schedule
    assert "TUE" in schedule
    assert "WED" in schedule
    assert "THU" in schedule
    assert "FRI" in schedule

    # Verify chronological sorting within days
    for day, blocks in schedule.items():
        if len(blocks) > 1:
            for i in range(len(blocks) - 1):
                assert blocks[i]["start_minute"] <= blocks[i+1]["start_minute"]

def test_api_dataset_lifecycle_and_upload():
    client = TestClient(app)

    # 1. List datasets
    res = client.get("/api/datasets")
    assert res.status_code == 200
    datasets = res.json()
    assert isinstance(datasets, list)

    active_ds = next((d for d in datasets if d["is_active"]), None)
    if active_ds:
        # Test activate existing dataset
        res_act = client.post(f"/api/datasets/{active_ds['id']}/activate")
        assert res_act.status_code == 200
        assert res_act.json()["status"] == "activated"

    # 2. Test upload invalid file extension
    fake_file = io.BytesIO(b"not a valid file")
    res_upload_bad = client.post(
        "/api/datasets/upload",
        files={"file": ("test.txt", fake_file, "text/plain")},
        data={"dataset_name": "Bad File"}
    )
    assert res_upload_bad.status_code == 400

    # 3. Test upload valid excel with dry_run
    excel_path = "data/raw/subject_teachers_slots_reviews_corrected_v2.xlsx"
    if os.path.exists(excel_path):
        with open(excel_path, "rb") as f:
            content = f.read()
        res_upload = client.post(
            "/api/datasets/upload",
            files={"file": ("test_upload.xlsx", io.BytesIO(content), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            data={"dataset_name": "Test Upload Dry Run", "dry_run": "true", "force": "true"}
        )
        assert res_upload.status_code == 200
        data = res_upload.json()
        assert "result" in data

def test_api_export_db_enrichment():
    client = TestClient(app)
    # Timetable with offering_ids but NO provided courses: should trigger DB enrichment
    payload = {
        "timetable": {
            "timetable_id": "T_DB_ENRICH",
            "offering_ids": [],
            "offering_keys": [],
            "per_day_timeline": {
                "MON": [
                    {
                        "day": "MON",
                        "start_time": "08:00",
                        "end_time": "08:50",
                        "start_min": 480,
                        "end_min": 530,
                        "kind": "theory",
                        "slot_label": "A1",
                        "course_code": "MAT1011",
                        "faculty_name": "Dr. Ramanujan",
                        "venue": "AB1-301"
                    }
                ],
                "TUE": [],
                "WED": [],
                "THU": [],
                "FRI": []
            },
            "working_days": ["MON"],
            "free_days": ["TUE", "WED", "THU", "FRI"],
            "gap_minutes_per_day": {"MON": 0},
            "longest_gap_minutes": 0,
            "max_daily_hours": 0.83,
            "earliest_start": "08:00",
            "latest_end": "08:50",
            "avg_faculty_rating": 4.8,
            "unrated_faculty_count": 0,
            "score": 95.0,
            "score_breakdown": {}
        }
    }

    # Should succeed by synthesizing course details from timeline meetings
    res_pdf = client.post("/api/exports/pdf", json=payload)
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"

    res_excel = client.post("/api/exports/excel", json=payload)
    assert res_excel.status_code == 200
