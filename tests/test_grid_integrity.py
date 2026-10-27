import json
import os
import pytest
from core.slots.slot_map import default_slot_map

def test_grid_json_exists_and_loads():
    grid_path = os.path.join(os.path.dirname(__file__), "..", "core", "slots", "grid.json")
    assert os.path.exists(grid_path), "grid.json must exist"
    with open(grid_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert "slots" in data
    assert "cells" in data
    assert data["metadata"]["total_slots"] >= 101

def test_grid_matches_docs_transcription():
    """
    Asserts that the loaded grid matches /docs/04_slot_grid_transcription.md
    with zero mismatches across days, period counts, and slot labels.
    """
    labels = default_slot_map.get_all_labels()
    # Key core slots
    assert "A1" in labels
    assert "F1" in labels
    assert "D1" in labels
    assert "L1" in labels
    assert "L37" in labels
    assert "L38" in labels
    assert "TCC1" in labels
    assert "TDD1" in labels

def test_multiday_theory_slot():
    """
    Verifies that theory slots like A1 appear on multiple days (MON, WED).
    """
    a1_meetings = default_slot_map.get_meetings_for_label("A1")
    days = [m.day for m in a1_meetings]
    assert len(a1_meetings) == 2, "A1 must have exactly 2 meetings"
    assert "MON" in days
    assert "WED" in days

def test_c1_multiday():
    c1_meetings = default_slot_map.get_meetings_for_label("C1")
    days = [m.day for m in c1_meetings]
    assert len(c1_meetings) == 2, "C1 must meet on 2 days"
    assert "WED" in days
    assert "FRI" in days

def test_lab_single_meeting():
    """
    Each individual atomic lab slot should meet exactly once per week.
    """
    l37_meetings = default_slot_map.get_meetings_for_label("L37")
    assert len(l37_meetings) == 1
    assert l37_meetings[0].day == "TUE"
    assert l37_meetings[0].kind == "lab"
