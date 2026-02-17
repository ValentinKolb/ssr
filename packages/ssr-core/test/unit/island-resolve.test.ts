import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { resolveIslandImport, withDefaultIslandExtension } from "../../src/island-resolve";

const tempRoots: string[] = [];

const makeTempRoot = (): string => {
  const root = mkdtempSync(join(tmpdir(), "ssr-island-resolve-"));
  tempRoots.push(root);
  return root;
};

afterEach(() => {
  while (tempRoots.length) {
    rmSync(tempRoots.pop()!, { recursive: true, force: true });
  }
});

describe("withDefaultIslandExtension()", () => {
  test("adds .tsx for extensionless island imports", () => {
    expect(withDefaultIslandExtension("./Counter.island")).toBe("./Counter.island.tsx");
  });

  test("keeps existing script extensions", () => {
    expect(withDefaultIslandExtension("./Counter.island.tsx")).toBe("./Counter.island.tsx");
  });
});

describe("resolveIslandImport()", () => {
  test("resolves relative island imports to absolute paths", () => {
    const root = makeTempRoot();
    const resolveDir = join(root, "src");
    const importer = join(resolveDir, "Page.tsx");
    const resolved = resolveIslandImport("./components/Counter.island", resolveDir, importer);
    expect(resolved).toBe(join(resolveDir, "components", "Counter.island.tsx"));
  });

  test("resolves alias island imports via tsconfig paths", () => {
    const root = makeTempRoot();
    const resolveDir = join(root, "src");
    const importer = join(resolveDir, "Page.tsx");
    const islandPath = join(resolveDir, "components", "Counter.island.tsx");

    mkdirSync(join(resolveDir, "components"), { recursive: true });
    writeFileSync(
      join(root, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["src/*"],
          },
        },
      }),
    );
    writeFileSync(islandPath, "export default function Counter(){ return <button>ok</button>; }");

    const resolved = resolveIslandImport("@/components/Counter.island", resolveDir, importer);
    expect(resolved).toBe(islandPath);
  });

  test("throws an actionable error for unresolved alias imports", () => {
    const root = makeTempRoot();
    const resolveDir = join(root, "src");
    const importer = join(resolveDir, "Page.tsx");

    mkdirSync(resolveDir, { recursive: true });
    writeFileSync(
      join(root, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["src/*"],
          },
        },
      }),
    );

    expect(() => resolveIslandImport("@/components/Missing.island", resolveDir, importer)).toThrow(
      /Failed to resolve island\/client import/,
    );
    expect(() => resolveIslandImport("@/components/Missing.island", resolveDir, importer)).toThrow(
      /Check your tsconfig paths\/baseUrl/,
    );
  });

  test("normalizes absolute island import paths", () => {
    const root = makeTempRoot();
    const absolutePath = join(root, "src", "components", "Counter.island.tsx");
    const resolved = resolveIslandImport(absolutePath, join(root, "src"), join(root, "src", "Page.tsx"));
    expect(resolved).toBe(resolve(absolutePath));
  });
});
