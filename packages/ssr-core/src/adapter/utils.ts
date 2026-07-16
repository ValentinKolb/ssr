/**
 * Shared utilities for SSR adapters - path helpers, asset responses,
 * SSE live reload, and security utilities.
 */
import { dirname, join, resolve } from "path";
import type { SsrConfig } from "../index";

/**
 * Normalize a public app base path.
 * - undefined, "", "/" => ""
 * - "/docs/" => "/docs"
 * - values without leading slash are rejected
 */
export const normalizeBasePath = (input?: string): string => {
  const value = input?.trim() ?? "";
  if (!value || value === "/") return "";
  if (!value.startsWith("/")) {
    throw new Error(`[ssr] basePath must start with "/" or be empty. Received: ${JSON.stringify(input)}`);
  }
  return value.replace(/\/+$/, "");
};

/**
 * Public HTTP path prefix used for SSR assets/endpoints.
 */
export const toSsrPath = (basePath: string): string =>
  basePath ? `${basePath}/_ssr` : "/_ssr";

/**
 * Get the _ssr directory path based on dev/prod mode.
 * Dev: uses config.rootDir (fallback process.cwd())
 * Prod: uses dirname(Bun.main) (next to compiled binary)
 */
export const getSsrDir = (config: SsrConfig): string =>
  join(config.dev ? config.rootDir ?? process.cwd() : dirname(Bun.main), "_ssr");

const HASHED_CHUNK = /^chunk-[a-z0-9]+\.js$/i;
const ASSET_FILE = /^[a-z0-9._-]+\.js(?:\.map)?$/i;

/**
 * Stable entry names can change during development. Content-hashed chunks
 * cannot, so the browser may retain them across page navigations.
 */
export const getCacheHeaders = (dev: boolean, filename = "") =>
  !dev || HASHED_CHUNK.test(filename) ? "public, max-age=31536000, immutable" : "no-cache";

const matchesEtag = (header: string, etag: string): boolean => {
  const normalized = etag.replace(/^W\//, "");
  return header.split(",").some((candidate) => {
    const value = candidate.trim();
    return value === "*" || value.replace(/^W\//, "") === normalized;
  });
};

const isNotModified = (request: Request, etag: string, lastModified: number): boolean => {
  const ifNoneMatch = request.headers.get("If-None-Match");
  if (ifNoneMatch) return matchesEtag(ifNoneMatch, etag);

  const ifModifiedSince = request.headers.get("If-Modified-Since");
  if (!ifModifiedSince) return false;
  const since = Date.parse(ifModifiedSince);
  return Number.isFinite(since) && Math.floor(lastModified / 1000) <= Math.floor(since / 1000);
};

/**
 * Serves generated island assets without eagerly buffering their contents.
 * Dev validators make stable entries cheap to revalidate while preserving
 * immediate rebuild visibility.
 */
export const createAssetResponse = async (
  request: Request,
  directory: string,
  filename: string,
  dev: boolean,
): Promise<Response> => {
  if (!ASSET_FILE.test(filename)) return notFound();
  const path = safePath(directory, filename);
  if (!path) return notFound();

  const contentType = filename.endsWith(".map")
    ? "application/json; charset=utf-8"
    : "application/javascript";
  const file = Bun.file(path, { type: contentType });
  if (!(await file.exists())) return notFound();

  const cacheControl = getCacheHeaders(dev, filename);
  if (!dev) {
    return new Response(file, {
      headers: { "Content-Type": contentType, "Cache-Control": cacheControl },
    });
  }

  const lastModified = file.lastModified;
  const etag = `W/"${file.size.toString(16)}-${Math.trunc(lastModified).toString(16)}"`;
  const validatorHeaders = {
    "Cache-Control": cacheControl,
    ETag: etag,
    "Last-Modified": new Date(lastModified).toUTCString(),
  };

  if (isNotModified(request, etag, lastModified)) {
    return new Response(null, { status: 304, headers: validatorHeaders });
  }

  return new Response(file, {
    headers: { "Content-Type": contentType, ...validatorHeaders },
  });
};

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
