// The store's canvas-drawn signage (neon sign, genre signs) wants a condensed
// display face instead of the system default — Arial is what made the first
// pass of this scene look like placeholder art. Canvas text can't pick up a
// next/font CSS variable, so this loads the face directly and lets callers
// re-draw once it's ready.
const FONT_FAMILY = "Bebas Neue";
const STYLESHEET_HREF = "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap";

let linkInjected = false;
let loadPromise: Promise<void> | null = null;

export function displayFontFamily(): string {
  return `"${FONT_FAMILY}"`;
}

/** Resolves once the display font is usable by a 2D canvas context (or immediately if that can't be determined). */
export function ensureDisplayFont(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (loadPromise) return loadPromise;

  if (!linkInjected && !document.querySelector(`link[href="${STYLESHEET_HREF}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = STYLESHEET_HREF;
    document.head.appendChild(link);
    linkInjected = true;
  }

  if (!("fonts" in document)) {
    loadPromise = Promise.resolve();
    return loadPromise;
  }

  loadPromise = document.fonts
    .load(`900 64px ${displayFontFamily()}`)
    .then(() => undefined)
    .catch(() => undefined);
  return loadPromise;
}
