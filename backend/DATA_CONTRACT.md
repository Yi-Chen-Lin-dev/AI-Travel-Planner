# AI Travel Planner — Data Contract

**Status:** Draft  
**Scope:** MVP — Taiwan Only  
**Last Updated:** 2026-11-02

## 1. Purpose

This document defines canonical data fields and values shared across the Frontend, FastAPI Backend, PostgreSQL Database, and Recommendation/Optimization modules.

The goal is to prevent inconsistent field names, data types, and enum values between components.

## 2. Trip Information

| Field | API / Application | Database | Notes |
|---|---|---|---|
| Trip ID | `trip_id` | `trips.trip_id` | UUID |
| Destination | `destination` | `trips.destination` | Taiwan destinations only for MVP |
| Start Date | `start_date` | `trips.start_date` | Date |
| End Date | `end_date` | `trips.end_date` | Date |
| Days | `days` | Not stored | Calculated from start_date and end_date |

Trip duration is calculated as:

`days = (end_date - start_date) + 1`

## 3. User Preferences

| API Field | Database Field | Data Type | Allowed Values |
|---|---|---|---|
| `trip_id` | `trip_id` | UUID | Existing trip UUID |
| `budget` | `budget_level` | String | `low`, `medium`, `high` |
| `transportation` | `transport_mode` | String | `walking`, `public_transport`, `driving` |
| `pace` | `pace` | String | `relaxed`, `normal`, `fast` |
| `interests` | `interests` | String Array | `food`, `culture`, `nature`, `shopping`, `entertainment` |

### 3.1 Canonical Values

Frontend display labels may be translated into Chinese or other languages.

However, API requests must use the canonical values defined above.

Examples:

| Frontend Display | API Value |
|---|---|
| 經濟型 | `low` |
| 一般預算 | `medium` |
| 高預算 | `high` |
| 步行 | `walking` |
| 大眾運輸 | `public_transport` |
| 自行開車 | `driving` |
| 輕鬆 | `relaxed` |
| 一般 | `normal` |
| 緊湊 | `fast` |

## 4. Daily Travel Time — Pending Team Decision

The following fields are under discussion:

| Field | Proposed Type | Status |
|---|---|---|
| `daily_start_time` | TIME | Pending Team Decision |
| `daily_end_time` | TIME | Pending Team Decision |

The team must confirm:

1. Whether users can customize daily travel hours.
2. Whether the same time range applies to every travel day.
3. Whether these values should be persisted in `trip_preferences`.
4. Default values and API validation rules.

No database or API changes have been approved for these fields yet.

## 5. Timezone

The MVP supports travel planning within Taiwan only.

The application will use `Asia/Taipei` (UTC+8) for Taiwan-local travel times.

A user-selectable timezone field is not required for the MVP.

## 6. Integration Notes

- Frontend must send canonical values defined in this document.
- FastAPI maps API field names to PostgreSQL column names.
- Recommendation and optimization modules should consume the agreed canonical values.
- Any proposed schema or enum changes must be reviewed by the relevant team members before implementation.

## 7. Pending Verification

- [ ] Fah: Confirm Frontend PreferenceForm field mapping.
- [ ] William: Confirm PostgreSQL field mapping.
- [ ] Allen: Confirm FastAPI request and response formats.
- [ ] Team: Decide daily travel time requirements.
- [ ] Team: Confirm recommendation and optimization input requirements.
