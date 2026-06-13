# Print UX And Label Layout Decision Design

Status: proposed design for review.
Date: 2026-06-14.
Owner context: user feedback during print-preview and visual-language review.

This document defines the next print UX and label-layout design direction for
the current three-output print model. It is a product, UX, and implementation
planning spec, not legal advice. Final workplace use still requires official
SDS, supplier labels, and local regulation review.

## 1. Source And Trigger

The slice is opened from direct user review of the live print workflow and
label previews:

- The print modal feels visually and cognitively crowded.
- The user cannot quickly tell where to start or which output is the right one.
- The preview and diagnostic surfaces expose too many internal layout details.
- Small-label text appears too small in some previews.
- The product language feels too cold for the new experiment-notebook design
  language.
- The user wants Traditional Chinese plus English by default, with a pure
  English option for a more international and cleaner label.

This slice is not opened from backlog inertia. It directly affects the user job:
choose a label output, understand whether it is safe and appropriate, preview
the actual result, then print without guessing.

## 2. Current Contract To Preserve

The current product model remains exactly three public print outputs:

1. Complete A4/Letter label.
2. QR small label.
3. Identification small label.

The existing safety contract remains in force:

- Complete A4/Letter labels are the only complete primary output.
- Complete labels require responsible lab/supplier name, phone, and address.
- QR small labels are supplemental and include CAS, English name, Chinese name,
  QR, and every available GHS pictogram across same-output continuations.
- Identification small labels are supplemental and include CAS, English name,
  Chinese name, and every available GHS pictogram across same-output
  continuations.
- Small labels must not include H/P text, signal word, H-code chips, teaser
  summaries, responsible profile, case/custom fields, or verbose purpose copy.
- Available GHS pictograms must never be silently omitted.
- Printed safety-critical label content must stay free of ads and promotional
  copy.

## 3. External Readability Findings

The design should use "readable when printed" as the first layout rule, not
"fits inside the rectangle".

Relevant references:

- OSHA small-container interpretation: OSHA rejected a small-container
  accommodation where required elements became illegible. It states that labels
  must be readable without a device other than ordinary corrective lenses, and
  suggests tags, pull-out labels, or fold-back labels when small containers
  cannot carry legible elements.
  Source: https://www.osha.gov/laws-regs/standardinterpretations/2013-09-20
- OSHA HazCom 1910.1200 defines label elements as pictogram, hazard statement,
  signal word, and precautionary statement for each hazard class/category.
  Shipped-container labels also require product identifier and responsible
  party name, address, and phone number.
  Source: https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1200
- EU Regulation 2024/2865 updates CLP label legibility with minimum x-height,
  pictogram dimensions, line spacing, and font requirements. The smallest
  package tier uses 1.2 mm minimum x-height; the next tier uses 1.4 mm.
  Text must use at least 120% line spacing, an easily legible sans-serif font,
  and appropriate letter spacing.
  Source: https://eur-lex.europa.eu/eli/reg/2024/2865/oj/eng
- BAuA's CLP example for a 1 L mixture uses 16 mm pictograms and 1.4 mm
  x-height, and notes that labels should grow when more elements are required.
  Source: https://www.baua.de/EN/Topics/Chemicals-biological-agents/Hazardous-substances/Classification-and-labelling/Labelling-elements/Example-label
- Commercial print guidance commonly treats text below about 5 pt as difficult
  to read, with 6-8 pt safer for paper labels depending on material and print
  quality.
  Sources:
  https://www.bluelabelpackaging.com/blog/typography-tips-text-and-font-considerations-for-product-label-designs/
  and https://www.stickermule.com/support/faq/artwork/minimum-font-size

Decision:

- The app should not claim formal CLP or OSHA compliance.
- The app should adopt a conservative readability floor inspired by those
  sources.
- QA should eventually check rendered physical scale and critical text size,
  not only DOM presence and overflow.

## 4. UX North Star

The print workflow should feel like a clear bench-side checklist:

1. Choose the job.
2. See what this output can and cannot do.
3. Fill only the information that matters for this output.
4. Preview the actual label at a trustworthy scale.
5. Print only after the app explains that the output is ready.

The UI should be calm, not sparse to the point of ambiguity. It should have the
warmth of an experiment notebook and the clarity of a lab checklist.

The user should never need to understand internal template names, stock
planner categories, fit-engine diagnostics, or renderer implementation details
to complete the main task.

## 5. Information Hierarchy In The Print Modal

The modal should be reorganized around purpose-first steps.

### 5.1 Step 1: Choose Output

Show exactly three output choices:

- Complete A4/Letter label.
- QR small label.
- Identification small label.

Each choice should show:

- Output role.
- What it includes.
- Whether it can replace a complete main label.
- Expected physical stock.

Do not lead with "A4", "62 mm", or "70 x 24 mm" as the main decision. Those are
physical consequences, not the user's primary intent.

### 5.2 Step 2: Prepare Required Details

Complete A4/Letter label:

- Show responsible lab/supplier fields prominently.
- Require name, phone, and address before printing.
- Explain why these fields are needed.

QR small label:

- Do not show responsible profile fields as required.
- State that it is supplemental and links back to the lookup page.

Identification small label:

- Do not show responsible profile fields as required.
- State that it is for fast physical identification only.

### 5.3 Step 3: Preview And Print Check

The preview area should answer:

- Is this output ready?
- How many labels/pages will print?
- Is this complete or supplemental?
- Which language mode is active?
- Is the preview fit-to-view or inspect-scale?
- Which representative labels should be checked before printing, especially
  first label, worst-fit label, longest-name label, and continuation label.

The preview should keep advanced fit diagnostics behind a disclosure. The first
layer should summarize decisions in human language and show the actual label
fragments needed to trust the output.

### 5.4 Advanced Details

Move these behind "Print check details" or equivalent:

- Fit-engine diagnostics.
- Overflow inspection details.
- Physical stock layout counts.
- Debug-like internal categories.
- Raw per-element measurement details.

Advanced details may remain available, but the user should not need them for
the happy path.

## 6. Label Output Decisions

### 6.1 Complete A4/Letter Label

Role:

- Complete reference label for full hazard communication review.

Content:

- CAS.
- English name.
- Chinese name when available.
- Signal word.
- All GHS pictograms.
- Full H statements.
- Full P statements.
- Responsible lab/supplier name, phone, and address.
- QR lookup link.
- Authority boundary/trust footer.

Layout decisions:

- A4/Letter may use same-stock continuation pages.
- Continuation is preferable to compressing H/P content below readability.
- Identity, signal word, pictograms, and responsible profile repeat on
  continuation pages.
- QR appears on the first page by default; later pages should spend the space
  on H/P content unless future physical tests prove repeated QR is needed.

Readability target:

- Product identity remains visually prominent.
- H/P body text should not shrink below the selected readability floor.
- If the renderer would need unreadably small body text, it should continue to
  another page instead of pretending the first page is acceptable.

### 6.2 QR Small Label

Role:

- Supplemental bench label with scan path back to the lookup page.

Content:

- CAS.
- English name.
- Chinese name when bilingual mode is active and name is trusted.
- QR.
- All available GHS pictograms across same-output continuations.

Forbidden:

- H/P text.
- Signal word.
- Responsible profile.
- H-code chips.
- Teaser summaries.

Layout decisions:

- QR should remain large enough for practical phone scanning.
- GHS pictograms should remain recognizable, not decorative.
- The first QR small label should be the normal case. A well-fit 62 x 40 mm QR
  label should carry QR, CAS, the selected language identity text, and roughly
  six recognizable GHS pictograms when the chemical data requires them.
- If pictograms exceed the first label, continuation labels repeat identity and
  use the recovered QR area for remaining pictograms.
- Continuation caps are recovery thresholds, not truncation limits. The app
  must never print a QR small label unless every available GHS pictogram appears
  across the same-output continuation set.
- If all pictograms cannot be rendered readably within the accepted cap, block
  QR small-label printing and offer English-only mode or Complete A4/Letter as
  a separate complete-primary output.

Continuation target:

- Target 1 QR small label for ordinary chemicals.
- Maximum 2 QR small labels per chemical.
- If QR output would require a third label, treat that as a layout or output
  mismatch: do not silently print it. Show recovery guidance instead.

### 6.3 Identification Small Label

Role:

- Fast physical identifier for tubes, bottles, racks, and small local items.

Content:

- CAS.
- English name.
- Chinese name when bilingual mode is active and name is trusted.
- All available GHS pictograms across same-output continuations.

Forbidden:

- QR.
- H/P text.
- Signal word.
- Responsible profile.
- H-code chips.
- Teaser summaries.

Layout decisions:

- This label is the strictest layout. It should prefer clarity over completeness
  of optional language content.
- The first Identification small label should handle nearly all chemicals. The
  layout should aim for one-label output in ordinary cases and should be able
  to carry about six recognizable GHS pictograms when identity text remains
  readable.
- The label should not accept a profile field or detailed hazard text.
- If bilingual identity becomes unreadable, the UI should offer pure English
  mode or recommend a larger complete output.
- Continuation caps are recovery thresholds, not truncation limits. The app
  must never print an Identification small label unless every available GHS
  pictogram appears across the same-output continuation set.
- If all pictograms cannot be rendered readably within the accepted cap, block
  Identification small-label printing and offer English-only mode or Complete
  A4/Letter as a separate complete-primary output.

Continuation target:

- Target 1 Identification small label for nearly all chemicals.
- Maximum 2 Identification small labels per chemical.
- If Identification output would require a third label, treat that as a layout
  or output mismatch: do not silently print it. Show recovery guidance instead.

## 7. Language Modes

The print workflow should support:

1. Traditional Chinese + English.
2. English only.

Traditional Chinese + English remains the default for the current Taiwan/lab
workflow. English only should be offered as a cleaner, more international
option and as a legitimate way to improve small-label readability.

Chinese-only is intentionally out of scope for this slice. It can be revisited
only with a specific user need.

Rules:

- Missing trusted Chinese names remain a data curation issue. Do not fake a
  Chinese name by repeating English.
- English-only is an explicit user-selected physical print mode that
  intentionally suppresses trusted Chinese names on the printed label. Default
  bilingual mode still prints trusted Traditional Chinese plus English.
- Language mode must affect both preview and print output.
- The selected language mode should be visible near the preview summary.
- English-only mode should not weaken SDS/supplier/local regulation reminders.
- Missing trusted Chinese names must remain visible as a data-quality issue in
  the UI outside the physical English-only label.

## 8. Readability And Physical Scale Rules

The current renderer uses CSS pixels and physical millimetre label sizes. CSS
pixels are not the same as x-height, so the implementation plan should avoid
claiming precise x-height compliance unless measured.

Design thresholds for the next implementation plan:

- Define named readability tokens for label text, rather than scattered
  hard-coded font sizes.
- For small labels, keep CAS and identity text above the practical print floor.
- For A4/Letter H/P text, prefer continuation over aggressive compression.
- For QR small labels, preserve QR scan area before adding optional content.
- For all labels, preserve GHS pictogram recognition before decorative styling.
- Add QA assertions for minimum readable text tokens and continuation behavior.

The implementation plan should decide exact CSS values after inspecting current
renderer metrics, but the product rule is already fixed: no output should pass
only because tiny text technically fits.

## 9. Tone And Copy Guidelines

The copy voice should be:

- Clear.
- Calm.
- Warm.
- Safety-aware.
- Not cute.
- Not bureaucratic.

Design language:

- Experiment notebook.
- Bench-side checklist.
- Quiet safety cue.
- Helpful colleague who knows why a step matters.

Avoid:

- System-error tone.
- Debug language.
- Overly legalistic phrasing in the first layer.
- Playful language inside safety-critical warnings.
- Hiding authority boundaries behind friendly copy.

Preferred copy patterns:

| Cold / current-feeling text | Warmer direction |
| --- | --- |
| 尚不可列印 | 還差一點才能列印 |
| 必要資訊尚未齊全 | 補上這些欄位後，就可以列印完整主標 |
| 需確認 | 建議先看一下 |
| 輸出檢查 | 列印前核對 |
| Profile required | 先補上負責單位 |
| 此輸出可選填 | 小標籤可先列印；完整主標才需要負責單位資訊 |
| Blocked | 暫停列印 |
| Warning | 列印前提醒 |

Safety copy should still be explicit. For example:

- Good: "這是補充小標籤，不能取代完整主標。"
- Too vague: "這張小標籤很方便。"

## 10. Visual Language Application

The print modal should use the same Comfort Dim / Dark Bench direction as the
broader UI design language, while preserving printed labels as white physical
objects.

Rules:

- The modal surface can use notebook/workbench texture and warmer neutrals.
- The printed label preview remains white, because the physical label remains
  white in both light and dark UI modes.
- Status chips and warnings should look like annotated notebook marks, not
  generic SaaS badges.
- Buttons should clearly read as buttons while using the tactile paper/tag
  language already explored.
- Keep safety-critical contrast high.
- Do not let decorative texture enter the physical print fragment unless the
  product intentionally prints it. Current direction: UI texture only, printed
  label stays functional and clean.

## 11. Proposed Modal Flow

Default happy path:

1. User opens label print.
2. Modal opens on "Choose output".
3. User selects one of three outputs.
4. The modal immediately shows:
   - role summary,
   - required details,
   - label count,
   - language mode,
   - preview.
5. If the output is complete A4/Letter and profile is missing, the primary
   action becomes "先補上負責單位".
6. If the output is supplemental and ready, the primary action becomes "列印 QR
   小標籤" or "列印識別小標籤", paired with a visible reminder that supplemental
   labels do not replace complete labels, SDS, supplier labels, or local rules.
7. If readability or continuation exceeds the product cap, the modal offers a
   clear recovery: switch to English-only, switch to complete A4/Letter, or
   review continuation details.

The user should be able to complete common prints without opening advanced
details.

## 12. Error And Recovery Design

Complete A4/Letter:

- Missing responsible profile blocks print.
- Recovery: focus the responsible profile section.
- Copy: "完整主標需要負責單位名稱、電話與地址。補齊後才能列印此參考主標；使用前仍需依 SDS、供應商標籤與當地規範確認。"

QR small label:

- Missing QR target blocks QR output.
- Too many small-label continuations prompts recovery instead of silently
  printing a long run.
- Recovery: English-only mode, complete A4/Letter, or inspect continuation.
- Copy near print action: "補充小標籤，不能取代完整主標、SDS、供應商標籤或當地規範要求。"

Identification small label:

- Missing CAS or identity blocks print.
- Too many pictograms for readable small-label output prompts recovery.
- Recovery: English-only mode or complete A4/Letter.
- Copy near print action: "識別小標籤只協助辨識與查看圖示，不能取代完整主標、SDS、供應商標籤或當地規範要求。"

All outputs:

- Missing pictograms should be shown as a data/source condition, not hidden.
- Missing trusted Chinese name should be framed as curation/review, not as a
  fake translated fallback.

## 13. Sub-Agent Review Plan

After this spec is accepted, request a critical review before implementation.
The reviewer should not redesign freely; it should red-team this spec.

Reviewer roles:

1. Safety and compliance reviewer:
   - Does any copy imply supplemental labels replace complete labels?
   - Are SDS/supplier/local regulation boundaries still visible?
   - Are pictogram and readability rules strong enough?

2. Lab user reviewer:
   - Can a first-time user tell where to start?
   - Does the blocked/ready state tell the user what to do next?
   - Are the labels named by purpose rather than internal template details?

3. Print layout reviewer:
   - Are text, QR, and pictogram priorities sensible for each physical size?
   - Are continuation caps reasonable?
   - Are we avoiding unreadably small text?

4. Code architecture reviewer:
   - Are product rules, UI state, renderer rules, and QA checks separable?
   - Are there likely files that need extraction before implementation?
   - Are existing tests sufficient to protect the new UX contract?

The sub-agent should return findings, open questions, and suggested spec edits.
It should not change code.

Suggested review prompt:

> Review `docs/superpowers/specs/2026-06-14-print-ux-label-layout-decision-design.md`
> from a critical product, safety, print-layout, and code-architecture
> perspective. Treat the current three-output print model as fixed unless you
> find a direct safety contradiction. Do not implement code. Return findings
> ordered by severity, cite the spec section that creates the concern, and
> propose concise spec edits. Pay special attention to whether supplemental
> labels could be mistaken for complete labels, whether the warmer copy weakens
> safety clarity, whether the continuation caps are practical, and whether the
> implementation slices are small enough to test safely.

## 14. Implementation Boundaries For The Next Plan

The next implementation plan should be split into small slices:

0. Contract and QA lock:
   - Centralize output definitions, forbidden content, language-mode rules,
     readability token names, and continuation/block semantics.
   - Add or confirm print-contract tests before changing modal UI.
   - Preserve the existing three-output contract while making English-only an
     explicit rendering mode.

1. Copy and information hierarchy:
   - Rename first-layer labels and status copy.
   - Move advanced diagnostics behind disclosure.
   - Preserve existing product logic.

2. Language mode:
   - Add Traditional Chinese + English and English-only print modes.
   - Ensure preview and print use the same language mode.

3. Readability tokens and continuation rules:
   - Centralize readable font-size tokens.
   - Add continuation caps and recovery states.
   - Add QA assertions for small-label readability and label count.

4. Visual polish:
   - Apply experiment-notebook UI styling to modal controls and status areas.
   - Keep physical label preview clean and white.

Do not implement all four in one unreviewed change set unless a later plan
proves the code paths are already isolated.

## 15. Acceptance Criteria

The design is ready for implementation planning when:

- The user agrees with the three-output role definitions.
- The user agrees that responsible profile remains complete-label only.
- The user agrees with bilingual default plus English-only mode.
- The user agrees that small-label continuation caps are recovery thresholds,
  not pictogram truncation limits.
- The user agrees with small-label continuation recovery behavior.
- The user agrees with the warmer copy direction.
- Critical review findings have been incorporated or explicitly deferred with a
  documented reason.

Implementation acceptance will require:

- Print contract tests updated or preserved for all three outputs.
- i18n tests for new copy and language mode.
- Print/PDF QA for A4, QR small, and identification small outputs.
- Browser QA for the modal happy path and blocked states.
- Production QA after deployment if UI or print renderer behavior changes.

## 16. Resolved Small-Label Continuation Decision

Small-label continuation is intentionally strict:

- QR small label: target one label in normal cases, maximum two labels per
  chemical.
- Identification small label: target one label for nearly all chemicals,
  maximum two labels per chemical.
- Both small-label layouts should be able to handle about six recognizable GHS
  pictograms when the selected identity text remains readable.

This threshold never permits pictogram omission. If every available pictogram
cannot be rendered readably across one or two same-output small labels, the
small-label output must be blocked and the UI should offer English-only mode or
Complete A4/Letter as the recovery path. A QR small label requiring a third
label is considered a layout or output mismatch, not a normal accepted path.
