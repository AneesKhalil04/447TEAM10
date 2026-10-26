from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.uploads import router as uploads_router

app = FastAPI(title="Retriever Essentials Impact Dashboard API")
app.include_router(uploads_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
