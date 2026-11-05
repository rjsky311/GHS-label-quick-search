import { inspectPrintLayoutDocument } from "../printLayoutInspection";

const overflowingChip = (className) => {
  const root = document.createElement("div");
  root.innerHTML = `
    <div class="label">
      <span class="meta-chip ${className}">
        <span class="meta-chip-value">A value too long for its chip</span>
      </span>
    </div>`;
  const value = root.querySelector(".meta-chip-value");
  value.style.textOverflow = "ellipsis";
  value.style.whiteSpace = "nowrap";
  Object.defineProperty(value, "scrollWidth", { value: 120 });
  Object.defineProperty(value, "clientWidth", { value: 40 });
  return root;
};

describe("inspectPrintLayoutDocument", () => {
  it("reports a prepared solution's concentration or solvent being cut off", () => {
    const issues = inspectPrintLayoutDocument(
      overflowingChip("meta-chip-prepared-detail"),
    );

    expect(issues.map((issue) => issue.type)).toContain(
      "prepared-detail-overflow",
    );
  });

  it("returns an array of issues", () => {
    expect(inspectPrintLayoutDocument(document.createElement("div"))).toEqual(
      [],
    );
  });
});
