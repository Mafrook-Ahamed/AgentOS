from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass(frozen=True)
class GenerationResult:
    text: str
    provider: str
    model: str

class AIProvider(ABC):
    name: str
    @abstractmethod
    async def generate(self, prompt: str, system_instruction: str | None = None) -> GenerationResult:
        raise NotImplementedError
