import random
import pytest
from core.generator.models import GenerateRequest, CourseSelection, HardConstraints, SoftPreferences
from core.generator.search import TimetableSearchEngine
from core.generator.oracle import BruteForceOracle

# Pool of realistic test offerings across 3 courses
OFFERINGS_POOL = {
    "CS101": [
        {"id": "c1_o1", "course_code": "CS101", "faculty_id": "f1", "canonical_name": "Prof Alpha", "theory_slots": ["A1", "TA1"], "lab_session": None, "venue": "SJT101"},
        {"id": "c1_o2", "course_code": "CS101", "faculty_id": "f2", "canonical_name": "Prof Beta", "theory_slots": ["B1", "TB1"], "lab_session": None, "venue": "SJT102"},
        {"id": "c1_o3", "course_code": "CS101", "faculty_id": "f3", "canonical_name": "Prof Gamma", "theory_slots": ["C1", "TC1"], "lab_session": None, "venue": "SJT103"},
        {"id": "c1_o4", "course_code": "CS101", "faculty_id": "f4", "canonical_name": "Prof Delta", "theory_slots": ["D1", "TD1"], "lab_session": None, "venue": "SJT104"},
        {"id": "c1_o5", "course_code": "CS101", "faculty_id": "f5", "canonical_name": "Prof Epsilon", "theory_slots": ["F1", "TF1"], "lab_session": None, "venue": "SJT105"},
    ],
    "MA102": [
        {"id": "c2_o1", "course_code": "MA102", "faculty_id": "f6", "canonical_name": "Prof Zeta", "theory_slots": ["A2", "TA2"], "lab_session": None, "venue": "TT201"},
        {"id": "c2_o2", "course_code": "MA102", "faculty_id": "f7", "canonical_name": "Prof Eta", "theory_slots": ["B2", "TB2"], "lab_session": None, "venue": "TT202"},
        {"id": "c2_o3", "course_code": "MA102", "faculty_id": "f8", "canonical_name": "Prof Theta", "theory_slots": ["A1", "TA1"], "lab_session": None, "venue": "TT203"}, # Clashes with c1_o1
        {"id": "c2_o4", "course_code": "MA102", "faculty_id": "f9", "canonical_name": "Prof Iota", "theory_slots": ["C2", "TC2"], "lab_session": None, "venue": "TT204"},
    ],
    "EE103": [
        {"id": "c3_o1", "course_code": "EE103", "faculty_id": "f10", "canonical_name": "Prof Kappa", "theory_slots": [], "lab_session": {"labels": ["L31", "L32"], "day": "MON", "start_min": 840, "end_min": 940}, "venue": "LAB1"},
        {"id": "c3_o2", "course_code": "EE103", "faculty_id": "f11", "canonical_name": "Prof Lambda", "theory_slots": [], "lab_session": {"labels": ["L37", "L38"], "day": "TUE", "start_min": 840, "end_min": 940}, "venue": "LAB2"},
        {"id": "c3_o3", "course_code": "EE103", "faculty_id": "f12", "canonical_name": "Prof Mu", "theory_slots": [], "lab_session": {"labels": ["L43", "L44"], "day": "WED", "start_min": 840, "end_min": 940}, "venue": "LAB3"},
        {"id": "c3_o4", "course_code": "EE103", "faculty_id": "f13", "canonical_name": "Prof Nu", "theory_slots": ["D2", "TD2"], "lab_session": None, "venue": "TT301"},
    ]
}

def test_oracle_brute_force_200_random_instances():
    """
    Parametric verification against BruteForceOracle across 200+ distinct
    random problem instances with random constraints, days, and hours.
    Assures zero discrepancy between backtracking solver and Cartesian brute-force.
    """
    engine = TimetableSearchEngine()
    oracle = BruteForceOracle()
    rng = random.Random(20261027)

    all_offerings_flat = [off for sublist in OFFERINGS_POOL.values() for off in sublist]
    courses_meta = {
        "CS101": {"credits": 3, "title": "Computer Science"},
        "MA102": {"credits": 4, "title": "Mathematics"},
        "EE103": {"credits": 2, "title": "Electrical Lab"}
    }
    faculty_ratings = {f"f{i}": round(rng.uniform(2.5, 5.0), 2) for i in range(1, 15)}

    TOTAL_INSTANCES = 205
    all_weekdays = ["MON", "TUE", "WED", "THU", "FRI"]

    for iteration in range(TOTAL_INSTANCES):
        # 1. Randomize subset of courses (2 or 3 courses)
        num_courses = rng.choice([2, 3])
        course_codes = rng.sample(list(OFFERINGS_POOL.keys()), num_courses)

        # 2. Randomize domain sizes (pick 2 to 4 offerings per course)
        instance_offerings = []
        for cc in course_codes:
            k = rng.randint(2, min(4, len(OFFERINGS_POOL[cc])))
            picked = rng.sample(OFFERINGS_POOL[cc], k)
            instance_offerings.extend(picked)

        # 3. Randomize hard constraints
        # Allowed days: either all or a 4-day subset
        allowed_days = rng.choice([
            all_weekdays,
            ["MON", "TUE", "WED", "THU"],
            ["TUE", "WED", "THU", "FRI"],
            ["MON", "WED", "FRI"]
        ])

        free_days = rng.choice([
            [],
            ["FRI"],
            ["MON"]
        ])
        # Free days must be within allowed_days for consistency
        free_days = [d for d in free_days if d in allowed_days]

        min_free_days_count = rng.choice([None, 0, 1, 2])
        max_daily_hours = rng.choice([None, 2.0, 3.5, 5.0])
        max_consecutive_hours = rng.choice([None, 1.5, 2.0, 3.0])
        day_pattern = rng.choice(["ANY", "HALF_DAY"])
        blocked_slots = rng.choice([[], ["A1"], ["L37"], ["B1", "C2"]])

        hard_constraints = HardConstraints(
            allowed_days=allowed_days,
            free_days=free_days,
            min_free_days_count=min_free_days_count,
            max_daily_hours=max_daily_hours,
            max_consecutive_hours=max_consecutive_hours,
            day_pattern=day_pattern,
            blocked_slots=blocked_slots
        )

        req = GenerateRequest(
            courses=[CourseSelection(course_code=cc) for cc in course_codes],
            hard_constraints=hard_constraints,
            preferences=SoftPreferences(),
            max_results=500,
            time_budget_seconds=5.0
        )

        # 4. Filter domains for oracle
        by_course = {}
        for off in instance_offerings:
            cc = off["course_code"].upper()
            if cc not in by_course:
                by_course[cc] = []
            if engine._offering_satisfies_prefilter(off, CourseSelection(course_code=cc), req):
                by_course[cc].append(off)

        # 5. Execute Solver
        engine_res = engine.generate(
            request=req,
            offerings_data=instance_offerings,
            courses_metadata=courses_meta,
            faculty_ratings=faculty_ratings
        )

        # 6. Execute Oracle
        oracle_count, oracle_ids = oracle.find_all_valid_timetables(req, by_course)

        # 7. Zero Discrepancy Assertion
        engine_ids = {t.timetable_id for t in engine_res.timetables}

        assert engine_res.total_valid == oracle_count, (
            f"Instance {iteration+1} failed: engine found {engine_res.total_valid} valid, "
            f"oracle found {oracle_count} valid. Constraints: {hard_constraints}"
        )
        assert engine_ids == oracle_ids, (
            f"Instance {iteration+1} timetable ID mismatch! Difference: {engine_ids.symmetric_difference(oracle_ids)}"
        )
