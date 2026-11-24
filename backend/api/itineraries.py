"""LOCAL PREVIEW API: real PostgreSQL POIs + rule baseline + greedy optimizer.

NOT production-ready. Authentication and route-provider integration are absent.
Registered only when ENABLE_PREVIEW_ITINERARIES=1. Writes only to the DB named
by the standard DB_* environment variables. Use a disposable local test DB.
"""
from __future__ import annotations

import os
from datetime import date, datetime, time, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ai.mvp_pipeline import generate_preview
from ai.travel_matrix import SOURCE
from .database import get_connection

router = APIRouter(prefix="/itineraries", tags=["Local itinerary preview"])
TZ = ZoneInfo("Asia/Taipei")
ALIASES = {
    "taipei": ("Taipei", "台北", "臺北"),
    "tamsui": ("Tamsui", "淡水"),
    "new taipei": ("New Taipei", "新北"),
    "taichung": ("Taichung", "台中", "臺中"),
    "tainan": ("Tainan", "台南", "臺南"),
    "kaohsiung": ("Kaohsiung", "高雄"),
}


class GenerateInput(BaseModel):
    trip_id: UUID
    allow_estimated_travel: bool = False
    daily_start_time: str = Field(default="09:00", pattern=r"^\d{2}:\d{2}$")
    daily_end_time: str = Field(default="18:00", pattern=r"^\d{2}:\d{2}$")


def _find_pois(cursor, destination: str) -> list[dict]:
    """Scope POIs by address or region label; do not mix unrelated cities."""
    variants = ALIASES.get(destination.strip().lower(), (destination.strip(),))
    comparisons = []
    params = []
    for name in variants:
        pattern = f"%{name}%"
        for col in ("p.address", "r.name", "r.name_zh_hant", "r.name_en"):
            comparisons.append(f"COALESCE({col}, '') ILIKE %s")
            params.append(pattern)
    cursor.execute(
        """
        SELECT p.poi_id, p.name, p.latitude, p.longitude, p.category,
               p.tags, p.estimated_visit_minutes, p.opening_hours, p.rating,
               p.estimated_cost
        FROM public.pois p
        LEFT JOIN public.regions r ON r.region_id=p.region_id
        WHERE p.visibility='public' AND ("""
        + " OR ".join(comparisons) + """)
        ORDER BY p.rating DESC NULLS LAST, p.poi_id
        LIMIT 400
        """,
        params,
    )
    return [
        {
            "poi_id": str(row[0]), "name": row[1],
            "latitude": float(row[2]), "longitude": float(row[3]),
            "category": row[4], "tags": row[5],
            "estimated_visit_minutes": row[6], "opening_hours": row[7],
            "rating": float(row[8]) if row[8] is not None else None,
            "estimated_cost": float(row[9]) if row[9] is not None else None,
        }
        for row in cursor.fetchall()
    ]


@router.post("/generate", status_code=201)
def generate_itinerary(body: GenerateInput):
    if not body.allow_estimated_travel or os.getenv("ENABLE_ESTIMATED_TRAVEL") != "1":
        raise HTTPException(
            503,
            "Real routing provider not configured. To use an explicitly estimated "
            "LOCAL preview, set ENABLE_ESTIMATED_TRAVEL=1 and allow_estimated_travel=true.",
        )
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT trip_id,destination,start_date,end_date
                   FROM public.trips WHERE trip_id=%s FOR UPDATE""",
                (body.trip_id,),
            )
            record = cur.fetchone()
            if record is None:
                raise HTTPException(404, "Trip not found")
            trip_id, destination, start, end = record
            if not destination or not start or not end:
                raise HTTPException(422, "Trip destination and dates must be saved first")
            days = (end - start).days + 1
            if not 1 <= days <= 30:
                raise HTTPException(422, "Trip must last 1–30 days")

            cur.execute(
                """SELECT budget_level,transport_mode,pace,interests
                   FROM public.trip_preferences WHERE trip_id=%s""",
                (body.trip_id,),
            )
            prefs = cur.fetchone()
            if prefs is None:
                raise HTTPException(422, "Save trip preferences first")
            budget, transport, pace, interests = prefs

            cur.execute(
                "SELECT itinerary_id FROM public.itineraries WHERE trip_id=%s",
                (body.trip_id,),
            )
            if cur.fetchone():
                raise HTTPException(
                    409, "An itinerary already exists for this trip. Reopen it with GET."
                )

            raw = _find_pois(cur, destination)
            if not raw:
                raise HTTPException(422, f"No local POIs found for {destination}")
            trip_input = {
                "trip_id": str(trip_id), "destination": destination,
                "start_date": start.isoformat(), "days": days,
                "daily_start_time": body.daily_start_time,
                "daily_end_time": body.daily_end_time,
            }
            preferences = {
                "budget": budget, "transportation": transport or "walking",
                "pace": pace or "normal", "interests": interests or [],
            }
            try:
                result = generate_preview(trip_input, preferences, raw)
            except ValueError as exc:
                raise HTTPException(422, str(exc)) from exc
            if result["status"] == "failed" or result["summary"]["scheduled_poi_count"] == 0:
                raise HTTPException(422, "Unable to make a feasible itinerary with selected POIs")

            cur.execute(
                """INSERT INTO public.itineraries
                   (trip_id,version_number,version_status)
                   VALUES (%s,1,'current') RETURNING itinerary_id""",
                (trip_id,),
            )
            itinerary_id = cur.fetchone()[0]
            for rank, rec in enumerate(result["ranked_pois"], 1):
                cur.execute(
                    """INSERT INTO public.trip_recommendations
                       (trip_id,poi_id,score,reason,rank) VALUES (%s,%s,%s,%s,%s)""",
                    (trip_id, rec["poi_id"], rec["recommendation_score"],
                     rec["recommendation_reason"], rank),
                )
            for day in result["days"]:
                day_date = date.fromisoformat(day["date"])
                for stop in day["items"]:
                    arrive = datetime.combine(
                        day_date, time.fromisoformat(stop["start_time"]), tzinfo=TZ
                    )
                    depart = datetime.combine(
                        day_date, time.fromisoformat(stop["end_time"]), tzinfo=TZ
                    )
                    cur.execute(
                        """INSERT INTO public.itinerary_items
                           (itinerary_id,poi_id,day_number,visit_order,
                            arrival_time,departure_time,travel_minutes_from_previous,
                            travel_mode_from_previous)
                           VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
                        (itinerary_id, stop["poi_id"], day["day"],
                         stop["visit_order"], arrive, depart,
                         stop["travel_time_from_previous_minutes"], transport),
                    )
            for missing in result["unscheduled_pois"]:
                cur.execute(
                    """INSERT INTO public.itinerary_unscheduled_pois
                       (itinerary_id,poi_id,reason_code)
                       VALUES (%s,%s,%s)""",
                    (itinerary_id, missing["poi_id"], missing["reason"]),
                )
            cur.execute(
                "UPDATE public.trips SET status='planned' WHERE trip_id=%s",
                (trip_id,),
            )
            result["itinerary_id"] = str(itinerary_id)
            return result


@router.get("/{trip_id}")
def get_itinerary(trip_id: UUID):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT it.itinerary_id,t.destination,t.start_date,t.end_date
                   FROM public.itineraries it
                   JOIN public.trips t ON t.trip_id=it.trip_id
                   WHERE it.trip_id=%s AND it.version_status='current'""",
                (trip_id,),
            )
            header = cur.fetchone()
            if header is None:
                raise HTTPException(404, "No generated itinerary for this trip")
            itinerary_id, destination, first_date, last_date = header
            cur.execute(
                """SELECT ii.day_number,ii.visit_order,ii.poi_id,p.name,
                          ii.arrival_time,ii.departure_time,
                          ii.travel_minutes_from_previous,p.latitude,p.longitude,
                          p.category,tr.score,tr.reason
                   FROM public.itinerary_items ii
                   JOIN public.pois p ON p.poi_id=ii.poi_id
                   LEFT JOIN public.trip_recommendations tr
                     ON tr.trip_id=%s AND tr.poi_id=ii.poi_id
                   WHERE ii.itinerary_id=%s
                   ORDER BY ii.day_number,ii.visit_order""",
                (trip_id, itinerary_id),
            )
            stop_rows = cur.fetchall()
            cur.execute(
                """SELECT u.poi_id,p.name,u.reason_code FROM public.itinerary_unscheduled_pois u
                   JOIN public.pois p ON p.poi_id=u.poi_id WHERE u.itinerary_id=%s""",
                (itinerary_id,),
            )
            missing_rows = cur.fetchall()
    days = [
        {"day": i + 1, "date": (first_date + timedelta(days=i)).isoformat(), "items": []}
        for i in range((last_date - first_date).days + 1)
    ]
    for row in stop_rows:
        number, order, poi_id, name, arrival, departure, minutes, lat, lon, cat, score, reason = row
        days[number - 1]["items"].append({
            "visit_order": order,
            "poi_id": str(poi_id), "name": name,
            "start_time": arrival.astimezone(TZ).strftime("%H:%M"),
            "end_time": departure.astimezone(TZ).strftime("%H:%M"),
            "travel_time_from_previous_minutes": minutes,
            "latitude": float(lat), "longitude": float(lon),
            "category": cat,
            "recommendation_score": float(score) if score is not None else None,
            "recommendation_reason": reason,
        })
    return {
        "trip_id": str(trip_id), "itinerary_id": str(itinerary_id),
        "destination": destination, "status": "saved_preview",
        "preview_only": True,
        "travel_time_source": SOURCE,
        "recommendation_source": "rule_based_baseline_not_trained_ai",
        "days": days,
        "unscheduled_pois": [
            {"poi_id": str(r[0]), "name": r[1], "reason": r[2]} for r in missing_rows
        ],
        "warnings": [
            "Travel durations are approximations, NOT real routes.",
            "Always verify POI opening hours. This is a local preview, not a travel guarantee.",
        ],
    }
