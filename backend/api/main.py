from fastapi import FastAPI

from .database import get_connection
from .trips import router as trips_router


app = FastAPI(title="AI Travel Planner API")

# Register trip-related API routes
app.include_router(trips_router)


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