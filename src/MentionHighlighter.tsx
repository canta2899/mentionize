import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { ActiveMention, MentionTrigger } from "./types.ts";

interface MentionHighlighterProps {
  visible: string;
  mentions: ActiveMention[];
  triggers: MentionTrigger<any>[];
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  className?: string;
  style?: React.CSSProperties;
}

/** Split a string so that newlines become <br/> elements */
function textToNodes(text: string): React.ReactNode[] {
  const parts = text.split("\n");
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) nodes.push(React.createElement("br", { key: `br-${i}` }));
    if (parts[i]) nodes.push(parts[i]);
  }
  return nodes;
}

export const MentionHighlighter: React.FC<MentionHighlighterProps> = ({
  visible,
  mentions,
  triggers,
  textareaRef,
  className,
  style,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  // Sync scroll with textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    const highlighter = ref.current;
    if (!textarea || !highlighter) return;

    const onScroll = () => {
      highlighter.scrollTop = textarea.scrollTop;
      highlighter.scrollLeft = textarea.scrollLeft;
    };

    textarea.addEventListener("scroll", onScroll);
    return () => textarea.removeEventListener("scroll", onScroll);
  }, [textareaRef]);

  const children = useMemo(() => {
    const sorted = mentions.slice().sort((a, b) => a.start - b.start);
    if (!sorted.length) return textToNodes(visible);

    const classMap = new Map<string, string>();
    for (const t of triggers) {
      classMap.set(t.trigger, t.mentionClassName ?? "mentionize-mention");
    }

    const nodes: React.ReactNode[] = [];
    let last = 0;
    for (let i = 0; i < sorted.length; i++) {
      const m = sorted[i]!;
      // Text before this mention
      if (last < m.start) {
        nodes.push(...textToNodes(visible.slice(last, m.start)));
      }

      const mentionText = visible.slice(m.start, m.end);
      const cls = classMap.get(m.trigger) ?? "mentionize-mention";
      nodes.push(
        React.createElement(
          "span",
          {
            key: `mention-${i}`,
            className: cls,
            "data-mentionize-trigger": m.trigger,
            "data-mentionize-key": m.key,
          },
          mentionText
        )
      );
      last = m.end;
    }
    // after last mention
    if (last < visible.length) {
      nodes.push(...textToNodes(visible.slice(last)));
    }
    return nodes;
  }, [visible, mentions, triggers]);

  // After render, neutralize horizontal box-model impact of mention spans
  // so user-applied padding/border/margin don't shift overlay text relative to the textarea.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const spans = el.querySelectorAll<HTMLElement>("[data-mentionize-trigger]");
    for (let i = 0; i < spans.length; i++) {
      const span = spans[i]!;
      // Reset any previous compensation before measuring
      span.style.marginLeft = "";
      span.style.marginRight = "";
      const cs = getComputedStyle(span);
      const extraLeft =
        parseFloat(cs.paddingLeft) +
        parseFloat(cs.borderLeftWidth) +
        parseFloat(cs.marginLeft);
      const extraRight =
        parseFloat(cs.paddingRight) +
        parseFloat(cs.borderRightWidth) +
        parseFloat(cs.marginRight);
      if (extraLeft) span.style.marginLeft = `${-extraLeft}px`;
      if (extraRight) span.style.marginRight = `${-extraRight}px`;
    }
  });

  return React.createElement(
    "div",
    {
      ref,
      className,
      style: {
        position: "absolute" as const,
        inset: 0,
        pointerEvents: "none" as const,
        overflow: "auto",
        ...style,
      },
      "aria-hidden": true,
      "data-mentionize-highlighter": "",
    },
    ...children
  );
};
