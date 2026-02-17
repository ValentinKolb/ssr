import { describe, expect, test } from "bun:test";
import { createConfig } from "../../src/index";

describe("createConfig() cache busting", () => {
  test("injects build version for production hydration imports", async () => {
    const { html } = createConfig({ dev: false });
    const response = await html("content" as any);
    const output = await response.text();

    expect(output).toMatch(/const v="\d+"/);
    expect(output).toContain("'/_ssr/'+e.dataset.id+'.js'+(v?'?v='+v:'')");
  });

  test("keeps hydration imports unversioned in dev mode", async () => {
    const { html } = createConfig({ dev: true });
    const response = await html("content" as any);
    const output = await response.text();

    expect(output).toContain('const v=""');
  });
});
