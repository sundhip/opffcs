import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { api } from "../../services/api";
import { FavouriteItem } from "../../types";
import { downloadFavouritesZip } from "../../utils/exporter";
import {
  Archive,
  Trash2,
  Edit2,
  Play,
  AlertTriangle,
  Calendar,
  Check,
  X,
  Clock,
  User,
  Layers,
  Download
} from "lucide-react";

export const FavouritesPage: React.FC = () => {
  const { favourites, loadFavourites, reopenFavouriteInPlanner, setActiveTab } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const handleStartEdit = (f: FavouriteItem) => {
    setEditingId(f.id);
    setEditName(f.name);
    setEditNotes(f.notes || "");
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await api.updateFavourite(id, editName, editNotes);
      await loadFavourites();
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update favourite", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteFavourite(id);
      await loadFavourites();
    } catch (err) {
      console.error("Failed to delete favourite", err);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-[#09090c] border border-neutral-800 rounded-2xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Archive className="w-5 h-5 text-indigo-400" />
            Saved Timetables
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Re-open any saved timetable in the Planner, edit notes, or export conflict-free schedules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => downloadFavouritesZip()}
            disabled={favourites.length === 0}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed border border-indigo-500 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 transition"
            title="Export all saved timetables as a ZIP archive"
          >
            <Download className="w-3.5 h-3.5" />
            Export All Saved (.zip)
          </button>
          <span className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300">
            {favourites.length} Saved Schedule(s)
          </span>
        </div>
      </div>

      {favourites.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto">
          <Archive className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-200">No Timetables Saved Yet</h3>
          <p className="text-xs text-slate-400 mt-1">
            When browsing generated schedules in the Timetables tab, click "Save Timetable" to bookmark them here.
          </p>
          <button
            onClick={() => setActiveTab("planner")}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
          >
            Go to Planner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favourites.map((f) => {
            const isEditing = editingId === f.id;
            const ttPayload = f.payload?.timetable;

            return (
              <div
                key={f.id}
                className={`bg-slate-900 border rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4 transition ${
                  f.is_stale ? "border-amber-700/80 ring-1 ring-amber-600/50" : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div>
                  {/* Stale Warning Banner */}
                  {f.is_stale && (
                    <div className="mb-3 p-2.5 bg-amber-950/60 border border-amber-800/80 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Dataset Staleness Warning:</span>
                        <span>{f.stale_reason || "One or more offerings in this favourite are missing from the active dataset."}</span>
                      </div>
                    </div>
                  )}

                  {/* Title & Rename Mode */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-sm text-slate-100 font-bold focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Add notes..."
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(f.id)}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-semibold flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-slate-100 text-base leading-snug">{f.name}</h3>
                        <button
                          onClick={() => handleStartEdit(f)}
                          className="p-1 text-slate-400 hover:text-slate-200"
                          title="Rename favourite"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {f.notes && <p className="text-xs text-slate-400 mt-1">{f.notes}</p>}
                    </div>
                  )}

                  {/* Summary Details */}
                  {ttPayload ? (
                    <div className="mt-3 space-y-1.5 text-xs text-slate-300 border-t border-slate-800 pt-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Score:</span>
                        <span className="font-mono font-bold text-indigo-300">
                          {ttPayload.score ? ttPayload.score.toFixed(3) : "--"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Free Days:</span>
                        <span className="font-bold text-emerald-400">
                          {ttPayload.free_days?.length > 0 ? ttPayload.free_days.join(", ") : "0 days"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Span:</span>
                        <span className="font-mono">
                          {ttPayload.earliest_start || "--"} – {ttPayload.latest_end || "--"}
                        </span>
                      </div>
                    </div>
                  ) : f.offering_details ? (
                    <div className="mt-3 text-xs text-slate-300 space-y-1 border-t border-slate-800 pt-3">
                      <div>Course: {f.course?.code} - {f.course?.title}</div>
                      <div>Faculty: {f.faculty?.canonical_name}</div>
                      <div>Slots: {f.offering_details.theory_slots?.join("+") || "Lab"}</div>
                    </div>
                  ) : null}
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 transition"
                    title="Delete favourite"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => reopenFavouriteInPlanner(f)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    Re-open in Planner
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
