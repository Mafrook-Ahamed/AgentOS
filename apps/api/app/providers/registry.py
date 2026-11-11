from app.core.config import Settings

def provider_configuration(settings: Settings) -> dict[str, dict[str, bool]]:
    return {
        "openai": {"configured": bool(settings.openai_api_key), "selected_by_default": settings.default_ai_provider.lower() == "openai"},
        "gemini": {"configured": bool(settings.gemini_api_key), "selected_by_default": settings.default_ai_provider.lower() == "gemini"},
    }
