"""Offline tests for the review-branch recommendation baseline."""
import unittest

from ai.recommendation_baseline import canonical_category, recommend


class TestRecommendationBaseline(unittest.TestCase):
    def setUp(self):
        self.pois = [
            {"poi_id": "museum", "category": "博物館", "rating": 4.8, "tags": []},
            {"poi_id": "park", "category": "公園", "rating": 4.6, "tags": []},
            {"poi_id": "market", "category": "傳統市場", "rating": 4.2, "tags": []},
        ]

    def test_culture_vs_nature_changes_top_poi(self):
        first = recommend({"interests": ["culture"]}, self.pois)
        second = recommend({"interests": ["nature"]}, self.pois)
        self.assertEqual(first[0]["poi_id"], "museum")
        self.assertEqual(second[0]["poi_id"], "park")

    def test_returns_required_contract_and_stable_order(self):
        out = recommend({"interests": ["culture"]}, self.pois)
        self.assertEqual(out, recommend({"interests": ["culture"]}, self.pois))
        self.assertTrue(all(set(["poi_id", "recommendation_score", "recommendation_reason"]) <= set(r) for r in out))
        self.assertTrue(all(0 <= r["recommendation_score"] <= 1 for r in out))

    def test_unknown_categories_do_not_get_fabricated_matches(self):
        self.assertIsNone(canonical_category("unknown type"))
        self.assertTrue("Unclassified" in recommend({"interests": ["nature"]}, [
            {"poi_id": "unknown", "category": "unknown type"}
        ])[0]["recommendation_reason"])

    def test_rejects_duplicate_ids(self):
        with self.assertRaises(ValueError):
            recommend({"interests": ["culture"]}, [self.pois[0], self.pois[0]])

    def test_raw_categories(self):
        self.assertEqual(canonical_category("國家博物館"), "culture")
        self.assertEqual(canonical_category("城市公園"), "nature")


if __name__ == "__main__":
    unittest.main()
