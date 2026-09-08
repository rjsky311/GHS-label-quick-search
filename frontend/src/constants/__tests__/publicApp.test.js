import {
  CANONICAL_PUBLIC_APP_URL,
  resolvePublicAppUrl,
} from "@/constants/publicApp";

describe("resolvePublicAppUrl", () => {
  it("normalizes a configured first-party origin", () => {
    expect(resolvePublicAppUrl("https://ghs.yuchelab.com/path/")).toBe(
      CANONICAL_PUBLIC_APP_URL,
    );
  });

  it("allows an explicit local development origin", () => {
    expect(resolvePublicAppUrl("http://localhost:5173/")).toBe(
      "http://localhost:5173",
    );
  });

  it.each([
    "javascript:alert(1)",
    "https://user:password@evil.example",
    "not a url",
    "",
  ])("falls back to the canonical origin for %s", (value) => {
    expect(resolvePublicAppUrl(value)).toBe(CANONICAL_PUBLIC_APP_URL);
  });
});
