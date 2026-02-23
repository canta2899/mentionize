![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

<p align="center">
    <img src="./.github/assets/logo.png" width="700"/>
</p>
<h1 align="center">
    Mentionize
</h1>

A React library for building mention inputs with support for multiple triggers, async search, and full customization. It provides a transparent textarea overlaid on a highlighted div to display mentions, and a dropdown for suggestions. With zero dependencies other than React.

## Install

```bash
npm install react
npm install react-dom

npm install mentionize
```

## Quick Start

```tsx
import { useState } from "react";
import { MentionInput } from "mentionize";
import type { MentionTrigger } from "mentionize";

const users = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
];

const userTrigger: MentionTrigger<{ id: string; name: string }> = {
  trigger: "@",
  displayText: (user) => user.name,
  serialize: (user) => `@[${user.name}](user:${user.id})`,
  pattern: /@\[([^\]]+)\]\(user:([^)]+)\)/g,
  parseMatch: (match) => ({ displayText: match[1]!, key: match[2]! }),
  options: users,
};

function App() {
  const [value, setValue] = useState("");

  return (
    <MentionInput
      triggers={[userTrigger]}
      value={value}
      onChange={setValue}
      placeholder="Type @ to mention someone..."
    />
  );
}
```

The `value` passed to `onChange` is the **serialized** form (e.g. `Hello @[Alice](user:1)`). The component handles converting between the serialized and visible representations automatically.

## API

### `MentionTrigger<T>`

Defines how a trigger character activates suggestions and how mentions are serialized/parsed.

| Property | Type | Description |
|---|---|---|
| `trigger` | `string` | Character(s) that activate the trigger (e.g. `"@"`, `"#"`) |
| `displayText` | `(item: T) => string` | Converts an item to its visible text |
| `serialize` | `(item: T) => string` | Converts an item to its serialized form in the raw value |
| `pattern` | `RegExp` | Regex to detect serialized mentions (must use global flag) |
| `parseMatch` | `(match: RegExpExecArray) => { displayText: string; key: string; item?: T }` | Parses a regex match back into display text and key. Optionally returns `item` to seed the engine cache. |
| `options?` | `T[]` | Static options array (client-side filtering) |
| `onSearch?` | `(query: string, page: number) => Promise<{ items: T[]; hasMore: boolean }>` | Async search with pagination |
| `renderOption?` | `(item: T, highlighted: boolean) => ReactNode` | Custom option rendering |
| `optionClassName?` | `string \| ((item: T) => string)` | CSS class for dropdown options, or a function for conditional styling per item |
| `renderMention?` | `(displayText: string, item?: unknown) => ReactNode` | Custom mention highlight rendering |
| `mentionClassName?` | `string \| ((mention: MentionItemData) => string)` | CSS class for highlighted mentions, or a function for conditional styling |
| `onSelect?` | `(item: T) => Promise<string \| null> \| string \| null` | Action trigger: runs instead of inserting a mention. Returns text to insert or null to cancel. |

### `MentionInputProps`

| Property | Type | Description |
|---|---|---|
| `triggers` | `MentionTrigger<any>[]` | Array of trigger configurations |
| `value?` | `string` | Controlled raw/serialized value |
| `defaultValue?` | `string` | Initial raw value (uncontrolled mode) |
| `onChange?` | `(raw: string) => void` | Called when the raw value changes |
| `onMentionsChange?` | `(mentions: ActiveMention[]) => void` | Called when active mentions change |
| `placeholder?` | `string` | Textarea placeholder |
| `disabled?` | `boolean` | Disable the input |
| `rows?` | `number` | Textarea rows (default: 4) |
| `className?` | `string` | Container className |
| `inputClassName?` | `string` | Textarea className |
| `highlighterClassName?` | `string` | Highlighter overlay className |
| `dropdownClassName?` | `string` | Dropdown className |
| `dropdownWidth?` | `number` | Dropdown width in pixels (default: 250) |
| `loadingContent?` | `ReactNode` | Content shown while loading async results (default: `"Loading..."`) |
| `renderDropdown?` | `(props: DropdownRenderProps) => ReactNode` | Full custom dropdown rendering |
| `aria-label?` | `string` | Accessible label for the textarea |
| `aria-describedby?` | `string` | ID of an element describing the textarea |

## Multiple Triggers

Pass multiple trigger configs to support different mention types:

```tsx
const userTrigger: MentionTrigger<User> = { trigger: "@", /* ... */ };
const tagTrigger: MentionTrigger<Tag> = { trigger: "#", /* ... */ };

<MentionInput triggers={[userTrigger, tagTrigger]} />
```

## Async Search with Pagination

Use `onSearch` instead of `options` for server-side search. The dropdown automatically loads more results when scrolled to the bottom.

```tsx
const trigger: MentionTrigger<User> = {
  trigger: "@",
  displayText: (user) => user.name,
  serialize: (user) => `@[${user.name}](user:${user.id})`,
  pattern: /@\[([^\]]+)\]\(user:([^)]+)\)/g,
  parseMatch: (match) => ({ displayText: match[1]!, key: match[2]! }),
  onSearch: async (query, page) => {
    const res = await fetch(`/api/users?q=${query}&page=${page}`);
    return res.json(); // { items: User[], hasMore: boolean }
  },
};
```

## Cache Seeding via `parseMatch`

By default the engine only recognizes mentions whose items are already cached (from `options`, `onSearch` results, or previous selections). When a mention is injected externally — for example by a `/` command picker or when loading initial content containing mentions for items that haven't been searched yet — the cache may not contain the underlying item, so the mention won't be highlighted or serialized.

To solve this, `parseMatch` can optionally return an `item` field. When present, the engine seeds its internal cache with that item during raw-to-visible parsing, making the mention immediately detectable:

```tsx
const modelTrigger: MentionTrigger<Model> = {
  trigger: "@",
  displayText: (model) => model.label,
  serialize: (model) => `@[${model.label}](model:${model.id})`,
  pattern: /@\[([^\]]+)\]\(model:([^)]+)\)/g,
  parseMatch: (match) => {
    const id = match[2]!;
    const label = match[1]!;
    // Look up the item from your own data source
    const cached = myModelCache.get(id);
    return {
      displayText: label,
      key: id,
      item: cached, // if defined, seeds the engine cache
    };
  },
  onSearch: async (query, page) => {
    const res = await fetch(`/api/models?q=${query}&page=${page}`);
    return res.json();
  },
};
```

This is useful when:
- A command picker (e.g. `/` trigger with `onSelect`) injects a mention into the input
- The input is initialized with raw text containing mentions for items not in `options`
- Items are known at parse time but haven't been searched via `onSearch` yet

The `item` field is optional and fully backward-compatible — existing `parseMatch` implementations that only return `displayText` and `key` continue to work unchanged.

## Headless Usage

Use `useMentionEngine` directly for full control over rendering:

```tsx
import { useMentionEngine } from "mentionize";

const engine = useMentionEngine({
  triggers: [userTrigger],
  value,
  onChange: setValue,
});

// engine.visible          - display text
// engine.mentions         - active mentions with positions
// engine.activeTrigger    - currently active trigger (or null)
// engine.filteredOptions  - filtered suggestions
// engine.handleTextChange(text, caretPos)
// engine.handleKeyDown(event, textarea)
// engine.selectOption(item, textarea)
// engine.getItemForMention(triggerChar, key) - look up cached item for a mention
```

## Styling

Mentionize uses a transparent textarea overlaid on a highlighted div. Apply styles via className props:

```tsx
<MentionInput
  className="my-container"
  inputClassName="my-textarea"
  highlighterClassName="my-highlighter"
  dropdownClassName="my-dropdown"
  triggers={[trigger]}
/>
```

### Conditional Mention Styling

Use a function for `mentionClassName` to style mentions dynamically based on the underlying item data:

```tsx
import type { MentionItemData } from "mentionize";

const userTrigger: MentionTrigger<User> = {
  trigger: "@",
  mentionClassName: (mention: MentionItemData) => {
    const user = mention.item as User;
    switch (user?.role) {
      case "Engineer": return "mention-engineer";
      case "Designer": return "mention-designer";
      case "PM":       return "mention-pm";
      default:         return "mention-user";
    }
  },
  // Apply the same conditional styling to dropdown options
  optionClassName: (user) => {
    switch (user.role) {
      case "Engineer": return "mention-engineer";
      case "Designer": return "mention-designer";
      case "PM":       return "mention-pm";
      default:         return "mention-user";
    }
  },
  // ...other config
};
```

The `MentionItemData` object contains `key`, `displayText`, `trigger`, and `item` (the original cached item). Use `optionClassName` (string or function receiving the item directly) to apply matching styles to dropdown options.

### Action Triggers

Use `onSelect` to create triggers that run an action instead of inserting a mention. The callback receives the selected item and returns a string to insert as plain text, or `null` to cancel:

```tsx
const commandTrigger: MentionTrigger<Command> = {
  trigger: "/",
  displayText: (cmd) => cmd.label,
  // serialize/pattern/parseMatch still needed for the dropdown
  serialize: (cmd) => `/[${cmd.label}](cmd:${cmd.id})`,
  pattern: /\/\[([^\]]+)\]\(cmd:([^)]+)\)/g,
  parseMatch: (match) => ({ displayText: match[1]!, key: match[2]! }),
  options: [
    { id: "date", label: "Insert Date" },
    { id: "emoji", label: "Pick Emoji" },
  ],
  onSelect: async (cmd) => {
    if (cmd.id === "date") return new Date().toLocaleDateString();
    if (cmd.id === "emoji") {
      // simulate async work
      await new Promise((r) => setTimeout(r, 500));
      return "🎉";
    }
    return null; // cancel — nothing inserted
  },
};
```

When `onSelect` is defined, selecting an option calls the function instead of inserting a mention. The trigger text and query are replaced by the returned string.

Per-trigger mention highlights can be styled via `mentionClassName`:

```tsx
const trigger: MentionTrigger<User> = {
  trigger: "@",
  mentionClassName: "mention-user",
  // ...
};
```

### Tailwind CSS

```tsx
<MentionInput
  className="relative rounded-lg border border-gray-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200"
  inputClassName="w-full border-none outline-none bg-transparent text-sm leading-relaxed"
  highlighterClassName="text-sm leading-relaxed text-gray-900"
  dropdownClassName="bg-white border border-gray-200 rounded-lg shadow-lg"
  triggers={[userTrigger, tagTrigger]}
/>
```

Style mention highlights with Tailwind by referencing a utility class in `mentionClassName`:

```tsx
const userTrigger: MentionTrigger<User> = {
  trigger: "@",
  mentionClassName: "bg-blue-100 text-blue-700 rounded px-0.5",
  // ...
};

const tagTrigger: MentionTrigger<Tag> = {
  trigger: "#",
  mentionClassName: "bg-green-100 text-green-700 rounded px-0.5",
  // ...
};
```

