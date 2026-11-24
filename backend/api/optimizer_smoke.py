"""Development-only optimizer bridge; never enable for a public deployment.

This bypasses authentication, recommendation, DB persistence and real routing.
Enable only when ENABLE_DEV_OPTIMIZER_SMOKE=1 in a local test environment.
"""
from typing import Any

from fastapi import APIRouter, HTTPException

from ai.optimizer import OptimizerInputError, optimize_itinerary

router = APIRouter(prefix="/dev", tags=["Local integration smoke test"])


@router.post("/optimizer-smoke")
def optimizer_smoke(payload: dict[str, Any]) -> dict[str, Any]:
    """Pass a documented {trip, pois, travel_time_matrix} payload into Optimizer."""
    try:
        return optimize_itinerary(payload)
    except OptimizerInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
