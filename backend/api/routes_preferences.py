from datetime import datetime
from typing import Optional, Dict, Any, List
import copy
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from backend.db.session import get_db
from backend.db.models import Preference

router = APIRouter(prefix="/preferences", tags=["Preferences"])

CURRENT_SCHEMA_VERSION = 2

class UserPreferencesPayload(BaseModel):
    schema_version: int = Field(default=CURRENT_SCHEMA_VERSION)
    theme: str = Field(default="dark", pattern="^(dark|light)$")
    hard_constraints: Dict[str, Any] = Field(default_factory=dict)
    soft_preferences: Dict[str, Any] = Field(default_factory=dict)
    selected_courses: List[str] = Field(default_factory=list)
    named_presets: Dict[str, Any] = Field(default_factory=dict)

class NamedPresetRequest(BaseModel):
    name: str
    hard_constraints: Dict[str, Any]
    soft_preferences: Dict[str, Any]

def migrate_preferences_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Forward migration handler for preferences schema."""
    version = payload.get("schema_version", 1)

    if version == 1:
        # Migrate v1 to v2: ensure day_pattern and compactness_weight exist
        hard_c = payload.get("hard_constraints", {})
        if "day_pattern" not in hard_c:
            hard_c["day_pattern"] = "ANY"
        payload["hard_constraints"] = hard_c

        soft_p = payload.get("soft_preferences", {})
        if "compactness_weight" not in soft_p:
            soft_p["compactness_weight"] = 0.5
        payload["soft_preferences"] = soft_p

        payload["schema_version"] = 2

    return payload

@router.get("")
def get_preferences(db: Session = Depends(get_db)):
    pref = db.query(Preference).filter(Preference.name == "user_active_settings").first()
    if not pref:
        # Return sensible defaults
        return {
            "schema_version": CURRENT_SCHEMA_VERSION,
            "theme": "dark",
            "hard_constraints": {},
            "soft_preferences": {},
            "selected_courses": [],
            "named_presets": {},
            "updated_at": datetime.utcnow().isoformat()
        }

    migrated = migrate_preferences_payload(dict(pref.payload))
    if migrated.get("schema_version") != pref.payload.get("schema_version"):
        pref.payload = migrated
        db.commit()

    return {
        **migrated,
        "updated_at": pref.updated_at.isoformat()
    }

@router.post("")
def save_preferences(payload: UserPreferencesPayload, db: Session = Depends(get_db)):
    pref = db.query(Preference).filter(Preference.name == "user_active_settings").first()
    migrated = migrate_preferences_payload(payload.model_dump())

    if not pref:
        pref = Preference(
            id="pref_active_user",
            name="user_active_settings",
            payload=migrated,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(pref)
    else:
        pref.payload = migrated
        pref.updated_at = datetime.utcnow()
        flag_modified(pref, "payload")

    db.commit()
    return {"status": "saved", "schema_version": migrated.get("schema_version")}

@router.post("/presets")
def save_named_preset(preset: NamedPresetRequest, db: Session = Depends(get_db)):
    pref = db.query(Preference).filter(Preference.name == "user_active_settings").first()
    if not pref:
        payload = {
            "schema_version": CURRENT_SCHEMA_VERSION,
            "theme": "dark",
            "hard_constraints": {},
            "soft_preferences": {},
            "selected_courses": [],
            "named_presets": {}
        }
        pref = Preference(
            id="pref_active_user",
            name="user_active_settings",
            payload=payload,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(pref)
        db.flush()

    current_payload = copy.deepcopy(pref.payload or {})
    named = current_payload.get("named_presets", {})
    named[preset.name.strip()] = {
        "hard_constraints": preset.hard_constraints,
        "soft_preferences": preset.soft_preferences,
        "created_at": datetime.utcnow().isoformat()
    }
    current_payload["named_presets"] = named
    pref.payload = current_payload
    pref.updated_at = datetime.utcnow()
    flag_modified(pref, "payload")
    db.commit()

    return {"status": "preset_saved", "name": preset.name.strip()}

@router.delete("/presets/{name}")
def delete_named_preset(name: str, db: Session = Depends(get_db)):
    pref = db.query(Preference).filter(Preference.name == "user_active_settings").first()
    if not pref:
        raise HTTPException(status_code=404, detail="Preferences not found.")

    current_payload = copy.deepcopy(pref.payload or {})
    named = current_payload.get("named_presets", {})
    if name not in named:
        raise HTTPException(status_code=404, detail=f"Preset '{name}' not found.")

    del named[name]
    current_payload["named_presets"] = named
    pref.payload = current_payload
    pref.updated_at = datetime.utcnow()
    flag_modified(pref, "payload")
    db.commit()

    return {"status": "preset_deleted", "name": name}
