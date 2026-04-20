---
name: ssr
description: Build apps with @valentinkolb/ssr, the minimal SolidJS islands SSR framework for Bun. Use when creating pages, islands, client components, templates, or adapter setup with Hono, Bun, or Elysia, and when troubleshooting SSR asset loading, serialization, or client re-render behavior.
---

# @valentinkolb/ssr User Guide

Use this skill when building with `@valentinkolb/ssr`.

## Quick Start

### Config

```ts
import { createConfig } from "@valentinkolb/ssr";
import { createSSRHandler, routes } from "@valentinkolb/ssr/hono";

type PageOptions = {
  title?: string;
  description?: string;
};

export const { config, plugin, html } = createConfig<PageOptions>({
  dev: process.env.NODE_ENV === "development",
  rootDir: import.meta.dir,
  template: ({ body, scripts, title, description }) => `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title ?? "App"}</title>
      ${description ? `<meta name="description" content="${description}">` : ""}
    </head>
    <body>${body}${scripts}</body>
  </html>`,
});

export const ssr = createSSRHandler(html);
export { routes };
```

### Hono server

```ts
import { Hono } from "hono";
import { config, routes } from "../config";
import Home from "./components/Home";

export default new Hono()
  .route("/_ssr", routes(config))
  .get("/", ...Home);
```

### Dev preload

```ts
import { plugin } from "../config";

Bun.plugin(plugin());
```

### Production build

```ts
import { plugin } from "../config";

await Bun.build({
  entrypoints: ["src/server.tsx"],
  outdir: "dist",
  target: "bun",
  plugins: [plugin()],
});
```

## Component Conventions

| Extension | Behavior |
|---|---|
| `*.island.tsx` | server-rendered, then client re-rendered |
| `*.client.tsx` | client-only wrapper, no SSR HTML body |
| `*.tsx` | server-only |

Rules:

- use `export default` for islands and client components
- props must be `seroval`-serializable
- do not nest island/client imports inside other island/client components

`seroval` supports more than JSON, including values like `Date`, `RegExp`, `Map`, and `Set`, but still excludes functions, DOM nodes, and arbitrary class instances.

## Pages

`ssr()` page handlers return a synchronous render function, not already-created JSX:

```tsx
export default ssr(async (c) => {
  c.get("page").title = "Home";
  const data = await loadData();

  return () => <Home data={data} />;
});
```

Use the handler body for async work, redirects, and page metadata. Keep JSX creation inside the returned render function so Solid SSR primitives such as `createUniqueId()` run inside `renderToString()`.

### v0.9.0 Breaking Change

For migrations, check for the old direct-JSX style from v0.8.x and earlier:

```tsx
// before v0.9.0
export default ssr(async () => <Page />);
app.get("/", () => html(<Page />));
```

Convert it to render functions:

```tsx
// v0.9.0+
export default ssr(async () => () => <Page />);
app.get("/", () => html(() => <Page />));
```

Do async data loading before the returned render function:

```tsx
export default ssr(async (c) => {
  const data = await loadData();
  return () => <Page data={data} />;
});
```

Do not return an async render function. The render function is called by `renderToString()` and must synchronously create JSX.

## `createConfig()` Options

```ts
createConfig({
  dev?: boolean;
  verbose?: boolean;
  rootDir?: string;
  basePath?: string;
  external?: string[];
  template?: ({ body, scripts, ...custom }) => string | Promise<string>;
})
```

Notes:

- set `rootDir` when your config and island files live in different workspace packages
- `basePath` moves SSR asset URLs and dev endpoints under that public prefix
- `html()` accepts a synchronous render function: `html(() => <Page />)`
- `html()` always injects framework assets, including the SSR loader and wrapper styling

## Hono and `basePath`

For ordinary apps at the site root:

```ts
new Hono().route("/_ssr", routes(config));
```

For a feature app mounted under `/docs`:

```ts
const { config } = createConfig({ basePath: "/docs" });

const docsApp = new Hono()
  .route("/_ssr", routes(config))
  .get("/", ...Home);

export default new Hono().route("/docs", docsApp);
```

The important invariant is that `config.basePath` must match the host mount path of the feature app.

## Other Adapters

- Hono: `@valentinkolb/ssr/hono`
- Bun: `@valentinkolb/ssr/bun`
- Elysia: `@valentinkolb/ssr/elysia`

For Bun and Elysia, the adapter uses `config.ssrPath` internally, so `basePath` does not require extra manual route wiring.

## TypeScript Settings

```json
{
  "compilerOptions": {
    "lib": ["ESNext", "DOM"],
    "jsx": "preserve",
    "jsxImportSource": "solid-js",
    "moduleResolution": "bundler"
  }
}
```

## Common Pitfalls

- missing `rootDir` in a monorepo leads to missing island discovery
- missing SSR route mounting leads to 404s for island chunks
- placing `${scripts}` outside the rendered HTML body can break client loading
- returning direct JSX from `ssr()` is invalid; return `() => <Page />`
- importing server-only modules into islands or client components can break browser bundling
- named exports for islands/clients are not supported
