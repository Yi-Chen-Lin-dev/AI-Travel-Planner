# Optimizer MVP — reproducible integration demo

## Scope

`ai/optimizer.py` is a **standalone, deterministic greedy baseline**. It schedules candidate POIs by descending `recommendation_score`, using estimated travel times as tie-breakers. It is **not** an exact global route optimum and does not call live Maps/Google routing, the database, or the live FastAPI endpoint.

Use the team's `docs/DATA_CONTRACT.md` as the canonical request shape, with an additional `travel_time_matrix`:

```json
{
  "trip": {
    "trip_id": "optional UUID string",
    "destination": "Taipei",
    "start_date": "2026-12-01",
    "days": 1,
    "timezone": "Asia/Taipei",
    "daily_start_time": "09:00",
    "daily_end_time": "13:00",
    "transportation": "public_transport",
    "start_location": {"name": "Taipei Main Station", "latitude": 25.0478, "longitude": 121.5170}
  },
  "pois": [],
  "travel_time_matrix": {"start": {"poi-uuid": 15}, "poi-uuid": {"another-uuid": 20}}
}
```

- `pois` entries need `poi_id` (UUID string in production), `name`, positive integer `stay_duration_minutes`, `recommendation_score` between 0 and 1, and `opening_hours` containing weekday arrays of `{open, close}`.
- `travel_time_matrix` is **directed** in whole minutes. If a `start_location` is supplied, row `"start"` must contain travel times to the first POI candidates on every day. Missing edges are never assumed zero.
- Local clock strings use `HH:MM`; dates use `YYYY-MM-DD`. `timezone` must be a valid IANA timezone identifier. Unknown/null opening hours are **not** considered open.
- Unsupported in this MVP: overnight opening windows, dynamic re-planning, holiday exceptions, live map routing, traffic, return-to-start, meal stops, database persistence. The algorithm is a feasible greedy heuristic, not optimal routing.
- Output contains `trip_id` when supplied, `status` (`success`, `partial`, `failed`), `days`, `unscheduled_pois`, `summary`, `warnings`.

## Backend-to-optimizer mapping (Allen)

The optimizer does **not** write directly to PostgreSQL. Backend loads and validates data, then maps:

| Database field | Optimizer input |
|---|---|
| `trips.trip_id` | `trip.trip_id` (UUID string) |
| `trips.start_date` | `trip.start_date` |
| `trip_preferences.transport_mode` | `trip.transportation` |
| `pois.poi_id` | `pois[].poi_id` (UUID string) |
| `pois.estimated_visit_minutes` | `pois[].stay_duration_minutes` |
| `pois.opening_hours` | `pois[].opening_hours` (normalize to weekly `{open, close}` format) |
| `trip_recommendations.score` | `pois[].recommendation_score` (check scale 0..1) |
| `trip_recommendations.reason` | `pois[].recommendation_reason` |

`timezone`, `start_location`, and `travel_time_matrix` are not columns in the checked `ERD/backend/table.sql`; Backend must supply them from the incoming request, configuration or a routing provider. Reject/skip POIs lacking required non-null data; do not invent route times.

Persistence to `itineraries`, `itinerary_items`, `itinerary_unscheduled_pois` remains a Backend integration task.

## Run (Python 3.10+, no pip dependencies)

From the repository root:

```bash
python -m unittest discover -s tests -p 'test_optimizer.py' -v
python ai/demo_optimizer.py
```

The demo uses **synthetic POIs and synthetic travel times**, not verified map routes.

## Golden integration case

Test data: Tuesday 2026-12-01, start 09:00, end 13:00, start point with synthetic matrix.

1. POI 101: 09:15–10:45 (15 min travel, 90 min stay)
2. POI 102: 11:05–12:05 (20 min travel, 60 min stay)
3. POI 103: unscheduled — 10:00–11:00 window is shorter than 90 min stay

Expected: `status=partial`, two scheduled, one unscheduled, 35 min total travel, score sum 1.83.

## Next integration tasks

- Review canonical contract and adapter with Allen (Backend), William (Recommendation), Fah (Frontend).
- Verify recommendation score range and normalization (0..1).
- Supply a **real** directed travel matrix from routing service, including starting point.
- Add persistence/endpoint integration, E2E tests with PostgreSQL and frontend.
- Agree on policy for null opening hours and revisit score/travel optimization weights.
