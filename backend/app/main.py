import asyncio
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .classifier import classify
from .config import settings
from .eed import decide
from .exercises import get_exercise, student_view
from .hints import generate_hint
from .logger import log_event
from .runner import CompileError, compile_and_run
from .session import next_level, reset
from .tracer import extract, instrument

app = FastAPI(title="Socratic C++ ITS")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

class CheckRequest(BaseModel):
    exercise_id: str
    session_id: str
    checkpoint_id: str
    test_case: int = 0
    code: str
    prediction: str | None
    condition: Literal["eed", "generic"] = "eed"

@app.get("/api/exercises/{exercise_id}")
def read_exercise(exercise_id: str):
    ex = get_exercise(exercise_id)
    if ex is None:
        raise HTTPException(404, "Uknown exercise")
    return student_view(ex)

@app.post("/api/check")
async def check(req: CheckRequest):
    ex = get_exercise(req.exercise_id)
    if ex is None:
        raise HTTPException(404, "Uknown exercise")
    cp = next((c for c in ex["checkpoints"] if c ["id"] == req.checkpoint_id), None)
    if cp is None or not 0 <= req.test_case < len(cp["tests"]):
        raise HTTPException(400, "Bad checkpoint or test case")
    test = cp["tests"][req.test_case]

    if req.prediction is None:
        return {"status": "not_sure"}

    source, marker = instrument(req.code, cp)
    try:
        _, stderr, _ = await asyncio.to_thread(compile_and_run, source, test["input"])
    except CompileError as e:
        return {"status": "compile_error", "detail": str(e)}

    actual = extract(stderr, marker, cp)
    if actual is None:
        return {"status": "chceckpoint_not_reached"}

    required = f"{test['op']} {test['expected']}"
    case = decide(req.prediction, actual, test["expected"], test["op"])
    key = (req.session_id, cp["id"])
    tutor, category = None, None

    if case == "C":
        category = classify(req.code, cp["line"])
        level = next_level(key)
        message = await generate_hint(
            level=level, condition=req.condition, statement=ex["statement"],
            code=req.code, question=cp["question"], prediction=req.prediction,
            actual=actual, required=required, category=category,
        )
        tutor = {"level": level, "message": message}
    elif case == "B":
        tutor = {
            "level": 0,
            "message": "Your code meets the requirement here, so the mismatch is in "
                       "your prediction. Re-trace the code line by line and try again.",
        }
    elif case == "A":
        reset(key)

    log_event({
        "session": req.session_id, "exercise": ex["id"], "checkpoint": cp["id"],
        "condition": req.condition, "prediction": req.prediction, "actual": actual,
        "required": required, "case": case, "category": category, "tutor": tutor,
    })
    return {
        "status": "ok",
        "case": case,
        "comparison": {"prediction": req.prediction, "actual": actual, "required": required},
        "category": category,
        "tutor": tutor,
    }
