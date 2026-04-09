import { describe, expect, test } from "bun:test";
import { createConfig } from "../../src/index";

describe("createConfig() cache busting", () => {
  test("injects build version for production hydration imports", async () => {
    const { html } = createConfig({ dev: false });
    const response = await html("content" as any);
    const output = await response.text();

    expect(output).toContain("<style>solid-client,solid-island{display:contents}</style>");
    expect(output).toMatch(/const v="\d+"/);
    expect(output).toContain('const p="/_ssr"');
    expect(output).toContain("import(p+'/'+e.dataset.id+'.js'+(v?'?v='+v:''))");
  });

  test("keeps hydration imports unversioned in dev mode", async () => {
    const { html } = createConfig({ dev: true });
    const response = await html("content" as any);
    const output = await response.text();

    expect(output).toContain('const v=""');
  });

  test("uses basePath for hydration imports and dev config", async () => {
    const { html } = createConfig({ dev: true, basePath: "/docs" });
    const response = await html("content" as any);
    const output = await response.text();

    expect(output).toContain('const p="/docs/_ssr"');
    expect(output).toContain('globalThis.__SSR_CONFIG={"ssrPath":"/docs/_ssr"}');
  });

  test("normalizes trailing slashes in basePath", async () => {
    const { html } = createConfig({ dev: false, basePath: "/docs/" });
    const response = await html("content" as any);
    const output = await response.text();

    expect(output).toContain('const p="/docs/_ssr"');
  });

  test("rejects invalid basePath values", () => {
    expect(() => createConfig({ basePath: "docs" })).toThrow(/basePath must start with "\/" or be empty/);
  });
});
