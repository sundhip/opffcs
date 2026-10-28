import React, { useMemo } from "react";
import { GeneratedTimetable } from "../../types";
import { getCoursePalette } from "../../utils/colors";

interface ShapesSidebarProps {
  timetables: GeneratedTimetable[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
}

// 5 weekdays: Mon to Fri
const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
// Standard day start and end in minutes (08:00 to 19:00 = 660 mins total)
const DAY_START_MIN = 480;  // 08:00
const DAY_END_MIN = 1140;   // 19:00
const TOTAL_DAY_MIN = DAY_END_MIN - DAY_START_MIN;

// Mini 5-Day Preview Matrix for a Timetable
export const MiniScheduleMatrix: React.FC<{ timetable: GeneratedTimetable }> = ({ timetable }) => {
  return (
    <div className="w-full bg-[#0a0f1d] rounded-lg p-2 space-y-1 border border-slate-800/80">
      {DAYS.map((day) => {
        const meetings = timetable.per_day_timeline[day] || [];
        const isFreeDay = meetings.length === 0;

        return (
          <div key={day} className="relative h-2 w-full bg-slate-900/90 rounded-sm overflow-hidden flex items-center">
            {isFreeDay ? (
              <div className="w-full h-full bg-slate-900/40" />
            ) : (
              meetings.map((m, idx) => {
                const palette = getCoursePalette(m.course_code);
                const leftPct = Math.max(0, Math.min(100, ((m.start_min - DAY_START_MIN) / TOTAL_DAY_MIN) * 100));
                const widthPct = Math.max(2, Math.min(100 - leftPct, ((m.end_min - m.start_min) / TOTAL_DAY_MIN) * 100));

                return (
                  <div
                    key={`${day}-${idx}-${m.course_code}`}
                    className="absolute top-0 bottom-0 rounded-[1.5px]"
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      backgroundColor: palette.hexBorder
                    }}
                    title={`${day}: ${m.course_code} (${m.start_time}-${m.end_time})`}
                  />
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
};

export function getShapeBadgeLabel(tt: GeneratedTimetable, index: number): string {
  if (index === 0) return "Best overall";
  if (tt.free_days && tt.free_days.length > 0) return `${tt.free_days[0]} Off`;
  if (tt.longest_gap_minutes <= 60) return "Zero Gaps";
  let morningMeetings = 0;
  let afternoonMeetings = 0;
  Object.values(tt.per_day_timeline).forEach((mtgs) => {
    mtgs.forEach((m) => {
      if (m.end_min <= 840) morningMeetings++;
      else afternoonMeetings++;
    });
  });
  if (morningMeetings > afternoonMeetings * 1.5) return "Morning";
  if (afternoonMeetings >= morningMeetings) return "Afternoon";
  return `Shape ${index + 1}`;
}

export const ShapesSidebar: React.FC<ShapesSidebarProps> = ({
  timetables,
  selectedIndex,
  onSelectIndex
}) => {
  return (
    <div className="w-full h-full flex flex-col bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/90">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-slate-100 tracking-tight flex items-center gap-1.5 font-sans">
            Shapes <span className="text-slate-400 font-normal">·</span>{" "}
            <span className="font-mono text-indigo-400">{timetables.length}</span>
          </h3>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Layouts
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
          Each one is a different week layout. Best first.
        </p>
      </div>

      {/* Scrollable Shapes List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[820px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {timetables.map((tt, idx) => {
          const isSelected = idx === selectedIndex;
          const badgeLabel = getShapeBadgeLabel(tt, idx);
          const scoreInt = Math.round(tt.score);

          return (
            <div
              key={tt.timetable_id || `shape-${idx}`}
              onClick={() => onSelectIndex(idx)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? "bg-slate-850 border-[#c6f052] ring-2 ring-[#c6f052]/70 shadow-lg shadow-[#c6f052]/10"
                  : "bg-slate-900/70 hover:bg-slate-850/90 border-slate-800/80 hover:border-slate-750 text-slate-300"
              }`}
            >
              {/* Mini Matrix Preview */}
              <MiniScheduleMatrix timetable={tt} />

              {/* Card Footer: Badge Label & Integer Score */}
              <div className="mt-2.5 flex items-center justify-between text-xs">
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                    idx === 0
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : isSelected
                      ? "bg-slate-700/80 text-[#c6f052] border border-[#c6f052]/40"
                      : "bg-slate-800 text-slate-300 border border-slate-750"
                  }`}
                >
                  {badgeLabel}
                </span>

                <span
                  className={`font-mono text-sm font-extrabold ${
                    isSelected ? "text-[#c6f052]" : "text-slate-200"
                  }`}
                >
                  {scoreInt}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
