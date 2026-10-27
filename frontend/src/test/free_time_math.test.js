import { describe, it, expect } from "vitest";
// Free time math logic matching backend/evaluator.py
function calculateDailyGapsAndFree(intervals, lunchStart = 800, lunchEnd = 840) {
    if (intervals.length <= 1) {
        return { gapMinutes: 0, longestGap: 0 };
    }
    const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
    let totalGap = 0;
    let longestGap = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
        const rawGapStart = sorted[i][1];
        const rawGapEnd = sorted[i + 1][0];
        if (rawGapEnd > rawGapStart) {
            let gapDuration = rawGapEnd - rawGapStart;
            // Deduct lunch break overlap if gap spans lunch
            const overlapStart = Math.max(rawGapStart, lunchStart);
            const overlapEnd = Math.min(rawGapEnd, lunchEnd);
            if (overlapEnd > overlapStart) {
                gapDuration -= (overlapEnd - overlapStart);
            }
            if (gapDuration > 0) {
                totalGap += gapDuration;
                if (gapDuration > longestGap) {
                    longestGap = gapDuration;
                }
            }
        }
    }
    return { gapMinutes: totalGap, longestGap };
}
describe("Free-Time and Gap Mathematics", () => {
    it("calculates morning gap correctly", () => {
        // Class 1: 08:00 - 08:50 (480 - 530)
        // Class 2: 09:50 - 10:40 (590 - 640)
        // Raw gap: 530 to 590 = 60 mins. Lunch is 800-840 (no overlap).
        const intervals = [[480, 530], [590, 640]];
        const res = calculateDailyGapsAndFree(intervals);
        expect(res.gapMinutes).toBe(60);
        expect(res.longestGap).toBe(60);
    });
    it("deducts transit lunch break so lunch is not penalized as idle gap", () => {
        // Class 1: Period 6 (12:35 - 13:25, 755 - 805)
        // Class 2: Period 7 (14:00 - 14:50, 840 - 890)
        // Raw gap: 805 to 840 = 35 mins.
        // Lunch window: 800 to 840. Overlap with gap: max(805, 800) to min(840, 840) = 805 to 840 = 35 mins.
        // Net idle waiting gap after lunch deduction: 35 - 35 = 0 mins!
        const intervals = [[755, 805], [840, 890]];
        const res = calculateDailyGapsAndFree(intervals);
        expect(res.gapMinutes).toBe(0);
        expect(res.longestGap).toBe(0);
    });
    it("handles consecutive adjacent classes with 0 gap", () => {
        // Lab session or contiguous classes: 840 to 890 and 890 to 940
        const intervals = [[840, 890], [890, 940]];
        const res = calculateDailyGapsAndFree(intervals);
        expect(res.gapMinutes).toBe(0);
        expect(res.longestGap).toBe(0);
    });
    it("identifies single class day as having 0 waiting gap", () => {
        const intervals = [[480, 530]];
        const res = calculateDailyGapsAndFree(intervals);
        expect(res.gapMinutes).toBe(0);
        expect(res.longestGap).toBe(0);
    });
});
