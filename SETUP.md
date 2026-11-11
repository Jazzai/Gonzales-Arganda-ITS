# Setup Guide: Gonzales-Arganda-ITS

Socratic C++ debugging tutor using Expectation-Execution Divergence (EED).
This guide gets the project running on **macOS** or **Windows 10/11**.

| Part | Stack | Port |
|------|-------|------|
| `backend/` | Python 3.12, FastAPI, g++ (compiles student code) | 8000 |
| `frontend/` | Next.js, React, TypeScript, Tailwind | 3000 |
| LLM | Ollama running `llama3` | 11434 |

> Use **Python 3.12**. Newer versions (3.13+) can break dependencies that don't have prebuilt packages yet.

---

## 1. Install the tools

### macOS

```bash
# Xcode command line tools (git + clang/g++)
xcode-select --install

# Homebrew (skip if already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install git node python@3.12 ollama
```

Verify:

```bash
git --version && node -v && python3.12 --version && g++ --version
```

### Windows (PowerShell)

Open **PowerShell** (not as admin unless a command asks for it).

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install Python.Python.3.12
winget install Ollama.Ollama
winget install MSYS2.MSYS2
```

Close and reopen PowerShell, then install the C++ compiler through MSYS2:

```powershell
# Install the compiler (UCRT64 toolchain)
C:\msys64\usr\bin\bash.exe -lc "pacman -S --noconfirm mingw-w64-ucrt-x86_64-gcc"

# Add it to your user PATH (one time)
[Environment]::SetEnvironmentVariable(
  "Path",
  [Environment]::GetEnvironmentVariable("Path", "User") + ";C:\msys64\ucrt64\bin",
  "User"
)
```

Close and reopen PowerShell, then verify:

```powershell
git --version; node -v; py -3.12 --version; g++ --version
```

Allow virtual environment activation scripts (one time):

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

---

## 2. Get the code

```bash
git clone https://github.com/<owner>/Gonzales-Arganda-ITS.git
cd Gonzales-Arganda-ITS
```

Repo layout:

```
Gonzales-Arganda-ITS/
├── backend/
│   ├── app/            # FastAPI app (EED, tracer, runner, hints, LLM client)
│   ├── exercises/      # Exercise packages (JSON)
│   ├── tests/
│   ├── .env.example
│   └── requirements.txt
├── frontend/           # Next.js app
├── legacy/             # Old code. Do not modify without permission
└── SETUP.md
```

---

## 3. Backend setup

### macOS

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python --version              # must say 3.12.x
pip install -r requirements.txt
cp .env.example .env
```

### Windows (PowerShell)

```powershell
cd backend
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python --version              # must say 3.12.x
pip install -r requirements.txt
Copy-Item .env.example .env
```

Your prompt should show `(.venv)` when the environment is active. **Activate it in every new terminal** before running the backend or tests.

### Windows only: one-line fix in `app/runner.py`

On Windows the compiler produces `main.exe`. Make sure `runner.py` contains:

```python
import os
...
exe = pathlib.Path(d) / ("main.exe" if os.name == "nt" else "main")
```

(replace the existing `exe = ...` line, and add `import os` at the top).

### Configure `.env`

`.env` is never committed. Each person has their own copy made from `.env.example`. Defaults work for local development:

```
CORS_ORIGINS=http://localhost:3000
LLM_BASE_URL=http://localhost:11434
LLM_MODEL=llama3
LLM_TEMPERATURE=0
COMPILER=g++
COMPILE_TIMEOUT_S=15
RUN_TIMEOUT_S=3
LOG_PATH=logs/events.jsonl
```

If a new setting is added to the code, add it to `.env.example` too (placeholder values only, never secrets).

### Run the tests

```bash
python -m pytest -q
```

Use `python -m pytest`, not bare `pytest`, so the venv's interpreter is always used. Expect all tests to pass. The tracer test actually compiles C++, so it also confirms `g++` works.

### Start the backend

```bash
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/docs to see the interactive API page.

---

## 4. Local LLM (Ollama)

Used for Socratic hint generation. If Ollama isn't running, the backend falls back to static hints, so everything else still works.

### macOS

```bash
brew services start ollama
ollama pull llama3
```

### Windows

Ollama starts automatically after install (check the system tray). Then:

```powershell
ollama pull llama3
```

Quick check on either OS:

```bash
ollama run llama3 "Say hi"      # type /bye to exit
```

---

## 5. Frontend setup

Open a **second terminal** from the repo root.

```bash
cd frontend
npm install
```

Create `frontend/.env.local` with:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

- macOS: `echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local`
- Windows: `Set-Content .env.local "NEXT_PUBLIC_API_URL=http://localhost:8000"`

Start it:

```bash
npm run dev
```

Open http://localhost:3000.

---

## 6. Smoke test

1. Backend running on :8000, frontend on :3000.
2. In the browser, leave the starter code unchanged, enter `0` as the prediction, and click **Submit Prediction**.
3. Expected: Prediction `0`, Actual `1`, Required `le 0`, plus a Hint 1 message (Case C).
4. Change `int count = 1;` to `int count = 0;`, predict `0`, and submit. Expected: all three cards match and no hint (Case A).

---

## 7. Daily workflow

Terminal 1 (backend):

| OS | Commands |
|----|----------|
| macOS | `cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000` |
| Windows | `cd backend; .venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --port 8000` |

Terminal 2 (frontend): `cd frontend && npm run dev`

### Working together with Git

```bash
git pull                              # before you start
git checkout -b feature/<short-name>  # one branch per task
# ...work...
git add -A && git commit -m "Describe the change"
git push -u origin feature/<short-name>
```

Open a pull request and have your partner review it before merging to `main`. Do not commit `.env`, `.env.local`, `.venv/`, `node_modules/`, or `backend/logs/` (all are in `.gitignore`).

Windows and macOS use different line endings. To avoid noisy diffs, add a `.gitattributes` file at the repo root once:

```
* text=auto eol=lf
```

---

## 8. Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `ModuleNotFoundError: No module named 'pydantic_settings'` | Venv not active, or wrong Python. Check `which python` (macOS) or `Get-Command python` (Windows). It must point inside `backend/.venv`. Re-activate, then `pip install -r requirements.txt`. |
| `ValidationError ... Field required` | `.env` is missing. Run from inside `backend/` and copy `.env.example` to `.env`. |
| `g++: command not found` / `'g++' is not recognized` | macOS: `xcode-select --install`. Windows: confirm `C:\msys64\ucrt64\bin` is on PATH and reopen PowerShell. |
| `Activate.ps1 cannot be loaded because running scripts is disabled` | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once. |
| Browser shows a CORS error | `CORS_ORIGINS` in `backend/.env` must match the frontend URL exactly, then restart the backend. |
| Frontend says "Failed to fetch" | Backend isn't running, or `NEXT_PUBLIC_API_URL` is wrong. Restart `npm run dev` after editing `.env.local`. |
| Hints always look like generic static text | Ollama isn't running or `llama3` isn't pulled. Run `ollama list`. |
| `Address already in use` on 8000 or 3000 | Another process holds the port. Stop it, or use `--port 8001` (and update `NEXT_PUBLIC_API_URL` and `CORS_ORIGINS` if needed). |
| `pip install` fails building `pydantic-core` | You are on a too-new Python. Recreate the venv with 3.12. |

---

## 9. Safety note

The backend compiles and runs student code on your machine. The current runner only enforces timeouts, so **never expose the backend to the internet** in this state. Before any real participant use, run compile/execute inside a Docker container with no network access and memory limits.
