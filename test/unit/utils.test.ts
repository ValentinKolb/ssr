import { describe, test, expect } from "bun:test";
import { safePath, getCacheHeaders } from "../../src/adapter/utils";

describe("safePath()", () => {
  const base = "/app/_ssr";

  test("should allow valid filenames", () => {
    expect(safePath(base, "chunk.js")).toBe("/app/_ssr/chunk.js");
    expect(safePath(base, "abc123.js")).toBe("/app/_ssr/abc123.js");
  });

  test("should block path traversal with ../", () => {
    expect(safePath(base, "../secret.txt")).toBeNull();
    expect(safePath(base, "../../etc/passwd")).toBeNull();
    expect(safePath(base, "../../../etc/passwd")).toBeNull();
  });

  test("should block path traversal with encoded sequences", () => {
    // resolve() handles these, but good to verify
    expect(safePath(base, "foo/../../../etc/passwd")).toBeNull();
  });

  test("should block absolute paths", () => {
    expect(safePath(base, "/etc/passwd")).toBeNull();
  });
});

describe("getCacheHeaders()", () => {
  test("should return no-cache in dev mode", () => {
    expect(getCacheHeaders(true)).toBe("no-cache");
  });

  test("should return immutable cache in prod mode", () => {
    expect(getCacheHeaders(false)).toBe("public, max-age=31536000, immutable");
  });
});
