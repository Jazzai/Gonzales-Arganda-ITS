import os
import pathlib
import subprocess
import tempfile

from .config import settings

class CompileError(Exception):
    pass

def _s(x) -> str:
    return x.decode(errors="replace") if isinstance(x, bytes) else (x or "")

def compile_and_run(source: str, stdin_text: str) -> tuple[str, str, bool, int | None]:
    """Returns stdout, stderr, timeout state, and the process exit code."""
    with tempfile.TemporaryDirectory() as d:
        src, exe = pathlib.Path(d) / "main.cpp", pathlib.Path(d) / ("main.exe" if os.name == "nt" else "main")
        src.write_text(source)
        try:
            c = subprocess.run(
                [settings.compiler, "-std=c++17", "-include", "iostream", str(src), "-o", str(exe)],
                capture_output=True, text=True, timeout=settings.compile_timeout_s,
            )
        except subprocess.TimeoutExpired as e:
            raise CompileError("Compilation exceeded the configured time limit.") from e
        if c.returncode != 0:
            raise CompileError(c.stderr)
        try:
            r = subprocess.run(
                [str(exe)], input=stdin_text, capture_output=True,
                text=True, timeout=settings.run_timeout_s,
            )
            return r.stdout, r.stderr, False, r.returncode
        except subprocess.TimeoutExpired as e:  # infinite loops land here
            return _s(e.stdout), _s(e.stderr), True, None