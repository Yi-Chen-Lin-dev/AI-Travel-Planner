"""In-process HTTP tests; NO database or remote calls and NO production data."""
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ai"))
os.environ["ENABLE_DEV_OPTIMIZER_SMOKE"] = "1"
os.environ["ENABLE_PREVIEW_ITINERARIES"] = "1"

from demo_optimizer import sample
from backend.api.main import app


class TestLocalIntegrationHttp(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_smoke_endpoint_http_200(self):
        resp = self.client.post("/dev/optimizer-smoke", json=sample())
        self.assertEqual(resp.status_code, 200, resp.text)
        result = resp.json()
        self.assertEqual(result["status"], "partial")
        self.assertEqual(result["summary"]["total_travel_time_minutes"], 35)

    def test_smoke_bad_input_http_422(self):
        data = sample()
        data["trip"]["timezone"] = "Invalid/TZ"
        resp = self.client.post("/dev/optimizer-smoke", json=data)
        self.assertEqual(resp.status_code, 422)

    def test_preview_rejects_nonlocal_database_before_connecting(self):
        with patch.dict(os.environ, {"DB_HOST": "remote.example", "DB_NAME": "production"}):
            resp = self.client.get("/itineraries/" + str(uuid4()))
        self.assertEqual(resp.status_code, 503)

    def test_preview_requires_explicit_estimate_permission(self):
        with patch.dict(os.environ, {"DB_HOST": "localhost", "DB_NAME": "atp_mvp_unit_test"}):
            resp = self.client.post("/itineraries/generate", json={
                "trip_id": str(uuid4()), "allow_estimated_travel": False,
            })
        self.assertEqual(resp.status_code, 503)


if __name__ == "__main__":
    unittest.main()
