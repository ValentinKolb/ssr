import { Hono } from "hono";
import { dirname, join } from "path";
import type { SsrConfig } from "../index";
// @ts-ignore - Bun text import
import devClientCode from "./client.js" with { type: "text" };

/**
 * Creates Hono app with SSR routes.
 * Handles /_ssr/* routes for islands and dev tools.
 *
 * @example
 * ```ts
 * import { Hono } from "hono";
 * import { serveStatic } from "hono/bun";
 * import { routes } from "@valentinkolb/ssr/hono";
 * import { config, html } from "./config";
 *
 * const app = new Hono()
 *   .route("/_ssr", routes(config))
 *   .use("/public/*", serveStatic({ root: "./" }))
 *   .get("/", async (c) => {
 *     const response = await html(<Home />);
 *     return c.html(await response.text());
 *   });
 *
 * export default app;
 * ```
 */
export const routes = (config: SsrConfig) => {
  const { dev, autoRefresh } = config;

  const app = new Hono();

  // Dev mode: Serve reload client script
  app.get("/_client.js", (c) => {
    if (!dev || !autoRefresh) {
      return c.notFound();
    }
    return new Response(devClientCode, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "no-cache",
      },
    });
  });

  // Dev mode: SSE endpoint for live reload
  app.get("/_reload", (c) => {
    if (!dev || !autoRefresh) {
      return c.notFound();
    }
    return c.body(
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
  });

  // Dev mode: Ping endpoint for reconnection check
  app.get("/_ping", (c) => {
    if (!dev || !autoRefresh) {
      return c.notFound();
    }
    return c.text("ok");
  });

  // Serve all other files as island chunks (use :filename+ to capture filename with extension)
  app.get("/:filename{.+\\.js$}", async (c) => {
    const file = Bun.file(
      join(dev ? "." : Bun.main, "_ssr", c.req.param("filename")),
    );

    if (!(await file.exists())) return c.notFound();

    return c.body(await file.text(), {
      headers: {
        "Content-Type": file.type,
        "Cache-Control": dev
          ? "no-cache"
          : "public, max-age=31536000, immutable",
      },
    });
  });

  return app;
};
