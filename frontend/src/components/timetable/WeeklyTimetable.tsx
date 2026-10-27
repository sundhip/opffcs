import React, { useState } from "react";
import { MeetingBlock } from "../../types";
import { getCoursePalette } from "../../utils/colors";
import { FlaskConical, BookOpen, MapPin, User, Clock, Star } from "lucide-react";

interface WeeklyTimetableProps {
  timeline: Record<string, MeetingBlock[]>;
  title?: string;
  subtitle?: string;
  courseTitles?: Record<string, string>;
  className?: string;
  onBlockClick?: (block: MeetingBlock) => void;
}

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const DAY_LABELS: Record<string, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday"
};

// Start at 08:00 (480 min), End at 19:30 (1170 min)
const DAY_START_MIN = 480;
const DAY_END_MIN = 1170;
const TOTAL_MINUTES = DAY_END_MIN - DAY_START_MIN; // 690 minutes

// Scale: 1 minute = 1.05px for high-density readable layout
const PIXELS_PER_MINUTE = 1.05;
const GRID_HEIGHT = TOTAL_MINUTES * PIXELS_PER_MINUTE;

// Key time tick marks to render on time axis
const TIME_TICKS = [
  { min: 480, label: "08:00" },
  { min: 535, label: "08:55" },
  { min: 590, label: "09:50" },
  { min: 645, label: "10:45" },
  { min: 700, label: "11:40" },
  { min: 755, label: "12:35" },
  { min: 800, label: "13:20", isLunch: true },
  { min: 840, label: "14:00" },
  { min: 895, label: "14:55" },
  { min: 950, label: "15:50" },
  { min: 1005, label: "16:45" },
  { min: 1060, label: "17:40" },
  { min: 1115, label: "18:35" },
  { min: 1170, label: "19:30" }
];

export const WeeklyTimetable: React.FC<WeeklyTimetableProps> = ({
  timeline,
  title,
  subtitle,
  courseTitles = {},
  className = "",
  onBlockClick
}) => {
  const [activePopover, setActivePopover] = useState<MeetingBlock | null>(null);

  // Lunch window: 800 (13:20) to 840 (14:00)
  const lunchTop = (800 - DAY_START_MIN) * PIXELS_PER_MINUTE;
  const lunchHeight = (840 - 800) * PIXELS_PER_MINUTE;

  return (
    <div className={`timetable-container bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl ${className}`}>
      {/* Header bar */}
      {(title || subtitle) && (
        <div className="px-5 py-3.5 bg-slate-800/80 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
          <div>
            {title && <h3 className="font-semibold text-slate-100 text-base">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-500/80 border border-indigo-400 inline-block"></span>
              Theory Class
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500/80 border border-emerald-400 border-dashed inline-block"></span>
              Lab Session (Continuous)
            </span>
            <span className="flex items-center gap-1.5 text-amber-300">
              <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/60 inline-block"></span>
              Lunch Break
            </span>
          </div>
        </div>
      )}

      {/* Responsive Horizontal Scroll Container */}
      <div className="overflow-x-auto relative">
        <div className="min-w-[760px] select-none" style={{ height: GRID_HEIGHT + 48 }}>
          {/* Day Headers row */}
          <div className="grid grid-cols-[68px_repeat(5,1fr)] bg-slate-800/90 border-b border-slate-700 text-xs font-semibold text-slate-300 sticky top-0 z-20 shadow-sm">
            <div className="py-2.5 px-2 text-center text-slate-400 border-r border-slate-700/80">Time</div>
            {WEEKDAYS.map((day) => {
              const count = (timeline[day] || []).length;
              return (
                <div key={day} className="py-2.5 px-3 text-center border-r border-slate-700/80 last:border-r-0 flex items-center justify-center gap-1.5">
                  <span className="text-slate-100 font-bold">{day}</span>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">({DAY_LABELS[day]})</span>
                  {count > 0 ? (
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] flex items-center justify-center font-bold">
                      {count}
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400/80 font-medium">Free</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Timetable Body (Minute-scaled columns) */}
          <div
            className="grid grid-cols-[68px_repeat(5,1fr)] relative timetable-grid"
            style={{ height: GRID_HEIGHT }}
          >
            {/* 1. Time Column with Ticks */}
            <div className="relative border-r border-slate-800 bg-slate-900/90 text-[10px] font-mono text-slate-400">
              {TIME_TICKS.map((tick) => {
                const top = (tick.min - DAY_START_MIN) * PIXELS_PER_MINUTE;
                return (
                  <div
                    key={tick.min}
                    className={`absolute right-2 -translate-y-1/2 flex items-center gap-1 ${
                      tick.isLunch ? "text-amber-400 font-semibold" : ""
                    }`}
                    style={{ top }}
                  >
                    <span>{tick.label}</span>
                  </div>
                );
              })}
            </div>

            {/* 2. Global Lunch Break Band Across All Day Columns */}
            <div
              className="absolute left-[68px] right-0 pointer-events-none z-10 flex items-center justify-center bg-amber-500/10 border-y border-amber-500/30"
              style={{ top: lunchTop, height: lunchHeight }}
            >
              <span className="text-[11px] font-semibold text-amber-300/80 tracking-wider uppercase">
                Lunch Transit Window (13:20 – 14:00)
              </span>
            </div>

            {/* 3. Horizontal Gridlines */}
            {TIME_TICKS.map((tick) => {
              const top = (tick.min - DAY_START_MIN) * PIXELS_PER_MINUTE;
              return (
                <div
                  key={`line-${tick.min}`}
                  className={`absolute left-[68px] right-0 border-t ${
                    tick.isLunch ? "border-amber-500/30" : "border-slate-800/60"
                  }`}
                  style={{ top }}
                />
              );
            })}

            {/* 4. Day Columns & Meeting Blocks */}
            {WEEKDAYS.map((day) => {
              const dayMeetings = timeline[day] || [];

              return (
                <div
                  key={day}
                  className="relative border-r border-slate-800/80 last:border-r-0 h-full"
                  role="region"
                  aria-label={`${DAY_LABELS[day]} schedule`}
                >
                  {dayMeetings.map((block, idx) => {
                    const top = Math.max(0, (block.start_min - DAY_START_MIN) * PIXELS_PER_MINUTE);
                    const height = Math.max(26, (block.end_min - block.start_min) * PIXELS_PER_MINUTE - 2);
                    const palette = getCoursePalette(block.course_code);
                    const isLab = block.kind === "lab";
                    const isLunchOverlapping = block.start_min < 840 && block.end_min > 800;

                    return (
                      <div
                        key={`${block.course_code}-${block.slot_label}-${idx}`}
                        tabIndex={0}
                        role="article"
                        aria-label={`${block.course_code} ${block.kind} from ${block.start_time} to ${block.end_time} in slot ${block.slot_label} by ${block.faculty_name}`}
                        onClick={() => {
                          setActivePopover(block);
                          if (onBlockClick) onBlockClick(block);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setActivePopover(block);
                            if (onBlockClick) onBlockClick(block);
                          }
                        }}
                        style={{ top, height }}
                        className={`absolute left-1 right-1 rounded-md p-1.5 cursor-pointer transition-all duration-150 shadow-sm hover:shadow-md hover:ring-2 hover:ring-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 z-10 flex flex-col justify-between overflow-hidden text-left border ${
                          isLab
                            ? `${palette.bgDark} ${palette.borderDark} border-dashed ring-1 ring-emerald-500/30`
                            : `${palette.bgDark} ${palette.borderDark}`
                        } ${isLunchOverlapping ? "ring-2 ring-red-500/60" : ""}`}
                      >
                        {/* Top: Course code and slot */}
                        <div className="flex items-center justify-between gap-1 leading-tight">
                          <span className={`font-bold text-xs truncate ${palette.textDark}`}>
                            {block.course_code}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1 py-0.2 rounded font-semibold uppercase ${
                              isLab ? "bg-emerald-950 text-emerald-300 border border-emerald-600/50" : palette.badgeDark
                            }`}
                          >
                            {block.slot_label}
                          </span>
                        </div>

                        {/* Middle: Short Course Title or Faculty */}
                        <div className="text-[10px] text-slate-300 truncate font-medium flex items-center gap-1 mt-0.5">
                          {isLab ? (
                            <FlaskConical className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <BookOpen className="w-2.5 h-2.5 text-indigo-400 flex-shrink-0" />
                          )}
                          <span className="truncate">{courseTitles[block.course_code] || block.faculty_name}</span>
                        </div>

                        {/* Bottom: Faculty & Time */}
                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-0.5 pt-0.5 border-t border-slate-700/40">
                          <span className="truncate">{block.venue || block.faculty_name}</span>
                          <span className="flex-shrink-0 font-medium">{block.start_time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail Popover Modal / Drawer */}
      {activePopover && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => setActivePopover(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={`text-xs font-mono font-semibold px-2 py-0.5 rounded uppercase ${
                    activePopover.kind === "lab"
                      ? "bg-emerald-900 text-emerald-200"
                      : "bg-indigo-900 text-indigo-200"
                  }`}
                >
                  {activePopover.kind.toUpperCase()} SESSION • {activePopover.slot_label}
                </span>
                <h4 className="text-xl font-bold text-slate-100 mt-2">
                  {activePopover.course_code}
                </h4>
                <p className="text-sm text-slate-400">
                  {courseTitles[activePopover.course_code] || "VIT University Course"}
                </p>
              </div>
              <button
                onClick={() => setActivePopover(null)}
                className="text-slate-400 hover:text-slate-200 p-1 text-lg font-bold"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-3 border-t border-slate-800 pt-4 text-sm text-slate-300">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>
                  {DAY_LABELS[activePopover.day]} {activePopover.start_time} – {activePopover.end_time} (
                  {activePopover.end_min - activePopover.start_min} minutes)
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-indigo-400" />
                <span>Faculty: {activePopover.faculty_name}</span>
              </div>
              {activePopover.venue && (
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <span>Venue: {activePopover.venue}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setActivePopover(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
