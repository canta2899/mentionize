import { useState } from "react";
import { MentionInput } from "../src/index.ts";
import type { ActiveMention, MentionTrigger } from "../src/types.ts";
import { TAGS, USERS, searchUsers } from "./mock-data.ts";
import type { Tag, User } from "./mock-data.ts";

// --- Trigger configs ---

const userTrigger: MentionTrigger<User> = {
  trigger: "@",
  displayText: (user) => user.name,
  serialize: (user) => `@[${user.name}](user:${user.id})`,
  pattern: /@\[([^\]]+)\]\(user:([^)]+)\)/g,
  parseMatch: (match) => ({
    displayText: match[1]!,
    key: match[2]!,
  }),
  options: USERS,
  mentionClassName: "mention-user",
  renderOption: (user, highlighted) => (
    <div
      style={{
        padding: "8px 12px",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: highlighted ? "#3a3a4a" : "transparent",
      }}
    >
      <span style={{ fontWeight: 500 }}>{user.name}</span>
      <span style={{ fontSize: "0.8em", opacity: 0.6 }}>{user.role}</span>
    </div>
  ),
};

const tagTrigger: MentionTrigger<Tag> = {
  trigger: "#",
  displayText: (tag) => tag.label,
  serialize: (tag) => `#[${tag.label}](tag:${tag.id})`,
  pattern: /#\[([^\]]+)\]\(tag:([^)]+)\)/g,
  parseMatch: (match) => ({
    displayText: match[1]!,
    key: match[2]!,
  }),
  options: TAGS,
  mentionClassName: "mention-tag",
  renderOption: (tag, highlighted) => (
    <div
      style={{
        padding: "8px 12px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
        backgroundColor: highlighted ? "#3a3a4a" : "transparent",
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          backgroundColor: tag.color,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      <span>{tag.label}</span>
    </div>
  ),
};

const asyncUserTrigger: MentionTrigger<User> = {
  trigger: "@",
  displayText: (user) => user.name,
  serialize: (user) => `@[${user.name}](user:${user.id})`,
  pattern: /@\[([^\]]+)\]\(user:([^)]+)\)/g,
  parseMatch: (match) => ({
    displayText: match[1]!,
    key: match[2]!,
  }),
  onSearch: searchUsers,
  mentionClassName: "mention-user",
  renderOption: (user, highlighted) => (
    <div
      style={{
        padding: "8px 12px",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: highlighted ? "#3a3a4a" : "transparent",
      }}
    >
      <span style={{ fontWeight: 500 }}>{user.name}</span>
      <span style={{ fontSize: "0.8em", opacity: 0.6 }}>{user.role}</span>
    </div>
  ),
};

export function DemoApp() {
  const [rawValue1, setRawValue1] = useState(""); const [mentions1, setMentions1] = useState<ActiveMention[]>([]);
  const [rawValue2, setRawValue2] = useState("");

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Mentionize</h1>
      <p style={{ opacity: 0.6, marginTop: 0, marginBottom: "2rem" }}>
        A dependency-free React mention input library
      </p>

      <section style={{ marginBottom: "3rem" }}>
        <h2>Static Options</h2>
        <p style={{ opacity: 0.7, fontSize: "0.9em" }}>
          Type <code>@</code> for users, <code>#</code> for tags. Keyboard
          navigation with Arrow keys, Enter to select, Escape to close.
        </p>
        <MentionInput
          triggers={[userTrigger, tagTrigger]}
          value={rawValue1}
          onChange={setRawValue1}
          onMentionsChange={setMentions1}
          placeholder="Try typing @Alice or #bug..."
          rows={4}
          className="mentionize-container"
          inputClassName="mentionize-textarea"
          highlighterClassName="mentionize-highlighter"
          dropdownClassName="mentionize-dropdown"
        />

        <details style={{ marginTop: "1rem" }}>
          <summary style={{ cursor: "pointer", opacity: 0.7 }}>
            Raw value
          </summary>
          <pre
            style={{
              background: "#1a1a2e",
              padding: "0.75rem",
              borderRadius: 8,
              fontSize: "0.85em",
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {rawValue1 || "(empty)"}
          </pre>
        </details>

        <details style={{ marginTop: "0.5rem" }}>
          <summary style={{ cursor: "pointer", opacity: 0.7 }}>
            Active mentions ({mentions1.length})
          </summary>
          <pre
            style={{
              background: "#1a1a2e",
              padding: "0.75rem",
              borderRadius: 8,
              fontSize: "0.85em",
              overflow: "auto",
            }}
          >
            {JSON.stringify(mentions1, null, 2)}
          </pre>
        </details>
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h2>Async Paginated Search</h2>
        <p style={{ opacity: 0.7, fontSize: "0.9em" }}>
          Type <code>@</code> to search from 100 simulated users. Scroll the
          dropdown to load more.
        </p>
        <MentionInput
          triggers={[asyncUserTrigger, tagTrigger]}
          value={rawValue2}
          onChange={setRawValue2}
          placeholder="Type @ to search users (async)..."
          rows={4}
          className="mentionize-container"
          inputClassName="mentionize-textarea"
          highlighterClassName="mentionize-highlighter"
          dropdownClassName="mentionize-dropdown"
        />

        <details style={{ marginTop: "1rem" }}>
          <summary style={{ cursor: "pointer", opacity: 0.7 }}>
            Raw value
          </summary>
          <pre
            style={{
              background: "#1a1a2e",
              padding: "0.75rem",
              borderRadius: 8,
              fontSize: "0.85em",
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {rawValue2 || "(empty)"}
          </pre>
        </details>
      </section>

      <section>
        <h2>Pre-populated Controlled Value</h2>
        <p style={{ opacity: 0.7, fontSize: "0.9em" }}>
          Initialized with a raw value containing serialized mentions.
        </p>
        <MentionInput
          triggers={[userTrigger, tagTrigger]}
          defaultValue="Hello @[Alice Johnson](user:u1), please look at #[bug](tag:t1) when you can."
          placeholder="Pre-populated..."
          rows={3}
          className="mentionize-container"
          inputClassName="mentionize-textarea"
          highlighterClassName="mentionize-highlighter"
          dropdownClassName="mentionize-dropdown"
        />
      </section>
    </div>
  );
}
