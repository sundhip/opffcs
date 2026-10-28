import React, { useState, useMemo, useEffect } from "react";
import { MeetingBlock, GeneratedTimetable, AvailableTeacher } from "../../types";
import { getCoursePalette } from "../../utils/colors";
import { useAppStore } from "../../store/useAppStore";
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
  Calendar,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  ArrowUpRight,
  Check
} from "lucide-react";
import { downloadTimetableExport, ExportFormat } from "../../utils/exporter";

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
  onTeacherChange?: (courseCode: string, teacher: AvailableTeacher) => void;
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

// Known course credits and theory/lab split structure
export interface CourseCreditStructure {
  theory: number;
  lab: number;
  total: number;
}

export const COURSE_CREDIT_STRUCTURE: Record<string, CourseCreditStructure> = {
  BASTS102: { theory: 1, lab: 0, total: 1 },
  BAHSM100: { theory: 3, lab: 0, total: 3 },
  ANCILLARY: { theory: 3, lab: 0, total: 3 },
  BAMGT213: { theory: 3, lab: 0, total: 3 },
  BAMGT215: { theory: 3, lab: 0, total: 3 },
  BAMGT217: { theory: 3, lab: 0, total: 3 },
  BAHUM204: { theory: 3, lab: 0, total: 3 },
  BAHUM205: { theory: 3, lab: 0, total: 3 },
  BAHUM203: { theory: 3, lab: 0, total: 3 },
  BAMGT221: { theory: 3, lab: 0, total: 3 },
  BAHUM202: { theory: 3, lab: 0, total: 3 },
  BAMAT205: { theory: 4, lab: 0, total: 4 },
  BACSE204: { theory: 3, lab: 1, total: 4 },
  BACSE205: { theory: 3, lab: 1, total: 4 },
  BACSE324: { theory: 3, lab: 1, total: 4 },
  BACSE339: { theory: 3, lab: 1, total: 4 },
  BACSE345: { theory: 3, lab: 1, total: 4 }
};

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
  timetableObj,
  onTeacherChange
}) => {
  const { facultyList, setSelectedFacultyId, setActiveTab } = useAppStore();
  const [viewMode, setViewMode] = useState<"matrix" | "timeline">("matrix");
  const [activePopover, setActivePopover] = useState<MeetingBlock | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Local state for user-selected teacher per course in this shape
  const [customTeachers, setCustomTeachers] = useState<Record<string, AvailableTeacher>>({});

  const handleDownloadClick = () => {
    if (onDownload) {
      onDownload();
    } else {
      setIsDownloadModalOpen(true);
    }
  };

  const handleFormatExport = async (format: ExportFormat) => {
    if (!timetableObj) return;
    setIsExporting(true);
    try {
      await downloadTimetableExport(timetableObj, format);
      setExportSuccessMsg(`Successfully downloaded ${format.toUpperCase()} file.`);
      setTimeout(() => setExportSuccessMsg(null), 3500);
      setIsDownloadModalOpen(false);
    } catch (err: any) {
      alert(`Export failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Reset custom teacher selections when timetable/shape changes
  useEffect(() => {
    setCustomTeachers({});
  }, [timetableObj?.timetable_id]);

  // Derive active timeline where meeting blocks carry the user's selected teacher
  const activeTimeline = useMemo(() => {
    if (Object.keys(customTeachers).length === 0) return timeline;

    const nextTimeline: Record<string, MeetingBlock[]> = {};
    Object.entries(timeline).forEach(([day, blocks]) => {
      nextTimeline[day] = blocks.map((b) => {
        const ct = customTeachers[b.course_code];
        if (ct) {
          return {
            ...b,
            faculty_name: ct.faculty_name,
            venue: ct.venue || b.venue
          };
        }
        return b;
      });
    });
    return nextTimeline;
  }, [timeline, customTeachers]);

  // Group all enrolled course offerings and split into separate Theory & Lab rows
  const enrolledCoursesSummary = useMemo(() => {
    const courseMap: Record<
      string,
      {
        theory: {
          slots: Set<string>;
          faculty: string;
          venues: Set<string>;
        } | null;
        lab: {
          slots: Set<string>;
          faculty: string;
          venues: Set<string>;
        } | null;
      }
    > = {};

    Object.entries(activeTimeline).forEach(([_, blocks]) => {
      blocks.forEach((b) => {
        const cc = b.course_code;
        if (!courseMap[cc]) {
          courseMap[cc] = { theory: null, lab: null };
        }
        const isLab = b.kind === "lab" || b.slot_label.trim().toUpperCase().startsWith("L");
        if (isLab) {
          if (!courseMap[cc].lab) {
            courseMap[cc].lab = {
              slots: new Set(),
              faculty: b.faculty_name || "Faculty",
              venues: new Set()
            };
          }
          b.slot_label.split("+").forEach((s) => courseMap[cc].lab!.slots.add(s.trim()));
          if (b.venue) courseMap[cc].lab!.venues.add(b.venue);
        } else {
          if (!courseMap[cc].theory) {
            courseMap[cc].theory = {
              slots: new Set(),
              faculty: b.faculty_name || "Faculty",
              venues: new Set()
            };
          }
          b.slot_label.split("+").forEach((s) => courseMap[cc].theory!.slots.add(s.trim()));
          if (b.venue) courseMap[cc].theory!.venues.add(b.venue);
        }
      });
    });

    const rows: {
      id: string;
      courseCode: string;
      courseTitle: string;
      facultyName: string;
      slotString: string;
      venue: string;
      credits: number;
      kind: "theory" | "lab";
    }[] = [];

    Object.keys(courseMap).sort().forEach((cc) => {
      const data = courseMap[cc];
      const struct = COURSE_CREDIT_STRUCTURE[cc] || {
        theory: (courseCredits[cc] && courseCredits[cc] <= 3) ? courseCredits[cc] : (cc.startsWith("BASTS") ? 1 : 3),
        lab: 1,
        total: courseCredits[cc] || 4
      };
      const title = courseTitles[cc] || cc;

      // 1. Lab row (matching reference layout)
      if (data.lab && data.lab.slots.size > 0) {
        rows.push({
          id: `${cc}-lab`,
          courseCode: cc,
          courseTitle: title,
          facultyName: data.lab.faculty,
          slotString: Array.from(data.lab.slots).join("+"),
          venue: Array.from(data.lab.venues).join(", ") || "TBA",
          credits: struct.lab,
          kind: "lab"
        });
      }

      // 2. Theory row
      if (data.theory && data.theory.slots.size > 0) {
        rows.push({
          id: `${cc}-theory`,
          courseCode: cc,
          courseTitle: title,
          facultyName: data.theory.faculty,
          slotString: Array.from(data.theory.slots).join("+"),
          venue: Array.from(data.theory.venues).join(", ") || "TBA",
          credits: struct.theory,
          kind: "theory"
        });
      }
    });

    return rows;
  }, [activeTimeline, courseTitles, courseCredits]);

  const totalRegisteredCredits = useMemo(() => {
    return enrolledCoursesSummary.reduce((sum, item) => sum + item.credits, 0);
  }, [enrolledCoursesSummary]);

  // Helper to find if a slot matrix cell is occupied
  const getCellOccupancy = (day: string, period: MatrixPeriod) => {
    const dayMeetings = activeTimeline[day] || [];
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
    <div className={`timetable-container bg-[#000000] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl ${className}`}>
      {/* Toast Alert */}
      {exportSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-700/80 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{exportSuccessMsg}</span>
        </div>
      )}

      {/* 1. Header & Actions Bar */}
      <div className="p-4 sm:p-5 bg-[#09090c] border-b border-neutral-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          {title && <h3 className="font-bold text-neutral-100 text-lg sm:text-xl tracking-tight">{title}</h3>}
          {subtitle && <p className="text-xs text-neutral-400 mt-1 font-medium">{subtitle}</p>}
        </div>

        {/* 3 Core Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download Timetable (Green) */}
          <button
            type="button"
            onClick={handleDownloadClick}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-emerald-600/30 transition-all active:scale-95"
            title="Download Timetable as Excel, PDF, PNG, CSV, or ZIP"
          >
            <Download className="w-4 h-4" />
            <span>Download Timetable</span>
          </button>

          {/* Toggle View / Quick Visualization (Amber/Yellow) */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "matrix" ? "timeline" : "matrix")}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-amber-500/30 transition-all active:scale-95"
            title="Toggle between VIT Slot Matrix View and Continuous Minute-based Timeline View"
          >
            <Sparkles className="w-4 h-4 text-neutral-950" />
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
          <div className="overflow-x-auto rounded-xl border border-neutral-800 shadow-inner bg-[#07070a]">
            <table className="w-full border-collapse text-center select-none min-w-[1200px]">
              <thead>
                {/* Header Row 1: Theory Hours */}
                <tr className="bg-[#0e0e13] border-b border-neutral-800 text-neutral-200">
                  <th className="sticky left-0 z-30 bg-[#121218] border-r-2 border-neutral-700 w-24 min-w-[90px] py-2.5 px-3 text-[11px] font-black uppercase tracking-wider text-neutral-200 shadow-md">
                    THEORY HOURS
                  </th>
                  {MORNING_PERIODS.map((p) => (
                    <th key={`th-m-${p.periodIdx}`} className="py-2 px-1 text-[10px] font-semibold border-r border-neutral-800 text-neutral-300 min-w-[95px] bg-[#0e0e13]">
                      <div>{p.theoryTime}</div>
                    </th>
                  ))}
                  {/* Lunch Theory Header */}
                  <th className="py-2 px-1 text-[10px] font-extrabold text-amber-400 border-r border-neutral-800 bg-[#14141c] min-w-[95px]">
                    <div>01:25 PM to 02:00 PM</div>
                  </th>
                  {AFTERNOON_PERIODS.map((p) => (
                    <th key={`th-a-${p.periodIdx}`} className="py-2 px-1 text-[10px] font-semibold border-r border-neutral-800 text-neutral-300 min-w-[95px] bg-[#0e0e13] last:border-r-0">
                      <div>{p.theoryTime}</div>
                    </th>
                  ))}
                </tr>

                {/* Header Row 2: Lab Hours */}
                <tr className="bg-[#0b0b10] border-b border-neutral-700/80 text-neutral-400">
                  <th className="sticky left-0 z-30 bg-[#121218] border-r-2 border-neutral-700 w-24 min-w-[90px] py-2 px-3 text-[11px] font-black uppercase tracking-wider text-neutral-300 shadow-md">
                    LAB HOURS
                  </th>
                  {MORNING_PERIODS.map((p) => (
                    <th key={`lb-m-${p.periodIdx}`} className="py-2 px-1 text-[10px] font-semibold border-r border-neutral-800 text-neutral-400 min-w-[95px] bg-[#0b0b10]">
                      <div>{p.labTime}</div>
                    </th>
                  ))}
                  {/* Lunch Lab Header */}
                  <th className="py-2 px-1 text-[10px] font-extrabold text-amber-400 border-r border-neutral-800 bg-[#14141c] min-w-[95px]">
                    <div>01:20 PM to 02:00 PM</div>
                  </th>
                  {AFTERNOON_PERIODS.map((p) => (
                    <th key={`lb-a-${p.periodIdx}`} className="py-2 px-1 text-[10px] font-semibold border-r border-neutral-800 text-neutral-400 min-w-[95px] bg-[#0b0b10] last:border-r-0">
                      <div>{p.labTime}</div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {WEEKDAYS.map((day, dIdx) => {
                  const dayMatrix = DAY_SLOT_MATRIX[day];
                  return (
                    <tr key={day} className="border-b border-neutral-800/80 hover:bg-neutral-900/30 transition-colors">
                      {/* Day Label Cell - STICKY LEFT */}
                      <td className="sticky left-0 z-20 bg-[#101015] border-r-2 border-neutral-700 py-3 px-3 font-black text-xs text-neutral-100 text-center select-none shadow-md w-24 min-w-[90px]">
                        {day}
                      </td>

                      {/* 6 Morning Period Cells */}
                      {MORNING_PERIODS.map((p) => {
                        const occ = getCellOccupancy(day, p);
                        const thDef = dayMatrix.theory[p.periodIdx];
                        const lbDef = dayMatrix.lab[p.periodIdx];

                        if (occ) {
                          const palette = getCoursePalette(occ.meeting.course_code);
                          const isLab = occ.kind === "lab";
                          return (
                            <td
                              key={`cell-${day}-${p.periodIdx}`}
                              onClick={() => handleCellClick(occ.meeting)}
                              className="p-1.5 border-r border-neutral-800/80 cursor-pointer hover:brightness-115 active:scale-98 transition shadow-xs align-top relative group"
                              style={{
                                backgroundColor: palette.hexBg,
                                borderColor: palette.hexBorder,
                                color: palette.hexText
                              }}
                              title={`${occ.meeting.course_code} (${occ.meeting.faculty_name}) • Slot ${occ.label}`}
                            >
                              <div className="flex items-center justify-between gap-1 leading-none mb-1">
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-black/45 tracking-wider">
                                  {occ.label}
                                </span>
                                <span className="text-[9px] font-black px-1 py-0.2 rounded bg-black/35 uppercase">
                                  {isLab ? "LAB" : "TH"}
                                </span>
                              </div>
                              <div className="text-[11px] font-black tracking-tight uppercase leading-tight font-sans">
                                {occ.meeting.course_code}
                              </div>
                              <div className="text-[9px] font-medium opacity-85 truncate mt-0.5 leading-tight">
                                {occ.meeting.faculty_name}
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={`cell-${day}-${p.periodIdx}`} className="p-2 border-r border-neutral-800/60 text-neutral-500 text-[10px] font-mono bg-[#07070a]">
                            <div>{thDef || "-"} / {lbDef}</div>
                          </td>
                        );
                      })}

                      {/* LUNCH Column Cell */}
                      {dIdx === 0 ? (
                        <td
                          rowSpan={5}
                          data-testid="lunch-column"
                          className="bg-[#0e0e14] border-r border-neutral-800 text-amber-400 font-black text-xs tracking-widest text-center select-none py-4 px-2 shadow-inner align-middle"
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
                          const palette = getCoursePalette(occ.meeting.course_code);
                          const isLab = occ.kind === "lab";
                          return (
                            <td
                              key={`cell-${day}-${p.periodIdx}`}
                              onClick={() => handleCellClick(occ.meeting)}
                              className="p-1.5 border-r border-neutral-800/80 last:border-r-0 cursor-pointer hover:brightness-115 active:scale-98 transition shadow-xs align-top relative group"
                              style={{
                                backgroundColor: palette.hexBg,
                                borderColor: palette.hexBorder,
                                color: palette.hexText
                              }}
                              title={`${occ.meeting.course_code} (${occ.meeting.faculty_name}) • Slot ${occ.label}`}
                            >
                              <div className="flex items-center justify-between gap-1 leading-none mb-1">
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-black/45 tracking-wider">
                                  {occ.label}
                                </span>
                                <span className="text-[9px] font-black px-1 py-0.2 rounded bg-black/35 uppercase">
                                  {isLab ? "LAB" : "TH"}
                                </span>
                              </div>
                              <div className="text-[11px] font-black tracking-tight uppercase leading-tight font-sans">
                                {occ.meeting.course_code}
                              </div>
                              <div className="text-[9px] font-medium opacity-85 truncate mt-0.5 leading-tight">
                                {occ.meeting.faculty_name}
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={`cell-${day}-${p.periodIdx}`} className="p-2 border-r border-neutral-800/60 last:border-r-0 text-neutral-500 text-[10px] font-mono bg-[#07070a]">
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
          <div className="bg-[#08080b] rounded-xl border border-neutral-800 overflow-hidden shadow-xl mt-6">
            <div className="px-5 py-3.5 bg-[#0e0e14] border-b border-neutral-800 flex items-center justify-between">
              <h4 className="font-bold text-sm text-neutral-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Enrolled Courses Summary
              </h4>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-900 text-neutral-300 border border-neutral-700 font-mono">
                {enrolledCoursesSummary.length} Courses Registered
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-200">
                <thead className="bg-[#0b0b10] border-b border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Slot</th>
                    <th className="py-3 px-4">Course Code</th>
                    <th className="py-3 px-4">Course Title</th>
                    <th className="py-3 px-4">Faculty</th>
                    <th className="py-3 px-4">Venue</th>
                    <th className="py-3 px-4 text-right">Credits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80">
                  {enrolledCoursesSummary.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-900/40 transition">
                      <td className="py-3 px-4 font-mono font-bold">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded border text-xs ${
                              item.kind === "lab"
                                ? "bg-emerald-950/80 border-emerald-800/60 text-emerald-300"
                                : "bg-indigo-950/80 border-indigo-800/60 text-indigo-300"
                            }`}
                          >
                            {item.slotString}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded uppercase ${
                              item.kind === "lab"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            }`}
                          >
                            {item.kind}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-neutral-100">{item.courseCode}</td>
                      <td className="py-3 px-4 font-medium text-neutral-200">{item.courseTitle}</td>
                      <td className="py-3 px-4 text-neutral-300">
                        {(() => {
                          const courseOpt = timetableObj?.course_options?.find(
                            (o) => o.course_code.toUpperCase() === item.courseCode.toUpperCase()
                          );
                          const avail = courseOpt?.available_teachers || [];
                          const selectedTeacher =
                            customTeachers[item.courseCode] ||
                            avail.find((t) => t.faculty_name === item.facultyName) ||
                            avail[0];
                          const effectiveFacultyName = selectedTeacher?.faculty_name || item.facultyName;
                          const facMatch = facultyList.find(
                            (f) => f.canonical_name?.toUpperCase() === effectiveFacultyName?.toUpperCase()
                          );

                          return (
                            <div className="flex flex-wrap items-center gap-2">
                              {avail.length > 1 ? (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={selectedTeacher?.offering_id || ""}
                                    onChange={(e) => {
                                      const t = avail.find((opt) => opt.offering_id === e.target.value);
                                      if (t) {
                                        setCustomTeachers((prev) => ({ ...prev, [item.courseCode]: t }));
                                        if (onTeacherChange) onTeacherChange(item.courseCode, t);
                                      }
                                    }}
                                    className="bg-neutral-900 border border-neutral-700 hover:border-amber-400 text-neutral-100 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer shadow-sm transition max-w-[220px]"
                                    title={`Choose teacher for ${item.courseCode} in this timetable shape`}
                                  >
                                    {avail.map((t) => (
                                      <option key={t.offering_id} value={t.offering_id}>
                                        {t.faculty_name} {t.rating_mean != null ? `(${t.rating_mean.toFixed(1)} ★)` : "(Unrated)"}
                                      </option>
                                    ))}
                                  </select>
                                  <span className="text-[10px] text-amber-400 font-bold bg-amber-950/70 border border-amber-800/60 px-1.5 py-0.5 rounded whitespace-nowrap">
                                    {avail.length} options
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span>{effectiveFacultyName}</span>
                                  {selectedTeacher?.rating_mean != null && (
                                    <span className="text-[10px] text-amber-400 font-semibold font-mono">
                                      ({selectedTeacher.rating_mean.toFixed(1)} ★)
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Direct Reviews link */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (facMatch) {
                                    setSelectedFacultyId(facMatch.id);
                                  }
                                  setActiveTab("faculty");
                                }}
                                className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-bold font-mono transition flex items-center gap-1"
                                title={`View student reviews and feedback for ${effectiveFacultyName}`}
                              >
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                <span>Reviews</span>
                              </button>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-400">
                        {customTeachers[item.courseCode]?.venue || item.venue || "TBA"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-neutral-100">{item.credits}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#0b0b10] border-t-2 border-neutral-800 text-xs font-bold text-neutral-100">
                  <tr>
                    <td colSpan={5} className="py-3.5 px-4 text-right uppercase tracking-wider text-neutral-300">
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
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setActivePopover(null)}
        >
          <div
            className="bg-[#0c0c10] border border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={`text-xs font-mono font-semibold px-2 py-0.5 rounded uppercase ${
                    activePopover.kind === "lab" ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60" : "bg-indigo-950 text-indigo-300 border border-indigo-800/60"
                  }`}
                >
                  {activePopover.kind.toUpperCase()} SESSION • {activePopover.slot_label}
                </span>
                <h4 className="text-xl font-bold text-neutral-100 mt-2">{activePopover.course_code}</h4>
                <p className="text-sm text-neutral-400">{courseTitles[activePopover.course_code] || "VIT University Course"}</p>
              </div>
              <button
                onClick={() => setActivePopover(null)}
                className="text-neutral-400 hover:text-neutral-200 p-1 text-lg font-bold"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-3 border-t border-neutral-800 pt-4 text-sm text-neutral-300">
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

            {/* Direct reviews button in popover */}
            {activePopover.faculty_name && (
              <div className="mt-4 pt-3 border-t border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => {
                    const fac = facultyList.find(
                      (f) => f.canonical_name?.toUpperCase() === activePopover.faculty_name?.toUpperCase()
                    );
                    if (fac) setSelectedFacultyId(fac.id);
                    setActiveTab("faculty");
                    setActivePopover(null);
                  }}
                  className="w-full py-2.5 px-4 bg-[#141419] hover:bg-[#1a1a22] border border-neutral-700 rounded-xl text-xs font-bold text-amber-300 flex items-center justify-center gap-2 transition"
                >
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>View Student Reviews for {activePopover.faculty_name}</span>
                </button>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setActivePopover(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-sm font-semibold transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Built-in Format Selection Download Modal (Fallback) */}
      {isDownloadModalOpen && timetableObj && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setIsDownloadModalOpen(false)}
        >
          <div
            className="bg-[#0c0c10] border border-neutral-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
              <div>
                <h4 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                  <Download className="w-5 h-5 text-emerald-400" />
                  Download Timetable
                </h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Select your preferred high-resolution format for download.
                </p>
              </div>
              <button
                onClick={() => setIsDownloadModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {isExporting ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm font-semibold text-neutral-200">Generating High-Resolution Export...</p>
                <p className="text-xs text-neutral-400">Rendering slots, courses, and metrics without clipped text.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <button
                  onClick={() => handleFormatExport("excel")}
                  className="w-full p-3.5 bg-[#141419] hover:bg-[#1a1a22] border border-neutral-800 hover:border-emerald-500/50 rounded-2xl flex items-center justify-between text-left transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-neutral-100 block">Excel Spreadsheet (.xlsx)</span>
                      <span className="text-[11px] text-neutral-400">
                        3 sheets: Formatted period grid with colors, registered courses, and free-time metrics
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400 transition" />
                </button>

                <button
                  onClick={() => handleFormatExport("pdf")}
                  className="w-full p-3.5 bg-[#141419] hover:bg-[#1a1a22] border border-neutral-800 hover:border-rose-500/50 rounded-2xl flex items-center justify-between text-left transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-neutral-100 block">PDF Document (.pdf)</span>
                      <span className="text-[11px] text-neutral-400">
                        Landscape A4 print-ready vector document with zero clipped text
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-rose-400 transition" />
                </button>

                <button
                  onClick={() => handleFormatExport("png")}
                  className="w-full p-3.5 bg-[#141419] hover:bg-[#1a1a22] border border-neutral-800 hover:border-amber-500/50 rounded-2xl flex items-center justify-between text-left transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-neutral-100 block">PNG Image (.png)</span>
                      <span className="text-[11px] text-neutral-400">
                        2x scale high-resolution image for phone wallpaper or quick reference
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 transition" />
                </button>

                <button
                  onClick={() => handleFormatExport("csv")}
                  className="w-full p-3.5 bg-[#141419] hover:bg-[#1a1a22] border border-neutral-800 hover:border-cyan-500/50 rounded-2xl flex items-center justify-between text-left transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-neutral-100 block">CSV Schedule (.csv)</span>
                      <span className="text-[11px] text-neutral-400">
                        Tabular rows for each lecture and lab meeting with UTF-8 BOM
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-cyan-400 transition" />
                </button>

                <button
                  onClick={() => handleFormatExport("bundle")}
                  className="w-full p-3.5 bg-[#141419] hover:bg-[#1a1a22] border border-neutral-800 hover:border-indigo-500/50 rounded-2xl flex items-center justify-between text-left transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-neutral-100 block">Complete Bundle (.zip)</span>
                      <span className="text-[11px] text-neutral-400">
                        ZIP archive containing Excel, PDF, PNG, CSV, and timetable JSON
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-indigo-400 transition" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
