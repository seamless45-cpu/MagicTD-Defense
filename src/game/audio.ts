/**
 * MagicTD's audio engine.
 *
 * Everything here is synthesised on the fly — no sample files ship with the
 * game — but the sounds are built the way a game sound designer would build
 * them rather than as bare beeps:
 *
 *  - a signal chain of sub-mixers instead of one gain node: an SFX bus with a
 *    compressor (so a wave of explosions never clips), a short plate-style
 *    reverb made from a feedback delay, and a separate bass lane
 *  - every voice runs an ADSR-shaped envelope through a resonant lowpass whose
 *    cutoff sweeps, then through a soft-clip waveshaper for analogue-ish grit
 *  - metallic hits are FM (a modulator bending the carrier), impacts are
 *    filtered noise bursts with a pitch-dropping sine underneath, and UI
 *    sounds are short, dry and pitched in the same two-tone family
 *
 * Every sfx.* entry keeps its original name, so gameplay code is unchanged.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
/** SFX bus: compressor -> master (keeps layered hits from clipping) */
let bus: GainNode | null = null;
let verbSend: GainNode | null = null;
/** bass lane, so sub-heavy hits can be shaped on their own */
let bassBus: GainNode | null = null;
let shaper: WaveShaperNode | null = null;

let enabled = true;
let lastShot = 0;
let volume = 0.7;

export function setSfx(on: boolean) {
  enabled = on;
  if (master && ctx) master.gain.value = on ? 0.42 * volume : 0;
}

/** master volume, 0..1 */
export function setVolume(v: number) {
  volume = Math.min(1, Math.max(0, v));
  if (master && ctx) master.gain.value = enabled ? 0.42 * volume : 0;
}

/** soft-clip curve: adds harmonics instead of hard edges */
function curve(amount: number) {
  const n = 1024;
  const out = new Float32Array(n);
  const k = amount * 24;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    out[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return out;
}

export function initAudio() {
  if (ctx) {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return;
  }
  try {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.42 * volume;
    master.connect(ctx.destination);

    // --- SFX chain: bus -> compressor -> soft clip -> master
    bus = ctx.createGain();
    bus.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 22;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    shaper = ctx.createWaveShaper();
    shaper.curve = curve(0.35);
    shaper.oversample = "2x";
    bus.connect(comp).connect(shaper).connect(master);

    // --- a tiny plate: feedback delay with a damped tail, fed by a send
    verbSend = ctx.createGain();
    verbSend.gain.value = 0.34;
    const delay = ctx.createDelay(0.5);
    delay.delayTime.value = 0.075;
    const fb = ctx.createGain();
    fb.gain.value = 0.34;
    const damp = ctx.createBiquadFilter();
    damp.type = "lowpass";
    damp.frequency.value = 2600;
    verbSend.connect(delay);
    delay.connect(damp).connect(fb).connect(delay);
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    damp.connect(wet).connect(master);

    // --- bass lane
    bassBus = ctx.createGain();
    bassBus.gain.value = 1;
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 220;
    bassBus.connect(low).connect(bus);
  } catch {
    ctx = null;
  }
}

const now = () => (ctx ? ctx.currentTime : 0);

/**
 * One synth voice.
 * @param freq   starting frequency
 * @param dur    length in seconds
 * @param type   oscillator shape
 * @param vol    peak gain
 * @param slide  frequency delta over `dur` (exponential sweep)
 * @param delay  seconds to wait before starting
 */
function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  vol: number,
  slide = 0,
  delay = 0,
  opts: { detune?: number; cutoff?: number; q?: number; attack?: number; verb?: number; sub?: boolean } = {}
) {
  if (!enabled || !ctx || !bus) return;
  try {
    const t0 = now() + delay;
    const attack = opts.attack ?? Math.min(0.012, dur * 0.25);
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);

    // a detuned twin fattens anything that isn't a pure UI blip
    let o2: OscillatorNode | null = null;
    if (opts.detune) {
      o2 = ctx.createOscillator();
      o2.type = type;
      o2.frequency.setValueAtTime(Math.max(20, freq * (1 + opts.detune)), t0);
      if (slide) o2.frequency.exponentialRampToValueAtTime(Math.max(20, freq * (1 + opts.detune) + slide), t0 + dur);
    }

    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    const cutoff = opts.cutoff ?? Math.min(14000, Math.max(600, freq * 4 + Math.abs(slide)));
    filt.frequency.setValueAtTime(cutoff, t0);
    filt.frequency.exponentialRampToValueAtTime(Math.max(300, cutoff * 0.45), t0 + dur);
    filt.Q.value = opts.q ?? 3;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0005, vol), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0004, t0 + dur);

    o.connect(filt);
    if (o2) o2.connect(filt);
    filt.connect(g).connect(opts.sub && bassBus ? bassBus : bus);
    if (opts.verb && verbSend) g.connect(verbSend);

    o.start(t0);
    o.stop(t0 + dur + 0.03);
    if (o2) {
      o2.start(t0);
      o2.stop(t0 + dur + 0.03);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Filtered noise — impacts, whooshes, sparks.
 * The buffer decays and the filter sweeps, which is what makes a noise burst
 * read as a "hit" rather than a hiss.
 */
function noise(
  dur: number,
  vol: number,
  freq = 800,
  opts: { delay?: number; q?: number; type?: BiquadFilterType; sweep?: number; verb?: number; sub?: boolean } = {}
) {
  if (!enabled || !ctx || !bus) return;
  try {
    const t0 = now() + (opts.delay ?? 0);
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    // shaped noise: a touch of pink so it isn't thin white hiss
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.04 * white) / 1.04;
      const decay = Math.pow(1 - i / len, 1.6);
      d[i] = (white * 0.7 + last * 3) * decay;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? "lowpass";
    f.frequency.setValueAtTime(freq, t0);
    if (opts.sweep) f.frequency.exponentialRampToValueAtTime(Math.max(80, freq * opts.sweep), t0 + dur);
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0004, t0 + dur);
    src.connect(f).connect(g).connect(opts.sub && bassBus ? bassBus : bus);
    if (opts.verb && verbSend) g.connect(verbSend);
    src.start(t0);
  } catch {
    /* ignore */
  }
}

/** FM clang: a modulator bending a carrier — metal, coins, chains */
function fm(carrier: number, ratio: number, index: number, dur: number, vol: number, delay = 0, verb = 0) {
  if (!enabled || !ctx || !bus) return;
  try {
    const t0 = now() + delay;
    const car = ctx.createOscillator();
    car.type = "sine";
    car.frequency.value = carrier;
    const mod = ctx.createOscillator();
    mod.type = "sine";
    mod.frequency.value = carrier * ratio;
    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(carrier * index, t0);
    modGain.gain.exponentialRampToValueAtTime(1, t0 + dur);
    mod.connect(modGain).connect(car.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0004, t0 + dur);
    car.connect(g).connect(bus);
    if (verb && verbSend) g.connect(verbSend);
    car.start(t0);
    mod.start(t0);
    car.stop(t0 + dur + 0.02);
    mod.stop(t0 + dur + 0.02);
  } catch {
    /* ignore */
  }
}

/** a chord/stab of short tones — fanfares, stingers */
function stab(freqs: number[], dur: number, vol: number, delay = 0, type: OscillatorType = "triangle") {
  freqs.forEach((f, i) => tone(f, dur, type, vol, 0, delay + i * 0.012, { detune: 0.004, verb: 0.5 }));
}

/** rising riser used before big moments */
function riser(dur: number, vol: number, from = 180, to = 1400, delay = 0) {
  tone(from, dur, "sawtooth", vol, to - from, delay, { q: 6, detune: 0.01, verb: 0.6 });
  noise(dur, vol * 0.7, 400, { delay, type: "bandpass", q: 4, sweep: 6, verb: 0.5 });
}

/** big impact: noise transient + pitch-dropping body + sub thump */
function impact(vol = 0.3, size = 1) {
  noise(0.22 * size, vol, 1800, { sweep: 0.12, q: 0.8, verb: 0.6 });
  tone(160 * size, 0.34 * size, "sine", vol * 0.9, -110 * size, 0, { sub: true, cutoff: 900 });
  tone(90 * size, 0.4 * size, "triangle", vol * 0.8, -50, 0.01, { sub: true, cutoff: 400, verb: 0.4 });
}

export const sfx = {
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
    fm(2100, 1.41, 2.2, 0.12, 0.12, 0.03, 0.4);
    tone(880, 0.06, "triangle", 0.12, 120);
  },
  gem: () => {
    // glassy: two shimmering sines with a long, wet tail
    tone(1180, 0.22, "sine", 0.16, 480, 0, { detune: 0.012, verb: 0.8, cutoff: 9000 });
    tone(1770, 0.3, "sine", 0.12, 320, 0.04, { verb: 0.9 });
    tone(2360, 0.34, "sine", 0.08, 200, 0.08, { verb: 0.9 });
  },
  token: () => {
    fm(900, 3.01, 4, 0.18, 0.18);
    tone(1400, 0.2, "sine", 0.12, 500, 0.05, { verb: 0.7 });
  },
  buy: () => {
    fm(1040, 2.01, 2.4, 0.14, 0.18);
    tone(1560, 0.16, "triangle", 0.14, 300, 0.05, { verb: 0.5 });
  },
  goldRain: () => {
    for (let i = 0; i < 9; i++) fm(1200 + i * 90, 2.01, 2.6, 0.16, 0.13, i * 0.055, 0.6);
    tone(300, 0.5, "triangle", 0.16, -60, 0, { sub: true });
  },
  gemRain: () => {
    [0, 3, 5, 7, 10].forEach((st, i) => tone(880 * Math.pow(2, st / 12), 0.4, "sine", 0.14, 120, i * 0.07, { verb: 0.9 }));
    noise(0.5, 0.1, 5200, { type: "highpass", sweep: 0.4, verb: 0.8 });
  },

  // ---------- chests ----------
  chest: () => {
    noise(0.3, 0.26, 900, { sweep: 0.2, verb: 0.6 });
    fm(520, 1.5, 2, 0.24, 0.2, 0.16);
    tone(780, 0.24, "triangle", 0.2, 340, 0.3, { verb: 0.7 });
  },
  chestCharge: () => {
    riser(0.85, 0.16, 140, 1200);
    tone(210, 0.85, "triangle", 0.09, 900, 0, { q: 8, verb: 0.5 });
  },
  chestCrack: () => {
    noise(0.12, 0.4, 2600, { type: "highpass", q: 0.7 });
    noise(0.3, 0.3, 420, { sweep: 0.25, verb: 0.7 });
    fm(150, 1.41, 3, 0.34, 0.3);
    tone(90, 0.4, "sawtooth", 0.24, -40, 0.02, { sub: true });
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
    tone(330, 0.26, "sine", 0.14, -40, 0, { sub: true });
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
    noise(0.32, 0.12, 4200, { type: "highpass", sweep: 0.3, verb: 0.8 });
  },
  ceremony: () => {
    stab([392, 523, 659, 784], 0.5, 0.16, 0, "triangle");
    stab([523, 659, 784, 1046], 0.55, 0.13, 0.22, "triangle");
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
        tone(120, 0.16, "sine", 0.16, -50, 0, { sub: true });
        noise(0.12, 0.14, 900, { sweep: 0.3 });
        break;
      case "gatling":
      case "laser":
        tone(1800, 0.03, "square", 0.06, -700, 0, { cutoff: 5000 });
        break;
      case "ice":
      case "frost":
        tone(2400, 0.06, "sine", 0.08, -900, 0, { verb: 0.5 });
        break;
      case "tesla":
      case "storm":
        noise(0.05, 0.1, 5200, { type: "highpass", q: 2 });
        tone(2600, 0.05, "sawtooth", 0.06, -1400, 0, { cutoff: 8000 });
        break;
      case "plasma":
      case "rail":
        tone(700, 0.14, "sawtooth", 0.14, 900, 0, { q: 6, verb: 0.4 });
        noise(0.1, 0.1, 3000, { type: "bandpass", q: 4, sweep: 3 });
        break;
      case "flame":
        noise(0.14, 0.1, 700, { type: "bandpass", q: 1.2, sweep: 2 });
        break;
      case "toxin":
        noise(0.16, 0.08, 500, { type: "bandpass", q: 2, sweep: 1.6 });
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
  superbolt: () => {
    noise(0.4, 0.3, 3000, { type: "highpass", q: 1.2, verb: 0.9 });
    tone(140, 0.5, "sine", 0.26, -70, 0, { sub: true });
    stab([700, 1050, 1400], 0.3, 0.12, 0.02, "triangle");
  },
  explosion: () => {
    noise(0.36, 0.32, 2200, { sweep: 0.1, q: 0.8, verb: 0.8 });
    tone(140, 0.42, "sine", 0.3, -90, 0, { sub: true });
    tone(70, 0.5, "triangle", 0.24, -30, 0.01, { sub: true, cutoff: 300 });
  },
  freeze: () => {
    tone(2100, 0.18, "sine", 0.14, -1100, 0, { verb: 0.7 });
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
    tone(760, 0.24, "sawtooth", 0.2, -420, 0.01, { q: 6, detune: 0.01 });
    impact(0.26, 1.1);
  },
  meteor: () => {
    riser(0.75, 0.12, 900, 90);
    noise(0.75, 0.1, 600, { sweep: 0.4, verb: 0.6 });
  },
  hurt: () => {
    noise(0.24, 0.26, 500, { sweep: 0.3, verb: 0.5 });
    tone(200, 0.26, "sawtooth", 0.2, -90, 0, { sub: true });
  },
  leak: () => {
    tone(200, 0.34, "sawtooth", 0.26, -120, 0, { sub: true, q: 5 });
    noise(0.34, 0.22, 700, { sweep: 0.25, verb: 0.5 });
    stab([220, 262], 0.3, 0.1, 0.05, "square");
  },
  wave: () => {
    // a two-part horn call that says "here they come"
    stab([392, 523], 0.34, 0.18, 0, "square");
    stab([587, 784], 0.42, 0.16, 0.18, "square");
    noise(0.5, 0.1, 1400, { type: "bandpass", q: 1.5, sweep: 0.5 });
  },
  boss: () => {
    impact(0.34, 1.5);
    tone(70, 1, "sawtooth", 0.3, 30, 0, { sub: true, detune: 0.006, verb: 0.8 });
    stab([146, 174, 220], 0.9, 0.14, 0.1, "sawtooth");
    noise(0.9, 0.16, 400, { sweep: 0.4, verb: 0.9 });
  },
  win: () => {
    stab([523, 659, 784], 0.34, 0.18, 0, "triangle");
    stab([659, 784, 1046], 0.34, 0.17, 0.16, "triangle");
    stab([784, 1046, 1318], 0.7, 0.16, 0.32, "triangle");
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
