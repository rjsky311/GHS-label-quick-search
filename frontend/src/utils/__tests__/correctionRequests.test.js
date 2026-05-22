import axios from "axios";
import {
  normalizeCorrectionRequestPayload,
  submitCorrectionRequest,
} from "@/utils/correctionRequests";

jest.mock("axios");

describe("correctionRequests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("normalizes empty optional fields before submit", () => {
    expect(
      normalizeCorrectionRequestPayload({
        issue_type: " missing-chinese-name ",
        cas_number: " 107-18-6 ",
        chemical_name: "",
        candidate: null,
      }),
    ).toMatchObject({
      issue_type: "missing-chinese-name",
      cas_number: "107-18-6",
      chemical_name: undefined,
      candidate: {},
      source: "public-in-app",
    });
  });

  it("posts correction requests to the backend API", async () => {
    axios.post.mockResolvedValueOnce({ data: { ok: true } });

    await expect(
      submitCorrectionRequest({
        issue_type: "missing-chinese-name",
        cas_number: "107-18-6",
      }),
    ).resolves.toEqual({ ok: true });

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/dictionary\/correction-requests$/),
      expect.objectContaining({
        issue_type: "missing-chinese-name",
        cas_number: "107-18-6",
        source: "public-in-app",
      }),
    );
  });
});
