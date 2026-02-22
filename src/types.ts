import type React from "react";

export interface MentionTrigger<T = unknown> {
  /** The character(s) that activate this trigger (e.g., "@", "#") */
  trigger: string;
  /** Convert a selected option to its display text in the input */
  displayText: (item: T) => string;
  /** Convert a selected option to its serialized form in the raw value */
  serialize: (item: T) => string;
  /** Regex to detect serialized mentions in raw text. Must use global flag. */
  pattern: RegExp;
  /** Parse a regex match back into display text and a unique key */
  parseMatch: (match: RegExpExecArray) => { displayText: string; key: string };
  /** Static options array */
  options?: T[];
  /** Async search fetcher with pagination */
  onSearch?: (
    query: string,
    page: number
  ) => Promise<{ items: T[]; hasMore: boolean }>;
  /** Custom option rendering */
  renderOption?: (
    item: T,
    highlighted: boolean
  ) => React.ReactNode;
  /** Custom mention highlight rendering */
  renderMention?: (displayText: string) => React.ReactNode;
  /** CSS class for highlighted mentions in the overlay */
  mentionClassName?: string;
}

export interface MentionInputProps {
  triggers: MentionTrigger<any>[];
  /** Raw/serialized value (controlled mode) */
  value?: string;
  /** Initial raw value (uncontrolled mode) */
  defaultValue?: string;
  onChange?: (raw: string) => void;
  onMentionsChange?: (mentions: ActiveMention[]) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  /** Container className */
  className?: string;
  /** Textarea className */
  inputClassName?: string;
  /** Highlighter overlay className */
  highlighterClassName?: string;
  /** Dropdown container className */
  dropdownClassName?: string;
  /** Dropdown width in pixels */
  dropdownWidth?: number;
  /** Full custom dropdown rendering */
  renderDropdown?: (props: DropdownRenderProps) => React.ReactNode;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

export interface ActiveMention {
  trigger: string;
  displayText: string;
  /** Unique identifier extracted from serialized form */
  key: string;
  /** Start position in visible text */
  start: number;
  /** End position in visible text */
  end: number;
}

export interface DropdownRenderProps {
  items: unknown[];
  highlightedIndex: number;
  onSelect: (item: unknown) => void;
  onHighlight: (index: number) => void;
  loading: boolean;
  onLoadMore?: () => void;
}

export interface CaretPosition {
  top: number;
  left: number;
}
