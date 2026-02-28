import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { MentionDropdown } from "./MentionDropdown.tsx";
import { MentionHighlighter } from "./MentionHighlighter.tsx";
import type { CaretPosition, MentionInputProps } from "./types.ts";
import { useCaretPosition } from "./useCaretPosition.ts";
import { useMentionEngine } from "./useMentionEngine.ts";

const SHARED_STYLE: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  padding: "0.5rem 0.75rem",
  fontFamily: "inherit",
  fontSize: "inherit",
  lineHeight: "inherit",
  letterSpacing: "normal",
  boxSizing: "border-box",
};

export const MentionInput = forwardRef<HTMLTextAreaElement, MentionInputProps>(
  (
    {
      triggers,
      value,
      defaultValue,
      onChange,
      onMentionsChange,
      placeholder,
      disabled,
      rows = 4,
      className,
      inputClassName,
      highlighterClassName,
      dropdownClassName,
      dropdownWidth = 250,
      loadingContent,
      renderDropdown,
      dropdownPositionStrategy = "fixed",
      "aria-label": ariaLabel,
      "aria-describedby": ariaDescribedBy,
    },
    ref
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => textareaRef.current!);

    const engine = useMentionEngine({
      triggers,
      value,
      defaultValue,
      onChange,
      onMentionsChange,
    });

    // Restore caret position after render, then clear so we don't
    // fight the browser on subsequent renders (like arrow-key navigation)
    useLayoutEffect(() => {
      const pos = engine.caretPosRef.current;
      const ta = textareaRef.current;
      if (pos !== null && ta && document.activeElement === ta) {
        ta.setSelectionRange(pos, pos);
        engine.caretPosRef.current = null;
      }
    });

    const { mirrorRef, getCaretPosition } = useCaretPosition(dropdownWidth);
    const [dropdownPos, setDropdownPos] = useState<CaretPosition | null>(null);

    // Update dropdown position when active trigger changes
    useEffect(() => {
      if (engine.activeTrigger && textareaRef.current) {
        requestAnimationFrame(() => {
          const pos = getCaretPosition(textareaRef.current!);
          if (pos) setDropdownPos(pos);
        });
      } else {
        setDropdownPos(null);
      }
    }, [engine.activeTrigger, engine.visible, getCaretPosition]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        engine.handleTextChange(e.target.value, e.target.selectionStart);
      },
      [engine.handleTextChange]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (textareaRef.current) {
          engine.handleKeyDown(e, textareaRef.current);
        }
      },
      [engine.handleKeyDown]
    );

    const handlePaste = useCallback(
      (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const txt = e.clipboardData.getData("text");
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newText =
          engine.visible.slice(0, start) + txt + engine.visible.slice(end);
        e.preventDefault();
        engine.handleTextChange(newText, start + txt.length);
      },
      [engine.visible, engine.handleTextChange]
    );

    const handleBlur = useCallback(() => {
      // delay allows dropdown click to fire first
      setTimeout(() => engine.closeSuggestions(), 150);
    }, [engine.closeSuggestions]);

    const handleSelect = useCallback(
      (item: unknown) => {
        if (textareaRef.current) {
          engine.selectOption(item, textareaRef.current);
        }
      },
      [engine.selectOption]
    );

    const showDropdown = engine.activeTrigger !== null && dropdownPos !== null;

    return (
      <div
        ref={containerRef}
        className={className}
        style={{ position: "relative" }}
        data-mentionize-container=""
      >
        <MentionHighlighter
          visible={engine.visible}
          mentions={engine.mentions}
          triggers={triggers}
          textareaRef={textareaRef}
          getItemForMention={engine.getItemForMention}
          className={highlighterClassName}
          style={SHARED_STYLE}
        />

        <textarea
          ref={textareaRef}
          value={engine.visible}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          className={inputClassName}
          style={{
            ...SHARED_STYLE,
            position: "relative",
            width: "100%",
            resize: "vertical",
            background: "transparent",
            color: "transparent",
            caretColor: "CanvasText",
            zIndex: 10,
          }}
          data-mentionize-input=""
        />

        {/* Caret mirror div */}
        <div
          ref={mirrorRef}
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: -9999,
            visibility: "hidden",
            ...SHARED_STYLE,
          }}
          data-mentionize-mirror=""
        />

        {showDropdown && engine.activeTrigger && (
          renderDropdown ? (
            renderDropdown({
              items: engine.filteredOptions,
              highlightedIndex: engine.highlightIndex,
              onSelect: handleSelect,
              onHighlight: engine.setHighlightIndex,
              loading: engine.searchLoading,
              onLoadMore: engine.searchHasMore ? engine.loadMore : undefined,
            })
          ) : (
            <MentionDropdown
              items={engine.filteredOptions}
              trigger={engine.activeTrigger.trigger}
              highlightedIndex={engine.highlightIndex}
              onHighlight={engine.setHighlightIndex}
              onSelect={handleSelect}
              onLoadMore={engine.searchHasMore ? engine.loadMore : undefined}
              loading={engine.searchLoading}
              loadingContent={loadingContent}
              position={dropdownPos}
              width={dropdownWidth}
              className={dropdownClassName}
              positionStrategy={dropdownPositionStrategy}
              containerEl={dropdownPositionStrategy === "absolute" ? containerRef.current : undefined}
            />
          )
        )}
      </div>
    );
  }
);

MentionInput.displayName = "MentionInput";
