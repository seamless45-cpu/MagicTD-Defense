/**
 * MagicTD's audio engine — a **sample-first** mixer with a Tone.js fallback.
 *
 * PRIMARY LAYER (`game/sfxSamples.ts`)
 *   Every cue is built from short, real recordings — Kenney's CC0 interface,
 *   UI, RPG, impact, sci-fi and music-jingle packs — layered transient + body +
 *   tail, with a little random pitch so repeated shots never sound identical.
 *   The clips live in `public/sfx/`; the first user gesture unlocks the bus and
 *   preloads them. A compressor keeps a screen full of explosions from clipping,
 *   per-cue throttles gate rapid fire, and a voice cap protects the frame rate.
 *
 * FALLBACK LAYER (this file, Tone.js)
 *   If a browser has no Web Audio, a clip cannot be fetched/decoded, or the game
 *   is opened from file://, the original Tone synth voices below take over. The
 *   sound design is still multi-layered: `Oscillator` + `AmplitudeEnvelope` +
 *   `Filter` sweeps for tones, `Noise` bursts for impacts and whooshes,
 *   `FMSynth` clangs for metal, `MembraneSynth` booms for explosions, a
 *   `MetalSynth` for coins/chests, a plate reverb send and a sub-bass lane.
 *
 * `sfx.*` keeps its original API, so gameplay code is unchanged. Every call
 * tries the external samples first and only falls through to the synth when the
 * sample layer has nothing to play.
 */
import * as Tone from "tone";
import { initSamples, playSample, setSampleState } from "./sfxSamples";

let rack: {
  master: Tone.Gain;
  bus: Tone.Gain;
  bass: Tone.Gain;
  send: Tone.Gain;
  built: boolean;
} | null = null;

let enabled = true;
let volume = 0.7;
/** volume booster: pushes the master bus up to 300% of the slider value */
let boosted = false;
let lastShot = 0;

const MASTER_LEVEL = 0.42;
const BOOST_MUL = 3;

/** the gain the master bus should sit at right now */
const masterGain = () => (enabled ? MASTER_LEVEL * volume * (boosted ? BOOST_MUL : 1) : 0);

export function setSfx(on: boolean) {
  enabled = on;
  if (rack) rack.master.gain.rampTo(masterGain(), 0.06);
  setSampleState(enabled, volume, boosted);
}

/** master volume, 0..1 */
export function setVolume(v: number) {
  volume = Math.min(1, Math.max(0, v));
  if (rack) rack.master.gain.rampTo(masterGain(), 0.06);
  setSampleState(enabled, volume, boosted);
}

/**
 * VOLUME BOOSTER — up to 300%. A loudness switch for phone speakers in a noisy
 * room: it multiplies the master bus by three (the limiter still catches the
 * peaks, so it gets loud without clipping into fuzz).
 */
export function setVolumeBoost(on: boolean) {
  boosted = !!on;
  if (rack) rack.master.gain.rampTo(masterGain(), 0.08);
  setSampleState(enabled, volume, boosted);
}

export const volumeBoosterOn = () => boosted;

/** build the Tone fallback graph; safe to call repeatedly */
function initRack() {
  if (rack?.built) return;
  try {
    void Tone.start().catch(() => {});
  } catch {
    /* no Web Audio: stay silent */
  }
  try {
    const master = new Tone.Gain(masterGain()).toDestination();
    const limiter = new Tone.Limiter(-1).connect(master);
    const comp = new Tone.Compressor({
      threshold: -16,
      knee: 22,
      ratio: 3.5,
      attack: 0.004,
      release: 0.18,
    }).connect(limiter);
    const bus = new Tone.Gain(0.9).connect(comp);

    // a small plate-style reverb on a send, plus slap delay in front of it
    const reverb = new Tone.Reverb({ decay: 2.1, preDelay: 0.018, wet: 1 }).connect(master);
    const send = new Tone.Gain(0.32).connect(reverb);

    // bass lane: sub-heavy hits roll off before they hit the bus
    const bass = new Tone.Gain(1);
    bass.connect(new Tone.Filter(220, "lowpass")).connect(bus);

    rack = { master, bus, bass, send, built: true };
  } catch {
    rack = rack ?? { master: new Tone.Gain(0) as Tone.Gain, bus: new Tone.Gain(0) as Tone.Gain, bass: new Tone.Gain(0) as Tone.Gain, send: new Tone.Gain(0) as Tone.Gain, built: false };
  }
}

/** call before any synth fallback voice, so it starts inside the user gesture */
function useSynth() {
  initRack();
  try {
    void Tone.start().catch(() => {});
  } catch {
    /* ignore */
  }
}

/**
 * Unlock audio on the first gesture. The external sample bus is the primary
 * engine; the Tone rack is only built when the sample engine is unavailable
 * (no AudioContext), or later if every clip failed to decode.
 */
export function initAudio() {
  const samplesOk = initSamples(() => initRack());
  setSampleState(enabled, volume, boosted);
  if (!samplesOk) initRack();
}

const now = () => {
  try {
    return Tone.now();
  } catch {
    return 0;
  }
};

const ready = () => enabled && rack?.built;

/** self-destructing node: nothing leaks no matter how many shots go down range */
function disposeLater(disposables: { dispose(): void }[], ttl: number) {
  setTimeout(() => {
    for (const d of disposables) {
      try {
        d.dispose();
      } catch {
        /* already gone */
      }
    }
  }, Math.max(250, ttl * 1000));
}

/**
 * One shaped tone voice: oscillator -> amplitude envelope -> sweeping filter.
 * @param freq   starting frequency
 * @param dur    length in seconds
 * @param type   oscillator shape
 * @param vol    peak gain
 * @param slide  frequency delta over `dur`
 * @param delay  seconds to wait before starting
 */
function tone(
  freq: number,
  dur: number,
  type: "sine" | "square" | "sawtooth" | "triangle",
  vol: number,
  slide = 0,
  delay = 0,
  opts: { detune?: number; cutoff?: number; q?: number; attack?: number; verb?: number; sub?: boolean } = {}
) {
  if (!ready() || !rack) return;
  try {
    const t0 = now() + delay;
    const attack = opts.attack ?? Math.min(0.012, dur * 0.25);
    const f0 = Math.max(20, freq);

    const osc = new Tone.Oscillator({ frequency: f0, type });
    if (opts.detune) osc.detune.value = opts.detune * 100;
    if (slide) {
      osc.frequency.setValueAtTime(f0, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, f0 + slide), t0 + dur);
    }

    const env = new Tone.AmplitudeEnvelope({
      attack,
      decay: Math.max(0.01, dur - attack),
      sustain: 0.0001,
      release: 0.06,
    });

    const cutoff = opts.cutoff ?? Math.min(14000, Math.max(600, f0 * 4 + Math.abs(slide)));
    const filt = new Tone.Filter({ frequency: cutoff, type: "lowpass", Q: opts.q ?? 3 });
    filt.frequency.setValueAtTime(cutoff, t0);
    filt.frequency.exponentialRampToValueAtTime(Math.max(300, cutoff * 0.45), t0 + dur);

    const g = new Tone.Gain(vol);
    osc.connect(env);
    env.connect(filt);
    filt.connect(g);
    g.connect(opts.sub ? rack.bass : rack.bus);
    if (opts.verb) g.connect(rack.send);

    osc.start(t0);
    osc.stop(t0 + dur + 0.12);
    env.triggerAttackRelease(Math.max(0.02, dur * 0.92), t0);
    disposeLater([osc, env, filt, g], delay + dur + 0.4);
  } catch {
    /* ignore */
  }
}

/**
 * Filtered noise — impacts, whooshes, sparks. The envelope decays and the
 * filter sweeps, which is what makes a noise burst read as a "hit" instead of
 * a hiss.
 */
function noise(
  dur: number,
  vol: number,
  freq = 800,
  opts: { delay?: number; q?: number; type?: "lowpass" | "highpass" | "bandpass"; sweep?: number; verb?: number; sub?: boolean; noiseType?: "white" | "pink" | "brown" } = {}
) {
  if (!ready() || !rack) return;
  try {
    const t0 = now() + (opts.delay ?? 0);
    const src = new Tone.Noise({ type: opts.noiseType ?? "white" });
    const env = new Tone.AmplitudeEnvelope({ attack: 0.002, decay: Math.max(0.02, dur * 0.85), sustain: 0.0001, release: Math.max(0.03, dur * 0.15) });
    const filt = new Tone.Filter({ frequency: freq, type: opts.type ?? "lowpass", Q: opts.q ?? 1 });
    if (opts.sweep) {
      filt.frequency.setValueAtTime(freq, t0);
      filt.frequency.exponentialRampToValueAtTime(Math.max(80, freq * opts.sweep), t0 + dur);
    }
    const g = new Tone.Gain(vol);
    src.connect(env);
    env.connect(filt);
    filt.connect(g);
    g.connect(opts.sub ? rack.bass : rack.bus);
    if (opts.verb) g.connect(rack.send);

    src.start(t0);
    src.stop(t0 + dur + 0.15);
    env.triggerAttackRelease(Math.max(0.02, dur * 0.9), t0);
    disposeLater([src, env, filt, g], (opts.delay ?? 0) + dur + 0.4);
  } catch {
    /* ignore */
  }
}

/** FM clang: a modulator bending a carrier — metal, coins, chains */
function fm(carrier: number, ratio: number, index: number, dur: number, vol: number, delay = 0, verb = 0) {
  if (!ready() || !rack) return;
  try {
    const t0 = now() + delay;
    const synth = new Tone.FMSynth({
      harmonicity: ratio,
      modulationIndex: index * 6,
      oscillator: { type: "sine" },
      modulation: { type: "sine" },
      envelope: { attack: 0.001, decay: dur * 0.7, sustain: 0, release: Math.max(0.05, dur * 0.3) },
    });
    const g = new Tone.Gain(vol);
    synth.connect(g);
    g.connect(rack.bus);
    if (verb) g.connect(rack.send);
    synth.modulationIndex.rampTo(1, dur);
    synth.triggerAttackRelease(carrier, dur, t0);
    disposeLater([synth, g], delay + dur + 0.5);
  } catch {
    /* ignore */
  }
}

/** metal clang / shimmer — coins, chest hardware, glassy gems */
function clang(freq: number, dur: number, vol: number, delay = 0, verb = 0.5) {
  if (!ready() || !rack) return;
  try {
    const t0 = now() + delay;
    const m = new Tone.MetalSynth({
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4200,
      octaves: 1.2,
      envelope: { attack: 0.001, decay: dur * 0.8, sustain: 0, release: Math.max(0.04, dur * 0.2) },
    });
    const g = new Tone.Gain(vol);
    m.connect(g);
    g.connect(rack.bus);
    if (verb) g.connect(rack.send);
    m.triggerAttackRelease(freq, dur, t0);
    disposeLater([m, g], delay + dur + 0.5);
  } catch {
    /* ignore */
  }
}

/** deep membrane boom — explosions, stomps, door slams */
function boom(freq: number, dur: number, vol: number, delay = 0, drop = 2.2) {
  if (!ready() || !rack) return;
  try {
    const t0 = now() + delay;
    const mem = new Tone.MembraneSynth({
      pitchDecay: 0.06,
      octaves: drop,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: dur * 0.75, sustain: 0, release: Math.max(0.06, dur * 0.25) },
    });
    const g = new Tone.Gain(vol);
    mem.connect(g);
    g.connect(rack.bass);
    g.connect(rack.bus);
    mem.triggerAttackRelease(freq, dur, t0, 1);
    disposeLater([mem, g], delay + dur + 0.5);
  } catch {
    /* ignore */
  }
}

/** a chord/stab of short tones — fanfares, stingers */
function stab(freqs: number[], dur: number, vol: number, delay = 0, type: "sine" | "square" | "sawtooth" | "triangle" = "triangle") {
  freqs.forEach((f, i) => tone(f, dur, type, vol, 0, delay + i * 0.012, { detune: 0.004, verb: 0.5 }));
}

/** rising riser used before big moments */
function riser(dur: number, vol: number, from = 180, to = 1400, delay = 0) {
  tone(from, dur, "sawtooth", vol, to - from, delay, { q: 6, detune: 0.01, verb: 0.6 });
  noise(dur, vol * 0.7, 400, { delay, type: "bandpass", q: 4, sweep: 6, verb: 0.5, noiseType: "pink" });
}

/** big impact: noise transient + pitch-dropping body + sub thump */
function impact(vol = 0.3, size = 1) {
  noise(0.22 * size, vol, 1800, { sweep: 0.12, q: 0.8, verb: 0.6, noiseType: "pink" });
  tone(160 * size, 0.34 * size, "sine", vol * 0.9, -110 * size, 0, { sub: true, cutoff: 900 });
  boom(90 * size, 0.42 * size, vol * 0.85);
}

const synthSfx = {
  // ---------- UI ----------
  click: () => {
    tone(660, 0.05, "square", 0.16, -180, 0, { cutoff: 2600, q: 1.5 });
    noise(0.03, 0.06, 3200, { type: "highpass" });
  },
  hover: () => tone(420, 0.035, "sine", 0.07, 60, 0, { cutoff: 1800 }),
  error: () => {
    tone(190, 0.16, "square", 0.22, -70, 0, { cutoff: 1200, q: 4 });
    tone(150, 0.2, "sawtooth", 0.16, -40, 0.02, { sub: true, cutoff: 700 });
  },

  // ---------- currency ----------
  coin: () => {
    fm(1420, 2.01, 3.2, 0.16, 0.2);
    clang(2100, 0.12, 0.12, 0.03, 0.4);
    tone(880, 0.06, "triangle", 0.12, 120);
  },
  gem: () => {
    // glassy: two shimmering sines with a long, wet tail plus a metal sparkle
    tone(1180, 0.22, "sine", 0.16, 480, 0, { detune: 0.012, verb: 0.8, cutoff: 9000 });
    tone(1770, 0.3, "sine", 0.12, 320, 0.04, { verb: 0.9 });
    clang(2360, 0.34, 0.08, 0.08, 0.9);
  },
  token: () => {
    fm(900, 3.01, 4, 0.18, 0.18);
    tone(1400, 0.2, "sine", 0.12, 500, 0.05, { verb: 0.7 });
  },
  buy: () => {
    fm(1040, 2.01, 2.4, 0.14, 0.18);
    tone(1560, 0.16, "triangle", 0.14, 300, 0.05, { verb: 0.5 });
  },
  /** tiny UI pop for toggles, tabs and chips */
  uiPop: () => {
    tone(900, 0.045, "triangle", 0.14, 260, 0, { cutoff: 4200 });
    tone(1350, 0.06, "sine", 0.08, 180, 0.02, { verb: 0.3 });
  },
  uiOff: () => {
    tone(520, 0.07, "square", 0.12, -180, 0, { cutoff: 2200 });
    tone(310, 0.09, "sine", 0.09, -70, 0.02);
  },
  /** tab switch: a small two-note blip */
  uiTab: () => {
    tone(1150, 0.04, "triangle", 0.12, 0, 0, { cutoff: 5200 });
    tone(1520, 0.06, "triangle", 0.1, 200, 0.045, { verb: 0.4 });
  },
  /** chat: the sender's own message ticking into the log */
  chatSend: () => {
    tone(1200, 0.05, "sine", 0.12, 260, 0, { verb: 0.35 });
    tone(1800, 0.07, "sine", 0.07, 200, 0.035, { verb: 0.45 });
  },
  /** chat: an incoming message landing */
  chatRecv: () => {
    tone(760, 0.07, "triangle", 0.11, 180, 0, { verb: 0.45 });
    tone(570, 0.09, "sine", 0.08, -60, 0.05, { verb: 0.4 });
  },
  /** chat: someone is typing */
  chatTyping: () => {
    [0, 1].forEach((i) => tone(640 + i * 90, 0.035, "square", 0.05, 60, i * 0.07, { cutoff: 3000 }));
  },
  goldRain: () => {
    for (let i = 0; i < 9; i++) {
      fm(1200 + i * 90, 2.01, 2.6, 0.16, 0.13, i * 0.055, 0.6);
      if (i % 2 === 0) clang(1800 + i * 120, 0.12, 0.07, i * 0.055 + 0.02, 0.5);
    }
    boom(300, 0.5, 0.18);
  },
  gemRain: () => {
    [0, 3, 5, 7, 10].forEach((st, i) => tone(880 * Math.pow(2, st / 12), 0.4, "sine", 0.14, 120, i * 0.07, { verb: 0.9 }));
    [1, 4, 8].forEach((st, i) => clang(1320 * Math.pow(2, st / 12), 0.3, 0.06, i * 0.11 + 0.05, 0.85));
    noise(0.5, 0.1, 5200, { type: "highpass", sweep: 0.4, verb: 0.8 });
  },

  // ---------- chests (the full ceremony) ----------
  /** charge: a ratcheting riser with an accelerating tick pattern */
  chestWind: () => {
    riser(1.1, 0.2, 90, 1500);
    [0, 0.09, 0.16, 0.22, 0.27, 0.31, 0.345, 0.375, 0.4].forEach((t, i) => {
      tone(700 + i * 120, 0.05, "square", 0.07 + i * 0.006, -120, t, { cutoff: 4200, verb: 0.3 });
    });
    tone(150, 0.9, "triangle", 0.1, 700, 0, { q: 9, sub: true, verb: 0.4 });
  },
  /** shake: low grind + wood creak, pacing up */
  chestRattle: () => {
    noise(0.9, 0.14, 380, { sweep: 1.6, q: 1.1, noiseType: "brown", verb: 0.35 });
    [0.12, 0.34, 0.52, 0.66, 0.78].forEach((t, i) => {
      tone(90 + i * 22, 0.1, "square", 0.1, -30, t, { cutoff: 700, q: 4 });
      noise(0.07, 0.1, 2200, { type: "bandpass", q: 2.4, delay: t, sweep: 0.5 });
    });
  },
  /** crack: splintering wood, stressed metal, and a sub thump */
  chestSlam: () => {
    noise(0.1, 0.42, 3200, { type: "highpass", q: 0.7 });
    noise(0.3, 0.32, 460, { sweep: 0.22, noiseType: "brown", verb: 0.7 });
    fm(190, 1.31, 3.2, 0.3, 0.3);
    fm(320, 2.7, 2.2, 0.2, 0.16, 0.02);
    boom(105, 0.42, 0.3, 0, 2.6);
  },
  /** burst: the lid leaving, a light-blast and a shimmer tail */
  chestBlast: () => {
    noise(0.28, 0.3, 5200, { type: "highpass", q: 1.2, verb: 0.7 });
    noise(0.3, 0.28, 2000, { sweep: 0.15, q: 0.85, verb: 0.7, noiseType: "pink" });
    boom(140, 0.34, 0.24);
    tone(1600, 0.5, "sine", 0.1, 900, 0.02, { verb: 0.9 });
    [0, 4, 7, 12].forEach((st, i) => clang(880 * Math.pow(2, st / 12), 0.4, 0.05, 0.06 + i * 0.05, 0.9));
  },
  /** loot: an ascending chime cascade that scales with how much dropped */
  chestLoot: (n = 3) => {
    const steps = Math.max(1, Math.min(10, n));
    for (let i = 0; i < steps; i++) {
      tone(660 * Math.pow(2, (i % 5) / 12), 0.22, "sine", 0.14, 140, i * 0.07, { verb: 0.85 });
      if (i % 2 === 0) clang(1046 * Math.pow(2, (i % 4) / 12), 0.24, 0.05, i * 0.07 + 0.03, 0.8);
    }
    tone(1320, 0.5, "triangle", 0.09, 320, steps * 0.07, { verb: 0.9 });
  },
  /** the lid tumbling away */
  chestLid: () => {
    tone(280, 0.45, "triangle", 0.16, 900, 0, { q: 5, verb: 0.6 });
    noise(0.4, 0.14, 1800, { type: "bandpass", q: 1.6, sweep: 2.6 });
  },
  chest: () => {
    noise(0.3, 0.26, 900, { sweep: 0.2, verb: 0.6, noiseType: "pink" });
    fm(520, 1.5, 2, 0.24, 0.2, 0.16);
    clang(780, 0.24, 0.12, 0.3, 0.7);
    tone(780, 0.24, "triangle", 0.2, 340, 0.3, { verb: 0.7 });
  },
  chestCharge: () => {
    riser(0.85, 0.16, 140, 1200);
    tone(210, 0.85, "triangle", 0.09, 900, 0, { q: 8, verb: 0.5 });
  },
  chestCrack: () => {
    noise(0.12, 0.4, 2600, { type: "highpass", q: 0.7 });
    noise(0.3, 0.3, 420, { sweep: 0.25, verb: 0.7, noiseType: "brown" });
    fm(150, 1.41, 3, 0.34, 0.3);
    boom(90, 0.4, 0.26, 0.02, 2.8);
  },

  // ---------- building ----------
  place: () => {
    noise(0.1, 0.24, 1600, { sweep: 0.3, q: 1.2 });
    tone(220, 0.14, "square", 0.18, 90, 0, { cutoff: 1400, q: 3 });
    fm(340, 2.01, 1.6, 0.12, 0.12, 0.02);
  },
  summon: () => {
    riser(0.22, 0.16, 300, 1500);
    impact(0.24, 0.7);
    tone(920, 0.22, "triangle", 0.16, 420, 0.05, { verb: 0.6 });
  },
  merge: () => {
    // three rising chimes, tight and bright — reads as "something combined"
    [0, 4, 7].forEach((st, i) => tone(660 * Math.pow(2, st / 12), 0.2, "triangle", 0.18, 90, i * 0.055, { verb: 0.6 }));
    fm(1320, 2.01, 3, 0.2, 0.16, 0.12);
    boom(330, 0.26, 0.15, 0, 1.6);
  },
  merge2: () => {
    tone(330, 0.14, "square", 0.18, 520, 0, { cutoff: 3200 });
    tone(1320, 0.24, "sine", 0.16, 0, 0.1, { verb: 0.7 });
    fm(990, 2.01, 3, 0.22, 0.14, 0.16);
  },
  ascend: () => {
    riser(0.4, 0.14, 260, 1800);
    [0, 5, 12].forEach((st, i) => tone(520 * Math.pow(2, st / 12), 0.3, "triangle", 0.16, 120, i * 0.07, { verb: 0.7 }));
    impact(0.2, 0.9);
  },
  awaken: () => {
    [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.18, "sine", 0.18, 0, i * 0.06, { verb: 0.9 }));
    [1760, 2640].forEach((f, i) => clang(f, 0.3, 0.06, 0.1 + i * 0.1, 0.9));
    noise(0.32, 0.12, 4200, { type: "highpass", sweep: 0.3, verb: 0.8 });
  },
  ceremony: () => {
    stab([392, 523, 659, 784], 0.5, 0.16, 0, "triangle");
    stab([523, 659, 784, 1046], 0.55, 0.13, 0.22, "triangle");
    clang(1046, 0.5, 0.07, 0.24, 0.9);
    noise(0.8, 0.12, 6000, { type: "bandpass", q: 2, sweep: 0.3, verb: 0.9 });
  },
  rally: () => {
    stab([330, 415, 494], 0.3, 0.16);
    riser(0.3, 0.12, 400, 1200, 0.2);
  },
  point: () => tone(1280, 0.06, "sine", 0.12, 260, 0, { verb: 0.3 }),

  // ---------- battle ----------
  shoot: (kind: string) => {
    if (performance.now() - lastShot < 24) return;
    lastShot = performance.now();
    switch (kind) {
      case "arrow":
        noise(0.05, 0.09, 4200, { type: "bandpass", q: 3, sweep: 0.4 });
        break;
      case "boomer":
        noise(0.08, 0.1, 2600, { type: "bandpass", q: 6, sweep: 0.35 });
        break;
      case "cannon":
      case "mortar":
      case "colossus":
        tone(120, 0.16, "sine", 0.16, -50, 0, { sub: true });
        noise(0.12, 0.14, 900, { sweep: 0.3, noiseType: "pink" });
        break;
      case "clone":
        // a mirror-chirp: two quick pings a fifth apart
        tone(880, 0.05, "sine", 0.1, 320, 0, { verb: 0.4 });
        tone(1320, 0.07, "sine", 0.08, 200, 0.045, { verb: 0.5 });
        break;
      case "nova":
        // a shell salvo: a bright transient over a heavy boom
        tone(220, 0.12, "square", 0.12, -80, 0, { cutoff: 3200, q: 2 });
        tone(130, 0.18, "sine", 0.18, -60, 0.01, { sub: true });
        noise(0.1, 0.12, 1600, { sweep: 0.35, noiseType: "pink" });
        break;
      case "gatling":
      case "laser":
        tone(1800, 0.03, "square", 0.06, -700, 0, { cutoff: 5000 });
        break;
      case "ice":
      case "frost":
      case "chronolock":
        tone(2400, 0.06, "sine", 0.08, -900, 0, { verb: 0.5 });
        break;
      case "tesla":
      case "storm":
      case "thundercrown":
        noise(0.05, 0.1, 5200, { type: "highpass", q: 2 });
        tone(2600, 0.05, "sawtooth", 0.06, -1400, 0, { cutoff: 8000 });
        break;
      case "plasma":
      case "rail":
      case "voidrip":
        tone(700, 0.14, "sawtooth", 0.14, 900, 0, { q: 6, verb: 0.4 });
        noise(0.1, 0.1, 3000, { type: "bandpass", q: 4, sweep: 3 });
        break;
      case "flame":
      case "furnace":
        noise(0.14, 0.1, 700, { type: "bandpass", q: 1.2, sweep: 2, noiseType: "brown" });
        break;
      case "toxin":
      case "gravebloom":
        noise(0.16, 0.08, 500, { type: "bandpass", q: 2, sweep: 1.6, noiseType: "pink" });
        break;
      case "maelstrom":
        // a wind-up whirl: a wide band noise sweeping up and away
        noise(0.22, 0.11, 600, { type: "bandpass", q: 1.6, sweep: 4.2, noiseType: "brown" });
        break;
      case "starfall":
        // a rock tearing past on its way down
        riser(0.16, 0.1, 1400, 260);
        break;
      case "gravity":
        // the well breathing: a slow sub drop
        tone(180, 0.3, "sine", 0.14, -110, 0, { sub: true, verb: 0.3 });
        break;
      case "gale":
        // a blade tearing air: quick band-passed slice + high tick
        noise(0.09, 0.12, 2600, { type: "bandpass", q: 5, sweep: 0.45 });
        tone(1500, 0.06, "triangle", 0.1, -700, 0, { verb: 0.35 });
        break;
      case "bombardment":
        // siege thump with a hard transient
        tone(110, 0.22, "sine", 0.2, -60, 0, { sub: true });
        noise(0.16, 0.18, 1100, { sweep: 0.35, noiseType: "pink" });
        fm(180, 1.41, 1.8, 0.16, 0.1);
        break;
      case "wildfire":
        // a crackling bloom of fire
        noise(0.16, 0.12, 900, { type: "bandpass", q: 1.4, sweep: 2.2, noiseType: "brown" });
        tone(240, 0.12, "triangle", 0.08, 120);
        break;
      case "hades":
        // a gate grinding open: deep sub + cracking air
        tone(85, 0.3, "sawtooth", 0.2, -30, 0, { sub: true, q: 6, verb: 0.5 });
        noise(0.22, 0.16, 700, { sweep: 0.4, noiseType: "brown", verb: 0.5 });
        break;
      case "ion":
        // crackling ball lightning
        noise(0.08, 0.12, 5200, { type: "highpass", q: 2.2 });
        tone(2200, 0.07, "sawtooth", 0.09, -1200, 0, { cutoff: 9000 });
        break;
      case "aether":
        // folded light: a glassy ping
        tone(1900, 0.1, "sine", 0.1, 700, 0, { verb: 0.55, cutoff: 9000 });
        clang(2400, 0.12, 0.05, 0, 0.7);
        break;
      case "scythe":
        // a heavy swing through cloth
        noise(0.14, 0.13, 1400, { type: "bandpass", q: 2.2, sweep: 0.35, noiseType: "pink" });
        tone(320, 0.12, "triangle", 0.1, -140, 0.02);
        break;
      case "sandstorm":
        // a gust of grit
        noise(0.2, 0.11, 2000, { type: "bandpass", q: 1.2, sweep: 0.5, noiseType: "brown" });
        break;
      case "bloodstone":
        // a throbbing heart of stone
        tone(160, 0.16, "sine", 0.16, -50, 0, { sub: true, verb: 0.35 });
        tone(620, 0.1, "triangle", 0.08, 180, 0.03);
        break;
      case "venom":
        // wet glop with a hiss
        noise(0.16, 0.11, 600, { type: "bandpass", q: 1.8, sweep: 1.8, noiseType: "pink" });
        tone(200, 0.12, "triangle", 0.09, -70);
        break;
      case "lightning":
        noise(0.24, 0.2, 4000, { type: "highpass", q: 1.5, verb: 0.7 });
        tone(180, 0.3, "sine", 0.18, -60, 0.02, { sub: true, verb: 0.5 });
        break;
      default:
        tone(1100, 0.05, "square", 0.07, -400, 0, { cutoff: 4000 });
    }
  },
  zap: () => {
    noise(0.12, 0.2, 4600, { type: "highpass", q: 2, sweep: 0.3, verb: 0.6 });
    tone(3200, 0.1, "sawtooth", 0.1, -2200, 0, { cutoff: 9000 });
  },
  /** skill blast family — one per tier of big */
  blast1: () => {
    noise(0.2, 0.22, 1800, { sweep: 0.2, q: 0.9, verb: 0.55, noiseType: "pink" });
    tone(170, 0.24, "sine", 0.18, -70, 0, { sub: true });
  },
  blast2: () => {
    noise(0.3, 0.28, 2000, { sweep: 0.15, q: 0.85, verb: 0.7, noiseType: "pink" });
    boom(140, 0.34, 0.24);
    stab([392, 523], 0.18, 0.1, 0.02, "triangle");
  },
  blast3: () => {
    noise(0.44, 0.34, 2200, { sweep: 0.12, q: 0.8, verb: 0.85, noiseType: "pink" });
    boom(110, 0.5, 0.32);
    tone(70, 0.55, "triangle", 0.26, -30, 0.01, { sub: true, cutoff: 300 });
    stab([262, 392, 523], 0.34, 0.12, 0.04, "sawtooth");
    impact(0.3, 1.2);
  },
  /** death-side trigger for onKill skills */
  onKill: () => {
    tone(520, 0.12, "triangle", 0.12, -260, 0, { verb: 0.4 });
    noise(0.12, 0.1, 2600, { type: "bandpass", q: 3, sweep: 0.4 });
  },
  superbolt: () => {
    noise(0.4, 0.3, 3000, { type: "highpass", q: 1.2, verb: 0.9 });
    tone(140, 0.5, "sine", 0.26, -70, 0, { sub: true, verb: 0.5 });
    boom(120, 0.5, 0.2, 0, 3);
    stab([700, 1050, 1400], 0.3, 0.12, 0.02, "triangle");
  },
  explosion: () => {
    noise(0.36, 0.32, 2200, { sweep: 0.1, q: 0.8, verb: 0.8, noiseType: "pink" });
    boom(140, 0.42, 0.3);
    tone(70, 0.5, "triangle", 0.24, -30, 0.01, { sub: true, cutoff: 300 });
  },
  freeze: () => {
    tone(2100, 0.18, "sine", 0.14, -1100, 0, { verb: 0.7 });
    clang(2600, 0.22, 0.06, 0.02, 0.8);
    noise(0.2, 0.1, 6000, { type: "highpass", sweep: 0.3, verb: 0.6 });
  },
  stun: () => {
    tone(560, 0.2, "square", 0.14, 340, 0, { q: 5 });
    tone(280, 0.3, "sine", 0.12, -60, 0, { sub: true });
  },
  crit: () => {
    if (performance.now() - lastShot < 45) return;
    lastShot = performance.now();
    fm(1900, 2.7, 2.6, 0.1, 0.14);
    noise(0.07, 0.12, 5200, { type: "highpass" });
  },
  critBig: () => {
    if (performance.now() - lastShot < 70) return;
    lastShot = performance.now();
    fm(2400, 3.1, 3.4, 0.16, 0.2);
    clang(2200, 0.18, 0.1, 0, 0.6);
    tone(760, 0.24, "sawtooth", 0.2, -420, 0.01, { q: 6, detune: 0.01 });
    impact(0.26, 1.1);
  },
  meteor: () => {
    riser(0.75, 0.12, 900, 90);
    noise(0.75, 0.1, 600, { sweep: 0.4, verb: 0.6, noiseType: "brown" });
  },
  hurt: () => {
    noise(0.24, 0.26, 500, { sweep: 0.3, verb: 0.5, noiseType: "pink" });
    tone(200, 0.26, "sawtooth", 0.2, -90, 0, { sub: true });
  },
  leak: () => {
    tone(200, 0.34, "sawtooth", 0.26, -120, 0, { sub: true, q: 5 });
    noise(0.34, 0.22, 700, { sweep: 0.25, verb: 0.5, noiseType: "pink" });
    stab([220, 262], 0.3, 0.1, 0.05, "square");
  },
  wave: () => {
    // a two-part horn call that says "here they come"
    stab([392, 523], 0.34, 0.18, 0, "square");
    stab([587, 784], 0.42, 0.16, 0.18, "square");
    noise(0.5, 0.1, 1400, { type: "bandpass", q: 1.5, sweep: 0.5, noiseType: "pink" });
  },
  boss: () => {
    impact(0.34, 1.5);
    tone(70, 1, "sawtooth", 0.3, 30, 0, { sub: true, detune: 0.006, verb: 0.8 });
    stab([146, 174, 220], 0.9, 0.14, 0.1, "sawtooth");
    noise(0.9, 0.16, 400, { sweep: 0.4, verb: 0.9, noiseType: "brown" });
  },
  win: () => {
    stab([523, 659, 784], 0.34, 0.18, 0, "triangle");
    stab([659, 784, 1046], 0.34, 0.17, 0.16, "triangle");
    stab([784, 1046, 1318], 0.7, 0.16, 0.32, "triangle");
    [1046, 1568].forEach((f, i) => clang(f, 0.6, 0.06, 0.34 + i * 0.1, 0.9));
    noise(0.9, 0.1, 6000, { type: "bandpass", q: 2, sweep: 0.3, verb: 0.9 });
  },
  lose: () => {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.4, "sawtooth", 0.2, -30, i * 0.16, { sub: true, q: 4, verb: 0.6 }));
    tone(98, 1, "sine", 0.24, -20, 0.5, { sub: true });
  },
  hero: () => {
    riser(0.5, 0.2, 200, 1800);
    impact(0.34, 1.3);
    stab([523, 784, 1046], 0.4, 0.16, 0.12, "triangle");
  },
} as const;

/**
 * Public sound API. Every name from the original Tone voice book is preserved:
 * gameplay calls `sfx.shoot(kind)`, `sfx.chestLoot(n)`, etc. and never needs to
 * know which engine handled it. External samples win; the synth is the safety
 * net for a missing clip or a browser without Web Audio.
 */
type SynthApi = typeof synthSfx;

const sfxApi = {} as SynthApi;
for (const name of Object.keys(synthSfx) as (keyof SynthApi)[]) {
  const synth = synthSfx[name] as (...args: unknown[]) => void;
  (sfxApi as Record<string, (...args: unknown[]) => void>)[name as string] = (...args: unknown[]) => {
    if (!enabled) return;
    const first = args[0] as string | number | undefined;
    if (playSample(name as string, first)) return;
    useSynth();
    synth(...args);
  };
}

export const sfx = sfxApi;
