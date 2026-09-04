from fastapi import FastAPI

from app.api.routes.health import router as health_router


app = FastAPI(
    title="VeriTrace API",
    description="AI-powered visual identity search and verification system",
    version="1.0.0"
)


app.include_router(health_router)