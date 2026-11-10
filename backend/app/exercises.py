import json
import re
from pathlib import Path

EX_DIR = Path(__file__).resolve().parent.parent / "exercises"

def get_exercises(exercise_id: str) -> dict | None:
    if not re.fullmatch(r"[a-z0-9]+", exercise_id):
        return None
    path = EX_DIR / f"{exercise_id}.json"
    return json.loads(path.read_text()) if path.is_file() else None

def student_view(ex: dict) -> dict:
    """Strip hidden metadata and expected values before sending to the browser."""
    return {
        "id": ex["id"],
        "title": ex["title"],
        "statement": ex["statement"],
        "starter_code": ex["starter_code"],
        "checkpoints": [
            {"id": c["id"], "line": c["line"], "question": c["question"]}
            for c in ex["checkpoints"]
        ],
    }