# Testing Reference

## Test Runner

Run from repo root:

```bash
bun run test
```

Or from `packages/ssr-core`:

```bash
bun test
bun test test/unit/build.test.ts
```

## Test Files

Location: `packages/ssr-core/test/unit/`

| File | Focus |
|---|---|
| `index.test.ts` | `createConfig()`, HTML generation, basePath behavior |
| `build.test.ts` | island bundling, dedup, monorepo discovery |
| `transform.test.ts` | wrapper injection, seroval behavior |
| `island-id.test.ts` | ID stability |
| `island-resolve.test.ts` | relative and alias import resolution |
| `hono.test.ts` | `createSSRHandler`, middleware ordering, mounted Hono behavior |
| `utils.test.ts` | basePath normalization, cache headers, safePath |
| `adapter-paths.test.ts` | Bun/Elysia SSR public paths |
| `hash.test.ts` | hash determinism |

## Patterns

- use temp directories for filesystem tests
- clean them up in `afterEach`
- exercise both dev and prod branches where behavior differs
- when adapter behavior changes, verify both default root routing and `basePath` routing
- for request/response tests, prefer real app instances over mocking route handlers
