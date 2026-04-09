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
  const { dev, ssrPath } = config;
  const ssrDir = getSsrDir(config);

  return new Elysia({ name: "ssr" })
    .use(
      staticPlugin({
        assets: ssrDir,
        prefix: ssrPath,
        headers: { "Cache-Control": getCacheHeaders(dev) },
      }),
    )
    .get(`${ssrPath}/_reload`, () => (dev ? createReloadResponse() : notFound()))
    .get(`${ssrPath}/_ping`, () => (dev ? new Response("ok") : notFound()));
};
