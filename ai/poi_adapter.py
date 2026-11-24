"""Normalize POI records for recommendation and optimizer input.

Unknown opening hours stay unknown (None), closed becomes [], and only explicit
HH:MM-HH:MM intervals are accepted. We never infer that a place is open.
"""
from __future__ import annotations

import re
from datetime import date, timedelta
from typing import Any

from ai.recommendation_baseline import canonical_category

DAYS = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")
INTERVAL = re.compile(r"^((?:[01]\d|2[0-3]):[0-5]\d)\s*[-–~～]\s*((?:[01]\d|2[0-3]):[0-5]\d)$")
CLOSED = {"休息", "公休", "closed", "不營業", "暫停營業"}


def normalize_day(raw: Any) -> list[dict[str, str]] | None:
    if raw is None:
        return None
    if raw == []:
        return []
    if isinstance(raw, str):
        if raw.strip().lower() in CLOSED:
            return []
        segments = re.split(r"\s*[、,;；]\s*", raw.strip())
        normalized = []
        for segment in segments:
            match = INTERVAL.fullmatch(segment.strip())
            if not match:
                return None
            start, end = match.group(1), match.group(2)
            if start >= end:
                return None
            normalized.append({"open": start, "close": end})
        return normalized or None
    if isinstance(raw, list):
        values = []
        for period in raw:
            if not isinstance(period, dict):
                return None
            start, end = period.get("open"), period.get("close")
            if not isinstance(start, str) or not isinstance(end, str):
                return None
            match = INTERVAL.fullmatch(f"{start}-{end}")
            if not match or start >= end:
                return None
            values.append({"open": start, "close": end})
        return values
    return None


def normalize_weekly_hours(raw: Any) -> dict[str, list[dict[str, str]] | None]:
    if not isinstance(raw, dict):
        return {day: None for day in DAYS}
    return {day: normalize_day(raw.get(day)) for day in DAYS}


def map_poi_for_optimizer(poi: dict[str, Any]) -> dict[str, Any] | None:
    """Map actual DB POI fields; skip records without required stay duration."""
    duration = poi.get("estimated_visit_minutes")
    if isinstance(duration, bool) or not isinstance(duration, int) or duration <= 0:
        return None
    name = poi.get("name")
    if not isinstance(name, str) or not name.strip():
        return None
    return {
        "poi_id": str(poi["poi_id"]),
        "name": name,
        "category": canonical_category(poi.get("category")),
        "tags": poi.get("tags") if isinstance(poi.get("tags"), list) else [],
        "latitude": float(poi["latitude"]),
        "longitude": float(poi["longitude"]),
        "rating": float(poi["rating"]) if poi.get("rating") is not None else None,
        "stay_duration_minutes": duration,
        "opening_hours": normalize_weekly_hours(poi.get("opening_hours")),
    }


def open_some_day(poi: dict[str, Any], start: date, days: int) -> bool:
    hours = poi["opening_hours"]
    return any(bool(hours[(start + timedelta(days=i)).strftime("%A").lower()])
               for i in range(days))
