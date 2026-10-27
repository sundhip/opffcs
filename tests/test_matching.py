import json
import os
import tempfile
import pytest

from core.matching.alias_index import AliasIndex
from core.matching.matcher import FacultyMatcher
from core.matching.aggregator import aggregate_faculty_ratings
from core.matching.cli import apply_queue_decisions

@pytest.fixture
def sample_faculty_data():
    return [
        {
            "id": "fac_1",
            "canonical_name": "VIJAYAKUMAR K P",
            "clean_tokens": ["VIJAYAKUMAR", "K", "P"],
            "is_placeholder": False
        },
        {
            "id": "fac_2",
            "canonical_name": "REVATHI S",
            "clean_tokens": ["REVATHI", "S"],
            "is_placeholder": False
        },
        {
            "id": "fac_3",
            "canonical_name": "RAJESH M",
            "clean_tokens": ["RAJESH", "M"],
            "is_placeholder": False
        },
        {
            "id": "fac_4",
            "canonical_name": "RAJESH KUMAR MOHAPATRA",
            "clean_tokens": ["RAJESH", "KUMAR", "MOHAPATRA"],
            "is_placeholder": False
        }
    ]

@pytest.fixture
def sample_offerings_data():
    return [
        {
            "course_code": "BCSE202L",
            "faculty_id": "fac_1",
            "theory_slots": ["A1", "TA1"],
            "lab_session": None,
            "venue": "SJT311"
        },
        {
            "course_code": "BMAT201L",
            "faculty_id": "fac_2",
            "theory_slots": ["B1", "TB1"],
            "lab_session": None,
            "venue": "TT415"
        }
    ]

def test_alias_index_generation(sample_faculty_data, sample_offerings_data, tmp_path):
    fac_path = tmp_path / "faculty.json"
    off_path = tmp_path / "offerings.json"
    fac_path.write_text(json.dumps(sample_faculty_data), encoding="utf-8")
    off_path.write_text(json.dumps(sample_offerings_data), encoding="utf-8")

    index = AliasIndex(str(fac_path), str(off_path))
    assert "VIJAYAKUMAR K P" in index.alias_to_faculty
    assert "KP VIJAYAKUMAR" in index.alias_to_faculty
    assert "VIJAYAKUMAR" in index.alias_to_faculty

    # Shared alias check: RAJESH is shared by fac_3 and fac_4
    assert index.is_shared("RAJESH") is True
    # Non-shared alias check
    assert index.is_shared("MOHAPATRA") is False

    # Context check
    ctx = index.get_faculty_context("fac_1")
    assert "BCSE202L" in ctx["courses"]
    assert "A1" in ctx["slots"]

def test_matcher_decisions_and_context(sample_faculty_data, sample_offerings_data, tmp_path):
    fac_path = tmp_path / "faculty.json"
    off_path = tmp_path / "offerings.json"
    fac_path.write_text(json.dumps(sample_faculty_data), encoding="utf-8")
    off_path.write_text(json.dumps(sample_offerings_data), encoding="utf-8")

    index = AliasIndex(str(fac_path), str(off_path))
    matcher = FacultyMatcher(alias_index=index, match_overrides_path="")

    # 1. Exact full match
    r1 = {
        "review_id": "rev_1",
        "text": "Vijayakumar K P is a very good professor for theory",
        "raw_mentions": {"names": ["VIJAYAKUMAR"], "course_codes": [], "slot_labels": []}
    }
    m1 = matcher.match_review(r1)
    assert m1["status"] == "MATCHED"
    assert m1["matched_faculty_id"] == "fac_1"
    assert m1["score"] >= 0.85

    # 2. Conflicting initials penalty (Revathi A R vs canonical REVATHI S)
    r2 = {
        "review_id": "rev_2",
        "text": "How is Dr. Revathi A R for marks?",
        "raw_mentions": {"names": ["REVATHI"], "course_codes": [], "slot_labels": []}
    }
    m2 = matcher.match_review(r2)
    # With conflicting initials 'A R', score drops below MATCHED threshold
    assert m2["status"] in ["WEAK", "UNMATCHED"]
    assert m2["matched_faculty_id"] is None

    # 3. Context boost turns a partial mention into a high-confidence match
    r3 = {
        "review_id": "rev_3",
        "text": "Take Vijayakumar in slot A1 for BCSE202L, very lenient grading",
        "raw_mentions": {"names": ["VIJAYAKUMAR"], "course_codes": ["BCSE202L"], "slot_labels": ["A1"]}
    }
    m3 = matcher.match_review(r3)
    assert m3["status"] == "MATCHED"
    assert m3["matched_faculty_id"] == "fac_1"
    assert any("course_context" in reason for reason in m3["candidates"][0]["reasons"])
    assert any("slot_context" in reason for reason in m3["candidates"][0]["reasons"])

    # 4. Shared alias without context causes AMBIGUOUS or WEAK
    r4 = {
        "review_id": "rev_4",
        "text": "How is Rajesh sir?",
        "raw_mentions": {"names": ["RAJESH"], "course_codes": [], "slot_labels": []}
    }
    m4 = matcher.match_review(r4)
    assert m4["status"] in ["AMBIGUOUS", "WEAK"]

def test_manual_override_priority(sample_faculty_data, sample_offerings_data, tmp_path):
    fac_path = tmp_path / "faculty.json"
    off_path = tmp_path / "offerings.json"
    ov_path = tmp_path / "match_overrides.json"

    fac_path.write_text(json.dumps(sample_faculty_data), encoding="utf-8")
    off_path.write_text(json.dumps(sample_offerings_data), encoding="utf-8")
    ov_data = {
        "rev_forced": {
            "decision": "MATCHED",
            "faculty_id": "fac_3",
            "notes": "Verified by course code in another message"
        }
    }
    ov_path.write_text(json.dumps(ov_data), encoding="utf-8")

    index = AliasIndex(str(fac_path), str(off_path))
    matcher = FacultyMatcher(alias_index=index, match_overrides_path=str(ov_path))

    r = {
        "review_id": "rev_forced",
        "text": "Ambiguous message text with no faculty name",
        "raw_mentions": {"names": [], "course_codes": [], "slot_labels": []}
    }
    m = matcher.match_review(r)
    assert m["status"] == "MATCHED"
    assert m["matched_faculty_id"] == "fac_3"
    assert m["override_applied"] is True
    assert m["score"] == 1.0

def test_aggregator_mathematical_precision(sample_faculty_data):
    # Prepare reviews
    reviews_by_id = {
        "r1": {
            "review_id": "r1",
            "text": "Great teaching strict attendance",
            "timestamp": "2025-10-28T10:00:00",
            "explicit_rating": {"normalized_rating": 4.0},
            "source_zip": "zip1.zip"
        },
        "r2": {
            "review_id": "r2",
            "text": "Very chill grading gives high marks",
            "timestamp": "2025-10-29T11:00:00",
            "explicit_rating": {"normalized_rating": 5.0},
            "source_zip": "zip1.zip"
        },
        "r3": {
            "review_id": "r3",
            "text": "Average teacher",
            "timestamp": "2025-10-30T12:00:00",
            "explicit_rating": {"normalized_rating": 3.0},
            "source_zip": "zip2.zip"
        },
        "r_ambig": {
            "review_id": "r_ambig",
            "text": "Ambiguous review that should be excluded",
            "timestamp": "2025-10-31T12:00:00",
            "explicit_rating": {"normalized_rating": 1.0},
            "source_zip": "zip2.zip"
        }
    }

    matched_reviews = [
        {"review_id": "r1", "status": "MATCHED", "matched_faculty_id": "fac_1"},
        {"review_id": "r2", "status": "MATCHED", "matched_faculty_id": "fac_1"},
        {"review_id": "r3", "status": "MATCHED", "matched_faculty_id": "fac_1"},
        {"review_id": "r_ambig", "status": "AMBIGUOUS", "matched_faculty_id": None}
    ]

    agg = aggregate_faculty_ratings(sample_faculty_data, matched_reviews, reviews_by_id)
    fac_1_stats = agg["fac_1"]

    assert fac_1_stats["review_count"] == 3
    assert fac_1_stats["rated_count"] == 3
    # Ratings: [4.0, 5.0, 3.0]
    # Mean: (4.0 + 5.0 + 3.0) / 3 = 4.0
    assert fac_1_stats["rating_mean"] == 4.0
    # Median: 4.0
    assert fac_1_stats["rating_median"] == 4.0
    assert fac_1_stats["rating_min"] == 3.0
    assert fac_1_stats["rating_max"] == 5.0
    # Distribution
    assert fac_1_stats["rating_distribution"]["3_star"] == 1
    assert fac_1_stats["rating_distribution"]["4_star"] == 1
    assert fac_1_stats["rating_distribution"]["5_star"] == 1
    assert fac_1_stats["rating_distribution"]["1_star"] == 0
    # Last review date: latest of r1, r2, r3 is 2025-10-30T12:00:00
    assert fac_1_stats["last_review_date"] == "2025-10-30T12:00:00"
    # Source breakdown
    assert fac_1_stats["source_breakdown"]["zip1.zip"] == 2
    assert fac_1_stats["source_breakdown"]["zip2.zip"] == 1
    # Low sample flag
    assert fac_1_stats["low_sample"] is False

    # Check that fac_2 has 0 reviews
    assert agg["fac_2"]["review_count"] == 0
    assert agg["fac_2"]["rating_mean"] is None
    assert agg["fac_2"]["low_sample"] is True

def test_apply_queue_decisions_workflow(tmp_path):
    queue_csv = tmp_path / "queue.csv"
    overrides_json = tmp_path / "match_overrides.json"

    # Write sample queue CSV with 1 approved decision
    content = (
        "review_id,status,score,text_preview,top_candidates,decision,chosen_faculty_id,notes\n"
        "rev_100,AMBIGUOUS,0.65,Some text,Cand1,MATCHED,fac_1,Manually confirmed\n"
        "rev_101,WEAK,0.40,Spam text,Cand2,IGNORE,,Not relevant\n"
        "rev_102,AMBIGUOUS,0.50,Undecided,Cand3,,,Pending\n"
    )
    queue_csv.write_text(content, encoding="utf-8")

    applied = apply_queue_decisions(str(queue_csv), str(overrides_json))
    assert applied == 2

    assert overrides_json.exists()
    data = json.loads(overrides_json.read_text(encoding="utf-8"))
    assert "rev_100" in data
    assert data["rev_100"]["decision"] == "MATCHED"
    assert data["rev_100"]["faculty_id"] == "fac_1"
    assert "rev_101" in data
    assert data["rev_101"]["decision"] == "IGNORE"
    assert "rev_102" not in data
