"""Run: python -m unittest discover -s tests -v"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ai"))
from optimizer import optimize_itinerary, OptimizerInputError


def sample():
    return {
        "trip": {
            "trip_id": "39ff50b5-3c44-4cfa-ab44-54de6840e0f8",
            "destination": "Taipei", "start_date": "2026-12-01", "days": 1,
            "daily_start_time": "09:00", "daily_end_time": "13:00",
            "timezone": "Asia/Taipei", "transportation": "public_transport",
            "start_location": {"name": "Taipei Main Station", "latitude": 25.0478, "longitude": 121.5170},
        },
        "pois": [
            {"poi_id": "101", "name": "POI 101", "stay_duration_minutes": 90,
             "recommendation_score": .95, "opening_hours": {"tuesday": [{"open": "09:00", "close": "17:00"}]}},
            {"poi_id": "102", "name": "POI 102", "stay_duration_minutes": 60,
             "recommendation_score": .88, "opening_hours": {"tuesday": [{"open": "09:00", "close": "17:00"}]}},
            {"poi_id": "103", "name": "POI 103", "stay_duration_minutes": 90,
             "recommendation_score": .79, "opening_hours": {"tuesday": [{"open": "10:00", "close": "11:00"}]}},
        ],
        "travel_time_matrix": {
            "start": {"101": 15, "102": 25, "103": 40},
            "101": {"102": 20, "103": 30},
            "102": {"101": 20, "103": 35},
            "103": {"101": 30, "102": 35},
        }
    }


class TestOptimizer(unittest.TestCase):
    def test_golden_case_and_no_invented_travel_time(self):
        out = optimize_itinerary(sample())
        self.assertEqual(out["status"], "partial")
        items = out["days"][0]["items"]
        self.assertEqual([p["poi_id"] for p in items], ["101", "102"])
        self.assertEqual((items[0]["start_time"], items[0]["end_time"]), ("09:15", "10:45"))
        self.assertEqual((items[1]["start_time"], items[1]["end_time"]), ("11:05", "12:05"))
        self.assertEqual(out["summary"]["total_travel_time_minutes"], 35)
        self.assertEqual(out["unscheduled_pois"][0]["reason"], "opening_hours_conflict")

    def test_missing_start_route_is_not_zero(self):
        p = sample()
        p["pois"] = p["pois"][:1]
        p["travel_time_matrix"].pop("start")
        out = optimize_itinerary(p)
        self.assertEqual(out["status"], "failed")
        self.assertEqual(out["unscheduled_pois"][0]["reason"], "no_feasible_route")

    def test_no_start_location_starts_at_day_start(self):
        p = sample()
        p["trip"].pop("start_location")
        p["pois"] = p["pois"][:1]
        p["travel_time_matrix"] = {}
        out = optimize_itinerary(p)
        self.assertEqual(out["days"][0]["items"][0]["start_time"], "09:00")

    def test_missing_hours_is_not_assumed_open(self):
        p = sample()
        p["pois"] = p["pois"][:1]
        p["pois"][0]["opening_hours"] = {"tuesday": None}
        out = optimize_itinerary(p)
        self.assertEqual(out["status"], "failed")
        self.assertEqual(out["unscheduled_pois"][0]["reason"], "missing_required_data")

    def test_multi_day_resets_departure_time(self):
        p = sample()
        p["trip"]["days"] = 2
        p["trip"]["daily_end_time"] = "11:00"
        p["pois"] = p["pois"][:2]
        for item in p["pois"]:
            item["opening_hours"]["wednesday"] = [{"open": "09:00", "close": "17:00"}]
        out = optimize_itinerary(p)
        self.assertEqual(out["status"], "success")
        self.assertEqual([len(day["items"]) for day in out["days"]], [1, 1])
        self.assertEqual(out["days"][1]["date"], "2026-12-02")
        self.assertEqual(out["days"][1]["items"][0]["start_time"], "09:25")

    def test_missing_and_invalid_fields(self):
        p = sample()
        p["trip"]["timezone"] = "Not/A_Timezone"
        with self.assertRaises(OptimizerInputError):
            optimize_itinerary(p)
        p = sample()
        p["pois"][1]["poi_id"] = "101"
        with self.assertRaises(OptimizerInputError):
            optimize_itinerary(p)
        p = sample()
        p["trip"]["daily_end_time"] = "08:00"
        with self.assertRaises(OptimizerInputError):
            optimize_itinerary(p)

    def test_closed_and_no_pois(self):
        p = sample()
        p["pois"] = p["pois"][:1]
        p["pois"][0]["opening_hours"] = {"tuesday": []}
        self.assertEqual(optimize_itinerary(p)["unscheduled_pois"][0]["reason"], "closed_during_trip")
        p["pois"] = []
        out = optimize_itinerary(p)
        self.assertEqual(out["status"], "failed")
        self.assertIn("No POIs were provided.", out["warnings"])


if __name__ == "__main__":
    unittest.main()
