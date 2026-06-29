# Organic Inventory Batch Export Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: completed locally on 2026-06-29. The source Organic CSV and generated
row-level report stayed local/ignored.

**Goal:** Make the inventory sampling evidence used for the Organic CSV align with runtime batch CAS validation and surface review-only handoff signals for invalid CAS, blank source names, duplicate CAS, and source-provided `NO GHS` markers.

**Architecture:** Keep this as a local QA/evidence improvement only. Update `frontend/scripts/inventory-print-sampling.mjs` and its Node tests so the sampler validates CAS checksums like `frontend/src/utils/batchSearchInput.js`, excludes checksum-invalid rows from representative valid records, avoids blank-name rows for short-name layout samples, and reports source markers without treating inventory values as approved public data.

**Tech Stack:** Node.js scripts, `node:test`, existing frontend QA scripts, Markdown evidence output.

---

## Evidence And Scope

Source: `/Users/yuchelin/Downloads/最新藥品清冊 - Organic (1).csv`, selected by the owner in Finder on 2026-06-29. Read-only triage found about 401 core inventory rows, hundreds of CAS-like rows, repeated CAS values, checksum/format-invalid CAS cells, at least one valid-CAS row with a blank source name, and many source-side `NO GHS` markers.

Affected user job: a maintainer or lab manager should be able to turn a real inventory CSV into batch/export handoff evidence without silently treating invalid CAS cells or source roster notes as searchable/printable GHS truth.

Non-goals:

- Do not copy the source Organic CSV into the public repo.
- Do not import inventory names into `chemical_dict.py` or any public dictionary.
- Do not change runtime lookup, hazard classification, label output, export payloads, backend APIs, or admin approval behavior in this slice.
- Do not send the Organic CSV to production services as part of implementation.
- Do not treat source `NO GHS` markers as authoritative GHS absence; they are review-only source notes.

Stop condition:

- Inventory sampling tests fail before implementation and pass after implementation.
- The regenerated local Organic evidence report counts checksum-invalid rows as invalid, keeps valid sample records checksum-valid, avoids blank-name short-name samples, and surfaces source `NO GHS` markers as review-only evidence.
- State docs record the local evidence pass without committing private source rows or raw CSV artifacts.

## Files

- Modify: `frontend/scripts/inventory-print-sampling.mjs`
  - Add checksum validation matching the runtime batch parser.
  - Track missing source names and source `NO GHS` marker rows.
  - Render new review-only evidence sections in Markdown.
- Modify: `frontend/scripts/__tests__/inventory-print-sampling.test.mjs`
  - Add RED tests for checksum-invalid CAS exclusion, blank source-name reporting, short-name sample selection, and `NO GHS` marker reporting.
- Modify: `NEXT_PRODUCT_WORK.md`
  - Add an audit breadcrumb that the Organic CSV evidence pass was opened from a real owner-provided CSV and stayed local/review-only.
- Modify: `LAB_WORKFLOW_READINESS_ROADMAP.md`
  - Update Batch/export handoff candidate notes with the observed evidence trigger and non-goal boundary.

## Task 1: Inventory Sampling Handoff Signals

- [x] **Step 1: Add failing Node tests**

In `frontend/scripts/__tests__/inventory-print-sampling.test.mjs`, extend `INVENTORY_CSV_FIXTURE` with:

```js
"FALSE,FALSE,FALSE,有機櫃 E,Checksum invalid row,67-64-2,ACROS,1",
"FALSE,FALSE,FALSE,有機櫃 F,,84-65-1,ACROS,1",
"FALSE,FALSE,FALSE,有機櫃 G,No GHS source note,107-18-6,ACROS,1,NO GHS",
```

Then update tests to assert:

```js
assert.equal(result.records.length, 4);
assert.equal(result.invalidCasRows.length, 2);
assert.equal(result.invalidCasRows[1].reason, "checksum");
assert.equal(result.missingSourceNameRows.length, 1);
assert.equal(result.sourceNoGhsRows.length, 1);
```

Add report-level assertions:

```js
assert.equal(report.summary.validRecordCount, 4);
assert.equal(report.summary.missingSourceNameRowCount, 1);
assert.equal(report.summary.sourceNoGhsMarkerCount, 1);
assert.ok(report.inventorySamples.find((sample) => sample.id === "inventory-short-name").name.length > 0);
assert.equal(report.missingSourceNameSamples[0].cas, "84-65-1");
assert.equal(report.sourceNoGhsSamples[0].cas, "107-18-6");
```

Add Markdown assertions:

```js
assert.match(markdown, /Missing Source Name Samples/);
assert.match(markdown, /Source NO GHS Marker Samples/);
assert.match(markdown, /source marker only/i);
```

- [x] **Step 2: Run the focused test and confirm RED**

Run:

```bash
cd frontend
npm run test:inventory-print-samples
```

Expected: fail because the sampler currently only format-checks CAS values, does not expose missing source-name rows, and does not render source `NO GHS` markers.

- [x] **Step 3: Implement minimal sampler changes**

In `frontend/scripts/inventory-print-sampling.mjs`:

```js
const SOURCE_NO_GHS_PATTERN = /\bno\s*-?\s*ghs\b/i;

const hasValidCasChecksum = (cas = "") => {
  if (!CAS_FORMAT_PATTERN.test(cas)) return false;
  const digits = cas.replace(/-/g, "");
  const checkDigit = Number(digits.slice(-1));
  const bodyDigits = digits
    .slice(0, -1)
    .split("")
    .reverse()
    .map((digit) => Number(digit));
  const checksum = bodyDigits.reduce(
    (sum, digit, index) => sum + digit * (index + 1),
    0,
  );
  return checksum % 10 === checkDigit;
};
```

Make `recordFromRow` return invalid rows for `reason: "format"` or `reason: "checksum"`, include `rowText`, and keep only checksum-valid records in `records`.

Add extracted arrays:

```js
missingSourceNameRows
sourceNoGhsRows
```

Use non-empty names for `inventory-short-name`, while preserving a separate missing-name sample section.

- [x] **Step 4: Run focused test and confirm GREEN**

Run:

```bash
cd frontend
npm run test:inventory-print-samples
```

Expected: pass.

## Task 2: Organic CSV Local Evidence Regeneration And State Breadcrumb

- [x] **Step 1: Regenerate the local evidence report**

Run:

```bash
cd frontend
npm run qa:inventory-print-samples -- --input "/Users/yuchelin/Downloads/最新藥品清冊 - Organic (1).csv" --output-dir build/organic-drug-list-evidence-2026-06-29 --source-name "Downloads/最新藥品清冊 - Organic (1).csv"
```

Expected: command exits `0` and writes only ignored local build artifacts under `frontend/build/organic-drug-list-evidence-2026-06-29/`.

- [x] **Step 2: Inspect the generated Markdown summary**

Run:

```bash
cd frontend
sed -n '1,220p' build/organic-drug-list-evidence-2026-06-29/inventory-print-sampling-report.md
```

Expected: the report shows checksum-aware invalid CAS counts, missing source-name samples if present, source `NO GHS` marker samples if present, and the review-only inventory boundary.

- [x] **Step 3: Update state docs without raw private rows**

Update `NEXT_PRODUCT_WORK.md` and `LAB_WORKFLOW_READINESS_ROADMAP.md` with:

- source: owner-selected Organic CSV in Downloads;
- affected job: batch/export handoff evidence;
- proof: focused sampler test and regenerated ignored local evidence report;
- boundary: source CSV and raw row-level artifacts are not committed and do not update public dictionary data;
- next action: only open runtime export/UI changes if the local evidence report shows a user-facing handoff gap that current export cannot answer.

- [x] **Step 4: Run docs and diff checks**

Run:

```bash
cd frontend
npm run test:docs
cd ..
git diff --check
```

Expected: both commands exit `0`.

## Verification

Run before completion:

```bash
cd frontend
npm run test:inventory-print-samples
npm run qa:inventory-print-samples -- --input "/Users/yuchelin/Downloads/最新藥品清冊 - Organic (1).csv" --output-dir build/organic-drug-list-evidence-2026-06-29 --source-name "Downloads/最新藥品清冊 - Organic (1).csv"
npm run test:docs
cd ..
git diff --check
git status --short
```

Do not claim completion unless these checks are freshly read and any remaining changes are intentional.
