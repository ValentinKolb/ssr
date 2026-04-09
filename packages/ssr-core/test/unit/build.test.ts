import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { routes as honoRoutes } from "../../src/adapter/hono";
import { buildIslands, dedupeSharedChunkExports } from "../../src/build";
import { islandIdFromFile } from "../../src/island-id";
import { createConfig } from "../../src/index";

const tempRoots: string[] = [];

const makeTempRoot = (): string => {
  const root = mkdtempSync(join(process.cwd(), ".ssr-build-test-"));
  tempRoots.push(root);
  return root;
};

const writeTempFile = (path: string, contents: string): void => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
};

afterEach(() => {
  while (tempRoots.length) {
    const root = tempRoots.pop()!;
    rmSync(root, { recursive: true, force: true });
  }
});

describe("buildIslands()", () => {
  test("builds and serves islands from monorepo rootDir", async () => {
    const workspaceRoot = makeTempRoot();
    const outdir = join(workspaceRoot, "_ssr");
    const islandPath = join(workspaceRoot, "cloud-core", "src", "Counter.island.tsx");

    // Simulate monorepo layout where entrypoint package differs from island package.
    writeTempFile(
      islandPath,
      `
      export default function Counter() {
        return <button>Count</button>;
      }
      `,
    );

    await buildIslands({
      pattern: "**/*.{island,client}.tsx",
      cwd: workspaceRoot,
      outdir,
      verbose: false,
      dev: true,
      external: ["solid-js/web", "seroval"],
    });

    const id = islandIdFromFile(islandPath, workspaceRoot);
    const entryChunk = join(outdir, `${id}.js`);

    expect(existsSync(entryChunk)).toBe(true);

    const app = honoRoutes({ dev: true, rootDir: workspaceRoot, basePath: "", ssrPath: "/_ssr" });
    const response = await app.request(`/${id}.js`);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/javascript");
  });

  test("resolves alias island imports in Bun.build plugin and emits matching island chunk", async () => {
    const workspaceRoot = makeTempRoot();
    const outdir = join(workspaceRoot, "dist");
    const islandPath = join(workspaceRoot, "src", "components", "Counter.island.tsx");
    const pagePath = join(workspaceRoot, "src", "Page.tsx");
    const entryPath = join(workspaceRoot, "src", "server.tsx");

    writeTempFile(
      join(workspaceRoot, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["src/*"],
          },
        },
      }),
    );
    writeTempFile(
      islandPath,
      `
      export default function Counter() {
        return <button>Alias</button>;
      }
      `,
    );
    writeTempFile(
      pagePath,
      `
      import Counter from "@/components/Counter.island";
      export default function Page() {
        return <Counter />;
      }
      `,
    );
    writeTempFile(
      entryPath,
      `
      import Page from "./Page";
      export default Page;
      `,
    );

    const { plugin } = createConfig({
      dev: false,
      rootDir: workspaceRoot,
      verbose: false,
      external: ["solid-js/web", "seroval"],
    });
    const result = await Bun.build({
      entrypoints: [entryPath],
      outdir,
      target: "bun",
      plugins: [plugin()],
      external: ["seroval", "solid-js", "solid-js/web"],
      minify: false,
    });

    expect(result.success).toBe(true);
    const logsText = result.logs.map((log) => String(log)).join("\n");
    expect(logsText).not.toContain('onResolve plugin "path" must be absolute');

    const id = islandIdFromFile(islandPath, workspaceRoot);
    expect(existsSync(join(outdir, "_ssr", `${id}.js`))).toBe(true);
  });

  test("dedupeSharedChunkExports() merges duplicate export blocks and preserves debugId footer", async () => {
    const workspaceRoot = makeTempRoot();
    const outdir = join(workspaceRoot, "_ssr");
    mkdirSync(outdir, { recursive: true });
    const chunkPath = join(outdir, "chunk-test.js");

    writeTempFile(
      chunkPath,
      `
const a = 1;
const b = 2;
export { a };
export { b, a };
//# debugId=abc123
      `.trim(),
    );

    const fixedCount = await dedupeSharedChunkExports(outdir, false);
    const rewritten = readFileSync(chunkPath, "utf8");

    expect(fixedCount).toBe(1);
    expect(rewritten).not.toContain("export { b, a };");
    expect(rewritten).toContain("export { a };");
    expect(rewritten).toContain("export { b };");
    expect(rewritten.indexOf("export { a };")).toBeLessThan(rewritten.indexOf("//# debugId=abc123"));
    expect(rewritten.indexOf("export { b };")).toBeLessThan(rewritten.indexOf("//# debugId=abc123"));
  });
});
