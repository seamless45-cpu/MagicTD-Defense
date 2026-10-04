import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { SaveData } from "../game/save";
import { sfx } from "../game/audio";
import {
  TOWERS,
  TOWER_BY_ID,
  RARITY,
  ENEMY_TYPES,
  roundHp,
  HP_GROWTH,
  waveComp,
  PARTY_ROUNDS,
  BATTLE_ROUNDS,
  MAX_BATTLE_LEVEL,
  MAX_POINTS,
  POINT_STEP,
  POINT_DMG_STEP,
  ASC_DMG_MUL,
  towerDamage,
  SP_BASE_COST,
  SP_COST_STEP,
  TEAMMATES,
  CHAT_LINES,
  HERO_BY_ID,
  OVERDRIVE_ASPD,
  OVERDRIVE_DMG,
  OVERDRIVE_TIME,
  SLOW_VULN,
  RUN_SHOP,
  runShopCost,
  PARTY_PERK,
  RALLY_GAIN,
  RALLY_TIME,
  RALLY_ASPD,
  RALLY_DMG,
  RALLY_BLAST,
  SYNERGY_DMG,
  towerArt,
  type TowerDef,
  type GameMode,
  type HeroKind,
  type RunShopItem,
} from "../game/data";
import { TowerIcon, useToasts, Toasts, CoinIcon, HeroIcon } from "../components/ui";

// ---------- board geometry ----------
const W = 1000;
const H = 580;
const C = 90;
const COLS = 7;
const ROWS = 4;
const OX = (W - COLS * C) / 2;
const OY = (H - ROWS * C) / 2;

const WPTS: [number, number][] = [
  [-0.7, 0],
  [0, 0],
  [0, 3],
  [6, 3],
  [6, 0],
  [6, -0.7],
];

/** how far a tower can reach */
const RANGE = 236;

const cellCenter = (c: number, r: number) => ({ x: OX + (c + 0.5) * C, y: OY + (r + 0.5) * C });
const isPathCell = (c: number, r: number) => c === 0 || c === 6 || r === 3;

/** Client coords -> canvas world coords, safe against a zero-sized layout box. */
function canvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const w = rect.width || W;
  const h = rect.height || H;
  const x = ((clientX - rect.left) / w) * W;
  const y = ((clientY - rect.top) / h) * H;
  return {
    x: Number.isFinite(x) ? x : -1,
    y: Number.isFinite(y) ? y : -1,
  };
}

const WPX = WPTS.map(([c, r]) => cellCenter(c, r));
interface Seg { x: number; y: number; nx: number; ny: number; len: number; cum: number }
const SEGS: Seg[] = [];
{
  let cum = 0;
  for (let i = 0; i < WPX.length - 1; i++) {
    const a = WPX[i];
    const b = WPX[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    SEGS.push({ x: a.x, y: a.y, nx: b.x, ny: b.y, len, cum });
    cum += len;
  }
}
const PATH_LEN = SEGS.reduce((a, s) => a + s.len, 0);

function pathPos(d: number) {
  const dd = Math.max(0, Math.min(d, PATH_LEN - 0.01));
  for (const s of SEGS) {
    if (dd <= s.cum + s.len) {
      const t = (dd - s.cum) / s.len;
      return { x: s.x + (s.nx - s.x) * t, y: s.y + (s.ny - s.y) * t };
    }
  }
  return WPX[WPX.length - 1];
}

// ---------- entity types ----------
interface Enemy {
  id: number;
  d: number;
  hp: number;
  max: number;
  speed: number;
  type: number;
  frozen: number;
  stun: number;
  armor: number;
  lives: number;
  gold: number;
  spv: number;
  dead: boolean;
  wob: number;
  /** slow strength (0..0.9) while slowT > 0 */
  slow: number;
  slowT: number;
  /** remaining burn time and damage per second */
  burnT: number;
  burnDps: number;
}
interface BT {
  uid: number;
  def: TowerDef;
  menuLv: number;
  bLv: number;
  points: number;
  cell: { c: number; r: number } | null;
  cd: number;
  shots: number;
  angle: number;
  rapidT: number;
  rapidCool: number;
  streak: number;
  flash: number;
  lineupIdx: number; // -1 = teammate
  owner: string;
  atkMul: number;
}
interface Proj {
  x: number;
  y: number;
  tid: number;
  lx: number;
  ly: number;
  speed: number;
  dmg: number;
  kind: string;
  tw: BT;
  splash?: number;
  freezePct?: number;
  chain?: number;
  stunS?: number;
  push?: number;
  fireball?: number;
  icicle?: number;
  /** extra enemies this shot can skewer after the first hit */
  pierce?: number;
  /** enemies already hit, so a piercing shot never hits the same one twice */
  hitIds?: number[];
  /** bonus damage as a share of max HP */
  pctHp?: number;
  /** slow applied on hit */
  slow?: number;
  slowDur?: number;
  /** burn damage per second applied on hit */
  burnDps?: number;
  burnDur?: number;
  /** explosion radius on impact (m) */
  blast?: number;
  /** splash damage as a share of the shot's own damage (1 = full damage) */
  blastDmg?: number;
  /** this shot always crits (overcharged lances, fireballs) */
  alwaysCrit?: boolean;
  dead: boolean;
  age: number;
}
interface Bolt {
  x0: number; y0: number; x1: number; y1: number;
  n: number;
  off: Float32Array;
  lastJit: number;
  life: number;
  max: number;
  w: number;
  color: string;
}
interface Part { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; kind: "spark" | "ring" | "smoke" }
interface FT { x: number; y: number; txt: string; color: string; size: number; life: number; crit: boolean }

interface G {
  mode: GameMode;
  heroId: string;
  t: number;
  phase: "deploy" | "wave" | "inter" | "won" | "lost";
  phaseT: number;
  round: number;
  maxRounds: number;
  lives: number;
  /** Overdrive buff remaining time */
  odT: number;
  /** gold banked this run — spendable in the battle shop, paid out at the end */
  gold: number;
  /** party rally meter (0..1) and the time left on an active rally */
  rally: number;
  rallyT: number;
  /** countdown to the next teammate tower upgrade */
  mateUpT: number;
  /** party teammate perks folded into every shot */
  perks: { dmg: number; crit: number };
  /** extra attack speed bought in the run shop */
  bonusAspd: number;
  /** what has been bought in the run shop this battle */
  shopBought: Record<string, number>;
  /** fps counter for the performance HUD */
  fps: number;
  fpsT: number;
  frames: number;
  sp: number;
  spSpend: number;
  enemies: Enemy[];
  towers: BT[];
  projs: Proj[];
  bolts: Bolt[];
  parts: Part[];
  texts: FT[];
  spawnQ: { type: number; at: number }[];
  heroCd: number;
  kills: number;
  shake: number;
  redFlash: number;
  mateT: number;
  chatT: number;
  tokensAwarded: boolean;
  final: null | { won: boolean; gold: number; gems: number; tokens: number; frags: { id: string; n: number }[]; rounds: number };
}

let uidC = 1;
let eidC = 1;

/** a random buildable cell that is still empty (or null when the grid is full) */
function randFreeCell(g: Pick<G, "towers">) {
  const free: { c: number; r: number }[] = [];
  for (let c = 1; c <= 5; c++)
    for (let r = 0; r <= 2; r++)
      if (!g.towers.some((t) => t.cell && t.cell.c === c && t.cell.r === r)) free.push({ c, r });
  if (!free.length) return null;
  return free[Math.floor(Math.random() * free.length)];
}

function newGame(mode: GameMode, save: SaveData): G {
  const towers: BT[] = save.lineup
    .filter((id) => save.levels[id])
    .map((id, i) => ({
      uid: uidC++,
      def: TOWER_BY_ID[id],
      menuLv: save.levels[id],
      bLv: 1,
      points: 0,
      cell: null as { c: number; r: number } | null,
      cd: 0.4,
      shots: 0,
      angle: 0,
      rapidT: 0,
      rapidCool: 5,
      streak: 0,
      flash: 0,
      lineupIdx: i,
      owner: "you",
      atkMul: 1,
    }));
  const perks = {
    dmg: mode === "party" ? TEAMMATES.reduce((a, m) => (m.perkId === "dmg" ? a + PARTY_PERK.dmg : a), 0) : 0,
    crit: mode === "party" ? TEAMMATES.reduce((a, m) => (m.perkId === "crit" ? a + PARTY_PERK.crit : a), 0) : 0,
  };
  const g: G = {
    mode,
    heroId: HERO_BY_ID[save.hero] ? save.hero : "nova",
    t: 0,
    phase: "deploy",
    phaseT: mode === "endless" ? 6 : 7,
    round: 1,
    // endless has no final wave; maxRounds is only used for display
    maxRounds: mode === "party" ? PARTY_ROUNDS : mode === "battle" ? BATTLE_ROUNDS : 0,
    lives: (mode === "endless" ? 15 : 20) + (mode === "party" ? PARTY_PERK.life : 0),
    // small field-kit budget so the run shop is useful from wave 1
    gold: 120,
    rally: 0,
    rallyT: 0,
    mateUpT: 8,
    perks,
    bonusAspd: 0,
    shopBought: {},
    fps: 60,
    fpsT: 0,
    frames: 0,
    sp: 200,
    spSpend: 0,
    odT: 0,
    enemies: [],
    towers,
    projs: [],
    bolts: [],
    parts: [],
    texts: [],
    spawnQ: [],
    heroCd: 0,
    kills: 0,
    shake: 0,
    redFlash: 0,
    mateT: 6,
    chatT: 10,
    tokensAwarded: false,
    final: null,
  };
  // towers spawn straight onto the grid — the first three land before wave 1
  for (const t of towers.slice(0, 3)) {
    const cell = randFreeCell(g);
    if (!cell) break;
    t.cell = cell;
  }
  return g;
}

function ptColor(p: number) {
  if (p >= MAX_POINTS) return "#ff4fd8";
  if (p >= 7) return "#ff4d5e";
  if (p >= 5) return "#ff8c3d";
  if (p >= 3) return "#ffd23f";
  if (p >= 1) return "#3dff8e";
  return "#5a6b8a";
}

// optimized tall jagged bolts: offsets live in a Float32Array, re-jittered only on the 5ms tick
function randBolt(x0: number, y0: number, x1: number, y1: number, color: string, w: number, max: number, now: number): Bolt {
  const b: Bolt = {
    x0, y0, x1, y1, n: 8,
    off: new Float32Array(8),
    lastJit: 0,
    life: max,
    max,
    w,
    color,
  };
  jitBolt(b, now + 5);
  return b;
}
function jitBolt(b: Bolt, now: number) {
  if (now - b.lastJit < 5) return;
  b.lastJit = now;
  const dx = b.x1 - b.x0;
  const dy = b.y1 - b.y0;
  const L = Math.max(1, Math.hypot(dx, dy));
  const amp = Math.min(34, L * 0.14);
  for (let i = 0; i < b.n; i++) {
    if (i === 0 || i === b.n - 1) b.off[i] = 0;
    else b.off[i] = (Math.random() - 0.5) * 2 * amp * Math.sin((Math.PI * i) / (b.n - 1));
  }
}
function boltPts(b: Bolt, out: { x: number; y: number }[]) {
  out.length = 0;
  const L = Math.max(1, Math.hypot(b.x1 - b.x0, b.y1 - b.y0));
  const px = -(b.y1 - b.y0) / L;
  const py = (b.x1 - b.x0) / L;
  for (let i = 0; i < b.n; i++) {
    const t = i / (b.n - 1);
    out.push({
      x: b.x0 + (b.x1 - b.x0) * t + px * b.off[i],
      y: b.y0 + (b.y1 - b.y0) * t + py * b.off[i],
    });
  }
}

// module-scope bridges so the HUD can call engine actions
const heroRef: { current: () => void } = { current: () => {} };
const summonRef: { current: () => void } = { current: () => {} };
const ascendRef: { current: (uid: number) => void } = { current: () => {} };
const rallyRef: { current: () => void } = { current: () => {} };
const shopRef: { current: (item: RunShopItem) => void } = { current: () => {} };

// ---------- component ----------
export default function Battle({
  mode,
  save,
  mutate,
  onExit,
}: {
  mode: GameMode;
  save: SaveData;
  mutate: (fn: (s: SaveData) => void) => void;
  onExit: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gRef = useRef<G | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  const mutateRef = useRef(mutate);
  mutateRef.current = mutate;

  const [, setTick] = useState(0);
  const { toasts, push } = useToasts();
  const [ascentArmed, setAscentArmed] = useState(false);
  const [ascentDrag, setAscentDrag] = useState<{ x: number; y: number } | null>(null);
  const [ascentHover, setAscentHover] = useState(-1);
  const [shopOpen, setShopOpen] = useState(false);
  const [pulses, setPulses] = useState<{ id: number; x: number; y: number; dx: number; dy: number }[]>([]);
  const [slotFlash, setSlotFlash] = useState<number>(-1);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pulseId = useRef(0);
  const dragRef = useRef<{ kind: "lineup" | "field"; uid: number; x: number; y: number; moved: boolean } | null>(null);

  const pushPulse = useCallback((from: number, to: number) => {
    const a = slotRefs.current[from];
    const b = slotRefs.current[to];
    if (!a || !b) return;
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    const id = ++pulseId.current;
    setPulses((p) => [
      ...p.slice(-4),
      { id, x: ra.left + ra.width / 2, y: ra.top + ra.height / 2, dx: rb.left + rb.width / 2 - (ra.left + ra.width / 2), dy: rb.top + rb.height / 2 - (ra.top + ra.height / 2) },
    ]);
    setTimeout(() => setPulses((p) => p.filter((q) => q.id !== id)), 480);
    setSlotFlash(to);
    setTimeout(() => setSlotFlash((s) => (s === to ? -1 : s)), 420);
  }, []);
  const pulseRef = useRef(pushPulse);
  pulseRef.current = pushPulse;

  const toastRef = useRef(push);
  toastRef.current = push;

  // ---------- engine ----------
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const wrap = canvas.parentElement as HTMLElement;
    const fit = () => {
      const rw = wrap.clientWidth || 1;
      const rh = wrap.clientHeight || 1;
      const s = Math.max(0.1, Math.min(rw / W, rh / H));
      canvas.style.width = `${Math.floor(W * s)}px`;
      canvas.style.height = `${Math.floor(H * s)}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    const g = newGame(mode, saveRef.current);
    gRef.current = g;
    let raf = 0;
    let last = performance.now();
    let lastHud = 0;
    let boltCache: { x: number; y: number }[] = [];

    const fxOn = () => saveRef.current.fx;
    /** screen shake that honours the Screen Shake setting */
    const fxShake = (n: number) => (saveRef.current.shakeFx ? Math.min(14, g.shake + n) : g.shake);

    const addText = (x: number, y: number, txt: string, color: string, size: number, crit: boolean) => {
      if (g.texts.length > 50) g.texts.splice(0, g.texts.length - 50);
      g.texts.push({ x, y, txt, color, size, life: 0.9, crit });
    };
    const burst = (x: number, y: number, color: string, n: number, spd = 160) => {
      if (!fxOn()) n = Math.min(n, 4);
      for (let i = 0; i < n; i++) {
        if (g.parts.length > 380) g.parts.shift();
        const a = Math.random() * Math.PI * 2;
        const v = spd * (0.3 + Math.random() * 0.9);
        g.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.5 + Math.random() * 0.4, max: 0.9, size: 2 + Math.random() * 3, color, kind: "spark" });
      }
    };
    const ring = (x: number, y: number, color: string, size: number) => {
      if (g.parts.length > 380) g.parts.shift();
      g.parts.push({ x, y, vx: 0, vy: 0, life: 0.45, max: 0.45, size, color, kind: "ring" });
    };

    const spCost = () => SP_BASE_COST + SP_COST_STEP * g.spSpend;

    const startWave = () => {
      g.phase = "wave";
      g.phaseT = 999;
      g.spawnQ = waveComp(g.round).map((type, i) => ({ type, at: g.t + 0.8 + i * 0.72 + Math.random() * 0.25 }));
      sfx.wave();
    };

    const endGame = (won: boolean) => {
      if (g.final) return;
      g.phase = won ? "won" : "lost";
      const rounds = won ? g.maxRounds : Math.max(0, g.round - 1);
      const frags: { id: string; n: number }[] = [];
      // endless runs pay out on how deep you got
      const nf = mode === "endless" ? Math.min(12, 1 + Math.floor(rounds / 3)) : won ? (mode === "party" ? 4 : 3) : 1;
      for (let i = 0; i < nf; i++) {
        const id = TOWERS[Math.floor(Math.random() * TOWERS.length)].id;
        const e2 = frags.find((f) => f.id === id);
        if (e2) e2.n++;
        else frags.push({ id, n: 1 });
      }
      const endlessGold = 60 + 45 * rounds + 12 * rounds * rounds;
      const endlessGems = Math.floor(rounds / 3);
      const endlessTokens = Math.floor(rounds / 6);
      // whatever is left in the run wallet is paid out on top of the clear bonus
      const wallet = Math.floor(g.gold);
      const partyBonus = mode === "party" && won ? 3 : 0;
      g.final = {
        won,
        gold:
          (mode === "endless"
            ? endlessGold
            : won
              ? (mode === "party" ? 250 : 150) + 30 * g.maxRounds
              : 30 + 10 * rounds) + wallet,
        gems: mode === "endless" ? endlessGems : won ? (mode === "party" ? 4 : 2) : 0,
        tokens: mode === "endless" ? endlessTokens : won && mode === "party" ? 2 + partyBonus : 0,
        frags,
        rounds,
      };
      if (won) sfx.win();
      else sfx.lose();
    };

    const killReward = (e: Enemy) => {
      e.dead = true;
      g.kills++;
      g.sp += e.spv;
      g.gold += e.gold;
      if (g.mode === "party" && g.rally < 1) g.rally = Math.min(1, g.rally + RALLY_GAIN);
      const p = pathPos(e.d);
      burst(p.x, p.y, ENEMY_TYPES[e.type].color, 14, 200);
      ring(p.x, p.y, ENEMY_TYPES[e.type].color, 26);
    };

    const dealDamage = (e: Enemy, raw: number, opt: { alwaysCrit?: boolean; tw?: BT; color?: string }) => {
      if (e.dead) return;
      let crit = opt.alwaysCrit ?? false;
      if (!crit) {
        // base 10% crit plus the party crit perk (Mira)
        const cc = 0.1 + g.perks.crit;
        crit = Math.random() < cc;
      }
      // note: tower/aura multipliers are already folded into `raw` by the caller
      let dmg = raw * (1 - e.armor);
      if (e.slowT > 0) dmg *= 1 + SLOW_VULN; // chilled enemies shatter easier
      if (opt.tw?.def.id === "hellstorm") {
        const tier = saveRef.current.awn["hellstorm"]?.[0] || 0;
        if (tier > 0) {
          const cap = opt.tw.def.awk1!.mult2![tier - 1];
          dmg *= 1 + Math.min(cap, opt.tw.streak) * 0.01;
          if (crit) dmg *= 1 + opt.tw.def.awk1!.mult[tier - 1];
        }
      }
      if (opt.tw?.def.killStack) {
        // Dragon's Maw: every kill stokes the fire, capped by the awakening tier
        const tier = saveRef.current.awn["dragon"]?.[1] || 0;
        const cap = tier > 0 ? opt.tw.def.awk2!.mult[tier - 1] : 0;
        dmg *= 1 + Math.min(cap, opt.tw.streak) * opt.tw.def.killStack;
      }
      if (crit) dmg *= 1.6;
      e.hp -= dmg;
      const p = pathPos(e.d);
      if (saveRef.current.dmgNums) {
        addText(p.x + (Math.random() - 0.5) * 18, p.y - 22, String(Math.round(dmg)), crit ? "#ffb324" : "#ffffff", crit ? 21 : 15, crit);
        if (crit) addText(p.x, p.y - 44, "CRIT", "#ff8c3d", 11, true);
      }
      burst(p.x, p.y, opt.color || "#ffcf4d", crit ? 8 : 4);
      if (e.hp <= 0) {
        if (opt.tw && (opt.tw.def.id === "hellstorm" || opt.tw.def.killStack)) opt.tw.streak++;
        killReward(e);
      }
    };

    const onPlaced = (t: BT, c: number, r: number) => {
      t.cell = { c, r };
      const p = cellCenter(c, r);
      sfx.place();
      ring(p.x, p.y, RARITY[t.def.rarity].color, 40);
      burst(p.x, p.y, RARITY[t.def.rarity].color, 10);
      const tier = saveRef.current.awn["hellstorm"]?.[0] || 0;
      if (t.def.id === "hellstorm" && tier > 0) {
        t.streak = 20 + 10 * tier;
        addText(p.x, p.y - 30, "SCORCHING HOT", "#ff7a3d", 13, true);
      }
    };

    const strikeLightning = (t: BT) => {
      const now = performance.now();
      const tier1 = saveRef.current.awn["lightning"]?.[0] || 0;
      const tier2 = saveRef.current.awn["lightning"]?.[1] || 0;
      const dmgBase = towerDamage(t.def, t.menuLv, t.bLv, t.points, t.atkMul) * 1.12 * (g.odT > 0 ? 1 + OVERDRIVE_DMG : 1);
      const p = cellCenter(t.cell!.c, t.cell!.r);
      const topY = p.y - 96; // tall bolts start high above the tower
      const targets = g.enemies.filter((e) => !e.dead);
      const shown = targets.slice(0, 10);
      let superbolt = false;
      if (tier1 > 0 && Math.random() < t.def.awk1!.chance[tier1 - 1]) superbolt = true;
      shown.forEach((e) => {
        const ep = pathPos(e.d);
        if (g.bolts.length < 36) g.bolts.push(randBolt(p.x, topY, ep.x, ep.y, superbolt ? "#fff2b0" : "#ffe86b", superbolt ? 4 : 2.4, 0.28, now));
        dealDamage(e, dmgBase, { tw: t, color: "#ffe86b" });
      });
      if (targets.length > 10) targets.slice(10).forEach((e) => dealDamage(e, dmgBase, { tw: t, color: "#ffe86b" }));
      if (superbolt && shown.length > 0) {
        const extra = t.def.awk1!.mult[tier1 - 1];
        const big = shown[Math.floor(Math.random() * shown.length)];
        const ep = pathPos(big.d);
        if (g.bolts.length < 36) g.bolts.push(randBolt(p.x, topY, ep.x, ep.y, "#ffffff", 6, 0.42, now));
        dealDamage(big, dmgBase * (1 + extra), { alwaysCrit: true, tw: t, color: "#ffffff" });
        addText(ep.x, ep.y - 50, "SUPERBOLT", "#ffffff", 15, true);
        sfx.superbolt();
      }
      if (tier2 > 0 && Math.random() < t.def.awk2!.chance[tier2 - 1] && shown.length > 0) {
        const lo = t.def.awk2!.mult[tier2 - 1];
        const hi = t.def.awk2!.mult2![tier2 - 1];
        const k = lo + Math.floor(Math.random() * (hi - lo + 1));
        for (let i = 0; i < k; i++) {
          const e = shown[Math.floor(Math.random() * shown.length)];
          const ep = pathPos(e.d);
          if (g.bolts.length < 36) g.bolts.push(randBolt(p.x, topY, ep.x, ep.y, "#9ff3ff", 3.4, 0.34, now));
          dealDamage(e, dmgBase * 0.8, { tw: t, color: "#9ff3ff" });
        }
      }
      sfx.zap();
      g.shake = fxShake(2);
    };

    /** party synergy: standing next to a teammate's tower hits 20% harder */
    const synergy = (t: BT) => {
      if (g.mode !== "party" || !t.cell) return 0;
      const near = g.towers.some(
        (o) =>
          o.uid !== t.uid &&
          o.owner !== "you" &&
          o.cell &&
          Math.abs(o.cell.c - t.cell!.c) + Math.abs(o.cell.r - t.cell!.r) === 1
      );
      return near ? SYNERGY_DMG : 0;
    };

    /** every global multiplier a shot picks up */
    const globalMul = (t: BT) =>
      (g.odT > 0 ? 1 + OVERDRIVE_DMG : 1) *
      (g.rallyT > 0 ? 1 + RALLY_DMG : 1) *
      (1 + g.perks.dmg + synergy(t));

    /** kill-stack towers (Dragon's Maw) build damage with every kill they land */
    const killStackMul = (t: BT) => {
      if (!t.def.killStack) return 1;
      const tier = saveRef.current.awn[t.def.id]?.[1] || 0;
      const cap = tier > 0 ? t.def.awk2!.mult[tier - 1] : 0;
      return 1 + Math.min(cap, t.streak) * t.def.killStack;
    };

    /** damage growth from battle levels, points, auras and the party buffs */
    const towerPower = (t: BT) =>
      Math.pow(ASC_DMG_MUL, Math.max(0, t.bLv - 1)) *
      (1 + POINT_DMG_STEP * t.points) *
      t.atkMul *
      globalMul(t) *
      killStackMul(t);

    /** Solar flare (Sunforge): hits every enemy on the field at once. */
    const solarFlare = (t: BT) => {
      const dmg = towerDamage(t.def, t.menuLv, t.bLv, t.points, t.atkMul) * killStackMul(t) * globalMul(t);
      const p = cellCenter(t.cell!.c, t.cell!.r);
      const tier1 = saveRef.current.awn["sun"]?.[0] || 0;
      const tier2 = saveRef.current.awn["sun"]?.[1] || 0;
      const nova = tier1 > 0 && Math.random() < t.def.awk1!.chance[tier1 - 1];
      const power = nova ? 1 + t.def.awk1!.mult[tier1 - 1] : 1;
      ring(p.x, p.y, "#ffb324", 200);
      burst(p.x, p.y, "#ffd76a", 22, 260);
      g.shake = fxShake(6);
      sfx.explosion();
      const burn = (t.def.burnPct || 0) + (t.def.upBurnPct || 0) * (t.menuLv - 1);
      const extra = tier2 > 0 && Math.random() < t.def.awk2!.chance[tier2 - 1] ? t.def.awk2!.mult[tier2 - 1] : 0;
      g.enemies.forEach((e) => {
        if (e.dead) return;
        const ep = pathPos(e.d);
        ring(ep.x, ep.y, nova ? "#ffffff" : "#ffd76a", 40);
        dealDamage(e, dmg * power, { alwaysCrit: nova, tw: t, color: "#ffb324" });
        if (!e.dead) {
          e.burnDps = Math.max(e.burnDps, dmg * burn * (1 + extra));
          e.burnT = Math.max(e.burnT, t.def.burnDur || 4);
        }
      });
      if (nova) addText(p.x, p.y - 80, "SUPERNOVA", "#ffffff", 18, true);
    };

    const fireTower = (t: BT, target: Enemy) => {
      const p = cellCenter(t.cell!.c, t.cell!.r);
      const ep = pathPos(target.d);
      t.angle = Math.atan2(ep.y - p.y, ep.x - p.x);
      t.flash = 0.12;
      const dmg = towerDamage(t.def, t.menuLv, t.bLv, t.points, t.atkMul) * globalMul(t) * killStackMul(t);
      const upg = t.menuLv - 1;
      const asc = t.bLv - 1;
      const push = (proj: Partial<Proj>, at: { x: number; y: number } = ep, onto: Enemy = target) => {
        g.projs.push({ x: p.x, y: p.y, tid: onto.id, lx: at.x, ly: at.y, speed: 520, dmg, kind: t.def.id, tw: t, dead: false, age: 0, ...proj } as Proj);
      };
      switch (t.def.id) {
        case "arrow": push({ speed: 540 }); break;
        case "cannon": push({ speed: 380, splash: (t.def.splash || 0) + (t.def.upSplash || 0) * upg + (t.def.ascSplash || 0) * asc, kind: "cannon" }); break;
        case "ice": push({ speed: 320, freezePct: Math.min(1, (t.def.freeze || 0) + (t.def.upFreeze || 0) * upg + (t.def.ascFreeze || 0) * asc), kind: "ice" }); break;
        case "tesla": push({ speed: 640, chain: Math.round((t.def.chain || 0) + (t.def.upChain || 0) * upg + (t.def.ascChain || 0) * asc) }); break;
        case "gatling": push({ speed: 720 }); break;
        case "core": push({ speed: 300, stunS: (t.def.stun || 0) + (t.def.upStun || 0) * upg + (t.def.ascStun || 0) * asc, push: 96 }); break;
        case "swarm": {
          // one bolt per nearby enemy, up to `multi` targets
          const others = g.enemies
            .filter((e) => !e.dead)
            .sort((a, b) => b.d - a.d)
            .slice(0, t.def.multi || 3);
          const list = others.length ? others : [target];
          list.forEach((e) => {
            const tp = pathPos(e.d);
            push({ speed: 620, kind: "swarm" }, tp, e);
          });
          break;
        }
        case "chrono": {
          const slow = (t.def.slow || 0) + (t.def.upSlow || 0) * upg + (t.def.ascSlow || 0) * asc;
          push({ speed: 560, slow, slowDur: t.def.slowDur || 3, kind: "chrono" });
          break;
        }
        case "void": {
          const pctHp = (t.def.pctHp || 0) + (t.def.upPctHp || 0) * upg + (t.def.ascPctHp || 0) * asc;
          push({ speed: 300, pctHp, kind: "void" });
          break;
        }
        case "plasma": {
          const pierce = Math.round((t.def.pierce || 0) + (t.def.upPierce || 0) * upg + (t.def.ascPierce || 0) * asc);
          const tier1 = saveRef.current.awn["plasma"]?.[0] || 0;
          const over = tier1 > 0 && Math.random() < t.def.awk1!.chance[tier1 - 1];
          const mult = over ? 1 + t.def.awk1!.mult[tier1 - 1] : 1;
          const tier2 = saveRef.current.awn["plasma"]?.[1] || 0;
          const burnDps = tier2 > 0 ? (t.def.awk2!.mult[tier2 - 1] * dmg) / 4 : 0;
          push({
            speed: 760,
            pierce,
            hitIds: [],
            dmg: dmg * mult,
            burnDps,
            burnDur: burnDps > 0 ? 4 : 0,
            alwaysCrit: over,
            kind: "plasma",
          });
          if (over) addText(ep.x, ep.y - 40, "OVERCHARGE", "#c44dff", 13, true);
          break;
        }
        case "hellstorm": {
          const chance = Math.min(1, (t.def.fbChance || 0) + (t.def.upFb || 0) * upg + (t.def.ascFb || 0) * asc);
          if (Math.random() < chance) push({ speed: 340, fireball: 2.5 + 0.4 * upg + 0.3 * asc, kind: "fireball" });
          else push({});
          break;
        }
        case "icestorm": {
          const chance = Math.min(1, (t.def.icChance || 0) + (t.def.upIc || 0) * upg + (t.def.ascIc || 0) * asc);
          if (Math.random() < chance) {
            const pct = Math.min(0.95, (t.def.icPct || 0) + (t.def.upIcPct || 0) * upg + (t.def.ascIcPct || 0) * asc);
            push({ speed: 560, icicle: pct, kind: "icicle" });
          } else push({});
          break;
        }
        case "lightning":
          strikeLightning(t);
          return;
        case "sun":
          solarFlare(t);
          return;
        // ---------- 12-tower arsenal ----------
        case "sling":
          push({ speed: 700, kind: "arrow" });
          break;
        case "flame": {
          const pct = (t.def.burnPct || 0) + (t.def.upBurnPct || 0) * upg + (t.def.ascBurnPct || 0) * asc;
          push({ speed: 540, kind: "hellstorm", burnDps: dmg * pct, burnDur: t.def.burnDur || 4 });
          break;
        }
        case "spike": {
          const radius = (t.def.splash || 0) + (t.def.upSplash || 0) * upg + (t.def.ascSplash || 0) * asc;
          push({ speed: 900, kind: "void", blast: radius, blastDmg: 1 });
          break;
        }
        case "boomer": {
          const pierce = Math.round((t.def.pierce || 0) + (t.def.upPierce || 0) * upg + (t.def.ascPierce || 0) * asc);
          push({ speed: 520, pierce, hitIds: [], kind: "swarm" });
          break;
        }
        case "toxin": {
          const radius = (t.def.splash || 0) + (t.def.upSplash || 0) * upg + (t.def.ascSplash || 0) * asc;
          const pct = (t.def.burnPct || 0) + (t.def.upBurnPct || 0) * upg + (t.def.ascBurnPct || 0) * asc;
          push({ speed: 320, kind: "cannon", blast: radius, blastDmg: 0.7, burnDps: dmg * pct, burnDur: t.def.burnDur || 5 });
          break;
        }
        case "axe": {
          const pierce = Math.round((t.def.pierce || 0) + (t.def.upPierce || 0) * upg + (t.def.ascPierce || 0) * asc);
          const radius = (t.def.splash || 0) + (t.def.upSplash || 0) * upg + (t.def.ascSplash || 0) * asc;
          push({ speed: 480, pierce, hitIds: [], blast: radius, blastDmg: 0.6, kind: "plasma" });
          break;
        }
        case "frost": {
          const freezePct = Math.min(1, (t.def.freeze || 0) + (t.def.upFreeze || 0) * upg + (t.def.ascFreeze || 0) * asc);
          const slow = (t.def.slow || 0) + (t.def.upSlow || 0) * upg + (t.def.ascSlow || 0) * asc;
          push({ speed: 520, freezePct, slow, slowDur: t.def.slowDur || 3, kind: "ice" });
          break;
        }
        case "mortar": {
          const radius = (t.def.splash || 0) + (t.def.upSplash || 0) * upg + (t.def.ascSplash || 0) * asc;
          push({ speed: 260, blast: radius, blastDmg: 1, kind: "cannon" });
          break;
        }
        case "laser": {
          const chain = Math.round((t.def.chain || 0) + (t.def.upChain || 0) * upg + (t.def.ascChain || 0) * asc);
          push({ speed: 1400, chain, kind: "tesla" });
          break;
        }
        case "missile": {
          const radius = (t.def.splash || 0) + (t.def.upSplash || 0) * upg + (t.def.ascSplash || 0) * asc;
          const others = g.enemies
            .filter((e) => !e.dead)
            .sort((a, b) => b.d - a.d)
            .slice(0, t.def.multi || 4);
          const list = others.length ? others : [target];
          list.forEach((e) => {
            const tp = pathPos(e.d);
            push({ speed: 480, blast: radius, blastDmg: 0.7, kind: "cannon" }, tp, e);
          });
          break;
        }
        case "dragon": {
          const radius = (t.def.splash || 0) + (t.def.upSplash || 0) * upg + (t.def.ascSplash || 0) * asc;
          const pct = (t.def.burnPct || 0) + (t.def.upBurnPct || 0) * upg + (t.def.ascBurnPct || 0) * asc;
          const tier1 = saveRef.current.awn["dragon"]?.[0] || 0;
          const roar = tier1 > 0 && Math.random() < t.def.awk1!.chance[tier1 - 1];
          const mult = roar ? 1 + t.def.awk1!.mult[tier1 - 1] : 1;
          push({
            speed: 420,
            kind: "hellstorm",
            dmg: dmg * mult,
            blast: radius * (roar ? 1.35 : 1),
            blastDmg: 0.8,
            burnDps: dmg * pct,
            burnDur: t.def.burnDur || 4,
            alwaysCrit: roar,
          });
          if (roar) addText(ep.x, ep.y - 46, "INFERNO ROAR", "#ff5d3d", 15, true);
          break;
        }
      }
      sfx.shoot(t.def.id);
    };

    const hitProj = (pr: Proj) => {
      const target = g.enemies.find((e) => e.id === pr.tid && !e.dead);
      const pos = target ? pathPos(target.d) : { x: pr.lx, y: pr.ly };
      if (pr.fireball !== undefined) {
        const radius = pr.blast ?? 170;
        ring(pos.x, pos.y, "#ff7a3d", radius);
        burst(pos.x, pos.y, "#ffb324", 22, 260);
        sfx.explosion();
        g.shake = fxShake(5);
        g.enemies.forEach((e) => {
          if (e.dead) return;
          const ep = pathPos(e.d);
          if (Math.hypot(ep.x - pos.x, ep.y - pos.y) <= radius) dealDamage(e, pr.dmg * pr.fireball!, { alwaysCrit: true, tw: pr.tw, color: "#ff7a3d" });
        });
        return;
      }
      if (!target) return;
      // percent-of-max-HP shells (Void Cannon)
      if (pr.pctHp !== undefined) {
        dealDamage(target, target.max * pr.pctHp, { tw: pr.tw, color: "#c48cff" });
        ring(pos.x, pos.y, "#8a4dff", 46);
      }
      dealDamage(target, pr.dmg, { alwaysCrit: pr.alwaysCrit, tw: pr.tw });
      if (pr.slow) {
        const dur = pr.slowDur || 3;
        if (pr.slow >= target.slow || target.slowT <= 0) target.slow = Math.min(0.85, pr.slow);
        target.slowT = Math.max(target.slowT, dur);
        burst(pos.x, pos.y, "#7fe9ff", 6, 90);
      }
      if (pr.burnDps) {
        const wasBurning = target.burnT > 0;
        target.burnDps = Math.max(target.burnDps, pr.burnDps);
        target.burnT = Math.max(target.burnT, pr.burnDur || 4);
        if (!wasBurning) addText(pos.x, pos.y - 44, "BURN", "#ff7a3d", 12, false);
      }
      // piercing lances carry on to the next enemy in the file
      if (pr.pierce && pr.pierce > 0) {
        const hit = pr.hitIds || (pr.hitIds = []);
        if (!hit.includes(target.id)) hit.push(target.id);
        const next = g.enemies
          .filter((e) => !e.dead && !hit.includes(e.id) && e.d > target.d)
          .sort((a, b) => a.d - b.d)[0];
        if (next) {
          const np = pathPos(next.d);
          const now = performance.now();
          if (g.bolts.length < 36) g.bolts.push(randBolt(pos.x, pos.y, np.x, np.y, "#d9a6ff", 2.2, 0.16, now));
          pr.pierce -= 1;
          pr.tid = next.id;
          pr.lx = np.x;
          pr.ly = np.y;
          pr.x = pos.x;
          pr.y = pos.y;
          pr.age = 0;
          pr.dead = false; // the projectile is already in g.projs; just carry on
          return;
        }
      }
      const blastR = pr.blast ?? (pr.splash !== undefined ? 92 : 0);
      if (blastR > 0) {
        const blastBase =
          pr.blastDmg !== undefined
            ? pr.dmg * pr.blastDmg
            : (pr.splash || 0) * (pr.tw ? towerPower(pr.tw) : 1);
        if (blastBase > 0) {
          ring(pos.x, pos.y, "#ff9d4d", Math.min(280, blastR));
          sfx.explosion();
          g.shake = fxShake(2);
          g.enemies.forEach((e) => {
            if (e.dead || e.id === target.id) return;
            const ep = pathPos(e.d);
            if (Math.hypot(ep.x - pos.x, ep.y - pos.y) <= blastR)
              dealDamage(e, blastBase, { tw: pr.tw, color: "#ff9d4d" });
          });
        }
      }
      if (pr.freezePct !== undefined && Math.random() < pr.freezePct && target.frozen <= 0) {
        target.frozen = 3;
        sfx.freeze();
        burst(pos.x, pos.y, "#9fe8ff", 10, 90);
        addText(pos.x, pos.y - 40, "FROZEN", "#9fe8ff", 12, false);
      }
      if (pr.stunS !== undefined) {
        target.stun = Math.max(target.stun, pr.stunS);
        target.d = Math.max(0, target.d - (pr.push || 0));
        sfx.stun();
        ring(pos.x, pos.y, "#35e0ff", 44);
        addText(pos.x, pos.y - 40, `STUN ${pr.stunS.toFixed(1)}s`, "#35e0ff", 12, false);
      }
      if (pr.icicle !== undefined) {
        const cut = target.hp * pr.icicle;
        target.hp -= cut;
        burst(pos.x, pos.y, "#bfeaff", 14, 200);
        sfx.freeze();
        addText(pos.x, pos.y - 46, `${Math.round(cut)}`, "#bfeaff", 19, true);
        if (target.hp <= 0 && !target.dead) killReward(target);
        return;
      }
      if (pr.chain !== undefined) {
        let from = pos;
        const now = performance.now();
        const others = g.enemies.filter((e) => !e.dead && e.id !== target.id).sort((a, b) => b.d - a.d).slice(0, pr.chain);
        others.forEach((e) => {
          const ep = pathPos(e.d);
          if (g.bolts.length < 36) g.bolts.push(randBolt(from.x, from.y, ep.x, ep.y, "#7fe9ff", 1.6, 0.16, now));
          dealDamage(e, pr.dmg * 0.9, { tw: pr.tw, color: "#7fe9ff" });
          from = ep;
        });
        sfx.zap();
      }
    };

    const mergeTowers = (a: BT, b: BT) => {
      const cell = b.cell!;
      const p = cellCenter(cell.c, cell.r);
      const nd = TOWERS[Math.floor(Math.random() * TOWERS.length)];
      b.def = nd;
      b.points = Math.min(MAX_POINTS, a.points + 1);
      b.bLv = 1;
      b.menuLv = Math.max(1, saveRef.current.levels[nd.id] || 1);
      b.streak = 0;
      b.shots = 0;
      b.cd = 0.3;
      b.atkMul = 1;
      g.towers = g.towers.filter((t) => t.uid !== a.uid);
      sfx.merge();
      ring(p.x, p.y, "#ffffff", 60);
      burst(p.x, p.y, RARITY[nd.rarity].color, 24, 260);
      addText(p.x, p.y - 44, "MERGE!", "#ffffff", 18, true);
      toastRef.current(`Merged into ${nd.name} · ${b.points} pts`, RARITY[nd.rarity].color);
      const tier2 = saveRef.current.awn["hellstorm"]?.[1] || 0;
      if (nd.id === "hellstorm" && tier2 > 0) {
        const beams = nd.awk2!.mult[tier2 - 1];
        const partyMul = mode === "party" ? nd.awk2!.mult2![tier2 - 1] : 1;
        const targets = g.enemies.filter((e) => !e.dead).sort((x, y) => y.d - x.d).slice(0, beams);
        const now = performance.now();
        targets.forEach((e, i) => {
          const ep = pathPos(e.d);
          if (g.bolts.length < 36) g.bolts.push(randBolt(p.x, p.y, ep.x, ep.y, "#ff7a3d", Math.max(1.5, 3.5 - i * 0.05), 0.4, now));
          dealDamage(e, 800 * partyMul * towerPower(b), { alwaysCrit: mode === "party" ? Math.random() < 0.35 : false, tw: b, color: "#ff7a3d" });
        });
        sfx.explosion();
        g.shake = 14;
        addText(p.x, p.y - 64, "DEAFENING BLAZE", "#ff7a3d", 16, true);
      }
    };

    // ---------- run shop ----------
    const buyShopItem = (item: RunShopItem) => {
      const bought = g.shopBought[item.id] || 0;
      if (bought >= item.max) {
        sfx.error();
        toastRef.current(`${item.name} is sold out this run`, "#ff4d5e");
        return;
      }
      const price = runShopCost(item, bought);
      if (g.gold < price) {
        sfx.error();
        toastRef.current(`Need ${price} gold`, "#ff4d5e");
        return;
      }
      g.gold -= price;
      g.shopBought[item.id] = bought + 1;
      sfx.buy();
      switch (item.id) {
        case "dmg":
          g.perks.dmg += 0.15;
          break;
        case "aspd":
          g.bonusAspd = (g.bonusAspd || 0) + 0.12;
          break;
        case "sp":
          g.sp += 150;
          break;
        case "life":
          g.lives += 3;
          break;
        case "points": {
          const open = g.towers.filter((t) => t.points < MAX_POINTS);
          for (let i = 0; i < 2 && open.length; i++) {
            const t = open.splice(Math.floor(Math.random() * open.length), 1)[0];
            t.points = Math.min(MAX_POINTS, t.points + 1);
            if (t.cell) burst(cellCenter(t.cell.c, t.cell.r).x, cellCenter(t.cell.c, t.cell.r).y, ptColor(t.points), 10, 110);
          }
          break;
        }
        case "hero":
          g.heroCd = 0;
          break;
        case "ascend": {
          const pool = g.towers.filter((x) => x.bLv < MAX_BATTLE_LEVEL);
          const t = pool[Math.floor(Math.random() * pool.length)];
          if (t) {
            t.bLv++;
            if (t.cell) {
              const p = cellCenter(t.cell.c, t.cell.r);
              ring(p.x, p.y, "#35e0ff", 48);
              addText(p.x, p.y - 44, `ASCENT Lv${t.bLv}`, "#35e0ff", 14, true);
            }
          }
          break;
        }
        case "meteor": {
          sfx.explosion();
          g.shake = fxShake(9);
          ring(W / 2, H / 2, "#ff9d4d", 520);
          g.enemies.forEach((e) => {
            if (e.dead) return;
            const p = pathPos(e.d);
            ring(p.x, p.y, "#ffb324", 60);
            dealDamage(e, e.max * 0.25, { color: "#ff9d4d" });
          });
          break;
        }
      }
      toastRef.current(`${item.name} bought · ${price} gold`, "#ffcf4d");
    };
    shopRef.current = buyShopItem;

    const hero = () => {
      if (g.heroCd > 0 || g.final) return;
      const hero = HERO_BY_ID[g.heroId] || HERO_BY_ID.nova;
      g.heroCd = hero.cd;
      sfx.hero();
      g.shake = 16;
      const now = performance.now();
      const kind: HeroKind = hero.kind;

      if (kind === "overdrive") {
        // no damage: supercharge every tower for a while
        g.odT = OVERDRIVE_TIME;
        for (const t of g.towers) {
          if (!t.cell) continue;
          const p = cellCenter(t.cell.c, t.cell.r);
          ring(p.x, p.y, "#3dff8e", 52);
          addText(p.x, p.y - 44, "OVERDRIVE", "#3dff8e", 12, true);
        }
        addText(W / 2, H / 2 - 60, "OVERDRIVE!", "#3dff8e", 26, true);
        return;
      }

      if (kind === "freeze") {
        g.enemies.forEach((e) => {
          if (e.dead) return;
          e.frozen = Math.max(e.frozen, 4);
          e.slow = Math.max(e.slow, 0.5);
          e.slowT = Math.max(e.slowT, 8);
          const p = pathPos(e.d);
          ring(p.x, p.y, "#35e0ff", 46);
          burst(p.x, p.y, "#9fe8ff", 10, 120);
        });
        addText(W / 2, H / 2 - 60, "DEEP FREEZE", "#35e0ff", 26, true);
        sfx.freeze();
        return;
      }

      const dmg = (kind === "burn" ? 200 : 250) + 60 * g.round;
      g.enemies.forEach((e) => {
        if (e.dead) return;
        const p = pathPos(e.d);
        if (kind === "burn") {
          dealDamage(e, dmg, { color: hero.color });
          if (!e.dead) {
            e.burnDps = Math.max(e.burnDps, dmg * 0.35);
            e.burnT = Math.max(e.burnT, 8);
          }
        } else {
          e.stun = Math.max(e.stun, 1.2);
          dealDamage(e, dmg, { alwaysCrit: true, color: hero.color });
        }
        ring(p.x, p.y, hero.color, 50);
      });
      if (g.bolts.length < 36) g.bolts.push(randBolt(W / 2, -30, W / 2, H / 2, hero.color, 8, 0.5, now));
      addText(W / 2, H / 2 - 60, kind === "burn" ? "EMBERSTORM" : "NOVA BLAST", hero.color, 24, true);
    };
    heroRef.current = hero;

    const nextFreeSlot = () => {
      const used = new Set(g.towers.map((t) => t.lineupIdx).filter((i) => i >= 0));
      let idx = 0;
      while (used.has(idx) && idx < 6) idx++;
      return idx < 6 ? idx : -1;
    };

    /**
     * SUMMON spawns instantly: a lineup tower lands on a random free cell.
     * With the whole lineup already deployed it instead feeds a point to a random tower.
     */
    const summon = () => {
      const cost = spCost();
      if (g.sp < cost) { sfx.error(); toastRef.current("Not enough SP", "#ff4d5e"); return; }
      const idx = nextFreeSlot();
      const unlocked = Object.keys(saveRef.current.levels).filter((id) => saveRef.current.levels[id] > 0);
      if (unlocked.length === 0) return;
      if (idx >= 0) {
        const cell = randFreeCell(g);
        if (!cell) {
          sfx.error();
          toastRef.current("The grid is full", "#ff4d5e");
          return;
        }
        // cycle the lineup: whatever is on the field least often spawns next
        const counts = unlocked.map((id) => ({
          id,
          n: g.towers.filter((t) => t.def.id === id).length,
        }));
        const least = Math.min(...counts.map((c) => c.n));
        const pool = counts.filter((c) => c.n === least);
        const id = pool[Math.floor(Math.random() * pool.length)].id;
        const def = TOWER_BY_ID[id];
        g.towers.push({
          uid: uidC++, def, menuLv: saveRef.current.levels[id], bLv: 1, points: 0, cell,
          cd: 0.6, shots: 0, angle: 0, rapidT: 0, rapidCool: 5, streak: 0, flash: 0, lineupIdx: idx,
          owner: "you", atkMul: 1,
        });
        const p = cellCenter(cell.c, cell.r);
        ring(p.x, p.y, RARITY[def.rarity].color, 46);
        burst(p.x, p.y, RARITY[def.rarity].color, 12);
        sfx.summon();
        toastRef.current(`${def.name} deployed!`, RARITY[def.rarity].color);
        g.sp -= cost;
        g.spSpend++;
        return;
      }
      // grid full — bank the SP as a point on a random tower instead
      const open = g.towers.filter((t) => t.points < MAX_POINTS);
      if (!open.length) {
        sfx.error();
        toastRef.current("Every tower is maxed", "#ff4d5e");
        return;
      }
      const t = open[Math.floor(Math.random() * open.length)];
      t.points++;
      g.sp -= cost;
      g.spSpend++;
      sfx.point();
      if (t.cell) {
        const p = cellCenter(t.cell.c, t.cell.r);
        addText(p.x, p.y - 42, "+1 PT", ptColor(t.points), 14, true);
        burst(p.x, p.y, ptColor(t.points), 8, 90);
      }
      toastRef.current(`${t.def.name} gained a point (${t.points}/${MAX_POINTS})`, ptColor(t.points));
    };
    summonRef.current = summon;

    /** Party Rally: spend the meter to buff the whole squad and blast the field */
    const rally = () => {
      if (g.mode !== "party") return;
      if (g.rally < 1) {
        sfx.error();
        toastRef.current("Rally meter is not full yet", "#ff4d5e");
        return;
      }
      g.rally = 0;
      g.rallyT = RALLY_TIME;
      sfx.rally();
      ring(W / 2, H / 2, "#ff4fd8", 520);
      g.shake = fxShake(7);
      addText(W / 2, H / 2 - 70, "PARTY RALLY!", "#ff4fd8", 30, true);
      g.enemies.forEach((e) => {
        if (e.dead) return;
        const p = pathPos(e.d);
        ring(p.x, p.y, "#ff9be9", 40);
        dealDamage(e, e.max * RALLY_BLAST, { tw: undefined, color: "#ff4fd8" });
      });
      g.towers.forEach((t) => {
        if (t.cell) ring(cellCenter(t.cell.c, t.cell.r).x, cellCenter(t.cell.c, t.cell.r).y, "#ff4fd8", 52);
      });
      toastRef.current(`Rally! +${Math.round(RALLY_ASPD * 100)}% rate, +${Math.round(RALLY_DMG * 100)}% damage for ${RALLY_TIME}s`, "#ff4fd8");
    };
    rallyRef.current = rally;

    const ascend = (uid: number) => {
      const t = g.towers.find((x) => x.uid === uid);
      if (!t) return;
      if (t.bLv >= MAX_BATTLE_LEVEL) return;
      const cost = spCost();
      if (g.sp < cost) { sfx.error(); toastRef.current("Not enough SP", "#ff4d5e"); return; }
      g.sp -= cost;
      g.spSpend++;
      t.bLv++;
      sfx.ascend();
      if (t.cell) {
        const p = cellCenter(t.cell.c, t.cell.r);
        ring(p.x, p.y, "#35e0ff", 44);
        addText(p.x, p.y - 40, `ASCENT Lv${t.bLv}`, "#35e0ff", 13, true);
      }
      toastRef.current(`${t.def.name} ascended to Lv ${t.bLv}`, "#35e0ff");
    };
    ascendRef.current = ascend;

    const mateDeploy = () => {
      const empty: { c: number; r: number }[] = [];
      for (let c = 1; c <= 5; c++)
        for (let r = 0; r <= 2; r++)
          if (!isPathCell(c, r) && !g.towers.some((t) => t.cell && t.cell.c === c && t.cell.r === r)) empty.push({ c, r });
      if (empty.length < 2) return;
      const cell = empty[Math.floor(Math.random() * empty.length)];
      const unlocked = Object.keys(saveRef.current.levels).filter((id) => saveRef.current.levels[id] > 0);
      const pool = unlocked.length ? unlocked : TOWERS.map((t) => t.id);
      const id = pool[Math.floor(Math.random() * pool.length)];
      const m = TEAMMATES[Math.floor(Math.random() * TEAMMATES.length)];
      g.towers.push({
        uid: uidC++, def: TOWER_BY_ID[id], menuLv: saveRef.current.levels[id] || 3, bLv: 1 + (Math.random() < 0.5 ? 1 : 0),
        points: 2 + Math.floor(Math.random() * 3), cell, cd: 0.5, shots: 0, angle: 0, rapidT: 0, rapidCool: 5, streak: 0, flash: 0, lineupIdx: -1, owner: m.name, atkMul: 1,
      });
      const p = cellCenter(cell.c, cell.r);
      ring(p.x, p.y, m.color, 44);
      sfx.place();
      toastRef.current(`${m.name} deployed ${TOWER_BY_ID[id].name}`, m.color);
    };

    const updateFx = (dt: number) => {
      const now = performance.now();
      for (const b of g.bolts) {
        b.life -= dt;
        jitBolt(b, now);
      }
      g.bolts = g.bolts.filter((b) => b.life > 0);
      for (const p of g.parts) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === "spark") p.vy += 260 * dt;
      }
      g.parts = g.parts.filter((p) => p.life > 0);
      for (const t of g.texts) {
        t.life -= dt;
        t.y -= 34 * dt;
      }
      g.texts = g.texts.filter((t) => t.life > 0);
    };

    const update = (dt: number) => {
      g.t += dt;
      g.shake = Math.max(0, g.shake - dt * 30);
      g.redFlash = Math.max(0, g.redFlash - dt * 2);
      g.heroCd = Math.max(0, g.heroCd - dt);
      g.odT = Math.max(0, g.odT - dt);
      g.rallyT = Math.max(0, g.rallyT - dt);

      if (g.final) {
        updateFx(dt);
        return;
      }

      if (g.phase === "deploy") {
        g.phaseT -= dt;
        if (g.phaseT <= 0) startWave();
      } else if (g.phase === "inter") {
        g.phaseT -= dt;
        if (g.phaseT <= 0) {
          g.round++;
          startWave();
        }
      } else if (g.phase === "wave") {
        while (g.spawnQ.length && g.spawnQ[0].at <= g.t) {
          const s = g.spawnQ.shift()!;
          const et = ENEMY_TYPES[s.type];
          const hp = roundHp(g.round) * et.hpMul;
          g.enemies.push({
            id: eidC++, d: 0, hp, max: hp, speed: et.speed * (1 + g.round * 0.012), type: s.type,
            frozen: 0, stun: 0, armor: et.armor, lives: et.lives, gold: et.gold + Math.floor(g.round / 2),
            spv: 6 + g.round * 2 + (s.type === 4 ? 40 : 0), dead: false, wob: Math.random() * 7,
            slow: 0, slowT: 0, burnT: 0, burnDps: 0,
          });
        }
        if (!g.spawnQ.length && g.enemies.length === 0) {
          const bonus = 40 + 10 * g.round;
          g.sp += bonus;
          g.gold += Math.round(bonus / 2);
          if (g.mode !== "endless" && g.round >= g.maxRounds) {
            endGame(true);
          } else {
            g.phase = "inter";
            g.phaseT = saveRef.current.fastWaves ? 1.2 : mode === "endless" ? 3 : 3.5;
            sfx.coin();
            toastRef.current(
              `${mode === "endless" ? "Wave" : "Round"} ${g.round} cleared · +${bonus} SP`,
              "#3dff8e"
            );
            if (mode === "endless" && g.round % 5 === 0) {
              // every 5 waves an endless run hands out tokens
              mutateRef.current((s) => { s.tokens += 1; });
              sfx.token();
              toastRef.current(`Endless wave ${g.round}: +1 Magic Token`, "#ff4fd8");
            }
            if (mode === "party" && g.round === 10 && !g.tokensAwarded) {
              g.tokensAwarded = true;
              mutateRef.current((s) => { s.tokens += 3; });
              sfx.token();
              toastRef.current("Party round 10 complete: +3 Magic Tokens", "#ff4fd8");
            }
          }
        }
      }

      // enemies advance
      for (const e of g.enemies) {
        if (e.dead) continue;
        if (e.slowT > 0) e.slowT -= dt;
        if (e.burnT > 0) {
          e.burnT -= dt;
          e.hp -= e.burnDps * dt;
          if (Math.random() < dt * 6) {
            const bp = pathPos(e.d);
            if (g.parts.length < 380)
              g.parts.push({ x: bp.x, y: bp.y, vx: (Math.random() - 0.5) * 30, vy: -30 - Math.random() * 30, life: 0.4, max: 0.4, size: 3, color: "#ff7a3d", kind: "spark" });
          }
          if (e.hp <= 0 && !e.dead) killReward(e);
        }
        if (e.dead) continue;
        const slowMul = e.slowT > 0 ? 1 - e.slow : 1;
        if (e.frozen > 0) e.frozen -= dt;
        else if (e.stun > 0) e.stun -= dt;
        else e.d += e.speed * slowMul * dt;
        if (e.d >= PATH_LEN - 2) {
          e.dead = true;
          g.lives -= e.lives;
          g.redFlash = 1;
          g.shake = fxShake(8);
          sfx.leak();
        }
      }
      g.enemies = g.enemies.filter((e) => !e.dead);
      if (g.lives <= 0) {
        g.lives = 0;
        endGame(false);
      }

      // auras (S-Speaker / Power Plant)
      const aspdA = new Map<number, number>();
      const atkA = new Map<number, number>();
      const plantCount = g.towers.filter((t) => t.cell && t.def.id === "plant").length;
      const hpState = plantCount > 0 && [4, 6, 8, 12].includes(plantCount) ? 1.5 : 1;
      for (const t of g.towers) {
        if (!t.cell || !t.def.aura) continue;
        const upg = t.menuLv - 1;
        const asc = t.bLv - 1;
        let bonus = (t.def.aspd || 0) + (t.def.upAspd || 0) * upg + (t.def.ascAspd || 0) * asc;
        bonus *= 1 + 0.5 * t.points;
        if (t.def.id === "plant") bonus *= hpState;
        const atk = ((t.def.atkAura || 0) + (t.def.upAtkAura || 0) * upg + (t.def.ascAtkAura || 0) * asc) * (1 + 0.5 * t.points);
        const nbs = [
          [t.cell.c + 1, t.cell.r],
          [t.cell.c - 1, t.cell.r],
          [t.cell.c, t.cell.r + 1],
          [t.cell.c, t.cell.r - 1],
        ];
        for (const [c, r] of nbs) {
          const nb = g.towers.find((x) => x.cell && x.cell.c === c && x.cell.r === r);
          if (nb && nb.def.target === "front") {
            aspdA.set(nb.uid, (aspdA.get(nb.uid) || 0) + bonus);
            atkA.set(nb.uid, (atkA.get(nb.uid) || 0) + atk);
          }
        }
      }
      for (const t of g.towers) t.atkMul = 1 + (atkA.get(t.uid) || 0);

      // chrono time fields: chill everything inside the aura
      for (const t of g.towers) {
        if (!t.cell || t.def.id !== "chrono" || !t.def.slowAura) continue;
        const cp = cellCenter(t.cell.c, t.cell.r);
        const strength = Math.min(0.8, (t.def.slow || 0) + (t.def.upSlow || 0) * (t.menuLv - 1) + (t.def.ascSlow || 0) * (t.bLv - 1) + 0.02 * t.points);
        for (const e of g.enemies) {
          if (e.dead) continue;
          const ep = pathPos(e.d);
          if (Math.hypot(ep.x - cp.x, ep.y - cp.y) <= t.def.slowAura) {
            e.slow = Math.max(e.slow, strength);
            e.slowT = Math.max(e.slowT, 0.35);
          }
        }
      }

      // towers fire
      const lineupTowers = g.towers.filter((x) => x.lineupIdx >= 0).sort((a, b) => a.lineupIdx - b.lineupIdx);
      for (const t of g.towers) {
        if (!t.cell || t.def.target === "none") continue;
        const p = cellCenter(t.cell.c, t.cell.r);
        t.flash = Math.max(0, t.flash - dt);
        if (t.def.rapid) {
          t.rapidCool -= dt;
          if (t.rapidCool <= 0 && t.rapidT <= 0) {
            t.rapidT = 6;
            t.rapidCool = 5;
            addText(p.x, p.y - 42, "RAPID FIRE", "#c44dff", 12, true);
          }
          t.rapidT = Math.max(0, t.rapidT - dt);
        }
        let rate = Math.max(0.06, t.def.rate - t.def.upRate * (t.menuLv - 1) - t.def.ascRate * (t.bLv - 1));
        let aspdSelf = (t.def.aspd || 0) + (t.def.upAspd || 0) * (t.menuLv - 1) + (t.def.ascAspd || 0) * (t.bLv - 1);
        if (t.def.id === "lightning") aspdSelf = 0;
        rate /= 1 + aspdSelf + (aspdA.get(t.uid) || 0);
        rate /= 1 + POINT_STEP * t.points;
        rate /= 1 + g.bonusAspd; // run-shop attack speed
        if (g.odT > 0) rate /= 1 + OVERDRIVE_ASPD; // Overdrive hero buff
        if (g.rallyT > 0) rate /= 1 + RALLY_ASPD; // Party Rally
        if (t.def.rapid && t.rapidT > 0) rate *= 0.32;
        t.cd -= dt;
        if (t.cd <= 0) {
          let target: Enemy | undefined;
          if (t.def.target === "all") {
            target = g.enemies.find((e) => !e.dead);
          } else {
            let best = -1;
            for (const e of g.enemies) {
              if (e.dead) continue;
              const ep = pathPos(e.d);
              if (Math.hypot(ep.x - p.x, ep.y - p.y) <= RANGE && e.d > best) {
                best = e.d;
                target = e;
              }
            }
          }
          if (target) {
            fireTower(t, target);
            t.cd = rate;
            t.shots++;
            // point pulse to next lineup tower
            if (lineupTowers.length > 1) {
              const i = lineupTowers.findIndex((m) => m.uid === t.uid);
              if (i >= 0) {
                const next = lineupTowers[(i + 1) % lineupTowers.length];
                pulseRef.current(t.lineupIdx, next.lineupIdx);
                if (t.shots % 3 === 0 && next.points < MAX_POINTS) {
                  next.points++;
                  sfx.point();
                  if (next.cell) {
                    const np = cellCenter(next.cell.c, next.cell.r);
                    addText(np.x, np.y - 42, "+1 PT", ptColor(next.points), 13, true);
                    burst(np.x, np.y, ptColor(next.points), 6, 110);
                  }
                }
              }
            }
          } else {
            t.cd = 0.08;
          }
        }
      }

      // projectiles
      for (const pr of g.projs) {
        pr.age += dt;
        const target = g.enemies.find((e) => e.id === pr.tid && !e.dead);
        if (target) {
          const tp = pathPos(target.d);
          pr.lx = tp.x;
          pr.ly = tp.y;
        }
        const tx = target ? pr.lx : pr.lx;
        const dy = pr.ly - pr.y;
        const dx = tx - pr.x;
        const L = Math.hypot(dx, dy);
        const step = pr.speed * dt;
        if (L <= step + 8) {
          pr.dead = true;
          hitProj(pr);
        } else {
          pr.x += (dx / L) * step;
          pr.y += (dy / L) * step;
          if (pr.kind === "cannon" && Math.random() < 0.5 && g.parts.length < 380)
            g.parts.push({ x: pr.x, y: pr.y, vx: 0, vy: -20, life: 0.3, max: 0.3, size: 4, color: "#666", kind: "smoke" });
        }
        if (pr.age > 2) pr.dead = true;
      }
      g.projs = g.projs.filter((p) => !p.dead);
      g.enemies = g.enemies.filter((e) => !e.dead);

      updateFx(dt);

      if (mode === "party") {
        g.mateT -= dt;
        if (g.mateT <= 0) {
          g.mateT = 9 + Math.random() * 5;
          mateDeploy();
        }
        // teammates upgrade their own towers as the raid goes on
        g.mateUpT -= dt;
        if (g.mateUpT <= 0) {
          g.mateUpT = 7 + Math.random() * 6;
          const mine = g.towers.filter((t) => t.owner !== "you" && (t.bLv < MAX_BATTLE_LEVEL || t.points < MAX_POINTS));
          if (mine.length) {
            const t = mine[Math.floor(Math.random() * mine.length)];
            if (t.bLv < MAX_BATTLE_LEVEL && (t.points >= MAX_POINTS || Math.random() < 0.5)) t.bLv++;
            else t.points = Math.min(MAX_POINTS, t.points + 1);
            if (t.cell) {
              const p = cellCenter(t.cell.c, t.cell.r);
              ring(p.x, p.y, t.owner, 30);
              burst(p.x, p.y, t.owner, 6, 70);
            }
          }
        }
        g.chatT -= dt;
        if (g.chatT <= 0) {
          g.chatT = 13 + Math.random() * 8;
          const m = TEAMMATES[Math.floor(Math.random() * TEAMMATES.length)];
          toastRef.current(`${m.name}: ${CHAT_LINES[Math.floor(Math.random() * CHAT_LINES.length)]}`, m.color);
        }
      }

      // performance HUD
      g.frames++;
      g.fpsT += dt;
      if (g.fpsT >= 0.5) {
        g.fps = Math.round(g.frames / g.fpsT);
        g.frames = 0;
        g.fpsT = 0;
      }
    };

    // ---------- draw ----------
    const pathStroke = () => {
      ctx.beginPath();
      ctx.moveTo(WPX[0].x, WPX[0].y);
      for (let i = 1; i < WPX.length; i++) ctx.lineTo(WPX[i].x, WPX[i].y);
      ctx.stroke();
    };

    const drawPortal = (x: number, y: number, color: string, label: string) => {
      const t = performance.now() / 1000;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 1.6);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 22 + Math.sin(t * 5) * 3, 0.4, 2.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 15, 2.9, 4.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 9, 5.3, 7.1);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 0.8;
      ctx.font = "700 12px Rajdhani, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = color;
      ctx.fillText(label, x, y + (y < OY ? -34 : 44));
      ctx.globalAlpha = 1;
    };

    const drawTowerAt = (t: BT, x: number, y: number, now: number, ghost: boolean) => {
      const rc = RARITY[t.def.rarity];
      if (ghost) ctx.globalAlpha = 0.65;
      else if (dragRef.current && dragRef.current.uid === t.uid && dragRef.current.moved) ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#120c30";
      ctx.strokeStyle = rc.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(x - 34, y - 34, 68, 68, 12);
      ctx.fill();
      ctx.stroke();
      if (t.owner !== "you") {
        ctx.strokeStyle = t.owner;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x - 30, y - 30, 60, 60, 10);
        ctx.stroke();
      }
      if (t.def.aura) {
        const rr = 60 + Math.sin(now / 300) * 4;
        ctx.globalAlpha *= 0.9;
        ctx.fillStyle = t.def.id === "plant" ? "rgba(61,255,142,0.10)" : "rgba(53,224,255,0.10)";
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = t.def.id === "plant" ? "#3dff8e" : "#35e0ff";
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          const a = now / 700 + (i * Math.PI) / 2;
          ctx.beginPath();
          ctx.arc(x, y, rr, a, a + 0.9);
          ctx.stroke();
        }
        if (ghost) ctx.globalAlpha = 0.65;
      }
      ctx.save();
      ctx.translate(x, y);
      const rec = t.flash > 0 ? t.flash * 30 : 0;
      const a = t.angle;
      const acc = t.def.accent || rc.color;
      switch (towerArt(t.def)) {
        case "arrow":
          ctx.rotate(a);
          ctx.fillStyle = "#9fb4c7";
          ctx.fillRect(-6 - rec, -4, 26, 8);
          ctx.beginPath();
          ctx.moveTo(20 - rec, 0);
          ctx.lineTo(8 - rec, -9);
          ctx.lineTo(8 - rec, 9);
          ctx.fill();
          break;
        case "cannon":
          ctx.rotate(a);
          ctx.fillStyle = "#2d3748";
          ctx.fillRect(-8 - rec, -7, 34, 14);
          ctx.fillStyle = "#4a5568";
          ctx.beginPath();
          ctx.arc(0, 0, 17, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffb324";
          ctx.beginPath();
          ctx.arc(24 - rec, 0, 5, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "ice":
          ctx.rotate(now / 900);
          ctx.fillStyle = "#9fe8ff";
          ctx.strokeStyle = "#3fb6ff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-14, -14, 28, 28, 6);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = "#0e7490";
          ctx.beginPath();
          ctx.moveTo(-8, 0);
          ctx.lineTo(8, 0);
          ctx.moveTo(0, -8);
          ctx.lineTo(0, 8);
          ctx.stroke();
          break;
        case "speaker":
          ctx.fillStyle = "#3fb6ff";
          ctx.fillRect(-16, -10, 10, 20);
          ctx.fillStyle = "#123a5c";
          ctx.strokeStyle = "#3fb6ff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-6, -10);
          ctx.lineTo(10, -20);
          ctx.lineTo(10, 20);
          ctx.lineTo(-6, 10);
          ctx.fill();
          ctx.stroke();
          break;
        case "tesla":
          ctx.fillStyle = "#14263f";
          ctx.strokeStyle = "#3fb6ff";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 4, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-10, 0);
          ctx.lineTo(10, 0);
          ctx.moveTo(-9, 6);
          ctx.lineTo(9, 6);
          ctx.stroke();
          if (Math.random() < 0.2) {
            ctx.strokeStyle = "#9ff3ff";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(6 + Math.random() * 6, -20);
            ctx.stroke();
          }
          break;
        case "gatling":
          ctx.rotate(a);
          const spin = t.rapidT > 0 ? now / 30 : 0;
          for (let i = -1; i <= 1; i++) {
            ctx.fillStyle = t.rapidT > 0 ? "#e07bff" : "#c44dff";
            ctx.save();
            ctx.rotate(i * 0.12 + Math.sin(spin) * 0.05 * i);
            ctx.fillRect(-4 - rec, i * 7 - 2.5, 28, 5);
            ctx.restore();
          }
          ctx.fillStyle = "#3b2f52";
          ctx.beginPath();
          ctx.arc(-6, 0, 12, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "core": {
          const pl = 10 + Math.sin(now / 180) * 2.5;
          ctx.fillStyle = "#0c2d5c";
          ctx.strokeStyle = "#35e0ff";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#35e0ff";
          ctx.beginPath();
          ctx.arc(0, 0, pl * 0.55, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#bfeaff";
          ctx.lineWidth = 1.5;
          ctx.save();
          ctx.rotate(now / 600);
          ctx.beginPath();
          ctx.ellipse(0, 0, 22, 9, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          break;
        }
        case "lightning":
          ctx.fillStyle = "#ffb324";
          ctx.strokeStyle = "#8a5200";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-16, 6);
          ctx.lineTo(-12, -10);
          ctx.lineTo(-5, -2);
          ctx.lineTo(0, -16);
          ctx.lineTo(5, -2);
          ctx.lineTo(12, -10);
          ctx.lineTo(16, 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#fff2b0";
          ctx.beginPath();
          ctx.moveTo(2, -6);
          ctx.lineTo(-4, 6);
          ctx.lineTo(1, 6);
          ctx.lineTo(-1, 16);
          ctx.lineTo(6, 3);
          ctx.lineTo(2, 3);
          ctx.closePath();
          ctx.fill();
          break;
        case "hellstorm": {
          const fl = Math.sin(now / 90) * 3;
          ctx.fillStyle = "#ff7a3d";
          ctx.beginPath();
          ctx.moveTo(0, -18 - fl);
          ctx.quadraticCurveTo(14, -6, 10, 10);
          ctx.quadraticCurveTo(6, 18, 0, 18);
          ctx.quadraticCurveTo(-6, 18, -10, 10);
          ctx.quadraticCurveTo(-14, -6, 0, -18 - fl);
          ctx.fill();
          ctx.fillStyle = "#fff2b0";
          ctx.beginPath();
          ctx.moveTo(0, -6);
          ctx.quadraticCurveTo(7, 4, 0, 14);
          ctx.quadraticCurveTo(-7, 4, 0, -6);
          ctx.fill();
          break;
        }
        case "icestorm":
          ctx.fillStyle = "#bfeaff";
          ctx.strokeStyle = "#3fb6ff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -18);
          ctx.lineTo(11, -4);
          ctx.lineTo(0, 18);
          ctx.lineTo(-11, -4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = "#0e7490";
          ctx.beginPath();
          ctx.moveTo(0, -18);
          ctx.lineTo(0, 18);
          ctx.stroke();
          break;
        case "swarm": {
          ctx.fillStyle = "#1b1040";
          ctx.strokeStyle = "#3fb6ff";
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(0, 0, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          const spin = now / 260;
          for (let i = 0; i < 3; i++) {
            const a = spin + (i * Math.PI * 2) / 3;
            ctx.fillStyle = "#8fd8ff";
            ctx.beginPath();
            ctx.arc(Math.cos(a) * 19, Math.sin(a) * 19, 4.2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = "#c44dff";
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "chrono": {
          ctx.fillStyle = "#0d1f3a";
          ctx.strokeStyle = "#35e0ff";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = "#9ff3ff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -10);
          ctx.moveTo(0, 0);
          ctx.lineTo(7, 5);
          ctx.stroke();
          ctx.save();
          ctx.rotate(now / 1100);
          ctx.strokeStyle = "rgba(159,243,255,0.7)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 23, 0, Math.PI * 1.1);
          ctx.stroke();
          ctx.restore();
          break;
        }
        case "void": {
          const pulse = 12 + Math.sin(now / 200) * 2;
          ctx.fillStyle = "#000";
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#8a4dff";
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.fillStyle = "rgba(138,77,255,0.85)";
          ctx.beginPath();
          ctx.arc(0, 0, pulse * 0.45, 0, Math.PI * 2);
          ctx.fill();
          ctx.save();
          ctx.rotate(now / 700);
          ctx.strokeStyle = "rgba(196,140,255,0.8)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, 0, 22, 8, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          break;
        }
        case "plasma": {
          ctx.rotate(a);
          ctx.fillStyle = "#2a1a3f";
          ctx.strokeStyle = "#c44dff";
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.roundRect(-18, -8, 30, 16, 5);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = "#ffd9ff";
          ctx.lineWidth = 5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(8, 0);
          ctx.lineTo(30 - rec, 0);
          ctx.stroke();
          ctx.fillStyle = "#fff2b0";
          ctx.beginPath();
          ctx.arc(30 - rec, 0, 4.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "plant":
          ctx.fillStyle = "#153024";
          ctx.strokeStyle = "#3dff8e";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const px = Math.cos(ang) * 17;
            const py = Math.sin(ang) * 17;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#3dff8e";
          ctx.beginPath();
          ctx.arc(0, 0, 6 + Math.sin(now / 250) * 1.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        // ---------- 12-tower arsenal ----------
        case "sling":
          ctx.rotate(a);
          ctx.strokeStyle = acc;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(-4, 14);
          ctx.lineTo(-4 - rec * 0.4, -12);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-16, -8);
          ctx.lineTo(-4, 2);
          ctx.lineTo(8, -8);
          ctx.stroke();
          ctx.fillStyle = acc;
          ctx.beginPath();
          ctx.arc(-4 - rec * 0.4, -14, 5, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "flame":
          ctx.rotate(a);
          ctx.fillStyle = "#2b1f66";
          ctx.strokeStyle = acc;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(-14, -10, 24, 20, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = acc;
          ctx.beginPath();
          ctx.moveTo(10 - rec * 0.3, -8);
          ctx.lineTo(30 + rec, 0);
          ctx.lineTo(10 - rec * 0.3, 8);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha *= 0.55;
          ctx.beginPath();
          ctx.arc(14 + rec * 0.6, 0, 9 + Math.sin(now / 90) * 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "spike":
          ctx.fillStyle = "#2b1f66";
          ctx.strokeStyle = acc;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-18, 4, 36, 12, 4);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = acc;
          for (let i = 0; i < 4; i++) {
            const sx = -13 + i * 9;
            ctx.beginPath();
            ctx.moveTo(sx - 4, 6);
            ctx.lineTo(sx, -18 - (i % 2) * 5 - (t.flash > 0 ? 6 : 0));
            ctx.lineTo(sx + 4, 6);
            ctx.closePath();
            ctx.fill();
          }
          ctx.globalAlpha *= 0.5;
          ctx.strokeStyle = acc;
          ctx.beginPath();
          ctx.arc(0, 0, 26 + Math.sin(now / 220) * 3, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case "tube":
          ctx.rotate(a);
          ctx.fillStyle = "#2b1f66";
          ctx.strokeStyle = acc;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(-18, -13, 30, 26, 8);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = acc;
          ctx.lineWidth = 13;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(-2, 0);
          ctx.lineTo(22 - rec * 0.5, 0);
          ctx.stroke();
          ctx.strokeStyle = "#120c30";
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(22 - rec * 0.5, 0);
          ctx.stroke();
          ctx.fillStyle = acc;
          ctx.beginPath();
          ctx.arc(24 - rec * 0.5, 0, 5, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "beam":
          ctx.fillStyle = "#2b1f66";
          ctx.strokeStyle = acc;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(-18, 6, 36, 16, 6);
          ctx.fill();
          ctx.stroke();
          ctx.save();
          ctx.rotate(now / 700);
          ctx.strokeStyle = acc;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0.3, 2.4);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, 15, 3.4, 5.6);
          ctx.stroke();
          ctx.restore();
          ctx.fillStyle = t.flash > 0 ? "#ffffff" : acc;
          ctx.beginPath();
          ctx.arc(0, 0, 7 + rec * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha *= 0.5;
          ctx.beginPath();
          ctx.arc(0, 0, 12 + rec, 0, Math.PI * 2);
          ctx.fill();
          break;
        default:
          ctx.fillStyle = rc.color;
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.fill();
      }
      ctx.restore();

      // points ticks ring
      const pc = ptColor(t.points);
      for (let i = 0; i < MAX_POINTS; i++) {
        const ang = (i / MAX_POINTS) * Math.PI * 2 - Math.PI / 2;
        ctx.strokeStyle = i < t.points ? pc : "rgba(90,107,138,0.4)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 42, ang + 0.09, (i / MAX_POINTS) * Math.PI * 2 + Math.PI * 2 / MAX_POINTS - 0.09);
        ctx.stroke();
      }
      const isMax = t.points >= MAX_POINTS;
      const pulse = isMax ? 1 + Math.sin(now / 150) * 0.15 : 1;
      ctx.save();
      ctx.translate(x, y + 44);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = "rgba(8,5,26,0.9)";
      ctx.beginPath();
      ctx.roundRect(-19, -9, 38, 17, 6);
      ctx.fill();
      ctx.strokeStyle = pc;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = pc;
      ctx.font = `700 ${isMax ? 12 : 14}px Rajdhani, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(isMax ? "MAX" : String(t.points), 0, 5);
      ctx.restore();
      // battle level pips
      for (let i = 0; i < t.bLv; i++) {
        ctx.fillStyle = "#35e0ff";
        ctx.fillRect(x - 30 + i * 5, y - 40, 3, 3);
      }
      ctx.font = "700 11px Rajdhani, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(234,230,255,0.85)";
      ctx.fillText(`${t.def.name} · Lv${t.bLv}`, x, y - 46);
      ctx.globalAlpha = 1;
    };

    const drawEnemy = (e: Enemy, now: number) => {
      const p = pathPos(e.d);
      const et = ENEMY_TYPES[e.type];
      const w2 = Math.sin(now / 150 + e.wob) * 2;
      ctx.save();
      ctx.translate(p.x, p.y + w2);
      ctx.fillStyle = et.color;
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 2;
      if (e.type === 0) {
        ctx.beginPath();
        ctx.ellipse(0, 0, et.r, et.r * (0.85 + Math.sin(now / 120 + e.wob) * 0.12), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#0a3d1f";
        ctx.beginPath();
        ctx.arc(-4, -3, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(4, -3, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 1) {
        ctx.rotate((e.d / 40) % Math.PI);
        ctx.beginPath();
        ctx.moveTo(et.r + 4, 0);
        ctx.lineTo(-et.r, -et.r);
        ctx.lineTo(-et.r, et.r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (e.type === 2) {
        ctx.beginPath();
        ctx.roundRect(-et.r, -et.r, et.r * 2, et.r * 2, 6);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = "#dbe7ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, et.r + 4, -0.8, 0.8);
        ctx.stroke();
      } else if (e.type === 3) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const ang = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const px = Math.cos(ang) * et.r;
          const py = Math.sin(ang) * et.r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(0, -2, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 + now / 800;
          const rr = i % 2 === 0 ? et.r + 6 : et.r;
          const px = Math.cos(ang) * rr;
          const py = Math.sin(ang) * rr;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ffd0d0";
        ctx.font = "700 16px Rajdhani, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("W", 0, 5);
      }
      if (e.frozen > 0) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#9fe8ff";
        ctx.beginPath();
        ctx.arc(0, 0, et.r + 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const ang = (i / 3) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(ang) * 4, Math.sin(ang) * 4 - 6);
          ctx.lineTo(Math.cos(ang) * 10, Math.sin(ang) * 10 - 6);
          ctx.stroke();
        }
      }
      if (e.burnT > 0) {
        ctx.globalAlpha = 0.35 + Math.sin(now / 90 + e.wob) * 0.12;
        ctx.fillStyle = "#ff7a3d";
        ctx.beginPath();
        ctx.arc(0, -2, et.r + 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (e.slowT > 0 && e.frozen <= 0) {
        ctx.strokeStyle = "#7fe9ff";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, et.r + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (e.stun > 0 && e.frozen <= 0) {
        ctx.strokeStyle = "#ffd23f";
        ctx.lineWidth = 2;
        const sa = now / 120;
        ctx.beginPath();
        ctx.arc(0, -et.r - 12, 6, sa, sa + 1.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, -et.r - 12, 6, sa + Math.PI, sa + Math.PI + 1.2);
        ctx.stroke();
      }
      ctx.restore();
      const w3 = Math.max(26, et.r * 2);
      const hpPct = Math.max(0, e.hp / e.max);
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(p.x - w3 / 2, p.y - et.r - 14 + w2, w3, 5);
      ctx.fillStyle = hpPct > 0.5 ? "#3dff8e" : hpPct > 0.25 ? "#ffd23f" : "#ff4d5e";
      ctx.fillRect(p.x - w3 / 2, p.y - et.r - 14 + w2, w3 * hpPct, 5);
    };

    const drawProj = (pr: Proj) => {
      const ang = Math.atan2(pr.ly - pr.y, pr.lx - pr.x);
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.rotate(ang);
      switch (pr.kind) {
        case "arrow":
          ctx.strokeStyle = "#e8e2c8";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-10, 0);
          ctx.lineTo(10, 0);
          ctx.stroke();
          ctx.fillStyle = "#ffcf4d";
          ctx.beginPath();
          ctx.moveTo(14, 0);
          ctx.lineTo(6, -4);
          ctx.lineTo(6, 4);
          ctx.fill();
          break;
        case "cannon":
          ctx.fillStyle = "#2d3748";
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffb324";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          break;
        case "ice":
          ctx.rotate(0.5 + pr.age * 6);
          ctx.fillStyle = "#9fe8ff";
          ctx.strokeStyle = "#3fb6ff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-7, -7, 14, 14, 4);
          ctx.fill();
          ctx.stroke();
          break;
        case "swarm":
          ctx.fillStyle = "#3fb6ff";
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#c44dff";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(0, 0, 9, -0.7, 0.7);
          ctx.stroke();
          break;
        case "chrono":
          ctx.fillStyle = "rgba(53,224,255,0.85)";
          ctx.beginPath();
          ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#9ff3ff";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(0, 0, 11 + Math.sin(pr.age * 12) * 1.6, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case "void": {
          ctx.fillStyle = "#12042a";
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#c48cff";
          ctx.lineWidth = 2.2;
          ctx.stroke();
          ctx.fillStyle = "rgba(196,140,255,0.6)";
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "plasma": {
          const grad = ctx.createLinearGradient(-26, 0, 26, 0);
          grad.addColorStop(0, "rgba(196,77,255,0)");
          grad.addColorStop(0.5, "#e9c2ff");
          grad.addColorStop(1, "#fff2b0");
          ctx.strokeStyle = grad;
          ctx.lineWidth = 6;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(-26, 0);
          ctx.lineTo(22, 0);
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.moveTo(30, 0);
          ctx.lineTo(20, -5);
          ctx.lineTo(20, 5);
          ctx.fill();
          break;
        }
        case "tesla":
          ctx.strokeStyle = "#7fe9ff";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-6, 0);
          ctx.lineTo(-2, -3);
          ctx.lineTo(2, 3);
          ctx.lineTo(6, -1);
          ctx.stroke();
          break;
        case "gatling":
        case "hellstorm":
          ctx.fillStyle = pr.kind === "hellstorm" ? "#ff9d4d" : "#e0d5ff";
          ctx.fillRect(-4, -2.5, 12, 5);
          break;
        case "fireball": {
          const fl = Math.sin(pr.age * 30) * 3;
          ctx.fillStyle = "#ff7a3d";
          ctx.beginPath();
          ctx.arc(0, 0, 11 + fl * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fff2b0";
          ctx.beginPath();
          ctx.arc(2, 0, 6, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "core":
          ctx.fillStyle = "#35e0ff";
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.arc(0, 0, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          break;
        case "icicle":
          ctx.fillStyle = "#bfeaff";
          ctx.strokeStyle = "#3fb6ff";
          ctx.beginPath();
          ctx.moveTo(14, 0);
          ctx.lineTo(-8, -7);
          ctx.lineTo(-4, 0);
          ctx.lineTo(-8, 7);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        default:
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-4, -2, 8, 4);
      }
      ctx.restore();
    };

    const draw = () => {
      const now = performance.now();
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      if (g.shake > 0.3 && fxOn()) ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#0d0827");
      bg.addColorStop(1, "#07051a");
      ctx.fillStyle = bg;
      ctx.fillRect(-20, -20, W + 40, H + 40);

      // grid cells (hidden when the Battlefield Guides setting is off)
      const drag = dragRef.current;
      const showGuides = saveRef.current.guides;
      for (let c = 0; c < COLS && showGuides; c++) {
        for (let r = 0; r < ROWS; r++) {
          if (isPathCell(c, r)) continue;
          const x = OX + c * C;
          const y = OY + r * C;
          if (drag && drag.moved) {
            const over = drag.x >= x && drag.x < x + C && drag.y >= y && drag.y < y + C;
            const occupied = g.towers.some((t) => t.cell && t.cell.c === c && t.cell.r === r);
            if (over) {
              ctx.fillStyle = occupied ? "rgba(255,77,94,0.25)" : "rgba(61,255,142,0.22)";
              ctx.strokeStyle = occupied ? "rgba(255,77,94,0.8)" : "rgba(61,255,142,0.8)";
            } else {
              ctx.fillStyle = "rgba(53,224,255,0.05)";
              ctx.strokeStyle = "rgba(74,58,150,0.4)";
            }
          } else {
            ctx.fillStyle = "rgba(26,18,64,0.45)";
            ctx.strokeStyle = "rgba(74,58,150,0.4)";
          }
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(x + 4, y + 4, C - 8, C - 8, 10);
          ctx.fill();
          ctx.stroke();
        }
      }

      // path
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#191243";
      ctx.lineWidth = C * 0.82;
      pathStroke();
      ctx.strokeStyle = "#221a55";
      ctx.lineWidth = C * 0.66;
      pathStroke();
      ctx.strokeStyle = "rgba(120,90,255,0.5)";
      ctx.lineWidth = 5;
      ctx.setLineDash([14, 26]);
      ctx.lineDashOffset = -((now / 12) % 40);
      pathStroke();
      ctx.setLineDash([]);

      drawPortal(WPX[0].x, WPX[0].y, "#c44dff", "SPAWN");
      drawPortal(WPX[WPX.length - 1].x, WPX[WPX.length - 1].y, "#ff4d5e", "EXIT");

      // range guides
      if (saveRef.current.guides) {
        ctx.save();
        ctx.setLineDash([7, 9]);
        ctx.lineWidth = 1.5;
        for (const t of g.towers) {
          if (!t.cell) continue;
          const p = cellCenter(t.cell.c, t.cell.r);
          const rr = t.def.target === "all" ? RANGE * 1.25 : t.def.aura ? 96 : RANGE;
          ctx.strokeStyle = t.owner === "you" ? "rgba(53,224,255,0.22)" : t.owner + "55";
          ctx.beginPath();
          ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      for (const t of g.towers) {
        if (t.cell) drawTowerAt(t, cellCenter(t.cell.c, t.cell.r).x, cellCenter(t.cell.c, t.cell.r).y, now, false);
      }
      for (const e of g.enemies) drawEnemy(e, now);
      for (const pr of g.projs) drawProj(pr);

      // bolts
      for (const b of g.bolts) {
        boltPts(b, boltCache);
        if (boltCache.length < 2) continue;
        ctx.lineCap = "round";
        const alpha = Math.min(1, b.life / b.max + 0.25);
        ctx.globalAlpha = alpha * 0.35;
        ctx.strokeStyle = b.color;
        ctx.lineWidth = b.w * 3;
        ctx.beginPath();
        ctx.moveTo(boltCache[0].x, boltCache[0].y);
        for (const p of boltCache) ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = b.w;
        ctx.beginPath();
        ctx.moveTo(boltCache[0].x, boltCache[0].y);
        for (const p of boltCache) ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // particles
      for (const p of g.parts) {
        const al = Math.max(0, p.life / p.max);
        if (p.kind === "ring") {
          ctx.globalAlpha = al * 0.8;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3 * al;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1.6 - al * 0.6), 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.kind === "smoke") {
          ctx.globalAlpha = al * 0.4;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (2 - al), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalAlpha = al;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
      }
      ctx.globalAlpha = 1;

      // floating damage text
      for (const t of g.texts) {
        const al = Math.min(1, t.life / 0.4);
        ctx.globalAlpha = al;
        ctx.font = t.crit ? `700 ${t.size + 3}px Rajdhani, sans-serif` : `700 ${t.size}px Rajdhani, sans-serif`;
        ctx.textAlign = "center";
        if (t.crit) {
          ctx.strokeStyle = "rgba(0,0,0,0.8)";
          ctx.lineWidth = 4;
          ctx.strokeText(t.txt, t.x, t.y);
        }
        ctx.fillStyle = t.color;
        ctx.fillText(t.txt, t.x, t.y);
      }
      ctx.globalAlpha = 1;

      // drag ghost
      if (drag && drag.moved) {
        const t = g.towers.find((x) => x.uid === drag.uid);
        if (t && drag.x >= 0 && drag.x <= W && drag.y >= 0 && drag.y <= H) drawTowerAt(t, drag.x, drag.y, now, true);
      }

      ctx.restore();
      if (g.redFlash > 0) {
        ctx.fillStyle = `rgba(255,40,60,${g.redFlash * 0.22})`;
        ctx.fillRect(0, 0, W, H);
      }
    };

    // ---------- loop ----------
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      // rAF timestamps can start behind performance.now(), which would make dt negative
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      update(dt);
      draw();
      if (now - lastHud > 110) {
        lastHud = now;
        setTick((t) => t + 1);
      }
    };
    raf = requestAnimationFrame(loop);

    // canvas pointer: drag placed towers / merge
    const toCanvas = (e: PointerEvent) => canvasPoint(canvas, e.clientX, e.clientY);
    const cellAt = (x: number, y: number) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      const c = Math.floor((x - OX) / C);
      const r = Math.floor((y - OY) / C);
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS || isPathCell(c, r)) return null;
      return { c, r };
    };
    const down = (e: PointerEvent) => {
      const p = toCanvas(e);
      const cell = cellAt(p.x, p.y);
      if (!cell) return;
      const t = g.towers.find((x) => x.cell && x.cell.c === cell.c && x.cell.r === cell.r);
      if (t) {
        dragRef.current = { kind: "field", uid: t.uid, x: p.x, y: p.y, moved: false };
        canvas.setPointerCapture(e.pointerId);
        sfx.hover();
      }
    };
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || d.kind !== "field") return;
      const p = toCanvas(e);
      d.x = p.x;
      d.y = p.y;
      d.moved = true;
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d || !d.moved) return;
      const p = toCanvas(e);
      const cell = cellAt(p.x, p.y);
      const src = g.towers.find((x) => x.uid === d.uid);
      if (!src || !cell) return;
      if (cell.c === src.cell?.c && cell.r === src.cell?.r) return;
      const occ = g.towers.find((x) => x.cell && x.cell.c === cell.c && x.cell.r === cell.r && x.uid !== src.uid);
      if (occ) {
        if (occ.points === src.points) mergeTowers(src, occ);
        else {
          sfx.error();
          toastRef.current(`Points must match to merge (${src.points} vs ${occ.points})`, "#ff4d5e");
        }
        return;
      }
      onPlaced(src, cell.c, cell.r);
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const g = gRef.current;
  const cost = g ? SP_BASE_COST + SP_COST_STEP * g.spSpend : SP_BASE_COST;

  /** which slot (if any) sits under these client coordinates */
  const slotIndexAt = (x: number, y: number) => {
    for (let i = 0; i < 6; i++) {
      const el = slotRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i;
    }
    return -1;
  };

  /** ascend the tower in a slot index, or the tower under a canvas drop point */
  const ascendTower = (uid: number) => {
    const gg = gRef.current;
    const t = gg?.towers.find((x) => x.uid === uid);
    setAscentArmed(false);
    if (!gg || !t) return;
    if (t.bLv >= MAX_BATTLE_LEVEL) {
      sfx.error();
      push(`${t.def.name} is already at battle level ${MAX_BATTLE_LEVEL}`, "#ff4d5e");
      return;
    }
    const spCost = SP_BASE_COST + SP_COST_STEP * gg.spSpend;
    if (gg.sp < spCost) {
      sfx.error();
      push("Not enough SP", "#ff4d5e");
      return;
    }
    ascendRef.current(uid);
  };

  /**
   * The ascent token is dragged into a slot (or a deployed tower on the grid) -
   * it is never a button that sits next to the slot.
   */
  const startAscentDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    sfx.hover();
    setAscentDrag({ x: e.clientX, y: e.clientY });
    setAscentArmed(true);
    const move = (ev: PointerEvent) => {
      setAscentDrag({ x: ev.clientX, y: ev.clientY });
      const idx = slotIndexAt(ev.clientX, ev.clientY);
      setAscentHover(idx >= 0 ? idx : fieldTowerSlot(ev.clientX, ev.clientY));
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setAscentDrag(null);
      setAscentHover(-1);
      const gg = gRef.current;
      if (!gg) return;
      const idx = slotIndexAt(ev.clientX, ev.clientY);
      if (idx >= 0) {
        const t = gg.towers.find((x) => x.lineupIdx === idx);
        if (t) {
          ascendTower(t.uid);
          return;
        }
      }
      // dropped on the battlefield?
      const uid = fieldTowerAt(ev.clientX, ev.clientY);
      if (uid >= 0) ascendTower(uid);
      else setAscentArmed(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /** tower uid under a client point on the canvas (or -1) */
  const fieldTowerAt = (clientX: number, clientY: number) => {
    const gg = gRef.current;
    const canvas = canvasRef.current;
    if (!gg || !canvas) return -1;
    const r = canvas.getBoundingClientRect();
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return -1;
    const p = canvasPoint(canvas, clientX, clientY);
    const c = Math.floor((p.x - OX) / C);
    const row = Math.floor((p.y - OY) / C);
    const t = gg.towers.find((x) => x.cell && x.cell.c === c && x.cell.r === row);
    return t ? t.uid : -1;
  };

  /** slot index of the tower under a canvas point (for hover highlight) */
  const fieldTowerSlot = (clientX: number, clientY: number) => {
    const uid = fieldTowerAt(clientX, clientY);
    if (uid < 0) return -1;
    const t = gRef.current?.towers.find((x) => x.uid === uid);
    return t && t.lineupIdx >= 0 ? t.lineupIdx : -1;
  };
  const maxRounds = mode === "party" ? PARTY_ROUNDS : BATTLE_ROUNDS;

  const collect = () => {
    if (!g?.final) return;
    const f = g.final;
    mutate((s) => {
      s.gold += f.gold;
      s.gems += f.gems;
      s.tokens += f.tokens;
      f.frags.forEach((fr) => {
        s.frags[fr.id] = (s.frags[fr.id] || 0) + fr.n;
      });
      s.runs++;
      if (mode === "endless") s.bestEndless = Math.max(s.bestEndless, f.rounds);
      else s.best = Math.max(s.best, f.rounds);
      if (f.won) s.wins++;
    });
    sfx.coin();
    onExit();
  };

  const heroReady = g ? g.heroCd <= 0 : true;
  const heroDef = HERO_BY_ID[save.hero] || HERO_BY_ID.nova;

  return (
    <div className="app-bg relative flex h-full flex-col">
      <Toasts toasts={toasts} />
      {pulses.map((p) => (
        <div
          key={p.id}
          className="pointer-events-none fixed z-[95] h-3 w-3 rounded-full"
          style={
            {
              left: p.x - 6,
              top: p.y - 6,
              background: "radial-gradient(circle,#fff,#35e0ff)",
              boxShadow: "0 0 12px #35e0ff",
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
              animation: "pulseTravel 0.45s ease-out forwards",
            } as CSSProperties
          }
        />
      ))}

      {/* TOP BAR — lineup left / status right */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1.5 px-3 pt-2">
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => {
            const t = g?.towers.find((x) => x.lineupIdx === i);
            return (
              <div
                key={i}
                ref={(el) => {
                  slotRefs.current[i] = el;
                }}
                className="relative flex h-[54px] w-[74px] flex-col items-center justify-center rounded-lg border"
                style={{
                  background: "rgba(8,5,26,0.7)",
                  borderColor: t ? RARITY[t.def.rarity].color : "var(--line)",
                  opacity: t ? 1 : 0.4,
                }}
              >
                {t ? (
                  <>
                    <div key={`s${i}-${t.points}`} style={slotFlash === i ? { animation: "slotPulse 0.4s ease" } : undefined}>
                      <TowerIcon def={t.def} size={34} />
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold leading-none">
                      <span style={{ color: RARITY[t.def.rarity].color }}>Lv{t.bLv}</span>
                      <span className="rounded px-1" style={{ background: "rgba(0,0,0,0.5)", color: ptColor(t.points) }}>
                        {t.points >= MAX_POINTS ? "MAX" : t.points}
                      </span>
                    </div>
                    {t.cell ? <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border border-black bg-[#3dff8e]" /> : null}
                  </>
                ) : (
                  <span className="text-[9px] font-bold tracking-widest text-[var(--line2)]">EMPTY</span>
                )}
              </div>
            );
          })}
          <button
            className="btn btn-cyan ml-1 h-[54px] shrink-0 px-3 text-[12px] leading-tight"
            disabled={g ? g.sp < cost : true}
            onClick={() => summonRef.current()}
          >
            SUMMON
            <span className="block text-[10px] font-bold opacity-80">SP {cost}</span>
            <span className="block text-[9px] font-bold opacity-70">spawns randomly</span>
          </button>
        </div>
        {g && (
          <div className="flex items-center gap-2 text-[15px] font-bold">
            <span data-testid="sp-chip" className="chip text-[#35e0ff]">
              SP {Math.floor(g.sp)}
            </span>
            <span className="chip text-[#ffcf4d]">
              <CoinIcon size={15} /> {Math.floor(g.gold)}
            </span>
            <span className={`chip ${g.lives <= 5 ? "text-[#ff4d5e]" : "text-[#ff8f9a]"}`}>
              <svg width="15" height="15" viewBox="0 0 20 20">
                <path d="M10 17S2 11.5 2 6.6C2 4 4 2.5 6 2.5c1.6 0 3 .8 4 2.2 1-1.4 2.4-2.2 4-2.2 2 0 4 1.5 4 4.1C18 11.5 10 17 10 17z" fill="#ff4d5e" />
              </svg>
              {g.lives}
            </span>
            {mode === "endless" ? (
              <span className="chip border-[#ff9be9]/50 text-[#ff9be9]">WAVE {g.round} · ENDLESS</span>
            ) : (
              <span className="chip">
                ROUND {Math.min(g.round, maxRounds)}/{maxRounds}
              </span>
            )}
            <span className="chip text-[var(--dim)]">{g.enemies.length + g.spawnQ.length} left</span>
            {g.odT > 0 && <span className="chip text-[#3dff8e]">OVERDRIVE {g.odT.toFixed(0)}s</span>}
          </div>
        )}
      </div>

      {/* CANVAS */}
      <div className="relative min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="mx-auto block"
          style={{ touchAction: "none", cursor: "grab" }}
        />
        {g && (g.phase === "deploy" || g.phase === "inter") && (
          <div className="pointer-events-none absolute left-1/2 top-[8%] -translate-x-1/2 text-center">
            <div className="font-disp text-4xl text-[#ffcf4d]" style={{ textShadow: "0 0 26px rgba(255,179,36,.7)" }}>
              {g.phase === "deploy" ? "DEPLOY TOWERS" : `${mode === "endless" ? "WAVE" : "ROUND"} ${g.round} CLEARED`}
            </div>
            <div className="mt-1 text-base font-bold tracking-[0.25em] text-[var(--txt)]">
              {g.phase === "deploy" ? "PRESS SUMMON — TOWERS DROP STRAIGHT ONTO THE GRID" : `NEXT WAVE IN ${Math.ceil(g.phaseT)}`}
            </div>
            <div className="mt-1 text-[13px] font-bold tracking-[0.2em] text-[#ff9be9]">
              WAVE {g.phase === "deploy" ? g.round : g.round + 1} · ENEMY HP ×{Math.pow(HP_GROWTH, g.phase === "deploy" ? g.round - 1 : g.round).toFixed(1)}
            </div>
          </div>
        )}
        {g && g.phase === "wave" && (
          <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 text-center">
            <div className="font-disp text-xl text-[#ff4fd8]" style={{ textShadow: "0 0 18px rgba(255,79,216,.6)" }}>
              {mode === "endless" ? "WAVE" : "ROUND"} {g.round}
            </div>
            <div className="text-[11px] font-bold tracking-[0.2em] text-[#ff9be9]/80">
              ENEMY HP ×{Math.pow(HP_GROWTH, g.round - 1).toFixed(1)} · +{Math.round((HP_GROWTH - 1) * 100)}% PER WAVE
            </div>
          </div>
        )}
        {g && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => heroRef.current()}
            className="absolute right-4 top-1/2 z-20 flex h-[118px] w-[118px] -translate-y-1/2 flex-col items-center justify-center rounded-full transition-transform active:scale-95"
            style={{
              background: heroReady ? "radial-gradient(circle at 35% 30%, #ff9be9, #ff4fd8 55%, #7a0f63)" : "radial-gradient(circle, #3a2a4a, #1d1230)",
              border: heroReady ? "3px solid #ffb8ef" : "3px solid #4a3a5a",
              boxShadow: heroReady ? "0 0 34px rgba(255,79,216,.55)" : "none",
              animation: heroReady ? "pulseGlow 1.6s ease-in-out infinite" : undefined,
              color: heroReady ? "#2c0022" : "#8a7a9a",
            }}
          >
            <HeroIcon kind={heroDef.kind} size={40} color={heroReady ? "#2c0022" : "#8a7a9a"} />
            <span className="font-disp mt-1 text-[11px] leading-tight">{heroDef.name.toUpperCase()}</span>
            {!heroReady ? (
              <span className="text-lg font-bold leading-tight">{Math.ceil(g.heroCd)}s</span>
            ) : (
              <span className="text-[10px] font-bold leading-tight">READY</span>
            )}
          </button>
        )}
        {mode === "party" && (
          <div className="absolute bottom-2 left-3 flex flex-col gap-1">
            {TEAMMATES.map((m) => (
              <div key={m.name} className="chip" style={{ borderColor: m.color + "66" }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color, boxShadow: `0 0 8px ${m.color}` }} />
                <span className="text-[12px]" style={{ color: m.color }}>{m.name}</span>
                <span className="text-[10px] text-[var(--dim)]">{m.tag}</span>
                <span className="text-[10px] font-bold" style={{ color: m.color }}>{m.perk}</span>
              </div>
            ))}
            {g && (
              <div className="chip border-[#3dff8e66] text-[11px] text-[#8effc4]">
                SYNERGY +{Math.round(SYNERGY_DMG * 100)}% · towers next to a teammate hit harder
                {g.rallyT > 0 ? ` · RALLY ${g.rallyT.toFixed(0)}s` : ""}
              </div>
            )}
          </div>
        )}
        <button
          className="btn absolute right-3 top-2 px-3 py-1 text-[11px]"
          onClick={() => {
            sfx.click();
            onExit();
          }}
        >
          Abandon
        </button>
      </div>

      {/* BOTTOM BAR — tower slots + the ASCENT token you drop into a slot */}
      {g && (
        <div className="flex shrink-0 items-stretch gap-2 px-3 py-2">
          {/* run shop */}
          <button
            data-testid="battle-shop"
            onClick={() => {
              sfx.click();
              setShopOpen(true);
            }}
            className="panel flex w-[86px] shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 px-2 py-1.5"
            style={{ borderColor: "rgba(61,255,142,0.45)" }}
          >
            <span className="text-[17px] leading-none">🛒</span>
            <span className="font-disp text-[11px] leading-none text-[#8effc4]">SHOP</span>
            <span className="text-[10px] font-bold leading-none text-[var(--dim)]">🪙 {Math.floor(g.gold)}</span>
          </button>

          {/* party rally meter */}
          {mode === "party" && (
            <button
              data-testid="rally"
              onClick={() => rallyRef.current()}
              className="panel relative flex w-[86px] shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 overflow-hidden px-2 py-1.5"
              style={{
                borderColor: g.rally >= 1 || g.rallyT > 0 ? "#ff4fd8" : "rgba(255,79,216,0.35)",
                boxShadow: g.rally >= 1 ? "0 0 18px rgba(255,79,216,0.5)" : undefined,
              }}
            >
              <span
                className="pointer-events-none absolute bottom-0 left-0 w-full"
                style={{
                  height: `${(g.rallyT > 0 ? 1 : g.rally) * 100}%`,
                  background: "linear-gradient(180deg, rgba(255,79,216,0.45), rgba(255,79,216,0.12))",
                }}
              />
              <span className="relative font-disp text-[11px] leading-none text-[#ff9be9]">RALLY</span>
              <span className="relative text-[10px] font-bold leading-none text-[var(--dim)]">
                {g.rallyT > 0 ? `${g.rallyT.toFixed(0)}s ON` : g.rally >= 1 ? "TAP!" : `${Math.floor(g.rally * 100)}%`}
              </span>
            </button>
          )}

          {/* ascent token */}
          <div
            data-testid="ascent-token"
            onPointerDown={startAscentDrag}
            className="panel relative flex w-[104px] shrink-0 cursor-grab flex-col items-center justify-center gap-0.5 px-2 py-1.5 select-none"
            style={{
              borderColor: ascentArmed ? "#ffcf4d" : "rgba(255,207,77,0.45)",
              background: ascentArmed
                ? "linear-gradient(180deg, rgba(255,207,77,0.25), rgba(255,179,32,0.08))"
                : undefined,
              opacity: g.sp < cost ? 0.55 : 1,
              touchAction: "none",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffcf4d" strokeWidth="2.2">
              <path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-disp text-[11px] leading-none text-[#ffcf4d]">ASCENT</span>
            <span className="text-[10px] font-bold leading-none text-[var(--dim)]">
              {ascentArmed ? "PICK A SLOT" : `SP ${cost}`}
            </span>
          </div>

          {/* the six tower slots */}
          {Array.from({ length: 6 }).map((_, i) => {
            const t = g.towers.find((x) => x.lineupIdx === i);
            const hot = ascentHover === i;
            const maxed = t ? t.bLv >= MAX_BATTLE_LEVEL : false;
            return (
              <div
                key={i}
                ref={(el) => {
                  slotRefs.current[i] = el;
                }}
                data-slot={i}
                onClick={t && (ascentArmed || ascentHover === i) ? () => ascendTower(t.uid) : undefined}
                className="panel flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 transition-colors"
                style={{
                  opacity: t ? 1 : 0.45,
                  borderColor: hot ? "#ffcf4d" : undefined,
                  background: hot ? "rgba(255,207,77,0.16)" : undefined,
                  cursor: t && ascentArmed ? "pointer" : undefined,
                }}
              >
                {t ? (
                  <>
                    <TowerIcon def={t.def} size={38} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="truncate text-[12px] font-bold" style={{ color: RARITY[t.def.rarity].color }}>
                        {t.def.name}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold text-[var(--dim)]">
                          Lv {t.bLv}/{MAX_BATTLE_LEVEL}
                        </span>
                        <span
                          key={t.points}
                          className="anim-pop rounded px-1 text-[11px] font-bold"
                          style={{ background: "rgba(0,0,0,0.4)", color: ptColor(t.points) }}
                        >
                          {t.points >= MAX_POINTS ? "MAX" : `${t.points} pts`}
                        </span>
                      </div>
                      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-black/50">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(t.bLv / MAX_BATTLE_LEVEL) * 100}%`,
                            background: "linear-gradient(90deg,#35e0ff,#c44dff)",
                          }}
                        />
                      </div>
                    </div>
                    {maxed && <span className="shrink-0 text-[10px] font-bold text-[#ffcf4d]">MAX</span>}
                  </>
                ) : (
                  <span className="w-full text-center text-[10px] font-bold tracking-widest text-[var(--line2)]">
                    EMPTY SLOT
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* performance overlay */}
      {save.perf && g && (
        <div className="pointer-events-none absolute left-3 top-[70px] z-20 rounded-md border border-[var(--line)] bg-black/70 px-2 py-1 text-[11px] font-bold leading-tight text-[#8effc4]">
          <div>{g.fps} FPS</div>
          <div className="text-[var(--dim)]">{g.enemies.length} enemies · {g.projs.length} shots</div>
          <div className="text-[var(--dim)]">{g.parts.length} particles · {g.towers.length} towers</div>
        </div>
      )}

      {/* IN-BATTLE SHOP */}
      {g && shopOpen && (
        <RunShop
          gold={g.gold}
          bought={g.shopBought}
          onBuy={(item) => shopRef.current(item)}
          onClose={() => setShopOpen(false)}
        />
      )}

      {/* drag ghost for the ascent token */}
      {ascentDrag && (
        <div
          className="pointer-events-none fixed z-[96] flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            left: ascentDrag.x - 28,
            top: ascentDrag.y - 28,
            background: "radial-gradient(circle at 35% 30%, #ffe9b0, #ffb020 60%, #8a5200)",
            boxShadow: "0 0 22px rgba(255,179,36,.75)",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3a2400" strokeWidth="2.6">
            <path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* END OVERLAY */}
      {g?.final && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <div className="panel anim-pop w-[440px] p-6 text-center" style={{ borderColor: g.final.won ? "#ffcf4d88" : "#ff4d5e88" }}>
            <div
              className="font-disp text-4xl"
              style={{
                color: mode === "endless" ? "#ff9be9" : g.final.won ? "#ffcf4d" : "#ff4d5e",
                textShadow:
                  mode === "endless"
                    ? "0 0 26px rgba(255,79,216,.6)"
                    : `0 0 26px ${g.final.won ? "rgba(255,207,77,.6)" : "rgba(255,77,94,.6)"}`,
              }}
            >
              {mode === "endless" ? "RUN OVER" : g.final.won ? "VICTORY" : "DEFEAT"}
            </div>
            <div className="mt-1 text-sm font-bold tracking-[0.2em] text-[var(--dim)]">
              {mode === "endless"
                ? `REACHED WAVE ${g.final.rounds}`
                : g.final.won
                  ? "THE LINE HELD"
                  : `FELL ON ROUND ${g.round}`}{" "}
              · {g.kills} KILLS
            </div>
            {mode === "endless" && (
              <div
                className="mt-2 inline-block rounded-lg border px-3 py-1 text-[13px] font-bold tracking-widest"
                style={{
                  borderColor: g.final.rounds > save.bestEndless ? "#ffcf4d" : "#322767",
                  color: g.final.rounds > save.bestEndless ? "#ffcf4d" : "var(--dim)",
                }}
              >
                {g.final.rounds > save.bestEndless ? `NEW RECORD · WAS ${save.bestEndless}` : `BEST ${save.bestEndless}`}
              </div>
            )}
            <div className="mt-4 space-y-1.5 text-left">
              <RewardRow icon={<CoinIcon size={17} />} label="Gold" val={`+${g.final.gold}`} color="#ffcf4d" />
              {g.final.gems > 0 && <RewardRow icon={<span className="text-[#35e0ff]">◆</span>} label="Gems" val={`+${g.final.gems}`} color="#35e0ff" />}
              {g.final.tokens > 0 && <RewardRow icon={<span className="text-[#ff4fd8]">✦</span>} label="Magic Tokens" val={`+${g.final.tokens}`} color="#ff4fd8" />}
              {g.final.frags.map((f) => (
                <RewardRow
                  key={f.id}
                  icon={<TowerIcon def={TOWER_BY_ID[f.id]} size={20} />}
                  label={`${TOWER_BY_ID[f.id].name} fragments`}
                  val={`+${f.n}`}
                  color={RARITY[TOWER_BY_ID[f.id].rarity].color}
                />
              ))}
            </div>
            <button className="btn btn-gold mt-5 w-full py-3 text-lg" onClick={collect}>
              Collect Rewards
            </button>
          </div>
        </div>
      )}
      {mode === "party" && !g?.final && (
        <div className="pointer-events-none absolute left-1/2 top-14 -translate-x-1/2 rounded-lg border border-[#ff4fd866] bg-black/60 px-3 py-1 text-[11px] font-bold tracking-widest text-[#ff9be9]">
          PARTY MODE · TEAM CO-OP · MAGIC TOKENS AT ROUND 10
        </div>
      )}
    </div>
  );
}

/** in-battle shop: spends the gold banked during this run */
function RunShop({
  gold,
  bought,
  onBuy,
  onClose,
}: {
  gold: number;
  bought: Record<string, number>;
  onBuy: (item: RunShopItem) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="panel anim-pop max-h-[88vh] w-[560px] overflow-y-auto scroll-thin p-5" data-testid="run-shop">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-disp text-2xl text-[#8effc4]">Battle Shop</div>
            <div className="text-[12px] font-semibold text-[var(--dim)]">
              Gold earned this run — whatever you don't spend is paid out when the run ends.
            </div>
          </div>
          <span className="chip text-[15px] text-[#ffcf4d]">
            <CoinIcon size={16} /> {Math.floor(gold)}
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {RUN_SHOP.map((item) => {
            const n = bought[item.id] || 0;
            const soldOut = n >= item.max;
            const price = runShopCost(item, n);
            const afford = gold >= price;
            return (
              <div key={item.id} className="row-card" style={{ alignItems: "center" }}>
                <div className="min-w-0">
                  <div className="text-[14px] font-bold text-[var(--txt)]">
                    {item.name}
                    <span className="ml-2 text-[11px] font-bold text-[var(--dim)]">
                      {n}/{item.max} bought
                    </span>
                  </div>
                  <div className="text-[12px] font-semibold leading-snug text-[var(--dim)]">{item.desc}</div>
                </div>
                <button
                  className={`btn shrink-0 px-4 py-2 text-[13px] ${!soldOut && afford ? "btn-gold" : ""}`}
                  disabled={soldOut || !afford}
                  onClick={() => onBuy(item)}
                >
                  {soldOut ? "SOLD OUT" : (<span className="inline-flex items-center gap-1.5"><CoinIcon size={13} /> {price}</span>)}
                </button>
              </div>
            );
          })}
        </div>

        <button className="btn mt-4 w-full py-2" onClick={onClose}>
          Back to battle
        </button>
      </div>
    </div>
  );
}

function RewardRow({ icon, label, val, color }: { icon: React.ReactNode; label: string; val: string; color: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-black/30 px-3 py-1.5">
      <span className="flex items-center gap-2 text-[14px] font-bold">
        {icon}
        {label}
      </span>
      <span className="text-[15px] font-bold" style={{ color }}>
        {val}
      </span>
    </div>
  );
}
