import { describe, it, expect } from "vitest";
import { useAppStore, DEFAULT_HARD_CONSTRAINTS } from "../store/useAppStore";

describe("Planner Constraint Validation", () => {
  it("rejects generation with 0 selected courses", () => {
    const store = useAppStore.getState();
    useAppStore.setState({ selectedCourseCodes: [] });
    const isValid = store.validatePlannerState();
    expect(isValid).toBe(false);
    expect(useAppStore.getState().validationErrors).toContain(
      "Select at least 1 course to generate schedules."
    );
  });

  it("flags mutually exclusive course pair BACSE339 and BACSE345", () => {
    const store = useAppStore.getState();
    useAppStore.setState({ selectedCourseCodes: ["BACSE339", "BACSE345"] });
    const isValid = store.validatePlannerState();
    expect(isValid).toBe(false);
    expect(useAppStore.getState().validationErrors).toContain(
      "BACSE339 and BACSE345 are mutually exclusive program electives with 0 conflict-free slots."
    );
  });

  it("flags free days that are not in allowed days", () => {
    const store = useAppStore.getState();
    useAppStore.setState({
      selectedCourseCodes: ["CS101"],
      hardConstraints: {
        ...DEFAULT_HARD_CONSTRAINTS,
        allowed_days: ["MON", "TUE", "WED", "THU"],
        free_days: ["FRI"] // FRI is not in allowed_days
      }
    });
    const isValid = store.validatePlannerState();
    expect(isValid).toBe(false);
    expect(useAppStore.getState().validationErrors).toContain(
      "Free days (FRI) must be included within Allowed Days."
    );
  });

  it("flags earliest start >= latest end", () => {
    const store = useAppStore.getState();
    useAppStore.setState({
      selectedCourseCodes: ["CS101"],
      hardConstraints: {
        ...DEFAULT_HARD_CONSTRAINTS,
        earliest_start_minute: 900,
        latest_end_minute: 600
      }
    });
    const isValid = store.validatePlannerState();
    expect(isValid).toBe(false);
    expect(useAppStore.getState().validationErrors).toContain(
      "Earliest start time must be before latest end time."
    );
  });

  it("passes validation for valid configuration", () => {
    const store = useAppStore.getState();
    useAppStore.setState({
      selectedCourseCodes: ["CS101", "MA102"],
      hardConstraints: {
        ...DEFAULT_HARD_CONSTRAINTS,
        allowed_days: ["MON", "TUE", "WED", "THU", "FRI"],
        free_days: ["FRI"]
      }
    });
    const isValid = store.validatePlannerState();
    expect(isValid).toBe(true);
    expect(useAppStore.getState().validationErrors).toHaveLength(0);
  });
});
