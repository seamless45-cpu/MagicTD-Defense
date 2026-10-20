/**
 * EXTERNAL SAMPLE LAYER — the primary sound engine for MagicTD.
 *
 * Every cue below is built from short, real recordings from Kenney's CC0 sound
 * library (Interface Sounds, UI Audio, RPG Audio, Impact Sounds, Sci-Fi Sounds
 * and Music Jingles). The clips live in `public/sfx/` and are preloaded once
 * the first gesture unlocks audio. Each cue is layered like a sound designer
 * would layer it: a transient, a body and a tail, with a little random pitch
 * so repeated shots never sound machine-gunned.
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
  // ---------- UI ----------
  click: [L(["ui/click.mp3"], 0.72, 1), L("ui/tick.mp3", 0.18, 1.15, 0.008)],
  hover: [L("ui/hover.mp3", 0.26, 1)],
  error: [L("ui/error.mp3", 0.8, 1), L("ui/glitch.mp3", 0.26, 0.92, 0.012), L("ui/scratch.mp3", 0.18, 0.95, 0.02)],
  coin: [
    L("rpg/handle-coins-2.mp3", 0.72, 1),
    L("rpg/metal-click.mp3", 0.3, 1.18, 0.035),
  ],
  gem: [
    L("ui/glass-2.mp3", 0.62, 1),
    L("ui/pluck-1.mp3", 0.32, 1, 0.055),
  ],
  token: [
    L("ui/glass-1.mp3", 0.52, 1),
    L("rpg/metal-click.mp3", 0.34, 1.25, 0.04),
  ],
  buy: [
    L("ui/confirm-2.mp3", 0.62, 1),
    L("rpg/handle-coins-2.mp3", 0.46, 1, 0.055),
  ],
  uiPop: [L("ui/select-3.mp3", 0.5, 1.06)],
  uiOff: [
    L("ui/toggle-off.mp3", 0.6, 1),
    L("ui/back.mp3", 0.3, 0.9, 0.015),
    L("ui/minimize.mp3", 0.22, 1.05, 0.03),
  ],
  uiTab: [
    L("ui/switch-12.mp3", 0.62, 1),
    L("ui/select-5.mp3", 0.2, 1.12, 0.02),
  ],
  chatSend: [
    L("ui/select-7.mp3", 0.48, 1),
    L("ui/tick.mp3", 0.26, 1.05, 0.03),
  ],
  chatRecv: [
    L("ui/select-5.mp3", 0.46, 1),
    L("ui/pluck-2.mp3", 0.28, 1, 0.045),
    L("ui/question.mp3", 0.12, 1.08, 0.05),
  ],
  chatTyping: [
    L("ui/tick.mp3", 0.2, 1),
    L("ui/tick.mp3", 0.15, 1.08, 0.072),
  ],
  goldRain: [
    L("rpg/handle-coins.mp3", 0.7, 1),
    L("rpg/handle-coins-2.mp3", 0.4, 1.08, 0.11),
    L("rpg/metal-click.mp3", 0.28, 1.2, 0.23),
    L("rpg/metal-click.mp3", 0.22, 1.35, 0.34),
  ],
  gemRain: [
    L("ui/glass-2.mp3", 0.58, 1),
    L("ui/glass-4.mp3", 0.42, 1.05, 0.11),
    L("ui/pluck-1.mp3", 0.32, 1.12, 0.2),
    L("ui/glass-5.mp3", 0.32, 1.18, 0.31),
  ],

  // ---------- chests ----------
  chestWind: [
    L("scifi/space-low.mp3", 0.5, [0.62, 1.22], 0, 1.1),
    L("ui/scroll-1.mp3", 0.22, [0.75, 1.4], 0.02, 0.9),
    L("scifi/engine-circular.mp3", 0.14, 0.8, 0, 1.0),
  ],
  chestRattle: [
    L("rpg/creak.mp3", 0.55, 1),
    L("rpg/metal-latch.mp3", 0.38, 1.05, 0.08),
    L("impact/wood-medium.mp3", 0.34, 1, 0.2),
  ],
  chestSlam: [
    L("impact/plate-heavy.mp3", 0.9, 1),
    L("scifi/explosion-3.mp3", 0.4, 1.1, 0.025),
    L("rpg/metal-latch.mp3", 0.36, 1.12, 0.06),
    L("rpg/door-close.mp3", 0.3, 1.15, 0.03),
  ],
  chestBlast: [
    L("scifi/force-field-1.mp3", 0.55, 1),
    L("impact/glass-heavy.mp3", 0.46, 1.05, 0.03),
    L("scifi/low-explosion-0.mp3", 0.58, 1, 0.05),
    L("ui/glass-4.mp3", 0.3, 1.15, 0.12),
  ],
  chestLid: [
    L("rpg/book-flip.mp3", 0.52, 1),
    L("rpg/cloth-2.mp3", 0.3, 1, 0.05),
    L("ui/open.mp3", 0.2, 1.1, 0.015),
  ],
  chest: [
    L("rpg/book-open.mp3", 0.56, 1),
    L("rpg/handle-coins-2.mp3", 0.62, 1, 0.075),
    L("rpg/metal-latch.mp3", 0.38, 1.05, 0.145),
    L("ui/close.mp3", 0.16, 1.12, 0.02),
  ],
  chestCharge: [
    L("scifi/force-field-2.mp3", 0.55, [0.7, 1.45], 0, 1.05),
    L("ui/scroll-2.mp3", 0.22, [0.85, 1.55], 0.02, 0.95),
  ],
  chestCrack: [
    L("rpg/chop.mp3", 0.8, 1),
    L("impact/plank.mp3", 0.4, 1.1, 0.025),
    L("scifi/low-explosion-1.mp3", 0.38, 1.15, 0.04),
  ],

  // ---------- building ----------
  place: [
    L("impact/wood-medium.mp3", 0.66, 1),
    L("rpg/book-place.mp3", 0.36, 1.05, 0.035),
    L("impact/wood-heavy.mp3", 0.22, 1.05, 0.01),
  ],
  towerDrop: [
    L("impact/plate-medium.mp3", 0.62, 0.9),
    L("impact/wood-heavy.mp3", 0.48, 0.82, 0.018),
    L("ui/glass-1.mp3", 0.24, 1.15, 0.06),
  ],
  summon: [
    L("scifi/force-field-0.mp3", 0.5, 1),
    L("rpg/door-open.mp3", 0.36, 1.1, 0.04),
    L("ui/maximize.mp3", 0.28, 1.05, 0.09),
  ],
  merge: [
    L("ui/confirm-1.mp3", 0.55, 1),
    L("scifi/force-field-3.mp3", 0.4, 1.05, 0.035),
    L("rpg/metal-latch.mp3", 0.32, 1.1, 0.09),
    L("scifi/space-low.mp3", 0.32, [0.72, 0.92], 0.015, 0.8),
    L("ui/glass-5.mp3", 0.22, 0.88, 0.07),
  ],
  merge2: [
    L("ui/glass-4.mp3", 0.46, 1),
    L("ui/select-5.mp3", 0.3, 1.1, 0.03),
  ],
  ascend: [
    L("scifi/space-low.mp3", 0.42, [0.68, 1.02], 0, 0.85),
    L("scifi/force-field-0.mp3", 0.5, [0.9, 1.15], 0.015, 1.0),
    L("scifi/laser-large.mp3", 0.5, [0.82, 1.3], 0.03, 0.75),
    L("ui/confirm-4.mp3", 0.48, 1, 0.1),
    L("ui/glass-5.mp3", 0.24, 1.15, 0.16),
  ],
  awaken: [
    L("ui/glass-4.mp3", 0.5, 1),
    L("ui/pluck-1.mp3", 0.36, 1.08, 0.055),
    L("scifi/force-field-2.mp3", 0.34, [0.85, 1.2], 0.015, 1.0),
  ],
  ceremony: [
    L("music/ceremony.mp3", 0.5, 1),
    L("ui/glass-5.mp3", 0.26, 1.1, 0.12),
    L("ui/confirm-3.mp3", 0.24, 1.05, 0.04),
  ],
  rally: [
    L("music/rally.mp3", 0.56, 1),
    L("rpg/draw-knife.mp3", 0.3, 1.15, 0.025),
  ],
  point: [
    L("ui/tick.mp3", 0.4, 1),
    L("ui/pluck-1.mp3", 0.22, 1.2, 0.02),
  ],

  // ---------- battle ----------
  zap: [
    L("scifi/force-field-4.mp3", 0.48, 1),
    L("scifi/laser-retro.mp3", 0.5, [1.25, 0.85], 0.012, 0.24),
  ],
  blast1: [
    L("scifi/explosion-0.mp3", 0.72, 1),
    L("impact/punch-medium.mp3", 0.36, 1.05, 0.02),
  ],
  blast2: [
    L("scifi/explosion-2.mp3", 0.76, 1),
    L("scifi/low-explosion-0.mp3", 0.6, 1, 0.02),
    L("impact/plate-medium.mp3", 0.36, 1.05, 0.035),
  ],
  blast3: [
    L("scifi/explosion-3.mp3", 0.85, 1),
    L("scifi/low-explosion-1.mp3", 0.72, 1, 0.025),
    L("impact/punch-heavy.mp3", 0.42, 1, 0.045),
  ],
  onKill: [
    L("rpg/handle-coins-2.mp3", 0.46, 1.05),
    L("ui/pluck-1.mp3", 0.26, 1.2, 0.03),
  ],
  superbolt: [
    L("scifi/low-explosion-1.mp3", 0.76, 1),
    L("scifi/force-field-0.mp3", 0.46, 1, 0.02),
    L("impact/plate-heavy.mp3", 0.46, 1, 0.035),
  ],
  demonExecution: [
    L("scifi/space-low.mp3", 0.72, [0.62, 0.42], 0, 0.82),
    L("scifi/laser-large.mp3", 0.78, [1.45, 0.72], 0.035, 0.5),
    L("scifi/low-explosion-1.mp3", 0.92, 0.58, 0.11, 0.96),
    L("impact/plate-heavy.mp3", 0.7, 0.76, 0.16),
    L("scifi/explosion-3.mp3", 0.55, 0.74, 0.23),
  ],
  supervisorMerge: [
    L("scifi/force-field-2.mp3", 0.82, [0.8, 0.62], 0, 0.72),
    L("scifi/low-explosion-1.mp3", 0.92, 0.68, 0.035, 0.9),
    L("scifi/laser-large.mp3", 0.65, [0.65, 0.42], 0.06, 0.56),
    L("impact/plate-heavy.mp3", 0.48, 0.72, 0.12),
  ],
  doomsday: [
    L("scifi/low-explosion-0.mp3", 1, 0.52, 0, 1.2),
    L("scifi/explosion-3.mp3", 0.78, 0.65, 0.06, 0.95),
    L("scifi/force-field-1.mp3", 0.64, [0.58, 0.36], 0.11, 1.15),
    L("impact/plate-heavy.mp3", 0.66, 0.66, 0.17),
  ],
  heavenlyImpact: [
    L("scifi/force-field-3.mp3", 0.68, 1.15),
    L("scifi/laser-large.mp3", 0.58, 1.22, 0.015),
    L("ui/glass-4.mp3", 0.36, 1.3, 0.04),
  ],
  explosion: [
    L("scifi/explosion-2.mp3", 0.78, 1),
    L("scifi/low-explosion-0.mp3", 0.58, 1, 0.02),
  ],
  freeze: [
    L("impact/glass-medium.mp3", 0.68, 1),
    L("ui/glass-1.mp3", 0.4, 1.1, 0.03),
    L("scifi/force-field-3.mp3", 0.32, 0.82, 0.02, 0.8),
  ],
  stun: [
    L("impact/bell-heavy.mp3", 0.62, 1),
    L("impact/punch-medium.mp3", 0.32, 1, 0.025),
  ],
  crit: [
    L("rpg/metal-click.mp3", 0.46, 1.08),
    L("impact/metal-light.mp3", 0.38, 1.05, 0.01),
    L("ui/tick.mp3", 0.22, 1.2, 0.025),
  ],
  critBig: [
    L("impact/metal-heavy.mp3", 0.78, 1),
    L("scifi/explosion-0.mp3", 0.4, 1.1, 0.02),
    L("impact/bell-heavy.mp3", 0.36, 1.05, 0.035),
    L("scifi/impact-metal.mp3", 0.26, 1.2, 0.015),
  ],
  meteor: [
    L("scifi/thruster-2.mp3", 0.55, [1.25, 0.7], 0, 0.5),
    L("scifi/low-explosion-1.mp3", 0.55, 1, 0.18),
  ],
  hurt: [
    L("impact/soft-heavy.mp3", 0.68, 1),
    L("impact/punch-medium.mp3", 0.3, 1.05, 0.02),
  ],
  leak: [
    L("impact/bell-big.mp3", 0.6, 1),
    L("scifi/low-explosion-1.mp3", 0.46, 1.1, 0.025),
  ],
  wave: [L("music/wave.mp3", 0.62, 1)],
  battleStart: [
    L("music/hero.mp3", 0.46, 0.9, 0, 0.65),
    L("ui/confirm-4.mp3", 0.4, 0.92, 0.12),
    L("scifi/force-field-0.mp3", 0.3, 0.85, 0.04, 0.6),
  ],
  waveClear: [
    L("music/ceremony.mp3", 0.5, 1.08, 0, 0.7),
    L("ui/glass-4.mp3", 0.42, 1.1, 0.06),
    L("ui/confirm-1.mp3", 0.28, 1.15, 0.1),
  ],
  autoResolve: [
    L("ui/scroll-2.mp3", 0.42, [0.8, 1.12], 0, 0.3),
    L("scifi/force-field-3.mp3", 0.38, 1.05, 0.035, 0.45),
    L("ui/confirm-4.mp3", 0.4, 1.15, 0.12),
  ],
  bossSkip: [
    L("ui/back.mp3", 0.56, 1.18),
    L("scifi/thruster-2.mp3", 0.3, [1.25, 0.9], 0.01, 0.24),
  ],
  boss: [
    L("music/boss.mp3", 0.58, 1),
    L("scifi/low-explosion-1.mp3", 0.62, 1, 0.02),
    L("scifi/space-low.mp3", 0.28, 0.7, 0.04, 1.4),
    L("scifi/space-large.mp3", 0.2, 0.65, 0.02, 1.5),
  ],
  bossRoulette: [
    L("scifi/space-small.mp3", 0.42, [0.7, 1.45], 0, 1.15),
    L("ui/scroll-2.mp3", 0.28, [0.75, 1.5], 0.02, 1.2),
    L("scifi/force-field-1.mp3", 0.36, [0.65, 1.25], 0.05, 0.95),
    L("ui/confirm-4.mp3", 0.52, 0.9, 1.0),
  ],
  win: [
    L("music/win.mp3", 0.68, 1),
    L("ui/confirm-4.mp3", 0.32, 1.05, 0.08),
  ],
  lose: [
    L("music/lose.mp3", 0.64, 1),
    L("scifi/low-explosion-1.mp3", 0.32, 0.8, 0.05),
  ],
  hero: [
    L("music/hero.mp3", 0.52, 1),
    L("scifi/force-field-0.mp3", 0.46, 1, 0.02),
    L("impact/plate-heavy.mp3", 0.36, 1, 0.04),
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
const SAMPLE_MASTER = 0.52;
/** same 300% loudness switch the Tone bus uses */
const BOOST_MUL = 3;

type AudioContextCtor = new () => AudioContext;

interface SampleRack {
  ctx: AudioContext;
  master: GainNode;
  lowShelf: BiquadFilterNode;
  midPeak: BiquadFilterNode;
  highShelf: BiquadFilterNode;
  buffers: Map<string, AudioBuffer>;
  loading: Map<string, Promise<AudioBuffer | null>>;
  voices: number;
  maxVoices: number;
  ready: boolean;
}

let rack: SampleRack | null = null;
let loadJob: Promise<void> | null = null;
let onExhausted: (() => void) | null = null;
let stateOn = true;
let stateVol = 0.7;
let stateBoost = false;
let stateEq = { bass: 0, mid: 0, treble: 0 };

const masterGain = () =>
  stateOn ? SAMPLE_MASTER * Math.min(1, Math.max(0, stateVol)) * (stateBoost ? BOOST_MUL : 1) : 0;

/** remember the player's mixer state and apply it if the bus already exists */
export function setSampleEQ(bass: number, mid: number, treble: number) {
  stateEq = { bass, mid, treble };
  if (!rack) return;
  const now = rack.ctx.currentTime;
  rack.lowShelf.gain.setTargetAtTime(bass, now, 0.035);
  rack.midPeak.gain.setTargetAtTime(mid, now, 0.035);
  rack.highShelf.gain.setTargetAtTime(1.5 + treble, now, 0.035);
}

export function setSampleState(on: boolean, vol: number, boost: boolean) {
  stateOn = on;
  stateVol = Math.min(1, Math.max(0, vol));
  stateBoost = boost;
  if (!rack) return;
  try {
    rack.master.gain.setTargetAtTime(masterGain(), rack.ctx.currentTime, 0.02);
  } catch {
    /* context closed */
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
    const lowShelf = ctx.createBiquadFilter();
    lowShelf.type = "lowshelf";
    lowShelf.frequency.value = 120;
    const midPeak = ctx.createBiquadFilter();
    midPeak.type = "peaking";
    midPeak.frequency.value = 1000;
    midPeak.Q.value = 0.85;
    const highShelf = ctx.createBiquadFilter();
    highShelf.type = "highshelf";
    highShelf.frequency.value = 4800;
    highShelf.gain.value = 1.5;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -15;
    comp.knee.value = 22;
    comp.ratio.value = 4.5;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    master.connect(lowCut);
    lowCut.connect(lowShelf);
    lowShelf.connect(midPeak);
    midPeak.connect(highShelf);
    highShelf.connect(comp);
    comp.connect(ctx.destination);
    rack = {
      ctx,
      master,
      lowShelf,
      midPeak,
      highShelf,
      buffers: new Map(),
      loading: new Map(),
      voices: 0,
      maxVoices: 36,
      ready: false,
    };
    setSampleEQ(stateEq.bass, stateEq.mid, stateEq.treble);
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

function pickFile(file: FileSpec): string {
  return Array.isArray(file) ? file[Math.floor(Math.random() * file.length)] : file;
}

function rateValue(rate: number | [number, number] | undefined): number {
  if (Array.isArray(rate)) return Math.max(0.25, rate[0]);
  return Math.max(0.25, rate ?? 1);
}

interface ReworkedSoundProfile { gain: number; pitch: number; stereoWidth: number }

/** New mix design: every SFX now gets a family-specific pitch, gain and stereo stage. */
function reworkedProfile(key: string): ReworkedSoundProfile {
  if (/^(shoot|zap|blast|superbolt|demon|supervisor|doomsday|heavenly|explosion|freeze|stun|crit|impact|meteor|leak|boss|hero)/.test(key))
    return { gain: 0.92, pitch: 0.94, stereoWidth: 0.36 };
  if (/^(win|lose|ceremony|rally|wave|ascend|awaken|chest)/.test(key))
    return { gain: 0.88, pitch: 1.03, stereoWidth: 0.28 };
  if (/^(coin|onKill|point|purchase|upgrade|merge|summon|place|towerDrop)/.test(key))
    return { gain: 0.96, pitch: 1.06, stereoWidth: 0.2 };
  return { gain: 0.92, pitch: 1.04, stereoWidth: 0.16 };
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
  const gain = Math.max(0.0001, (layer.gain ?? 0.6) * profile.gain);
  const rate = rateValue(layer.rate) * profile.pitch;
  const t0 = ctx.currentTime + Math.max(0, layer.delay ?? 0) + 0.003;
  const natural = buffer.duration / rate;
  const duration = Math.max(0.025, Math.min(natural, layer.dur ?? natural));

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  if (Array.isArray(layer.rate)) {
    const variation = 0.92 + Math.random() * 0.16;
    const from = Math.max(0.25, layer.rate[0] * profile.pitch * variation);
    const to = Math.max(0.25, layer.rate[1] * profile.pitch * variation);
    src.playbackRate.setValueAtTime(from, t0);
    src.playbackRate.linearRampToValueAtTime(to, t0 + duration);
  } else {
    src.playbackRate.value = rate * (0.92 + Math.random() * 0.16);
  }

  const g = ctx.createGain();
  // Reworked 4ms transient and softened tail prevent clicks while keeping hits punchy.
  const end = t0 + duration;
  const attack = Math.min(0.006, duration * 0.12);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  const fade = Math.min(0.035, duration * 0.28);
  g.gain.setValueAtTime(gain, Math.max(t0 + attack, end - fade));
  g.gain.linearRampToValueAtTime(0.0001, end);
  src.connect(g);

  let panner: StereoPannerNode | null = null;
  const layerPan = count <= 1 ? 0 : ((index / (count - 1)) * 2 - 1) * profile.stereoWidth;
  const panValue = Math.max(-1, Math.min(1, (layer.pan ?? 0) * 0.65 + layerPan));
  if (Math.abs(panValue) > 0.01 && typeof ctx.createStereoPanner === "function") {
    panner = ctx.createStereoPanner();
    panner.pan.value = panValue;
    g.connect(panner);
    panner.connect(rack.master);
  } else {
    g.connect(rack.master);
  }

  rack.voices++;
  src.onended = () => {
    if (rack) rack.voices = Math.max(0, rack.voices - 1);
    try {
      src.disconnect();
      g.disconnect();
      panner?.disconnect();
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

function playCue(cue: SampleCue | undefined, key: string): boolean {
  if (!stateOn || !rack || !cue?.length) return false;
  let played = false;
  const profile = reworkedProfile(key);
  for (let i = 0; i < cue.length; i++) {
    if (playLayer(cue[i], profile, i, cue.length)) played = true;
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
};

const lastPlayed: Record<string, number> = {};

/** exposed for the audio settings panel / tests */
export const sampleEngineReady = () => !!rack && rack.ready;
