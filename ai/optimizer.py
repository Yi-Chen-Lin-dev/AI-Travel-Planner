"""Deterministic, dependency-free itinerary optimizer MVP.

Implements the shared docs/DATA_CONTRACT.md nested {trip, pois} interface.
This is a greedy heuristic, *not* an exact shortest-path solver.
"""

from __future__ import annotations

from datetime import date, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from typing import Any


class OptimizerInputError(ValueError):
    """Invalid optimizer request, to be converted to an HTTP 422 by the backend."""


def _clock(text: str) -> int:
    if not isinstance(text, str) or len(text) != 5 or text[2] != ":":
        raise OptimizerInputError(f"Expected HH:MM time, got {text!r}")
    try:
        hour, minute = int(text[:2]), int(text[3:])
    except ValueError as exc:
        raise OptimizerInputError(f"Expected HH:MM time, got {text!r}") from exc
    if not (0 <= hour < 24 and 0 <= minute < 60):
        raise OptimizerInputError(f"Invalid HH:MM time: {text!r}")
    return 60 * hour + minute


def _format_clock(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def _opening_windows(poi: dict[str, Any], weekday: str) -> list[tuple[int, int]] | None:
    hours = poi.get("opening_hours")
    if not isinstance(hours, dict):
        return None
    windows = hours.get(weekday)
    if windows is None:
        return None
    if not isinstance(windows, list):
        raise OptimizerInputError(f"Invalid opening hours for {poi['poi_id']}")
    result = []
    for period in windows:
        if not isinstance(period, dict) or "open" not in period or "close" not in period:
            raise OptimizerInputError(f"Opening hours must contain open/close: {poi['poi_id']}")
        begin, end = _clock(period["open"]), _clock(period["close"])
        if begin >= end:
            raise OptimizerInputError("Overnight/equal opening windows are not supported in MVP")
        result.append((begin, end))
    return sorted(result)


def _travel_time(matrix: dict[str, Any], source: str | None, dest: str,
                 has_start: bool) -> int | None:
    if source is None and not has_start:
        return 0  # User supplied no daily start location.
    src = "start" if source is None else source
    row = matrix.get(src, {})
    if not isinstance(row, dict) or dest not in row:
        return None  # Never invent a route duration.
    value = row[dest]
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise OptimizerInputError(f"Invalid travel duration: {src} -> {dest}")
    return value


def _candidate_slot(poi: dict[str, Any], day: date, current: int, travel: int,
                    end_of_day: int) -> tuple[int, int] | None:
    windows = _opening_windows(poi, day.strftime("%A").lower())
    if windows is None or not windows:
        return None
    duration = poi["stay_duration_minutes"]
    arrival = current + travel
    for opens, closes in windows:
        starts = max(arrival, opens)
        if starts + duration <= min(closes, end_of_day):
            return starts, starts + duration
    return None


def _validate(payload: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]], date, int, int, dict[str, Any], bool]:
    if not isinstance(payload, dict):
        raise OptimizerInputError("Request must be a JSON object")
    trip = payload.get("trip")
    pois = payload.get("pois")
    if not isinstance(trip, dict) or not isinstance(pois, list):
        raise OptimizerInputError("Request requires 'trip' object and 'pois' array")
    try:
        start_day = date.fromisoformat(trip["start_date"])
        if start_day.isoformat() != trip["start_date"]:
            raise ValueError("Date must be YYYY-MM-DD")
    except (ValueError, TypeError, KeyError) as exc:
        raise OptimizerInputError("trip.start_date must be YYYY-MM-DD") from exc
    days = trip.get("days")
    if isinstance(days, bool) or not isinstance(days, int) or days < 1 or days > 30:
        raise OptimizerInputError("trip.days must be between 1 and 30")
    tz = trip.get("timezone")
    try:
        if not isinstance(tz, str):
            raise ValueError("timezone missing")
        ZoneInfo(tz)
    except (ValueError, ZoneInfoNotFoundError) as exc:
        raise OptimizerInputError("trip.timezone must be a valid IANA timezone") from exc
    day_start = _clock(trip.get("daily_start_time", "09:00"))
    day_end = _clock(trip.get("daily_end_time", "21:00"))
    if day_start >= day_end:
        raise OptimizerInputError("daily_start_time must be earlier than daily_end_time")
    if trip.get("return_to_start", False):
        raise OptimizerInputError("return_to_start is not supported by this MVP")
    matrix = payload.get("travel_time_matrix", {})
    if not isinstance(matrix, dict):
        raise OptimizerInputError("travel_time_matrix must be a JSON object")
    has_start = bool(trip.get("start_location") or payload.get("start_location"))
    seen: set[str] = set()
    normalized = []
    for item in pois:
        if not isinstance(item, dict) or not isinstance(item.get("name"), str) or not str(item.get("name")).strip():
            raise OptimizerInputError("Each POI needs a name")
        poi_id = item.get("poi_id")
        if not isinstance(poi_id, (int, str)) or isinstance(poi_id, bool) or not str(poi_id):
            raise OptimizerInputError("Each POI needs a poi_id")
        poi_id = str(poi_id)
        if poi_id in seen or poi_id == "start":
            raise OptimizerInputError(f"Duplicate or reserved POI ID: {poi_id}")
        seen.add(poi_id)
        duration = item.get("stay_duration_minutes")
        score = item.get("recommendation_score")
        if isinstance(duration, bool) or not isinstance(duration, int) or duration <= 0:
            raise OptimizerInputError(f"POI {poi_id}: stay_duration_minutes must be positive integer")
        if isinstance(score, bool) or not isinstance(score, (int, float)) or not 0 <= score <= 1:
            raise OptimizerInputError(f"POI {poi_id}: score must be between 0 and 1")
        normalized.append({**item, "poi_id": poi_id})
    return trip, normalized, start_day, day_start, day_end, matrix, has_start


def optimize_itinerary(payload: dict[str, Any]) -> dict[str, Any]:
    """Produce a feasible multi-day itinerary using score-first greedy selection.

    Matrix travel times are **directed** and measured in whole minutes. When
    trip.start_location exists, travel_time_matrix['start'][poi_id] is mandatory
    to reach the first POI of each day. Missing legs are never assumed zero.
    Missing or unknown opening hours are not treated as open.
    """
    trip, pois, first_day, start, end, matrix, has_start = _validate(payload)
    remaining = {p["poi_id"]: p for p in pois}
    scheduled: list[dict[str, Any]] = []
    warnings: list[str] = []
    all_days: list[dict[str, Any]] = []
    reason_overrides: dict[str, str] = {}

    for offset in range(trip["days"]):
        day_date = first_day + timedelta(days=offset)
        current = start
        previous: str | None = None
        items: list[dict[str, Any]] = []
        travel_total = 0
        visit_total = 0

        while remaining:
            feasible = []
            for poi in remaining.values():
                leg = _travel_time(matrix, previous, poi["poi_id"], has_start)
                if leg is None:
                    reason_overrides[poi["poi_id"]] = "no_feasible_route"
                    continue
                slot = _candidate_slot(poi, day_date, current, leg, end)
                if slot is not None:
                    feasible.append((-poi["recommendation_score"], leg, poi["poi_id"], poi, slot))
            if not feasible:
                break
            _, leg, _, poi, (starts, ends) = min(feasible, key=lambda row: row[:3])
            items.append({
                "visit_order": len(items) + 1,
                "poi_id": poi["poi_id"],
                "name": poi["name"],
                "start_time": _format_clock(starts),
                "end_time": _format_clock(ends),
                "stay_duration_minutes": poi["stay_duration_minutes"],
                "travel_time_from_previous_minutes": leg,
                "travel_time_to_next_minutes": None,
                "recommendation_score": poi["recommendation_score"],
            })
            if len(items) >= 2:
                items[-2]["travel_time_to_next_minutes"] = leg
            previous = poi["poi_id"]
            current = ends
            travel_total += leg
            visit_total += poi["stay_duration_minutes"]
            scheduled.append(poi)
            del remaining[poi["poi_id"]]

        all_days.append({
            "day": offset + 1,
            "date": day_date.isoformat(),
            "items": items,
            "total_travel_time_minutes": travel_total,
            "total_visit_time_minutes": visit_total,
        })

    unscheduled = []
    for poi in remaining.values():
        windows = [_opening_windows(poi, (first_day + timedelta(days=i)).strftime("%A").lower())
                   for i in range(trip["days"])]
        # Keep explanations truthful. These labels are for debugging, not proof of optimality.
        if all(w is None for w in windows):
            reason = "missing_required_data"
        elif all(w == [] for w in windows if w is not None) and all(w is not None for w in windows):
            reason = "closed_during_trip"
        elif all(w is None or all(b - a < poi["stay_duration_minutes"] for a, b in w) for w in windows):
            reason = "opening_hours_conflict"
        else:
            reason = reason_overrides.get(poi["poi_id"], "insufficient_daily_time")
        unscheduled.append({"poi_id": poi["poi_id"], "name": poi["name"], "reason": reason})
    if any(p["reason"] == "missing_required_data" for p in unscheduled):
        warnings.append("POIs with unknown opening hours were not scheduled.")
    if any(p["reason"] == "no_feasible_route" for p in unscheduled):
        warnings.append("Some required directed travel-time matrix entries are missing.")
    status = "failed" if not pois else ("success" if not remaining else ("partial" if scheduled else "failed"))
    if not pois:
        warnings.append("No POIs were provided.")
    output = {
        "status": status,
        "days": all_days,
        "unscheduled_pois": unscheduled,
        "summary": {
            "scheduled_poi_count": len(scheduled),
            "unscheduled_poi_count": len(unscheduled),
            "total_recommendation_score": round(sum(p["recommendation_score"] for p in scheduled), 4),
            "total_travel_time_minutes": sum(d["total_travel_time_minutes"] for d in all_days),
        },
        "warnings": warnings,
    }
    if "trip_id" in trip:
        output["trip_id"] = trip["trip_id"]
    return output
