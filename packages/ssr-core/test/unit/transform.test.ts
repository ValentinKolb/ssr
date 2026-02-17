import { afterEach, describe, test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { islandIdFromFile } from "../../src/island-id";
import { transform } from "../../src/transform";

const tempRoots: string[] = [];

const makeTempRoot = (): string => {
  const root = mkdtempSync(join(tmpdir(), "ssr-transform-test-"));
  tempRoots.push(root);
  return root;
};

afterEach(() => {
  while (tempRoots.length) {
    rmSync(tempRoots.pop()!, { recursive: true, force: true });
  }
});

describe("transform() - Island wrapping in SSR mode", () => {
  test("should wrap .island imports with solid-island tag", async () => {
    const input = `
      import Counter from "./Counter.island";
      export default () => <Counter count={5} />;
    `;

    const result = await transform(input, "/test/Page.tsx", "ssr");

    expect(result).toContain("solid-island");
    expect(result).toContain("data-id");
    expect(result).toContain("data-props");
  });

  test("should wrap .client imports with solid-client tag", async () => {
    const input = `
      import Widget from "./Widget.client";
      export default () => <Widget />;
    `;

    const result = await transform(input, "/test/Page.tsx", "ssr");

    expect(result).toContain("solid-client");
    expect(result).toContain("data-id");
    expect(result).toContain("data-props");
  });

  test("should NOT wrap regular imports", async () => {
    const input = `
      import Button from "./Button";
      export default () => <Button />;
    `;

    const result = await transform(input, "/test/Page.tsx", "ssr");

    expect(result).not.toContain("solid-island");
    expect(result).not.toContain("solid-client");
  });

  test("should inject seroval import and helper", async () => {
    const input = `
      import Counter from "./Counter.island";
      export default () => <Counter count={5} />;
    `;

    const result = await transform(input, "/test/Page.tsx", "ssr");

    expect(result).toContain('import { serialize } from "seroval"');
    expect(result).toContain("const __seroval_serialize = serialize");
  });

  test("should use __seroval_serialize for data-props", async () => {
    const input = `
      import Counter from "./Counter.island";
      export default () => <Counter count={5} name="test" />;
    `;

    const result = await transform(input, "/test/Page.tsx", "ssr");

    expect(result).toContain("__seroval_serialize");
    // Should serialize the props object
    expect(result).toContain("count");
  });

  test("should generate deterministic data-id based on file path", async () => {
    const input = `
      import Counter from "./Counter.island";
      export default () => <Counter />;
    `;

    const result1 = await transform(input, "/test/Page.tsx", "ssr");
    const result2 = await transform(input, "/test/Page.tsx", "ssr");

    // Both results should contain the same 8-char hash
    // Just check they both contain "data-id" attribute
    expect(result1).toContain("data-id");
    expect(result2).toContain("data-id");

    // And that the overall structure is identical (deterministic)
    expect(result1).toBe(result2);
  });

  test("should handle multiple islands in one file", async () => {
    const input = `
      import Counter from "./Counter.island";
      import Timer from "./Timer.island";
      export default () => (
        <div>
          <Counter />
          <Timer />
        </div>
      );
    `;

    const result = await transform(input, "/test/Page.tsx", "ssr");

    // Should have 2 solid-island tags
    const matches = result.match(/solid-island/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  test("should handle islands with complex props", async () => {
    const input = `
      import Counter from "./Counter.island";
      const data = { nested: true };
      export default () => <Counter items={[1,2,3]} user={{ name: "Alice" }} data={data} />;
    `;

    const result = await transform(input, "/test/Page.tsx", "ssr");

    expect(result).toContain("solid-island");
    expect(result).toContain("__seroval_serialize");
  });

  test("should handle islands without props", async () => {
    const input = `
      import Counter from "./Counter.island";
      export default () => <Counter />;
    `;

    const result = await transform(input, "/test/Page.tsx", "ssr");

    expect(result).toContain("solid-island");
    expect(result).toContain("data-props");
  });

  test("should preserve island children in SSR mode", async () => {
    const input = `
      import Box from "./Box.island";
      export default () => <Box><span>Child</span></Box>;
    `;

    const result = await transform(input, "/test/Page.tsx", "ssr");

    // In SSR mode, island should wrap the component (children preserved)
    expect(result).toContain("solid-island");
  });
});

describe("transform() - Client mode behavior", () => {
  test("should NOT inject seroval in DOM mode", async () => {
    const input = `
      import Counter from "./Counter.island";
      export default () => <Counter count={5} />;
    `;

    const result = await transform(input, "/test/Component.tsx", "dom");

    expect(result).not.toContain('from "seroval"');
    expect(result).not.toContain("__seroval_serialize");
  });

  test("should NOT wrap components in DOM mode", async () => {
    const input = `
      import Counter from "./Counter.island";
      export default () => <Counter count={5} />;
    `;

    const result = await transform(input, "/test/Component.tsx", "dom");

    expect(result).not.toContain("solid-island");
    expect(result).not.toContain("solid-client");
    expect(result).not.toContain("data-id");
  });

  test("should still compile JSX in DOM mode", async () => {
    const input = `
      export default () => <div>Hello</div>;
    `;

    const result = await transform(input, "/test/Component.tsx", "dom");

    // Should contain some Solid runtime code (not SSR-specific)
    expect(result).not.toContain("ssr");
    expect(result.length).toBeGreaterThan(input.length); // Was transformed
  });
});

describe("transform() - Edge cases", () => {
  test("should handle default imports from islands", async () => {
    const input = `
      import MyIsland from "./components/MyIsland.island";
      export default () => <MyIsland />;
    `;

    const result = await transform(input, "/test/Page.tsx", "ssr");

    expect(result).toContain("solid-island");
  });

  test("should handle relative paths with ../", async () => {
    const input = `
      import Counter from "../shared/Counter.island";
      export default () => <Counter />;
    `;

    const result = await transform(input, "/test/Page.tsx", "ssr");

    expect(result).toContain("solid-island");
  });

  test("should resolve alias imports to file-based IDs", async () => {
    const root = makeTempRoot();
    const pagePath = join(root, "src", "pages", "Page.tsx");
    const islandPath = join(root, "src", "components", "Counter.island.tsx");

    mkdirSync(join(root, "src", "components"), { recursive: true });
    mkdirSync(join(root, "src", "pages"), { recursive: true });
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

    const input = `
      import Counter from "@/components/Counter.island";
      export default () => <Counter />;
    `;

    const result = await transform(input, pagePath, "ssr", false, root);
    const expectedId = islandIdFromFile(islandPath, root);
    const generatedId = result.match(/data-id=\\\"([a-f0-9]{12})\\\"/)?.[1];

    expect(generatedId).toBe(expectedId);
  });

  test("should hard-fail for unresolved alias imports", async () => {
    const root = makeTempRoot();
    const pagePath = join(root, "src", "pages", "Page.tsx");

    mkdirSync(join(root, "src", "pages"), { recursive: true });
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

    const input = `
      import Missing from "@/components/Missing.island";
      export default () => <Missing />;
    `;

    await expect(transform(input, pagePath, "ssr", false, root)).rejects.toThrow(
      /Failed to resolve island\/client import/,
    );
  });

  test("should handle .tsx extension in import", async () => {
    const input = `
      import Counter from "./Counter.island.tsx";
      export default () => <Counter />;
    `;

    const result = await transform(input, "/test/Page.tsx", "ssr");

    expect(result).toContain("solid-island");
  });

  test("should handle TypeScript types in components", async () => {
    const input = `
      import Counter from "./Counter.island";
      type Props = { count: number };
      export default () => {
        const props: Props = { count: 5 };
        return <Counter {...props} />;
      };
    `;

    const result = await transform(input, "/test/Page.tsx", "ssr");

    expect(result).toContain("solid-island");
    // Should not error on TypeScript syntax
  });

  test("should not wrap islands imported but not used", async () => {
    const input = `
      import Counter from "./Counter.island";
      export default () => <div>No counter here</div>;
    `;

    const result = await transform(input, "/test/Page.tsx", "ssr");

    // Should not contain solid-island since Counter is not rendered
    expect(result).not.toContain("solid-island");
  });
});
