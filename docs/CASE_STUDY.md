# Case Study: GHS Label Quick Search

A chemist-run, agent-built safety utility in production.

## The problem

Labs relabel and reorganize chemicals all the time: a new bottle, a prepared
solution, a shared shelf. Looking up GHS hazard data one CAS number at a time
and drawing a compliant label by hand is slow, and it is easy to drop a
pictogram or copy the wrong hazard statement. The goal was a free tool that
does batch lookup first, then batch printing, without pretending to be a
regulatory authority.

## What it does

- Search by CAS number or English/Chinese name, one at a time or as a batch.
- Pull GHS classifications from PubChem, fall back to a local dictionary for
  common names, and show it when sources disagree.
- Link to SDS and reference pages, export to Excel or CSV.
- Print three kinds of labels (complete A4/Letter labels, QR small labels,
  identification small labels) with a live preview.

Live at <https://ghs.yuchelab.com>.

## How it was built

One person owns the product: Yu-Che Lin, a PhD chemist in organic electronic
materials, who wrote the specs and decides what ships. OpenAI Codex and Claude
Code (Anthropic) wrote most of the code from those specs. The split of work:

| Owner | Agents |
|---|---|
| Decides what the tool is for, the safety rules, and when a release ships | Implement features and fixes on branches, write tests, run QA |
| Reviews evidence (screenshots, PDFs, QA reports) | A second agent reviews each change and verifies each release |

The project started in January 2026 on an AI app builder and was moved to a
self-owned React + FastAPI stack so that the code, the data, and the hosting
stay under the owner's control.

## Engineering practices that made it safe to let agents write code

- **Contracts before code.** Safety rules live in plain documents
  ([PRINT_LABEL_CONTRACT.md](../PRINT_LABEL_CONTRACT.md),
  [DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md](../DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md))
  and are enforced by tests. For example, printing is blocked when a required
  GHS pictogram fails to load.
- **Tests at every layer.** 371 backend test functions, about 1,300 frontend
  test cases, plus checks for docs drift, English/Chinese text parity, bundle
  size, and the print contract, all in CI.
- **Evidence-gated releases.** A release counts only when the frontend build and
  the backend health endpoint both report the same full `origin/main` commit,
  and the production QA scripts (health, search UI, PDF canary) pass. CORS and
  security headers are checked on the live site.
- **Work opens only from evidence.** A new piece of work needs a concrete
  trigger (a user report, a failed QA run, a review finding) and a stated stop
  condition, so agents do not keep building by momentum.

## Limits

- It is a reference aid. Users still need the supplier SDS, their workplace
  rules, and local regulations.
- Validation on physical label printers is deferred; print output is checked as
  PDF.

## Code

This repository. MIT License.
