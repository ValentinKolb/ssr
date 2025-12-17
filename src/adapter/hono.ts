// Hono adapter for SSR
import { Hono } from "hono";
import type { SsrConfig } from "../index";
import {
  getSsrDir,
  getCacheHeaders,
  createClientResponse,
  createReloadResponse,
  safePath,
} from "./utils";

/**
 * Creates Hono app with SSR routes.
 *
 * @example
 * ```ts
 * import { routes } from "@valentinkolb/ssr/adapter/hono";
 * const app = new Hono()
 *   .route("/_ssr", routes(config))
 *   .get("/", () => html(<Home />));
 * ```
 */
export const routes = (config: SsrConfig) => {
  const { dev, autoRefresh } = config;
  const ssrDir = getSsrDir(dev);

  const app = new Hono();

  // Dev mode endpoints
  if (dev && autoRefresh) {
    app.get("/_client.js", () => createClientResponse());
    app.get("/_reload", () => createReloadResponse());
    app.get("/_ping", (c) => c.text("ok"));
  }

  // Serve island chunks
  app.get("/:filename{.+\\.js$}", async (c) => {
    const path = safePath(ssrDir, c.req.param("filename"));
    if (!path) return c.notFound();
    const file = Bun.file(path);
    if (!(await file.exists())) return c.notFound();
    return c.body(await file.arrayBuffer(), {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": getCacheHeaders(dev),
      },
    });
  });

  return app;
};
