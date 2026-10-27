import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { WeeklyTimetable } from "../components/timetable/WeeklyTimetable";
import { MeetingBlock } from "../types";

describe("WeeklyTimetable Rendering", () => {
  it("renders lunch transit window divider and day headers", () => {
    const timeline: Record<string, MeetingBlock[]> = {
      MON: [],
      TUE: [],
      WED: [],
      THU: [],
      FRI: []
    };

    render(<WeeklyTimetable timeline={timeline} title="Test Timetable" />);

    expect(screen.getByText("Test Timetable")).toBeInTheDocument();
    expect(screen.getByText("MON")).toBeInTheDocument();
    expect(screen.getByText("TUE")).toBeInTheDocument();
    expect(screen.getByText("WED")).toBeInTheDocument();
    expect(screen.getByText("THU")).toBeInTheDocument();
    expect(screen.getByText("FRI")).toBeInTheDocument();
    expect(screen.getByText(/Lunch Transit Window/i)).toBeInTheDocument();
  });

  it("renders theory meeting block and combined lab meeting block at true times", () => {
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
          course_code: "CS101",
          faculty_name: "Dr. Alan Turing",
          venue: "SJTG01"
        }
      ],
      TUE: [
        {
          day: "TUE",
          start_time: "14:00",
          end_time: "15:40",
          start_min: 840,
          end_min: 940,
          kind: "lab",
          slot_label: "L37+L38",
          course_code: "EE103",
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
        courseTitles={{ CS101: "Computer Systems", EE103: "Circuits Lab" }}
      />
    );

    // Theory block
    const theoryArticle = screen.getByRole("article", {
      name: /CS101 theory from 08:00 to 08:50 in slot A1 by Dr. Alan Turing/i
    });
    expect(theoryArticle).toBeInTheDocument();
    expect(theoryArticle).toHaveAttribute("tabIndex", "0");

    // Lab block (Combined L37+L38 session rendered as ONE continuous element)
    const labArticle = screen.getByRole("article", {
      name: /EE103 lab from 14:00 to 15:40 in slot L37\+L38 by Dr. Nikola Tesla/i
    });
    expect(labArticle).toBeInTheDocument();
    expect(labArticle).toHaveAttribute("tabIndex", "0");
  });
});
