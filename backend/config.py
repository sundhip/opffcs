import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
SQLITE_DB_PATH = DATA_DIR / "app.db"

# Server configuration (supports cloud environments like Render, Railway, Cloud Run)
HOST = os.getenv("RESUMIO_HOST", os.getenv("HOST", "0.0.0.0"))
PORT = int(os.getenv("PORT", os.getenv("RESUMIO_PORT", 8000)))
DEV_MODE = os.getenv("RESUMIO_DEV", "false").lower() in ("1", "true", "yes")

# CORS configuration: allows localhost and cloud deployment origins
CORS_ENV = os.getenv("ALLOWED_ORIGINS", "*")
if CORS_ENV == "*":
    ALLOWED_ORIGINS = ["*"]
else:
    ALLOWED_ORIGINS = [
        f"http://127.0.0.1:{PORT}",
        f"http://localhost:{PORT}",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ] + [origin.strip() for origin in CORS_ENV.split(",") if origin.strip()]
