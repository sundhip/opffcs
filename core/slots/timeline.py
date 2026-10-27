from dataclasses import dataclass
from typing import List, Dict, Optional, Any
from .slot_map import Meeting, SlotMap, default_slot_map

@dataclass
class TimelineBlock:
    day: str
    start_minute: int
    end_minute: int
    start_time: str
    end_time: str
    course_code: str
    course_title: str
    faculty_name: str
    kind: str
    venue: Optional[str]
    slot_label: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "day": self.day,
            "start_minute": self.start_minute,
            "end_minute": self.end_minute,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "course_code": self.course_code,
            "course_title": self.course_title,
            "faculty_name": self.faculty_name,
            "kind": self.kind,
            "venue": self.venue,
            "slot_label": self.slot_label
        }

class TimelineBuilder:
    def __init__(self, slot_map: Optional[SlotMap] = None):
        self.slot_map = slot_map or default_slot_map

    def build_timeline_for_offering(
        self,
        course_code: str,
        course_title: str,
        faculty_name: str,
        theory_slots: List[str],
        lab_slots: Optional[List[str]] = None,
        venue: Optional[str] = None
    ) -> List[TimelineBlock]:
        """
        Converts a single offering into a list of TimelineBlocks across scheduled days.
        """
        meetings = self.slot_map.get_meetings_for_offering(theory_slots, lab_slots)
        blocks: List[TimelineBlock] = []
        for m in meetings:
            blocks.append(TimelineBlock(
                day=m.day,
                start_minute=m.start_min,
                end_minute=m.end_min,
                start_time=m.start_time_str,
                end_time=m.end_time_str,
                course_code=course_code,
                course_title=course_title,
                faculty_name=faculty_name,
                kind=m.kind,
                venue=venue,
                slot_label=m.slot_label
            ))
        # Sort chronologically
        blocks.sort(key=lambda b: (["MON", "TUE", "WED", "THU", "FRI"].index(b.day) if b.day in ["MON", "TUE", "WED", "THU", "FRI"] else 99, b.start_minute))
        return blocks

    def build_schedule_timeline(self, offerings: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Builds a full schedule timeline organized by day:
        {"MON": [...], "TUE": [...], ...}
        """
        day_schedule: Dict[str, List[TimelineBlock]] = {
            "MON": [],
            "TUE": [],
            "WED": [],
            "THU": [],
            "FRI": []
        }
        
        for off in offerings:
            blocks = self.build_timeline_for_offering(
                course_code=off.get("course_code", ""),
                course_title=off.get("course_title", ""),
                faculty_name=off.get("faculty_name", ""),
                theory_slots=off.get("theory_slots", []),
                lab_slots=off.get("lab_slots", []),
                venue=off.get("venue")
            )
            for b in blocks:
                if b.day in day_schedule:
                    day_schedule[b.day].append(b)

        # Sort each day by start time
        res: Dict[str, List[Dict[str, Any]]] = {}
        for day, b_list in day_schedule.items():
            b_list.sort(key=lambda x: x.start_minute)
            res[day] = [b.to_dict() for b in b_list]

        return res
