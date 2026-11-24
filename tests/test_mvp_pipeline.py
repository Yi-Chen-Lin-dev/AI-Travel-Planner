"""Database-free tests of the local preview's real processing pipeline."""
import unittest

from ai.poi_adapter import normalize_day, normalize_weekly_hours
from ai.mvp_pipeline import generate_preview
from ai.travel_matrix import travel_time_matrix
from backend.api.itineraries import GenerateInput


class TestMvpPipeline(unittest.TestCase):
    def setUp(self):
        self.trip = {
            "trip_id": "39ff50b5-3c44-4cfa-ab44-54de6840e0f8",
            "destination": "Taipei",
            "start_date": "2026-12-01",
            "days": 1,
            "daily_start_time": "09:00",
            "daily_end_time": "18:00",
        }
        self.pois = [
            {
                "poi_id": "museum", "name": "Test museum", "category": "博物館",
                "estimated_visit_minutes": 90, "rating": 4.5,
                "latitude": 25.04, "longitude": 121.51,
                "opening_hours": {"tuesday": "09:00-17:00"},
            },
            {
                "poi_id": "park", "name": "Test park", "category": "公園",
                "estimated_visit_minutes": 60, "rating": 4.7,
                "latitude": 25.05, "longitude": 121.52,
                "opening_hours": {"tuesday": "08:00-18:00"},
            },
            {
                "poi_id": "missing", "name": "Missing hours", "category": "博物館",
                "estimated_visit_minutes": 90, "rating": 4.9,
                "latitude": 25.06, "longitude": 121.53,
                "opening_hours": {"tuesday": None},
            },
        ]

    def test_pipeline_personalization(self):
        culture = generate_preview(self.trip, {"interests": ["culture"], "transportation": "walking"}, self.pois)
        nature = generate_preview(self.trip, {"interests": ["nature"], "transportation": "walking"}, self.pois)
        self.assertEqual(culture["ranked_pois"][0]["poi_id"], "museum")
        self.assertEqual(nature["ranked_pois"][0]["poi_id"], "park")
        self.assertEqual(culture["summary"]["scheduled_poi_count"], 2)
        self.assertTrue(culture["preview_only"])
        self.assertEqual(culture["travel_time_source"], "straight_line_estimate_not_a_route")
        self.assertTrue(any("Skipped 1" in warning for warning in culture["warnings"]))
        for item in culture["days"][0]["items"]:
            self.assertIn("latitude", item)
            self.assertIn("recommendation_reason", item)

    def test_no_invented_opening_hours(self):
        with self.assertRaisesRegex(ValueError, "No POIs"):
            generate_preview(self.trip, {"interests": ["culture"]}, [self.pois[-1]])

    def test_real_category_and_hours_adaptation(self):
        self.assertEqual(normalize_day("09:00-17:00"), [{"open": "09:00", "close": "17:00"}])
        self.assertEqual(normalize_day("10:00-12:00、14:00-17:00"), [{"open": "10:00", "close": "12:00"}, {"open": "14:00", "close": "17:00"}])
        self.assertEqual(normalize_day("休息"), [])
        self.assertIsNone(normalize_day("maybe 24 hours"))
        normalized = normalize_weekly_hours({"tuesday": "休息", "friday": None})
        self.assertEqual(normalized["tuesday"], [])
        self.assertIsNone(normalized["friday"])

    def test_estimate_is_positive_and_directed_format(self):
        poi_a = {"poi_id": "a", "latitude": 25.04, "longitude": 121.51}
        poi_b = {"poi_id": "b", "latitude": 25.05, "longitude": 121.52}
        matrix = travel_time_matrix([poi_a, poi_b], "walking")
        self.assertGreater(matrix["a"]["b"], 0)
        self.assertEqual(matrix["a"]["b"], matrix["b"]["a"])

    def test_preview_request_explicit_consent_defaults_false(self):
        request = GenerateInput(trip_id="39ff50b5-3c44-4cfa-ab44-54de6840e0f8")
        self.assertFalse(request.allow_estimated_travel)


if __name__ == "__main__":
    unittest.main()
