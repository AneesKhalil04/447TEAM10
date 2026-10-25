from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import data_sources, uploads

app = FastAPI(title="Retriever Essentials Impact Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(data_sources.router)
app.include_router(uploads.router)
