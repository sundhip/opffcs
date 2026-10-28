import { create } from "zustand";
import {
  Course,
  Offering,
  CourseSelectionConfig,
  HardConstraints,
  SoftPreferences,
  GenerateResponse,
  FavouriteItem
} from "../types";
import { api } from "../services/api";

export type NavTab = "planner" | "results" | "faculty" | "saved" | "favourites" | "matches" | "data";

export interface LiveFilters {
  requiredFreeDay: string | null;
  requiredFaculty: string | null;
  maxGapMinutes: number | null;
  sortBy: "score" | "fewest_gaps" | "most_free_days" | "best_rating" | "earliest_finish";
  shapeFilter?: "ALL" | "MORNING" | "AFTERNOON" | "FREE_DAYS" | "COMPACT" | "BALANCED";
  gapsFilter?: "ALL" | "ZERO" | "LESS" | "MEDIUM" | "WIDE" | "NO_MON_GAP" | "NO_FRI_GAP";
  finishFilter?: "ALL" | "VERY_EARLY" | "EARLY" | "MID" | "LATE";
  startFilter?: "ALL" | "START_8AM" | "START_LATE" | "START_NOON" | "START_AFTERNOON";
  halfDaysFilter?: "ALL" | "FULL_HALF" | "HIGH_HALF" | "MOD_HALF" | "NO_HALF";
  daysFilter?: "ALL" | "BALANCED" | "LIGHT" | "FOUR_DAY" | "MON_OFF" | "FRI_OFF" | "WED_OFF" | "FIVE_DAY";
  facultyQualityFilter?: "ALL" | "TOP_RATED" | "GOOD_RATED" | "REVIEWED_ONLY";
}

export const DEFAULT_HARD_CONSTRAINTS: HardConstraints = {
  max_daily_hours: null,
  max_consecutive_hours: null,
  allowed_days: ["MON", "TUE", "WED", "THU", "FRI"],
  free_days: [],
  min_free_days_count: null,
  min_working_days: null,
  max_working_days: null,
  earliest_start_minute: null,
  latest_end_minute: null,
  day_pattern: "ANY",
  blocked_slots: [],
  max_credits: null
};

export const DEFAULT_SOFT_PREFERENCES: SoftPreferences = {
  minimize_gaps_weight: 0.7,
  prefer_free_days_weight: 0.6,
  preferred_time_window_weight: 0.4,
  faculty_rating_weight: 0.0,
  compactness_weight: 0.5,
  preferred_start_minute: 480,
  preferred_end_minute: 1005
};

interface AppState {
  // Navigation & Theme
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;

  // Metadata Caches
  courses: Course[];
  offeringsByCourse: Record<string, Offering[]>;
  facultyList: any[];
  isLoadingData: boolean;
  loadInitialData: () => Promise<void>;

  // Planner Selections
  selectedCourseCodes: string[];
  courseConfigs: Record<string, CourseSelectionConfig>;
  toggleCourseSelection: (courseCode: string) => void;
  updateCourseConfig: (courseCode: string, updates: Partial<CourseSelectionConfig>) => void;

  // Constraints & Preferences
  hardConstraints: HardConstraints;
  softPreferences: SoftPreferences;
  setHardConstraints: (updates: Partial<HardConstraints>) => void;
  setSoftPreferences: (updates: Partial<SoftPreferences>) => void;
  applyPreset: (presetName: "morning" | "4day" | "mingap" | "reset") => void;

  // Validation
  validationErrors: string[];
  validatePlannerState: () => boolean;

  // Generation
  isGenerating: boolean;
  generationJobId: string | null;
  generationResult: GenerateResponse | null;
  currentResultIndex: number;
  setCurrentResultIndex: (idx: number) => void;
  startGeneration: () => Promise<void>;
  cancelGeneration: () => Promise<void>;

  // Results Browsing & Comparison
  liveFilters: LiveFilters;
  setLiveFilters: (updates: Partial<LiveFilters>) => void;
  comparedTimetableIds: string[];
  toggleCompareTimetable: (ttId: string) => void;
  clearComparedTimetables: () => void;

  // Favourites
  favourites: FavouriteItem[];
  loadFavourites: () => Promise<void>;
  toggleFavouriteTimetable: (name: string, offeringKeys: string[], timetableObj: any) => Promise<void>;
  reopenFavouriteInPlanner: (fav: FavouriteItem) => void;

  // Faculty View & Compare
  selectedFacultyId: string | null;
  setSelectedFacultyId: (id: string | null) => void;
  compareFacultyIds: string[];
  toggleFacultyForComparison: (id: string) => void;
  clearFacultyComparison: () => void;

  // URL Sharing
  serializeToUrl: () => void;
  loadFromUrl: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: "planner",
  setActiveTab: (tab) => {
    set({ activeTab: tab });
    get().serializeToUrl();
  },

  theme: "dark",
  toggleTheme: () => {
    const nextTheme = get().theme === "dark" ? "light" : "dark";
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    set({ theme: nextTheme });
  },

  courses: [],
  offeringsByCourse: {},
  facultyList: [],
  isLoadingData: false,

  loadInitialData: async () => {
    set({ isLoadingData: true });
    try {
      const [cRes, fRes] = await Promise.all([
        api.getCourses(),
        api.getFacultyList({ limit: 100 })
      ]);
      set({ courses: cRes.items, facultyList: fRes.items });

      // Load offerings for all courses in parallel
      const offeringsMap: Record<string, Offering[]> = {};
      await Promise.all(
        cRes.items.map(async (c) => {
          try {
            const offs: any = await api.getCourseOfferings(c.code);
            offeringsMap[c.code] = Array.isArray(offs) ? offs : (offs?.offerings || []);
          } catch {
            offeringsMap[c.code] = [];
          }
        })
      );
      set({ offeringsByCourse: offeringsMap });
      get().loadFromUrl();
      get().loadFavourites();
    } catch (err) {
      console.error("Failed to load initial metadata", err);
    } finally {
      set({ isLoadingData: false });
    }
  },

  selectedCourseCodes: [],
  courseConfigs: {},

  toggleCourseSelection: (courseCode: string) => {
    const state = get();
    const isSelected = state.selectedCourseCodes.includes(courseCode);
    const nextSelected = isSelected
      ? state.selectedCourseCodes.filter((c) => c !== courseCode)
      : [...state.selectedCourseCodes, courseCode];

    const nextConfigs = { ...state.courseConfigs };
    if (!isSelected && !nextConfigs[courseCode]) {
      const course = state.courses.find((c) => c.code === courseCode);
      const hasLab = course ? Boolean(course.has_lab) : ["BACSE204", "BACSE205", "BACSE324", "BACSE339", "BACSE345"].includes(courseCode);
      nextConfigs[courseCode] = {
        course_code: courseCode,
        include_theory: course ? (course.has_theory ?? true) : true,
        include_lab: hasLab,
        allowed_theory_faculty: [],
        blocked_theory_faculty: [],
        allowed_lab_faculty: [],
        blocked_lab_faculty: [],
        require_same_faculty: true,
        locked_offering_id: null
      };
    }

    set({ selectedCourseCodes: nextSelected, courseConfigs: nextConfigs });
    get().validatePlannerState();
    get().serializeToUrl();
  },

  updateCourseConfig: (courseCode, updates) => {
    set((state) => ({
      courseConfigs: {
        ...state.courseConfigs,
        [courseCode]: {
          ...state.courseConfigs[courseCode],
          ...updates
        }
      }
    }));
    get().validatePlannerState();
    get().serializeToUrl();
  },

  hardConstraints: { ...DEFAULT_HARD_CONSTRAINTS },
  softPreferences: { ...DEFAULT_SOFT_PREFERENCES },

  setHardConstraints: (updates) => {
    set((state) => ({
      hardConstraints: { ...state.hardConstraints, ...updates }
    }));
    get().validatePlannerState();
    get().serializeToUrl();
  },

  setSoftPreferences: (updates) => {
    set((state) => ({
      softPreferences: { ...state.softPreferences, ...updates }
    }));
    get().serializeToUrl();
  },

  applyPreset: (preset) => {
    if (preset === "morning") {
      get().setHardConstraints({
        day_pattern: "MORNING_ONLY",
        latest_end_minute: 805
      });
      get().setSoftPreferences({
        preferred_start_minute: 480,
        preferred_end_minute: 805,
        preferred_time_window_weight: 0.9
      });
    } else if (preset === "4day") {
      get().setHardConstraints({
        min_free_days_count: 1
      });
      get().setSoftPreferences({
        prefer_free_days_weight: 0.95
      });
    } else if (preset === "mingap") {
      get().setSoftPreferences({
        minimize_gaps_weight: 1.0,
        compactness_weight: 0.85
      });
    } else if (preset === "reset") {
      set({
        hardConstraints: { ...DEFAULT_HARD_CONSTRAINTS },
        softPreferences: { ...DEFAULT_SOFT_PREFERENCES }
      });
    }
    get().validatePlannerState();
  },

  validationErrors: [],
  validatePlannerState: () => {
    const { selectedCourseCodes, hardConstraints } = get();
    const errors: string[] = [];

    if (selectedCourseCodes.length === 0) {
      errors.push("Select at least 1 course to generate schedules.");
    }

    // Mutual exclusivity check on known pair
    if (selectedCourseCodes.includes("BACSE339") && selectedCourseCodes.includes("BACSE345")) {
      errors.push("BACSE339 and BACSE345 are mutually exclusive program electives with 0 conflict-free slots.");
    }

    // Days consistency
    const invalidFreeDays = hardConstraints.free_days.filter(
      (d) => !hardConstraints.allowed_days.includes(d)
    );
    if (invalidFreeDays.length > 0) {
      errors.push(`Free days (${invalidFreeDays.join(", ")}) must be included within Allowed Days.`);
    }

    if (
      hardConstraints.earliest_start_minute &&
      hardConstraints.latest_end_minute &&
      hardConstraints.earliest_start_minute >= hardConstraints.latest_end_minute
    ) {
      errors.push("Earliest start time must be before latest end time.");
    }

    if (
      hardConstraints.min_working_days &&
      hardConstraints.max_working_days &&
      hardConstraints.min_working_days > hardConstraints.max_working_days
    ) {
      errors.push("Min working days cannot exceed max working days.");
    }

    set({ validationErrors: errors });
    return errors.length === 0;
  },

  isGenerating: false,
  generationJobId: null,
  generationResult: null,
  currentResultIndex: 0,
  setCurrentResultIndex: (idx) => set({ currentResultIndex: idx }),

  startGeneration: async () => {
    const state = get();
    if (!state.validatePlannerState()) return;

    set({ isGenerating: true, generationResult: null, currentResultIndex: 0 });

    try {
      const coursesPayload = state.selectedCourseCodes.map((code) => {
        const course = state.courses.find((c) => c.code === code);
        const hasLabDefault = course ? Boolean(course.has_lab) : ["BACSE204", "BACSE205", "BACSE324", "BACSE339", "BACSE345"].includes(code);
        const cfg = state.courseConfigs[code] || {
          course_code: code,
          include_theory: true,
          include_lab: hasLabDefault,
          allowed_theory_faculty: [],
          blocked_theory_faculty: [],
          allowed_lab_faculty: [],
          blocked_lab_faculty: [],
          require_same_faculty: true
        };
        return {
          course_code: code,
          include_theory: cfg.include_theory ?? true,
          include_lab: cfg.include_lab ?? hasLabDefault,
          allowed_theory_faculty: cfg.allowed_theory_faculty,
          blocked_theory_faculty: cfg.blocked_theory_faculty,
          allowed_lab_faculty: cfg.allowed_lab_faculty,
          blocked_lab_faculty: cfg.blocked_lab_faculty,
          require_same_faculty: cfg.require_same_faculty
        };
      });

      const lockedIds: string[] = [];
      state.selectedCourseCodes.forEach((code) => {
        const cfg = state.courseConfigs[code];
        if (cfg?.locked_offering_id) {
          lockedIds.push(cfg.locked_offering_id);
        }
      });

      const reqPayload = {
        courses: coursesPayload,
        hard_constraints: state.hardConstraints,
        preferences: state.softPreferences,
        locked_offering_ids: lockedIds,
        max_results: 100,
        time_budget_seconds: 5.0
      };

      const startRes = await api.startGeneration(reqPayload);
      set({ generationJobId: startRes.job_id });

      // Poll until finished
      const jobId = startRes.job_id;
      let finished = false;
      let attempts = 0;

      while (!finished && attempts < 40) {
        attempts++;
        await new Promise((r) => setTimeout(r, 200));
        const statusRes = await api.getGenerationJob(jobId);
        if (["completed", "time_limit_exceeded", "failed", "cancelled"].includes(statusRes.status)) {
          finished = true;
          if (statusRes.result) {
            set({
              generationResult: statusRes.result,
              isGenerating: false,
              activeTab: "results"
            });
            return;
          }
        }
      }
      set({ isGenerating: false });
    } catch (err: any) {
      console.error("Generation error", err);
      set({
        isGenerating: false,
        generationResult: {
          status: "infeasible",
          total_valid: 0,
          returned: 0,
          is_exhaustive: true,
          time_elapsed_ms: 0,
          timetables: [],
          infeasible_explanation: {
            empty_domain_courses: [],
            conflicting_pairs: [],
            minimal_conflicting_subset: [],
            diagnostic_summary: err.message || "An unexpected error occurred during search."
          }
        },
        activeTab: "results"
      });
    }
  },

  cancelGeneration: async () => {
    const { generationJobId } = get();
    if (generationJobId) {
      try {
        await api.cancelGenerationJob(generationJobId);
      } catch {
        // Ignored
      }
    }
    set({ isGenerating: false });
  },

  liveFilters: {
    requiredFreeDay: null,
    requiredFaculty: null,
    maxGapMinutes: null,
    sortBy: "score",
    shapeFilter: "ALL",
    gapsFilter: "ALL",
    finishFilter: "ALL",
    startFilter: "ALL",
    halfDaysFilter: "ALL",
    daysFilter: "ALL",
    facultyQualityFilter: "ALL"
  },
  setLiveFilters: (updates) => {
    set((state) => ({
      liveFilters: { ...state.liveFilters, ...updates },
      currentResultIndex: 0
    }));
  },

  comparedTimetableIds: [],
  toggleCompareTimetable: (ttId) => {
    set((state) => {
      const exists = state.comparedTimetableIds.includes(ttId);
      if (exists) {
        return { comparedTimetableIds: state.comparedTimetableIds.filter((id) => id !== ttId) };
      }
      if (state.comparedTimetableIds.length >= 3) {
        return { comparedTimetableIds: [...state.comparedTimetableIds.slice(1), ttId] };
      }
      return { comparedTimetableIds: [...state.comparedTimetableIds, ttId] };
    });
  },
  clearComparedTimetables: () => set({ comparedTimetableIds: [] }),

  favourites: [],
  loadFavourites: async () => {
    try {
      const items = await api.getFavourites();
      set({ favourites: items });
    } catch (err) {
      console.error("Failed to load favourites", err);
    }
  },

  toggleFavouriteTimetable: async (name, offeringKeys, timetableObj) => {
    const key = `tt:${timetableObj.timetable_id}`;
    const state = get();
    const existing = state.favourites.find((f) => f.offering_key === key);

    if (existing) {
      await api.deleteFavourite(existing.id);
    } else {
      await api.addFavourite(key, name, "Saved Timetable", {
        timetable_id: timetableObj.timetable_id,
        offering_keys: offeringKeys,
        selected_courses: state.selectedCourseCodes,
        hard_constraints: state.hardConstraints,
        soft_preferences: state.softPreferences,
        timetable: timetableObj
      });
    }
    await get().loadFavourites();
  },

  reopenFavouriteInPlanner: (fav) => {
    if (fav.payload) {
      const { selected_courses, hard_constraints, soft_preferences } = fav.payload;
      if (selected_courses) set({ selectedCourseCodes: selected_courses });
      if (hard_constraints) set({ hardConstraints: hard_constraints });
      if (soft_preferences) set({ softPreferences: soft_preferences });
    }
    set({ activeTab: "planner" });
    get().validatePlannerState();
  },

  selectedFacultyId: null,
  setSelectedFacultyId: (id) => set({ selectedFacultyId: id }),

  compareFacultyIds: [],
  toggleFacultyForComparison: (id) => {
    set((state) => {
      const exists = state.compareFacultyIds.includes(id);
      if (exists) {
        return { compareFacultyIds: state.compareFacultyIds.filter((fid) => fid !== id) };
      }
      if (state.compareFacultyIds.length >= 4) {
        return { compareFacultyIds: [...state.compareFacultyIds.slice(1), id] };
      }
      return { compareFacultyIds: [...state.compareFacultyIds, id] };
    });
  },
  clearFacultyComparison: () => set({ compareFacultyIds: [] }),

  serializeToUrl: () => {
    const { activeTab, selectedCourseCodes, hardConstraints } = get();
    try {
      const params = new URLSearchParams();
      if (activeTab !== "planner") params.set("tab", activeTab);
      if (selectedCourseCodes.length > 0) params.set("courses", selectedCourseCodes.join(","));
      if (hardConstraints.day_pattern !== "ANY") params.set("pattern", hardConstraints.day_pattern);
      if (hardConstraints.free_days.length > 0) params.set("freedays", hardConstraints.free_days.join(","));
      window.history.replaceState(null, "", `?${params.toString()}`);
    } catch {
      // URL manipulation fallback
    }
  },

  loadFromUrl: () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") as NavTab;
      const coursesStr = params.get("courses");
      const pattern = params.get("pattern");
      const freedaysStr = params.get("freedays");

      if (tab && ["planner", "results", "faculty", "saved", "favourites", "matches", "data"].includes(tab)) {
        set({ activeTab: tab === "favourites" ? "saved" : tab });
      }
      if (coursesStr) {
        const codes = coursesStr.split(",").filter(Boolean);
        codes.forEach((code) => {
          if (!get().selectedCourseCodes.includes(code)) {
            get().toggleCourseSelection(code);
          }
        });
      }
      if (pattern && ["ANY", "MORNING_ONLY", "AFTERNOON_ONLY", "HALF_DAY"].includes(pattern)) {
        get().setHardConstraints({ day_pattern: pattern as any });
      }
      if (freedaysStr) {
        get().setHardConstraints({ free_days: freedaysStr.split(",").filter(Boolean) });
      }
    } catch {
      // Ignore
    }
  }
}));
