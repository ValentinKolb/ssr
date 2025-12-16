import { describe, test, expect } from "bun:test";
import { hash } from "../../src/transform";

describe("hash()", () => {
  test("should return 8-character hex string", () => {
    const result = hash("test-input");
    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[a-f0-9]{8}$/);
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
