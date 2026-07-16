# Production-readiness hardening SDD ledger

- Plan: `docs/superpowers/plans/2026-07-16-production-readiness-hardening.md`
- Base: `origin/main` at `39bf350d48b6a19086123a06a9d7b109690adf42`
- Branch: `codex/production-ready-hardening`
- Baseline: clean checkout at `39bf350d48b6a19086123a06a9d7b109690adf42`
  (`origin/main`); pre-existing untracked `backend/build/` is preserved.
- Task 1 target commands:
  - `cd frontend && npm test -- --runInBand printOutputPlanner.test.js selectedGhsClassification.test.js useLabProfile.test.js`
  - `cd backend && python -m pytest -q test_agent_label_summary.py test_pdf_render.py test_pilot_storage.py`
  - `git diff --check`
- Task 1 acceptance evidence: RED tests must cover hazard-content and batch
  fail-closed semantics, classification identity across reorder, bounded
  responsible-profile storage, bilingual agent-summary statements,
  post-render PDF validation, and bounded/retained review queues. The RED
  run and its intentional failures are recorded in
  `.superpowers/sdd/task-1-report.md`; later tasks own the production fixes.

## Tasks

- Task 1: complete (commits 39bf350..40804df, review clean) — baseline and RED
  contract tests; see `.superpowers/sdd/task-1-report.md` for commands, pass
  counts, and intentional failures.
- Task 2: complete — agent summary and print semantic integrity; bilingual
  statements, per-item hazard readiness, stable classification identity,
  bounded/inspected responsible profiles, indexed layout findings, and
  fresh-lookup-only historical print reuse are verified. See
  `.superpowers/sdd/task-2-report.md`.
- Task 3: complete — raw POST/PUT/PATCH API bytes are bounded before JSON
  decoding (including chunked bodies), valid bodies retain streaming-response
  semantics, and rendered PDFs are byte/page/MediaBox validated with a real
  parser. See `.superpowers/sdd/task-3-report.md`.
- Task 4: complete — pending alias and open correction admission now has
  transactional global/per-CAS row and byte limits, duplicate-report quotas,
  safe 503 responses, observable cleanup/rejection counters, and conservative
  retention that preserves reviewed/final rows. See
  `.superpowers/sdd/task-4-report.md`.
- Task 5: complete — the admin key is memory-only under one authority owner;
  explicit/idle/absolute lock, epoch/request invalidation, immediate protected
  state masking, blank reload behavior, and explicit workspace/observability
  key propagation are verified. See `.superpowers/sdd/task-5-report.md`.
- Task 6: complete — live-response HSTS enforcement/gating, correct document
  language, deployed CJK/semantic smoke, immutable Action pins, explicit code
  ownership, private vulnerability guidance, and enabled GitHub private
  reporting are verified locally. See `.superpowers/sdd/task-6-report.md`.
- Task 7: in progress — local integration, dependency audits, 42-case rendered
  PDF QA, and two-pass independent review are complete with no unresolved
  Critical/Important issue. Protected publication, exact-SHA Zeabur production
  proof, canonical evidence reconciliation, and removal of this repo from the
  Genspark builder app remain. See `.superpowers/sdd/task-7-report.md`.
