describe("workspaceDocuments", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete globalThis.__APP_WORKSPACE_SYNC_ENABLED__;
    sessionStorage.clear();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.dontMock("axios");
  });

  function loadModule() {
    const axios = {
      get: jest.fn(),
      put: jest.fn(),
    };
    jest.doMock("axios", () => ({
      __esModule: true,
      default: axios,
    }));

    return {
      axios,
      workspaceDocuments: require("../workspaceDocuments"),
    };
  }

  it("defaults to local-only mode and does not call the backend", async () => {
    delete process.env.VITE_ENABLE_WORKSPACE_SYNC;
    const { axios, workspaceDocuments } = loadModule();

    await expect(workspaceDocuments.fetchWorkspaceDocument("lab_profile")).resolves.toEqual({
      docType: "lab_profile",
      payload: null,
      updatedAt: null,
      localOnly: true,
    });
    await expect(
      workspaceDocuments.saveWorkspaceDocument("lab_profile", { organization: "Lab A" })
    ).resolves.toEqual({
      docType: "lab_profile",
      payload: { organization: "Lab A" },
      updatedAt: null,
      localOnly: true,
    });

    expect(workspaceDocuments.WORKSPACE_SYNC_ENABLED).toBe(false);
    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.put).not.toHaveBeenCalled();
  });

  it("uses the admin session key when explicit workspace sync is enabled", async () => {
    globalThis.__APP_WORKSPACE_SYNC_ENABLED__ = true;
    sessionStorage.setItem("ghs.pilotAdminKey", "secret");
    const { axios, workspaceDocuments } = loadModule();
    axios.get.mockResolvedValue({
      data: { docType: "lab_profile", payload: { organization: "Lab A" } },
    });
    axios.put.mockResolvedValue({
      data: { docType: "lab_profile", payload: { organization: "Lab B" } },
    });

    await expect(workspaceDocuments.fetchWorkspaceDocument("lab_profile")).resolves.toEqual({
      docType: "lab_profile",
      payload: { organization: "Lab A" },
    });
    await expect(
      workspaceDocuments.saveWorkspaceDocument("lab_profile", { organization: "Lab B" })
    ).resolves.toEqual({
      docType: "lab_profile",
      payload: { organization: "Lab B" },
    });

    expect(workspaceDocuments.WORKSPACE_SYNC_ENABLED).toBe(true);
    expect(axios.get).toHaveBeenCalledWith(expect.stringMatching(/\/api\/workspace\/lab_profile$/), {
      headers: { "x-ghs-admin-key": "secret" },
    });
    expect(axios.put).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/workspace\/lab_profile$/),
      { payload: { organization: "Lab B" } },
      { headers: { "x-ghs-admin-key": "secret" } }
    );
  });
});
