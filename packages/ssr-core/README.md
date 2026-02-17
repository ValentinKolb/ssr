# @valentinkolb/ssr

Minimal SSR + islands framework for SolidJS on Bun.

## Overview

This library renders Solid components on the server and hydrates only interactive islands on the client.

It uses file conventions:

- `*.island.tsx`: SSR + hydrated on the client
- `*.client.tsx`: client-only (no SSR HTML content)
- `*.tsx`: server-only output

## Size & Philosophy

This framework is intentionally minimal and focused on SSR + islands only.

Current source size in this repo (`packages/ssr-core/src`):

| Component | Lines | Raw | Gzipped |
| --- | ---: | ---: | ---: |
| Core (`index`, `transform`, `build`, island ID + resolver) | ~689 | 23.8 KB | 7.2 KB |
| Dev client (overlay + reload, dev only) | ~211 | 6.1 KB | 2.0 KB |
| Adapters (`bun`, `hono`, `elysia`, shared utils) | ~355 | 10.4 KB | 3.3 KB |

Important: these sizes describe framework source code that runs at build time and on the server.
The browser receives only:

- your island bundles
- Solid runtime from your app dependencies
- `seroval` deserialize runtime
- a tiny hydration import snippet

Framework overhead in the browser is intentionally small.

What is intentionally not included:

- no client-side router
- no state management layer
- no CSS-in-JS abstraction
- no build tool wrapper around Bun

Use the libraries you already prefer. This package only handles SSR and islands hydration.

## Features

- Small SSR core with Bun-native build/plugin flow
- Adapters for Bun, Hono, and Elysia
- Type-safe Hono page helper via `createSSRHandler`
- Monorepo support via `rootDir`
- Stable file-path-based island IDs (collision-safe across workspace packages)
- Production chunk cache busting (`/_ssr/*.js?v=<buildTimestamp>`)

## Install

```bash
bun add @valentinkolb/ssr solid-js
bun add -d @babel/core @babel/preset-typescript babel-preset-solid

# choose adapter deps you need
bun add hono
# or
bun add elysia @elysiajs/static
```

## Required TypeScript settings

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

## Quick Start (Hono)

### 1) Create config

```ts
// config.ts
import { createConfig } from "@valentinkolb/ssr";
import { createSSRHandler, routes } from "@valentinkolb/ssr/hono";

type PageOptions = {
  title?: string;
  description?: string;
};

export const { config, plugin, html } = createConfig<PageOptions>({
  dev: process.env.NODE_ENV === "development",
  // For monorepos with separated packages:
  // rootDir: "/path/to/workspace-root",
  template: ({ body, scripts, title, description }) => `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title ?? "App"}</title>
        ${description ? `<meta name="description" content="${description}">` : ""}
      </head>
      <body>${body}${scripts}</body>
    </html>
  `,
});

export const ssr = createSSRHandler(html);
export { routes };
```

### 2) Register plugin in dev

```ts
// scripts/preload.ts
import { plugin } from "../config";

Bun.plugin(plugin());
```

### 3) Create an island

```tsx
// components/Counter.island.tsx
import { createSignal } from "solid-js";

export default function Counter({ initial = 0 }: { initial?: number }) {
  const [count, setCount] = createSignal(initial);
  return <button onClick={() => setCount((c) => c + 1)}>Count: {count()}</button>;
}
```

### 4) Create a page

```tsx
// pages/Home.tsx
import { ssr } from "../config";
import Counter from "../components/Counter.island";

export default ssr(async (c) => {
  c.get("page").title = "Home";
  return <Counter initial={5} />;
});
```

### 5) Wire server

```ts
// server.ts
import { Hono } from "hono";
import { config, routes } from "./config";
import Home from "./pages/Home";

export default new Hono()
  .route("/_ssr", routes(config))
  .get("/", ...Home);
```

### 6) Run

```bash
NODE_ENV=development bun --watch --preload=./scripts/preload.ts src/server.ts
```

## Adapter imports

- Bun: `@valentinkolb/ssr/bun`
- Hono: `@valentinkolb/ssr/hono`
- Elysia: `@valentinkolb/ssr/elysia`

## `createConfig` options

```ts
createConfig({
  dev?: boolean;         // default: false
  verbose?: boolean;     // default: !dev
  rootDir?: string;      // default: process.cwd()
  external?: string[];   // passed to Bun.build for island bundle
  template?: ({ body, scripts, ...custom }) => string | Promise<string>;
})
```

### Notes

- `rootDir` is important in monorepos where server entrypoint and island files live in different packages.
- In production, hydration imports include a build timestamp query (`?v=...`) for cache busting.

## Build for production

```ts
// scripts/build.ts
import { plugin } from "./config";

await Bun.build({
  entrypoints: ["src/server.tsx"],
  outdir: "dist",
  target: "bun",
  plugins: [plugin()],
});
```

## Hono `createSSRHandler` behavior

`createSSRHandler(html)` returns an `ssr()` helper that:

- initializes `c.get("page")` as typed page options
- accepts middlewares/validators before final handler
- lets handlers return either JSX or `Response`

## Dev mode tools

With `dev: true`, a small `[ssr]` overlay is injected.

It can:

- auto-reload on server restart
- highlight island/client boundaries
- show source filenames for wrapped components

## Limitations

- islands must use default export
- props must be serializable (via `seroval`)
- nested island/client imports are not supported

## Local monorepo example

This repo includes a current example app:

- `packages/ssr-example`

Run from workspace root:

```bash
bun run dev:example
```
