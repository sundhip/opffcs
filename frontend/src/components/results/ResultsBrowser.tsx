import React, { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { WeeklyTimetable } from "../timetable/WeeklyTimetable";
import { ShapesSidebar } from "./ShapesSidebar";
import { GeneratedTimetable } from "../../types";
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  Sparkles,
  SlidersHorizontal,
  Info,
  Calendar,
  Clock,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Eye,
  GitCompare,
  X,
  Download,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Archive,
  LayoutGrid,
  RotateCcw,
  Sun,
  Sunset,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpRight,
  Zap,
  Check,
  Star
} from "lucide-react";
import { downloadTimetableExport, ExportFormat } from "../../utils/exporter";

export function getGapMinutes(tt: GeneratedTimetable): number {
  return Object.values(tt.gap_minutes_per_day).reduce((s, m) => s + m, 0);
}

export function matchesGapFilter(tt: GeneratedTimetable, filter: string): boolean {
  const total = getGapMinutes(tt);
  if (filter === "ALL") return true;
  if (filter === "ZERO") return total === 0;
  if (filter === "LESS") return total <= 150;
  if (filter === "MEDIUM") return total > 150 && total <= 300;
  if (filter === "WIDE") return total > 300;
  if (filter === "NO_MON_GAP") return (tt.gap_minutes_per_day["MON"] || 0) === 0;
  if (filter === "NO_FRI_GAP") return (tt.gap_minutes_per_day["FRI"] || 0) === 0;
  return true;
}

export function matchesFinishFilter(tt: GeneratedTimetable, filter: string): boolean {
  const latest = tt.latest_end || "19:00";
  if (filter === "ALL") return true;
  if (filter === "VERY_EARLY") return latest <= "14:00";
  if (filter === "EARLY") return latest <= "15:40";
  if (filter === "MID") return latest > "15:40" && latest <= "17:30";
  if (filter === "LATE") return latest > "17:30";
  return true;
}

export function matchesStartFilter(tt: GeneratedTimetable, filter: string): boolean {
  const earliest = tt.earliest_start || "08:00";
  if (filter === "ALL") return true;
  if (filter === "START_8AM") return earliest === "08:00";
  if (filter === "START_LATE") return earliest >= "08:55";
  if (filter === "START_NOON") return earliest >= "11:40";
  if (filter === "START_AFTERNOON") return earliest >= "14:00";
  return true;
}

export function getHalfDaysCount(tt: GeneratedTimetable): number {
  let count = 0;
  for (const day of ["MON", "TUE", "WED", "THU", "FRI"]) {
    const mtgs = tt.per_day_timeline[day] || [];
    if (mtgs.length === 0) continue;
    const isMorningOnly = mtgs.every((m) => m.end_min <= 840);
    const isAfternoonOnly = mtgs.every((m) => m.start_min >= 840);
    if (isMorningOnly || isAfternoonOnly) {
      count++;
    }
  }
  return count;
}

export function matchesHalfDaysFilter(tt: GeneratedTimetable, filter: string): boolean {
  const cnt = getHalfDaysCount(tt);
  if (filter === "ALL") return true;
  if (filter === "FULL_HALF") return cnt >= 4;
  if (filter === "HIGH_HALF") return cnt === 3;
  if (filter === "MOD_HALF") return cnt >= 1 && cnt <= 2;
  if (filter === "NO_HALF") return cnt === 0;
  return true;
}

export function matchesDaysFilter(tt: GeneratedTimetable, filter: string): boolean {
  if (filter === "ALL") return true;
  if (filter === "BALANCED") return tt.max_daily_hours <= 5.0 && tt.working_days.length >= 4;
  if (filter === "LIGHT") return tt.max_daily_hours <= 4.0;
  if (filter === "FOUR_DAY") return tt.free_days && tt.free_days.length > 0;
  if (filter === "MON_OFF") return tt.free_days && tt.free_days.includes("MON");
  if (filter === "FRI_OFF") return tt.free_days && tt.free_days.includes("FRI");
  if (filter === "WED_OFF") return tt.free_days && tt.free_days.includes("WED");
  if (filter === "FIVE_DAY") return tt.working_days.length === 5;
  return true;
}

export function matchesFacultyQualityFilter(tt: GeneratedTimetable, filter: string): boolean {
  if (filter === "ALL") return true;
  if (filter === "TOP_RATED") return (tt.avg_faculty_rating || 0) >= 4.0;
  if (filter === "GOOD_RATED") return (tt.avg_faculty_rating || 0) >= 3.0;
  if (filter === "REVIEWED_ONLY") return tt.unrated_faculty_count === 0;
  return true;
}

export function getGapCategory(tt: GeneratedTimetable): "LESS" | "MEDIUM" | "HIGH" {
  const total = getGapMinutes(tt);
  if (total <= 60) return "LESS";
  if (total <= 120) return "MEDIUM";
  return "HIGH";
}

export function getFinishCategory(tt: GeneratedTimetable): "EARLY" | "MID" | "LATE" {
  const latest = tt.latest_end || "19:00";
  if (latest <= "15:40") return "EARLY";
  if (latest <= "17:30") return "MID";
  return "LATE";
}

export function getHalfDaysCategory(tt: GeneratedTimetable): "HIGH" | "LESS" {
  const cnt = getHalfDaysCount(tt);
  return cnt >= 3 ? "HIGH" : "LESS";
}

export function getDaysCategory(tt: GeneratedTimetable): "FOUR_DAY" | "BALANCED" | "HIGH" {
  if (tt.free_days && tt.free_days.length > 0) return "FOUR_DAY";
  if (tt.max_daily_hours <= 5) return "BALANCED";
  return "HIGH";
}

export function getTimetableShapeBadge(tt: GeneratedTimetable): { label: string; icon: string } {
  if (tt.free_days && tt.free_days.length > 0) {
    return { label: `${tt.free_days[0]} Off`, icon: "🌴" };
  }
  if (tt.longest_gap_minutes <= 60) {
    return { label: "Zero Gaps", icon: "⚡" };
  }
  let morningMeetings = 0;
  let afternoonMeetings = 0;
  Object.values(tt.per_day_timeline).forEach((mtgs) => {
    mtgs.forEach((m) => {
      if (m.end_min <= 840) morningMeetings++;
      else afternoonMeetings++;
    });
  });
  if (morningMeetings > afternoonMeetings * 1.5) {
    return { label: "Morning", icon: "🌅" };
  }
  if (afternoonMeetings >= morningMeetings) {
    return { label: "Afternoon", icon: "🌇" };
  }
  return { label: "Balanced", icon: "⚖️" };
}

export const ResultsBrowser: React.FC = () => {
  const {
    generationResult,
    currentResultIndex,
    setCurrentResultIndex,
    liveFilters,
    setLiveFilters,
    comparedTimetableIds,
    toggleCompareTimetable,
    clearComparedTimetables,
    favourites,
    toggleFavouriteTimetable,
    courses,
    setActiveTab
  } = useAppStore();

  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [saveModalTimetable, setSaveModalTimetable] = useState<GeneratedTimetable | null>(null);
  const [saveName, setSaveName] = useState("");
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [isShapesSidebarVisible, setIsShapesSidebarVisible] = useState(true);

  const courseTitlesMap = useMemo(() => {
    const map: Record<string, string> = {};
    courses.forEach((c) => {
      map[c.code] = c.title;
    });
    return map;
  }, [courses]);

  const courseCreditsMap = useMemo(() => {
    const map: Record<string, number> = {};
    courses.forEach((c) => {
      map[c.code] = c.credits;
    });
    return map;
  }, [courses]);

  // Extract all timetables from result
  const rawTimetables = useMemo(() => {
    return generationResult?.timetables || [];
  }, [generationResult]);

  // Apply Client-Side Live Filters and Sorting
  const filteredTimetables = useMemo(() => {
    let list = [...rawTimetables];

    // 1. Free Gaps filter
    if (liveFilters.gapsFilter && liveFilters.gapsFilter !== "ALL") {
      list = list.filter((tt) => matchesGapFilter(tt, liveFilters.gapsFilter!));
    }

    // 2. Daily Finish Time filter
    if (liveFilters.finishFilter && liveFilters.finishFilter !== "ALL") {
      list = list.filter((tt) => matchesFinishFilter(tt, liveFilters.finishFilter!));
    }

    // 3. Daily Start Time filter
    if (liveFilters.startFilter && liveFilters.startFilter !== "ALL") {
      list = list.filter((tt) => matchesStartFilter(tt, liveFilters.startFilter!));
    }

    // 4. Half Days filter
    if (liveFilters.halfDaysFilter && liveFilters.halfDaysFilter !== "ALL") {
      list = list.filter((tt) => matchesHalfDaysFilter(tt, liveFilters.halfDaysFilter!));
    }

    // 5. Days / Workload filter
    if (liveFilters.daysFilter && liveFilters.daysFilter !== "ALL") {
      list = list.filter((tt) => matchesDaysFilter(tt, liveFilters.daysFilter!));
    }

    // 6. Faculty Quality filter
    if (liveFilters.facultyQualityFilter && liveFilters.facultyQualityFilter !== "ALL") {
      list = list.filter((tt) => matchesFacultyQualityFilter(tt, liveFilters.facultyQualityFilter!));
    }

    // Filter by required free day
    if (liveFilters.requiredFreeDay) {
      list = list.filter((tt) => tt.free_days.includes(liveFilters.requiredFreeDay!));
    }

    // Filter by max gap minutes
    if (liveFilters.maxGapMinutes != null) {
      list = list.filter((tt) => tt.longest_gap_minutes <= liveFilters.maxGapMinutes!);
    }

    // Filter by required faculty name
    if (liveFilters.requiredFaculty) {
      const q = liveFilters.requiredFaculty.toLowerCase();
      list = list.filter((tt) => {
        return Object.values(tt.per_day_timeline).some((dayBlocks) =>
          dayBlocks.some((b) => b.faculty_name.toLowerCase().includes(q))
        );
      });
    }

    // Sort
    if (liveFilters.sortBy === "fewest_gaps") {
      list.sort((a, b) => {
        const gapA = Object.values(a.gap_minutes_per_day).reduce((s, m) => s + m, 0);
        const gapB = Object.values(b.gap_minutes_per_day).reduce((s, m) => s + m, 0);
        return gapA - gapB;
      });
    } else if (liveFilters.sortBy === "most_free_days") {
      list.sort((a, b) => b.free_days.length - a.free_days.length);
    } else if (liveFilters.sortBy === "best_rating") {
      list.sort((a, b) => (b.avg_faculty_rating || 0) - (a.avg_faculty_rating || 0));
    } else if (liveFilters.sortBy === "earliest_finish") {
      list.sort((a, b) => (a.latest_end || "23:59").localeCompare(b.latest_end || "23:59"));
    } else {
      // Default: score descending
      list.sort((a, b) => b.score - a.score);
    }

    return list;
  }, [rawTimetables, liveFilters]);

  // Dynamic filter count calculations
  const filterCounts = useMemo(() => {
    return {
      gaps: {
        ALL: rawTimetables.length,
        ZERO: rawTimetables.filter((t) => matchesGapFilter(t, "ZERO")).length,
        LESS: rawTimetables.filter((t) => matchesGapFilter(t, "LESS")).length,
        MEDIUM: rawTimetables.filter((t) => matchesGapFilter(t, "MEDIUM")).length,
        WIDE: rawTimetables.filter((t) => matchesGapFilter(t, "WIDE")).length,
        NO_MON_GAP: rawTimetables.filter((t) => matchesGapFilter(t, "NO_MON_GAP")).length,
        NO_FRI_GAP: rawTimetables.filter((t) => matchesGapFilter(t, "NO_FRI_GAP")).length
      },
      finish: {
        ALL: rawTimetables.length,
        VERY_EARLY: rawTimetables.filter((t) => matchesFinishFilter(t, "VERY_EARLY")).length,
        EARLY: rawTimetables.filter((t) => matchesFinishFilter(t, "EARLY")).length,
        MID: rawTimetables.filter((t) => matchesFinishFilter(t, "MID")).length,
        LATE: rawTimetables.filter((t) => matchesFinishFilter(t, "LATE")).length
      },
      start: {
        ALL: rawTimetables.length,
        START_8AM: rawTimetables.filter((t) => matchesStartFilter(t, "START_8AM")).length,
        START_LATE: rawTimetables.filter((t) => matchesStartFilter(t, "START_LATE")).length,
        START_NOON: rawTimetables.filter((t) => matchesStartFilter(t, "START_NOON")).length,
        START_AFTERNOON: rawTimetables.filter((t) => matchesStartFilter(t, "START_AFTERNOON")).length
      },
      halfDays: {
        ALL: rawTimetables.length,
        FULL_HALF: rawTimetables.filter((t) => matchesHalfDaysFilter(t, "FULL_HALF")).length,
        HIGH_HALF: rawTimetables.filter((t) => matchesHalfDaysFilter(t, "HIGH_HALF")).length,
        MOD_HALF: rawTimetables.filter((t) => matchesHalfDaysFilter(t, "MOD_HALF")).length,
        NO_HALF: rawTimetables.filter((t) => matchesHalfDaysFilter(t, "NO_HALF")).length
      },
      days: {
        ALL: rawTimetables.length,
        BALANCED: rawTimetables.filter((t) => matchesDaysFilter(t, "BALANCED")).length,
        LIGHT: rawTimetables.filter((t) => matchesDaysFilter(t, "LIGHT")).length,
        FOUR_DAY: rawTimetables.filter((t) => matchesDaysFilter(t, "FOUR_DAY")).length,
        MON_OFF: rawTimetables.filter((t) => matchesDaysFilter(t, "MON_OFF")).length,
        FRI_OFF: rawTimetables.filter((t) => matchesDaysFilter(t, "FRI_OFF")).length,
        WED_OFF: rawTimetables.filter((t) => matchesDaysFilter(t, "WED_OFF")).length,
        FIVE_DAY: rawTimetables.filter((t) => matchesDaysFilter(t, "FIVE_DAY")).length
      },
      faculty: {
        ALL: rawTimetables.length,
        TOP_RATED: rawTimetables.filter((t) => matchesFacultyQualityFilter(t, "TOP_RATED")).length,
        GOOD_RATED: rawTimetables.filter((t) => matchesFacultyQualityFilter(t, "GOOD_RATED")).length,
        REVIEWED_ONLY: rawTimetables.filter((t) => matchesFacultyQualityFilter(t, "REVIEWED_ONLY")).length
      }
    };
  }, [rawTimetables]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (liveFilters.gapsFilter && liveFilters.gapsFilter !== "ALL") count++;
    if (liveFilters.finishFilter && liveFilters.finishFilter !== "ALL") count++;
    if (liveFilters.startFilter && liveFilters.startFilter !== "ALL") count++;
    if (liveFilters.halfDaysFilter && liveFilters.halfDaysFilter !== "ALL") count++;
    if (liveFilters.daysFilter && liveFilters.daysFilter !== "ALL") count++;
    if (liveFilters.facultyQualityFilter && liveFilters.facultyQualityFilter !== "ALL") count++;
    if (liveFilters.requiredFreeDay) count++;
    if (liveFilters.requiredFaculty) count++;
    if (liveFilters.maxGapMinutes != null) count++;
    return count;
  }, [liveFilters]);

  const resetAllFilters = () => {
    setLiveFilters({
      gapsFilter: "ALL",
      finishFilter: "ALL",
      startFilter: "ALL",
      halfDaysFilter: "ALL",
      daysFilter: "ALL",
      facultyQualityFilter: "ALL",
      requiredFreeDay: null,
      requiredFaculty: null,
      maxGapMinutes: null,
      sortBy: "score"
    });
  };

  const safeIndex = filteredTimetables.length > 0 ? Math.min(currentResultIndex, filteredTimetables.length - 1) : 0;
  const currentTimetable: GeneratedTimetable | undefined = filteredTimetables[safeIndex];

  // Arrow key navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowLeft") {
        if (safeIndex > 0) setCurrentResultIndex(safeIndex - 1);
      } else if (e.key === "ArrowRight") {
        if (safeIndex < filteredTimetables.length - 1) {
          setCurrentResultIndex(safeIndex + 1);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [safeIndex, filteredTimetables.length, setCurrentResultIndex]);

  // Check saved status
  const isCurrentSaved = useMemo(() => {
    if (!currentTimetable) return false;
    const key = `tt:${currentTimetable.timetable_id}`;
    return favourites.some((f) => f.offering_key === key);
  }, [currentTimetable, favourites]);

  const handleDownloadFormat = async (format: ExportFormat) => {
    if (!currentTimetable) return;
    setIsExporting(true);
    setExportSuccessMsg(null);
    try {
      await downloadTimetableExport(currentTimetable, format);
      setExportSuccessMsg(`Successfully downloaded ${format.toUpperCase()} file.`);
      setTimeout(() => setExportSuccessMsg(null), 3500);
      setIsDownloadModalOpen(false);
    } catch (err: any) {
      alert(`Export failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsExporting(false);
    }
  };

  // If no generation result yet or 0 results
  if (!generationResult) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="bg-[#09090c] border border-neutral-800/80 rounded-3xl p-12 shadow-2xl">
          <Calendar className="w-16 h-16 text-indigo-400/80 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-neutral-100">No Generated Timetables Yet</h3>
          <p className="text-sm text-neutral-400 mt-2 max-w-md mx-auto">
            Select courses and configure constraints in the Planner, then click "Generate Schedules" to view conflict-free options.
          </p>
          <button
            onClick={() => setActiveTab("planner")}
            className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition"
          >
            Go to Planner
          </button>
        </div>
      </div>
    );
  }

  // If infeasible
  if (filteredTimetables.length === 0 && rawTimetables.length === 0) {
    const exp = generationResult.infeasible_explanation;
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-[#09090c] border border-red-900/60 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 text-red-400 mb-4">
            <AlertCircle className="w-7 h-7" />
            <h3 className="text-xl font-bold text-neutral-100">No Conflict-Free Timetable Found</h3>
          </div>
          <p className="text-sm text-neutral-300 leading-relaxed">
            {exp?.diagnostic_summary || "The combination of selected courses and strict constraints has zero valid configurations."}
          </p>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setActiveTab("planner")}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
            >
              Adjust Constraints in Planner
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Free-time metrics calculation for current timetable
  const totalWeeklyClassMinutes = currentTimetable
    ? Object.values(currentTimetable.per_day_timeline).reduce((sum, blocks) => {
        return sum + blocks.reduce((dSum, b) => dSum + (b.end_min - b.start_min), 0);
      }, 0)
    : 0;

  const totalGapMinutes = currentTimetable
    ? Object.values(currentTimetable.gap_minutes_per_day).reduce((s, m) => s + m, 0)
    : 0;

  return (
    <div className="space-y-6 w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 py-5">
      {/* Toast Notification */}
      {exportSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-700/80 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{exportSuccessMsg}</span>
        </div>
      )}

      {/* 1. Results Navigation & Action Bar */}
      <div className="bg-[#09090c] border border-neutral-800/80 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Left: Index Pager */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#121216] rounded-xl p-1 border border-neutral-800">
            <button
              onClick={() => setCurrentResultIndex(Math.max(0, safeIndex - 1))}
              disabled={safeIndex === 0}
              aria-label="Previous timetable"
              className="p-1.5 rounded-lg text-neutral-300 hover:text-white disabled:opacity-40 disabled:hover:text-neutral-300 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-3 text-xs font-mono font-bold text-neutral-100">
              {filteredTimetables.length > 0 ? safeIndex + 1 : 0} / {filteredTimetables.length}
            </span>
            <button
              onClick={() => setCurrentResultIndex(Math.min(filteredTimetables.length - 1, safeIndex + 1))}
              disabled={safeIndex >= filteredTimetables.length - 1}
              aria-label="Next timetable"
              className="p-1.5 rounded-lg text-neutral-300 hover:text-white disabled:opacity-40 disabled:hover:text-neutral-300 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <span className="text-xs text-neutral-400 hidden sm:inline">
            (of {generationResult.total_valid} total layouts)
          </span>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
              generationResult.is_exhaustive
                ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                : "bg-amber-950 text-amber-300 border-amber-800"
            }`}
          >
            {generationResult.is_exhaustive ? "Exhaustive" : "Partial (Time Cap)"}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Shapes Sidebar Toggle Button */}
          <button
            onClick={() => setIsShapesSidebarVisible(!isShapesSidebarVisible)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              isShapesSidebarVisible
                ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/50"
                : "bg-[#121216] text-neutral-300 border-neutral-800 hover:border-neutral-700"
            }`}
            title="Toggle Shapes preview panel"
          >
            {isShapesSidebarVisible ? (
              <PanelLeftClose className="w-3.5 h-3.5 text-indigo-400" />
            ) : (
              <PanelLeftOpen className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>Shapes List</span>
          </button>

          {/* Saved Timetable Button */}
          <button
            aria-label="Save this timetable"
            onClick={() => {
              if (currentTimetable) {
                setSaveName(`Schedule #${safeIndex + 1} (${currentTimetable.free_days.join(", ") || "5 days"})`);
                setSaveModalTimetable(currentTimetable);
              }
            }}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              isCurrentSaved
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20"
                : "bg-[#121216] text-neutral-300 border-neutral-800 hover:border-neutral-700"
            }`}
          >
            <Archive className={`w-3.5 h-3.5 ${isCurrentSaved ? "text-amber-400 fill-amber-400/30" : "text-neutral-400"}`} />
            <span>{isCurrentSaved ? "Saved" : "Save"}</span>
          </button>

          {/* Compare Button */}
          <button
            onClick={() => {
              if (currentTimetable) toggleCompareTimetable(currentTimetable.timetable_id);
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              currentTimetable && comparedTimetableIds.includes(currentTimetable.timetable_id)
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-[#121216] text-neutral-300 border-neutral-800 hover:border-neutral-700"
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Compare ({comparedTimetableIds.length}/3)</span>
          </button>

          {comparedTimetableIds.length >= 2 && (
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-400 transition"
            >
              View Compare
            </button>
          )}

          {/* Download Options Button */}
          <button
            onClick={() => setIsDownloadModalOpen(true)}
            disabled={!currentTimetable}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition active:scale-95"
            title="Download options: Excel, PDF, CSV, PNG, ZIP"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Timetable</span>
          </button>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="p-2 rounded-xl bg-[#121216] hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition"
            title="Print Timetable"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Comprehensive Multi-Dimensional Filters Bar */}
      <div className="bg-[#09090c] border border-neutral-800/80 rounded-2xl p-4 shadow-xl space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
              Timetable Filters & Layout Controls
            </span>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                {activeFilterCount} Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeFilterCount > 0 && (
              <button
                onClick={resetAllFilters}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold transition"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Filters
              </button>
            )}

            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <span>Sort:</span>
              <select
                value={liveFilters.sortBy}
                onChange={(e) => setLiveFilters({ sortBy: e.target.value as any })}
                className="bg-[#121216] border border-neutral-800 rounded-lg px-2.5 py-1 text-neutral-200 focus:outline-none"
              >
                <option value="score">Overall Score</option>
                <option value="fewest_gaps">Fewest Gaps</option>
                <option value="most_free_days">Most Free Days</option>
                <option value="best_rating">Best Faculty Rating</option>
                <option value="earliest_finish">Earliest Daily Finish</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 text-xs">
          {/* A. Free Gaps Filter */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1">
              <Coffee className="w-3 h-3 text-amber-400" />
              Free Gaps:
            </span>
            <div className="flex flex-wrap gap-1">
              {[
                { id: "ALL" as const, label: "All Gaps", count: filterCounts.gaps.ALL },
                { id: "ZERO" as const, label: "Zero (0m)", count: filterCounts.gaps.ZERO },
                { id: "LESS" as const, label: "Tight (≤150m)", count: filterCounts.gaps.LESS },
                { id: "MEDIUM" as const, label: "Med (151-300m)", count: filterCounts.gaps.MEDIUM },
                { id: "WIDE" as const, label: "Wide (>300m)", count: filterCounts.gaps.WIDE },
                { id: "NO_MON_GAP" as const, label: "No Mon Gap", count: filterCounts.gaps.NO_MON_GAP },
                { id: "NO_FRI_GAP" as const, label: "No Fri Gap", count: filterCounts.gaps.NO_FRI_GAP }
              ].map((opt) => {
                const isActive = (liveFilters.gapsFilter || "ALL") === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setLiveFilters({ gapsFilter: opt.id })}
                    className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold transition flex items-center gap-1 ${
                      isActive
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/70 shadow-sm"
                        : "bg-[#121216] hover:bg-[#18181f] text-neutral-300 border-neutral-800"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${isActive ? "bg-amber-400 text-slate-950 font-bold" : "bg-neutral-800 text-neutral-400"}`}>
                      {opt.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* B. Daily Finish Time Filter */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              Daily Finish:
            </span>
            <div className="flex flex-wrap gap-1">
              {[
                { id: "ALL" as const, label: "Any Finish", count: filterCounts.finish.ALL },
                { id: "VERY_EARLY" as const, label: "Super Early (≤14:00)", count: filterCounts.finish.VERY_EARLY },
                { id: "EARLY" as const, label: "Early (≤15:40)", count: filterCounts.finish.EARLY },
                { id: "MID" as const, label: "Mid (15:50-17:30)", count: filterCounts.finish.MID },
                { id: "LATE" as const, label: "Late (>17:30)", count: filterCounts.finish.LATE }
              ].map((opt) => {
                const isActive = (liveFilters.finishFilter || "ALL") === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setLiveFilters({ finishFilter: opt.id })}
                    className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold transition flex items-center gap-1 ${
                      isActive
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/70 shadow-sm"
                        : "bg-[#121216] hover:bg-[#18181f] text-neutral-300 border-neutral-800"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${isActive ? "bg-cyan-400 text-slate-950 font-bold" : "bg-neutral-800 text-neutral-400"}`}>
                      {opt.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* C. Daily Start Time Filter */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400" />
              Daily Start:
            </span>
            <div className="flex flex-wrap gap-1">
              {[
                { id: "ALL" as const, label: "Any Start", count: filterCounts.start.ALL },
                { id: "START_8AM" as const, label: "08:00 AM", count: filterCounts.start.START_8AM },
                { id: "START_LATE" as const, label: "Late (≥08:55)", count: filterCounts.start.START_LATE },
                { id: "START_NOON" as const, label: "Noon (≥11:40)", count: filterCounts.start.START_NOON },
                { id: "START_AFTERNOON" as const, label: "Afternoon (≥14:00)", count: filterCounts.start.START_AFTERNOON }
              ].map((opt) => {
                const isActive = (liveFilters.startFilter || "ALL") === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setLiveFilters({ startFilter: opt.id })}
                    className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold transition flex items-center gap-1 ${
                      isActive
                        ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/70 shadow-sm"
                        : "bg-[#121216] hover:bg-[#18181f] text-neutral-300 border-neutral-800"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${isActive ? "bg-yellow-400 text-slate-950 font-bold" : "bg-neutral-800 text-neutral-400"}`}>
                      {opt.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* D. Half Days Filter */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1">
              <Sun className="w-3 h-3 text-orange-400" />
              Half Days:
            </span>
            <div className="flex flex-wrap gap-1">
              {[
                { id: "ALL" as const, label: "Any", count: filterCounts.halfDays.ALL },
                { id: "FULL_HALF" as const, label: "Full (≥4d)", count: filterCounts.halfDays.FULL_HALF },
                { id: "HIGH_HALF" as const, label: "High (3d)", count: filterCounts.halfDays.HIGH_HALF },
                { id: "MOD_HALF" as const, label: "Mod (1-2d)", count: filterCounts.halfDays.MOD_HALF },
                { id: "NO_HALF" as const, label: "None (0d)", count: filterCounts.halfDays.NO_HALF }
              ].map((opt) => {
                const isActive = (liveFilters.halfDaysFilter || "ALL") === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setLiveFilters({ halfDaysFilter: opt.id })}
                    className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold transition flex items-center gap-1 ${
                      isActive
                        ? "bg-orange-500/20 text-orange-300 border-orange-500/70 shadow-sm"
                        : "bg-[#121216] hover:bg-[#18181f] text-neutral-300 border-neutral-800"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${isActive ? "bg-orange-400 text-slate-950 font-bold" : "bg-neutral-800 text-neutral-400"}`}>
                      {opt.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* E. Workload & Days Filter */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-400" />
              Days & Workload:
            </span>
            <div className="flex flex-wrap gap-1">
              {[
                { id: "ALL" as const, label: "All", count: filterCounts.days.ALL },
                { id: "BALANCED" as const, label: "Balanced", count: filterCounts.days.BALANCED },
                { id: "LIGHT" as const, label: "Light (≤4h)", count: filterCounts.days.LIGHT },
                { id: "FOUR_DAY" as const, label: "4-Day Week", count: filterCounts.days.FOUR_DAY },
                { id: "MON_OFF" as const, label: "Mon Off", count: filterCounts.days.MON_OFF },
                { id: "FRI_OFF" as const, label: "Fri Off", count: filterCounts.days.FRI_OFF },
                { id: "FIVE_DAY" as const, label: "5-Day Week", count: filterCounts.days.FIVE_DAY }
              ].map((opt) => {
                const isActive = (liveFilters.daysFilter || "ALL") === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setLiveFilters({ daysFilter: opt.id })}
                    className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold transition flex items-center gap-1 ${
                      isActive
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/70 shadow-sm"
                        : "bg-[#121216] hover:bg-[#18181f] text-neutral-300 border-neutral-800"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${isActive ? "bg-emerald-400 text-slate-950 font-bold" : "bg-neutral-800 text-neutral-400"}`}>
                      {opt.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* F. Faculty Quality Filter */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400" />
              Faculty Rating:
            </span>
            <div className="flex flex-wrap gap-1">
              {[
                { id: "ALL" as const, label: "All", count: filterCounts.faculty.ALL },
                { id: "TOP_RATED" as const, label: "Top (≥4★)", count: filterCounts.faculty.TOP_RATED },
                { id: "GOOD_RATED" as const, label: "Good (≥3★)", count: filterCounts.faculty.GOOD_RATED },
                { id: "REVIEWED_ONLY" as const, label: "Reviewed Only", count: filterCounts.faculty.REVIEWED_ONLY }
              ].map((opt) => {
                const isActive = (liveFilters.facultyQualityFilter || "ALL") === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setLiveFilters({ facultyQualityFilter: opt.id })}
                    className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold transition flex items-center gap-1 ${
                      isActive
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/70 shadow-sm"
                        : "bg-[#121216] hover:bg-[#18181f] text-neutral-300 border-neutral-800"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${isActive ? "bg-amber-400 text-slate-950 font-bold" : "bg-neutral-800 text-neutral-400"}`}>
                      {opt.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column View: Shapes Sidebar (Left) + Timetable (Right) */}
      <div className={`grid grid-cols-1 ${isShapesSidebarVisible ? "lg:grid-cols-12" : ""} gap-6 items-start`}>
        {/* Left Column: Shapes Sidebar */}
        {isShapesSidebarVisible && (
          <div className="lg:col-span-3 sticky top-20">
            <ShapesSidebar
              timetables={filteredTimetables}
              selectedIndex={safeIndex}
              onSelectIndex={setCurrentResultIndex}
            />
          </div>
        )}

        {/* Right Column: Timetable Content */}
        <div className={`${isShapesSidebarVisible ? "lg:col-span-9" : "col-span-12"} space-y-6 min-w-0`}>
          {/* Free-Time Summary & Metrics Bar */}
          {currentTimetable && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-[#09090c] border border-neutral-800 rounded-xl p-3 text-center shadow-lg">
                <span className="text-[10px] text-neutral-400 font-semibold uppercase block">Free Days</span>
                <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                  {currentTimetable.free_days.length > 0 ? currentTimetable.free_days.join(", ") : "0 days"}
                </span>
              </div>

              <div className="bg-[#09090c] border border-neutral-800 rounded-xl p-3 text-center shadow-lg">
                <span className="text-[10px] text-neutral-400 font-semibold uppercase block">Weekly Class Time</span>
                <span className="text-sm font-bold text-neutral-100 mt-0.5 block">
                  {(totalWeeklyClassMinutes / 60).toFixed(1)} hrs
                </span>
              </div>

              <div className="bg-[#09090c] border border-neutral-800 rounded-xl p-3 text-center shadow-lg">
                <span className="text-[10px] text-neutral-400 font-semibold uppercase block">Total Idle Gaps</span>
                <span className="text-sm font-bold text-indigo-300 mt-0.5 block">
                  {totalGapMinutes} mins
                </span>
              </div>

              <div className="bg-[#09090c] border border-neutral-800 rounded-xl p-3 text-center shadow-lg">
                <span className="text-[10px] text-neutral-400 font-semibold uppercase block">Daily Window</span>
                <span className="text-sm font-bold text-neutral-100 mt-0.5 block">
                  {currentTimetable.earliest_start || "--"} – {currentTimetable.latest_end || "--"}
                </span>
              </div>

              <div className="bg-[#09090c] border border-neutral-800 rounded-xl p-3 text-center col-span-2 sm:col-span-1 shadow-lg">
                <span className="text-[10px] text-neutral-400 font-semibold uppercase block">Avg Faculty Rating</span>
                <span className="text-sm font-bold text-amber-300 mt-0.5 block">
                  {currentTimetable.avg_faculty_rating != null
                    ? `${currentTimetable.avg_faculty_rating.toFixed(2)} ★`
                    : "Unrated"}
                </span>
              </div>
            </div>
          )}

          {/* The Timetable Grid */}
          {currentTimetable ? (
            <WeeklyTimetable
              timeline={currentTimetable.per_day_timeline}
              courseTitles={courseTitlesMap}
              courseCredits={courseCreditsMap}
              timetableObj={currentTimetable}
              title={`Distinct Timetable Shape #${safeIndex + 1} of ${filteredTimetables.length}`}
              subtitle={`Score: ${currentTimetable.score.toFixed(3)} • Working Days: ${currentTimetable.working_days.join(", ")} • Swap teachers in the table below to keep this exact shape`}
              onReset={() => setActiveTab("planner")}
              onDownload={() => setIsDownloadModalOpen(true)}
            />
          ) : (
            <div className="p-12 text-center bg-[#09090c] border border-neutral-800 rounded-2xl shadow-xl">
              <p className="text-neutral-400 text-sm">No timetables match the selected filters.</p>
              <button
                onClick={resetAllFilters}
                className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Download Options */}
      {isDownloadModalOpen && currentTimetable && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
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
                  Choose your preferred format for offline export or sharing.
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
                <p className="text-xs text-neutral-400">Rendering timetable matrix, courses, and metrics without clipped text.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
              {/* Option 1: Excel */}
              <button
                onClick={() => handleDownloadFormat("excel")}
                disabled={isExporting}
                className="w-full p-3.5 bg-[#141419] hover:bg-[#1a1a22] border border-neutral-800 hover:border-emerald-500/50 rounded-2xl flex items-center justify-between text-left transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-neutral-100 block">Excel Spreadsheet (.xlsx)</span>
                    <span className="text-[11px] text-neutral-400">
                      3 sheets: Formatted period grid with colors, enrolled course list, and free-time breakdown
                    </span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400 transition" />
              </button>

              {/* Option 2: PDF */}
              <button
                onClick={() => handleDownloadFormat("pdf")}
                disabled={isExporting}
                className="w-full p-3.5 bg-[#141419] hover:bg-[#1a1a22] border border-neutral-800 hover:border-rose-500/50 rounded-2xl flex items-center justify-between text-left transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-neutral-100 block">PDF Document (.pdf)</span>
                    <span className="text-[11px] text-neutral-400">
                      High-resolution landscape A4 vector document with zero clipped text
                    </span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-rose-400 transition" />
              </button>

              {/* Option 3: PNG */}
              <button
                onClick={() => handleDownloadFormat("png")}
                disabled={isExporting}
                className="w-full p-3.5 bg-[#141419] hover:bg-[#1a1a22] border border-neutral-800 hover:border-amber-500/50 rounded-2xl flex items-center justify-between text-left transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-neutral-100 block">PNG Image (.png)</span>
                    <span className="text-[11px] text-neutral-400">
                      2x scale crisp image for phone lockscreen or printing
                    </span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 transition" />
              </button>

              {/* Option 4: CSV */}
              <button
                onClick={() => handleDownloadFormat("csv")}
                disabled={isExporting}
                className="w-full p-3.5 bg-[#141419] hover:bg-[#1a1a22] border border-neutral-800 hover:border-cyan-500/50 rounded-2xl flex items-center justify-between text-left transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-neutral-100 block">CSV File (.csv)</span>
                    <span className="text-[11px] text-neutral-400">
                      Standard meeting row format with UTF-8 BOM
                    </span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-cyan-400 transition" />
              </button>

              {/* Option 5: All Formats (ZIP) */}
              <button
                onClick={() => handleDownloadFormat("bundle")}
                disabled={isExporting}
                className="w-full p-3.5 bg-[#141419] hover:bg-[#1a1a22] border border-neutral-800 hover:border-indigo-500/50 rounded-2xl flex items-center justify-between text-left transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                    <Archive className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-neutral-100 block">All Formats ZIP Bundle (.zip)</span>
                    <span className="text-[11px] text-neutral-400">
                      Contains Excel, PDF, PNG, and CSV in a single zip archive
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

      {/* Modal: Save to Saved Timetables */}
      {saveModalTimetable && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSaveModalTimetable(null)}
        >
          <div
            className="bg-[#0c0c10] border border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
              <Archive className="w-5 h-5 text-amber-400 fill-amber-400/20" />
              Save Timetable
            </h4>
            <p className="text-xs text-neutral-400 mt-1">
              Give this timetable a custom nickname to quickly compare, export, or reopen it later in the Planner.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Schedule Name</label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="w-full bg-[#141419] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSaveModalTimetable(null)}
                className="px-4 py-2 bg-[#141419] hover:bg-[#1a1a22] text-neutral-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await toggleFavouriteTimetable(
                    saveName || "Saved Timetable",
                    saveModalTimetable.offering_keys,
                    saveModalTimetable
                  );
                  setSaveModalTimetable(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
              >
                Save Timetable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Compare Timetables Side-by-Side */}
      {isCompareModalOpen && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setIsCompareModalOpen(false)}
        >
          <div
            className="bg-[#0c0c10] border border-neutral-800 rounded-3xl p-6 max-w-6xl w-full shadow-2xl my-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
                  <GitCompare className="w-5 h-5 text-indigo-400" />
                  Timetable Comparison ({comparedTimetableIds.length} Schedules)
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Comparing key schedule metrics, free days, gaps, and faculty choices across your selected schedules.
                </p>
              </div>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Comparison Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {comparedTimetableIds.map((id, idx) => {
                const tt = rawTimetables.find((t) => t.timetable_id === id);
                if (!tt) return null;

                return (
                  <div key={id} className="bg-[#121216] border border-neutral-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-neutral-100 font-mono">
                        Schedule #{idx + 1}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                        Score: {tt.score.toFixed(3)}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-neutral-300">
                      <div className="flex justify-between border-b border-neutral-800/60 pb-1">
                        <span className="text-neutral-400">Free Days:</span>
                        <span className="font-bold text-emerald-400">
                          {tt.free_days.length > 0 ? tt.free_days.join(", ") : "None"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-neutral-800/60 pb-1">
                        <span className="text-neutral-400">Total Idle Gaps:</span>
                        <span className="font-bold text-neutral-200">
                          {Object.values(tt.gap_minutes_per_day).reduce((s, m) => s + m, 0)} mins
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-neutral-800/60 pb-1">
                        <span className="text-neutral-400">Daily Span:</span>
                        <span className="font-bold text-neutral-200">
                          {tt.earliest_start || "--"} – {tt.latest_end || "--"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Avg Faculty Rating:</span>
                        <span className="font-bold text-amber-300">
                          {tt.avg_faculty_rating != null ? `${tt.avg_faculty_rating.toFixed(2)} ★` : "Unrated"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <span className="text-[11px] font-semibold text-neutral-400 block mb-1">
                        Faculty Selected:
                      </span>
                      <div className="space-y-1">
                        {Object.values(tt.per_day_timeline).flatMap((blocks) =>
                          blocks.map((b) => (
                            <div key={`${b.course_code}-${b.slot_label}`} className="text-[10px] text-neutral-300 flex justify-between">
                              <span className="font-mono">{b.course_code}:</span>
                              <span className="truncate max-w-[140px]">{b.faculty_name}</span>
                            </div>
                          ))
                        ).slice(0, 7)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
