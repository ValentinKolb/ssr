/**
 * Island bundler - discovers *.island.tsx and *.client.tsx files,
 * transforms them for the browser, and outputs chunks to _ssr directory.
 */
import { relative } from "path";
import { Glob } from "bun";
import { transform, hash } from "./transform";

type ComponentType = "island" | "client";

const getComponentType = (path: string): ComponentType => (path.includes(".client.") ? "client" : "island");

const getSelector = (type: ComponentType, id: string) =>
  type === "island" ? `solid-island[data-id="${id}"]` : `solid-client[data-id="${id}"]`;

export const buildIslands = async (options: {
  pattern: string;
  outdir: string;
  verbose: boolean;
  dev?: boolean;
}): Promise<void> => {
  const { pattern, outdir, verbose, dev = false } = options;

  const files: string[] = [];

  for await (const file of new Glob(pattern).scan({
    cwd: process.cwd(),
    absolute: true,
  })) {
    files.push(file);
  }

  if (!files.length) {
    if (verbose) console.log("No island/client files found.");
    return;
  }

  // Build component metadata
  const components = files.map((componentPath) => {
    const id = hash(componentPath);
    const type = getComponentType(componentPath);
    const selector = getSelector(type, id);
    return { path: componentPath, id, type, selector };
  });

  // Check for duplicate filenames (same filename -> same hash -> collision)
  const filenameMap = new Map<string, string[]>();
  for (const c of components) {
    const filename = c.path.split("/").pop()!;
    if (!filenameMap.has(filename)) {
      filenameMap.set(filename, []);
    }
    filenameMap.get(filename)!.push(c.path);
  }

  for (const [filename, paths] of filenameMap) {
    if (paths.length > 1) {
      console.warn(`[ssr] Warning: Multiple files with the same name detected: ${filename}`);
      console.warn("  Files:");
      paths.forEach((p) => console.warn(`    - ${relative(process.cwd(), p)}`));
      console.warn("  This will cause hash collisions. Consider renaming these files.");
    }
  }

  // Build all islands together with code splitting
  // This ensures Solid is only bundled once as a shared chunk
  const result = await Bun.build({
    entrypoints: components.map((c) => c.id),
    outdir,
    naming: { entry: "[name].js", chunk: "chunk-[hash].js" },
    target: "browser",
    minify: !dev,
    splitting: true,
    sourcemap: dev ? "inline" : "none",
    plugins: [
      {
        name: "solid-islands",
        setup(build) {
          // Resolve component IDs as virtual entrypoints
          build.onResolve({ filter: /^[a-f0-9]{8}$/ }, (args) => ({
            path: args.path,
            namespace: "island",
          }));

          // Generate hydration code for each component
          build.onLoad({ filter: /.*/, namespace: "island" }, (args) => {
            const component = components.find((c) => c.id === args.path);
            if (!component) {
              return { contents: "", loader: "js" };
            }

            return {
              contents: `import{render,createComponent}from"solid-js/web";import{deserialize}from"seroval";import C from"${component.path}";document.querySelectorAll('${component.selector}').forEach(e=>{e.innerHTML="";render(()=>createComponent(C,deserialize(e.dataset.props||"{}")),e)})`,
              loader: "js",
            };
          });

          // Transform TSX/JSX with Solid DOM mode
          build.onLoad({ filter: /\.(tsx|jsx)$/ }, async ({ path }) => {
            // Import with ? suffix to register file with bun --watch
            // Issue: https://github.com/oven-sh/bun/issues/4689
            const contents = await import(`${path}?`, {
              with: { type: "text" },
            });
            return {
              contents: await transform(contents.default, path, "dom"),
              loader: "js",
            };
          });
        },
      },
    ],
  });

  if (verbose) {
    for (const c of components) {
      const rel = relative(process.cwd(), c.path);
      console.log(`${rel} -> ${outdir}/${c.id}.js`);
    }
    console.log(`Built ${files.length} component(s) to ${outdir}/`);
  }

  if (!result.success) {
    console.error("Build failed:");
    result.logs.forEach((m) => console.error(`  ${m}`));
  }
};
