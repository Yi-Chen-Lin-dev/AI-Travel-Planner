"""Read-only audit of William's 95-record sample JSON (no database/network access)."""
from collections import Counter
from pathlib import Path
import json

FILE = Path(__file__).resolve().parents[1] / "data/attractions_final_20261020_130555.json"
CATEGORIES = {"food", "culture", "nature", "shopping", "entertainment"}


def audit(records):
    def hours_of(poi):
        val = poi.get("opening_hours")
        return val if isinstance(val, dict) else {}

    return {
        "total": len(records),
        "with_coordinates": sum(isinstance(p.get("latitude"), (int, float)) and
                                isinstance(p.get("longitude"), (int, float)) for p in records),
        "with_positive_visit_minutes": sum(isinstance(p.get("estimated_visit_minutes"), int) and
                                           p["estimated_visit_minutes"] > 0 for p in records),
        "missing_visit_minutes": sum(p.get("estimated_visit_minutes") is None for p in records),
        "with_at_least_one_known_opening_period": sum(
            any(isinstance(h, str) and h.strip() for h in hours_of(p).values()) for p in records
        ),
        "all_weekday_hours_unknown": sum(
            not any(h is not None for h in hours_of(p).values()) for p in records
        ),
        "with_hours_and_visit_minutes": sum(
            isinstance(p.get("estimated_visit_minutes"), int)
            and p["estimated_visit_minutes"] > 0
            and any(isinstance(h, str) and h.strip() for h in hours_of(p).values())
            for p in records
        ),
        "raw_category_types": len({p.get("primary_category") for p in records}),
        "with_canonical_categories": sum(p.get("primary_category") in CATEGORIES for p in records),
        "with_price": sum(p.get("estimated_cost") is not None for p in records),
        "with_rating": sum(p.get("rating") is not None for p in records),
        "name_duplicates": sum(n - 1 for n in Counter(p.get("name") for p in records).values() if n > 1),
    }


if __name__ == "__main__":
    records = json.loads(FILE.read_text(encoding="utf-8"))
    if not isinstance(records, list):
        raise SystemExit("Expected a list of raw places")
    print(json.dumps(audit(records), ensure_ascii=False, indent=2))
