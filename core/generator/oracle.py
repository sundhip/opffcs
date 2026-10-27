import itertools
import hashlib
from typing import Dict, List, Set, Tuple, Any
from core.slots.clash import check_meetings_clash_interval
from core.slots.slot_map import get_offering_meetings
from core.generator.models import GenerateRequest

WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI"]
LUNCH_START = 800
LUNCH_END = 840

class BruteForceOracle:
    """
    Independent brute-force correctness oracle using itertools.product and
    physical interval clash comparisons.
    Used to mathematically verify the backtracking solver on random datasets.
    """
    def find_all_valid_timetables(
        self,
        request: GenerateRequest,
        filtered_domains: Dict[str, List[Dict[str, Any]]]
    ) -> Tuple[int, Set[str]]:
        ordered_codes = [c.course_code.upper() for c in request.courses]
        domain_lists = [filtered_domains.get(cc, []) for cc in ordered_codes]

        # If any domain is empty, 0 valid timetables
        if any(len(d) == 0 for d in domain_lists):
            return 0, set()

        max_daily_mins = (request.hard_constraints.max_daily_hours * 60) if request.hard_constraints.max_daily_hours else None
        max_consec_mins = (request.hard_constraints.max_consecutive_hours * 60) if request.hard_constraints.max_consecutive_hours else None

        valid_ids: Set[str] = set()

        # Precompute meetings per offering
        meetings_cache = {}
        for d in domain_lists:
            for off in d:
                if off["id"] not in meetings_cache:
                    meetings_cache[off["id"]] = get_offering_meetings(off)

        # Exhaustive Cartesian product
        for combo in itertools.product(*domain_lists):
            offering_ids = [off["id"] for off in combo]

            # 1. Pairwise interval clash check using interval reference engine
            clashed = False
            for i in range(len(combo)):
                m_i = meetings_cache[combo[i]["id"]]
                for j in range(i + 1, len(combo)):
                    m_j = meetings_cache[combo[j]["id"]]
                    if check_meetings_clash_interval(m_i, m_j):
                        clashed = True
                        break
                if clashed:
                    break

            if clashed:
                continue

            # 2. Check multi-day and daily constraints
            day_mins = {d: 0 for d in WEEKDAYS}
            day_intervals = {d: [] for d in WEEKDAYS}
            violates = False

            for off in combo:
                for m in meetings_cache[off["id"]]:
                    if m.day in request.hard_constraints.free_days:
                        violates = True
                        break
                    day_mins[m.day] += (m.end_min - m.start_min)
                    day_intervals[m.day].append((m.start_min, m.end_min))
                if violates:
                    break

            if violates:
                continue

            # Max daily hours check
            if max_daily_mins:
                if any(mins > max_daily_mins for mins in day_mins.values()):
                    continue

            # Working days & free days count checks
            active_days = [d for d in WEEKDAYS if day_mins[d] > 0]
            free_days_count = len([d for d in WEEKDAYS if day_mins[d] == 0])

            if request.hard_constraints.min_working_days and len(active_days) < request.hard_constraints.min_working_days:
                continue
            if request.hard_constraints.max_working_days and len(active_days) > request.hard_constraints.max_working_days:
                continue
            if request.hard_constraints.min_free_days_count and free_days_count < request.hard_constraints.min_free_days_count:
                continue

            # Half day check
            if request.hard_constraints.day_pattern == "HALF_DAY":
                hd_violated = False
                for d in WEEKDAYS:
                    intervals = day_intervals[d]
                    if intervals:
                        has_morn = any(e <= LUNCH_START for s, e in intervals)
                        has_aft = any(s >= LUNCH_END for s, e in intervals)
                        if has_morn and has_aft:
                            hd_violated = True
                            break
                if hd_violated:
                    continue

            # Consecutive hours check
            if max_consec_mins:
                consec_violated = False
                for d in WEEKDAYS:
                    intervals = sorted(day_intervals[d])
                    if intervals:
                        curr_s, curr_e = intervals[0]
                        for s, e in intervals[1:]:
                            if s <= curr_e + 15:
                                curr_e = max(curr_e, e)
                            else:
                                if (curr_e - curr_s) > max_consec_mins:
                                    consec_violated = True
                                    break
                                curr_s, curr_e = s, e
                        if (curr_e - curr_s) > max_consec_mins:
                            consec_violated = True
                    if consec_violated:
                        break
                if consec_violated:
                    continue

            # Valid schedule!
            sorted_ids = sorted(offering_ids)
            tt_id = hashlib.sha256(":".join(sorted_ids).encode("utf-8")).hexdigest()[:16]
            valid_ids.add(tt_id)

        return len(valid_ids), valid_ids
