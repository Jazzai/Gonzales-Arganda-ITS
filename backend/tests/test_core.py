import pytest

from app.eed import decide
from app.exercises import get_exercise
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
    _,stderr, _ = compile_and_run(source, "")
    assert extract(stderr, marker, cp) == "1"