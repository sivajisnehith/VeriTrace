from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.routes.health import router as health_router
from app.api.routes.search import router as search_router


app = FastAPI(
    title="VeriTrace API",
    description="AI-powered visual identity search and verification system",
    version="1.0.0"
)


app.mount(
    "/results",
    StaticFiles(directory="results"),
    name="results"
)

app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads"
)

app.include_router(health_router)
app.include_router(search_router)