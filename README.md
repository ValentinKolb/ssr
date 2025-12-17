# @valentinkolb/SSR

A minimal server-side rendering framework for SolidJS and Bun with islands architecture.

## Overview

This framework provides SSR capabilities for SolidJS applications using Bun's runtime. It follows the islands architecture pattern where you can selectively hydrate interactive components while keeping the rest of your page static HTML.

The entire framework is roughly 750 lines of code with zero runtime dependencies beyond Solid, seroval and your chosen web framework adapter.

## Features

- **Islands architecture**: `*.island.tsx` for hydrated components, `*.client.tsx` for client-only
- **Framework agnostic**: Works with Bun's native server, **Elysia**, or **Hono**
- **Fast**: Built on Bun's runtime with optimized bundling
- **Dev experience**: Hot reload, source maps, and TypeScript support

## Example

See [github.com/valentinkolb/ssr-example](https://github.com/valentinkolb/ssr-example) for a complete working example with all three adapters.

## Quick Start

Install the package:

```bash
bun add @valentinkolb/ssr solid-js
```

Create a configuration file (optional - has sensible defaults):

```typescript
// config.ts
import { createConfig } from "@valentinkolb/ssr";

export const { config, plugin, html } = createConfig({
  dev: process.env.NODE_ENV === "development",
});
```

Create an interactive island component:

```tsx
// components/Counter.island.tsx
import { createSignal } from "solid-js";

export default function Counter({ initialCount = 0 }) {
  const [count, setCount] = createSignal(initialCount);

  return (
    <button onClick={() => setCount(count() + 1)}>
      Count: {count()}
    </button>
  );
}
```

Use it in a page:

```tsx
// pages/Home.tsx
import Counter from "../components/Counter.island";

export default function Home() {
  return (
    <div>
      <h1>My Page</h1>
      <Counter initialCount={5} />
    </div>
  );
}
```

## Adapter Usage

### Bun Native Server

```typescript
import { Bun } from "bun";
import { routes } from "@valentinkolb/ssr/adapter/bun";
import { config, html } from "./config";
import Home from "./pages/Home";

Bun.serve({
  port: 3000,
  routes: {
    ...routes(config),
    "/": () => html(<Home />),
  },
});
```

### Hono

```typescript
import { Hono } from "hono";
import { routes } from "@valentinkolb/ssr/adapter/hono";
import { config, html } from "./config";
import Home from "./pages/Home";

const app = new Hono()
  .route("/_ssr", routes(config))
  .get("/", async (c) => {
    const response = await html(<Home />);
    return c.html(await response.text());
  });

export default app;
```

### Elysia

```typescript
import { Elysia } from "elysia";
import { routes } from "@valentinkolb/ssr/adapter/elysia";
import { config, html } from "./config";
import Home from "./pages/Home";

new Elysia()
  .use(routes(config))
  .get("/", () => html(<Home />))
  .listen(3000);
```

## Build Configuration

Add the plugin to your build script:

```typescript
// scripts/build.ts
import { plugin } from "./config";

await Bun.build({
  entrypoints: ["src/server.tsx"],
  outdir: "dist",
  target: "bun",
  plugins: [plugin()],
});
```

For development with watch mode:

```typescript
// scripts/preload.ts
import { plugin } from "./config";

Bun.plugin(plugin());
```

```json
{
  "scripts": {
    "dev": "bun --watch --preload=./scripts/preload.ts run src/server.tsx",
    "build": "bun run scripts/build.ts",
    "start": "bun run dist/server.js"
  }
}
```

## Component Types

### Island Components (`*.island.tsx`)

Island components are server-rendered and then hydrated on the client. They should be used for interactive UI elements that need JavaScript.

```tsx
// Sidebar.island.tsx
import { createSignal } from "solid-js";

export default function Sidebar() {
  const [open, setOpen] = createSignal(false);
  return <div>{open() ? "Open" : "Closed"}</div>;
}
```

### Client-Only Components (`*.client.tsx`)

Client-only components are not rendered on the server. They render only in the browser, useful for components that depend on browser APIs.

```tsx
// ThemeToggle.client.tsx
import { createSignal, onMount } from "solid-js";

export default function ThemeToggle() {
  const [theme, setTheme] = createSignal("light");
  
  onMount(() => {
    setTheme(localStorage.getItem("theme") || "light");
  });
  
  return <button onClick={() => setTheme(theme() === "light" ? "dark" : "light")}>
    {theme()}
  </button>;
}
```

### Regular Components

Standard Solid components that are only rendered on the server. No client-side JavaScript is shipped for these.

```tsx
// Header.tsx
export default function Header() {
  return <header><h1>My Site</h1></header>;
}
```

## Props Serialization

The framework uses [seroval](https://github.com/lxsmnsyc/seroval) for props serialization, which supports complex JavaScript types that JSON cannot handle:

```tsx
<Island
  date={new Date()}
  map={new Map([["key", "value"]])}
  set={new Set([1, 2, 3])}
  regex={/test/gi}
  bigint={123n}
  undefined={undefined}
/>
```

## Custom HTML Template

You can pass additional options to your HTML template. All options are type safe!

```typescript
type PageOptions = { title: string; description?: string };

const { html } = createConfig<PageOptions>({
  template: ({
    body, scripts,     // must be provided and used for hydration
    title, description // user defined options
  }) => `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        ${description ? `<meta name="description" content="${description}">` : ""}
      </head>
      <body>${body}${scripts}</body>
    </html>
  `,
});

// Usage
await html(<Home />, { 
  title: "Home Page",               // type safe
  description: "Welcome to my site" // type safe
});
```

## How It Works

1. **Build time**: The framework discovers all `*.island.tsx` and `*.client.tsx` files in the project and bundles them separately for the browser
2. **During SSR**: Normal components are rendered to HTML strings. Island/client components are wrapped in custom elements with data attributes containing their props
3. **At the client**: Individual island bundles load and hydrate their corresponding DOM elements

The framework uses a Babel plugin to transform island imports into wrapped components during SSR. Props are serialized using seroval and embedded in data attributes. On the client, each island bundle deserializes its props and renders the component.

Babel is used since Solid only supports Babel for JSX transformation at the moment.

## File Structure

```
src/
├── index.ts       # Core SSR logic and createConfig()
├── transform.ts   # Babel plugin for island wrapping
├── build.ts       # Island bundling with code splitting
├── bun.ts         # Bun.serve() adapter
├── elysia.ts      # Elysia adapter
├── hono.ts        # Hono adapter
└── client.js      # Dev mode auto-reload client
```

## Configuration Options

```typescript
createConfig({
  dev?: boolean;                // Enable dev mode (default: false)
  verbose?: boolean;            // Enable verbose logging (default: !dev)
  autoRefresh?: boolean;        // Enable auto-reload in dev (default: true)
  template?: (context) => string; // HTML template function (optional, has default)
})
```

## Contributing

Contributions are welcome! The codebase is intentionally minimal. Keep changes focused and avoid adding unnecessary complexity.

## License

MIT
