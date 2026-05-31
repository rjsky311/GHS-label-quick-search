import {
  readJsonStorage,
  removeStorageItem,
  writeJsonStorage,
} from "@/utils/localStorageJson";

describe("localStorageJson", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reads valid JSON from localStorage", () => {
    localStorage.setItem("test_key", JSON.stringify([{ ok: true }]));

    expect(readJsonStorage("test_key", [])).toEqual([{ ok: true }]);
  });

  it("removes malformed JSON and returns the fallback", () => {
    localStorage.setItem("test_key", "{broken");

    expect(readJsonStorage("test_key", [])).toEqual([]);
    expect(localStorage.getItem("test_key")).toBeNull();
  });

  it("removes JSON that does not pass validation", () => {
    localStorage.setItem("test_key", JSON.stringify({ ok: true }));

    expect(
      readJsonStorage("test_key", [], {
        validate: Array.isArray,
      })
    ).toEqual([]);
    expect(localStorage.getItem("test_key")).toBeNull();
  });

  it("returns fallback when storage access is blocked", () => {
    const originalStorage = global.localStorage;
    Object.defineProperty(global, "localStorage", {
      configurable: true,
      value: {
        getItem: () => {
          throw new Error("blocked");
        },
      },
    });

    try {
      expect(readJsonStorage("test_key", ["fallback"])).toEqual(["fallback"]);
    } finally {
      Object.defineProperty(global, "localStorage", {
        configurable: true,
        value: originalStorage,
      });
    }
  });

  it("writes and removes JSON safely", () => {
    expect(writeJsonStorage("test_key", { ok: true })).toBe(true);
    expect(JSON.parse(localStorage.getItem("test_key"))).toEqual({ ok: true });

    expect(removeStorageItem("test_key")).toBe(true);
    expect(localStorage.getItem("test_key")).toBeNull();
  });
});
