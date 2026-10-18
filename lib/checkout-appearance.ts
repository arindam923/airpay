import {
  checkoutAppearanceSchema,
  type CheckoutAppearance,
} from "./schemas/checkout-appearance";

export type {
  CheckoutAppearance,
} from "./schemas/checkout-appearance";

/** AirPay Classic — mirrors the original hard-coded checkout design. */
export const DEFAULT_APPEARANCE: CheckoutAppearance = checkoutAppearanceSchema.parse({});

export const WIDTH_MAX: Record<CheckoutAppearance["width"], number> = {
  compact: 400,
  regular: 460,
  wide: 560,
};

export interface AppearancePreset {
  id: string;
  name: string;
  tagline: string;
  /** Swatch shown in the preset picker: [background, surface, accent, text]. */
  swatch: [string, string, string, string];
  appearance: CheckoutAppearance;
}

function preset(
  id: string,
  name: string,
  tagline: string,
  overrides: Partial<CheckoutAppearance>,
): AppearancePreset {
  const appearance: CheckoutAppearance = {
    ...DEFAULT_APPEARANCE,
    preset: id,
    ...overrides,
  };
  return {
    id,
    name,
    tagline,
    swatch: [appearance.background, appearance.surface, appearance.accent, appearance.text],
    appearance,
  };
}

export const APPEARANCE_PRESETS: AppearancePreset[] = [
  preset("airpay", "AirPay Classic", "Playful, bold borders", {}),
  preset("minimal", "Minimal", "Quiet and neutral", {
    accent: "#111827",
    accentText: "#ffffff",
    background: "#f5f6f8",
    surface: "#ffffff",
    text: "#0f172a",
    muted: "#6b7280",
    border: "#e5e7eb",
    radius: 16,
    buttonRadius: 10,
    borderWidth: 1,
    shadow: "soft",
  }),
  preset("midnight", "Midnight", "Dark with a soft glow", {
    accent: "#7c9cff",
    accentText: "#0b0d12",
    background: "#0a0c14",
    backgroundImage: "radial-gradient(120% 90% at 50% 0%, #1b2440 0%, #0a0c14 60%)",
    surface: "#12151f",
    text: "#eef2ff",
    muted: "#94a0bd",
    border: "#263049",
    radius: 20,
    buttonRadius: 14,
    borderWidth: 1,
    shadow: "glow",
  }),
  preset("pastel", "Pastel", "Soft and friendly", {
    accent: "#ec4899",
    accentText: "#ffffff",
    background: "#fdf2f8",
    surface: "#ffffff",
    text: "#3b2430",
    muted: "#9d7489",
    border: "#f6d4e7",
    radius: 26,
    buttonRadius: 999,
    borderWidth: 2,
    shadow: "soft",
  }),
  preset("corporate", "Corporate", "Trusted and tidy", {
    accent: "#1d4ed8",
    accentText: "#ffffff",
    background: "#eef2f9",
    surface: "#ffffff",
    text: "#0f172a",
    muted: "#5b6b82",
    border: "#d7e0ee",
    radius: 12,
    buttonRadius: 8,
    borderWidth: 1,
    shadow: "soft",
  }),
  preset("neon", "Neon", "High-contrast dark", {
    accent: "#7cff3a",
    accentText: "#06120a",
    background: "#06070d",
    backgroundImage: "radial-gradient(120% 90% at 50% -10%, #10241c 0%, #06070d 55%)",
    surface: "#0d1017",
    text: "#e9fff2",
    muted: "#7f8f95",
    border: "#1e3a2c",
    radius: 14,
    buttonRadius: 10,
    borderWidth: 1,
    shadow: "glow",
  }),
  preset("sunset", "Sunset", "Warm and inviting", {
    accent: "#f97316",
    accentText: "#ffffff",
    background: "#fff7ed",
    surface: "#ffffff",
    text: "#3d2c1e",
    muted: "#9a7b62",
    border: "#f7dcc0",
    radius: 22,
    buttonRadius: 999,
    borderWidth: 2,
    shadow: "soft",
  }),
  preset("mono", "Mono", "Editorial grayscale", {
    accent: "#18181b",
    accentText: "#ffffff",
    background: "#f4f4f5",
    surface: "#ffffff",
    text: "#18181b",
    muted: "#71717a",
    border: "#d4d4d8",
    radius: 6,
    buttonRadius: 6,
    borderWidth: 1,
    shadow: "none",
  }),
];

export function presetById(id: string): AppearancePreset | undefined {
  return APPEARANCE_PRESETS.find((p) => p.id === id);
}

/** Merge stored (possibly partial/legacy) values onto the defaults. */
export function normalizeAppearance(input: unknown): CheckoutAppearance {
  const parsed = checkoutAppearanceSchema.safeParse(input);
  return parsed.success ? parsed.data : DEFAULT_APPEARANCE;
}

function shadowVars(a: CheckoutAppearance): { card: string; sm: string } {
  switch (a.shadow) {
    case "hard":
      return { card: `6px 6px 0 0 ${a.border}`, sm: `3px 3px 0 0 ${a.border}` };
    case "soft":
      return {
        card: "0 18px 45px -18px rgba(0,0,0,0.24)",
        sm: "0 8px 20px -10px rgba(0,0,0,0.22)",
      };
    case "glow": {
      const glow = `color-mix(in srgb, ${a.accent} 55%, transparent)`;
      return {
        card: `0 0 0 1px ${a.border}, 0 24px 60px -24px ${glow}`,
        sm: `0 8px 26px -10px ${glow}`,
      };
    }
    case "none":
      return { card: "none", sm: "none" };
  }
}

/**
 * Maps an appearance onto the CSS custom properties the checkout reads.
 *
 * The checkout is built from Tailwind's theme colors (`bg-paper`, `text-ink`,
 * `bg-violet`, …). Overriding those variables on a wrapping element re-themes
 * the whole subtree without touching every class, while the `--co-*` variables
 * drive the pieces Tailwind can't express (radius, border weight, shadow).
 */
export function appearanceToCssVars(a: CheckoutAppearance): Record<string, string> {
  const { card, sm } = shadowVars(a);
  return {
    "--color-paper": a.background,
    "--color-cream": a.surface,
    "--color-ink": a.text,
    "--color-ink-soft": a.muted,
    "--color-violet": a.accent,
    "--color-violet-deep": `color-mix(in srgb, ${a.accent} 82%, #000)`,
    "--co-accent-text": a.accentText,
    "--co-radius": `${a.radius}px`,
    "--co-btn-radius": a.buttonRadius >= 999 ? "9999px" : `${a.buttonRadius}px`,
    "--co-bw": `${a.borderWidth}px`,
    "--co-shadow": card,
    "--co-shadow-sm": sm,
    "--co-width": `${WIDTH_MAX[a.width]}px`,
  };
}

/** Shape class for a logo/avatar tile. */
export function logoShapeClass(shape: CheckoutAppearance["logoShape"]): string {
  switch (shape) {
    case "rounded":
      return "rounded-2xl";
    case "square":
      return "rounded-md";
    case "circle":
    default:
      return "rounded-full";
  }
}

/** A safe inline `background-image`, or undefined when none is set. */
export function safeBackgroundImage(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  if (!/^(linear-gradient|radial-gradient|conic-gradient)\(|^url\(\s*['"]?https:\/\//.test(v)) {
    return undefined;
  }
  return v;
}
