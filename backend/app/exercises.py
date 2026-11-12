import json
import re
from pathlib import Path

EX_DIR = Path(__file__).resolve().parent.parent / "exercises"

def get_exercise(exercise_id: str) -> dict | None:
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", exercise_id):
        return None
    path = EX_DIR / f"{exercise_id}.json"
    return json.loads(path.read_text()) if path.is_file() else None


def list_exercises() -> list[dict]:
    exercises = []
    for path in EX_DIR.glob("*.json"):
        exercise = json.loads(path.read_text())
        exercises.append({
            "order": exercise.get("order", 999),
            "id": exercise["id"],
            "title": exercise["title"],
            "statement": exercise["statement"],
            "category": exercise["category"],
            "summary": exercise.get("summary", exercise["statement"]),
        })
    return sorted(exercises, key=lambda exercise: (exercise["order"], exercise["id"]))


def student_view(ex: dict) -> dict:
    """Strip hidden metadata and expected values before sending to the browser."""
    return {
        "id": ex["id"],
        "title": ex["title"],
        "category": ex["category"],
        "statement": ex["statement"],
        "summary": ex.get("summary", ex["statement"]),
        "specification": ex["specification"],
        "starter_code": ex["starter_code"],
        "sample_tests": ex["sample_tests"],
        "checkpoints": [
            {
                "id": c["id"],
                "line": c["line"],
                "question": c["question"],
                "expr": c["expr"],
                "tests": [
                    {"label": test.get("label", f"Test {index + 1}"), "input": test["input"]}
                    for index, test in enumerate(c["tests"])
                ],
            }
            for c in ex["checkpoints"]
        ],
    }