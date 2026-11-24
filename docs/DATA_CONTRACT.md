# Data Contract

## Purpose

This document defines the shared data format between:

Frontend → Backend → Recommendation → Optimizer → Backend → Frontend

All modules should follow this contract when exchanging data.

---

## 1. Trip Preference Input

```json
{
  "destination": "Tamsui",
  "start_date": "2026-10-25",
  "days": 2,
  "budget": "medium",
  "transportation": "public_transport",
  "pace": "normal",
  "interests": [
    "culture",
    "nature",
    "food"
  ],
  "daily_start_time": "09:00",
  "daily_end_time": "18:00",
  "timezone": "Asia/Taipei"
}
```

### Field Definitions

| Field | Type | Allowed Values / Format |
|---|---|---|
| destination | string | City / area name |
| start_date | string | YYYY-MM-DD |
| days | integer | >= 1 |
| budget | string | low / medium / high |
| transportation | string | walking / public_transport / driving |
| pace | string | relaxed / normal / fast |
| interests | array[string] | standardized categories |
| daily_start_time | string | HH:MM |
| daily_end_time | string | HH:MM |
| timezone | string | IANA timezone |

---

## 2. Standard Interest Categories

Allowed categories:

- food
- culture
- nature
- shopping
- entertainment

Frontend values must be mapped to these categories.

Examples:

| Frontend Display | API Value |
|---|---|
| History | culture |
| Cafe | food |
| Night Market | food |
| Park | nature |

---

## 3. POI Data

```json
{
  "poi_id": "uuid",
  "name": "Fort San Domingo",
  "latitude": 25.1754,
  "longitude": 121.4329,
  "category": "culture",
  "opening_hours": {
    "monday": [
      {
        "open": "09:00",
        "close": "17:00"
      }
    ]
  },
  "stay_duration_minutes": 90,
  "recommendation_score": 0.92,
  "recommendation_reason": "Matches culture preference"
}
```

### POI Rules

| Field | Type | Rule |
|---|---|---|
| poi_id | UUID string | Unique POI identifier |
| name | string | POI name |
| latitude | float | WGS84 latitude |
| longitude | float | WGS84 longitude |
| category | string | standardized category |
| opening_hours | object | weekly schedule |
| stay_duration_minutes | integer | minutes |
| recommendation_score | float | 0.0–1.0 |
| recommendation_reason | string | human-readable explanation |

---

## 4. Opening Hours

Open:

```json
"monday": [
  {
    "open": "09:00",
    "close": "17:00"
  }
]
```

Closed:

```json
"monday": []
```

Unknown:

```json
"monday": null
```

Multiple opening periods:

```json
"monday": [
  {
    "open": "09:00",
    "close": "12:00"
  },
  {
    "open": "14:00",
    "close": "18:00"
  }
]
```

---

## 5. Recommendation Output

Recommendation System should return:

```json
{
  "poi_id": "uuid",
  "recommendation_score": 0.92,
  "recommendation_reason": "Matches culture preference"
}
```

The Backend is responsible for joining this result with POI information before sending data to the Optimizer.

---

## 6. Optimizer Input

Backend sends:

```json
{
  "trip": {
    "destination": "Tamsui",
    "start_date": "2026-10-25",
    "days": 2,
    "transportation": "public_transport",
    "pace": "normal",
    "daily_start_time": "09:00",
    "daily_end_time": "18:00",
    "timezone": "Asia/Taipei"
  },
  "pois": []
}
```

---

## 7. Optimizer Output

```json
{
  "days": [
    {
      "day": 1,
      "date": "2026-10-25",
      "items": [
        {
          "poi_id": "uuid",
          "visit_order": 1,
          "start_time": "09:30",
          "end_time": "11:00",
          "travel_time_to_next_minutes": 15
        }
      ]
    }
  ]
}
```

---

## 8. Naming and Unit Rules

- Time format: `HH:MM`
- Date format: `YYYY-MM-DD`
- Duration unit: minutes
- Recommendation score: `0.0–1.0`
- Latitude / longitude: float
- IDs: UUID string
- API field names: snake_case
- API enum values: lowercase snake_case
