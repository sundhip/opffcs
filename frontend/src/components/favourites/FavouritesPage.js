import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { api } from "../../services/api";
import { Star, Trash2, Edit2, Play, AlertTriangle, Check } from "lucide-react";
export const FavouritesPage = () => {
    const { favourites, loadFavourites, reopenFavouriteInPlanner, setActiveTab } = useAppStore();
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editNotes, setEditNotes] = useState("");
    const handleStartEdit = (f) => {
        setEditingId(f.id);
        setEditName(f.name);
        setEditNotes(f.notes || "");
    };
    const handleSaveEdit = async (id) => {
        try {
            await api.updateFavourite(id, editName, editNotes);
            await loadFavourites();
            setEditingId(null);
        }
        catch (err) {
            console.error("Failed to update favourite", err);
        }
    };
    const handleDelete = async (id) => {
        try {
            await api.deleteFavourite(id);
            await loadFavourites();
        }
        catch (err) {
            console.error("Failed to delete favourite", err);
        }
    };
    return (_jsxs("div", { className: "space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-xl font-bold text-slate-100 flex items-center gap-2", children: [_jsx(Star, { className: "w-5 h-5 text-amber-400 fill-amber-400" }), "Bookmarked & Favourite Timetables"] }), _jsx("p", { className: "text-xs text-slate-400 mt-1", children: "Re-open any saved timetable in the Planner, edit notes, or check for dataset staleness." })] }), _jsxs("span", { className: "px-3 py-1 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300", children: [favourites.length, " Saved Schedule(s)"] })] }), favourites.length === 0 ? (_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto", children: [_jsx(Star, { className: "w-12 h-12 text-slate-600 mx-auto mb-3" }), _jsx("h3", { className: "text-base font-bold text-slate-200", children: "No Favourites Saved Yet" }), _jsx("p", { className: "text-xs text-slate-400 mt-1", children: "When browsing generated schedules in the Results tab, click \"Favourite\" to save them here." }), _jsx("button", { onClick: () => setActiveTab("planner"), className: "mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition", children: "Go to Planner" })] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: favourites.map((f) => {
                    const isEditing = editingId === f.id;
                    const ttPayload = f.payload?.timetable;
                    return (_jsxs("div", { className: `bg-slate-900 border rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4 transition ${f.is_stale ? "border-amber-700/80 ring-1 ring-amber-600/50" : "border-slate-800 hover:border-slate-700"}`, children: [_jsxs("div", { children: [f.is_stale && (_jsxs("div", { className: "mb-3 p-2.5 bg-amber-950/60 border border-amber-800/80 rounded-xl text-[11px] text-amber-300 flex items-start gap-2", children: [_jsx(AlertTriangle, { className: "w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" }), _jsxs("div", { children: [_jsx("span", { className: "font-bold block", children: "Dataset Staleness Warning:" }), _jsx("span", { children: f.stale_reason || "One or more offerings in this favourite are missing from the active dataset." })] })] })), isEditing ? (_jsxs("div", { className: "space-y-2", children: [_jsx("input", { type: "text", value: editName, onChange: (e) => setEditName(e.target.value), className: "w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-sm text-slate-100 font-bold focus:outline-none" }), _jsx("input", { type: "text", placeholder: "Add notes...", value: editNotes, onChange: (e) => setEditNotes(e.target.value), className: "w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { onClick: () => handleSaveEdit(f.id), className: "px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-semibold flex items-center gap-1", children: [_jsx(Check, { className: "w-3 h-3" }), " Save"] }), _jsx("button", { onClick: () => setEditingId(null), className: "px-2.5 py-1 bg-slate-800 text-slate-300 rounded text-xs", children: "Cancel" })] })] })) : (_jsxs("div", { children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("h3", { className: "font-bold text-slate-100 text-base leading-snug", children: f.name }), _jsx("button", { onClick: () => handleStartEdit(f), className: "p-1 text-slate-400 hover:text-slate-200", title: "Rename favourite", children: _jsx(Edit2, { className: "w-3.5 h-3.5" }) })] }), f.notes && _jsx("p", { className: "text-xs text-slate-400 mt-1", children: f.notes })] })), ttPayload ? (_jsxs("div", { className: "mt-3 space-y-1.5 text-xs text-slate-300 border-t border-slate-800 pt-3", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-400", children: "Score:" }), _jsx("span", { className: "font-mono font-bold text-indigo-300", children: ttPayload.score ? ttPayload.score.toFixed(3) : "--" })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-400", children: "Free Days:" }), _jsx("span", { className: "font-bold text-emerald-400", children: ttPayload.free_days?.length > 0 ? ttPayload.free_days.join(", ") : "0 days" })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-400", children: "Span:" }), _jsxs("span", { className: "font-mono", children: [ttPayload.earliest_start || "--", " \u2013 ", ttPayload.latest_end || "--"] })] })] })) : f.offering_details ? (_jsxs("div", { className: "mt-3 text-xs text-slate-300 space-y-1 border-t border-slate-800 pt-3", children: [_jsxs("div", { children: ["Course: ", f.course?.code, " - ", f.course?.title] }), _jsxs("div", { children: ["Faculty: ", f.faculty?.canonical_name] }), _jsxs("div", { children: ["Slots: ", f.offering_details.theory_slots?.join("+") || "Lab"] })] })) : null] }), _jsxs("div", { className: "flex items-center justify-between pt-3 border-t border-slate-800 text-xs", children: [_jsx("button", { onClick: () => handleDelete(f.id), className: "p-1.5 text-slate-400 hover:text-red-400 transition", title: "Delete favourite", children: _jsx(Trash2, { className: "w-4 h-4" }) }), _jsxs("button", { onClick: () => reopenFavouriteInPlanner(f), className: "px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold flex items-center gap-1.5 transition shadow-sm", children: [_jsx(Play, { className: "w-3.5 h-3.5 fill-white" }), "Re-open in Planner"] })] })] }, f.id));
                }) }))] }));
};
