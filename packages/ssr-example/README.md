# ssr-example

Hono-only demo app for `@valentinkolb/ssr` inside this workspace.

Pages in this example use the v0.9.0 rendering API:

```tsx
export default ssr(async () => () => <Page />);
```

Before v0.9.0, pages could return direct JSX. That is no longer valid because JSX must be created inside Solid's SSR renderer.

## Scripts

- `bun run dev` - run in development mode
- `bun run build` - build server to `dist/`
- `bun run start` - start built server
