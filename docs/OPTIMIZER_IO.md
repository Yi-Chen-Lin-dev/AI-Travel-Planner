# AI Travel Planner - Optimizer Input / Output Specification

## Current executable contract — v0.1 (2026-11-24)

**Implementation:** [ai/optimizer.py](../ai/optimizer.py), [runnable demo](../ai/demo_optimizer.py), [Golden Test](../tests/test_optimizer.py), and [Runbook](OPTIMIZER_MVP_RUNBOOK.md).

**Canonical payload:** The *tested* v0.1 function accepts **nested** \`{"trip": {...}, "pois": [...], "travel_time_matrix": {...}}\` from [DATA_CONTRACT.md](DATA_CONTRACT.md). Sections 3–4 below are an earlier **flat-payload design draft**, not a valid call example for the current function. Use the current contract below until the team approves any future API changes.

### Call and field rules

\`\`\`python
from optimizer import optimize_itinerary

result = optimize_itinerary(payload)   # dict -> dict; no DB or network calls
\`\`\`

- \`trip.start_date\` (**required**): local \`YYYY-MM-DD\`. \`trip.days\` (**required**): integer from 1 to 30. \`trip.timezone\` (**required**): valid IANA timezone, e.g., \`Asia/Taipei\`. It currently validates the name; date-time conversion across timezones is not implemented.
- \`trip.daily_start_time\` and \`trip.daily_end_time\` are \`HH:MM\` strings, default \`09:00\` / \`21:00\`; the start must be earlier than the end. \`trip.trip_id\` is optional and echoed back when supplied.
- The shared Data Contract also defines \`destination\`, \`transportation\` (\`walking\` / \`public_transport\` / \`driving\`), and \`pace\` (\`relaxed\` / \`normal\` / \`fast\`). These fields should be supplied by Backend. **v0.1 does not enforce their presence or use transportation/pace for scheduling**: Backend must generate a suitable matrix for the selected mode.
- \`pois\` is an array. Every candidate requires unique \`poi_id\` (production: UUID string; v0.1 accepts numeric/test string IDs and converts to string), \`name\`, positive integer \`stay_duration_minutes\`, numeric \`recommendation_score\` between 0 and 1, and weekly \`opening_hours\`.
- Weekday hours format: \`{"tuesday": [{"open": "09:00", "close": "17:00"}]}\`. \`[]\` means closed; \`null\` / missing means unknown and **not schedulable**. Multiple daytime windows are supported, but overnight windows and date-specific exceptions are not.
- \`travel_time_matrix\` is a nested map of **directed** POI IDs to **non-negative integer minutes**. With a supplied \`trip.start_location\`, use \`travel_time_matrix["start"][poi_id]\` for the initial trip leg **on each day**; with no start location, first-leg travel defaults to zero. Unavailable later legs cannot be scheduled. The optimizer does not call a map provider.
- \`trip.return_to_start=true\` is explicitly unsupported and is rejected in v0.1. A day starts independently; returning to a hotel is not calculated.
- Invalid supported fields raise \`OptimizerInputError\` for Backend to translate into an HTTP validation response. This function is not itself an HTTP endpoint.

### Executable example (same shape as the Golden Test)

\`\`\`json
{
  "trip": {
    "trip_id": "39ff50b5-3c44-4cfa-ab44-54de6840e0f8",
    "destination": "Taipei",
    "start_date": "2026-12-01",
    "days": 1,
    "daily_start_time": "09:00",
    "daily_end_time": "13:00",
    "timezone": "Asia/Taipei",
    "transportation": "public_transport",
    "start_location": {"name": "Taipei Main Station", "latitude": 25.0478, "longitude": 121.5170}
  },
  "pois": [
    {"poi_id": "101", "name": "POI 101", "stay_duration_minutes": 90, "recommendation_score": 0.95, "opening_hours": {"tuesday": [{"open": "09:00", "close": "17:00"}]}},
    {"poi_id": "102", "name": "POI 102", "stay_duration_minutes": 60, "recommendation_score": 0.88, "opening_hours": {"tuesday": [{"open": "09:00", "close": "17:00"}]}},
    {"poi_id": "103", "name": "POI 103", "stay_duration_minutes": 90, "recommendation_score": 0.79, "opening_hours": {"tuesday": [{"open": "10:00", "close": "11:00"}]}}
  ],
  "travel_time_matrix": {
    "start": {"101": 15, "102": 25, "103": 40},
    "101": {"102": 20, "103": 30},
    "102": {"101": 20, "103": 35},
    "103": {"101": 30, "102": 35}
  }
}
\`\`\`

**Expected output:** \`status="partial"\`; day 1 on \`2026-12-01\` with POI 101 \`09:15–10:45\` followed by POI 102 \`11:05–12:05\`; POI 103 in \`unscheduled_pois\` with \`opening_hours_conflict\`. Summary: scheduled 2, unscheduled 1, total recommendation score 1.83, travel time 35 minutes. Output includes \`trip_id\` if supplied, \`days[].items\` (visit order, start/end, stay, travel legs, score), \`warnings\`, \`unscheduled_pois\`, and \`summary\`. Full exact JSON: run \`python3 ai/demo_optimizer.py\`.

### MVP / future scope

The v0.1 algorithm is deterministic, **greedy**, and checks timetable feasibility. It does **not** guarantee the globally shortest route, enforce meal breaks, provide live routing, persist itineraries to PostgreSQL, integrate FastAPI/Frontend, or support overnight opening hours. Database → optimizer field conversion (\`estimated_visit_minutes\` → \`stay_duration_minutes\`, \`score\` → \`recommendation_score\`, etc.) belongs to Backend. These limitations must be resolved or explicitly accepted before end-to-end MVP signoff.

---

## Historical design draft (sections below)

The sections below preserve the original W1 planned interface and requirements for reference. **When they conflict with v0.1 above, the executable contract and the shared [DATA_CONTRACT.md](DATA_CONTRACT.md) take precedence.** In particular, old flat-input examples, numeric production IDs, weekday \`["08:00","14:00"]\` opening-hour arrays, and date-null outputs are **not** the current executable behavior.

---

## 1. Purpose

This document defines the data contract for the Itinerary / Optimization Engine.

The optimizer is responsible for answering two questions:

- **WHEN** should each POI be visited?
- **IN WHAT ORDER** should the POIs be visited?

The optimizer does not decide which POIs are interesting to the user. That is the responsibility of the Recommendation Engine.

The Recommendation Engine provides ranked POIs, and the optimizer converts them into a feasible multi-day itinerary.

---

## 2. Design Decisions for the November MVP

To keep the MVP realistic but manageable, the optimizer will use the following rules:

1. Daily travel time is configurable by the user.
2. If the user does not provide daily travel times, the default is:
   - Start: **09:00**
   - End: **21:00**
3. A trip may include a start location, such as a hotel, station, or custom location.
4. Returning to the start location at the end of every day is **not required** for the November MVP.
5. The optimizer must respect:
   - POI opening hours
   - Stay duration
   - Travel time
   - Daily available time
   - Number of travel days
   - Transportation mode
6. The optimizer should prefer higher recommendation scores while avoiding unnecessary travel time.

---

# 3. Optimizer Input

The optimizer receives one structured JSON object from the backend.

## 3.1 Trip Information

Required fields:

| Field | Type | Required | Description |
|---|---|---:|---|
| trip_id | integer / string | Yes | Unique trip identifier |
| destination | string | Yes | Destination city or area |
| days | integer | Yes | Number of travel days |
| daily_start_time | string (HH:MM) | No | Daily start time. Default: 09:00 |
| daily_end_time | string (HH:MM) | No | Daily end time. Default: 21:00 |
| transportation | string | Yes | Main transportation mode |
| pace | string | Yes | Travel pace |
| start_location | object | No | Starting location for route planning |
| return_to_start | boolean | No | Whether the route should return to the start location. Default: false |

### Allowed Transportation Values

Initial MVP values:

- walking
- public_transport
- driving

### Allowed Pace Values

Initial MVP values:

- relaxed
- normal
- fast

The pace value may later influence stay duration or the maximum number of POIs scheduled per day.

---

## 3.2 Start Location

A start location is optional for the November MVP but recommended when available.

Example:

```json
{
  "name": "Tokyo Station",
  "latitude": 35.6812,
  "longitude": 139.7671
}
```

Required fields when provided:

| Field | Type | Description |
|---|---|---|
| name | string | Human-readable location name |
| latitude | number | Latitude |
| longitude | number | Longitude |

If `start_location` is not provided, the optimizer may begin scheduling from the first selected POI without calculating inbound travel time.

---

## 3.3 POI Information

Each POI received by the optimizer should contain:

| Field | Type | Required | Description |
|---|---|---:|---|
| poi_id | integer / string | Yes | Unique POI identifier |
| name | string | Yes | POI name |
| latitude | number | Yes | POI latitude |
| longitude | number | Yes | POI longitude |
| category | string | Recommended | POI category |
| opening_hours | object / array | Yes | Opening hours for visitable days |
| stay_duration_minutes | integer | Yes | Expected visit duration |
| recommendation_score | number | Yes | Recommendation score from 0.0 to 1.0 |
| recommendation_reason | string | No | Basic explanation from recommendation system |
| rating | number | No | POI rating |
| price_level | integer / string | No | POI price level |

### Important Interface Rule

The optimizer must not recalculate the recommendation score.

William's Recommendation Engine determines **which POIs are valuable to the user**.

Yi-Chen's Optimization Engine determines **when and in what order those POIs should be visited**.

---

## 3.4 Travel-Time Information

The optimizer needs travel time between POIs.

For the November MVP, travel time may come from:

1. A map / routing API, or
2. A pre-computed travel-time matrix used for testing.

Example travel-time matrix:

```json
{
  "101": {
    "102": 20,
    "103": 35
  },
  "102": {
    "101": 20,
    "103": 15
  }
}
```

All values are in minutes.

The optimizer should not depend on a specific map provider so that Google Maps, Mapbox, or test data can be used interchangeably.

---

# 4. Complete Input Example

```json
{
  "trip_id": 1,
  "destination": "Tokyo",
  "days": 3,
  "daily_start_time": "09:00",
  "daily_end_time": "21:00",
  "transportation": "public_transport",
  "pace": "normal",
  "return_to_start": false,
  "start_location": {
    "name": "Tokyo Station",
    "latitude": 35.6812,
    "longitude": 139.7671
  },
  "pois": [
    {
      "poi_id": 101,
      "name": "Tsukiji Outer Market",
      "category": "food",
      "latitude": 35.6655,
      "longitude": 139.7707,
      "opening_hours": {
        "monday": ["08:00", "14:00"]
      },
      "stay_duration_minutes": 90,
      "recommendation_score": 0.94,
      "recommendation_reason": "Strong food preference match",
      "rating": 4.4,
      "price_level": 2
    },
    {
      "poi_id": 102,
      "name": "Senso-ji",
      "category": "culture",
      "latitude": 35.7148,
      "longitude": 139.7967,
      "opening_hours": {
        "monday": ["06:00", "17:00"]
      },
      "stay_duration_minutes": 90,
      "recommendation_score": 0.89,
      "recommendation_reason": "Strong culture preference match",
      "rating": 4.5,
      "price_level": 1
    }
  ],
  "travel_time_matrix": {
    "101": {
      "102": 25
    },
    "102": {
      "101": 25
    }
  }
}
```

---

# 5. Optimization Constraints

The optimizer must consider the following hard constraints for the November MVP.

## 5.1 Opening Hours

A POI must be visited while it is open.

Example:

If a POI is open from 10:00 to 18:00 and requires 90 minutes, the visit cannot begin at 17:30.

---

## 5.2 Stay Duration

Every scheduled POI must reserve enough time for the expected visit duration.

Example:

```text
Start: 10:00
Stay duration: 90 minutes
End: 11:30
```

---

## 5.3 Travel Time

The schedule must include travel time between POIs.

Example:

```text
POI A ends: 11:30
Travel time: 20 minutes
POI B earliest start: 11:50
```

---

## 5.4 Daily Available Time

All visits and travel time must fit between:

```text
daily_start_time
and
daily_end_time
```

Default:

```text
09:00 - 21:00
```

---

## 5.5 Number of Travel Days

The itinerary must not create more days than the user requested.

---

## 5.6 Transportation

Travel-time calculations should use the selected transportation mode when supported by the routing source.

---

# 6. Optimization Objectives

After satisfying hard constraints, the optimizer should attempt to improve itinerary quality.

The main objectives are:

1. Maximize total recommendation score of scheduled POIs.
2. Minimize unnecessary travel time.
3. Reduce idle gaps where possible.
4. Produce a reasonable POI visiting order.
5. Avoid scheduling conflicts.
6. Keep the itinerary understandable and practical for the user.

A simple conceptual objective is:

```text
maximize:
    recommendation value

while minimizing:
    travel time
    constraint violations
```

The exact mathematical weighting does not need to be finalized in Week 1.

---

# 7. Optimizer Output

The optimizer returns a structured multi-day itinerary to the backend.

## 7.1 Top-Level Output

| Field | Type | Description |
|---|---|---|
| trip_id | integer / string | Trip identifier |
| status | string | Optimization result status |
| days | array | Daily itinerary |
| unscheduled_pois | array | POIs that could not be scheduled |
| summary | object | Basic optimization summary |
| warnings | array | Non-critical issues or fallback information |

Initial status values:

- success
- partial
- failed

---

## 7.2 Daily Itinerary

Each day contains:

| Field | Type | Description |
|---|---|---|
| day | integer | Day number |
| date | string / null | Travel date if available |
| items | array | Ordered itinerary items |
| total_travel_time_minutes | integer | Total travel time for the day |
| total_visit_time_minutes | integer | Total POI visit time for the day |

---

## 7.3 Itinerary Item

Each scheduled POI contains:

| Field | Type | Description |
|---|---|---|
| visit_order | integer | Visiting order for that day |
| poi_id | integer / string | POI identifier |
| name | string | POI name |
| start_time | string | Visit start time |
| end_time | string | Visit end time |
| stay_duration_minutes | integer | Planned visit duration |
| travel_time_from_previous_minutes | integer | Travel time from previous point |
| travel_time_to_next_minutes | integer / null | Travel time to next POI |
| recommendation_score | number | Original recommendation score |

---

# 8. Complete Output Example

```json
{
  "trip_id": 1,
  "status": "success",
  "days": [
    {
      "day": 1,
      "date": null,
      "items": [
        {
          "visit_order": 1,
          "poi_id": 101,
          "name": "Tsukiji Outer Market",
          "start_time": "09:00",
          "end_time": "10:30",
          "stay_duration_minutes": 90,
          "travel_time_from_previous_minutes": 15,
          "travel_time_to_next_minutes": 25,
          "recommendation_score": 0.94
        },
        {
          "visit_order": 2,
          "poi_id": 102,
          "name": "Senso-ji",
          "start_time": "10:55",
          "end_time": "12:25",
          "stay_duration_minutes": 90,
          "travel_time_from_previous_minutes": 25,
          "travel_time_to_next_minutes": null,
          "recommendation_score": 0.89
        }
      ],
      "total_travel_time_minutes": 40,
      "total_visit_time_minutes": 180
    }
  ],
  "unscheduled_pois": [],
  "summary": {
    "scheduled_poi_count": 2,
    "unscheduled_poi_count": 0,
    "total_recommendation_score": 1.83
  },
  "warnings": []
}
```

---

# 9. Unscheduled POIs

The optimizer must not silently drop POIs.

If a POI cannot be scheduled, it should be returned in `unscheduled_pois`.

Example:

```json
{
  "poi_id": 105,
  "name": "Example Museum",
  "reason": "No feasible time slot within opening hours"
}
```

Possible reasons include:

- closed_during_trip
- insufficient_daily_time
- opening_hours_conflict
- missing_required_data
- no_feasible_route

This improves debugging and makes the output explainable.

---

# 10. Interface with Other Team Modules

## William - Recommendation System

William provides:

```text
Ranked POIs
+ recommendation_score
+ recommendation_reason
```

The optimizer uses the score as one of its optimization priorities.

---

## Allen - Backend

Allen's backend is responsible for:

- Validating the optimizer request
- Loading required POI information
- Providing travel-time data when available
- Calling the optimizer
- Saving the resulting itinerary
- Returning the result to the frontend

---

## Fah - Frontend

Fah's frontend uses the optimizer output to display:

- Day number
- Visit order
- POI name
- Start time
- End time
- Travel time
- Map route

The frontend should not need to know the internal optimization algorithm.

---

# 11. Error Handling

The optimizer should return a clear result instead of crashing when possible.

Examples:

### Missing POIs

```json
{
  "status": "failed",
  "days": [],
  "unscheduled_pois": [],
  "warnings": [
    "No POIs were provided."
  ]
}
```

### Partially Feasible Trip

If only some POIs can be scheduled:

```text
status = partial
```

The feasible POIs should still be returned.

---

# 12. Week 1 Definition of Done

The Optimizer Input / Output design is complete when:

- [ ] Trip input fields are defined
- [ ] POI input fields are defined
- [ ] Travel-time input is defined
- [ ] Optimization constraints are listed
- [ ] Optimizer output fields are defined
- [ ] Unscheduled POI behavior is defined
- [ ] Example input JSON exists
- [ ] Example output JSON exists
- [ ] William's recommendation output can be consumed by the optimizer
- [ ] Allen's backend can send and receive the defined JSON
- [ ] Fah's frontend can display the itinerary output
- [ ] The team reviews and agrees on the interface

---

# 13. November MVP Boundary

The following items are intentionally excluded from the first optimizer version:

- Dynamic replanning after delays
- Weather-based replanning
- Real-time traffic-based continuous replanning
- Group preference optimization
- Multi-city optimization
- Hotel booking optimization
- Flight optimization

These may be added after the November MVP is stable.
