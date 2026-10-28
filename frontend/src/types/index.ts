export interface Course {
  id: string;
  code: string;
  title: string;
  credits: number;
  has_theory: boolean;
  has_lab: boolean;
  offering_count: number;
}

export interface Offering {
  id: string;
  stable_key: string;
  course_code: string;
  course_title?: string;
  faculty_id?: string;
  faculty_name?: string;
  theory_slots: string[];
  lab_session?: {
    labels: string[];
    day: string;
    start_min: number;
    end_min: number;
  } | null;
  venue?: string | null;
}

export interface MeetingBlock {
  day: string;
  start_time: string;
  end_time: string;
  start_min: number;
  end_min: number;
  kind: "theory" | "lab";
  slot_label: string;
  course_code: string;
  faculty_name: string;
  venue?: string | null;
}

export interface AvailableTeacher {
  offering_id: string;
  offering_key: string;
  faculty_id?: string | null;
  faculty_name: string;
  rating_mean?: number | null;
  venue?: string | null;
}

export interface CourseShapeOption {
  course_code: string;
  theory_slots: string[];
  lab_slots: string[];
  current_offering_id: string;
  current_faculty_name: string;
  available_teachers: AvailableTeacher[];
}

export interface GeneratedTimetable {
  timetable_id: string;
  shape_id?: string | null;
  offering_ids: string[];
  offering_keys: string[];
  per_day_timeline: Record<string, MeetingBlock[]>;
  working_days: string[];
  free_days: string[];
  gap_minutes_per_day: Record<string, number>;
  longest_gap_minutes: number;
  max_daily_hours: number;
  earliest_start: string | null;
  latest_end: string | null;
  avg_faculty_rating: number | null;
  unrated_faculty_count: number;
  score: number;
  score_breakdown: Record<string, number>;
  course_options?: CourseShapeOption[];
}

export interface InfeasibleExplanation {
  empty_domain_courses: string[];
  conflicting_pairs: [string, string][];
  minimal_conflicting_subset: string[];
  diagnostic_summary: string;
}

export interface GenerateResponse {
  status: "success" | "partial" | "infeasible" | "time_limit_exceeded";
  total_valid: number;
  returned: number;
  is_exhaustive: boolean;
  time_elapsed_ms: number;
  timetables: GeneratedTimetable[];
  infeasible_explanation?: InfeasibleExplanation | null;
}

export interface CourseSelectionConfig {
  course_code: string;
  include_theory: boolean;
  include_lab: boolean;
  allowed_theory_faculty: string[];
  blocked_theory_faculty: string[];
  allowed_lab_faculty: string[];
  blocked_lab_faculty: string[];
  require_same_faculty: boolean;
  locked_offering_id?: string | null;
}

export interface HardConstraints {
  max_daily_hours?: number | null;
  max_consecutive_hours?: number | null;
  allowed_days: string[];
  free_days: string[];
  min_free_days_count?: number | null;
  min_working_days?: number | null;
  max_working_days?: number | null;
  earliest_start_minute?: number | null;
  latest_end_minute?: number | null;
  day_pattern: "ANY" | "MORNING_ONLY" | "AFTERNOON_ONLY" | "HALF_DAY";
  blocked_slots: string[];
  max_credits?: number | null;
}

export interface SoftPreferences {
  minimize_gaps_weight: number;
  prefer_free_days_weight: number;
  preferred_time_window_weight: number;
  faculty_rating_weight: number;
  compactness_weight: number;
  preferred_start_minute: number;
  preferred_end_minute: number;
}

export interface GenerateRequest {
  courses: {
    course_code: string;
    include_theory: boolean;
    include_lab: boolean;
    allowed_theory_faculty: string[];
    blocked_theory_faculty: string[];
    allowed_lab_faculty: string[];
    blocked_lab_faculty: string[];
    require_same_faculty: boolean;
  }[];
  hard_constraints: HardConstraints;
  preferences: SoftPreferences;
  locked_offering_ids: string[];
  max_results: number;
  time_budget_seconds: number;
}

export interface FacultyRatingSummary {
  review_count: number;
  rated_count: number;
  rating_mean: number | null;
  rating_median: number | null;
  rating_min: number | null;
  rating_max: number | null;
  rating_distribution: Record<string, number>;
  bayesian_smoothed: number | null;
  last_review_date: string | null;
  recurring_keywords: string[];
  low_sample: boolean;
}

export interface FacultyDetail {
  id: string;
  canonical_name: string;
  raw_name: string;
  is_placeholder: boolean;
  rating_summary: FacultyRatingSummary | null;
  source_breakdown: Record<string, number>;
  ambiguous_count: number;
  offerings: {
    id: string;
    course_code: string;
    course_title: string;
    stable_key: string;
    theory_slots: string[];
    lab_session: any;
    venue: string | null;
  }[];
  reviews: {
    total: number;
    feedback_count?: number;
    rating_count?: number;
    all_count?: number;
    limit: number;
    offset: number;
    items: {
      review_id: string;
      text: string;
      timestamp: string | null;
      sender_hash: string;
      source_zip: string | null;
      source_file: string | null;
      explicit_rating: number | null;
      confidence: number;
      match_score: number;
      match_reasons: string[];
      kind?: string;
      tags?: string[];
    }[];
  };
}

export interface FavouriteItem {
  id: string;
  offering_key: string;
  name: string;
  notes: string | null;
  payload: any;
  created_at: string;
  is_stale: boolean;
  stale_reason: string | null;
  course?: { code: string; title: string } | null;
  faculty?: { canonical_name: string } | null;
  offering_details?: any;
}

export interface MatchCandidate {
  faculty_id: string;
  canonical_name: string;
  score: number;
  reasons: string[];
}

export interface MatchQueueItem {
  review_id: string;
  status: string;
  score: number;
  override_applied: boolean;
  text: string;
  timestamp: string | null;
  explicit_rating: number | null;
  source_zip: string | null;
  source_file: string | null;
  candidates: MatchCandidate[];
}
