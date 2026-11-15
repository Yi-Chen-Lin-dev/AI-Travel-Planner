from fastapi import APIRouter, HTTPException, status
from app.schemas.preference import PreferenceCreate

router = APIRouter(prefix="/preferences", tags=["Preferences"])

# In-memory storage จำลองสำหรับการทดสอบ API
preferences_db = {}

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_preference(preference: PreferenceCreate):
    try:
        preferences_db[preference.trip_id] = preference.model_dump()
        return {
            "status": "success",
            "message": "Trip preferences saved successfully",
            "data": preference
        }
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to process preferences: {str(err)}"
        )