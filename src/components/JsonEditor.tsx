"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import b from "./jsonEditor.module.css";

/** Escape HTML entities */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Tokenize JSON string into highlighted HTML.
 *  IMPORTANT: The output must have EXACTLY the same character length as the input
 *  (excluding HTML tags) so the transparent textarea overlay stays aligned. */
function highlightJson(json: string): string {
  return json.replace(
    /("(?:\\.|[^"\\])*")(\s*:)?|(\b(?:true|false|null)\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([[\]{},:])|(\/\/[^\n]*)/g,
    (
      match,
      str: string | undefined,
      colonPart: string | undefined, // includes whitespace + colon e.g. "  :"
      bool: string | undefined,
      num: string | undefined,
      punct: string | undefined
    ) => {
      if (str) {
        if (colonPart) {
          // Preserve exact whitespace between key and colon
          return `<span class="${b.key}">${esc(str)}</span>${colonPart}`;
        }
        return `<span class="${b.string}">${esc(str)}</span>`;
      }
      if (bool) return `<span class="${b.bool}">${esc(bool)}</span>`;
      if (num) return `<span class="${b.number}">${esc(num)}</span>`;
      if (punct) return `<span class="${b.punct}">${esc(punct)}</span>`;
      return esc(match);
    }
  );
}

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function JsonEditor({ value, onChange, onFocus, onBlur }: JsonEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [highlighted, setHighlighted] = useState(() => highlightJson(value));
  // Track whether textarea is focused — if so, don't overwrite its value from props
  const focused = useRef(false);

  // When value prop changes externally (not from typing), update textarea + highlight
  useEffect(() => {
    if (!focused.current && textareaRef.current) {
      textareaRef.current.value = value;
      setHighlighted(highlightJson(value));
    }
  }, [value]);

  const syncScroll = useCallback(() => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const handleInput = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const val = ta.value;
    onChange(val);
    // Debounce highlight update to avoid lag on large docs
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => {
      setHighlighted(highlightJson(val));
    }, 150);
  }, [onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const val = ta.value;
        // Insert directly into the DOM — no React re-render needed
        const newVal = val.substring(0, start) + "  " + val.substring(end);
        ta.value = newVal;
        ta.selectionStart = ta.selectionEnd = start + 2;
        onChange(newVal);
        clearTimeout(highlightTimer.current);
        highlightTimer.current = setTimeout(() => {
          setHighlighted(highlightJson(newVal));
        }, 150);
      }
    },
    [onChange]
  );

  const handleFocus = useCallback(() => {
    focused.current = true;
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    focused.current = false;
    onBlur?.();
  }, [onBlur]);

  return (
    <div className={b.wrapper}>
      <pre
        ref={preRef}
        className={b.highlight}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: highlighted + "\n" }}
      />
      <textarea
        ref={textareaRef}
        className={b.textarea}
        defaultValue={value}
        onInput={handleInput}
        onScroll={syncScroll}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
      />
    </div>
  );
}
