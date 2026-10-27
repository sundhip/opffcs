from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class CourseSelection(BaseModel):
    course_code: str
    include_theory: bool = True
    include_lab: bool = True
    theory_faculty_allow: List[str] = Field(default_factory=list)
    theory_faculty_block: List[str] = Field(default_factory=list)
    lab_faculty_allow: List[str] = Field(default_factory=list)
    lab_faculty_block: List[str] = Field(default_factory=list)

class HardConstraints(BaseModel):
    max_daily_hours: Optional[float] = None          # Max hours per day (e.g. 6.0)
    max_consecutive_hours: Optional[float] = None    # Max uninterrupted class hours (e.g. 3.0)
    allowed_days: List[str] = Field(default_factory=lambda: ["MON", "TUE", "WED", "THU", "FRI"])
    free_days: List[str] = Field(default_factory=list) # Specific days with 0 classes
    min_free_days_count: Optional[int] = None       # e.g. at least 1 weekday free
    min_working_days: Optional[int] = None
    max_working_days: Optional[int] = None
    earliest_start_minute: Optional[int] = None     # e.g. 480 for 08:00
    latest_end_minute: Optional[int] = None         # e.g. 1165 for 19:25
    day_pattern: str = "ANY"                        # ANY, MORNING_ONLY, AFTERNOON_ONLY, HALF_DAY
    blocked_slots: List[str] = Field(default_factory=list)
    max_credits: Optional[int] = None

class SoftPreferences(BaseModel):
    minimize_gaps_weight: float = 1.0
    prefer_free_days_weight: float = 1.0
    compactness_weight: float = 1.0
    balanced_daily_load_weight: float = 1.0
    avoid_back_to_back_labs_weight: float = 1.0
    faculty_rating_weight: float = 1.5

class GenerateRequest(BaseModel):
    courses: List[CourseSelection]
    same_faculty_for_theory_and_lab: bool = False
    locked_offerings: List[str] = Field(default_factory=list) # Offering IDs or stable keys
    hard_constraints: HardConstraints = Field(default_factory=HardConstraints)
    preferences: SoftPreferences = Field(default_factory=SoftPreferences)
    max_results: int = Field(default=20, ge=1, le=1000)
    time_budget_seconds: float = Field(default=5.0, ge=0.5, le=30.0)
    seed: Optional[int] = 42

class MeetingBlock(BaseModel):
    day: str
    start_time: str
    end_time: str
    start_min: int
    end_min: int
    kind: str
    slot_label: str
    course_code: str
    faculty_name: str
    venue: Optional[str] = None

class GeneratedTimetable(BaseModel):
    timetable_id: str
    offering_ids: List[str]
    offering_keys: List[str]
    per_day_timeline: Dict[str, List[MeetingBlock]]
    working_days: List[str]
    free_days: List[str]
    gap_minutes_per_day: Dict[str, int]
    longest_gap_minutes: int
    max_daily_hours: float
    earliest_start: str
    latest_end: str
    avg_faculty_rating: float
    unrated_faculty_count: int
    score: float
    score_breakdown: Dict[str, float]

class InfeasibleExplanation(BaseModel):
    empty_domain_courses: List[str] = Field(default_factory=list)
    conflicting_pairs: List[Dict[str, Any]] = Field(default_factory=list)
    minimal_conflicting_subset: List[str] = Field(default_factory=list)
    diagnostic_summary: str

class GenerateResponse(BaseModel):
    status: str  # completed, time_limit_exceeded, infeasible
    total_valid: int
    returned: int
    is_exhaustive: bool
    time_elapsed_ms: float
    timetables: List[GeneratedTimetable]
    infeasible_explanation: Optional[InfeasibleExplanation] = None
