import { render, screen, fireEvent, act } from "@testing-library/react";
import PrepareSolutionModal from "../PrepareSolutionModal";

const baseParent = {
  cas_number: "64-17-5",
  cid: 702,
  name_en: "Ethanol",
  name_zh: "乙醇",
  found: true,
  ghs_pictograms: [{ code: "GHS02" }],
  hazard_statements: [{ code: "H225", text_zh: "x" }],
  signal_word: "Danger",
  signal_word_zh: "危險",
};

describe("PrepareSolutionModal", () => {
  it("renders nothing when parent is null", () => {
    const { container } = render(
      <PrepareSolutionModal parent={null} onSubmit={jest.fn()} onClose={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders with role=dialog + aria-modal and the title", () => {
    render(
      <PrepareSolutionModal parent={baseParent} onSubmit={jest.fn()} onClose={jest.fn()} />
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("prepared.title")).toBeInTheDocument();
  });

  it("shows the parent chemical summary read-only", () => {
    render(
      <PrepareSolutionModal parent={baseParent} onSubmit={jest.fn()} onClose={jest.fn()} />
    );
    const summary = screen.getByTestId("prepare-solution-parent-summary");
    expect(summary.textContent).toContain("64-17-5");
    expect(summary.textContent).toContain("Ethanol");
    expect(summary.textContent).toContain("乙醇");
  });

  it("submit button is disabled until both concentration AND solvent have content", () => {
    render(
      <PrepareSolutionModal parent={baseParent} onSubmit={jest.fn()} onClose={jest.fn()} />
    );
    const submit = screen.getByTestId("prepare-solution-submit-btn");
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByTestId("prepared-concentration-input"), {
      target: { value: "10%" },
    });
    expect(submit).toBeDisabled(); // solvent still blank

    fireEvent.change(screen.getByTestId("prepared-solvent-input"), {
      target: { value: "Water" },
    });
    expect(submit).not.toBeDisabled();

    // Whitespace-only → still disabled (trim check)
    fireEvent.change(screen.getByTestId("prepared-concentration-input"), {
      target: { value: "   " },
    });
    expect(submit).toBeDisabled();
  });

  it("does NOT call onSubmit when form is invalid and submit is forced", () => {
    const onSubmit = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={onSubmit}
        onClose={jest.fn()}
      />
    );
    // Direct click on the disabled button: browser prevents handler, but
    // even if an automation framework bypassed disabled, handleSubmit's
    // canSubmit guard would still stop the callback.
    fireEvent.click(screen.getByTestId("prepare-solution-submit-btn"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with trimmed values when submitted with valid form", () => {
    const onSubmit = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={onSubmit}
        onClose={jest.fn()}
      />
    );
    fireEvent.change(screen.getByTestId("prepared-concentration-input"), {
      target: { value: "  10% (v/v)  " },
    });
    fireEvent.change(screen.getByTestId("prepared-solvent-input"), {
      target: { value: "  Water  " },
    });
    fireEvent.click(screen.getByTestId("prepare-solution-submit-btn"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    // Tier 2 PR-1: operational-field slots always pass through in the
    // payload so the helper has a single consistent destructure site.
    // When the user skips them, they come across as empty strings;
    // buildPreparedSolutionItem normalises to null.
    expect(onSubmit).toHaveBeenCalledWith({
      concentration: "10% (v/v)",
      solvent: "Water",
      preparedBy: "",
      preparedDate: "",
      expiryDate: "",
    });
  });

  it("Enter key on the form submits when valid", () => {
    const onSubmit = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={onSubmit}
        onClose={jest.fn()}
      />
    );
    fireEvent.change(screen.getByTestId("prepared-concentration-input"), {
      target: { value: "10%" },
    });
    fireEvent.change(screen.getByTestId("prepared-solvent-input"), {
      target: { value: "Water" },
    });
    // Simulate form submission (which is what Enter key does in a form)
    const form = screen
      .getByTestId("prepare-solution-submit-btn")
      .closest("form");
    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalledWith({
      concentration: "10%",
      solvent: "Water",
      preparedBy: "",
      preparedDate: "",
      expiryDate: "",
    });
  });

  it("Cancel button calls onClose (not onSubmit)", () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    );
    // Fill the form so onSubmit would fire if miswired
    fireEvent.change(screen.getByTestId("prepared-concentration-input"), {
      target: { value: "10%" },
    });
    fireEvent.change(screen.getByTestId("prepared-solvent-input"), {
      target: { value: "Water" },
    });
    fireEvent.click(screen.getByTestId("prepare-solution-cancel-btn"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("X button calls onClose", () => {
    const onClose = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByTestId("prepare-solution-close-btn"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking the backdrop calls onClose", () => {
    const onClose = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking inside the dialog content does NOT close", () => {
    const onClose = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByTestId("prepare-solution-parent-summary"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Escape key calls onClose", () => {
    const onClose = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={onClose}
      />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("focuses the concentration input on mount", () => {
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByTestId("prepared-concentration-input")).toHaveFocus();
  });

  it("renders the trust-boundary form note so users see the disclaimer before submitting", () => {
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByTestId("prepare-solution-form-note")).toBeInTheDocument();
  });

  // ── Tier 2 PR-1: optional operational metadata ──────────────

  it("renders the operational-info section with preparedBy / preparedDate / expiryDate inputs (all optional)", () => {
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(
      screen.getByTestId("prepare-solution-operational-section")
    ).toBeInTheDocument();
    const byInput = screen.getByTestId("prepared-prepared-by-input");
    const dateInput = screen.getByTestId("prepared-prepared-date-input");
    const expiryInput = screen.getByTestId("prepared-expiry-date-input");
    expect(byInput).toBeInTheDocument();
    expect(dateInput).toBeInTheDocument();
    expect(expiryInput).toBeInTheDocument();
    // None are marked `required` (they are optional by product decision).
    expect(byInput).not.toBeRequired();
    expect(dateInput).not.toBeRequired();
    expect(expiryInput).not.toBeRequired();
    // Date inputs use the HTML5 date picker so users don't have to
    // worry about formatting.
    expect(dateInput).toHaveAttribute("type", "date");
    expect(expiryInput).toHaveAttribute("type", "date");
  });

  it("submit is still enabled when operational fields are blank — they do not gate submit", () => {
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
      />
    );
    fireEvent.change(screen.getByTestId("prepared-concentration-input"), {
      target: { value: "10%" },
    });
    fireEvent.change(screen.getByTestId("prepared-solvent-input"), {
      target: { value: "Water" },
    });
    expect(screen.getByTestId("prepare-solution-submit-btn")).not.toBeDisabled();
  });

  it("submit carries operational-field values when the user fills them in", () => {
    const onSubmit = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={onSubmit}
        onClose={jest.fn()}
      />
    );
    fireEvent.change(screen.getByTestId("prepared-concentration-input"), {
      target: { value: "10%" },
    });
    fireEvent.change(screen.getByTestId("prepared-solvent-input"), {
      target: { value: "Water" },
    });
    fireEvent.change(screen.getByTestId("prepared-prepared-by-input"), {
      target: { value: "  A. Chen  " },
    });
    fireEvent.change(screen.getByTestId("prepared-prepared-date-input"), {
      target: { value: "2026-04-16" },
    });
    fireEvent.change(screen.getByTestId("prepared-expiry-date-input"), {
      target: { value: "2026-10-16" },
    });
    fireEvent.click(screen.getByTestId("prepare-solution-submit-btn"));
    expect(onSubmit).toHaveBeenCalledWith({
      concentration: "10%",
      solvent: "Water",
      preparedBy: "A. Chen",
      preparedDate: "2026-04-16",
      expiryDate: "2026-10-16",
    });
  });

  it("operational section copy signals user-entered / not-derived framing", () => {
    // Pins the intent that the section must NOT be framed as GHS or
    // hazard data. If someone later swaps the copy for something
    // classification-flavoured, this guard fails.
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const section = screen.getByTestId("prepare-solution-operational-section");
    expect(section.textContent).toContain("prepared.operationalHeading");
    expect(section.textContent).toContain("prepared.operationalSubheading");
  });

  // ── Tier 2 PR-2A: Recent prepared (parent-scoped) ───────────

  const baseRecent = {
    schemaVersion: 1,
    createdAt: "2026-04-16T10:00:00.000Z",
    parentCas: baseParent.cas_number, // 64-17-5
    parentNameEn: baseParent.name_en,
    parentNameZh: baseParent.name_zh,
    concentration: "10% (v/v)",
    solvent: "Water",
    preparedBy: "A. Chen",
    preparedDate: "2026-04-16",
    expiryDate: "2026-10-16",
  };

  it("does NOT render the Recent section when there are no recents at all", () => {
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
        recents={[]}
      />
    );
    expect(
      screen.queryByTestId("prepare-solution-recent-section")
    ).not.toBeInTheDocument();
  });

  it("does NOT render the Recent section when no recents match the current parent CAS", () => {
    // A recent for a different parent must not leak into this parent's
    // modal. Scoping is the whole point of showing recents here.
    const fromOtherParent = { ...baseRecent, parentCas: "67-56-1" };
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
        recents={[fromOtherParent]}
      />
    );
    expect(
      screen.queryByTestId("prepare-solution-recent-section")
    ).not.toBeInTheDocument();
  });

  it("renders parent-scoped recents when available", () => {
    const otherParent = { ...baseRecent, parentCas: "67-56-1" };
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
        recents={[otherParent, baseRecent]}
      />
    );
    expect(
      screen.getByTestId("prepare-solution-recent-section")
    ).toBeInTheDocument();
    const list = screen.getByTestId("prepare-solution-recent-list");
    // Only 1 list item — the one that matches the current parent.
    expect(list.querySelectorAll("li")).toHaveLength(1);
    expect(screen.getByTestId("prepare-solution-recent-item-0")).toHaveTextContent(
      "A. Chen"
    );
  });

  it("clicking a recent item prefills the form without auto-submitting", () => {
    const onSubmit = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={onSubmit}
        onClose={jest.fn()}
        recents={[baseRecent]}
      />
    );
    fireEvent.click(screen.getByTestId("prepare-solution-recent-item-0"));

    // Form inputs reflect the recent values (prefilled, not submitted)
    expect(screen.getByTestId("prepared-concentration-input")).toHaveValue(
      "10% (v/v)"
    );
    expect(screen.getByTestId("prepared-solvent-input")).toHaveValue("Water");
    expect(screen.getByTestId("prepared-prepared-by-input")).toHaveValue(
      "A. Chen"
    );
    expect(screen.getByTestId("prepared-prepared-date-input")).toHaveValue(
      "2026-04-16"
    );
    expect(screen.getByTestId("prepared-expiry-date-input")).toHaveValue(
      "2026-10-16"
    );

    // Critical: onSubmit must NOT have fired — prefill only.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clicking a recent item with blank optional fields leaves those inputs blank", () => {
    const minimal = {
      ...baseRecent,
      preparedBy: null,
      preparedDate: null,
      expiryDate: null,
    };
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
        recents={[minimal]}
      />
    );
    fireEvent.click(screen.getByTestId("prepare-solution-recent-item-0"));

    expect(screen.getByTestId("prepared-concentration-input")).toHaveValue(
      "10% (v/v)"
    );
    expect(screen.getByTestId("prepared-prepared-by-input")).toHaveValue("");
    expect(screen.getByTestId("prepared-prepared-date-input")).toHaveValue("");
    expect(screen.getByTestId("prepared-expiry-date-input")).toHaveValue("");
  });

  it("after prefilling, submit still goes through the existing onSubmit path (validation intact)", () => {
    const onSubmit = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={onSubmit}
        onClose={jest.fn()}
        recents={[baseRecent]}
      />
    );
    fireEvent.click(screen.getByTestId("prepare-solution-recent-item-0"));
    fireEvent.click(screen.getByTestId("prepare-solution-submit-btn"));
    // Submit carries the prefilled values — including operational ones.
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      concentration: "10% (v/v)",
      solvent: "Water",
      preparedBy: "A. Chen",
      preparedDate: "2026-04-16",
      expiryDate: "2026-10-16",
    });
  });

  // ── Tier 2 PR-2B: Saved presets ────────────────────────────

  const basePreset = {
    schemaVersion: 1,
    createdAt: "2026-04-16T10:00:00.000Z",
    parentCas: baseParent.cas_number, // 64-17-5
    parentNameEn: baseParent.name_en,
    parentNameZh: baseParent.name_zh,
    concentration: "10% (v/v)",
    solvent: "Water",
  };

  it("Save-as-preset button is rendered only when onSavePreset is provided", () => {
    const { rerender } = render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(
      screen.queryByTestId("prepare-solution-save-preset-btn")
    ).not.toBeInTheDocument();

    rerender(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
        onSavePreset={jest.fn()}
      />
    );
    expect(
      screen.getByTestId("prepare-solution-save-preset-btn")
    ).toBeInTheDocument();
  });

  it("Save-as-preset button is disabled until both required fields are filled", () => {
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
        onSavePreset={jest.fn()}
      />
    );
    const btn = screen.getByTestId("prepare-solution-save-preset-btn");
    expect(btn).toBeDisabled();

    fireEvent.change(screen.getByTestId("prepared-concentration-input"), {
      target: { value: "10%" },
    });
    expect(btn).toBeDisabled(); // solvent still blank

    fireEvent.change(screen.getByTestId("prepared-solvent-input"), {
      target: { value: "Water" },
    });
    expect(btn).not.toBeDisabled();
  });

  it("Save-as-preset calls onSavePreset with {concentration, solvent} only — no operational fields", () => {
    // Even if the user has filled in operational fields, the preset
    // payload must not carry them. buildPresetRecord is the second
    // line of defence; the modal is the first — assert it here.
    const onSavePreset = jest.fn();
    const onSubmit = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={onSubmit}
        onClose={jest.fn()}
        onSavePreset={onSavePreset}
      />
    );
    fireEvent.change(screen.getByTestId("prepared-concentration-input"), {
      target: { value: "  10% (v/v)  " },
    });
    fireEvent.change(screen.getByTestId("prepared-solvent-input"), {
      target: { value: "  Water  " },
    });
    fireEvent.change(screen.getByTestId("prepared-prepared-by-input"), {
      target: { value: "A. Chen" },
    });
    fireEvent.change(screen.getByTestId("prepared-prepared-date-input"), {
      target: { value: "2026-04-16" },
    });
    fireEvent.change(screen.getByTestId("prepared-expiry-date-input"), {
      target: { value: "2026-10-16" },
    });
    fireEvent.click(screen.getByTestId("prepare-solution-save-preset-btn"));
    expect(onSavePreset).toHaveBeenCalledTimes(1);
    expect(onSavePreset).toHaveBeenCalledWith({
      concentration: "10% (v/v)",
      solvent: "Water",
    });
    // Save is a non-submit action — onSubmit must NOT fire.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does NOT render the Saved-presets section when there are no presets", () => {
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
        presets={[]}
        onSavePreset={jest.fn()}
      />
    );
    expect(
      screen.queryByTestId("prepare-solution-preset-section")
    ).not.toBeInTheDocument();
  });

  it("does NOT render Saved-presets when no preset matches the current parent CAS", () => {
    const otherParent = { ...basePreset, parentCas: "67-56-1" };
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
        presets={[otherParent]}
        onSavePreset={jest.fn()}
      />
    );
    expect(
      screen.queryByTestId("prepare-solution-preset-section")
    ).not.toBeInTheDocument();
  });

  it("renders parent-scoped presets when available", () => {
    const otherParent = { ...basePreset, parentCas: "67-56-1" };
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
        presets={[otherParent, basePreset]}
        onSavePreset={jest.fn()}
      />
    );
    expect(
      screen.getByTestId("prepare-solution-preset-section")
    ).toBeInTheDocument();
    const list = screen.getByTestId("prepare-solution-preset-list");
    // Only 1 list item — the one whose parentCas matches the current parent.
    expect(list.querySelectorAll("li")).toHaveLength(1);
    expect(
      screen.getByTestId("prepare-solution-preset-item-0")
    ).toBeInTheDocument();
  });

  it("clicking a preset prefills concentration + solvent ONLY", () => {
    const onSubmit = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={onSubmit}
        onClose={jest.fn()}
        presets={[basePreset]}
        onSavePreset={jest.fn()}
      />
    );
    fireEvent.click(screen.getByTestId("prepare-solution-preset-item-0"));

    expect(screen.getByTestId("prepared-concentration-input")).toHaveValue(
      "10% (v/v)"
    );
    expect(screen.getByTestId("prepared-solvent-input")).toHaveValue("Water");
    // No auto-submit.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clicking a preset CLEARS preparedBy / preparedDate / expiryDate (no stale leak)", () => {
    // Central PR-2B behaviour: reusing a preset must never carry over
    // operational fields from a previous session — those could silently
    // apply the wrong date to a new label. This is the second line of
    // defence (first is buildPresetRecord not storing them at all).
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
        presets={[basePreset]}
        onSavePreset={jest.fn()}
      />
    );
    // Simulate the user having already typed operational values before
    // clicking a preset (e.g. they reopened the modal without closing
    // and switched to preset reuse).
    fireEvent.change(screen.getByTestId("prepared-prepared-by-input"), {
      target: { value: "STALE Chen" },
    });
    fireEvent.change(screen.getByTestId("prepared-prepared-date-input"), {
      target: { value: "2020-01-01" },
    });
    fireEvent.change(screen.getByTestId("prepared-expiry-date-input"), {
      target: { value: "2020-07-01" },
    });
    fireEvent.click(screen.getByTestId("prepare-solution-preset-item-0"));
    // All three operational inputs must now be blank.
    expect(screen.getByTestId("prepared-prepared-by-input")).toHaveValue("");
    expect(screen.getByTestId("prepared-prepared-date-input")).toHaveValue("");
    expect(screen.getByTestId("prepared-expiry-date-input")).toHaveValue("");
    // Recipe fields are the ones that got populated from the preset.
    expect(screen.getByTestId("prepared-concentration-input")).toHaveValue(
      "10% (v/v)"
    );
    expect(screen.getByTestId("prepared-solvent-input")).toHaveValue("Water");
  });

  it("after preset prefill, submit goes through the existing onSubmit path with CLEARED operational fields", () => {
    const onSubmit = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={onSubmit}
        onClose={jest.fn()}
        presets={[basePreset]}
        onSavePreset={jest.fn()}
      />
    );
    fireEvent.click(screen.getByTestId("prepare-solution-preset-item-0"));
    fireEvent.click(screen.getByTestId("prepare-solution-submit-btn"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      concentration: "10% (v/v)",
      solvent: "Water",
      preparedBy: "",
      preparedDate: "",
      expiryDate: "",
    });
  });

  // ── Tier 2 PR-3: derived display name in list entries ───────

  it("recent entry shows the derived display name ('X Y in Z') when parent name is present", () => {
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
        recents={[baseRecent]}
      />
    );
    expect(
      screen.getByTestId("prepare-solution-recent-item-0").textContent
    ).toContain("10% (v/v) Ethanol in Water");
  });

  it("recent entry falls back to 'concentration in solvent' when parentName is missing", () => {
    const noName = {
      ...baseRecent,
      parentNameEn: null,
      parentNameZh: null,
    };
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
        recents={[noName]}
      />
    );
    const txt = screen.getByTestId("prepare-solution-recent-item-0").textContent;
    // Helper fallback: "10% (v/v) in Water" (no solute name inserted).
    expect(txt).toContain("10% (v/v) in Water");
    expect(txt).not.toContain("Ethanol");
  });

  it("preset entry shows the derived display name when parent name is present", () => {
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
        presets={[basePreset]}
        onSavePreset={jest.fn()}
      />
    );
    expect(
      screen.getByTestId("prepare-solution-preset-item-0").textContent
    ).toContain("10% (v/v) Ethanol in Water");
  });
});
