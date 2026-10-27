from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class SourceRef(BaseModel):
    file: str
    sheet: str
    row: int
    raw_data: Optional[Dict[str, Any]] = None

class Course(BaseModel):
    id: str
    code: str
    title: str
    credits: Optional[int] = None
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
