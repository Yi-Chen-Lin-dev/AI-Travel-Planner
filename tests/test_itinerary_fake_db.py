"""Integration-service unit test using a fake DB cursor; NO real PostgreSQL.

This checks orchestration and SQL call shape, not live database compatibility.
"""
import os
import unittest
from datetime import date
from unittest.mock import patch
from uuid import uuid4

from backend.api import itineraries


class FakeCursor:
    def __init__(self, trip_id):
        self.trip_id = trip_id
        self.itinerary_id = uuid4()
        self.executed = []
        self.one = None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def execute(self, sql, params=None):
        flat = " ".join(sql.lower().split())
        self.executed.append((flat, params))
        if flat.startswith("select trip_id,destination,start_date,end_date"):
            self.one = (self.trip_id, "Taipei", date(2026, 12, 1), date(2026, 12, 1))
        elif flat.startswith("select budget_level,transport_mode,pace,interests"):
            self.one = ("medium", "walking", "normal", ["culture"])
        elif flat.startswith("select itinerary_id from public.itineraries"):
            self.one = None
        elif flat.startswith("insert into public.itineraries"):
            self.one = (self.itinerary_id,)
        else:
            self.one = None

    def fetchone(self):
        return self.one

    def fetchall(self):
        return []


class FakeConnection:
    def __init__(self, trip_id):
        self.cursor_value = FakeCursor(trip_id)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def cursor(self):
        return self.cursor_value


class TestGeneratePreviewWithFakeDb(unittest.TestCase):
    def test_real_service_orchestration_and_persistence_queries(self):
        trip_id = uuid4()
        fake = FakeConnection(trip_id)
        raw = [
            {
                "poi_id": str(uuid4()), "name": "History museum",
                "latitude": 25.04, "longitude": 121.51,
                "category": "博物館", "tags": [],
                "estimated_visit_minutes": 90, "rating": 4.6,
                "opening_hours": {"tuesday": "09:00-17:00"}, "estimated_cost": None,
            },
            {
                "poi_id": str(uuid4()), "name": "Taipei park",
                "latitude": 25.05, "longitude": 121.52,
                "category": "公園", "tags": [],
                "estimated_visit_minutes": 60, "rating": 4.5,
                "opening_hours": {"tuesday": "08:00-18:00"}, "estimated_cost": None,
            },
        ]
        with patch.dict(os.environ, {
            "DB_HOST": "localhost",
            "DB_NAME": "atp_mvp_fake_test",
            "ENABLE_ESTIMATED_TRAVEL": "1",
        }):
            with patch.object(itineraries, "get_connection", return_value=fake):
                with patch.object(itineraries, "_find_pois", return_value=raw):
                    result = itineraries.generate_itinerary(
                        itineraries.GenerateInput(
                            trip_id=trip_id, allow_estimated_travel=True,
                        )
                    )
        self.assertEqual(result["trip_id"], str(trip_id))
        self.assertEqual(result["summary"]["scheduled_poi_count"], 2)
        self.assertEqual(result["ranked_pois"][0]["poi_id"], raw[0]["poi_id"])
        self.assertEqual(result["travel_time_source"], "straight_line_estimate_not_a_route")
        sql = [statement for statement, _ in fake.cursor_value.executed]
        self.assertTrue(any("insert into public.itineraries" in item for item in sql))
        self.assertTrue(any("insert into public.trip_recommendations" in item for item in sql))
        self.assertEqual(sum("insert into public.itinerary_items" in item for item in sql), 2)
        self.assertTrue(any("update public.trips set status" in item for item in sql))


if __name__ == "__main__":
    unittest.main()
