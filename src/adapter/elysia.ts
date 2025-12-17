import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { join } from "path";
import type { SsrConfig } from "../index";
// @ts-ignore - Bun text import
import devClientCode from "./client.js" with { type: "text" };

/**
 * Creates Elysia plugin with routes from SSR config.
 * Handles /_ssr/* routes for islands and dev tools using @elysiajs/static.
 *
 * @example
 * ```ts
 * import { Elysia } from "elysia";
 * import { staticPlugin } from "@elysiajs/static";
 * import { routes } from "@valentinkolb/ssr/elysia";
 * import { config, html } from "./config";
 *
 * new Elysia()
 *   .use(routes(config))
 *   .use(staticPlugin({ assets: "./public", prefix: "/public" }))
 *   .get("/", () => html(<Home />))
 *   .listen(3000);
 * ```
 */
export const routes = (config: SsrConfig) => {
  const { dev, autoRefresh } = config;

  const ssrDir = join(dev ? "." : Bun.main, "_ssr");

  return (
    new Elysia({ name: "ssr" })
      // Serve island chunks
      .use(
        staticPlugin({
          assets: ssrDir,
          prefix: "/_ssr",
          headers: {
            "Cache-Control": dev
              ? "no-cache"
              : "public, max-age=31536000, immutable",
          },
        }),
      )

      // Dev mode: SSE endpoint for live reload
      .get("/_ssr/_reload", () => {
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
      })

      // Dev mode: Ping endpoint for reconnection check
      .get("/_ssr/_ping", () => {
        if (!dev || !autoRefresh) {
          return new Response("Not found", { status: 404 });
        }
        return new Response("ok");
      })

      // Dev mode: Serve reload client script
      .get("/_ssr/_client.js", () => {
        if (!dev || !autoRefresh) {
          return new Response("Not found", { status: 404 });
        }
        return new Response(devClientCode, {
          headers: {
            "Content-Type": "application/javascript",
            "Cache-Control": "no-cache",
          },
        });
      })
  );
};
