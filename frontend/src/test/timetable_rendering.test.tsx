import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { WeeklyTimetable } from "../components/timetable/WeeklyTimetable";
import { MeetingBlock } from "../types";

describe("WeeklyTimetable Rendering", () => {
  it("renders the VIT slot matrix with headers, days, lunch column, and action buttons", () => {
    const timeline: Record<string, MeetingBlock[]> = {
      MON: [],
      TUE: [],
      WED: [],
      THU: [],
      FRI: []
    };

    render(<WeeklyTimetable timeline={timeline} title="Test Timetable" />);

    expect(screen.getByText("Test Timetable")).toBeInTheDocument();
    expect(screen.getByText("THEORY HOURS")).toBeInTheDocument();
    expect(screen.getByText("LAB HOURS")).toBeInTheDocument();
    expect(screen.getByText("MON")).toBeInTheDocument();
    expect(screen.getByText("TUE")).toBeInTheDocument();
    expect(screen.getByText("WED")).toBeInTheDocument();
    expect(screen.getByText("THU")).toBeInTheDocument();
    expect(screen.getByText("FRI")).toBeInTheDocument();
    expect(screen.getByText("LUNCH")).toBeInTheDocument();
    expect(screen.getByText("Download Timetable")).toBeInTheDocument();
    expect(screen.getByText("Enable Quick Visualization")).toBeInTheDocument();
    expect(screen.getByText("Reset Table")).toBeInTheDocument();
  });

  it("highlights enrolled theory and lab slots in matrix and shows summary table", () => {
    const timeline: Record<string, MeetingBlock[]> = {
      MON: [
        {
          day: "MON",
          start_time: "08:00",
          end_time: "08:50",
          start_min: 480,
          end_min: 530,
          kind: "theory",
          slot_label: "A1",
          course_code: "BACSE204",
          faculty_name: "Dr. Alan Turing",
          venue: "SJTG01"
        },
        {
          day: "MON",
          start_time: "14:00",
          end_time: "15:40",
          start_min: 840,
          end_min: 940,
          kind: "lab",
          slot_label: "L31+L32",
          course_code: "BACSE204",
          faculty_name: "Dr. Alan Turing",
          venue: "SJL01"
        }
      ],
      TUE: [
        {
          day: "TUE",
          start_time: "08:00",
          end_time: "08:50",
          start_min: 480,
          end_min: 530,
          kind: "theory",
          slot_label: "B1",
          course_code: "BACSE205",
          faculty_name: "Dr. Nikola Tesla",
          venue: "SJTG02"
        },
        {
          day: "TUE",
          start_time: "14:00",
          end_time: "15:40",
          start_min: 840,
          end_min: 940,
          kind: "lab",
          slot_label: "L37+L38",
          course_code: "BACSE205",
          faculty_name: "Dr. Nikola Tesla",
          venue: "TIFAC102"
        }
      ],
      WED: [],
      THU: [],
      FRI: []
    };

    render(
      <WeeklyTimetable
        timeline={timeline}
        courseTitles={{ BACSE204: "Software Engineering", BACSE205: "AI & ML" }}
        courseCredits={{ BACSE204: 4, BACSE205: 4 }}
      />
    );

    // Occupied cells in matrix
    expect(screen.getAllByText("BACSE204").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("BACSE205").length).toBeGreaterThanOrEqual(1);

    // Enrolled Courses Summary Table with separate Theory and Lab rows
    expect(screen.getByText("Enrolled Courses Summary")).toBeInTheDocument();
    expect(screen.getAllByText("Software Engineering").length).toBe(2);
    expect(screen.getAllByText("AI & ML").length).toBe(2);
    expect(screen.getAllByText("theory").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("lab").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Dr. Alan Turing").length).toBe(2);
    expect(screen.getAllByText("Dr. Nikola Tesla").length).toBe(2);
    expect(screen.getByText("8")).toBeInTheDocument(); // (3+1) + (3+1) = 8 total credits
  });

  it("can toggle between VIT Slot Matrix and Quick Visualization (Timeline) mode", () => {
    const timeline: Record<string, MeetingBlock[]> = {
      MON: [
        {
          day: "MON",
          start_time: "08:00",
          end_time: "08:50",
          start_min: 480,
          end_min: 530,
          kind: "theory",
          slot_label: "A1",
          course_code: "BACSE204",
          faculty_name: "Dr. Alan Turing"
        }
      ],
      TUE: [],
      WED: [],
      THU: [],
      FRI: []
    };

    render(<WeeklyTimetable timeline={timeline} />);

    // Initially in matrix mode
    expect(screen.getByText("THEORY HOURS")).toBeInTheDocument();

    // Toggle to Timeline view
    const toggleBtn = screen.getByText("Enable Quick Visualization");
    fireEvent.click(toggleBtn);

    // Now in Timeline mode
    expect(screen.getByText("Switch to Slot Matrix")).toBeInTheDocument();
  });
});
