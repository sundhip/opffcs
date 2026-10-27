# Phase 5 Report: Hardening, Full Export Suite, VIT Slot Matrix & Open Electives Ingestion

**Date**: 2026-10-27  
**Status**: COMPLETE (All 64 backend tests & 13 frontend tests passing)  
**Author**: Lead Software Architect

---

## 1. What Changed

### A. Exact VIT Slot Matrix Timetable View
- Redesigned `frontend/src/components/timetable/WeeklyTimetable.tsx` to match the exact VIT Chennai timetable matrix shown in user reference assets:
  - **Two Header Rows**: 
    - `THEORY HOURS`: Period times (`08:00 AM to 08:50 AM`, `08:55 AM to 09:45 AM`, `09:50 AM to 10:40 AM`, `10:45 AM to 11:35 AM`, `11:40 AM to 12:30 PM`, `12:35 PM to 01:25 PM`, Lunch `01:25 PM to 02:00 PM`, and Periods 7–12).
    - `LAB HOURS`: Period times (`08:00 AM to 08:50 AM`, `08:50 AM to 09:40 AM`, `09:50 AM to 10:40 AM`, `10:40 AM to 11:30 AM`, `11:40 AM to 12:30 PM`, `12:30 PM to 01:20 PM`, Lunch `01:20 PM to 02:00 PM`, and Periods 7–12).
  - **Days**: `MON` through `FRI` down the left column with distinct day headers.
  - **12 Period Columns + Central Lunch Column**: Rendered with static atomic slot pairs (e.g. `A1 / L1`, `F1 / L2`, `D1 / L3`, etc.).
  - **Enrolled Slot Cell Highlighting**: Occupied slots light up in bright lime green (`bg-lime-300 dark:bg-lime-400 text-slate-950 font-bold border border-lime-600`) displaying:
    - Slot label (e.g., `A1` or `L37`)
    - Course code (e.g., `BACSE204`)
    - Clickable popover showing full course title, faculty name, venue, and start/end time.
  - **Enrolled Courses Summary Table**: Positioned below the matrix table, rendering:
    - Columns: `Slot | Course Code | Course Title | Faculty | Venue | Credits`
    - Footer row calculating `Total Registered Credits: XX` dynamically.
  - **3 Core Action Buttons**:
    - `Download Timetable` (Emerald Green): One-click export download.
    - `Enable Quick Visualization` / `Toggle View` (Amber/Yellow): Toggles between the VIT Slot Matrix View and the Minute-Accurate Continuous Timeline View.
    - `Reset Table` (Rose Red): Resets timetable selection back to the Planner.

### B. Course Offerings Unpacking & Interactive Faculty Reviews
- Fixed `api.getCourseOfferings` in `frontend/src/services/api.ts` and `useAppStore.ts` to unwrap `{ offerings: [...] }` payload from the backend route.
- Expanded the per-course Options drawer in `frontend/src/components/planner/Planner.tsx`:
  - Clearly displays distinct Theory Slots and Lab Slots (e.g. `Theory: A1+TA1`, `Lab: L37+L38`) with visual badge distinction.
  - Added direct "Reviews (count)" buttons and info icons on faculty chips that open the full faculty reviews in the Faculty tab with zero friction.
  - Automatic `include_theory` and `include_lab` defaults based on whether the course actually offers theory or lab.

### C. Purely Structural Scheduling (Removal of Review Bias)
- Set default `faculty_rating_weight` to `0.0` in:
  - `core/generator/models.py` (`SoftPreferences`)
  - `frontend/src/store/useAppStore.ts` (`DEFAULT_SOFT_PREFERENCES`)
  - `backend/api/routes_preferences.py`
- Timetable generation and ranking now prioritize clash-freedom, minimal gaps, compact days, and free days without artificial review-based penalties.

### D. Open Electives Ingestion & Exact Credit Normalization
- Ingested all Open Elective course sheets from `subject_teachers_slots_reviews_corrected_v2.xlsx`:
  - `BASTS102`: 1 credit
  - `BAHSM100`: 3 credits
  - Open Electives (`ANCILLARY`, `BAMGT213`, `BAMGT215`, `BAMGT217`, `BAHUM204`, `BAHUM205`, `BAHUM203`, `BAMGT221`, `BAHUM202`): 3 credits each
  - Core Courses (`BACSE204`, `BACSE205`, `BAMAT205`, `BACSE324`, `BACSE339`, `BACSE345`): 4 credits each
- All 16 courses, 70 faculty, and 70 offerings cleanly imported into the active SQLite dataset with scoped primary keys (`{dataset_id}_{raw_id}`).

### E. Complete 4-Format Export Suite & Database Backups
- Implemented `/api/exports` endpoints in `backend/api/routes_exports.py` and `backend/services/exporter.py`:
  - **Excel (`.xlsx`)**: 3 sheets (Weekly Matrix with merged multi-period lab cells and color coding, Course List with venues and credits, Free-Time & Gap Summary).
  - **CSV (`.csv`)**: One row per meeting block with UTF-8 BOM for Microsoft Excel compatibility.
  - **PDF (`.pdf`)**: Clean landscape A4 schedule with table summary.
  - **PNG (`.png`)**: High-resolution raster grid generated via Pillow.
  - **ZIP Bundle (`.zip`)**: Bundles all four formats in a single download archive.
- Automated timestamped database backups (`data/backup_*.db`) created before every import commit.

---

## 2. Key Decisions & Rationale
1. **Scoped IDs for Dataset Rows**: Scoped `courses.id`, `faculty.id`, and `offerings.id` to `f"{dataset_id}_{raw_id}"`. This prevents SQLite UNIQUE primary key violations when re-importing updated Excel files or managing multiple dataset versions concurrently.
2. **Matrix Cell Occupancy Matching**: Enforced dual-check occupancy matching in `WeeklyTimetable.tsx` (atomic slot label equality and time-interval intersection), ensuring offset theory periods and continuous lab blocks map accurately to their respective cells.
3. **Neutral Faculty Rating Default**: Setting `faculty_rating_weight = 0.0` guarantees that schedule discovery is strictly structural and gap-minimizing; users can opt into rating-based weighting via the slider if desired.

---

## 3. Verification & Metrics

| Check | Target | Actual Result | Status |
| :--- | :--- | :--- | :--- |
| **Backend Tests (pytest)** | Full suite pass | 64 / 64 passed (0 failures) | PASS |
| **Frontend Tests (Vitest)** | Component & logic pass | 13 / 13 passed (0 failures) | PASS |
| **Frontend Build (`tsc && vite`)** | Zero type errors | Built in 2.05s | PASS |
| **Database Integrity** | `PRAGMA integrity_check` | `ok` (0 violations) | PASS |
| **Foreign Key Check** | `PRAGMA foreign_key_check` | 0 violations | PASS |
| **PII & Privacy Scanner** | 0 leaks (names/phones/emails) | 0 leaks detected | PASS |
| **Real Data Accuracy** | Excel & WhatsApp validation | 25/25 offerings & 25/25 reviews verified | PASS (100%) |

---

## 4. Manual QA Checklist
- [x] **Planner**: Select any course; verify credit count updates in top bar.
- [x] **Options Drawer**: Click "Options" on `BACSE204`; verify both Theory (`A1+TA1` / `B1`) and Lab (`L37+L38` / `L55+L56`) are visible.
- [x] **Faculty Reviews**: Click the "Reviews" button on any faculty chip; verify navigation to the Faculty tab with that teacher pre-selected.
- [x] **Generate**: Click "Generate Timetable"; verify generated schedules appear in the Results tab.
- [x] **Slot Matrix View**: Verify 2 header rows (`THEORY HOURS` / `LAB HOURS`), center `LUNCH` column, and bright lime highlighted enrolled cells.
- [x] **Action Buttons**: Click "Enable Quick Visualization" to toggle Timeline view; click "Switch to Slot Matrix" to return; click "Download Timetable" to trigger image/PDF export.
- [x] **Summary Table**: Verify enrolled course summary below the matrix displays slot, code, title, faculty, venue, and correct credits.
- [x] **Exports**: Verify Excel (.xlsx), CSV, PDF, and PNG exports download cleanly.
