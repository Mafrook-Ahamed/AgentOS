from fastapi import APIRouter
from app.core.config import get_settings
from app.providers.registry import provider_configuration

router = APIRouter()

@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}

@router.get("/ready")
async def readiness() -> dict:
    settings = get_settings()
    return {"status": "ready", "app": settings.app_name, "version": settings.app_version, "environment": settings.app_env, "providers": provider_configuration(settings)}
