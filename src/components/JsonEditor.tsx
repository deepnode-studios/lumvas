"use client";

import { useRef, useCallback, useMemo } from "react";
import b from "./jsonEditor.module.css";

/** Escape HTML entities */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Tokenize JSON string into highlighted HTML */
function highlightJson(json: string): string {
  // Process line by line to preserve structure
  return json.replace(
    /("(?:\\.|[^"\\])*")\s*(:)?|(\b(?:true|false|null)\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([[\]{},:])|(\/\/[^\n]*)/g,
    (match, str: string | undefined, colon: string | undefined, bool: string | undefined, num: string | undefined, punct: string | undefined) => {
      if (str) {
        if (colon) {
          // key
          return `<span class="${b.key}">${esc(str)}</span>:`;
        }
        // string value
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
}

export function JsonEditor({ value, onChange }: JsonEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const highlighted = useMemo(() => highlightJson(value), [value]);

  const syncScroll = useCallback(() => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Tab inserts 2 spaces
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const val = ta.value;
        const newVal = val.substring(0, start) + "  " + val.substring(end);
        onChange(newVal);
        // Restore cursor after React re-render
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        });
      }
    },
    [onChange]
  );

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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
      />
    </div>
  );
}
