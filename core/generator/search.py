import heapq
import hashlib
import json
import time
from typing import Dict, List, Set, Tuple, Any, Optional

from core.generator.models import (
    GenerateRequest, GenerateResponse, GeneratedTimetable,
    MeetingBlock, InfeasibleExplanation, CourseShapeOption, AvailableTeacher
)
from core.generator.evaluator import evaluate_timetable, min_to_time_str
from core.slots.clash import OfferingsBitmaskIndex
from core.slots.slot_map import get_offering_meetings

WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI"]
LUNCH_START = 800  # 13:20
LUNCH_END = 840    # 14:00

class TimetableSearchEngine:
    """
    Backtracking timetable generator with Most-Constrained-Variable-First (MRV) ordering,
    720-bit bitmask forward checking, per-offering domain pre-filtering,
    and incremental per-day constraint pruning.
    """
    def __init__(self, bitmask_index: Optional[OfferingsBitmaskIndex] = None):
        self.bitmask_index = bitmask_index or OfferingsBitmaskIndex()

    def generate(
        self,
        request: GenerateRequest,
        offerings_data: List[Dict[str, Any]],
        courses_metadata: Dict[str, Dict[str, Any]],
        faculty_ratings: Dict[str, Optional[float]]
    ) -> GenerateResponse:
        start_time = time.perf_counter()
        deadline = start_time + request.time_budget_seconds

        # 1. Group offerings by course code
        by_course: Dict[str, List[Dict[str, Any]]] = {}
        for off in offerings_data:
            cc = off["course_code"].upper()
            if cc not in by_course:
                by_course[cc] = []
            by_course[cc].append(off)

        # 2. Pre-filter domains per course
        filtered_domains: Dict[str, List[Dict[str, Any]]] = {}
        empty_domain_courses: List[str] = []

        for c_sel in request.courses:
            cc = c_sel.course_code.upper()
            raw_domain = by_course.get(cc, [])
            valid_candidates = []

            for off in raw_domain:
                if self._offering_satisfies_prefilter(off, c_sel, request):
                    valid_candidates.append(off)

            if not valid_candidates:
                empty_domain_courses.append(cc)
            filtered_domains[cc] = valid_candidates

        if empty_domain_courses:
            elapsed = (time.perf_counter() - start_time) * 1000.0
            return GenerateResponse(
                status="infeasible",
                total_valid=0,
                returned=0,
                is_exhaustive=True,
                time_elapsed_ms=round(elapsed, 2),
                timetables=[],
                infeasible_explanation=InfeasibleExplanation(
                    empty_domain_courses=empty_domain_courses,
                    conflicting_pairs=[],
                    minimal_conflicting_subset=empty_domain_courses,
                    diagnostic_summary=f"Courses with 0 valid offerings after applying constraints: {', '.join(empty_domain_courses)}"
                )
            )

        # 3. Order courses by MRV (fewest candidates first)
        ordered_courses = sorted(
            request.courses,
            key=lambda cs: (len(filtered_domains[cs.course_code.upper()]), cs.course_code.upper())
        )

        # 4. Search state
        heap: List[Tuple[float, int, GeneratedTimetable]] = []
        total_valid = [0]
        is_exhaustive = [True]
        visited_timetable_ids: Set[str] = set()
        node_counter = [0]
        tie_counter = [0]

        max_daily_mins = (request.hard_constraints.max_daily_hours * 60) if request.hard_constraints.max_daily_hours else None
        max_consec_mins = (request.hard_constraints.max_consecutive_hours * 60) if request.hard_constraints.max_consecutive_hours else None

        # Precompute bitmasks and meeting intervals for domain candidates
        candidate_cache: Dict[str, Dict[str, Any]] = {}
        for c_sel in ordered_courses:
            cc = c_sel.course_code.upper()
            for off in filtered_domains[cc]:
                off_id = off["id"]
                if off_id not in candidate_cache:
                    mask = self.bitmask_index.get_offering_mask(off)
                    meetings = get_offering_meetings(off)
                    # Group meetings by day
                    day_mtgs: Dict[str, List[Tuple[int, int, str, str]]] = {d: [] for d in WEEKDAYS}
                    for m in meetings:
                        day_mtgs[m.day].append((m.start_min, m.end_min, m.kind, m.slot_label))

                    candidate_cache[off_id] = {
                        "offering": off,
                        "mask": mask,
                        "meetings": meetings,
                        "day_meetings": day_mtgs
                    }

        def backtrack(
            course_idx: int,
            current_mask: int,
            current_off_ids: List[str],
            day_mins: Dict[str, int],
            day_intervals: Dict[str, List[Tuple[int, int]]]
        ):
            node_counter[0] += 1
            if (node_counter[0] & 127) == 0:
                if time.perf_counter() > deadline:
                    is_exhaustive[0] = False
                    return

            if course_idx == len(ordered_courses):
                # Leaf reached! All courses assigned.
                # Check global multi-day hard constraints
                active_days = [d for d in WEEKDAYS if day_mins[d] > 0]
                free_days_list = [d for d in WEEKDAYS if day_mins[d] == 0]

                if request.hard_constraints.min_working_days and len(active_days) < request.hard_constraints.min_working_days:
                    return
                if request.hard_constraints.max_working_days and len(active_days) > request.hard_constraints.max_working_days:
                    return
                if request.hard_constraints.min_free_days_count and len(free_days_list) < request.hard_constraints.min_free_days_count:
                    return

                total_valid[0] += 1

                # Construct timetable and collapse duplicates
                sorted_ids = sorted(current_off_ids)
                tt_id = hashlib.sha256(":".join(sorted_ids).encode("utf-8")).hexdigest()[:16]

                if tt_id in visited_timetable_ids:
                    return
                visited_timetable_ids.add(tt_id)

                # Build per_day_timeline
                timeline: Dict[str, List[MeetingBlock]] = {d: [] for d in WEEKDAYS}
                off_keys = []
                fac_ratings_subset = {}

                for oid in current_off_ids:
                    c_info = candidate_cache[oid]
                    off_obj = c_info["offering"]
                    c_code = off_obj["course_code"]
                    f_name = off_obj.get("raw_name") or off_obj.get("canonical_name", "Unknown")
                    f_id = off_obj.get("faculty_id")
                    fac_ratings_subset[f_id] = faculty_ratings.get(f_id)
                    off_keys.append(off_obj.get("stable_key") or oid)

                    for m in c_info["meetings"]:
                        timeline[m.day].append(MeetingBlock(
                            day=m.day,
                            start_time=min_to_time_str(m.start_min),
                            end_time=min_to_time_str(m.end_min),
                            start_min=m.start_min,
                            end_min=m.end_min,
                            kind=m.kind,
                            slot_label=m.slot_label,
                            course_code=c_code,
                            faculty_name=f_name,
                            venue=off_obj.get("venue")
                        ))

                # Evaluate Soft Preferences
                score, breakdown, metrics = evaluate_timetable(timeline, fac_ratings_subset, request.preferences)

                tt = GeneratedTimetable(
                    timetable_id=tt_id,
                    offering_ids=sorted_ids,
                    offering_keys=sorted(off_keys),
                    per_day_timeline=timeline,
                    working_days=metrics["working_days"],
                    free_days=metrics["free_days"],
                    gap_minutes_per_day=metrics["gap_minutes_per_day"],
                    longest_gap_minutes=metrics["longest_gap_minutes"],
                    max_daily_hours=metrics["max_daily_hours"],
                    earliest_start=metrics["earliest_start"],
                    latest_end=metrics["latest_end"],
                    avg_faculty_rating=metrics["avg_faculty_rating"],
                    unrated_faculty_count=metrics["unrated_faculty_count"],
                    score=metrics["score"],
                    score_breakdown=metrics["score_breakdown"]
                )

                tie_counter[0] += 1
                if len(heap) < request.max_results:
                    heapq.heappush(heap, (score, tie_counter[0], tt))
                elif score > heap[0][0]:
                    heapq.heapreplace(heap, (score, tie_counter[0], tt))

                return

            c_sel = ordered_courses[course_idx]
            cc = c_sel.course_code.upper()
            candidates = filtered_domains[cc]

            for off in candidates:
                c_info = candidate_cache[off["id"]]
                cand_mask = c_info["mask"]

                # 1. Bitmask clash check (O(1))
                if (current_mask & cand_mask) != 0:
                    continue

                # 2. Incremental daily hours & consecutive hours check
                violates = False
                new_day_mins = dict(day_mins)
                new_day_intervals = {d: list(day_intervals[d]) for d in WEEKDAYS}

                for day, mtgs in c_info["day_meetings"].items():
                    if not mtgs:
                        continue

                    # If this day is designated as a free day, reject
                    if day in request.hard_constraints.free_days:
                        violates = True
                        break

                    added_mins = sum(end - start for start, end, _, _ in mtgs)
                    if max_daily_mins and (new_day_mins[day] + added_mins) > max_daily_mins:
                        violates = True
                        break

                    # Half-day check: verify candidate doesn't violate single-day half day
                    if request.hard_constraints.day_pattern == "HALF_DAY":
                        has_morning = any(end <= LUNCH_START for start, end, _, _ in mtgs)
                        has_afternoon = any(start >= LUNCH_END for start, end, _, _ in mtgs)
                        if has_morning and has_afternoon:
                            violates = True
                            break
                        # Check existing
                        existing = new_day_intervals[day]
                        if existing:
                            exist_morning = any(e <= LUNCH_START for s, e in existing)
                            exist_afternoon = any(s >= LUNCH_END for s, e in existing)
                            if (has_morning and exist_afternoon) or (has_afternoon and exist_morning):
                                violates = True
                                break

                    # Consecutive hours check
                    merged = new_day_intervals[day] + [(s, e) for s, e, _, _ in mtgs]
                    merged.sort()
                    if max_consec_mins and not self._check_consecutive_hours(merged, max_consec_mins):
                        violates = True
                        break

                    new_day_mins[day] += added_mins
                    new_day_intervals[day] = merged

                if violates:
                    continue

                # Recurse
                backtrack(
                    course_idx + 1,
                    current_mask | cand_mask,
                    current_off_ids + [off["id"]],
                    new_day_mins,
                    new_day_intervals
                )

                if not is_exhaustive[0] and len(heap) >= request.max_results:
                    return

        init_day_mins = {d: 0 for d in WEEKDAYS}
        init_day_intervals = {d: [] for d in WEEKDAYS}

        if request.distinct_shapes_only:
            # Group domain candidates into distinct slot shapes per course
            shapes_per_course: Dict[str, List[Dict[str, Any]]] = {}
            for c_sel in ordered_courses:
                cc = c_sel.course_code.upper()
                shape_map: Dict[Tuple, Dict[str, Any]] = {}
                for off in filtered_domains[cc]:
                    th = tuple(sorted(off.get("theory_slots") or []))
                    lab_info = off.get("lab_session")
                    if isinstance(lab_info, dict):
                        lb = tuple(sorted(lab_info.get("slots") or lab_info.get("labels") or []))
                    elif hasattr(lab_info, "slots"):
                        lb = tuple(sorted(lab_info.slots or []))
                    elif hasattr(lab_info, "labels"):
                        lb = tuple(sorted(lab_info.labels or []))
                    elif isinstance(lab_info, list):
                        lb = tuple(sorted(lab_info))
                    else:
                        lb = ()
                    shape_key = (th, lb)

                    off_id = off["id"]
                    f_id = off.get("faculty_id")
                    f_name = off.get("raw_name") or off.get("canonical_name", "Unknown")
                    f_rating = faculty_ratings.get(f_id)

                    teacher_info = {
                        "offering_id": off_id,
                        "offering_key": off.get("stable_key") or off_id,
                        "faculty_id": f_id,
                        "faculty_name": f_name,
                        "rating_mean": f_rating,
                        "venue": off.get("venue"),
                        "offering": off
                    }

                    if shape_key not in shape_map:
                        shape_map[shape_key] = {
                            "shape_key": shape_key,
                            "course_code": cc,
                            "theory_slots": list(th),
                            "lab_slots": list(lb),
                            "mask": candidate_cache[off_id]["mask"],
                            "meetings": candidate_cache[off_id]["meetings"],
                            "day_meetings": candidate_cache[off_id]["day_meetings"],
                            "teachers": []
                        }
                    shape_map[shape_key]["teachers"].append(teacher_info)

                # Sort teachers inside each shape group by rating descending
                for sh in shape_map.values():
                    sh["teachers"].sort(
                        key=lambda t: (t["rating_mean"] if t["rating_mean"] is not None else -1.0),
                        reverse=True
                    )
                shapes_per_course[cc] = list(shape_map.values())

            def backtrack_shapes(
                course_idx: int,
                current_mask: int,
                chosen_shapes: List[Dict[str, Any]],
                day_mins: Dict[str, int],
                day_intervals: Dict[str, List[Tuple[int, int]]]
            ):
                node_counter[0] += 1
                if (node_counter[0] & 127) == 0:
                    if time.perf_counter() > deadline:
                        is_exhaustive[0] = False
                        return

                if course_idx == len(ordered_courses):
                    active_days = [d for d in WEEKDAYS if day_mins[d] > 0]
                    free_days_list = [d for d in WEEKDAYS if day_mins[d] == 0]

                    if request.hard_constraints.min_working_days and len(active_days) < request.hard_constraints.min_working_days:
                        return
                    if request.hard_constraints.max_working_days and len(active_days) > request.hard_constraints.max_working_days:
                        return
                    if request.hard_constraints.min_free_days_count and len(free_days_list) < request.hard_constraints.min_free_days_count:
                        return

                    total_valid[0] += 1

                    # Unique shape ID based strictly on slot layout across courses
                    shape_tokens = [f"{sh['course_code']}:{sh['shape_key']}" for sh in chosen_shapes]
                    shape_id = hashlib.sha256("::".join(sorted(shape_tokens)).encode("utf-8")).hexdigest()[:16]

                    if shape_id in visited_timetable_ids:
                        return
                    visited_timetable_ids.add(shape_id)

                    primary_off_ids = []
                    primary_off_keys = []
                    course_options = []
                    timeline: Dict[str, List[MeetingBlock]] = {d: [] for d in WEEKDAYS}
                    fac_ratings_subset = {}

                    for sh in chosen_shapes:
                        best_teacher = sh["teachers"][0]
                        primary_off_ids.append(best_teacher["offering_id"])
                        primary_off_keys.append(best_teacher["offering_key"])
                        fac_ratings_subset[best_teacher["faculty_id"]] = best_teacher["rating_mean"]

                        avail = [
                            AvailableTeacher(
                                offering_id=t["offering_id"],
                                offering_key=t["offering_key"],
                                faculty_id=t["faculty_id"],
                                faculty_name=t["faculty_name"],
                                rating_mean=t["rating_mean"],
                                venue=t["venue"]
                            )
                            for t in sh["teachers"]
                        ]

                        course_options.append(CourseShapeOption(
                            course_code=sh["course_code"],
                            theory_slots=sh["theory_slots"],
                            lab_slots=sh["lab_slots"],
                            current_offering_id=best_teacher["offering_id"],
                            current_faculty_name=best_teacher["faculty_name"],
                            available_teachers=avail
                        ))

                        for m in sh["meetings"]:
                            timeline[m.day].append(MeetingBlock(
                                day=m.day,
                                start_time=min_to_time_str(m.start_min),
                                end_time=min_to_time_str(m.end_min),
                                start_min=m.start_min,
                                end_min=m.end_min,
                                kind=m.kind,
                                slot_label=m.slot_label,
                                course_code=sh["course_code"],
                                faculty_name=best_teacher["faculty_name"],
                                venue=best_teacher.get("venue")
                            ))

                    score, breakdown, metrics = evaluate_timetable(timeline, fac_ratings_subset, request.preferences)

                    tt = GeneratedTimetable(
                        timetable_id=f"tt_{shape_id}",
                        shape_id=shape_id,
                        offering_ids=sorted(primary_off_ids),
                        offering_keys=sorted(primary_off_keys),
                        per_day_timeline=timeline,
                        working_days=metrics["working_days"],
                        free_days=metrics["free_days"],
                        gap_minutes_per_day=metrics["gap_minutes_per_day"],
                        longest_gap_minutes=metrics["longest_gap_minutes"],
                        max_daily_hours=metrics["max_daily_hours"],
                        earliest_start=metrics["earliest_start"],
                        latest_end=metrics["latest_end"],
                        avg_faculty_rating=metrics["avg_faculty_rating"],
                        unrated_faculty_count=metrics["unrated_faculty_count"],
                        score=metrics["score"],
                        score_breakdown=metrics["score_breakdown"],
                        course_options=course_options
                    )

                    tie_counter[0] += 1
                    if len(heap) < request.max_results:
                        heapq.heappush(heap, (score, tie_counter[0], tt))
                    elif score > heap[0][0]:
                        heapq.heapreplace(heap, (score, tie_counter[0], tt))

                    return

                c_sel = ordered_courses[course_idx]
                cc = c_sel.course_code.upper()
                shapes = shapes_per_course[cc]

                for sh in shapes:
                    cand_mask = sh["mask"]

                    # 1. Bitmask clash check (O(1))
                    if (current_mask & cand_mask) != 0:
                        continue

                    # 2. Daily constraints check
                    violates = False
                    new_day_mins = dict(day_mins)
                    new_day_intervals = {d: list(day_intervals[d]) for d in WEEKDAYS}

                    for day, mtgs in sh["day_meetings"].items():
                        if not mtgs:
                            continue

                        if day in request.hard_constraints.free_days:
                            violates = True
                            break

                        added_mins = sum(end - start for start, end, _, _ in mtgs)
                        if max_daily_mins and (new_day_mins[day] + added_mins) > max_daily_mins:
                            violates = True
                            break

                        if request.hard_constraints.day_pattern == "HALF_DAY":
                            has_morning = any(end <= LUNCH_START for start, end, _, _ in mtgs)
                            has_afternoon = any(start >= LUNCH_END for start, end, _, _ in mtgs)
                            if has_morning and has_afternoon:
                                violates = True
                                break
                            existing = new_day_intervals[day]
                            if existing:
                                exist_morning = any(e <= LUNCH_START for s, e in existing)
                                exist_afternoon = any(s >= LUNCH_END for s, e in existing)
                                if (has_morning and exist_afternoon) or (has_afternoon and exist_morning):
                                    violates = True
                                    break

                        merged = new_day_intervals[day] + [(s, e) for s, e, _, _ in mtgs]
                        merged.sort()
                        if max_consec_mins and self._has_consecutive_violation(merged, max_consec_mins):
                            violates = True
                            break

                        new_day_mins[day] += added_mins
                        new_day_intervals[day] = merged

                    if violates:
                        continue

                    # Forward checking on remaining courses
                    pruned = False
                    new_mask = current_mask | cand_mask
                    for next_idx in range(course_idx + 1, len(ordered_courses)):
                        next_cc = ordered_courses[next_idx].course_code.upper()
                        has_compatible_shape = any(
                            (new_mask & next_sh["mask"]) == 0
                            for next_sh in shapes_per_course[next_cc]
                        )
                        if not has_compatible_shape:
                            pruned = True
                            break

                    if pruned:
                        continue

                    backtrack_shapes(
                        course_idx + 1,
                        new_mask,
                        chosen_shapes + [sh],
                        new_day_mins,
                        new_day_intervals
                    )

            backtrack_shapes(0, 0, [], init_day_mins, init_day_intervals)
        else:
            # Classic offering-level search (used by exhaustive Cartesian oracle)
            backtrack(0, 0, [], init_day_mins, init_day_intervals)

        # Sort top-K results descending by score
        ranked_timetables = [item[2] for item in sorted(heap, key=lambda x: x[0], reverse=True)]

        elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
        status = "completed" if is_exhaustive[0] else "time_limit_exceeded"

        if total_valid[0] == 0:
            status = "infeasible"
            explanation = self._explain_infeasibility(ordered_courses, filtered_domains, candidate_cache)
        else:
            explanation = None

        return GenerateResponse(
            status=status,
            total_valid=total_valid[0],
            returned=len(ranked_timetables),
            is_exhaustive=is_exhaustive[0],
            time_elapsed_ms=elapsed_ms,
            timetables=ranked_timetables,
            infeasible_explanation=explanation
        )

    def _offering_satisfies_prefilter(
        self,
        off: Dict[str, Any],
        c_sel: Any,
        request: GenerateRequest
    ) -> bool:
        # 1. Locked offerings constraint
        if request.locked_offerings:
            off_id = off.get("id")
            s_key = off.get("stable_key")
            # If there is a locked offering for this course, enforce strictly
            locked_for_course = [
                l for l in request.locked_offerings
                if l == off_id or (s_key and l == s_key) or l.startswith(c_sel.course_code.upper())
            ]
            if locked_for_course and off_id not in locked_for_course and s_key not in locked_for_course:
                return False

        # 2. Theory / Lab presence check
        has_theory = bool(off.get("theory_slots"))
        has_lab = bool(off.get("lab_session"))
        if not c_sel.include_theory and has_theory and not has_lab:
            return False
        if not c_sel.include_lab and has_lab and not has_theory:
            return False

        # 3. Faculty allow/block lists
        fac_name = (off.get("raw_name") or off.get("canonical_name", "")).upper()
        if c_sel.theory_faculty_allow and has_theory:
            if not any(a.upper() in fac_name for a in c_sel.theory_faculty_allow):
                return False
        if c_sel.theory_faculty_block and has_theory:
            if any(b.upper() in fac_name for b in c_sel.theory_faculty_block):
                return False
        if c_sel.lab_faculty_allow and has_lab:
            if not any(a.upper() in fac_name for a in c_sel.lab_faculty_allow):
                return False
        if c_sel.lab_faculty_block and has_lab:
            if any(b.upper() in fac_name for b in c_sel.lab_faculty_block):
                return False

        # 4. Blocked slots check
        if request.hard_constraints.blocked_slots:
            blocked_set = {s.upper() for s in request.hard_constraints.blocked_slots}
            for s in off.get("theory_slots", []):
                if s.upper() in blocked_set:
                    return False
            lab_info = off.get("lab_session")
            if lab_info:
                slots = (lab_info.get("slots") or lab_info.get("labels") or []) if isinstance(lab_info, dict) else (getattr(lab_info, "slots", None) or getattr(lab_info, "labels", None) or [])
                for l in slots:
                    if l.upper() in blocked_set:
                        return False

        # 5. Day and timing single-offering constraints
        meetings = get_offering_meetings(off)
        for m in meetings:
            if m.day not in request.hard_constraints.allowed_days:
                return False
            if m.day in request.hard_constraints.free_days:
                return False
            if request.hard_constraints.earliest_start_minute and m.start_min < request.hard_constraints.earliest_start_minute:
                return False
            if request.hard_constraints.latest_end_minute and m.end_min > request.hard_constraints.latest_end_minute:
                return False

            # Day Pattern
            if request.hard_constraints.day_pattern == "MORNING_ONLY" and m.start_min >= LUNCH_END:
                return False
            if request.hard_constraints.day_pattern == "AFTERNOON_ONLY" and m.end_min <= LUNCH_START:
                return False

        return True

    def _check_consecutive_hours(self, sorted_intervals: List[Tuple[int, int]], max_consec_mins: int) -> bool:
        """Verifies no continuous unbroken class stretch exceeds max_consec_mins."""
        if not sorted_intervals:
            return True

        curr_start = sorted_intervals[0][0]
        curr_end = sorted_intervals[0][1]

        for s, e in sorted_intervals[1:]:
            if s <= curr_end + 15:  # Less than 15 min break is unbroken
                curr_end = max(curr_end, e)
            else:
                if (curr_end - curr_start) > max_consec_mins:
                    return False
                curr_start = s
                curr_end = e

        return (curr_end - curr_start) <= max_consec_mins

    def _explain_infeasibility(
        self,
        ordered_courses: List[Any],
        domains: Dict[str, List[Dict[str, Any]]],
        cache: Dict[str, Dict[str, Any]]
    ) -> InfeasibleExplanation:
        """Finds pairwise conflicting courses when the total search space is 0."""
        conflicting_pairs = []
        conflicting_set: Set[str] = set()

        for i in range(len(ordered_courses)):
            c1 = ordered_courses[i].course_code.upper()
            d1 = domains.get(c1, [])
            for j in range(i + 1, len(ordered_courses)):
                c2 = ordered_courses[j].course_code.upper()
                d2 = domains.get(c2, [])

                # Test if there exists ANY non-clashing pair between c1 and c2
                has_valid_pair = False
                for o1 in d1:
                    m1 = cache[o1["id"]]["mask"]
                    for o2 in d2:
                        m2 = cache[o2["id"]]["mask"]
                        if (m1 & m2) == 0:
                            has_valid_pair = True
                            break
                    if has_valid_pair:
                        break

                if not has_valid_pair:
                    conflicting_pairs.append({
                        "course_1": c1,
                        "course_2": c2,
                        "reason": f"Every offering of {c1} ({len(d1)} options) clashes with all offerings of {c2} ({len(d2)} options)."
                    })
                    conflicting_set.add(c1)
                    conflicting_set.add(c2)

        summary = f"No conflict-free combination exists. Identified {len(conflicting_pairs)} mutually exclusive course pair(s)."
        return InfeasibleExplanation(
            empty_domain_courses=[],
            conflicting_pairs=conflicting_pairs,
            minimal_conflicting_subset=sorted(list(conflicting_set)),
            diagnostic_summary=summary
        )
