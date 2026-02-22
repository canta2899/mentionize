import { test, expect, describe } from "bun:test";
import { escapeRegex } from "../src/utils.ts";

describe("escapeRegex", () => {
  test("escapes regex special characters", () => {
    expect(escapeRegex("hello.world*foo+bar?")).toBe(
      "hello\\.world\\*foo\\+bar\\?"
    );
  });

  test("escapes brackets and parens", () => {
    expect(escapeRegex("[test](value)")).toBe("\\[test\\]\\(value\\)");
  });

  test("leaves alphanumeric unchanged", () => {
    expect(escapeRegex("abc123")).toBe("abc123");
  });
});
