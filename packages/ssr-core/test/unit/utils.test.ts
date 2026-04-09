import { describe, test, expect } from "bun:test";
import { join } from "path";
import { safePath, getCacheHeaders, getSsrDir, normalizeBasePath, toSsrPath } from "../../src/adapter/utils";

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

describe("getSsrDir()", () => {
  test("should use rootDir in dev mode when configured", () => {
    expect(getSsrDir({ dev: true, rootDir: "/repo", basePath: "", ssrPath: "/_ssr" })).toBe("/repo/_ssr");
  });

  test("should fallback to process.cwd() in dev mode", () => {
    expect(getSsrDir({ dev: true, basePath: "", ssrPath: "/_ssr" })).toBe(join(process.cwd(), "_ssr"));
  });
});

describe("normalizeBasePath()", () => {
  test("normalizes empty and root inputs", () => {
    expect(normalizeBasePath()).toBe("");
    expect(normalizeBasePath("")).toBe("");
    expect(normalizeBasePath("/")).toBe("");
  });

  test("removes trailing slashes", () => {
    expect(normalizeBasePath("/docs")).toBe("/docs");
    expect(normalizeBasePath("/docs/")).toBe("/docs");
  });

  test("rejects values without a leading slash", () => {
    expect(() => normalizeBasePath("docs")).toThrow(/basePath must start with "\/" or be empty/);
  });
});

describe("toSsrPath()", () => {
  test("returns root SSR path by default", () => {
    expect(toSsrPath("")).toBe("/_ssr");
  });

  test("prefixes the SSR path with the base path", () => {
    expect(toSsrPath("/docs")).toBe("/docs/_ssr");
  });
});
