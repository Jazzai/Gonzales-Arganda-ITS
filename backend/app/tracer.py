import secrets
import re


def locate_checkpoint_line(code: str, cp: dict) -> int:
    lines = code.split("\n")
    anchor = cp.get("anchor")
    if anchor:
        matches = [index + 1 for index, line in enumerate(lines) if re.search(anchor, line)]
        if len(matches) != 1:
            raise ValueError(f"Expected one checkpoint anchor, found {len(matches)}")
        return matches[0]

    line = cp["line"]
    if not 1 <= line <= len(lines):
        raise ValueError("Checkpoint line out of range")
    return line

def instrument(code: str, cp: dict) -> tuple[str, str]:
    lines = code.split("\n")
    idx = locate_checkpoint_line(code, cp) - 1

    marker = f"@@CP {secrets.token_hex(4)}"
    if cp["kind"] == "value":
        probe = f'std::cerr << "{marker}|{cp["id"]}|" << ({cp["expr"]}) << "\\n";'
    elif cp["kind"] == "hits":
        probe = f'std::cerr << "{marker}|{cp["id"]}|hit\\n";'
    else:
        raise ValueError(f"Uknown checkpoint kind: {cp['kind']}")

    lines[idx] = probe + " " + lines[idx]
    return "\n".join(lines), marker

def extract(stderr: str, marker: str, cp: dict) -> str | None:
    prefix = f"{marker}|{cp['id']}|"
    vals = [l[len(prefix):] for l in stderr.splitlines() if l.startswith(prefix)]
    if cp["kind"] == "hits":
        return str (len(vals))
    return vals[0] if vals else None