from typing import List, Tuple, Optional
from core.slots.slot_map import SlotMap, default_slot_map
from core.ingest.models import LabSession

class SlotParseError(Exception):
    pass

class SlotParser:
    def __init__(self, slot_map: Optional[SlotMap] = None):
        self.slot_map = slot_map or default_slot_map

    def parse_theory_slots(self, theory_str: str) -> List[str]:
        """
        Parses a theory slot string (e.g. 'A1+TA1' or 'C1+TC1+TCC1').
        Validates that all tokens are known in the grid and are theory slots.
        Returns list of atomic slot labels.
        """
        if not theory_str or not theory_str.strip():
            return []
            
        tokens = [t.strip().upper() for t in theory_str.split('+') if t.strip()]
        for t in tokens:
            if not self.slot_map.has_label(t):
                raise SlotParseError(f"Unknown theory slot label: '{t}' in '{theory_str}'")
            meetings = self.slot_map.get_meetings_for_label(t)
            if not any(m.kind == "theory" for m in meetings):
                raise SlotParseError(f"Slot label '{t}' is defined as lab, not theory, in '{theory_str}'")
                
        return tokens

    def parse_lab_session(self, lab_str: str) -> Optional[LabSession]:
        """
        Parses a lab slot string (e.g. 'L37+L38').
        Verifies:
          1. All slots exist and are lab slots.
          2. All slots occur on the same day.
          3. Slots represent consecutive periods in the grid.
        Returns a validated LabSession model, or None if input is empty.
        Raises SlotParseError if invalid.
        """
        if not lab_str or not lab_str.strip():
            return None
            
        tokens = [t.strip().upper() for t in lab_str.split('+') if t.strip()]
        for t in tokens:
            if not self.slot_map.has_label(t):
                raise SlotParseError(f"Unknown lab slot label: '{t}' in '{lab_str}'")
                
        try:
            merged_meeting = self.slot_map.validate_and_merge_lab_session(tokens)
        except ValueError as e:
            raise SlotParseError(f"Invalid lab session combination '{lab_str}': {e}")
            
        duration = merged_meeting.end_min - merged_meeting.start_min
        return LabSession(
            slots=tokens,
            raw_slot=lab_str,
            day=merged_meeting.day,
            start_time=merged_meeting.start_time_str,
            end_time=merged_meeting.end_time_str,
            duration_minutes=duration
        )
