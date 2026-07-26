# ssr-example

Hono-only demo app for `@k2b/ssr` inside this workspace.

It includes `/nav-demo`, which demonstrates `@k2b/ssr/nav` preserving
client-side island state and keyed scroll containers while updating browser
history. The demo also reconciles its active view when the user navigates Back
or Forward.

Pages in this example use the v0.9.0 rendering API:

```tsx
export default ssr(async () => () => <Page />);
```

Before v0.9.0, pages could return direct JSX. That is no longer valid because JSX must be created inside Solid's SSR renderer.

## Scripts

- `bun run dev` - run in development mode
- `bun run build` - build server to `dist/`
- `bun run start` - start built server
