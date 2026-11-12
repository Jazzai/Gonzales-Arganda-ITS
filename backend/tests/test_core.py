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


def test_level_four_uses_direct_fallback_without_calling_llm(monkeypatch):
    async def unexpected_chat(*_args):
        raise AssertionError("The exhausted tutor must not call the LLM.")

    monkeypatch.setattr("app.hints.chat", unexpected_chat)
    hint = asyncio.run(generate_hint(level=4))
    assert hint == STATIC_FALLBACK[4]