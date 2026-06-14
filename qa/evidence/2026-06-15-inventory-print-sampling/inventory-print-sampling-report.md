# Inventory Print Sampling Report

This is review-only QA evidence. Do not treat inventory names as approved dictionary data.

- Source: qa/fixtures/organic-inventory-2026-06-14.csv
- Generated: 2026-06-15T00:45:51+08:00
- Valid records: 394
- Unique CAS: 342
- Duplicate CAS groups: 40
- Invalid CAS rows: 7

## Selection Rules

- Use inventory records for source-shape, CAS parsing, long-name, duplicate, and batch-boundary coverage.
- Use synthetic stress cases for 6-9 pictogram layouts because real inventory data may not contain every GHS-count condition.
- Use a synthetic over-limit case to keep third-label blocking behavior tested without implying real GHS has 19 pictograms.

## Inventory Samples

| ID | CAS | Name | Reason | Outputs |
| --- | --- | --- | --- | --- |
| inventory-first-valid | 90-41-5 | 2-Aminobiphenyl | First valid inventory row for smoke testing the source shape. | complete, qrSupplement, quickId |
| inventory-longest-name | 127318-97-2 | 4-Ethyl-1,4,7,8-tetrahydro-3H,10H-spiro[pyrano[3,4-f]indolizine-6,2'-[1,3]dioxolane]-3,10-dione | Longest inventory name, useful for small-label identity fit. | complete, qrSupplement, quickId |
| inventory-short-name | 2537-48-6 | Dieth | Short name baseline, useful for spotting unnecessary shrinkage. | complete, qrSupplement, quickId |
| inventory-duplicate-cas | 90-90-4 | 4-Bromobenzophenone | Duplicate CAS row, useful for batch dedupe and page-count checks. | complete, qrSupplement, quickId |
| inventory-last-valid | 564483-18-7 | Xphos | Last valid row, useful for parser boundary checks. | complete, qrSupplement, quickId |

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
| 79 | 344-04-07 | Bromopentafluorobenzene | Invalid CAS-like cell from inventory source. |
| 179 | 765-03-07 | 1-Dodecyne | Invalid CAS-like cell from inventory source. |
| 192 | 7333-08-06 | 1,2-Di-3-thienyl-1,2-ethanedione | Invalid CAS-like cell from inventory source. |
| 326 | 204-695-3 | 1-Octadecylamine | Invalid CAS-like cell from inventory source. |
| 345 | no | paraformaldehyde | Invalid CAS-like cell from inventory source. |

## Suggested QA Use

- Run the inventory sampler after updating the source fixture.
- Use the inventory sample rows for batch lookup and representative print checks.
- Use the synthetic stress cases for deterministic QR and identification small-label layout checks.
- Manually inspect only the generated representative PDFs, not every inventory row.
