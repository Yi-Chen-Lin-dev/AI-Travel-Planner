from datetime import date
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator

from .database import get_connection


router = APIRouter(prefix="/trips", tags=["Trips"])


class TripCreate(BaseModel):
    user_id: UUID
    title: str = Field(min_length=1, max_length=150)
    destination: str | None = Field(default=None, min_length=1, max_length=200)
    start_date: date | None = None
    end_date: date | None = None

    @model_validator(mode="after")
    def validate_dates(self):
        if (self.start_date is None) != (self.end_date is None):
            raise ValueError("start_date and end_date must be provided together")
        if self.start_date is not None and self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


@router.post("/", status_code=201)
def create_trip(data: TripCreate):
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Verify that the user exists
            cur.execute(
                "SELECT 1 FROM public.users WHERE user_id = %s",
                (data.user_id,)
            )

            if cur.fetchone() is None:
                raise HTTPException(
                    status_code=404,
                    detail="User not found"
                )

            # Create a new trip with draft status
            cur.execute(
                """
                INSERT INTO public.trips (user_id, title, destination, start_date, end_date)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING trip_id, user_id, title, destination, start_date, end_date, status
                """,
                (data.user_id, data.title, data.destination, data.start_date, data.end_date)
            )

            trip = cur.fetchone()

    return {
        "trip_id": str(trip[0]),
        "user_id": str(trip[1]),
        "title": trip[2],
        "destination": trip[3],
        "start_date": trip[4].isoformat() if trip[4] else None,
        "end_date": trip[5].isoformat() if trip[5] else None,
        "status": trip[6]
    }

@router.get("/")
def get_trips(user_id: UUID):
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Retrieve trips belonging to the specified user
            cur.execute(
                """
                SELECT trip_id, user_id, title, destination,
                       start_date, end_date, status
                FROM public.trips
                WHERE user_id = %s
                ORDER BY created_at DESC
                """,
                (user_id,)
            )

            trips = cur.fetchall()

    return [
        {
            "trip_id": str(trip[0]),
            "user_id": str(trip[1]),
            "title": trip[2],
            "destination": trip[3],
            "start_date": trip[4].isoformat() if trip[4] else None,
            "end_date": trip[5].isoformat() if trip[5] else None,
            "status": trip[6]
        }
        for trip in trips
    ]