import json
import pathlib
import time

from .config import settings

def log_event(event: dict) -> None:
    path = pathlib.Path(settings.log_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a") as f:
        f.write(json.dumps({
            "ts": time.time(),
            "llm_model": settings.llm_model,
            "llm_temperature": settings.llm_temperature,
            "prompt_version": "socratic-v1",
            **event,
        }) + "\n")