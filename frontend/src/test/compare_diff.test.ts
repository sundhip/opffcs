import { describe, it, expect } from "vitest";

function computeTimetableDifferenceSummary(ttA: any, ttB: any) {
  const freeDaysA = new Set(ttA.free_days || []);
  const freeDaysB = new Set(ttB.free_days || []);

  const sharedFreeDays = [...freeDaysA].filter((d) => freeDaysB.has(d));
  const uniqueFreeDaysA = [...freeDaysA].filter((d) => !freeDaysB.has(d));
  const uniqueFreeDaysB = [...freeDaysB].filter((d) => !freeDaysA.has(d));

  const totalGapsA = Object.values(ttA.gap_minutes_per_day || {}).reduce((s: number, m: any) => s + m, 0);
  const totalGapsB = Object.values(ttB.gap_minutes_per_day || {}).reduce((s: number, m: any) => s + m, 0);

  return {
    sharedFreeDays,
    uniqueFreeDaysA,
    uniqueFreeDaysB,
    gapDifferenceMins: totalGapsA - totalGapsB,
    scoreDifference: (ttA.score || 0) - (ttB.score || 0)
  };
}

describe("Timetable Compare Diff Logic", () => {
  it("identifies unique free days between two schedules", () => {
    const tt1 = {
      timetable_id: "tt_1",
      free_days: ["FRI"],
      gap_minutes_per_day: { MON: 0, TUE: 60, WED: 0, THU: 0, FRI: 0 },
      score: 0.85
    };

    const tt2 = {
      timetable_id: "tt_2",
      free_days: ["MON", "FRI"],
      gap_minutes_per_day: { MON: 0, TUE: 0, WED: 0, THU: 0, FRI: 0 },
      score: 0.92
    };

    const diff = computeTimetableDifferenceSummary(tt1, tt2);
    expect(diff.sharedFreeDays).toEqual(["FRI"]);
    expect(diff.uniqueFreeDaysA).toEqual([]);
    expect(diff.uniqueFreeDaysB).toEqual(["MON"]);
    expect(diff.gapDifferenceMins).toBe(60);
    expect(diff.scoreDifference).toBeCloseTo(-0.07, 2);
  });
});
