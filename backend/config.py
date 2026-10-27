import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
SQLITE_DB_PATH = DATA_DIR / "app.db"

# Server configuration
HOST = os.getenv("RESUMIO_HOST", "127.0.0.1")
PORT = int(os.getenv("RESUMIO_PORT", 8000))
DEV_MODE = os.getenv("RESUMIO_DEV", "false").lower() in ("1", "true", "yes")

# CORS configuration: strict localhost only
ALLOWED_ORIGINS = [
    f"http://127.0.0.1:{PORT}",
    f"http://localhost:{PORT}",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
]
