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
  PanelLeftOpen
} from "lucide-react";
import { downloadTimetableExport, ExportFormat } from "../../utils/exporter";

export function getGapMinutes(tt: GeneratedTimetable): number {
  return Object.values(tt.gap_minutes_per_day).reduce((s, m) => s + m, 0);
}

export function getGapCategory(tt: GeneratedTimetable): "LESS" | "MEDIUM" | "HIGH" {
  const totalGap = getGapMinutes(tt);
  if (totalGap <= 60) return "LESS";
  if (totalGap <= 180) return "MEDIUM";
  return "HIGH";
}

export function getFinishCategory(tt: GeneratedTimetable): "EARLY" | "MID" | "LATE" {
  const latest = tt.latest_end || "19:00";
  if (latest <= "15:40") return "EARLY";
  if (latest <= "17:30") return "MID";
  return "LATE";
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

export function getHalfDaysCategory(tt: GeneratedTimetable): "HIGH" | "LESS" {
  return getHalfDaysCount(tt) >= 3 ? "HIGH" : "LESS";
}

export function getDaysCategory(tt: GeneratedTimetable): "BALANCED" | "FOUR_DAY" | "FIVE_DAY" {
  if (tt.free_days && tt.free_days.length > 0) return "FOUR_DAY";
  if (tt.max_daily_hours <= 5.0 && tt.working_days.length >= 4) return "BALANCED";
  return "FIVE_DAY";
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
  const [isExporting, setIsExporting] = useState(false);
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
      list = list.filter((tt) => getGapCategory(tt) === liveFilters.gapsFilter);
    }

    // 2. Daily Finish Time filter
    if (liveFilters.finishFilter && liveFilters.finishFilter !== "ALL") {
      list = list.filter((tt) => getFinishCategory(tt) === liveFilters.finishFilter);
    }

    // 3. Half Days filter
    if (liveFilters.halfDaysFilter && liveFilters.halfDaysFilter !== "ALL") {
      list = list.filter((tt) => getHalfDaysCategory(tt) === liveFilters.halfDaysFilter);
    }

    // 4. Days / Workload filter
    if (liveFilters.daysFilter && liveFilters.daysFilter !== "ALL") {
      list = list.filter((tt) => getDaysCategory(tt) === liveFilters.daysFilter);
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
        LESS: rawTimetables.filter((t) => getGapCategory(t) === "LESS").length,
        MEDIUM: rawTimetables.filter((t) => getGapCategory(t) === "MEDIUM").length,
        HIGH: rawTimetables.filter((t) => getGapCategory(t) === "HIGH").length
      },
      finish: {
        ALL: rawTimetables.length,
        EARLY: rawTimetables.filter((t) => getFinishCategory(t) === "EARLY").length,
        MID: rawTimetables.filter((t) => getFinishCategory(t) === "MID").length,
        LATE: rawTimetables.filter((t) => getFinishCategory(t) === "LATE").length
      },
      halfDays: {
        ALL: rawTimetables.length,
        HIGH: rawTimetables.filter((t) => getHalfDaysCategory(t) === "HIGH").length,
        LESS: rawTimetables.filter((t) => getHalfDaysCategory(t) === "LESS").length
      },
      days: {
        ALL: rawTimetables.length,
        BALANCED: rawTimetables.filter((t) => getDaysCategory(t) === "BALANCED").length,
        FOUR_DAY: rawTimetables.filter((t) => getDaysCategory(t) === "FOUR_DAY").length,
        FIVE_DAY: rawTimetables.filter((t) => getDaysCategory(t) === "FIVE_DAY").length
      }
    };
  }, [rawTimetables]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (liveFilters.gapsFilter && liveFilters.gapsFilter !== "ALL") count++;
    if (liveFilters.finishFilter && liveFilters.finishFilter !== "ALL") count++;
    if (liveFilters.halfDaysFilter && liveFilters.halfDaysFilter !== "ALL") count++;
    if (liveFilters.daysFilter && liveFilters.daysFilter !== "ALL") count++;
    if (liveFilters.requiredFreeDay) count++;
    if (liveFilters.requiredFaculty) count++;
    if (liveFilters.maxGapMinutes != null) count++;
    return count;
  }, [liveFilters]);

  const resetAllFilters = () => {
    setLiveFilters({
      gapsFilter: "ALL",
      finishFilter: "ALL",
      halfDaysFilter: "ALL",
      daysFilter: "ALL",
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

  // If no generation result yet or 0 results
  if (!generationResult) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 shadow-xl">
          <Calendar className="w-16 h-16 text-indigo-400/80 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-100">No Generated Timetables Yet</h3>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
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
        <div className="bg-slate-900 border border-red-900/60 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-3 text-red-400 mb-4">
            <AlertCircle className="w-7 h-7" />
            <h3 className="text-xl font-bold text-slate-100">No Conflict-Free Timetable Found</h3>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            {exp?.diagnostic_summary || "The combination of selected courses and strict constraints has zero valid configurations."}
          </p>

          {exp && exp.empty_domain_courses.length > 0 && (
            <div className="mt-4 p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-300">
              <span className="font-semibold text-slate-100 block mb-1">
                Courses With 0 Valid Offerings Under Current Filters:
              </span>
              <span className="font-mono text-indigo-300">{exp.empty_domain_courses.join(", ")}</span>
            </div>
          )}

          {exp && exp.minimal_conflicting_subset.length > 0 && (
            <div className="mt-3 p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-300">
              <span className="font-semibold text-slate-100 block mb-1">
                Minimal Conflicting Course Subset:
              </span>
              <span className="font-mono text-amber-300">{exp.minimal_conflicting_subset.join(", ")}</span>
            </div>
          )}

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
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* 1. Results Navigation, Download Bar & Top Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
        {/* Left: Index Pager */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1 border border-slate-700">
            <button
              onClick={() => setCurrentResultIndex(Math.max(0, safeIndex - 1))}
              disabled={safeIndex === 0}
              aria-label="Previous timetable"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:text-slate-300 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-3 text-xs font-mono font-bold text-slate-100">
              {filteredTimetables.length > 0 ? safeIndex + 1 : 0} / {filteredTimetables.length}
            </span>
            <button
              onClick={() => setCurrentResultIndex(Math.min(filteredTimetables.length - 1, safeIndex + 1))}
              disabled={safeIndex >= filteredTimetables.length - 1}
              aria-label="Next timetable"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:text-slate-300 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline">
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

        {/* Right: Actions (Save Timetable, Compare, Downloads) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Shapes Sidebar Toggle Button */}
          <button
            onClick={() => setIsShapesSidebarVisible(!isShapesSidebarVisible)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              isShapesSidebarVisible
                ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/50"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500"
            }`}
            title="Toggle Shapes layout preview panel"
          >
            {isShapesSidebarVisible ? (
              <PanelLeftClose className="w-3.5 h-3.5 text-indigo-400" />
            ) : (
              <PanelLeftOpen className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>Shapes Panel</span>
          </button>

          {/* Saved Timetable Button (Matching Image 2 Stacked Drawer) */}
          <button
            aria-label="Save this timetable"
            onClick={() => {
              if (currentTimetable) {
                setSaveName(`Schedule #${safeIndex + 1} (${currentTimetable.free_days.join(", ") || "5 days"})`);
                setSaveModalTimetable(currentTimetable);
              }
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              isCurrentSaved
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500"
            }`}
          >
            <Archive className={`w-3.5 h-3.5 ${isCurrentSaved ? "text-amber-400 fill-amber-400/30" : "text-slate-400"}`} />
            <span>{isCurrentSaved ? "Saved" : "Save Timetable"}</span>
          </button>

          {/* Compare Button */}
          <button
            onClick={() => {
              if (currentTimetable) toggleCompareTimetable(currentTimetable.timetable_id);
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              currentTimetable && comparedTimetableIds.includes(currentTimetable.timetable_id)
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500"
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
              View Comparison
            </button>
          )}

          {/* 1-Click Export Buttons Toolbar */}
          <div className="flex items-center gap-1 bg-slate-850 p-1 rounded-xl border border-slate-750">
            <button
              onClick={() => currentTimetable && downloadTimetableExport(currentTimetable, "excel", setIsExporting)}
              disabled={!currentTimetable || isExporting}
              className="p-1.5 hover:bg-slate-700/80 rounded-lg text-emerald-400 hover:text-emerald-300 transition"
              title="Download Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>

            <button
              onClick={() => currentTimetable && downloadTimetableExport(currentTimetable, "pdf", setIsExporting)}
              disabled={!currentTimetable || isExporting}
              className="p-1.5 hover:bg-slate-700/80 rounded-lg text-rose-400 hover:text-rose-300 transition"
              title="Download PDF (.pdf)"
            >
              <FileText className="w-4 h-4" />
            </button>

            <button
              onClick={() => currentTimetable && downloadTimetableExport(currentTimetable, "csv", setIsExporting)}
              disabled={!currentTimetable || isExporting}
              className="p-1.5 hover:bg-slate-700/80 rounded-lg text-cyan-400 hover:text-cyan-300 transition"
              title="Download CSV (.csv)"
            >
              <FileText className="w-4 h-4" />
            </button>

            <button
              onClick={() => currentTimetable && downloadTimetableExport(currentTimetable, "png", setIsExporting)}
              disabled={!currentTimetable || isExporting}
              className="p-1.5 hover:bg-slate-700/80 rounded-lg text-amber-400 hover:text-amber-300 transition"
              title="Download PNG Image (.png)"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            <button
              onClick={() => currentTimetable && downloadTimetableExport(currentTimetable, "bundle", setIsExporting)}
              disabled={!currentTimetable || isExporting}
              className="p-1.5 hover:bg-slate-700/80 rounded-lg text-indigo-400 hover:text-indigo-300 transition font-bold"
              title="Download All Formats (.zip)"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
            title="Print Timetable"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Comprehensive Multi-Dimensional Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
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

            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Sort:</span>
              <select
                value={liveFilters.sortBy}
                onChange={(e) => setLiveFilters({ sortBy: e.target.value as any })}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* A. Free Gaps Filter */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Coffee className="w-3 h-3 text-amber-400" />
              Free Gaps:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "ALL" as const, label: "All Gaps", count: filterCounts.gaps.ALL },
                { id: "LESS" as const, label: "Less (≤60m)", count: filterCounts.gaps.LESS },
                { id: "MEDIUM" as const, label: "Med (61-180m)", count: filterCounts.gaps.MEDIUM },
                { id: "HIGH" as const, label: "High (>180m)", count: filterCounts.gaps.HIGH }
              ].map((opt) => {
                const isActive = (liveFilters.gapsFilter || "ALL") === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setLiveFilters({ gapsFilter: opt.id })}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition flex items-center gap-1.5 ${
                      isActive
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/70 shadow-sm"
                        : "bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${isActive ? "bg-amber-400 text-slate-950 font-bold" : "bg-slate-700 text-slate-400"}`}>
                      {opt.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* B. Daily Finish Time Filter */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              Daily Finish:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "ALL" as const, label: "Any Finish", count: filterCounts.finish.ALL },
                { id: "EARLY" as const, label: "Early (≤15:40)", count: filterCounts.finish.EARLY },
                { id: "MID" as const, label: "Mid (15:50-17:30)", count: filterCounts.finish.MID },
                { id: "LATE" as const, label: "Late (>17:30)", count: filterCounts.finish.LATE }
              ].map((opt) => {
                const isActive = (liveFilters.finishFilter || "ALL") === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setLiveFilters({ finishFilter: opt.id })}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition flex items-center gap-1.5 ${
                      isActive
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/70 shadow-sm"
                        : "bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${isActive ? "bg-cyan-400 text-slate-950 font-bold" : "bg-slate-700 text-slate-400"}`}>
                      {opt.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* C. Half Days Filter */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Sun className="w-3 h-3 text-orange-400" />
              Half Days (Morning/Afternoon):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "ALL" as const, label: "Any", count: filterCounts.halfDays.ALL },
                { id: "HIGH" as const, label: "High Half Days (≥3d)", count: filterCounts.halfDays.HIGH },
                { id: "LESS" as const, label: "Less Half Days (<3d)", count: filterCounts.halfDays.LESS }
              ].map((opt) => {
                const isActive = (liveFilters.halfDaysFilter || "ALL") === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setLiveFilters({ halfDaysFilter: opt.id })}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition flex items-center gap-1.5 ${
                      isActive
                        ? "bg-orange-500/20 text-orange-300 border-orange-500/70 shadow-sm"
                        : "bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${isActive ? "bg-orange-400 text-slate-950 font-bold" : "bg-slate-700 text-slate-400"}`}>
                      {opt.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* D. Workload / Days Filter */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-400" />
              Days & Workload:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "ALL" as const, label: "All", count: filterCounts.days.ALL },
                { id: "BALANCED" as const, label: "Balanced Load", count: filterCounts.days.BALANCED },
                { id: "FOUR_DAY" as const, label: "4-Day Week", count: filterCounts.days.FOUR_DAY },
                { id: "FIVE_DAY" as const, label: "5-Day Week", count: filterCounts.days.FIVE_DAY }
              ].map((opt) => {
                const isActive = (liveFilters.daysFilter || "ALL") === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setLiveFilters({ daysFilter: opt.id })}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition flex items-center gap-1.5 ${
                      isActive
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/70 shadow-sm"
                        : "bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${isActive ? "bg-emerald-400 text-slate-950 font-bold" : "bg-slate-700 text-slate-400"}`}>
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
        {/* Left Column: Shapes Sidebar (Image 1) */}
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
          {/* Horizontal Quick Ribbon */}
          {filteredTimetables.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-md flex items-center gap-3">
              <button
                onClick={() => setCurrentResultIndex(Math.max(0, safeIndex - 1))}
                disabled={safeIndex === 0}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800 transition shrink-0"
                title="Previous Variation"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex-1 overflow-x-auto flex items-center gap-2 py-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {filteredTimetables.map((tt, idx) => {
                  const isSelected = idx === safeIndex;
                  const badge = getTimetableShapeBadge(tt);
                  return (
                    <button
                      key={tt.timetable_id || `ribbon-${idx}`}
                      onClick={() => setCurrentResultIndex(idx)}
                      className={`shrink-0 px-3 py-1.5 rounded-xl border text-left transition-all active:scale-95 ${
                        isSelected
                          ? "bg-slate-800 border-[#c6f052] ring-2 ring-[#c6f052]/60 shadow-lg shadow-[#c6f052]/10"
                          : "bg-slate-850/80 hover:bg-slate-800 border-slate-750 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold font-mono ${isSelected ? "text-[#c6f052]" : "text-slate-300"}`}>
                          Shape #{idx + 1}
                        </span>
                        <span className="text-[10px]">{badge.icon}</span>
                        <span className="text-[10px] font-medium text-slate-300 truncate max-w-[90px]">
                          {badge.label}
                        </span>
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>{tt.score.toFixed(1)} pts</span>
                        <span>•</span>
                        <span>{tt.working_days.length}d</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentResultIndex(Math.min(filteredTimetables.length - 1, safeIndex + 1))}
                disabled={safeIndex >= filteredTimetables.length - 1}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800 transition shrink-0"
                title="Next Variation"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Free-Time Summary & Metrics Bar */}
          {currentTimetable && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Free Days</span>
                <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                  {currentTimetable.free_days.length > 0 ? currentTimetable.free_days.join(", ") : "0 days"}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Weekly Class Time</span>
                <span className="text-sm font-bold text-slate-100 mt-0.5 block">
                  {(totalWeeklyClassMinutes / 60).toFixed(1)} hrs
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Idle Gaps</span>
                <span className="text-sm font-bold text-indigo-300 mt-0.5 block">
                  {totalGapMinutes} mins
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Daily Window</span>
                <span className="text-sm font-bold text-slate-100 mt-0.5 block">
                  {currentTimetable.earliest_start || "--"} – {currentTimetable.latest_end || "--"}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Avg Faculty Rating</span>
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
            />
          ) : (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              <p className="text-slate-400 text-sm">No timetables match the selected filters.</p>
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

      {/* Modal: Save to Saved Timetables (Image 2) */}
      {saveModalTimetable && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => setSaveModalTimetable(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Archive className="w-5 h-5 text-amber-400 fill-amber-400/20" />
              Save Timetable
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Give this timetable a custom nickname to quickly compare, export, or reopen it later in the Planner.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Schedule Name</label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSaveModalTimetable(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
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
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setIsCompareModalOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-6xl w-full shadow-2xl my-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <GitCompare className="w-5 h-5 text-indigo-400" />
                  Timetable Comparison ({comparedTimetableIds.length} Schedules)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Comparing key schedule metrics, free days, gaps, and faculty choices across your selected schedules.
                </p>
              </div>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white text-lg font-bold"
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
                  <div key={id} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-100 font-mono">
                        Schedule #{idx + 1}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                        Score: {tt.score.toFixed(3)}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between border-b border-slate-700/60 pb-1">
                        <span className="text-slate-400">Free Days:</span>
                        <span className="font-bold text-emerald-400">
                          {tt.free_days.length > 0 ? tt.free_days.join(", ") : "None"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700/60 pb-1">
                        <span className="text-slate-400">Total Idle Gaps:</span>
                        <span className="font-bold text-slate-200">
                          {Object.values(tt.gap_minutes_per_day).reduce((s, m) => s + m, 0)} mins
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700/60 pb-1">
                        <span className="text-slate-400">Daily Span:</span>
                        <span className="font-bold text-slate-200">
                          {tt.earliest_start || "--"} – {tt.latest_end || "--"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Avg Faculty Rating:</span>
                        <span className="font-bold text-amber-300">
                          {tt.avg_faculty_rating != null ? `${tt.avg_faculty_rating.toFixed(2)} ★` : "Unrated"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Faculty Selected:
                      </span>
                      <div className="space-y-1">
                        {Object.values(tt.per_day_timeline).flatMap((blocks) =>
                          blocks.map((b) => (
                            <div key={`${b.course_code}-${b.slot_label}`} className="text-[10px] text-slate-300 flex justify-between">
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
