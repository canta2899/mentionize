import { useCallback, useRef } from "react";
import type { CaretPosition } from "./types.ts";

const SHARED_STYLE_PROPS = [
  "whiteSpace",
  "overflowWrap",
  "wordBreak",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "tabSize",
  "boxSizing",
  "borderWidth",
  "borderStyle",
] as const;

export function useCaretPosition(dropdownWidth: number) {
  const mirrorRef = useRef<HTMLDivElement>(null);

  const getCaretPosition = useCallback(
    (
      textarea: HTMLTextAreaElement,
      caretIndex?: number,
      textOverride?: string
    ): CaretPosition | null => {
      const mirror = mirrorRef.current;
      if (!mirror) return null;

      const caret = caretIndex ?? textarea.selectionStart;
      const source = textOverride ?? textarea.value;
      const before = source.slice(0, caret);

      // Copy textarea computed styles to mirror
      const computed = getComputedStyle(textarea);
      for (const prop of SHARED_STYLE_PROPS) {
        (mirror.style as any)[prop] = (computed as any)[prop];
      }
      mirror.style.width = `${textarea.offsetWidth}px`;

      mirror.textContent = before;

      const span = document.createElement("span");
      span.textContent = "\u200b";
      mirror.appendChild(span);
      mirror.scrollTop = textarea.scrollTop;

      const spanRect = span.getBoundingClientRect();
      const mirrorRect = mirror.getBoundingClientRect();
      const textareaRect = textarea.getBoundingClientRect();

      const top =
        textareaRect.top +
        (spanRect.top - mirrorRect.top) -
        textarea.scrollTop +
        span.offsetHeight;
      let left = textareaRect.left + (spanRect.left - mirrorRect.left);

      // Clamp to viewport
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8;
      }
      if (left < 8) left = 8;

      mirror.innerHTML = "";

      return {
        top: Math.min(Math.max(top, 8), window.innerHeight - 8),
        left,
      };
    },
    [dropdownWidth]
  );

  return { mirrorRef, getCaretPosition };
}
