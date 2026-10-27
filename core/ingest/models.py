from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class SourceRef(BaseModel):
    file: str
    sheet: str
    row: int
    raw_data: Optional[Dict[str, Any]] = None

KNOWN_COURSE_CREDITS: Dict[str, int] = {
    "BASTS102": 1,
    "BAHSM100": 3,
    "ANCILLARY": 3,
    "BACSE204": 4,
    "BACSE205": 4,
    "BAMAT205": 4,
    "BACSE324": 4,
    "BACSE339": 4,
    "BACSE345": 4,
    "BAMGT213": 3,
    "BAMGT215": 3,
    "BAMGT217": 3,
    "BAHUM204": 3,
    "BAHUM205": 3,
    "BAHUM203": 3,
    "BAMGT221": 3,
    "BAHUM202": 3
}

class Course(BaseModel):
    id: str
    code: str
    title: str
    credits: Optional[int] = None
    has_theory: bool = True
    has_lab: bool = False
    source_refs: List[SourceRef] = Field(default_factory=list)

class Faculty(BaseModel):
    id: str
    raw_name: str
    canonical_name: str
    clean_tokens: List[str] = Field(default_factory=list)
    is_placeholder: bool = False
    source_refs: List[SourceRef] = Field(default_factory=list)

class LabSession(BaseModel):
    slots: List[str]
    raw_slot: str
    day: str
    start_time: str
    end_time: str
    duration_minutes: int

class Offering(BaseModel):
    id: str
    course_code: str
    faculty_id: str
    faculty_name: str
    theory_slots: List[str] = Field(default_factory=list)
    raw_theory_slot: Optional[str] = None
    lab_session: Optional[LabSession] = None
    raw_lab_slot: Optional[str] = None
    venue: Optional[str] = None
    review_text: Optional[str] = None
    bitmask: Optional[int] = None
    source_refs: List[SourceRef] = Field(default_factory=list)
