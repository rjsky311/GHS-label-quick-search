import { renderHook, act } from "@testing-library/react";
import usePreparedPresets, {
  MAX_PREPARED_PRESETS,
} from "../usePreparedPresets";

const PRESETS_KEY = "ghs_prepared_presets";

const makePreset = (overrides = {}) => ({
  schemaVersion: 1,
  createdAt: "2026-04-16T10:00:00.000Z",
  parentCas: "64-17-5",
  parentNameEn: "Ethanol",
  parentNameZh: "乙醇",
  concentration: "10%",
  solvent: "Water",
  ...overrides,
});

describe("usePreparedPresets", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty when localStorage is empty", () => {
    const { result } = renderHook(() => usePreparedPresets());
    expect(result.current.presets).toEqual([]);
  });

  it("hydrates from localStorage on mount", () => {
    const saved = [makePreset({ concentration: "20%" })];
    localStorage.setItem(PRESETS_KEY, JSON.stringify(saved));
    const { result } = renderHook(() => usePreparedPresets());
    expect(result.current.presets).toEqual(saved);
  });

  it("tolerates garbage in localStorage (returns [])", () => {
    localStorage.setItem(PRESETS_KEY, "{not valid json[");
    const { result } = renderHook(() => usePreparedPresets());
    expect(result.current.presets).toEqual([]);
  });

  it("filters out entries with unknown schemaVersion on load", () => {
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([
        makePreset({ concentration: "keep-me" }),
        { schemaVersion: 99, concentration: "drop-me" },
        { parentCas: "64-17-5", concentration: "also-drop" },
      ])
    );
    const { result } = renderHook(() => usePreparedPresets());
    expect(result.current.presets).toHaveLength(1);
    expect(result.current.presets[0].concentration).toBe("keep-me");
  });

  it("addPreset prepends a new record and persists it", () => {
    const { result } = renderHook(() => usePreparedPresets());
    act(() => {
      result.current.addPreset(makePreset({ concentration: "1 N" }));
    });
    expect(result.current.presets).toHaveLength(1);
    expect(result.current.presets[0].concentration).toBe("1 N");
    const persisted = JSON.parse(localStorage.getItem(PRESETS_KEY));
    expect(persisted).toHaveLength(1);
    expect(persisted[0].concentration).toBe("1 N");
  });

  it("addPreset dedupes by (parentCas, concentration, solvent) and bubbles to top", () => {
    const { result } = renderHook(() => usePreparedPresets());
    act(() => {
      result.current.addPreset(makePreset({ concentration: "A" }));
    });
    act(() => {
      result.current.addPreset(makePreset({ concentration: "B" }));
    });
    act(() => {
      // Same recipe inputs as "A" (different createdAt) → REPLACE, not add.
      result.current.addPreset(
        makePreset({ concentration: "A", createdAt: "later" })
      );
    });
    expect(result.current.presets).toHaveLength(2);
    expect(result.current.presets[0].concentration).toBe("A");
    expect(result.current.presets[0].createdAt).toBe("later");
    expect(result.current.presets[1].concentration).toBe("B");
  });

  it("dedup ignores preset name and keeps the latest saved label", () => {
    const { result } = renderHook(() => usePreparedPresets());
    act(() => {
      result.current.addPreset(
        makePreset({ concentration: "A", name: "First name" })
      );
    });
    act(() => {
      result.current.addPreset(
        makePreset({
          concentration: "A",
          createdAt: "later",
          name: "Second name",
        })
      );
    });

    expect(result.current.presets).toHaveLength(1);
    expect(result.current.presets[0].name).toBe("Second name");
    expect(result.current.presets[0].createdAt).toBe("later");
  });

  it("caps the list at MAX_PREPARED_PRESETS", () => {
    const { result } = renderHook(() => usePreparedPresets());
    act(() => {
      for (let i = 0; i < MAX_PREPARED_PRESETS + 3; i += 1) {
        result.current.addPreset(makePreset({ concentration: `C${i}` }));
      }
    });
    expect(result.current.presets).toHaveLength(MAX_PREPARED_PRESETS);
    expect(result.current.presets[0].concentration).toBe(
      `C${MAX_PREPARED_PRESETS + 3 - 1}`
    );
  });

  it("rejects records missing parentCas / concentration / solvent", () => {
    const { result } = renderHook(() => usePreparedPresets());
    act(() => {
      result.current.addPreset(makePreset({ parentCas: null }));
      result.current.addPreset(makePreset({ concentration: "" }));
      result.current.addPreset(makePreset({ solvent: null }));
      result.current.addPreset(null);
      result.current.addPreset(undefined);
    });
    expect(result.current.presets).toEqual([]);
  });

  it("stores NO operational fields and NO hazard data on the preset record", () => {
    // Core PR-2B trust-boundary assertion: presets are recipe-only.
    // Operational fields (preparedBy / preparedDate / expiryDate) are
    // intentionally absent so stale session data can't leak onto a
    // future label. Hazard data is absent for the same reason recents
    // don't carry it.
    const { result } = renderHook(() => usePreparedPresets());
    act(() => {
      result.current.addPreset(makePreset());
    });
    const stored = result.current.presets[0];
    // Operational fields must NOT be on the record
    expect(stored).not.toHaveProperty("preparedBy");
    expect(stored).not.toHaveProperty("preparedDate");
    expect(stored).not.toHaveProperty("expiryDate");
    // Hazard / classification must NOT be on the record
    expect(stored).not.toHaveProperty("ghs_pictograms");
    expect(stored).not.toHaveProperty("hazard_statements");
    expect(stored).not.toHaveProperty("precautionary_statements");
    expect(stored).not.toHaveProperty("signal_word");
    expect(stored).not.toHaveProperty("signal_word_zh");
  });

  it("isolation: does not write to other localStorage keys", () => {
    localStorage.setItem("ghs_favorites", '[{"sentinel":"fav"}]');
    localStorage.setItem("ghs_search_history", '[{"sentinel":"hist"}]');
    localStorage.setItem("ghs_print_templates", '[{"sentinel":"tpl"}]');
    localStorage.setItem("ghs_prepared_recents", '[{"sentinel":"rec"}]');

    const { result } = renderHook(() => usePreparedPresets());
    act(() => {
      result.current.addPreset(makePreset());
    });

    expect(localStorage.getItem("ghs_favorites")).toBe('[{"sentinel":"fav"}]');
    expect(localStorage.getItem("ghs_search_history")).toBe(
      '[{"sentinel":"hist"}]'
    );
    expect(localStorage.getItem("ghs_print_templates")).toBe(
      '[{"sentinel":"tpl"}]'
    );
    expect(localStorage.getItem("ghs_prepared_recents")).toBe(
      '[{"sentinel":"rec"}]'
    );
    const stored = JSON.parse(localStorage.getItem(PRESETS_KEY));
    expect(stored).toHaveLength(1);
  });
});
