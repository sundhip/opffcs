import pytest
from fastapi.testclient import TestClient
from backend.app import app

@pytest.fixture
def client():
    return TestClient(app)

def test_api_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["database_connected"] is True
    assert "active_dataset" in data
    assert data["version"] == "1.0.0"

def test_api_courses_and_offerings(client):
    res = client.get("/api/courses?limit=10&offset=0")
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "items" in data
    assert len(data["items"]) > 0

    first_course = data["items"][0]
    course_id = first_course["id"]

    # Test offerings
    res_off = client.get(f"/api/courses/{course_id}/offerings")
    assert res_off.status_code == 200
    off_data = res_off.json()
    assert off_data["code"] == first_course["code"]
    assert "offerings" in off_data
    assert len(off_data["offerings"]) > 0

    first_offering = off_data["offerings"][0]
    assert "stable_key" in first_offering
    assert "faculty" in first_offering
    assert "meetings" in first_offering

def test_api_faculty_endpoints(client):
    res = client.get("/api/faculty?limit=10&offset=0")
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "items" in data
    assert len(data["items"]) > 0

    first_fac = data["items"][0]
    fac_id = first_fac["id"]

    res_detail = client.get(f"/api/faculty/{fac_id}")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["id"] == fac_id
    assert "canonical_name" in detail
    assert "offerings" in detail
    assert "reviews" in detail

def test_api_slots_grid(client):
    res = client.get("/api/slots/grid")
    assert res.status_code == 200
    data = res.json()
    assert "metadata" in data
    assert "theory_intervals" in data
    assert "lab_intervals" in data
    assert "atomic_slot_labels" in data
    assert "A1" in data["atomic_slot_labels"]
    assert "L37" in data["atomic_slot_labels"]

def test_api_favourites_crud(client):
    sample_key = "TEST_COURSE::TEST_FACULTY::A1+TA1::NONE::NONE"

    # Add
    post_res = client.post("/api/favourites", json={"offering_key": sample_key, "notes": "Top pick"})
    assert post_res.status_code == 200
    fav_data = post_res.json()
    assert fav_data["offering_key"] == sample_key
    fav_id = fav_data["id"]

    # List
    list_res = client.get("/api/favourites")
    assert list_res.status_code == 200
    keys = [f["offering_key"] for f in list_res.json()]
    assert sample_key in keys

    # Delete
    del_res = client.delete(f"/api/favourites/{fav_id}")
    assert del_res.status_code == 200

    # Verify deleted
    list_res_after = client.get("/api/favourites")
    keys_after = [f["offering_key"] for f in list_res_after.json()]
    assert sample_key not in keys_after

def test_api_generate_job_lifecycle(client):
    # Fetch first 2 courses
    courses_res = client.get("/api/courses?limit=2")
    courses = courses_res.json()["items"]
    course_codes = [c["code"] for c in courses[:2]]

    payload = {
        "courses": [{"course_code": cc, "include_theory": True, "include_lab": True} for cc in course_codes],
        "hard_constraints": {
            "allowed_days": ["MON", "TUE", "WED", "THU", "FRI"]
        },
        "max_results": 5,
        "time_budget_seconds": 3.0
    }

    # Start generation
    start_res = client.post("/api/generate", json=payload)
    assert start_res.status_code == 200
    job_info = start_res.json()
    assert "job_id" in job_info
    job_id = job_info["job_id"]

    # Poll status (give up to 3 seconds for small job to finish)
    import time
    for _ in range(30):
        status_res = client.get(f"/api/generate/{job_id}")
        assert status_res.status_code == 200
        job_status = status_res.json()
        if job_status["status"] in ["completed", "time_limit_exceeded"]:
            break
        time.sleep(0.1)

    assert job_status["status"] in ["completed", "time_limit_exceeded"]
    assert "result" in job_status
    assert job_status["result"]["total_valid"] >= 0
