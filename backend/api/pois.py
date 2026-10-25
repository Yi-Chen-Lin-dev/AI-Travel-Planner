from fastapi import APIRouter

from .database import get_connection


router = APIRouter(prefix="/pois", tags=["POIs"])


@router.get("/")
def get_pois():
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Retrieve public POIs from the database
            cur.execute(
                """
                SELECT
                    poi_id,
                    name,
                    address,
                    latitude,
                    longitude,
                    category,
                    tags,
                    estimated_visit_minutes,
                    estimated_cost,
                    opening_hours,
                    rating,
                    review_count,
                    source
                FROM public.pois
                WHERE visibility = 'public'
                ORDER BY name
                """
            )

            rows = cur.fetchall()

    # Convert database rows into JSON-compatible objects
    pois = []

    for row in rows:
        pois.append(
            {
                "poi_id": str(row[0]),
                "name": row[1],
                "address": row[2],
                "latitude": float(row[3]),
                "longitude": float(row[4]),
                "category": row[5],
                "tags": row[6],
                "estimated_visit_minutes": row[7],
                "estimated_cost": (
                    float(row[8]) if row[8] is not None else None
                ),
                "opening_hours": row[9],
                "rating": (
                    float(row[10]) if row[10] is not None else None
                ),
                "review_count": row[11],
                "source": row[12],
            }
        )

    return pois