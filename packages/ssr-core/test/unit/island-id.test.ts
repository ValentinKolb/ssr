import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { islandIdFromFile, toStableKey } from "../../src/island-id";

const tempRoots: string[] = [];

const makeTempRoot = (): string => {
  const root = mkdtempSync(join(tmpdir(), "ssr-island-id-"));
  tempRoots.push(root);
  return root;
};

const writeTempFile = (path: string, contents = ""): void => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
};

afterEach(() => {
  while (tempRoots.length) {
    const root = tempRoots.pop()!;
    rmSync(root, { recursive: true, force: true });
  }
});

describe("islandIdFromFile()", () => {
  test("produces different IDs for same basename in different packages", () => {
    const root = makeTempRoot();

    const islandA = join(root, "packages", "cloud-core", "src", "Counter.island.tsx");
    const islandB = join(root, "packages", "cloud-apps", "src", "Counter.island.tsx");

    writeTempFile(islandA, "export default function CounterA(){return <div>A</div>}");
    writeTempFile(islandB, "export default function CounterB(){return <div>B</div>}");

    expect(islandIdFromFile(islandA, root)).not.toBe(islandIdFromFile(islandB, root));
  });

  test("stays stable across different absolute roots with same relative layout", () => {
    const rootA = makeTempRoot();
    const rootB = makeTempRoot();

    const relIslandPath = join("packages", "shared", "src", "Status.island.tsx");
    const islandA = join(rootA, relIslandPath);
    const islandB = join(rootB, relIslandPath);

    writeTempFile(islandA, "export default function Status(){return <div>ok</div>}");
    writeTempFile(islandB, "export default function Status(){return <div>ok</div>}");

    expect(toStableKey(islandA, rootA)).toBe(toStableKey(islandB, rootB));
    expect(islandIdFromFile(islandA, rootA)).toBe(islandIdFromFile(islandB, rootB));
  });
});
