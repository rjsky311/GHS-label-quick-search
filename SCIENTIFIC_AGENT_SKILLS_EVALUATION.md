# Scientific Agent Skills Evaluation

Status: reference and future-trial plan as of 2026-05-18.

This document records the evaluation of
`K-Dense-AI/scientific-agent-skills` for this project. It is not an
installation decision and it is not a product dependency. Use it when future
data-governance, dictionary-cleanup, SDS/reference, or literature-checking work
needs a scientific-agent skill shortlist.

Primary sources reviewed:

- Repository: https://github.com/K-Dense-AI/scientific-agent-skills
- Security report:
  https://github.com/K-Dense-AI/scientific-agent-skills/blob/main/SECURITY.md
- `database-lookup`:
  https://github.com/K-Dense-AI/scientific-agent-skills/blob/main/scientific-skills/database-lookup/SKILL.md
- `paper-lookup`:
  https://github.com/K-Dense-AI/scientific-agent-skills/blob/main/scientific-skills/paper-lookup/SKILL.md
- `datamol`:
  https://github.com/K-Dense-AI/scientific-agent-skills/blob/main/scientific-skills/datamol/SKILL.md
- `rdkit`:
  https://github.com/K-Dense-AI/scientific-agent-skills/blob/main/scientific-skills/rdkit/SKILL.md

## Decision

Do not install the full repository.

The repo is a broad research-agent skill collection, not a focused dependency
for a public GHS safety utility. It has useful data-discovery patterns, but the
project should keep its GHS data contract, source ranking, and label-rendering
safety rules inside this repository.

If we install anything later, use a whitelist:

1. `database-lookup`
2. `paper-lookup`
3. `datamol`, only when offline chemical dictionary cleanup starts

Do not install broad writing, review, schematics, cloud, clinical, GPU, docking,
or bioinformatics skills unless a separate task justifies them.

## What The Repo Provides

The repo describes itself as a collection of 135 scientific and research
skills. It includes:

- A unified `database-lookup` skill covering 78 public databases, including
  PubChem, ChEMBL, FDA, DailyMed, USPTO, KEGG, BindingDB, ZINC, UniProt,
  ClinicalTrials.gov, and many non-chemistry databases.
- A `paper-lookup` skill covering PubMed, PMC, bioRxiv, medRxiv, arXiv,
  OpenAlex, Crossref, Semantic Scholar, CORE, and Unpaywall.
- Cheminformatics skills such as `datamol`, `rdkit`, `medchem`, `molfeat`,
  `deepchem`, and `diffdock`.
- Document and communication skills such as `pdf`, `xlsx`, `docx`, `pptx`,
  `markitdown`, `literature-review`, `citation-management`,
  `scientific-writing`, and `scientific-critical-thinking`.
- Many unrelated research-domain skills for genomics, clinical workflows,
  medical imaging, lab automation, geospatial science, physics, machine
  learning, GPU optimization, and grant/review workflows.

The useful part for this project is not runtime code. The useful part is the
curated map of which public scientific databases and lookup workflows a
maintenance agent can consult.

## Fit For GHS Label Quick Search

### Strong Fit: Data-Governance Assistance

`database-lookup` can help with maintenance tasks such as:

- Find candidate CAS synonyms and alternate names from PubChem and ChEMBL.
- Check drug-label or regulatory-adjacent records from DailyMed and FDA.
- Discover external identifiers or cross-references before adding manual
  dictionary entries.
- Gather candidate reference links for admin review.
- Build an evidence bundle when a user reports that a Chinese name, English
  synonym, or SDS/reference link is missing.

This should stay outside the product request path. The app should not start
querying many external databases at runtime just because the skill exists.

### Strong Fit: Literature And Evidence Discovery

`paper-lookup` can help when we need background evidence:

- Toxicology or exposure literature behind a disputed hazard entry.
- DOI/PMID/PMCID metadata for a correction request.
- Open-access copies for maintainer review.
- Crossref/OpenAlex/Semantic Scholar evidence to understand source provenance.

It must not directly decide the printed GHS classification. It can only produce
candidate citations and evidence notes for human/admin review.

### Conditional Fit: Offline Dictionary Cleanup

`datamol` and `rdkit` can help later if we introduce SMILES/InChIKey-based
dictionary cleanup:

- Normalize SMILES or InChI/InChIKey values.
- Detect duplicate compounds in an offline curation table.
- Validate structure strings before adding a manual entry.
- Build non-runtime QA scripts for chemical identity consistency.

They do not solve GHS classification, label layout, SDS authority, or
regulatory compliance. They are not needed for the current print-layout bug.

### Low Fit Or No Fit

Most repo skills are not aligned with the current product:

- `deepchem`, `diffdock`, `molfeat`, `medchem`, and `torchdrug` are drug
  discovery or modeling workflows, not GHS label workflows.
- Bioinformatics, clinical decision support, medical imaging, lab automation,
  GPU, and simulation skills are outside the product scope.
- `pdf`, `xlsx`, `docx`, and `pptx` overlap with existing Codex skills already
  available in this workspace.
- `literature-review`, `citation-management`, `markitdown`, and
  `scientific-critical-thinking` are too broad for default installation and
  have higher security-noise in the repo's own scan.

## Security And Operational Concerns

The repo's own `SECURITY.md` reports a large scan surface: 136 scanned skills
and hundreds of findings, including critical and high-severity entries. This
does not prove malicious intent, but it is enough to reject full installation.

Concerns to keep in mind:

- Skills can steer agent behavior, install packages, make network requests,
  read local files, and modify project files.
- Some skills reference external APIs, credentials, API keys, cloud compute,
  or broad filesystem/document parsing.
- Some skills recommend unpinned package installation.
- Some communication/document skills attempt broad cross-skill activation.
- The repo mixes K-Dense-authored skills and community contributions.
- Individual skills may carry licensing or dependency assumptions that differ
  from this project's runtime.

For this project, scientific lookup skills should be treated as maintainer
tools, not product dependencies.

## Recommended Trial Protocol

Before installing any skill:

1. Create a branch or isolated Codex skill sandbox.
2. Read the target skill's `SKILL.md` and referenced files.
3. Check whether it installs packages, reads environment variables, calls
   external APIs, or writes files.
4. Install one skill at a time.
5. Run a small dry-run task using public, non-sensitive data.
6. Record what sources were queried and what raw evidence was returned.
7. Do not let generated results directly update `backend/chemical_dict.py`,
   manual entries, labels, or exports.

Output from these skills should become one of:

- A candidate correction note.
- A candidate reference link for admin review.
- A candidate alias/name entry with source evidence.
- A local curation report.

It should never directly become:

- A final GHS classification.
- A printed hazard statement.
- A QR target without safe-scheme and source-role review.
- A backend dictionary write without admin/human review.

## Candidate Roadmap Uses

### 1. Dictionary Evidence Bundle

Use `database-lookup` to gather PubChem/ChEMBL/DailyMed/FDA candidates for a
reported missing Chinese name, synonym, or CAS mapping. Produce a small
maintainer report with source URLs, identifiers, and confidence notes.

Acceptance:

- Candidate entries are clearly marked as unapproved.
- No product dictionary file changes until reviewed.
- Unsafe or low-authority references are excluded from QR-target candidates.

### 2. SDS And Reference Link Review

Use `database-lookup` and existing web search to gather candidate SDS,
regulatory, occupational, and generic reference links. Apply
`DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md` role ordering before any link is
shown in the product.

Acceptance:

- Links are explicit `http` or `https`.
- Role/source/label metadata is recorded.
- Generic references cannot outrank SDS or regulatory evidence by priority
  alone.

### 3. Literature Support For Data Conflicts

Use `paper-lookup` when a source conflict needs background evidence. It should
produce DOI/PMID/PMCID/OpenAlex/Crossref metadata and, when available, open
access links for human review.

Acceptance:

- Literature is evidence context, not automatic GHS authority.
- The final product still tells users to verify SDS, supplier labels, and local
  rules.

### 4. Offline Structure Cleanup

Use `datamol` first, then `rdkit` only if needed, to normalize structure fields
if the project later adds SMILES/InChIKey curation.

Acceptance:

- Runs as an offline maintainer script.
- Uses pinned dependencies if added to the repo.
- Does not become part of the production request path without a separate
  design review.

## Explicit Non-Goals

- Do not use these skills to fix label layout, A4/Letter overflow, QR packing,
  or print geometry. That work belongs in `printLabels.js`, the print fit
  engine, print QA, and production browser/PDF gates.
- Do not use AI-generated scientific summaries as legal or regulatory truth.
- Do not use broad research skills to bypass this project's source governance.
- Do not install the whole skill collection into the active Codex environment.

## Current Recommendation

Keep this file as a reference. Do not install anything now.

Reopen the install decision only when one of these happens:

- We start a dedicated dictionary/source-governance curation round.
- We need repeated literature lookup for data conflict triage.
- We add an offline structure-normalization workflow.
- A maintainer explicitly asks for a scientific lookup skill trial.
