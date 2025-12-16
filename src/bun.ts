import { join, dirname } from "path";
import type { SsrConfig } from "./index";
// @ts-ignore - Bun text import
import devClientCode from "./client.js" with { type: "text" };

type RouteHandler = (req: Request) => Response | Promise<Response>;
type Routes = Record<string, RouteHandler>;

/**
 * Creates routes for Bun.serve from SSR config.
 * Only handles /_ssr/* routes for islands and dev tools.
 * Static file serving should be handled by the user.
 *
 * @example
 * ```ts
 * import { routes } from "@valentinkolb/ssr/bun";
 * import { config, html } from "./config";
 *
 * serve({
 *   routes: {
 *     ...routes(config),
 *     "/": () => html(<Home />),
 *     // Handle static files yourself:
 *     "/public/*": (req) => {
 *       const path = new URL(req.url).pathname.replace("/public/", "");
 *       return new Response(Bun.file(`./public/${path}`));
 *     },
 *   },
 * });
 * ```
 */
export const routes = (config: SsrConfig): Routes => {
  const { dev, autoRefresh } = config;

  return {
    // Dev mode: SSE endpoint for live reload
    "/_ssr/_reload": () => {
      if (!dev || !autoRefresh) {
        return new Response("Not found", { status: 404 });
      }
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(": connected\n\n"));
            const interval = setInterval(() => {
              try {
                controller.enqueue(new TextEncoder().encode(": ping\n\n"));
              } catch {
                clearInterval(interval);
              }
            }, 5000);
          },
        }),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        },
      );
    },

    // Dev mode: Ping endpoint for reconnection check
    "/_ssr/_ping": () => {
      if (!dev || !autoRefresh) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("ok");
    },

    // Dev mode: Serve reload client script
    "/_ssr/_client.js": () => {
      if (!dev || !autoRefresh) {
        return new Response("Not found", { status: 404 });
      }
      return new Response(devClientCode, {
        headers: {
          "Content-Type": "application/javascript",
          "Cache-Control": "no-cache",
        },
      });
    },

    // Serve islands
    "/_ssr/*.js": async (req) => {
      const filename = new URL(req.url).pathname.split("/").pop()!;

      const file = Bun.file(join(dev ? "." : Bun.main, "_ssr", filename));

      if (!(await file.exists())) {
        return new Response("Not found", { status: 404 });
      }

      return new Response(file, {
        headers: {
          "Content-Type": file.type,
          "Cache-Control": dev
            ? "no-cache"
            : "public, max-age=31536000, immutable",
        },
      });
    },
  };
};
