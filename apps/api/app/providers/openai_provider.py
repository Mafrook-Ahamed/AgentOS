from openai import AsyncOpenAI
from app.core.config import Settings
from app.providers.base import AIProvider, GenerationResult

class OpenAIProvider(AIProvider):
    name = "openai"
    def __init__(self, settings: Settings) -> None:
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is not configured")
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
    async def generate(self, prompt: str, system_instruction: str | None = None) -> GenerationResult:
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})
        response = await self.client.chat.completions.create(model=self.model, messages=messages)
        return GenerationResult(text=response.choices[0].message.content or "", provider=self.name, model=self.model)
