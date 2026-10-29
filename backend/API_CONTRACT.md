# AI Travel Planner — API Contract V2

**Status:** Draft for team review  
**Backend:** FastAPI  
**Database:** PostgreSQL — `planner` (V2 schema)  
**Database schema:** `backend/database/planner.sql`  
**Last updated:** 2026-10-29  
**Scope:** Six implemented endpoints, based on the reviewed backend implementation and previous API tests.  
**Local API base URL:** `http://127.0.0.1:8000`  
**Swagger documentation:** `http://127.0.0.1:8000/docs`

> This document describes the currently implemented V2 backend API. It is not yet an approved final team contract. Example IDs and responses are illustrative. Actual identifiers must be obtained from the database or API responses.
>
> Authentication, authorization, production CORS configuration, and frontend integration are not yet confirmed as complete.
>
> <img width="809" height="653" alt="image" src="https://github.com/user-attachments/assets/547c53ed-2992-4f1a-9a26-42d3f13ae443" />


---

## 1. API Implementation Status

| Method | Endpoint | Description | Status |
|---|---|---|---|
| POST | `/trips/` | Create a draft trip | Implemented and tested |
| GET | `/trips/` | List trips belonging to a user ID | Implemented and tested |
| POST | `/preferences/` | Create or update trip preferences | Implemented and tested |
| GET | `/pois/` | List public points of interest | Implemented and tested |
| GET | `/countries/` | Search and list countries | Implemented and tested |
| GET | `/regions/` | Search and list enabled regions | Implemented and tested |

**Total implemented business API endpoints: 6**

Additional development-only endpoints are described in Section 8.

---

## 2. Create a Trip

**Method:** POST  
**Endpoint:** `/trips/`  
**Success status:** `201 Created`

### Request JSON

```json
{
  "user_id": "c40d9dab-8ea3-4224-9cd0-18c5e37fb7bf",
  "title": "Tokyo Trip"
}
```

### Request Fields

| Field | Type | Required | Validation |
|---|---|---|---|
| `user_id` | UUID string | Yes | Must reference an existing user |
| `title` | String | Yes | 1–200 characters |

### Example Response

```json
{
  "trip_id": "4ba34888-d60a-4075-b965-e878782046b9",
  "user_id": "c40d9dab-8ea3-4224-9cd0-18c5e37fb7bf",
  "title": "Tokyo Trip",
  "status": "draft"
}
```

### Behavior

- Verifies that the supplied user exists.
- Creates a new record in `public.trips`.
- PostgreSQL automatically generates `trip_id`.
- The database automatically assigns `status = "draft"`.
- Destination and travel dates can be added later, but updating them is not yet supported by this endpoint.

### Error Responses

| Status | Description |
|---|---|
| 404 | User not found |
| 422 | Request validation error |

Example 404 response:

```json
{
  "detail": "User not found"
}
```

### Security Limitation

The client currently supplies `user_id` directly. The API does not yet derive user identity from an authenticated session.

---

## 3. List a User's Trips

**Method:** GET  
**Endpoint:** `/trips/?user_id=<UUID>`  
**Success status:** `200 OK`

### Query Parameters

| Parameter | Type | Required |
|---|---|---|
| `user_id` | UUID string | Yes |

### Example Response

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

### Behavior

- Returns trips matching the supplied `user_id`.
- Sorts results by `created_at` in descending order.
- Returns an empty array when no trips match.
- Dates are returned as `YYYY-MM-DD` strings or `null`.

### Error Responses

| Status | Description |
|---|---|
| 422 | Missing or invalid `user_id` |

### Security Limitation

Trip ownership is not verified against an authenticated user. The endpoint currently trusts the supplied user ID.

---

## 4. Create or Update Trip Preferences

**Method:** POST  
**Endpoint:** `/preferences/`  
**Success status:** `200 OK`

### Request JSON

```json
{
  "trip_id": "4ba34888-d60a-4075-b965-e878782046b9",
  "budget": "medium",
  "transportation": "public_transport",
  "pace": "normal",
  "interests": [
    "food",
    "culture",
    "nature"
  ]
}
```

### Request Fields

| Field | Type | Required | Allowed Values |
|---|---|---|---|
| `trip_id` | UUID string | Yes | Existing trip ID |
| `budget` | String | Yes | `low`, `medium`, `high` |
| `transportation` | String | Yes | `walking`, `public_transport`, `driving` |
| `pace` | String | Yes | `relaxed`, `normal`, `fast` |
| `interests` | Array of strings | No | `food`, `culture`, `nature`, `shopping`, `entertainment` |

If `interests` is omitted, the API uses an empty array.

### Example Response

```json
{
  "trip_id": "4ba34888-d60a-4075-b965-e878782046b9",
  "budget": "medium",
  "transportation": "public_transport",
  "pace": "normal",
  "interests": [
    "food",
    "culture",
    "nature"
  ]
}
```

### Behavior

- Creates preferences when none exist for the trip.
- Updates existing preferences when the same trip submits new values.
- Does not maintain historical preference versions.

### Database Mapping

| API Field | Database Column |
|---|---|
| `budget` | `trip_preferences.budget_level` |
| `transportation` | `trip_preferences.transport_mode` |

### Error Responses

| Status | Description |
|---|---|
| 404 | Trip not found |
| 422 | Request validation error |

### Security Limitation

The API does not yet verify whether the authenticated user owns the trip.

---

## 5. List Public Points of Interest

**Method:** GET  
**Endpoint:** `/pois/`  
**Success status:** `200 OK`

### Query Parameters

None in the current implementation.

### Example Response

```json
[
  {
    "poi_id": "3946fa4c-97c6-4539-8e5c-93f59f857a70",
    "name": "Example POI",
    "address": "Example address",
    "latitude": 25.0339,
    "longitude": 121.5645,
    "category": "attraction",
    "tags": [
      "landmark",
      "sightseeing"
    ],
    "estimated_visit_minutes": 90,
    "estimated_cost": 0.0,
    "opening_hours": {
      "monday": "09:00-18:00"
    },
    "rating": null,
    "review_count": null,
    "source": "manual_test"
  }
]
```

> This response is illustrative. The example POI was removed after testing. The actual endpoint may return an empty array until POI data is imported.

### Response Fields

| Field | JSON Type | Description |
|---|---|---|
| `poi_id` | String | POI UUID |
| `name` | String | POI name |
| `address` | String or null | Address |
| `latitude` | Number | Latitude |
| `longitude` | Number | Longitude |
| `category` | String or null | Category |
| `tags` | Array or null | Descriptive tags |
| `estimated_visit_minutes` | Integer or null | Estimated visit duration |
| `estimated_cost` | Number or null | Estimated cost |
| `opening_hours` | JSON or null | Raw opening-hours data |
| `rating` | Number or null | Rating |
| `review_count` | Integer or null | Review count |
| `source` | String | POI data source |

### Behavior

- Returns POIs where `visibility = 'public'`.
- Sorts results by `name` in ascending order.
- Returns `[]` when no matching public POIs exist.
- Does not currently support filtering, pagination, recommendation scores, or routing results.

### Known Limitations

- Opening-hours JSON structure is not standardized.
- Estimated-cost currency is not standardized.
- Database errors are not mapped to a documented API error schema.

---

## 6. Search and List Countries

**Method:** GET  
**Endpoint:** `/countries/`  
**Success status:** `200 OK`

### Query Parameters

| Parameter | Type | Required | Default | Validation |
|---|---|---|---|---|
| `keyword` | String | No | None | No explicit length restriction |
| `limit` | Integer | No | 20 | Minimum 1, maximum 100 |

### Example Request

`GET /countries/?keyword=Japan&limit=10`

### Example Response

```json
[
  {
    "country_id": "JP",
    "iso2": "JP",
    "iso3": "JPN",
    "name": "Japan",
    "name_zh_hant": "日本",
    "display_name": "日本"
  }
]
```

> The example demonstrates the response structure. The `country_id` value is illustrative; use the actual identifier returned by the database.

### Response Fields

| Field | Description |
|---|---|
| `country_id` | Country identifier |
| `iso2` | ISO 3166-1 alpha-2 code |
| `iso3` | ISO 3166-1 alpha-3 code |
| `name` | Country name |
| `name_zh_hant` | Traditional Chinese name |
| `display_name` | Traditional Chinese name when available; otherwise `name` |

### Behavior

- Reads from `public.region_countries`.
- Searches `name`, `name_zh_hant`, `iso2`, and `iso3`.
- Uses case-insensitive partial matching (`ILIKE`).
- Sorts by `name` in ascending order.
- Returns at most `limit` records.
- Returns `[]` when no countries match.

### Error Responses

| Status | Description |
|---|---|
| 422 | Invalid `limit`, including values outside 1–100 |

### Known Limitations

- No pagination offset or cursor.
- No response model is explicitly declared.
- No dedicated database error handling is implemented.

---

## 7. Search and List Regions

**Method:** GET  
**Endpoint:** `/regions/`  
**Success status:** `200 OK`

### Query Parameters

| Parameter | Type | Required | Default | Validation |
|---|---|---|---|---|
| `keyword` | String | No | None | No explicit length restriction |
| `country_id` | String | No | None | No explicit UUID validation |
| `parent_id` | String | No | None | No explicit UUID validation |
| `limit` | Integer | No | 20 | Minimum 1, maximum 100 |

### Example Requests

List top-level regions:

`GET /regions/`

Search by name:

`GET /regions/?keyword=Tokyo`

Filter by country:

`GET /regions/?country_id=<COUNTRY_ID>`

Filter by parent region:

`GET /regions/?parent_id=<REGION_ID>`

Combine filters:

`GET /regions/?country_id=<COUNTRY_ID>&keyword=Tokyo&limit=10`

### Example Response

```json
[
  {
    "region_id": "<REGION_ID>",
    "country_id": "<COUNTRY_ID>",
    "parent_id": null,
    "kind": "city",
    "name": "Tokyo",
    "name_zh_hant": "東京",
    "name_en": "Tokyo",
    "display_name": "東京"
  }
]
```

> Placeholder identifiers are used because the actual database identifiers must be obtained from API results.

### Response Fields

| Field | Description |
|---|---|
| `region_id` | Region identifier |
| `country_id` | Associated country identifier |
| `parent_id` | Parent region identifier or null |
| `kind` | Region classification |
| `name` | Primary region name |
| `name_zh_hant` | Traditional Chinese name |
| `name_en` | English name |
| `display_name` | Traditional Chinese name when available; otherwise `name` |

### Behavior

- Reads from `public.regions`.
- Returns only regions where `enabled = TRUE`.
- Supports case-insensitive partial matching on `name`, `name_zh_hant`, and `name_en`.
- Supports exact filtering by `country_id` and `parent_id`.
- When no filters are supplied, returns only top-level regions where `parent_id IS NULL`.
- When at least one filter is supplied, the top-level-only restriction is not applied.
- Sorts by `name` in ascending order.
- Returns at most `limit` records.
- Returns `[]` when no regions match.

### Error Responses

| Status | Description |
|---|---|
| 422 | Invalid `limit`, including values outside 1–100 |

### Known Limitations

- `country_id` and `parent_id` are currently accepted as strings without explicit API-level UUID validation.
- Invalid identifier formats may result in database errors rather than structured validation responses.
- No pagination offset or cursor.
- No explicit response model or dedicated database error handling.

---

## 8. Development-Only Endpoints

| Method | Endpoint | Purpose | Status |
|---|---|---|---|
| GET | `/` | Basic API-running message | Previously implemented; verify current deployment |
| GET | `/db-check` | Database connectivity diagnostics | Previously implemented; verify current deployment |

`/db-check` is intended for local development and may expose database-related diagnostic information.

It should be restricted or removed before public deployment.

`GET /health` has been discussed as a possible future endpoint but is not confirmed as implemented.

---

## 9. Current Frontend Integration Flow

The current API supports the following partial workflow.

### Step 1: Load Countries

Call:

`GET /countries/`

Use the response to display available countries.

### Step 2: Load Regions

Call:

`GET /regions/?country_id=<COUNTRY_ID>`

Use the response to display matching regions.

The frontend should use actual identifiers returned by the Countries API.

### Step 3: Retrieve POIs

Call:

`GET /pois/`

The current POI endpoint returns public POIs without country or region filtering.

Frontend-side filtering may be required temporarily, but a dedicated filtering API should be considered for future development.

### Step 4: Create a Draft Trip

Call:

`POST /trips/`

Supply a valid backend `user_id` and a trip title.

Store the returned `trip_id`.

### Step 5: Save Preferences

Call:

`POST /preferences/`

Supply the `trip_id` and preference values.

### Important Integration Notes

- Trip creation and preference saving are separate requests.
- They are not one atomic transaction.
- If preference saving fails after trip creation, the draft trip remains in the database.
- The frontend should retain the existing `trip_id` and allow the user to retry.
- Country and region selection currently does not automatically update a trip's destination.
- Trip date editing, POI wishlist management, itinerary generation, and routing are not yet available through the confirmed endpoints.

---

## 10. Planned API Features

The following features are planned and must not be treated as implemented.

| Feature | Proposed Capability | Status |
|---|---|---|
| Update trip | Edit title, destination, and travel dates | Planned |
| Trip POI wishlist | Add and remove selected POIs | Planned |
| POI filtering | Filter POIs by location and category | Planned |
| AI recommendations | Recommend POIs based on trip preferences | Planned |
| Route optimization | Calculate an optimized visiting sequence | Planned |
| Itinerary generation | Generate daily schedules | Planned |
| Unscheduled POIs | Report POIs that cannot fit into the schedule | Planned |
| Itinerary versioning | Keep current and previous versions | Planned |
| Itinerary rollback | Restore the previous itinerary version | Not confirmed as working |
| Detour recommendations | Suggest optional nearby POIs | Planned |
| Accept or reject detours | Update the itinerary when accepted | Planned |
| Authentication | Verify users through LINE Login | Planned |
| LINE Bot integration | Connect conversational interactions to backend APIs | In separate development branch |
| Web map integration | Display trip routes and POIs on a map | Planned |

Endpoint names and HTTP methods for planned features have not yet been finalized.

---

## 11. Database Compatibility

The V2 backend uses the PostgreSQL database named:

`planner`

The schema is maintained in:

`backend/database/planner.sql`

The current database contains:

- 23 tables
- 32 foreign key constraints

These counts have been checked against the local V2 database.

### Confirmed Trip Fields

The `public.trips` table includes:

- `trip_id`
- `user_id`
- `title`
- `destination`
- `start_date`
- `end_date`
- `status`
- `created_at`
- `updated_at`

The database automatically generates `trip_id` and defaults `status` to `draft`.

Destination and travel dates are nullable, allowing incomplete draft trips.

### Confirmed User Fields

The `public.users` table includes:

- `user_id`
- `display_name`
- `status`
- `created_at`
- `updated_at`

The database automatically generates `user_id` and defaults `status` to `active`.

### Compatibility Note

The database table and foreign key counts have been verified, but a complete column-by-column and relationship-by-relationship audit of all 23 tables is not yet complete.

---

## 12. Open Decisions and Known Gaps

1. Obtain team approval for the API Contract and related data contracts.
2. Confirm the current API implementation against all V2 database constraints.
3. Implement authenticated user identity and trip ownership authorization.
4. Define how destination, travel dates, daily travel times, and timezone will be stored and updated.
5. Derive trip duration from dates rather than maintaining a separate stored day count.
6. Confirm the database maximum length for trip titles.
7. Standardize POI opening-hours data and estimated-cost currency.
8. Define POI filtering and pagination requirements.
9. Establish consistent API error response models.
10. Confirm frontend CORS settings and deployment API URLs.
11. Add automated integration tests for the implemented endpoints.
12. Finalize interfaces for AI recommendation and route optimization.
13. Validate itinerary rollback behavior before declaring it complete.
14. Coordinate LINE Bot and Web frontend integration with the backend team.

---

## 13. Version Management

**V1 backend branch:** `feature/fastapi-backend`  
**V2 backend branch:** `feature/fastapi-backend-v2`  
**LINE Bot branch:** `feature/line-bot-setup`

V1 is retained as a backup.

V2 is the active backend development version using William's updated PostgreSQL schema.

LINE Bot development is maintained separately and should not be unintentionally included in the V2 backend pull request.

This contract should be updated whenever an implemented endpoint, request field, response field, or validation rule changes.
