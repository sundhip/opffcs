import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { WeeklyTimetable } from "../timetable/WeeklyTimetable";
import { ChevronLeft, ChevronRight, Star, Printer, Sparkles, SlidersHorizontal, Calendar, AlertCircle, GitCompare } from "lucide-react";
export const ResultsBrowser = () => {
    const { generationResult, currentResultIndex, setCurrentResultIndex, liveFilters, setLiveFilters, comparedTimetableIds, toggleCompareTimetable, clearComparedTimetables, favourites, toggleFavouriteTimetable, courses, setActiveTab } = useAppStore();
    const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
    const [favouriteModalTimetable, setFavouriteModalTimetable] = useState(null);
    const [favouriteName, setFavouriteName] = useState("");
    const courseTitlesMap = useMemo(() => {
        const map = {};
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
            list = list.filter((tt) => tt.free_days.includes(liveFilters.requiredFreeDay));
        }
        // Filter by max gap minutes
        if (liveFilters.maxGapMinutes != null) {
            list = list.filter((tt) => tt.longest_gap_minutes <= liveFilters.maxGapMinutes);
        }
        // Filter by required faculty name
        if (liveFilters.requiredFaculty) {
            const q = liveFilters.requiredFaculty.toLowerCase();
            list = list.filter((tt) => {
                return Object.values(tt.per_day_timeline).some((dayBlocks) => dayBlocks.some((b) => b.faculty_name.toLowerCase().includes(q)));
            });
        }
        // Sort
        if (liveFilters.sortBy === "fewest_gaps") {
            list.sort((a, b) => {
                const gapA = Object.values(a.gap_minutes_per_day).reduce((s, m) => s + m, 0);
                const gapB = Object.values(b.gap_minutes_per_day).reduce((s, m) => s + m, 0);
                return gapA - gapB;
            });
        }
        else if (liveFilters.sortBy === "most_free_days") {
            list.sort((a, b) => b.free_days.length - a.free_days.length);
        }
        else if (liveFilters.sortBy === "best_rating") {
            list.sort((a, b) => (b.avg_faculty_rating || 0) - (a.avg_faculty_rating || 0));
        }
        else if (liveFilters.sortBy === "earliest_finish") {
            list.sort((a, b) => (a.latest_end || "23:59").localeCompare(b.latest_end || "23:59"));
        }
        else {
            // Default: score descending
            list.sort((a, b) => b.score - a.score);
        }
        return list;
    }, [rawTimetables, liveFilters]);
    const currentTimetable = filteredTimetables[currentResultIndex];
    // Arrow key navigation listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
                return;
            if (e.key === "ArrowLeft") {
                if (currentResultIndex > 0)
                    setCurrentResultIndex(currentResultIndex - 1);
            }
            else if (e.key === "ArrowRight") {
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
        if (!currentTimetable)
            return false;
        const key = `tt:${currentTimetable.timetable_id}`;
        return favourites.some((f) => f.offering_key === key);
    }, [currentTimetable, favourites]);
    // If no generation result yet or 0 results
    if (!generationResult) {
        return (_jsx("div", { className: "max-w-4xl mx-auto py-16 px-4 text-center", children: _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-3xl p-12 shadow-xl", children: [_jsx(Calendar, { className: "w-16 h-16 text-indigo-400/80 mx-auto mb-4" }), _jsx("h3", { className: "text-xl font-bold text-slate-100", children: "No Generated Timetables Yet" }), _jsx("p", { className: "text-sm text-slate-400 mt-2 max-w-md mx-auto", children: "Select courses and configure constraints in the Planner, then click \"Generate Schedules\" to view conflict-free options." }), _jsx("button", { onClick: () => setActiveTab("planner"), className: "mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition", children: "Go to Planner" })] }) }));
    }
    // If infeasible
    if (filteredTimetables.length === 0) {
        const exp = generationResult.infeasible_explanation;
        return (_jsx("div", { className: "max-w-4xl mx-auto py-12 px-4", children: _jsxs("div", { className: "bg-slate-900 border border-red-900/60 rounded-3xl p-8 shadow-xl", children: [_jsxs("div", { className: "flex items-center gap-3 text-red-400 mb-4", children: [_jsx(AlertCircle, { className: "w-7 h-7" }), _jsx("h3", { className: "text-xl font-bold text-slate-100", children: "No Conflict-Free Timetable Found" })] }), _jsx("p", { className: "text-sm text-slate-300 leading-relaxed", children: exp?.diagnostic_summary || "The combination of selected courses and strict constraints has zero valid configurations." }), exp && exp.empty_domain_courses.length > 0 && (_jsxs("div", { className: "mt-4 p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-300", children: [_jsx("span", { className: "font-semibold text-slate-100 block mb-1", children: "Courses With 0 Valid Offerings Under Current Filters:" }), _jsx("span", { className: "font-mono text-indigo-300", children: exp.empty_domain_courses.join(", ") })] })), exp && exp.minimal_conflicting_subset.length > 0 && (_jsxs("div", { className: "mt-3 p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-300", children: [_jsx("span", { className: "font-semibold text-slate-100 block mb-1", children: "Minimal Conflicting Course Subset:" }), _jsx("span", { className: "font-mono text-amber-300", children: exp.minimal_conflicting_subset.join(", ") })] })), _jsx("div", { className: "mt-6 flex gap-3", children: _jsx("button", { onClick: () => setActiveTab("planner"), className: "px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition", children: "Adjust Constraints in Planner" }) })] }) }));
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
    return (_jsxs("div", { className: "space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "flex items-center gap-1 bg-slate-800 rounded-xl p-1 border border-slate-700", children: [_jsx("button", { onClick: () => setCurrentResultIndex(Math.max(0, currentResultIndex - 1)), disabled: currentResultIndex === 0, "aria-label": "Previous timetable", className: "p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:text-slate-300 transition", children: _jsx(ChevronLeft, { className: "w-5 h-5" }) }), _jsxs("span", { className: "px-3 text-xs font-mono font-bold text-slate-100", children: [currentResultIndex + 1, " / ", filteredTimetables.length] }), _jsx("button", { onClick: () => setCurrentResultIndex(Math.min(filteredTimetables.length - 1, currentResultIndex + 1)), disabled: currentResultIndex >= filteredTimetables.length - 1, "aria-label": "Next timetable", className: "p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:text-slate-300 transition", children: _jsx(ChevronRight, { className: "w-5 h-5" }) })] }), _jsxs("span", { className: "text-xs text-slate-400 hidden sm:inline", children: ["(of ", generationResult.total_valid, " total valid schedules)"] }), _jsx("span", { className: `px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${generationResult.is_exhaustive
                                    ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                                    : "bg-amber-950 text-amber-300 border-amber-800"}`, children: generationResult.is_exhaustive ? "Exhaustive" : "Partial (Time Cap)" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { "aria-label": "Bookmark this timetable", onClick: () => {
                                    if (currentTimetable) {
                                        setFavouriteName(`Schedule #${currentResultIndex + 1} (${currentTimetable.free_days.join(", ") || "5 days"})`);
                                        setFavouriteModalTimetable(currentTimetable);
                                    }
                                }, className: `px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${isCurrentFavourite
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                                    : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500"}`, children: [_jsx(Star, { className: `w-3.5 h-3.5 ${isCurrentFavourite ? "fill-amber-400 text-amber-400" : ""}` }), isCurrentFavourite ? "Favourited" : "Favourite"] }), _jsxs("button", { onClick: () => {
                                    if (currentTimetable)
                                        toggleCompareTimetable(currentTimetable.timetable_id);
                                }, className: `px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${currentTimetable && comparedTimetableIds.includes(currentTimetable.timetable_id)
                                    ? "bg-indigo-600 border-indigo-500 text-white"
                                    : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500"}`, children: [_jsx(GitCompare, { className: "w-3.5 h-3.5" }), "Compare (", comparedTimetableIds.length, "/3)"] }), comparedTimetableIds.length >= 2 && (_jsx("button", { onClick: () => setIsCompareModalOpen(true), className: "px-3 py-1.5 rounded-xl bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-400 transition", children: "View Comparison" })), _jsx("button", { onClick: () => window.print(), className: "p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition", title: "Print Timetable", children: _jsx(Printer, { className: "w-4 h-4" }) })] })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-4", children: [_jsxs("span", { className: "font-semibold text-slate-400 flex items-center gap-1.5", children: [_jsx(SlidersHorizontal, { className: "w-3.5 h-3.5 text-indigo-400" }), "Live Client Filters:"] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-slate-400", children: "Sort:" }), _jsxs("select", { value: liveFilters.sortBy, onChange: (e) => setLiveFilters({ sortBy: e.target.value }), className: "bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none", children: [_jsx("option", { value: "score", children: "Overall Score" }), _jsx("option", { value: "fewest_gaps", children: "Fewest Gaps" }), _jsx("option", { value: "most_free_days", children: "Most Free Days" }), _jsx("option", { value: "best_rating", children: "Best Faculty Rating" }), _jsx("option", { value: "earliest_finish", children: "Earliest Daily Finish" })] })] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-slate-400", children: "Must Have Free:" }), _jsxs("select", { value: liveFilters.requiredFreeDay || "", onChange: (e) => setLiveFilters({ requiredFreeDay: e.target.value || null }), className: "bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none", children: [_jsx("option", { value: "", children: "Any Free Days" }), _jsx("option", { value: "MON", children: "Monday Free" }), _jsx("option", { value: "FRI", children: "Friday Free" }), _jsx("option", { value: "WED", children: "Wednesday Free" })] })] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-slate-400", children: "Max Gap:" }), _jsxs("select", { value: liveFilters.maxGapMinutes ?? "", onChange: (e) => setLiveFilters({
                                            maxGapMinutes: e.target.value ? parseInt(e.target.value) : null
                                        }), className: "bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none", children: [_jsx("option", { value: "", children: "Any Gap" }), _jsx("option", { value: "60", children: "\u2264 60 mins" }), _jsx("option", { value: "120", children: "\u2264 2 hours" })] })] })] }), currentTimetable && (_jsx("div", { className: "flex items-center gap-3", children: _jsxs("div", { className: "flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-700", children: [_jsx(Sparkles, { className: "w-3.5 h-3.5 text-indigo-400" }), _jsx("span", { className: "text-slate-400", children: "Overall Score:" }), _jsx("span", { className: "font-bold text-slate-100 font-mono", children: currentTimetable.score.toFixed(3) })] }) }))] }), currentTimetable && (_jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-5 gap-3", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-xl p-3 text-center", children: [_jsx("span", { className: "text-[10px] text-slate-400 font-semibold uppercase block", children: "Free Days" }), _jsx("span", { className: "text-sm font-bold text-emerald-400 mt-0.5 block", children: currentTimetable.free_days.length > 0 ? currentTimetable.free_days.join(", ") : "0 days" })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-xl p-3 text-center", children: [_jsx("span", { className: "text-[10px] text-slate-400 font-semibold uppercase block", children: "Weekly Class Time" }), _jsxs("span", { className: "text-sm font-bold text-slate-100 mt-0.5 block", children: [(totalWeeklyClassMinutes / 60).toFixed(1), " hrs"] })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-xl p-3 text-center", children: [_jsx("span", { className: "text-[10px] text-slate-400 font-semibold uppercase block", children: "Total Idle Gaps" }), _jsxs("span", { className: "text-sm font-bold text-indigo-300 mt-0.5 block", children: [totalGapMinutes, " mins"] })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-xl p-3 text-center", children: [_jsx("span", { className: "text-[10px] text-slate-400 font-semibold uppercase block", children: "Daily Window" }), _jsxs("span", { className: "text-sm font-bold text-slate-100 mt-0.5 block", children: [currentTimetable.earliest_start || "--", " \u2013 ", currentTimetable.latest_end || "--"] })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-xl p-3 text-center col-span-2 sm:col-span-1", children: [_jsx("span", { className: "text-[10px] text-slate-400 font-semibold uppercase block", children: "Avg Faculty Rating" }), _jsx("span", { className: "text-sm font-bold text-amber-300 mt-0.5 block", children: currentTimetable.avg_faculty_rating != null
                                    ? `${currentTimetable.avg_faculty_rating.toFixed(2)} ★`
                                    : "Unrated" })] })] })), currentTimetable && (_jsx(WeeklyTimetable, { timeline: currentTimetable.per_day_timeline, courseTitles: courseTitlesMap, title: `Conflict-Free Timetable (ID: ${currentTimetable.timetable_id})`, subtitle: `Score: ${currentTimetable.score.toFixed(3)} • Working Days: ${currentTimetable.working_days.join(", ")}` })), favouriteModalTimetable && (_jsx("div", { className: "fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50", onClick: () => setFavouriteModalTimetable(null), children: _jsxs("div", { className: "bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl relative", onClick: (e) => e.stopPropagation(), children: [_jsxs("h4", { className: "text-lg font-bold text-slate-100 flex items-center gap-2", children: [_jsx(Star, { className: "w-5 h-5 text-amber-400 fill-amber-400" }), "Save Timetable to Favourites"] }), _jsx("p", { className: "text-xs text-slate-400 mt-1", children: "Give this timetable a custom nickname to quickly compare or reopen it later in the Planner." }), _jsxs("div", { className: "mt-4", children: [_jsx("label", { className: "block text-xs font-semibold text-slate-300 mb-1", children: "Schedule Name" }), _jsx("input", { type: "text", value: favouriteName, onChange: (e) => setFavouriteName(e.target.value), className: "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" })] }), _jsxs("div", { className: "mt-6 flex justify-end gap-3", children: [_jsx("button", { onClick: () => setFavouriteModalTimetable(null), className: "px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition", children: "Cancel" }), _jsx("button", { onClick: async () => {
                                        await toggleFavouriteTimetable(favouriteName || "Saved Timetable", favouriteModalTimetable.offering_keys, favouriteModalTimetable);
                                        setFavouriteModalTimetable(null);
                                    }, className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition", children: "Save to Favourites" })] })] }) })), isCompareModalOpen && (_jsx("div", { className: "fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto", onClick: () => setIsCompareModalOpen(false), children: _jsxs("div", { className: "bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-6xl w-full shadow-2xl my-8 relative", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 pb-4 mb-6", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-xl font-bold text-slate-100 flex items-center gap-2", children: [_jsx(GitCompare, { className: "w-5 h-5 text-indigo-400" }), "Timetable Comparison (", comparedTimetableIds.length, " Schedules)"] }), _jsx("p", { className: "text-xs text-slate-400 mt-1", children: "Comparing key schedule metrics, free days, gaps, and faculty choices across your selected schedules." })] }), _jsx("button", { onClick: () => setIsCompareModalOpen(false), className: "p-1 rounded-lg text-slate-400 hover:text-white text-lg font-bold", children: "\u2715" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: comparedTimetableIds.map((id, idx) => {
                                const tt = rawTimetables.find((t) => t.timetable_id === id);
                                if (!tt)
                                    return null;
                                return (_jsxs("div", { className: "bg-slate-800/60 border border-slate-700 rounded-2xl p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "font-bold text-sm text-slate-100 font-mono", children: ["Schedule #", idx + 1] }), _jsxs("span", { className: "text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50", children: ["Score: ", tt.score.toFixed(3)] })] }), _jsxs("div", { className: "space-y-1.5 text-xs text-slate-300", children: [_jsxs("div", { className: "flex justify-between border-b border-slate-700/60 pb-1", children: [_jsx("span", { className: "text-slate-400", children: "Free Days:" }), _jsx("span", { className: "font-bold text-emerald-400", children: tt.free_days.length > 0 ? tt.free_days.join(", ") : "None" })] }), _jsxs("div", { className: "flex justify-between border-b border-slate-700/60 pb-1", children: [_jsx("span", { className: "text-slate-400", children: "Total Idle Gaps:" }), _jsxs("span", { className: "font-bold text-slate-200", children: [Object.values(tt.gap_minutes_per_day).reduce((s, m) => s + m, 0), " mins"] })] }), _jsxs("div", { className: "flex justify-between border-b border-slate-700/60 pb-1", children: [_jsx("span", { className: "text-slate-400", children: "Daily Span:" }), _jsxs("span", { className: "font-bold text-slate-200", children: [tt.earliest_start || "--", " \u2013 ", tt.latest_end || "--"] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-400", children: "Avg Faculty Rating:" }), _jsx("span", { className: "font-bold text-amber-300", children: tt.avg_faculty_rating != null ? `${tt.avg_faculty_rating.toFixed(2)} ★` : "Unrated" })] })] }), _jsxs("div", { className: "pt-2", children: [_jsx("span", { className: "text-[11px] font-semibold text-slate-400 block mb-1", children: "Faculty Selected:" }), _jsx("div", { className: "space-y-1", children: Object.values(tt.per_day_timeline).flatMap((blocks) => blocks.map((b) => (_jsxs("div", { className: "text-[10px] text-slate-300 flex justify-between", children: [_jsxs("span", { className: "font-mono", children: [b.course_code, ":"] }), _jsx("span", { className: "truncate max-w-[140px]", children: b.faculty_name })] }, `${b.course_code}-${b.slot_label}`)))).slice(0, 7) })] })] }, id));
                            }) })] }) }))] }));
};
