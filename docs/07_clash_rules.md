# VIT Institutional Clash & Scheduling Rules

**Compiled for User Confirmation Prior to Combinatorial Generation**

This document outlines institution-specific clash and scheduling constraints identified from the reference implementation (`mrRR7/ffcsmaker`), the provided Excel datasets, student chat discourse, and official VIT Vellore FFCS academic conventions.

---

## 1. Physical Time Interval Clash (Core Engine Rule)
- **Rule**: Two offerings clash if and only if they have physical meetings on the same day whose time intervals overlap:
  $$\text{day}_A = \text{day}_B \quad \text{AND} \quad \text{start}_A < \text{end}_B \quad \text{AND} \quad \text{start}_B < \text{end}_A$$
- **Boundary Handling**: Touching boundaries (e.g., Session 1 ending at `08:50` and Session 2 starting at `08:50`, or `08:51`) **do NOT clash**.
- **Cross-Type Asymmetry**: Theory and lab periods are not aligned in time. For example, Monday morning Lab `L2` (08:51–09:40) clashes with Theory `F1` (09:00–09:50) across a 40-minute window (09:00–09:40).

---

## 2. Combined Lab Continuity Constraint
- **Rule**: Every laboratory course requirement in VIT FFCS consists of two consecutive lab slots (e.g., `L37+L38` or `L43+L44`).
- **Enforcement**:
  1. Both slots must occur on the **same calendar day**.
  2. The slots must be **strictly adjacent** in the official grid sequence:
     - Morning valid pairs: `L1+L2`, `L3+L4`, `L5+L6`, `L7+L8`, `L9+L10`, `L11+L12`, `L13+L14`, `L15+L16`, `L17+L18`, `L19+L20`, `L21+L22`, `L23+L24`, `L25+L26`, `L27+L28`, `L29+L30`.
     - Afternoon valid pairs: `L31+L32`, `L33+L34`, `L35+L36`, `L37+L38`, `L39+L40`, `L41+L42`, `L43+L44`, `L45+L46`, `L47+L48`, `L49+L50`, `L51+L52`, `L53+L54`, `L55+L56`, `L57+L58`, `L59+L60`.
  3. Non-consecutive lab pairs (e.g., `L1+L3` or `L1+L31`) violate institutional rules and are rejected during validation.

---

## 3. Examination Slot Clashes (FAT / CAT Root Clashes)
- **Context**: In VIT Vellore, Continuous Assessment Tests (CATs) and Final Assessment Tests (FATs) schedule exams by slot codes rather than individual course codes:
  - Theory slots sharing the same base letter (e.g., `D1`, `TD1`, `TDD1`) may have their exams scheduled on the exact same morning or afternoon exam session.
- **Status for Confirmation**: In the current core clash engine, this is tracked as a soft constraint / warning flag (`exam_root_clash`), leaving hard rejection to physical meeting overlap unless the user explicitly enables strict exam clash prevention.

---

## 4. Protected Lunch Hour
- **Rule**: Neither morning nor afternoon theory/lab sessions may encroach into the protected lunch window:
  - Morning sessions end by **13:20** at the latest (Period 6 Lab `12:31–13:20`).
  - Afternoon sessions begin at **14:00** at the earliest.
  - The 40-minute window between **13:20 and 14:00** is institutionally reserved for lunch and transit.

---

## 5. Daily Cognitive & Travel Load (Soft Heuristics)
- **Maximum Daily Class Time**: A schedule should ideally avoid exceeding 6 hours of instruction per day.
- **Consecutive Theory Blocks**: Taking more than 3 consecutive 50-minute theory lectures without a break is flagged as high-fatigue in ranking profiles.
