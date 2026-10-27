import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";
import { api } from "../../services/api";
import { Search, Star, User, MessageSquare, AlertTriangle, GitCompare, ShieldAlert, ArrowRight } from "lucide-react";
export const FacultyView = () => {
    const { facultyList, selectedFacultyId, setSelectedFacultyId, compareFacultyIds, toggleFacultyForComparison, clearFacultyComparison, updateCourseConfig, setActiveTab, courses } = useAppStore();
    const [search, setSearch] = useState("");
    const [minRating, setMinRating] = useState(null);
    const [sortBy, setSortBy] = useState("rating");
    const [hasReviewsOnly, setHasReviewsOnly] = useState(false);
    // Detail Drawer state
    const [facultyDetail, setFacultyDetail] = useState(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [reviewSearch, setReviewSearch] = useState("");
    const [reviewsOffset, setReviewsOffset] = useState(0);
    // Comparison view modal
    const [isCompareOpen, setIsCompareOpen] = useState(false);
    const [compareData, setCompareData] = useState([]);
    const [isLoadingCompare, setIsLoadingCompare] = useState(false);
    // Fetch detail when selectedFacultyId changes
    useEffect(() => {
        if (!selectedFacultyId) {
            setFacultyDetail(null);
            return;
        }
        let isMounted = true;
        setIsLoadingDetail(true);
        api
            .getFacultyDetail(selectedFacultyId, reviewSearch, 15, reviewsOffset)
            .then((data) => {
            if (isMounted)
                setFacultyDetail(data);
        })
            .catch((err) => console.error("Failed to load faculty detail", err))
            .finally(() => {
            if (isMounted)
                setIsLoadingDetail(false);
        });
        return () => {
            isMounted = false;
        };
    }, [selectedFacultyId, reviewSearch, reviewsOffset]);
    // Fetch comparison data when modal opens
    useEffect(() => {
        if (!isCompareOpen || compareFacultyIds.length < 2)
            return;
        setIsLoadingCompare(true);
        api
            .compareFaculty(compareFacultyIds)
            .then((res) => setCompareData(res.items))
            .catch((err) => console.error("Failed to compare faculty", err))
            .finally(() => setIsLoadingCompare(false));
    }, [isCompareOpen, compareFacultyIds]);
    // Filtered faculty list
    const filteredFaculty = useMemo(() => {
        let list = [...facultyList];
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter((f) => f.canonical_name.toLowerCase().includes(q));
        }
        if (minRating != null) {
            list = list.filter((f) => f.rating_mean != null && f.rating_mean >= minRating);
        }
        if (hasReviewsOnly) {
            list = list.filter((f) => f.review_count > 0);
        }
        if (sortBy === "rating") {
            list.sort((a, b) => {
                if (a.rating_mean == null && b.rating_mean == null)
                    return 0;
                if (a.rating_mean == null)
                    return 1;
                if (b.rating_mean == null)
                    return -1;
                return b.rating_mean - a.rating_mean;
            });
        }
        else if (sortBy === "reviews") {
            list.sort((a, b) => b.review_count - a.review_count);
        }
        else {
            list.sort((a, b) => a.canonical_name.localeCompare(b.canonical_name));
        }
        return list;
    }, [facultyList, search, minRating, hasReviewsOnly, sortBy]);
    return (_jsxs("div", { className: "space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-xl font-bold text-slate-100 flex items-center gap-2", children: [_jsx(User, { className: "w-5 h-5 text-indigo-400" }), "Faculty Directory & Reviews"] }), _jsx("p", { className: "text-xs text-slate-400 mt-1", children: "Browse verified ratings, read contextual student feedback, and compare professors." })] }), compareFacultyIds.length >= 2 && (_jsxs("button", { onClick: () => setIsCompareOpen(true), className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md transition", children: [_jsx(GitCompare, { className: "w-4 h-4" }), "Compare Selected (", compareFacultyIds.length, ")"] }))] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-4", children: [_jsxs("div", { className: "relative w-64", children: [_jsx(Search, { className: "w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" }), _jsx("input", { type: "text", placeholder: "Search faculty name...", value: search, onChange: (e) => setSearch(e.target.value), className: "w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" })] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-slate-400", children: "Min Rating:" }), _jsxs("select", { value: minRating ?? "", onChange: (e) => setMinRating(e.target.value ? parseFloat(e.target.value) : null), className: "bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none", children: [_jsx("option", { value: "", children: "Any" }), _jsx("option", { value: "3.0", children: "3.0 \u2605 & Above" }), _jsx("option", { value: "4.0", children: "4.0 \u2605 & Above" }), _jsx("option", { value: "4.5", children: "4.5 \u2605 & Above" })] })] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-slate-400", children: "Sort By:" }), _jsxs("select", { value: sortBy, onChange: (e) => setSortBy(e.target.value), className: "bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none", children: [_jsx("option", { value: "rating", children: "Highest Rating" }), _jsx("option", { value: "reviews", children: "Most Reviews" }), _jsx("option", { value: "name", children: "Alphabetical" })] })] }), _jsxs("label", { className: "flex items-center gap-1.5 text-slate-300 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: hasReviewsOnly, onChange: (e) => setHasReviewsOnly(e.target.checked), className: "rounded bg-slate-800 border-slate-700 text-indigo-600" }), _jsx("span", { children: "Has Reviews Only" })] })] }), _jsxs("span", { className: "text-slate-400", children: ["Showing ", filteredFaculty.length, " of ", facultyList.length, " faculty"] })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: filteredFaculty.map((f) => {
                    const isCompared = compareFacultyIds.includes(f.id);
                    return (_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition flex flex-col justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("h3", { className: "font-bold text-slate-100 text-sm leading-snug", children: f.canonical_name }), f.rating_mean != null ? (_jsxs("span", { className: "px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold font-mono flex items-center gap-1 flex-shrink-0", children: [_jsx(Star, { className: "w-3 h-3 fill-amber-400 text-amber-400" }), f.rating_mean.toFixed(2)] })) : (_jsx("span", { className: "px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-medium border border-slate-700 flex-shrink-0", children: "Unrated" }))] }), _jsxs("div", { className: "flex items-center gap-3 mt-2 text-xs text-slate-400", children: [_jsxs("span", { className: "flex items-center gap-1", children: [_jsx(MessageSquare, { className: "w-3 h-3 text-slate-500" }), f.review_count, " review(s)"] }), f.low_sample && (_jsxs("span", { className: "text-[10px] text-amber-400/90 flex items-center gap-0.5", children: [_jsx(AlertTriangle, { className: "w-3 h-3 text-amber-400" }), "few reviews"] }))] })] }), _jsxs("div", { className: "flex items-center justify-between pt-3 border-t border-slate-800 text-xs", children: [_jsx("button", { type: "button", onClick: () => toggleFacultyForComparison(f.id), className: `px-2.5 py-1 rounded-lg border text-[11px] font-medium transition ${isCompared
                                            ? "bg-indigo-600 border-indigo-500 text-white"
                                            : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"}`, children: isCompared ? "In Comparison" : "+ Compare" }), _jsxs("button", { type: "button", onClick: () => {
                                            setSelectedFacultyId(f.id);
                                            setReviewsOffset(0);
                                            setReviewSearch("");
                                        }, className: "px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold flex items-center gap-1 transition", children: [_jsx("span", { children: "Reviews & Info" }), _jsx(ArrowRight, { className: "w-3 h-3 text-indigo-400" })] })] })] }, f.id));
                }) }), selectedFacultyId && (_jsx("div", { className: "fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-end z-50 overflow-hidden", onClick: () => setSelectedFacultyId(null), children: _jsxs("div", { className: "bg-slate-900 border-l border-slate-700 w-full max-w-2xl h-full shadow-2xl flex flex-col justify-between overflow-hidden", onClick: (e) => e.stopPropagation(), role: "dialog", "aria-modal": "true", children: [_jsxs("div", { className: "p-6 border-b border-slate-800 flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-xl font-bold text-slate-100", children: facultyDetail?.canonical_name || "Loading Faculty Details..." }), _jsxs("span", { className: "text-xs text-slate-400 block mt-0.5", children: ["Raw Name in Offerings: ", facultyDetail?.raw_name || "--"] }), facultyDetail?.rating_summary && (_jsxs("div", { className: "flex flex-wrap items-center gap-3 mt-3", children: [_jsxs("span", { className: "px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-sm font-bold font-mono flex items-center gap-1.5", children: [_jsx(Star, { className: "w-4 h-4 fill-amber-400 text-amber-400" }), facultyDetail.rating_summary.rating_mean?.toFixed(2) || "Unrated", " / 5.0"] }), _jsxs("span", { className: "text-xs text-slate-300", children: ["Based on ", facultyDetail.rating_summary.rated_count, " explicit rating(s) and", " ", facultyDetail.rating_summary.review_count, " matched review(s)"] })] }))] }), _jsx("button", { onClick: () => setSelectedFacultyId(null), className: "p-1 rounded-lg text-slate-400 hover:text-white text-lg font-bold", children: "\u2715" })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-6 space-y-6", children: isLoadingDetail ? (_jsx("div", { className: "text-center py-12 text-slate-400 text-sm", children: "Loading faculty details and reviews..." })) : facultyDetail ? (_jsxs(_Fragment, { children: [facultyDetail.ambiguous_count > 0 && (_jsxs("div", { className: "bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 text-xs text-amber-200 flex items-center gap-2", children: [_jsx(ShieldAlert, { className: "w-4 h-4 text-amber-400 flex-shrink-0" }), _jsxs("span", { children: [facultyDetail.ambiguous_count, " ambiguous / weak review match(es) mentioning this name were strictly excluded from the rating calculation for safety."] })] })), facultyDetail.rating_summary && (_jsxs("div", { className: "bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-2 text-xs", children: [_jsx("span", { className: "font-semibold text-slate-200 block mb-2", children: "Rating Distribution (1 to 5 Stars):" }), [5, 4, 3, 2, 1].map((star) => {
                                                const count = facultyDetail.rating_summary?.rating_distribution[star.toString()] || 0;
                                                const total = facultyDetail.rating_summary?.rated_count || 1;
                                                const pct = Math.round((count / total) * 100);
                                                return (_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("span", { className: "w-12 text-slate-400 font-mono flex items-center gap-1", children: [star, " ", _jsx(Star, { className: "w-3 h-3 text-amber-400 fill-amber-400" })] }), _jsx("div", { className: "flex-1 h-2 bg-slate-700 rounded-full overflow-hidden", children: _jsx("div", { className: "h-full bg-amber-400 rounded-full", style: { width: `${pct}%` } }) }), _jsx("span", { className: "w-10 text-right text-slate-400 font-mono text-[11px]", children: count })] }, star));
                                            })] })), _jsxs("div", { children: [_jsx("span", { className: "font-semibold text-slate-200 text-xs block mb-2", children: "Courses & Slots Taught:" }), _jsx("div", { className: "space-y-2", children: facultyDetail.offerings.map((off) => (_jsxs("div", { className: "bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 text-xs flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("span", { className: "font-bold text-slate-100 font-mono", children: off.course_code }), _jsx("span", { className: "text-slate-400 ml-2", children: off.course_title }), _jsxs("div", { className: "text-[11px] text-slate-400 mt-1", children: ["Theory: ", off.theory_slots.join("+") || "None", " \u2022 Lab:", " ", off.lab_session?.labels.join("+") || "None"] })] }), off.venue && (_jsx("span", { className: "px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-slate-300", children: off.venue }))] }, off.id))) })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between gap-4 mb-3", children: [_jsxs("span", { className: "font-semibold text-slate-200 text-xs", children: ["Student Reviews (", facultyDetail.reviews.total, "):"] }), _jsxs("div", { className: "relative w-48", children: [_jsx(Search, { className: "w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" }), _jsx("input", { type: "text", placeholder: "Search reviews...", value: reviewSearch, onChange: (e) => {
                                                                    setReviewSearch(e.target.value);
                                                                    setReviewsOffset(0);
                                                                }, className: "w-full pl-8 pr-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none" })] })] }), _jsx("div", { className: "space-y-3", children: facultyDetail.reviews.items.length === 0 ? (_jsx("p", { className: "text-xs text-slate-500 py-4 text-center", children: "No reviews found matching your search." })) : (facultyDetail.reviews.items.map((r) => (_jsxs("div", { className: "bg-slate-800/70 border border-slate-700/80 rounded-xl p-3.5 space-y-2 text-xs", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [r.explicit_rating != null ? (_jsxs("span", { className: "px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold font-mono text-[11px]", children: [r.explicit_rating, " / 5.0 \u2605"] })) : (_jsx("span", { className: "text-[10px] text-slate-500 font-mono", children: "No explicit score" })), _jsx("span", { className: "text-[10px] text-slate-400 font-mono", children: r.timestamp ? r.timestamp.slice(0, 10) : "Review" })] }), _jsx("p", { className: "text-slate-200 leading-relaxed font-sans whitespace-pre-wrap select-text", children: r.text }), _jsxs("div", { className: "flex items-center justify-between pt-1 border-t border-slate-700/50 text-[10px] text-slate-400 font-mono", children: [_jsxs("span", { className: "truncate max-w-[200px]", children: ["Source: ", r.source_zip ? r.source_zip.replace(".zip", "") : "WhatsApp Chat"] }), _jsxs("span", { children: ["Match score: ", (r.match_score * 100).toFixed(0), "%"] })] })] }, r.review_id)))) })] })] })) : null })] }) })), isCompareOpen && (_jsx("div", { className: "fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto", onClick: () => setIsCompareOpen(false), children: _jsxs("div", { className: "bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-5xl w-full shadow-2xl my-8 relative", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 pb-4 mb-6", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-xl font-bold text-slate-100 flex items-center gap-2", children: [_jsx(GitCompare, { className: "w-5 h-5 text-indigo-400" }), "Faculty Comparison"] }), _jsx("p", { className: "text-xs text-slate-400 mt-1", children: "Side-by-side comparison of ratings, offerings, and student review metrics." })] }), _jsx("button", { onClick: () => setIsCompareOpen(false), className: "p-1 rounded-lg text-slate-400 hover:text-white text-lg font-bold", children: "\u2715" })] }), isLoadingCompare ? (_jsx("div", { className: "text-center py-12 text-slate-400 text-sm", children: "Loading comparison metrics..." })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: compareData.map((item) => (_jsxs("div", { className: "bg-slate-800/60 border border-slate-700 rounded-2xl p-4 space-y-4", children: [_jsxs("div", { children: [_jsx("h4", { className: "font-bold text-sm text-slate-100", children: item.canonical_name }), _jsxs("div", { className: "mt-2 flex items-center gap-2", children: [item.rating_summary?.rating_mean != null ? (_jsxs("span", { className: "px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold font-mono text-xs border border-amber-500/40", children: [item.rating_summary.rating_mean.toFixed(2), " \u2605"] })) : (_jsx("span", { className: "text-xs text-slate-400", children: "Unrated" })), _jsxs("span", { className: "text-xs text-slate-400", children: ["(", item.rating_summary?.review_count || 0, " reviews)"] })] })] }), _jsxs("div", { className: "space-y-1.5 text-xs text-slate-300 border-t border-slate-700 pt-3", children: [_jsx("div", { className: "text-[11px] font-semibold text-slate-400", children: "Courses Taught:" }), item.courses_taught.map((cStr) => (_jsxs("div", { className: "text-xs text-slate-200 truncate", children: ["\u2022 ", cStr] }, cStr)))] }), _jsx("button", { onClick: () => {
                                            // Apply allow list for this faculty
                                            item.courses_taught.forEach((cStr) => {
                                                const code = cStr.split(" ")[0];
                                                updateCourseConfig(code, {
                                                    allowed_theory_faculty: [item.canonical_name]
                                                });
                                            });
                                            setIsCompareOpen(false);
                                            setActiveTab("planner");
                                        }, className: "w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition", children: "Use in Planner" })] }, item.id))) }))] }) }))] }));
};
