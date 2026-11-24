# AI Travel Planner — Data Contract

**Status:** Draft  
**Scope:** MVP — Taiwan Only  
**Last Updated:** 2026-11-02

## 1. Purpose

This document defines the canonical data fields, formats, and values shared across the Frontend, FastAPI Backend, PostgreSQL Database, and Recommendation/Optimization modules.

Its purpose is to ensure consistency between system components and prevent field-name, data-type, and enum mismatches.

## 2. Trip Information

| API / Application Field | Database Field | Data Type | Description |
|---|---|---|---|
| `trip_id` | `trips.trip_id` | UUID | Unique identifier for a trip |
| `destination` | `trips.destination` | String | Travel destination within Taiwan |
| `start_date` | `trips.start_date` | Date | Trip start date |
| `end_date` | `trips.end_date` | Date | Trip end date |
| `days` | Not stored | Integer | Calculated from the trip dates |

### 2.1 Trip Duration

Trip duration must be calculated from `start_date` and `end_date`.

`days = (end_date - start_date).days + 1`

The `days` field should not be stored independently in the database.

Draft trips may have missing destination or date values.

## 3. User Preferences

The following fields define the current Preferences API contract.

| API Field | Database Field | Data Type | Allowed Values |
|---|---|---|---|
| `trip_id` | `trip_preferences.trip_id` | UUID | Existing trip UUID |
| `budget` | `trip_preferences.budget_level` | String | `low`, `medium`, `high` |
| `transportation` | `trip_preferences.transport_mode` | String | `walking`, `public_transport`, `driving` |
| `pace` | `trip_preferences.pace` | String | `relaxed`, `normal`, `fast` |
| `interests` | `trip_preferences.interests` | String Array | `food`, `culture`, `nature`, `shopping`, `entertainment` |

### 3.1 Canonical Values

Frontend display labels may use user-friendly wording or localized translations.

However, API requests and responses must use the canonical values defined in this document.

| Frontend Display Label (English Example) | Canonical API Value |
|---|---|
| Budget-friendly | `low` |
| Moderate budget | `medium` |
| High budget | `high` |
| Walking | `walking` |
| Public transportation | `public_transport` |
| Driving | `driving` |
| Relaxed pace | `relaxed` |
| Normal pace | `normal` |
| Fast pace | `fast` |

### 3.2 Field Mapping Rules

- The Frontend must submit canonical API values.
- FastAPI maps `budget` to the database column `budget_level`.
- FastAPI maps `transportation` to the database column `transport_mode`.
- The `pace` and `interests` field names remain unchanged between the API and database.
- API responses should use the API field names rather than database-specific column names.
- Any changes to canonical values must be coordinated across the Frontend, Backend, and Database.

## 4. Daily Travel Time — Pending Team Decision

The following fields are proposed but are not part of the confirmed database schema or Preferences API contract.

| Proposed Field | Proposed Data Type | Status |
|---|---|---|
| `daily_start_time` | TIME | Pending Team Decision |
| `daily_end_time` | TIME | Pending Team Decision |

The team must confirm:

1. Whether users can customize daily travel start and end times.
2. Whether all travel days share the same time range.
3. Whether these values should be stored in `trip_preferences`.
4. Whether default values should be provided.
5. How the Recommendation and Optimization modules will consume these values.

No database or API changes have been approved for these fields.

## 5. Timezone

The MVP is limited to travel planning within Taiwan.

All travel-related local times should use the `Asia/Taipei` timezone (UTC+8).

A user-selectable timezone field is not required for the MVP.

The Backend and Optimization modules must handle local time consistently, regardless of the server's configured timezone.

## 6. Integration Rules

### 6.1 Frontend

- Display labels may differ from canonical values.
- Submitted values must match the Preferences API contract.
- The Frontend must not introduce unsupported enum values without agreement.

### 6.2 FastAPI Backend

- Validate incoming preference values.
- Convert API field names to their corresponding database column names.
- Return consistent field names and JSON-compatible values.
- Ensure that preference data can be retrieved for subsequent itinerary generation or regeneration.

### 6.3 PostgreSQL Database

- Store preference values using the agreed database columns.
- Maintain valid relationships between trips and preferences.
- Coordinate schema changes before implementation.

### 6.4 Recommendation and Optimization

- Use canonical preference values as inputs.
- Do not assume that Frontend display labels are valid algorithm inputs.
- Confirm the handling of missing or optional preference fields before integration.

## 7. Pending Verification

- [ ] Frontend (Fah): Confirm PreferenceForm field names and canonical values.
- [ ] Database (William): Confirm PostgreSQL column mappings.
- [ ] Backend (Allen): Verify Preferences API request and response formats against this document.
- [ ] Team: Finalize daily travel time requirements.
- [ ] Team: Confirm Recommendation and Optimization input requirements.

## 8. Related Documentation

- `API_CONTRACT.md` — API endpoints, request formats, and response formats.
- `DATABASE_SETUP.md` — Database setup and configuration.

This document is a draft and must be reviewed by the relevant team members before being treated as the finalized data contract.
