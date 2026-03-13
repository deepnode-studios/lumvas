import type { SlideTemplate, SlideContent } from "@/types/schema";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Strip IDs from a slide so templates are ID-agnostic */
function stripIds(slide: SlideContent): Omit<SlideContent, "id"> {
  const { id: _, ...rest } = slide;
  return { ...rest, elements: rest.elements.map(({ id: _eid, ...el }) => el as SlideContent["elements"][number]) };
}

/** Re-hydrate a template into a usable slide with fresh IDs */
export function instantiateTemplate(template: SlideTemplate): SlideContent {
  return {
    ...template.slide,
    id: uid(),
    elements: template.slide.elements.map((el) => ({ ...el, id: uid() })),
  };
}

/** Create a template from an existing slide */
export function slideToTemplate(
  slide: SlideContent,
  name: string,
  category: string
): SlideTemplate {
  return {
    id: uid(),
    name,
    category,
    builtIn: false,
    slide: stripIds(slide),
  };
}

/* ─── Built-in templates ─── */

export const BUILT_IN_TEMPLATES: SlideTemplate[] = [
  // ── Title / Cover ──
  {
    id: "builtin-title-center",
    name: "Title — Centered",
    category: "Title",
    builtIn: true,
    slide: {
      alignItems: "center",
      justifyContent: "center",
      direction: "column",
      padding: 80,
      gap: 24,
      elements: [
        { id: "", type: "logo", content: "", maxWidth: "100px" },
        {
          id: "",
          type: "text",
          content: "Your Big Headline Here",
          fontSize: 72,
          fontWeight: 800,
          textAlign: "center",
          letterSpacing: -1.5,
          lineHeight: 1.1,
        },
        {
          id: "",
          type: "text",
          content: "A compelling subtitle that hooks the reader",
          fontSize: 28,
          color: "secondary",
          textAlign: "center",
          lineHeight: 1.4,
        },
      ],
    },
  },
  {
    id: "builtin-title-left",
    name: "Title — Left Aligned",
    category: "Title",
    builtIn: true,
    slide: {
      alignItems: "flex-start",
      justifyContent: "center",
      direction: "column",
      padding: 80,
      gap: 20,
      elements: [
        { id: "", type: "logo", content: "", maxWidth: "100px" },
        { id: "", type: "spacer", content: "", height: "20px" },
        {
          id: "",
          type: "text",
          content: "Bold Statement\nThat Grabs Attention",
          fontSize: 64,
          fontWeight: 800,
          textAlign: "left",
          letterSpacing: -1,
          lineHeight: 1.1,
        },
        {
          id: "",
          type: "text",
          content: "Supporting text that adds context to the headline above.",
          fontSize: 24,
          color: "secondary",
          textAlign: "left",
          opacity: 0.85,
          lineHeight: 1.5,
        },
      ],
    },
  },
  {
    id: "builtin-title-gradient",
    name: "Title — Gradient",
    category: "Title",
    builtIn: true,
    slide: {
      alignItems: "center",
      justifyContent: "center",
      direction: "column",
      padding: 80,
      gap: 28,
      style: {
        backgroundGradient: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
        primaryColor: "#ffffff",
        secondaryColor: "#a78bfa",
      },
      elements: [
        {
          id: "",
          type: "text",
          content: "INTRODUCING",
          fontSize: 16,
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 4,
          textTransform: "uppercase",
          color: "secondary",
        },
        {
          id: "",
          type: "text",
          content: "Something Amazing",
          fontSize: 72,
          fontWeight: 800,
          textAlign: "center",
          letterSpacing: -1.5,
          lineHeight: 1.1,
        },
        {
          id: "",
          type: "text",
          content: "The subtitle explains it all in one short line.",
          fontSize: 24,
          textAlign: "center",
          opacity: 0.7,
          lineHeight: 1.5,
        },
      ],
    },
  },

  // ── Content ──
  {
    id: "builtin-body-text",
    name: "Body Text",
    category: "Content",
    builtIn: true,
    slide: {
      alignItems: "flex-start",
      justifyContent: "center",
      direction: "column",
      padding: 80,
      gap: 20,
      elements: [
        { id: "", type: "logo", content: "", maxWidth: "80px" },
        {
          id: "",
          type: "text",
          content: "Section Heading",
          fontSize: 48,
          fontWeight: 700,
          letterSpacing: -0.5,
          lineHeight: 1.15,
        },
        { id: "", type: "divider", content: "", opacity: 0.15, maxWidth: "100%" },
        {
          id: "",
          type: "text",
          content: "Write your paragraph content here. Keep it concise and impactful — every word should earn its place on the slide.",
          fontSize: 22,
          opacity: 0.8,
          lineHeight: 1.7,
          maxWidth: "90%",
        },
      ],
    },
  },
  {
    id: "builtin-bullets",
    name: "Bullet Points",
    category: "Content",
    builtIn: true,
    slide: {
      alignItems: "flex-start",
      justifyContent: "center",
      direction: "column",
      padding: 80,
      gap: 24,
      elements: [
        {
          id: "",
          type: "text",
          content: "Key Takeaways",
          fontSize: 48,
          fontWeight: 700,
          letterSpacing: -0.5,
          lineHeight: 1.15,
        },
        {
          id: "",
          type: "list",
          content: "First important point goes here\nSecond point with key insight\nThird point that drives it home\nFinal takeaway for the audience",
          fontSize: 24,
          lineHeight: 1.5,
        },
      ],
    },
  },
  {
    id: "builtin-numbered-steps",
    name: "Numbered Steps",
    category: "Content",
    builtIn: true,
    slide: {
      alignItems: "flex-start",
      justifyContent: "center",
      direction: "column",
      padding: 80,
      gap: 16,
      elements: [
        {
          id: "",
          type: "text",
          content: "HOW IT WORKS",
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: "secondary",
        },
        {
          id: "",
          type: "text",
          content: "Three Simple Steps",
          fontSize: 48,
          fontWeight: 700,
          letterSpacing: -0.5,
          lineHeight: 1.15,
          marginBottom: 12,
        },
        {
          id: "",
          type: "text",
          content: "1. Sign up and create your profile",
          fontSize: 26,
          fontWeight: 500,
          lineHeight: 1.4,
          marginBottom: 4,
        },
        {
          id: "",
          type: "text",
          content: "2. Upload your content and customize",
          fontSize: 26,
          fontWeight: 500,
          lineHeight: 1.4,
          marginBottom: 4,
        },
        {
          id: "",
          type: "text",
          content: "3. Publish and share with the world",
          fontSize: 26,
          fontWeight: 500,
          lineHeight: 1.4,
        },
      ],
    },
  },

  // ── Quote ──
  {
    id: "builtin-quote",
    name: "Quote",
    category: "Quote",
    builtIn: true,
    slide: {
      alignItems: "center",
      justifyContent: "center",
      direction: "column",
      padding: 100,
      gap: 32,
      elements: [
        {
          id: "",
          type: "text",
          content: "\u201C",
          fontSize: 120,
          fontWeight: 800,
          textAlign: "center",
          color: "secondary",
          lineHeight: 0.5,
          marginBottom: -20,
        },
        {
          id: "",
          type: "text",
          content: "Design is not just what it looks like and feels like. Design is how it works.",
          fontSize: 36,
          fontWeight: 500,
          fontStyle: "italic",
          textAlign: "center",
          lineHeight: 1.5,
          maxWidth: "85%",
        },
        { id: "", type: "divider", content: "", opacity: 0.2, maxWidth: "60px" },
        {
          id: "",
          type: "text",
          content: "Steve Jobs",
          fontSize: 18,
          fontWeight: 700,
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: 3,
          color: "secondary",
        },
      ],
    },
  },
  {
    id: "builtin-testimonial",
    name: "Testimonial",
    category: "Quote",
    builtIn: true,
    slide: {
      alignItems: "flex-start",
      justifyContent: "center",
      direction: "column",
      padding: 80,
      gap: 24,
      style: {
        backgroundGradient: "linear-gradient(135deg, #667eea, #764ba2)",
        primaryColor: "#ffffff",
        secondaryColor: "#fbbf24",
      },
      elements: [
        {
          id: "",
          type: "text",
          content: "\u2605\u2605\u2605\u2605\u2605",
          fontSize: 28,
          color: "secondary",
          letterSpacing: 4,
        },
        {
          id: "",
          type: "text",
          content: "This product completely transformed how our team works. We saw a 3x improvement in productivity within the first month.",
          fontSize: 32,
          fontWeight: 500,
          lineHeight: 1.5,
          maxWidth: "90%",
        },
        { id: "", type: "spacer", content: "", height: "8px" },
        {
          id: "",
          type: "text",
          content: "Sarah Chen",
          fontSize: 20,
          fontWeight: 700,
        },
        {
          id: "",
          type: "text",
          content: "Head of Product, Acme Inc.",
          fontSize: 16,
          opacity: 0.7,
          marginTop: -16,
        },
      ],
    },
  },

  // ── CTA / Closing ──
  {
    id: "builtin-cta",
    name: "Call to Action",
    category: "CTA",
    builtIn: true,
    slide: {
      alignItems: "center",
      justifyContent: "center",
      direction: "column",
      padding: 80,
      gap: 24,
      elements: [
        {
          id: "",
          type: "text",
          content: "Ready to Get Started?",
          fontSize: 56,
          fontWeight: 800,
          textAlign: "center",
          letterSpacing: -1,
          lineHeight: 1.15,
        },
        {
          id: "",
          type: "text",
          content: "Join thousands of creators who already use our platform.",
          fontSize: 22,
          textAlign: "center",
          opacity: 0.7,
          lineHeight: 1.5,
          maxWidth: "80%",
        },
        { id: "", type: "spacer", content: "", height: "8px" },
        {
          id: "",
          type: "button",
          content: "Start Free Trial",
          fontSize: 24,
          fontWeight: 700,
          paddingX: 56,
          paddingY: 20,
          borderRadius: 50,
        },
      ],
    },
  },
  {
    id: "builtin-closing",
    name: "Thank You / Closing",
    category: "CTA",
    builtIn: true,
    slide: {
      alignItems: "center",
      justifyContent: "center",
      direction: "column",
      padding: 80,
      gap: 24,
      elements: [
        { id: "", type: "logo", content: "", maxWidth: "80px" },
        {
          id: "",
          type: "text",
          content: "Thank You!",
          fontSize: 72,
          fontWeight: 800,
          textAlign: "center",
          letterSpacing: -1.5,
          lineHeight: 1.1,
        },
        { id: "", type: "divider", content: "", opacity: 0.15, maxWidth: "80px" },
        {
          id: "",
          type: "text",
          content: "Follow us @handle for more",
          fontSize: 20,
          textAlign: "center",
          opacity: 0.6,
          lineHeight: 1.5,
        },
      ],
    },
  },

  // ── Stats ──
  {
    id: "builtin-stats",
    name: "Stats / Numbers",
    category: "Stats",
    builtIn: true,
    slide: {
      alignItems: "center",
      justifyContent: "center",
      direction: "column",
      padding: 80,
      gap: 12,
      elements: [
        {
          id: "",
          type: "text",
          content: "BY THE NUMBERS",
          fontSize: 14,
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 3,
          textTransform: "uppercase",
          color: "secondary",
          marginBottom: 16,
        },
        {
          id: "",
          type: "text",
          content: "10,000+",
          fontSize: 80,
          fontWeight: 800,
          textAlign: "center",
          letterSpacing: -2,
          lineHeight: 1,
          color: "secondary",
        },
        {
          id: "",
          type: "text",
          content: "Active Users",
          fontSize: 24,
          fontWeight: 500,
          textAlign: "center",
          opacity: 0.7,
          marginBottom: 20,
        },
        { id: "", type: "divider", content: "", opacity: 0.1, maxWidth: "200px" },
        {
          id: "",
          type: "text",
          content: "98% satisfaction rate  \u2022  50+ countries  \u2022  24/7 support",
          fontSize: 18,
          textAlign: "center",
          opacity: 0.6,
          lineHeight: 1.5,
          marginTop: 8,
        },
      ],
    },
  },

  // ── Image ──
  {
    id: "builtin-image-text",
    name: "Image + Caption",
    category: "Image",
    builtIn: true,
    slide: {
      alignItems: "flex-start",
      justifyContent: "center",
      direction: "column",
      padding: 80,
      gap: 24,
      elements: [
        {
          id: "",
          type: "image",
          content: "",
          width: "100%",
          height: "500px",
          objectFit: "cover",
          borderRadius: 16,
        },
        {
          id: "",
          type: "text",
          content: "Image Caption Title",
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: -0.5,
          lineHeight: 1.2,
        },
        {
          id: "",
          type: "text",
          content: "Describe what the image shows and why it matters.",
          fontSize: 20,
          opacity: 0.7,
          lineHeight: 1.5,
        },
      ],
    },
  },
  {
    id: "builtin-full-image",
    name: "Full Image",
    category: "Image",
    builtIn: true,
    slide: {
      alignItems: "center",
      justifyContent: "center",
      direction: "column",
      padding: 0,
      gap: 0,
      elements: [
        {
          id: "",
          type: "image",
          content: "",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: 0,
        },
      ],
    },
  },

  // ── Blank ──
  {
    id: "builtin-blank",
    name: "Blank",
    category: "Blank",
    builtIn: true,
    slide: {
      alignItems: "center",
      justifyContent: "center",
      direction: "column",
      padding: 80,
      gap: 24,
      elements: [],
    },
  },
];

export const TEMPLATE_CATEGORIES = [
  "All",
  "Title",
  "Content",
  "Quote",
  "CTA",
  "Stats",
  "Image",
  "Blank",
];

/** Build a concise summary of available templates for the LLM prompt */
export function describeTemplatesForLLM(
  builtIn: SlideTemplate[],
  custom: SlideTemplate[]
): string {
  const lines: string[] = [];

  // Group built-in by category
  const grouped = new Map<string, SlideTemplate[]>();
  for (const t of builtIn) {
    const arr = grouped.get(t.category) ?? [];
    arr.push(t);
    grouped.set(t.category, arr);
  }

  for (const [cat, templates] of grouped) {
    lines.push(`**${cat}**`);
    for (const t of templates) {
      const elTypes = t.slide.elements.map((e) => e.type);
      const elSummary = elTypes.length
        ? elTypes.join(", ")
        : "empty";
      const hasGradient = !!t.slide.style?.backgroundGradient;
      const hasOverride = !!t.slide.style;
      const notes: string[] = [];
      if (hasGradient) notes.push("gradient bg");
      else if (hasOverride) notes.push("custom slide colors");
      const noteStr = notes.length ? ` (${notes.join(", ")})` : "";
      lines.push(`- "${t.name}": ${t.slide.direction ?? "column"} layout, elements: [${elSummary}]${noteStr}`);
    }
  }

  if (custom.length > 0) {
    lines.push(`\n**Custom (user-saved)**`);
    for (const t of custom) {
      const elTypes = t.slide.elements.map((e) => e.type);
      lines.push(`- "${t.name}" [${t.category}]: elements: [${elTypes.join(", ") || "empty"}]`);
    }
  }

  return lines.join("\n");
}
