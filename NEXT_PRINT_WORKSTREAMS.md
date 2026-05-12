# Next Print Workstreams

This document expands the five current print-workflow gaps into implementation
workstreams. Use it with `NEXT_PRODUCT_WORK.md`,
`PRINT_OUTPUT_REFACTOR_PLAN.md`, and `AUTONOMOUS_WORKFLOW.md` when continuing
autonomous print work.

The goal is not to add more controls. The goal is to make the app choose,
preview, and print the safest truthful label for the user's physical use case,
then leave repeatable evidence that the deployed product actually behaves that
way.

## 1. Prepared Preset Production Clickthrough

Prepared presets matter because a lab user will often prepare the same parent
chemical and concentration repeatedly. The preset must feel like a reliable
recipe shortcut, not a way to reload stale operational data. A saved preset
should restore only the recipe fields that belong to the preset, such as parent
chemical, concentration, and solvent; prepared-by, prepared-date, expiry-date,
case number, and other run-specific fields must still be entered or defaulted
freshly for the new label.

Current status: completed as a production Chrome QA gate. The runner now creates
a prepared preset from Hydrochloric Acid, confirms that Save as preset does not
open the print modal, closes and reopens the prepare-solution form, clicks the
preset, verifies recipe prefill, verifies stale operational fields are cleared,
fills fresh operational fields, then submits into the label print modal.

Acceptance evidence is recorded in
`build/production-prepared-print-report.json` and screenshots under
`build/production-prepared-print-screenshots/`. `npm run
qa:production-prepared` now covers direct creation, prepared-sidebar reprint,
and preset reuse for A4 primary, bottle supplemental, and tube quick-ID prepared
outputs. The report proves that each prepared output keeps parent identity,
concentration, solvent, CAS, signal word, and every required GHS pictogram
visible, and that preset reuse does not bypass current planner checks or reload
an unprintable stale job.

## 2. Full Production Print Matrix Automation

The current production print matrix is much stronger than before, but the user
still experiences print regressions visually before the project always catches
them automatically. The product needs a repeatable deployed-browser gate that
can be run after pushes and before calling a print milestone complete. The gate
should be able to run as a full matrix when time allows, and as smaller layers
when the autonomous loop needs faster feedback.

The next implementation step is to turn the existing production scripts into a
documented and, where practical, CI-callable workflow. The matrix should keep
the current split between primary, compact, multi-chemical, and prepared
coverage, upload or preserve structured JSON reports and screenshots, and make
failure summaries actionable by stock, target, chemical, label kind, and issue
type. If full deployed-browser QA is too slow or too external for every push, it
should still have a manual or scheduled GitHub Actions path and a clear local
post-deploy command sequence.

Acceptance is that a future print change cannot be closed with only local unit
tests when the deployed UI is affected. The evidence set should include bundle
freshness, production Chrome clickthrough, preview geometry, print handoff
status, PDF artifact checks, and screenshots for high-risk compact labels. A
failed production case should point directly to whether the issue is stale
deployment, UI gating, planner routing, preview clipping, print HTML, missing
images, or PDF geometry.

## 3. Real Chemical Edge-Case Coverage

Hydrochloric Acid is useful because it is dense, but it is not enough to prove
the product is robust. Real users will search flammables, corrosives, oxidizers,
single-pictogram chemicals, no-GHS chemicals, long bilingual names, and prepared
solutions with operational identifiers. Each group stresses different layout
rules, hazard summaries, language wrapping, pictogram counts, and planner
routing.

The next implementation step is to keep adding representative chemicals and
fixtures only when they cover a distinct risk. Good candidates are not random
CAS numbers; they should be chosen because they exercise a missing hazard
class, a long-name layout, a sparse single-pictogram layout, an upstream/no-GHS
data boundary, a language mode, or a stock-specific compact failure. Each new
case should map to at least one output family so the matrix grows by risk, not
by volume.

Acceptance is a matrix that explains why each chemical exists. Every new visual
or production bug should become either a real production-searchable case, a
local fixture, or a focused renderer assertion. The matrix should continue to
prove that no-GHS and upstream-error states do not create false hazard labels,
that common dense chemicals can route to continuation output, and that compact
labels preserve identity and pictograms before summarizing H/P text.

## 4. Print Content Policy

The product still needs a clearer policy for what content belongs on each label
class. Complete primary labels are different from front/container labels,
quick-ID labels, QR supplements, and prepared-solution labels. Without an
explicit policy, renderer changes can drift into awkward combinations such as
too much bilingual H/P text on a small label, missing case numbers, or P-text
competing with the pictograms that the physical label is meant to surface.

The next implementation step is to formalize a shared content policy and make
the planner, renderer, UI copy, and tests use it. The policy should define when
to print full H and P statements, when to print only prioritized H summaries,
when H codes are enough, when P codes belong, when P text is intentionally
omitted from a supplemental face label, and when QR/SDS/back-label context must
carry the remaining detail. It should also define language behavior: bilingual
content is valuable, but not at the cost of unreadable compact labels.

Acceptance is that the label body no longer looks like a template accident. The
decision summary should use the same terms as the policy, tests should assert
the expected content role for each output class, and the renderer should not
invent its own separate deletion rules. If a small label drops P text or prints
only H summaries, the UI should make clear that the output is supplemental and
that complete H/P content lives in A4/Letter primary, continuation pages, SDS,
QR, or another complete source.

## 5. UI Visual And Noise Polish

The print modal must feel like a focused task workflow, not a dense control
panel. The user is trying to answer: "What label do I need for this physical
container, and can I print it safely?" Anything that does not help that decision
should be collapsed, delayed, or expressed as a concise outcome. Visual issues
such as vertical target-card text, clipped previews, inconsistent identity
chips, and overlarge/undersized pictograms directly weaken trust.

The next implementation step is a production-Chrome visual audit that treats
the modal as a product surface. The first screen should prioritize physical
target selection, selected output role, whole-label preview, and the print
action. Advanced stock changes, saved jobs, template overrides, calibration,
custom fields, and diagnostics should remain available but should not dominate
the default path. Target cards must stay readable at desktop and narrower modal
widths, and Fit mode must always show a usable whole-label preview before the
user drills into Inspect.

Acceptance is visual evidence across the common target families: A4 Primary,
Letter Primary, standard bottle, large front label, small rack, medium rack,
62 mm continuous, tube/strip, and QR supplement. Screenshots should show no
vertical text artifacts, no clipped print controls, no hidden label body, no
conflicting chips, no decorative clutter around GHS pictograms, and no preview
state that makes the user think a cropped label is printable.
