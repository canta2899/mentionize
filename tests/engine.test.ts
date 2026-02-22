import { test, expect, describe } from "bun:test";
import type { MentionTrigger } from "../src/types.ts";

const userTrigger: MentionTrigger<{ id: string; name: string }> = {
  trigger: "@",
  displayText: (u) => u.name,
  serialize: (u) => `@[${u.name}](user:${u.id})`,
  pattern: /@\[([^\]]+)\]\(user:([^)]+)\)/g,
  parseMatch: (m) => ({ displayText: m[1]!, key: m[2]! }),
  options: [
    { id: "u1", name: "Alice Johnson" },
    { id: "u2", name: "Bob Smith" },
  ],
};

const tagTrigger: MentionTrigger<{ id: string; label: string }> = {
  trigger: "#",
  displayText: (t) => t.label,
  serialize: (t) => `#[${t.label}](tag:${t.id})`,
  pattern: /#\[([^\]]+)\]\(tag:([^)]+)\)/g,
  parseMatch: (m) => ({ displayText: m[1]!, key: m[2]! }),
  options: [
    { id: "t1", label: "bug" },
    { id: "t2", label: "feature" },
  ],
};

function rawToVisible(raw: string, triggers: MentionTrigger<any>[]): string {
  let result = raw;
  for (const t of triggers) {
    const globalRe = new RegExp(
      t.pattern.source,
      t.pattern.flags.includes("g") ? t.pattern.flags : t.pattern.flags + "g",
    );
    const parts: string[] = [];
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    globalRe.lastIndex = 0;
    while ((m = globalRe.exec(result)) !== null) {
      parts.push(result.slice(lastIndex, m.index));
      const parsed = t.parseMatch(m);
      parts.push(t.trigger + parsed.displayText);
      lastIndex = m.index + m[0].length;
    }
    parts.push(result.slice(lastIndex));
    result = parts.join("");
  }
  return result;
}

describe("rawToVisible", () => {
  test("converts user mention raw to visible", () => {
    const raw = "Hello @[Alice Johnson](user:u1), how are you?";
    const visible = rawToVisible(raw, [userTrigger]);
    expect(visible).toBe("Hello @Alice Johnson, how are you?");
  });

  test("converts tag mention raw to visible", () => {
    const raw = "Fix #[bug](tag:t1) please";
    const visible = rawToVisible(raw, [tagTrigger]);
    expect(visible).toBe("Fix #bug please");
  });

  test("converts multiple triggers", () => {
    const raw =
      "Hey @[Alice Johnson](user:u1), check #[bug](tag:t1) and #[feature](tag:t2)";
    const visible = rawToVisible(raw, [userTrigger, tagTrigger]);
    expect(visible).toBe("Hey @Alice Johnson, check #bug and #feature");
  });

  test("returns plain text unchanged", () => {
    const raw = "no mentions here";
    const visible = rawToVisible(raw, [userTrigger, tagTrigger]);
    expect(visible).toBe("no mentions here");
  });

  test("handles empty string", () => {
    expect(rawToVisible("", [userTrigger])).toBe("");
  });

  test("handles multiple mentions of same type", () => {
    const raw = "@[Alice Johnson](user:u1) and @[Bob Smith](user:u2) are here";
    const visible = rawToVisible(raw, [userTrigger]);
    expect(visible).toBe("@Alice Johnson and @Bob Smith are here");
  });
});

describe("pattern matching", () => {
  test("user pattern matches serialized form", () => {
    const re = new RegExp(userTrigger.pattern.source, "g");
    const match = re.exec("@[Alice Johnson](user:u1)");
    expect(match).not.toBeNull();
    const parsed = userTrigger.parseMatch(match!);
    expect(parsed.displayText).toBe("Alice Johnson");
    expect(parsed.key).toBe("u1");
  });

  test("tag pattern matches serialized form", () => {
    const re = new RegExp(tagTrigger.pattern.source, "g");
    const match = re.exec("#[bug](tag:t1)");
    expect(match).not.toBeNull();
    const parsed = tagTrigger.parseMatch(match!);
    expect(parsed.displayText).toBe("bug");
    expect(parsed.key).toBe("t1");
  });

  test("pattern does not match plain text", () => {
    const re = new RegExp(userTrigger.pattern.source, "g");
    const match = re.exec("Hello @Alice Johnson");
    expect(match).toBeNull();
  });
});
