import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActiveMention, MentionTrigger } from "./types.ts";
import { escapeRegex } from "./utils.ts";

interface ActiveTriggerState {
  trigger: MentionTrigger<any>;
  query: string;
  startPos: number; // where the trigger character is in the visible text
}

interface SearchState {
  items: unknown[];
  page: number;
  hasMore: boolean;
  loading: boolean;
}

interface MentionEngineOptions {
  triggers: MentionTrigger<any>[];
  value?: string;
  defaultValue?: string;
  onChange?: (raw: string) => void;
  onMentionsChange?: (mentions: ActiveMention[]) => void;
}

// Detect mentions in visible text
function detectMentionsInText(
  visibleText: string,
  triggers: MentionTrigger<any>[],
  getCache: (triggerChar: string) => Map<string, unknown>,
): ActiveMention[] {
  const all: ActiveMention[] = [];

  for (const t of triggers) {
    const triggerChar = t.trigger;
    if (!visibleText.includes(triggerChar)) continue;

    const cache = getCache(triggerChar);
    const knownItems: { displayText: string; key: string; item: unknown }[] =
      [];

    if (t.options) {
      for (const item of t.options) {
        knownItems.push({
          displayText: t.displayText(item),
          key: getItemKey(t, item),
          item,
        });
      }
    }

    for (const [key, item] of cache.entries()) {
      if (item !== null) {
        const dt = t.displayText(item);
        if (!knownItems.some((k) => k.key === key)) {
          knownItems.push({ displayText: dt, key, item });
        }
      }
    }

    if (!knownItems.length) continue;

    const compiled = knownItems.map((ki) => {
      const pat = "^" + escapeRegex(ki.displayText).replace(/\s+/g, "\\s+");
      return { ...ki, re: new RegExp(pat, "i") };
    });

    const positions: number[] = [];
    let idx = visibleText.indexOf(triggerChar);
    while (idx !== -1) {
      positions.push(idx);
      idx = visibleText.indexOf(triggerChar, idx + 1);
    }

    const candidates: ActiveMention[] = [];
    for (const pos of positions) {
      const after = visibleText.slice(pos + triggerChar.length);
      for (const c of compiled) {
        const match = c.re.exec(after);
        if (!match) continue;
        const matched = match[0];
        const end = pos + triggerChar.length + matched.length;
        const next = visibleText[end];
        if (next && !/[\s,.:;!?)}\]]/.test(next)) continue;
        candidates.push({
          trigger: triggerChar,
          displayText: matched,
          key: c.key,
          start: pos,
          end,
        });
      }
    }

    candidates.sort((a, b) =>
      a.start !== b.start
        ? a.start - b.start
        : b.end - b.start - (a.end - a.start),
    );
    for (const c of candidates) {
      const overlaps = all.some(
        (f) => Math.max(f.start, c.start) < Math.min(f.end, c.end),
      );
      if (!overlaps) all.push(c);
    }
  }

  return all;
}

// Shallow-compare two mention arrays
function mentionsEqual(a: ActiveMention[], b: ActiveMention[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i]!;
    const bi = b[i]!;
    if (ai.start !== bi.start || ai.end !== bi.end || ai.key !== bi.key)
      return false;
  }
  return true;
}

export function useMentionEngine(options: MentionEngineOptions) {
  const {
    triggers,
    value: controlledValue,
    defaultValue,
    onChange,
    onMentionsChange,
  } = options;

  const lastRawRef = useRef(controlledValue ?? defaultValue ?? "");
  const suppressEmitRef = useRef(false);
  const caretPosRef = useRef<number | null>(null);
  const prevMentionsRef = useRef<ActiveMention[]>([]);

  // Known items cache
  const cacheRef = useRef<Map<string, Map<string, unknown>>>(new Map());

  function getCache(triggerChar: string): Map<string, unknown> {
    let map = cacheRef.current.get(triggerChar);
    if (!map) {
      map = new Map();
      cacheRef.current.set(triggerChar, map);
    }
    return map;
  }

  // Populate cache from static options
  useEffect(() => {
    for (const t of triggers) {
      if (t.options) {
        const cache = getCache(t.trigger);
        for (const item of t.options) {
          const serialized = t.serialize(item);
          // Extract key by running pattern on the serialized form
          const re = new RegExp(
            t.pattern.source,
            t.pattern.flags.replace("g", ""),
          );
          const m = re.exec(serialized);
          if (m) {
            const { key } = t.parseMatch(m);
            cache.set(key, item);
          }
        }
      }
    }
  }, [triggers]);

  // Convert raw to visible text
  const rawToVisible = useCallback(
    (raw: string): string => {
      let result = raw;
      for (const t of triggers) {
        const globalRe = new RegExp(
          t.pattern.source,
          t.pattern.flags.includes("g")
            ? t.pattern.flags
            : t.pattern.flags + "g",
        );
        const parts: string[] = [];
        let lastIndex = 0;
        let m: RegExpExecArray | null;
        globalRe.lastIndex = 0;
        while ((m = globalRe.exec(result)) !== null) {
          parts.push(result.slice(lastIndex, m.index));
          const parsed = t.parseMatch(m);
          // Cache the item data from the match
          const cache = getCache(t.trigger);
          // placeholder for unmatched items
          if (!cache.has(parsed.key)) {
            cache.set(parsed.key, null);
          }
          parts.push(t.trigger + parsed.displayText);
          lastIndex = m.index + m[0].length;
          if (!t.pattern.flags.includes("g")) break;
        }
        parts.push(result.slice(lastIndex));
        result = parts.join("");
      }
      return result;
    },
    [triggers],
  );

  // Initialize visible text from raw
  const [visible, setVisible] = useState<string>(() =>
    rawToVisible(controlledValue ?? defaultValue ?? ""),
  );

  // Detect mentions in visible text
  const mentions: ActiveMention[] = useMemo(() => {
    const newMentions = detectMentionsInText(visible, triggers, getCache);
    if (mentionsEqual(prevMentionsRef.current, newMentions)) {
      return prevMentionsRef.current;
    }
    prevMentionsRef.current = newMentions;
    return newMentions;
  }, [visible, triggers]);

  // Build raw value from visible + mentions
  const visibleToRaw = useCallback(
    (vis: string, mentionsList: ActiveMention[]): string => {
      if (!mentionsList.length) return vis;
      const ordered = mentionsList.slice().sort((a, b) => a.start - b.start);
      let raw = "";
      let last = 0;
      for (const m of ordered) {
        raw += vis.slice(last, m.start);
        // Find the trigger config and the cached item
        const t = triggers.find((tr) => tr.trigger === m.trigger);
        if (t) {
          const cache = getCache(t.trigger);
          const item = cache.get(m.key);
          if (item !== null && item !== undefined) {
            raw += t.serialize(item);
          } else {
            raw += vis.slice(m.start, m.end);
          }
        } else {
          raw += vis.slice(m.start, m.end);
        }
        last = m.end;
      }
      raw += vis.slice(last);
      return raw;
    },
    [triggers],
  );

  // Synchronously emit raw value + mentions after visible text changes
  const emitSync = useCallback(
    (newVisible: string) => {
      const newMentions = detectMentionsInText(newVisible, triggers, getCache);

      if (!mentionsEqual(prevMentionsRef.current, newMentions)) {
        prevMentionsRef.current = newMentions;
      }

      const raw = visibleToRaw(newVisible, prevMentionsRef.current);
      if (raw !== lastRawRef.current) {
        lastRawRef.current = raw;
        onChange?.(raw);
      }
      onMentionsChange?.(prevMentionsRef.current);
    },
    [triggers, visibleToRaw, onChange, onMentionsChange],
  );

  useEffect(() => {
    if (controlledValue === undefined) return;
    if (controlledValue === lastRawRef.current) return;
    lastRawRef.current = controlledValue;
    suppressEmitRef.current = true;
    setVisible(rawToVisible(controlledValue));
  }, [controlledValue, rawToVisible]);

  const [activeTrigger, setActiveTrigger] = useState<ActiveTriggerState | null>(
    null,
  );
  const [searchState, setSearchState] = useState<SearchState>({
    items: [],
    page: 0,
    hasMore: false,
    loading: false,
  });
  const [highlightIndex, setHighlightIndex] = useState(0);
  const searchAbortRef = useRef<AbortController | null>(null);

  const detectActiveTrigger = useCallback(
    (text: string, caretPos: number): ActiveTriggerState | null => {
      // Look backwards from caret for any trigger character
      const prefix = text.slice(0, caretPos);
      for (const t of triggers) {
        const triggerChar = t.trigger;
        // Find the last occurrence of trigger char before caret
        const re = new RegExp(
          escapeRegex(triggerChar) +
            "([^\\n" +
            escapeRegex(triggerChar) +
            "]*)$",
        );
        const match = re.exec(prefix);
        if (match && match[1] !== undefined) {
          const query = match[1];
          // Don't activate if query contains whitespace (user moved on)
          if (/\s/.test(query)) continue;
          return {
            trigger: t,
            query,
            startPos: match.index,
          };
        }
      }
      return null;
    },
    [triggers],
  );

  // Get filtered options for current trigger
  const filteredOptions = useMemo(() => {
    if (!activeTrigger) return [];
    const t = activeTrigger.trigger;
    const q = activeTrigger.query.toLowerCase();

    if (t.onSearch) {
      // Async mode returns search state items
      return searchState.items;
    }

    if (t.options) {
      if (!q) return t.options;
      return t.options.filter((item) =>
        t.displayText(item).toLowerCase().includes(q),
      );
    }

    return [];
  }, [activeTrigger, searchState.items]);

  useEffect(() => {
    if (!activeTrigger?.trigger.onSearch) return;

    const t = activeTrigger.trigger;
    const query = activeTrigger.query;

    // Abort previous search
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setSearchState((s) => ({ ...s, loading: true, page: 0 }));

    const timer = setTimeout(async () => {
      try {
        const result = await t.onSearch!(query, 0);
        if (controller.signal.aborted) return;
        setSearchState({
          items: result.items,
          page: 0,
          hasMore: result.hasMore,
          loading: false,
        });
      } catch {
        if (controller.signal.aborted) return;
        setSearchState((s) => ({ ...s, loading: false }));
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [activeTrigger?.trigger, activeTrigger?.query]);

  const loadMore = useCallback(async () => {
    if (
      !activeTrigger?.trigger.onSearch ||
      searchState.loading ||
      !searchState.hasMore
    )
      return;

    const t = activeTrigger.trigger;
    const nextPage = searchState.page + 1;
    setSearchState((s) => ({ ...s, loading: true }));

    try {
      const result = await t.onSearch!(activeTrigger.query, nextPage);
      setSearchState((s) => ({
        items: [...s.items, ...result.items],
        page: nextPage,
        hasMore: result.hasMore,
        loading: false,
      }));
    } catch {
      setSearchState((s) => ({ ...s, loading: false }));
    }
  }, [activeTrigger, searchState]);

  // Handle text change from textarea
  const handleTextChange = useCallback(
    (newText: string, caretPos: number) => {
      caretPosRef.current = caretPos;
      setVisible(newText);
      emitSync(newText);
      const detected = detectActiveTrigger(newText, caretPos);
      if (detected) {
        setActiveTrigger(detected);
        setHighlightIndex(0);
      } else {
        setActiveTrigger(null);
      }
    },
    [detectActiveTrigger, emitSync],
  );

  // Select an option from the dropdown
  const selectOption = useCallback(
    (item: unknown, textarea: HTMLTextAreaElement) => {
      if (!activeTrigger) return;
      const t = activeTrigger.trigger;

      // Add to cache
      const cache = getCache(t.trigger);
      const key = getItemKey(t, item);
      cache.set(key, item);

      const displayText = t.displayText(item);
      const mentionText = t.trigger + displayText;

      const before = visible.slice(0, activeTrigger.startPos);
      const after = visible.slice(textarea.selectionStart);
      const newVis = before + mentionText + " " + after;

      const pos = before.length + mentionText.length + 1;
      caretPosRef.current = pos;
      setVisible(newVis);
      emitSync(newVis);
      setActiveTrigger(null);
    },
    [activeTrigger, visible, emitSync],
  );

  const closeSuggestions = useCallback(() => {
    setActiveTrigger(null);
    setSearchState({ items: [], page: 0, hasMore: false, loading: false });
  }, []);

  // Keyboard handling
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, textarea: HTMLTextAreaElement): boolean => {
      if (!activeTrigger) return false;

      const len = filteredOptions.length;
      if (!len && !searchState.loading) return false;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = (highlightIndex + 1) % Math.max(len, 1);
        setHighlightIndex(next);
        // Trigger load more near end
        if (
          len - 1 - next <= 3 &&
          searchState.hasMore &&
          !searchState.loading
        ) {
          loadMore();
        }
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex(
          (highlightIndex - 1 + Math.max(len, 1)) % Math.max(len, 1),
        );
        return true;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = filteredOptions[highlightIndex];
        if (item) selectOption(item, textarea);
        return true;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closeSuggestions();
        return true;
      }
      return false;
    },
    [
      activeTrigger,
      filteredOptions,
      highlightIndex,
      searchState,
      selectOption,
      closeSuggestions,
      loadMore,
    ],
  );

  return {
    visible,
    setVisible,
    mentions,
    activeTrigger,
    filteredOptions,
    highlightIndex,
    setHighlightIndex,
    searchLoading: searchState.loading,
    searchHasMore: searchState.hasMore,
    handleTextChange,
    handleKeyDown,
    selectOption,
    closeSuggestions,
    loadMore,
    rawToVisible,
    visibleToRaw,
    caretPosRef,
  };
}

function getItemKey(trigger: MentionTrigger<any>, item: unknown): string {
  const serialized = trigger.serialize(item);
  const re = new RegExp(
    trigger.pattern.source,
    trigger.pattern.flags.replace("g", ""),
  );
  const m = re.exec(serialized);
  if (m) {
    return trigger.parseMatch(m).key;
  }
  return serialized;
}
