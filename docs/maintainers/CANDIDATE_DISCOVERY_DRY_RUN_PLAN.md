# Candidate Discovery Dry-Run Plan

Use `PROJECT_STATUS_AND_NEXT_PLAN.md` as the canonical planning entry point.
Use `PRODUCT_REQUIREMENTS_DECISIONS.md` for the batch-first product priority,
Chinese-name candidate policy, and completion standard. Use
`DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md` for the safety boundary before any
candidate becomes public data.

## Purpose

This plan defines how future candidate discovery can help with missing Chinese
names, unresolved searches, aliases, and reference links without polluting
public lookup, labels, exports, or QR targets.

The first implementation is dry-run only. It may collect candidate evidence,
but it must not write approved manual entries, aliases, reference links, or
public dictionary data.

Current implementation:

- `backend/candidate_discovery.py` builds review-only candidate evidence
  bundles for missing Chinese names and unresolved-search correction requests.
- `backend/scripts/discover_candidates.py` is the maintainer CLI. It can run
  against one CAS number or against open/candidate correction requests in the
  pilot SQLite store.
- Supported sources are `manual`, `local`, and optional `wikidata`.
  `manual` reads approved manual dictionary entries only; `local` reads the
  current seed dictionary and can resolve exact English/Chinese local names to
  CAS for unresolved-search requests. The maintainer CLI defaults to
  `manual,local`; `wikidata` performs a bounded network lookup by CAS only when
  explicitly requested, treats Chinese labels as candidates only, normalizes
  Wikidata item URLs to HTTPS wiki pages, and deduplicates repeated
  language-label rows for the same item.
- The CLI output includes a suggested admin status-update payload, but the
  command itself does not attach it to correction requests and does not create
  manual entries.
- The dry-run report summary includes checked items, candidate count,
  items-with/without-candidates counts, per-status counts, evidence-type
  counts, and skipped count so maintainers can judge the queue before reading
  every item.

## Non-Goals

- Do not add a paid API, credential, or long-running external dependency
  without a separate scope/cost/source decision.
- Do not install broad scientific-agent skill repositories into the active app
  runtime.
- Do not use LLM translation as an approved Chinese name.
- Do not let a public correction submission claim it has already entered manual
  review or changed public data.

## Candidate Sources

Start with low-risk, low-cost sources:

1. Existing local dictionary and approved manual entries.
2. PubChem synonyms and identifiers.
3. Wikidata Chinese labels and aliases.
4. NCI/CADD resolver for name/identifier fallback.
5. EPA CompTox only if an API-key/cost decision is made.
6. Scientific helper skills only as evidence discovery tools, following
   `SCIENTIFIC_AGENT_SKILLS_EVALUATION.md`.

CAS Common Chemistry must remain out of runtime lookup until a license review
confirms it fits future brand and indirect-monetization goals.

## Dry-Run Output Contract

Every dry-run candidate must be shaped as a correction candidate evidence
bundle:

```json
{
  "schema_version": 1,
  "review_required": true,
  "approved_for_public_use": false,
  "public_data_changed": false,
  "source": "candidate-discovery-dry-run",
  "candidate_type": "missing-chinese-name",
  "issue_type": "missing-chinese-name",
  "cas_number": "64-17-5",
  "name_en": "Ethanol",
  "name_zh": "\\u4e59\\u9187",
  "evidence_type": "Wikidata label",
  "evidence_url": "https://www.wikidata.org/wiki/Q153",
  "review_notes": "Candidate only; verify against SDS or authoritative local source."
}
```

Backend storage must sanitize this payload before persistence. Unknown fields
are dropped, unsafe URL schemes are rejected, long free text is rejected, CAS is
normalized, and public approval flags are forced back to review-only values.
Manual-review conversion metadata such as `converted_to_manual_entry`,
`manual_entry_status`, `manual_entry_source`, and correction `request_id` is
admin-only.

The surrounding report must stay review-oriented:

```json
{
  "dryRun": true,
  "publicDataChanged": false,
  "summary": {
    "checked": 2,
    "candidateCount": 1,
    "itemsWithCandidates": 1,
    "itemsWithoutCandidates": 1,
    "statusCounts": {
      "candidate_found": 1,
      "no_candidate": 1
    },
    "evidenceTypeCounts": {
      "Local seed dictionary": 1
    },
    "skipped": 0
  }
}
```

## Workflow

1. A user submits a correction request or an unresolved search is captured.
2. A maintainer or coding agent runs candidate discovery in dry-run mode.
3. The dry run produces candidate evidence bundles only.
4. Candidate bundles can be attached to correction requests as
   `candidate_found`.
5. A maintainer can create a pending manual dictionary review entry from the
   candidate.
6. Public lookup, labels, exports, and QR targets change only after the manual
   entry, alias, or reference link is explicitly approved.

Example maintainer commands:

```bash
cd backend
python scripts/discover_candidates.py --cas 62-53-3 --sources manual,local
python scripts/discover_candidates.py --query Aniline --sources manual,local
python scripts/discover_candidates.py --cas 64-17-5 --sources manual,local,wikidata
python scripts/discover_candidates.py --from-correction-requests --sources manual,local --output build/candidate-discovery-dry-run.json
```

## Acceptance Criteria

- Candidate discovery has no public-data side effect.
- Every candidate carries source/provenance evidence.
- Unsafe URLs and unbounded payloads fail before storage.
- Public submissions cannot set manual-review conversion metadata.
- Admin conversion remains traceable back to the originating correction
  request.
- Tests cover public sanitization, admin conversion metadata, unsafe URL
  rejection, and docs drift.
- The dry-run CLI has focused tests proving that generated candidates are
  review-only, pending manual entries are ignored as public evidence, exact
  local name-to-CAS resolution can seed unresolved-search candidates, Wikidata
  output is CJK-filtered, and correction-request discovery has no write side
  effects.

## Verification Gates

- `python -m pytest test_name_search.py -q`
- `python -m pytest test_pilot_storage.py -q`
- `python -m pytest test_candidate_discovery.py -q`
- `npm run test:docs`
- `git diff --check`

If a future slice adds frontend dry-run UI, also run focused dashboard tests and
`npm run qa:production-search-ui` after deployment.
