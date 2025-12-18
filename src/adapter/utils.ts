/**
 * Shared utilities for SSR adapters - path helpers, cache headers,
 * SSE stream for hot reload, and security utilities.
 */
import { dirname, join, resolve } from "path";
// @ts-ignore - Bun text import
import devClientCode from "./client.js" with { type: "text" };

/**
 * Get the _ssr directory path based on dev/prod mode.
 * Dev: uses process.cwd() (project root)
 * Prod: uses dirname(Bun.main) (next to compiled binary)
 */
export const getSsrDir = (dev: boolean): string =>
  join(dev ? process.cwd() : dirname(Bun.main), "_ssr");

/**
 * Cache headers for static assets
 */
export const getCacheHeaders = (dev: boolean) =>
  dev ? "no-cache" : "public, max-age=31536000, immutable";

/**
 * SSE headers for live reload
 */
export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
} as const;

/**
 * Creates a Server-Sent Events stream for live reload
 */
export const createReloadStream = (): ReadableStream =>
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
  });

/**
 * Creates a Response for the dev client script
 */
export const createClientResponse = (): Response =>
  new Response(devClientCode, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache",
    },
  });

/**
 * Creates a Response for the SSE reload endpoint
 */
export const createReloadResponse = (): Response =>
  new Response(createReloadStream(), { headers: SSE_HEADERS });

/**
 * 404 Response
 */
export const notFound = (): Response =>
  new Response("Not found", { status: 404 });

/**
 * Safely join paths, preventing path traversal attacks.
 * Returns null if the resulting path escapes the base directory.
 */
export const safePath = (base: string, filename: string): string | null => {
  const resolved = resolve(base, filename);
  return resolved.startsWith(resolve(base) + "/") ? resolved : null;
};
