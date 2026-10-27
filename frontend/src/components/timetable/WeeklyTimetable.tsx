import React, { useState, useMemo } from "react";
import { MeetingBlock, GeneratedTimetable } from "../../types";
import { getCoursePalette } from "../../utils/colors";
import {
  FlaskConical,
  BookOpen,
  MapPin,
  User,
  Clock,
  Star,
  Download,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Calendar
} from "lucide-react";
import { downloadTimetableExport } from "../../utils/exporter";

export interface WeeklyTimetableProps {
  timeline: Record<string, MeetingBlock[]>;
  title?: string;
  subtitle?: string;
  courseTitles?: Record<string, string>;
  courseCredits?: Record<string, number>;
  className?: string;
  onBlockClick?: (block: MeetingBlock) => void;
  onDownload?: () => void;
  onReset?: () => void;
  timetableObj?: GeneratedTimetable;
}

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const DAY_LABELS: Record<string, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday"
};

// Known course credits fallback
const KNOWN_COURSE_CREDITS: Record<string, number> = {
  BASTS102: 1,
  BAHSM100: 3,
  ANCILLARY: 3,
  BAMGT213: 3,
  BAMGT215: 3,
  BAMGT217: 3,
  BAHUM204: 3,
  BAHUM205: 3,
  BAHUM203: 3,
  BAMGT221: 3,
  BAHUM202: 3,
  BACSE204: 4,
  BACSE205: 4,
  BAMAT205: 4,
  BACSE324: 4,
  BACSE339: 4,
  BACSE345: 4
};

// 12 Periods Definition
interface MatrixPeriod {
  periodIdx: number;
  periodNum: number;
  theoryTime: string;
  labTime: string;
  theoryStartMin: number;
  theoryEndMin: number;
  labStartMin: number;
  labEndMin: number;
}

const MORNING_PERIODS: MatrixPeriod[] = [
  { periodIdx: 0, periodNum: 1, theoryTime: "08:00 AM to 08:50 AM", labTime: "08:00 AM to 08:50 AM", theoryStartMin: 480, theoryEndMin: 530, labStartMin: 480, labEndMin: 530 },
  { periodIdx: 1, periodNum: 2, theoryTime: "08:55 AM to 09:45 AM", labTime: "08:50 AM to 09:40 AM", theoryStartMin: 535, theoryEndMin: 585, labStartMin: 530, labEndMin: 580 },
  { periodIdx: 2, periodNum: 3, theoryTime: "09:50 AM to 10:40 AM", labTime: "09:50 AM to 10:40 AM", theoryStartMin: 590, theoryEndMin: 640, labStartMin: 590, labEndMin: 640 },
  { periodIdx: 3, periodNum: 4, theoryTime: "10:45 AM to 11:35 AM", labTime: "10:40 AM to 11:30 AM", theoryStartMin: 645, theoryEndMin: 695, labStartMin: 640, labEndMin: 690 },
  { periodIdx: 4, periodNum: 5, theoryTime: "11:40 AM to 12:30 PM", labTime: "11:40 AM to 12:30 PM", theoryStartMin: 700, theoryEndMin: 750, labStartMin: 700, labEndMin: 750 },
  { periodIdx: 5, periodNum: 6, theoryTime: "12:35 PM to 01:25 PM", labTime: "12:30 PM to 01:20 PM", theoryStartMin: 755, theoryEndMin: 805, labStartMin: 750, labEndMin: 800 }
];

const AFTERNOON_PERIODS: MatrixPeriod[] = [
  { periodIdx: 6, periodNum: 7, theoryTime: "02:00 PM to 02:50 PM", labTime: "02:00 PM to 02:50 PM", theoryStartMin: 840, theoryEndMin: 890, labStartMin: 840, labEndMin: 890 },
  { periodIdx: 7, periodNum: 8, theoryTime: "02:55 PM to 03:45 PM", labTime: "02:50 PM to 03:40 PM", theoryStartMin: 895, theoryEndMin: 945, labStartMin: 890, labEndMin: 940 },
  { periodIdx: 8, periodNum: 9, theoryTime: "03:50 PM to 04:40 PM", labTime: "03:50 PM to 04:40 PM", theoryStartMin: 950, theoryEndMin: 1000, labStartMin: 950, labEndMin: 1000 },
  { periodIdx: 9, periodNum: 10, theoryTime: "04:45 PM to 05:35 PM", labTime: "04:40 PM to 05:30 PM", theoryStartMin: 1005, theoryEndMin: 1055, labStartMin: 1000, labEndMin: 1050 },
  { periodIdx: 10, periodNum: 11, theoryTime: "05:40 PM to 06:30 PM", labTime: "05:40 PM to 06:30 PM", theoryStartMin: 1060, theoryEndMin: 1110, labStartMin: 1060, labEndMin: 1110 },
  { periodIdx: 11, periodNum: 12, theoryTime: "06:35 PM to 07:25 PM", labTime: "06:30 PM to 07:20 PM", theoryStartMin: 1115, theoryEndMin: 1165, labStartMin: 1110, labEndMin: 1160 }
];

const DAY_SLOT_MATRIX: Record<string, { theory: (string | null)[]; lab: string[] }> = {
  MON: {
    theory: ["A1", "F1", "D1", "TB1", "TG1", "S11", "A2", "F2", "D2", "TB2", "TG2", "S3"],
    lab: ["L1", "L2", "L3", "L4", "L5", "L6", "L31", "L32", "L33", "L34", "L35", "L36"]
  },
  TUE: {
    theory: ["B1", "G1", "E1", "TC1", "TAA1", null, "B2", "G2", "E2", "TC2", "TAA2", "S1"],
    lab: ["L7", "L8", "L9", "L10", "L11", "L12", "L37", "L38", "L39", "L40", "L41", "L42"]
  },
  WED: {
    theory: ["C1", "A1", "F1", "TD1", "TBB1", null, "C2", "A2", "F2", "TD2", "TBB2", "S4"],
    lab: ["L13", "L14", "L15", "L16", "L17", "L18", "L43", "L44", "L45", "L46", "L47", "L48"]
  },
  THU: {
    theory: ["D1", "B1", "G1", "TE1", "TCC1", null, "D2", "B2", "G2", "TE2", "TCC2", "S2"],
    lab: ["L19", "L20", "L21", "L22", "L23", "L24", "L49", "L50", "L51", "L52", "L53", "L54"]
  },
  FRI: {
    theory: ["E1", "C1", "TA1", "TF1", "TDD1", "S15", "E2", "C2", "TA2", "TF2", "TDD2", null],
    lab: ["L25", "L26", "L27", "L28", "L29", "L30", "L55", "L56", "L57", "L58", "L59", "L60"]
  }
};

// Timeline constants for minute-accurate mode
const DAY_START_MIN = 480;
const DAY_END_MIN = 1170;
const TOTAL_MINUTES = DAY_END_MIN - DAY_START_MIN;
const PIXELS_PER_MINUTE = 1.05;
const GRID_HEIGHT = TOTAL_MINUTES * PIXELS_PER_MINUTE;

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
  courseCredits = {},
  className = "",
  onBlockClick,
  onDownload,
  onReset,
  timetableObj
}) => {
  const [viewMode, setViewMode] = useState<"matrix" | "timeline">("matrix");
  const [activePopover, setActivePopover] = useState<MeetingBlock | null>(null);

  // Group all enrolled course offerings for the summary table
  const enrolledCoursesSummary = useMemo(() => {
    const map: Record<
      string,
      {
        courseCode: string;
        courseTitle: string;
        facultyName: string;
        theorySlots: Set<string>;
        labSlots: Set<string>;
        venues: Set<string>;
        credits: number;
      }
    > = {};

    Object.entries(timeline).forEach(([_, blocks]) => {
      blocks.forEach((b) => {
        const cc = b.course_code;
        if (!map[cc]) {
          const cred =
            courseCredits[cc] ||
            KNOWN_COURSE_CREDITS[cc] ||
            (cc.startsWith("BASTS") ? 1 : 4);

          map[cc] = {
            courseCode: cc,
            courseTitle: courseTitles[cc] || cc,
            facultyName: b.faculty_name || "Faculty",
            theorySlots: new Set(),
            labSlots: new Set(),
            venues: new Set(),
            credits: cred
          };
        }

        if (b.kind === "theory") {
          b.slot_label.split("+").forEach((s) => map[cc].theorySlots.add(s.trim()));
        } else {
          b.slot_label.split("+").forEach((s) => map[cc].labSlots.add(s.trim()));
        }
        if (b.venue) map[cc].venues.add(b.venue);
      });
    });

    return Object.values(map).map((c) => {
      const parts: string[] = [];
      if (c.theorySlots.size > 0) parts.push(Array.from(c.theorySlots).join("+"));
      if (c.labSlots.size > 0) parts.push(Array.from(c.labSlots).join("+"));
      return {
        courseCode: c.courseCode,
        courseTitle: c.courseTitle,
        facultyName: c.facultyName,
        slotString: parts.join(" / ") || "TBA",
        venue: Array.from(c.venues).join(", ") || "TBA",
        credits: c.credits
      };
    });
  }, [timeline, courseTitles, courseCredits]);

  const totalRegisteredCredits = useMemo(() => {
    return enrolledCoursesSummary.reduce((sum, item) => sum + item.credits, 0);
  }, [enrolledCoursesSummary]);

  // Helper to find if a slot matrix cell is occupied
  const getCellOccupancy = (day: string, period: MatrixPeriod) => {
    const dayMeetings = timeline[day] || [];
    const dayMatrix = DAY_SLOT_MATRIX[day];
    if (!dayMatrix) return null;

    const thSlot = dayMatrix.theory[period.periodIdx];
    const lbSlot = dayMatrix.lab[period.periodIdx];

    for (const m of dayMeetings) {
      // Robust detection: check meeting kind or slot label prefix
      const isLab = m.kind === "lab" || m.slot_label.toUpperCase().includes("L");

      if (isLab && lbSlot) {
        const labels = m.slot_label.toUpperCase().split(/[+,/&\s]+/).filter(Boolean);
        if (labels.includes(lbSlot.toUpperCase())) {
          return { meeting: m, label: lbSlot, kind: "lab" as const };
        }
        // Minute-accurate interval overlap fallback:
        if (m.start_min < period.labEndMin && period.labStartMin < m.end_min) {
          return { meeting: m, label: lbSlot, kind: "lab" as const };
        }
      } else if (!isLab && thSlot) {
        const labels = m.slot_label.toUpperCase().split(/[+,/&\s]+/).filter(Boolean);
        if (labels.includes(thSlot.toUpperCase())) {
          return { meeting: m, label: thSlot, kind: "theory" as const };
        }
        // Minute-accurate interval overlap fallback:
        if (m.start_min < period.theoryEndMin && period.theoryStartMin < m.end_min) {
          return { meeting: m, label: thSlot, kind: "theory" as const };
        }
      }
    }
    return null;
  };

  const handleCellClick = (block: MeetingBlock) => {
    if (onBlockClick) onBlockClick(block);
    setActivePopover(block);
  };

  return (
    <div className={`timetable-container bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl ${className}`}>
      {/* 1. Header & Actions Bar */}
      <div className="p-4 sm:p-5 bg-slate-850/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          {title && <h3 className="font-bold text-slate-100 text-lg sm:text-xl tracking-tight">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>}
        </div>

        {/* 3 Core Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download Timetable (Green) */}
          <button
            type="button"
            onClick={() => {
              if (onDownload) {
                onDownload();
              } else if (timetableObj) {
                downloadTimetableExport(timetableObj, "png");
              } else {
                window.print();
              }
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-emerald-600/30 transition-all active:scale-95"
            title="Download Timetable as High-Resolution PNG / PDF"
          >
            <Download className="w-4 h-4" />
            <span>Download Timetable</span>
          </button>

          {/* Toggle View / Quick Visualization (Amber/Yellow) */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "matrix" ? "timeline" : "matrix")}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-amber-500/30 transition-all active:scale-95"
            title="Toggle between VIT Slot Matrix View and Continuous Minute-based Timeline View"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>{viewMode === "matrix" ? "Enable Quick Visualization" : "Switch to Slot Matrix"}</span>
          </button>

          {/* Reset Table (Red) */}
          <button
            type="button"
            onClick={() => {
              if (onReset) {
                onReset();
              } else {
                window.location.reload();
              }
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-rose-600/30 transition-all active:scale-95"
            title="Reset Timetable & Selections"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Table</span>
          </button>
        </div>
      </div>

      {/* 2. Main Content Area */}
      {viewMode === "matrix" ? (
        /* ======================== MODE A: VIT SLOT MATRIX ======================== */
        <div className="p-4 sm:p-6 space-y-6">
          <div className="overflow-x-auto rounded-xl border border-slate-700/80 shadow-inner bg-slate-950">
            <table className="w-full border-collapse text-center select-none min-w-[1100px]">
              <thead>
                {/* Header Row 1: Theory Hours */}
                <tr className="bg-slate-900 border-b border-slate-700 text-slate-200">
                  <th className="py-2.5 px-3 text-[11px] font-extrabold uppercase tracking-wider border-r border-slate-700 bg-slate-850 w-24">
                    THEORY HOURS
                  </th>
                  {MORNING_PERIODS.map((p) => (
                    <th key={`th-m-${p.periodIdx}`} className="py-2 px-1 text-[10px] font-semibold border-r border-slate-700/80 text-slate-300">
                      <div>{p.theoryTime}</div>
                    </th>
                  ))}
                  {/* Lunch Theory Header */}
                  <th className="py-2 px-1 text-[10px] font-extrabold text-amber-400 border-r border-slate-700/80 bg-slate-900/90 w-20">
                    <div>01:25 PM to 02:00 PM</div>
                  </th>
                  {AFTERNOON_PERIODS.map((p) => (
                    <th key={`th-a-${p.periodIdx}`} className="py-2 px-1 text-[10px] font-semibold border-r border-slate-700/80 text-slate-300 last:border-r-0">
                      <div>{p.theoryTime}</div>
                    </th>
                  ))}
                </tr>

                {/* Header Row 2: Lab Hours */}
                <tr className="bg-slate-900/90 border-b-2 border-slate-700 text-slate-300">
                  <th className="py-2.5 px-3 text-[11px] font-extrabold uppercase tracking-wider border-r border-slate-700 bg-slate-850">
                    LAB HOURS
                  </th>
                  {MORNING_PERIODS.map((p) => (
                    <th key={`lb-m-${p.periodIdx}`} className="py-2 px-1 text-[10px] font-semibold border-r border-slate-700/80 text-slate-400">
                      <div>{p.labTime}</div>
                    </th>
                  ))}
                  {/* Lunch Lab Header */}
                  <th className="py-2 px-1 text-[10px] font-extrabold text-amber-400 border-r border-slate-700/80 bg-slate-900/90">
                    <div>01:20 PM to 02:00 PM</div>
                  </th>
                  {AFTERNOON_PERIODS.map((p) => (
                    <th key={`lb-a-${p.periodIdx}`} className="py-2 px-1 text-[10px] font-semibold border-r border-slate-700/80 text-slate-400 last:border-r-0">
                      <div>{p.labTime}</div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {WEEKDAYS.map((day, dIdx) => {
                  const dayMatrix = DAY_SLOT_MATRIX[day];
                  return (
                    <tr key={day} className="border-b border-slate-800 hover:bg-slate-900/30 transition-colors">
                      {/* Day Label Cell */}
                      <td className="py-3 px-3 font-extrabold text-xs text-slate-100 bg-slate-850 border-r border-slate-700">
                        {day}
                      </td>

                      {/* 6 Morning Period Cells */}
                      {MORNING_PERIODS.map((p) => {
                        const occ = getCellOccupancy(day, p);
                        const thDef = dayMatrix.theory[p.periodIdx];
                        const lbDef = dayMatrix.lab[p.periodIdx];

                        if (occ) {
                          return (
                            <td
                              key={`cell-${day}-${p.periodIdx}`}
                              onClick={() => handleCellClick(occ.meeting)}
                              className="p-1.5 border-r border-slate-700/80 bg-[#c6f052] dark:bg-[#b0e82c] text-slate-950 font-bold cursor-pointer hover:brightness-105 active:scale-98 transition shadow-xs"
                              title={`${occ.meeting.course_code} (${occ.meeting.faculty_name}) • Slot ${occ.label}`}
                            >
                              <div className="text-[10px] font-bold tracking-tight text-slate-800 leading-none">
                                {occ.label}
                              </div>
                              <div className="text-[12px] font-black text-black tracking-tight uppercase leading-tight mt-1">
                                {occ.meeting.course_code}
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={`cell-${day}-${p.periodIdx}`} className="p-2 border-r border-slate-800 text-slate-500 text-[11px] font-mono bg-slate-950/40">
                            <div>{thDef || "-"} / {lbDef}</div>
                          </td>
                        );
                      })}

                      {/* LUNCH Column Cell */}
                      {dIdx === 0 ? (
                        <td
                          rowSpan={5}
                          data-testid="lunch-column"
                          className="bg-slate-900 border-r border-slate-700 text-amber-400 font-black text-xs tracking-widest text-center select-none py-4 px-2 shadow-inner align-middle"
                          style={{ writingMode: "vertical-rl", textOrientation: "upright" }}
                        >
                          LUNCH
                        </td>
                      ) : null}

                      {/* 6 Afternoon Period Cells */}
                      {AFTERNOON_PERIODS.map((p) => {
                        const occ = getCellOccupancy(day, p);
                        const thDef = dayMatrix.theory[p.periodIdx];
                        const lbDef = dayMatrix.lab[p.periodIdx];

                        if (occ) {
                          return (
                            <td
                              key={`cell-${day}-${p.periodIdx}`}
                              onClick={() => handleCellClick(occ.meeting)}
                              className="p-1.5 border-r border-slate-700/80 last:border-r-0 bg-[#c6f052] dark:bg-[#b0e82c] text-slate-950 font-bold cursor-pointer hover:brightness-105 active:scale-98 transition shadow-xs"
                              title={`${occ.meeting.course_code} (${occ.meeting.faculty_name}) • Slot ${occ.label}`}
                            >
                              <div className="text-[10px] font-bold tracking-tight text-slate-800 leading-none">
                                {occ.label}
                              </div>
                              <div className="text-[12px] font-black text-black tracking-tight uppercase leading-tight mt-1">
                                {occ.meeting.course_code}
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={`cell-${day}-${p.periodIdx}`} className="p-2 border-r border-slate-800 last:border-r-0 text-slate-500 text-[11px] font-mono bg-slate-950/40">
                            <div>{thDef || "-"} / {lbDef}</div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Enrolled Course Details Summary Table */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
            <div className="px-5 py-3.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Enrolled Courses Summary
              </h4>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-mono">
                {enrolledCoursesSummary.length} Courses Registered
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Slot</th>
                    <th className="py-3 px-4">Course Code</th>
                    <th className="py-3 px-4">Course Title</th>
                    <th className="py-3 px-4">Faculty</th>
                    <th className="py-3 px-4">Venue</th>
                    <th className="py-3 px-4 text-right">Credits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {enrolledCoursesSummary.map((item) => (
                    <tr key={item.courseCode} className="hover:bg-slate-900/50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-300">
                        <span className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800/60">
                          {item.slotString}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-100">{item.courseCode}</td>
                      <td className="py-3 px-4 font-medium text-slate-200">{item.courseTitle}</td>
                      <td className="py-3 px-4 text-slate-300">{item.facultyName}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{item.venue}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">{item.credits}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900/80 border-t-2 border-slate-700 text-xs font-bold text-slate-100">
                  <tr>
                    <td colSpan={5} className="py-3.5 px-4 text-right uppercase tracking-wider text-slate-300">
                      Total Registered Credits:
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-400 text-sm">
                      {totalRegisteredCredits}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ======================== MODE B: MINUTE-ACCURATE TIMELINE ======================== */
        <div className="overflow-x-auto relative p-4">
          <div className="min-w-[760px] select-none" style={{ height: GRID_HEIGHT + 48 }}>
            {/* Day Headers row */}
            <div className="grid grid-cols-[68px_repeat(5,1fr)] bg-slate-800/90 border-b border-slate-700 text-xs font-semibold text-slate-300 sticky top-0 z-20 shadow-sm">
              <div className="py-2.5 px-2 text-center text-slate-400 border-r border-slate-700/80">Time</div>
              {WEEKDAYS.map((day) => {
                const count = (timeline[day] || []).length;
                return (
                  <div key={day} className="py-2.5 px-3 text-center border-r border-slate-700/80 last:border-r-0 flex items-center justify-center gap-1.5">
                    <span className="font-bold text-slate-100">{day}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({count})</span>
                  </div>
                );
              })}
            </div>

            {/* Timetable Body Grid */}
            <div className="grid grid-cols-[68px_repeat(5,1fr)] relative" style={{ height: GRID_HEIGHT }}>
              {/* Time Axis Column */}
              <div className="relative border-r border-slate-700/80 bg-slate-900/50">
                {TIME_TICKS.map((t, idx) => {
                  const top = (t.min - DAY_START_MIN) * PIXELS_PER_MINUTE;
                  return (
                    <div
                      key={idx}
                      className="absolute right-2 -translate-y-1/2 text-[11px] font-mono text-slate-400 flex items-center gap-1"
                      style={{ top }}
                    >
                      <span>{t.label}</span>
                      {t.isLunch && <span className="text-[9px] text-amber-400 font-bold">L</span>}
                    </div>
                  );
                })}
              </div>

              {/* Day Columns */}
              {WEEKDAYS.map((day) => {
                const blocks = timeline[day] || [];
                return (
                  <div key={day} className="relative border-r border-slate-800 last:border-r-0 bg-slate-950/20">
                    {/* Lunch Break band (13:20 to 14:00) */}
                    <div
                      className="absolute inset-x-0 bg-amber-500/10 border-y border-amber-500/30 flex items-center justify-center pointer-events-none z-0"
                      style={{
                        top: (800 - DAY_START_MIN) * PIXELS_PER_MINUTE,
                        height: (840 - 800) * PIXELS_PER_MINUTE
                      }}
                    >
                      <span className="text-[10px] font-semibold text-amber-300/80 tracking-widest uppercase">
                        Lunch
                      </span>
                    </div>

                    {/* Class Blocks */}
                    {blocks.map((block, bIdx) => {
                      const top = (block.start_min - DAY_START_MIN) * PIXELS_PER_MINUTE;
                      const height = (block.end_min - block.start_min) * PIXELS_PER_MINUTE;
                      const colors = getCoursePalette(block.course_code);

                      return (
                        <div
                          key={bIdx}
                          onClick={() => handleCellClick(block)}
                          tabIndex={0}
                          role="button"
                          aria-label={`${block.course_code} ${block.slot_label}`}
                          className={`absolute inset-x-1.5 rounded-lg border p-1.5 transition-all shadow-md cursor-pointer hover:z-20 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                            block.kind === "lab" ? "border-dashed" : "border-solid"
                          }`}
                          style={{
                            top: `${top}px`,
                            height: `${Math.max(height - 2, 28)}px`,
                            backgroundColor: colors.hexBg,
                            borderColor: colors.hexBorder,
                            color: colors.hexText
                          }}
                        >
                          <div className="flex items-center justify-between gap-1 leading-none">
                            <span className="font-bold text-xs truncate">{block.course_code}</span>
                            <span className="text-[10px] font-mono px-1 rounded bg-black/25 shrink-0">
                              {block.slot_label}
                            </span>
                          </div>

                          <div className="text-[10px] opacity-90 truncate mt-0.5 flex items-center gap-1">
                            {block.kind === "lab" ? (
                              <FlaskConical className="w-2.5 h-2.5 inline shrink-0" />
                            ) : (
                              <BookOpen className="w-2.5 h-2.5 inline shrink-0" />
                            )}
                            <span className="truncate">{block.faculty_name}</span>
                          </div>

                          {block.venue && height >= 45 && (
                            <div className="text-[9px] opacity-80 truncate mt-0.5 flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{block.venue}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. Interactive Class Details Modal */}
      {activePopover && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => setActivePopover(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={`text-xs font-mono font-semibold px-2 py-0.5 rounded uppercase ${
                    activePopover.kind === "lab" ? "bg-emerald-900 text-emerald-200" : "bg-indigo-900 text-indigo-200"
                  }`}
                >
                  {activePopover.kind.toUpperCase()} SESSION • {activePopover.slot_label}
                </span>
                <h4 className="text-xl font-bold text-slate-100 mt-2">{activePopover.course_code}</h4>
                <p className="text-sm text-slate-400">{courseTitles[activePopover.course_code] || "VIT University Course"}</p>
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
