from uuid import UUID
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .database import get_connection


router = APIRouter(prefix="/preferences", tags=["Preferences"])


class PreferenceCreate(BaseModel):
    trip_id: UUID

    budget: Literal["low", "medium", "high"]

    transportation: Literal[
        "walking",
        "public_transport",
        "driving"
    ]

    pace: Literal["relaxed", "normal", "fast"]

    interests: list[
        Literal[
            "food",
            "culture",
            "nature",
            "shopping",
            "entertainment"
        ]
    ] = Field(default_factory=list)


@router.post("/", status_code=200)
def save_preferences(data: PreferenceCreate):
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Verify that the trip exists
            cur.execute(
                "SELECT 1 FROM public.trips WHERE trip_id = %s",
                (data.trip_id,)
            )

            if cur.fetchone() is None:
                raise HTTPException(
                    status_code=404,
                    detail="Trip not found"
                )

            # Insert preferences or update the existing record
            cur.execute(
                """
                INSERT INTO public.trip_preferences (
                    trip_id,
                    budget_level,
                    transport_mode,
                    pace,
                    interests
                )
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (trip_id)
                DO UPDATE SET
                    budget_level = EXCLUDED.budget_level,
                    transport_mode = EXCLUDED.transport_mode,
                    pace = EXCLUDED.pace,
                    interests = EXCLUDED.interests,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING trip_id, budget_level,
                          transport_mode, pace, interests
                """,
                (
                    data.trip_id,
                    data.budget,
                    data.transportation,
                    data.pace,
                    data.interests
                )
            )

            preference = cur.fetchone()

    return {
        "trip_id": str(preference[0]),
        "budget": preference[1],
        "transportation": preference[2],
        "pace": preference[3],
        "interests": preference[4]
    }