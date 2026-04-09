# Architecture Reference

## Table of Contents

- [Build Pipeline](#build-pipeline)
- [Transform Pipeline](#transform-pipeline)
- [Island ID System](#island-id-system)
- [Adapter System](#adapter-system)
- [File Map](#file-map)

## Build Pipeline

`buildIslands()` in `src/build.ts`:

1. Scan `**/*.{island,client}.tsx` from `rootDir`
2. Generate stable IDs with `islandIdFromFile()`
3. Fail fast on collisions
4. Run one `Bun.build()` pass with virtual island entrypoints and `splitting: true`
5. Generate per-entry hydration code that imports the component, `solid-js/web`, and `seroval`
6. In production only, run `dedupeSharedChunkExports()` on shared chunks

Output stays on disk in `_ssr/`:

```text
_ssr/
├── <12-char-id>.js
└── chunk-<hash>.js
```

## Transform Pipeline

`transform()` in `src/transform.ts` runs two Babel passes.

### Pass 1: Wrapper injection in SSR mode

- collects `.island` and `.client` default imports
- wraps JSX usages in `<solid-island>` or `<solid-client>`
- injects `data-id`, `data-props`, and `data-file` in dev
- keeps SSR children for islands, emits empty wrappers for clients
- injects `serialize` from `seroval`

### Pass 2: Solid compilation

- strips types with `@babel/preset-typescript`
- compiles Solid with `babel-preset-solid`
- uses `generate: "ssr"` or `generate: "dom"`
- keeps `hydratable: false`, so client islands re-render rather than hydrate existing DOM

## Island ID System

`src/island-id.ts`:

- `toStableKey(file, rootDir)`: canonical relative path, or absolute fallback when outside root
- `islandIdFromFile(file, rootDir)`: MD5 of the stable key, truncated to 12 chars
- path normalization is cross-platform and symlink-aware

`src/island-resolve.ts`:

- resolves relative, absolute, and tsconfig-alias island/client imports
- appends `.tsx` when missing
- emits actionable resolution errors

## Adapter System

Shared helpers live in `src/adapter/utils.ts`:

| Utility | Purpose |
|---|---|
| `normalizeBasePath()` | validate and normalize `basePath` |
| `toSsrPath()` | derive the public SSR asset path |
| `getSsrDir()` | derive the filesystem `_ssr` directory |
| `getCacheHeaders()` | dev/prod cache policy |
| `safePath()` | reject path traversal |
| `createReloadStream()` / `createReloadResponse()` | SSE live reload |

### Hono adapter

- `createSSRHandler(html)` returns the `ssr()` tuple helper
- `routes(config)` is intentionally relative and is mounted by the host app
- when using `basePath`, the feature app is typically mounted under `config.basePath`, while SSR routes remain mounted inside that app at `/_ssr`

### Bun adapter

- owns absolute route keys directly
- must use `config.ssrPath` for asset and dev endpoints

### Elysia adapter

- uses `@elysiajs/static`
- must use `config.ssrPath` as the public prefix

## File Map

```text
packages/ssr-core/src/
├── index.ts
├── build.ts
├── transform.ts
├── island-id.ts
├── island-resolve.ts
└── adapter/
    ├── utils.ts
    ├── hono.ts
    ├── bun.ts
    ├── elysia.ts
    └── client.js
```
