// Deterministic per-movie colour, used only when a real poster image is
// missing — the fallback card (lib/posterTexture.ts) and standee art need
// *some* colour, and picking it from a small curated set (rather than a
// fully random hue) keeps it inside the store's warm, dark palette.
export function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

interface Palette {
  colorFrom: string;
  colorTo: string;
  accent: string;
}

const PALETTES: Palette[] = [
  { colorFrom: "#5a4321", colorTo: "#151008", accent: "#f5c452" },
  { colorFrom: "#3a2a15", colorTo: "#0d0a05", accent: "#e8b34a" },
  { colorFrom: "#1c2b1a", colorTo: "#080b06", accent: "#7cc46b" },
  { colorFrom: "#2a2422", colorTo: "#0a0908", accent: "#c9432f" },
  { colorFrom: "#241a3a", colorTo: "#0a0712", accent: "#8a6bd6" },
  { colorFrom: "#1a1a1e", colorTo: "#050506", accent: "#d4b34a" },
  { colorFrom: "#1c2530", colorTo: "#06090c", accent: "#4fa0d6" },
  { colorFrom: "#241820", colorTo: "#080508", accent: "#d63f7a" },
  { colorFrom: "#141c2a", colorTo: "#05070a", accent: "#4a7fc9" },
  { colorFrom: "#181414", colorTo: "#060505", accent: "#c94a3f" },
];

export function paletteFor(id: string): Palette {
  return PALETTES[hashCode(id) % PALETTES.length];
}
