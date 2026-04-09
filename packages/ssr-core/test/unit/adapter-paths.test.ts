import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { routes as bunRoutes } from "../../src/adapter/bun";
import { routes as elysiaRoutes } from "../../src/adapter/elysia";

const makeTempRoot = (): string => {
  const rootDir = mkdtempSync(join(tmpdir(), "ssr-elysia-"));
  mkdirSync(join(rootDir, "_ssr"), { recursive: true });
  return rootDir;
};

describe("adapter SSR paths", () => {
  test("bun adapter uses configured SSR path", () => {
    const routeMap = bunRoutes({ dev: true, basePath: "/docs", ssrPath: "/docs/_ssr" });

    expect(Object.keys(routeMap)).toEqual(
      expect.arrayContaining(["/docs/_ssr/*.js", "/docs/_ssr/_ping", "/docs/_ssr/_reload"]),
    );
  });

  test("bun adapter keeps the root SSR path by default", () => {
    const routeMap = bunRoutes({ dev: true, basePath: "", ssrPath: "/_ssr" });

    expect(Object.keys(routeMap)).toEqual(expect.arrayContaining(["/_ssr/*.js", "/_ssr/_ping", "/_ssr/_reload"]));
  });

  test("elysia adapter exposes dev endpoints under the configured SSR path", async () => {
    const rootDir = makeTempRoot();
    try {
      const app = elysiaRoutes({ dev: true, rootDir, basePath: "/docs", ssrPath: "/docs/_ssr" });
      const response = await app.fetch(new Request("http://localhost/docs/_ssr/_ping"));

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("ok");
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test("elysia adapter keeps the root SSR path by default", async () => {
    const rootDir = makeTempRoot();
    try {
      const app = elysiaRoutes({ dev: true, rootDir, basePath: "", ssrPath: "/_ssr" });
      const response = await app.fetch(new Request("http://localhost/_ssr/_ping"));

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("ok");
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });
});
