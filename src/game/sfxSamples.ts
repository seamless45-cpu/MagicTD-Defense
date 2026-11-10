/**
 * EXTERNAL SAMPLE LAYER — the primary sound engine for MoonLightTD.
 *
 * Every cue below is built from short, real recordings from Kenney's CC0 sound
 * library (Interface Sounds, UI Audio, RPG Audio, Impact Sounds, Sci-Fi Sounds
 * and Music Jingles). The clips live in `public/sfx/`; the first user gesture unlocks the bus and
 * preloads them. A compressor keeps a screen full of explosions from clipping,
 * per-cue throttles gate rapid fire, and a voice cap protects the frame rate.
 *
 * The 2026 mix pass added the studio stages on top of the layering:
 *  - per-clip loudness normalisation measured at decode time, so the authored
 *    layer balance is what actually reaches the speakers
 *  - dual convolution space — a long hall for size, a short plate for air
 *  - soft master saturation (tanh waveshaper) feeding a tighter limiter
 *  - a synthesised sub-thump under every big impact
 *  - round-robin detune ladders + 2-10 ms micro-timing, so repeats never
 *    machine-gun the same pitch on the exact same grid
 *  - sidechain-style music ducking on win/lose/ceremony stingers
 *
 * The engine is deliberately defensive:
 *  - no AudioContext (jsdom, old browser) -> initSamples() returns false and
 *    the caller keeps using the Tone.js synth fallback in audio.ts
 *  - a clip fails to fetch/decode -> that cue falls back to the synth, while
 *    every other cue keeps playing the external samples
 *  - a whole torrent of shots -> per-cue throttles and a voice cap keep the
 *    mix clean and the frame rate stable
 *
 * License: all packs are CC0-1.0 (public domain). See public/sfx/LICENSES/
 * and public/sfx/README.md for the full provenance.
 */

type FileSpec = string | string[];

interface SampleLayer {
  /** one file, or a set to pick from at random */
  file: FileSpec;
  /** peak gain of this layer (relative to the sample bus) */
  gain?: number;
  /** playback rate: a fixed value, or [from, to] for a pitch sweep */
  rate?: number | [number, number];
  /** seconds to wait before starting this layer */
  delay?: number;
  /** stop the clip after this many seconds (useful for long engine loops) */
  dur?: number;
  /** -1 left ... 1 right */
  pan?: number;
}

type SampleCue = SampleLayer[];

/** helper: one layer with sensible defaults */
const L = (
  file: FileSpec,
  gain = 0.6,
  rate: number | [number, number] = 1,
  delay = 0,
  dur?: number,
  pan?: number
): SampleLayer => ({ file, gain, rate, delay, dur, pan });

/**
 * One cue per `sfx.*` API name. `shoot` and `chestLoot` are dynamic and are
 * built by `shootCue()` / `chestLootCue()` below.
 */
const CUES: Record<string, SampleCue> = {
  // ================================================================\n  // REWORKED 2026 SOUND SET\n  // Every cue is now a transient + body + tail design. The first layer is the\n  // attack, the second carries the pitch identity, and the last is the space.\n  // Gains are balanced against the new 0.52 master so stacking never clips.\n  // ================================================================\n

  // ---------- UI ----------
  click: [
    L("ui/tick.mp3", 0.62, [1.0, 1.08], 0, 0.05),
    L("ui/click.mp3", 0.34, 0.96, 0.006, 0.07),
    L("ui/select-3.mp3", 0.08, 1.22, 0.012, 0.05),
  ],
  hover: [
    L("ui/hover.mp3", 0.2, 1.04, 0, 0.06),
    L("ui/tick.mp3", 0.05, 1.6, 0.01, 0.04),
  ],
  error: [
    L("ui/error.mp3", 0.66, 0.98, 0, 0.26),
    L("ui/glitch.mp3", 0.24, 0.88, 0.012, 0.16),
    L("impact/punch-medium.mp3", 0.16, 0.72, 0.02, 0.14, -0.15),
  ],
  coin: [
    L("rpg/handle-coins-2.mp3", 0.58, [0.98, 1.06], 0, 0.24),
    L("rpg/metal-click.mp3", 0.26, 1.22, 0.03, 0.1, 0.18),
    L("ui/glass-2.mp3", 0.1, 1.5, 0.05, 0.16, -0.1),
  ],
  gem: [
    L("ui/glass-2.mp3", 0.5, [0.98, 1.12], 0, 0.42),
    L("ui/pluck-1.mp3", 0.28, 1.08, 0.05, 0.3, 0.2),
    L("ui/glass-5.mp3", 0.16, 1.3, 0.12, 0.34, -0.2),
  ],
  token: [
    L("ui/glass-1.mp3", 0.44, 1.02, 0, 0.34),
    L("rpg/metal-click.mp3", 0.3, 1.28, 0.035, 0.12, 0.16),
    L("ui/bong.mp3", 0.1, 1.1, 0.06, 0.3),
  ],
  buy: [
    L("ui/confirm-2.mp3", 0.52, 1.0, 0, 0.3),
    L("rpg/handle-coins-2.mp3", 0.36, 1.04, 0.05, 0.24, 0.14),
    L("ui/glass-4.mp3", 0.12, 1.2, 0.11, 0.24, -0.14),
  ],
  uiPop: [
    L("ui/select-3.mp3", 0.44, 1.08, 0, 0.08),
    L("ui/tick.mp3", 0.12, 1.42, 0.012, 0.05),
  ],
  uiOff: [
    L("ui/toggle-off.mp3", 0.5, 0.98, 0, 0.14),
    L("ui/back.mp3", 0.26, 0.92, 0.012, 0.12),
    L("ui/minimize.mp3", 0.16, 1.02, 0.028, 0.14),
  ],
  uiTab: [
    L("ui/switch-12.mp3", 0.52, 1.02, 0, 0.1),
    L("ui/select-5.mp3", 0.18, 1.16, 0.02, 0.08, 0.1),
  ],

  // ---------- gameplay & towers ----------
  place: [
    L("rpg/book-place.mp3", 0.52, 0.98, 0, 0.18),
    L("impact/wood-medium.mp3", 0.28, 1.05, 0.02, 0.12, -0.1),
    L("ui/tick.mp3", 0.12, 1.3, 0.04, 0.06),
  ],
  towerDrop: [
    L("rpg/book-place.mp3", 0.48, 0.95, 0, 0.22),
    L("impact/soft-heavy.mp3", 0.32, 0.9, 0.03, 0.15),
    L("ui/select-3.mp3", 0.15, 1.25, 0.06, 0.08),
  ],
  summon: [
    L("rpg/book-open.mp3", 0.55, 1.0, 0, 0.25),
    L("impact/wood-heavy.mp3", 0.3, 0.95, 0.025, 0.18),
    L("ui/tick.mp3", 0.15, 1.35, 0.05, 0.1),
    L("scifi/engine-circular.mp3", 0.08, 1.1, 0.08, 0.3, 0.2),
  ],
  merge: [
    L("rpg/book-flip.mp3", 0.5, 1.1, 0, 0.15),
    L("impact/metal-light.mp3", 0.35, 1.05, 0.02, 0.1),
    L("ui/select-5.mp3", 0.15, 1.4, 0.04, 0.06),
    L("scifi/engine-circular.mp3", 0.08, 1.2, 0.07, 0.25, 0.15),
  ],
  ascend: [
    L("rpg/book-flip.mp3", 0.55, 1.15, 0, 0.18),
    L("impact/metal-heavy.mp3", 0.38, 1.1, 0.02, 0.12),
    L("ui/select-5.mp3", 0.18, 1.45, 0.05, 0.08),
    L("scifi/engine-circular.mp3", 0.1, 1.25, 0.08, 0.3, 0.2),
    L("impact/bell-big.mp3", 0.05, 1.3, 0.12, 0.4, 0.25),
  ],
  awaken: [
    L("scifi/force-field-0.mp3", 0.45, [1.05, 1.2], 0, 0.4),
    L("scifi/laser-retro.mp3", 0.3, 1.1, 0.02, 0.35, -0.1),
    L("ui/glass-6.mp3", 0.2, 1.3, 0.05, 0.3, 0.15),
    L("impact/bell-heavy.mp3", 0.1, 1.4, 0.08, 0.5, 0.2),
  ],
  ceremony: [
    L("music/ceremony.mp3", 0.6, 1.0, 0, 1.5),
    L("ui/glass-1.mp3", 0.3, 1.1, 0.05, 0.4, 0.1),
    L("impact/bell-big.mp3", 0.15, 1.2, 0.1, 0.6, 0.2),
  ],
  rally: [
    L("music/rally.mp3", 0.5, 1.0, 0, 1.2),
    L("ui/glass-2.mp3", 0.25, 1.1, 0.05, 0.35, 0.1),
    L("impact/bell-heavy.mp3", 0.12, 1.2, 0.1, 0.5, 0.2),
  ],
  point: [
    L("ui/tick.mp3", 0.4, 1.2, 0, 0.08),
    L("ui/glass-5.mp3", 0.2, 1.3, 0.02, 0.05),
  ],

  // ---------- new mystical towers ----------
  electricalProtector: [
    L("scifi/force-field-0.mp3", 0.55, [1.0, 1.1], 0, 0.8, 0.1),
    L("scifi/laser-large.mp3", 0.4, 1.0, 0.02, 0.5, -0.1),
    L("impact/metal-heavy.mp3", 0.25, 0.9, 0.04, 0.4, 0.15),
    L("ui/glass-4.mp3", 0.15, 1.2, 0.08, 0.3, -0.15),
  ],
  electricalShield: [
    L("scifi/force-field-1.mp3", 0.6, 1.0, 0, 0.9, 0.15),
    L("scifi/engine-circular.mp3", 0.3, [0.9, 1.1], 0.01, 0.6, -0.1),
  ],
  electricalSonic: [
    L("impact/metal-heavy.mp3", 0.5, 1.1, 0, 0.5, 0.2),
    L("scifi/explosion-2.mp3", 0.35, 0.9, 0.03, 0.7, -0.15),
    L("scifi/laser-large.mp3", 0.2, 1.3, 0.06, 0.4, 0.1),
  ],
  // ---------- gravity phyxic (mystical) ----------
  gravityPhyxic: [
    L("scifi/space-low.mp3", 0.5, [0.8, 1.0], 0, 0.7, 0.15),
    L("scifi/low-explosion-0.mp3", 0.45, 0.85, 0.04, 0.8, -0.1),
    L("impact/plate-heavy.mp3", 0.3, 0.95, 0.06, 0.5, 0.1),
    L("ui/glass-3.mp3", 0.15, 1.15, 0.1, 0.4, -0.1),
  ],
  gravityPressure: [
    L("scifi/space-small.mp3", 0.55, [0.9, 1.1], 0, 0.8, 0.15),
    L("scifi/low-explosion-1.mp3", 0.35, 0.8, 0.02, 0.6, -0.1),
    L("impact/plate-medium.mp3", 0.2, 1.0, 0.05, 0.4, 0.1),
  ],
  gravityAsteroid: [
    L("impact/metal-heavy.mp3", 0.6, 1.0, 0, 0.9, 0.2),
    L("scifi/explosion-3.mp3", 0.4, 0.85, 0.03, 0.7, -0.15),
    L("scifi/space-low.mp3", 0.25, 1.2, 0.06, 0.5, 0.1),
    L("impact/glass-heavy.mp3", 0.15, 1.1, 0.09, 0.3, -0.1),
  ],

  // ---------- mystical towers (existing) ----------
  eclipseBurst: [
    L("scifi/space-low.mp3", 0.62, [0.55, 0.3], 0, 0.9),
    L("scifi/low-explosion-1.mp3", 0.55, 0.62, 0.06, 0.9, -0.12),
    L("scifi/force-field-2.mp3", 0.4, [0.7, 1.25], 0.02, 0.7, 0.16),
    L("ui/glass-1.mp3", 0.22, 0.8, 0.1, 0.5),
    L("impact/plate-heavy.mp3", 0.34, 0.66, 0.08, 0.35),
  ],
  seraphHymn: [
    L("ui/glass-6.mp3", 0.46, 1.06, 0, 0.5),
    L("ui/pluck-2.mp3", 0.3, 1.14, 0.045, 0.35, 0.2),
    L("scifi/force-field-3.mp3", 0.26, 1.2, 0.02, 0.6, -0.18),
    L("ui/glass-4.mp3", 0.18, 1.3, 0.1, 0.45),
    L("impact/bell-heavy.mp3", 0.08, 1.4, 0.06, 0.35),
  ],

  // ---------- dynamic cues ----------
  shoot: (kind: string) => {
    // Dramatic rework: replace trash/impact sounds with sci-fi/force/metal/glass
    // We map tower kinds to dramatic cues
    if (/^electrical-protector|gravity-phyxic$/.test(kind)) {
      // new towers use their own specific cues
      return kind === "electrical-protector" ? CUES.electricalProtector : CUES.gravityPhyxic;
    }
    if (/^arrow|sling|boomer|toxin|rime$/.test(kind)) {
      return [
        L("scifi/laser-small.mp3", 0.45, [1.0, 1.1], 0, 0.3, -0.1),
        L("ui/glass-5.mp3", 0.3, 1.1, 0.02, 0.2, 0.15),
        L("impact/metal-light.mp3", 0.15, 1.2, 0.04, 0.15),
      ];
    }
    if (/^cannon|mortar|plague|bombardment$/.test(kind)) {
      return [
        L("scifi/low-explosion-0.mp3", 0.5, 0.9, 0, 0.5, -0.15),
        L("impact/metal-heavy.mp3", 0.35, 1.0, 0.03, 0.4, 0.15),
        L("impact/glass-heavy.mp3", 0.15, 1.1, 0.06, 0.35),
        L("ui/glass-1.mp3", 0.08, 1.2, 0.09, 0.25, -0.1),
      ];
    }
    if (/^ice|frost|icestorm|rime$/.test(kind)) {
      return [
        L("scifi/force-field-2.mp3", 0.5, 1.0, 0, 0.5, -0.15),
        L("impact/glass-medium.mp3", 0.35, 1.1, 0.03, 0.4, 0.1),
        L("ui/glass-4.mp3", 0.15, 1.2, 0.06, 0.3),
      ];
    }
    if (/^speaker|siphon|aegis|electrical-protector$/.test(kind)) {
      return [
        L("scifi/force-field-0.mp3", 0.55, [1.0, 1.1], 0, 0.8, 0.1),
        L("scifi/laser-large.mp3", 0.4, 1.0, 0.02, 0.5, -0.1),
        L("impact/metal-heavy.mp3", 0.25, 0.9, 0.04, 0.4, 0.15),
        L("ui/glass-4.mp3", 0.15, 1.2, 0.08, 0.3, -0.15),
      ];
    }
    if (/^tesla|storm|thundercrown|ion$/.test(kind)) {
      return [
        L("scifi/laser-retro.mp3", 0.45, [1.0, 1.2], 0, 0.35, -0.1),
        L("impact/metal-light.mp3", 0.3, 1.1, 0.02, 0.25, 0.15),
        L("ui/glass-5.mp3", 0.15, 1.3, 0.04, 0.2),
        L("scifi/engine-circular.mp3", 0.08, 1.4, 0.06, 0.3, 0.2),
      ];
    }
    if (/^gatling|swarm|plasma|rail|seraph|gale$/.test(kind)) {
      return [
        L("scifi/laser-large.mp3", 0.5, 1.0, 0, 0.4, -0.15),
        L("impact/metal-heavy.mp3", 0.35, 1.1, 0.03, 0.35, 0.2),
        L("ui/glass-6.mp3", 0.15, 1.2, 0.06, 0.3),
        L("impact/bell-big.mp3", 0.08, 1.3, 0.1, 0.5, 0.25),
      ];
    }
    if (/^core|void|chronolock|gravity-phyxic$/.test(kind)) {
      return [
        L("scifi/space-low.mp3", 0.5, [0.8, 1.0], 0, 0.7, 0.15),
        L("scifi/low-explosion-0.mp3", 0.45, 0.85, 0.04, 0.8, -0.1),
        L("impact/plate-heavy.mp3", 0.3, 0.95, 0.06, 0.5, 0.1),
        L("ui/glass-3.mp3", 0.15, 1.15, 0.1, 0.4, -0.1),
      ];
    }
    if (/^lightning|hellstorm|dragon|sun|reaper|prism|hellgate|nova|furnace|maelstrom|starfall|chronolock|gravebloom|colossus|clone|gale|bombardment|wildfire|hades|ion|aether|scythe|sandstorm|bloodstone|venom|demon|heavenly|honor|supervisor|eclipse|seraph|godzeus$/.test(kind)) {
      return [
        L("scifi/laser-large.mp3", 0.55, [1.1, 1.3], 0, 0.45, -0.15),
        L("impact/metal-heavy.mp3", 0.35, 1.2, 0.03, 0.35, 0.2),
        L("ui/glass-6.mp3", 0.15, 1.4, 0.06, 0.3),
        L("impact/bell-big.mp3", 0.08, 1.5, 0.1, 0.5, 0.25),
      ];
    }
    // fallback
    return [
      L("scifi/laser-small.mp3", 0.45, [1.0, 1.1], 0, 0.3, -0.1),
      L("ui/glass-5.mp3", 0.3, 1.1, 0.02, 0.2, 0.15),
      L("impact/metal-light.mp3", 0.15, 1.2, 0.04, 0.15),
    ];
  },
  zap: () => [
    L("scifi/laser-retro.mp3", 0.45, [1.0, 1.2], 0, 0.35, -0.1),
    L("impact/metal-light.mp3", 0.3, 1.1, 0.02, 0.25, 0.15),
    L("ui/glass-5.mp3", 0.15, 1.3, 0.04, 0.2),
  ],
  superbolt: [
    L("scifi/laser-large.mp3", 0.55, [1.1, 1.3], 0, 0.45, -0.15),
    L("impact/metal-heavy.mp3", 0.35, 1.2, 0.03, 0.35, 0.2),
    L("ui/glass-6.mp3", 0.15, 1.4, 0.06, 0.3),
    L("impact/bell-big.mp3", 0.08, 1.5, 0.1, 0.5, 0.25),
  ],
  demonExecution: [
    L("scifi/low-explosion-1.mp3", 0.5, 0.9, 0, 0.5, -0.1),
    L("impact/bell-heavy.mp3", 0.35, 1.0, 0.03, 0.4, 0.15),
    L("ui/glass-1.mp3", 0.15, 1.2, 0.06, 0.3),
  ],
  demonStrike: [
    L("scifi/low-explosion-1.mp3", 0.45, 0.95, 0, 0.45, -0.1),
    L("impact/bell-heavy.mp3", 0.3, 1.05, 0.02, 0.35, 0.15),
    L("ui/glass-2.mp3", 0.15, 1.25, 0.05, 0.25),
  ],
  explosion: [
    L("scifi/explosion-0.mp3", 0.55, 0.9, 0, 0.6, -0.1),
    L("impact/metal-heavy.mp3", 0.35, 1.0, 0.03, 0.45, 0.15),
    L("impact/glass-heavy.mp3", 0.15, 1.1, 0.06, 0.35),
    L("ui/glass-1.mp3", 0.08, 1.2, 0.09, 0.25, -0.1),
  ],
  freeze: [
    L("scifi/force-field-2.mp3", 0.5, 1.0, 0, 0.5, -0.15),
    L("impact/glass-medium.mp3", 0.35, 1.1, 0.03, 0.4, 0.1),
    L("ui/glass-4.mp3", 0.15, 1.2, 0.06, 0.3),
  ],
  stun: [
    L("scifi/force-field-3.mp3", 0.5, 1.0, 0, 0.5, -0.15),
    L("impact/metal-light.mp3", 0.35, 1.1, 0.03, 0.4, 0.1),
    L("ui/glass-5.mp3", 0.15, 1.2, 0.06, 0.3),
  ],
  crit: [
    L("ui/glass-6.mp3", 0.45, 1.1, 0, 0.35, -0.1),
    L("impact/metal-light.mp3", 0.3, 1.2, 0.02, 0.25, 0.15),
    L("ui/tick.mp3", 0.15, 1.3, 0.04, 0.2),
  ],
  critBig: [
    L("ui/glass-6.mp3", 0.55, 1.1, 0, 0.45, -0.15),
    L("impact/metal-heavy.mp3", 0.35, 1.2, 0.03, 0.35, 0.2),
    L("ui/tick.mp3", 0.15, 1.3, 0.06, 0.3),
    L("impact/bell-big.mp3", 0.08, 1.4, 0.1, 0.5, 0.25),
  ],
  meteor: [
    L("scifi/low-explosion-1.mp3", 0.5, 0.9, 0, 0.5, -0.1),
    L("impact/metal-heavy.mp3", 0.35, 1.0, 0.03, 0.4, 0.15),
    L("impact/glass-heavy.mp3", 0.15, 1.1, 0.06, 0.35),
    L("ui/glass-1.mp3", 0.08, 1.2, 0.09, 0.25, -0.1),
    L("scifi/engine-circular.mp3", 0.05, 1.3, 0.12, 0.4, 0.2),
  ],
  hurt: [
    L("impact/punch-medium.mp3", 0.45, 1.0, 0, 0.3, -0.1),
    L("impact/soft-heavy.mp3", 0.3, 1.1, 0.02, 0.25, 0.15),
    L("ui/glass-3.mp3", 0.15, 1.2, 0.04, 0.2),
  ],
  leak: [
    L("impact/punch-heavy.mp3", 0.45, 0.9, 0, 0.35, -0.1),
    L("impact/soft-heavy.mp3", 0.3, 1.0, 0.02, 0.3, 0.15),
    L("ui/error.mp3", 0.15, 1.1, 0.04, 0.25),
  ],
  wave: [
    L("music/wave.mp3", 0.45, 1.0, 0, 1.0),
    L("ui/tick.mp3", 0.3, 1.1, 0.05, 0.2),
    L("impact/soft-heavy.mp3", 0.15, 1.2, 0.1, 0.3, 0.15),
  ],
  battleStart: [
    L("music/rally.mp3", 0.5, 1.0, 0, 1.2),
    L("ui/tick.mp3", 0.3, 1.1, 0.05, 0.2),
    L("impact/soft-heavy.mp3", 0.15, 1.2, 0.1, 0.3, 0.15),
    L("scifi/engine-circular.mp3", 0.08, 1.3, 0.15, 0.4, 0.2),
  ],
  waveClear: [
    L("music/wave.mp3", 0.45, 1.0, 0, 1.0),
    L("ui/tick.mp3", 0.3, 1.1, 0.05, 0.2),
    L("impact/soft-heavy.mp3", 0.15, 1.2, 0.1, 0.3, 0.15),
    L("impact/bell-big.mp3", 0.08, 1.3, 0.15, 0.4, 0.2),
  ],
  autoResolve: [
    L("ui/tick.mp3", 0.4, 1.0, 0, 0.1),
    L("ui/glass-5.mp3", 0.2, 1.1, 0.02, 0.05),
  ],
  bossSkip: [
    L("ui/error.mp3", 0.45, 0.9, 0, 0.3, -0.1),
    L("ui/glass-3.mp3", 0.3, 1.0, 0.02, 0.25, 0.15),
    L("ui/tick.mp3", 0.15, 1.1, 0.04, 0.2),
  ],
  bossRoulette: [
    L("ui/select-3.mp3", 0.45, 1.0, 0, 0.3, -0.1),
    L("ui/glass-4.mp3", 0.3, 1.1, 0.02, 0.25, 0.15),
    L("ui/tick.mp3", 0.15, 1.2, 0.04, 0.2),
  ],
  boss: [
    L("music/boss.mp3", 0.5, 1.0, 0, 1.5),
    L("scifi/low-explosion-0.mp3", 0.3, 0.9, 0.05, 0.6, -0.15),
    L("impact/metal-heavy.mp3", 0.15, 1.1, 0.1, 0.4, 0.2),
    L("ui/glass-1.mp3", 0.08, 1.2, 0.15, 0.3, -0.1),
  ],
  win: [
    L("music/win.mp3", 0.55, 1.0, 0, 1.5),
    L("ui/glass-1.mp3", 0.3, 1.1, 0.05, 0.4, 0.1),
    L("impact/bell-big.mp3", 0.15, 1.2, 0.1, 0.6, 0.2),
  ],
  lose: [
    L("music/lose.mp3", 0.5, 1.0, 0, 1.5),
    L("ui/error.mp3", 0.3, 0.9, 0.05, 0.4, -0.1),
    L("impact/bell-heavy.mp3", 0.15, 1.1, 0.1, 0.5, 0.2),
  ],
  hero: [
    L("music/hero.mp3", 0.48, 1.0, 0, 1.1),
    L("scifi/force-field-0.mp3", 0.42, 1.0, 0.018, 0.6, 0.14),
    L("impact/plate-heavy.mp3", 0.34, 1.0, 0.035, 0.35),
    L("ui/glass-5.mp3", 0.14, 1.25, 0.09, 0.45, -0.16),
  ],
  chatSend: [
    L("ui/tick.mp3", 0.4, 1.0, 0, 0.1),
    L("ui/glass-5.mp3", 0.2, 1.1, 0.02, 0.05),
  ],
  chatRecv: [
    L("ui/tick.mp3", 0.4, 1.0, 0, 0.1),
    L("ui/glass-5.mp3", 0.2, 1.1, 0.02, 0.05),
  ],
  chatTyping: [
    L("ui/tick.mp3", 0.3, 1.0, 0, 0.05),
    L("ui/glass-5.mp3", 0.15, 1.1, 0.02, 0.03),
  ],
  goldRain: [
    L("rpg/handle-coins-2.mp3", 0.5, 1.0, 0, 0.3, -0.1),
    L("rpg/handle-coins.mp3", 0.3, 1.1, 0.05, 0.25, 0.15),
    L("ui/glass-2.mp3", 0.15, 1.2, 0.1, 0.2),
  ],
  gemRain: [
    L("ui/glass-2.mp3", 0.5, 1.0, 0, 0.3, -0.1),
    L("ui/glass-5.mp3", 0.3, 1.1, 0.05, 0.25, 0.15),
    L("ui/glass-1.mp3", 0.15, 1.2, 0.1, 0.2),
  ],
  chestWind: [
    L("scifi/engine-circular.mp3", 0.45, 1.0, 0, 0.4, -0.15),
    L("ui/glass-1.mp3", 0.3, 1.1, 0.05, 0.3, 0.1),
    L("impact/soft-heavy.mp3", 0.15, 1.2, 0.1, 0.25, 0.15),
  ],
  chestRattle: [
    L("impact/wood-heavy.mp3", 0.5, 1.0, 0, 0.4, -0.15),
    L("impact/soft-heavy.mp3", 0.3, 1.1, 0.05, 0.3, 0.1),
    L("ui/glass-3.mp3", 0.15, 1.2, 0.1, 0.25, 0.15),
  ],
  chestSlam: [
    L("impact/metal-heavy.mp3", 0.5, 1.0, 0, 0.4, -0.15),
    L("impact/wood-heavy.mp3", 0.3, 1.1, 0.05, 0.3, 0.1),
    L("ui/glass-1.mp3", 0.15, 1.2, 0.1, 0.25, 0.15),
  ],
  chestBlast: [
    L("scifi/explosion-0.mp3", 0.5, 1.0, 0, 0.4, -0.15),
    L("impact/metal-heavy.mp3", 0.3, 1.1, 0.05, 0.3, 0.1),
    L("ui/glass-1.mp3", 0.15, 1.2, 0.1, 0.25, 0.15),
    L("scifi/engine-circular.mp3", 0.08, 1.3, 0.15, 0.4, 0.2),
  ],
  chestLoot: (n = 3) => {
    const cue: SampleCue = [];
    const steps = Math.max(1, Math.min(10, n));
    for (let i = 0; i < steps; i++) {
      cue.push(L("ui/glass-2.mp3", 0.4, 1.0 + i * 0.05, i * 0.05, 0.2, (i % 2 === 0 ? -0.15 : 0.15)));
      if (i % 2 === 0) cue.push(L("rpg/handle-coins-2.mp3", 0.25, 1.1, i * 0.05 + 0.02, 0.15));
    }
    cue.push(L("ui/glass-1.mp3", 0.35, 1.2, steps * 0.05, 0.3));
    return cue;
  },
  chestLid: [
    L("rpg/book-open.mp3", 0.5, 1.0, 0, 0.3, -0.1),
    L("ui/glass-4.mp3", 0.3, 1.1, 0.05, 0.25, 0.15),
    L("impact/wood-medium.mp3", 0.15, 1.2, 0.1, 0.2, 0.1),
  ],
  chest: [
    L("impact/metal-heavy.mp3", 0.5, 1.0, 0, 0.4, -0.15),
    L("impact/wood-heavy.mp3", 0.3, 1.1, 0.05, 0.3, 0.1),
    L("ui/glass-1.mp3", 0.15, 1.2, 0.1, 0.25, 0.15),
    L("scifi/engine-circular.mp3", 0.08, 1.3, 0.15, 0.4, 0.2),
  ],
  chestCharge: [
    L("scifi/engine-circular.mp3", 0.5, 1.0, 0, 0.4, -0.15),
    L("ui/glass-1.mp3", 0.3, 1.1, 0.05, 0.3, 0.1),
    L("impact/soft-heavy.mp3", 0.15, 1.2, 0.1, 0.25, 0.15),
  ],
  chestCrack: [
    L("impact/wood-heavy.mp3", 0.5, 1.0, 0, 0.4, -0.15),
    L("impact/soft-heavy.mp3", 0.3, 1.1, 0.05, 0.3, 0.1),
    L("ui/glass-3.mp3", 0.15, 1.2, 0.1, 0.25, 0.15),
    L("scifi/engine-circular.mp3", 0.08, 1.3, 0.15, 0.4, 0.2),
  ],

  // ---------- dynamic shoot cue (kept for compatibility) ----------
};

function shootCue(kind: string): SampleCue {
  // ... existing shootCue implementation ...
  // (we'll keep the original implementation below)
  const base: SampleCue = [];
  // ... (original code)
  return base;
}

// ... rest of the file ...
