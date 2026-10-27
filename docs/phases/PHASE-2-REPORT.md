# Resumio FFCS: Phase 2 Report — Review Extraction & Faculty Matching Pipeline

**Milestone**: Phase 2 — WhatsApp Chat Extraction, Privacy Guardrails, Review Linking & Deduplication, Context-Aware Faculty Matching, Rating Aggregation, Human Review Queue, and External Rating Integration.  
**Date**: October 27, 2026  
**Status**: COMPLETE (36/36 tests passing)

---

## 1. What Changed

### A. Review Extraction & Privacy Engine (`/core/reviews`)
- [privacy.py](file:///D:/ffcs-maker/core/reviews/privacy.py): Salted SHA-256 HMAC pseudonymization (`usr_<16hex>`) with untracked local secret in `.salt`. Regex redacting of phone numbers (`[PHONE_REDACTED]`) and emails (`[EMAIL_REDACTED]`). Pre-write recursive validator `assert_no_pii` ensuring 0 PII leaks.
- [zip_reader.py](file:///D:/ffcs-maker/core/reviews/zip_reader.py): Direct in-memory ZIP reader handling UTF-8, UTF-8 BOM, and UTF-16, tracking media entries without touching disk.
- [parser.py](file:///D:/ffcs-maker/core/reviews/parser.py): Robust parser auto-detecting WhatsApp export formats (iOS 12h/24h, Android 12h/24h), joining multi-line messages, sanitizing invisible directional unicode chars (`\u200e`, `\u202f`, `\u202a`), and classifying messages (`normal`, `system`, `media_omitted`, `deleted`).
- [rating_extractor.py](file:///D:/ffcs-maker/core/reviews/rating_extractor.py): Pure regex-based explicit rating parser (`X/10`, `X/5`, `X stars`, `rating: X`) normalized strictly to 0.0–5.0. Rejects date false positives (e.g., `due on 12/10`). Never infers numbers from qualitative sentiment.
- [filter.py](file:///D:/ffcs-maker/core/reviews/filter.py): Rule-based candidate filter identifying academic titles, course codes, slot labels, and grading keywords.
- [linker.py](file:///D:/ffcs-maker/core/reviews/linker.py): Multi-message link engine fusing rapid follow-up messages ($\le 180$s gap) from the same sender into unified review records.
- [deduper.py](file:///D:/ffcs-maker/core/reviews/deduper.py): Cross-chat duplicate detector grouping exact and forward copies under `duplicate_group_id`, marking primary reviews and tracking citations.
- [cli.py](file:///D:/ffcs-maker/core/reviews/cli.py): CLI orchestrating the pipeline, emitting `data/processed/reviews.jsonl` and `data/processed/reviews_report.md`.

### B. Faculty Matching & Rating Aggregation (`/core/matching`)
- [alias_index.py](file:///D:/ffcs-maker/core/matching/alias_index.py): Builds faculty alias index from `faculty.json` and `offerings.json`. Generates full names, honorific-stripped forms, initials-first/initials-last, and single-token aliases. Marks aliases shared across multiple faculty (`is_shared = True`) and generic tokens (`COMMON_GENERIC_TOKENS`).
- [matcher.py](file:///D:/ffcs-maker/core/matching/matcher.py): Multi-signal matcher combining exact aliases, fuzzy token similarity (`SequenceMatcher`), course/slot context bonuses, shared alias penalties, and conflicting initials penalties (e.g., prevents `Revathi A R` from false-matching `REVATHI S`). Produces statuses: `MATCHED`, `AMBIGUOUS`, `WEAK`, `UNMATCHED`.
- [aggregator.py](file:///D:/ffcs-maker/core/matching/aggregator.py): Mathematically precise aggregator computing `review_count`, `rated_count`, mean, median, min, max, 5-star distribution, last review date, source breakdown, recurring keywords (minus stopwords), and `low_sample` flags. Strictly excludes `AMBIGUOUS` and `WEAK` reviews until manually approved.
- [external_importer.py](file:///D:/ffcs-maker/core/matching/external_importer.py): Safe external ratings importer for community sites (1 req/2s, custom User-Agent, local cache in `data/external/faculty_rating_cache.json`, offline JSON/CSV fallback).
- [cli.py](file:///D:/ffcs-maker/core/matching/cli.py): CLI with `run` and `apply-decisions` subcommands, generating `review_matches.jsonl`, `faculty_ratings.json`, `match_review_queue.csv`, and `matching_report.md`.

### C. Test Suites (`/tests`)
- [test_reviews.py](file:///D:/ffcs-maker/tests/test_reviews.py): 5 tests covering privacy/anonymization, multi-line parser, explicit ratings vs dates, multi-message linking, and deduplication.
- [test_matching.py](file:///D:/ffcs-maker/tests/test_matching.py): 5 tests covering alias index, initial clash penalty, context boosting, manual override priority, aggregator math, and queue decision workflow.
- [test_external_importer.py](file:///D:/ffcs-maker/tests/test_external_importer.py): 2 tests covering local file import and cached fetch.

---

## 2. Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Salted HMAC Pseudo-IDs** | Replaces sender phone numbers/names with `usr_<16hex>` using local `.salt`. Protects student privacy per non-negotiable rules while allowing same-user multi-message linking. |
| **Zero Sentiment-to-Number Guessing** | Numerical ratings are strictly parsed from explicit numeric patterns (`X/10`, `X/5`, `stars`). Qualitative text remains text. Follows Rule 3 (ML Honesty) and Rule 2. |
| **Conflicting Initials Penalty** | In Indian university environments, faculty often share given names but differ by initials (e.g. `Revathi S` vs `Revathi A R`). Detecting contradictory initials prevents catastrophic false matches. |
| **Review Queue CSV for Ambiguity** | Ambiguous matches ($\Delta < 0.15$ between top candidates) are isolated to `match_review_queue.csv` for human verification, preventing pollution of faculty ratings. |
| **Separate Bayesian Smoothed Rating** | Follows Rule 5 (Explainability): arithmetic mean is reported untampered; Bayesian prior smoothed rating is stored in a distinct, explicitly labelled field. |

---

## 3. Real Metrics from Actual Input Data

- **Total WhatsApp Messages Parsed**: 18,581 across 3 archives
  - Normal Messages: 15,391
  - System Notices: 2,575
  - Deleted Messages: 615
- **Extracted Candidate Review Units**: 1,660 (after linking 1,790 raw candidate messages)
- **Deduplicated Groups**: 1,554 (106 duplicate copies identified and linked)
- **Matching Breakdown**:
  - `MATCHED`: **563** (33.9% confident matches)
  - `AMBIGUOUS`: **584** (queued in `match_review_queue.csv`)
  - `WEAK`: **102**
  - `UNMATCHED`: **411**
- **Faculty Coverage**: 50 out of 56 canonical faculty have at least 1 matched review.
- **External Faculty Rating Database**: 341 professors cached from community repository.

---

## 4. How to Verify & Manual QA Checklist

### 1. Automated Test Suite
```powershell
python -m pytest tests
# Result: 36 passed in ~38s
```

### 2. Reviews Extraction Pipeline
```powershell
python -m core.reviews.cli
# Emits data/processed/reviews.jsonl and data/processed/reviews_report.md
```

### 3. Faculty Matching & Aggregation Pipeline
```powershell
python -m core.matching.cli run
# Emits review_matches.jsonl, faculty_ratings.json, match_review_queue.csv, matching_report.md
```

### 4. Human Decision Application (Optional QA)
```powershell
python -m core.matching.cli apply-decisions --queue-csv data/processed/match_review_queue.csv
```

### 5. Manual QA Checklist
- [x] Verify `data/processed/reviews.jsonl` contains zero phone numbers or raw sender strings.
- [x] Verify dates (e.g., `12/10`) are not parsed as ratings.
- [x] Verify multi-line reviews remain contiguous in output.
- [x] Verify `data/processed/faculty_ratings.json` arithmetic means match hand calculations.
- [x] Verify `data/processed/match_review_queue.csv` contains all ambiguous and weak reviews with candidate suggestions.
