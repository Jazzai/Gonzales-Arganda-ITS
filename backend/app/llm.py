import httpx

from .config import settings

async def chat(system: str, user: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"{settings.llm_base_url}/api/chat",
            json={
                "model": settings.llm_model,
                "stream": False,
                "options": {"temperature": settings.llm_temperature},
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user}
                ],
            },
        )
        r.raise_for_status()
        return r.json()["message"]["content"].strip()