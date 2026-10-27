from typing import List, Tuple, Optional, Dict, Any
from .slot_map import Meeting, SlotMap, default_slot_map

# 5-minute cells from 08:00 (480) to 20:00 (1200) -> 144 cells per day
START_DAY_MINUTE = 480
END_DAY_MINUTE = 1200
CELL_MINUTES = 5
CELLS_PER_DAY = (END_DAY_MINUTE - START_DAY_MINUTE) // CELL_MINUTES  # 144

DAY_BIT_OFFSETS = {
    "MON": 0 * CELLS_PER_DAY,
    "TUE": 1 * CELLS_PER_DAY,
    "WED": 2 * CELLS_PER_DAY,
    "THU": 3 * CELLS_PER_DAY,
    "FRI": 4 * CELLS_PER_DAY,
}

def meetings_to_bitmask(meetings: List[Meeting]) -> int:
    """
    Computes a 720-bit integer bitmask for a list of meetings.
    Each day has 144 cells of 5 minutes.
    A cell [cell_start, cell_end) has its bit set if and only if:
        cell_start < meeting.end_min AND meeting.start_min < cell_end
    Touching boundaries (e.g. meeting ends at 530, next cell starts at 530) do NOT overlap.
    """
    mask = 0
    for m in meetings:
        if m.day not in DAY_BIT_OFFSETS:
            continue
        day_offset = DAY_BIT_OFFSETS[m.day]
        # Calculate cell bounds
        k_start = max(0, (m.start_min - START_DAY_MINUTE) // CELL_MINUTES)
        k_end = min(CELLS_PER_DAY, ((m.end_min - 1 - START_DAY_MINUTE) // CELL_MINUTES) + 1)
        for k in range(k_start, k_end):
            cell_start = START_DAY_MINUTE + k * CELL_MINUTES
            cell_end = cell_start + CELL_MINUTES
            if cell_start < m.end_min and m.start_min < cell_end:
                mask |= (1 << (day_offset + k))
    return mask

def check_clash_bitmask(mask_a: int, mask_b: int) -> bool:
    """
    Blazing fast O(1) bitwise AND clash check.
    Returns True if any time cells overlap.
    """
    return (mask_a & mask_b) != 0

def check_clash_interval(meetings_a: List[Meeting], meetings_b: List[Meeting]) -> bool:
    """
    Slow, exact reference implementation checking pairwise interval overlaps.
    Returns True if any two meetings overlap.
    """
    for ma in meetings_a:
        for mb in meetings_b:
            if ma.overlaps(mb):
                return True
    return False

def explain_clash(meetings_a: List[Meeting], meetings_b: List[Meeting]) -> List[Tuple[Meeting, Meeting, int]]:
    """
    Returns a list of conflicting meeting pairs: (meeting_a, meeting_b, overlap_minutes).
    """
    conflicts = []
    for ma in meetings_a:
        for mb in meetings_b:
            if ma.overlaps(mb):
                overlap_start = max(ma.start_min, mb.start_min)
                overlap_end = min(ma.end_min, mb.end_min)
                overlap_mins = overlap_end - overlap_start
                conflicts.append((ma, mb, overlap_mins))
    return conflicts

class ClashEngine:
    def __init__(self, slot_map: Optional[SlotMap] = None):
        self.slot_map = slot_map or default_slot_map

    def compute_offering_meetings(self, theory_slots: List[str], lab_slots: Optional[List[str]] = None) -> List[Meeting]:
        return self.slot_map.get_meetings_for_offering(theory_slots, lab_slots)

    def compute_offering_mask(self, theory_slots: List[str], lab_slots: Optional[List[str]] = None) -> int:
        meetings = self.compute_offering_meetings(theory_slots, lab_slots)
        return meetings_to_bitmask(meetings)

    def has_clash(self, mask_a: int, mask_b: int) -> bool:
        return check_clash_bitmask(mask_a, mask_b)

    def explain(self, meetings_a: List[Meeting], meetings_b: List[Meeting]) -> List[Dict]:
        clashes = explain_clash(meetings_a, meetings_b)
        res = []
        for ma, mb, mins in clashes:
            res.append({
                "day": ma.day,
                "slot_a": ma.slot_label,
                "time_a": f"{ma.start_time_str}-{ma.end_time_str}",
                "slot_b": mb.slot_label,
                "time_b": f"{mb.start_time_str}-{mb.end_time_str}",
                "overlap_minutes": mins
            })
        return res

check_meetings_clash_interval = check_clash_interval

class OfferingsBitmaskIndex:
    def __init__(self, clash_engine: Optional[ClashEngine] = None):
        self.engine = clash_engine or ClashEngine()

    def get_offering_mask(self, offering: Any) -> int:
        from core.slots.slot_map import get_offering_meetings
        meetings = get_offering_meetings(offering)
        return meetings_to_bitmask(meetings)

