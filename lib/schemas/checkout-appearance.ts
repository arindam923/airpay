import { z } from "zod";

/** A 3–8 digit hex color, e.g. #fff or #6c4df6. */
const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;
const hex = z.string().trim().regex(HEX_RE, "Use a hex color like #6c4df6.");

export const CHECKOUT_SHADOWS = ["hard", "soft", "glow", "none"] as const;
export const CHECKOUT_WIDTHS = ["compact", "regular", "wide"] as const;
export const CHECKOUT_LOGO_SHAPES = ["circle", "rounded", "square"] as const;
export const CHECKOUT_METHODS = ["wallet", "qr"] as const;

/**
 * Only safe CSS background values are accepted: gradients or https image URLs.
 * This value is emitted as an inline `background-image`, so it must never carry
 * a `url(javascript:…)` or similar injection payload.
 */
const BACKGROUND_IMAGE_RE =
  /^(linear-gradient|radial-gradient|conic-gradient)\(|^url\(\s*['"]?https:\/\//;

const backgroundImage = z
  .string()
  .trim()
  .max(400)
  .refine((v) => v === "" || BACKGROUND_IMAGE_RE.test(v), {
    message: "Use a CSS gradient or an https image URL.",
  });

const logoUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//.test(v) || v.startsWith("/"), {
    message: "Use an https image URL.",
  });

export const checkoutAppearanceSchema = z.object({
  preset: z.string().trim().max(40).default("airpay"),

  // Brand
  brandName: z.string().trim().max(80).default(""),
  logoUrl: logoUrl.default(""),
  logoShape: z.enum(CHECKOUT_LOGO_SHAPES).default("circle"),

  // Colors
  accent: hex.default("#6c4df6"),
  accentText: hex.default("#fffdf6"),
  background: hex.default("#faf4e8"),
  backgroundImage: backgroundImage.default(""),
  surface: hex.default("#fffdf6"),
  text: hex.default("#191410"),
  muted: hex.default("#5c544a"),
  border: hex.default("#191410"),

  // Shape & style
  radius: z.number().int().min(0).max(40).default(24),
  buttonRadius: z.number().int().min(0).max(999).default(999),
  borderWidth: z.number().int().min(0).max(4).default(2),
  shadow: z.enum(CHECKOUT_SHADOWS).default("hard"),
  width: z.enum(CHECKOUT_WIDTHS).default("regular"),

  // Content
  headline: z.string().trim().max(120).default(""),
  subtext: z.string().trim().max(200).default(""),
  footerNote: z.string().trim().max(200).default(""),

  // Features
  showBranding: z.boolean().default(true),
  showAvatar: z.boolean().default(true),
  showFeeRow: z.boolean().default(true),
  showTestnetBadge: z.boolean().default(true),
  methods: z.array(z.enum(CHECKOUT_METHODS)).min(1, "Keep at least one payment method.").default([
    "wallet",
    "qr",
  ]),
});

export type CheckoutAppearance = z.infer<typeof checkoutAppearanceSchema>;
