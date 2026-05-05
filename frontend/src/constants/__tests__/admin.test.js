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

  it("builds admin headers only when a session key exists", () => {
    const { buildPilotAdminHeaders, persistPilotAdminKey } = require("../admin");

    expect(buildPilotAdminHeaders("")).toEqual({});

    persistPilotAdminKey(" secret ");
    expect(buildPilotAdminHeaders(sessionStorage.getItem("ghs.pilotAdminKey"))).toEqual({
      "x-ghs-admin-key": "secret",
    });
  });
});
