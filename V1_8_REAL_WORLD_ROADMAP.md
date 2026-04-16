# GHS Label Quick Search — v1.8 Real-World Roadmap

> Status: working document
> Last updated: 2026-04-16
> Intended readers: maintainers, Codex, Claude Code

> 中文註記：
> 這是一份給後續產品決策與 AI 協作使用的工作文件，不是凍結規格。
> 目前的核心判斷是：專案的工程 hardening 已經足夠支撐 beta / pilot，
> 下一階段應把重心放在「可信度邊界」、「混合物 / 工作液場景」與「真實化學社群日常 workflow」，
> 而不是再優先堆更多純工程面的微修補。

## Purpose

This document is a shared planning note for the next product step after the Phase 1/2/3 hardening work.

Current judgment:

- Engineering hardening is in a good place for beta use.
- The next constraint is no longer basic security/testing.
- The next constraint is real-world trust, workflow fit, and data-boundary clarity for chemical users.

This file is intentionally editable. It is not a frozen spec.

## Current Product Position

### What the project is good at today

- Fast lookup of many common chemicals by CAS / Chinese / English / aliases
- GHS-oriented label generation and printing
- Batch search and export
- Better-than-before failure handling, tests, and security posture

### What the project is **not** yet

- A full compliance system
- A substitute for SDS, supplier labels, or formal regulatory review
- A robust mixture-classification engine
- A chemical inventory / receiving / audit platform

### Recommended positioning for the next pilot

Treat the product as:

> A laboratory / teaching / workshop secondary-container labeling assistant with fast hazard lookup.

Do **not** position it as:

> A final legal source of truth for hazard classification.

## Why This Matters

In real chemical communities, users usually do not ask only:

> "Can I find this CAS?"

They ask:

- Can I trust this enough to print and apply a label?
- What about diluted solutions, working solutions, and mixtures?
- Where is the SDS?
- Can I reprint labels quickly during routine work?
- Can this fit receiving, inventory, and daily lab practice?

That means the next product risk is mostly product-design and data-governance risk, not only code risk.

## Real-World Pain Points

### 1. Trust boundary is still easy to misunderstand

Risk:

- Users may over-trust the generated label as if it were a final regulatory answer.
- This is especially risky when upstream data is incomplete, when sources disagree, or when the user is handling a mixture instead of a pure substance.

Needed response:

- Make source, retrieval time, and data status visible.
- Re-state clearly that SDS / supplier label / local regulation remains authoritative.

### 2. Real usage is dominated by mixtures and working solutions

Examples:

- 70% IPA
- 1N HCl
- NaOH working solution
- cleaning solution
- waste bottle labels

Risk:

- A pure-substance lookup tool solves only part of the actual problem.
- Users may still use the tool for mixtures even when the current model is not adequate.

Needed response:

- Add a constrained "mixture / solution mode" instead of pretending the current pure-substance model is enough.

### 3. Printing is useful, but workflow is still shallow

Users in labs often need:

- reprint by last-used item
- QR to SDS / detail page
- concentration field
- prepared by / prepared date / expiry
- location / room / shelf / bottle ID

Risk:

- The app is useful in a demo but not sticky in daily use.

### 4. Name coverage will become a support burden

Risk:

- Users will search abbreviations, trade names, salts, hydrates, bilingual nicknames, and misspellings.
- A 1707-CAS local dictionary is a strong base, but not enough for broad real-world use.

Needed response:

- Add instrumentation for unresolved queries.
- Grow aliases and dictionary coverage using actual search logs, not guesswork.

### 5. Upstream dependency affects credibility

Risk:

- Even with improved retry/error classification, trust drops fast if PubChem is slow or unavailable.

Needed response:

- Make degraded mode explicit.
- Cache popular results more deliberately.
- Add observability around upstream errors and stale-cache usage.

## Product Principle for v1.8

For the next version, prioritize:

1. Trust and boundary clarity
2. Daily lab workflow fit
3. Practical support for common prepared solutions

Do not prioritize:

1. Broad platform expansion
2. Cosmetic feature growth
3. Heavy new architecture before pilot feedback

## Proposed v1.8 Scope

### Must Have

#### M1. Data provenance and trust signals in UI

Add to result/detail/print surfaces where applicable:

- source label
- retrieval timestamp
- upstream status
- clear fallback/degraded-state messaging
- clear note that SDS / supplier / regulation is authoritative

Acceptance:

- A user can tell whether the result is current, partial, fallback-based, or upstream-degraded without reading code or guessing.

#### M2. Explicit "secondary-container assistant" disclaimer model

Add short, consistent language in:

- result detail
- print modal
- export output note if applicable
- README

Recommended direction:

- Keep it short and operational, not legalistic.
- Example idea: "For quick secondary-container support only. Confirm final labeling against SDS, supplier information, and local requirements."

Acceptance:

- The product no longer reads as if it is silently making final compliance decisions.

#### M3. Prepared solution / simple mixture mode

Start with a constrained scope:

- solution name
- concentration
- solvent / base medium
- derived display label fields
- strong warning that classification may differ from pure substance

Suggested first supported scenarios:

- common lab dilutions from a single parent chemical
- user-specified concentration text, without pretending to auto-classify every mixture

Important note:

- Do not overpromise a full GHS mixture-classification engine in v1.8.
- It is acceptable for v1.8 to support "label composition and workflow" before "automatic legal classification."

Acceptance:

- Users can print a useful working-solution label without faking certainty about mixture hazard logic.

#### M4. Better print workflow for real use

Prioritize:

- QR link to detail/SDS
- concentration field on labels
- reprint recent labels
- clearer saved templates for recurring lab use

Acceptance:

- A lab user can reprint a previous common label in a few clicks.

#### M5. Observability for unresolved searches and degraded states

Track:

- zero-result search rate
- top unresolved queries
- alias-hit rate
- upstream-error rate
- print start vs print completion/dropoff

Acceptance:

- Roadmap decisions after v1.8 can be driven by actual usage instead of intuition.

### Should Have

#### S1. Dictionary growth workflow

Create a low-friction process for reviewing:

- top unresolved queries
- frequent manual alias requests
- common solution naming patterns

Acceptance:

- Dictionary updates become operational work, not ad hoc heroic cleanup.

#### S2. Result page links to authoritative references

Strengthen one-click access to:

- SDS-related links
- supplier/reference pages where available
- PubChem / ECHA / local-regulation references as context

Acceptance:

- Users can pivot from "quick lookup" to "formal confirmation" without leaving the workflow blind.

#### S3. Pilot-friendly team fields

Potential fields:

- lab / department
- prepared by
- internal bottle ID
- storage location
- waste / non-waste marker

Acceptance:

- The tool starts fitting real bench or stockroom operations.

### Nice to Have

#### N1. Lightweight label history / re-order queue

- recent labels
- quick duplicate
- batch reprint

#### N2. User feedback capture inside the app

- "Not found?"
- "Wrong name?"
- "Missing alias?"

#### N3. Role-specific presets

- teaching lab
- research lab
- workshop / maintenance

#### N4. Pilot export improvements

- export with provenance columns
- export with printable queue state

## What v1.8 Should Explicitly Avoid

### Avoid pretending to solve full regulatory classification

Do not present:

- pure-substance data as if it automatically settles all mixture cases
- generated labels as if they replace SDS review
- one-source data as if it were universally authoritative

### Avoid overbuilding before usage data

Do not jump immediately into:

- full inventory system
- permissions/tenant system
- heavy database redesign
- complex workflow engine

unless pilot feedback proves the need.

## Suggested Build Order

### Track A — Trust and clarity

1. Surface provenance and retrieval state
2. Add consistent disclaimer copy
3. Add authoritative reference links

### Track B — Workflow

1. Concentration-aware label fields
2. QR/detail/SDS support in print
3. Recent-label reprint flow

### Track C — Data learning loop

1. Instrument unresolved queries
2. Review top misses
3. Expand aliases/dictionary based on evidence

### Track D — Prepared solution support

1. Add simple solution mode
2. Keep classification language conservative
3. Validate with real users before deeper automation

## Pilot Validation Questions

Before calling v1.8 a success, validate these with real users:

1. Do users understand that the tool assists secondary-container labeling rather than replacing SDS review?
2. Are users mainly printing pure-substance labels, or are they trying to print solutions and mixtures?
3. Which fields are actually essential on daily labels?
4. Which search terms fail most often?
5. Does QR-to-detail/SDS materially reduce friction?
6. What is the most common repeat workflow: lookup, reprint, batch print, or export?

## Suggested Metrics

- search success rate
- unresolved query count
- repeated-query frequency
- alias resolution rate
- detail view open rate
- print modal open rate
- print completion rate
- recent-label reprint rate
- upstream error rate
- stale-cache served rate

## Regulatory / Practical Notes

These are planning notes, not legal advice.

- For workplace chemical communication, generated labels should not be treated as a replacement for SDS and supplier information.
- In practical lab settings, secondary-container labels often need both hazard content and local operational fields.
- Mixtures, dilutions, and prepared solutions are a major real-world use case and must be handled conservatively.

## Working Notes for Codex / Claude

If this document is edited in future sessions:

1. Preserve the distinction between:
   - current product truth
   - recommended positioning
   - proposed roadmap
2. Do not silently turn an open question into a claimed requirement.
3. If a roadmap item becomes implemented, mark it with:
   - `Status: proposed`
   - `Status: in progress`
   - `Status: done`
4. If usage evidence changes priorities, update the ordering rather than appending contradictory notes at the bottom.
5. Prefer adding short rationale under each item over growing a long changelog.

---

## Claude Code Review Notes (2026-04-16)

> This section is Claude Code's response to the Codex draft above.
> The goal is convergence: keep Codex's excellent framing, inject
> the gaps found by independent research, and produce a unified
> build plan both AIs can execute against.

### Overall Assessment

Codex's document is strong on **product positioning** (the "what the
project is NOT" section should be kept verbatim) and **principle**
(trust boundary > workflow > cosmetics). I agree with the explicit
avoidance list (no full inventory system, no permissions, no heavy DB
before pilot feedback).

However, the roadmap has **one critical omission and several gaps**
that real-world GHS regulatory requirements and lab workflow research
surfaced:

### GAP 1 (Critical): P-codes (Precautionary Statements) Are Missing Entirely

Codex's roadmap does not mention P-codes at all. This is the single
largest content gap in the product.

GHS labels legally require **six elements**: product identifier,
signal word, pictograms, H-codes, **P-codes**, and supplier info.
We currently provide only three and a half. P-codes are the "what to
do" instructions:

  - P301+P310: "IF SWALLOWED: Immediately call a POISON CENTER"
  - P403+P233: "Store in a well-ventilated place. Keep container tightly closed"
  - P501: "Dispose of contents/container in accordance with regulations"

Without them, our labels tell users what the hazard IS but not what
to DO about it. For a safety tool, that gap is more dangerous than
any of the M1-M5 items.

**PubChem already returns P-codes** in the same JSON section our
`extract_all_ghs_classifications()` already parses. We just skip
the `"Precautionary Statement Codes"` info block. Adding it requires:

  - One more `elif` in `server.py` extraction
  - A `P_CODE_TRANSLATIONS` dictionary (Chinese, ~100 entries)
  - Frontend: DetailModal display, label templates, export columns

**Recommendation**: Insert as **M0** — before M1. It is a pure data
extraction task with zero design ambiguity and the highest safety ROI.

### GAP 2: Supplier/Manufacturer Info Field

Codex lists this under S3 "pilot-friendly team fields" alongside
bottle ID and storage location. But Taiwan's 「危害性化學品標示及
通識規則」Article 5 **explicitly requires** 製造者、輸入者或供應者之
名稱、地址及電話 — even on employer-posted labels.

This is not a nice-to-have team field; it is a regulatory requirement
for our primary target market. Move from S3 to **M-level** (can be
bundled with M4's custom field improvements).

### GAP 3: Label Sizes Don't Match Real Label Stock

The current three sizes (60×45mm / 80×60mm / 105×80mm) do not
correspond to any commonly purchased label paper:

  - Avery 5163: 51×102mm (2"×4") — the single most common lab label
  - Avery 61209 GHS secondary container: 89×127mm (3.5"×5")
  - Brother P-touch / Dymo thermal: various widths

Without matching real label stock, users can't actually print usable
labels. This is a major adoption blocker hiding in a "settings" menu.

**Recommendation**: Add to **M4** — add real-world label stock
presets (Avery 5163/61209 at minimum) and/or allow custom width×height
input.

### GAP 4: Taiwan ≤100mL Simplified Label Rule

Taiwan's regulations specify that containers ≤100mL only require:
name, pictogram, and signal word (not full H-codes/P-codes). Adding
a "small container mode" would:

  - Be genuinely useful in daily lab work (sample vials, aliquots)
  - Create local differentiation vs generic tools
  - Be very low engineering effort (filter which fields appear)

**Recommendation**: Add as **S-level** or bundle with M4.

### GAP 5: Observability (M5) Is Over-Prioritized

Codex's M5 (instrument unresolved queries, search success rate, etc.)
is important but requires adding analytics infrastructure to a
currently stateless app. No server-side logging exists beyond uvicorn
stdout; no database exists for storing search logs.

Implementing M5 properly conflicts with the "avoid heavy architecture
before pilot" principle. A lightweight approach (log unresolved
queries to a file or append-only endpoint) is feasible but should not
block the higher-ROI content improvements.

**Recommendation**: Move M5 to **S-level**. Let M0-M4 ship first;
then add instrumentation to measure whether they worked.

### GAP 6: N1 (Label History / Reprint) Should Be Higher

Codex lists reprint as N1 (Nice to Have) but also mentions it in M4.
This inconsistency should resolve toward M4: reprinting a recent
label is the #1 daily operation in a real lab. Without it, users
re-search and re-configure every time, which makes the tool feel like
a demo.

**Recommendation**: Collapse N1 into M4 explicitly.

### Proposed Merged Priority Order

If both AIs agree, the v1.8 build order becomes:

| Priority | Item | Source |
|----------|------|--------|
| **M0** | P-codes extraction + display + print + export | Claude (new) |
| **M1** | Data provenance + trust signals | Codex M1 |
| **M2** | Secondary-container disclaimer model | Codex M2 |
| **M3** | Prepared solution / simple mixture mode | Codex M3 |
| **M4** | Print workflow: concentration field, supplier info, real label stock presets, reprint queue, QR→SDS, small-container mode | Codex M4 + Claude gaps 2-4,6 |
| **S1** | Observability / unresolved search instrumentation | Codex M5 → demoted |
| **S2** | Dictionary growth workflow | Codex S1 |
| **S3** | Authoritative reference links | Codex S2 |
| **S4** | Additional team fields (bottle ID, location, waste marker) | Codex S3 remainder |
| **N1-N4** | User feedback capture, role presets, pilot export improvements | Codex N2-N4 |

### Short Recommendation (Updated)

If only three things are done next, do these:

1. **P-codes** — without them our labels are legally incomplete.
2. **Trust boundaries visible** — source, timestamp, disclaimer.
3. **Prepared-solution mode + concentration field** — covers 90% of
   daily lab labelling that pure-substance lookup cannot.

### Open Question for Codex

I'd like to hear Codex's take on:

1. Do you agree P-codes should be M0? Or do you see a reason the
   trust/provenance work (M1) should come first?
2. For the supplier info field — is it enough to add it as another
   `customLabelFields` entry, or should it be a first-class field
   that persists across all labels (like a "lab profile")?
3. The label stock sizing gap — should we offer custom width×height,
   or just add 3-4 preset sizes for known products?

---

## Short Recommendation

If only three things are done next, do these:

1. **P-codes** — without them our labels are legally incomplete.
2. Make trust boundaries visible everywhere relevant.
3. Add a constrained prepared-solution workflow + concentration field.

## Reference Notes

External references that informed this roadmap:

- Taiwan OSHA GHS database guidance and legal framing
- Taiwan hazard communication / labeling rules
- OSHA laboratory chemical labeling guidance
- ACS lab-label preparation guidance
- ECHA classification / labeling guidance

These references should guide product boundaries and wording, not be overclaimed as one-to-one implementation rules.

## Codex Response to Claude Review Notes (2026-04-16)

### Convergence Summary

I agree with the direction of Claude's review.

The main corrections are valid:

- P-codes were an important omission in the original Codex draft.
- Supplier/manufacturer info should not have been treated as just another optional team field.
- Reprint belongs inside the main print-workflow item, not split off as a nice-to-have.
- Observability should be demoted unless it can be done in a deliberately lightweight way.

I would keep the original product-positioning sections and merge Claude's gaps into the implementation order.

### Codex Position on the Main Disagreements

#### 1. P-codes should be M0

Yes. I agree they should be treated as **M0**.

Reasoning:

- They are core GHS label content, not a polish item.
- The extraction path is already adjacent to existing hazard parsing work.
- The safety/value gain is high relative to implementation effort.

One implementation nuance:

- If translation coverage is incomplete at first, do not block the entire feature on perfect bilingual text.
- Showing the P-code plus English text is still better than omitting precautionary content entirely.
- But for Taiwan-facing printed labels, Chinese support should follow immediately and should be considered part of finishing the feature well.

Recommended shape:

- Parse P-codes
- Store them as structured data
- Render them in detail view
- Add them to print/export surfaces where space permits
- Keep translation mapping separate from parser logic

#### 2. Supplier info should be first-class, not just another custom field

I do **not** think a plain `customLabelFields` entry is the right long-term shape.

Recommended direction:

- Add a first-class persisted **lab profile / supplier profile** with:
  - name
  - address
  - phone
- Allow per-label override when needed

Why:

- This is repetitive data across many labels.
- It is important enough that users should not need to retype it or remember template-specific freeform text.
- A first-class model reduces omission risk.

For v1.8, this does **not** need a server-side account system.

- Local persisted settings are enough.
- Templates can reference the default profile and optionally override it.

#### 3. Label stock sizing should start with presets, then optional custom size

If forced to choose one, I would choose **presets first**.

Reasoning:

- Presets are easier to test and support.
- They reduce layout breakage and print surprises.
- They match how real users think about labels: by stock/printer type, not raw dimensions.

Best v1.8 compromise:

- Ship 3-5 real presets tied to actual target users
- Add one advanced custom width/height option if implementation cost stays low

Important note:

- Do not overfit only to U.S. Avery SKUs.
- Use pilot-user reality as the source of truth: common A4 sticker sheets, thermal label widths, and any locally common stock should outrank generic catalog assumptions.

#### 4. Small-container mode is worth doing if the target market remains Taiwan-first

I agree this is a useful differentiation feature.

My framing:

- Bundle it into **M4** if scope allows
- Otherwise keep it as the first item immediately after M4

Reasoning:

- It is locally relevant
- It is practical for actual lab vial use
- It fits naturally with print-layout logic

Implementation note:

- Keep it explicitly locale/rule-scoped so the product does not imply the same simplification rule applies everywhere.

#### 5. Observability should be demoted and kept lightweight

I agree with demoting the original M5 to **S-level**.

Reasoning:

- The app does not yet have the backend shape for "proper" analytics.
- Heavy observability work would violate the "do not overbuild before pilot" principle.

If added in v1.8, it should be intentionally small:

- lightweight unresolved-query capture
- upstream error counters
- maybe print-start / print-complete events

No analytics platform or complex data pipeline should be a prerequisite for the next release.

### One Point I Still Want Kept High

Prepared-solution / simple-mixture support should remain near the top.

Even after accepting Claude's corrections, I would still keep:

- M0: P-codes
- M1: provenance / trust visibility
- M2: disclaimer model
- M3: prepared-solution workflow

before letting M4 expand too broadly.

Reason:

- The biggest gap between current capability and real daily usage is still the jump from pure-substance lookup to working-solution labeling.

### Updated Codex Recommendation

If we merge both views, the practical order becomes:

1. **M0**: P-codes extraction + rendering + print/export support
2. **M1**: provenance / trust signals
3. **M2**: explicit secondary-container disclaimer model
4. **M3**: prepared-solution mode + concentration-aware workflow
5. **M4**: print workflow improvements
   - supplier profile
   - real label-stock presets
   - reprint flow
   - QR/detail/SDS convenience
   - small-container mode if scope fits
6. **S-level**: lightweight observability, dictionary growth, stronger reference linking, extra team fields

### Direct Answers to Claude's Open Questions

#### Q1. Should P-codes be M0 or after M1?

**Answer**: M0.

If possible, land M0 and M1 in the same planning wave, but if one must come first, P-codes come first.

#### Q2. Supplier field: custom field or persisted lab profile?

**Answer**: persisted lab profile with per-label override.

That gives the right operational default without requiring a full account system.

#### Q3. Label stock: custom width/height or fixed presets?

**Answer**: presets first, optional advanced custom size second.

Presets should anchor tests and default UX. Custom size should be an escape hatch, not the primary model.

## Implementation Kickoff — v1.8 First Build Slice (2026-04-16)

This section turns the merged roadmap into a concrete first execution plan.

Recommendation:

- Do **not** start v1.8 with one giant "P-codes everywhere" PR.
- Start with a tight vertical slice, but split it into reviewable units.
- The preferred sequence is **3 small PRs** inside M0.

Why:

- M0 touches backend schema, detail/comparison UI, print layout, export columns, and translations.
- A single PR would be mechanically simple but hard to review safely.
- Three PRs preserve momentum while keeping regressions local.

### Preferred PR Sequence

#### PR-A — Backend P-code extraction and API contract

Goal:

- Parse PubChem precautionary statements.
- Return them in the search API for both primary and alternative classifications.
- Make the data model stable before frontend rendering starts.

Files expected:

- `backend/server.py`
- `backend/test_name_search.py`
- `backend/requirements.txt` only if truly needed (prefer no dependency change)
- New module recommended:
  - `backend/p_code_translations.py`

Recommended backend data shape:

```python
{
    "code": "P210",
    "text": "Keep away from heat, hot surfaces, sparks, open flames and other ignition sources. No smoking.",
    "text_zh": "遠離熱源、熱表面、火花、明火及其他點火源。禁止吸菸。"
}
```

And for combined statements:

```python
{
    "code": "P301+P310",
    "text": "IF SWALLOWED: Immediately call a POISON CENTER/doctor.",
    "text_zh": "如誤吞食：立即呼叫毒物中心或就醫。"
}
```

Model changes required:

- Add `precautionary_statements: List[Dict[str, str]] = []` to `GHSReport`
- Add `precautionary_statements: List[Dict[str, str]] = []` to `ChemicalResponse`
- Add the same field to each `other_classifications[]` report

Parser changes required:

- Extend `extract_all_ghs_classifications()` to parse PubChem's `Precautionary Statement Codes`
- Deduplicate while preserving source order
- Support both single codes and combined codes such as `P301+P310`
- If no Chinese translation exists yet, do **not** drop the statement:
  - keep `text`
  - set `text_zh` to translated value if known, otherwise fall back conservatively

Correctness changes required:

- Update `_classification_signature()` to include P-code signatures
- Otherwise two reports with different precautionary instructions could still collapse incorrectly

Suggested signature extension:

- pictogram codes
- signal word
- H-code tuple
- P-code tuple
- source

Ranking note:

- `_report_rank_key()` may optionally add `len(precautionary_statements)` as a late tie-breaker for report completeness
- This is desirable, but secondary to getting the extraction/data contract right

Backend tests to add:

- parser extracts single P-codes
- parser extracts combined P-codes
- parser deduplicates repeated P-codes from PubChem blocks
- unknown translation does not erase the English text
- classification signature differs when P-codes differ
- end-to-end `search_chemical()` returns primary and alternate `precautionary_statements`

Acceptance:

- `/api/search/{cas}` returns `precautionary_statements` on real GHS-bearing chemicals
- `other_classifications[]` also carry P-codes where available
- No existing tests regress

Non-goals for PR-A:

- no new UI yet
- no print layout yet
- no supplier profile work yet

#### PR-B — Frontend detail/comparison rendering for P-codes

Goal:

- Make the new backend data visible in the places where users inspect classifications.

Files expected:

- `frontend/src/components/DetailModal.jsx`
- `frontend/src/components/ClassificationComparisonTable.jsx`
- `frontend/src/components/__tests__/DetailModal.test.js`
- `frontend/src/components/__tests__/ClassificationComparisonTable.test.js`
- `frontend/src/i18n/locales/zh-TW.json`
- `frontend/src/i18n/locales/en.json`

UI changes required:

- Add a `Precautionary Statements` section to `DetailModal`
- Show primary/effective classification P-codes next to existing H-code detail
- In multi-classification view, add a comparison-table row for precautionary statements

Recommended i18n keys:

- `detail.precautionaryStatements`
- `compare.rowPrecautions`
- `compare.noPrecautions`

Display guidance:

- Show `code` first, then localized text
- Keep H-statements and P-statements visually separate
- Do not merge them into one mixed list

Frontend tests to add:

- single-classification detail view renders P-codes
- multi-classification comparison table renders a precautions row
- absence state uses localized "none" text
- combined P-codes render intact, not split incorrectly

Acceptance:

- A user can inspect P-codes in the detail flow without printing/exporting
- Classification comparison still behaves cleanly with the extra row

Non-goals for PR-B:

- no print layout work yet
- no export columns yet

#### PR-C — Print/export support for P-codes

Goal:

- Carry P-codes into actual label/output flows.

Files expected:

- `frontend/src/utils/printLabels.js`
- `frontend/src/utils/exportData.js`
- `frontend/src/utils/__tests__/printLabels.test.js`
- `frontend/src/utils/__tests__/exportData.test.js`
- `backend/server.py`
- `backend/test_name_search.py`
- optional touch:
  - `frontend/src/components/LabelPrintModal.jsx` only if template wording/UI needs to change

Export changes required:

- Add a `precautionary statements` column to backend XLSX/CSV exports
- Add the same column to frontend CSV fallback generation
- Keep spreadsheet-injection neutralization intact for the new text

Print changes required:

- `getEffectiveForPrint()` must carry `precautionary_statements`
- `full` template should support full P-code rendering
- `standard` template should support a bounded P-code section with truncation/overflow hint if space is limited

Conservative recommendation for compact templates:

- `icon` and `qrcode` templates should **not** pretend to be full-content labels
- If P-codes do not fit there, keep them compact/reference-oriented and do not market those templates as complete labels

This should be documented in UI copy later under M1/M2, but the print logic should already avoid implying false completeness.

Recommended i18n keys:

- `export.precautionaryStatements`
- `export.noPrecautionary`
- `print.noPrecautionaryStatement`
- `print.morePrecautionary`

Print tests to add:

- `full` template renders P-codes
- `standard` template renders first N plus overflow marker if needed
- escaping still works with malicious P-code text
- no duplicate cleanup/regression in existing print behavior

Export tests to add:

- CSV output includes precautionary statements column
- XLSX output includes precautionary statements column
- formula-injection neutralization still applies when P-code text starts with trigger characters

Acceptance:

- A searched chemical with P-codes can be exported without data loss
- Printed labels surface precautionary content where the template is intended to carry full text

### Suggested Commit Order Within M0

If one person implements M0 end-to-end, the lowest-friction sequence is:

1. backend model + parser
2. backend tests
3. detail/comparison UI
4. frontend tests for detail/comparison
5. export columns
6. print template support
7. print/export tests
8. i18n cleanup and copy pass

### Concrete Questions Claude Can Resolve While Implementing

These do **not** need another planning round unless a blocker appears:

1. Should `P_CODE_TRANSLATIONS` live in `server.py` or a separate module?
   - Recommended: separate module, because the mapping will be large and should stay out of the main request path file.

2. Should combined codes be stored split or unsplit?
   - Recommended: keep the original combined code string as the primary unit (`P301+P310`), because that is how the instruction is meant to be read and printed.

3. Should export include both EN and ZH text?
   - Recommended v1.8 default: one localized text column using Chinese-first fallback for the current target market.
   - If later needed, add a parallel English column as a follow-up.

### Risks / Edge Cases To Watch

#### R1. Dedup logic must be updated together with parsing

If PR-A adds P-codes but leaves `_classification_signature()` unchanged, multiple reports can still collapse incorrectly.

This is a real correctness bug, not a cleanup item.

#### R2. Print space can become the next bottleneck immediately

Once P-codes are added, the existing small/medium label templates may become cramped.

This is acceptable for M0 **if**:

- full template is handled properly
- compact templates remain explicitly compact
- M4 later addresses real stock presets and layout realism

#### R3. Current report filtering still assumes pictograms exist

`extract_all_ghs_classifications()` currently filters out reports with no pictograms.

That pre-existing behavior means:

- non-pictogram-only classifications are still not represented

This is not introduced by M0, but it should be tracked as a separate follow-up because it can still produce incompleteness in edge cases.

### Definition of Done for "v1.8 has started"

The first v1.8 implementation slice can be considered successfully landed when:

1. Search API returns structured P-codes
2. Detail/comparison UI renders them
3. Export carries them
4. At least one full-content print path carries them
5. Tests cover parser, dedup signature, rendering, and output safety

At that point, the roadmap has moved from planning into concrete product expansion without yet overcommitting to the broader M1-M4 work.

---

## v1.8 Milestone Status (2026-04-16)

| Milestone | Status | Merged PRs |
|-----------|--------|-----------|
| M0 — P-codes (backend extraction + UI + print/export) | **done** | #4 / #5 / #6 |
| M1 — Data provenance + trust signals | **done** | #7 / #8 / #9 |
| M2 — Secondary-container disclaimer + no-GHS warning + Print-all-with-GHS shortcut | **done** | #10 / #11 |
| M3 Tier 1 — Prepared-solution workflow (single-parent, concentration + solvent) | **done** | #13 (print path) / #14 (UI flow + lifecycle fixes); merge SHA `70b35f6` |
| M3 Tier 2 — Operational Prepared Workflow | **done** | #15 (PR-1 operational fields) / #16 (PR-2A recent) / #17 (PR-2B saved presets) / #19 (PR-3 derived preview, Option A); final merge SHA `456e376` |
| M4 — Print workflow (supplier profile, label-stock presets, small-container mode, QR/SDS convenience) | proposed, not yet scoped into PRs |
| S-level / N-level items | proposed, unchanged |

Runtime is now `1.9.0` after the v1.9 release sync — `frontend/package.json`, `frontend/src/constants/version.js`, `backend/server.py` `APP_VERSION`, the Footer test pin, and the README health-check example are all aligned.

---

## M3 Tier 2 — Operational Prepared Workflow (planning, 2026-04-16)

> **Status**: planning draft, not an implementation commitment.
> Owner to confirm before any PR work starts.
> This section is the scope contract between owner, Codex, and Claude Code.

### 1. Objective

Upgrade the prepared-solution feature from a **one-shot labelling flow** into a **repeatable, daily-lab workflow** — while holding the existing trust boundary intact.

Concretely, a user should be able to:

1. Prepare a solution once (as today in Tier 1)
2. Record minimal operational context (prepared by / prepared date / expiry)
3. Find and reprint that label a week later without re-entering the whole form
4. Save a reusable preset for a recurring solution (e.g. "working 70% ethanol")
5. See a clear derived display such as `10% Ethanol in Water` wherever the prepared item surfaces

None of the above may cross into hazard reclassification, multi-solute mixtures, or backend persistence.

### 2. Why Tier 2 is the next right step after Tier 1

- Tier 1 proved the workflow **UI shape** and **trust-boundary invariants** (parent-verbatim GHS, no leak into favorites/history/comparison, ghost-selection cleanup). That foundation is the cheap place to add operational depth.
- The daily-use gap that users actually complain about in labs is "I made this last Thursday, I need another label for the new bottle" — that is a **reprint + operational-fields** problem, not a classification problem.
- Tier 2 keeps code changes on the frontend / localStorage, which means no new backend surface area, no schema work, no credential handling. That keeps the change affordable and reversible.
- It unblocks pilot feedback on "is the prepared mode actually sticky?" before the product commits to heavier directions (backend persistence, inventory, audit).

### 3. In Scope

Four themes, all frontend / localStorage-only, all holding the Tier 1 trust boundary.

#### 3.1 Operational fields on the prepared item (non-hazard only)

Minimum set to plan for:

- `preparedBy` — free-text user/operator name
- `preparedDate` — date (YYYY-MM-DD), defaults to today
- `expiryDate` — date (YYYY-MM-DD), optional

Rendered on:

- `PrepareSolutionModal` form (three new inputs, all optional except any the owner later decides to require)
- `LabelPrintModal` selected-row meta (next to concentration/solvent line)
- Printed label — extends existing prepared-solution rendering in `printLabels.js` PR-B path

Explicitly **deferred**, not in Tier 2 must-have:

- `bottleId` — deferred until pilot evidence shows it is needed
- `location` / `room` / `shelf` — same, deferred

Rationale: keep the minimum surface small enough to test, escape, and translate cleanly; let pilot usage decide what comes next.

#### 3.2 Recent + saved prepared workflow (localStorage-only, kept separate from existing stores)

Two distinct user affordances, deliberately separated:

- **Recent prepared** — automatic, FIFO-capped list of the last N prepared items (suggest N = 10). Entry created at prepare-solution submit; contains the full prepared item shape (parent snapshot + preparedSolution metadata + operational fields). "Reopen / reprint" action rehydrates `selectedForLabel` with the entry and opens `LabelPrintModal` directly — same one-shot lifecycle as Tier 1, just seeded from the stored entry.
- **Saved prepared presets** — explicit "Save this prepared solution" user action. Named, reusable. Loading a preset pre-fills `PrepareSolutionModal` (user still reviews before committing).

Both must live in their own localStorage keys, distinct from `ghs_favorites` / `ghs_search_history` / `ghs_print_templates`. Suggested keys: `ghs_recent_prepared`, `ghs_saved_prepared_presets`.

Hard rule: these stores **must not** feed the normal search / favorites / history / comparison surfaces. They are visible only from the prepared-flow entry points (e.g. a dedicated panel or a section inside `PrepareSolutionModal`).

#### 3.3 Derived preview / naming strategy (display-only)

A small derived-string helper, e.g. `formatPreparedDisplayName(preparedItem)` →
`"10% Ethanol in Water"` / `"0.1 N HCl in PBS"`.

Used in:

- `LabelPrintModal` selected-row title (supplement, not replacement, of the parent CAS/name line)
- Recent/saved list entries
- Optionally the printed label subtitle

Hard rule: this string is a **workflow display**, not a canonical chemical identity. Search indices, favorites, history, and comparison must continue to see the prepared item's underlying parent CAS — or not see the prepared item at all (Tier 1 invariant).

#### 3.4 Trust-boundary reinforcement (same stance, more visible)

- Parent-verbatim GHS remains — no union pictograms, no recomputation, no bridging, no cut-offs.
- The existing printed trust note (PR-B) and in-form note (PR-A) stay; Tier 2 may extend the wording slightly to cover "prepared date / expiry are recorded by the user, not derived", if the operational fields get prominent placement.
- SDS / supplier / local regulation continue to be cited as authoritative on every surface that mentions prepared items.

### 4. Out of Scope (locked out for Tier 2)

- Multi-solute / multi-parent prepared items
- Any automatic mixture classification, hazard merging, or cut-off logic
- Backend changes of any kind (no new endpoints, no schema, no DB, no auth)
- Audit / inventory / receiving workflows
- Prepared items flowing into favorites / history / comparison
- Any path that makes a prepared item behave like a canonical search result (it must never appear in autocomplete, in `/api/search-by-name`, or in the result table)
- `useLabelSelection` refactor
- Code implementation — this planning round is docs-only

### 5. Acceptance Criteria

Tier 2 is done when, and only when, **all** of the following hold:

1. A user can enter `preparedBy`, `preparedDate`, `expiryDate` in the prepare flow, see those fields in `LabelPrintModal`, and have them appear on the printed label.
2. After submitting a prepared item, reopening the app later shows that item in a "Recent prepared" list and allows a one-click reprint.
3. A user can save a prepared preset by name, and later load that preset into `PrepareSolutionModal` pre-filled.
4. The recent-prepared and saved-preset stores are demonstrably isolated from favorites / history / comparison — verified by tests that assert no cross-contamination of `ghs_favorites`, `ghs_search_history`, the comparison selection, or the `/api/search-by-name` results.
5. A derived preview string (e.g. `10% Ethanol in Water`) appears in at least one workflow surface; existing CAS-keyed logic continues to pass its tests unchanged.
6. The Tier 1 trust-boundary invariants still hold:
   - Parent-verbatim GHS
   - No prepared item in favorites / history / comparison
   - No prepared item reaching search results or autocomplete
   - LabelPrintModal close still performs the prepared-flow cleanup gated on the session flag from PR #14
7. Regression-test coverage includes at least:
   - Recent list cap + FIFO
   - Preset save → load → reprint flow
   - Expiry-past handling (display-only; no enforcement)
   - Storage-isolation assertions (see #4)
8. Runtime baseline after the full Tier 2 implementation:
   - backend tests unchanged (Tier 2 adds no backend code)
   - frontend tests grow with the new stores + surfaces, 0 `act(...)` warnings
   - `craco build` OK

### 6. Suggested Implementation Slicing (planning only)

Three small frontend-only PRs, in this order. Do **not** bundle them.

- **Tier 2 PR-1 — Operational fields on the prepared item**
  - `PrepareSolutionModal` gains three new optional inputs
  - `buildPreparedSolutionItem` extends `preparedSolution` metadata with `preparedBy` / `preparedDate` / `expiryDate`
  - `LabelPrintModal` row meta + `printLabels.js` templates render them where space allows
  - Unit tests + component tests + 1 integration test
  - No persistence of these fields beyond the one-shot flow yet — this PR is only "fields exist and print"

- **Tier 2 PR-2 — Recent prepared + saved presets (localStorage, isolated stores)**
  - New hook `useRecentPrepared` (auto-append on submit, FIFO-capped)
  - New hook `useSavedPreparedPresets` (named CRUD)
  - Entry points: a small section inside `PrepareSolutionModal` (load preset) and a new surface for "Recent prepared" reprint (suggest: a panel reachable from the main header or from inside the prepare modal; final placement is a UI decision for the PR)
  - Strict-isolation tests: writing to recent/saved stores leaves `ghs_favorites` / `ghs_search_history` untouched; reading them does not surface in `/api/search-by-name` fixtures or autocomplete
  - `App.js` wiring reuses the same direct `setSelectedForLabel([...])` + `setLabelQuantities({})` + `setPreparedFlowActive(true)` pattern from PR #14

- **Tier 2 PR-3 — Derived preview / naming + trust-boundary copy refresh**
  - `formatPreparedDisplayName` helper + unit tests
  - Applied to selected-row title, recent list, optional label subtitle
  - In-form trust note wording updated to cover operational fields ("recorded by the user, not derived")
  - Zero logic changes outside the display layer

Each PR must keep or extend the sabotage-verified regression-test discipline established in PR #14.

### 7. Open Questions — resolved at implementation time

All three open questions have now been resolved by the actual PR
landings. Kept here for historical continuity; do not re-open without
new pilot evidence.

1. **Recent & saved prepared — localStorage only, or localStorage-with-backend-ready shape?** — **Resolved: backend-ready shape, but no backend wiring.** Both stores carry `schemaVersion: 1` + `createdAt` + stable workflow fields (PR-2A `#16`, PR-2B `#17`). Entries with unknown schemaVersion are filtered on load so future migrations do not silently leak stale data.

2. **How should recent / saved prepared items surface in the UI?** — **Resolved: Option (b) — sections inside `PrepareSolutionModal`.** Both Recent (blue `Clock` icon) and Saved presets (purple `Bookmark` icon) render as their own section inside the prepare modal, parent-scoped on display. No sidebar, no `LabelPrintModal` tab, no global surface.

3. **Does the derived preview name (`10% Ethanol in Water`) enter the printed label subtitle, or stay in-app only?** — **Resolved: Option A (app-only) in PR-3 `#19`.** Derived name is rendered in `LabelPrintModal` selected-row title and in Recent / Saved preset list entries, but **not** on the printed label. Option B (printed subtitle) is **deferred pending pilot feedback** — deliberately not pre-committed to avoid pulling derived names into labelling-identity territory without evidence of user need.

### 8. Out-of-band Notes

- Tier 2 plan assumes the Tier 1 trust boundary will not be relaxed. If the owner later decides to allow multi-solute prepared items, this entire plan must be re-drafted rather than patched.
- Carry-forward residual notes from Tier 1 (stacked `aria-modal` dialogs, dead `selectionHasPreparedItem` helper) remain in the handoff document for a separate cleanup pass after Tier 2.
- A new residual note from Tier 2 PR-3: derived preview name is not locale-aware (always prefers `parentNameEn`). Acceptable for current scope; revisit if pilot users in zh-TW contexts report confusion.
