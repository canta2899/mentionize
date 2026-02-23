import { test, expect, describe } from "bun:test";
import type { MentionTrigger, MentionItemData } from "../src/types.ts";

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

describe("conditional mentionClassName", () => {
  test("string mentionClassName returns the string", () => {
    const trigger: MentionTrigger<{ id: string; name: string }> = {
      ...userTrigger,
      mentionClassName: "my-class",
    };
    expect(trigger.mentionClassName).toBe("my-class");
  });

  test("function mentionClassName is called with MentionItemData", () => {
    const calls: MentionItemData[] = [];
    const trigger: MentionTrigger<{ id: string; name: string; role: string }> = {
      trigger: "@",
      displayText: (u) => u.name,
      serialize: (u) => `@[${u.name}](user:${u.id})`,
      pattern: /@\[([^\]]+)\]\(user:([^)]+)\)/g,
      parseMatch: (m) => ({ displayText: m[1]!, key: m[2]! }),
      options: [
        { id: "u1", name: "Alice", role: "Engineer" },
      ],
      mentionClassName: (mention) => {
        calls.push(mention);
        const user = mention.item as { role: string } | null;
        return user?.role === "Engineer" ? "mention-engineer" : "mention-default";
      },
    };

    const fn = trigger.mentionClassName as (mention: MentionItemData) => string;
    const result = fn({
      key: "u1",
      displayText: "Alice",
      trigger: "@",
      item: { id: "u1", name: "Alice", role: "Engineer" },
    });
    expect(result).toBe("mention-engineer");
    expect(calls).toHaveLength(1);
    expect(calls[0]!.key).toBe("u1");
  });

  test("function mentionClassName returns default for unknown role", () => {
    const fn = (mention: MentionItemData) => {
      const user = mention.item as { role: string } | null;
      return user?.role === "Engineer" ? "mention-engineer" : "mention-default";
    };

    const result = fn({
      key: "u2",
      displayText: "Bob",
      trigger: "@",
      item: { id: "u2", name: "Bob", role: "Designer" },
    });
    expect(result).toBe("mention-default");
  });
});

describe("action trigger onSelect", () => {
  const commandTrigger: MentionTrigger<{ id: string; label: string }> = {
    trigger: "/",
    displayText: (cmd) => cmd.label,
    serialize: (cmd) => `/[${cmd.label}](cmd:${cmd.id})`,
    pattern: /\/\[([^\]]+)\]\(cmd:([^)]+)\)/g,
    parseMatch: (m) => ({ displayText: m[1]!, key: m[2]! }),
    options: [
      { id: "c1", label: "Insert Date" },
      { id: "c2", label: "Cancel" },
    ],
    onSelect: (cmd) => {
      if (cmd.id === "c1") return "2026-02-23";
      return null;
    },
  };

  test("onSelect returning a string provides text to insert", () => {
    const result = commandTrigger.onSelect!({ id: "c1", label: "Insert Date" });
    expect(result).toBe("2026-02-23");
  });

  test("onSelect returning null indicates cancellation", () => {
    const result = commandTrigger.onSelect!({ id: "c2", label: "Cancel" });
    expect(result).toBeNull();
  });

  test("async onSelect resolves to a string", async () => {
    const asyncTrigger: MentionTrigger<{ id: string; label: string }> = {
      ...commandTrigger,
      onSelect: async (cmd) => {
        await new Promise((r) => setTimeout(r, 10));
        return cmd.id === "c1" ? "async-result" : null;
      },
    };

    const result = await asyncTrigger.onSelect!({ id: "c1", label: "Insert Date" });
    expect(result).toBe("async-result");
  });

  test("async onSelect resolves to null for cancellation", async () => {
    const asyncTrigger: MentionTrigger<{ id: string; label: string }> = {
      ...commandTrigger,
      onSelect: async () => {
        await new Promise((r) => setTimeout(r, 10));
        return null;
      },
    };

    const result = await asyncTrigger.onSelect!({ id: "c2", label: "Cancel" });
    expect(result).toBeNull();
  });
});

describe("parseMatch item seeding", () => {
  test("parseMatch can return an item field", () => {
    const trigger: MentionTrigger<{ id: string; name: string }> = {
      trigger: "@",
      displayText: (u) => u.name,
      serialize: (u) => `@[${u.name}](user:${u.id})`,
      pattern: /@\[([^\]]+)\]\(user:([^)]+)\)/g,
      parseMatch: (m) => ({
        displayText: m[1]!,
        key: m[2]!,
        item: { id: m[2]!, name: m[1]! },
      }),
      options: [],
    };

    const re = new RegExp(trigger.pattern.source, "g");
    const match = re.exec("@[Charlie](user:u3)");
    expect(match).not.toBeNull();
    const parsed = trigger.parseMatch(match!);
    expect(parsed.displayText).toBe("Charlie");
    expect(parsed.key).toBe("u3");
    expect(parsed.item).toEqual({ id: "u3", name: "Charlie" });
  });

  test("parseMatch without item field still works", () => {
    const parsed = userTrigger.parseMatch(
      new RegExp(userTrigger.pattern.source, "g").exec(
        "@[Alice Johnson](user:u1)",
      )!,
    );
    expect(parsed.displayText).toBe("Alice Johnson");
    expect(parsed.key).toBe("u1");
    expect(parsed.item).toBeUndefined();
  });

  test("rawToVisible with item-returning parseMatch seeds cache for detection", () => {
    // Trigger with no static options but parseMatch returns items
    const trigger: MentionTrigger<{ id: string; name: string }> = {
      trigger: "@",
      displayText: (u) => u.name,
      serialize: (u) => `@[${u.name}](user:${u.id})`,
      pattern: /@\[([^\]]+)\]\(user:([^)]+)\)/g,
      parseMatch: (m) => ({
        displayText: m[1]!,
        key: m[2]!,
        item: { id: m[2]!, name: m[1]! },
      }),
    };

    // rawToVisible should produce the same visible text regardless of item
    const raw = "Hello @[Charlie](user:u3), welcome!";
    const visible = rawToVisible(raw, [trigger]);
    expect(visible).toBe("Hello @Charlie, welcome!");
  });
});
