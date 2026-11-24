"""Explicitly approximate travel times for a LOCAL MVP preview, not actual routes.

Haversine straight-line distance is multiplied by a path factor before dividing
by nominal speed. This is NOT a routing, walking, traffic or transit service.
Only enable for preview mode when user and server have opted in.
"""
import math
from typing import Any

SPEED_KMH = {"walking": 4.0, "public_transport": 14.0, "driving": 22.0}
PATH_FACTOR = 1.4
SOURCE = "straight_line_estimate_not_a_route"


def travel_time_matrix(pois: list[dict[str, Any]], mode: str) -> dict[str, dict[str, int]]:
    if mode not in SPEED_KMH:
        raise ValueError(f"Unsupported transportation: {mode}")
    matrix = {}
    for source in pois:
        row = {}
        for target in pois:
            if source["poi_id"] == target["poi_id"]:
                continue
            a1 = math.radians(source["latitude"])
            a2 = math.radians(target["latitude"])
            delta1 = math.radians(target["latitude"] - source["latitude"])
            delta2 = math.radians(target["longitude"] - source["longitude"])
            h = math.sin(delta1 / 2) ** 2 + math.cos(a1) * math.cos(a2) * math.sin(delta2 / 2) ** 2
            km = 6371.0 * 2 * math.asin(math.sqrt(min(1.0, h)))
            minutes = max(1, math.ceil(km * PATH_FACTOR / SPEED_KMH[mode] * 60))
            row[str(target["poi_id"])] = minutes
        matrix[str(source["poi_id"])] = row
    return matrix
