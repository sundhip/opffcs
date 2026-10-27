import React, { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { WeeklyTimetable } from "../timetable/WeeklyTimetable";
import { GeneratedTimetable } from "../../types";
import {
  ChevronLeft,
  ChevronRight,
  Star,
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
  X
} from "lucide-react";

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
  const [favouriteModalTimetable, setFavouriteModalTimetable] = useState<GeneratedTimetable | null>(null);
  const [favouriteName, setFavouriteName] = useState("");

  const courseTitlesMap = useMemo(() => {
    const map: Record<string, string> = {};
    courses.forEach((c) => {
      map[c.code] = c.title;
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

  const currentTimetable: GeneratedTimetable | undefined = filteredTimetables[currentResultIndex];

  // Arrow key navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowLeft") {
        if (currentResultIndex > 0) setCurrentResultIndex(currentResultIndex - 1);
      } else if (e.key === "ArrowRight") {
        if (currentResultIndex < filteredTimetables.length - 1) {
          setCurrentResultIndex(currentResultIndex + 1);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentResultIndex, filteredTimetables.length, setCurrentResultIndex]);

  // Check favourite status
  const isCurrentFavourite = useMemo(() => {
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
  if (filteredTimetables.length === 0) {
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
      {/* 1. Results Navigation & Summary Top Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
        {/* Left: Index Pager */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1 border border-slate-700">
            <button
              onClick={() => setCurrentResultIndex(Math.max(0, currentResultIndex - 1))}
              disabled={currentResultIndex === 0}
              aria-label="Previous timetable"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:text-slate-300 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-3 text-xs font-mono font-bold text-slate-100">
              {currentResultIndex + 1} / {filteredTimetables.length}
            </span>
            <button
              onClick={() => setCurrentResultIndex(Math.min(filteredTimetables.length - 1, currentResultIndex + 1))}
              disabled={currentResultIndex >= filteredTimetables.length - 1}
              aria-label="Next timetable"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:text-slate-300 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline">
            (of {generationResult.total_valid} total valid schedules)
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

        {/* Right: Actions (Favourite, Compare, Print) */}
        <div className="flex items-center gap-2">
          {/* Favourite Button */}
          <button
            aria-label="Bookmark this timetable"
            onClick={() => {
              if (currentTimetable) {
                setFavouriteName(`Schedule #${currentResultIndex + 1} (${currentTimetable.free_days.join(", ") || "5 days"})`);
                setFavouriteModalTimetable(currentTimetable);
              }
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              isCurrentFavourite
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500"
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${isCurrentFavourite ? "fill-amber-400 text-amber-400" : ""}`} />
            {isCurrentFavourite ? "Favourited" : "Favourite"}
          </button>

          {/* Compare Toggle Button */}
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
            Compare ({comparedTimetableIds.length}/3)
          </button>

          {comparedTimetableIds.length >= 2 && (
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-400 transition"
            >
              View Comparison
            </button>
          )}

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

      {/* 2. Live Filters & Sorting Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-400 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            Live Client Filters:
          </span>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Sort:</span>
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

          {/* Required Free Day Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Must Have Free:</span>
            <select
              value={liveFilters.requiredFreeDay || ""}
              onChange={(e) => setLiveFilters({ requiredFreeDay: e.target.value || null })}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
            >
              <option value="">Any Free Days</option>
              <option value="MON">Monday Free</option>
              <option value="FRI">Friday Free</option>
              <option value="WED">Wednesday Free</option>
            </select>
          </div>

          {/* Max Gap Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Max Gap:</span>
            <select
              value={liveFilters.maxGapMinutes ?? ""}
              onChange={(e) =>
                setLiveFilters({
                  maxGapMinutes: e.target.value ? parseInt(e.target.value) : null
                })
              }
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
            >
              <option value="">Any Gap</option>
              <option value="60">≤ 60 mins</option>
              <option value="120">≤ 2 hours</option>
            </select>
          </div>
        </div>

        {/* Score & Score Breakdown Tooltip */}
        {currentTimetable && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400">Overall Score:</span>
              <span className="font-bold text-slate-100 font-mono">
                {currentTimetable.score.toFixed(3)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Free-Time Summary & Metrics Bar */}
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

      {/* 4. The Timetable Grid */}
      {currentTimetable && (
        <WeeklyTimetable
          timeline={currentTimetable.per_day_timeline}
          courseTitles={courseTitlesMap}
          title={`Conflict-Free Timetable (ID: ${currentTimetable.timetable_id})`}
          subtitle={`Score: ${currentTimetable.score.toFixed(3)} • Working Days: ${currentTimetable.working_days.join(", ")}`}
        />
      )}

      {/* Modal: Save to Favourites */}
      {favouriteModalTimetable && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => setFavouriteModalTimetable(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              Save Timetable to Favourites
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Give this timetable a custom nickname to quickly compare or reopen it later in the Planner.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Schedule Name</label>
              <input
                type="text"
                value={favouriteName}
                onChange={(e) => setFavouriteName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setFavouriteModalTimetable(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await toggleFavouriteTimetable(
                    favouriteName || "Saved Timetable",
                    favouriteModalTimetable.offering_keys,
                    favouriteModalTimetable
                  );
                  setFavouriteModalTimetable(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
              >
                Save to Favourites
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
