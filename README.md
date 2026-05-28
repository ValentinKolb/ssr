# SSR Monorepo

Minimal SSR + islands for SolidJS on Bun.

This monorepo contains the framework package and an example app. It focuses on server rendering, client re-rendered islands, and adapters for Bun, Hono, and Elysia.

## Packages

### `packages/ssr-core`

Published as `@valentinkolb/ssr`.

- SSR core with Bun-native build/plugin flow
- islands and client-only components via file conventions
- adapters for Bun, Hono, and Elysia
- optional progressive navigation helpers via `@valentinkolb/ssr/nav`
- monorepo support via `rootDir`
- microfrontend support via `basePath`

See the full package docs in [packages/ssr-core/README.md](/Users/valentinkolb/Git/ssr/packages/ssr-core/README.md).

### `packages/ssr-example`

Reference Hono app using the local workspace package.

- uses `createSSRHandler`
- includes islands, client-only components, API calls, and an opt-in nav demo

See [packages/ssr-example/README.md](/Users/valentinkolb/Git/ssr/packages/ssr-example/README.md).

## Example

```ts
import { createConfig } from "@valentinkolb/ssr";
import { createSSRHandler, routes } from "@valentinkolb/ssr/hono";
import { Hono } from "hono";

const { config, html } = createConfig({
  template: ({ body, scripts }) => `<!doctype html><body>${body}${scripts}</body>`,
});

const ssr = createSSRHandler(html);

const Home = ssr(async () => () => <button>hello</button>);

export default new Hono()
  .route("/_ssr", routes(config))
  .get("/", ...Home);
```

Pages return a render function so Solid JSX is evaluated inside the SSR renderer. For installation, adapter setup, `createConfig()` options, `basePath`, and the v0.9.0 migration note, see [packages/ssr-core/README.md](/Users/valentinkolb/Git/ssr/packages/ssr-core/README.md).

## Development

Run from repo root:

```bash
bun install
bun run test
bun run dev:example
bun run build:example
bun run start:example
```

## Agent Skills (optional)

This repository includes agent skills in `skills/`.

Available skills:

- `ssr` for building apps with `@valentinkolb/ssr`
- `ssr-maintainer` for framework-internal work in `ssr-core`

Install them with the Vercel Skills CLI:

```bash
bunx skills add https://github.com/ValentinKolb/ssr --skill '*'
```

## Notes

- Framework documentation: [packages/ssr-core/README.md](/Users/valentinkolb/Git/ssr/packages/ssr-core/README.md)
- Example app: [packages/ssr-example](/Users/valentinkolb/Git/ssr/packages/ssr-example)
- LLM notes: [packages/ssr-core/llms.txt](/Users/valentinkolb/Git/ssr/packages/ssr-core/llms.txt)
