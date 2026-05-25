import {
  getRequiredPrintImageKind,
  waitForRequiredPrintImages,
} from "../printImagePreflight";

describe("printImagePreflight", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("detects required GHS and QR images", () => {
    const ghs = document.createElement("img");
    ghs.alt = "GHS02";
    const qr = document.createElement("img");
    qr.className = "qrcode-img";
    const ordinary = document.createElement("img");
    ordinary.alt = "Logo";

    expect(getRequiredPrintImageKind(ghs)).toBe("ghs-pictogram");
    expect(getRequiredPrintImageKind(qr)).toBe("qr-code");
    expect(getRequiredPrintImageKind(ordinary)).toBe("");
  });

  it("continues immediately when there are no images", () => {
    const onReady = jest.fn();

    waitForRequiredPrintImages([], onReady);

    expect(onReady).toHaveBeenCalledWith([]);
  });

  it("reports required image load failures", () => {
    const onReady = jest.fn();
    const img = document.createElement("img");
    img.alt = "GHS05";
    img.src = "https://example.com/GHS05.svg";

    waitForRequiredPrintImages([img], onReady);
    img.onerror();

    expect(onReady).toHaveBeenCalledWith([
      expect.objectContaining({
        type: "required-image-failed",
        imageKind: "ghs-pictogram",
        alt: "GHS05",
        reason: "load-error",
      }),
    ]);
  });

  it("ignores failures for non-required images", () => {
    const onReady = jest.fn();
    const img = document.createElement("img");
    img.alt = "Decorative";
    img.src = "https://example.com/decorative.png";

    waitForRequiredPrintImages([img], onReady);
    img.onerror();

    expect(onReady).toHaveBeenCalledWith([]);
  });

  it("turns stalled required images into timeout failures", () => {
    jest.useFakeTimers();
    const onReady = jest.fn();
    const img = document.createElement("img");
    img.alt = "QR code";
    img.src = "https://example.com/qr.png";

    waitForRequiredPrintImages([img], onReady, 250);
    jest.advanceTimersByTime(250);

    expect(onReady).toHaveBeenCalledWith([
      expect.objectContaining({
        type: "required-image-failed",
        imageKind: "qr-code",
        reason: "load-timeout",
      }),
    ]);
  });
});
