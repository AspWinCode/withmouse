from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.db.database import Base, engine
from app.api.routes import auth, professions, tests, assignments, submissions, admin

# Create tables
Base.metadata.create_all(bind=engine)

# Ensure upload directories exist
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
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
