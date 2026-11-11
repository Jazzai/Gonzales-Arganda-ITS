import operator

OPS = {"le": operator.le, "ge": operator.ge, "lt": operator.lt, "gt": operator.gt}

def _norm(v: str):
    v = v.strip().lower()
    try:
        return float(v)
    except ValueError:
        return v

def equal(a: str, b: str, tol: float = 1e-6) -> bool:
    x, y = _norm(a), _norm(b)
    if isinstance(x, float) and isinstance(y, float):
        return abs(x - y) <= tol
    return x == y

def meets_spec(actual: str, expected: str, op: str) -> bool:
    x, y = _norm(actual), _norm(expected)
    if op == "eq" or not (isinstance(x, float) and isinstance(y, float)):
        return equal(actual, expected)
    return OPS[op](x, y)

def decide(p: str, a:str, e: str, op: str) -> str:
    predicted_correctly = equal(p, a)
    code_ok = meets_spec(a, e, op)
    if predicted_correctly and code_ok:
        return "A"
    if not predicted_correctly and code_ok:
        return "B"
    if not predicted_correctly and not code_ok:
        return "C"
    return "D"