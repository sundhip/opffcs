import pytest
from core.slots.slot_map import default_slot_map
from core.slots.clash import (
    meetings_to_bitmask,
    check_clash_bitmask,
    check_clash_interval,
    explain_clash,
    ClashEngine
)

def test_exhaustive_all_grid_pairs_bitmask_equals_interval():
    """
    Exhaustively tests that for ALL (102 * 102) pairs of grid slot labels,
    the O(1) bitmask clash result is 100% identical to the interval reference clash result.
    """
    labels = default_slot_map.get_all_labels()
    assert len(labels) >= 101
    
    # Precompute meetings and masks
    meeting_cache = {l: default_slot_map.get_meetings_for_label(l) for l in labels}
    mask_cache = {l: meetings_to_bitmask(meeting_cache[l]) for l in labels}

    mismatches = []
    for i in range(len(labels)):
        for j in range(i, len(labels)):
            l1, l2 = labels[i], labels[j]
            m1, m2 = meeting_cache[l1], meeting_cache[l2]
            interval_result = check_clash_interval(m1, m2)
            bitmask_result = check_clash_bitmask(mask_cache[l1], mask_cache[l2])
            if interval_result != bitmask_result:
                mismatches.append((l1, l2, interval_result, bitmask_result))

    assert len(mismatches) == 0, f"Found {len(mismatches)} mismatches between bitmask and interval engines: {mismatches[:5]}"

def test_hand_case_adjacent_non_clashing():
    """
    Period 1 Lab L1 (08:00-08:50) touches Period 2 Lab L2 (08:50-09:40) at 08:50.
    Touching boundaries must NOT clash.
    """
    m_l1 = default_slot_map.get_meetings_for_label("L1")
    m_l2 = default_slot_map.get_meetings_for_label("L2")
    
    assert not check_clash_interval(m_l1, m_l2), "Adjacent touching labs L1 and L2 must not clash"
    mask_l1 = meetings_to_bitmask(m_l1)
    mask_l2 = meetings_to_bitmask(m_l2)
    assert not check_clash_bitmask(mask_l1, mask_l2), "Bitmask must not report clash for touching boundaries"

def test_hand_case_overlapping_theory_and_lab():
    """
    Monday Period 2 Theory F1 (08:55-09:45) overlaps Lab L2 (08:50-09:40)
    between 08:55 and 09:40 (45 minutes clash).
    """
    m_f1 = default_slot_map.get_meetings_for_label("F1")
    m_l2 = default_slot_map.get_meetings_for_label("L2")
    
    assert check_clash_interval(m_f1, m_l2), "F1 and L2 must clash on Monday"
    mask_f1 = meetings_to_bitmask(m_f1)
    mask_l2 = meetings_to_bitmask(m_l2)
    assert check_clash_bitmask(mask_f1, mask_l2), "Bitmask must report clash for F1 and L2"

def test_hand_case_merged_lab_session_clash():
    """
    Offering A has combined lab session L37+L38 (Tuesday 14:00-15:40).
    Offering B has theory slot G2 (Tuesday Period 8: 14:55-15:45).
    They must clash across 14:55 to 15:40 (45 minutes).
    """
    engine = ClashEngine(default_slot_map)
    # Offering A: Theory A1+TA1, Lab L37+L38
    mask_a = engine.compute_offering_mask(["A1", "TA1"], ["L37", "L38"])
    # Offering B: Theory G2+TG2
    mask_b = engine.compute_offering_mask(["G2", "TG2"])
    
    assert engine.has_clash(mask_a, mask_b), "Offering A (with L37+L38) must clash with Offering B (G2 on TUE)"

def test_explain_clash_output():
    m_f1 = default_slot_map.get_meetings_for_label("F1")
    m_l2 = default_slot_map.get_meetings_for_label("L2")
    conflicts = explain_clash(m_f1, m_l2)
    
    assert len(conflicts) == 1
    m1, m2, mins = conflicts[0]
    assert m1.day == "MON"
    assert mins == 45
