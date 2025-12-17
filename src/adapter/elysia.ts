// Elysia adapter for SSR
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
  const { dev, autoRefresh } = config;
  const ssrDir = getSsrDir(dev);

  return new Elysia({ name: "ssr" })
    .use(
      staticPlugin({
        assets: ssrDir,
        prefix: "/_ssr",
        headers: { "Cache-Control": getCacheHeaders(dev) },
      }),
    )
    .get("/_ssr/_reload", () =>
      dev && autoRefresh ? createReloadResponse() : notFound(),
    )
    .get("/_ssr/_ping", () =>
      dev && autoRefresh ? new Response("ok") : notFound(),
    )
    .get("/_ssr/_client.js", () =>
      dev && autoRefresh ? createClientResponse() : notFound(),
    );
};
