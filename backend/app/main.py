from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import preferences

app = FastAPI(
    title="AI Travel Planner Backend API",
    version="1.0.0",
    description="Backend API for AI Travel Planner project"
)

# อนุญาตให้ Frontend Next.js ติดต่อเข้ามาได้
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(preferences.router)

@app.get("/")
def root():
    return {"message": "AI Travel Planner API is up and running"}