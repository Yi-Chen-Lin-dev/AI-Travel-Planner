"""E2E in an *ephemeral CI PostgreSQL service*, not user's local/remote DB.

Only run when explicitly enabled by the GitHub workflow:
  RUN_POSTGRES_E2E=1 DB_HOST=localhost DB_NAME=atp_mvp_ci ...
This tests real database writes, recommendation/optimizer, and reload.
"""
from __future__ import annotations

import os
import unittest
from uuid import uuid4

from fastapi.testclient import TestClient

if os.getenv("RUN_POSTGRES_E2E") == "1":
    os.environ["ENABLE_PREVIEW_ITINERARIES"] = "1"
    os.environ["ENABLE_ESTIMATED_TRAVEL"] = "1"

from backend.api.main import app
from backend.api.database import get_connection


@unittest.skipUnless(
    os.getenv("RUN_POSTGRES_E2E") == "1"
    and os.getenv("DB_HOST") in {"localhost", "127.0.0.1", "::1"}
    and os.getenv("DB_NAME", "").startswith("atp_mvp_"),
    "Requires disposable, explicitly configured CI PostgreSQL",
)
class TestLocalPostgresE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.user_id = str(uuid4())
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO public.users(user_id,display_name) VALUES (%s,%s)",
                    (cls.user_id, "CI E2E disposable tester"),
                )

    def create_trip(self, interests):
        response = self.client.post("/trips/", json={
            "user_id": self.user_id, "title": "Taipei E2E Smoke",
            "destination": "Taipei",
            "start_date": "2026-12-01", "end_date": "2026-12-01",
        })
        self.assertEqual(response.status_code, 201, response.text)
        trip = response.json()
        self.assertEqual(trip["destination"], "Taipei")
        self.assertEqual(trip["start_date"], "2026-12-01")
        self.assertEqual(trip["end_date"], "2026-12-01")
        response = self.client.post("/preferences/", json={
            "trip_id": trip["trip_id"], "budget": "medium",
            "transportation": "walking", "pace": "normal",
            "interests": interests,
        })
        self.assertEqual(response.status_code, 200, response.text)
        return trip

    def test_real_postgres_e2e_and_personalization(self):
        pois = self.client.get("/pois/")
        self.assertEqual(pois.status_code, 200, pois.text)
        self.assertGreater(len(pois.json()), 0)

        tops = []
        for interests in (["culture"], ["nature"]):
            trip = self.create_trip(interests)
            trip_id = trip["trip_id"]
            first = self.client.get("/itineraries/" + trip_id)
            self.assertEqual(first.status_code, 404, first.text)

            created = self.client.post("/itineraries/generate", json={
                "trip_id": trip_id, "allow_estimated_travel": True,
                "daily_start_time": "09:00", "daily_end_time": "18:00",
            })
            self.assertEqual(created.status_code, 201, created.text)
            generated = created.json()
            self.assertTrue(generated["preview_only"])
            self.assertIn(generated["status"], ("success", "partial"))
            self.assertGreater(generated["summary"]["scheduled_poi_count"], 0)
            self.assertTrue(generated["ranked_pois"])
            tops.append(generated["ranked_pois"][0]["poi_id"])
            stops = generated["days"][0]["items"]
            self.assertTrue(stops)
            self.assertTrue(all("latitude" in p and "longitude" in p for p in stops))

            reopened = self.client.get("/itineraries/" + trip_id)
            self.assertEqual(reopened.status_code, 200, reopened.text)
            stored = reopened.json()
            self.assertEqual(stored["itinerary_id"], generated["itinerary_id"])
            self.assertEqual(
                [(p["poi_id"], p["start_time"], p["end_time"]) for p in stored["days"][0]["items"]],
                [(p["poi_id"], p["start_time"], p["end_time"]) for p in stops],
            )
            self.assertEqual(
                stored["status"], "saved_preview"
            )
            repeated = self.client.post("/itineraries/generate", json={
                "trip_id": trip_id, "allow_estimated_travel": True,
            })
            self.assertEqual(repeated.status_code, 409, repeated.text)

        self.assertNotEqual(tops[0], tops[1], "Changing culture -> nature should change recommendation top POI")

    def test_validation_rejects_backward_dates(self):
        response = self.client.post("/trips/", json={
            "user_id": self.user_id, "title": "Bad dates",
            "destination": "Taipei",
            "start_date": "2026-12-03", "end_date": "2026-12-01",
        })
        self.assertEqual(response.status_code, 422, response.text)


if __name__ == "__main__":
    unittest.main()
