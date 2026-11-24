"""Offline smoke test for the FastAPI adapter (no database or network).

Run after installing fastapi:
    python3 -m unittest discover -s tests -p 'test_optimizer*.py' -v
"""
import copy
import sys
import unittest
from pathlib import Path

from fastapi import HTTPException
from pydantic import ValidationError
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ai"))
from demo_optimizer import sample
from backend.api.optimizer_smoke import optimizer_smoke


class TestOptimizerApiSmoke(unittest.TestCase):
    def test_adapter_returns_golden_itinerary(self):
        result = optimizer_smoke(copy.deepcopy(sample))
        self.assertEqual(result["status"], "partial")
        self.assertEqual(len(result["days"][0]["items"]), 2)
        self.assertEqual(result["summary"]["total_travel_time_minutes"], 35)

    def test_adapter_translates_invalid_payload_to_422(self):
        payload = copy.deepcopy(sample)
        payload["trip"]["timezone"] = "Not/A_Timezone"
        with self.assertRaises(HTTPException) as ctx:
            optimizer_smoke(payload)
        self.assertEqual(ctx.exception.status_code, 422)


class TestTripCreateContract(unittest.TestCase):
    def test_trip_dates_and_destination_accepted(self):
        from backend.api.trips import TripCreate
        trip = TripCreate(
            user_id=uuid4(), title="Taipei Demo", destination="Taipei",
            start_date="2026-12-01", end_date="2026-12-02",
        )
        self.assertEqual(trip.destination, "Taipei")
        self.assertEqual(trip.start_date.isoformat(), "2026-12-01")

    def test_trip_rejects_invalid_date_range(self):
        from backend.api.trips import TripCreate
        with self.assertRaises(ValidationError):
            TripCreate(
                user_id=uuid4(), title="Taipei Demo", destination="Taipei",
                start_date="2026-12-02", end_date="2026-12-01",
            )

    def test_trip_title_follows_sql_length(self):
        from backend.api.trips import TripCreate
        with self.assertRaises(ValidationError):
            TripCreate(user_id=uuid4(), title="X" * 151)


if __name__ == "__main__":
    unittest.main()
