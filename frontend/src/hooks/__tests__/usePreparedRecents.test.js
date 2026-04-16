import { renderHook, act } from "@testing-library/react";
import usePreparedRecents, {
  MAX_PREPARED_RECENTS,
} from "../usePreparedRecents";

const RECENTS_KEY = "ghs_prepared_recents";

const makeRecord = (overrides = {}) => ({
  schemaVersion: 1,
  createdAt: "2026-04-16T10:00:00.000Z",
  parentCas: "64-17-5",
  parentNameEn: "Ethanol",
  parentNameZh: "乙醇",
  concentration: "10%",
  solvent: "Water",
  preparedBy: null,
  preparedDate: null,
  expiryDate: null,
  ...overrides,
});

describe("usePreparedRecents", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty when localStorage is empty", () => {
    const { result } = renderHook(() => usePreparedRecents());
    expect(result.current.recents).toEqual([]);
  });

  it("hydrates from localStorage on mount (lazy init)", () => {
    const saved = [makeRecord({ concentration: "20%" })];
    localStorage.setItem(RECENTS_KEY, JSON.stringify(saved));
    const { result } = renderHook(() => usePreparedRecents());
    expect(result.current.recents).toEqual(saved);
  });

  it("tolerates garbage in localStorage (returns [])", () => {
    localStorage.setItem(RECENTS_KEY, "{not valid json[");
    const { result } = renderHook(() => usePreparedRecents());
    expect(result.current.recents).toEqual([]);
  });

  it("filters out entries that don't match current schemaVersion on load", () => {
    // One valid v1 entry plus two future-or-missing-version entries.
    // Strict filtering today means we won't surface partially-shaped
    // entries from a future writer we don't understand.
    localStorage.setItem(
      RECENTS_KEY,
      JSON.stringify([
        makeRecord({ concentration: "keep-me" }),
        { schemaVersion: 99, concentration: "drop-me" },
        { parentCas: "64-17-5", concentration: "drop-me-too" }, // no version
      ])
    );
    const { result } = renderHook(() => usePreparedRecents());
    expect(result.current.recents).toHaveLength(1);
    expect(result.current.recents[0].concentration).toBe("keep-me");
  });

  it("addRecent prepends a new record and persists it", () => {
    const { result } = renderHook(() => usePreparedRecents());
    act(() => {
      result.current.addRecent(makeRecord({ concentration: "1 N" }));
    });
    expect(result.current.recents).toHaveLength(1);
    expect(result.current.recents[0].concentration).toBe("1 N");
    const persisted = JSON.parse(localStorage.getItem(RECENTS_KEY));
    expect(persisted).toHaveLength(1);
    expect(persisted[0].concentration).toBe("1 N");
  });

  it("addRecent dedupes by workflow key and bubbles duplicates to the top", () => {
    const { result } = renderHook(() => usePreparedRecents());
    act(() => {
      result.current.addRecent(makeRecord({ concentration: "A" }));
    });
    act(() => {
      result.current.addRecent(makeRecord({ concentration: "B" }));
    });
    act(() => {
      // Same workflow inputs as "A" → should REPLACE, not add a 3rd.
      result.current.addRecent(
        makeRecord({ concentration: "A", createdAt: "later" })
      );
    });
    expect(result.current.recents).toHaveLength(2);
    // The refreshed "A" bubbled to the top
    expect(result.current.recents[0].concentration).toBe("A");
    expect(result.current.recents[0].createdAt).toBe("later");
    expect(result.current.recents[1].concentration).toBe("B");
  });

  it("addRecent treats operational fields as part of the dedup key", () => {
    // Same required fields but different preparedBy → NOT a duplicate.
    const { result } = renderHook(() => usePreparedRecents());
    act(() => {
      result.current.addRecent(makeRecord({ preparedBy: "A. Chen" }));
    });
    act(() => {
      result.current.addRecent(makeRecord({ preparedBy: "B. Liu" }));
    });
    expect(result.current.recents).toHaveLength(2);
  });

  it("caps the list at MAX_PREPARED_RECENTS", () => {
    const { result } = renderHook(() => usePreparedRecents());
    act(() => {
      for (let i = 0; i < MAX_PREPARED_RECENTS + 5; i += 1) {
        result.current.addRecent(
          makeRecord({ concentration: `C${i}` }) // distinct dedup keys
        );
      }
    });
    expect(result.current.recents).toHaveLength(MAX_PREPARED_RECENTS);
    // Newest-first: the most recently added should be on top.
    expect(result.current.recents[0].concentration).toBe(
      `C${MAX_PREPARED_RECENTS + 5 - 1}`
    );
  });

  it("rejects records missing parentCas / concentration / solvent", () => {
    const { result } = renderHook(() => usePreparedRecents());
    act(() => {
      // missing parentCas
      result.current.addRecent(makeRecord({ parentCas: null }));
      // missing concentration
      result.current.addRecent(makeRecord({ concentration: "" }));
      // missing solvent
      result.current.addRecent(makeRecord({ solvent: null }));
      // null record
      result.current.addRecent(null);
      // undefined record
      result.current.addRecent(undefined);
    });
    expect(result.current.recents).toEqual([]);
  });

  it("stores no GHS / hazard / classification fields on the recent record", () => {
    // This is the core trust-boundary assertion: recents must never
    // carry pictograms / hazard_statements / precautionary_statements /
    // signal_word. If a future caller tries to pass that data in via
    // the hook, this test won't catch it directly — the safety lives
    // in `buildRecentRecord`. But we still pin the happy-path shape
    // here so regression of that guard gets noticed too.
    const { result } = renderHook(() => usePreparedRecents());
    act(() => {
      result.current.addRecent(makeRecord());
    });
    const stored = result.current.recents[0];
    expect(stored).not.toHaveProperty("ghs_pictograms");
    expect(stored).not.toHaveProperty("hazard_statements");
    expect(stored).not.toHaveProperty("precautionary_statements");
    expect(stored).not.toHaveProperty("signal_word");
    expect(stored).not.toHaveProperty("signal_word_zh");
  });

  it("isolation: does not write to other localStorage keys", () => {
    // Seed the other two "prepared-flow-adjacent" stores with sentinel
    // values. addRecent must NOT touch them.
    localStorage.setItem("ghs_favorites", '[{"sentinel":"fav"}]');
    localStorage.setItem("ghs_search_history", '[{"sentinel":"hist"}]');
    localStorage.setItem("ghs_print_templates", '[{"sentinel":"tpl"}]');

    const { result } = renderHook(() => usePreparedRecents());
    act(() => {
      result.current.addRecent(makeRecord());
    });

    expect(localStorage.getItem("ghs_favorites")).toBe('[{"sentinel":"fav"}]');
    expect(localStorage.getItem("ghs_search_history")).toBe(
      '[{"sentinel":"hist"}]'
    );
    expect(localStorage.getItem("ghs_print_templates")).toBe(
      '[{"sentinel":"tpl"}]'
    );
    // And the recent store is our own key.
    const stored = JSON.parse(localStorage.getItem(RECENTS_KEY));
    expect(stored).toHaveLength(1);
  });
});
