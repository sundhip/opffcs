from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple, Any
import json
import os

@dataclass(frozen=True)
class Meeting:
    day: str             # "MON", "TUE", "WED", "THU", "FRI"
    start_min: int       # minutes from midnight, e.g. 480
    end_min: int         # minutes from midnight, e.g. 530
    kind: str            # "theory" | "lab"
    slot_label: str      # e.g. "A1" or "L37+L38"
    start_time_str: str  # "08:00"
    end_time_str: str    # "08:50"

    def overlaps(self, other: 'Meeting') -> bool:
        """
        True if and only if meetings are on the same day and their real-time
        open intervals intersect: startA < endB and startB < endA.
        Touching boundaries (e.g. 08:50 and 08:50) do NOT clash.
        """
        if self.day != other.day:
            return False
        return self.start_min < other.end_min and other.start_min < self.end_min

class SlotMap:
    def __init__(self, grid_json_path: Optional[str] = None):
        if grid_json_path is None:
            grid_json_path = os.path.join(os.path.dirname(__file__), "grid.json")
        with open(grid_json_path, "r", encoding="utf-8") as f:
            self._grid_data = json.load(f)
            
        self._slots_dict: Dict[str, List[Meeting]] = {}
        for label, data in self._grid_data["slots"].items():
            meetings_list = []
            for m in data["meetings"]:
                meetings_list.append(Meeting(
                    day=m["day"],
                    start_min=m["start_minute"],
                    end_min=m["end_minute"],
                    kind=m["kind"],
                    slot_label=label,
                    start_time_str=m["start_time"],
                    end_time_str=m["end_time"]
                ))
            self._slots_dict[label] = meetings_list
            
        self.day_lab_sequences = self._grid_data.get("day_lab_sequences", {})

    def get_meetings_for_label(self, label: str) -> List[Meeting]:
        """Returns physical meetings for a single atomic slot label."""
        cleaned = label.strip().upper()
        if cleaned not in self._slots_dict:
            raise KeyError(f"Unknown slot label: '{label}'")
        return self._slots_dict[cleaned]

    def has_label(self, label: str) -> bool:
        return label.strip().upper() in self._slots_dict

    def get_all_labels(self) -> List[str]:
        return list(self._slots_dict.keys())

    def validate_and_merge_lab_session(self, lab_labels: List[str]) -> Meeting:
        """
        Takes an ordered list of lab labels (e.g. ['L37', 'L38']).
        Verifies that:
          1. All labels exist and are lab slots.
          2. All labels are on the same day.
          3. Labels represent consecutive periods in the grid.
        Returns a single continuous Meeting representing the entire lab session.
        Raises ValueError if invalid.
        """
        if not lab_labels:
            raise ValueError("Lab labels list cannot be empty.")
            
        clean_labels = [l.strip().upper() for l in lab_labels]
        meetings_by_label = [self.get_meetings_for_label(l) for l in clean_labels]
        
        # Each lab slot meets exactly once in the grid
        lab_meetings = []
        for l, m_list in zip(clean_labels, meetings_by_label):
            if not m_list or m_list[0].kind != "lab":
                raise ValueError(f"Label '{l}' is not a valid lab slot.")
            lab_meetings.append(m_list[0])
            
        # Check 1: Same day
        days = set(m.day for m in lab_meetings)
        if len(days) != 1:
            raise ValueError(f"Lab session spans multiple days: {days} for slots {clean_labels}")
        day = lab_meetings[0].day
        
        # Check 2: Consecutive periods per grid lab sequence
        # Find which sequence (morning or afternoon) contains the first label
        day_seqs = self.day_lab_sequences.get(day, {})
        target_seq = None
        start_idx = -1
        
        for part in ["morning", "afternoon"]:
            seq = day_seqs.get(part, [])
            if clean_labels[0] in seq:
                target_seq = seq
                start_idx = seq.index(clean_labels[0])
                break
                
        if target_seq is None or start_idx == -1:
            raise ValueError(f"Lab slot '{clean_labels[0]}' not found in day {day} sequences.")
            
        expected_slice = target_seq[start_idx : start_idx + len(clean_labels)]
        if clean_labels != expected_slice:
            raise ValueError(
                f"Lab slots {clean_labels} are not consecutive on {day}. Expected {expected_slice}."
            )
            
        # Merge into one continuous session
        start_min = lab_meetings[0].start_min
        end_min = lab_meetings[-1].end_min
        combined_label = "+".join(clean_labels)
        start_time_str = lab_meetings[0].start_time_str
        end_time_str = lab_meetings[-1].end_time_str
        
        return Meeting(
            day=day,
            start_min=start_min,
            end_min=end_min,
            kind="lab",
            slot_label=combined_label,
            start_time_str=start_time_str,
            end_time_str=end_time_str
        )

    def get_meetings_for_offering(self, theory_slots: List[str], lab_slots: Optional[List[str]] = None) -> List[Meeting]:
        """
        Computes all meetings for an offering:
        - Each theory slot is exploded into its physical meetings (a theory slot like A1 produces 2 meetings).
        - Lab slots (e.g. ['L37', 'L38']) are validated and merged into ONE continuous lab session.
        """
        all_meetings: List[Meeting] = []
        
        for t_label in theory_slots:
            clean_t = t_label.strip().upper()
            if clean_t:
                all_meetings.extend(self.get_meetings_for_label(clean_t))
                
        if lab_slots:
            clean_labs = [l.strip().upper() for l in lab_slots if l.strip()]
            if clean_labs:
                lab_session_meeting = self.validate_and_merge_lab_session(clean_labs)
                all_meetings.append(lab_session_meeting)
                
        return all_meetings

# Global default instance
default_slot_map = SlotMap()

def get_offering_meetings(offering: Any) -> List[Meeting]:
    """
    Convenience function to extract meetings for an offering dict or model.
    Handles theory_slots and combined lab sessions.
    """
    if isinstance(offering, dict):
        theory = offering.get("theory_slots", [])
        lab_info = offering.get("lab_session")
        if isinstance(lab_info, dict):
            lab_labels = lab_info.get("slots") or lab_info.get("labels", [])
        elif hasattr(lab_info, "slots"):
            lab_labels = lab_info.slots
        elif hasattr(lab_info, "labels"):
            lab_labels = lab_info.labels
        elif isinstance(lab_info, list):
            lab_labels = lab_info
        else:
            lab_labels = None
    else:
        theory = getattr(offering, "theory_slots", [])
        lab_info = getattr(offering, "lab_session", None)
        if isinstance(lab_info, dict):
            lab_labels = lab_info.get("slots") or lab_info.get("labels", [])
        elif hasattr(lab_info, "slots"):
            lab_labels = lab_info.slots
        elif hasattr(lab_info, "labels"):
            lab_labels = lab_info.labels
        elif isinstance(lab_info, list):
            lab_labels = lab_info
        else:
            lab_labels = None

    return default_slot_map.get_meetings_for_offering(theory, lab_labels)

