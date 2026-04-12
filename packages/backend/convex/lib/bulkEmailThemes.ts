/**
 * Visual presets for bulk email HTML — colors, top bar, and CTA treatment.
 * Used by the composer, send action, and scheduled sends.
 */
export const BULK_EMAIL_THEME_IDS = [
    "indigo",
    "coral",
    "royal",
    "lavender",
    "noir",
    "jade",
    "summit",
    "sunrise",
    "activation",
] as const;

export type BulkEmailThemeId = (typeof BULK_EMAIL_THEME_IDS)[number];

export const BULK_EMAIL_THEME_DEFAULT: BulkEmailThemeId = "indigo";

export function isBulkEmailThemeId(id: string): id is BulkEmailThemeId {
    return (BULK_EMAIL_THEME_IDS as readonly string[]).includes(id);
}

export function normalizeBulkEmailThemeId(id: string | undefined): BulkEmailThemeId {
    if (id && isBulkEmailThemeId(id)) return id;
    return BULK_EMAIL_THEME_DEFAULT;
}

/** Top-of-card visual (Tabular-style notification vs thin accent strip). */
export type BulkEmailTopHero =
    | "none"
    | "thin_bar"
    | "notify_check"
    | "verify_panel"
    /** Dark ribbon + wordmark (event / keynote style) */
    | "brand_bar"
    /** Yellow–orange gradient, headline + discount + primary CTA in hero */
    | "promo_sunrise";

export type BulkEmailThemeTokens = {
    label: string;
    /** Short hint for the template gallery */
    tagline: string;
    outerBg: string;
    cardShadow: string;
    /** Hero strip / icon block at top of card */
    topHero: BulkEmailTopHero;
    /** Optional default ribbon text for thumbnails only (real sends use composer “Ribbon title”). */
    brandBarTitle?: string;
    /** Extra accent strip before footer (same link as primary CTA) */
    closingBanner?: boolean;
    /** When true, primary CTA renders only in hero + closing strip (not after body) */
    skipMidCta?: boolean;
    /** Copy for closing banner (theme-specific) */
    closingBannerEyebrow?: string;
    closingBannerBody?: string;
    /** Dark background + light “Follow us” copy */
    socialFooterOnDark?: boolean;
    accent: string;
    bodyColor: string;
    mutedColor: string;
    ctaStyle: "filled" | "outline";
    /** Text on filled CTA */
    ctaFilledFg: string;
    /** Border for outline CTA */
    ctaOutlineBorder: string;
    ctaOutlineFg: string;
    socialStripBg: string;
    /** Campaign image: full-width hero vs small logo row (top-left). */
    imageRole?: "full_width_hero" | "top_left_logo";
    /** Wrap `**like this**` in body with boldAccentColor (transactional templates). */
    richBodyBoldAccent?: boolean;
    boldAccentColor?: string;
    /** Main # headline alignment */
    headlineAlign?: "left" | "center";
};

export const BULK_EMAIL_THEMES: Record<BulkEmailThemeId, BulkEmailThemeTokens> = {
    indigo: {
        label: "Indigo studio",
        tagline: "Balanced default — violet CTA on clean white.",
        outerBg: "#e4e4e7",
        cardShadow: "0 4px 24px rgba(15,23,42,0.08)",
        topHero: "none",
        accent: "#4f46e5",
        bodyColor: "#18181b",
        mutedColor: "#71717a",
        ctaStyle: "filled",
        ctaFilledFg: "#ffffff",
        ctaOutlineBorder: "#4f46e5",
        ctaOutlineFg: "#4f46e5",
        socialStripBg: "#fafafa",
    },
    coral: {
        label: "Coral pop",
        tagline: "Bold confirmation block + check — signup & success emails.",
        outerBg: "#fff1f2",
        cardShadow: "0 8px 32px rgba(244,63,94,0.12)",
        topHero: "notify_check",
        accent: "#f43f5e",
        bodyColor: "#1c1917",
        mutedColor: "#57534e",
        ctaStyle: "filled",
        ctaFilledFg: "#ffffff",
        ctaOutlineBorder: "#f43f5e",
        ctaOutlineFg: "#e11d48",
        socialStripBg: "#fff7f7",
    },
    royal: {
        label: "Royal blue",
        tagline: "Verification header + envelope — confirm-email flows.",
        outerBg: "#eff6ff",
        cardShadow: "0 8px 28px rgba(37,99,235,0.1)",
        topHero: "verify_panel",
        accent: "#2563eb",
        bodyColor: "#0f172a",
        mutedColor: "#64748b",
        ctaStyle: "filled",
        ctaFilledFg: "#ffffff",
        ctaOutlineBorder: "#2563eb",
        ctaOutlineFg: "#2563eb",
        socialStripBg: "#f8fafc",
    },
    lavender: {
        label: "Lavender air",
        tagline: "Soft purple frame — friendly, product-led tone.",
        outerBg: "#f5f3ff",
        cardShadow: "0 8px 28px rgba(124,58,237,0.1)",
        topHero: "thin_bar",
        accent: "#7c3aed",
        bodyColor: "#1e1b4b",
        mutedColor: "#6b7280",
        ctaStyle: "filled",
        ctaFilledFg: "#ffffff",
        ctaOutlineBorder: "#7c3aed",
        ctaOutlineFg: "#6d28d9",
        socialStripBg: "#faf5ff",
    },
    noir: {
        label: "Editorial noir",
        tagline: "High contrast — black outline button, magazine feel.",
        outerBg: "#f4f4f5",
        cardShadow: "0 12px 40px rgba(15,23,42,0.12)",
        topHero: "thin_bar",
        accent: "#0f172a",
        bodyColor: "#0f172a",
        mutedColor: "#52525b",
        ctaStyle: "outline",
        ctaFilledFg: "#ffffff",
        ctaOutlineBorder: "#0f172a",
        ctaOutlineFg: "#0f172a",
        socialStripBg: "#fafafa",
    },
    jade: {
        label: "Jade fresh",
        tagline: "Calm green accent — check header for confirmations; renewals and clarity.",
        outerBg: "#ecfdf5",
        cardShadow: "0 8px 28px rgba(5,150,105,0.1)",
        topHero: "notify_check",
        accent: "#059669",
        bodyColor: "#14532d",
        mutedColor: "#4b5563",
        ctaStyle: "filled",
        ctaFilledFg: "#ffffff",
        ctaOutlineBorder: "#059669",
        ctaOutlineFg: "#047857",
        socialStripBg: "#f0fdf4",
    },
    summit: {
        label: "Summit events",
        tagline:
            "Dark ribbon (set your own ribbon title), cyan CTAs, closing banner — webinars and invites.",
        outerBg: "#e2e8f0",
        cardShadow: "0 14px 40px rgba(15,23,42,0.12)",
        topHero: "brand_bar",
        closingBanner: true,
        closingBannerEyebrow: "JOIN US",
        closingBannerBody: "Limited seats — use the same link if you still need to register.",
        socialFooterOnDark: true,
        accent: "#0284c7",
        bodyColor: "#0f172a",
        mutedColor: "#64748b",
        ctaStyle: "filled",
        ctaFilledFg: "#ffffff",
        ctaOutlineBorder: "#0284c7",
        ctaOutlineFg: "#0369a1",
        socialStripBg: "#0f172a",
    },
    activation: {
        label: "Service activation",
        tagline:
            "Light grey background, white card, logo top-left (upload or placeholder), black pill button, green bold highlights.",
        outerBg: "#f4f4f4",
        cardShadow: "0 1px 4px rgba(15,23,42,0.08)",
        topHero: "none",
        imageRole: "top_left_logo",
        accent: "#000000",
        bodyColor: "#0f172a",
        mutedColor: "#64748b",
        ctaStyle: "filled",
        ctaFilledFg: "#ffffff",
        ctaOutlineBorder: "#000000",
        ctaOutlineFg: "#000000",
        socialStripBg: "#fafafa",
        richBodyBoldAccent: true,
        boldAccentColor: "#15803d",
        headlineAlign: "center",
    },
    sunrise: {
        label: "Sunrise promo",
        tagline:
            "Yellow–orange gradient hero, big discount badge, forest-green buttons — upgrades and flash sales.",
        outerBg: "#f4f4f5",
        cardShadow: "0 12px 36px rgba(21,128,61,0.12)",
        topHero: "promo_sunrise",
        closingBanner: true,
        skipMidCta: true,
        closingBannerEyebrow: "DON'T MISS OUT",
        closingBannerBody: "Use the same link before this offer ends.",
        accent: "#15803d",
        bodyColor: "#0f172a",
        mutedColor: "#52525b",
        ctaStyle: "filled",
        ctaFilledFg: "#ffffff",
        ctaOutlineBorder: "#15803d",
        ctaOutlineFg: "#166534",
        socialStripBg: "#fafafa",
    },
};
