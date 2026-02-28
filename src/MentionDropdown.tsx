import React, { useCallback, useEffect, useRef } from "react";
import type { CaretPosition, MentionTrigger } from "./types.ts";

interface MentionDropdownProps {
  items: unknown[];
  trigger: MentionTrigger<any>;
  highlightedIndex: number;
  onHighlight: (index: number) => void;
  onSelect: (item: unknown) => void;
  onLoadMore?: () => void;
  loading: boolean;
  loadingContent?: React.ReactNode;
  position: CaretPosition;
  width: number;
  className?: string;
  positionStrategy?: "fixed" | "absolute";
  containerEl?: HTMLElement | null;
}

export const MentionDropdown: React.FC<MentionDropdownProps> = ({
  items,
  trigger,
  highlightedIndex,
  onHighlight,
  onSelect,
  onLoadMore,
  loading,
  loadingContent,
  position,
  width,
  className,
  positionStrategy = "fixed",
  containerEl,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!onLoadMore || !sentinelRef.current) return;
    const sentinel = sentinelRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { root: listRef.current, threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore]);

  // Ensure highlighted item is visible
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const highlighted = container.querySelector(
      `[data-mentionize-option-index="${highlightedIndex}"]`
    ) as HTMLElement | null;
    if (highlighted) {
      highlighted.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  // flip above if near bottom of viewport (always viewport-based)
  const maxHeight = 240;
  const gap = 4;
  const spaceBelow = window.innerHeight - position.top - gap;
  const flipAbove = spaceBelow < maxHeight && position.top > maxHeight;

  let style: React.CSSProperties;
  if (positionStrategy === "absolute" && containerEl) {
    const rect = containerEl.getBoundingClientRect();
    const relLeft = position.left - rect.left;
    const relTop = flipAbove
      ? position.top - gap - maxHeight - rect.top
      : position.top + gap - rect.top;
    style = {
      position: "absolute",
      width,
      maxHeight,
      overflowY: "auto",
      zIndex: 50,
      top: relTop,
      left: relLeft,
    };
  } else {
    style = {
      position: "fixed",
      width,
      maxHeight,
      overflowY: "auto",
      zIndex: 50,
      ...(flipAbove
        ? { bottom: window.innerHeight - position.top + gap, left: position.left }
        : { top: position.top + gap, left: position.left }),
    };
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // prevent blur of input
  }, []);

  if (!items.length && !loading) return null;

  return (
    <div
      ref={listRef}
      role="listbox"
      className={className}
      style={style}
      data-mentionize-dropdown=""
      onMouseDown={handleMouseDown}
    >
      {items.map((item, i) => {
        const isHighlighted = i === highlightedIndex;
        const optCls = typeof trigger.optionClassName === "function"
          ? trigger.optionClassName(item)
          : trigger.optionClassName;

        if (trigger.renderOption) {
          return (
            <div
              key={i}
              role="option"
              aria-selected={isHighlighted}
              className={optCls}
              data-mentionize-option-index={i}
              data-mentionize-option-highlighted={isHighlighted || undefined}
              onMouseEnter={() => onHighlight(i)}
              onClick={() => onSelect(item)}
            >
              {trigger.renderOption(item, isHighlighted)}
            </div>
          );
        }

        return (
          <div
            key={i}
            role="option"
            aria-selected={isHighlighted}
            className={optCls}
            data-mentionize-option-index={i}
            data-mentionize-option=""
            data-mentionize-option-highlighted={isHighlighted || undefined}
            onMouseEnter={() => onHighlight(i)}
            onClick={() => onSelect(item)}
          >
            {trigger.displayText(item)}
          </div>
        );
      })}
      {loading && (
        <div data-mentionize-loading="">{loadingContent ?? "Loading..."}</div>
      )}
      {onLoadMore && !loading && (
        <div ref={sentinelRef} style={{ height: 1 }} aria-hidden />
      )}
    </div>
  );
};
