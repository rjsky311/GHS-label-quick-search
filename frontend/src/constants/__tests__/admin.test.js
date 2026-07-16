describe("admin constants", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete globalThis.__APP_PILOT_ADMIN_ENABLED__;
    sessionStorage.clear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("reads the Vite build-time pilot admin flag when present", () => {
    process.env.VITE_ENABLE_PILOT_ADMIN = "";
    globalThis.__APP_PILOT_ADMIN_ENABLED__ = true;

    const { PILOT_ADMIN_ENABLED } = require("../admin");

    expect(PILOT_ADMIN_ENABLED).toBe(true);
  });

  it("falls back to process env in tests and non-Vite runtimes", () => {
    process.env.VITE_ENABLE_PILOT_ADMIN = "true";

    const { PILOT_ADMIN_ENABLED } = require("../admin");

    expect(PILOT_ADMIN_ENABLED).toBe(true);
  });

  it("builds admin headers from an explicit in-memory key without persisting it", () => {
    const { buildPilotAdminHeaders } = require("../admin");

    expect(buildPilotAdminHeaders("")).toEqual({});
    expect(buildPilotAdminHeaders(" secret ")).toEqual({
      "x-ghs-admin-key": "secret",
    });
    expect(sessionStorage.getItem("ghs.pilotAdminKey")).toBeNull();
  });
});
