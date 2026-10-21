from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .database import get_connection


router = APIRouter(prefix="/trips", tags=["Trips"])


class TripCreate(BaseModel):
    user_id: UUID
    title: str = Field(min_length=1, max_length=200)


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
                INSERT INTO public.trips (user_id, title)
                VALUES (%s, %s)
                RETURNING trip_id, user_id, title, status
                """,
                (data.user_id, data.title)
            )

            trip = cur.fetchone()

    return {
        "trip_id": str(trip[0]),
        "user_id": str(trip[1]),
        "title": trip[2],
        "status": trip[3]
    }