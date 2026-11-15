import re

import httpx

from .llm import chat

HINT_LIMIT = 4

SYSTEM = (
    "You are a Socratic C++ tutor for novice students. Never write corrected code "
    "and never state exactly which line to change. Reply in at most two sentences."
)

EED_SYSTEM = (
    f"{SYSTEM} Use the supplied checkpoint, prediction, actual value, requirement, "
    "and category as evidence. Help the student reason about the specific "
    "expectation-execution difference without revealing a correction."
)

GENERIC_SYSTEM = (
    f"{SYSTEM} Give general guidance based only on the exercise and code. Do not "
    "refer to predictions, observed runtime values, checkpoint results, hidden "
    "tests, or error categories."
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
    "eed": {
        1: "At this checkpoint, what value do you expect, and which earlier statement supports that expectation?",
        2: "Which part of the relevant C++ construct determines the value captured at this checkpoint?",
        3: "The key idea is to trace how execution reaches a checkpoint and how the expression gets its value.",
        4: "Compare the checkpoint value with the requirement, then trace backward to see how the program produced it.",
    },
    "generic": {
        1: "Which statement would you inspect first to understand how this program behaves, and why?",
        2: "How does the relevant statement use or change the values in this exercise?",
        3: "A useful C++ habit is to track how each statement uses and updates program state.",
        4: "Read the program in execution order and explain how its statements produce the displayed result.",
    },
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
    condition = kw["condition"]
    if kw["level"] >= HINT_LIMIT:
        return STATIC_FALLBACK[condition][HINT_LIMIT]
    prompt = build_prompt(**kw)
    system = EED_SYSTEM if condition == "eed" else GENERIC_SYSTEM
    try:
        for _ in range(3):
            text = await chat(system, prompt)
            if not looks_like_code(text):
                return text
    except httpx.HTTPError:
        return STATIC_FALLBACK[condition][kw["level"]]
    return STATIC_FALLBACK[condition][kw["level"]]
