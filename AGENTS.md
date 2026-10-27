# Project Operating Rules & Agent Guidelines

Resumio / FFCS-Maker is a production-grade, local-first timetable generation and faculty evaluation system for VIT Vellore. All AI agents, contributors, and automated tooling must strictly comply with these rules.

---

## 1. Absolute Truth & Data Integrity (Rule 1 & Rule 3)
- **Never invent data**: Do not fabricate faculty names, slot combinations, review text, ratings, courses, or schedule metrics.
- Every metric, count, and statistical summary must be derived directly from code execution on actual data files.
- If data is missing or incomplete (e.g. placeholder teachers like `"No matching teacher found"`), report it explicitly as unassigned/missing instead of synthesizing placeholders.

## 2. Immutability of Original Uploads (Rule 8)
- **Never modify originals**: Uploaded files located in `data/raw/` (or external upload folders) are read-only.
- All transformations must write to distinct output targets (e.g., `data/processed/`, `scratch/`).

## 3. Incremental Engineering & Non-Destructive Extension (Rule 1)
- **Extend, don't rewrite**: Audit existing working modules before modifying them.
- Preserve existing public interfaces and existing test coverage.
- If an existing function must be refactored, state the exact rationale and ensure regression tests pass.

## 4. Test-Driven Verification (Rule 9)
- **Every feature ships with automated tests**: Unit tests, golden tests, and edge case coverage are mandatory.
- Full test suites must be executed and passing before declaring any phase or task complete.
- Benchmarks must record real measured runtimes.

## 5. Absolute Privacy & PII Scrubbing (Rule 4 & Rule 8)
- **No personal data in outputs**: WhatsApp exports contain student phone numbers and real names. These must never be logged, written to `data/processed/`, or surfaced in documents.
- Phone numbers must be redacted via regex (`[PHONE_REDACTED]`); senders must be hashed to synthetic anonymized tokens or stripped entirely upon ingestion.

## 6. End-of-Task Protocol (Rule 9)
Every task, phase, or milestone must conclude with a comprehensive report stating:
1. Files changed / created.
2. Automated tests executed with exact commands and pass/fail counts.
3. Quantified results and reconciliation metrics.
4. Known issues, limitations, and edge cases flagged for user confirmation.
