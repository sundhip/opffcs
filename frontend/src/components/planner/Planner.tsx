import React, { useState, useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";
import {
  Search,
  BookOpen,
  Sliders,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Lock,
  ChevronDown,
  ChevronUp,
  Star,
  Clock,
  Calendar,
  Layers
} from "lucide-react";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const ALL_TIME_OPTIONS = [
  { label: "08:00", min: 480 },
  { label: "08:55", min: 535 },
  { label: "09:50", min: 590 },
  { label: "10:45", min: 645 },
  { label: "11:40", min: 700 },
  { label: "12:35", min: 755 },
  { label: "14:00", min: 840 },
  { label: "14:55", min: 895 },
  { label: "15:50", min: 950 },
  { label: "16:45", min: 1005 },
  { label: "17:40", min: 1060 },
  { label: "18:35", min: 1115 },
  { label: "19:30", min: 1170 }
];

export const Planner: React.FC = () => {
  const {
    courses,
    offeringsByCourse,
    facultyList,
    selectedCourseCodes,
    courseConfigs,
    toggleCourseSelection,
    updateCourseConfig,
    hardConstraints,
    setHardConstraints,
    softPreferences,
    setSoftPreferences,
    applyPreset,
    validationErrors,
    isGenerating,
    startGeneration,
    cancelGeneration
  } = useAppStore();

  const [courseSearch, setCourseSearch] = useState("");
  const [activeConstraintTab, setActiveConstraintTab] = useState<"strict" | "preferences">("strict");
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  // Filtered courses based on search
  const filteredCourses = useMemo(() => {
    if (!courseSearch.trim()) return courses;
    const q = courseSearch.trim().toLowerCase();
    return courses.filter(
      (c) => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
    );
  }, [courses, courseSearch]);

  // Calculate selected credits
  const totalSelectedCredits = useMemo(() => {
    return selectedCourseCodes.reduce((sum, code) => {
      const c = courses.find((item) => item.code === code);
      return sum + (c ? c.credits : 0);
    }, 0);
  }, [courses, selectedCourseCodes]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Banner: Credits & Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            FFCS Timetable Planner
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Pick your semester courses, customize faculty allow/block lists, configure constraints, and generate optimal conflict-free schedules.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-800/90 border border-slate-700 px-4 py-2 rounded-xl text-center">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
              Selected Courses
            </span>
            <span className="text-lg font-bold text-slate-100">{selectedCourseCodes.length}</span>
          </div>

          <div className="bg-indigo-950/80 border border-indigo-700/60 px-4 py-2 rounded-xl text-center">
            <span className="text-[11px] text-indigo-300 uppercase tracking-wider font-semibold block">
              Total Credits
            </span>
            <span className="text-lg font-bold text-indigo-200">{totalSelectedCredits}</span>
          </div>

          <button
            onClick={startGeneration}
            disabled={isGenerating || selectedCourseCodes.length === 0 || validationErrors.length > 0}
            className={`px-6 py-3 rounded-xl font-semibold text-sm shadow-md transition-all flex items-center gap-2 ${
              isGenerating
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : selectedCourseCodes.length === 0 || validationErrors.length > 0
                ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                : "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/25 active:scale-98"
            }`}
          >
            {isGenerating ? (
              <>
                <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-200" />
                Generate Schedules
              </>
            )}
          </button>

          {isGenerating && (
            <button
              onClick={cancelGeneration}
              className="px-4 py-3 bg-red-900/60 hover:bg-red-800 border border-red-700 text-red-200 rounded-xl text-sm font-semibold transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Validation Errors Alert Banner */}
      {validationErrors.length > 0 && (
        <div className="bg-red-950/70 border border-red-800/80 rounded-xl p-4 text-sm text-red-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block text-red-300">Action Required Before Generation:</span>
            {validationErrors.map((err, i) => (
              <p key={i} className="text-xs text-red-300/90 leading-relaxed">• {err}</p>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Left = Course Picker & Options, Right = Constraints & Preferences */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Course Picker (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                Available Courses ({courses.length})
              </h3>
              <div className="relative w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search code or title..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Courses List */}
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {filteredCourses.map((c) => {
                const isSelected = selectedCourseCodes.includes(c.code);
                const cfg = courseConfigs[c.code];
                const offerings = offeringsByCourse[c.code] || [];
                const isExpanded = expandedCourse === c.code;

                return (
                  <div
                    key={c.code}
                    className={`border rounded-xl transition-all ${
                      isSelected
                        ? "bg-slate-800/80 border-indigo-500/80 ring-1 ring-indigo-500/50 shadow-md"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {/* Course Header Row */}
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleCourseSelection(c.code)}
                          aria-label={`Select ${c.code}`}
                          className={`w-5 h-5 rounded flex items-center justify-center transition border ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-500 text-white"
                              : "border-slate-600 bg-slate-800 hover:border-indigo-400"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100 font-mono text-sm">{c.code}</span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-semibold text-slate-300 border border-slate-700">
                              {c.credits} Credits
                            </span>
                            {c.has_theory && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-950 text-[10px] font-medium text-indigo-300 border border-indigo-700/50">
                                Theory
                              </span>
                            )}
                            {c.has_lab && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-[10px] font-medium text-emerald-300 border border-emerald-700/50">
                                Lab
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 mt-1 font-medium">{c.title}</p>
                          <span className="text-[11px] text-slate-400 mt-0.5 block">
                            {offerings.length} offering(s) available in dataset
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <button
                          type="button"
                          onClick={() => setExpandedCourse(isExpanded ? null : c.code)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1 transition"
                        >
                          <span>Options</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>

                    {/* Expandable Per-Course Configuration Drawer */}
                    {isSelected && isExpanded && cfg && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-700/60 bg-slate-900/60 rounded-b-xl space-y-4 text-xs">
                        {/* Theory / Lab Toggles */}
                        <div className="flex flex-wrap items-center gap-4 pt-1">
                          {c.has_theory && (
                            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={cfg.include_theory}
                                onChange={(e) => updateCourseConfig(c.code, { include_theory: e.target.checked })}
                                className="rounded text-indigo-600 bg-slate-800 border-slate-600"
                              />
                              <span>Include Theory</span>
                            </label>
                          )}

                          {c.has_lab && (
                            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={cfg.include_lab}
                                onChange={(e) => updateCourseConfig(c.code, { include_lab: e.target.checked })}
                                className="rounded text-indigo-600 bg-slate-800 border-slate-600"
                              />
                              <span>Include Lab</span>
                            </label>
                          )}

                          {c.has_theory && c.has_lab && (
                            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={cfg.require_same_faculty}
                                onChange={(e) => updateCourseConfig(c.code, { require_same_faculty: e.target.checked })}
                                className="rounded text-indigo-600 bg-slate-800 border-slate-600"
                              />
                              <span>Same Faculty for Theory & Lab</span>
                            </label>
                          )}
                        </div>

                        {/* Faculty Allow/Block Badges */}
                        <div>
                          <span className="font-semibold text-slate-300 block mb-1.5">
                            Faculty Available for this Course ({offerings.length}):
                          </span>
                          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                            {offerings.map((off) => {
                              const fName = off.faculty_name || "Unknown";
                              const fInfo = facultyList.find((f) => f.id === off.faculty_id);
                              const isBlocked = cfg.blocked_theory_faculty.includes(fName);

                              return (
                                <button
                                  key={off.id}
                                  type="button"
                                  onClick={() => {
                                    const nextBlocked = isBlocked
                                      ? cfg.blocked_theory_faculty.filter((n) => n !== fName)
                                      : [...cfg.blocked_theory_faculty, fName];
                                    updateCourseConfig(c.code, { blocked_theory_faculty: nextBlocked });
                                  }}
                                  className={`px-2.5 py-1 rounded-lg border text-[11px] flex items-center gap-1.5 transition ${
                                    isBlocked
                                      ? "bg-red-950/60 border-red-700/80 text-red-300 line-through"
                                      : "bg-slate-800 border-slate-700 text-slate-200 hover:border-slate-500"
                                  }`}
                                  title={isBlocked ? "Click to allow this faculty" : "Click to block this faculty"}
                                >
                                  <span>{fName}</span>
                                  {fInfo?.rating_mean != null && (
                                    <span className="flex items-center gap-0.5 text-amber-300 font-semibold text-[10px]">
                                      <Star className="w-2.5 h-2.5 fill-amber-300" />
                                      {fInfo.rating_mean.toFixed(1)}
                                    </span>
                                  )}
                                  {fInfo?.low_sample && (
                                    <span className="text-[9px] text-slate-400 font-mono">(few reviews)</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Lock Offering Select */}
                        <div>
                          <label className="block text-slate-400 mb-1 font-medium">
                            Lock to a Specific Slot Offering:
                          </label>
                          <select
                            aria-label="Lock offering to specific slot"
                            value={cfg.locked_offering_id || ""}
                            onChange={(e) => updateCourseConfig(c.code, { locked_offering_id: e.target.value || null })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Any available slot (Solver decides)</option>
                            {offerings.map((off) => (
                              <option key={off.id} value={off.id}>
                                {off.faculty_name} • Theory: {off.theory_slots.join("+") || "None"} • Lab:{" "}
                                {off.lab_session?.labels.join("+") || "None"}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Constraints & Preferences Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            {/* Section Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-800 rounded-xl mb-5">
              <button
                type="button"
                onClick={() => setActiveConstraintTab("strict")}
                className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeConstraintTab === "strict"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                STRICT CONSTRAINTS
              </button>
              <button
                type="button"
                onClick={() => setActiveConstraintTab("preferences")}
                className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeConstraintTab === "preferences"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                PREFERENCES (WEIGHTS)
              </button>
            </div>

            {/* TAB 1: STRICT HARD CONSTRAINTS */}
            {activeConstraintTab === "strict" && (
              <div className="space-y-4 text-xs">
                {/* Max Daily Hours */}
                <div>
                  <label htmlFor="max-daily-hours-select" className="block text-slate-300 font-semibold mb-1">
                    Max Daily Class Hours
                  </label>
                  <select
                    id="max-daily-hours-select"
                    aria-label="Max Daily Class Hours"
                    value={hardConstraints.max_daily_hours ?? ""}
                    onChange={(e) =>
                      setHardConstraints({
                        max_daily_hours: e.target.value ? parseFloat(e.target.value) : null
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">No limit (up to university max)</option>
                    <option value="2.0">2.0 Hours (Very light)</option>
                    <option value="3.5">3.5 Hours (Balanced)</option>
                    <option value="5.0">5.0 Hours (Standard full load)</option>
                  </select>
                </div>

                {/* Max Consecutive Hours */}
                <div>
                  <label htmlFor="max-consec-hours-select" className="block text-slate-300 font-semibold mb-1">
                    Max Consecutive Hours Without Break
                  </label>
                  <select
                    id="max-consec-hours-select"
                    aria-label="Max Consecutive Hours Without Break"
                    value={hardConstraints.max_consecutive_hours ?? ""}
                    onChange={(e) =>
                      setHardConstraints({
                        max_consecutive_hours: e.target.value ? parseFloat(e.target.value) : null
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">No limit</option>
                    <option value="1.5">1.5 Hours max continuous</option>
                    <option value="2.0">2.0 Hours max continuous</option>
                    <option value="3.0">3.0 Hours max continuous</option>
                  </select>
                </div>

                {/* Day Pattern */}
                <div>
                  <label htmlFor="day-pattern-select" className="block text-slate-300 font-semibold mb-1">
                    Daily Schedule Pattern
                  </label>
                  <select
                    id="day-pattern-select"
                    aria-label="Daily Schedule Pattern"
                    value={hardConstraints.day_pattern}
                    onChange={(e) =>
                      setHardConstraints({ day_pattern: e.target.value as any })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ANY">Any time (Morning or Afternoon)</option>
                    <option value="MORNING_ONLY">Morning Only (Classes end before 13:20)</option>
                    <option value="AFTERNOON_ONLY">Afternoon Only (Classes start after 14:00)</option>
                    <option value="HALF_DAY">Half Day Only (Classes in either morning or afternoon per day)</option>
                  </select>
                </div>

                {/* Free Days Toggle */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">
                    Guaranteed Free Days (No classes on these days)
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {WEEKDAYS.map((day) => {
                      const isFree = hardConstraints.free_days.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const nextFree = isFree
                              ? hardConstraints.free_days.filter((d) => d !== day)
                              : [...hardConstraints.free_days, day];
                            setHardConstraints({ free_days: nextFree });
                          }}
                          className={`py-2 rounded-lg font-bold text-xs transition border ${
                            isFree
                              ? "bg-emerald-600 border-emerald-500 text-white"
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Allowed Days */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">
                    Allowed Working Days
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {WEEKDAYS.map((day) => {
                      const isAllowed = hardConstraints.allowed_days.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const nextAllowed = isAllowed
                              ? hardConstraints.allowed_days.filter((d) => d !== day)
                              : [...hardConstraints.allowed_days, day];
                            setHardConstraints({ allowed_days: nextAllowed });
                          }}
                          className={`py-2 rounded-lg font-bold text-xs transition border ${
                            isAllowed
                              ? "bg-indigo-600 border-indigo-500 text-white"
                              : "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Earliest Start / Latest End */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label htmlFor="earliest-start-select" className="block text-slate-400 mb-1">Earliest Start Time</label>
                    <select
                      id="earliest-start-select"
                      aria-label="Earliest Start Time"
                      value={hardConstraints.earliest_start_minute ?? ""}
                      onChange={(e) =>
                        setHardConstraints({
                          earliest_start_minute: e.target.value ? parseInt(e.target.value) : null
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      <option value="">No restriction (08:00)</option>
                      {ALL_TIME_OPTIONS.slice(0, -3).map((t) => (
                        <option key={t.min} value={t.min}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="latest-end-select" className="block text-slate-400 mb-1">Latest End Time</label>
                    <select
                      id="latest-end-select"
                      aria-label="Latest End Time"
                      value={hardConstraints.latest_end_minute ?? ""}
                      onChange={(e) =>
                        setHardConstraints({
                          latest_end_minute: e.target.value ? parseInt(e.target.value) : null
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      <option value="">No restriction (19:30)</option>
                      {ALL_TIME_OPTIONS.slice(3).map((t) => (
                        <option key={t.min} value={t.min}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SOFT PREFERENCES (WEIGHT SLIDERS & PRESETS) */}
            {activeConstraintTab === "preferences" && (
              <div className="space-y-5 text-xs">
                {/* Presets Bar */}
                <div>
                  <span className="text-slate-400 block mb-2 font-medium">Quick Optimization Presets:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyPreset("morning")}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold transition"
                    >
                      Morning Only
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("4day")}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold transition"
                    >
                      4-Day Week
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("mingap")}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold transition"
                    >
                      Minimal Gaps
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("reset")}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 transition flex items-center gap-1"
                      title="Reset constraints to defaults"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>
                </div>

                {/* Weight Sliders */}
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  {/* Minimize Gaps */}
                  <div>
                    <div className="flex justify-between text-slate-300 font-medium mb-1">
                      <span>Minimize Idle Waiting Gaps</span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {softPreferences.minimize_gaps_weight.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={softPreferences.minimize_gaps_weight}
                      onChange={(e) =>
                        setSoftPreferences({ minimize_gaps_weight: parseFloat(e.target.value) })
                      }
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Prefer Free Days */}
                  <div>
                    <div className="flex justify-between text-slate-300 font-medium mb-1">
                      <span>Maximize Full Free Days</span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {softPreferences.prefer_free_days_weight.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={softPreferences.prefer_free_days_weight}
                      onChange={(e) =>
                        setSoftPreferences({ prefer_free_days_weight: parseFloat(e.target.value) })
                      }
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Faculty Ratings */}
                  <div>
                    <div className="flex justify-between text-slate-300 font-medium mb-1">
                      <span>Favor High Faculty Ratings</span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {softPreferences.faculty_rating_weight.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={softPreferences.faculty_rating_weight}
                      onChange={(e) =>
                        setSoftPreferences({ faculty_rating_weight: parseFloat(e.target.value) })
                      }
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Compactness */}
                  <div>
                    <div className="flex justify-between text-slate-300 font-medium mb-1">
                      <span>Schedule Compactness (Short daily span)</span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {softPreferences.compactness_weight.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={softPreferences.compactness_weight}
                      onChange={(e) =>
                        setSoftPreferences({ compactness_weight: parseFloat(e.target.value) })
                      }
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
