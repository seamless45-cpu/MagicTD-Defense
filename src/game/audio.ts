// Tiny WebAudio synth for game feedback
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let lastShot = 0;

export function setSfx(on: boolean) {
  enabled = on;
}

export function initAudio() {
  if (ctx) {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return;
  }
  try {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  vol: number,
  slide = 0,
  delay = 0
) {
  if (!enabled || !ctx || !master) return;
  try {
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  } catch {
    /* ignore */
  }
}

function noise(dur: number, vol: number, freq = 800) {
  if (!enabled || !ctx || !master) return;
  try {
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t0);
  } catch {
    /* ignore */
  }
}

export const sfx = {
  click: () => tone(520, 0.06, "square", 0.25, -140),
  hover: () => tone(360, 0.04, "sine", 0.12),
  coin: () => {
    tone(880, 0.07, "square", 0.22);
    tone(1320, 0.1, "square", 0.2, 0, 0.06);
  },
  gem: () => {
    tone(990, 0.08, "sine", 0.25);
    tone(1480, 0.12, "sine", 0.22, 0, 0.07);
  },
  chest: () => {
    noise(0.25, 0.3, 500);
    tone(660, 0.12, "triangle", 0.25, 200, 0.15);
    tone(990, 0.16, "triangle", 0.25, 200, 0.28);
  },
  place: () => {
    tone(240, 0.08, "square", 0.3, 120);
    noise(0.08, 0.15, 900);
  },
  ascend: () => {
    tone(420, 0.09, "sawtooth", 0.22, 300);
    tone(630, 0.12, "sawtooth", 0.2, 400, 0.08);
  },
  summon: () => {
    tone(300, 0.1, "sine", 0.3, 500);
    tone(760, 0.14, "sine", 0.25, 300, 0.1);
  },
  merge: () => {
    tone(520, 0.07, "triangle", 0.3, 260);
    tone(780, 0.07, "triangle", 0.28, 260, 0.06);
    tone(1040, 0.12, "triangle", 0.26, 300, 0.12);
  },
  point: () => tone(1180, 0.05, "sine", 0.14, 200),
  hurt: () => noise(0.2, 0.3, 400),
  leak: () => {
    tone(220, 0.2, "sawtooth", 0.3, -120);
    noise(0.25, 0.25, 500);
  },
  wave: () => {
    tone(392, 0.12, "square", 0.2);
    tone(523, 0.12, "square", 0.2, 0, 0.1);
    tone(659, 0.2, "square", 0.22, 0, 0.2);
  },
  win: () => {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, "triangle", 0.3, 0, i * 0.12));
  },
  lose: () => {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, "sawtooth", 0.22, -30, i * 0.14));
  },
  hero: () => {
    noise(0.4, 0.35, 1400);
    tone(180, 0.35, "sawtooth", 0.3, 700);
  },
  awaken: () => {
    [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.15, "sine", 0.25, 0, i * 0.06));
    noise(0.3, 0.15, 2000);
  },
  shoot(kind: string) {
    const now = performance.now();
    if (now - lastShot < 35) return;
    lastShot = now;
    switch (kind) {
      case "arrow":
        tone(700, 0.04, "square", 0.1, -300);
        break;
      case "cannon":
        noise(0.12, 0.22, 700);
        tone(120, 0.1, "sine", 0.25, -60);
        break;
      case "ice":
        tone(1200, 0.06, "sine", 0.12, 300);
        break;
      case "tesla":
        tone(1500, 0.04, "sawtooth", 0.08, -900);
        break;
      case "gatling":
        tone(900, 0.025, "square", 0.07, -500);
        break;
      case "core":
        tone(300, 0.1, "sine", 0.14, 500);
        break;
      case "hellstorm":
        noise(0.06, 0.12, 1200);
        tone(240, 0.05, "sawtooth", 0.1, 100);
        break;
      case "icestorm":
        tone(1000, 0.05, "sine", 0.1, -400);
        break;
      default:
        tone(800, 0.03, "square", 0.07, -400);
    }
  },
  zap: () => {
    noise(0.09, 0.16, 3200);
    tone(2200, 0.06, "sawtooth", 0.09, -1800);
  },
  superbolt: () => {
    noise(0.2, 0.3, 3500);
    tone(1800, 0.16, "sawtooth", 0.2, -1500);
    tone(360, 0.2, "sawtooth", 0.16, -200, 0.04);
  },
  explosion: () => {
    noise(0.3, 0.35, 500);
    tone(90, 0.25, "sine", 0.3, -50);
  },
  freeze: () => tone(1600, 0.14, "sine", 0.14, -800),
  stun: () => {
    tone(200, 0.08, "square", 0.16);
    tone(150, 0.1, "square", 0.14, -40, 0.08);
  },
  error: () => tone(160, 0.14, "square", 0.2, -60),
  token: () => {
    tone(740, 0.1, "sine", 0.25);
    tone(1100, 0.14, "sine", 0.25, 0, 0.09);
    tone(1480, 0.2, "sine", 0.25, 0, 0.18);
  },
};
