# Practice C++ Tutor prototype

This React/Vite app connects to the FastAPI backend at `http://127.0.0.1:8000` by default. It includes data-driven Iteration, Function, and Computation exercises, checkpoint predictions, EED/generic Socratic tutor modes, attempt history, and local research-log export.

## Run locally

From this directory:

```cmd
npm install
npm run dev
```

Open the local URL printed by Vite. Start the backend separately from `backend/`:

```cmd
uvicorn app.main:app --reload --port 8000
```

The backend uses the configured C++ compiler. On Windows, add the MSYS2 UCRT64 compiler to `PATH` in the backend terminal before starting it:

```cmd
set "PATH=C:\msys64\ucrt64\bin;%PATH%"
```

Set `VITE_API_URL` in `.env.local` if the backend runs at a different address. Exercise code, participant code, appearance, tutor condition, and the visible attempt history are saved in this browser. The backend appends anonymized attempt events to `backend/logs/events.jsonl`; use **History → Download research CSV** to export those events while the backend is running.

Set an anonymous participant code and the condition assigned by the research team under **Settings**. The app does not randomize participants; assign conditions using the study protocol. The exported log includes participant/session codes, predictions, checkpoint outcomes, condition, hint level, output, and timestamps, but does not include participant names or source code.

The compiler executes edited C++ code on the backend host. This prototype is intended for a controlled local study only: keep the backend bound to localhost, use trusted participants, and do not deploy it to a public or shared network without adding an OS/container sandbox, resource limits, authentication, and access controls. CSV export is also local-prototype functionality and is not authenticated.

### Included exercise IDs

- `loop-basics-1` — Iteration / loop condition
- `function-basics-1` — Function return value
- `computation-basics-1` — Arithmetic expression evaluation

Each exercise definition lives in `backend/exercises/`. Public exercise details include sample I/O and checkpoint prompts; oracle values are omitted from the student-facing exercise response.
