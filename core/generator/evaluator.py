import math
from typing import Dict, List, Tuple, Any, Optional
from core.generator.models import MeetingBlock, SoftPreferences

WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI"]
LUNCH_START = 800  # 13:20
LUNCH_END = 840    # 14:00

def min_to_time_str(m: int) -> str:
    h = m // 60
    mn = m % 60
    return f"{h:02d}:{mn:02d}"

def calculate_daily_gap_minutes(meetings: List[MeetingBlock]) -> int:
    """
    Computes total idle gap minutes on a single day.
    Subtracks the official lunch break (13:20 to 14:00) so lunch is not penalized as an idle gap.
    """
    if len(meetings) <= 1:
        return 0

    sorted_m = sorted(meetings, key=lambda m: m.start_min)
    total_gap = 0

    for i in range(len(sorted_m) - 1):
        gap_start = sorted_m[i].end_min
        gap_end = sorted_m[i + 1].start_min

        if gap_end > gap_start:
            raw_gap = gap_end - gap_start
            # Calculate overlap with lunch window [800, 840]
            lunch_overlap_start = max(gap_start, LUNCH_START)
            lunch_overlap_end = min(gap_end, LUNCH_END)
            lunch_deduction = max(0, lunch_overlap_end - lunch_overlap_start)
            effective_gap = max(0, raw_gap - lunch_deduction)
            total_gap += effective_gap

    return total_gap

def evaluate_timetable(
    per_day_timeline: Dict[str, List[MeetingBlock]],
    faculty_ratings: Dict[str, Optional[float]],
    preferences: SoftPreferences
) -> Tuple[float, Dict[str, float], Dict[str, Any]]:
    """
    Evaluates a conflict-free timetable across soft preferences.
    Produces an overall composite score and an explainable score breakdown.
    Unrated faculty are treated neutral (3.0/5.0) and tracked explicitly.
    """
    working_days = [d for d in WEEKDAYS if per_day_timeline.get(d)]
    free_days = [d for d in WEEKDAYS if not per_day_timeline.get(d)]

    daily_gap_minutes: Dict[str, int] = {}
    longest_gap = 0
    daily_hours: List[float] = []
    total_span_minutes = 0
    all_meetings: List[MeetingBlock] = []
    back_to_back_labs_count = 0

    for d in WEEKDAYS:
        m_list = per_day_timeline.get(d, [])
        all_meetings.extend(m_list)
        gap = calculate_daily_gap_minutes(m_list)
        daily_gap_minutes[d] = gap
        longest_gap = max(longest_gap, gap)

        if m_list:
            d_start = min(m.start_min for m in m_list)
            d_end = max(m.end_min for m in m_list)
            total_span_minutes += (d_end - d_start)
            class_mins = sum(m.end_min - m.start_min for m in m_list)
            daily_hours.append(class_mins / 60.0)

            # Check consecutive labs
            lab_blocks = [m for m in m_list if m.kind == "lab"]
            if len(lab_blocks) >= 2:
                sorted_labs = sorted(lab_blocks, key=lambda m: m.start_min)
                for i in range(len(sorted_labs) - 1):
                    if (sorted_labs[i+1].start_min - sorted_labs[i].end_min) <= 15:
                        back_to_back_labs_count += 1
        else:
            daily_hours.append(0.0)

    max_daily_h = max(daily_hours) if daily_hours else 0.0

    # Earliest & latest overall
    earliest_min = min((m.start_min for m in all_meetings), default=480)
    latest_min = max((m.end_min for m in all_meetings), default=1165)

    # 1. Faculty Rating Component
    ratings_collected = []
    unrated_count = 0
    for fac_id, r_val in faculty_ratings.items():
        if r_val is not None:
            ratings_collected.append(r_val)
        else:
            ratings_collected.append(3.0)  # Neutral prior mean
            unrated_count += 1

    avg_rating = round(sum(ratings_collected) / len(ratings_collected), 2) if ratings_collected else 3.0
    # Normalized to 0.0 - 100.0 (rating is out of 5.0)
    rating_subscore = (avg_rating / 5.0) * 100.0

    # 2. Minimize Gaps Component (0 gaps = 100 pts; -1 pt per 10 mins of idle gap)
    total_gaps = sum(daily_gap_minutes.values())
    gap_subscore = max(0.0, 100.0 - (total_gaps / 6.0))

    # 3. Prefer Free Days Component (25 pts per free weekday up to 100 pts)
    free_days_subscore = min(100.0, len(free_days) * 33.3)

    # 4. Compactness Component (lower overall daily span = higher score)
    # Average span per working day: 4 hours span = 100 pts; 10 hours span = 40 pts
    avg_span = (total_span_minutes / len(working_days)) if working_days else 0
    compactness_subscore = max(0.0, min(100.0, 120.0 - (avg_span / 6.0)))

    # 5. Balanced Daily Load Component (lower variance across working days = higher score)
    active_daily_hours = [h for h in daily_hours if h > 0]
    if len(active_daily_hours) > 1:
        mean_h = sum(active_daily_hours) / len(active_daily_hours)
        variance = sum((h - mean_h) ** 2 for h in active_daily_hours) / len(active_daily_hours)
        balance_subscore = max(0.0, 100.0 - (variance * 20.0))
    else:
        balance_subscore = 100.0

    # 6. Avoid Back-to-Back Labs Component
    lab_penalty = back_to_back_labs_count * 25.0
    lab_subscore = max(0.0, 100.0 - lab_penalty)

    # Weighted Overall Score
    weights = [
        (preferences.faculty_rating_weight, rating_subscore, "faculty_rating"),
        (preferences.minimize_gaps_weight, gap_subscore, "minimize_gaps"),
        (preferences.prefer_free_days_weight, free_days_subscore, "free_days"),
        (preferences.compactness_weight, compactness_subscore, "compactness"),
        (preferences.balanced_daily_load_weight, balance_subscore, "balanced_load"),
        (preferences.avoid_back_to_back_labs_weight, lab_subscore, "avoid_adjacent_labs")
    ]

    total_weight = sum(w for w, _, _ in weights if w > 0) or 1.0
    total_score = sum(w * score for w, score, _ in weights if w > 0) / total_weight

    breakdown = {name: round(score, 2) for _, score, name in weights}

    metrics = {
        "working_days": working_days,
        "free_days": free_days,
        "gap_minutes_per_day": daily_gap_minutes,
        "longest_gap_minutes": longest_gap,
        "max_daily_hours": round(max_daily_h, 2),
        "earliest_start": min_to_time_str(earliest_min),
        "latest_end": min_to_time_str(latest_min),
        "avg_faculty_rating": avg_rating,
        "unrated_faculty_count": unrated_count,
        "score": round(total_score, 2),
        "score_breakdown": breakdown
    }

    return total_score, breakdown, metrics
