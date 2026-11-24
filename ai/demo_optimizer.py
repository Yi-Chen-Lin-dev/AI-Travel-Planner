"""Run from repository root: python ai/demo_optimizer.py"""
import json
from optimizer import optimize_itinerary

sample = {
    "trip": {
        "trip_id": "39ff50b5-3c44-4cfa-ab44-54de6840e0f8",
        "destination": "Taipei",
        "start_date": "2026-12-01",
        "days": 1,
        "daily_start_time": "09:00",
        "daily_end_time": "13:00",
        "timezone": "Asia/Taipei",
        "transportation": "public_transport",
        "start_location": {"name": "Taipei Main Station", "latitude": 25.0478, "longitude": 121.5170},
    },
    "pois": [
        {"poi_id": "101", "name": "POI 101", "stay_duration_minutes": 90,
         "recommendation_score": 0.95,
         "opening_hours": {"tuesday": [{"open": "09:00", "close": "17:00"}]}},
        {"poi_id": "102", "name": "POI 102", "stay_duration_minutes": 60,
         "recommendation_score": 0.88,
         "opening_hours": {"tuesday": [{"open": "09:00", "close": "17:00"}]}},
        {"poi_id": "103", "name": "POI 103", "stay_duration_minutes": 90,
         "recommendation_score": 0.79,
         "opening_hours": {"tuesday": [{"open": "10:00", "close": "11:00"}]}},
    ],
    "travel_time_matrix": {
        "start": {"101": 15, "102": 25, "103": 40},
        "101": {"102": 20, "103": 30},
        "102": {"101": 20, "103": 35},
        "103": {"101": 30, "102": 35},
    },
}

if __name__ == "__main__":
    print(json.dumps(optimize_itinerary(sample), ensure_ascii=False, indent=2))
