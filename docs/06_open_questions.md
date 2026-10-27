# Open Architectural & Design Decisions

**For User Decision Prior to Phase 1 (Excel Ingestion & Validation)**

---

### Question 1: Canonical Offerings File Selection
- **Context**: We audited both `subject_teachers_slots_reviews_corrected_v2.xlsx` and `ffcs__4__1_.xlsx`. The former contains all 58 offerings, 56 distinct professors, complete theory/lab slot strings, timings, and review scores across 9 course sheets. The latter has 102 curriculum codes in sheet `2025` but only 10 faculty in draft course sheets.
- **Recommendation**: Designate `subject_teachers_slots_reviews_corrected_v2.xlsx` as the primary canonical offerings file, and use `ffcs__4__1_.xlsx` solely as a supplementary reference for official L-T-P-J-C credit breakdowns.
- **Decision Needed**: Do you approve using `subject_teachers_slots_reviews_corrected_v2.xlsx` as the single canonical offerings source for Phase 1?

---

### Question 2: Handling Placeholder Faculty (`No matching teacher found`)
- **Context**: In courses `BAHSM100` (Humanities, Social Science and Management) and `ANCILLARY` (Open Elective Ancillary), the slot is assigned (`D1+TD1`), but the teacher name is literally `"No matching teacher found"`.
- **Options**:
  1. *(Recommended)* Treat them as mandatory fixed-slot requirements with a labeled placeholder teacher (`[TBA / Unassigned]`) so that the timetable generator correctly accounts for the `D1+TD1` time commitment.
  2. Treat them as optional/electives that the student can toggle on or off in the UI.
- **Decision Needed**: Which behavior do you prefer for these two placeholder courses?

---

### Question 3: Semester Target Course Load & Credit Limits
- **Context**: The canonical Excel file contains 9 distinct courses totaling approximately 27 credits (assuming 3–4 credits per course). In standard VIT FFCS registrations, students typically select between 18 and 27 credits.
- **Options**:
  1. *(Recommended)* Support both full registration (all 9 courses scheduled simultaneously) and elective subset selection (the student selects $K$ courses from the catalog to generate combinations for).
  2. Enforce a strict minimum/maximum credit threshold during combination generation.
- **Decision Needed**: Should the generator default to finding schedules for all 9 courses, or let the user check/uncheck courses to generate?

---

### Question 4: Review Score Weighting & Conflicting Signals
- **Context**: We have review data from two distinct sources: (a) Column 9 in the Excel file (`Reviews / Ratings`), and (b) qualitative peer commentary in the WhatsApp chat exports. Furthermore, `faculty.json` from the web reference offers 341 external faculty ratings.
- **Options**:
  1. *(Recommended)* Multi-source composite score: Display the Excel rating prominently (e.g., 4.0/5), accompanied by direct WhatsApp review quotes and keyword badges (`lenient`, `quiz-heavy`, `chill`), allowing the student to see both qualitative and quantitative evidence.
  2. Rely strictly on the Excel Column 9 rating for ranking algorithms, treating WhatsApp quotes purely as readable tooltip notes.
- **Decision Needed**: How do you want review scores to influence the ranking algorithm?

---

### Question 5: Aptitude Trainer Options (`BASTS102`)
- **Context**: In sheet `Qualitative and Quantitative Sk` (`BASTS102`), all three rows share slot `F1+TF1`, with faculty listed as external training companies: `SIXPHRASE(A PT)`, `ETHNUS (APT)`, and `FACE (APT)`.
- **Options**:
  1. Treat all three aptitude trainers as interchangeable options with equal weight.
  2. Allow the user to drag-and-drop or select their preferred trainer order.
- **Decision Needed**: Is trainer order significant, or should the generator treat them as equal options for `F1+TF1`?

---

### Question 6: Classroom & Venue Allocations
- **Context**: The current datasets specify slots and timings, but do not specify building or room numbers (e.g., `SJT 401`, `TT 212`).
- **Options**:
  1. Leave venue fields optional/blank in the initial release, with support for user editing or manual venue entry.
  2. If a venue list or room timetable export exists, provide an ingestion path for it in later phases.
- **Decision Needed**: Confirm that venue display can remain optional/blank for the initial release.
