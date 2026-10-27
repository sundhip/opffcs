import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from core.slots.slot_map import default_slot_map

router = APIRouter(prefix="/slots", tags=["Slots"])

GRID_JSON_PATH = Path("core/slots/grid.json")

@router.get("/grid")
def get_slot_grid():
    if not GRID_JSON_PATH.exists():
        raise HTTPException(status_code=500, detail="grid.json not found.")

    with open(GRID_JSON_PATH, "r", encoding="utf-8") as f:
        grid_data = json.load(f)

    # Add slot count and distinct atomic slot labels
    grid_data["atomic_slot_labels"] = sorted(default_slot_map.get_all_labels())
    return grid_data

