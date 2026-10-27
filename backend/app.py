from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from backend.config import ALLOWED_ORIGINS
from backend.db.session import engine, Base
from backend.api import (
    routes_health,
    routes_datasets,
    routes_courses,
    routes_faculty,
    routes_slots,
    routes_favourites,
    routes_matches,
    routes_generate,
    routes_preferences,
    routes_exports
)

# Initialize database schema
Base.metadata.create_all(bind=engine)

# Ensure optional columns on favourites table if migrating
with engine.connect() as conn:
    from sqlalchemy import text
    try:
        conn.execute(text("ALTER TABLE favourites ADD COLUMN name VARCHAR"))
        conn.commit()
    except Exception:
        pass
    try:
        conn.execute(text("ALTER TABLE favourites ADD COLUMN payload JSON"))
        conn.commit()
    except Exception:
        pass

app = FastAPI(
    title="Resumio FFCS Timetable Maker API",
    description="Local-first personal FFCS timetable generation and faculty review matching platform for VIT.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware (strict localhost / 127.0.0.1 only)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(routes_health.router, prefix="/api")
app.include_router(routes_datasets.router, prefix="/api")
app.include_router(routes_courses.router, prefix="/api")
app.include_router(routes_faculty.router, prefix="/api")
app.include_router(routes_slots.router, prefix="/api")
app.include_router(routes_favourites.router, prefix="/api")
app.include_router(routes_matches.router, prefix="/api")
app.include_router(routes_generate.router, prefix="/api")
app.include_router(routes_preferences.router, prefix="/api")
app.include_router(routes_exports.router, prefix="/api")

# Static frontend serving
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIST)), name="static")
    if (FRONTEND_DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

@app.get("/", response_class=HTMLResponse)
def index_page():
    # If built frontend index.html exists, serve it
    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return index_file.read_text(encoding="utf-8")

    # Otherwise serve clean status/health page
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resumio FFCS Timetable Maker</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px; max-width: 600px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
        h1 { margin-top: 0; color: #38bdf8; font-size: 24px; }
        p { color: #94a3b8; line-height: 1.6; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: #065f46; color: #34d399; margin-bottom: 16px; }
        .endpoints { list-style: none; padding: 0; margin: 24px 0 0 0; }
        .endpoints li { margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 8px; }
        a { color: #38bdf8; text-decoration: none; font-weight: 500; }
        a:hover { text-decoration: underline; }
        code { background: #0f172a; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #cbd5e1; }
    </style>
</head>
<body>
    <div class="card">
        <span class="badge">SYSTEM READY</span>
        <h1>Resumio FFCS Timetable Maker</h1>
        <p>Local-first, constraint-guided timetable generator with fast interval clash engine and privacy-safe faculty reviews.</p>
        <ul class="endpoints">
            <li><span>API Interactive Documentation</span> <a href="/docs">OpenAPI /docs &rarr;</a></li>
            <li><span>System Health Status</span> <a href="/api/health"><code>/api/health</code></a></li>
            <li><span>Available Courses & Slots</span> <a href="/api/courses"><code>/api/courses</code></a></li>
            <li><span>Faculty & Aggregated Ratings</span> <a href="/api/faculty"><code>/api/faculty</code></a></li>
            <li><span>VIT Chennai Grid Matrix</span> <a href="/api/slots/grid"><code>/api/slots/grid</code></a></li>
        </ul>
    </div>
</body>
</html>"""
