export type AppColorPresetKey =
  | "medical_green"
  | "light_blue"
  | "sunset_orange"
  | "royal_blue"
  | "violet_bloom"
  | "rose_blush"
  | "golden_amber"
  | "teal_ocean";

export type AppThemeSettings = {
  app_color_mode?: unknown;
  app_color_preset?: unknown;
  app_custom_primary_hex?: unknown;
  app_custom_accent_hex?: unknown;
  app_custom_secondary_hex?: unknown;
  app_custom_ring_hex?: unknown;
  app_ui_radius?: unknown;
  app_ui_scale?: unknown;
};

export const DEFAULT_CUSTOM_PALETTE = {
  primary: "#00c1ca",
  accent: "#00c1ca",
  secondary: "#0f766e",
  ring: "#00c1ca",
} as const;

type ColorPreset = {
  label: string;
  primary: string;
  accent: string;
  secondary: string;
  ring: string;
};

export const APP_COLOR_PRESETS: Record<AppColorPresetKey, ColorPreset> = {
  medical_green: {
    label: "Neo Synapse Cyan",
    primary: "183 100% 40%",
    accent: "183 100% 40%",
    secondary: "180 98% 16%",
    ring: "183 100% 40%",
  },
  light_blue: {
    label: "Light Blue",
    primary: "199 89% 48%",
    accent: "193 82% 58%",
    secondary: "204 80% 24%",
    ring: "199 89% 48%",
  },
  sunset_orange: {
    label: "Sunset Orange",
    primary: "24 95% 53%",
    accent: "12 85% 57%",
    secondary: "24 78% 25%",
    ring: "24 95% 53%",
  },
  royal_blue: {
    label: "Royal Blue",
    primary: "221 83% 53%",
    accent: "213 94% 68%",
    secondary: "224 64% 27%",
    ring: "221 83% 53%",
  },
  violet_bloom: {
    label: "Violet Bloom",
    primary: "268 83% 58%",
    accent: "280 82% 67%",
    secondary: "263 56% 27%",
    ring: "268 83% 58%",
  },
  rose_blush: {
    label: "Rose Blush",
    primary: "343 79% 58%",
    accent: "334 86% 72%",
    secondary: "336 54% 27%",
    ring: "343 79% 58%",
  },
  golden_amber: {
    label: "Golden Amber",
    primary: "38 92% 50%",
    accent: "45 93% 58%",
    secondary: "30 82% 25%",
    ring: "38 92% 50%",
  },
  teal_ocean: {
    label: "Teal Ocean",
    primary: "186 85% 39%",
    accent: "191 91% 48%",
    secondary: "189 72% 21%",
    ring: "186 85% 39%",
  },
};

const DEFAULT_PRESET: AppColorPresetKey = "medical_green";
const DEFAULT_RADIUS = "0.75rem";
const DEFAULT_SCALE = "1";
const DEFAULT_COLOR_MODE = "preset";

const ALLOWED_RADIUS = new Set(["0.5rem", "0.75rem", "1rem", "1.25rem"]);
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{6})$/;

function parseColorMode(value: unknown): "preset" | "custom" {
  return value === "custom" ? "custom" : DEFAULT_COLOR_MODE;
}

function parsePresetKey(value: unknown): AppColorPresetKey {
  if (typeof value !== "string") return DEFAULT_PRESET;
  if (value in APP_COLOR_PRESETS) return value as AppColorPresetKey;
  return DEFAULT_PRESET;
}

function parseRadius(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_RADIUS;
  return ALLOWED_RADIUS.has(value) ? value : DEFAULT_RADIUS;
}

function parseScale(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_SCALE;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_SCALE;
  const clamped = Math.min(1.05, Math.max(0.95, parsed));
  return clamped.toFixed(2).replace(/\.00$/, "");
}

function parseHexColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  return HEX_COLOR_RE.test(value) ? value : fallback;
}

function hexToHslString(hex: string): string {
  const normalized = hex.replace("#", "");
  const red = parseInt(normalized.slice(0, 2), 16) / 255;
  const green = parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    switch (max) {
      case red:
        hue = ((green - blue) / delta) % 6;
        break;
      case green:
        hue = (blue - red) / delta + 2;
        break;
      default:
        hue = (red - green) / delta + 4;
        break;
    }
  }

  const h = Math.round(hue * 60 < 0 ? hue * 60 + 360 : hue * 60);
  const s = Math.round(saturation * 100);
  const l = Math.round(lightness * 100);
  return `${h} ${s}% ${l}%`;
}

export function applyAppThemeSettings(settings: AppThemeSettings = {}) {
  if (typeof document === "undefined") return;

  const colorMode = parseColorMode(settings.app_color_mode);
  const presetKey = parsePresetKey(settings.app_color_preset);
  const radius = parseRadius(settings.app_ui_radius);
  const scale = parseScale(settings.app_ui_scale);
  const preset = APP_COLOR_PRESETS[presetKey];
  const primary = colorMode === "custom"
    ? hexToHslString(parseHexColor(settings.app_custom_primary_hex, DEFAULT_CUSTOM_PALETTE.primary))
    : preset.primary;
  const accent = colorMode === "custom"
    ? hexToHslString(parseHexColor(settings.app_custom_accent_hex, DEFAULT_CUSTOM_PALETTE.accent))
    : preset.accent;
  const secondary = colorMode === "custom"
    ? hexToHslString(parseHexColor(settings.app_custom_secondary_hex, DEFAULT_CUSTOM_PALETTE.secondary))
    : preset.secondary;
  const ring = colorMode === "custom"
    ? hexToHslString(parseHexColor(settings.app_custom_ring_hex, DEFAULT_CUSTOM_PALETTE.ring))
    : preset.ring;
  const root = document.documentElement;

  root.style.setProperty("--primary", primary);
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--secondary", secondary);
  root.style.setProperty("--ring", ring);
  root.style.setProperty("--sidebar-primary", primary);
  root.style.setProperty("--sidebar-ring", ring);
  root.style.setProperty("--category-pill-active", primary);
  root.style.setProperty("--budget-slider", primary);
  root.style.setProperty("--star", primary);
  root.style.setProperty("--radius", radius);
  root.style.setProperty("--ui-scale", scale);
}
