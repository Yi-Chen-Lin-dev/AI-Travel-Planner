
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import get_connection
from .trips import router as trips_router
from .preferences import router as preferences_router
from .pois import router as pois_router


app = FastAPI(title="AI Travel Planner API")

# Allow local frontend development origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# Register API routes
app.include_router(trips_router)
app.include_router(preferences_router)
app.include_router(pois_router)


@app.get("/")
def home():
    return {"message": "AI Travel Planner API is running"}


@app.get("/db-check")
def check_database():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT current_database(), current_user")
            result = cur.fetchone()

    return {
        "status": "connected",
        "database": result[0],
        "user": result[1]
    }
