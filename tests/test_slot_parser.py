import pytest
from core.ingest.slot_parser import SlotParser, SlotParseError
from core.slots.slot_map import default_slot_map

@pytest.fixture
def parser():
    return SlotParser(default_slot_map)

def test_parse_theory_slots_valid(parser):
    res1 = parser.parse_theory_slots("A1+TA1")
    assert res1 == ["A1", "TA1"]

    res2 = parser.parse_theory_slots("C1+TC1+TCC1")
    assert res2 == ["C1", "TC1", "TCC1"]

    res3 = parser.parse_theory_slots("A2+TA2+TAA2")
    assert res3 == ["A2", "TA2", "TAA2"]

def test_parse_theory_slots_case_and_whitespace(parser):
    res = parser.parse_theory_slots(" a1 + ta1 ")
    assert res == ["A1", "TA1"]

def test_parse_theory_slots_unknown_label(parser):
    with pytest.raises(SlotParseError, match="Unknown theory slot label"):
        parser.parse_theory_slots("A1+Z99")

def test_parse_theory_slots_with_lab_label(parser):
    with pytest.raises(SlotParseError, match="defined as lab, not theory"):
        parser.parse_theory_slots("A1+L1")

def test_parse_lab_session_valid(parser):
    lab_sess = parser.parse_lab_session("L37+L38")
    assert lab_sess is not None
    assert lab_sess.slots == ["L37", "L38"]
    assert lab_sess.day == "TUE"
    assert lab_sess.start_time == "14:00"
    assert lab_sess.end_time == "15:40"
    assert lab_sess.duration_minutes == 100

def test_parse_lab_session_friday_morning(parser):
    lab_sess = parser.parse_lab_session("L29+L30")
    assert lab_sess is not None
    assert lab_sess.day == "FRI"
    assert lab_sess.start_time == "11:40"
    assert lab_sess.end_time == "13:20"
    assert lab_sess.duration_minutes == 100

def test_parse_lab_session_non_consecutive(parser):
    # L37 (Period 7) and L39 (Period 9) on Tuesday are NOT consecutive
    with pytest.raises(SlotParseError, match="not consecutive"):
        parser.parse_lab_session("L37+L39")

def test_parse_lab_session_cross_day(parser):
    # L1 (MON) and L7 (TUE) are on different days
    with pytest.raises(SlotParseError, match="spans multiple days"):
        parser.parse_lab_session("L1+L7")

def test_parse_lab_session_unknown_label(parser):
    with pytest.raises(SlotParseError, match="Unknown lab slot label"):
        parser.parse_lab_session("L37+L999")
