"""Pure, testable November itinerary preview pipeline (no DB/network access).

This wires normalized real POI records -> a rule-based interest recommender ->
an opt-in *approximate* travel matrix -> the existing greedy optimizer. It is not
William's final recommender, an ML model, or a real map routing service.
"""
from __future__ import annotations

from datetime import date
from typing import Any

from ai.poi_adapter import map_poi_for_optimizer, open_some_day
from ai.recommendation_baseline import recommend
from ai.travel_matrix import SOURCE, travel_time_matrix
from ai.optimizer import optimize_itinerary, OptimizerInputError


def generate_preview(
    trip: dict[str, Any],
    preferences: dict[str, Any],
    raw_pois: list[dict[str, Any]],
    *,
    max_pois: int = 15,
) -> dict[str, Any]:
    """Return a preview itinerary and its provenance; never silently invent POI hours."""
    if not 1 <= max_pois <= 30:
        raise ValueError("max_pois must be 1–30")
    try:
        start_date = date.fromisoformat(trip["start_date"])
        days = trip["days"]
        if isinstance(days, bool) or not isinstance(days, int) or not 1 <= days <= 30:
            raise ValueError("Invalid number of days")
    except (TypeError, KeyError) as exc:
        raise ValueError("start_date and days are required") from exc
    candidates = []
    skipped_missing_fields = 0
    skipped_unknown_hours = 0
    for raw in raw_pois:
        converted = map_poi_for_optimizer(raw)
        if converted is None:
            skipped_missing_fields += 1
            continue
        if not open_some_day(converted, start_date, days):
            skipped_unknown_hours += 1
            continue
        candidates.append(converted)

    if not candidates:
        raise ValueError(
            "No POIs have both a positive visit duration and verified-format "
            "opening hours on the selected travel dates."
        )
    ranking = recommend(preferences, candidates)
    score_by_id = {row["poi_id"]: row for row in ranking}
    ordered = [
        {**poi, **score_by_id[poi["poi_id"]]}
        for poi in candidates
    ]
    ordered.sort(key=lambda poi: (-poi["recommendation_score"], poi["poi_id"]))
    chosen = ordered[:max_pois]
    trip_for_optimizer = {
        "trip_id": trip.get("trip_id"),
        "destination": trip.get("destination"),
        "start_date": trip["start_date"],
        "days": days,
        "timezone": "Asia/Taipei",
        "transportation": preferences.get("transportation", "walking"),
        "pace": preferences.get("pace", "normal"),
        "daily_start_time": trip.get("daily_start_time", "09:00"),
        "daily_end_time": trip.get("daily_end_time", "18:00"),
    }
    matrix = travel_time_matrix(chosen, trip_for_optimizer["transportation"])
    output = optimize_itinerary({
        "trip": trip_for_optimizer,
        "pois": chosen,
        "travel_time_matrix": matrix,
    })
    source_by_id = {row["poi_id"]: row for row in chosen}
    for day in output["days"]:
        for item in day["items"]:
            poi = source_by_id[item["poi_id"]]
            item["latitude"] = poi["latitude"]
            item["longitude"] = poi["longitude"]
            item["category"] = poi["category"]
            item["recommendation_reason"] = poi["recommendation_reason"]
    output["ranked_pois"] = [
        {key: poi[key] for key in ("poi_id", "recommendation_score", "recommendation_reason")}
        for poi in chosen
    ]
    output["preview_only"] = True
    output["recommendation_source"] = "rule_based_baseline_not_trained_ai"
    output["travel_time_source"] = SOURCE
    output["warnings"].extend([
        "Travel minutes are approximate estimates from straight-line distance, "
        "NOT route API, real transit, traffic, or reliable walking directions.",
        "Travel time from accommodation to the first stop and return trip are not included.",
        "POI opening hours are unverified historical data; check official hours before visiting.",
    ])
    if skipped_missing_fields:
        output["warnings"].append(f"Skipped {skipped_missing_fields} POIs missing required fields.")
    if skipped_unknown_hours:
        output["warnings"].append(
            f"Skipped {skipped_unknown_hours} POIs without usable hours on the selected dates."
        )
    if not any(p.get("estimated_cost") is not None for p in raw_pois):
        output["warnings"].append("Budget could not be applied: selected POI data has no prices.")
    return output
