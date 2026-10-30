/**
 * EXTERNAL SAMPLE LAYER — the primary sound engine for MoonLightTD.
 *
 * Every cue below is built from short, real recordings from Kenney's CC0 sound
 * library (Interface Sounds, UI Audio, RPG Audio, Impact Sounds, Sci-Fi Sounds
 * and Music Jingles). The clips live in `public/sfx/` and are preloaded once
 * the first gesture unlocks audio. Each cue is layered like a sound designer
 * would layer it: a transient, a body and a tail.
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
  // ================================================================
  // REWORKED 2026 SOUND SET
  // Every cue is now a transient + body + tail design. The first layer is the
  // attack, the second carries the pitch identity, and the last is the space.
  // Gains are balanced against the new 0.52 master so stacking never clips.
  // ================================================================

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
  chatSend: [
    L("ui/select-7.mp3", 0.4, 1.02, 0, 0.1),
    L("ui/tick.mp3", 0.22, 1.08, 0.025, 0.06),
    L("ui/pluck-1.mp3", 0.08, 1.3, 0.04, 0.12),
  ],
  chatRecv: [
    L("ui/select-5.mp3", 0.4, 0.98, 0, 0.1),
    L("ui/pluck-2.mp3", 0.24, 1.02, 0.04, 0.16, 0.2),
    L("ui/question.mp3", 0.1, 1.1, 0.05, 0.12),
  ],
  chatTyping: [
    L("ui/tick.mp3", 0.16, 1.06, 0, 0.05),
    L("ui/tick.mp3", 0.11, 1.16, 0.075, 0.05),
  ],
  goldRain: [
    L("rpg/handle-coins.mp3", 0.58, 1.0, 0, 0.5),
    L("rpg/handle-coins-2.mp3", 0.36, 1.08, 0.09, 0.5, -0.2),
    L("rpg/metal-click.mp3", 0.24, 1.24, 0.2, 0.18, 0.24),
    L("rpg/metal-click.mp3", 0.18, 1.38, 0.32, 0.18, -0.12),
    L("ui/glass-2.mp3", 0.08, 1.5, 0.44, 0.4),
  ],
  gemRain: [
    L("ui/glass-2.mp3", 0.5, 1.0, 0, 0.55),
    L("ui/glass-4.mp3", 0.36, 1.08, 0.1, 0.5, 0.2),
    L("ui/pluck-1.mp3", 0.28, 1.16, 0.19, 0.4, -0.2),
    L("ui/glass-5.mp3", 0.26, 1.22, 0.3, 0.45, 0.1),
    L("ui/glass-6.mp3", 0.14, 1.3, 0.42, 0.5),
  ],

  // ---------- chests ----------
  chestWind: [
    L("scifi/space-low.mp3", 0.44, [0.6, 1.24], 0, 1.15),
    L("ui/scroll-1.mp3", 0.22, [0.72, 1.45], 0.02, 0.95, -0.14),
    L("scifi/engine-circular.mp3", 0.14, 0.78, 0, 1.05, 0.14),
    L("ui/glass-6.mp3", 0.08, [1.0, 1.4], 0.55, 0.5),
  ],
  chestRattle: [
    L("rpg/creak.mp3", 0.5, 1.02, 0, 0.5),
    L("rpg/metal-latch.mp3", 0.34, 1.08, 0.07, 0.2, 0.2),
    L("impact/wood-medium.mp3", 0.3, 0.98, 0.18, 0.2, -0.18),
    L("impact/wood-heavy.mp3", 0.16, 1.02, 0.34, 0.2),
  ],
  chestSlam: [
    L("impact/plate-heavy.mp3", 0.82, 1.0, 0, 0.4),
    L("scifi/explosion-3.mp3", 0.36, 1.08, 0.02, 0.4, -0.1),
    L("rpg/metal-latch.mp3", 0.34, 1.14, 0.055, 0.2, 0.2),
    L("rpg/door-close.mp3", 0.28, 1.16, 0.03, 0.35),
  ],
  chestBlast: [
    L("scifi/force-field-1.mp3", 0.5, 1.0, 0, 0.5),
    L("impact/glass-heavy.mp3", 0.44, 1.06, 0.028, 0.35, 0.2),
    L("scifi/low-explosion-0.mp3", 0.54, 1.0, 0.04, 0.55, -0.14),
    L("ui/glass-4.mp3", 0.26, 1.2, 0.1, 0.4),
    L("ui/glass-6.mp3", 0.14, 1.35, 0.2, 0.45, 0.16),
  ],
  chestLid: [
    L("rpg/book-flip.mp3", 0.46, 1.02, 0, 0.3),
    L("rpg/cloth-2.mp3", 0.26, 1.04, 0.04, 0.3, 0.18),
    L("ui/open.mp3", 0.18, 1.12, 0.012, 0.16),
    L("rpg/book-place.mp3", 0.14, 0.94, 0.16, 0.24),
  ],
  chest: [
    L("rpg/book-open.mp3", 0.5, 1.0, 0, 0.42),
    L("rpg/handle-coins-2.mp3", 0.56, 1.02, 0.07, 0.4, 0.16),
    L("rpg/metal-latch.mp3", 0.34, 1.08, 0.14, 0.2, -0.18),
    L("ui/close.mp3", 0.14, 1.14, 0.02, 0.14),
    L("ui/glass-5.mp3", 0.12, 1.26, 0.22, 0.34),
  ],
  chestCharge: [
    L("scifi/force-field-2.mp3", 0.5, [0.68, 1.5], 0, 1.1),
    L("ui/scroll-2.mp3", 0.22, [0.82, 1.6], 0.02, 1.0, 0.14),
    L("scifi/space-small.mp3", 0.1, [0.9, 1.5], 0.3, 0.8),
  ],
  chestCrack: [
    L("rpg/chop.mp3", 0.72, 1.0, 0, 0.35),
    L("impact/plank.mp3", 0.38, 1.12, 0.022, 0.3, -0.16),
    L("scifi/low-explosion-1.mp3", 0.34, 1.16, 0.04, 0.45),
    L("impact/glass-light.mp3", 0.14, 1.3, 0.06, 0.18, 0.2),
  ],

  // ---------- building ----------
  place: [
    L("impact/wood-medium.mp3", 0.58, 1.0, 0, 0.24),
    L("rpg/book-place.mp3", 0.32, 1.06, 0.03, 0.22, 0.14),
    L("impact/wood-heavy.mp3", 0.2, 1.06, 0.008, 0.2),
  ],
  towerDrop: [
    L("impact/plate-medium.mp3", 0.56, 0.9, 0, 0.3),
    L("impact/wood-heavy.mp3", 0.44, 0.84, 0.016, 0.28, -0.14),
    L("ui/glass-1.mp3", 0.22, 1.18, 0.05, 0.2, 0.18),
  ],
  summon: [
    L("scifi/force-field-0.mp3", 0.46, 1.0, 0, 0.45),
    L("rpg/door-open.mp3", 0.32, 1.12, 0.035, 0.35, -0.12),
    L("ui/maximize.mp3", 0.26, 1.06, 0.08, 0.24, 0.16),
    L("ui/glass-5.mp3", 0.12, 1.3, 0.14, 0.3),
  ],
  merge: [
    L("ui/confirm-1.mp3", 0.5, 1.0, 0, 0.3),
    L("scifi/force-field-3.mp3", 0.36, 1.06, 0.03, 0.45, -0.14),
    L("rpg/metal-latch.mp3", 0.3, 1.12, 0.08, 0.2, 0.16),
    L("scifi/space-low.mp3", 0.28, [0.7, 0.94], 0.012, 0.8),
    L("ui/glass-5.mp3", 0.2, 0.9, 0.06, 0.3),
  ],
  merge2: [
    L("ui/glass-4.mp3", 0.42, 1.0, 0, 0.3),
    L("ui/select-5.mp3", 0.28, 1.12, 0.028, 0.1),
    L("ui/pluck-2.mp3", 0.12, 1.24, 0.05, 0.2, 0.16),
  ],
  ascend: [
    L("scifi/space-low.mp3", 0.38, [0.66, 1.04], 0, 0.9),
    L("scifi/force-field-0.mp3", 0.46, [0.88, 1.18], 0.014, 1.0, -0.1),
    L("scifi/laser-large.mp3", 0.46, [0.8, 1.32], 0.028, 0.8, 0.12),
    L("ui/confirm-4.mp3", 0.44, 1.0, 0.09, 0.3),
    L("ui/glass-5.mp3", 0.22, 1.2, 0.15, 0.34),
    L("ui/glass-6.mp3", 0.12, 1.35, 0.24, 0.4),
  ],
  awaken: [
    L("ui/glass-4.mp3", 0.46, 1.0, 0, 0.36),
    L("ui/pluck-1.mp3", 0.32, 1.1, 0.05, 0.3, 0.18),
    L("scifi/force-field-2.mp3", 0.3, [0.84, 1.24], 0.012, 1.0, -0.18),
    L("ui/bong.mp3", 0.1, 1.2, 0.09, 0.4),
  ],
  ceremony: [
    L("music/ceremony.mp3", 0.46, 1.0, 0, 1.0),
    L("ui/glass-5.mp3", 0.24, 1.12, 0.11, 0.4, 0.16),
    L("ui/confirm-3.mp3", 0.22, 1.06, 0.035, 0.3),
    L("ui/glass-6.mp3", 0.12, 1.28, 0.2, 0.45, -0.16),
  ],
  rally: [
    L("music/rally.mp3", 0.52, 1.0, 0, 0.7),
    L("rpg/draw-knife.mp3", 0.28, 1.18, 0.022, 0.2, 0.2),
    L("impact/plate-medium.mp3", 0.14, 1.1, 0.08, 0.2),
  ],
  point: [
    L("ui/tick.mp3", 0.34, 1.02, 0, 0.06),
    L("ui/pluck-1.mp3", 0.18, 1.24, 0.018, 0.12),
    L("ui/glass-2.mp3", 0.06, 1.5, 0.03, 0.2),
  ],

  // ---------- battle ----------
  zap: [
    L("scifi/force-field-4.mp3", 0.44, 1.0, 0, 0.3),
    L("scifi/laser-retro.mp3", 0.46, [1.3, 0.82], 0.01, 0.26, -0.12),
    L("scifi/laser-small.mp3", 0.14, 1.4, 0.02, 0.12, 0.18),
  ],
  blast1: [
    L("scifi/explosion-0.mp3", 0.66, 1.0, 0, 0.4),
    L("impact/punch-medium.mp3", 0.32, 1.06, 0.018, 0.22, -0.14),
    L("impact/glass-light.mp3", 0.08, 1.4, 0.04, 0.16, 0.2),
  ],
  blast2: [
    L("scifi/explosion-2.mp3", 0.7, 1.0, 0, 0.5),
    L("scifi/low-explosion-0.mp3", 0.54, 1.0, 0.018, 0.55, -0.1),
    L("impact/plate-medium.mp3", 0.32, 1.06, 0.03, 0.24, 0.16),
    L("impact/glass-medium.mp3", 0.1, 1.3, 0.06, 0.2),
  ],
  blast3: [
    L("scifi/explosion-3.mp3", 0.78, 1.0, 0, 0.65),
    L("scifi/low-explosion-1.mp3", 0.66, 1.0, 0.022, 0.7, -0.12),
    L("impact/punch-heavy.mp3", 0.38, 1.0, 0.04, 0.3, 0.16),
    L("scifi/impact-metal.mp3", 0.12, 1.2, 0.06, 0.24),
  ],
  onKill: [
    L("rpg/handle-coins-2.mp3", 0.4, 1.08, 0, 0.24),
    L("ui/pluck-1.mp3", 0.22, 1.24, 0.028, 0.17, 0.18),
    L("ui/glass-2.mp3", 0.07, 1.5, 0.05, 0.2),
  ],
  superbolt: [
    L("scifi/low-explosion-1.mp3", 0.68, 1.0, 0, 0.65),
    L("scifi/force-field-0.mp3", 0.42, 1.0, 0.018, 0.5, 0.16),
    L("impact/plate-heavy.mp3", 0.42, 1.0, 0.032, 0.32, -0.16),
    L("ui/glass-4.mp3", 0.12, 1.25, 0.06, 0.3),
  ],
  demonExecution: [
    L("scifi/space-low.mp3", 0.66, [0.6, 0.4], 0, 0.86),
    L("scifi/laser-large.mp3", 0.7, [1.5, 0.7], 0.032, 0.55, 0.18),
    L("scifi/low-explosion-1.mp3", 0.84, 0.56, 0.1, 1.0, -0.16),
    L("impact/plate-heavy.mp3", 0.64, 0.74, 0.15, 0.4),
    L("scifi/explosion-3.mp3", 0.5, 0.72, 0.22, 0.5, 0.14),
  ],
  supervisorMerge: [
    L("scifi/force-field-2.mp3", 0.74, [0.78, 0.6], 0, 0.78),
    L("scifi/low-explosion-1.mp3", 0.84, 0.66, 0.032, 0.95),
    L("scifi/laser-large.mp3", 0.58, [0.62, 0.4], 0.055, 0.6, -0.16),
    L("impact/plate-heavy.mp3", 0.44, 0.7, 0.11, 0.4, 0.16),
  ],
  doomsday: [
    L("scifi/low-explosion-0.mp3", 0.92, 0.5, 0, 1.25),
    L("scifi/explosion-3.mp3", 0.7, 0.62, 0.055, 1.0, -0.1),
    L("scifi/force-field-1.mp3", 0.58, [0.55, 0.34], 0.1, 1.2, 0.14),
    L("impact/plate-heavy.mp3", 0.6, 0.64, 0.16, 0.45),
    L("scifi/space-large.mp3", 0.18, 0.55, 0.2, 1.4),
  ],
  heavenlyImpact: [
    L("scifi/force-field-3.mp3", 0.62, 1.14, 0, 0.55),
    L("scifi/laser-large.mp3", 0.52, 1.24, 0.012, 0.5, 0.14),
    L("ui/glass-4.mp3", 0.32, 1.34, 0.035, 0.4, -0.16),
    L("ui/glass-6.mp3", 0.16, 1.45, 0.08, 0.45),
  ],
  explosion: [
    L("scifi/explosion-2.mp3", 0.7, 1.0, 0, 0.55),
    L("scifi/low-explosion-0.mp3", 0.52, 1.0, 0.018, 0.6, -0.12),
    L("impact/soft-heavy.mp3", 0.22, 0.94, 0.03, 0.3, 0.12),
  ],
  freeze: [
    L("impact/glass-medium.mp3", 0.6, 1.0, 0, 0.4),
    L("ui/glass-1.mp3", 0.36, 1.12, 0.026, 0.3, 0.16),
    L("scifi/force-field-3.mp3", 0.28, 0.8, 0.018, 0.8, -0.14),
    L("ui/glass-6.mp3", 0.12, 1.35, 0.06, 0.35),
  ],
  stun: [
    L("impact/bell-heavy.mp3", 0.56, 1.0, 0, 0.45),
    L("impact/punch-medium.mp3", 0.28, 1.0, 0.022, 0.2, -0.12),
    L("impact/bell-big.mp3", 0.12, 0.8, 0.04, 0.5),
  ],
  crit: [
    L("rpg/metal-click.mp3", 0.42, 1.1, 0, 0.12),
    L("impact/metal-light.mp3", 0.34, 1.06, 0.008, 0.16, 0.16),
    L("ui/tick.mp3", 0.2, 1.24, 0.022, 0.06, -0.16),
    L("ui/glass-5.mp3", 0.08, 1.5, 0.03, 0.25),
  ],
  critBig: [
    L("impact/metal-heavy.mp3", 0.72, 1.0, 0, 0.36),
    L("scifi/explosion-0.mp3", 0.36, 1.12, 0.018, 0.4, -0.12),
    L("impact/bell-heavy.mp3", 0.32, 1.06, 0.032, 0.45, 0.16),
    L("scifi/impact-metal.mp3", 0.24, 1.24, 0.012, 0.24),
    L("ui/glass-4.mp3", 0.1, 1.4, 0.06, 0.3),
  ],
  meteor: [
    L("scifi/thruster-2.mp3", 0.5, [1.3, 0.66], 0, 0.55),
    L("scifi/low-explosion-1.mp3", 0.5, 1.0, 0.16, 0.55),
    L("impact/soft-heavy.mp3", 0.16, 0.9, 0.2, 0.3, 0.14),
  ],
  hurt: [
    L("impact/soft-heavy.mp3", 0.6, 1.0, 0, 0.35),
    L("impact/punch-medium.mp3", 0.26, 1.06, 0.018, 0.2, 0.14),
    L("scifi/low-explosion-0.mp3", 0.14, 0.85, 0.03, 0.4),
  ],
  leak: [
    L("impact/bell-big.mp3", 0.54, 1.0, 0, 0.55),
    L("scifi/low-explosion-1.mp3", 0.42, 1.12, 0.022, 0.5, -0.12),
    L("ui/error.mp3", 0.16, 0.86, 0.06, 0.25),
  ],
  wave: [
    L("music/wave.mp3", 0.56, 1.0, 0, 0.9),
    L("scifi/force-field-0.mp3", 0.12, 0.9, 0.1, 0.6, 0.18),
  ],
  battleStart: [
    L("music/hero.mp3", 0.42, 0.9, 0, 0.7),
    L("ui/confirm-4.mp3", 0.36, 0.94, 0.11, 0.3),
    L("scifi/force-field-0.mp3", 0.28, 0.84, 0.035, 0.65, -0.14),
    L("impact/plate-medium.mp3", 0.14, 0.9, 0.005, 0.22),
  ],
  waveClear: [
    L("music/ceremony.mp3", 0.46, 1.08, 0, 0.8),
    L("ui/glass-4.mp3", 0.38, 1.12, 0.055, 0.4, 0.16),
    L("ui/confirm-1.mp3", 0.26, 1.16, 0.09, 0.3),
    L("ui/glass-6.mp3", 0.12, 1.3, 0.16, 0.45, -0.18),
  ],
  autoResolve: [
    L("ui/scroll-2.mp3", 0.38, [0.78, 1.14], 0, 0.36),
    L("scifi/force-field-3.mp3", 0.34, 1.06, 0.03, 0.5, 0.14),
    L("ui/confirm-4.mp3", 0.36, 1.18, 0.1, 0.3, -0.14),
  ],
  bossSkip: [
    L("ui/back.mp3", 0.5, 1.2, 0, 0.2),
    L("scifi/thruster-2.mp3", 0.28, [1.28, 0.88], 0.008, 0.26, 0.16),
    L("ui/tick.mp3", 0.12, 1.5, 0.03, 0.06),
  ],
  boss: [
    L("music/boss.mp3", 0.52, 1.0, 0, 1.2),
    L("scifi/low-explosion-1.mp3", 0.56, 1.0, 0.018, 0.75, -0.1),
    L("scifi/space-low.mp3", 0.26, 0.68, 0.035, 1.5, 0.14),
    L("scifi/space-large.mp3", 0.18, 0.62, 0.02, 1.6, -0.16),
    L("impact/plate-heavy.mp3", 0.24, 0.7, 0.01, 0.4),
  ],
  bossRoulette: [
    L("scifi/space-small.mp3", 0.38, [0.7, 1.5], 0, 1.2),
    L("ui/scroll-2.mp3", 0.26, [0.74, 1.6], 0.02, 1.25, 0.14),
    L("scifi/force-field-1.mp3", 0.32, [0.62, 1.3], 0.045, 1.0, -0.14),
    L("ui/confirm-4.mp3", 0.46, 0.9, 1.02, 0.4),
    L("ui/glass-6.mp3", 0.12, 1.25, 1.12, 0.5),
  ],
  win: [
    L("music/win.mp3", 0.62, 1.0, 0, 1.2),
    L("ui/confirm-4.mp3", 0.3, 1.06, 0.07, 0.35),
    L("ui/glass-6.mp3", 0.14, 1.2, 0.2, 0.6, 0.16),
  ],
  lose: [
    L("music/lose.mp3", 0.58, 1.0, 0, 1.2),
    L("scifi/low-explosion-1.mp3", 0.3, 0.78, 0.05, 0.6, -0.14),
    L("impact/bell-big.mp3", 0.1, 0.7, 0.2, 0.8),
  ],
  hero: [
    L("music/hero.mp3", 0.48, 1.0, 0, 1.1),
    L("scifi/force-field-0.mp3", 0.42, 1.0, 0.018, 0.6, 0.14),
    L("impact/plate-heavy.mp3", 0.34, 1.0, 0.035, 0.35),
    L("ui/glass-5.mp3", 0.14, 1.25, 0.09, 0.45, -0.16),
  ],
  // ---------- new mystical towers ----------
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
};

/** per-tower firing voices — the same grouping the old synth layer used */
const SHOOT_CUES: Record<string, SampleCue> = {
  // physical
  arrow: [L("rpg/knife-slice.mp3", 0.38, [0.98, 1.22], 0, 0.32)],
  sling: [L("rpg/knife-slice-2.mp3", 0.36, [1.0, 1.25], 0, 0.3)],
  boomer: [L("rpg/knife-slice-2.mp3", 0.42, [0.92, 1.08], 0, 0.35)],
  swarm: [L("rpg/knife-slice.mp3", 0.34, [1.05, 1.3], 0, 0.3)],
  gale: [L("rpg/cloth-4.mp3", 0.42, [0.95, 1.25], 0, 0.3)],
  scythe: [L("rpg/knife-slice.mp3", 0.46, [0.75, 0.95], 0, 0.45)],
  axe: [L("rpg/chop.mp3", 0.44, [1.0, 1.15], 0, 0.3)],
  chop: [L("rpg/chop.mp3", 0.44, 1)],
  spike: [L("impact/mining.mp3", 0.4, [1.1, 1.35], 0, 0.3)],
  // explosives
  cannon: [
    L("impact/punch-heavy.mp3", 0.46, [0.9, 0.8], 0, 0.35),
    L("scifi/low-explosion-0.mp3", 0.34, 1.35, 0, 0.4),
  ],
  mortar: [
    L("impact/punch-heavy.mp3", 0.44, [0.95, 0.85], 0, 0.35),
    L("scifi/low-explosion-0.mp3", 0.32, 1.4, 0, 0.4),
  ],
  colossus: [
    L("impact/plate-heavy.mp3", 0.5, [0.9, 0.8], 0, 0.4),
    L("scifi/low-explosion-1.mp3", 0.3, 1.3, 0, 0.45),
  ],
  bombardment: [
    L("impact/punch-heavy.mp3", 0.5, [0.85, 0.75], 0, 0.4),
    L("scifi/low-explosion-0.mp3", 0.36, 1.3, 0, 0.45),
  ],
  quake: [
    L("impact/plate-heavy.mp3", 0.5, [0.8, 0.7], 0, 0.45),
    L("scifi/low-explosion-1.mp3", 0.34, 1.2, 0, 0.5),
  ],
  nova: [
    L("scifi/force-field-2.mp3", 0.42, 1, 0, 0.5),
    L("impact/punch-heavy.mp3", 0.34, 1.1, 0, 0.4),
  ],
  core: [
    L("scifi/force-field-2.mp3", 0.4, [1.1, 0.9], 0, 0.45),
    L("impact/punch-medium.mp3", 0.26, 1.1, 0, 0.3),
  ],
  missile: [
    L("scifi/thruster-2.mp3", 0.4, [1.2, 1.0], 0, 0.42),
    L("scifi/explosion-0.mp3", 0.25, 1.2, 0.16),
  ],
  // energy / beam
  gatling: [L("scifi/laser-small.mp3", 0.34, [1.15, 1.3], 0, 0.2)],
  laser: [L("scifi/laser-small.mp3", 0.38, [0.95, 1.1], 0, 0.3)],
  beam: [L("scifi/laser-small.mp3", 0.36, [1.0, 1.15], 0, 0.3)],
  tube: [L("scifi/force-field-4.mp3", 0.34, [1.2, 1.35], 0, 0.35)],
  tesla: [
    L("scifi/force-field-4.mp3", 0.42, [1.1, 1.35], 0, 0.28),
    L("scifi/laser-retro.mp3", 0.4, [1.2, 1.0], 0, 0.22),
  ],
  storm: [
    L("scifi/force-field-4.mp3", 0.42, [1.0, 1.25], 0, 0.28),
    L("scifi/laser-retro.mp3", 0.42, [1.15, 0.95], 0, 0.22),
  ],
  thundercrown: [
    L("scifi/force-field-0.mp3", 0.4, [1.0, 1.2], 0, 0.4),
    L("scifi/laser-retro.mp3", 0.44, [1.3, 1.05], 0, 0.24),
  ],
  lightning: [
    L("scifi/force-field-0.mp3", 0.5, [0.95, 1.15], 0, 0.5),
    L("scifi/laser-retro.mp3", 0.5, [1.4, 0.85], 0, 0.26),
    L("scifi/low-explosion-0.mp3", 0.28, 1, 0, 0.35),
  ],
  ion: [
    L("scifi/force-field-4.mp3", 0.44, [1.1, 1.4], 0, 0.3),
    L("scifi/laser-retro.mp3", 0.36, [1.35, 1.1], 0, 0.22),
  ],
  plasma: [
    L("scifi/laser-large.mp3", 0.42, [1.1, 1.3], 0, 0.4),
    L("scifi/space-small.mp3", 0.18, 1.1, 0, 0.35),
  ],
  rail: [
    L("scifi/laser-large.mp3", 0.44, [1.2, 0.9], 0, 0.45),
    L("impact/metal-heavy.mp3", 0.24, 1.2, 0, 0.3),
  ],
  voidrip: [
    L("scifi/laser-large.mp3", 0.38, [0.85, 1.15], 0, 0.5),
    L("scifi/space-small.mp3", 0.24, 0.9, 0, 0.5),
  ],
  void: [L("scifi/space-small.mp3", 0.32, [0.9, 1.2], 0, 0.4)],
  heavenly: [
    L("scifi/laser-large.mp3", 0.42, [1.25, 1.05], 0, 0.38),
    L("scifi/force-field-3.mp3", 0.26, 1.1, 0, 0.35),
  ],
  gravity: [L("scifi/space-low.mp3", 0.24, [0.8, 1.0], 0, 0.55)],
  aether: [
    L("ui/glass-6.mp3", 0.4, [1.1, 1.3], 0, 0.3),
    L("ui/pluck-2.mp3", 0.24, 1.15, 0.02, 0.3),
  ],
  clone: [
    L("ui/glass-6.mp3", 0.36, [1.2, 1.3], 0, 0.25),
    L("ui/pluck-2.mp3", 0.22, 1.25, 0.03, 0.25),
  ],
  // cold
  ice: [L("impact/glass-light.mp3", 0.44, [1.3, 1.5], 0, 0.3)],
  frost: [L("impact/glass-light.mp3", 0.4, [1.15, 1.35], 0, 0.3)],
  chronolock: [L("impact/glass-light.mp3", 0.4, [1.45, 1.2], 0, 0.3)],
  icestorm: [
    L("impact/glass-medium.mp3", 0.38, [1.15, 1.35], 0, 0.4),
    L("ui/glass-1.mp3", 0.2, 1.3, 0, 0.3),
  ],
  // fire
  flame: [L("scifi/thruster-2.mp3", 0.34, [1.0, 1.15], 0, 0.32)],
  furnace: [L("scifi/thruster-3.mp3", 0.34, [0.95, 1.1], 0, 0.34)],
  wildfire: [L("scifi/thruster-2.mp3", 0.36, [1.0, 1.2], 0, 0.35)],
  hellstorm: [
    L("scifi/thruster-3.mp3", 0.36, [0.95, 1.15], 0, 0.35),
    L("rpg/cloth-2.mp3", 0.16, 1.1, 0, 0.3),
  ],
  dragon: [L("scifi/thruster-3.mp3", 0.4, [0.85, 1.05], 0, 0.42)],
  sun: [L("scifi/force-field-1.mp3", 0.35, [1.0, 1.2], 0, 0.4)],
  // poison / wind
  toxin: [L("scifi/slime-2.mp3", 0.42, [1.05, 0.9], 0, 0.3)],
  venom: [L("scifi/slime-1.mp3", 0.28, [1.1, 0.95], 0, 0.25)],
  gravebloom: [L("scifi/slime-2.mp3", 0.4, [0.9, 1.0], 0, 0.32)],
  plague: [
    L("scifi/slime-2.mp3", 0.42, [0.9, 1.05], 0, 0.35),
    L("impact/soft-heavy.mp3", 0.2, 1.1, 0, 0.3),
  ],
  maelstrom: [L("rpg/cloth-4.mp3", 0.4, [0.9, 1.3], 0, 0.38)],
  sandstorm: [L("rpg/cloth-2.mp3", 0.4, [0.85, 1.15], 0, 0.38)],
  bloodstone: [
    L("scifi/space-low.mp3", 0.3, [0.9, 1.2], 0, 0.35),
    L("ui/bong.mp3", 0.2, 1.15, 0, 0.3),
  ],
  starfall: [L("scifi/space-low.mp3", 0.32, [1.0, 1.25], 0, 0.4)],
  // support
  speaker: [L("scifi/space-small.mp3", 0.16, [1.1, 1.1], 0, 0.25)],
  plant: [L("scifi/space-small.mp3", 0.14, [0.9, 0.95], 0, 0.25)],
  honor: [
    L("rpg/handle-coins-2.mp3", 0.42, 1.05),
    L("ui/glass-2.mp3", 0.24, 1.15, 0.03),
  ],
  demon: [
    L("scifi/low-explosion-1.mp3", 0.42, [0.9, 0.75], 0, 0.5),
    L("impact/bell-heavy.mp3", 0.2, 0.8, 0.03),
  ],
  siphon: [L("scifi/force-field-3.mp3", 0.34, [0.95, 1.15], 0, 0.35)],
  // the two mystical towers
  eclipse: [
    L("scifi/space-low.mp3", 0.4, [1.0, 0.62], 0, 0.5),
    L("scifi/force-field-2.mp3", 0.34, [1.25, 0.8], 0, 0.4, 0.16),
    L("ui/bong.mp3", 0.14, 0.8, 0.02, 0.35),
  ],
  seraph: [
    L("ui/glass-6.mp3", 0.34, [1.2, 1.35], 0, 0.28),
    L("scifi/laser-small.mp3", 0.24, [1.3, 1.0], 0, 0.22, -0.16),
    L("ui/glass-2.mp3", 0.14, 1.5, 0.02, 0.25),
  ],
  default: [L("scifi/laser-small.mp3", 0.34, [1.0, 1.2], 0, 0.24)],
};

/** the sample keys that need to be in memory before the first wave */
const EXTRA_FILES = [
  "ui/glass-2.mp3",
  "ui/glass-4.mp3",
  "ui/glass-5.mp3",
  "ui/glass-6.mp3",
  "ui/pluck-1.mp3",
  "ui/pluck-2.mp3",
];

function collectFiles(): string[] {
  const set = new Set<string>();
  const add = (cue: SampleCue) => {
    for (const layer of cue) {
      if (Array.isArray(layer.file)) layer.file.forEach((f) => set.add(f));
      else set.add(layer.file);
    }
  };
  Object.values(CUES).forEach(add);
  Object.values(SHOOT_CUES).forEach(add);
  EXTRA_FILES.forEach((f) => set.add(f));
  return [...set];
}

const SAMPLE_FILES = collectFiles();

/** the sample files the first battle plays most: menu clicks and impacts (preloaded by the loading screen) */
export function coreSampleFiles(): string[] {
  return SAMPLE_FILES.filter((file) => file.startsWith("ui/") || file.startsWith("impact/"));
}

function shootCue(kind: string): SampleCue {
  return SHOOT_CUES[kind] || SHOOT_CUES.default;
}

function chestLootCue(n: number): SampleCue {
  const steps = Math.max(1, Math.min(10, Math.round(n || 3)));
  const notes = [
    "ui/glass-2.mp3",
    "ui/pluck-1.mp3",
    "ui/glass-4.mp3",
    "ui/glass-5.mp3",
    "ui/pluck-2.mp3",
    "ui/glass-6.mp3",
  ];
  const cue: SampleCue = [];
  for (let i = 0; i < steps; i++) {
    cue.push(L(notes[i % notes.length], 0.38 + (i % 3) * 0.04, 1 + i * 0.045, i * 0.065));
  }
  return cue;
}

// =====================================================================
// engine
// =====================================================================

/** level of the sample bus at volume 100%, before the player's volume slider */
const SAMPLE_MASTER = 0.56;

type AudioContextCtor = new () => AudioContext;

/**
 * Five-band equalizer shared by the sample bus and the Tone fallback:
 * sub/bass shelf, low-mid, mid, presence and air. Gains are in dB.
 */
export const EQ_LAYOUT: ReadonlyArray<{ type: BiquadFilterType; freq: number; q: number }> = [
  { type: "lowshelf", freq: 80, q: 0.7 },
  { type: "peaking", freq: 250, q: 1 },
  { type: "peaking", freq: 1000, q: 1 },
  { type: "peaking", freq: 4000, q: 1 },
  { type: "highshelf", freq: 11000, q: 0.7 },
];

interface SampleRack {
  ctx: AudioContext;
  master: GainNode;
  lowCut: BiquadFilterNode;
  /** the five EQ bands, in EQ_LAYOUT order */
  eq: BiquadFilterNode[];
  comp: DynamicsCompressorNode | null;
  /** personal-music input: joins the mix after the EQ, not after the SFX master */
  musicIn: GainNode;
  buffers: Map<string, AudioBuffer>;
  loading: Map<string, Promise<AudioBuffer | null>>;
  /**
   * per-clip loudness gain, measured at decode time. Kenney's packs were
   * mastered separately, so a glass tick can be 12 dB quieter than a bomb at
   * the same authored gain — normalising here is what lets the cue table's
   * layer balance actually mean what it says.
   */
  norms: Map<string, number>;
  /** shared reverb buses: a long hall for big cues, a short plate for UI */
  verbIn: GainNode | null;
  verbReturn: GainNode | null;
  verbPlate: GainNode | null;
  voices: number;
  maxVoices: number;
  ready: boolean;
}

let rack: SampleRack | null = null;
let loadJob: Promise<void> | null = null;
let onExhausted: (() => void) | null = null;
let stateOn = true;
let stateVol = 0.7;
/** loudness multiplier from the volume switches: 1, 3 (booster) or 5 (super) */
let stateMul = 1;
let stateEq: number[] = [0, 0, 0, 0, 0];

const masterGain = () =>
  stateOn ? SAMPLE_MASTER * Math.min(1, Math.max(0, stateVol)) * stateMul : 0;

/** remember the player's five-band EQ (dB) and apply it if the bus already exists */
export function setSampleEQ(bands: number[]) {
  stateEq = bands.slice(0, 5);
  if (!rack) return;
  const now = rack.ctx.currentTime;
  rack.eq.forEach((node, i) => node.gain.setTargetAtTime(stateEq[i] ?? 0, now, 0.035));
}

/**
 * Mixer state: on/off, slider volume and the loudness multiplier. Above the
 * booster level the limiter tightens, so 500% gets loud without a fuzzy top end.
 */
export function setSampleState(on: boolean, vol: number, mul: number) {
  stateOn = on;
  stateVol = Math.min(1, Math.max(0, vol));
  stateMul = mul;
  if (!rack) return;
  try {
    const now = rack.ctx.currentTime;
    rack.master.gain.setTargetAtTime(masterGain(), now, 0.02);
    rack.musicIn.gain.setTargetAtTime(mul, now, 0.02);
    if (rack.comp) {
      const hard = mul >= 5;
      rack.comp.threshold.setTargetAtTime(hard ? -6 : -15, now, 0.05);
      rack.comp.ratio.setTargetAtTime(hard ? 20 : 4.5, now, 0.05);
    }
  } catch {
    /* context closed */
  }
}

const routedMedia = new WeakSet<HTMLMediaElement>();

/**
 * Route the personal-music element through the mixer, so the five-band EQ,
 * the bass/treble boosts and the volume switches all reach the music. Safe to
 * call again. Returns false while there is no sample bus (the element then plays
 * directly, unprocessed).
 */
export function routeMusicElement(el: HTMLMediaElement): boolean {
  if (!rack) return false;
  if (routedMedia.has(el)) return true;
  try {
    const src = rack.ctx.createMediaElementSource(el);
    src.connect(rack.musicIn);
    routedMedia.add(el);
    return true;
  } catch {
    return false;
  }
}

/** browsers suspend audio until a gesture: call from the play button */
export function resumeSampleEngine() {
  try {
    void rack?.ctx.resume().catch(() => {});
  } catch {
    /* ignore */
  }
}

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { webkitAudioContext?: AudioContextCtor };
  return (window.AudioContext as AudioContextCtor | undefined) || w.webkitAudioContext || null;
}

function sampleUrl(file: string): string {
  const base =
    typeof document !== "undefined" && document.baseURI
      ? document.baseURI
      : typeof location !== "undefined"
        ? location.href
        : "http://localhost/";
  try {
    return new URL(`sfx/${file}`, base).href;
  } catch {
    return `sfx/${file}`;
  }
}

/** Promise + callback dual signature, for old Safari and for jsdom mocks */
function decodeAudio(ctx: AudioContext, bytes: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const ok = (buffer: AudioBuffer) => {
      if (!settled) {
        settled = true;
        resolve(buffer);
      }
    };
    const fail = (err: unknown) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    };
    try {
      const decode = ctx.decodeAudioData.bind(ctx) as (
        data: ArrayBuffer,
        success?: (buffer: AudioBuffer) => void,
        failure?: (error: DOMException) => void
      ) => Promise<AudioBuffer> | void;
      const maybe = decode(bytes.slice(0), ok, fail as (error: DOMException) => void);
      if (maybe && typeof maybe.then === "function") maybe.then(ok, fail);
    } catch (err) {
      fail(err);
    }
  });
}

/**
 * Measure one decoded clip and return the gain that lands it at a consistent
 * loudness: 70% of the weight on peak headroom (so nothing clips) and 30% on
 * RMS (so a sparse tick is not punished for being sparse). This runs once per
 * file at decode time — the scan is strided, so even the longest jingle costs
 * well under a millisecond.
 */
function measureLoudness(buf: AudioBuffer): number {
  try {
    let peak = 0;
    let sumSq = 0;
    let samples = 0;
    const step = Math.max(1, Math.floor(buf.length / 60000));
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const data = buf.getChannelData(c);
      for (let i = 0; i < data.length; i += step) {
        const v = data[i] < 0 ? -data[i] : data[i];
        if (v > peak) peak = v;
        sumSq += v * v;
        samples++;
      }
    }
    if (peak < 0.0001 || samples === 0) return 1;
    const rms = Math.sqrt(sumSq / samples);
    const peakGain = 0.92 / peak;
    const rmsGain = rms > 0.0001 ? 0.16 / rms : 1;
    const gain = Math.pow(peakGain, 0.7) * Math.pow(Math.min(rmsGain, 8), 0.3);
    return Math.max(0.2, Math.min(8, gain));
  } catch {
    return 1;
  }
}

function loadOne(file: string): Promise<AudioBuffer | null> {
  if (!rack) return Promise.resolve(null);
  const cached = rack.buffers.get(file);
  if (cached) return Promise.resolve(cached);
  const pending = rack.loading.get(file);
  if (pending) return pending;
  const job = (async (): Promise<AudioBuffer | null> => {
    try {
      const res = await fetch(sampleUrl(file));
      if (!res.ok) throw new Error(`sfx ${file}: HTTP ${res.status}`);
      const bytes = await res.arrayBuffer();
      const buffer = await decodeAudio(rack!.ctx, bytes);
      rack!.buffers.set(file, buffer);
      rack!.norms.set(file, measureLoudness(buffer));
      return buffer;
    } catch {
      return null;
    } finally {
      rack?.loading.delete(file);
    }
  })();
  rack.loading.set(file, job);
  return job;
}

function preload() {
  if (!rack || loadJob) return;
  const r = rack;
  loadJob = Promise.allSettled(SAMPLE_FILES.map((file) => loadOne(file))).then(() => {
    r.ready = true;
    // Nothing decoded at all: hand control back to the synth engine so a
    // blocked CDN / file:// origin never leaves the game silent.
    if (r.buffers.size === 0) onExhausted?.();
  });
}

/**
 * A short algorithmic impulse response for the shared reverb send. Noise with
 * an exponential decay tail is all a game mix needs; generating it locally
 * avoids shipping another megabyte and works offline.
 */
function makeImpulse(ctx: AudioContext, seconds = 1.5, decay = 2.6): AudioBuffer | null {
  try {
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    return buf;
  } catch {
    return null;
  }
}

/**
 * Build the sample bus. Returns false when the browser has no AudioContext;
 * the caller then keeps the Tone.js synth path alive.
 */
export function initSamples(fallback?: () => void): boolean {
  if (fallback) onExhausted = fallback;
  if (rack) {
    try {
      void rack.ctx.resume().catch(() => {});
    } catch {
      /* ignore */
    }
    return true;
  }
  const Ctor = audioContextCtor();
  if (!Ctor) return false;
  try {
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = masterGain();
    const lowCut = ctx.createBiquadFilter();
    lowCut.type = "highpass";
    lowCut.frequency.value = 34;
    lowCut.Q.value = 0.65;
    const eq = EQ_LAYOUT.map((band) => {
      const node = ctx.createBiquadFilter();
      node.type = band.type;
      node.frequency.value = band.freq;
      node.Q.value = band.q;
      node.gain.value = 0;
      return node;
    });
    // music joins after the EQ: the sample bus fans into the same chain
    const musicIn = ctx.createGain();
    musicIn.gain.value = 1;
    master.connect(lowCut);
    lowCut.connect(eq[0]);
    for (let i = 1; i < eq.length; i++) eq[i - 1].connect(eq[i]);
    musicIn.connect(lowCut);
    // ---- master saturation: a soft tube-ish curve before the limiter ----
    // It adds the harmonic density that makes layered samples read as "produced"
    // instead of "triggered", and it acts as a gentle safety ceiling too.
    let sat: WaveShaperNode | null = null;
    try {
      sat = ctx.createWaveShaper();
      const n = 2048;
      const curve = new Float32Array(n);
      const k = 1.8;
      const norm = Math.tanh(k);
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        curve[i] = Math.tanh(k * x) / norm;
      }
      sat.curve = curve;
      sat.oversample = "2x";
      eq[eq.length - 1].connect(sat);
    } catch {
      // no WaveShaper: the raw EQ output feeds the limiter directly
      sat = null;
    }
    const postEq: AudioNode = sat ?? eq[eq.length - 1];
    let comp: DynamicsCompressorNode | null = null;
    try {
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 18;
      comp.ratio.value = 5;
      comp.attack.value = 0.003;
      comp.release.value = 0.16;
      postEq.connect(comp);
      comp.connect(ctx.destination);
    } catch {
      // no compressor node: the limiter-less path still works, just louder
      postEq.connect(ctx.destination);
    }
    // ---- dual convolution space: a long hall + a short bright plate ----
    let verbIn: GainNode | null = null;
    let verbReturn: GainNode | null = null;
    let verbPlate: GainNode | null = null;
    const makeConvolver = (ctx as AudioContext & { createConvolver?: () => ConvolverNode }).createConvolver;
    if (typeof makeConvolver === "function") {
      try {
        const hall = makeConvolver.call(ctx);
        const hallIR = makeImpulse(ctx, 1.6, 2.4);
        if (hallIR) hall.buffer = hallIR;
        verbReturn = ctx.createGain();
        verbReturn.gain.value = 0.55;
        verbIn = ctx.createGain();
        verbIn.gain.value = 1;
        verbIn.connect(hall);
        hall.connect(verbReturn);
        verbReturn.connect(master);

        // the plate: shorter, brighter — UI clicks and coins get air without
        // smearing into the hall tail the ceremonies use
        const plate = makeConvolver.call(ctx);
        const plateIR = makeImpulse(ctx, 0.42, 3.6);
        if (plateIR) plate.buffer = plateIR;
        const plateRet = ctx.createGain();
        plateRet.gain.value = 0.4;
        verbPlate = ctx.createGain();
        verbPlate.gain.value = 1;
        verbPlate.connect(plate);
        plate.connect(plateRet);
        plateRet.connect(master);
      } catch {
        verbIn = null;
        verbReturn = null;
        verbPlate = null;
      }
    }
    rack = {
      ctx,
      master,
      lowCut,
      eq,
      comp,
      musicIn,
      buffers: new Map(),
      loading: new Map(),
      norms: new Map(),
      verbIn,
      verbReturn,
      verbPlate,
      voices: 0,
      maxVoices: 48,
      ready: false,
    };
    setSampleEQ(stateEq);
    try {
      void ctx.resume().catch(() => {});
    } catch {
      /* ignore */
    }
    preload();
    return true;
  } catch {
    return false;
  }
}

/** per-cue round-robin counters: every layer identity steps its own ladder */
const variationCounters: Record<string, number> = {};
const keyOf = (layer: SampleLayer) => (Array.isArray(layer.file) ? layer.file.join("|") : layer.file) + "@" + (layer.pan ?? 0);

function pickFile(file: FileSpec): string {
  return Array.isArray(file) ? file[Math.floor(Math.random() * file.length)] : file;
}

function rateValue(rate: number | [number, number] | undefined): number {
  if (Array.isArray(rate)) return Math.max(0.25, rate[0]);
  return Math.max(0.25, rate ?? 1);
}

interface ReworkedSoundProfile {
  gain: number;
  pitch: number;
  stereoWidth: number;
  /** long-hall send level for this family, 0..1 */
  verb: number;
  /** short-plate send level for this family, 0..1 */
  plate: number;
  /** per-voice tone shaping: high-pass / low-pass cutoff and Q */
  hp: number;
  lp: number;
  q: number;
  /** extra random detune, in playback-rate units */
  detune: number;
}

/**
 * New mix design: every cue gets a family-specific pitch, gain, stereo stage,
 * tone shaping, reverb send and a little humanising detune. Impact family is
 * darker and wider, UI family is tight and dry, magic family is airy and wet.
 */
function reworkedProfile(key: string): ReworkedSoundProfile {
  if (/^(eclipse|seraph|heavenly|demon|supervisor|doomsday|void|gravity)/.test(key))
    return { gain: 0.95, pitch: 0.96, stereoWidth: 0.44, verb: 0.38, plate: 0.1, hp: 42, lp: 12000, q: 0.8, detune: 0.035 };
  if (/^(shoot|zap|blast|superbolt|explosion|freeze|stun|crit|impact|meteor|leak|boss|hero)/.test(key))
    return { gain: 0.92, pitch: 0.94, stereoWidth: 0.36, verb: 0.22, plate: 0.1, hp: 38, lp: 11500, q: 0.7, detune: 0.045 };
  if (/^(win|lose|ceremony|rally|wave|ascend|awaken|chest)/.test(key))
    return { gain: 0.88, pitch: 1.03, stereoWidth: 0.28, verb: 0.42, plate: 0.16, hp: 55, lp: 13500, q: 0.6, detune: 0.018 };
  if (/^(coin|onKill|point|purchase|upgrade|merge|summon|place|towerDrop)/.test(key))
    return { gain: 0.96, pitch: 1.06, stereoWidth: 0.2, verb: 0.08, plate: 0.2, hp: 70, lp: 15000, q: 0.7, detune: 0.02 };
  // dry UI family: plate only — clicks stay tight, never cavernous
  return { gain: 0.92, pitch: 1.04, stereoWidth: 0.16, verb: 0.04, plate: 0.16, hp: 80, lp: 15500, q: 0.6, detune: 0.015 };
}

function playLayer(layer: SampleLayer, profile: ReworkedSoundProfile, index: number, count: number): boolean {
  if (!rack) return false;
  const file = pickFile(layer.file);
  const buffer = rack.buffers.get(file);
  if (!buffer) {
    // Lazy retry: if a single file missed the preload wave, fetch it now. The
    // synth fallback covers this one shot; the next one will be a sample.
    if (!rack.loading.has(file)) void loadOne(file);
    return false;
  }
  if (rack.voices >= rack.maxVoices) return true; // drop the voice, never fall back mid-storm
  const ctx = rack.ctx;
  // measured loudness first, so the authored layer balance actually holds
  const norm = rack.norms.get(file) ?? 1;
  const gain = Math.max(0.0001, Math.min(1.4, (layer.gain ?? 0.6) * profile.gain * norm));
  const rate = rateValue(layer.rate) * profile.pitch;
  // micro-timing: a real player never triggers frames on the exact sample, and
  // 2-10 ms of jitter is the difference between "sequenced" and "played"
  const t0 = ctx.currentTime + Math.max(0, layer.delay ?? 0) + 0.002 + Math.random() * 0.008;
  const natural = buffer.duration / rate;
  const duration = Math.max(0.025, Math.min(natural, layer.dur ?? natural));

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  // round-robin variation: walk an 8-step golden-ratio detune ladder instead of
  // rolling dice, so repeated shots cover the whole spread evenly and never
  // machine-gun the same pitch twice in a row
  const rr = ((variationCounters[keyOf(layer)] = (variationCounters[keyOf(layer)] ?? 0) + 1) % 8) / 7;
  const rrDetune = 1 - profile.detune + rr * profile.detune * 2;
  const jitter = 1 + (Math.random() - 0.5) * profile.detune * 0.5;
  if (Array.isArray(layer.rate)) {
    const variation = 0.92 + Math.random() * 0.16;
    const from = Math.max(0.25, layer.rate[0] * profile.pitch * variation);
    const to = Math.max(0.25, layer.rate[1] * profile.pitch * variation);
    src.playbackRate.setValueAtTime(from, t0);
    src.playbackRate.linearRampToValueAtTime(to, t0 + duration);
  } else {
    src.playbackRate.value = rate * rrDetune * jitter;
  }

  // Reworked envelope: a hard, click-free 3 ms transient, a short body and a
  // long, quiet tail. The body gain is normalised to the layer's natural length
  // so short ticks and long magic tails sit at the same perceived loudness.
  const g = ctx.createGain();
  const end = t0 + duration;
  const attack = Math.min(0.004, duration * 0.1);
  const sustain = gain * (duration < 0.2 ? 1 : 0.92);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.linearRampToValueAtTime(sustain, t0 + Math.min(duration * 0.5, 0.12));
  const fade = Math.min(0.06, duration * 0.35);
  g.gain.setValueAtTime(sustain, Math.max(t0 + attack, end - fade));
  g.gain.linearRampToValueAtTime(0.0001, end);

  // Family tone shaping: a high-pass clears rumble, a gentle low-pass rounds
  // the top so layered samples never turn brittle when voices stack.
  let tone: BiquadFilterNode | null = null;
  let out: AudioNode = g;
  src.connect(g);
  try {
    tone = ctx.createBiquadFilter();
    tone.type = "highpass";
    tone.frequency.value = profile.hp;
    tone.Q.value = profile.q;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = profile.lp;
    lp.Q.value = profile.q;
    g.connect(tone);
    tone.connect(lp);
    out = lp;
  } catch {
    tone?.disconnect();
    tone = null;
    out = g;
  }
  let panner: StereoPannerNode | null = null;
  const layerPan = count <= 1 ? 0 : ((index / (count - 1)) * 2 - 1) * profile.stereoWidth;
  const drift = (Math.random() * 2 - 1) * profile.stereoWidth * 0.18;
  const panValue = Math.max(-1, Math.min(1, (layer.pan ?? 0) * 0.65 + layerPan + drift));
  if (Math.abs(panValue) > 0.01 && typeof ctx.createStereoPanner === "function") {
    panner = ctx.createStereoPanner();
    panner.pan.value = panValue;
    out.connect(panner);
    panner.connect(rack.master);
  } else {
    out.connect(rack.master);
  }
  // dual reverb sends: long hall for size, short plate for air, per family
  let send: GainNode | null = null;
  let plateSend: GainNode | null = null;
  if (rack.verbIn && profile.verb > 0) {
    try {
      send = ctx.createGain();
      send.gain.value = profile.verb;
      out.connect(send);
      send.connect(rack.verbIn);
    } catch {
      send = null;
    }
  }
  if (rack.verbPlate && profile.plate > 0) {
    try {
      plateSend = ctx.createGain();
      plateSend.gain.value = profile.plate;
      out.connect(plateSend);
      plateSend.connect(rack.verbPlate);
    } catch {
      plateSend = null;
    }
  }

  rack.voices++;
  src.onended = () => {
    if (rack) rack.voices = Math.max(0, rack.voices - 1);
    try {
      src.disconnect();
      g.disconnect();
      tone?.disconnect();
      panner?.disconnect();
      send?.disconnect();
      plateSend?.disconnect();
    } catch {
      /* already gone */
    }
  };
  try {
    src.start(t0);
    src.stop(end + 0.012);
  } catch {
    rack.voices = Math.max(0, rack.voices - 1);
    return false;
  }
  return true;
}

/**
 * Synthesised sub thump — the weight layer no sample pack carries. Sines
 * gliding 84 Hz → 38 Hz under the big impacts give the mix chest on desktop
 * speakers while staying short enough never to muddy the low-mid range.
 */
function playSub(profile: ReworkedSoundProfile) {
  if (!rack) return;
  try {
    const ctx = rack.ctx;
    const t0 = ctx.currentTime + 0.003 + Math.random() * 0.007;
    const dur = 0.24;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    const f0 = 84 * Math.max(0.8, Math.min(1.2, profile.pitch));
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(34, f0 * 0.45), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.42 * profile.gain, t0 + 0.007);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(rack.master);
    rack.voices++;
    osc.onended = () => {
      if (rack) rack.voices = Math.max(0, rack.voices - 1);
      try {
        osc.disconnect();
        g.disconnect();
      } catch {
        /* already gone */
      }
    };
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  } catch {
    /* ignore */
  }
}

/** keys whose hits deserve the synth sub under them */
const SUB_KEYS = /^(explosion|boss|lose|impact|meteor|superbolt|critBig|chestCrack|demon|void|gravity|doomsday|eclipse)/;

/** stingers that duck the personal music for a beat so the moment lands */
const DUCK_KEYS = new Set(["win", "lose", "ceremony", "awaken", "jackpot", "chestCrack", "superHardcoreStart", "boss"]);

/**
 * Sidechain-style music duck: every stinger pushes the personal-music bus down
 * to 30% for about a second, then rides it back. This is the trick that makes
 * win/lose moments feel produced instead of merely loud.
 */
export function duckMusic(key: string) {
  if (!rack || !DUCK_KEYS.has(key)) return;
  try {
    const ctx = rack.ctx;
    const now = ctx.currentTime;
    const base = stateMul;
    const gain = rack.musicIn.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(Math.max(0.0001, gain.value), now);
    gain.linearRampToValueAtTime(Math.max(0.0001, base * 0.3), now + 0.05);
    gain.linearRampToValueAtTime(Math.max(0.0001, base), now + 1.1);
  } catch {
    /* ignore */
  }
}

function playCue(cue: SampleCue | undefined, key: string): boolean {
  if (!stateOn || !rack || !cue?.length) return false;
  let played = false;
  const profile = reworkedProfile(key);
  for (let i = 0; i < cue.length; i++) {
    if (playLayer(cue[i], profile, i, cue.length)) played = true;
  }
  if (played) {
    if (SUB_KEYS.test(key)) playSub(profile);
    duckMusic(key);
  }
  return played;
}

/**
 * Fire one sample cue by sfx name. Returns true when at least one layer was
 * scheduled, so audio.ts knows it must not run the synth fallback.
 */
export function playSample(key: string, arg?: string | number): boolean {
  if (!stateOn || !rack) return false;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const gap = SAMPLE_GAPS[key] ?? 0;
  if (gap > 0) {
    if (now - (lastPlayed[key] ?? -1e9) < gap) return true;
    lastPlayed[key] = now;
  }
  const cue =
    key === "shoot"
      ? shootCue(String(arg ?? ""))
      : key === "chestLoot"
        ? chestLootCue(Number(arg ?? 3))
        : CUES[key];
  return playCue(cue, key);
}

/**
 * Same rapid-fire gates the Tone layer used: a 60fps wave of thirty towers
 * should read as a battle, not as a wall of clipping transients.
 */
const SAMPLE_GAPS: Record<string, number> = {
  click: 28,
  hover: 70,
  point: 40,
  coin: 35,
  crit: 45,
  critBig: 70,
  shoot: 22,
  zap: 45,
  uiTab: 40,
  chatTyping: 90,
  bossRoulette: 700,
  eclipseBurst: 90,
  seraphHymn: 55,
  heavenlyImpact: 40,
};

const lastPlayed: Record<string, number> = {};

/** exposed for the audio settings panel / tests */
export const sampleEngineReady = () => !!rack && rack.ready;
