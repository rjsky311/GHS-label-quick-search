describe("workspaceDocuments", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete globalThis.__APP_WORKSPACE_SYNC_ENABLED__;
    delete globalThis.__APP_DICTIONARY_MISS_CAPTURE_ENABLED__;
    sessionStorage.clear();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.dontMock("axios");
  });

  function loadModule() {
    const axios = {
      get: jest.fn(),
      post: jest.fn(),
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

  it("keeps dictionary miss capture disabled unless explicitly enabled", async () => {
    const { axios, workspaceDocuments } = loadModule();

    await expect(
      workspaceDocuments.recordDictionaryMissQuery({
        query: "mystery solvent",
        context: { source: "frontend" },
      })
    ).resolves.toBeNull();

    expect(workspaceDocuments.DICTIONARY_MISS_CAPTURE_ENABLED).toBe(false);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("sanitizes dictionary miss payloads before posting when capture is enabled", async () => {
    process.env.VITE_ENABLE_DICTIONARY_MISS_CAPTURE = "true";
    const { axios, workspaceDocuments } = loadModule();
    axios.post.mockResolvedValue({ data: { captured: true } });

    await expect(
      workspaceDocuments.recordDictionaryMissQuery({
        query: "x".repeat(200),
        queryKind: "batch",
        endpoint: "frontend-search",
        context: {
          locale: "zh-TW",
          normalizedCas: "64-17-5",
          resultCount: 0,
          searchMode: "batch",
          source: "frontend",
          email: "user@example.test",
          nested: { freeform: true },
        },
      })
    ).resolves.toEqual({ captured: true });

    expect(workspaceDocuments.DICTIONARY_MISS_CAPTURE_ENABLED).toBe(true);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/dictionary\/miss-query$/),
      {
        query: "x".repeat(workspaceDocuments.MAX_DICTIONARY_MISS_QUERY_LENGTH),
        query_kind: "batch",
        endpoint: "frontend-search",
        context: {
          locale: "zh-TW",
          normalizedCas: "64-17-5",
          resultCount: 0,
          searchMode: "batch",
          source: "frontend",
        },
      }
    );
  });
});
