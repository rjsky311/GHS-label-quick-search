# Mac Migration Handoff

Status: ready as a migration checklist and project-context preservation note.

Use this when moving development from the current Windows machine to the Mac
mini M4. The goal is to preserve repo state, planning context, and deployment
continuity without committing local secrets, generated builds, or private
runtime data.

## 1. What Is Being Preserved In GitHub

Push the repo to GitHub after each coherent documentation or code checkpoint.
For the current checkpoint, the important preserved context is:

- `PROJECT_STATUS_AND_NEXT_PLAN.md` - canonical status and next-step selector.
- `NEXT_PRODUCT_WORK.md` - short live queue.
- `AGENTS.md` - Codex session bootstrap.
- `CLAUDE_DESIGN_UI_REVIEW_PACKET.md` - sanitized Claude Design input packet.
- `CLAUDE_DESIGN_ADOPTION_PLAN.md` - filter for Claude Design output.
- `docs/assets/claude-design-preview/` - visual screenshots from the Claude
  Design package.

This keeps enough context to resume on macOS without copying the full Windows
Codex chat history.

## 2. What Should Not Be Committed

Do not commit:

- `.env`, `.env.*`, tokens, credentials, Zeabur secrets, GitHub tokens, API
  keys, or browser profile data.
- `backend/data/*.db` unless a future explicit backup/export decision is made.
  Those files may contain local admin or curation state and are intentionally
  ignored.
- Downloaded zip files, temporary extraction folders, `node_modules`, build
  output, test output, and screenshots under `output/`.
- Claude Design generated mock code as product code without passing
  `CLAUDE_DESIGN_ADOPTION_PLAN.md`.

If a local admin database matters later, export a separate private backup or a
sanitized handoff packet. Do not solve that by committing SQLite files.

## 3. Mac Setup Checklist

Install baseline tools:

```bash
xcode-select --install
```

Recommended package manager:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Install runtime tools:

```bash
brew install git node python@3.11
```

Optional but useful:

```bash
brew install gh
```

Clone the repo:

```bash
git clone https://github.com/rjsky311/GHS-label-quick-search.git
cd GHS-label-quick-search
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

Set up backend virtual environment:

```bash
cd ../backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

If the shell cannot find `python3.11`, use:

```bash
python3 -m venv .venv
```

## 4. First Verification On Mac

Run docs and frontend baseline:

```bash
cd frontend
npm run test:docs
npm test -- --runInBand
npm run test:i18n
npm run build
```

Run backend baseline:

```bash
cd ../backend
source .venv/bin/activate
python -m py_compile server.py api_models.py api_validation.py export_helpers.py
python -m pytest -q
```

Only run production checks when the Mac has network access and the current
target is production verification:

```bash
cd ../frontend
export PRODUCTION_HEALTH_EXPECTED_GIT_SHA=$(git rev-parse HEAD)
npm run qa:production-health
```

## 5. Local Development On Mac

Typical frontend session:

```bash
cd frontend
npm run dev
```

Typical backend session:

```bash
cd backend
source .venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

If frontend needs a local backend, create a local `.env` file on the Mac only:

```text
VITE_BACKEND_URL=http://localhost:8001
```

Do not commit that `.env` file.

## 6. Git And Deployment Workflow

Recommended migration-safe workflow:

1. Finish and push the current Windows checkpoint.
2. On the Mac, clone fresh from GitHub instead of manually copying the working
   directory.
3. Run the baseline checks above.
4. Start future changes from a clean `main` or a `codex/` branch.
5. Commit scoped changes with a clear message.
6. Push to GitHub.
7. Let Zeabur auto-deploy from `main` only when the change is intended for
   production.
8. Verify production with expected-SHA production health when deployment state
   matters.

Do not move by copying `node_modules`, `.venv`, build folders, local browser
profiles, or ignored database files.

## 7. macOS Notes For This Project

- Paths change from Windows-style `C:\...` to Unix-style `/Users/...`.
  Scripts should use repo-relative paths where possible.
- Shell commands use `bash`/`zsh`, not PowerShell, unless PowerShell is
  installed separately.
- File names with Chinese characters are generally fine on macOS, but keep
  repo scripts path-safe and quote paths with spaces.
- Chrome and Safari may render fonts and print preview slightly differently
  from Windows. Use browser screenshots and print QA when touching layout.
- If physical printing becomes active later, re-test paper scaling, QR scan,
  pictogram readability, and label-stock alignment on the actual Mac printer
  setup.

## 8. Recommended First Mac Session

When opening the project on Mac, ask Codex to:

1. Read `AGENTS.md` and `PROJECT_STATUS_AND_NEXT_PLAN.md`.
2. Run `git status --short --branch`.
3. Run `npm run test:docs` and `npm run build` from `frontend/`.
4. Check whether production freshness matters for the next task.
5. Open a new slice only from concrete evidence.

