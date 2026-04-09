---
name: ssr-maintainer
description: Maintain and develop @valentinkolb/ssr, the SolidJS islands SSR framework for Bun. Use when modifying ssr-core internals such as the build pipeline, Babel transform, island ID system, adapters, hydration/runtime behavior, or tests, and when reviewing framework-level changes in packages/ssr-core.
---

# @valentinkolb/ssr Maintainer Guide

Use this skill for framework-internal work in `packages/ssr-core`.

## Repo Shape

- `packages/ssr-core`: published library
- `packages/ssr-example`: reference Hono app

Core commands:

```bash
bun run test
bun run build:example
bun run dev:example
```

## Read These When Needed

- Architecture, build flow, adapter model: [references/architecture.md](references/architecture.md)
- Test inventory and patterns: [references/testing.md](references/testing.md)

## Key Invariants

- `.island.tsx` and `.client.tsx` must use default exports
- nested island/client imports are unsupported and should stay treated as invalid usage
- props must be `seroval`-serializable; this is broader than plain JSON but still excludes functions, DOM nodes, and arbitrary class instances
- `_ssr/` is the filesystem artifact boundary; the public HTTP path is derived separately via `config.ssrPath`
- island IDs must stay stable for the same source path; cache busting uses build timestamps, not content hashes
- dev overlay/highlighting depends on `data-file` in dev mode and on the wrapper tags remaining present in SSR output

## Adapter Guidance

When adding or changing an adapter:

1. Keep file serving rooted at `getSsrDir(config)`.
2. Respect `config.ssrPath` for adapters that own absolute public paths, such as Bun and Elysia.
3. For Hono, keep `routes(config)` relative so it can be mounted as a sub-app under `/_ssr` or under a feature app that itself is mounted under `config.basePath`.
4. Dev mode must expose reload and ping endpoints on the same SSR public path.
5. Always use `safePath()` for requested asset filenames.
6. Add/update tests for both default root behavior and `basePath` behavior when relevant.

## Transform Guidance

`src/transform.ts` has two important phases:

- SSR-only wrapper pass for island/client imports and JSX usages
- Solid compilation pass with `generate: "ssr"` or `"dom"`

When modifying it:

- test `transform()` directly in SSR and DOM modes
- verify the `serialize` import and `__seroval_serialize` alias behavior
- verify `data-id`, `data-props`, and dev-only `data-file`
- check islands preserve SSR children while clients emit empty wrappers

## Bun-Specific Caveats

- `dedupeSharedChunkExports()` is a production-only workaround for Bun shared-chunk duplicate exports
- `import(\`${path}?\`)` is required for Bun watch registration
- `ensureIslands()` still needs the `build.onLoad` fallback because `Bun.plugin()` does not reliably provide `onStart`
