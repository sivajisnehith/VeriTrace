from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.routes.search import router as search_router
from app.api.routes.evidence import router as evidence_router

app = FastAPI(
    title="VeriTrace API",
    description="Visual identity search and blockchain evidence verification system",
    version="1.0.0"
)

app.mount("/results", StaticFiles(directory="results"), name="results")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(search_router)
app.include_router(evidence_router)