/**
 * Babel transform for SSR - wraps island/client components in custom elements
 * with serialized props. Handles both SSR (server) and DOM (client) modes.
 */
import { transformAsync, types as t } from "@babel/core";
// @ts-ignore - no types are available for this package
import solidPreset from "babel-preset-solid";
// @ts-ignore - no types are available for this package
import tsPreset from "@babel/preset-typescript";
import { join, dirname } from "path";

// ============================================================================
// Helpers
// ============================================================================

export const hash = (s: string) =>
  new Bun.CryptoHasher("md5").update(s).digest("hex").slice(0, 8);

// JSX AST helpers
const jsx = (tag: string, attrs: any[], children: any[] = []) =>
  t.jsxElement(
    t.jsxOpeningElement(t.jsxIdentifier(tag), attrs, children.length === 0),
    children.length ? t.jsxClosingElement(t.jsxIdentifier(tag)) : null,
    children,
    children.length === 0,
  );

const attr = (name: string, value: any) =>
  t.jsxAttribute(
    t.jsxIdentifier(name),
    typeof value === "string"
      ? t.stringLiteral(value)
      : t.jsxExpressionContainer(value),
  );

// ============================================================================
// Babel Plugin - Wraps island/client components
// ============================================================================

type ComponentType = "island" | "client";

const getComponentType = (path: string): ComponentType | null =>
  path.includes(".island")
    ? "island"
    : path.includes(".client")
      ? "client"
      : null;

const componentWrapperPlugin = (filename: string, dev: boolean) => {
  const parentType = getComponentType(filename);

  return {
    visitor: {
      Program(programPath: any) {
        const componentImports = new Map<
          string,
          { path: string; type: ComponentType }
        >();

        // Inject seroval serialize helper at the top
        programPath.node.body.unshift(
          t.importDeclaration(
            [
              t.importSpecifier(
                t.identifier("serialize"),
                t.identifier("serialize"),
              ),
            ],
            t.stringLiteral("seroval"),
          ),
          t.variableDeclaration("const", [
            t.variableDeclarator(
              t.identifier("__seroval_serialize"),
              t.identifier("serialize"),
            ),
          ]),
        );

        programPath.traverse({
          ImportDeclaration(path: any) {
            const source: string = path.node.source.value;
            const type = getComponentType(source);
            if (!type) return;

            if (parentType) {
              console.warn(
                `[ssr] Warning: ${parentType} imports ${type} (${source}) - nested islands/clients are not supported`,
              );
            }

            const spec = path.node.specifiers.find(
              (s: any) => s.type === "ImportDefaultSpecifier",
            );
            if (!spec) return;

            let absPath = source.startsWith(".")
              ? join(dirname(filename), source)
              : source;
            if (!absPath.match(/\.(tsx|jsx|ts|js)$/)) absPath += ".tsx";

            componentImports.set(spec.local.name, { path: absPath, type });
          },

          JSXElement(path: any) {
            const name = path.node.openingElement.name.name;
            const component = componentImports.get(name);
            if (!component) return;

            const id = hash(component.path);
            const wrapperTag =
              component.type === "island" ? "solid-island" : "solid-client";

            const props = t.objectExpression(
              path.node.openingElement.attributes
                .filter((a: any) => a.type === "JSXAttribute")
                .map((a: any) =>
                  t.objectProperty(
                    t.identifier(a.name.name),
                    a.value?.type === "JSXExpressionContainer"
                      ? a.value.expression
                      : a.value || t.booleanLiteral(true),
                  ),
                ),
            );

            // For islands: wrap the component, for client: empty wrapper (no SSR)
            const children = component.type === "island" ? [path.node] : [];

            // Extract filename from path (e.g., "Counter.island.tsx")
            const file = component.path.split("/").pop() || "";

            const attrs = [
              attr("data-id", id),
              attr(
                "data-props",
                t.callExpression(t.identifier("__seroval_serialize"), [props]),
              ),
            ];

            // Add file attribute in dev mode
            if (dev) {
              attrs.push(attr("data-file", file));
            }

            const wrapper = jsx(wrapperTag, attrs, children);

            path.replaceWith(wrapper);
            path.skip();
          },
        });
      },
    },
  };
};

// ============================================================================
// Transform function
// ============================================================================

export const transform = async (
  source: string,
  filename: string,
  mode: "ssr" | "dom",
  dev: boolean = false,
): Promise<string> => {
  let code = source;

  if (mode === "ssr") {
    const result = await transformAsync(code, {
      filename,
      parserOpts: { plugins: ["jsx", "typescript"] },
      plugins: [() => componentWrapperPlugin(filename, dev)],
    });
    code = result?.code || code;
  }

  const result = await transformAsync(code, {
    filename,
    presets: [
      [tsPreset, {}],
      [solidPreset, { generate: mode, hydratable: false }],
    ],
  });

  if (!result?.code) throw new Error(`Transform failed: ${filename}`);
  return result.code;
};
