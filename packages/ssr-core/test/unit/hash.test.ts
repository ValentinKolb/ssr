import { describe, test, expect } from "bun:test";
import { hash, ISLAND_ID_LENGTH } from "../../src/island-id";

describe("hash()", () => {
  test("should return 12-character hex string", () => {
    const result = hash("test-input");
    expect(result).toHaveLength(ISLAND_ID_LENGTH);
    expect(result).toMatch(new RegExp(`^[a-f0-9]{${ISLAND_ID_LENGTH}}$`));
  });

  test("should be deterministic (same input = same hash)", () => {
    const input = "/path/to/component.tsx";
    expect(hash(input)).toBe(hash(input));
  });

  test("should produce different hashes for different inputs", () => {
    const hash1 = hash("/path/to/Counter.island.tsx");
    const hash2 = hash("/path/to/Button.island.tsx");
    expect(hash1).not.toBe(hash2);
  });
});
