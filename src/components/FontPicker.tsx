"use client";

import { useLumvasStore } from "@/store/useLumvasStore";

interface FontPickerProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function FontPicker({ value, onChange }: FontPickerProps) {
  const fonts = useLumvasStore((s) => s.theme.fonts);

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
      style={{ flex: 1, minWidth: 0 }}
    >
      <option value="">Default (body)</option>
      {fonts.map((f) => (
        <option key={f.id} value={f.id} style={{ fontFamily: f.value }}>
          {f.label} — {f.value.split(",")[0].replace(/['"]/g, "")}
        </option>
      ))}
    </select>
  );
}
