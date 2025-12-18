/**
 * Elysia adapter - provides Elysia plugin with SSR routes.
 * Uses staticPlugin for serving island chunks.
 */
import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import type { SsrConfig } from "../index";
import {
  getSsrDir,
  getCacheHeaders,
  createClientResponse,
  createReloadResponse,
  notFound,
} from "./utils";

/**
 * Creates Elysia plugin with SSR routes.
 *
 * @example
 * ```ts
 * import { routes } from "@valentinkolb/ssr/adapter/elysia";
 * new Elysia()
 *   .use(routes(config))
 *   .get("/", () => html(<Home />))
 *   .listen(3000);
 * ```
 */
export const routes = (config: SsrConfig) => {
  const { dev } = config;
  const ssrDir = getSsrDir(dev);

  return new Elysia({ name: "ssr" })
    .use(
      staticPlugin({
        assets: ssrDir,
        prefix: "/_ssr",
        headers: { "Cache-Control": getCacheHeaders(dev) },
      }),
    )
    .get("/_ssr/_reload", () => (dev ? createReloadResponse() : notFound()))
    .get("/_ssr/_ping", () => (dev ? new Response("ok") : notFound()))
    .get("/_ssr/_client.js", () => (dev ? createClientResponse() : notFound()));
};
