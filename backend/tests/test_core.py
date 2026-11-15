import asyncio

import pytest

from app.eed import decide
from app.exercises import get_exercise, list_exercises, student_view
from app.hints import STATIC_FALLBACK, build_prompt, generate_hint
from app.runner import compile_and_run
from app.tracer import extract, instrument

@pytest.mark.parametrize("p,a,e,op,case", [
    ("0", "0", "0", "le", "A"),
    ("5", "0", "0", "le", "B"),
    ("0", "1", "0", "le", "C"),
    ("1", "1", "0", "le", "D"),
])
def test_case(p, a, e, op, case):
    assert decide(p, a, e, op) == case

def test_tracer_captures_first_while_check():
    ex = get_exercise("loop-basics-1")
    cp = ex["checkpoints"][0]
    source, marker = instrument(ex["starter_code"], cp)
    _,stderr, _, _ = compile_and_run(source, "")
    assert extract(stderr, marker, cp) == "1"


@pytest.mark.parametrize(
    "exercise_id, test_index, expected",
    [
        ("loop-basics-1", 0, "1"),
        ("function-basics-1", 0, "4"),
        ("computation-basics-1", 0, "14"),
    ],
)
def test_exercise_checkpoint_instrumentation(exercise_id, test_index, expected):
    exercise = get_exercise(exercise_id)
    checkpoint = exercise["checkpoints"][0]
    source, marker = instrument(exercise["starter_code"], checkpoint)
    test = checkpoint["tests"][test_index]
    _, stderr, timed_out, exit_code = compile_and_run(source, test["input"])
    assert not timed_out
    assert exit_code == 0
    assert extract(stderr, marker, checkpoint) == expected


def test_student_view_exposes_samples_but_not_checkpoint_oracle():
    exercise = student_view(get_exercise("function-basics-1"))
    assert exercise["category"] == "Function"
    assert len(exercise["sample_tests"]) == 2
    assert all("expected" not in test for cp in exercise["checkpoints"] for test in cp["tests"])
    assert "hidden" not in exercise
    assert [item["id"] for item in list_exercises()] == [
        "loop-basics-1", "function-basics-1", "computation-basics-1",
    ]


def test_generic_prompt_does_not_receive_divergence_evidence():
    prompt = build_prompt(
        level=1,
        condition="generic",
        statement="A practice exercise",
        code="int value = 2;",
        question="PRIVATE_CHECKPOINT",
        prediction="PRIVATE_PREDICTION",
        actual="PRIVATE_ACTUAL",
        required="PRIVATE_REQUIREMENT",
        category="PRIVATE_CATEGORY",
    )
    assert "PRIVATE_CHECKPOINT" not in prompt
    assert "PRIVATE_PREDICTION" not in prompt
    assert "PRIVATE_ACTUAL" not in prompt
    assert "PRIVATE_REQUIREMENT" not in prompt
    assert "PRIVATE_CATEGORY" not in prompt


def test_eed_prompt_includes_checkpoint_divergence_evidence():
    prompt = build_prompt(
        level=1,
        condition="eed",
        statement="A practice exercise",
        code="int value = 2;",
        question="What value reaches the checkpoint?",
        prediction="3",
        actual="2",
        required="eq 2",
        category="Computation",
    )
    assert "Checkpoint question: What value reaches the checkpoint?" in prompt
    assert "Student predicted: 3" in prompt
    assert "Actual value: 2" in prompt
    assert "Required: eq 2" in prompt
    assert "Error category: Computation" in prompt


def test_hint_uses_condition_specific_system_instructions(monkeypatch):
    calls = []

    async def fixed_chat(system, prompt):
        calls.append((system, prompt))
        return "What do you notice?"

    monkeypatch.setattr("app.hints.chat", fixed_chat)
    common = {
        "level": 1,
        "statement": "A practice exercise",
        "code": "int value = 2;",
        "question": "What value reaches the checkpoint?",
        "prediction": "3",
        "actual": "2",
        "required": "eq 2",
        "category": "Computation",
    }

    for condition in ("generic", "eed"):
        asyncio.run(generate_hint(condition=condition, **common))

    generic_system, generic_prompt = calls[0]
    eed_system, eed_prompt = calls[1]
    assert "Do not refer to predictions, observed runtime values" in generic_system
    assert "Actual value: 2" not in generic_prompt
    assert "expectation-execution difference" in eed_system
    assert "Actual value: 2" in eed_prompt


@pytest.mark.parametrize(
    "condition, expected",
    [
        ("eed", STATIC_FALLBACK["eed"][4]),
        ("generic", STATIC_FALLBACK["generic"][4]),
    ],
)
def test_level_four_uses_condition_specific_fallback_without_calling_llm(monkeypatch, condition, expected):
    async def unexpected_chat(*_args):
        raise AssertionError("The exhausted tutor must not call the LLM.")

    monkeypatch.setattr("app.hints.chat", unexpected_chat)
    hint = asyncio.run(generate_hint(level=4, condition=condition))
    assert hint == expected
