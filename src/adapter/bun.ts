// Bun.serve() adapter for SSR
import type { SsrConfig } from "../index";
import {
  getSsrDir,
  getCacheHeaders,
  createClientResponse,
  createReloadResponse,
  notFound,
  safePath,
} from "./utils";

type RouteHandler = (req: Request) => Response | Promise<Response>;
type Routes = Record<string, RouteHandler>;

/**
 * Creates routes for Bun.serve from SSR config.
 *
 * @example
 * ```ts
 * import { routes } from "@valentinkolb/ssr/adapter/bun";
 * serve({
 *   routes: {
 *     ...routes(config),
 *     "/": () => html(<Home />),
 *   },
 * });
 * ```
 */
export const routes = (config: SsrConfig): Routes => {
  const { dev, autoRefresh } = config;
  const ssrDir = getSsrDir(dev);

  const devRoutes: Routes =
    dev && autoRefresh
      ? {
          "/_ssr/_reload": () => createReloadResponse(),
          "/_ssr/_ping": () => new Response("ok"),
          "/_ssr/_client.js": () => createClientResponse(),
        }
      : {};

  return {
    ...devRoutes,

    "/_ssr/*.js": async (req) => {
      const filename = new URL(req.url).pathname.split("/").pop()!;
      const path = safePath(ssrDir, filename);
      if (!path) return notFound();
      const file = Bun.file(path);
      if (!(await file.exists())) return notFound();
      return new Response(file, {
        headers: {
          "Content-Type": file.type,
          "Cache-Control": getCacheHeaders(dev),
        },
      });
    },
  };
};
