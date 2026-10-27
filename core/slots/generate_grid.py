import json
import os

def parse_min(t_str: str) -> int:
    h, m = map(int, t_str.split(':'))
    return h * 60 + m

THEORY_INTERVALS = [
    ("08:00", "08:50"), # 0
    ("08:55", "09:45"), # 1
    ("09:50", "10:40"), # 2
    ("10:45", "11:35"), # 3
    ("11:40", "12:30"), # 4
    ("12:35", "13:25"), # 5
    ("14:00", "14:50"), # 6
    ("14:55", "15:45"), # 7
    ("15:50", "16:40"), # 8
    ("16:45", "17:35"), # 9
    ("17:40", "18:30"), # 10
    ("18:35", "19:25"), # 11
]

LAB_INTERVALS = [
    ("08:00", "08:50"), # 0
    ("08:50", "09:40"), # 1
    ("09:50", "10:40"), # 2
    ("10:40", "11:30"), # 3
    ("11:40", "12:30"), # 4
    ("12:30", "13:20"), # 5
    ("14:00", "14:50"), # 6
    ("14:50", "15:40"), # 7
    ("15:50", "16:40"), # 8
    ("16:40", "17:30"), # 9
    ("17:40", "18:30"), # 10
    ("18:30", "19:20"), # 11
]

GRID_TABLE = {
    "MON": {
        "theory": ["A1", "F1", "D1", "TB1", "TG1", "S11", "A2", "F2", "D2", "TB2", "TG2", "S3"],
        "lab":    ["L1", "L2", "L3", "L4",  "L5",  "L6",  "L31", "L32", "L33", "L34", "L35", "L36"]
    },
    "TUE": {
        "theory": ["B1", "G1", "E1", "TC1", "TAA1", None, "B2", "G2", "E2", "TC2", "TAA2", "S1"],
        "lab":    ["L7", "L8", "L9", "L10", "L11",  "L12", "L37", "L38", "L39", "L40", "L41", "L42"]
    },
    "WED": {
        "theory": ["C1", "A1", "F1", "TD1", "TBB1", None, "C2", "A2", "F2", "TD2", "TBB2", "S4"],
        "lab":    ["L13", "L14", "L15", "L16", "L17", "L18", "L43", "L44", "L45", "L46", "L47", "L48"]
    },
    "THU": {
        "theory": ["D1", "B1", "G1", "TE1", "TCC1", None, "D2", "B2", "G2", "TE2", "TCC2", "S2"],
        "lab":    ["L19", "L20", "L21", "L22", "L23", "L24", "L49", "L50", "L51", "L52", "L53", "L54"]
    },
    "FRI": {
        "theory": ["E1", "C1", "TA1", "TF1", "TDD1", "S15", "E2", "C2", "TA2", "TF2", "TDD2", None],
        "lab":    ["L25", "L26", "L27", "L28", "L29",  "L30", "L55", "L56", "L57", "L58", "L59",  "L60"]
    }
}

DAY_LAB_SEQUENCES = {
    "MON": {
        "morning": ["L1", "L2", "L3", "L4", "L5", "L6"],
        "afternoon": ["L31", "L32", "L33", "L34", "L35", "L36"]
    },
    "TUE": {
        "morning": ["L7", "L8", "L9", "L10", "L11", "L12"],
        "afternoon": ["L37", "L38", "L39", "L40", "L41", "L42"]
    },
    "WED": {
        "morning": ["L13", "L14", "L15", "L16", "L17", "L18"],
        "afternoon": ["L43", "L44", "L45", "L46", "L47", "L48"]
    },
    "THU": {
        "morning": ["L19", "L20", "L21", "L22", "L23", "L24"],
        "afternoon": ["L49", "L50", "L51", "L52", "L53", "L54"]
    },
    "FRI": {
        "morning": ["L25", "L26", "L27", "L28", "L29", "L30"],
        "afternoon": ["L55", "L56", "L57", "L58", "L59", "L60"]
    }
}

def build_grid_data():
    slot_meetings = {}
    grid_cells = []
    
    for day, day_data in GRID_TABLE.items():
        # Theory
        for col_idx, label in enumerate(day_data["theory"]):
            if label is not None:
                start_str, end_str = THEORY_INTERVALS[col_idx]
                s_min = parse_min(start_str)
                e_min = parse_min(end_str)
                meeting = {
                    "day": day,
                    "kind": "theory",
                    "period_idx": col_idx,
                    "start_time": start_str,
                    "end_time": end_str,
                    "start_minute": s_min,
                    "end_minute": e_min
                }
                if label not in slot_meetings:
                    slot_meetings[label] = {
                        "label": label,
                        "kind": "theory",
                        "meetings": []
                    }
                slot_meetings[label]["meetings"].append(meeting)
                grid_cells.append({
                    "day": day,
                    "period_idx": col_idx,
                    "kind": "theory",
                    "label": label,
                    "start_time": start_str,
                    "end_time": end_str,
                    "start_minute": s_min,
                    "end_minute": e_min
                })
                
        # Lab
        for col_idx, label in enumerate(day_data["lab"]):
            if label is not None:
                start_str, end_str = LAB_INTERVALS[col_idx]
                s_min = parse_min(start_str)
                e_min = parse_min(end_str)
                meeting = {
                    "day": day,
                    "kind": "lab",
                    "period_idx": col_idx,
                    "start_time": start_str,
                    "end_time": end_str,
                    "start_minute": s_min,
                    "end_minute": e_min
                }
                if label not in slot_meetings:
                    slot_meetings[label] = {
                        "label": label,
                        "kind": "lab",
                        "meetings": []
                    }
                slot_meetings[label]["meetings"].append(meeting)
                grid_cells.append({
                    "day": day,
                    "period_idx": col_idx,
                    "kind": "lab",
                    "label": label,
                    "start_time": start_str,
                    "end_time": end_str,
                    "start_minute": s_min,
                    "end_minute": e_min
                })
                
    return {
        "metadata": {
            "name": "VIT Chennai Campus Default Slot Matrix",
            "source_doc": "/docs/04_slot_grid_transcription.md",
            "source_image": "data/raw/FFCS On The Go Default Table (Timetable).jpg",
            "total_slots": len(slot_meetings),
            "total_grid_cells": len(grid_cells),
            "days": ["MON", "TUE", "WED", "THU", "FRI"]
        },
        "theory_intervals": [
            {"period_idx": i, "start_time": iv[0], "end_time": iv[1], "start_minute": parse_min(iv[0]), "end_minute": parse_min(iv[1])}
            for i, iv in enumerate(THEORY_INTERVALS) if iv is not None
        ],
        "lab_intervals": [
            {"period_idx": i, "start_time": iv[0], "end_time": iv[1], "start_minute": parse_min(iv[0]), "end_minute": parse_min(iv[1])}
            for i, iv in enumerate(LAB_INTERVALS) if iv is not None
        ],
        "day_table": GRID_TABLE,
        "day_lab_sequences": DAY_LAB_SEQUENCES,
        "slots": slot_meetings,
        "cells": grid_cells
    }

def main():
    data = build_grid_data()
    out_path = os.path.join(os.path.dirname(__file__), "grid.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"Generated {out_path} successfully. Total slot labels: {len(data['slots'])}, Total cells: {len(data['cells'])}")

if __name__ == "__main__":
    main()
