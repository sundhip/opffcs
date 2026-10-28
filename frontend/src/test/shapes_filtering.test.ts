import { describe, it, expect } from "vitest";
import {
  getGapCategory,
  getFinishCategory,
  getHalfDaysCount,
  getHalfDaysCategory,
  getDaysCategory
} from "../components/results/ResultsBrowser";
import { getShapeBadgeLabel } from "../components/results/ShapesSidebar";
import { GeneratedTimetable } from "../types";

describe("OP FFCS Shapes & Filtering Engine", () => {
  const baseTimetable: GeneratedTimetable = {
    timetable_id: "tt_test_1",
    score: 88.5,
    offering_ids: ["off_1", "off_2"],
    offering_keys: ["k1", "k2"],
    unrated_faculty_count: 0,
    score_breakdown: {},
    working_days: ["MON", "TUE", "WED", "THU"],
    free_days: ["FRI"],
    per_day_timeline: {
      MON: [
        {
          course_code: "BACSE204",
          slot_label: "A1",
          day: "MON",
          start_time: "08:00",
          end_time: "08:50",
          start_min: 480,
          end_min: 530,
          kind: "theory",
          faculty_name: "Dr. Faculty A",
          venue: "AB1-101"
        },
        {
          course_code: "BACSE205",
          slot_label: "B1",
          day: "MON",
          start_time: "08:55",
          end_time: "09:45",
          start_min: 535,
          end_min: 585,
          kind: "theory",
          faculty_name: "Dr. Faculty B",
          venue: "AB1-102"
        }
      ],
      TUE: [
        {
          course_code: "BACSE204",
          slot_label: "A2",
          day: "TUE",
          start_time: "08:00",
          end_time: "08:50",
          start_min: 480,
          end_min: 530,
          kind: "theory",
          faculty_name: "Dr. Faculty A",
          venue: "AB1-101"
        }
      ],
      WED: [
        {
          course_code: "BACSE205",
          slot_label: "B2",
          day: "WED",
          start_time: "08:00",
          end_time: "08:50",
          start_min: 480,
          end_min: 530,
          kind: "theory",
          faculty_name: "Dr. Faculty B",
          venue: "AB1-102"
        }
      ],
      THU: [
        {
          course_code: "BAMAT205",
          slot_label: "C1",
          day: "THU",
          start_time: "08:00",
          end_time: "08:50",
          start_min: 480,
          end_min: 530,
          kind: "theory",
          faculty_name: "Dr. Math",
          venue: "AB1-103"
        }
      ],
      FRI: []
    },
    gap_minutes_per_day: {
      MON: 5,
      TUE: 0,
      WED: 0,
      THU: 0,
      FRI: 0
    },
    longest_gap_minutes: 5,
    earliest_start: "08:00",
    latest_end: "09:45",
    max_daily_hours: 1.75,
    avg_faculty_rating: 4.8
  };

  it("evaluates free gaps category correctly", () => {
    // 5 minutes total gaps -> LESS
    expect(getGapCategory(baseTimetable)).toBe("LESS");

    const medGapTt = {
      ...baseTimetable,
      gap_minutes_per_day: { MON: 50, TUE: 50, WED: 0, THU: 0, FRI: 0 }
    };
    expect(getGapCategory(medGapTt)).toBe("MEDIUM");

    const highGapTt = {
      ...baseTimetable,
      gap_minutes_per_day: { MON: 100, TUE: 100, WED: 50, THU: 0, FRI: 0 }
    };
    expect(getGapCategory(highGapTt)).toBe("HIGH");
  });

  it("evaluates finish time category correctly", () => {
    // latest_end = 09:45 -> EARLY (<= 15:40)
    expect(getFinishCategory(baseTimetable)).toBe("EARLY");

    const midTt = { ...baseTimetable, latest_end: "16:30" };
    expect(getFinishCategory(midTt)).toBe("MID");

    const lateTt = { ...baseTimetable, latest_end: "18:30" };
    expect(getFinishCategory(lateTt)).toBe("LATE");
  });

  it("evaluates half days correctly", () => {
    // All 4 active days have classes only between 08:00 and 09:45 (all morning)
    expect(getHalfDaysCount(baseTimetable)).toBe(4);
    expect(getHalfDaysCategory(baseTimetable)).toBe("HIGH");
  });

  it("evaluates days workload category correctly", () => {
    // Friday is free -> FOUR_DAY
    expect(getDaysCategory(baseTimetable)).toBe("FOUR_DAY");

    const fiveDayTt = {
      ...baseTimetable,
      free_days: [],
      working_days: ["MON", "TUE", "WED", "THU", "FRI"],
      max_daily_hours: 4.0
    };
    expect(getDaysCategory(fiveDayTt)).toBe("BALANCED");
  });

  it("generates correct badge label for shape sidebar cards", () => {
    expect(getShapeBadgeLabel(baseTimetable, 0)).toBe("Best overall");
    expect(getShapeBadgeLabel(baseTimetable, 1)).toBe("FRI Off");
  });
});
