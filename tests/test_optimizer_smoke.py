"""Offline smoke test for the FastAPI adapter (no database or network).

Run after installing fastapi:
    python3 -m unittest discover -s tests -p 'test_optimizer*.py' -v
"""
import copy
import sys
import unittest
from pathlib import Path

from fastapi import HTTPException

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


if __name__ == "__main__":
    unittest.main()
