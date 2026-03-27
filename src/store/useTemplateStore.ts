import { create } from "zustand";
import type { SlideTemplate } from "@/types/schema";
import { BUILT_IN_TEMPLATES } from "./templates";

const STORAGE_KEY = "lumvas-custom-templates";

function loadCustomTemplates(): SlideTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomTemplates(templates: SlideTemplate[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // quota exceeded — silently fail
  }
}

interface TemplateStore {
  customTemplates: SlideTemplate[];
  /** All templates: built-in + custom */
  allTemplates: () => SlideTemplate[];

  addCustomTemplate: (template: SlideTemplate) => void;
  updateCustomTemplate: (id: string, patch: Partial<Pick<SlideTemplate, "name" | "category">>) => void;
  removeCustomTemplate: (id: string) => void;
  hydrateFromStorage: () => void;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  customTemplates: [],

  allTemplates: () => [...BUILT_IN_TEMPLATES, ...get().customTemplates],

  addCustomTemplate: (template) => {
    set((s) => {
      const next = [...s.customTemplates, template];
      saveCustomTemplates(next);
      return { customTemplates: next };
    });
  },

  updateCustomTemplate: (id, patch) => {
    set((s) => {
      const next = s.customTemplates.map((t) =>
        t.id === id ? { ...t, ...patch } : t
      );
      saveCustomTemplates(next);
      return { customTemplates: next };
    });
  },

  removeCustomTemplate: (id) => {
    set((s) => {
      const next = s.customTemplates.filter((t) => t.id !== id);
      saveCustomTemplates(next);
      return { customTemplates: next };
    });
  },

  hydrateFromStorage: () => {
    set({ customTemplates: loadCustomTemplates() });
  },
}));
