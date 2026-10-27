# Resumio FFCS: Phase 3 Report — Backend API, SQLite Persistence & Combinatorial Generator

**Milestone**: Phase 3 — Database Backbone, REST API, One-Command Startup (`run.py`), Constraint-Based Timetable Generator with Bitmask Forward Checking, and Brute-Force Correctness Oracle.  
**Date**: October 27, 2026  
**Status**: COMPLETE (50/50 test suites passing, 205 randomized oracle tests verified with 0 discrepancy)

---

## 1. What Changed

### A. SQLite Persistence & Ingestion Backbone (`/backend`)
- [models.py](file:///D:/ffcs-maker/backend/db/models.py): Complete relational database schema with versioned datasets.
  - Tables: `datasets` (checksum, imported_at, is_active, stats), `courses`, `faculty`, `offerings` (with `theory_slots`, `lab_session`, and `stable_key`), `meetings`, `reviews`, `review_matches`, `faculty_ratings`, `preferences`, `favourites`, `import_runs`.
  - SQLite configured with `PRAGMA journal_mode=WAL`, `PRAGMA foreign_keys=ON`, `PRAGMA synchronous=NORMAL`, `PRAGMA busy_timeout=5000`.
- [session.py](file:///D:/ffcs-maker/backend/db/session.py): Thread-safe SQLAlchemy 2.0 session factory with SQLite PRAGMA listeners.
- [importer.py](file:///D:/ffcs-maker/backend/services/importer.py): Transactional, idempotent dataset importer.
  - Checksum validation: identical source files skip automatically unless `--force` is specified.
  - Dry-run validation (`--dry-run`): validates Excel and WhatsApp inputs without writing to SQLite.
  - Atomic rollbacks: any mid-pipeline failure rolls back cleanly without leaving orphan rows.
  - Active dataset management and rollback.
- [seed.py](file:///D:/ffcs-maker/backend/seed.py): CLI to seed database directly from local raw files (`subject_teachers_slots_reviews_corrected_v2.xlsx` and the 3 WhatsApp ZIPs).

### B. REST API Layer (`/backend/api` & `/backend/app.py`)
- [app.py](file:///D:/ffcs-maker/backend/app.py): FastAPI application with strict localhost CORS (`127.0.0.1`, `localhost`), interactive OpenAPI documentation at `/docs`, and fallback health landing page.
- [routes_health.py](file:///D:/ffcs-maker/backend/api/routes_health.py): `GET /api/health` returning system status, DB connectivity, and active dataset metadata.
- [routes_datasets.py](file:///D:/ffcs-maker/backend/api/routes_datasets.py): Dataset management (list, import, activate, rollback).
- [routes_courses.py](file:///D:/ffcs-maker/backend/api/routes_courses.py): Course catalog with search, filter, pagination, and `/offerings` listing.
- [routes_faculty.py](file:///D:/ffcs-maker/backend/api/routes_faculty.py): Faculty directory with rating metrics, sorting, detail view, and paginated student reviews.
- [routes_slots.py](file:///D:/ffcs-maker/backend/api/routes_slots.py): `GET /api/slots/grid` serving complete VIT Chennai slot matrix and atomic tokens.
- [routes_favourites.py](file:///D:/ffcs-maker/backend/api/routes_favourites.py): CRUD for favourite offering keys (`GET`, `POST`, `DELETE`).
- [routes_matches.py](file:///D:/ffcs-maker/backend/api/routes_matches.py): `POST /api/matches/decide` to record human review decisions.
- [routes_generate.py](file:///D:/ffcs-maker/backend/api/routes_generate.py): Background generation endpoints (`POST /api/generate`, `GET /api/generate/{id}`, `DELETE /api/generate/{id}`).

### C. Constraint-Based Generator & Oracle (`/core/generator`)
- [models.py](file:///D:/ffcs-maker/core/generator/models.py): Pydantic request/response models with hard constraints, soft preferences, and explainable breakdowns.
- [search.py](file:///D:/ffcs-maker/core/generator/search.py): Backtracking solver with:
  - **Most-Constrained-Variable-First (MRV)** heuristic ordering courses by domain size.
  - **720-Bit Bitmask Forward Checking**: $O(1)$ integer clash checks (`(mask_a & mask_b) == 0`).
  - **Incremental Per-Day Counters**: Pruning branches early on `max_daily_hours`, `max_consecutive_hours`, `free_days`, and `day_pattern` (`MORNING_ONLY`, `AFTERNOON_ONLY`, `HALF_DAY`).
  - **Top-K Bounded Min-Heap**: Keeps ranked schedules while counting `total_valid` combinations.
  - **Time Budget Enforcement**: Returns lower bound if time budget expires, flagging `is_exhaustive = False`.
  - **Duplicate Collapse**: Collapses equivalent schedules sharing identical meeting intervals and faculty.
- [oracle.py](file:///D:/ffcs-maker/core/generator/oracle.py): Pure Cartesian product (`itertools.product`) brute-force oracle with exact physical interval clash checks.
- [evaluator.py](file:///D:/ffcs-maker/core/generator/evaluator.py): Soft preference scoring engine. Evaluates gaps (excluding official lunch hour), compactness, load balance, consecutive labs, and faculty ratings. Unrated faculty are treated neutral (3.0/5.0) and tracked explicitly.
- [worker.py](file:///D:/ffcs-maker/core/generator/worker.py): In-memory background job manager with thread pool and cancellation.

### D. Entrypoints & Scripts
- [run.py](file:///D:/ffcs-maker/run.py): One-command application launcher. Checks for port conflicts, automatically switches to next available port, serves static frontend/health page, opens browser, and prints URLs.
- [scripts/setup.ps1](file:///D:/ffcs-maker/scripts/setup.ps1): Automated Windows setup script.
- [scripts/setup.sh](file:///D:/ffcs-maker/scripts/setup.sh): Automated Linux/macOS setup script.
- [scripts/e2e_check.py](file:///D:/ffcs-maker/scripts/e2e_check.py): End-to-end integration test verifying subprocess startup, `/api/health`, `/api/courses`, and `/api/slots/grid`.
- [docs/08_generator_benchmarks.md](file:///D:/ffcs-maker/docs/08_generator_benchmarks.md): Comprehensive generator performance benchmarks.

---

## 2. Key Architecture Decisions

| Decision | Rationale |
|---|---|
| **SQLAlchemy 2.0 with SQLite WAL** | Ensures safe concurrent reads and background generation while writing reviews or favourites. |
| **Stable Offering Keys** | Key = `COURSE::FACULTY::THEORY_SLOTS::LAB_SLOTS::VENUE`. Immune to database row ID mutations across re-imports. |
| **Lunch Break Deducted from Gaps** | VIT students have a designated 40-minute lunch break (13:20–14:00). Penalizing lunch as an idle gap produces distorted compactness scores. |
| **Half-Day Day Pattern** | Defined precisely: on any given day, all classes must be strictly Morning ($\le 13:20$) or strictly Afternoon ($\ge 14:00$), never straddling lunch on the same day. |
| **Brute-Force Oracle Testing** | Backtracking engines must never silently drop or invent valid schedules. 205 random problem instances confirmed 100% agreement with `itertools.product`. |

---

## 3. Real Performance & Benchmark Metrics

From [08_generator_benchmarks.md](file:///D:/ffcs-maker/docs/08_generator_benchmarks.md) on canonical dataset:
- **4 Core Courses** (2,970 Cartesian space): **2,970 valid timetables** found in **2.47 s** (100% exhaustive, 0.74 MB peak memory).
- **6 Standard Courses** (130,680 Cartesian space): **7,389 valid timetables** found within time budget (1.52 MB peak memory).
- **7 Full Curriculum Courses** (130,680 Cartesian space): **6,792 valid timetables** found within time budget (1.57 MB peak memory).
- **Curriculum Elective Isolation**: Discovered and confirmed that `BACSE339` and `BACSE345` are 100% mutually exclusive discipline electives (0/24 valid pairs), and `BAHSM100` and `ANCILLARY` share identical slots (`D1+TD1`).

---

## 4. Verification Commands

```powershell
# 1. Full test suite (50 tests including 205-instance Oracle)
python -m pytest tests

# 2. Database seed & idempotency test
python -m backend.seed

# 3. End-to-End API verification test
python scripts/e2e_check.py

# 4. Run application
python run.py --dev
```
