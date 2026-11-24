"""Explainable rule-based recommendation baseline for the November integration MVP.

This is NOT a trained ML model. It only scores categories, tags and ratings that
actually exist in the input. Budget is not scored when prices are unknown.
"""
from __future__ import annotations

from typing import Any

CANONICAL = {"food", "culture", "nature", "shopping", "entertainment"}
CATEGORY_KEYWORDS = {
    "food": ("美食", "餐廳", "夜市", "咖啡", "小吃", "飲食", "restaurant", "cafe", "food"),
    "nature": ("公園", "植物園", "花園", "山", "自然", "步道", "景觀", "nature", "park", "garden"),
    "shopping": ("購物", "商場", "百貨", "商店", "market", "shopping"),
    "entertainment": ("娛樂", "遊樂", "劇場", "電影院", "theme park", "entertainment"),
    "culture": ("博物館", "歷史", "文學", "文化", "古蹟", "寺廟", "廟", "紀念", "地標",
                "藝術", "雕塑", "展覽", "工藝", "教堂", "museum", "culture", "heritage"),
}


def canonical_category(raw: str | None) -> str | None:
    """Keep canonical categories; map a known raw label; leave unknown as None."""
    if not isinstance(raw, str):
        return None
    text = raw.strip().lower()
    if text in CANONICAL:
        return text
    for category in ("food", "nature", "shopping", "entertainment", "culture"):
        if any(word in text for word in CATEGORY_KEYWORDS[category]):
            return category
    return None


def recommend(
    preferences: dict[str, Any], pois: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Return ranked {poi_id, recommendation_score, recommendation_reason}.

    Inputs must contain unique POI identifiers. The output order is deterministic.
    No score is invented from unknown prices, opening hours or popularity.
    """
    interests = set(preferences.get("interests") or []) & CANONICAL
    ranked = []
    seen = set()

    for poi in pois:
        poi_id = str(poi.get("poi_id") or "")
        if not poi_id or poi_id in seen:
            raise ValueError("Each POI must have a unique nonempty poi_id")
        seen.add(poi_id)

        category = canonical_category(poi.get("category"))
        tags = [canonical_category(tag) for tag in (poi.get("tags") or []) if isinstance(tag, str)]
        matching = bool(interests and (category in interests or any(tag in interests for tag in tags)))
        rating = poi.get("rating")
        rating_part = (
            min(max(float(rating), 0.0), 5.0) / 5 * .18
            if isinstance(rating, (int, float)) and not isinstance(rating, bool) else 0.0
        )
        score = min(1.0, 0.20 + (.57 if matching else 0.0) + rating_part)
        if matching:
            reason = f"Matches {category} interest" if category in interests else "Matches interest tags"
        elif category:
            reason = f"{category.capitalize()} POI; no selected-interest match"
        else:
            reason = "Unclassified POI; limited recommendation evidence"
        if rating_part:
            reason += f"; rating {float(rating):.1f}/5"
        ranked.append({
            "poi_id": poi_id,
            "recommendation_score": round(score, 4),
            "recommendation_reason": reason,
        })

    ranked.sort(key=lambda row: (-row["recommendation_score"], row["poi_id"]))
    return ranked
