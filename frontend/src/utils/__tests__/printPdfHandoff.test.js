import { handoffPdfBlob } from "@/utils/printPdfExport";

const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36";

const setEnvironment = ({ coarsePointer, userAgent }) => {
  window.matchMedia = jest.fn((query) => ({
    matches: query === "(pointer: coarse)" && coarsePointer,
  }));
  jest.spyOn(window.navigator, "userAgent", "get").mockReturnValue(userAgent);
};

const pdfBlob = () => new Blob(["%PDF-"], { type: "application/pdf" });
const sharingNavigator = (share = jest.fn(async () => {})) => ({
  canShare: jest.fn(() => true),
  share,
});

describe("handoffPdfBlob", () => {
  const originalMatchMedia = window.matchMedia;
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let anchorClick;

  beforeEach(() => {
    URL.createObjectURL = jest.fn(() => "blob:label");
    URL.revokeObjectURL = jest.fn();
    anchorClick = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    window.matchMedia = originalMatchMedia;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it("downloads on a desktop even when the browser can share files", async () => {
    setEnvironment({ coarsePointer: false, userAgent: DESKTOP_UA });
    const navigatorObj = sharingNavigator();

    const method = await handoffPdfBlob(pdfBlob(), "labels.pdf", { navigatorObj });

    expect(method).toBe("download");
    expect(navigatorObj.share).not.toHaveBeenCalled();
    expect(anchorClick).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a coarse pointer", { coarsePointer: true, userAgent: DESKTOP_UA }],
    ["a phone user agent", { coarsePointer: false, userAgent: ANDROID_UA }],
  ])("opens the share sheet with %s", async (_name, environment) => {
    setEnvironment(environment);
    const navigatorObj = sharingNavigator();

    const method = await handoffPdfBlob(pdfBlob(), "labels.pdf", { navigatorObj });

    expect(method).toBe("share");
    expect(navigatorObj.share).toHaveBeenCalledTimes(1);
    expect(anchorClick).not.toHaveBeenCalled();
  });

  it("falls back to a download when a phone cancels the share sheet", async () => {
    setEnvironment({ coarsePointer: true, userAgent: ANDROID_UA });
    const navigatorObj = sharingNavigator(
      jest.fn(async () => {
        throw new Error("AbortError");
      }),
    );

    const method = await handoffPdfBlob(pdfBlob(), "labels.pdf", { navigatorObj });

    expect(method).toBe("download");
    expect(anchorClick).toHaveBeenCalledTimes(1);
  });

  it("downloads on a phone whose browser cannot share files", async () => {
    setEnvironment({ coarsePointer: true, userAgent: ANDROID_UA });

    const method = await handoffPdfBlob(pdfBlob(), "labels.pdf", {
      navigatorObj: {},
    });

    expect(method).toBe("download");
    expect(anchorClick).toHaveBeenCalledTimes(1);
  });
});
