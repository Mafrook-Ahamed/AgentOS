from google import genai
from app.core.config import Settings
from app.providers.base import AIProvider, GenerationResult

class GeminiProvider(AIProvider):
    name = "gemini"
    def __init__(self, settings: Settings) -> None:
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is not configured")
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model = settings.gemini_model
    async def generate(self, prompt: str, system_instruction: str | None = None) -> GenerationResult:
        full_prompt = prompt
        if system_instruction:
            full_prompt = f"System instructions:\n{system_instruction}\n\nUser request:\n{prompt}"
        response = await self.client.aio.models.generate_content(model=self.model, contents=full_prompt)
        return GenerationResult(text=response.text or "", provider=self.name, model=self.model)
