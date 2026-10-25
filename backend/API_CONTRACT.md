# AI Travel Planner — API Contract (Current Implementation)

**Status:** Draft for team review  
**Backend:** FastAPI  
**Scope:** Implemented endpoints verified against `backend/api/trips.py`, `backend/api/preferences.py`, and `backend/api/pois.py` as of 2026-10-25.  
**Local API base URL:** `http://127.0.0.1:8000`  
**Swagger documentation:** `http://127.0.0.1:8000/docs`

> This document describes current backend behavior, not an approved final team contract. Examples are illustrative. IDs must be obtained from actual API responses. Authentication, CORS, and frontend integration are not yet confirmed as complete.

## 1. Create a trip

**POST** `/trips/`  
**Success:** `201 Created`

### Request JSON

```json
{
  "user_id": "c40d9dab-8ea3-4224-9cd0-18c5e37fb7bf",
  "title": "Tokyo Trip"
}
```

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `user_id` | UUID string | Yes | Must exist in `users` |
| `title` | String | Yes | 1–200 characters validated by API |

### Example success response

```json
{
  "trip_id": "4ba34888-d60a-4075-b965-e878782046b9",
  "user_id": "c40d9dab-8ea3-4224-9cd0-18c5e37fb7bf",
  "title": "Tokyo Trip",
  "status": "draft"
}
```

- `404`: `{"detail": "User not found"}` when the user does not exist.
- `422`: Request validation error (e.g., invalid UUID, missing field, invalid title length).
- The trip starts as a draft. Destination and dates are not accepted by this endpoint yet.
- **Security limitation:** `user_id` is currently supplied by the client; it is not yet derived from a verified login session.

## 2. List a user's trips

**GET** `/trips/?user_id=<UUID>`  
**Success:** `200 OK`  
**Request body:** None

### Example response

```json
[
  {
    "trip_id": "4ba34888-d60a-4075-b965-e878782046b9",
    "user_id": "c40d9dab-8ea3-4224-9cd0-18c5e37fb7bf",
    "title": "Tokyo Trip",
    "destination": null,
    "start_date": null,
    "end_date": null,
    "status": "draft"
  }
]
```

- Returns an array sorted by `created_at` descending.
- Returns `[]` when no trips match the supplied user ID.
- `start_date` and `end_date` are ISO date strings (`YYYY-MM-DD`) or `null`.
- `422`: Missing or malformed `user_id` query parameter.
- **Security limitation:** The endpoint currently trusts the caller-supplied user ID; access control is not implemented.

## 3. Create or update trip preferences

**POST** `/preferences/`  
**Success:** `200 OK`

### Request JSON

```json
{
  "trip_id": "4ba34888-d60a-4075-b965-e878782046b9",
  "budget": "medium",
  "transportation": "public_transport",
  "pace": "normal",
  "interests": ["food", "culture", "nature"]
}
```

| Field | Type | Required | Allowed values |
| --- | --- | --- | --- |
| `trip_id` | UUID string | Yes | Must exist in `trips` |
| `budget` | String | Yes | `low`, `medium`, `high` |
| `transportation` | String | Yes | `walking`, `public_transport`, `driving` |
| `pace` | String | Yes | `relaxed`, `normal`, `fast` |
| `interests` | Array of strings | No | `food`, `culture`, `nature`, `shopping`, `entertainment` |

If `interests` is omitted, the API uses `[]`.

### Example success response

```json
{
  "trip_id": "4ba34888-d60a-4075-b965-e878782046b9",
  "budget": "medium",
  "transportation": "public_transport",
  "pace": "normal",
  "interests": ["food", "culture", "nature"]
}
```

- **Upsert:** First request inserts preferences; subsequent requests for the same `trip_id` overwrite the stored preferences. No preference history is retained.
- `404`: `{"detail": "Trip not found"}` if the trip does not exist.
- `422`: Invalid UUID, missing required field, invalid choice, or malformed JSON.
- Database mapping: API `budget` → `trip_preferences.budget_level`; API `transportation` → `trip_preferences.transport_mode`.
- **Security limitation:** Trip ownership is not checked against an authenticated user.

## 4. List public points of interest (POIs)

**GET** `/pois/`  
**Success:** `200 OK`  
**Request body:** None  
**Query parameters:** None in the current implementation

### Example response shape

```json
[
  {
    "poi_id": "3946fa4c-97c6-4539-8e5c-93f59f857a70",
    "name": "Example POI",
    "address": "Example address",
    "latitude": 25.0339,
    "longitude": 121.5645,
    "category": "attraction",
    "tags": ["landmark", "sightseeing"],
    "estimated_visit_minutes": 90,
    "estimated_cost": 0.0,
    "opening_hours": {"monday": "09:00-18:00"},
    "rating": null,
    "review_count": null,
    "source": "manual_test"
  }
]
```

> Example only; the example POI was removed from the database after testing. Current actual response may be `[]` until the cleaned POI dataset is imported.

| Field | JSON type | Notes |
| --- | --- | --- |
| `poi_id` | String | UUID |
| `name` | String | POI name |
| `address` | String or null | Address |
| `latitude`, `longitude` | Number | Coordinates |
| `category` | String or null | Category |
| `tags` | Array or null | Tags |
| `estimated_visit_minutes` | Integer or null | Estimated visit duration, minutes |
| `estimated_cost` | Number or null | Estimated cost; currency/unit not standardized yet |
| `opening_hours` | JSON object/array or null | Raw JSONB value; shape not standardized yet |
| `rating` | Number or null | Rating |
| `review_count` | Integer or null | Review count |
| `source` | String | Data source |

- Returns only records where `visibility = 'public'`, ordered by `name` ascending.
- Returns `[]` when no public POIs exist.
- No filtering, pagination, recommendation scores, routing, or optimizer output is currently implemented here.
- Database exceptions are not yet mapped to a documented API error schema.

## 5. Development-only endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | Basic API-running message |
| GET | `/db-check` | Database connection check, returns database and DB user information |

`/db-check` is for development diagnostics and should be restricted or removed before public deployment. `GET /health` has been discussed as a proposed contract endpoint but is **not implemented** in the current `main.py`.

## 6. Frontend integration sequence (current implementation)

1. Obtain a valid backend `user_id` (development test user only until authentication is implemented).
2. Call `POST /trips/` with `user_id` and `title`.
3. Read the returned `trip_id`.
4. Call `POST /preferences/` with that `trip_id` and the preference values.
5. Handle both success and error states; do not report the entire flow as saved if the preference request fails.

These are two separate API calls, **not one atomic transaction**. If trip creation succeeds but saving preferences fails, the draft trip remains in the database; the frontend should retain its `trip_id` and offer retry rather than blindly creating another trip.

## 7. Open decisions / known gaps

- Team review and approval of this contract and the existing `DATA_CONTRACT.md` are pending.
- Align the desired input fields (`destination`, `start_date`, trip duration, daily times, timezone) with actual endpoints and database storage. Trip duration should be derived from dates, not duplicated as an independent stored `days` field.
- Align the `title` maximum length between the API and the actual database schema; confirm the live database constraint before changing either.
- Implement verified login identity, trip ownership authorization, and production-safe diagnostics.
- Confirm CORS origins and frontend API base URL before browser integration.
- Confirm POI import/schema with the dataset owner; define `opening_hours` structure and estimated-cost currency.
- Add explicit error handling, response models, and integration tests before treating the API as production-ready.
