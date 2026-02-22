# Mentionize

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
| `parseMatch` | `(match: RegExpExecArray) => { displayText: string; key: string }` | Parses a regex match back into display text and key |
| `options?` | `T[]` | Static options array (client-side filtering) |
| `onSearch?` | `(query: string, page: number) => Promise<{ items: T[]; hasMore: boolean }>` | Async search with pagination |
| `renderOption?` | `(item: T, highlighted: boolean) => ReactNode` | Custom option rendering |
| `renderMention?` | `(displayText: string) => ReactNode` | Custom mention highlight rendering |
| `mentionClassName?` | `string` | CSS class for highlighted mentions in the overlay |

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
| `renderDropdown?` | `(props: DropdownRenderProps) => ReactNode` | Full custom dropdown rendering |

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

## Headless Usage

Use `useMentionEngine` directly for full control over rendering:

```tsx
import { useMentionEngine } from "mentionize";

const engine = useMentionEngine({
  triggers: [userTrigger],
  value,
  onChange: setValue,
});

// engine.visible        - display text
// engine.mentions       - active mentions with positions
// engine.activeTrigger  - currently active trigger (or null)
// engine.filteredOptions - filtered suggestions
// engine.handleTextChange(text, caretPos)
// engine.handleKeyDown(event, textarea)
// engine.selectOption(item, textarea)
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

