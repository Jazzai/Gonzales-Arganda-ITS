# EED C++ Logic Tutor

A research prototype for practicing novice C++ logic debugging through prediction, execution, comparison, and Socratic reflection.

The application includes a thesis welcome page, three activities (Loop, Function, and Computation), a FastAPI backend that compiles and runs submissions, and an optional local Ollama tutor.

## Run on a new Windows device

1. Install Git, Node.js LTS, Python 3.12, MSYS2, and (optionally) Ollama. The full installation and compiler instructions are in [SETUP.md](./SETUP.md).
2. Clone the branch you want to use after it has been pushed:

   ```powershell
   git clone --branch feature/research-prototype-welcome-prototype https://github.com/Jazzai/Gonzales-Arganda-ITS.git
   cd Gonzales-Arganda-ITS
   ```

3. Set up and start the backend in **PowerShell**:

   ```powershell
   cd backend
   py -3.12 -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   Copy-Item .env.example .env
   python -m pytest -q
   uvicorn app.main:app --reload --port 8000
   ```

   Keep this terminal open. If `.env` already exists, do not overwrite it; skip the `Copy-Item` command.

4. Open a **second PowerShell** window in the cloned project and start the frontend:

   ```powershell
   cd path\to\Gonzales-Arganda-ITS\frontend
   npm install
   npm run dev
   ```

5. Open <http://localhost:3000>. The backend API documentation is at <http://127.0.0.1:8000/docs>.

For Command Prompt (`cmd.exe`), activate the backend environment with:

```cmd
cd /d "path\to\Gonzales-Arganda-ITS\backend"
.venv\Scripts\activate.bat
if not exist .env copy .env.example .env
```

Run the Python, pytest, and Uvicorn commands from that activated backend prompt. Start the frontend in a separate Command Prompt with `cd /d "path\to\Gonzales-Arganda-ITS\frontend"`, then `npm install` and `npm run dev`.

## Move this work onto a new GitHub branch

The current working folder is a separate Git checkout under `copilot-worktrees`; the original clone on this device is:

```text
C:\Users\ARGANDA\Desktop\Thesis Project\Gonzales-Arganda-ITS
```

Do not copy the whole folder over the original clone. Both checkouts point to the same GitHub repository, so push a branch from the current worktree and fetch that branch from the original clone.

1. In VS Code, open the current worktree folder:

   ```text
   C:\Users\ARGANDA\Desktop\Thesis Project\copilot-worktrees\Gonzales-Arganda-ITS\lcarganda-fluffy-waffle
   ```

2. Open Copilot Chat in that folder and paste the prompt below. Review Copilot's proposed file list, tests, and commit before allowing it to push.
3. In the original clone, retrieve the branch:

   ```powershell
   cd "C:\Users\ARGANDA\Desktop\Thesis Project\Gonzales-Arganda-ITS"
   git status
   git fetch origin
   git switch --track origin/feature/research-prototype-welcome-prototype
   ```

   If the branch already exists locally, use `git switch feature/research-prototype-welcome-prototype` instead. Check `git status` first and do not overwrite or discard local changes.
4. To use the branch on another device, follow the clone and setup instructions above. GitHub authentication must be configured on that device before pushing.


## Safety note

This prototype compiles and runs submitted C++ code on the backend host. It is intended for trusted local use; do not expose it to an untrusted or public network without adding an OS/container sandbox and suitable access controls.
