from pydantic import BaseModel, Field
from typing import List, Literal, Optional

class PreferenceCreate(BaseModel):
    trip_id: str
    destination: str
    start_date: str
    days: int = Field(..., ge=1, description="Number of days must be at least 1")
    budget: Literal["low", "medium", "high"]
    transportation: Literal["walking", "public_transport", "driving"]
    pace: Literal["relaxed", "normal", "fast"]
    interests: List[Literal["food", "culture", "nature", "shopping", "entertainment"]]
    daily_start_time: str
    daily_end_time: str
    timezone: str
    pinned_spots: Optional[List[str]] = []