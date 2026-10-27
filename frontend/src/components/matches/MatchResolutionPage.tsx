import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { MatchQueueItem } from "../../types";
import { useAppStore } from "../../store/useAppStore";
import {
  HelpCircle,
  CheckCircle,
  XCircle,
  UserCheck,
  Search,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  ChevronRight
} from "lucide-react";

export const MatchResolutionPage: React.FC = () => {
  const { facultyList, loadInitialData } = useAppStore();
  const [queue, setQueue] = useState<MatchQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedFacultyForReview, setSelectedFacultyForReview] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMatchQueue(statusFilter === "ALL" ? undefined : statusFilter, 50, 0);
      setQueue(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to fetch match queue", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [statusFilter]);

  const handleDecision = async (
    reviewId: string,
    decision: "MATCHED" | "IGNORE",
    facultyId?: string
  ) => {
    try {
      await api.decideMatch(reviewId, decision, facultyId, "Resolved via UI Match Queue");
      setSuccessMessage(`Decision saved for review. Affected faculty ratings recalculated.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      // Remove from local list
      setQueue((prev) => prev.filter((item) => item.review_id !== reviewId));
      setTotal((prev) => Math.max(0, prev - 1));
      // Refresh faculty in background
      loadInitialData();
    } catch (err: any) {
      alert(`Error saving decision: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            Human Review: Match Resolution Queue
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Resolve borderline or ambiguous student review mentions to improve faculty rating accuracy.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Unresolved (Ambiguous & Weak)</option>
            <option value="AMBIGUOUS">Ambiguous Only</option>
            <option value="WEAK">Weak Only</option>
          </select>
          <span className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300">
            {total} Pending
          </span>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Queue Items */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading queue items...</div>
      ) : queue.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-200">Match Queue Clear</h3>
          <p className="text-xs text-slate-400 mt-1">
            All reviews have either been verified, assigned to unambiguous faculty, or resolved.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((item) => {
            const selectedCustomFac = selectedFacultyForReview[item.review_id] || "";

            return (
              <div
                key={item.review_id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
              >
                {/* Header: Status & Score */}
                <div className="flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-semibold border ${
                        item.status === "AMBIGUOUS"
                          ? "bg-amber-950 text-amber-300 border-amber-800/60"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="font-mono text-slate-400">
                      Score: {(item.score * 100).toFixed(0)}%
                    </span>
                    {item.explicit_rating != null && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold font-mono">
                        {item.explicit_rating} / 5.0 ★
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono">
                    {item.timestamp ? item.timestamp.slice(0, 10) : "Review"} • Source:{" "}
                    {item.source_zip ? item.source_zip.replace(".zip", "") : "Chat"}
                  </span>
                </div>

                {/* Plain Text Anonymized Review Content */}
                <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap select-text">
                  {item.text}
                </div>

                {/* Candidate Suggestions */}
                {item.candidates && item.candidates.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                      Algorithm Candidate Matches:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {item.candidates.map((cand) => (
                        <div
                          key={cand.faculty_id}
                          className="bg-slate-800/90 border border-slate-700/90 rounded-xl p-3 flex flex-col justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold text-xs text-slate-100 block">
                              {cand.canonical_name}
                            </span>
                            <span className="text-[10px] text-indigo-400 font-mono">
                              Match Confidence: {(cand.score * 100).toFixed(0)}%
                            </span>
                            {cand.reasons.length > 0 && (
                              <div className="text-[10px] text-slate-400 mt-1">
                                {cand.reasons.join(", ")}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDecision(item.review_id, "MATCHED", cand.faculty_id)}
                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Accept Candidate
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual Override Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Choose Different Faculty:</span>
                    <select
                      value={selectedCustomFac}
                      onChange={(e) =>
                        setSelectedFacultyForReview({
                          ...selectedFacultyForReview,
                          [item.review_id]: e.target.value
                        })
                      }
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
                    >
                      <option value="">Select from directory...</option>
                      {facultyList.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.canonical_name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={!selectedCustomFac}
                      onClick={() => handleDecision(item.review_id, "MATCHED", selectedCustomFac)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-semibold transition"
                    >
                      Assign
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDecision(item.review_id, "IGNORE")}
                    className="px-3 py-1 bg-slate-800 hover:bg-red-950/60 border border-slate-700 hover:border-red-700 text-slate-400 hover:text-red-300 rounded-lg transition"
                  >
                    Not Faculty / Ignore
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
