import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useAppStore } from "../../store/useAppStore";
import { HelpCircle, CheckCircle, UserCheck } from "lucide-react";
export const MatchResolutionPage = () => {
    const { facultyList, loadInitialData } = useAppStore();
    const [queue, setQueue] = useState([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [selectedFacultyForReview, setSelectedFacultyForReview] = useState({});
    const [successMessage, setSuccessMessage] = useState(null);
    const fetchQueue = async () => {
        setIsLoading(true);
        try {
            const data = await api.getMatchQueue(statusFilter === "ALL" ? undefined : statusFilter, 50, 0);
            setQueue(data.items);
            setTotal(data.total);
        }
        catch (err) {
            console.error("Failed to fetch match queue", err);
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        fetchQueue();
    }, [statusFilter]);
    const handleDecision = async (reviewId, decision, facultyId) => {
        try {
            await api.decideMatch(reviewId, decision, facultyId, "Resolved via UI Match Queue");
            setSuccessMessage(`Decision saved for review. Affected faculty ratings recalculated.`);
            setTimeout(() => setSuccessMessage(null), 3000);
            // Remove from local list
            setQueue((prev) => prev.filter((item) => item.review_id !== reviewId));
            setTotal((prev) => Math.max(0, prev - 1));
            // Refresh faculty in background
            loadInitialData();
        }
        catch (err) {
            alert(`Error saving decision: ${err.message}`);
        }
    };
    return (_jsxs("div", { className: "space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-xl font-bold text-slate-100 flex items-center gap-2", children: [_jsx(HelpCircle, { className: "w-5 h-5 text-indigo-400" }), "Human Review: Match Resolution Queue"] }), _jsx("p", { className: "text-xs text-slate-400 mt-1", children: "Resolve borderline or ambiguous student review mentions to improve faculty rating accuracy." })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-xs text-slate-400", children: "Filter Status:" }), _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none", children: [_jsx("option", { value: "ALL", children: "All Unresolved (Ambiguous & Weak)" }), _jsx("option", { value: "AMBIGUOUS", children: "Ambiguous Only" }), _jsx("option", { value: "WEAK", children: "Weak Only" })] }), _jsxs("span", { className: "px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300", children: [total, " Pending"] })] })] }), successMessage && (_jsxs("div", { className: "p-3 bg-emerald-950/70 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-center gap-2", children: [_jsx(CheckCircle, { className: "w-4 h-4 text-emerald-400" }), _jsx("span", { children: successMessage })] })), isLoading ? (_jsx("div", { className: "text-center py-12 text-slate-400 text-sm", children: "Loading queue items..." })) : queue.length === 0 ? (_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto", children: [_jsx(CheckCircle, { className: "w-12 h-12 text-emerald-400 mx-auto mb-3" }), _jsx("h3", { className: "text-base font-bold text-slate-200", children: "Match Queue Clear" }), _jsx("p", { className: "text-xs text-slate-400 mt-1", children: "All reviews have either been verified, assigned to unambiguous faculty, or resolved." })] })) : (_jsx("div", { className: "space-y-4", children: queue.map((item) => {
                    const selectedCustomFac = selectedFacultyForReview[item.review_id] || "";
                    return (_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between gap-4 text-xs", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: `px-2.5 py-0.5 rounded-full font-semibold border ${item.status === "AMBIGUOUS"
                                                    ? "bg-amber-950 text-amber-300 border-amber-800/60"
                                                    : "bg-slate-800 text-slate-400 border-slate-700"}`, children: item.status }), _jsxs("span", { className: "font-mono text-slate-400", children: ["Score: ", (item.score * 100).toFixed(0), "%"] }), item.explicit_rating != null && (_jsxs("span", { className: "px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold font-mono", children: [item.explicit_rating, " / 5.0 \u2605"] }))] }), _jsxs("span", { className: "text-[10px] text-slate-500 font-mono", children: [item.timestamp ? item.timestamp.slice(0, 10) : "Review", " \u2022 Source:", " ", item.source_zip ? item.source_zip.replace(".zip", "") : "Chat"] })] }), _jsx("div", { className: "p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap select-text", children: item.text }), item.candidates && item.candidates.length > 0 && (_jsxs("div", { children: [_jsx("span", { className: "text-[11px] font-semibold text-slate-400 block mb-2", children: "Algorithm Candidate Matches:" }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5", children: item.candidates.map((cand) => (_jsxs("div", { className: "bg-slate-800/90 border border-slate-700/90 rounded-xl p-3 flex flex-col justify-between gap-2", children: [_jsxs("div", { children: [_jsx("span", { className: "font-bold text-xs text-slate-100 block", children: cand.canonical_name }), _jsxs("span", { className: "text-[10px] text-indigo-400 font-mono", children: ["Match Confidence: ", (cand.score * 100).toFixed(0), "%"] }), cand.reasons.length > 0 && (_jsx("div", { className: "text-[10px] text-slate-400 mt-1", children: cand.reasons.join(", ") }))] }), _jsxs("button", { type: "button", onClick: () => handleDecision(item.review_id, "MATCHED", cand.faculty_id), className: "w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition", children: [_jsx(UserCheck, { className: "w-3.5 h-3.5" }), "Accept Candidate"] })] }, cand.faculty_id))) })] })), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-slate-400", children: "Choose Different Faculty:" }), _jsxs("select", { value: selectedCustomFac, onChange: (e) => setSelectedFacultyForReview({
                                                    ...selectedFacultyForReview,
                                                    [item.review_id]: e.target.value
                                                }), className: "bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none", children: [_jsx("option", { value: "", children: "Select from directory..." }), facultyList.map((f) => (_jsx("option", { value: f.id, children: f.canonical_name }, f.id)))] }), _jsx("button", { type: "button", disabled: !selectedCustomFac, onClick: () => handleDecision(item.review_id, "MATCHED", selectedCustomFac), className: "px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-semibold transition", children: "Assign" })] }), _jsx("button", { type: "button", onClick: () => handleDecision(item.review_id, "IGNORE"), className: "px-3 py-1 bg-slate-800 hover:bg-red-950/60 border border-slate-700 hover:border-red-700 text-slate-400 hover:text-red-300 rounded-lg transition", children: "Not Faculty / Ignore" })] })] }, item.review_id));
                }) }))] }));
};
