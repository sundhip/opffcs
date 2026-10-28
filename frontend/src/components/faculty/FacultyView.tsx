import React, { useState, useEffect, useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";
import { api } from "../../services/api";
import { FacultyDetail } from "../../types";
import {
  Search,
  Star,
  User,
  BookOpen,
  MessageSquare,
  AlertTriangle,
  GitCompare,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from "lucide-react";

export const FacultyView: React.FC = () => {
  const {
    facultyList,
    selectedFacultyId,
    setSelectedFacultyId,
    compareFacultyIds,
    toggleFacultyForComparison,
    clearFacultyComparison,
    updateCourseConfig,
    setActiveTab,
    courses
  } = useAppStore();

  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "rating" | "reviews">("rating");
  const [hasReviewsOnly, setHasReviewsOnly] = useState(false);

  // Detail Drawer state
  const [facultyDetail, setFacultyDetail] = useState<FacultyDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewType, setReviewType] = useState<"feedback" | "rating" | "all">("feedback");
  const [reviewsOffset, setReviewsOffset] = useState(0);

  // Comparison view modal
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareData, setCompareData] = useState<any[]>([]);
  const [isLoadingCompare, setIsLoadingCompare] = useState(false);

  // Auto-select faculty with reviews on initial mount if none selected
  useEffect(() => {
    if (!selectedFacultyId && facultyList.length > 0) {
      const withReviews = [...facultyList].filter((f) => f.review_count > 0);
      if (withReviews.length > 0) {
        withReviews.sort((a, b) => b.review_count - a.review_count);
        setSelectedFacultyId(withReviews[0].id);
      } else {
        setSelectedFacultyId(facultyList[0].id);
      }
    }
  }, [selectedFacultyId, facultyList, setSelectedFacultyId]);

  // Fetch detail when selectedFacultyId, reviewSearch, reviewType or reviewsOffset changes
  useEffect(() => {
    if (!selectedFacultyId) {
      setFacultyDetail(null);
      return;
    }

    let isMounted = true;
    setIsLoadingDetail(true);

    api
      .getFacultyDetail(selectedFacultyId, reviewSearch, 30, reviewsOffset, reviewType)
      .then((data) => {
        if (isMounted) setFacultyDetail(data);
      })
      .catch((err) => console.error("Failed to load faculty detail", err))
      .finally(() => {
        if (isMounted) setIsLoadingDetail(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedFacultyId, reviewSearch, reviewsOffset, reviewType]);

  // Fetch comparison data when modal opens
  useEffect(() => {
    if (!isCompareOpen || compareFacultyIds.length < 2) return;

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
        if (a.rating_mean == null && b.rating_mean == null) return 0;
        if (a.rating_mean == null) return 1;
        if (b.rating_mean == null) return -1;
        return b.rating_mean - a.rating_mean;
      });
    } else if (sortBy === "reviews") {
      list.sort((a, b) => b.review_count - a.review_count);
    } else {
      list.sort((a, b) => a.canonical_name.localeCompare(b.canonical_name));
    }

    return list;
  }, [facultyList, search, minRating, hasReviewsOnly, sortBy]);

  return (
    <div className="space-y-6 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Controls Bar */}
      <div className="bg-[#09090c] border border-neutral-800 rounded-2xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-400" />
            Faculty Directory & Reviews
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Browse verified ratings, read contextual student feedback, and compare professors.
          </p>
        </div>

        {/* Comparison Button */}
        {compareFacultyIds.length >= 2 && (
          <button
            onClick={() => setIsCompareOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md transition"
          >
            <GitCompare className="w-4 h-4" />
            Compare Selected ({compareFacultyIds.length})
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#09090c] border border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search Input */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search faculty name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#141419] border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Min Rating Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400">Min Rating:</span>
            <select
              value={minRating ?? ""}
              onChange={(e) => setMinRating(e.target.value ? parseFloat(e.target.value) : null)}
              className="bg-[#141419] border border-neutral-700 rounded-lg px-2.5 py-1 text-neutral-200 focus:outline-none"
            >
              <option value="">Any</option>
              <option value="3.0">3.0 ★ & Above</option>
              <option value="4.0">4.0 ★ & Above</option>
              <option value="4.5">4.5 ★ & Above</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#141419] border border-neutral-700 rounded-lg px-2.5 py-1 text-neutral-200 focus:outline-none"
            >
              <option value="rating">Highest Rating</option>
              <option value="reviews">Most Reviews</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>

          {/* Has Reviews Only Checkbox */}
          <label className="flex items-center gap-1.5 text-neutral-300 cursor-pointer">
            <input
              type="checkbox"
              checked={hasReviewsOnly}
              onChange={(e) => setHasReviewsOnly(e.target.checked)}
              className="rounded bg-neutral-800 border-neutral-700 text-indigo-600"
            />
            <span>Has Reviews Only</span>
          </label>
        </div>

        <span className="text-neutral-400">
          Showing {filteredFaculty.length} of {facultyList.length} faculty
        </span>
      </div>

      {/* Faculty Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFaculty.map((f) => {
          const isCompared = compareFacultyIds.includes(f.id);

          return (
            <div
              key={f.id}
              className="bg-[#09090c] border border-neutral-800 rounded-2xl p-5 shadow-sm hover:border-neutral-700 transition flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-neutral-100 text-sm leading-snug">
                    {f.canonical_name}
                  </h3>

                  {f.rating_mean != null ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold font-mono flex items-center gap-1 flex-shrink-0">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {f.rating_mean.toFixed(2)}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-medium border border-neutral-700 flex-shrink-0">
                      Unrated
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-2 text-xs text-neutral-400">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-neutral-500" />
                    {f.review_count} review(s)
                  </span>
                  {f.low_sample && (
                    <span className="text-[10px] text-amber-400/90 flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      few reviews
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-neutral-800 text-xs">
                <button
                  type="button"
                  onClick={() => toggleFacultyForComparison(f.id)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition ${
                    isCompared
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-[#141419] border-neutral-700 text-neutral-300 hover:border-neutral-500"
                  }`}
                >
                  {isCompared ? "In Comparison" : "+ Compare"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedFacultyId(f.id);
                    setReviewsOffset(0);
                    setReviewSearch("");
                  }}
                  className="px-3 py-1 bg-[#141419] hover:bg-[#1f1f26] text-neutral-200 border border-neutral-700/80 rounded-lg font-semibold flex items-center gap-1 transition"
                >
                  <span>Reviews & Info</span>
                  <ArrowRight className="w-3 h-3 text-indigo-400" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Faculty Detail Drawer Modal */}
      {selectedFacultyId && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-end z-50 overflow-hidden"
          onClick={() => setSelectedFacultyId(null)}
        >
          <div
            className="bg-[#09090c] border-l border-neutral-800 w-full max-w-2xl h-full shadow-2xl flex flex-col justify-between overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="p-6 border-b border-neutral-800 flex items-start justify-between gap-4 bg-[#0e0e14]">
              <div>
                <h3 className="text-xl font-bold text-neutral-100">
                  {facultyDetail?.canonical_name || "Loading Faculty Details..."}
                </h3>
                <span className="text-xs text-neutral-400 block mt-0.5">
                  Raw Name in Offerings: {facultyDetail?.raw_name || "--"}
                </span>

                {facultyDetail?.rating_summary && (
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-sm font-bold font-mono flex items-center gap-1.5">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      {facultyDetail.rating_summary.rating_mean?.toFixed(2) || "Unrated"} / 5.0
                    </span>
                    <span className="text-xs text-neutral-300">
                      Based on {facultyDetail.rating_summary.rated_count} explicit rating(s) and{" "}
                      {facultyDetail.rating_summary.review_count} matched review(s)
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedFacultyId(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingDetail ? (
                <div className="text-center py-12 text-neutral-400 text-sm">
                  Loading faculty details and reviews...
                </div>
              ) : facultyDetail ? (
                <>
                  {/* Ambiguous matches exclusion notice */}
                  {facultyDetail.ambiguous_count > 0 && (
                    <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 text-xs text-amber-200 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span>
                        {facultyDetail.ambiguous_count} ambiguous / weak review match(es) mentioning this name were
                        strictly excluded from the rating calculation for safety.
                      </span>
                    </div>
                  )}

                  {/* Rating Histogram / Distribution */}
                  {facultyDetail.rating_summary && facultyDetail.rating_summary.rating_distribution && (
                    <div className="bg-[#121218] border border-neutral-800 rounded-xl p-4 space-y-2 text-xs">
                      <span className="font-semibold text-neutral-200 block mb-2">
                        Rating Distribution (1 to 5 Stars):
                      </span>
                      {[5, 4, 3, 2, 1].map((star) => {
                        const dist = facultyDetail.rating_summary?.rating_distribution || {};
                        const count = dist[star.toString()] || 0;
                        const total = Math.max(1, facultyDetail.rating_summary?.rated_count || 1);
                        const pct = Math.round((count / total) * 100);

                        return (
                          <div key={star} className="flex items-center gap-3">
                            <span className="w-12 text-neutral-400 font-mono flex items-center gap-1">
                              {star} <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            </span>
                            <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-neutral-400 font-mono text-[11px]">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Courses & Offerings Taught */}
                  <div>
                    <span className="font-semibold text-neutral-200 text-xs block mb-2">
                      Courses & Slots Taught:
                    </span>
                    <div className="space-y-2">
                      {facultyDetail.offerings.map((off) => {
                        const labStr = off.lab_session
                          ? off.lab_session.raw_slot ||
                            (Array.isArray(off.lab_session.slots) ? off.lab_session.slots.join("+") : "") ||
                            (Array.isArray(off.lab_session.labels) ? off.lab_session.labels.join("+") : "") ||
                            "None"
                          : "None";

                        return (
                          <div
                            key={off.id}
                            className="bg-[#121218] border border-neutral-800 rounded-xl p-3 text-xs flex justify-between items-center"
                          >
                            <div>
                              <span className="font-bold text-neutral-100 font-mono">{off.course_code}</span>
                              <span className="text-neutral-400 ml-2">{off.course_title}</span>
                              <div className="text-[11px] text-neutral-400 mt-1">
                                Theory: {off.theory_slots && off.theory_slots.length > 0 ? off.theory_slots.join("+") : "None"} • Lab:{" "}
                                {labStr}
                              </div>
                            </div>
                            {off.venue && (
                              <span className="px-2 py-0.5 rounded bg-[#181820] border border-neutral-700 font-mono text-[11px] text-neutral-300">
                                {off.venue}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reviews Section with Category Tabs & Search */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                      <span className="font-semibold text-neutral-200 text-xs">
                        Student Reviews ({facultyDetail.reviews.total}):
                      </span>
                      <div className="relative w-48">
                        <Search className="w-3 h-3 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search reviews..."
                          value={reviewSearch}
                          onChange={(e) => {
                            setReviewSearch(e.target.value);
                            setReviewsOffset(0);
                          }}
                          className="w-full pl-8 pr-2 py-1 bg-[#141419] border border-neutral-700 rounded-lg text-xs text-neutral-100 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Review Type Category Filters */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#121218] border border-neutral-800 rounded-xl mb-3.5">
                      <button
                        type="button"
                        onClick={() => {
                          setReviewType("feedback");
                          setReviewsOffset(0);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          reviewType === "feedback"
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Genuine Feedback ({facultyDetail.reviews.feedback_count ?? facultyDetail.reviews.total})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setReviewType("rating");
                          setReviewsOffset(0);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          reviewType === "rating"
                            ? "bg-amber-600 text-white shadow-sm"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        <Star className="w-3 h-3 fill-current" />
                        <span>With Ratings ({facultyDetail.reviews.rating_count ?? 0})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setReviewType("all");
                          setReviewsOffset(0);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          reviewType === "all"
                            ? "bg-neutral-800 text-white shadow-sm"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        <span>All Mentions ({facultyDetail.reviews.all_count ?? facultyDetail.reviews.total})</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {facultyDetail.reviews.items.length === 0 ? (
                        <p className="text-xs text-neutral-500 py-6 text-center bg-[#121218] rounded-xl border border-neutral-800">
                          No reviews found matching this filter.
                        </p>
                      ) : (
                        facultyDetail.reviews.items.map((r) => (
                          <div
                            key={r.review_id}
                            className="bg-[#121218] border border-neutral-800 rounded-2xl p-4 space-y-2.5 text-xs shadow-sm hover:border-neutral-700 transition"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {r.explicit_rating != null ? (
                                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold font-mono text-xs flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    {r.explicit_rating} / 5.0
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-neutral-400 font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                                    Student Opinion
                                  </span>
                                )}

                                {/* Tags */}
                                {r.tags && r.tags.map((t, tIdx) => {
                                  let tagColor = "bg-neutral-900 text-neutral-300 border-neutral-800";
                                  if (t.includes("Lenient")) tagColor = "bg-emerald-950/80 text-emerald-300 border-emerald-800/60";
                                  else if (t.includes("Chill")) tagColor = "bg-cyan-950/80 text-cyan-300 border-cyan-800/60";
                                  else if (t.includes("Strict")) tagColor = "bg-rose-950/80 text-rose-300 border-rose-800/60";
                                  else if (t.includes("Good") || t.includes("★")) tagColor = "bg-amber-950/80 text-amber-300 border-amber-800/60";
                                  else if (t.includes("Attendance")) tagColor = "bg-purple-950/80 text-purple-300 border-purple-800/60";
                                  else if (t.includes("Marks")) tagColor = "bg-indigo-950/80 text-indigo-300 border-indigo-800/60";

                                  return (
                                    <span key={tIdx} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tagColor}`}>
                                      {t}
                                    </span>
                                  );
                                })}
                              </div>

                              <span className="text-[10px] text-neutral-400 font-mono">
                                {r.timestamp ? r.timestamp.slice(0, 10) : "Review"}
                              </span>
                            </div>

                            {/* Escaped plain text review */}
                            <p className="text-neutral-100 leading-relaxed font-sans whitespace-pre-wrap select-text text-[12.5px]">
                              {r.text}
                            </p>

                            <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60 text-[10px] text-neutral-400 font-mono">
                              <span className="truncate max-w-[220px]">
                                Source: {r.source_zip ? r.source_zip.replace(".zip", "") : "WhatsApp Chat"}
                              </span>
                              <span>Match score: {(r.match_score * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {isCompareOpen && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setIsCompareOpen(false)}
        >
          <div
            className="bg-[#0c0c10] border border-neutral-800 rounded-3xl p-6 max-w-5xl w-full shadow-2xl my-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
                  <GitCompare className="w-5 h-5 text-indigo-400" />
                  Faculty Comparison
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Side-by-side comparison of ratings, offerings, and student review metrics.
                </p>
              </div>
              <button
                onClick={() => setIsCompareOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {isLoadingCompare ? (
              <div className="text-center py-12 text-neutral-400 text-sm">
                Loading comparison metrics...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {compareData.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#121218] border border-neutral-800 rounded-2xl p-4 space-y-4"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-neutral-100">{item.canonical_name}</h4>
                      <div className="mt-2 flex items-center gap-2">
                        {item.rating_summary?.rating_mean != null ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold font-mono text-xs border border-amber-500/40">
                            {item.rating_summary.rating_mean.toFixed(2)} ★
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">Unrated</span>
                        )}
                        <span className="text-xs text-neutral-400">
                          ({item.rating_summary?.review_count || 0} reviews)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-neutral-300 border-t border-neutral-800 pt-3">
                      <div className="text-[11px] font-semibold text-neutral-400">Courses Taught:</div>
                      {item.courses_taught.map((cStr: string) => (
                        <div key={cStr} className="text-xs text-neutral-200 truncate">
                          • {cStr}
                        </div>
                      ))}
                    </div>

                    {/* Use in Planner Button */}
                    <button
                      onClick={() => {
                        // Apply allow list for this faculty
                        item.courses_taught.forEach((cStr: string) => {
                          const code = cStr.split(" ")[0];
                          updateCourseConfig(code, {
                            allowed_theory_faculty: [item.canonical_name]
                          });
                        });
                        setIsCompareOpen(false);
                        setActiveTab("planner");
                      }}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
                    >
                      Use in Planner
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
