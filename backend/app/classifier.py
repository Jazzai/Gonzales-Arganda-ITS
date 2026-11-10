# rule-based placeholder; constrained LLM classifier plug in

import re

LOOP = re.compile(r"\b(for|while|do)\b")
CALL = re.compile(r"\breturn\b|\b(?!if\b|for\b|while\b|switch\b)[A-Za-z_]\w*\s*\(")

def classify(code: str, line: int) -> str:
    text = code.split("\n")[line - 1]
    if LOOP.search(text):
        return "Iteration"
    if CALL.search(text):
        return "Function"
    return "Computation"