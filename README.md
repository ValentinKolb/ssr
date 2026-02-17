# SSR Monorepo

This repository contains a small SSR framework for SolidJS and Bun plus a working example app.

## Packages

- `packages/ssr-core` (`@valentinkolb/ssr`)
  - Core library for server rendering + islands hydration
  - Supports Bun, Hono, and Elysia adapters
  - Includes monorepo-aware island discovery (`rootDir`)
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
