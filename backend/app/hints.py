import re

import httpx

from .llm import chat

HINT_LIMIT = 4

SYSTEM = (
    "You are a Socratic C++ tutor for novice students. Never write corrected code "
    "and never state exactly which line to change. Reply in at most two sentences."
)

EED_INTENT = {
    1: "Ask ONE open-ended question about the checkpoint where the divergence occurred.",
    2: "Ask ONE narrower question pointing at the {category} construct involved.",
    3: "Name the general concept involved in one sentence, WITHOUT stating the fix.",
    4: "Give a short direct explanation of why the actual value occurred. No code.",
}

GENERIC_INTENT = {
    1: "Ask ONE open-ended Socratic question that helps the student examine how their code behaves.",
    2: "Ask ONE narrower Socratic question about the part of the code most likely to matter.",
    3: "Name one general C++ concept relevant to the exercise in one sentence, WITHOUT stating the fix.",
    4: "Give a short direct explanation of what the program does. No code.",
}

STATIC_FALLBACK = {
    1: "What do you think happens before this point in the program?",
    2: "Which statement runs first, and which runs next?",
    3: "Think about the order in which C++ evaluates and executes statements.",
    4: "Trace the program line by line and compare each value with the requirement.",
}

def looks_like_code(text: str) -> bool:
    return "```" in text or bool (re.search(r"[;{}]\s*$", text, re.M))

def build_prompt(*, level, condition, statement, code, question, prediction, actual, required, category) -> str:
    parts = [f"Exercise: {statement}", f"Student code:\n{code}"]
    if condition == "eed":
        parts += [
            f"Checkpoint question: {question}",
            f"Student predicted: {prediction}",
            f"Actual value: {actual}",
            f"Required: {required}",
            f"Error category: {category}",
        ]
        intent = EED_INTENT[level].format(category=category)
    else:
        intent = GENERIC_INTENT[level]
    parts.append(f"Task: {intent}")
    return "\n\n".join(parts)

async def generate_hint(**kw) -> str:
    if kw["level"] >= HINT_LIMIT:
        return STATIC_FALLBACK[HINT_LIMIT]
    prompt = build_prompt(**kw)
    try:
        for _ in range(3):
            text = await chat(SYSTEM, prompt)
            if not looks_like_code(text):
                return text
    except httpx.HTTPError:
        return STATIC_FALLBACK[kw["level"]]
    return STATIC_FALLBACK[kw["level"]]
