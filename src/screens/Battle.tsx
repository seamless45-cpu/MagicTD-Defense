import { useCallback, useEffect, useRef, useState } from "react";
import type { SaveData } from "../game/save";
import { clampZoom, heroLevel } from "../game/save";
import { sfx } from "../game/audio";
import {
  TOWERS,
  TOWER_BY_ID,
  RARITY,
  ENEMY_TYPES,
  roundHp,
  HP_GROWTH,
  waveComp,
  BATTLE_ROUNDS,
  MAX_BATTLE_LEVEL,
  MAX_POINTS,
  POINT_STEP,
  POINT_DMG_STEP,
  ASC_DMG_MUL,
  towerDamage,
  SP_BASE_COST,
  spCost,
  spawnBudget,
  REWARD_MUL,
  reward,
  isBossType,
  BOSS_SKILLS,
  BOSS_SUMMON_CD,
  BOSS_BLINK_CD,
  BOSS_WARD_CD,
  BOSS_WARD_TIME,
  BOSS_ENRAGE_AT,
  HERO_BY_ID,
  HERO_MAX_LEVEL,
  heroCooldown,
  heroPower,
  OVERDRIVE_ASPD,
  OVERDRIVE_DMG,
  OVERDRIVE_TIME,
  SLOW_VULN,
  RUN_SHOP,
  runShopCost,
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
  /** ---------- boss state (types 4+) ---------- */
  summonCd: number;
  blinkCd: number;
  wardCd: number;
  /** seconds of damage reduction left on the Bulwark skill */
  ward: number;
  enraged: boolean;
  /** boss bar flash timer when a skill fires */
  cast: number;
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
  /** hero level at the moment the run started (ability power / cooldown) */
  heroLv: number;
  /** shop-bought damage bonus for this run (+% as a fraction) */
  dmgBonus: number;
  /** extra attack speed bought in the run shop */
  bonusAspd: number;
  /** what has been bought in the run shop this battle */
  shopBought: Record<string, number>;
  /** fps counter for the performance HUD */
  fps: number;
  fpsT: number;
  frames: number;
  sp: number;
  /** summons bought this run — drives the summon price */
  spSpend: number;
  /** ascents bought this run — drives the ascent price */
  ascSpend: number;
  enemies: Enemy[];
  towers: BT[];
  projs: Proj[];
  bolts: Bolt[];
  parts: Part[];
  texts: FT[];
  spawnQ: { type: number; at: number }[];
  heroCd: number;
  kills: number;
  /** boss cutscene: name + how long the intro card still runs */
  cut: { type: number; name: string; sub: string; t: number; total: number } | null;
  /** banner text for the last boss skill that fired */
  bossCast: { skill: string; tell: string; color: string; t: number } | null;
  /** last round whose boss cutscene already played */
  bossIntro: number;
  shake: number;
  redFlash: number;
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

function newGame(mode: GameMode, save: SaveData, startRound = 1): G {
  // the field starts empty: the opening SP is the player's to spend, so 4 towers
  // have to be summoned before the first wave rolls in
  const towers: BT[] = [];
  const g: G = {
    mode,
    heroId: HERO_BY_ID[save.hero] ? save.hero : "nova",
    heroLv: heroLevel(save, HERO_BY_ID[save.hero] ? save.hero : "nova"),
    dmgBonus: 0,
    t: 0,
    phase: "deploy",
    phaseT: mode === "endless" ? 6 : 7,
    round: Math.max(1, startRound),
    // endless has no final wave; maxRounds is only used for display
    maxRounds: mode === "battle" ? BATTLE_ROUNDS : 0,
    lives: mode === "endless" ? 15 : 20,
    // small field-kit budget so the run shop is useful from wave 1
    gold: 120,
    bonusAspd: 0,
    shopBought: {},
    fps: 60,
    fpsT: 0,
    frames: 0,
    // enough SP to summon SPAWN_BUDGET_TOWERS towers before wave 1 — towers are
    // never placed for free any more
    sp: spawnBudget(),
    spSpend: 0,
    ascSpend: 0,
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
    cut: null,
    bossCast: null,
    bossIntro: 0,
    shake: 0,
    redFlash: 0,
    tokensAwarded: false,
    final: null,
  };
  // no free placements: the opening SP is spent on summons by the player
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
const shopRef: { current: (item: RunShopItem) => void } = { current: () => {} };

// ---------- component ----------
export default function Battle({
  mode,
  save,
  mutate,
  onExit,
  debugRound,
}: {
  mode: GameMode;
  save: SaveData;
  mutate: (fn: (s: SaveData) => void) => void;
  onExit: () => void;
  /** start the run on a later round — used by tests to reach boss waves quickly */
  debugRound?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gRef = useRef<G | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  const mutateRef = useRef(mutate);
  mutateRef.current = mutate;

  const [, setTick] = useState(0);
  const { toasts, push } = useToasts();
  const [shopOpen, setShopOpen] = useState(false);
  /** arena zoom: 1 = fitted to the panel, up to 2 = twice as big (scroll to pan) */
  const [zoom, setZoom] = useState(() => clampZoom(save.zoom));
  const dragRef = useRef<{ kind: "lineup" | "field"; uid: number; x: number; y: number; moved: boolean } | null>(null);

  const toastRef = useRef(push);
  toastRef.current = push;

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const fitRef = useRef<() => void>(() => {});
  const changeZoom = useCallback(
    (next: number) => {
      const z = clampZoom(next);
      setZoom(z);
      zoomRef.current = z;
      fitRef.current();
      mutate((s) => {
        s.zoom = z;
      });
      sfx.click();
    },
    [mutate]
  );
  useEffect(() => {
    fitRef.current();
  }, [zoom]);

  // ---------- engine ----------
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const wrap = canvas.parentElement as HTMLElement;
    const fit = () => {
      const rw = wrap.clientWidth || 1;
      const rh = wrap.clientHeight || 1;
      const s = Math.max(0.1, Math.min(rw / W, rh / H) * zoomRef.current);
      canvas.style.width = `${Math.floor(W * s)}px`;
      canvas.style.height = `${Math.floor(H * s)}px`;
    };
    fitRef.current = fit;
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    const g = newGame(mode, saveRef.current, debugRound);
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

    const summonCost = () => spCost(g.spSpend);
    /** ascent has its own price ladder so summoning never price-gouges upgrades */
    const ascCost = () => spCost(g.ascSpend);

    const startWave = () => {
      g.phase = "wave";
      g.phaseT = 999;
      g.spawnQ = waveComp(g.round).map((type, i) => ({ type, at: g.t + 0.8 + i * 0.72 + Math.random() * 0.25 }));
      // bosses walk in first: their cutscene should open the wave, not trail it
      for (const s2 of g.spawnQ) if (isBossType(s2.type)) s2.at = Math.min(s2.at, g.t + 2.4);
      g.spawnQ.sort((a, b) => a.at - b.at);
      sfx.wave();
    };

    const endGame = (won: boolean) => {
      if (g.final) return;
      g.phase = won ? "won" : "lost";
      const rounds = won ? g.maxRounds : Math.max(0, g.round - 1);
      const frags: { id: string; n: number }[] = [];
      // endless runs pay out on how deep you got
      const nf = mode === "endless" ? Math.min(12, 1 + Math.floor(rounds / 3)) : won ? 3 : 1;
      for (let i = 0; i < nf; i++) {
        const id = TOWERS[Math.floor(Math.random() * TOWERS.length)].id;
        const e2 = frags.find((f) => f.id === id);
        if (e2) e2.n++;
        else frags.push({ id, n: 1 });
      }
      const endlessGold = reward(60 + 45 * rounds + 12 * rounds * rounds);
      const endlessGems = reward(rounds / 3) ? Math.floor((rounds / 3) * REWARD_MUL) : 0;
      const endlessTokens = Math.floor(rounds / 6);
      // whatever is left in the run wallet is paid out on top of the clear bonus
      const wallet = Math.floor(g.gold);

      g.final = {
        won,
        gold:
          (mode === "endless"
            ? endlessGold
            : won
              ? reward(150 + 30 * g.maxRounds)
              : reward(30 + 10 * rounds)) + wallet,
        gems: mode === "endless" ? endlessGems : won ? reward(2) : 0,
        tokens: mode === "endless" ? endlessTokens : 0,
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
      const p = pathPos(e.d);
      burst(p.x, p.y, ENEMY_TYPES[e.type].color, 14, 200);
      ring(p.x, p.y, ENEMY_TYPES[e.type].color, 26);
    };

    const dealDamage = (e: Enemy, raw: number, opt: { alwaysCrit?: boolean; tw?: BT; color?: string }) => {
      if (e.dead) return;
      let crit = opt.alwaysCrit ?? false;
      if (!crit) {
        const cc = 0.1;
        crit = Math.random() < cc;
      }
      // note: tower/aura multipliers are already folded into `raw` by the caller
      let dmg = raw * (1 - e.armor);
      if (e.ward > 0) dmg *= 0.45; // boss Bulwark
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
      // crits are the loudest thing on screen: heavy number + shockwave + shake
      const critTier = crit ? (dmg / Math.max(1, e.max) >= 0.5 ? 3 : dmg > 400 ? 2 : 1) : 0;
      e.hp -= dmg;
      const p = pathPos(e.d);
      if (crit) {
        // starburst: gold sparks fly out, a shockwave ring snaps open
        burst(p.x, p.y, critTier >= 3 ? "#fff2b0" : "#ffd23f", critTier >= 3 ? 26 : critTier === 2 ? 18 : 12, critTier >= 3 ? 340 : 250);
        ring(p.x, p.y, critTier >= 3 ? "#fff2b0" : "#ffcf4d", critTier >= 3 ? 60 : 44);
        if (critTier >= 2) {
          ring(p.x, p.y, "#ff8c3d", critTier >= 3 ? 86 : 62);
          g.shake = fxShake(critTier >= 3 ? 7 : 4);
        }
        sfx.crit();
      }
      if (saveRef.current.dmgNums) {
        const size = crit ? 26 + critTier * 7 : 15;
        addText(p.x + (Math.random() - 0.5) * 18, p.y - 26, String(Math.round(dmg)), crit ? "#ffd23f" : "#ffffff", size, crit);
        if (crit) addText(p.x, p.y - 52 - critTier * 4, critTier >= 3 ? "MEGA CRIT!" : "CRIT!", "#ff8c3d", 12 + critTier * 2, true);
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

    /** every global multiplier a shot picks up (overdrive + shop damage) */
    const globalMul = () => (g.odT > 0 ? 1 + OVERDRIVE_DMG : 1) * (1 + g.dmgBonus);

    /** kill-stack towers (Dragon's Maw) build damage with every kill they land */
    const killStackMul = (t: BT) => {
      if (!t.def.killStack) return 1;
      const tier = saveRef.current.awn[t.def.id]?.[1] || 0;
      const cap = tier > 0 ? t.def.awk2!.mult[tier - 1] : 0;
      return 1 + Math.min(cap, t.streak) * t.def.killStack;
    };

    /** damage growth from battle levels, points, auras and the global buffs */
    const towerPower = (t: BT) =>
      Math.pow(ASC_DMG_MUL, Math.max(0, t.bLv - 1)) *
      (1 + POINT_DMG_STEP * t.points) *
      t.atkMul *
      globalMul() *
      killStackMul(t);

    /** Solar flare (Sunforge): hits every enemy on the field at once. */
    const solarFlare = (t: BT) => {
      const dmg = towerDamage(t.def, t.menuLv, t.bLv, t.points, t.atkMul) * killStackMul(t) * globalMul();
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
      const dmg = towerDamage(t.def, t.menuLv, t.bLv, t.points, t.atkMul) * globalMul() * killStackMul(t);
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
        const targets = g.enemies.filter((e) => !e.dead).sort((x, y) => y.d - x.d).slice(0, beams);
        const now = performance.now();
        targets.forEach((e, i) => {
          const ep = pathPos(e.d);
          if (g.bolts.length < 36) g.bolts.push(randBolt(p.x, p.y, ep.x, ep.y, "#ff7a3d", Math.max(1.5, 3.5 - i * 0.05), 0.4, now));
          dealDamage(e, 800 * towerPower(b), { tw: b, color: "#ff7a3d" });
        });
        sfx.explosion();
        g.shake = fxShake(14);
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
          g.dmgBonus += 0.15;
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
      const lv = g.heroLv;
      const power = heroPower(lv);
      g.heroCd = heroCooldown(hero.cd, lv);
      sfx.hero();
      g.shake = fxShake(9);
      const now = performance.now();
      const kind: HeroKind = hero.kind;

      if (kind === "overdrive") {
        // no damage: supercharge every tower for a while
        g.odT = OVERDRIVE_TIME * power;
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
        const dur = 4 * power;
        g.enemies.forEach((e) => {
          if (e.dead) return;
          e.frozen = Math.max(e.frozen, dur);
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

      if (kind === "thunder") {
        // bolts walk the lane: a strike every ~70px of path, chaining nearby enemies
        const bolts = 5 + Math.round(lv * 1.4);
        const dmg = (170 + 45 * g.round) * power;
        for (let i = 0; i < bolts; i++) {
          const d = ((i + 0.5) / bolts) * PATH_LEN;
          const p = pathPos(d);
          const hit: typeof g.enemies = [];
          for (const e of g.enemies) {
            if (e.dead) continue;
            const ep = pathPos(e.d);
            if (Math.hypot(ep.x - p.x, ep.y - p.y) <= 96) hit.push(e);
          }
          for (const e of hit) {
            e.stun = Math.max(e.stun, 0.45);
            dealDamage(e, dmg, { alwaysCrit: true, color: hero.color });
          }
          // arcs between everything this bolt caught
          for (let k = 1; k < hit.length; k++) {
            const a = pathPos(hit[k - 1].d);
            const b = pathPos(hit[k].d);
            if (g.bolts.length < 36) g.bolts.push(randBolt(a.x, a.y, b.x, b.y, "#fff6a8", 1.6, 0.28, now));
          }
          if (g.bolts.length < 36) g.bolts.push(randBolt(p.x, -40, p.x, p.y, hero.color, 5, 0.4, now + i * 10));
          ring(p.x, p.y, hero.color, 54);
          burst(p.x, p.y, "#fff6a8", 8, 150);
        }
        addText(W / 2, H / 2 - 60, "THUNDER GOD!", hero.color, 26, true);
        return;
      }

      const dmg = (kind === "burn" ? 200 : 250) * power + 60 * g.round;
      g.enemies.forEach((e) => {
        if (e.dead) return;
        const p = pathPos(e.d);
        if (kind === "burn") {
          dealDamage(e, dmg, { color: hero.color });
          if (!e.dead) {
            e.burnDps = Math.max(e.burnDps, dmg * 0.35);
            e.burnT = Math.max(e.burnT, 8 * power);
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
      const cost = summonCost();
      if (g.sp < cost) { sfx.error(); toastRef.current("Not enough SP", "#ff4d5e"); return; }
      const idx = nextFreeSlot();
      const unlocked = Object.keys(saveRef.current.levels).filter((id) => saveRef.current.levels[id] > 0);
      if (unlocked.length === 0) return;
      // prefer the tower lineup the player curated in the Towers tab
      const lineup = saveRef.current.lineup.filter((id) => saveRef.current.levels[id] > 0);
      const pool0 = lineup.length ? lineup : unlocked;
      if (idx >= 0) {
        const cell = randFreeCell(g);
        if (!cell) {
          sfx.error();
          toastRef.current("The grid is full", "#ff4d5e");
          return;
        }
        // cycle the lineup: whatever is on the field least often spawns next
        const counts = pool0.map((id) => ({
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


    /**
     * One press upgrades every deployed tower of the same type. All copies stay
     * in lockstep, so a family always shares one battle level.
     */
    const ascend = (uid: number) => {
      const src = g.towers.find((x) => x.uid === uid);
      if (!src) return;
      const family = g.towers.filter((x) => x.def.id === src.def.id);
      const open = family.filter((x) => x.bLv < MAX_BATTLE_LEVEL);
      if (!open.length) return;
      const cost = ascCost();
      if (g.sp < cost) { sfx.error(); toastRef.current("Not enough SP", "#ff4d5e"); return; }
      g.sp -= cost;
      g.ascSpend++;
      const lv = Math.min(MAX_BATTLE_LEVEL, src.bLv + 1);
      // every copy of the tower stays in lockstep
      for (const t of family) t.bLv = lv;
      sfx.ascend();
      for (const t of open) {
        if (!t.cell) continue;
        const p = cellCenter(t.cell.c, t.cell.r);
        ring(p.x, p.y, "#35e0ff", 44);
        addText(p.x, p.y - 40, `ASCENT Lv${lv}`, "#35e0ff", 13, true);
      }
      toastRef.current(
        open.length > 1
          ? `All ${open.length} ${src.def.name} towers ascended to Lv ${lv}`
          : `${src.def.name} ascended to Lv ${lv}`,
        "#35e0ff"
      );
    };
    ascendRef.current = ascend;

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

      if (g.final) {
        updateFx(dt);
        return;
      }

      if (g.bossCast) {
        g.bossCast.t -= dt;
        if (g.bossCast.t <= 0) g.bossCast = null;
      }

      // a boss cutscene stops the world until it is dismissed
      if (g.cut) {
        g.cut.t -= dt;
        if (g.cut.t <= 0) g.cut = null;
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
          const boss = isBossType(s.type);
          g.enemies.push({
            id: eidC++, d: 0, hp, max: hp, speed: et.speed * (1 + g.round * 0.012), type: s.type,
            frozen: 0, stun: 0, armor: et.armor, lives: et.lives, gold: et.gold + Math.floor(g.round / 2),
            spv: 6 + g.round * 2 + (boss ? 40 : 0), dead: false, wob: Math.random() * 7,
            slow: 0, slowT: 0, burnT: 0, burnDps: 0,
            summonCd: BOSS_SUMMON_CD, blinkCd: BOSS_BLINK_CD, wardCd: BOSS_WARD_CD, ward: 0,
            enraged: false, cast: 0,
          });
          // a boss walks in with a cutscene — the sim holds until it finishes
          if (boss && g.bossIntro !== g.round) {
            g.bossIntro = g.round;
            g.cut = { type: s.type, name: et.name, sub: `${mode === "endless" ? "WAVE" : "ROUND"} ${g.round} · BOSS INCOMING`, t: 3.4, total: 3.4 };
            g.shake = fxShake(10);
            sfx.boss();
          }
        }
        if (!g.spawnQ.length && g.enemies.length === 0) {
          const bonus = 40 + 10 * g.round;
          g.sp += bonus;
          // gold + gem payouts were buffed 40% (REWARD_MUL) in the balance patch
          g.gold += reward(bonus / 2);
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
          }
        }
      }

      // enemies advance
      for (const e of g.enemies) {
        if (e.dead) continue;
        // ---------- boss skills ----------
        if (isBossType(e.type)) {
          e.cast = Math.max(0, e.cast - dt);
          e.ward = Math.max(0, e.ward - dt);
          if (!e.enraged && e.hp / e.max <= BOSS_ENRAGE_AT) {
            e.enraged = true;
            e.speed *= 1.45;
            e.ward = Math.max(e.ward, 1.2);
            e.cast = 1.2;
            g.bossCast = { skill: "Blood Frenzy", tell: `${ENEMY_TYPES[e.type].name} ${BOSS_SKILLS[3].tell}`, color: BOSS_SKILLS[3].color, t: 2.2 };
            burst(pathPos(e.d).x, pathPos(e.d).y, "#ff4d5e", 22, 240);
            sfx.leak();
          }
          e.summonCd -= dt;
          if (e.summonCd <= 0) {
            e.summonCd = BOSS_SUMMON_CD;
            const ep = pathPos(e.d);
            const et0 = ENEMY_TYPES[0];
            const nSum = 2 + (g.round >= 16 ? 1 : 0);
            for (let i = 0; i < nSum; i++) {
              const hp = roundHp(g.round) * et0.hpMul * 0.6;
              const back = Math.max(0, e.d - 30 - i * 26);
              g.enemies.push({
                id: eidC++, d: back, hp, max: hp, speed: et0.speed * (1 + g.round * 0.012) * 1.25, type: 0,
                frozen: 0, stun: 0, armor: 0, lives: 1, gold: et0.gold + Math.floor(g.round / 4),
                spv: 4 + g.round, dead: false, wob: Math.random() * 7,
                slow: 0, slowT: 0, burnT: 0, burnDps: 0,
                summonCd: 0, blinkCd: 0, wardCd: 0, ward: 0, enraged: false, cast: 0,
              });
              ring(ep.x, ep.y, "#c44dff", 30 + i * 8);
            }
            e.cast = 1.1;
            g.bossCast = { skill: BOSS_SKILLS[0].name, tell: `${ENEMY_TYPES[e.type].name} ${BOSS_SKILLS[0].tell}`, color: BOSS_SKILLS[0].color, t: 2.2 };
            sfx.summon();
          }
          e.blinkCd -= dt;
          if (e.blinkCd <= 0) {
            e.blinkCd = BOSS_BLINK_CD;
            const from = pathPos(e.d);
            e.d = Math.min(e.d + 120, PATH_LEN - 4);
            const to = pathPos(e.d);
            ring(from.x, from.y, "#35e0ff", 26);
            ring(to.x, to.y, "#35e0ff", 34);
            burst(to.x, to.y, "#35e0ff", 14, 200);
            e.cast = 0.9;
            g.bossCast = { skill: BOSS_SKILLS[1].name, tell: `${ENEMY_TYPES[e.type].name} ${BOSS_SKILLS[1].tell}`, color: BOSS_SKILLS[1].color, t: 2.2 };
            sfx.hover();
          }
          e.wardCd -= dt;
          if (e.wardCd <= 0 && e.hp / e.max < 0.85) {
            e.wardCd = BOSS_WARD_CD;
            e.ward = BOSS_WARD_TIME;
            e.cast = 1.1;
            g.bossCast = { skill: BOSS_SKILLS[2].name, tell: `${ENEMY_TYPES[e.type].name} ${BOSS_SKILLS[2].tell}`, color: BOSS_SKILLS[2].color, t: 2.2 };
          }
        }
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
      if (isBossType(e.type)) {
        // ward bubble
        if (e.ward > 0) {
          ctx.globalAlpha = 0.35 + 0.25 * Math.sin(now / 90);
          ctx.strokeStyle = "#8fb0ff";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, et.r + 11, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        // enraged: embers rising off the boss
        if (e.enraged) {
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = "#ff4d5e";
          for (let i = 0; i < 3; i++) {
            const t2 = (now / 400 + i / 3) % 1;
            ctx.beginPath();
            ctx.arc(Math.sin((now / 300 + i) * 2) * (et.r * 0.7), -et.r - t2 * 26, 3 * (1 - t2), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
        if (e.cast > 0) {
          ctx.globalAlpha = Math.min(0.6, e.cast);
          ctx.strokeStyle = "#ffcf4d";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, et.r + 18 * (1 - e.cast / 1.2), 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
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
        const age = 0.9 - t.life;
        ctx.globalAlpha = al;
        ctx.textAlign = "center";
        if (t.crit) {
          // punchy overshoot: snaps in at 1.35x then settles
          const pop = 1 + 0.45 * Math.max(0, 1 - age * 5) + 0.08 * Math.sin(age * 22) * Math.max(0, 1 - age * 3);
          ctx.save();
          ctx.translate(t.x, t.y);
          ctx.scale(pop, pop);
          if (age < 0.32) {
            // eight gold rays behind the number
            ctx.save();
            ctx.rotate(age * 1.6);
            ctx.globalAlpha = al * (1 - age / 0.32) * 0.85;
            ctx.fillStyle = t.color;
            for (let r = 0; r < 8; r++) {
              ctx.rotate(Math.PI / 4);
              ctx.beginPath();
              ctx.moveTo(0, -t.size * 0.9);
              ctx.lineTo(t.size * 0.16, -t.size * 1.75);
              ctx.lineTo(-t.size * 0.16, -t.size * 1.75);
              ctx.closePath();
              ctx.fill();
            }
            ctx.restore();
            ctx.globalAlpha = al;
          }
          ctx.font = `700 ${t.size}px Bungee, Rajdhani, sans-serif`;
          ctx.lineJoin = "round";
          ctx.strokeStyle = "rgba(20,8,0,0.92)";
          ctx.lineWidth = Math.max(4, t.size * 0.22);
          ctx.strokeText(t.txt, 0, 0);
          const grad = ctx.createLinearGradient(0, -t.size * 0.8, 0, t.size * 0.35);
          grad.addColorStop(0, "#fffbe6");
          grad.addColorStop(0.45, t.color);
          grad.addColorStop(1, "#ff7a1a");
          ctx.fillStyle = grad;
          ctx.fillText(t.txt, 0, 0);
          ctx.restore();
          ctx.globalAlpha = al;
          continue;
        }
        ctx.font = `700 ${t.size}px Rajdhani, sans-serif`;
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
  const cost = g ? spCost(g.spSpend) : SP_BASE_COST;
  const ascentCost = g ? spCost(g.ascSpend) : SP_BASE_COST;

  /**
   * ASCENT is a button on the tower itself now — no dragging.
   * Pressing it ascends every deployed tower of that same type at once.
   */
  const ascendTower = (uid: number) => {
    const gg = gRef.current;
    const t = gg?.towers.find((x) => x.uid === uid);
    if (!gg || !t) return;
    const family = gg.towers.filter((x) => x.def.id === t.def.id);
    const open = family.filter((x) => x.bLv < MAX_BATTLE_LEVEL);
    if (!open.length) {
      sfx.error();
      push(`${t.def.name} is already at battle level ${MAX_BATTLE_LEVEL}`, "#ff4d5e");
      return;
    }
    const cost = spCost(gg.ascSpend);
    if (gg.sp < cost) {
      sfx.error();
      push("Not enough SP", "#ff4d5e");
      return;
    }
    ascendRef.current(uid);
  };

  const maxRounds = BATTLE_ROUNDS;

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
      {/* TOP BAR — lineup left / status right */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1.5 px-3 pt-2">
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => {
            const t = g?.towers.find((x) => x.lineupIdx === i);
            return (
              <div
                key={i}
                className="tile relative flex h-[58px] w-[78px] flex-col items-center justify-center"
                style={{
                  borderColor: t ? RARITY[t.def.rarity].color : "#3a2c74",
                  opacity: t ? 1 : 0.45,
                }}
              >
                {t ? (
                  <>
                    <span className="badge-num absolute -left-1.5 -top-1.5" style={{ borderColor: RARITY[t.def.rarity].color }}>
                      {t.bLv}
                    </span>
                    <div key={`s${i}-${t.points}`}>
                      <TowerIcon def={t.def} size={32} />
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold leading-none">
                      <span style={{ color: ptColor(t.points) }}>
                        {t.points >= MAX_POINTS ? "MAX PTS" : `${t.points} pts`}
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
            className="cta-banner ml-1 h-[54px] shrink-0 px-3 text-[12px] leading-tight"
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
            <span data-testid="sp-chip" className="pill-dark text-[11px] text-[#7fe9ff]" style={{ borderColor: "#1f6f8c" }}>
              <span className="num">{Math.floor(g.sp)}</span> SP
            </span>
            <span className="pill-dark text-[11px] text-[#ffcf4d]" style={{ borderColor: "#8a6a1a" }}>
              <CoinIcon size={17} />
              <span className="num">{Math.floor(g.gold)}</span>
            </span>
            <span
              className="pill-dark text-[11px]"
              style={{ borderColor: g.lives <= 5 ? "#8a0f1e" : "#5c2532", color: g.lives <= 5 ? "#ff4d5e" : "#ff8f9a" }}
            >
              <svg width="17" height="17" viewBox="0 0 20 20">
                <path d="M10 17S2 11.5 2 6.6C2 4 4 2.5 6 2.5c1.6 0 3 .8 4 2.2 1-1.4 2.4-2.2 4-2.2 2 0 4 1.5 4 4.1C18 11.5 10 17 10 17z" fill="#ff4d5e" />
              </svg>
              <span className="num" style={{ color: g.lives <= 5 ? "#ff4d5e" : "#fff" }}>{g.lives}</span>
            </span>
            {mode === "endless" ? (
              <span className="pill-dark text-[11px] text-[#ff9be9]" style={{ borderColor: "#7a2f6a" }}>
                <span className="num">WAVE {g.round}</span> ENDLESS
              </span>
            ) : (
              <span className="pill-dark text-[11px] text-[#ffcf4d]" style={{ borderColor: "#8a6a1a" }}>
                <span className="num">
                  {Math.min(g.round, maxRounds)}/{maxRounds}
                </span>{" "}
                ROUND
              </span>
            )}
            <span className="pill-dark text-[11px] text-[var(--dim)]">
              <span className="num">{g.enemies.length + g.spawnQ.length}</span> left
            </span>
            {/* the run shop moved up here so the ascent cards get the whole bottom bar */}
            <button
              data-testid="battle-shop"
              onClick={() => {
                sfx.click();
                setShopOpen(true);
              }}
              className="tile tile-hover flex shrink-0 cursor-pointer items-center gap-1.5 px-2.5 py-1"
              style={{ borderColor: "#1f7a4a" }}
            >
              <span className="text-[15px] leading-none">🛒</span>
              <span className="font-disp text-[11px] leading-none text-[#8effc4]">SHOP</span>
              <span className="text-[10px] font-bold leading-none text-[var(--dim)]">🪙 {Math.floor(g.gold)}</span>
            </button>
            {g.odT > 0 && (
              <span className="pill-dark text-[11px] text-[#8effc4]" style={{ borderColor: "#1f7a4a" }}>
                OVERDRIVE <span className="num">{g.odT.toFixed(0)}s</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* CANVAS */}
      <div className="relative min-h-0 flex-1">
        <div className="scroll-thin h-full w-full overflow-auto">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="mx-auto block"
            style={{ touchAction: "none", cursor: "grab" }}
          />
        </div>
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
        {/* boss health bar — appears while a boss is on the path */}
        {g && (() => {
          const bosses = g.enemies.filter((e) => !e.dead && isBossType(e.type));
          if (!bosses.length) return null;
          const e = bosses.reduce((a, b) => (a.hp / a.max > b.hp / b.max ? a : b));
          const et = ENEMY_TYPES[e.type];
          const frac = Math.max(0, e.hp / e.max);
          return (
            <div data-testid="boss-bar" className="pointer-events-none absolute left-1/2 top-[62px] z-20 w-[430px] max-w-[92%] -translate-x-1/2">
              <div className="panel panel-flat px-3 py-2" style={{ borderColor: `${et.color}88`, boxShadow: `0 0 22px ${et.color}44` }}>
                <div className="flex items-center gap-2">
                  <span className="font-disp text-[13px] leading-none" style={{ color: et.color }}>
                    {et.name.toUpperCase()}
                  </span>
                  {e.enraged && <span className="rounded bg-[#ff4d5e] px-1 text-[9px] font-bold leading-tight text-black">ENRAGED</span>}
                  {e.ward > 0 && <span className="rounded bg-[#8fb0ff] px-1 text-[9px] font-bold leading-tight text-black">WARD {e.ward.toFixed(1)}s</span>}
                  <span className="ml-auto text-[10px] font-bold text-[var(--dim)]">
                    {bosses.length > 1 ? `${bosses.length} BOSSES` : `${Math.ceil(frac * 100)}%`}
                  </span>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full border border-black/60 bg-black/70">
                  <div
                    className={`h-full rounded-full ${e.enraged ? "boss-bar-rage" : "boss-bar"}`}
                    style={{ width: `${frac * 100}%`, background: `linear-gradient(90deg, ${et.color}, #ffcf4d)` }}
                  />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  {BOSS_SKILLS.map((sk) => (
                    <span
                      key={sk.id}
                      className="rounded px-1.5 py-0.5 text-[9px] font-bold leading-tight"
                      style={{
                        background: g.bossCast?.skill === sk.name ? sk.color : "rgba(0,0,0,0.45)",
                        color: g.bossCast?.skill === sk.name ? "#160a2c" : sk.color,
                        border: `1px solid ${sk.color}66`,
                      }}
                    >
                      {sk.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* skill callout when a boss fires something */}
        {g?.bossCast && (
          <div
            key={g.bossCast.skill}
            data-testid="boss-cast"
            className="boss-cast pointer-events-none absolute left-1/2 bottom-[86px] z-20 -translate-x-1/2 whitespace-nowrap rounded-xl border-2 px-3 py-1 text-center"
            style={{ borderColor: g.bossCast.color, background: "rgba(10,5,26,0.86)", boxShadow: `0 0 24px ${g.bossCast.color}66` }}
          >
            <span className="font-disp text-[13px]" style={{ color: g.bossCast.color }}>
              {g.bossCast.skill.toUpperCase()}
            </span>
            <span className="ml-2 text-[11px] font-bold text-[var(--txt)]">{g.bossCast.tell}</span>
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
        {g && (() => {
          const hLv = heroLevel(save, heroDef.id);
          const total = Math.max(0.001, heroCooldown(heroDef.cd, hLv));
          const frac = Math.max(0, Math.min(1, g.heroCd / total));
          const R = 32;
          const CIRC = 2 * Math.PI * R;
          return (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => heroRef.current()}
              data-testid="hero-card-battle"
              className={`frame-gold anim-pop absolute bottom-3 right-3 z-20 flex w-[128px] flex-col items-center gap-0.5 px-2 py-2 transition-transform active:scale-95 ${heroReady ? "hero-ready" : ""}`}
              style={{
                borderColor: heroReady ? heroDef.color : "#4a3a5a",
                boxShadow: heroReady ? `0 0 26px ${heroDef.color}77, 0 4px 0 #8a5200` : "0 4px 0 #1a1230",
                opacity: heroReady ? 1 : 0.85,
              }}
            >
              <span className={`badge-num absolute -left-2 -top-2 ${hLv > 1 ? "" : "dim"}`}>
                {hLv >= HERO_MAX_LEVEL ? "MAX" : `Lv ${hLv}`}
              </span>
              {/* cooldown ring sweeps around the portrait while the skill recharges */}
              <span className="relative grid place-items-center" style={{ width: 76, height: 76 }}>
                <svg width="76" height="76" viewBox="0 0 76 76" className="absolute inset-0 -rotate-90">
                  <circle data-testid="hero-ring-track" cx="38" cy="38" r={R} fill="none" stroke="#2a1d4d" strokeWidth="5" />
                  <circle
                    data-testid="hero-ring"
                    cx="38"
                    cy="38"
                    r={R}
                    fill="none"
                    stroke={heroReady ? "#3dff8e" : heroDef.color}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    strokeDashoffset={heroReady ? 0 : CIRC * frac}
                    style={{ transition: "stroke-dashoffset 120ms linear", filter: heroReady ? "drop-shadow(0 0 6px #3dff8e)" : "none" }}
                  />
                </svg>
                <span
                  className={`grid h-[52px] w-[52px] place-items-center rounded-full ${heroReady ? "" : "hero-cooling"}`}
                  style={{
                    background: heroReady ? `radial-gradient(circle, ${heroDef.color}44, transparent 70%)` : "radial-gradient(circle, rgba(20,12,44,.9), rgba(10,5,26,.95))",
                  }}
                >
                  <HeroIcon kind={heroDef.kind} size={42} color={heroReady ? heroDef.color : "#6f6390"} />
                </span>
                {!heroReady && (
                  <span className="absolute font-disp text-[15px] leading-none text-[#efe9ff] drop-shadow-[0_1px_2px_rgba(0,0,0,.9)]">
                    {Math.ceil(g.heroCd)}
                  </span>
                )}
                {heroReady && <span className="hero-ping absolute inset-0 rounded-full" />}
              </span>
              <span className="font-disp mt-0.5 text-center text-[11px] leading-tight" style={{ color: heroReady ? heroDef.color : "#8a7a9a" }}>
                {heroDef.name.toUpperCase()}
              </span>
              {!heroReady ? (
                <span className="text-[10px] font-bold leading-tight tracking-wider text-[var(--dim)]">COOLDOWN</span>
              ) : (
                <span className="text-[11px] font-bold leading-tight text-[#3dff8e]">READY — TAP</span>
              )}
            </button>
          );
        })()}
        <button
          className="btn absolute right-3 top-2 px-3 py-1 text-[11px]"
          onClick={() => {
            sfx.click();
            onExit();
          }}
        >
          Abandon
        </button>

      {/* arena zoom */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-1.5">
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border-2 border-[#f5b73d88] bg-[#1a1236f2] px-1.5 py-1 shadow-[0_4px_0_#0d0827]">
          <button
            className="grid h-7 w-7 place-items-center rounded-lg bg-black/40 text-[17px] font-bold leading-none text-[var(--txt)] transition hover:bg-black/70"
            onClick={() => changeZoom(zoom - 0.1)}
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="min-w-[46px] text-center text-[12px] font-bold text-[#ffcf4d]" data-testid="zoom">
            ZOOM {Math.round(zoom * 100)}%
          </span>
          <button
            className="grid h-7 w-7 place-items-center rounded-lg bg-black/40 text-[17px] font-bold leading-none text-[var(--txt)] transition hover:bg-black/70"
            onClick={() => changeZoom(zoom + 0.1)}
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
      </div>

      </div>

      {/* BOTTOM BAR — one card per deployed tower, each with its own ASCENT button */}
      {g && (
        <div className="flex shrink-0 items-stretch gap-2 px-3 py-2">
          {/* the six tower slots */}
          {Array.from({ length: 6 }).map((_, i) => {
            const t = g.towers.find((x) => x.lineupIdx === i);
            const maxed = t ? t.bLv >= MAX_BATTLE_LEVEL : false;
            // every copy of this tower type ascends together
            const family = t ? g.towers.filter((x) => x.def.id === t.def.id).length : 0;
            const canAscend = !!t && !maxed && g.sp >= ascentCost;
            return (
              <div
                key={i}
                data-slot={i}
                className="tile flex min-w-0 flex-1 flex-col gap-1 px-2 py-1.5"
                style={{ opacity: t ? 1 : 0.45 }}
              >
                {t ? (
                  <>
                    <div className="flex items-center gap-2">
                      <TowerIcon def={t.def} size={34} />
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
                      </div>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-black/50">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(t.bLv / MAX_BATTLE_LEVEL) * 100}%`,
                          background: "linear-gradient(90deg,#35e0ff,#c44dff)",
                        }}
                      />
                    </div>
                    {/* the ascent button lives ON the tower now — no dragging */}
                    <button
                      data-testid={`ascend-${i}`}
                      disabled={!canAscend}
                      onClick={() => {
                        if (!canAscend) {
                          sfx.error();
                          push(maxed ? `${t.def.name} is already maxed` : "Not enough SP", "#ff4d5e");
                          return;
                        }
                        ascendTower(t.uid);
                      }}
                      className={`ascend-btn ${canAscend ? "on" : ""}`}
                    >
                      {maxed ? "MAX LEVEL" : (<><span>ASCENT</span><b>SP {ascentCost}{family > 1 ? ` ×${family}` : ""}</b></>)}
                    </button>
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

      {/* BOSS CUTSCENE — the wave holds while the boss makes an entrance */}
      {g?.cut && (
        <div
          data-testid="boss-cutscene"
          className="absolute inset-0 z-[98] flex items-center justify-center overflow-hidden"
          onClick={() => {
            if (g) g.cut = null;
          }}
        >
          <div className="boss-backdrop absolute inset-0" />
          <div className="relative flex flex-col items-center px-6 text-center">
            <div className="boss-cut-ring absolute" style={{ width: 340, height: 340, borderColor: `${ENEMY_TYPES[g.cut.type].color}aa` }} />
            <div className="boss-cut-ring absolute" style={{ width: 340, height: 340, borderColor: "#ffcf4d55", animationDelay: "0.45s" }} />
            <div className="boss-cut-in relative">
              <div className="text-[12px] font-bold tracking-[0.5em] text-[#ffcf4d]">WARNING</div>
              <div
                className="font-disp mt-2 text-5xl"
                style={{ color: ENEMY_TYPES[g.cut.type].color, textShadow: `0 0 34px ${ENEMY_TYPES[g.cut.type].color}` }}
              >
                {g.cut.name.toUpperCase()}
              </div>
              <div className="mt-2 text-[13px] font-bold tracking-[0.3em] text-[var(--txt)]">{g.cut.sub}</div>
              <div className="mt-3 flex items-center justify-center gap-2">
                {BOSS_SKILLS.map((sk) => (
                  <span
                    key={sk.id}
                    className="rounded-md border px-2 py-0.5 text-[10px] font-bold"
                    style={{ borderColor: `${sk.color}88`, color: sk.color, background: "rgba(0,0,0,0.4)" }}
                  >
                    {sk.name}
                  </span>
                ))}
              </div>
              <div className="mt-5 text-[11px] font-bold tracking-[0.25em] text-[var(--dim)]">
                TAP TO CONTINUE · {Math.max(0, Math.ceil(g.cut.t))}s
              </div>
            </div>
          </div>
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
