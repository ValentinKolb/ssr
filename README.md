# SSR Monorepo

This repository contains a small SSR framework for SolidJS and Bun plus a working example app.

## Packages

- `packages/ssr-core` (`@valentinkolb/ssr`)
  - Core library for server rendering + islands hydration
  - Supports Bun, Hono, and Elysia adapters
  - Includes monorepo-aware island discovery (`rootDir`)
  - Supports path-based mounting for microfrontends via `basePath`
  - Includes production cache busting for island chunks (`?v=<buildTimestamp>`)

- `packages/ssr-example`
  - Hono-only example app using the local workspace package
  - Shows `createSSRHandler`, islands, client-only components, and API calls
  - Keeps the original terminal-like visual style

## Why this repo

`@valentinkolb/ssr` is intentionally small and focused:

- convention-based component types (`*.island.tsx`, `*.client.tsx`)
- tiny runtime behavior in the browser
- no router/state/CSS framework assumptions
- clear integration points through adapters

## Size & Philosophy

This project keeps SSR/islands logic small and explicit instead of adding a full app framework.

Current `ssr-core` source footprint (`packages/ssr-core/src`):

| Component | Lines | Raw | Gzipped |
| --- | ---: | ---: | ---: |
| Core + island ID/resolution | ~689 | 23.8 KB | 7.2 KB |
| Dev client (dev only) | ~211 | 6.1 KB | 2.0 KB |
| Adapters + shared adapter utils | ~355 | 10.4 KB | 3.3 KB |

In the browser you mainly ship your own island code plus Solid/seroval runtime pieces.
`@valentinkolb/ssr` itself is designed to stay low-overhead on the client.

Deliberately out of scope:

- client-side routing
- global state management
- CSS-in-JS or styling opinions
- build abstraction beyond Bun

If you want full usage docs, go to:

- `packages/ssr-core/README.md`

## Workspace commands

Run from repo root:

```bash
bun install
bun run test
bun run dev:example
bun run build:example
bun run start:example
```

## Where to look next

- Library docs: `packages/ssr-core/README.md`
- LLM context notes: `packages/ssr-core/llms.txt`
- Live example source: `packages/ssr-example`
