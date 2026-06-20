# Inventory Print Sampling Report

This is review-only QA evidence. Do not treat inventory names as approved dictionary data.

- Source: qa/fixtures/organic-inventory-2026-06-14.csv
- Generated: 2026-06-20T16:55:05+08:00
- Valid records: 10
- Unique CAS: 9
- Duplicate CAS groups: 1
- Invalid CAS rows: 2

## Selection Rules

- Use inventory records for source-shape, CAS parsing, long-name, duplicate, and batch-boundary coverage.
- Use synthetic stress cases for 6-9 pictogram layouts because real inventory data may not contain every GHS-count condition.
- Use a synthetic over-limit case to keep third-label blocking behavior tested without implying real GHS has 19 pictograms.

## Inventory Samples

| ID | CAS | Name | Reason | Outputs |
| --- | --- | --- | --- | --- |
| inventory-first-valid | 90-41-5 | 2-Aminobiphenyl layout sample | First valid inventory row for smoke testing the source shape. | complete, qrSupplement, quickId |
| inventory-longest-name | 123456-78-9 | Very Long Synthetic Inventory Name For Compact Label Identity Fit Regression With Multiple Hyphenated Segments And Parenthetical Notes | Longest inventory name, useful for small-label identity fit. | complete, qrSupplement, quickId |
| inventory-short-name | 7732-18-5 | Water short name baseline | Short name baseline, useful for spotting unnecessary shrinkage. | complete, qrSupplement, quickId |
| inventory-duplicate-cas | 67-64-1 | Acetone duplicate bottle B | Duplicate CAS row, useful for batch dedupe and page-count checks. | complete, qrSupplement, quickId |
| inventory-last-valid | 222222-22-2 | Last valid parser boundary sample | Last valid row, useful for parser boundary checks. | complete, qrSupplement, quickId |

## Synthetic Stress Cases

| ID | Output | Stock | GHS count | Expected layout |
| --- | --- | --- | ---: | --- |
| qr-small-8-ghs | qrSupplement | brother-62mm-continuous | 8 | QR first label uses 4 x 2 GHS grid. |
| qr-small-9-ghs | qrSupplement | brother-62mm-continuous | 9 | QR first label uses 3 x 3 GHS pressure grid. |
| quick-id-9-ghs | quickId | small-strip | 9 | Identification label uses the full lower hazard band. |
| qr-small-over-limit-19-ghs | qrSupplement | brother-62mm-continuous | 19 | Planner blocks output because it would need a third label. |

## Invalid CAS Samples

| Source row | Raw CAS | Name | Reason |
| ---: | --- | --- | --- |
| 8 | #VALUE! | Broken CAS row for parser coverage | Invalid CAS-like cell from inventory source. |
| 9 | 344-04-07 | Malformed hyphen CAS row | Invalid CAS-like cell from inventory source. |

## Suggested QA Use

- Run the inventory sampler after updating the source fixture.
- Use the inventory sample rows for batch lookup and representative print checks.
- Use the synthetic stress cases for deterministic QR and identification small-label layout checks.
- Manually inspect only the generated representative PDFs, not every inventory row.
