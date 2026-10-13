"""
main.py — FastAPI Application Entry Point
Registers all routers and middleware.
"""

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database import engine, Base, get_db
from backend.routers import auth, predictions, shipments, warehouses, farmers, notifications, telemetry, admin

# ── Create all database tables on startup ─────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Agri Loss AI Logistic API",
    description=(
        "Backend API for Agri Loss AI Logistic — Post-Harvest Loss Reduction Prediction System. "
        "Bangalore Institute of Technology — CSE Dept — Major Project 2023-27."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── CORS Middleware (allow Streamlit & React Vite local dev origins) ──────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8501",
        "http://127.0.0.1:8501",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routers ─────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(predictions.router)
app.include_router(shipments.router)
app.include_router(warehouses.router)
app.include_router(farmers.router)
app.include_router(notifications.router)
app.include_router(telemetry.router)
app.include_router(admin.router)



# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "unreachable"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "service": "Agri Loss AI Logistic API",
        "version": "1.0.0",
    }


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to Agri Loss AI Logistic API",
        "docs": "/api/docs",
        "health": "/api/health",
    }
