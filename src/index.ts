/**
 * Core SSR module - exports createConfig() which provides:
 * - config: SSR configuration for adapters
 * - plugin: Bun plugin for build/dev that transforms islands
 * - html: Renders JSX to Response with hydration scripts
 */
import { renderToString } from "solid-js/web";
import type { JSX } from "solid-js";
import type { BunPlugin } from "bun";
import { transform } from "./transform";
import { buildIslands } from "./build";
import { join, dirname } from "path";

// ============================================================================
// Constants
// ============================================================================

/** Glob pattern for island/client component files */
const COMPONENT_PATTERN = "**/*.{island,client}.tsx";

// ============================================================================
// Types
// ============================================================================

export type SsrOptions<T extends object = object> = {
  /** Enable dev mode (default: false) */
  dev?: boolean;
  /** Enable verbose logging (default: true in prod, false in dev) */
  verbose?: boolean;
  /** HTML template function (optional, has default) */
  template?: (
    ctx: {
      body: string;
      scripts: string;
    } & T,
  ) => string | Promise<string>;
};

export type SsrConfig = {
  dev: boolean;
  verbose?: boolean;
};

type HtmlFn<T extends object> = (
  element: JSX.Element,
  options?: T,
) => Promise<Response>;

type PluginFn = () => BunPlugin;

export type SsrResult<T extends object> = {
  config: SsrConfig;
  plugin: PluginFn;
  html: HtmlFn<T>;
};

// ============================================================================
// createConfig() - Create SSR configuration
// ============================================================================

/**
 * Creates SSR configuration, html renderer, and build plugin.
 *
 * Components follow naming conventions:
 * - `*.island.tsx` - SSR rendered + hydrated on client (interactive)
 * - `*.client.tsx` - Client-only rendered (not SSR)
 *
 * @example
 * ```ts
 * // config.ts
 * import { createConfig } from "@valentinkolb/ssr";
 *
 * type PageOptions = { title?: string };
 *
 * export const { config, plugin, html } = createConfig<PageOptions>({
 *   dev: process.env.NODE_ENV === "development",
 *   template: ({ body, scripts, title }) => `
 *     <!DOCTYPE html>
 *     <html>
 *       <head><title>${title ?? "App"}</title></head>
 *       <body>${body}</body>
 *       ${scripts}
 *     </html>
 *   `,
 * });
 * ```
 */
export const createConfig = <T extends object = object>(
  options: SsrOptions<T> = {},
): SsrResult<T> => {
  const { dev = false, verbose, template } = options;

  // Default template if none provided
  const htmlTemplate =
    template ??
    (({ body, scripts }) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body>
        ${body}
        ${scripts}
      </body>
    </html>
  `);

  // Config object for routes adapters
  const config: SsrConfig = {
    dev,
    verbose,
  };

  // HTML renderer
  const html: HtmlFn<T> = async (element, opts = {} as T) => {
    const body = renderToString(() => element);

    // Extract island and client component IDs from rendered HTML
    const matches = [
      ...body.matchAll(/<solid-(island|client) data-id="([^"]+)"/g),
    ];
    const islands = [
      ...new Set(matches.filter((m) => m[1] === "island").map((m) => m[2])),
    ];
    const clients = [
      ...new Set(matches.filter((m) => m[1] === "client").map((m) => m[2])),
    ];
    const islandIds = [...islands, ...clients];

    // Component scripts
    let scripts = islandIds
      .map((id) => `<script type="module" src="/_ssr/${id}.js"></script>`)
      .join("\n");

    // Add dev tools script in dev mode
    if (dev) {
      scripts += `\n<script type="module" src="/_ssr/_client.js"></script>`;
    }

    const content = await htmlTemplate({
      body,
      scripts,
      ...opts,
    });

    return new Response(content, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  };

  // Build islands once per run
  let islandsBuilt = false;

  // Bun plugin for build/dev
  const plugin: PluginFn = () => {
    return {
      name: "solid-ssr",
      setup(build) {
        // Determine output directory
        const prodOutdir = build.config?.outdir;
        const islandsOutdir = prodOutdir ? join(prodOutdir, "_ssr") : "_ssr";

        const ensureIslands = async () => {
          if (islandsBuilt) return;
          islandsBuilt = true;
          await buildIslands({
            pattern: COMPONENT_PATTERN,
            outdir: islandsOutdir,
            verbose: verbose ?? !dev,
            dev,
          });
        };

        // Build islands on start (works for Bun.build)
        build.onStart?.(ensureIslands);

        // Handle .island and .client imports (without .tsx extension)
        build.onResolve({ filter: /\.(island|client)$/ }, (args) => ({
          path: args.path.startsWith(".")
            ? join(dirname(args.importer), args.path + ".tsx")
            : args.path + ".tsx",
        }));

        // Transform TSX/JSX files with Solid SSR
        build.onLoad({ filter: /\.(tsx|jsx)$/ }, async ({ path }) => {
          // Fallback for Bun.plugin (has no onStart)
          await ensureIslands();
          // Import with ? suffix to register file with bun --watch
          // Issue: https://github.com/oven-sh/bun/issues/4689
          const contents = await import(`${path}?`, { with: { type: "text" } });
          return {
            contents: await transform(contents.default, path, "ssr", dev),
            loader: "js",
          };
        });
      },
    };
  };

  return { config, plugin, html };
};
