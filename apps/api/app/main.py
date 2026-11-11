from fastapi import FastAPI
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.routes.health import router as health_router

settings = get_settings()
configure_logging(settings.log_level)
app = FastAPI(title=settings.app_name, version=settings.app_version, description="AgentOS API foundation")
app.include_router(health_router, tags=["Health"])

@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {"name": settings.app_name, "version": settings.app_version, "docs": "/docs", "health": "/health"}
