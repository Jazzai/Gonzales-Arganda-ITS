import asyncio
import csv
import io
import json
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .classifier import classify
from .config import settings
from .eed import decide
from .exercises import get_exercise, list_exercises, student_view
from .hints import generate_hint
from .logger import log_event
from .runner import CompileError, compile_and_run
from .session import current_level, next_level, reset
from .tracer import extract, instrument, locate_checkpoint_line

app = FastAPI(title="Socratic C++ ITS")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

class CheckRequest(BaseModel):
    exercise_id: str = Field(max_length=100)
    session_id: str = Field(min_length=1, max_length=100)
    participant_id: str = Field(min_length=1, max_length=80)
    checkpoint_id: str = Field(max_length=100)
    test_case: int = 0
    code: str = Field(max_length=50_000)
    prediction: str | None = Field(default=None, max_length=100)
    condition: Literal["eed", "generic"] = "eed"


@app.get("/api/exercises")
def read_exercises():
    return {"exercises": list_exercises()}


@app.get("/api/exercises/{exercise_id}")
def read_exercise(exercise_id: str):
    ex = get_exercise(exercise_id)
    if ex is None:
        raise HTTPException(404, "Unknown exercise")
    return student_view(ex)


@app.get("/api/research/export")
def export_research_log():
    path = settings.log_path
    try:
        with open(path, encoding="utf-8") as log_file:
            rows = [json.loads(line) for line in log_file if line.strip()]
    except FileNotFoundError:
        rows = []

    fields = [
        "ts", "participant_id", "session", "exercise", "checkpoint", "condition",
        "prediction", "actual", "required", "case", "category", "hint_level",
        "hint_exhausted", "stdout", "timed_out", "exit_code", "output_ok",
        "sample_output_ok", "hidden_tests_passed", "hidden_tests_total", "status",
        "detail", "runtime_error", "llm_model", "llm_temperature", "prompt_version",
    ]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="research-attempts.csv"'},
    )


async def run_hidden_tests(code: str, checkpoint: dict, exercise: dict) -> tuple[int, int]:
    tests = exercise.get("hidden_tests", [])
    passed = 0
    for test in tests:
        source, _ = instrument(code, checkpoint)
        stdout, _, timed_out, exit_code = await asyncio.to_thread(
            compile_and_run, source, test["input"],
        )
        if (
            not timed_out
            and exit_code == 0
            and " ".join(stdout.split()) == " ".join(test["expected_output"].split())
        ):
            passed += 1
    return passed, len(tests)


@app.post("/api/check")
async def check(req: CheckRequest):
    ex = get_exercise(req.exercise_id)
    if ex is None:
        raise HTTPException(404, "Unknown exercise")
    cp = next((c for c in ex["checkpoints"] if c["id"] == req.checkpoint_id), None)
    if cp is None or not 0 <= req.test_case < len(cp["tests"]):
        raise HTTPException(400, "Bad checkpoint or test case")
    test = cp["tests"][req.test_case]

    if req.prediction is None:
        log_event({
            "participant_id": req.participant_id, "session": req.session_id,
            "exercise": ex["id"], "checkpoint": cp["id"], "condition": req.condition,
            "prediction": None, "case": "not_sure",
        })
        return {"status": "not_sure"}

    try:
        source, marker = instrument(req.code, cp)
        checkpoint_line = locate_checkpoint_line(req.code, cp)
    except ValueError as e:
        log_event({
            "participant_id": req.participant_id, "session": req.session_id,
            "exercise": ex["id"], "checkpoint": cp["id"], "condition": req.condition,
            "prediction": req.prediction, "status": "checkpoint_not_reached",
            "detail": str(e),
        })
        return {"status": "checkpoint_not_reached", "detail": str(e), "stdout": "", "timed_out": False}
    try:
        stdout, stderr, timed_out, exit_code = await asyncio.to_thread(
            compile_and_run, source, test["input"],
        )
    except CompileError as e:
        log_event({
            "participant_id": req.participant_id, "session": req.session_id,
            "exercise": ex["id"], "checkpoint": cp["id"], "condition": req.condition,
            "prediction": req.prediction, "status": "compile_error", "detail": str(e),
        })
        return {"status": "compile_error", "detail": str(e)}

    actual = extract(stderr, marker, cp)
    if actual is None:
        log_event({
            "participant_id": req.participant_id, "session": req.session_id,
            "exercise": ex["id"], "checkpoint": cp["id"], "condition": req.condition,
            "prediction": req.prediction, "status": "checkpoint_not_reached",
            "stdout": stdout, "timed_out": timed_out, "exit_code": exit_code,
            "runtime_error": stderr,
        })
        return {
            "status": "checkpoint_not_reached",
            "stdout": stdout,
            "timed_out": timed_out,
            "runtime_error": stderr,
        }

    required = f"{test['op']} {test['expected']}"
    runtime_ok = not timed_out and exit_code == 0
    sample_output_ok = runtime_ok and " ".join(stdout.split()) == " ".join(test["expected_output"].split())
    hidden_passed, hidden_total = await run_hidden_tests(req.code, cp, ex)
    hidden_tests_ok = hidden_passed == hidden_total
    output_ok = sample_output_ok and hidden_tests_ok
    case = decide(req.prediction, actual, test["expected"], test["op"], output_ok)
    key = (req.session_id, cp["id"])
    tutor, category = None, None
    hint_exhausted = False
    hint_level = 0

    if case == "C":
        category = classify(req.code, checkpoint_line)
        hint_exhausted = current_level(key) >= 3
        hint_level = next_level(key)
        message = await generate_hint(
            level=hint_level, condition=req.condition, statement=ex["statement"],
            code=req.code, question=cp["question"], prediction=req.prediction,
            actual=actual, required=required, category=category,
        )
        tutor = {
            "level": hint_level,
            "message": message,
            "exhausted": hint_exhausted,
        }
    elif case == "B":
        tutor = {
            "level": 0,
            "exhausted": False,
            "message": "Your code meets the requirement here, so the mismatch is in "
                       "your prediction. Re-trace the code line by line and try again.",
        }
    elif case == "A":
        reset(key)

    log_event({
        "participant_id": req.participant_id, "session": req.session_id,
        "exercise": ex["id"], "checkpoint": cp["id"], "condition": req.condition,
        "prediction": req.prediction, "actual": actual, "required": required,
        "case": case, "category": category, "tutor": tutor,
        "hint_level": hint_level, "hint_exhausted": hint_exhausted,
        "stdout": stdout, "timed_out": timed_out, "exit_code": exit_code,
        "output_ok": output_ok, "sample_output_ok": sample_output_ok,
        "hidden_tests_passed": hidden_passed, "hidden_tests_total": hidden_total,
    })
    return {
        "status": "ok",
        "case": case,
        "comparison": {
            "prediction": req.prediction,
            "actual": actual,
            "required": required,
            "operator": test["op"],
            "expected": test["expected"],
            "expression": cp["expr"],
        },
        "stdout": stdout,
        "timed_out": timed_out,
        "exit_code": exit_code,
        "runtime_ok": runtime_ok,
        "output_ok": output_ok,
        "sample_output_ok": sample_output_ok,
        "hidden_test_summary": {"passed": hidden_passed, "total": hidden_total},
        "trace": [{
            "line": checkpoint_line,
            "label": cp["question"],
            "expression": cp["expr"],
            "value": actual,
        }],
        "category": category,
        "tutor": tutor,
    }
