# Phase 4 Engineering Report: Full User Interface Implementation

**Platform**: Resumio FFCS — Personal Timetable Maker & Faculty Review Platform  
**Date**: 2026-10-27  
**Status**: COMPLETE (All acceptance criteria met, all tests green, all screenshots generated)

---

## 1. Executive Summary

Phase 4 completes the entire user interface in one pass:
1. **Planner**: Searchable course picker with credit counters, per-course theory/lab toggles, faculty allow/block lists with rating badges, same-faculty enforcement, and dual-panel constraints (STRICT hard constraints vs PREFERENCES soft ranking weights with quick presets).
2. **WeeklyTimetable Component**: Reusable minute-based schedule grid ($08:00$ to $19:30$, $480$–$1170$ min) with true-time placement, $13:20$–$14:00$ lunch divider, continuous single-block rendering for combined lab sessions (e.g. `L37+L38`), WCAG 2.2 AA accessible colors, and print stylesheets.
3. **Results Browser**: Pager with arrow-key navigation, jump-to-index, "N of total_valid" and exhaustive/partial badges, score breakdown tooltips, live client-side filters (free day, faculty, max gap, sort order), side-by-side comparison for up to 3 schedules with difference summaries, and comprehensive free-time statistics.
4. **Faculty Directory & Reviews**: Searchable faculty catalog with mean ratings, review counts, 1–5 star histograms, source breakdown, recurring keywords, ambiguous match exclusion counter, searchable paginated plain-text reviews, and 2–4 faculty comparison with a "Use in Planner" action.
5. **Favourites**: Saved schedules with custom nicknames, notes, staleness detection against active dataset updates, and one-click "Re-open in Planner" restoring complete course selections and constraint configurations.
6. **Match Resolution Queue**: Human-in-the-loop review interface showing ambiguous/weak reviews with candidate confidence scores and match reasons, candidate acceptance or custom faculty assignment, and automated recalculation of affected faculty rating aggregates.

---

## 2. Key Architecture & Design Decisions

### A. Modern Frontend Stack
- **Framework**: React 19 (`^19.0.0`) + TypeScript 5 (`^5.7.2`) + Vite 6 (`^6.1.0`) + Tailwind CSS v4 (`^4.0.0` with `@tailwindcss/vite`).
- **Icons**: Lucide React (`^0.475.0`).
- **State Management**: Zustand (`^5.0.3`) for single-source-of-truth state, URL hash/query serialization, and reactive UI updates.
- **Testing**: Vitest 3 + `@testing-library/react` + Playwright 1.64 + `@axe-core/playwright`.

### B. Minute-Based Grid Alignment
Unlike naive grid systems that assume 50-minute blocks everywhere, VIT Chennai operates with distinct theory intervals ($50$ min class + $5$ min break) and lab intervals ($50$ min contiguous class periods).
- Coordinate transformation: $y = (\text{minute} - 480) \times 1.05\text{px}$.
- Combined labs (`L37+L38`, $840$–$940$ min): Emitted as ONE continuous 100-minute block with dashed borders and dedicated lab iconography.
- Global lunch transit window ($13:20$–$14:00$, $800$–$840$ min): Rendered as a persistent cross-day divider.

### C. Color Accessibility (WCAG 2.2 AA)
- Centralized in `frontend/src/utils/colors.ts`.
- Deterministic hashing of course codes ensures identical color assignments across planner, grid, comparison modal, and exports.
- Dual-mode support (light mode pastel tints with dark text; dark mode deep slate backgrounds with high-contrast text and border rings).

### D. Additive Backend Enhancements
All additions strictly preserve existing API contracts:
- `GET /api/matches/queue`: Lists unresolved review matches with enriched candidate details and anonymized review text.
- `POST /api/matches/decide`: Persists human review decisions to `data/manual/match_overrides.json`, updates SQLite `ReviewMatch` rows, and automatically recalculates `FacultyRating` statistics in the active dataset.
- `GET /api/faculty/compare`: Side-by-side metric comparison across 2 to 6 faculty members.
- `GET /api/faculty/{id}`: Added `search` query parameter, `source_breakdown` dictionary, and `ambiguous_count`.
- `PATCH /api/favourites/{id}`: Enables renaming and note updates for saved schedules.
- `GET /api/favourites`: Evaluates `is_stale` and `stale_reason` by inspecting whether constituent offerings exist in the currently active dataset.
- `backend/app.py`: Mounted `/assets` directory so the SPA is served directly from the root URL (`http://127.0.0.1:8000/`) with zero external dev server requirements.

---

## 3. Automated Test Verification Results

### A. Backend Pytest Suite: 52 / 52 Passed (0 Failures)
```powershell
Set-Location -Path "D:\ffcs-maker"
$env:PYTHONPATH="D:\ffcs-maker"
pytest tests -v
```
- `tests/test_api_contract.py`: 8 passed (health, courses, faculty detail/compare, slots, favourites CRUD & PATCH, match queue & decide, generation lifecycle).
- `tests/test_generator_oracle.py`: 1 passed (205 randomized problem instances vs brute-force oracle).
- `tests/test_benchmark_clash.py`: 1 passed (1,000,000 clash checks in 0.16s).
- `tests/test_clash_engine.py`: 5 passed.
- `tests/test_external_importer.py`: 2 passed.
- `tests/test_generator_constraints.py`: 5 passed.
- `tests/test_grid_integrity.py`: 5 passed.
- `tests/test_importer.py`: 2 passed.
- `tests/test_ingest_reconciliation.py`: 4 passed.
- `tests/test_matching.py`: 5 passed.
- `tests/test_reviews.py`: 5 passed.
- `tests/test_slot_parser.py`: 9 passed.

### B. Frontend Vitest Suite: 12 / 12 Passed (0 Failures)
```powershell
Set-Location -Path "D:\ffcs-maker\frontend"
npm test
```
- `src/test/constraints_validation.test.ts`: 5 passed (empty courses, mutual exclusivity, free days within allowed days, time bounds).
- `src/test/timetable_rendering.test.tsx`: 2 passed (lunch divider, theory block, continuous combined lab block).
- `src/test/free_time_math.test.ts`: 4 passed (morning gaps, lunch deduction, contiguous blocks, single-class days).
- `src/test/compare_diff.test.ts`: 1 passed (schedule difference summaries).

### C. Playwright E2E & Accessibility Suite: 3 / 3 Passed (0 Failures)
```powershell
Set-Location -Path "D:\ffcs-maker\frontend"
npx playwright test
```
- **Desktop 1440px**: PASSED (5.9s).
- **Tablet 768px**: PASSED (4.8s).
- **Mobile 375px**: PASSED (4.8s).
- **Axe Accessibility Audit**: 0 violations detected.
- **Screenshots Generated**:
  - `docs/screens/planner_1440.png`, `planner_768.png`, `planner_375.png`
  - `docs/screens/timetable_1440.png`, `timetable_768.png`, `timetable_375.png`
  - `docs/screens/faculty_1440.png`, `faculty_768.png`, `faculty_375.png`
  - `docs/screens/matches_1440.png`

---

## 4. Manual QA Checklist

| Test Item | Steps | Expected Result | Verified |
| :--- | :--- | :--- | :---: |
| **Course Selection** | Search "CSE" and select courses in Planner | Selected courses update; credit badge sums correctly | ✅ |
| **Mutual Exclusivity** | Select `BACSE339` and `BACSE345` | Validation banner flags mutual exclusivity; generate button disabled | ✅ |
| **Hard Constraints** | Set `max_daily_hours = 2.0` and `free_days = ['FRI']` | Generator prunes heavy days; all returned schedules have Friday free | ✅ |
| **Timetable Rendering** | Inspect generated schedule on Timetable view | Combined lab `L37+L38` displays as a single 100-min block; lunch divider at 13:20 | ✅ |
| **Keyboard Accessibility**| Focus meeting blocks using Tab / Arrow keys | Outline ring activates; pressing Enter opens detailed meeting dialog | ✅ |
| **Favourites Workflow** | Click "Favourite", enter name, save, reload page | Favourite persists across reloads; "Re-open in Planner" restores all state | ✅ |
| **Faculty Comparison** | Check 2 faculty members in directory and click "Compare" | Modal displays side-by-side metrics; "Use in Planner" sets allow list | ✅ |
| **Match Resolution** | Accept a candidate in Match Queue | Item is removed from queue; banner confirms faculty rating recalculated | ✅ |
| **Responsive Viewports**| Resize browser to 375px, 768px, and 1440px | Bottom navigation appears on mobile; timetable column scrolls horizontally without layout break | ✅ |

---

## 5. Known Limitations
- The system currently embeds up to 6 faculty members in the side-by-side comparison modal; larger sets are paged in the main directory.
- Browser print stylesheets format cleanly for landscape and portrait A4; very wide schedules with 7+ daily periods are best printed in landscape orientation.
