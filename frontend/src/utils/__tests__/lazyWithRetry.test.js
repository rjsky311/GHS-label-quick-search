import {
  isTransientModuleLoadError,
  retryDynamicImport,
} from "../lazyWithRetry";

describe("lazyWithRetry", () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("retries transient dynamic import failures", async () => {
    const loader = jest
      .fn()
      .mockRejectedValueOnce(
        new TypeError(
          "Failed to fetch dynamically imported module: https://example.test/assets/ResultsTable.js",
        ),
      )
      .mockResolvedValueOnce({ default: () => null });

    await expect(
      retryDynamicImport(loader, {
        retries: 2,
        baseDelayMs: 0,
        chunkName: "ResultsTable",
      }),
    ).resolves.toEqual({ default: expect.any(Function) });
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-module errors", async () => {
    const loader = jest.fn().mockRejectedValue(new Error("render failed"));

    await expect(
      retryDynamicImport(loader, {
        retries: 2,
        baseDelayMs: 0,
      }),
    ).rejects.toThrow("render failed");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("recognizes common transient module-load errors", () => {
    expect(
      isTransientModuleLoadError(
        new Error("Importing a module script failed."),
      ),
    ).toBe(true);
    expect(isTransientModuleLoadError(new Error("plain component error"))).toBe(
      false,
    );
  });
});
