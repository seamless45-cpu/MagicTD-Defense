/**
 * FONT CATALOG
 *
 * MagicTD ships eighty UI fonts. Half of them are display faces (Permanent
 * Marker, EDO, Bungee, Press Start 2P …), the rest are clean readable text
 * faces for players who want the menus calmer. Every entry carries its own
 * fallback stack, so the game still renders correctly with no network at all.
 *
 * Google-hosted families are loaded lazily: only the font the player actually
 * picks is fetched (one stylesheet, once), instead of all eighty up front.
 * EDO is bundled locally; system stacks never touch the network.
 */
export interface FontDef {
  id: string;
  /** short label shown on the settings tile */
  name: string;
  /** font-family stack used for the UI */
  stack: string;
  /** Google Fonts family query (e.g. "Permanent+Marker") — omitted for local fonts */
  google?: string;
  /** bundled with the OS / already on the page, so never fetched */
  local?: boolean;
  /** display-face stack for headings; defaults to the UI stack */
  display?: string;
  /** rough grouping, used by the settings grid */
  group: "display" | "text" | "mono" | "script" | "system";
}

export const FONTS: FontDef[] = [
  // ---------- the defaults ----------
  { id: "rajdhani", name: "Rajdhani", stack: '"Rajdhani", system-ui, sans-serif', google: "Rajdhani:wght@500;600;700", display: '"Bungee", cursive', group: "display" },
  { id: "system", name: "System", stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', local: true, group: "system" },
  { id: "serif", name: "Classic Serif", stack: 'Georgia, "Times New Roman", serif', local: true, group: "text" },
  { id: "mono", name: "Terminal Mono", stack: 'ui-monospace, "Cascadia Mono", "Courier New", monospace', local: true, group: "mono" },

  // ---------- display / poster faces ----------
  { id: "marker", name: "Permanent Marker", stack: '"Permanent Marker", "Comic Sans MS", cursive', google: "Permanent+Marker", group: "display" },
  { id: "edo", name: "EDO", stack: '"EDO", sans-serif', local: true, group: "display" },
  { id: "bebas", name: "Bebas Neue", stack: '"Bebas Neue", Impact, "Arial Narrow", sans-serif', google: "Bebas+Neue", group: "display" },
  { id: "anton", name: "Anton", stack: '"Anton", Impact, sans-serif', google: "Anton", group: "display" },
  { id: "oswald", name: "Oswald", stack: '"Oswald", "Arial Narrow", sans-serif', google: "Oswald:wght@400;700", group: "display" },
  { id: "orbitron", name: "Orbitron", stack: '"Orbitron", "Trebuchet MS", sans-serif', google: "Orbitron:wght@500;700", group: "display" },
  { id: "audiowide", name: "Audiowide", stack: '"Audiowide", "Trebuchet MS", sans-serif', google: "Audiowide", group: "display" },
  { id: "pressstart", name: "Press Start 2P", stack: '"Press Start 2P", "Courier New", monospace', google: "Press+Start+2P", group: "display" },
  { id: "vt323", name: "VT323", stack: '"VT323", "Courier New", monospace', google: "VT323", group: "display" },
  { id: "silkscreen", name: "Silkscreen", stack: '"Silkscreen", "Courier New", monospace', google: "Silkscreen", group: "display" },
  { id: "monoton", name: "Monoton", stack: '"Monoton", "Trebuchet MS", cursive', google: "Monoton", group: "display" },
  { id: "bungee", name: "Bungee", stack: '"Bungee", Impact, sans-serif', google: "Bungee", group: "display" },
  { id: "bungeeshade", name: "Bungee Shade", stack: '"Bungee Shade", "Bungee", Impact, sans-serif', google: "Bungee+Shade", group: "display" },
  { id: "titanone", name: "Titan One", stack: '"Titan One", Impact, sans-serif', google: "Titan+One", group: "display" },
  { id: "luckiest", name: "Luckiest Guy", stack: '"Luckiest Guy", "Comic Sans MS", cursive', google: "Luckiest+Guy", group: "display" },
  { id: "fredoka", name: "Fredoka", stack: '"Fredoka", "Trebuchet MS", sans-serif', google: "Fredoka:wght@400;600", group: "display" },
  { id: "baloo", name: "Baloo 2", stack: '"Baloo 2", "Trebuchet MS", cursive', google: "Baloo+2:wght@400;700", group: "display" },
  { id: "chewy", name: "Chewy", stack: '"Chewy", "Comic Sans MS", cursive', google: "Chewy", group: "display" },
  { id: "tektur", name: "Tektur", stack: '"Tektur", "Trebuchet MS", sans-serif', google: "Tektur:wght@400;700", group: "display" },
  { id: "chakra", name: "Chakra Petch", stack: '"Chakra Petch", "Trebuchet MS", sans-serif', google: "Chakra+Petch:wght@400;700", group: "display" },
  { id: "saira", name: "Saira Condensed", stack: '"Saira Condensed", "Arial Narrow", sans-serif', google: "Saira+Condensed:wght@400;700", group: "display" },
  { id: "russo", name: "Russo One", stack: '"Russo One", Impact, sans-serif', google: "Russo+One", group: "display" },

  // ---------- handwriting / script ----------
  { id: "comic", name: "Comic Neue", stack: '"Comic Neue", "Comic Sans MS", cursive', google: "Comic+Neue:wght@400;700", group: "script" },
  { id: "patrick", name: "Patrick Hand", stack: '"Patrick Hand", "Comic Sans MS", cursive', google: "Patrick+Hand", group: "script" },
  { id: "caveat", name: "Caveat", stack: '"Caveat", "Comic Sans MS", cursive', google: "Caveat:wght@400;700", group: "script" },
  { id: "pacifico", name: "Pacifico", stack: '"Pacifico", "Brush Script MT", cursive', google: "Pacifico", group: "script" },
  { id: "greatvibes", name: "Great Vibes", stack: '"Great Vibes", "Brush Script MT", cursive', google: "Great+Vibes", group: "script" },
  { id: "unifrak", name: "Unifraktur", stack: '"UnifrakturMaguntia", "Old English Text MT", serif', google: "UnifrakturMaguntia", group: "script" },

  // ---------- bookish / editorial ----------
  { id: "cinzel", name: "Cinzel", stack: '"Cinzel", Georgia, serif', google: "Cinzel:wght@400;700", group: "text" },
  { id: "cinzeldeco", name: "Cinzel Decorative", stack: '"Cinzel Decorative", "Cinzel", Georgia, serif', google: "Cinzel+Decorative:wght@400;700", group: "text" },
  { id: "playfair", name: "Playfair Display", stack: '"Playfair Display", Georgia, serif', google: "Playfair+Display:wght@400;700", group: "text" },
  { id: "cormorant", name: "Cormorant Garamond", stack: '"Cormorant Garamond", Garamond, Georgia, serif', google: "Cormorant+Garamond:wght@400;600", group: "text" },
  { id: "merriweather", name: "Merriweather", stack: '"Merriweather", Georgia, serif', google: "Merriweather:wght@400;700", group: "text" },
  { id: "librebask", name: "Libre Baskerville", stack: '"Libre Baskerville", Georgia, serif', google: "Libre+Baskerville:wght@400;700", group: "text" },

  // ---------- clean sans text faces ----------
  { id: "grotesk", name: "Space Grotesk", stack: '"Space Grotesk", "Trebuchet MS", sans-serif', google: "Space+Grotesk:wght@400;700", group: "text" },
  { id: "nunito", name: "Nunito", stack: '"Nunito", "Trebuchet MS", sans-serif', google: "Nunito:wght@400;700", group: "text" },
  { id: "quicksand", name: "Quicksand", stack: '"Quicksand", "Trebuchet MS", sans-serif', google: "Quicksand:wght@400;700", group: "text" },
  { id: "poppins", name: "Poppins", stack: '"Poppins", "Trebuchet MS", sans-serif', google: "Poppins:wght@400;700", group: "text" },
  { id: "rubik", name: "Rubik", stack: '"Rubik", "Trebuchet MS", sans-serif', google: "Rubik:wght@400;700", group: "text" },
  { id: "montserrat", name: "Montserrat", stack: '"Montserrat", "Trebuchet MS", sans-serif', google: "Montserrat:wght@400;700", group: "text" },
  { id: "inter", name: "Inter", stack: '"Inter", system-ui, sans-serif', google: "Inter:wght@400;700", group: "text" },

  // ---------- monospace coding faces ----------
  { id: "spacemono", name: "Space Mono", stack: '"Space Mono", "Courier New", monospace', google: "Space+Mono:wght@400;700", group: "mono" },
  { id: "jetbrains", name: "JetBrains Mono", stack: '"JetBrains Mono", "Courier New", monospace', google: "JetBrains+Mono:wght@400;700", group: "mono" },
  { id: "firacode", name: "Fira Code", stack: '"Fira Code", "Courier New", monospace', google: "Fira+Code:wght@400;700", group: "mono" },
  { id: "courier", name: "Courier Prime", stack: '"Courier Prime", "Courier New", monospace', google: "Courier+Prime:wght@400;700", group: "mono" },
  { id: "ibmplex", name: "IBM Plex Mono", stack: '"IBM Plex Mono", "Courier New", monospace', google: "IBM+Plex+Mono:wght@400;700", group: "mono" },

  // ---------- new display + reading faces ----------
  { id: "oxanium", name: "Oxanium", stack: '"Oxanium", system-ui, sans-serif', google: "Oxanium:wght@400;600;700", group: "display" },
  { id: "exo2", name: "Exo 2", stack: '"Exo 2", system-ui, sans-serif', google: "Exo+2:wght@400;600;700", group: "display" },
  { id: "righteous", name: "Righteous", stack: '"Righteous", Impact, sans-serif', google: "Righteous", group: "display" },
  { id: "archivo-black", name: "Archivo Black", stack: '"Archivo Black", Impact, sans-serif', google: "Archivo+Black", group: "display" },
  { id: "unbounded", name: "Unbounded", stack: '"Unbounded", system-ui, sans-serif', google: "Unbounded:wght@400;600;700", group: "display" },
  { id: "barlow", name: "Barlow Condensed", stack: '"Barlow Condensed", "Arial Narrow", sans-serif', google: "Barlow+Condensed:wght@400;600;700", group: "text" },
  { id: "outfit", name: "Outfit", stack: '"Outfit", system-ui, sans-serif', google: "Outfit:wght@400;600;700", group: "text" },
  { id: "manrope", name: "Manrope", stack: '"Manrope", system-ui, sans-serif', google: "Manrope:wght@400;600;700", group: "text" },
  { id: "lora", name: "Lora", stack: '"Lora", Georgia, serif', google: "Lora:wght@400;600;700", group: "text" },
  { id: "sora", name: "Sora", stack: '"Sora", system-ui, sans-serif', google: "Sora:wght@400;600;700", group: "text" },

  // ---------- new additions: twenty more arena-ready typefaces ----------
  { id: "aldrich", name: "Aldrich", stack: '"Aldrich", system-ui, sans-serif', google: "Aldrich", group: "display" },
  { id: "blackops", name: "Black Ops One", stack: '"Black Ops One", Impact, sans-serif', google: "Black+Ops+One", group: "display" },
  { id: "changa", name: "Changa", stack: '"Changa", system-ui, sans-serif', google: "Changa:wght@400;600;700", group: "display" },
  { id: "electrolize", name: "Electrolize", stack: '"Electrolize", system-ui, sans-serif', google: "Electrolize", group: "display" },
  { id: "kronaone", name: "Krona One", stack: '"Krona One", system-ui, sans-serif', google: "Krona+One", group: "display" },
  { id: "michroma", name: "Michroma", stack: '"Michroma", system-ui, sans-serif', google: "Michroma", group: "display" },
  { id: "quantico", name: "Quantico", stack: '"Quantico", system-ui, sans-serif', google: "Quantico:wght@400;700", group: "display" },
  { id: "racing", name: "Racing Sans One", stack: '"Racing Sans One", system-ui, sans-serif', google: "Racing+Sans+One", group: "display" },
  { id: "tomorrow", name: "Tomorrow", stack: '"Tomorrow", system-ui, sans-serif', google: "Tomorrow:wght@400;600;700", group: "display" },
  { id: "zendots", name: "Zen Dots", stack: '"Zen Dots", system-ui, sans-serif', google: "Zen+Dots", group: "display" },
  { id: "alegreya", name: "Alegreya Sans", stack: '"Alegreya Sans", system-ui, sans-serif', google: "Alegreya+Sans:wght@400;700", group: "text" },
  { id: "cabin", name: "Cabin", stack: '"Cabin", system-ui, sans-serif', google: "Cabin:wght@400;700", group: "text" },
  { id: "dmsans", name: "DM Sans", stack: '"DM Sans", system-ui, sans-serif', google: "DM+Sans:wght@400;700", group: "text" },
  { id: "figtree", name: "Figtree", stack: '"Figtree", system-ui, sans-serif', google: "Figtree:wght@400;700", group: "text" },
  { id: "ibmplexsans", name: "IBM Plex Sans", stack: '"IBM Plex Sans", system-ui, sans-serif', google: "IBM+Plex+Sans:wght@400;700", group: "text" },
  { id: "kanit", name: "Kanit", stack: '"Kanit", system-ui, sans-serif', google: "Kanit:wght@400;700", group: "text" },
  { id: "lato", name: "Lato", stack: '"Lato", system-ui, sans-serif', google: "Lato:wght@400;700", group: "text" },
  { id: "lexend", name: "Lexend", stack: '"Lexend", system-ui, sans-serif', google: "Lexend:wght@400;700", group: "text" },
  { id: "roboto-condensed", name: "Roboto Condensed", stack: '"Roboto Condensed", "Arial Narrow", sans-serif', google: "Roboto+Condensed:wght@400;700", group: "text" },
  { id: "work-sans", name: "Work Sans", stack: '"Work Sans", system-ui, sans-serif', google: "Work+Sans:wght@400;700", group: "text" },
];

export const DEFAULT_FONT = "rajdhani";

export const FONT_BY_ID: Record<string, FontDef> = Object.fromEntries(
  FONTS.map((f) => [f.id, f])
);

/** the stack for a font id, always falling back to the default UI stack */
export function fontStack(id: string | undefined): string {
  return (FONT_BY_ID[id || ""] || FONT_BY_ID[DEFAULT_FONT]).stack;
}

/** the heading stack for a font id */
export function fontDisplayStack(id: string | undefined): string {
  const f = FONT_BY_ID[id || ""] || FONT_BY_ID[DEFAULT_FONT];
  // The selected face is used for every text role; no silent Bungee/header
  // substitution when the player explicitly picked another font.
  return f.stack;
}

/** ids of fonts that have already had their stylesheet injected */
const loaded = new Set<string>();

/**
 * Fetch the stylesheet for one Google-hosted family. Local / system entries
 * (and the default Rajdhani, which app.html already links) are no-ops, so the
 * game never pays for a font it cannot use.
 */
export function ensureFontLoaded(id: string): void {
  const f = FONT_BY_ID[id];
  if (!f || !f.google || f.local || loaded.has(f.id)) return;
  if (typeof document === "undefined") return;
  loaded.add(f.id);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`;
  link.dataset.magictdFont = f.id;
  document.head.appendChild(link);
}

/**
 * Apply a font to the whole shell. The UI and the display headings both move,
 * so a picked face is actually visible everywhere instead of only on body copy.
 */
export function applyFont(id: string): void {
  const f = FONT_BY_ID[id] || FONT_BY_ID[DEFAULT_FONT];
  ensureFontLoaded(f.id);
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const stack = fontStack(f.id);
  root.style.setProperty("--font-ui", stack);
  root.style.setProperty("--font-disp", fontDisplayStack(f.id));
  root.dataset.magictdFont = f.id;
  // Cache the resolved stack so the static boot splash in app.html can paint
  // the player's face before React (and the font stylesheet) have loaded.
  try {
    localStorage.setItem("magictd_font_stack", stack);
    localStorage.setItem("magictd_font_id", f.id);
    localStorage.setItem("magictd_font_google", f.google || "");
  } catch {
    /* private mode / quota: the splash just uses the default face */
  }
  // Canvas text is cached as a font shorthand in Battle.tsx. Tell the arena a
  // face changed even when it mounted before the picker was used.
  try {
    document.dispatchEvent(new CustomEvent("magictd-font", { detail: { id: f.id, stack } }));
  } catch {
    /* old browsers without CustomEvent */
  }
  if (typeof document.fonts?.ready?.then === "function") {
    document.fonts.ready.then(() => {
      try {
        document.dispatchEvent(new CustomEvent("magictd-font", { detail: { id: f.id, stack } }));
      } catch {
        /* ignore */
      }
    }).catch(() => {});
  }
}
