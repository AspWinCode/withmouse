import time
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.db.database import Base, engine
from app.api.routes import auth, professions, tests, assignments, submissions, admin

logger = logging.getLogger(__name__)


def init_db(retries: int = 10, delay: int = 3) -> None:
    """Create tables with retry loop — handles DB not-yet-ready on container start."""
    for attempt in range(1, retries + 1):
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables ready")
            return
        except Exception as exc:
            if attempt == retries:
                logger.error("Database unreachable after %d attempts: %s", retries, exc)
                raise
            logger.warning(
                "DB connection attempt %d/%d failed (%s) — retrying in %ds...",
                attempt, retries, exc, delay,
            )
            time.sleep(delay)


# Initialise DB (with retry)
init_db()

# Create upload directories
for subdir in ["professions/images", "professions/videos", "assignments", "submissions"]:
    os.makedirs(os.path.join(settings.UPLOAD_DIR, subdir), exist_ok=True)

app = FastAPI(
    title="С мышкой по жизни",
    description="Профориентационный образовательный портал",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS
cors_origins = list(settings.CORS_ORIGINS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static uploads
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Routers
app.include_router(auth.router, prefix="/api")
app.include_router(professions.router, prefix="/api")
app.include_router(tests.router, prefix="/api")
app.include_router(assignments.router, prefix="/api")
app.include_router(submissions.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "С мышкой по жизни"}
