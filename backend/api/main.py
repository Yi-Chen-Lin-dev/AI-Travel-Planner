from fastapi import FastAPI
from .database import get_connection

app = FastAPI(title="AI Travel Planner API")


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