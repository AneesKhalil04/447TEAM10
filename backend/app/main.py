from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import audit_log, auth, dashboard, data_sources, offices, testing, uploads, users

app = FastAPI(title="Retriever Essentials Impact Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,  # the session cookie
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(data_sources.router)
app.include_router(uploads.router)
app.include_router(testing.router)
app.include_router(users.router)
app.include_router(offices.router)
app.include_router(audit_log.router)
