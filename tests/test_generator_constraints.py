import pytest
from core.generator.models import GenerateRequest, CourseSelection, HardConstraints, SoftPreferences
from core.generator.search import TimetableSearchEngine

@pytest.fixture
def test_offerings():
    return [
        # Course A
        {"id": "off_a1", "course_code": "COURSE_A", "faculty_id": "f1", "canonical_name": "Prof A1", "theory_slots": ["A1", "TA1"], "lab_session": None, "venue": "SJT101"},
        {"id": "off_a2", "course_code": "COURSE_A", "faculty_id": "f2", "canonical_name": "Prof A2", "theory_slots": ["B1", "TB1"], "lab_session": None, "venue": "SJT102"},
        # Course B
        {"id": "off_b1", "course_code": "COURSE_B", "faculty_id": "f3", "canonical_name": "Prof B1", "theory_slots": ["C1", "TC1"], "lab_session": None, "venue": "SJT103"},
        {"id": "off_b2", "course_code": "COURSE_B", "faculty_id": "f4", "canonical_name": "Prof B2", "theory_slots": ["A1", "TA1"], "lab_session": None, "venue": "SJT104"}, # Clashes with off_a1
        # Course Lab (Tuesday Afternoon L37+L38: 14:00-15:40)
        {"id": "off_lab", "course_code": "COURSE_LAB", "faculty_id": "f5", "canonical_name": "Prof L", "theory_slots": [], "lab_session": {"labels": ["L37", "L38"], "day": "TUE", "start_min": 840, "end_min": 940}, "venue": "LAB1"},
        # Course Tuesday Afternoon Theory: B2 meets on Tuesday Period 6 (14:00-14:50), G2 meets on Tuesday Period 7 (14:55-15:45)
        {"id": "off_tue_pm_b2", "course_code": "COURSE_TUE", "faculty_id": "f6", "canonical_name": "Prof T", "theory_slots": ["B2", "TB2"], "lab_session": None, "venue": "SJT105"},
        {"id": "off_tue_pm_g2", "course_code": "COURSE_TUE_G2", "faculty_id": "f7", "canonical_name": "Prof G", "theory_slots": ["G2", "TG2"], "lab_session": None, "venue": "SJT106"}
    ]

@pytest.fixture
def metadata():
    return {
        "COURSE_A": {"credits": 3, "title": "Course A"},
        "COURSE_B": {"credits": 3, "title": "Course B"},
        "COURSE_LAB": {"credits": 2, "title": "Course Lab"},
        "COURSE_TUE": {"credits": 3, "title": "Course Tue"}
    }

def test_combined_lab_blocks_both_periods(test_offerings, metadata):
    engine = TimetableSearchEngine()

    # Test 1: L37+L38 overlaps B2 (Period 6: 14:00-14:50). Must clash!
    req_b2 = GenerateRequest(
        courses=[
            CourseSelection(course_code="COURSE_LAB"),
            CourseSelection(course_code="COURSE_TUE")
        ],
        hard_constraints=HardConstraints(),
        max_results=10
    )
    res_b2 = engine.generate(req_b2, test_offerings, metadata, {})
    assert res_b2.status == "infeasible"
    assert res_b2.total_valid == 0

    # Test 2: L37+L38 also overlaps G2 (Period 7: 14:55-15:45). Must also clash!
    req_g2 = GenerateRequest(
        courses=[
            CourseSelection(course_code="COURSE_LAB"),
            CourseSelection(course_code="COURSE_TUE_G2")
        ],
        hard_constraints=HardConstraints(),
        max_results=10
    )
    res_g2 = engine.generate(req_g2, test_offerings, metadata, {})
    assert res_g2.status == "infeasible"
    assert res_g2.total_valid == 0

def test_soft_preferences_never_change_valid_count(test_offerings, metadata):
    engine = TimetableSearchEngine()

    req_balanced = GenerateRequest(
        courses=[
            CourseSelection(course_code="COURSE_A"),
            CourseSelection(course_code="COURSE_B")
        ],
        hard_constraints=HardConstraints(),
        preferences=SoftPreferences(
            minimize_gaps_weight=1.0,
            prefer_free_days_weight=1.0,
            faculty_rating_weight=1.0
        ),
        max_results=50
    )
    res_balanced = engine.generate(req_balanced, test_offerings, metadata, {"f1": 4.5, "f2": 2.0, "f3": 3.0, "f4": 5.0})

    req_ratings_heavy = GenerateRequest(
        courses=[
            CourseSelection(course_code="COURSE_A"),
            CourseSelection(course_code="COURSE_B")
        ],
        hard_constraints=HardConstraints(),
        preferences=SoftPreferences(
            minimize_gaps_weight=0.0,
            prefer_free_days_weight=0.0,
            faculty_rating_weight=10.0
        ),
        max_results=50
    )
    res_ratings_heavy = engine.generate(req_ratings_heavy, test_offerings, metadata, {"f1": 4.5, "f2": 2.0, "f3": 3.0, "f4": 5.0})

    # Total valid must be strictly identical regardless of preference weights!
    assert res_balanced.total_valid == res_ratings_heavy.total_valid
    assert res_balanced.total_valid == 3  # (a1, b1), (a2, b1), (a2, b2); (a1, b2) clashes

def test_blocked_slots_hard_constraint(test_offerings, metadata):
    engine = TimetableSearchEngine()

    # Block B1 slot
    req = GenerateRequest(
        courses=[CourseSelection(course_code="COURSE_A")],
        hard_constraints=HardConstraints(blocked_slots=["B1"]),
        max_results=10
    )
    res = engine.generate(req, test_offerings, metadata, {})
    assert res.total_valid == 1
    assert res.timetables[0].offering_ids == ["off_a1"]

def test_free_days_hard_constraint(test_offerings, metadata):
    engine = TimetableSearchEngine()

    # A1 meets on MON, WED, FRI. If FRI is free, A1 must be pruned!
    req = GenerateRequest(
        courses=[CourseSelection(course_code="COURSE_A")],
        hard_constraints=HardConstraints(free_days=["FRI"]),
        max_results=10
    )
    res = engine.generate(req, test_offerings, metadata, {})
    # off_a1 meets on MON, WED, FRI -> rejected
    # off_a2 (B1+TB1) meets on TUE, THU -> accepted!
    assert res.total_valid == 1
    assert res.timetables[0].offering_ids == ["off_a2"]

def test_day_pattern_morning_and_afternoon(test_offerings, metadata):
    engine = TimetableSearchEngine()

    # COURSE_LAB is Afternoon only
    req_morn = GenerateRequest(
        courses=[CourseSelection(course_code="COURSE_LAB")],
        hard_constraints=HardConstraints(day_pattern="MORNING_ONLY"),
        max_results=10
    )
    res_morn = engine.generate(req_morn, test_offerings, metadata, {})
    assert res_morn.status == "infeasible"

    req_aft = GenerateRequest(
        courses=[CourseSelection(course_code="COURSE_LAB")],
        hard_constraints=HardConstraints(day_pattern="AFTERNOON_ONLY"),
        max_results=10
    )
    res_aft = engine.generate(req_aft, test_offerings, metadata, {})
    assert res_aft.total_valid == 1
