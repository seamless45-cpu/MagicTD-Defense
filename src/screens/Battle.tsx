import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tr } from "../game/i18n";
import type { EnemyType } from "../game/data";
import type { SaveData } from "../game/save";
import { addChips, addMonthPoints, applyBattleTrophies, bumpQuest, bumpTask, clampZoom, collectGauntlet, gauntletChoices as offerBoons, hardcorePlaysLeft, heroLevel, superHardcorePlaysLeft, weekStr } from "../game/save";
import { FullscreenButton } from "./Menus";
import { sfx } from "../game/audio";
import {
  TOWERS,
  TOWER_BY_ID,
  RARITY,
  ENEMY_TYPES,
  enemySpawnInterval,
  roundHp,
  HP_GROWTH,
  BOSS_HP_MUL,
  BOSS_TYPES,
  GEM_RUSH_SECONDS,
  GEM_RUSH_HP_MUL,
  GEM_RUSH_SPEED_MUL,
  gemRushKillGems,
  ENEMY_HP_SCALE,
  ELITE_HP_MUL,
  powerPlantNetworkScale,
  shortHp,
  runGold,
  waveComp,
  WAVE_ENEMY_COUNT,
  BATTLE_ROUNDS,
  MAX_BATTLE_LEVEL,
  MAX_POINTS,
  POINT_STEP,
  POINT_DMG_STEP,
  ASC_DMG_MUL,
  towerDamage,
  SP_BASE_COST,
  ASC_BASE_COST,
  ascSpCost,
  killSp,
  monthlyEventForDate,
  monthlyEventBonus,
  type MonthlyBonus,
  spCost,
  spawnBudget,
  REWARD_MUL,
  reward,
  isBossType,
  BOSS_SKILL_BY_ID,
  BOSS_SUMMON_CD,
  BOSS_BLINK_CD,
  BOSS_WARD_CD,
  BOSS_ENRAGE_AT,
  BOSS_NULL_CD,
  BOSS_NULL_RADIUS,
  BOSS_NULL_SLOW,
  BOSS_NULL_TIME,
  BOSS_DEVOUR_CD,
  BOSS_DEVOUR_HEAL,
  BOSS_METEOR_CD,
  BOSS_METEOR_COUNT,
  BOSS_METEOR_DOWN,
  BOSS_CHAINS_CD,
  BOSS_CHAINS_RADIUS,
  BOSS_CHAINS_TIME,
  BOSS_CHAINS_DR,
  BOSS_WARP_CD,
  BOSS_WARP_DIST,
  BOSS_WARCRY_CD,
  BOSS_WARCRY_RADIUS,
  BOSS_WARCRY_TIME,
  BOSS_WARCRY_HASTE,
  BOSS_CLEAVE_CD,
  BOSS_CLEAVE_DOWN,
  BOSS_BANNER_CD,
  BOSS_BANNER_TIME,
  BOSS_BANNER_ARMOR,
  BOSS_QUAKE_CD,
  BOSS_QUAKE_RADIUS,
  BOSS_QUAKE_DOWN,
  BOSS_UNDERTOW_CD,
  BOSS_UNDERTOW_PULL,
  BOSS_SIPHON_CD,
  BOSS_SIPHON_SP,
  BOSS_SIPHON_HEAL,
  BOSS_OVERCHARGE_CD,
  BOSS_OVERCHARGE_TARGETS,
  BOSS_OVERCHARGE_DOWN,
  BOSS_MAELSTROM_CD,
  BOSS_MAELSTROM_DIST,
  ENEMY_SPEED_MUL,
  HARDCORE_DAILY_PLAYS,
  SUPER_HARDCORE_WEEKLY_PLAYS,
  HARDCORE_LIVES,
  HARDCORE_SPAWN_MUL,
  MODE_RULES,
  modeSpeedMul,
  critAllowed,
  hardcoreEnemyHp,
  hardcoreSpawnPlan,
  isRunMode,
  payoutMul,
  inductionBonus,
  heroAwkSpec,
  boltThreshold,
  boltResetChance,
  boltResetInterval,
  bossKit,
  CRIT_CHANCE,
  critBonusFrom,
  critMultiplierFrom,
  trophyStreakBonus,
  towerUpgradeCount,
  fmtCritPct,
  HERO_BY_ID,
  HERO_MAX_LEVEL,
  heroCooldown,
  heroPower,
  OVERDRIVE_ASPD,
  OVERDRIVE_DMG,
  OVERDRIVE_TIME,
  SLOW_VULN,
  RUN_SHOP,
  ROMAN,
  crystalBonus,
  GAUNTLET_BOONS,
  type GauntletBoon,
  WRAITH_TYPE,
  HOUND_TYPE,
  GOLEM_TYPE,
  LEVIATHAN_TYPE,
  eventBonus,
  eventForDate,
  trophyDelta,
  type AwkSpec,
  type ChipBag,
  runShopCost,
  towerArt,
  type TowerDef,
  type GameMode,
  type HeroKind,
  type RunShopItem,
} from "../game/data";
import { SKILLS } from "../game/skills";
import { TowerIcon, useToasts, Toasts, CoinIcon, ChipIcon, HeroIcon, TrophyIcon, GemIcon, TokenIcon, ShardIcon, PotionIcon, ViewportPortal } from "../components/ui";

/**
 * The weekday event is resolved once per module load: it modifies enemy health,
 * payouts and the trophy swing for every run played today.
 */
const LIVE_EVENT = eventForDate();
const EV_BONUS = eventBonus(LIVE_EVENT.id);
const LIVE_MONTH = monthlyEventForDate();
const MONTH_BONUS: MonthlyBonus = monthlyEventBonus(LIVE_MONTH.id);

// ---------- board geometry ----------
// Restore the original seven-column, four-row arena route and place its board
// lower in the viewport, as requested.
const W = 1000;
const H = 580;
const C = 104;
const COLS = 7;
const ROWS = 4;
const OX = (W - COLS * C) / 2;
const OY = (H - ROWS * C) / 2 + 48;

const WPTS: [number, number][] = [
  [-0.7, 0],
  [0, 0],
  [0, 3],
  [6, 3],
  [6, 0],
  [6, -0.7],
];

/** Towers used to be limited to a 236px bubble around their cell. They are not
 *  any more: every tower reaches the whole lane through the grid (see ENERGY
 *  TARGETING), so the guide draws an arena-wide field instead of a range ring. */

const cellCenter = (c: number, r: number) => ({ x: OX + (c + 0.5) * C, y: OY + (r + 0.5) * C });
const isPathCell = (c: number, r: number) => c === 0 || c === 6 || r === 3;
const isLightningTower = (def: TowerDef) => ["lightning", "tesla", "storm", "thundercrown", "ion"].includes(def.kind);

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
/**
 * Hardcore modes open a SECOND spawn gate on the bottom lane (cell 3,3). Its
 * path distance is resolved once: everything up to that cell, measured along
 * the real lane, so a body spawned there walks the rest of the route.
 */
const GATE_B = cellCenter(3, 3);
const GATE_B_D = SEGS[0].len + SEGS[1].len + (GATE_B.x - cellCenter(0, 3).x);
const hasSecondGate = (mode: GameMode) => mode === "hardcore" || mode === "superhardcore";

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

/**
 * An enemy's real position: its place along the path, plus any lateral offset
 * the Singularity pull has dragged it to. Everything that targets, draws or
 * measures an enemy goes through this, so skill displacement is consistent.
 */
function enemyPos(e: { d: number; ox: number; oy: number; pd?: number }) {
  const p = pathPos(e.d);
  return { x: p.x + e.ox, y: p.y + e.oy };
}

// ---------- entity types ----------
interface Enemy {
  id: number;
  d: number;
  /** two snapshots for monotonic Hermite interpolation */
  ppd?: number;
  ppox?: number;
  ppoy?: number;
  /** previous-step path distance and lateral offsets */
  pd?: number;
  pox?: number;
  poy?: number;
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
  /** elite variant: tougher, pays 5x sp and drops double gold */
  elite?: boolean;
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
  /** Null Field / Soul Devour / Meteor Fall / Rift Chains / Warp Surge timers */
  nullCd: number;
  devourCd: number;
  meteorCd: number;
  chainsCd: number;
  warpCd: number;
  /** boss-exclusive skill timers (3 per kit, staggered on spawn) */
  exCd: [number, number, number];
  /** damage reduction from Rift Chains (minions shielded by their boss) */
  link: number;
  /** seconds of damage reduction left on the Bulwark skill */
  ward: number;
  enraged: boolean;
  /** boss bar flash timer when a skill fires */
  cast: number;
  /** the boss has already announced its signature skill on arrival */
  barked?: boolean;
  /** ---------- skill state ---------- */
  /** Absolute Zero: seconds left encased in ice (doubles damage taken) */
  encased: number;
  /** Storm Sovereign: seconds left marked with static (re-arcs on death) */
  mark: number;
  /** Electrical Induction: shield cut multiplier (1.2 = 120%) */
  shieldCut?: number;
  /** seconds left of the shield cut */
  shieldCutT?: number;
  /** Bolt from the Blue already fired at this enemy */
  boltHit?: boolean;
  /** the killing blow came from lightning (pays induction bonuses) */
  lightKill?: boolean;
  /** white hit-flash timer, driven by dealDamage */
  flash?: number;
  /** War Cry / Maelstrom: seconds left sprinting */
  rage?: number;
  /** Iron Banner: seconds left with the armour plate */
  plating?: number;
  /** Singularity: seconds left being dragged toward the rift */
  pulled: number;
  /** lateral offset from the path, used by the singularity pull */
  ox: number;
  oy: number;
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
  owner: string;
  atkMul: number;
  /** live visual intensity of a Power Plant aura on this tower */
  plantGlow?: number;
  /** Null Field: seconds left hexed (fires much slower) */
  hexT: number;
  /** Meteor Fall: seconds left offline (cannot fire at all) */
  downT: number;
  /** seconds until this tower's active skill auto-casts again */
  skillCd?: number;
  /** Super Clone surge: seconds left of the attack-speed rush */
  hasteT: number;
  /** Super Clone surge: extra attack-speed multiplier (2 = +200%) */
  hasteMul: number;
  /** Heavenly God blessing: seconds left of the merge surge */
  surgeT: number;
  /** Heavenly God blessing: attack + attack-speed multiplier (3 = +300%) */
  surgeMul: number;
  /** Honor Emperor: permanent attack/attack-speed share handed over by honors */
  honorMul: number;
  /** Supervisor's permanent +ATK-speed buff; removed with this tower */
  superBuff: number;
}
/**
 * ONE SKY BOLT. A strike is no longer a straight pillar: it is a segmented
 * polyline from above the arena down to the impact point, with a 100 Hz
 * changing lateral channel and forked branches. Offsets are reused in a typed
 * buffer so the 10ms flicker adds no geometry allocations.
 */
interface Strike {
  x: number;
  y: number;
  life: number;
  max: number;
  width: number;
  color: string;
  seed: number;
  /** how far above the arena the channel starts (px) */
  top?: number;
  /** forks drawn off the main channel */
  forks?: number;
  /** main channel colour for the core stroke (defaults to white) */
  core?: string;
  /** extra zig-zag segments on the channel (jaggedness) */
  jag?: number;
  /** lateral jitter multiplier (1 = standard) */
  jit?: number;
  /** preallocated lateral offsets, refreshed at 100 Hz (10 ms) */
  jitter?: Float32Array;
  lastJit?: number;
  points?: { x: number; y: number }[];
}

/** a falling rock telegraphed by a boss — the shadow grows, then it lands */
interface Met {
  x: number;
  y: number;
  t: number;
  total: number;
  uid: number;
  color: string;
  done?: boolean;
  /** friendly rocks (Starfall) carry damage instead of knocking towers offline */
  dmg?: number;
  blast?: number;
  tw?: BT;
  heavy?: boolean;
  asteroid?: boolean;
  directId?: number;
  /** seconds until the next ember is shed while an asteroid falls */
  emitT?: number;
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
  meteorChance?: number;
  asteroidChance?: number;
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
  /** ground-slam shots throw a bigger shockwave on impact */
  shockwave?: boolean;
  /** Eclipse Oracle: how far the implosion drags enemies back along the lane */
  pull?: number;
  /** Seraph / choir shots: secondary link colour */
  chainColor?: string;
  /** armour shredded off the target on hit */
  shred?: number;
  /** a shot boosted by a Heavy-type awakening: drawn bigger */
  heavy?: boolean;
  /** Heavenly God laser: how many enemies behind the target it also burns */
  behind?: number;
  /** Heavenly God laser: damage share the enemies behind the target take */
  behindMul?: number;
  /** splash damage as a share of the shot's own damage (1 = full damage) */
  blastDmg?: number;
  /** this shot always crits (overcharged lances, fireballs) */
  alwaysCrit?: boolean;
  /** previous-frame position, for frame interpolation */
  px?: number;
  py?: number;
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
  /** jitter multiplier (1 = standard) */
  jit?: number;
}
interface Part {
  x: number;
  y: number;
  /** previous-frame position, for frame interpolation */
  px?: number;
  py?: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: "spark" | "ring" | "smoke" | "glow" | "shard" | "shock" | "star" | "ember" | "rune" | "wave" | "sparkle";
  /** rotation + spin, used by shards and stars */
  rot?: number;
  /** previous-frame rotation, interpolated alongside the position */
  prot?: number;
  spin?: number;
  /** gravity multiplier */
  grav?: number;
  /** drag per second */
  drag?: number;
  /** additive blending */
  add?: boolean;
}

/** a persistent ground effect left behind by a hero ultimate */
interface Zone {
  x: number;
  y: number;
  r: number;
  life: number;
  max: number;
  kind: "lava" | "frost" | "rift" | "hell" | "execution";
  color: string;
  /** damage per second dealt to anything inside */
  dps: number;
  /** slow applied while inside */
  slow: number;
  /** animation seed */
  seed: number;
}

/** one scheduled beat of a hero cast timeline */
interface Cast {
  at: number;
  run: () => void;
}

/** the active hero ultimate, drawn as an overlay while it resolves */
interface ActiveSkill {
  heroId: string;
  name: string;
  color: string;
  color2: string;
  kind: HeroKind;
  /** seconds elapsed and total */
  t: number;
  total: number;
  /** current phase caption */
  phase: string;
  /** singularity anchor, when the skill uses one */
  sx: number;
  sy: number;
}
interface FT { x: number; y: number; py?: number; txt: string; color: string; size: number; life: number; crit: boolean }

interface G {
  mode: GameMode;
  heroId: string;
  t: number;
  phase: "deploy" | "wave" | "inter" | "boon" | "won" | "lost";
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
  /** shop-bought and crystal attack bonus for this run (+% as a fraction) */
  dmgBonus: number;
  /** Superbolt crystal bonus for lightning-family towers */
  lightningBonus: number;
  /** Mana Conduit purchases: share of extra SP from kills and wave clears */
  spGainMul: number;
  /** Keen Sight purchases: flat crit chance added for this run */
  critRate: number;
  /** Killing Edge purchases: flat crit damage added for this run */
  critDmg: number;
  /** extra attack speed bought in the run shop (plus the Amethyst crystal) */
  bonusAspd: number;
  /** crystal Topaz folded into every gold payout of the run */
  goldMul: number;
  /** total enemies scheduled for the current wave (for the wave progress bar) */
  waveTotal: number;
  /** enemies spawned so far this wave */
  waveSpawned: number;
  /** gauntlet: boons banked this run, and the three currently on offer */
  boons: GauntletBoon[];
  boonOffer: GauntletBoon[] | null;
  /** what has been bought in the run shop this battle */
  shopBought: Record<string, number>;
  /** fps counter for the performance HUD */
  fps: number;
  fpsT: number;
  frames: number;
  sp: number;
  /** crits landed this run + the biggest single hit, for the HUD */
  crits: number;
  bestHit: number;
  /** Meteor Fall telegraphs waiting to land */
  meteors: Met[];
  /** vertical lightning pillars (Lightning Princess) */
  strikes: Strike[];
  /** summons bought this run — drives the summon price */
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
  /** boss cutscene: name + how long the intro card still runs */
  cut: { type: number; name: string; sub: string; t: number; total: number; locked?: boolean } | null;
  /** banner text for the last boss skill that fired */
  bossCast: { skill: string; tell: string; color: string; t: number } | null;
  /** last round whose boss cutscene already played */
  bossIntro: number;
  /** seconds remaining in Sunday Gem Rush */
  gemRushRemaining: number;
  /** provisional gems earned by kills; paid only when the event ends */
  gemRushGems: number;
  /** seconds of immunity to all boss skills */
  bossImmunityT: number;
  /** selected next boss and its automatic roulette animation */
  nextBossType: number | null;
  /** shuffled draw pile: every boss appears once before the cycle repeats */
  bossDeck: number[];
  roulette: { type: number; t: number; total: number } | null;
  shake: number;
  redFlash: number;
  /** persistent ground effects (lava pools, frost fields, the singularity) */
  zones: Zone[];
  /** queued beats of the running hero cast */
  casts: Cast[];
  /** the hero ultimate currently resolving */
  skill: ActiveSkill | null;
  /** full-screen colour flash: { color, life, max } */
  flash: { color: string; life: number; max: number } | null;
  /** simulation time scale — Time Dilation and impact hit-stop drive this */
  timeScale: number;
  /** seconds of hit-stop left (freezes the sim for punch on big hits) */
  hitStop: number;
  /** radial zoom punch 0..1, decays every frame */
  punch: number;
  /** chromatic aberration strength 0..1 */
  chroma: number;
  /** hero ultimates cast this run — banked into the daily task on collect */
  skillCasts: number;
  /** waves cleared this run — banked into the daily task on collect */
  wavesCleared: number;
  /** an upgrade/ascend flourish playing on the board */
  levelFx: { x: number; y: number; color: string; label: string; t: number; total: number; tier: number }[];
  tokensAwarded: boolean;
  final: null | {
    won: boolean;
    gold: number;
    gems: number;
    tokens: number;
    frags: { id: string; n: number }[];
    rounds: number;
    /** trophy swing applied on collect (Battle only) */
    trophies: number;
    /** crystal potions salvaged from the run */
    potions: number;
    /** chip modules from the Items Finding event */
    chips: ChipBag | null;
    /** gauntlet only: boons taken and whether the run set a new record */
    gauntlet?: { boons: number; record: boolean };
  };
}

/**
 * Canvas text can't inherit a CSS variable, so the picked font is read off the
 * document root once per mount (and whenever Settings flips it) and cached as a
 * ready-to-use font shorthand. Falls back to the shipped faces in jsdom or
 * before fonts.ts has run.
 */
let canvasUiFont = "Rajdhani, sans-serif";
let canvasDispFont = "Bungee, Rajdhani, sans-serif";
function refreshCanvasFonts() {
  if (typeof document === "undefined" || typeof getComputedStyle !== "function") return;
  try {
    const cs = getComputedStyle(document.documentElement);
    const ui = (cs.getPropertyValue("--font-ui") || "").trim();
    const disp = (cs.getPropertyValue("--font-disp") || "").trim();
    if (ui) canvasUiFont = ui;
    if (disp) canvasDispFont = disp;
  } catch {
    // jsdom with no layout — keep the defaults
  }
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

function shuffledBossDeck(exclude: number | null = null): number[] {
  const deck = BOSS_TYPES.filter((type) => type !== exclude);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function newGame(mode: GameMode, save: SaveData, startRound = 1): G {
  // the field starts empty: the opening SP is the player's to spend, so 4 towers
  // have to be summoned before the first wave rolls in
  const towers: BT[] = [];
  // crystal vault buffs are resolved once per run and folded into the same
  // fields the run shop writes to, so everything downstream reads one number
  const crystal = crystalBonus(save.crystals || {});
  const openingBoss = BOSS_TYPES[Math.floor(Math.random() * BOSS_TYPES.length)] || BOSS_TYPES[0];
  const g: G = {
    mode,
    heroId: HERO_BY_ID[save.hero] ? save.hero : "nova",
    heroLv: heroLevel(save, HERO_BY_ID[save.hero] ? save.hero : "nova"),
    dmgBonus: crystal.atk + crystal.magicianKing,
    lightningBonus: crystal.lightning,
    spGainMul: crystal.sp,
    critRate: crystal.crit + crystal.superCritChance,
    critDmg: crystal.critDamage,
    goldMul: 1 + crystal.gold,
    t: 0,
    phase: "deploy",
    phaseT: mode === "endless" || mode === "gemrush" ? 6 : 7,
    round: Math.max(1, startRound),
    // endless and gauntlet have no final wave; maxRounds is display only
    maxRounds: isRunMode(mode) ? BATTLE_ROUNDS : 0,
    lives: MODE_RULES[mode].lives ?? (mode === "endless" || mode === "gemrush" ? 15 : mode === "gauntlet" ? 12 : mode === "hardcore" ? HARDCORE_LIVES : 20) + Math.round(crystal.lives),
    // small field-kit budget so the run shop is useful from wave 1
    gold: 120,
    bonusAspd: crystal.aspd + crystal.magicianKing,
    waveTotal: 0,
    waveSpawned: 0,
    boons: [],
    boonOffer: null,
    shopBought: {},
    fps: 60,
    fpsT: 0,
    frames: 0,
    // enough SP to summon SPAWN_BUDGET_TOWERS towers before wave 1 — towers are
    // never placed for free any more
    sp: spawnBudget(),
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
    cut: null,
    bossCast: null,
    bossIntro: 0,
    gemRushRemaining: mode === "gemrush" ? GEM_RUSH_SECONDS : 0,
    gemRushGems: 0,
    bossImmunityT: 0,
    nextBossType: openingBoss,
    bossDeck: shuffledBossDeck(openingBoss),
    roulette: { type: openingBoss, t: 2.8, total: 2.8 },
    shake: 0,
    redFlash: 0,
    zones: [],
    casts: [],
    skill: null,
    flash: null,
    timeScale: 1,
    hitStop: 0,
    punch: 0,
    chroma: 0,
    levelFx: [],
    skillCasts: 0,
    wavesCleared: 0,
    tokensAwarded: false,
    crits: 0,
    bestHit: 0,
    meteors: [],
    strikes: [],
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
function randBolt(x0: number, y0: number, x1: number, y1: number, color: string, w: number, max: number, now: number, opts?: { jit?: number; jag?: number }): Bolt {
  const n = 12 + (opts?.jag ?? 0);
  const b: Bolt = {
    x0, y0, x1, y1, n,
    off: new Float32Array(n),
    lastJit: 0,
    life: max,
    max,
    w,
    color,
    jit: opts?.jit ?? 1,
  };
  jitBolt(b, now + 5);
  return b;
}
function jitBolt(b: Bolt, now: number) {
  if (now - b.lastJit < 10) return;
  b.lastJit = now;
  const dx = b.x1 - b.x0;
  const dy = b.y1 - b.y0;
  const L = Math.max(1, Math.hypot(dx, dy));
  const amp = Math.min(28.8, L * 0.12); // 20% above the original jaggedness envelope
  const spread = amp * 1.3 * (b.jit ?? 1); // 30% more jitter, scaled per bolt
  for (let i = 0; i < b.n; i++) {
    if (i === 0 || i === b.n - 1) b.off[i] = 0;
    else b.off[i] = (Math.random() - 0.5) * 2 * spread * Math.sin((Math.PI * i) / (b.n - 1));
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

/**
 * True upscaling. The arena renders into an offscreen canvas at the chosen
 * render scale; this presents that frame onto the visible canvas, which is sized
 * to the real on-screen pixels. The WebGL path resamples with hardware bilinear
 * filtering and, in Sharp mode, an edge-restoring unsharp pass at the render
 * scale's texel size, so a low render scale stays crisp instead of mushy.
 * Returns null when WebGL is unavailable, and the caller falls back to a
 * smoothed 2D blit.
 */
const UPSCALE_VS = "attribute vec2 p; varying vec2 v; void main(){ v = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }";
const UPSCALE_FS =
  "precision mediump float; uniform sampler2D t; uniform vec2 px; uniform float sh; varying vec2 v;" +
  "void main(){ vec3 c = texture2D(t, v).rgb;" +
  " if (sh > 0.0) { vec3 n = texture2D(t, v + vec2(px.x, 0.0)).rgb + texture2D(t, v - vec2(px.x, 0.0)).rgb + texture2D(t, v + vec2(0.0, px.y)).rgb + texture2D(t, v - vec2(0.0, px.y)).rgb; c = c + (c - n * 0.25) * sh; }" +
  " gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }";
function createUpscaler(canvas: HTMLCanvasElement, sharp: boolean): { draw: (src: HTMLCanvasElement) => void } | null {
  try {
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false }) as WebGLRenderingContext | null;
    if (!gl) return null;
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    };
    const vs = compile(gl.VERTEX_SHADER, UPSCALE_VS);
    const fs = compile(gl.FRAGMENT_SHADER, UPSCALE_FS);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    if (!prog) return null;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    // one oversized triangle covers the whole viewport
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const uPx = gl.getUniformLocation(prog, "px");
    const uSh = gl.getUniformLocation(prog, "sh");
    gl.uniform1f(uSh, sharp ? 0.45 : 0);
    return {
      draw(src) {
        if (gl.isContextLost()) return;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
        gl.uniform2f(uPx, 1 / src.width, 1 / src.height);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
    };
  } catch {
    return null;
  }
}

// module-scope bridges so the HUD can call engine actions
const heroRef: { current: () => void } = { current: () => {} };
const summonRef: { current: () => void } = { current: () => {} };
const ascendRef: { current: (uid: number) => void } = { current: () => {} };
const shopRef: { current: (item: RunShopItem) => void } = { current: () => {} };

/**
 * Pre-rendered glow sprites. Drawing an additive glow via createRadialGradient
 * every frame per particle was the single biggest source of lag during dense
 * crit streaks; one tiny canvas per colour, drawn with drawImage, is ~free.
 */
/** where in the current sim step to draw (1 = now, 0 = start of step) */
let renderAlpha = 1;
let rawRenderAlpha = 1;
function hermiteLerp(previous2: number | undefined, previous: number, current: number, t: number): number {
  if (previous2 === undefined || !Number.isFinite(previous2)) return previous + (current - previous) * t;
  const t2 = t * t;
  const t3 = t2 * t;
  const m0 = (current - previous2) * 0.5;
  const m1 = current - previous;
  const value = (2 * t3 - 3 * t2 + 1) * previous + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * current + (t3 - t2) * m1;
  // Keep the velocity-aware curve monotonic within this tick; no temporal
  // overshoot at turns, path teleports or boss blink transitions.
  return Math.max(Math.min(previous, current), Math.min(Math.max(previous, current), value));
}

/**
 * Frame-cost governor. Every frame we measure how long `draw()` actually took
 * and slide a quality factor between 1 and 0.4. Dense crit storms are the one
 * thing that can push a phone over budget, so when the frame starts costing
 * real time the FX layer thins itself out automatically: fewer particles, a
 * longer crit throttle, no chromatic pass and no per-hit screen flash. It
 * recovers the moment the frame is cheap again, so a strong device never sees
 * the difference.
 */
const fxGov = { avg: 5, q: 1 };
/** player-chosen ceiling on the same scale (0 = everything, 1 = reduced, 2 = minimal) */
let fxUserLevel = 0;
/** how many FX we are allowed to throw this frame (1 = everything) */
const fxQ = () => (fxUserLevel >= 2 ? 0.25 : fxUserLevel === 1 ? Math.min(fxGov.q, 0.7) : fxGov.q);
const glowSprites = new Map<string, HTMLCanvasElement>();
function glowSprite(color: string): HTMLCanvasElement | null {
  let c = glowSprites.get(color);
  if (c) return c;
  try {
    c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const x = c.getContext("2d") as CanvasRenderingContext2D | null;
    if (!x) return null;
    const gr = x.createRadialGradient(32, 32, 1, 32, 32, 32);
    gr.addColorStop(0, color);
    gr.addColorStop(0.35, color.length === 7 ? color + "88" : color);
    gr.addColorStop(1, "transparent");
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    glowSprites.set(color, c);
    return c;
  } catch {
    return null;
  }
}


// ---------- pre-rendered enemy walk-cycle sprites ----------
// The static shape art of every enemy is baked once per walk-cycle phase; the per-enemy
// overlays (status effects, boss auras) are still painted live each frame.

const enemyBodyGrad = new Map<string, CanvasGradient>();
const enemySpriteCache = new Map<string, HTMLCanvasElement>();
const ENEMY_SPRITE_PHASES = 16;

/**
 * Pre-renders the static shape art of an enemy into an offscreen sprite, one per
 * (type, walk-cycle phase, shadow setting). The frame then blits the sprite with
 * a single drawImage instead of re-running the gradient and path work per enemy.
 */
function drawEnemyBodySprite(ctx: CanvasRenderingContext2D, type: number, et: EnemyType, R: number, cycle: number, flip: number, shadowOn: boolean) {
  const TAU = Math.PI * 2;
  const phase = Math.round((((cycle % TAU) + TAU) % TAU) / TAU * ENEMY_SPRITE_PHASES) % ENEMY_SPRITE_PHASES;
  const quantCycle = (phase / ENEMY_SPRITE_PHASES) * TAU;
  const half = Math.ceil(R * 2.6) + 6;
  // bosses are large, so they bake at 1x to keep the cache small
  const scale = R >= 20 ? 1 : 2;
  const key = `${type}|${phase}|${half}|${scale}|${shadowOn ? 1 : 0}`;
  let spr = enemySpriteCache.get(key);
  if (!spr) {
    if (enemySpriteCache.size > 360) enemySpriteCache.clear();
    spr = document.createElement("canvas");
    spr.width = Math.ceil(half * 2 * scale);
    spr.height = spr.width;
    const sctx = spr.getContext("2d");
    if (!sctx) {
      paintEnemyShape(ctx, type, et, R, cycle, flip, shadowOn);
      return;
    }
    sctx.setTransform(scale, 0, 0, scale, half * scale, half * scale);
    paintEnemyShape(sctx, type, et, R, quantCycle, 1, shadowOn);
    enemySpriteCache.set(key, spr);
  }
  ctx.save();
  ctx.scale(flip, 1);
  ctx.drawImage(spr, -half, -half, half * 2, half * 2);
  ctx.restore();
}

/** Static shape art for one enemy type at one walk-cycle phase (no per-enemy state). */
function paintEnemyShape(ctx: CanvasRenderingContext2D, type: number, et: EnemyType, R: number, cycle: number, flip: number, shadowOn: boolean) {
  const bodyGradCache = enemyBodyGrad;
  ctx.lineJoin = "round";
  ctx.strokeStyle = et.shade;
  ctx.lineWidth = 2;
  /** vertical body gradient: lit top, shaded belly */
  const bodyGrad = (h: number) => {
    const key = type + ":" + Math.round(h);
    const hit = bodyGradCache.get(key);
    if (hit) return hit;
    const gr = ctx.createLinearGradient(0, -h, 0, h);
    gr.addColorStop(0, et.accent);
    gr.addColorStop(0.45, et.color);
    gr.addColorStop(1, et.shade);
    bodyGradCache.set(key, gr);
    return gr;
  };

  const eye = (x: number, y: number, r: number, pupil = et.shade) => {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pupil;
    ctx.beginPath();
    ctx.arc(x + flip * r * 0.28, y + r * 0.12, r * 0.52, 0, Math.PI * 2);
    ctx.fill();
  };

  /** two stubby legs swinging out of phase */
  const legs = (y: number, spread: number, len: number, w: number) => {
    ctx.strokeStyle = et.shade;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    for (let i = 0; i < 2; i++) {
      const sw = Math.sin(cycle + i * Math.PI) * len * 0.55;
      const lx = (i === 0 ? -spread : spread);
      ctx.beginPath();
      ctx.moveTo(lx, y);
      ctx.lineTo(lx + sw, y + len);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  };
  if (et.shape === "slime") {
    // gelatinous blob: squash/stretch, inner nucleus, glossy highlight
    const sq = 1 + Math.sin(cycle) * 0.14;
    const rx = R * (1.08 / sq);
    const ry = R * (0.88 * sq);
    ctx.fillStyle = bodyGrad(ry);
    ctx.beginPath();
    ctx.moveTo(-rx, ry * 0.9);
    ctx.bezierCurveTo(-rx * 1.1, -ry * 1.1, rx * 1.1, -ry * 1.1, rx, ry * 0.9);
    ctx.quadraticCurveTo(0, ry * 1.35, -rx, ry * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // drips
    ctx.fillStyle = et.color;
    ctx.globalAlpha = 0.75;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(i * rx * 0.55, ry * 0.95 + Math.sin(cycle + i) * 1.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // nucleus
    ctx.fillStyle = et.shade;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(0, ry * 0.25, rx * 0.34, ry * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    eye(-rx * 0.3, -ry * 0.2, R * 0.21);
    eye(rx * 0.32, -ry * 0.2, R * 0.21);
    // gloss
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.ellipse(-rx * 0.38, -ry * 0.55, rx * 0.22, ry * 0.14, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (et.shape === "runner") {
    // lean sprinter wrapped in a speed cowl, trailing wisps
    ctx.save();
    ctx.scale(flip, 1);
    // motion trail
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = et.color;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.ellipse(-R * (0.9 + i * 0.5), 0, R * 0.42, R * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    legs(R * 0.55, R * 0.3, R * 0.6, 3);
    // body: forward-leaning teardrop
    ctx.fillStyle = bodyGrad(R);
    ctx.beginPath();
    ctx.moveTo(R * 1.05, -R * 0.1);
    ctx.quadraticCurveTo(R * 0.2, -R * 0.95, -R * 0.55, -R * 0.35);
    ctx.quadraticCurveTo(-R * 0.95, 0, -R * 0.5, R * 0.55);
    ctx.quadraticCurveTo(R * 0.3, R * 0.8, R * 1.05, -R * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // cowl stripe
    ctx.strokeStyle = et.accent;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-R * 0.35, -R * 0.1);
    ctx.quadraticCurveTo(R * 0.2, -R * 0.35, R * 0.8, -R * 0.12);
    ctx.stroke();
    // trailing scarf
    ctx.strokeStyle = et.accent;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-R * 0.4, -R * 0.3);
    ctx.quadraticCurveTo(-R * 1.1, -R * 0.5 + Math.sin(cycle * 1.6) * 3, -R * 1.7, -R * 0.1 + Math.sin(cycle * 1.6 + 1) * 4);
    ctx.stroke();
    ctx.lineCap = "butt";
    eye(R * 0.45, -R * 0.28, R * 0.19);
    ctx.restore();
  } else if (et.shape === "knight") {
    // armoured block with a shield arm and a crested helm
    legs(R * 0.8, R * 0.42, R * 0.5, 4);
    ctx.fillStyle = bodyGrad(R);
    ctx.beginPath();
    ctx.roundRect(-R * 0.82, -R * 0.75, R * 1.64, R * 1.6, 5);
    ctx.fill();
    ctx.stroke();
    // chest plating
    ctx.strokeStyle = et.accent;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-R * 0.72, -R * 0.4 + i * R * 0.42);
      ctx.lineTo(R * 0.72, -R * 0.4 + i * R * 0.42);
      ctx.stroke();
    }
    // pauldrons
    ctx.fillStyle = et.accent;
    ctx.beginPath();
    ctx.ellipse(-R * 0.86, -R * 0.55, R * 0.34, R * 0.26, 0, 0, Math.PI * 2);
    ctx.ellipse(R * 0.86, -R * 0.55, R * 0.34, R * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    // helm
    ctx.fillStyle = et.accent;
    ctx.strokeStyle = et.shade;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-R * 0.5, -R * 1.25, R, R * 0.6, 3);
    ctx.fill();
    ctx.stroke();
    // visor slit
    ctx.fillStyle = "#121a33";
    ctx.fillRect(-R * 0.36, -R * 1.05, R * 0.72, R * 0.16);
    ctx.fillStyle = "#ff8f5a";
    ctx.fillRect(-R * 0.3 + flip * 2, -R * 1.02, R * 0.18, R * 0.1);
    ctx.fillRect(R * 0.12 + flip * 2, -R * 1.02, R * 0.18, R * 0.1);
    // crest
    ctx.fillStyle = "#dbe7ff";
    ctx.beginPath();
    ctx.moveTo(0, -R * 1.25);
    ctx.quadraticCurveTo(flip * R * 0.25, -R * 1.75, flip * R * 0.55, -R * 1.35);
    ctx.quadraticCurveTo(flip * R * 0.2, -R * 1.35, 0, -R * 1.18);
    ctx.fill();
    // shield (front arm), rocking with the step
    ctx.save();
    ctx.translate(flip * R * 0.95, R * 0.05);
    ctx.rotate(Math.sin(cycle) * 0.12);
    ctx.fillStyle = "#dbe7ff";
    ctx.strokeStyle = et.shade;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.6);
    ctx.lineTo(R * 0.42 * flip, -R * 0.4);
    ctx.lineTo(R * 0.42 * flip, R * 0.3);
    ctx.lineTo(0, R * 0.68);
    ctx.lineTo(-R * 0.42 * flip, R * 0.3);
    ctx.lineTo(-R * 0.42 * flip, -R * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (et.shape === "mage") {
    // hovering robed caster with an orbiting focus orb
    const float = Math.sin(cycle * 0.6) * 2.5;
    ctx.translate(0, float);
    // robe
    ctx.fillStyle = bodyGrad(R);
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.55);
    ctx.quadraticCurveTo(R * 0.75, -R * 0.2, R * 0.9, R * 0.95);
    ctx.quadraticCurveTo(0, R * 1.25, -R * 0.9, R * 0.95);
    ctx.quadraticCurveTo(-R * 0.75, -R * 0.2, 0, -R * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // robe trim
    ctx.strokeStyle = et.accent;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-R * 0.75, R * 0.82);
    ctx.quadraticCurveTo(0, R * 1.08, R * 0.75, R * 0.82);
    ctx.stroke();
    // hood
    ctx.fillStyle = et.shade;
    ctx.beginPath();
    ctx.moveTo(-R * 0.52, -R * 0.4);
    ctx.quadraticCurveTo(0, -R * 1.45, R * 0.52, -R * 0.4);
    ctx.quadraticCurveTo(0, -R * 0.15, -R * 0.52, -R * 0.4);
    ctx.closePath();
    ctx.fill();
    // glowing eyes in the hood
    ctx.fillStyle = "#fff";
    ctx.shadowColor = et.accent;
    ctx.shadowBlur = shadowOn ? 8 : 0;
    ctx.beginPath();
    ctx.arc(-R * 0.17, -R * 0.52, 2.1, 0, Math.PI * 2);
    ctx.arc(R * 0.17, -R * 0.52, 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = shadowOn ? 0 : 0;
    // staff + orbiting orb
    ctx.strokeStyle = "#6b4a2a";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(flip * R * 0.75, -R * 0.75);
    ctx.lineTo(flip * R * 0.62, R * 0.95);
    ctx.stroke();
    const oa = cycle * 0.5;
    const ox = flip * R * 0.75 + Math.cos(oa) * R * 0.3;
    const oy = -R * 0.9 + Math.sin(oa) * R * 0.18;
    ctx.fillStyle = et.accent;
    ctx.shadowColor = et.color;
    ctx.shadowBlur = shadowOn ? 12 : 0;
    ctx.beginPath();
    ctx.arc(ox, oy, R * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = shadowOn ? 0 : 0;
  } else if (et.shape === "warlord") {
    // hulking brute: heavy shoulders, horned helm, swinging axe
    legs(R * 0.72, R * 0.4, R * 0.52, 6);
    ctx.fillStyle = bodyGrad(R);
    ctx.beginPath();
    ctx.moveTo(-R * 0.95, -R * 0.45);
    ctx.quadraticCurveTo(0, -R * 0.95, R * 0.95, -R * 0.45);
    ctx.lineTo(R * 0.7, R * 0.8);
    ctx.quadraticCurveTo(0, R * 1.05, -R * 0.7, R * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // ribbed armour
    ctx.strokeStyle = et.shade;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-R * 0.6, -R * 0.15 + i * R * 0.3);
      ctx.quadraticCurveTo(0, R * 0.05 + i * R * 0.3, R * 0.6, -R * 0.15 + i * R * 0.3);
      ctx.stroke();
    }
    // spiked pauldrons
    ctx.fillStyle = et.shade;
    [-1, 1].forEach((sgn) => {
      ctx.beginPath();
      ctx.moveTo(sgn * R * 0.6, -R * 0.58);
      ctx.lineTo(sgn * R * 1.22, -R * 0.3);
      ctx.lineTo(sgn * R * 0.62, R * 0.02);
      ctx.closePath();
      ctx.fill();
    });
    // head + horns
    ctx.fillStyle = et.accent;
    ctx.beginPath();
    ctx.arc(0, -R * 0.75, R * 0.33, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f3e2c8";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    [-1, 1].forEach((sgn) => {
      ctx.beginPath();
      ctx.moveTo(sgn * R * 0.26, -R * 0.92);
      ctx.quadraticCurveTo(sgn * R * 0.62, -R * 1.3, sgn * R * 0.4, -R * 1.55);
      ctx.stroke();
    });
    ctx.lineCap = "butt";
    ctx.fillStyle = "#2a0a10";
    ctx.beginPath();
    ctx.arc(-R * 0.12, -R * 0.78, 2.6, 0, Math.PI * 2);
    ctx.arc(R * 0.12, -R * 0.78, 2.6, 0, Math.PI * 2);
    ctx.fill();
    // axe, swinging with the gait
    ctx.save();
    ctx.translate(flip * R * 1.05, R * 0.1);
    ctx.rotate(Math.sin(cycle) * 0.22 - flip * 0.3);
    ctx.strokeStyle = "#6b4a2a";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.75);
    ctx.lineTo(0, R * 0.7);
    ctx.stroke();
    ctx.fillStyle = "#d8dee8";
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.75);
    ctx.quadraticCurveTo(flip * R * 0.75, -R * 0.6, flip * R * 0.55, -R * 0.08);
    ctx.quadraticCurveTo(flip * R * 0.25, -R * 0.26, 0, -R * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (et.shape === "titan") {
    // titan: a colossal siege walker — slab torso, void core, shard halo
    legs(R * 0.62, R * 0.46, R * 0.86, 6);
    // shard halo
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 7; i++) {
      const a = cycle * 0.35 + (i / 7) * Math.PI * 2;
      const rr = R * (1.5 + Math.sin(cycle * 0.8 + i) * 0.08);
      const sx = Math.cos(a) * rr;
      const sy = Math.sin(a) * rr * 0.55;
      ctx.fillStyle = et.accent + (i % 2 ? "88" : "55");
      ctx.beginPath();
      ctx.moveTo(sx, sy - R * 0.2);
      ctx.lineTo(sx + R * 0.11, sy);
      ctx.lineTo(sx, sy + R * 0.2);
      ctx.lineTo(sx - R * 0.11, sy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    // torso: a wide trapezoid plated in slabs
    ctx.fillStyle = bodyGrad(R);
    ctx.beginPath();
    ctx.moveTo(-R * 0.82, -R * 0.7);
    ctx.lineTo(R * 0.82, -R * 0.7);
    ctx.lineTo(R * 1.05, R * 0.5);
    ctx.quadraticCurveTo(0, R * 0.95, -R * 1.05, R * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = et.shade;
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-R * (0.72 - i * 0.05), -R * 0.45 + i * R * 0.3);
      ctx.lineTo(R * (0.72 - i * 0.05), -R * 0.45 + i * R * 0.3);
      ctx.stroke();
    }
    // void core in the chest
    const coreGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, R * 0.42);
    coreGlow.addColorStop(0, "#ffffff");
    coreGlow.addColorStop(0.45, et.accent);
    coreGlow.addColorStop(1, "transparent");
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.42 * (1 + Math.sin(cycle * 2) * 0.08), 0, Math.PI * 2);
    ctx.fill();
    // shoulder cannons
    ctx.fillStyle = et.shade;
    [-1, 1].forEach((sgn) => {
      ctx.beginPath();
      ctx.roundRect(sgn < 0 ? -R * 1.12 : R * 0.62, -R * 0.86, R * 0.5, R * 0.3, 4);
      ctx.fill();
    });
    // head: a slab with a visor slit
    ctx.fillStyle = et.color;
    ctx.beginPath();
    ctx.roundRect(-R * 0.3, -R * 1.16, R * 0.6, R * 0.42, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.shadowColor = et.accent;
    ctx.shadowBlur = shadowOn ? 12 : 0;
    ctx.fillRect(-R * 0.22, -R * 1.05, R * 0.44, R * 0.1);
    ctx.shadowBlur = shadowOn ? 0 : 0;
  } else if (et.shape === "hound") {
    // Rift Hound: a lean quadruped with a spiked spine and a burning maw
    ctx.save();
    ctx.scale(flip, 1);
    // four legs, front and back pairs out of phase
    ctx.strokeStyle = et.shade;
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      const front = i < 2;
      const lx = (front ? R * 0.55 : -R * 0.6) + (i % 2 ? R * 0.22 : -R * 0.22);
      const sw = Math.sin(cycle + i * 1.7) * R * 0.32;
      ctx.beginPath();
      ctx.moveTo(lx, R * 0.35);
      ctx.lineTo(lx + sw, R * 0.92);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    // barrel body
    ctx.fillStyle = bodyGrad(R);
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 0.95, R * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // spiked spine
    ctx.fillStyle = et.accent;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * R * 0.4 - R * 0.1, -R * 0.42);
      ctx.lineTo(i * R * 0.4, -R * 0.92);
      ctx.lineTo(i * R * 0.4 + R * 0.12, -R * 0.42);
      ctx.closePath();
      ctx.fill();
    }
    // head + jaw
    ctx.fillStyle = et.color;
    ctx.beginPath();
    ctx.ellipse(R * 0.92, -R * 0.18, R * 0.36, R * 0.28, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#2a0d00";
    ctx.beginPath();
    ctx.moveTo(R * 1.16, -R * 0.05);
    ctx.lineTo(R * 1.42, R * 0.08);
    ctx.lineTo(R * 1.12, R * 0.2);
    ctx.closePath();
    ctx.fill();
    // ember eye
    ctx.fillStyle = "#fff6c4";
    ctx.shadowColor = "#ff8a3d";
    ctx.shadowBlur = shadowOn ? 8 : 0;
    ctx.beginPath();
    ctx.arc(R * 0.98, -R * 0.26, R * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = shadowOn ? 0 : 0;
    ctx.restore();
  } else if (et.shape === "wraith") {
    // Cinder Wraith: a hooded ember ghost trailing a tattered hem
    const float = Math.sin(cycle * 0.8) * 3;
    ctx.translate(0, float);
    // ghostly aura
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = et.color;
    ctx.beginPath();
    ctx.ellipse(0, R * 0.1, R * 1.15, R * 1.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // robe
    ctx.fillStyle = bodyGrad(R);
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.9);
    ctx.quadraticCurveTo(R * 0.75, -R * 0.35, R * 0.62, R * 0.55);
    // ragged hem
    for (let i = 0; i < 5; i++) {
      const t2 = 1 - i / 4;
      const hx = -R * 0.62 + t2 * R * 1.24;
      const hem = R * (0.75 + Math.sin(cycle * 1.4 + i) * 0.16);
      ctx.quadraticCurveTo(hx - R * 0.12, hem, hx - R * 0.2, R * 0.42);
    }
    ctx.quadraticCurveTo(-R * 0.75, -R * 0.35, 0, -R * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // cowl
    ctx.fillStyle = "#1a0730";
    ctx.beginPath();
    ctx.ellipse(0, -R * 0.52, R * 0.36, R * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // ember eyes
    ctx.fillStyle = et.accent;
    ctx.shadowColor = et.color;
    ctx.shadowBlur = shadowOn ? 10 : 0;
    ctx.beginPath();
    ctx.arc(-R * 0.13, -R * 0.52, R * 0.07, 0, Math.PI * 2);
    ctx.arc(R * 0.13, -R * 0.52, R * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = shadowOn ? 0 : 0;
    // rising cinders
    for (let i = 0; i < 3; i++) {
      const t3 = ((cycle * 0.25 + i / 3) % 1);
      ctx.globalAlpha = 0.6 * (1 - t3);
      ctx.fillStyle = et.color;
      ctx.beginPath();
      ctx.arc((i - 1) * R * 0.35 + Math.sin(cycle + i) * 3, R * 0.4 - t3 * R * 1.1, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (et.shape === "golem") {
    // Shard Golem: a blocky riftglass brute with a glowing core
    legs(R * 0.66, R * 0.4, R * 0.5, 7);
    // chunky torso of stacked slabs
    ctx.fillStyle = bodyGrad(R);
    ctx.beginPath();
    ctx.roundRect(-R * 0.78, -R * 0.7, R * 1.56, R * 1.4, 7);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = et.shade;
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-R * 0.7, -R * 0.4 + i * R * 0.38);
      ctx.lineTo(R * 0.7, -R * 0.4 + i * R * 0.38);
      ctx.stroke();
    }
    // crystal core
    const cg = ctx.createRadialGradient(0, 0, 1, 0, 0, R * 0.5);
    cg.addColorStop(0, "#ffffff");
    cg.addColorStop(0.45, et.accent);
    cg.addColorStop(1, "transparent");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.5 * (1 + Math.sin(cycle * 2) * 0.07), 0, Math.PI * 2);
    ctx.fill();
    // fists
    ctx.fillStyle = et.shade;
    [-1, 1].forEach((sgn) => {
      ctx.beginPath();
      ctx.roundRect(sgn < 0 ? -R * 1.08 : R * 0.74, R * 0.1, R * 0.34, R * 0.4, 6);
      ctx.fill();
    });
    // crystal shards jutting out of the shoulders
    ctx.fillStyle = et.accent;
    [-1, 1].forEach((sgn) => {
      ctx.beginPath();
      ctx.moveTo(sgn * R * 0.66, -R * 0.72);
      ctx.lineTo(sgn * R * 0.86, -R * 1.18);
      ctx.lineTo(sgn * R * 0.46, -R * 0.78);
      ctx.closePath();
      ctx.fill();
    });
    // visor
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = et.accent;
    ctx.shadowBlur = shadowOn ? 10 : 0;
    ctx.fillRect(-R * 0.32, -R * 0.6, R * 0.64, R * 0.12);
    ctx.shadowBlur = shadowOn ? 0 : 0;
  } else if (et.shape === "leviathan") {
    // Abyss Leviathan: a coiled serpent rising out of its own rift
    const coil = cycle * 0.6;
    // rift pool under it
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 3; i++) {
      const rr = R * (1.25 + i * 0.28);
      ctx.globalAlpha = 0.16 - i * 0.04;
      ctx.strokeStyle = et.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, R * 0.85, rr, rr * 0.36, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    // three coils with a serpentine sway
    ctx.strokeStyle = et.shade;
    ctx.lineCap = "round";
    for (let c = 2; c >= 0; c--) {
      const cr = R * (0.62 - c * 0.16);
      const cy = R * (0.5 - c * 0.34);
      ctx.lineWidth = cr * 1.5;
      ctx.beginPath();
      ctx.ellipse(0, cy, cr * 1.35, cr * 0.5, Math.sin(coil + c) * 0.16, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    // neck + head
    const sway = Math.sin(coil) * R * 0.12;
    ctx.fillStyle = bodyGrad(R);
    ctx.beginPath();
    ctx.moveTo(-R * 0.34, R * 0.2);
    ctx.quadraticCurveTo(-R * 0.2 + sway, -R * 0.7, sway - R * 0.18, -R * 0.95);
    ctx.lineTo(sway + R * 0.18, -R * 0.95);
    ctx.quadraticCurveTo(R * 0.2 + sway, -R * 0.7, R * 0.34, R * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // maw
    ctx.fillStyle = et.color;
    ctx.beginPath();
    ctx.ellipse(sway, -R * 1.02, R * 0.34, R * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#03211f";
    ctx.beginPath();
    ctx.moveTo(sway - R * 0.26, -R * 1.02);
    ctx.lineTo(sway + R * 0.26, -R * 1.02);
    ctx.lineTo(sway, -R * 0.78);
    ctx.closePath();
    ctx.fill();
    // teeth
    ctx.fillStyle = "#eafffb";
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(sway + i * R * 0.09, -R * 1.0);
      ctx.lineTo(sway + i * R * 0.09 + R * 0.035, -R * 0.86);
      ctx.lineTo(sway + i * R * 0.09 + R * 0.07, -R * 1.0);
      ctx.closePath();
      ctx.fill();
    }
    // glowing eyes
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = et.color;
    ctx.shadowBlur = shadowOn ? 14 : 0;
    ctx.beginPath();
    ctx.ellipse(sway - R * 0.14, -R * 1.1, R * 0.05, R * 0.03, 0, 0, Math.PI * 2);
    ctx.ellipse(sway + R * 0.14, -R * 1.1, R * 0.05, R * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = shadowOn ? 0 : 0;
    // dorsal fins
    ctx.fillStyle = et.accent;
    for (let i = 0; i < 4; i++) {
      const fy = -R * 0.2 - i * R * 0.18;
      ctx.beginPath();
      ctx.moveTo(-R * 0.2, fy);
      ctx.lineTo(-R * 0.5 - i * 2, fy - R * 0.1);
      ctx.lineTo(-R * 0.2, fy + R * 0.1);
      ctx.closePath();
      ctx.fill();
    }
  } else if (et.shape === "herald") {
    // Storm Herald: a robed sky-executioner riding its own thunderhead.
    const float = Math.sin(cycle * 0.55) * 3;
    ctx.translate(0, float);
    // thunderhead under the robe
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 3; i++) {
      const cy2 = R * (0.62 + i * 0.14);
      ctx.globalAlpha = 0.22 - i * 0.06;
      ctx.fillStyle = et.color;
      ctx.beginPath();
      ctx.ellipse(0, cy2, R * (1.25 - i * 0.2), R * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    // robe
    ctx.fillStyle = bodyGrad(R);
    ctx.beginPath();
    ctx.moveTo(-R * 0.62, R * 0.72);
    ctx.quadraticCurveTo(-R * 0.5, -R * 0.35, 0, -R * 0.62);
    ctx.quadraticCurveTo(R * 0.5, -R * 0.35, R * 0.62, R * 0.72);
    ctx.quadraticCurveTo(0, R * 0.95, -R * 0.62, R * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // lightning sigil down the robe
    ctx.strokeStyle = et.accent;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-R * 0.1, -R * 0.3);
    ctx.lineTo(R * 0.12, R * 0.02);
    ctx.lineTo(-R * 0.06, R * 0.2);
    ctx.lineTo(R * 0.14, R * 0.52);
    ctx.stroke();
    // hood + void face
    ctx.fillStyle = et.shade;
    ctx.beginPath();
    ctx.ellipse(0, -R * 0.7, R * 0.36, R * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#04121a";
    ctx.beginPath();
    ctx.ellipse(0, -R * 0.66, R * 0.24, R * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // eyes
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = et.color;
    ctx.shadowBlur = shadowOn ? 14 : 0;
    ctx.beginPath();
    ctx.arc(-R * 0.11, -R * 0.7, R * 0.055, 0, Math.PI * 2);
    ctx.arc(R * 0.11, -R * 0.7, R * 0.055, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = shadowOn ? 0 : 0;
    // halo of storm rings
    ctx.strokeStyle = et.color;
    for (let i = 0; i < 2; i++) {
      ctx.globalAlpha = 0.5 - i * 0.18;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -R * 0.72, R * (0.62 + i * 0.22), R * (0.16 + i * 0.06), cycle * 0.5 + i, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // crackling arcs
    for (let i = 0; i < 3; i++) {
      const a2 = cycle * 1.6 + i * 2.1;
      const r1 = R * 0.8;
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = et.accent;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a2) * r1, Math.sin(a2) * r1 * 0.5 + R * 0.5);
      ctx.lineTo(Math.cos(a2 + 0.4) * r1 * 1.1, Math.sin(a2 + 0.4) * r1 * 0.5 + R * 0.45);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else {
    // overlord: a levitating rift sovereign — cloak, crown, orbiting shards
    const float = Math.sin(cycle * 0.5) * 3.5;
    ctx.translate(0, float);
    // rift aura
    const aura = ctx.createRadialGradient(0, 0, R * 0.3, 0, 0, R * 1.7);
    aura.addColorStop(0, et.color + "88");
    aura.addColorStop(1, "transparent");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.7, 0, Math.PI * 2);
    ctx.fill();
    // cloak
    ctx.fillStyle = bodyGrad(R);
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.85);
    ctx.quadraticCurveTo(R * 1.0, -R * 0.35, R * 0.85, R * 0.85);
    ctx.quadraticCurveTo(R * 0.4, R * 0.6 + Math.sin(cycle) * 3, 0, R * 1.05);
    ctx.quadraticCurveTo(-R * 0.4, R * 0.6 - Math.sin(cycle) * 3, -R * 0.85, R * 0.85);
    ctx.quadraticCurveTo(-R * 1.0, -R * 0.35, 0, -R * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // sigil on the chest
    ctx.strokeStyle = et.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, R * 0.1, R * 0.28, 0, Math.PI * 2);
    ctx.moveTo(0, R * 0.1 - R * 0.34);
    ctx.lineTo(0, R * 0.1 + R * 0.34);
    ctx.stroke();
    // void face
    ctx.fillStyle = "#0a0320";
    ctx.beginPath();
    ctx.ellipse(0, -R * 0.62, R * 0.4, R * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.shadowColor = et.accent;
    ctx.shadowBlur = shadowOn ? 10 : 0;
    ctx.beginPath();
    ctx.ellipse(-R * 0.15, -R * 0.63, 2.6, 1.6, 0, 0, Math.PI * 2);
    ctx.ellipse(R * 0.15, -R * 0.63, 2.6, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = shadowOn ? 0 : 0;
    // jagged crown
    ctx.fillStyle = et.accent;
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      const bx = i * R * 0.2;
      ctx.moveTo(bx - R * 0.09, -R * 0.9);
      ctx.lineTo(bx, -R * 1.25 - Math.abs(2 - Math.abs(i)) * R * 0.08);
      ctx.lineTo(bx + R * 0.09, -R * 0.9);
      ctx.closePath();
    }
    ctx.fill();
    // orbiting rift shards
    for (let i = 0; i < 3; i++) {
      const a = cycle * 0.35 + (i / 3) * Math.PI * 2;
      const sx = Math.cos(a) * R * 1.25;
      const sy = Math.sin(a) * R * 0.5 - R * 0.2;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(a * 2);
      ctx.fillStyle = et.accent;
      ctx.shadowColor = et.color;
      ctx.shadowBlur = shadowOn ? 10 : 0;
      ctx.beginPath();
      ctx.moveTo(0, -4.5);
      ctx.lineTo(3, 0);
      ctx.lineTo(0, 4.5);
      ctx.lineTo(-3, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = shadowOn ? 0 : 0;
  }
}

/** Per-enemy overlays (statuses, marks, boss auras). Painted live every frame. */
function paintEnemyStatus(ctx: CanvasRenderingContext2D, e: Enemy, et: EnemyType, now: number) {
  const type = e.type;
  if (isBossType(type)) {
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
  // Absolute Zero: a faceted ice block with a bright rim and inner glint
  if (e.encased > 0) {
    const R2 = et.r + 7;
    ctx.save();
    ctx.globalAlpha = 0.72;
    const ice = ctx.createLinearGradient(0, -R2, 0, R2);
    ice.addColorStop(0, "#eafdff");
    ice.addColorStop(0.5, "#8fe4ff");
    ice.addColorStop(1, "#3fa9d8");
    ctx.fillStyle = ice;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
      const rr = R2 * (i % 2 === 0 ? 1.05 : 0.86);
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // internal fractures
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + e.wob;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R2 * 0.2, Math.sin(a) * R2 * 0.2);
      ctx.lineTo(Math.cos(a + 0.6) * R2 * 0.85, Math.sin(a + 0.6) * R2 * 0.85);
      ctx.stroke();
    }
    // glint sweeping across the block
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(now / 220 + e.wob);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(-R2 * 0.3, -R2 * 0.45, R2 * 0.26, R2 * 0.1, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Storm Sovereign: orbiting static arcs on marked enemies
  if (e.mark > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "#ffe14d";
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.55 + 0.35 * Math.sin(now / 70 + e.wob);
    for (let i = 0; i < 3; i++) {
      const a0 = now / 240 + (i / 3) * Math.PI * 2;
      ctx.beginPath();
      for (let k = 0; k <= 5; k++) {
        const a = a0 + (k / 5) * 1.3;
        const rr = (et.r + 9) * (1 + (k % 2 ? 0.1 : -0.08));
        const px = Math.cos(a) * rr;
        const py = Math.sin(a) * rr * 0.75;
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
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
}

// Pre-rendered asteroid rock: a jagged silhouette with craters and a hot rim,
// cached per colour so every falling rock is a single blit.
const rockSprites = new Map<string, HTMLCanvasElement>();
function rockSprite(color: string): HTMLCanvasElement | null {
  const hit = rockSprites.get(color);
  if (hit) return hit;
  try {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const x = c.getContext("2d") as CanvasRenderingContext2D | null;
    if (!x) return null;
    x.translate(32, 32);
    const pts = 11;
    x.beginPath();
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const r = 17 + ((i * 37) % 5) * 1.3 - 2.5;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    }
    x.closePath();
    const body = x.createRadialGradient(-5, -6, 2, 0, 0, 22);
    body.addColorStop(0, "#5a2a14");
    body.addColorStop(1, "#1a0803");
    x.fillStyle = body;
    x.fill();
    x.lineWidth = 2.4;
    x.strokeStyle = color;
    x.stroke();
    // craters
    x.fillStyle = "rgba(0,0,0,.45)";
    for (const [cx, cy, cr] of [[-6, -4, 4], [7, 3, 3], [-2, 8, 2.4], [5, -9, 2]] as const) {
      x.beginPath();
      x.arc(cx, cy, cr, 0, Math.PI * 2);
      x.fill();
    }
    // molten seams
    x.strokeStyle = "rgba(255,190,110,.75)";
    x.lineWidth = 1.2;
    x.beginPath();
    x.moveTo(-12, -2);
    x.lineTo(-3, 1);
    x.lineTo(4, -3);
    x.lineTo(12, 4);
    x.stroke();
    rockSprites.set(color, c);
    return c;
  } catch {
    return null;
  }
}

// ---------- component ----------
export default function Battle({
  mode,
  save,
  mutate,
  onExit,
  onAutoBattle,
  debugRound,
  debugBoon,
}: {
  mode: GameMode;
  save: SaveData;
  mutate: (fn: (s: SaveData) => void) => void;
  onExit: () => void;
  onAutoBattle?: (mode: "endless" | "gauntlet", liveSquadDps: number, deployedCount: number, currentWave: number, walletGold: number, goldMul: number, boons: number) => void;
  /** start the run on a later round — used by tests to reach boss waves quickly */
  debugRound?: number;
  /** open the gauntlet boon card immediately — used by tests */
  debugBoon?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gRef = useRef<G | null>(null);
  const saveRef = useRef(save);
  const mutateRef = useRef(mutate);
  mutateRef.current = mutate;

  const [, setTick] = useState(0);
  // battle callouts honour the same Hide Notifications switch as the shell
  const { toasts, push } = useToasts(!save.hideNotifs);
  const [shopOpen, setShopOpen] = useState(false);
  /** arena zoom: 1 = fitted to the panel, up to 2 = twice as big (scroll to pan) */
  const [zoom, setZoom] = useState(() => clampZoom(save.zoom));
  /** battle pause + speed controls (the engine reads these through refs) */
  const [paused, setPaused] = useState(false);
  const [sandboxCfg, setSandboxCfg] = useState({ interval: 0.72, hp: 1, speed: 1, shield: 0, maxLevel: false, awakened: false });
  const sandboxCfgRef = useRef(sandboxCfg);
  sandboxCfgRef.current = sandboxCfg;
  saveRef.current = mode === "sandbox" ? {
    ...save,
    levels: sandboxCfg.maxLevel ? Object.fromEntries(Object.keys(save.levels).map((id) => [id, 25])) : save.levels,
    awn: sandboxCfg.awakened ? Object.fromEntries(Object.keys(save.levels).map((id) => [id, [5, 5] as [number, number]])) : save.awn,
  } : save;
  const [runSpeed, setRunSpeed] = useState<1 | 1.5 | 2>(1);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const speedRef = useRef<number>(runSpeed);
  speedRef.current = runSpeed;
  const dragRef = useRef<{ kind: "lineup" | "field"; uid: number; x: number; y: number; moved: boolean } | null>(null);
  const shopOpenRef = useRef(shopOpen);
  shopOpenRef.current = shopOpen;
  /** gauntlet: the sim owns the boon roll, the overlay just calls back into it */
  const boonPickRef = useRef<(b: GauntletBoon) => void>(() => {});

  // Escape (or P) pauses/resumes with the run shop closed — a keyboard-only
  // player never has to aim at the HUD to stop the sim
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" && e.key.toLowerCase() !== "p") return;
      if (shopOpenRef.current) return;
      if (!gRef.current || gRef.current.final) return;
      e.preventDefault();
      setPaused((p2) => !p2);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toastRef = useRef(push);
  toastRef.current = push;

  // canvas text follows the picked UI/display font. The font vault can change
  // the stack live (and Google faces finish loading later), so re-read the
  // computed stacks on the font event and once the browser is done swapping.
  useEffect(() => {
    const sync = () => refreshCanvasFonts();
    sync();
    document.addEventListener("magictd-font", sync);
    document.fonts?.ready?.then(sync).catch(() => {});
    return () => document.removeEventListener("magictd-font", sync);
  }, [save.font]);

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
    // The visible canvas (pointer target, sized by fit) only presents. The arena
    // renders into this offscreen canvas at the chosen render scale, and the
    // present step upscales it to the display's real pixels.
    const canvas = canvasRef.current!;
    const pixelRatio = saveRef.current.pixelRatio || 1;
    const upscaleMode = saveRef.current.upscale || "sharp";
    const renderCanvas = document.createElement("canvas");
    renderCanvas.width = Math.round(W * pixelRatio);
    renderCanvas.height = Math.round(H * pixelRatio);
    // opaque canvas: the cached backdrop covers every pixel, so the browser can
    // skip per-frame alpha compositing of the whole arena
    const ctx = renderCanvas.getContext("2d", { alpha: false })!;
    const upscaler = upscaleMode === "native" ? null : createUpscaler(canvas, upscaleMode === "sharp");
    const presentCtx = upscaler ? null : (canvas.getContext("2d", { alpha: false }) as CanvasRenderingContext2D | null);
    canvas.style.imageRendering = upscaler || saveRef.current.antiAlias ? "auto" : "pixelated";
    // Half-resolution history buffers keep shake blur inexpensive on phones.
    const bloomCanvas = document.createElement("canvas");
    bloomCanvas.width = Math.max(1, Math.round(W * 0.25));
    bloomCanvas.height = Math.max(1, Math.round(H * 0.25));
    const bloomCtx = bloomCanvas.getContext("2d", { alpha: true })!;
    const trailCanvas = document.createElement("canvas");
    trailCanvas.width = Math.max(1, Math.round(W * 0.5));
    trailCanvas.height = Math.max(1, Math.round(H * 0.5));
    const trailCtx = trailCanvas.getContext("2d", { alpha: true })!;
    const currentCanvas = document.createElement("canvas");
    currentCanvas.width = trailCanvas.width;
    currentCanvas.height = trailCanvas.height;
    const currentCtx = currentCanvas.getContext("2d", { alpha: true })!;
    const previousCanvas = document.createElement("canvas");
    previousCanvas.width = trailCanvas.width;
    previousCanvas.height = trailCanvas.height;
    const previousCtx = previousCanvas.getContext("2d", { alpha: true })!;
    let hasPreviousFrame = false;
    let lastShakeX = 0;
    let lastShakeY = 0;
    const wrap = canvas.parentElement as HTMLElement;
    const fit = () => {
      const rw = wrap.clientWidth || 1;
      const rh = wrap.clientHeight || 1;
      const s = Math.max(0.1, Math.min(rw / W, rh / H) * zoomRef.current);
      const cssW = Math.floor(W * s);
      const cssH = Math.floor(H * s);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      // backing store: native keeps the render size (browser stretches it);
      // upscaled modes match the real device pixels so the present pass does the resample
      const bw = upscaler ? Math.max(64, Math.min(3072, Math.round(cssW * Math.min(2, window.devicePixelRatio || 1)))) : renderCanvas.width;
      const bh = upscaler ? Math.round((bw * H) / W) : renderCanvas.height;
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
    };
    fitRef.current = fit;
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    const g = newGame(mode, saveRef.current, debugRound);
    gRef.current = g;
    // test hook: drop straight into the boon card without clearing a wave
    if (debugBoon && mode === "gauntlet") {
      g.phase = "boon";
      g.boonOffer = offerBoons();
      g.phaseT = 0;
    }

    /**
     * Static arena backdrop, pre-rendered once. Nothing in here animates, so
     * the cache stays valid for the whole run and costs one drawImage a frame.
     */
    // Build pads change only when a tower moves or a drag hovers a new cell, so
    // they are rendered into their own layer and blitted when that state moves.
    // That removes ~24 notched octagons (three paths + two strokes each) from
    // every frame while the wave is running.
    let padCache: HTMLCanvasElement | null = null;
    let padCtx: CanvasRenderingContext2D | null = null;
    let padSig = "";
    const renderPads = (occupied: Set<string>, hover: { x: number; y: number } | null, showGuides: boolean) => {
      // built on the first frame, not at mount: the engine must bind its
      // imperative handles before the first paint costs anything
      if (!padCache) {
        padCache = document.createElement("canvas");
        padCache.width = W;
        padCache.height = H;
        padCtx = padCache.getContext("2d")!;
      }
      const padCtx2 = padCtx!;
      padCtx2.clearRect(0, 0, W, H);
      if (!showGuides) return;
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          if (isPathCell(c, r)) continue;
          const x = OX + c * C;
          const y = OY + r * C;
          const isOccupied = occupied.has(c + "," + r);
          let face = "rgba(31,22,74,0.72)";
          let edge = "rgba(96,76,190,0.5)";
          let inner = "rgba(53,224,255,0.07)";
          if (hover) {
            const over = hover.x >= x && hover.x < x + C && hover.y >= y && hover.y < y + C;
            if (over) {
              face = isOccupied ? "rgba(255,77,94,0.3)" : "rgba(61,255,142,0.28)";
              edge = isOccupied ? "rgba(255,77,94,0.9)" : "rgba(61,255,142,0.95)";
              inner = isOccupied ? "rgba(255,77,94,0.2)" : "rgba(61,255,142,0.22)";
            } else {
              face = "rgba(31,22,74,0.55)";
              inner = "rgba(53,224,255,0.1)";
            }
          }
          const pxs = x + 4;
          const pys = y + 4;
          const ps = C - 8;
          const n = 7;
          padCtx2.fillStyle = "rgba(0,0,0,0.5)";
          padCtx2.beginPath();
          padCtx2.roundRect(pxs, pys + 4, ps, ps, 8);
          padCtx2.fill();
          padCtx2.beginPath();
          padCtx2.moveTo(pxs + n, pys);
          padCtx2.lineTo(pxs + ps - n, pys);
          padCtx2.lineTo(pxs + ps, pys + n);
          padCtx2.lineTo(pxs + ps, pys + ps - n);
          padCtx2.lineTo(pxs + ps - n, pys + ps);
          padCtx2.lineTo(pxs + n, pys + ps);
          padCtx2.lineTo(pxs, pys + ps - n);
          padCtx2.lineTo(pxs, pys + n);
          padCtx2.closePath();
          padCtx2.fillStyle = face;
          padCtx2.fill();
          padCtx2.strokeStyle = edge;
          padCtx2.lineWidth = 1.5;
          padCtx2.stroke();
          if (!isOccupied) {
            padCtx2.strokeStyle = inner;
            padCtx2.lineWidth = 1;
            padCtx2.beginPath();
            padCtx2.arc(x + C / 2, y + C / 2, ps * 0.26, 0, Math.PI * 2);
            padCtx2.stroke();
            const bl = ps * 0.1;
            padCtx2.beginPath();
            padCtx2.moveTo(x + C / 2 - bl, y + C / 2);
            padCtx2.lineTo(x + C / 2 + bl, y + C / 2);
            padCtx2.moveTo(x + C / 2, y + C / 2 - bl);
            padCtx2.lineTo(x + C / 2, y + C / 2 + bl);
            padCtx2.stroke();
          }
          padCtx2.strokeStyle = "rgba(255,255,255,0.07)";
          padCtx2.lineWidth = 1;
          padCtx2.beginPath();
          padCtx2.moveTo(pxs + n, pys + 0.5);
          padCtx2.lineTo(pxs + ps - n, pys + 0.5);
          padCtx2.stroke();
        }
      }
    };

    // The road bed never changes: trench, asphalt, kerbs and paving ticks are
    // painted once into a layer and blitted, leaving only the two moving
    // conduit pulses as per-frame path strokes.
    let laneCache: HTMLCanvasElement | null = null;
    const laneCacheFor = () => {
      if (laneCache) return laneCache;
      laneCache = document.createElement("canvas");
      laneCache.width = W;
      laneCache.height = H;
      const lc = laneCache.getContext("2d")!;
      const strokePathOn = (c: CanvasRenderingContext2D) => {
        c.beginPath();
        c.moveTo(WPX[0].x, WPX[0].y);
        for (let i = 1; i < WPX.length; i++) c.lineTo(WPX[i].x, WPX[i].y);
        c.stroke();
      };
      lc.lineCap = "round";
      lc.lineJoin = "round";
      lc.strokeStyle = "rgba(0,0,0,0.6)";
      lc.lineWidth = C * 0.92;
      strokePathOn(lc);
      lc.strokeStyle = "#1d1646";
      lc.lineWidth = C * 0.82;
      strokePathOn(lc);
      lc.strokeStyle = "#2a2064";
      lc.lineWidth = C * 0.68;
      strokePathOn(lc);
      lc.save();
      lc.globalAlpha = 0.5;
      lc.strokeStyle = "#4a3aa0";
      lc.lineWidth = 2;
      strokePathOn(lc);
      lc.restore();
      lc.save();
      lc.globalAlpha = 0.22;
      lc.strokeStyle = "#0a0722";
      lc.lineWidth = C * 0.68;
      lc.setLineDash([3, 30]);
      strokePathOn(lc);
      lc.restore();
      return laneCache;
    };

    const bgCache = document.createElement("canvas");
    bgCache.width = W;
    bgCache.height = H;
    {
      const bg = bgCache.getContext("2d") as CanvasRenderingContext2D;
      const starfall = saveRef.current.scenes?.includes("starfall") === true;
      const grd = bg.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, starfall ? "#08243a" : "#120a33");
      grd.addColorStop(0.45, starfall ? "#091b36" : "#0b0726");
      grd.addColorStop(1, starfall ? "#06101f" : "#05040f");
      bg.fillStyle = grd;
      bg.fillRect(0, 0, W, H);
      // two nebula blooms, baked in place
      for (let i = 0; i < 2; i++) {
        const nx = W * (0.3 + i * 0.45);
        const ny = H * (0.3 + i * 0.35);
        const nr = Math.min(W, H) * (0.5 + i * 0.12);
        const ng = bg.createRadialGradient(nx, ny, 0, nx, ny, nr);
        ng.addColorStop(0, starfall ? (i ? "rgba(53,224,255,0.20)" : "rgba(255,207,77,0.12)") : i ? "rgba(53,110,255,0.16)" : "rgba(160,60,255,0.17)");
        ng.addColorStop(0.5, starfall ? (i ? "rgba(53,224,255,0.07)" : "rgba(255,207,77,0.04)") : i ? "rgba(53,110,255,0.05)" : "rgba(160,60,255,0.05)");
        ng.addColorStop(1, "transparent");
        bg.fillStyle = ng;
        bg.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
      }
      // starfield
      bg.save();
      bg.globalCompositeOperation = "lighter";
      for (let i = 0; i < 90; i++) {
        const hx = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
        const hy = Math.abs(Math.sin(i * 78.233) * 12345.6789) % 1;
        const depth = 0.3 + (i % 3) * 0.35;
        bg.globalAlpha = (0.35 + (i % 5) * 0.12) * depth * 0.8;
        bg.fillStyle = i % 7 === 0 ? "#9fd8ff" : "#ffffff";
        bg.fillRect(hx * W, hy * H, depth * 1.5, depth * 1.5);
      }
      bg.restore();
      bg.globalAlpha = 1;
      // --- arena plate: the raised slab the whole fight happens on ---
      const padX = OX - C * 0.55;
      const padY = OY - C * 0.55;
      const padW = COLS * C + C * 1.1;
      const padH = ROWS * C + C * 1.1;
      bg.fillStyle = "rgba(0,0,0,0.55)";
      bg.beginPath();
      bg.roundRect(padX + 6, padY + 12, padW, padH, 26);
      bg.fill();
      const slab = bg.createLinearGradient(0, padY, 0, padY + padH);
      slab.addColorStop(0, "#1b1446");
      slab.addColorStop(0.5, "#140e34");
      slab.addColorStop(1, "#0d0926");
      bg.fillStyle = slab;
      bg.beginPath();
      bg.roundRect(padX, padY, padW, padH, 24);
      bg.fill();
      bg.strokeStyle = "rgba(120,96,255,0.5)";
      bg.lineWidth = 2.5;
      bg.stroke();
      bg.strokeStyle = "rgba(53,224,255,0.16)";
      bg.lineWidth = 1;
      bg.beginPath();
      bg.roundRect(padX + 5, padY + 5, padW - 10, padH - 10, 20);
      bg.stroke();
      // etched circuitry along the rim
      bg.save();
      bg.clip();
      bg.globalCompositeOperation = "lighter";
      for (let i = 0; i < 7; i++) {
        const f = i / 7;
        bg.globalAlpha = 0.16;
        bg.strokeStyle = "#35e0ff";
        bg.lineWidth = 1;
        const yy = padY + f * padH;
        bg.beginPath();
        bg.moveTo(padX, yy);
        bg.lineTo(padX + padW * 0.18, yy);
        bg.lineTo(padX + padW * 0.22, yy + 8);
        bg.moveTo(padX + padW, yy + 20);
        bg.lineTo(padX + padW * 0.82, yy + 20);
        bg.lineTo(padX + padW * 0.78, yy + 28);
        bg.stroke();
      }
      bg.restore();
      bg.globalAlpha = 1;
    }
    let raf = 0;
    let last = performance.now();
    let lastDraw = performance.now();
    let lastHud = 0;
    let boltCache: { x: number; y: number }[] = [];
    /** last font string handed to the context, so text draw never re-parses one */
    let lastFont = "";
    /** HUD signature: React only re-renders when a visible value actually moved */
    let hudSig = "";

    const fxOn = () => saveRef.current.fx;
    /** the merged crit multiplier: base + 8% for every upgrade on the account.
     *  Tower levels can't change mid-run, so this is resolved once. */
    const runCritMul = critMultiplierFrom(saveRef.current.levels);
    /** Mana Conduit turns every SP payout up by the share bought this run */
    const spGain = (n: number) => Math.round(n * (1 + g.spGainMul));
    /** screen shake that honours the Screen Shake setting */
    const fxShake = (n: number) => saveRef.current.shakeFx ? Math.min(26, g.shake + n) : 0;

    const addText = (x: number, y: number, txt: string, color: string, size: number, crit: boolean) => {
      // tight cap: a wall of damage numbers is the fastest way to melt a frame
      if (g.texts.length > 28) g.texts.splice(0, g.texts.length - 28);
      g.texts.push({ x, y, txt: tr(txt), color, size, life: 0.9, crit });
    };
    const burst = (x: number, y: number, color: string, n: number, spd = 160) => {
      if (!fxOn()) n = Math.min(n, 4);
      for (let i = 0; i < n; i++) {
        if (g.parts.length > 380) g.parts.shift();
        const a = Math.random() * Math.PI * 2;
        const v = spd * (0.3 + Math.random() * 0.9);
        g.parts.push({
          x, y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - 40,
          life: 0.45 + Math.random() * 0.5,
          max: 0.95,
          size: 1.8 + Math.random() * 3.2,
          color: i % 4 === 0 ? "#ffffff" : color,
          kind: "spark",
          add: i % 3 === 0,
          drag: 0.9,
        });
      }
      if (n > 6) sparkle(x, y, color, Math.min(6, Math.round(n / 3)), spd * 0.32);
    };
    const ring = (x: number, y: number, color: string, size: number) => {
      if (g.parts.length > 380) g.parts.shift();
      g.parts.push({ x, y, vx: 0, vy: 0, life: 0.45, max: 0.45, size, color, kind: "ring" });
    };

    // ---------- the upgraded FX kit ----------
    const PART_CAP = 620;
    /** power saving keeps the particle field small: the additive pass is heat */
    // the particle budget follows the frame governor: if the draw cost climbs,
    // the cap shrinks before the frame rate does
    const partCap = () =>
      saveRef.current.powerSaver ? 180 : Math.round(PART_CAP * (0.45 + 0.55 * fxQ()));
    const pushPart = (p: Part) => {
      if (g.parts.length > partCap()) {
        // skip rather than pile on: the additive pass is the expensive one,
        // so once the field is saturated new glow/shock FX are simply dropped
        if (p.add) return;
        g.parts.shift();
      }
      g.parts.push(p);
    };

    /** a thick shockwave that expands and thins out — the workhorse impact ring */
    const shock = (x: number, y: number, color: string, size: number, life = 0.55) => {
      pushPart({ x, y, vx: 0, vy: 0, life, max: life, size, color, kind: "shock", add: true });
    };

    /** a soft additive light blob, the glue that makes everything else glow */
    const glow = (x: number, y: number, color: string, size: number, life = 0.4) => {
      if (!fxOn()) return;
      pushPart({ x, y, vx: 0, vy: 0, life, max: life, size, color, kind: "glow", add: true });
    };

    /** spinning triangular debris with gravity — used for shatter / crit impacts */
    const shards = (x: number, y: number, color: string, n: number, spd = 220) => {
      if (!fxOn()) n = Math.min(n, 4);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = spd * (0.4 + Math.random() * 0.9);
        pushPart({
          x, y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - 90,
          life: 0.55 + Math.random() * 0.5,
          max: 1.05,
          size: 3 + Math.random() * 4,
          color,
          kind: "shard",
          rot: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 16,
          grav: 1,
          drag: 1.2,
        });
      }
    };

    /** four-point sparkle stars that drift upward — the "magic" layer */
    const stars = (x: number, y: number, color: string, n: number, spread = 40) => {
      if (!fxOn()) n = Math.min(n, 3);
      for (let i = 0; i < n; i++) {
        pushPart({
          x: x + (Math.random() - 0.5) * spread,
          y: y + (Math.random() - 0.5) * spread,
          vx: (Math.random() - 0.5) * 40,
          vy: -30 - Math.random() * 70,
          life: 0.6 + Math.random() * 0.6,
          max: 1.2,
          size: 4 + Math.random() * 6,
          color,
          kind: "star",
          rot: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 6,
          add: true,
        });
      }
    };

    /** rising embers, for fire effects */
    const embers = (x: number, y: number, color: string, n: number) => {
      if (!fxOn()) n = Math.min(n, 3);
      for (let i = 0; i < n; i++) {
        pushPart({
          x: x + (Math.random() - 0.5) * 30,
          y: y + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 50,
          vy: -50 - Math.random() * 90,
          life: 0.7 + Math.random() * 0.7,
          max: 1.4,
          size: 2 + Math.random() * 3,
          color,
          kind: "ember",
          grav: -0.25,
          drag: 0.6,
          add: true,
        });
      }
    };

    /** a rotating rune ring: the signature "magic" flourish for high-tier hits */
    const rune = (x: number, y: number, color: string, size: number, life = 0.6) => {
      pushPart({
        x, y, vx: 0, vy: -8,
        life, max: life, size, color, kind: "rune",
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 2.4,
        add: true,
      });
    };

    /** a ground-plane wave: reads as a shockwave rolling away from the impact */
    const wave = (x: number, y: number, color: string, size: number, life = 0.5) => {
      pushPart({ x, y, vx: 0, vy: 0, life, max: life, size, color, kind: "wave", add: true });
    };

    /** fine additive glints that hang in the air after a big cast */
    const sparkle = (x: number, y: number, color: string, n: number, spread = 60) => {
      if (!fxOn()) n = Math.min(n, 3);
      for (let i = 0; i < n; i++) {
        pushPart({
          x: x + (Math.random() - 0.5) * spread,
          y: y + (Math.random() - 0.5) * spread,
          vx: (Math.random() - 0.5) * 22,
          vy: -14 - Math.random() * 42,
          life: 0.7 + Math.random() * 0.6,
          max: 1.3,
          size: 1.5 + Math.random() * 2.5,
          color,
          kind: "sparkle",
          add: true,
        });
      }
    };

    /**
     * REWORKED IMPACT: a layered detonation built from a white-hot core, a
     * ground wave, two readable rings, rune glyphs, hot embers and debris.
     * This one helper is the shared language of every heavy hit in the game.
     */
    const impactBlast = (x: number, y: number, color: string, radius: number, heavy = false) => {
      const r = Math.max(18, radius);
      wave(x, y, color, r * 1.15, heavy ? 0.55 : 0.42);
      ring(x, y, color, r * 0.3);
      ring(x, y, "#ffffff", r * 0.18);
      glow(x, y, "#fff4d6", r * (heavy ? 0.62 : 0.4), heavy ? 0.24 : 0.16);
      glow(x, y, color, r * 1.0, heavy ? 0.46 : 0.32);
      shock(x, y, color, r * 0.8, heavy ? 0.66 : 0.48);
      shock(x, y, "#fff8e8", r * 0.4, heavy ? 0.36 : 0.28);
      rune(x, y, color, r * (heavy ? 1.15 : 0.9), heavy ? 0.7 : 0.5);
      burst(x, y, color, heavy ? 20 : 10, heavy ? 320 : 220);
      shards(x, y, heavy ? "#fff4d6" : color, heavy ? 14 : 6, heavy ? 300 : 200);
      embers(x, y, color, heavy ? 10 : 4);
      sparkle(x, y, "#fff8e8", heavy ? 16 : 8, r * 0.9);
    };

    /** full-screen colour wash */
    const flash = (color: string, life = 0.3) => {
      if (!fxOn() || fxUserLevel >= 2) return;
      g.flash = { color, life, max: life };
    };

    /** freeze the sim briefly so a big hit lands with weight */
    const hitStop = (sec: number) => {
      if (!saveRef.current.shakeFx) return;
      g.hitStop = Math.max(g.hitStop, sec);
    };

    /** camera zoom punch + chromatic split, both decay on their own.
     *  The Shake Intensity slider owns the whole camera language: at 0% the
     *  arena stays perfectly still, punch and chroma included. */
    const punch = (n: number, chroma = 0) => {
      const intensity = Math.max(0, Math.min(2, saveRef.current.shakeIntensity ?? 1));
      if (!saveRef.current.shakeFx || intensity <= 0 || fxUserLevel >= 2) return;
      const scale = Math.min(1, intensity);
      g.punch = Math.min(1, g.punch + n * scale);
      g.chroma = Math.min(1, g.chroma + chroma * scale);
    };

    /** drop a persistent ground effect */
    const addZone = (z: Omit<Zone, "seed">) => {
      if (g.zones.length > 26) g.zones.shift();
      g.zones.push({ ...z, seed: Math.random() * 100 });
    };

    /** queue a beat of the running cast timeline */
    const schedule = (at: number, run: () => void) => {
      g.casts.push({ at: g.t + at, run });
    };

    /** the level-up / ascend flourish that plays over a tower */
    const levelFlourish = (x: number, y: number, color: string, label: string, tier = 1) => {
      if (g.levelFx.length > 8) g.levelFx.shift();
      g.levelFx.push({ x, y, color, label, t: 0, total: 1.25, tier });
      wave(x, y, color, 52 + tier * 14, 0.62);
      shock(x, y, color, 30, 0.7);
      shock(x, y, "#ffffff", 20, 0.45);
      glow(x, y, color, 70, 0.6);
      rune(x, y, color, 46 + tier * 10, 0.8);
      stars(x, y, color, 10, 54);
      sparkle(x, y, "#ffffff", 6 + tier * 3, 48);
      shards(x, y, color, tier >= 2 ? 14 : 8, 200);
      punch(tier >= 2 ? 0.5 : 0.3, tier >= 2 ? 0.4 : 0.2);
      hitStop(tier >= 2 ? 0.06 : 0.03);
    };

    /** CRIT! / BIG CRIT! / MEGA CRIT! / APOCALYPTIC! per tier */
    const CRIT_LABEL = ["", "CRIT!", "BIG CRIT!", "MEGA CRIT!", "APOCALYPTIC!"];

    /**
     * The crit package. Everything scales off the tier so a tier-1 poke stays
     * readable and a tier-4 apocalypse rewrites the screen: layered shockwaves,
     * a gold spark storm, star sparkles, spinning debris, an impact flash, a
     * freeze-frame, camera punch and a colour split.
     */
    /** crit FX are throttled: a wall of small crits may only fire one full
        starburst every 55ms (big tiers always fire), which is what kept dense
        late-game fights from turning into a lag spike. */
    let lastCritFxAt = 0;
    let lastCritScreenAt = 0;
    const critFx = (_e: Enemy, p: { x: number; y: number }, tier: number, mul: number, _dmg: number, tw?: BT) => {
      void mul;
      const heavy = tier >= 3;
      const q = fxQ();
      const nowFx = performance.now();
      // the throttle stretches as the frame gets more expensive: 90ms when the
      // device is comfortable, up to 300ms when crits are landing on every tower
      const window = q < 0.5 ? 300 : q < 1 ? 170 : 90;
      if (nowFx - lastCritFxAt < window || (q < 1 && !heavy && g.parts.length > 240)) {
        // the cheap spark for the crits we skip: keeps the beat without the cost
        ring(p.x, p.y, heavy ? "#fff2b0" : "#ffd23f", heavy ? 42 : 30);
        if (heavy && q >= 1) glow(p.x, p.y, "#ffd23f", 40, 0.25);
        return;
      }
      lastCritFxAt = nowFx;
      const gold = tier >= 4 ? "#fff6c4" : tier >= 3 ? "#fff2b0" : "#ffd23f";
      const q2 = fxQ();
      // --- the starburst itself (counts trimmed ~40% vs the old wall of sparks,
      //     then trimmed again whenever the governor is throttling)
      const scale = (n: number) => Math.max(3, Math.round(n * q2));
      burst(p.x, p.y, gold, scale(tier >= 4 ? 22 : tier >= 3 ? 16 : tier >= 2 ? 11 : 7), tier >= 3 ? 380 : 250);
      burst(p.x, p.y, "#ff8c3d", scale(tier >= 2 ? 8 : 4), 180);
      // --- layered shockwaves: rings at staggered radii
      shock(p.x, p.y, gold, tier >= 4 ? 74 : tier >= 3 ? 58 : 42, 0.5);
      ring(p.x, p.y, gold, tier >= 3 ? 62 : 44);
      if (tier >= 2) ring(p.x, p.y, "#ff8c3d", tier >= 3 ? 88 : 64);
      if (heavy) {
        ring(p.x, p.y, "#ffffff", tier >= 4 ? 118 : 96);
        glow(p.x, p.y, "#ffd23f", tier >= 4 ? 150 : 110, 0.5);
      }
      // --- debris + sparkles
      if (tier >= 2) shards(p.x, p.y, gold, scale(tier >= 4 ? 14 : 10), tier >= 3 ? 320 : 220);
      stars(p.x, p.y, gold, scale(tier >= 4 ? 14 : tier >= 3 ? 10 : 5), tier >= 3 ? 90 : 54);
      // --- a lance of light back to the tower that threw it (the single most
      //     expensive FX in the package, so it is the first thing to go)
      if (tw?.cell && q2 >= 0.7 && g.bolts.length < 26) {
        const tp = cellCenter(tw.cell.c, tw.cell.r);
        g.bolts.push(randBolt(tp.x, tp.y, p.x, p.y, gold, tier >= 4 ? 7 : tier >= 3 ? 5 : 3, 0.22, performance.now()));
      }
      // --- screen-level drama. A full-screen flash, camera punch, freeze-frame
      //     and colour split are the expensive part of a crit, and they stack
      //     badly: at most one of each every 260ms, and nothing at all while
      //     the governor is throttling unless it is a top-tier hit.
      if (tier >= 2 && (q2 >= 1 || tier >= 4) && nowFx - lastCritScreenAt > 260) {
        lastCritScreenAt = nowFx;
        flash(tier >= 4 ? "#fff2b0" : "#ffd23f", tier >= 4 ? 0.24 : 0.14);
      }
      if (tier >= 3 && q2 >= 1) {
        punch(tier >= 4 ? 0.9 : 0.55, tier >= 4 ? 0.8 : 0.4);
        hitStop(tier >= 4 ? 0.11 : 0.06);
      }
      g.shake = fxShake(tier >= 4 ? 11 : tier >= 3 ? 7 : tier >= 2 ? 4 : 1.6);
      // --- and a lingering ring of gold light on the ground where it landed
      if (tier >= 4) shock(p.x, p.y, "#fff2b0", 150, 0.75);
      // --- sound: the higher the tier, the fatter the hit
      if (tier >= 3) sfx.critBig();
      else sfx.crit();
    };

    const summonCost = () => spCost(g.spSpend);
    /** Each tower family has its own ascent ladder, so upgrading one family
     * never raises the price of the others. */
    const ascCost = (battleLevel: number) => ascSpCost(Math.max(0, battleLevel - 1));

    const startWave = () => {
      g.phase = "wave";
      g.phaseT = 999;
      const spawnInterval = mode === "gemrush" ? 0.22 : mode === "sandbox" ? sandboxCfgRef.current.interval : enemySpawnInterval(g.round);
      let composition = mode === "gemrush"
        ? Array.from({ length: 18 + Math.min(10, Math.floor(g.round / 5)) }, () => {
            const mobTypes = ENEMY_TYPES.map((_, i) => i).filter((type) => !isBossType(type));
            return mobTypes[Math.floor(Math.random() * mobTypes.length)] ?? 0;
          }).concat(g.round % 4 === 0 ? [g.nextBossType ?? BOSS_TYPES[Math.floor(Math.random() * BOSS_TYPES.length)]] : [])
        : waveComp(g.round);
      // HARDCORE: two bodies per spawn slot, arriving as a pair
      const pairSpawn = mode === "hardcore";
      composition = hardcoreSpawnPlan(composition, mode);
      g.spawnQ = composition.map((type, i) => ({
        type,
        at: g.t + (mode === "gemrush" ? 0.3 : 0.8) + (pairSpawn ? Math.floor(i / HARDCORE_SPAWN_MUL) : i) * spawnInterval,
      }));
      if (composition.some(isBossType) && g.nextBossType !== null) {
        let assigned = false;
        g.spawnQ = g.spawnQ.map((spawn) => {
          if (!isBossType(spawn.type)) return spawn;
          if (assigned) return spawn;
          assigned = true;
          return { ...spawn, type: g.nextBossType! };
        });
        g.nextBossType = null;
      }
      g.waveTotal = g.spawnQ.length;
      g.waveSpawned = 0;
      // bosses walk in first: their cutscene should open the wave, not trail it
      for (const s2 of g.spawnQ) if (isBossType(s2.type)) s2.at = Math.min(s2.at, g.t + 2.4);
      g.spawnQ.sort((a, b) => a.at - b.at);
      if (g.round === 1) sfx.battleStart();
      else sfx.wave();
    };

    /**
     * GAUNTLET BOON: the run's only progression axis. Every cleared wave stops
     * the sim and offers three of these; the pick is banked in `g.boons` and the
     * next wave starts immediately (no countdown) so a run never loses rhythm.
     */
    const applyBoon = (b: GauntletBoon) => {
      g.boons.push(b);
      switch (b.id) {
        case "power":
          g.dmgBonus += 0.18;
          break;
        case "haste":
          g.bonusAspd += 0.12;
          break;
        case "edge":
          g.critRate += 0.08;
          g.critDmg += 0.35;
          break;
        case "greed":
          g.goldMul *= 1.25;
          break;
        case "mana":
          g.spGainMul = Math.min(3, g.spGainMul + 0.2);
          break;
        case "ward":
          g.lives += 4;
          break;
        case "barrage": {
          const live = g.towers.filter((t) => t.cell);
          for (let i = 0; i < 3 && live.length; i++) {
            const t = live[Math.floor(Math.random() * live.length)];
            t.points += 2;
            const p = cellCenter(t.cell!.c, t.cell!.r);
            glow(p.x, p.y, b.color, 60, 0.5);
          }
          break;
        }
        case "ascension": {
          const live = g.towers.filter((t) => t.cell);
          if (live.length) {
            const t = live[Math.floor(Math.random() * live.length)];
            // battle levels cap at 5 (see run shop); the boon respects the cap
            t.bLv = Math.min(5, t.bLv + 1);
            const p = cellCenter(t.cell!.c, t.cell!.r);
            ring(p.x, p.y, b.color, 70);
            glow(p.x, p.y, b.color, 90, 0.6);
          }
          break;
        }
        case "bounty":
          g.gold += 500;
          break;
      }
      toastRef.current(`${b.glyph} ${b.name} · ${b.desc}`, b.color);
    };

    const takeBoon = (b: GauntletBoon) => {
      if (g.phase !== "boon" || g.final) return;
      applyBoon(b);
      g.boonOffer = null;
      g.round++;
      startWave();
      sfx.coin();
    };
    boonPickRef.current = takeBoon;

    const endGame = (won: boolean) => {
      if (g.final) return;
      g.phase = won ? "won" : "lost";
      const rounds = won ? g.maxRounds : Math.max(0, g.round - 1);
      const frags: { id: string; n: number }[] = [];
      // Endless and Gauntlet pay depth fragments; Gem Rush pays only its kill bank.
      const nfBase = mode === "gemrush" ? 0 : !isRunMode(mode) ? Math.min(12, 1 + Math.floor(rounds / 3)) : won ? 3 : 1;
      const nf = nfBase * rewardMul;
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

      // GAUNTLET: the payout curve lives in save.ts (collectGauntlet) so the
      // ledger and the menu best-score agree. Dry-run it against a clone to get
      // the numbers the results screen shows; collect() applies them for real.
      let gauntletPay: { gold: number; gems: number; potions: number; record: boolean } | null = null;
      if (mode === "gauntlet") {
        gauntletPay = collectGauntlet({ ...saveRef.current }, rounds, g.boons.length, saveRef.current.gauntletBest);
      }
      const clearRewardGold = mode === "gemrush" ? 0 : gauntletPay
        ? gauntletPay.gold
        : mode === "endless"
          ? endlessGold
          : won
            ? reward(150 + 30 * g.maxRounds)
            : reward(30 + 10 * rounds);
      // Apply the +50% run-gold bonus to the final clear payout too; the wallet
      // has already been boosted at each kill and wave-clear as it was earned.
      const baseGold = mode === "gemrush" ? 0 : runGold(clearRewardGold) * rewardMul + wallet;
      const baseGems = mode === "gemrush" ? g.gemRushGems : gauntletPay ? gauntletPay.gems : mode === "endless" ? endlessGems : won ? reward(2) : 0;
      // Crystal potions are normal run salvage; Gem Rush pays only its kill-based gems.
      const potions = mode === "gemrush" ? 0 : gauntletPay ? gauntletPay.potions : ((won ? 3 : 1) + Math.floor(rounds / 3)) * rewardMul;
      // Items Finding drops chip modules on a win (one extra advanced on boss waves)
      const chips: ChipBag | null =
        won && EV_BONUS.chipDrop
          ? Object.fromEntries(Object.entries({ ...EV_BONUS.chipDrop, ...(rounds >= 4 ? { advanced: 1 } : {}) }).map(([key, value]) => [key, Math.round(value * rewardMul)])) as unknown as ChipBag
          : null;
      // trophies only move in Battle; Endless is a score mode with no ladder stake
      const trophies = mode === "battle" ? trophyDelta(won, EV_BONUS, saveRef.current.streak) : 0;

      g.final = {
        won,
        gold: mode === "gemrush" || mode === "sandbox" ? 0 : Math.round(baseGold * EV_BONUS.goldMul * MONTH_BONUS.goldMul),
        gems: mode === "sandbox" ? 0 : mode === "gemrush" ? baseGems : Math.round(baseGems * EV_BONUS.gemMul * MONTH_BONUS.gemMul * rewardMul),
        tokens: mode === "endless" ? endlessTokens : mode === "hardcore" || mode === "superhardcore" ? Math.max(1, endlessTokens) * rewardMul : 0,
        frags,
        rounds,
        trophies,
        potions,
        chips,
        gauntlet: gauntletPay ? { boons: g.boons.length, record: gauntletPay.record } : undefined,
      };
      if (mode === "gemrush") toastRef.current(`GEM RUSH OVER · ${g.gemRushGems.toLocaleString()} GEMS READY TO CLAIM`, "#35e0ff");
      if (won) sfx.win();
      else sfx.lose();
    };

    const killReward = (e: Enemy) => {
      e.dead = true;
      g.kills++;
      if (isBossType(e.type) && !(isRunMode(mode) && g.round >= g.maxRounds)) {
        // Deal from a shuffled deck rather than sampling with replacement:
        // no immediate repeat, and every boss is seen before the bag refills.
        if (!g.bossDeck.length || (g.bossDeck.length === 1 && g.bossDeck[0] === e.type)) {
          g.bossDeck = shuffledBossDeck(e.type);
        }
        if (g.bossDeck[0] === e.type && g.bossDeck.length > 1) {
          const swap = 1 + Math.floor(Math.random() * (g.bossDeck.length - 1));
          [g.bossDeck[0], g.bossDeck[swap]] = [g.bossDeck[swap], g.bossDeck[0]];
        }
        const next = g.bossDeck.shift() ?? BOSS_TYPES.find((type) => type !== e.type) ?? BOSS_TYPES[0];
        g.nextBossType = next;
        g.roulette = { type: next, t: 3.2, total: 3.2 };
        sfx.bossRoulette();
      }
      if (mode === "gemrush") g.gemRushGems += gemRushKillGems(!!e.elite, isBossType(e.type));
      // Supervisor turns every kill into a permanent speed-buff tick for each tower.
      if (g.towers.some((tower) => tower.def.id === "supervisor" && tower.cell)) {
        const hypervisorTier = saveRef.current.awn.supervisor?.[0] || 0;
        const waveAmplification = hypervisorTier > 0 ? Math.min(60, Math.max(0, g.round - 1)) : 0;
        const superMultiplier = 1 + 60 + waveAmplification; // +6,000%, scaling to +12,000% with Hypervisor
        for (const tower of g.towers) {
          if (!tower.cell || tower.superBuff >= 20) continue;
          const amplified = Math.random() < 0.2;
          tower.superBuff = Math.min(20, tower.superBuff + 0.01 * (amplified ? superMultiplier : 1));
          if (amplified) {
            const tp = cellCenter(tower.cell.c, tower.cell.r);
            glow(tp.x, tp.y, "#ff315c", 35, 0.22);
          }
        }
      }
      // sp payout: 10 base, elites x5, bosses x10, then the monthly modifier and
      // whatever Mana Conduit share the run has bought
      // Electrical Induction: lightning kills pay +50% SP and run gold (and
      // +5% more of each per awakening tier)
      const induction = g.heroId === "thunder" ? saveRef.current.heroAwn?.thunder?.[0] || 0 : 0;
      const inductionMul = induction > 0 && e.lightKill ? 1 + inductionBonus(induction) : 1;
      g.sp += spGain(Math.round(e.spv * inductionMul));
      // run gold is 50% richer across the board (kills, bounties, wave clears)
      // and HARDCORE multiplies every payout by 100
      g.gold += runGold(Math.round(e.gold * MONTH_BONUS.goldMul * g.goldMul * inductionMul * rewardMul));
      const p = enemyPos(e);
      const et = ENEMY_TYPES[e.type];
      if (e.elite) {
        addText(p.x, p.y - 30, "ELITE KILL", "#ffd23f", 13, true);
        ring(p.x, p.y, "#ffd23f", 40);
      }
      // Deaths now share a layered detonation profile; bosses get a heavier core.
      impactBlast(p.x, p.y, et.color, isBossType(e.type) ? 54 : e.elite ? 34 : 24, isBossType(e.type));
      if (isBossType(e.type)) {
        flash(et.color, 0.22);
        punch(0.7, 0.5);
        hitStop(0.08);
        stars(p.x, p.y, et.accent, 14, 120);
      }
      // Storm Sovereign: a marked death re-arcs its static into nearby enemies
      if (e.mark > 0) {
        const now2 = performance.now();
        const near = g.enemies
          .filter((o) => !o.dead && o.id !== e.id)
          .map((o) => ({ o, dist: Math.hypot(enemyPos(o).x - p.x, enemyPos(o).y - p.y) }))
          .filter((x) => x.dist < 180)
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 3);
        near.forEach(({ o }) => {
          const op = enemyPos(o);
          if (g.bolts.length < 44) g.bolts.push(randBolt(p.x, p.y, op.x, op.y, "#fff6a8", 2.2, 0.26, now2));
          o.mark = Math.max(o.mark, 3);
          dealDamage(o, (70 + 22 * g.round), { color: "#ffe14d" });
          glow(op.x, op.y, "#ffe14d", 30, 0.3);
        });
        if (near.length) addText(p.x, p.y - 36, "STATIC ARC", "#ffe14d", 13, true);
      }
    };

    /** HARDCORE pays out 100×; every other mode pays 1× */
    const rewardMul = payoutMul(mode);

    /** enemies armed by Bolt from the Blue, resolved once per frame */
    const boltQueue: Enemy[] = [];

    /**
     * Electrical Induction (Thunder God awakening 1): a lightning strike stuns
     * and strips the target's shield. The cut is a multiplier applied by
     * dealDamage; over 100% it flips armour negative and adds bonus damage.
     */
    const inductionStrike = (e: Enemy) => {
      const tier = saveRef.current.heroAwn?.thunder?.[0] || 0;
      if (tier <= 0 || e.dead) return;
      const cut = 1.2 + 0.2 * (tier - 1);
      e.shieldCut = Math.max(e.shieldCut || 0, cut);
      e.shieldCutT = Math.max(e.shieldCutT || 0, 5);
      e.stun = Math.max(e.stun, 1.2);
      const p = enemyPos(e);
      if (g.parts.length < 380) {
        pushPart({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.34, max: 0.34, size: 30, color: "#7ce7ff", kind: "ring", add: true });
        pushPart({ x: p.x, y: p.y, vx: 0, vy: -20, life: 0.5, max: 0.5, size: 34, color: "#c9f7ff", kind: "rune", add: true, rot: Math.random() * 6.28, spin: 2.4 });
      }
    };

    const dealDamage = (e: Enemy, raw: number, opt: { alwaysCrit?: boolean; tw?: BT; color?: string; noCrit?: boolean; lightning?: boolean }) => {
      if (e.dead) return;
      // HARDCORE enemies are immune to crits: no roll, no forced crit, no crit
      // multiplier on anything — the merged crit stat simply does not apply
      const critImmune = !critAllowed(mode);
      let crit = !critImmune && (opt.alwaysCrit ?? false);
      // executions and instant kills skip the crit roll: the number is the point
      if (!crit && !opt.noCrit && !critImmune) crit = Math.random() < CRIT_CHANCE + g.critRate;
      // note: tower/aura multipliers are already folded into `raw` by the caller
      // Electrical Induction: a stripped shield turns armour into a liability.
      // A 120% cut on a 30%-armour boss leaves it at -6% armour (i.e. +6% damage).
      const shieldCut = (e.shieldCutT || 0) > 0 ? (e.shieldCut || 0) : 0;
      const plate = (e.plating || 0) > 0 ? BOSS_BANNER_ARMOR : 0;
      let dmg = raw * (1 - (e.armor + plate) * (1 - shieldCut));
      if (e.ward > 0) dmg *= 0.45 + 0.55 * Math.min(1, shieldCut); // boss Bulwark
      if (e.link > 0) dmg *= 1 - BOSS_CHAINS_DR * (1 - Math.min(1, shieldCut)); // Rift Chains shield
      // anything past a full strip is pure bonus damage
      if (shieldCut > 1) dmg *= 1 + (shieldCut - 1) * 0.5;
      if (e.slowT > 0) dmg *= 1 + SLOW_VULN; // chilled enemies shatter easier
      if (e.encased > 0) dmg *= 2; // Absolute Zero: ice doubles everything that lands
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
      // the merged account crit stat, resolved once per run (see `runCritMul`)
      if (crit) dmg *= runCritMul + g.critDmg;
      // crits are the loudest thing on screen: heavy number + shockwave + shake.
      // The tier climbs with the multiplier *and* with how much of the target's
      // health the hit ate, so a maxed account's crit is a genuine event.
      const share = dmg / Math.max(1, e.max);
      const critTier = crit
        ? share >= 0.75 || runCritMul >= 12
          ? 4
          : share >= 0.35 || runCritMul >= 6
            ? 3
            : runCritMul >= 2.4 || dmg > 900
              ? 2
              : 1
        : 0;
      e.hp -= dmg;
      e.flash = Math.min(0.16, (e.flash || 0) + 0.1);
      if (opt.lightning) {
        if (e.hp <= 0) e.lightKill = true;
      }
      // Bolt from the Blue: the first time an enemy crosses the health line a
      // thin bolt comes out of nowhere (queued so we never recurse mid-hit)
      if (!e.boltHit && e.hp > 0 && g.heroId === "thunder") {
        const boltTier = saveRef.current.heroAwn?.thunder?.[1] || 0;
        if (boltTier > 0 && e.hp / e.max <= boltThreshold(boltTier)) {
          e.boltHit = true;
          boltQueue.push(e);
        }
      }
      const p = enemyPos(e);
      if (crit) {
        critFx(e, p, critTier, runCritMul, dmg, opt.tw);
      } else if (fxOn() && Math.random() < 0.35) {
        // ordinary hits keep a modest pop (on a sample of hits) so crits still stand out
        pushPart({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.22, max: 0.22, size: 26, color: opt.color || "#ffffff", kind: "shock", add: true });
      }
      // big Bungee numbers are rasterised text: while the governor is throttling
      // only the top-tier crits get a label and a multiplier line
      const textBudget = fxQ() < 0.7 ? 8 : 14;
      if (saveRef.current.dmgNums && (crit || g.texts.length < textBudget)) {
        const size = crit ? 24 + critTier * 6 : 15;
        addText(p.x + (Math.random() - 0.5) * 18, p.y - 26, String(Math.round(dmg)), crit ? (critTier >= 3 ? "#fff6c4" : "#ffd23f") : "#ffffff", size, crit);
        if (crit && (fxQ() >= 1 || critTier >= 3)) addText(p.x, p.y - 54 - critTier * 5, CRIT_LABEL[critTier] || "CRIT!", "#ff8c3d", 12 + critTier * 2, true);
        if (crit && critTier >= 3) addText(p.x, p.y - 74 - critTier * 5, `×${runCritMul.toFixed(2)} CRIT DMG`, "#ffb324", 12, true);
      }
      if (crit) {
        g.crits++;
        if (dmg > g.bestHit) g.bestHit = Math.round(dmg);
      }
      burst(p.x, p.y, opt.color || "#ffcf4d", crit ? 5 : 2);
      if (e.hp <= 0) {
        if (opt.tw && (opt.tw.def.id === "hellstorm" || opt.tw.def.killStack)) opt.tw.streak++;
        // Soul Siphon + the SP-type awakenings pay the grid on every kill
        if (opt.tw) {
          let sp = opt.tw.def.spGain || 0;
          for (const slot of [0, 1] as const) {
            const spec = awkSpec(opt.tw, slot);
            if (!spec || spec.fx !== "sp") continue;
            const tier = awkTier(opt.tw, slot);
            if (tier > 0 && Math.random() < spec.chance[tier - 1]) sp += spec.mult[tier - 1];
          }
          if (sp > 0) {
            g.sp += spGain(sp);
            glow(p.x, p.y, "#c44dff", 44, 0.35);
            addText(p.x, p.y - 20, `+${Math.round(sp)} SP`, "#c44dff", 12, false);
          }
          // bounty awakenings: extra gold per kill
          let goldMul = 0;
          for (const slot of [0, 1] as const) {
            const spec = awkSpec(opt.tw, slot);
            if (!spec || spec.fx !== "bounty") continue;
            const tier = awkTier(opt.tw, slot);
            if (tier > 0 && Math.random() < spec.chance[tier - 1]) goldMul += spec.mult[tier - 1];
          }
          if (goldMul > 0) {
            const extra = runGold(Math.round(e.gold * goldMul * g.goldMul * rewardMul));
            g.gold += extra;
            addText(p.x, p.y - 34, `+${extra}`, "#ffcf4d", 12, false);
          }
          // onKill skill family: pay-out triggers on the kill
          if (sp > 0 || goldMul > 0) {
            sfx.onKill();
            stars(p.x, p.y, "#ffd23f", 5, 50);
          }
          // leech awakenings: kills claw lives back
          let heal = 0;
          for (const slot of [0, 1] as const) {
            const spec = awkSpec(opt.tw, slot);
            if (!spec || spec.fx !== "leech") continue;
            const tier = awkTier(opt.tw, slot);
            if (tier > 0 && Math.random() < spec.chance[tier - 1]) heal += spec.mult[tier - 1];
          }
          if (heal > 0 && mode !== "superhardcore") {
            const n = Math.max(1, Math.round(heal));
            g.lives += n;
            glow(p.x, p.y, "#8effc4", 56, 0.4);
            addText(p.x, p.y - 22, `+${n} LIVES`, "#8effc4", 12, false);
            sfx.point();
          }
        }
        killReward(e);
      }
    };

    const onPlaced = (t: BT, c: number, r: number) => {
      t.cell = { c, r };
      const p = cellCenter(c, r);
      sfx.towerDrop();
      ring(p.x, p.y, RARITY[t.def.rarity].color, 40);
      burst(p.x, p.y, RARITY[t.def.rarity].color, 10);
      const tier = saveRef.current.awn["hellstorm"]?.[0] || 0;
      if (t.def.id === "hellstorm" && tier > 0) {
        t.streak = 20 + 10 * tier;
        addText(p.x, p.y - 30, "SCORCHING HOT", "#ff7a3d", 13, true);
      }
    };

    /**
     * Lightning Princess: the whole sky opens AT ONCE. Every target is struck
     * on the same frame — segmented bolts, forks and damage all land together,
     * with no per-target stagger — so the ability reads as one storm front
     * rather than a queue of single strikes. Chain light then forks between the
     * targets, which is the only travelling bolt left.
     */
    const strikeLightning = (t: BT) => {
      const now = performance.now();
      const tier1 = saveRef.current.awn["lightning"]?.[0] || 0;
      const tier2 = saveRef.current.awn["lightning"]?.[1] || 0;
      const dmgBase = towerDamage(t.def, t.menuLv, t.bLv, t.points, t.atkMul) * 1.12 * globalMul(t);
      const targets = g.enemies.filter((e) => !e.dead).sort((a, b) => a.d - b.d);
      const shown = targets.slice(0, 10);
      const superbolt = tier1 > 0 && Math.random() < t.def.awk1!.chance[tier1 - 1];
      const judgement = tier2 > 0 && Math.random() < t.def.awk2!.chance[tier2 - 1];

      // ---- every target is struck on THIS frame, all at once ----
      shown.forEach((e) => {
        const ep = enemyPos(e);
        g.strikes.push({
          x: ep.x,
          y: ep.y,
          life: 0.42,
          max: 0.42,
          width: superbolt ? 16 : 10,
          color: superbolt ? "#fff6c4" : "#ffe86b",
          seed: Math.random() * 100,
          forks: superbolt ? 3 : 2,
        });
        addZone({
          kind: "rift",
          x: ep.x,
          y: ep.y,
          r: superbolt ? 70 : 46,
          life: 0.42,
          max: 0.42,
          dps: 0,
          slow: 0,
          color: superbolt ? "#fff6c4" : "#ffd23f",
        });
        sparkAt(ep.x, ep.y, superbolt ? 22 : 12, superbolt ? 300 : 200);
        shock(ep.x, ep.y, superbolt ? "#fff6c4" : "#ffe86b", superbolt ? 90 : 54, 0.32);
        glow(ep.x, ep.y, "#fff2b0", superbolt ? 120 : 70, 0.28);
        if (!e.dead) dealDamage(e, dmgBase, { alwaysCrit: judgement, tw: t, color: "#ffe86b" });
      });

      // ---- the storm reads as a single sky event, not ten separate shots ----
      flash("#fff2b0", superbolt ? 0.16 : 0.08);
      g.shake = fxShake(superbolt ? 6 : 3);
      if (superbolt && shown.length) {
        // one enemy is singled out: a pillar twice as wide, twice as tall, and
        // the whole screen dims for a frame as it lands
        const big = shown[Math.floor(Math.random() * shown.length)];
        const bp = enemyPos(big);
        g.strikes.push({ x: bp.x, y: bp.y, life: 0.5, max: 0.5, width: 30, color: "#ffffff", seed: 7, forks: 4, top: -120 });
        hitStop(0.05);
        punch(0.4, 0.3);
        // the superbranch lands with the rest of the storm, not after it
        if (!big.dead) {
          dealDamage(big, dmgBase * t.def.awk1!.mult[tier1 - 1], { alwaysCrit: true, tw: t, color: "#ffffff" });
          addText(bp.x, bp.y - 62, "SUPERBOLT", "#ffffff", 16, true);
        }
        sfx.superbolt();
      }
      // ---- restrike awakened: extra columns fall on the same cluster ----
      if (tier2 > 0 && Math.random() < t.def.awk2!.chance[tier2 - 1] && shown.length) {
        const lo = t.def.awk2!.mult[tier2 - 1];
        const hi = t.def.awk2!.mult2![tier2 - 1];
        const k = lo + Math.floor(Math.random() * Math.max(1, hi - lo + 1));
        for (let i = 0; i < k; i++) {
          const e = shown[Math.floor(Math.random() * shown.length)];
          const ep = enemyPos(e);
          g.strikes.push({ x: ep.x, y: ep.y, life: 0.36, max: 0.36, width: 8, color: "#9ff3ff", seed: Math.random() * 100, forks: 2 });
          dealDamage(e, dmgBase * 0.8, { tw: t, color: "#9ff3ff" });
        }
      }
      // Superbolt's lane-chain carries past the front ten and deals a hard 45% hit.
      if ((superbolt || g.lightningBonus > 0) && shown.length) {
        const tail = shown[shown.length - 1];
        const origin = enemyPos(tail);
        for (const enemy of targets.slice(shown.length, shown.length + 3)) {
          const ep = enemyPos(enemy);
          if (g.bolts.length < 44) g.bolts.push(randBolt(origin.x, origin.y, ep.x, ep.y, "#fff6c4", 2.6, 0.2, now));
          g.strikes.push({ x: ep.x, y: ep.y, life: 0.28, max: 0.28, width: 8, color: "#fff6c4", seed: Math.random() * 100, forks: 3 });
          dealDamage(enemy, dmgBase * 0.45, { alwaysCrit: superbolt, tw: t, color: "#fff6c4" });
        }
      }

      // ---- chain light between whichever targets were struck ----
      if (shown.length > 1) {
        const pts = shown.map((e) => enemyPos(e));
        for (let i = 1; i < Math.min(pts.length, 7); i++) {
          if (g.bolts.length < 44) g.bolts.push(randBolt(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, "#cfefff", 1.6, 0.16, now));
        }
      }
      sfx.shoot("lightning");
      sfx.zap();
    };

    /**
     * Demon Execution's fixed-cadence, unbuffable execution bolt. One strike
     * now picks ONE enemy (the furthest along the lane) instead of the whole
     * field. Regular enemies and elites are executed outright; bosses cannot be
     * executed, so they lose 50% of their max HP instead. The sky channel is
     * deep red with 50% more jitter and one extra jag segment.
     */
    const demonStrike = (t: BT, rank = 0) => {
      const now = performance.now();
      const tier2 = saveRef.current.awn.demon?.[1] || 0;
      // rank 0 is the furthest enemy along the lane; each extra point of the tower
      // queues the next-furthest, so a multi-strike volley spreads across the field
      const list = g.enemies.filter((e) => !e.dead).sort((a, b) => b.d - a.d);
      if (!list.length) return;
      const target = list[rank % list.length];
      const ep = enemyPos(target);
      const boss = isBossType(target.type);
      const elite = !!target.elite;
      const blood = "#6e0014";
      const deep = "#8c0018";
      const hotBlood = "#c4002c";
      const core = "#ff2b4f";
      const jit = { jit: 1.5, jag: 1 };
      const hellTargets: { enemy: Enemy; x: number; y: number; knockMeters: number }[] = [];

      // Hell Dimensions opens a descending portal under an elite or boss that
      // the strike hits. Its target is banished to spawn, and nearby enemies
      // are hurled backward. The execution/damage step below still resolves.
      if (tier2 > 0 && (elite || boss)) {
        const baseRadius = 72;
        const portalRadius = baseRadius * (1 + t.def.awk2!.mult[tier2 - 1]);
        const knockMeters = 10 + t.def.awk2!.mult2![tier2 - 1];
        const knockPixels = knockMeters * 10; // arena path scale: 10 px per metre
        const portalAt = ep;
        g.strikes.push({ x: portalAt.x, y: portalAt.y, life: 0.26, max: 0.26, width: 26 + tier2 * 2, color: blood, core, seed: Math.random() * 100, forks: 5, top: -H, ...jit });
        addZone({ kind: "hell", x: portalAt.x, y: portalAt.y, r: portalRadius, life: 1.25, max: 1.25, dps: 0, slow: 0, color: hotBlood });
        ring(portalAt.x, portalAt.y, hotBlood, portalRadius);
        shock(portalAt.x, portalAt.y, hotBlood, portalRadius * 2.3, 0.72);
        glow(portalAt.x, portalAt.y, "#ff263f", portalRadius * 2, 0.65);
        burst(portalAt.x, portalAt.y, blood, 32, 430);
        sparkAt(portalAt.x, portalAt.y, 30, 420);
        addText(portalAt.x, portalAt.y - 82, `HELL DIMENSIONS · ${knockMeters}m`, "#ff5266", 15, true);
        for (const nearby of list) {
          if (nearby === target || nearby.dead) continue;
          const np = enemyPos(nearby);
          if (Math.hypot(np.x - portalAt.x, np.y - portalAt.y) > portalRadius * 1.35) continue;
          nearby.d = Math.max(0, nearby.d - knockPixels);
          nearby.ox = 0;
          nearby.oy = 0;
          const knocked = enemyPos(nearby);
          if (g.bolts.length < 44) g.bolts.push(randBolt(portalAt.x, portalAt.y, knocked.x, knocked.y, hotBlood, 2.2, 0.24, now, jit));
          shock(knocked.x, knocked.y, hotBlood, 48, 0.3);
        }
        hellTargets.push({ enemy: target, x: portalAt.x, y: portalAt.y, knockMeters });
        punch(0.8, 0.65);
        hitStop(0.08);
        g.shake = saveRef.current.shakeFx ? Math.min(26, g.shake + 22) : 0;
      }

      // Deep-red sky channel. Visual only: the damage step below decides the outcome.
      const width = boss ? 26 : elite ? 20 : 16;
      g.strikes.push({ x: ep.x, y: ep.y, life: 0.58, max: 0.58, width, color: deep, core, seed: Math.random() * 100, forks: boss ? 7 : 5, top: -H, ...jit });
      g.strikes.push({ x: ep.x, y: ep.y, life: 0.34, max: 0.34, width: boss ? 11 : 7, color: hotBlood, core, seed: Math.random() * 100, forks: 4, top: -H * 0.45, ...jit });
      g.strikes.push({ x: ep.x, y: ep.y, life: 0.2, max: 0.2, width: boss ? 8 : 4, color: core, core: "#ffd0d8", seed: Math.random() * 100, forks: 3, top: -H * 0.9, ...jit });
      addZone({ kind: "execution", x: ep.x, y: ep.y, r: boss ? 150 : 96, life: 0.92, max: 0.92, dps: 0, slow: 0, color: hotBlood });
      ring(ep.x, ep.y, "#c4002c", boss ? 116 : 78);
      shock(ep.x, ep.y, hotBlood, boss ? 240 : 165, 0.68);
      glow(ep.x, ep.y, "#b0001f", boss ? 260 : 190, 0.58);
      burst(ep.x, ep.y, blood, boss ? 42 : 28, boss ? 520 : 400);
      sparkAt(ep.x, ep.y, boss ? 42 : 28, boss ? 540 : 430);
      for (const portal of hellTargets) {
        portal.enemy.d = 0;
        portal.enemy.ox = 0;
        portal.enemy.oy = 0;
        addText(portal.x, portal.y - 58, `BANISHED TO SPAWN · ${portal.knockMeters}m BLAST`, "#ffd7dc", 12, true);
      }
      flash("#680010", 0.42);
      punch(1, 0.85);
      hitStop(0.12);
      g.shake = saveRef.current.shakeFx ? Math.min(26, g.shake + 24) : 0;
      sfx.demonStrike();

      if (boss) {
        // bosses cannot be executed: half of their max health is torn away
        const cut = target.max * 0.5;
        target.hp = Math.max(0, target.hp - cut);
        target.flash = 0.3;
        addText(ep.x, ep.y - 58, `-25% MAX HP`, "#ff4059", 17, true);
        addText(ep.x, ep.y - 36, `−${shortHp(cut)}`, "#ffd7dc", 13, true);
        if (target.hp <= 0) {
          killReward(target);
          addText(ep.x, ep.y - 78, "BOSS EXECUTED", "#ff4059", 17, true);
        }
        toastRef.current(`DEMON EXECUTION — boss loses 50% max HP`, "#a80020");
      } else {
        addText(ep.x, ep.y - 58, "EXECUTED", "#ff4059", 13, true);
        target.hp = 0;
        killReward(target); // unconditional: no immunity, armour, ward or damage modifiers
        toastRef.current(`DEMON EXECUTION — enemy executed`, "#a80020");
      }
      addText(W / 2, H * 0.3, `SOULS ERASED · ${target.dead ? 1 : 0}`, "#ff4059", 22, true);
    };

    /** small helper: a tight fan of sparks at a point (used by the sky bolts) */
    const sparkAt = (x: number, y: number, n: number, spd: number) => {
      if (!fxOn()) n = Math.min(n, 5);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = spd * (0.35 + Math.random() * 0.9);
        pushPart({
          x, y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v * 0.5 - 60,
          life: 0.24 + Math.random() * 0.3,
          max: 0.55,
          size: 2 + Math.random() * 3,
          color: "#fff6c4",
          kind: "spark",
          add: true,
        });
      }
    };

    /** global buffs, with Superbolt's extra multiplier restricted to lightning towers */
    const globalMul = (t?: BT) =>
      (g.odT > 0 ? 1 + OVERDRIVE_DMG : 1) *
      (1 + g.dmgBonus) *
      (t && isLightningTower(t.def) ? 1 + g.lightningBonus : 1);

    /** kill-stack towers (Dragon's Maw) build damage with every kill they land */
    const killStackMul = (t: BT) => {
      if (!t.def.killStack) return 1;
      const tier = saveRef.current.awn[t.def.id]?.[1] || 0;
      const cap = tier > 0 ? t.def.awk2!.mult[tier - 1] : 0;
      return 1 + Math.min(cap, t.streak) * t.def.killStack;
    };

    /**
     * Generic awakening layer. Towers whose awakening carries an `fx` tag are
     * driven from here, so every one of the 37 towers has something that actually
     * fires instead of just a description. Towers with bespoke handling
     * (lightning, plasma, dragon, sun, hellstorm, rail) have no `fx` and keep
     * their own code paths.
     */
    const awkSpec = (t: BT, slot: 0 | 1): AwkSpec | null => {
      const spec = slot === 0 ? t.def.awk1 : t.def.awk2;
      if (!spec || !spec.fx) return null;
      const tier = saveRef.current.awn[t.def.id]?.[slot] || 0;
      return tier > 0 ? spec : null;
    };
    const awkTier = (t: BT, slot: 0 | 1) => saveRef.current.awn[t.def.id]?.[slot] || 0;

    /**
     * Rolls an awakening's chance at the current tier and returns its magnitude,
     * or 0 when the roll fails or the awakening is not owned.
     */
    const rollAwk = (t: BT, slot: 0 | 1): number => {
      const spec = awkSpec(t, slot);
      if (!spec) return 0;
      const tier = awkTier(t, slot);
      if (tier <= 0 || Math.random() >= spec.chance[tier - 1]) return 0;
      return spec.mult[tier - 1];
    };

    /** every aura-type awakening on a tower folded into one strength bonus */
    const auraAwk = (t: BT) => {
      let mul = 1;
      for (const slot of [0, 1] as const) {
        const spec = awkSpec(t, slot);
        if (!spec || spec.fx !== "aura") continue;
        mul *= 1 + spec.mult[awkTier(t, slot) - 1];
      }
      return mul;
    };

    /** damage growth from battle levels, points, auras, honors and the global buffs */
    const towerPower = (t: BT) =>
      Math.pow(ASC_DMG_MUL, Math.max(0, t.bLv - 1)) *
      (1 + POINT_DMG_STEP * t.points) *
      t.atkMul *
      (1 + t.honorMul) * // Honor Emperor: permanent blessing per honor taken
      (t.surgeT > 0 ? 1 + t.surgeMul : 1) * // Heavenly God: merge surge
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
        const ep = enemyPos(e);
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
      const base = towerDamage(t.def, t.menuLv, t.bLv, t.points, t.atkMul) * globalMul(t) * killStackMul(t);
      const upg = t.menuLv - 1;
      const asc = t.bLv - 1;
      // ---------- awakening rolls that change the shot itself ----------
      const heavy = rollAwk(t, 0); // Heavy Shells / Void Locus / Skyfall / Overpenetration...
      let forceCrit = rollAwk(t, 1) > 0; // Hollow Points / Hurled Reaper / Shatterpoint...
      if (rollAwk(t, 0) > 0 && awkSpec(t, 0)?.fx === "critup") forceCrit = true;
      let dmg = heavy > 0 ? base * (1 + heavy) : base;
      const volley = rollAwk(t, 1) > 0 && awkSpec(t, 1)?.fx === "volley" ? awkSpec(t, 1)!.mult[awkTier(t, 1) - 1] : 0;
      const volley0 = rollAwk(t, 0) > 0 && awkSpec(t, 0)?.fx === "volley" ? awkSpec(t, 0)!.mult[awkTier(t, 0) - 1] : 0;
      const extraShots = Math.round(volley + volley0);
      if (heavy > 0) {
        addText(ep.x, ep.y - 40, "LOADED", "#fff2b0", 12, true);
        glow(p.x, p.y, "#fff2b0", 46, 0.3);
      }
      // awakening procs leave a mark: the proc's own colour and its name
      if (forceCrit) {
        const spec0 = awkSpec(t, 0)?.fx === "critup" ? awkSpec(t, 0) : awkSpec(t, 1);
        addText(p.x, p.y - 34, (spec0?.name || "HOLLOW POINT").toUpperCase(), "#ffd23f", 11, false);
        glow(p.x, p.y, "#ffd23f", 34, 0.25);
      }
      if (extraShots > 0) {
        const spec1 = awkSpec(t, 1)?.fx === "volley" ? awkSpec(t, 1) : awkSpec(t, 0);
        addText(p.x, p.y - 48, (spec1?.name || "VOLLEY").toUpperCase(), "#c9a7ff", 11, false);
        glow(p.x, p.y, "#c9a7ff", 38, 0.25);
      }
      const push = (proj: Partial<Proj>, at: { x: number; y: number } = ep, onto: Enemy = target) => {
        g.projs.push({
          x: p.x, y: p.y, tid: onto.id, lx: at.x, ly: at.y, speed: 520, dmg, kind: t.def.id, tw: t,
          dead: false, age: 0,
          ...(forceCrit ? { alwaysCrit: true } : {}),
          ...(heavy > 0 ? { heavy: true } : {}),
          ...proj,
        } as Proj);
      };
      switch (t.def.id) {
        case "demon":
          // no projectile: the strike itself is the attack
          demonStrike(t);
          break;
        case "heavenly": {
          // Heavenly God calls down a clear gold-white bolt, distinct from the Demon
          // Execution crimson strike.
          sfx.heavenlyImpact();
          push({
            speed: 1400,
            kind: "heavenly",
            behind: t.def.laserBehind || 5,
            behindMul: t.def.laserBehindMul ?? 0.5,
          });
          if (g.bolts.length < 30) g.bolts.push(randBolt(p.x, p.y, ep.x, ep.y, "#ffe86b", 2.4, 0.14, performance.now()));
          glow(p.x, p.y, "#fff6c4", 60, 0.3);
          break;
        }
        case "honor":
          push({ speed: 720, kind: "honor" });
          break;
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
            const tp = enemyPos(e);
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
            const tp = enemyPos(e);
            push({ speed: 480, blast: radius, blastDmg: 0.7, kind: "cannon" }, tp, e);
          });
          break;
        }
        // ---------- second wave of towers ----------
        case "rime": {
          // frost shell: wide splash plus a real freeze roll
          const fr2 = Math.min(1, (t.def.freeze || 0) + (t.def.upFreeze || 0) * upg + (t.def.ascFreeze || 0) * asc);
          push({
            speed: 380,
            kind: "cannon",
            splash: (t.def.splash || 0) + (t.def.upSplash || 0) * upg + (t.def.ascSplash || 0) * asc,
            freezePct: fr2,
          });
          break;
        }
        case "siphon": {
          // soul bolt: damage scales with every kill this tower has banked
          push({ speed: 520, kind: "siphon" });
          break;
        }
        case "quake": {
          const stunS = (t.def.stun || 0) + (t.def.upStun || 0) * upg + (t.def.ascStun || 0) * asc;
          const radius = (t.def.splash || 0) + (t.def.upSplash || 0) * upg + (t.def.ascSplash || 0) * asc;
          // ground slam centred on the front enemy
          push({ speed: 460, kind: "cannon", splash: radius, stunS, blastDmg: 0.85, shockwave: true });
          g.shake = fxShake(2.5);
          break;
        }
        case "storm": {
          push({
            speed: 700,
            chain: Math.round((t.def.chain || 0) + (t.def.upChain || 0) * upg + (t.def.ascChain || 0) * asc),
            kind: "tesla",
          });
          break;
        }
        case "plague": {
          const radius = (t.def.splash || 0) + (t.def.upSplash || 0) * upg + (t.def.ascSplash || 0) * asc;
          const pct2 = (t.def.burnPct || 0) + (t.def.upBurnPct || 0) * upg + (t.def.ascBurnPct || 0) * asc;
          push({
            speed: 420,
            kind: "cannon",
            splash: radius,
            blastDmg: 0.75,
            burnDps: dmg * pct2,
            burnDur: t.def.burnDur || 5,
            slow: (t.def.slow || 0) + (t.def.upSlow || 0) * upg,
            slowDur: t.def.slowDur || 3,
          });
          break;
        }
        case "rail": {
          const pierce = Math.round((t.def.pierce || 0) + (t.def.upPierce || 0) * upg + (t.def.ascPierce || 0) * asc);
          const tier1 = saveRef.current.awn["rail"]?.[0] || 0;
          const over = tier1 > 0 && Math.random() < t.def.awk1!.chance[tier1 - 1];
          const mult = over ? 1 + t.def.awk1!.mult[tier1 - 1] : 1;
          const tier2 = saveRef.current.awn["rail"]?.[1] || 0;
          const burnDps = tier2 > 0 ? (t.def.awk2!.mult[tier2 - 1] * dmg) / 4 : 0;
          push({
            speed: 1000,
            pierce,
            hitIds: [],
            dmg: dmg * mult,
            burnDps,
            burnDur: burnDps > 0 ? 4 : 0,
            alwaysCrit: over,
            kind: "plasma",
          });
          // muzzle flash + a slug trail straight down the firing line
          if (g.bolts.length < 44) g.bolts.push(randBolt(p.x, p.y, ep.x, ep.y, over ? "#fff6c4" : "#7fe9ff", over ? 5 : 3, 0.2, performance.now()));
          glow(p.x, p.y, "#7fe9ff", 60, 0.3);
          g.shake = fxShake(2);
          if (over) addText(ep.x, ep.y - 42, "OVER PENETRATION", "#7fe9ff", 14, true);
          break;
        }
        // ---------- mythic arsenal II ----------
        case "nova": {
          // a three-shell salvo: each shell finds its own enemy and blooms wide
          const blast = (t.def.splash || 0) + (t.def.upSplash || 0) * upg + (t.def.ascSplash || 0) * asc;
          const picks = g.enemies
            .filter((e) => !e.dead)
            .sort((a, b) => {
              const da = Math.abs(a.d - target.d);
              const db = Math.abs(b.d - target.d);
              return da - db;
            })
            .slice(0, t.def.multi || 3);
          const list = picks.length ? picks : [target];
          list.forEach((e, i) => {
            const tp = enemyPos(e);
            push({ speed: 420, kind: "cannon", blast, blastDmg: 0.7, splash: blast, shockwave: true }, tp, e);
            if (i === 0) sfx.explosion();
          });
          glow(p.x, p.y, "#ffd7a1", 54, 0.3);
          g.shake = fxShake(2.5);
          break;
        }
        case "gravity": {
          // support: the well fires nothing itself, the pulse tick does the work
          break;
        }
        case "thundercrown": {
          // sky pillars on up to six targets, then forked light between them
          const picks = g.enemies
            .filter((e) => !e.dead)
            .sort((a, b) => b.hp - a.hp)
            .slice(0, 6);
          const extra = Math.round((t.def.chain || 0) + (t.def.upChain || 0) * upg + (t.def.ascChain || 0) * asc);
          const c2 = rollAwk(t, 1);
          const links = extra + (awkSpec(t, 1)?.fx === "chain" && c2 > 0 ? Math.round(awkSpec(t, 1)!.mult[c2 - 1]) : 0);
          const now2 = performance.now();
          picks.forEach((e, i) => {
            const ep2 = enemyPos(e);
            g.strikes.push({ x: ep2.x, y: ep2.y, life: 0.34, max: 0.34, width: 9, color: "#ffe86b", seed: (i * 23) % 91 });
            addZone({ kind: "rift", x: ep2.x, y: ep2.y, r: 44, life: 0.3, max: 0.3, dps: 0, slow: 0, color: "#ffe86b" });
            // all six columns and their damage resolve on the same frame
            if (!e.dead) dealDamage(e, dmg, { tw: t, color: "#ffe86b" });
          });
          for (let k = 1; k < Math.min(picks.length, links + 1); k++) {
            const a2 = enemyPos(picks[k - 1]);
            const b2 = enemyPos(picks[k]);
            if (g.bolts.length < 42) g.bolts.push(randBolt(a2.x, a2.y, b2.x, b2.y, "#fff6c4", 2, 0.2, now2));
          }
          flash("#ffe86b", 0.09);
          g.shake = fxShake(4);
          sfx.superbolt();
          break;
        }
        case "voidrip": {
          const pierce = Math.round((t.def.pierce || 0) + (t.def.upPierce || 0) * upg + (t.def.ascPierce || 0) * asc);
          const pctHp = (t.def.pctHp || 0) + (t.def.upPctHp || 0) * upg + (t.def.ascPctHp || 0) * asc;
          push({
            speed: 900,
            pierce,
            hitIds: [],
            pctHp,
            burnDps: dmg * ((t.def.burnPct || 0) + (t.def.upBurnPct || 0) * upg),
            burnDur: t.def.burnDur || 4,
            kind: "void",
            blast: 26,
          });
          if (g.bolts.length < 42) g.bolts.push(randBolt(p.x, p.y, ep.x, ep.y, "#c9a7ff", 2.6, 0.2, performance.now()));
          glow(p.x, p.y, "#c9a7ff", 46, 0.25);
          break;
        }
        case "furnace": {
          const blast = (t.def.splash || 0) + (t.def.upSplash || 0) * upg + (t.def.ascSplash || 0) * asc;
          push({
            speed: 460,
            kind: "cannon",
            blast,
            splash: blast,
            blastDmg: 0.8,
            burnDps: dmg * ((t.def.burnPct || 0) + (t.def.upBurnPct || 0) * upg),
            burnDur: t.def.burnDur || 5,
            shockwave: true,
          });
          embers(p.x, p.y, "#ff8c3d", 3);
          break;
        }
        case "maelstrom": {
          // support: the whirlpool is driven by the pulse tick
          break;
        }
        case "meteor": {
          const blast = (t.def.splash || 0) + (t.def.upSplash || 0) * upg + (t.def.ascSplash || 0) * asc;
          const tier = saveRef.current.awn["meteor"]?.[0] || 0;
          push({ speed: 460, kind: "hellstorm", blast, blastDmg: 0.8, meteorChance: Math.min(0.85, 0.45 + upg * 0.025 + asc * 0.035), asteroidChance: tier ? t.def.awk1!.chance[tier - 1] : 0 });
          break;
        }
        case "starfall": {
          // mark a handful of enemies and drop rocks on them a beat later
          const rocks = Math.round((t.def.meteors || 3) + (t.def.upMeteors || 0) * upg);
          const v2 = rollAwk(t, 1);
          const extraRocks = awkSpec(t, 1)?.fx === "volley" && v2 > 0 ? Math.round(awkSpec(t, 1)!.mult[v2 - 1]) : 0;
          const picks = g.enemies
            .filter((e) => !e.dead)
            .sort(() => Math.random() - 0.5)
            .slice(0, rocks + extraRocks);
          const heavyRock = Math.random() < 0.25;
          picks.forEach((e, i) => {
            const ep2 = enemyPos(e);
            g.meteors.push({
              x: ep2.x,
              y: ep2.y,
              t: 0.5 + i * 0.09,
              total: 0.5 + i * 0.09,
              uid: t.uid,
              color: "#ffd23f",
              dmg: dmg * (heavyRock && i === 0 ? 2.6 : 1),
              blast: 96,
              tw: t,
            });
          });
          sfx.meteor();
          break;
        }
        case "chronolock": {
          const blast = (t.def.splash || 0) + (t.def.upSplash || 0) * upg + (t.def.ascSplash || 0) * asc;
          push({
            speed: 520,
            kind: "ice",
            blast,
            splash: blast,
            blastDmg: 0.5,
            freezePct: Math.min(1, (t.def.freeze || 0) + (t.def.upFreeze || 0) * upg + (t.def.ascFreeze || 0) * asc),
            slow: (t.def.slow || 0) + (t.def.upSlow || 0) * upg,
            slowDur: t.def.slowDur || 3,
            stunS: (t.def.stun || 0) + (t.def.upStun || 0) * upg,
          });
          break;
        }
        case "gravebloom": {
          const pctHp = (t.def.pctHp || 0) + (t.def.upPctHp || 0) * upg + (t.def.ascPctHp || 0) * asc;
          push({ speed: 620, kind: "void", pctHp, blast: 34 });
          glow(p.x, p.y, "#8effc4", 44, 0.25);
          break;
        }
        case "gale":
          push({
            speed: 760,
            kind: "arrow",
            pierce: Math.round((t.def.pierce || 0) + (t.def.upPierce || 0) * upg + (t.def.ascPierce || 0) * asc),
          });
          break;
        case "bombardment": {
          const radius = (t.def.splash || 0) + (t.def.upSplash || 0) * upg + (t.def.ascSplash || 0) * asc;
          push({ speed: 360, kind: "cannon", splash: radius, blastDmg: 0.85, shockwave: true, stunS: (t.def.stun || 0) + (t.def.upStun || 0) * upg });
          g.shake = fxShake(2.5);
          break;
        }
        case "wildfire":
          push({
            speed: 560,
            kind: "swarm",
            burnDps: dmg * ((t.def.burnPct || 0) + (t.def.upBurnPct || 0) * upg + (t.def.ascBurnPct || 0) * asc),
            burnDur: t.def.burnDur || 4,
          });
          break;
        case "hades": {
          const radius = (t.def.splash || 0) + (t.def.upSplash || 0) * upg + (t.def.ascSplash || 0) * asc;
          push({ speed: 320, kind: "cannon", fireball: 1.25, blast: radius });
          break;
        }
        case "ion":
          push({
            speed: 950,
            kind: "swarm",
            chain: Math.round((t.def.chain || 0) + (t.def.upChain || 0) * upg + (t.def.ascChain || 0) * asc),
          });
          break;
        case "aether": {
          const picks = g.enemies.filter((e) => !e.dead).sort((x, y) => y.d - x.d).slice(0, t.def.multi || 3);
          const list = picks.length ? picks : [target];
          list.forEach((e) => {
            const tp = enemyPos(e);
            push({ speed: 820, kind: "void", blast: 18, burnDps: dmg * ((t.def.burnPct || 0) + (t.def.upBurnPct || 0) * upg), burnDur: 3 }, tp, e);
          });
          break;
        }
        case "scythe":
          push({
            speed: 720,
            kind: "void",
            pctHp: (t.def.pctHp || 0) + (t.def.upPctHp || 0) * upg + (t.def.ascPctHp || 0) * asc,
          });
          break;
        case "sandstorm": {
          const radius = (t.def.splash || 0) + (t.def.upSplash || 0) * upg + (t.def.ascSplash || 0) * asc;
          const slow = (t.def.slow || 0) + (t.def.upSlow || 0) * upg + (t.def.ascSlow || 0) * asc;
          push({ speed: 440, kind: "chrono", splash: radius, blastDmg: 0.5, slow, slowDur: t.def.slowDur || 3 });
          break;
        }
        case "bloodstone":
          push({ speed: 620, kind: "void", blast: 42, blastDmg: 0.55 });
          break;
        case "venom":
          push({
            speed: 520,
            kind: "cannon",
            blast: 36,
            blastDmg: 0.45,
            slow: (t.def.slow || 0) + (t.def.upSlow || 0) * upg,
            slowDur: t.def.slowDur || 2.5,
            burnDps: dmg * ((t.def.burnPct || 0) + (t.def.upBurnPct || 0) * upg + (t.def.ascBurnPct || 0) * asc),
            burnDur: t.def.burnDur || 5,
          });
          break;
        case "clone": {
          // a mirrored lance that forks once on impact
          push({ speed: 760, kind: "plasma", blast: 18 });
          glow(p.x, p.y, "#8effc4", 40, 0.25);
          break;
        }
        case "colossus": {
          const blast = (t.def.splash || 0) + (t.def.upSplash || 0) * upg + (t.def.ascSplash || 0) * asc;
          push({
            speed: 300,
            kind: "cannon",
            blast,
            splash: blast,
            blastDmg: 0.75,
            shockwave: true,
            shred: (t.def.shred || 0) + (t.def.upShred || 0) * upg + (t.def.ascShred || 0) * asc,
          });
          g.shake = fxShake(3.5);
          sfx.explosion();
          break;
        }
        // ---------- mythic arsenal ----------
        case "reaper": {
          const pctHp = (t.def.pctHp || 0) + (t.def.upPctHp || 0) * upg + (t.def.ascPctHp || 0) * asc;
          push({ speed: 640, kind: "void", pctHp });
          // the toll rings out: a dark halo marks whoever is about to be judged
          if (g.bolts.length < 40) g.bolts.push(randBolt(p.x, p.y, ep.x, ep.y, "#c9a7ff", 3, 0.24, performance.now()));
          break;
        }
        case "prism": {
          // one beam per nearby enemy, each with its own burn
          const beams = Math.max(1, t.def.multi || 4);
          const chain2 = Math.round((t.def.chain || 0) + (t.def.upChain || 0) * upg + (t.def.ascChain || 0) * asc);
          const burn = rollAwk(t, 1);
          const list = g.enemies.filter((e) => !e.dead).sort((a, b) => b.d - a.d).slice(0, beams);
          (list.length ? list : [target]).forEach((e) => {
            const tp = enemyPos(e);
            push({ speed: 900, kind: "laser", chain: chain2, burnDps: burn > 0 ? dmg * burn / 4 : 0, burnDur: burn > 0 ? 4 : 0 }, tp, e);
            if (g.bolts.length < 40) g.bolts.push(randBolt(p.x, p.y, tp.x, tp.y, "#8ff0ff", 2.6, 0.2, performance.now()));
          });
          break;
        }
        case "aegis":
          // handled by the aura pulse tick, nothing to fire
          break;
        case "hellgate": {
          const radius = (t.def.splash || 0) + (t.def.upSplash || 0) * upg + (t.def.ascSplash || 0) * asc;
          const pct = (t.def.burnPct || 0) + (t.def.upBurnPct || 0) * upg + (t.def.ascBurnPct || 0) * asc;
          const wide = rollAwk(t, 0); // Gates Undone
          push({
            speed: 460,
            kind: "hellstorm",
            blast: radius * (1 + wide),
            blastDmg: 0.85,
            burnDps: dmg * pct,
            burnDur: t.def.burnDur || 5,
            alwaysCrit: false,
          });
          // the gate itself flares open behind the shell
          ring(p.x, p.y, "#ff7a3d", 60 + wide * 40);
          glow(p.x, p.y, "#ffb324", 90, 0.4);
          if (wide > 0) addText(ep.x, ep.y - 46, "GATES UNDONE", "#ff7a3d", 14, true);
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
        // ---------- the two new mystical towers ----------
        case "eclipse": {
          const radius = (t.def.splash || 0) + (t.def.upSplash || 0) * upg + (t.def.ascSplash || 0) * asc;
          const pctHp = (t.def.pctHp || 0) + (t.def.upPctHp || 0) * upg + (t.def.ascPctHp || 0) * asc;
          const slow = Math.min(0.8, (t.def.slow || 0) + (t.def.upSlow || 0) * upg + (t.def.ascSlow || 0) * asc);
          push({
            speed: 380,
            kind: "eclipse",
            splash: radius,
            blast: radius,
            blastDmg: 0.5,
            pctHp,
            slow,
            slowDur: t.def.slowDur || 2.6,
            pull: 42 + t.points * 4,
          });
          // the oracle never fires quietly: a dark halo folds open at the muzzle
          glow(p.x, p.y, "#b06bff", 64, 0.3);
          shock(p.x, p.y, "#6a2dff", 34, 0.35);
          if (g.bolts.length < 40) g.bolts.push(randBolt(p.x, p.y, ep.x, ep.y, "#c9a7ff", 1.8, 0.16, performance.now()));
          break;
        }
        case "seraph": {
          const pierce = Math.round((t.def.pierce || 0) + (t.def.upPierce || 0) * upg + (t.def.ascPierce || 0) * asc);
          const chain = Math.round((t.def.chain || 0) + (t.def.upChain || 0) * upg + (t.def.ascChain || 0) * asc);
          const t1 = saveRef.current.awn["seraph"]?.[0] || 0;
          const ascend = t1 > 0 && Math.random() < t.def.awk1!.chance[t1 - 1];
          push({
            speed: 1250,
            kind: "seraph",
            pierce,
            chain,
            hitIds: [],
            alwaysCrit: ascend,
            chainColor: "#8ff0ff",
            dmg: ascend ? dmg * 1.35 : dmg,
          });
          if (g.bolts.length < 40) g.bolts.push(randBolt(p.x, p.y, ep.x, ep.y, "#ffffff", 2.6, 0.18, performance.now()));
          glow(p.x, p.y, "#c9fbff", 58, 0.28);
          stars(p.x, p.y, "#8ff0ff", 5, 26);
          if (ascend) addText(ep.x, ep.y - 44, "ASCENSION", "#ffffff", 13, true);
          break;
        }
      }
      // extra shots from a volley awakening, aimed at the enemies least shot at
      if (extraShots > 0) {
        const others = g.enemies.filter((e) => !e.dead && e.id !== target.id).sort((a, b) => b.d - a.d);
        for (let i = 0; i < extraShots && i < others.length; i++) {
          const o = others[i];
          const op = enemyPos(o);
          g.projs.push({
            x: p.x, y: p.y, tid: o.id, lx: op.x, ly: op.y, speed: 620, dmg: base, kind: t.def.id, tw: t,
            dead: false, age: 0, ...(forceCrit ? { alwaysCrit: true } : {}),
          } as Proj);
        }
        if (others.length) addText(p.x, p.y - 34, "VOLLEY", "#9fe8ff", 12, true);
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
          const ep = enemyPos(e);
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
      if (pr.meteorChance && Math.random() < pr.meteorChance) {
        const tier = saveRef.current.awn["meteor"]?.[0] || 0;
        const asteroid = tier > 0 && Math.random() < (pr.asteroidChance || 0);
        const radius = asteroid ? 9000 * (1 + (pr.tw.def.awk1!.mult[tier - 1] - 1) * 0.2) : 150;
        g.meteors.push({ x: pos.x, y: pos.y, t: 0.65, total: 0.65, uid: pr.tw.uid, color: asteroid ? "#ff7a24" : "#ffb324", dmg: pr.dmg * (asteroid ? 8 : 1.8), blast: radius, tw: pr.tw, ...(asteroid ? { asteroid: true, directId: target.id } : {}) });
        if (asteroid) addText(pos.x, pos.y - 58, "ASTEROID DROP", "#ff7a24", 18, true);
      }
      if (pr.tw && isLightningTower(pr.tw.def) && g.lightningBonus > 0) {
        const chained = g.enemies.filter((e) => !e.dead && e.id !== target.id && e.d > target.d).sort((a, b) => a.d - b.d).slice(0, 3);
        for (const enemy of chained) {
          const ep = enemyPos(enemy);
          if (g.bolts.length < 44) g.bolts.push(randBolt(pos.x, pos.y, ep.x, ep.y, "#fff3a0", 2.1, 0.18, performance.now()));
          g.strikes.push({ x: ep.x, y: ep.y, life: 0.22, max: 0.22, width: 6, color: "#fff3a0", seed: Math.random() * 100, forks: 2 });
          dealDamage(enemy, pr.dmg * 0.45, { alwaysCrit: pr.alwaysCrit, tw: pr.tw, color: "#fff3a0" });
        }
      }

      // ---------- Eclipse Oracle: the dark moon collapses inward ----------
      if (pr.kind === "eclipse") {
        const radius = pr.blast ?? 120;
        const pull = pr.pull ?? 48;
        const dur = 1.25;
        addZone({ kind: "rift", x: pos.x, y: pos.y, r: radius * 0.55, life: dur, max: dur, dps: 0, slow: 0.4, color: "#b06bff" });
        shock(pos.x, pos.y, "#b06bff", radius * 1.15, 0.62);
        shock(pos.x, pos.y, "#3a0a6a", radius * 0.72, 0.46);
        ring(pos.x, pos.y, "#ffffff", radius * 0.34);
        stars(pos.x, pos.y, "#d8c2ff", 12, 74);
        burst(pos.x, pos.y, "#8a4dff", 16, 230);
        glow(pos.x, pos.y, "#b06bff", radius * 0.9, 0.32);
        let caught = 0;
        g.enemies.forEach((e) => {
          if (e.dead) return;
          const ep = enemyPos(e);
          if (Math.hypot(ep.x - pos.x, ep.y - pos.y) > radius) return;
          caught++;
          // the singularity drags bodies back up the lane, not forward
          e.d = Math.max(0, e.d - pull);
          e.slow = Math.max(e.slow, 0.45);
          e.slowT = Math.max(e.slowT, 2.4);
          if (e.id !== target.id) dealDamage(e, pr.dmg * 0.35, { tw: pr.tw, color: "#b06bff" });
          const np = enemyPos(e);
          ring(np.x, np.y, "#b06bff", 22);
        });
        addText(pos.x, pos.y - 48, "IMPLOSION", "#d8c2ff", 14, true);
        if (caught > 1) addText(pos.x, pos.y - 30, `${caught} PULLED`, "#b06bff", 11, false);
        g.shake = fxShake(8);
        punch(0.45, 0.3);
        flash("#6a2dff", 0.1);
        sfx.eclipseBurst();
      }

      // ---------- Astral Seraph: the choir answers every hit ----------
      if (pr.kind === "seraph") {
        const links = Math.max(0, pr.chain ?? 0);
        const near = g.enemies
          .filter((e) => !e.dead && e.id !== target.id)
          .map((e) => ({ e, dist: Math.hypot(enemyPos(e).x - pos.x, enemyPos(e).y - pos.y) }))
          .filter((x) => x.dist < 250)
          .sort((a, b) => a.dist - b.dist)
          .slice(0, links);
        const nowS = performance.now();
        let from = pos;
        near.forEach(({ e }) => {
          const ep = enemyPos(e);
          if (g.bolts.length < 44) g.bolts.push(randBolt(from.x, from.y, ep.x, ep.y, "#8ff0ff", 1.9, 0.18, nowS));
          g.strikes.push({ x: ep.x, y: ep.y, life: 0.2, max: 0.2, width: 5, color: "#eaffff", seed: Math.random() * 100, forks: 1 });
          stars(ep.x, ep.y, "#8ff0ff", 3, 24);
          glow(ep.x, ep.y, "#c9fbff", 30, 0.22);
          dealDamage(e, pr.dmg * 0.5, { tw: pr.tw, color: "#8ff0ff" });
          from = ep;
        });
        shock(pos.x, pos.y, "#8ff0ff", 92, 0.42);
        stars(pos.x, pos.y, "#ffffff", 8, 56);
        glow(pos.x, pos.y, "#c9fbff", 52, 0.24);
        if (near.length) addText(pos.x, pos.y - 44, `CHOIR ×${near.length}`, "#8ff0ff", 12, false);
        g.sp += spGain(1 + Math.floor(near.length / 2));
        sfx.seraphHymn();
      }

      // ---------- Heavenly God: the laser punches straight through ----------
      if (pr.behind) {
        const now3 = performance.now();
        const queue = g.enemies
          .filter((e) => !e.dead && e.id !== target.id && e.d > target.d)
          .sort((a, b) => a.d - b.d)
          .slice(0, pr.behind);
        queue.forEach((e) => {
          const ep = enemyPos(e);
          g.strikes.push({ x: ep.x, y: ep.y, life: 0.24, max: 0.24, width: 7, color: "#ffe86b", seed: Math.random() * 100 });
          if (g.bolts.length < 32) g.bolts.push(randBolt(pos.x, pos.y, ep.x, ep.y, "#fff6c4", 1.6, 0.14, now3));
          glow(ep.x, ep.y, "#fff6c4", 44, 0.24);
          dealDamage(e, pr.dmg * (pr.behindMul ?? 0.5), { alwaysCrit: pr.alwaysCrit, tw: pr.tw, color: "#ffe86b" });
        });
        if (queue.length) addText(pos.x, pos.y - 46, `PIERCE ×${queue.length}`, "#ffe86b", 12, false);

        // Super Charged Ray: the air around the target flashes to 40,000°C and
        // everything standing in it detonates in a supersonic shockwave
        const t2 = pr.tw ? saveRef.current.awn["heavenly"]?.[1] || 0 : 0;
        if (pr.tw && t2 > 0 && Math.random() < pr.tw.def.awk2!.chance[t2 - 1]) {
          const radius = pr.tw.def.awk2!.mult[t2 - 1];
          const done = g.enemies.filter((e) => !e.dead && Math.hypot(enemyPos(e).x - pos.x, enemyPos(e).y - pos.y) <= radius);
          shock(pos.x, pos.y, "#ffffff", radius * 1.4, 0.6);
          shock(pos.x, pos.y, "#ff8c3d", radius, 0.5);
          ring(pos.x, pos.y, "#fff6c4", radius * 0.8);
          burst(pos.x, pos.y, "#ffd23f", 30, 320);
          embers(pos.x, pos.y, "#ff8c3d", 18);
          stars(pos.x, pos.y, "#fff6c4", 14, 90);
          flash("#fff6c4", 0.22);
          punch(0.7, 0.5);
          hitStop(0.05);
          g.shake = fxShake(11);
          addText(pos.x, pos.y - 62, "SUPER CHARGED RAY", "#fff6c4", 18, true);
          addText(pos.x, pos.y - 40, "40,000°C", "#ff8c3d", 13, true);
          sfx.superbolt();
          for (const e of done) {
            const ep = enemyPos(e);
            burst(ep.x, ep.y, "#ffd23f", 6, 160);
            dealDamage(e, e.hp + 1, { tw: pr.tw, color: "#fff6c4", noCrit: true });
          }
        }
      }

      // ---------- awakening effects that ride along with the hit ----------
      if (pr.tw && !target.dead) {
        const t2 = pr.tw;
        // Freeze / Permafrost / Flash Freeze: encase what it struck
        const freeze = rollAwk(t2, awkSpec(t2, 0)?.fx === "freeze" ? 0 : 1);
        if (freeze > 0) {
          target.encased = Math.max(target.encased, freeze);
          target.frozen = Math.max(target.frozen, 1.2);
          burst(pos.x, pos.y, "#9fe8ff", 10, 140);
          ring(pos.x, pos.y, "#9fe8ff", 34);
        }
        // Burn-type awakenings
        const burnSlot = awkSpec(t2, 0)?.fx === "burn" ? 0 : 1;
        const burn = rollAwk(t2, burnSlot);
        if (burn > 0) {
          target.burnDps = Math.max(target.burnDps, (pr.dmg * burn) / 4);
          target.burnT = Math.max(target.burnT, 4);
          embers(pos.x, pos.y, "#ff7a3d", 3);
        }
        // Slow-type awakenings
        const slowSlot = awkSpec(t2, 0)?.fx === "slow" ? 0 : 1;
        const slow = rollAwk(t2, slowSlot);
        if (slow > 0) {
          target.slow = Math.max(target.slow, Math.min(0.8, slow));
          target.slowT = Math.max(target.slowT, 2.5);
        }
        // Chain / Ricochet / Prism Split: arc into nearby enemies
        const chainSlot = awkSpec(t2, 0)?.fx === "chain" ? 0 : 1;
        const chainN = Math.round(rollAwk(t2, chainSlot));
        if (chainN > 0) {
          const now2 = performance.now();
          const near = g.enemies
            .filter((o) => !o.dead && o.id !== target.id)
            .map((o) => ({ o, d: Math.hypot(enemyPos(o).x - pos.x, enemyPos(o).y - pos.y) }))
            .filter((x) => x.d < 190)
            .sort((a, b) => a.d - b.d)
            .slice(0, Math.min(8, chainN));
          let from = pos;
          near.forEach(({ o }) => {
            const op = enemyPos(o);
            if (g.bolts.length < 40) g.bolts.push(randBolt(from.x, from.y, op.x, op.y, "#c9a7ff", 2.2, 0.22, now2));
            dealDamage(o, pr.dmg * 0.6, { tw: t2, color: "#c9a7ff" });
            from = op;
          });
          if (near.length) sfx.zap();
        }
        // Quake awakenings stagger the blast
        const quakeSlot = awkSpec(t2, 0)?.fx === "quake" ? 0 : 1;
        const quake = rollAwk(t2, quakeSlot);
        if (quake > 0) {
          const radius = pr.blast ?? 120;
          g.enemies.forEach((o) => {
            if (o.dead) return;
            const op = enemyPos(o);
            if (Math.hypot(op.x - pos.x, op.y - pos.y) <= radius) {
              o.stun = Math.max(o.stun, quake);
              ring(op.x, op.y, "#ffd23f", 26);
            }
          });
          shock(pos.x, pos.y, "#ffd23f", radius, 0.45);
          sfx.stun();
        }
        // Splash awakenings widen the crater of an already-splashing shot
        if (pr.blast !== undefined) {
          const wide = rollAwk(t2, awkSpec(t2, 0)?.fx === "splash" ? 0 : 1);
          if (wide > 0) {
            pr.blast *= 1 + wide;
            ring(pos.x, pos.y, "#ffb324", pr.blast);
            burst(pos.x, pos.y, "#ffb324", 14, 220);
          }
        }
        // Execute: reap a target that is already badly wounded
        const exSlot = awkSpec(t2, 0)?.fx === "execute" ? 0 : 1;
        const ex = rollAwk(t2, exSlot);
        if (ex > 0 && !target.dead && target.hp / target.max <= ex) {
          addText(pos.x, pos.y - 48, "REAPED", "#c9a7ff", 16, true);
          shock(pos.x, pos.y, "#c9a7ff", 70, 0.5);
          stars(pos.x, pos.y, "#c9a7ff", 10, 40);
          dealDamage(target, target.hp + 1, { alwaysCrit: true, tw: t2, color: "#c9a7ff" });
        }
        // Hellgate: shots leave a burning pool where they land
        if (t2.def.lava) {
          const burnSlot2 = awkSpec(t2, 1)?.fx === "burn" ? 1 : 0;
          const lake = rollAwk(t2, burnSlot2);
          const dur = 3 + (lake > 0 ? 2 : 0);
          addZone({ kind: "lava", x: pos.x, y: pos.y, r: pr.blast ?? 90, life: dur, max: dur, dps: pr.dmg * (0.3 + lake * 0.2), slow: 0.15, color: "#ff7a3d" });
        }
      }
      // Rift Colossus shells shatter armour: every hit peels a slice off, so a
      // long fight against an armoured boss gets easier instead of harder
      if (pr.shred) {
        target.armor = Math.max(0, target.armor - pr.shred);
        ring(pos.x, pos.y, "#ff8f9a", 40);
        addText(pos.x, pos.y - 52, "SHATTERED", "#ff8f9a", 12, false);
        sfx.stun();
      }
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
      const blastR = pr.kind === "eclipse" || pr.kind === "seraph" ? 0 : (pr.blast ?? (pr.splash !== undefined ? 92 : 0));
      if (blastR > 0) {
        const blastBase =
          pr.blastDmg !== undefined
            ? pr.dmg * pr.blastDmg
            : (pr.splash || 0) * (pr.tw ? towerPower(pr.tw) : 1);
        if (blastBase > 0) {
          impactBlast(pos.x, pos.y, "#ff9d4d", Math.min(130, blastR), blastR >= 100);
          sfx.explosion();
          g.shake = fxShake(2);
          g.enemies.forEach((e) => {
            if (e.dead || e.id === target.id) return;
            const ep = enemyPos(e);
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
      if (pr.chain !== undefined && pr.kind !== "seraph") {
        let from = pos;
        const now = performance.now();
        const others = g.enemies.filter((e) => !e.dead && e.id !== target.id).sort((a, b) => b.d - a.d).slice(0, pr.chain);
        others.forEach((e) => {
          const ep = enemyPos(e);
          if (g.bolts.length < 36) g.bolts.push(randBolt(from.x, from.y, ep.x, ep.y, "#7fe9ff", 1.6, 0.16, now));
          dealDamage(e, pr.dmg * 0.9, { tw: pr.tw, color: "#7fe9ff" });
          from = ep;
        });
        sfx.zap();
      }
    };

    /**
     * The Clone tower copies the tower you drag onto it. The original is NOT
     * consumed — the copy takes its type and levels and keeps the clone's own
     * cell and points. Awakened: Super Clone procs copy ANY point spread and
     * surge +200% attack speed for 6s; Perfect Replica grows the copy points.
     */
    const cloneTower = (a: BT, b: BT) => {
      const cp = b.cell!;
      const p = cellCenter(cp.c, cp.r);
      const t1 = saveRef.current.awn["clone"]?.[0] || 0;
      const spec1 = t1 > 0 && b.def.id === "clone" ? b.def.awk1 : undefined;
      const superClone = !!spec1 && Math.random() < spec1.chance[t1 - 1];
      if (a.points !== b.points && !superClone) {
        sfx.error();
        toastRef.current(`Points must match to clone (${a.points} vs ${b.points})`, "#ff4d5e");
        return;
      }
      const t2 = saveRef.current.awn["clone"]?.[1] || 0;
      const spec2 = t2 > 0 && b.def.id === "clone" ? b.def.awk2 : undefined;
      const grow = spec2 && Math.random() < spec2.chance[t2 - 1] ? Math.max(1, Math.round(spec2.mult[t2 - 1])) : 0;
      const nd = a.def;
      b.def = nd;
      b.menuLv = a.menuLv;
      b.bLv = a.bLv;
      b.streak = 0;
      b.shots = 0;
      b.cd = 0.25;
      if (grow > 0) b.points = Math.min(MAX_POINTS, b.points + grow);
      if (superClone) {
        b.hasteT = 6;
        b.hasteMul = Math.max(1, spec1!.mult[t1 - 1]);
        addText(p.x, p.y - 56, "SUPER CLONE", "#8effc4", 17, true);
        shock(p.x, p.y, "#8effc4", 90, 0.6);
      }
      if (grow > 0) addText(p.x, p.y - 38, `+${grow} PT`, "#ffd23f", 13, true);
      ring(p.x, p.y, "#8effc4", 70);
      burst(p.x, p.y, RARITY[nd.rarity].color, 20, 240);
      glow(p.x, p.y, "#8effc4", 70, 0.4);
      sfx.merge();
      addText(p.x, p.y - 22, "CLONED!", "#8effc4", 18, true);
      toastRef.current(
        superClone ? `SUPER CLONE — ${nd.name} copied` : `${nd.name} cloned — the original stays`,
        "#8effc4"
      );
    };

    /** a vertical blessing bolt: points now, an attack surge for a while */
    const blessTower = (t: BT, points: number, buff: number, dur: number, color: string, label: string) => {
      t.points = Math.min(MAX_POINTS, t.points + points);
      if (buff > 0) {
        t.surgeMul = Math.max(t.surgeMul, buff);
        t.surgeT = Math.max(t.surgeT, dur);
      }
      t.cd = Math.min(t.cd, 0.2);
      if (!t.cell) return;
      const bp = cellCenter(t.cell.c, t.cell.r);
      // the bolt is a tall vertical pillar, exactly like every other lightning
      g.strikes.push({ x: bp.x, y: bp.y, life: 0.42, max: 0.42, width: 13, color, seed: Math.random() * 100 });
      g.strikes.push({ x: bp.x, y: bp.y, life: 0.3, max: 0.3, width: 5, color: "#ffffff", seed: Math.random() * 100 });
      shock(bp.x, bp.y, color, 86, 0.45);
      glow(bp.x, bp.y, color, 130, 0.45);
      stars(bp.x, bp.y, color, 12, 60);
      shards(bp.x, bp.y, color, 8, 220);
      addText(bp.x, bp.y - 52, `${label} +${points}`, color, 15, true);
      levelFlourish(bp.x, bp.y, color, label, 1);
    };

    /**
     * Merging. Two towers on the same points fuse into a single stronger one —
     * but the survivor is rolled at random from everything the account has
     * unlocked (never simply the same tower again), so the board keeps
     * evolving. Honor Emperors are the exception: dragged onto a matching tower
     * they hand their point over instead of rerolling it, and a Heavenly God
     * caught in a merge blesses random towers with bolts.
     */
    const mergeTowers = (a: BT, b: BT) => {
      const p = b.cell ? cellCenter(b.cell.c, b.cell.r) : cellCenter(a.cell!.c, a.cell!.r);
      const wanted = Math.min(MAX_POINTS, a.points + 1);
      if (wanted <= b.points) {
        // nothing to gain: never eat a tower for nothing
        sfx.error();
        toastRef.current(`${b.def.name} is already at ${MAX_POINTS} points`, "#ff4d5e");
        return;
      }

      const meteorTower = a.def.id === "meteor" ? a : b.def.id === "meteor" ? b : undefined;
      if (meteorTower) {
        const tier = saveRef.current.awn["meteor"]?.[1] || 0;
        if (tier > 0) {
          const count = Math.min(100, Math.round(meteorTower.def.awk2!.mult[tier - 1]));
          const active = g.enemies.filter((e) => !e.dead);
          for (let i = 0; i < count; i++) {
            const e = active[i % Math.max(1, active.length)]; const at = e ? enemyPos(e) : p;
            g.meteors.push({ x: at.x, y: at.y, t: 0.45 + (i % 7) * 0.07, total: 0.45 + (i % 7) * 0.07, uid: meteorTower.uid, color: "#ff9a3d", dmg: towerDamage(meteorTower.def, meteorTower.menuLv, meteorTower.bLv, meteorTower.points) * 1.4, blast: 48, tw: meteorTower });
          }
          const board = g.towers.filter((t) => t.uid !== meteorTower.uid).sort(() => Math.random() - 0.5).slice(0, 4);
          const buff = 5 + tier * 0.5, duration = 15 + tier * 1.5;
          board.forEach((t) => { t.surgeMul = Math.max(t.surgeMul, buff); t.surgeT = Math.max(t.surgeT, duration); });
          sfx.meteor(); addText(p.x, p.y - 82, `METEOR SHOWER ×${count}`, "#ff9a3d", 17, true);
        }
      }
      const heavenlySource = a.def.id === "heavenly" ? a : b.def.id === "heavenly" ? b : undefined;
      const wasHeavenly = !!heavenlySource;
      const demonSource = a.def.id === "demon" ? a : b.def.id === "demon" ? b : undefined;
      const demonPoints = demonSource?.points ?? 0;
      const supervisorSource = a.def.id === "supervisor" ? a : b.def.id === "supervisor" ? b : undefined;
      if (supervisorSource) {
        const victims = g.enemies.filter((e) => !e.dead).sort((x, y) => x.d - y.d).slice(0, 10);
        for (const enemy of victims) {
          const ep = enemyPos(enemy);
          g.strikes.push({ x: ep.x, y: ep.y, life: 0.62, max: 0.62, width: 20, color: "#ff173d", seed: Math.random() * 100, forks: 5, top: -220 });
          g.strikes.push({ x: ep.x, y: ep.y, life: 0.38, max: 0.38, width: 7, color: "#ff9aa9", seed: Math.random() * 100, forks: 3 });
          if (g.bolts.length < 44) g.bolts.push(randBolt(p.x, p.y, ep.x, ep.y, "#ff173d", 3.2, 0.42, performance.now()));
          shock(ep.x, ep.y, "#ff173d", 112, 0.5);
          glow(ep.x, ep.y, "#ff315c", 150, 0.5);
          sparkAt(ep.x, ep.y, 20, 340);
          addText(ep.x, ep.y - 62, "SUPERVISOR EXECUTION", "#ff315c", 13, true);
        }
        flash("#5b0013", 0.34);
        punch(0.8, 0.7);
        hitStop(0.12);
        g.shake = fxShake(15);
        sfx.supervisorMerge();

        const doomsdayTier = saveRef.current.awn.supervisor?.[1] || 0;
        if (doomsdayTier > 0 && victims.length > 0 && Math.random() < 0.19) {
          const radius = supervisorSource.def.awk2!.mult[doomsdayTier - 1];
          ring(p.x, p.y, "#a00024", radius);
          shock(p.x, p.y, "#ff173d", Math.min(1100, radius * 1.35), 0.9);
          shock(p.x, p.y, "#ffd8df", Math.min(760, radius * 0.8), 0.7);
          burst(p.x, p.y, "#ff173d", 48, 620);
          flash("#b0002b", 0.62);
          punch(1, 1);
          hitStop(0.2);
          g.shake = fxShake(24);
          addText(p.x, p.y - 100, "DOOMSDAY · 900M", "#ff315c", 24, true);
          sfx.doomsday();
          const doomed = g.enemies.filter((e) => !e.dead && Math.hypot(enemyPos(e).x - p.x, enemyPos(e).y - p.y) <= radius);
          for (const enemy of doomed) {
            const ep = enemyPos(enemy);
            g.strikes.push({ x: ep.x, y: ep.y, life: 0.72, max: 0.72, width: 25, color: "#ff173d", seed: Math.random() * 100, forks: 6, top: -260 });
            enemy.hp = 0;
            killReward(enemy);
          }
        }
        // Anything still alive after a possible nuclear strike is executed by
        // the ten pre-called red bolts. Avoid double-paying a kill.
        for (const enemy of victims) {
          if (enemy.dead) continue;
          enemy.hp = 0;
          killReward(enemy);
        }
      }

      // ---------- Honor Emperor: hands the point over, keeps the tower ----------
      if (a.def.honor || b.def.honor) {
        const emperor = a.def.honor ? a : b;
        const heir = a.def.honor ? b : a;
        const t1 = saveRef.current.awn["honor"]?.[0] || 0;
        const t2 = saveRef.current.awn["honor"]?.[1] || 0;
        let gain = 1;
        if (t1 > 0 && Math.random() < emperor.def.awk1!.chance[t1 - 1]) {
          gain += emperor.def.awk1!.mult[t1 - 1];
          addText(p.x, p.y - 74, "HONOR BLESSING", "#fff6c4", 14, true);
        }
        heir.points = Math.min(MAX_POINTS, heir.points + gain);
        heir.cd = 0.2;
        if (t2 > 0) heir.honorMul += emperor.def.awk2!.mult[t2 - 1];
        g.towers = g.towers.filter((t) => t.uid !== emperor.uid);
        if (heir.cell) {
          const hp = cellCenter(heir.cell.c, heir.cell.r);
          g.strikes.push({ x: hp.x, y: hp.y, life: 0.5, max: 0.5, width: 14, color: "#ffd76a", seed: Math.random() * 100 });
          shock(hp.x, hp.y, "#ffd76a", 96, 0.5);
          glow(hp.x, hp.y, "#ffd76a", 140, 0.5);
          stars(hp.x, hp.y, "#ffd76a", 16, 80);
          levelFlourish(hp.x, hp.y, "#ffd76a", "HONORED", 2);
          addText(hp.x, hp.y - 46, `HONOR +${gain}`, "#ffd76a", 17, true);
        }
        sfx.merge();
        sfx.point();
        toastRef.current(
          t2 > 0
            ? `HONOR — ${heir.def.name} grew to ${heir.points} pts · +${Math.round(heir.honorMul * 100)}% forever`
            : `HONOR — ${heir.def.name} grew to ${heir.points} pts`,
          "#ffd76a"
        );
        return;
      }

      // ---------- the merge roulette ----------
      // The roulette only ever rolls towers that are ON THE SUMMON ROTATION, so a
      // merge can never hand you something the player did not put on their list.
      // If the rotation holds nothing else (or the pair IS the whole rotation)
      // the merge stays what it was: the tower you dropped onto, +1 point.
      const lineupDefs = [...new Set(saveRef.current.lineup)]
        .filter((id) => (saveRef.current.levels[id] || 0) > 0 && TOWER_BY_ID[id])
        .map((id) => TOWER_BY_ID[id]);
      const fresh = lineupDefs.filter((d) => d.id !== a.def.id && d.id !== b.def.id);
      const pool = fresh.length ? fresh : lineupDefs.length ? lineupDefs : [b.def];
      const nd = pool[Math.floor(Math.random() * pool.length)];
      b.def = nd;
      b.points = wanted;
      b.streak = 0;
      b.shots = 0;
      b.cd = 0.3;
      b.atkMul = 1;
      b.skillCd = undefined;
      g.towers = g.towers.filter((t) => t.uid !== a.uid);
      const rc = RARITY[nd.rarity].color;
      sfx.merge();
      ring(p.x, p.y, rc, 70);
      shock(p.x, p.y, "#ffffff", 96, 0.5);
      burst(p.x, p.y, rc, 26, 280);
      levelFlourish(p.x, p.y, rc, nd.name.toUpperCase(), 2);
      addText(p.x, p.y - 48, `EVOLVED · ${nd.name.toUpperCase()}`, rc, 15, true);
      toastRef.current(`Evolved into ${nd.name} · merged to ${b.points} pts`, rc);

      // ---------- Heavenly God: the merge calls blessing bolts down ----------
      if (wasHeavenly) {
        const def = TOWER_BY_ID.heavenly;
        const t1 = saveRef.current.awn["heavenly"]?.[0] || 0;
        let bolts = def.mergeBolts || 2;
        let pts = def.mergePoints || 2;
        let buff = def.mergeBuff || 3;
        if (t1 > 0) {
          // First awakening unlocks the divine merge strike. Positive Lightning
          // still adds its extra blessing bolts as a chance-based bonus.
          if (Math.random() < def.awk1!.chance[t1 - 1]) {
            bolts += def.awk1!.mult[t1 - 1];
            pts += 1;
            buff = def.awk1!.mult2![t1 - 1];
          }
          addText(p.x, p.y - 70, "DIVINE AWAKENING", "#fff6c4", 17, true);
          const god = heavenlySource!;
          const divineBase = towerDamage(god.def, god.menuLv, god.bLv, god.points, god.atkMul);
          const victims = g.enemies.filter((e) => !e.dead);
          victims.forEach((e) => {
            const ep = enemyPos(e);
            g.strikes.push({ x: ep.x, y: ep.y, life: 0.55, max: 0.55, width: 26, color: "#fff6c4", seed: Math.random() * 100, forks: 5, top: -180 });
            g.strikes.push({ x: ep.x, y: ep.y, life: 0.38, max: 0.38, width: 10, color: "#8feaff", seed: Math.random() * 100, forks: 3 });
            shock(ep.x, ep.y, "#fff6c4", 150, 0.48);
            glow(ep.x, ep.y, "#8feaff", 180, 0.52);
            sparkAt(ep.x, ep.y, 30, 360);
            // 3x a standard crit: 200% more crit damage, before normal
            // armour/ward handling, and still recorded as a critical hit.
            dealDamage(e, divineBase * 3, { alwaysCrit: true, tw: god, color: "#fff6c4" });
            addText(ep.x, ep.y - 72, "DIVINE SUPERCRIT ×3", "#fff6c4", 15, true);
          });
          flash("#fff6c4", 0.3);
          hitStop(0.11);
          punch(1, 1);
          g.shake = fxShake(14);
          sfx.superbolt();
        }
        const dur = def.mergeBuffT || 13;
        const board = [...g.towers];
        // every blessing bolt falls on the same frame: the judgement is one
        // sky event, not a queue of single strikes
        for (let i = 0; i < bolts && board.length; i++) {
          const pick = board[Math.floor(Math.random() * board.length)];
          blessTower(pick, pts, buff, dur, "#ffe86b", "BLESSED");
        }
        sfx.superbolt();
        flash("#fff6c4", 0.16);
        toastRef.current(`HEAVENLY JUDGEMENT — ${bolts} towers blessed · +${Math.round(buff * 100)}%`, "#ffe86b");
      }

      // ---------- Soul Wipeout: point-scaled execution beams on a Demon merge ----------
      if (demonSource) {
        const tier = saveRef.current.awn.demon?.[0] || 0;
        const bonusBeams = tier > 0 ? TOWER_BY_ID.demon.awk1!.mult[tier - 1] : 0;
        const beamCount = Math.min(48, Math.max(1, demonPoints + bonusBeams));
        const targets = g.enemies.filter((e) => !e.dead).sort((x, y) => y.d - x.d).slice(0, beamCount);
        const blood = "#920018";
        const now = performance.now();
        for (const enemy of targets) {
          const ep = enemyPos(enemy);
          g.strikes.push({ x: ep.x, y: ep.y, life: 0.62, max: 0.62, width: 24, color: blood, seed: Math.random() * 100, forks: 5, top: -H });
          g.strikes.push({ x: ep.x, y: ep.y, life: 0.36, max: 0.36, width: 9, color: "#ff5266", seed: Math.random() * 100, forks: 3, top: -H * 0.45 });
          if (g.bolts.length < 44) g.bolts.push(randBolt(p.x, p.y, ep.x, ep.y, "#c00028", 3.4, 0.38, now));
          addZone({ kind: "rift", x: ep.x, y: ep.y, r: 110, life: 0.75, max: 0.75, dps: 0, slow: 0, color: "#c00028" });
          shock(ep.x, ep.y, "#c00028", 185, 0.62);
          glow(ep.x, ep.y, "#ff1838", 210, 0.58);
          burst(ep.x, ep.y, blood, 34, 440);
          sparkAt(ep.x, ep.y, 30, 440);
          enemy.hp = 0;
          killReward(enemy);
        }
        flash("#680010", 0.44);
        punch(1, 0.8);
        hitStop(0.14);
        g.shake = saveRef.current.shakeFx ? Math.min(26, g.shake + 23) : 0;
        sfx.demonStrike();
        addText(p.x, p.y - 78, `SOUL WIPEOUT · ${beamCount} BEAMS`, "#ff4059", 18, true);
        toastRef.current(`SOUL WIPEOUT — ${targets.length}/${beamCount} execution beams`, "#a80020");
      }

      // ---------- Hellstorm still answers a merge with a blaze ----------
      const tier2 = nd.id === "hellstorm" ? saveRef.current.awn["hellstorm"]?.[1] || 0 : 0;
      if (nd.id === "hellstorm" && tier2 > 0) {
        const beams = nd.awk2!.mult[tier2 - 1];
        const targets = g.enemies.filter((e) => !e.dead).sort((x, y) => y.d - x.d).slice(0, beams);
        const now = performance.now();
        targets.forEach((e, i) => {
          const ep = enemyPos(e);
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
      if (mode === "superhardcore" && item.id === "life") return;
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
          g.dmgBonus += 0.21;
          break;
        case "aspd":
          g.bonusAspd = (g.bonusAspd || 0) + 0.21;
          break;
        case "critrate":
          g.critRate += 0.05;
          break;
        case "critdmg":
          g.critDmg += 0.15;
          break;
        case "sp":
          g.sp += 150;
          break;
        case "spgain":
          // +10% SP a level, capped at +100% (ten levels), which is what the
          // shop item's max is set to
          g.spGainMul = Math.min(1, g.spGainMul + 0.1);
          toastRef.current(`SP gain +${Math.round(g.spGainMul * 100)}%`, "#c44dff");
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
            const p = enemyPos(e);
            ring(p.x, p.y, "#ffb324", 60);
            dealDamage(e, e.max * 0.25, { color: "#ff9d4d" });
          });
          break;
        }
      }
      toastRef.current(`${item.name} bought · ${price} gold`, "#ffcf4d");
    };
    shopRef.current = buyShopItem;

    /**
     * Hero ultimates, reworked. Each one is a timeline: the cast is scheduled
     * across `castTime` seconds via `schedule()`, so effects unfold in beats
     * (wind-up, main event, payoff) instead of resolving in a single frame.
     * Every skill also leaves a real secondary mechanic on the field.
     */
    const hero = () => {
      if (g.heroCd > 0 || g.final) return;
      const hero = HERO_BY_ID[g.heroId] || HERO_BY_ID.nova;
      const lv = g.heroLv;
      const power = heroPower(lv);
      g.heroCd = heroCooldown(hero.cd, lv);
      g.skillCasts++;
      if (hero.id === "thunder") {
        const targets = g.towers.filter((tower) => tower.cell && tower.points < MAX_POINTS);
        const wardNow = performance.now();
        for (let i = 0; i < Math.min(2, targets.length); i++) {
          const pick = Math.floor(Math.random() * targets.length);
          const [tower] = targets.splice(pick, 1);
          const gain = 1 + Math.floor(Math.random() * 3);
          const before = tower.points;
          tower.points = Math.min(MAX_POINTS, tower.points + gain);
          const at = cellCenter(tower.cell!.c, tower.cell!.r);
          tower.flash = 0.35;
          // the lightning lands on the tower that actually gains the points:
          // a sky channel and a forked bolt strike down onto its cell
          const skyX = at.x + (Math.random() - 0.5) * 30;
          if (g.strikes.length < 24) g.strikes.push({ x: at.x, y: at.y, life: 0.46, max: 0.46, width: 10, color: hero.color, core: "#fff6c4", seed: Math.random() * 100, forks: 3, top: -H });
          if (g.bolts.length < 44) g.bolts.push(randBolt(skyX, -40, at.x, at.y, hero.color2, 3, 0.36, wardNow));
          if (g.bolts.length < 44) g.bolts.push(randBolt(at.x, at.y, at.x + 26, at.y - 40, hero.color2, 1.6, 0.22, wardNow));
          shock(at.x, at.y, hero.color, 46, 0.5);
          ring(at.x, at.y, "#ffe14d", 42);
          glow(at.x, at.y, "#ffe14d", 58, 0.45);
          addText(at.x, at.y - 20, `+${tower.points - before}P`, "#ffe14d", 12, true);
        }
        g.bossImmunityT = Math.max(g.bossImmunityT, 10);
        sfx.thunderCrack();
        toastRef.current("THUNDER WARD · TWO TOWERS EMPOWERED · BOSS IMMUNITY 10s", "#ffe14d");
      }
      // Bolt from the Blue (Thunder God awakening 2): every cast has a chance
      // to reset its own cooldown, leaving only a short interval before the
      // next one. The chance climbs and the interval shrinks with every tier.
      const boltTier = hero.id === "thunder" ? saveRef.current.heroAwn?.thunder?.[1] || 0 : 0;
      const boltReset = boltTier > 0 && Math.random() < boltResetChance(boltTier);
      if (boltReset) g.heroCd = boltResetInterval(boltTier);
      sfx.hero();
      const kind: HeroKind = hero.kind;
      const alive = () => g.enemies.filter((e) => !e.dead);

      // the busiest stretch of lane — where screen-wide skills centre themselves
      const hotspot = () => {
        const live = alive();
        if (!live.length) return { x: W / 2, y: H / 2, d: PATH_LEN * 0.5 };
        let best = live[0];
        let bestN = -1;
        for (const e of live) {
          const n = live.filter((o) => Math.abs(o.d - e.d) < 120).length;
          if (n > bestN) {
            bestN = n;
            best = e;
          }
        }
        const p = pathPos(best.d);
        return { x: p.x, y: p.y, d: best.d };
      };

      // --- shared cast opening: banner, rune circle, shockwave, screen wash ---
      const spot = hotspot();
      g.skill = {
        heroId: hero.id,
        name: hero.skillName,
        color: hero.color,
        color2: hero.color2,
        kind,
        t: 0,
        total: hero.castTime,
        phase: hero.phases[0].label,
        sx: spot.x,
        sy: spot.y,
      };
      hero.phases.slice(1).forEach((ph) => schedule(ph.at, () => {
        if (g.skill) g.skill.phase = ph.label;
      }));
      g.shake = fxShake(10);
      punch(0.45, 0.35);
      flash(hero.color, 0.26);
      shock(spot.x, spot.y, hero.color, 40, 0.8);
      shock(spot.x, spot.y, "#ffffff", 24, 0.5);
      glow(spot.x, spot.y, hero.color, 120, 0.7);
      stars(spot.x, spot.y, hero.color2, 16, 140);
      if (boltReset) {
        // Bolt from the Blue: the cooldown comes straight back, with a marker
        // so the player knows the next cast is a fraction of a second away.
        toastRef.current(`BOLT FROM THE BLUE · cooldown reset (${g.heroCd.toFixed(2)}s)`, "#7ce7ff");
        if (g.strikes.length < 24) g.strikes.push({ x: spot.x, y: spot.y, life: 0.3, max: 0.3, width: 4, color: "#c9f7ff", seed: Math.random() * 90, forks: 2, top: -160 });
        addText(spot.x, spot.y - 96, "BOLT FROM THE BLUE", "#c9f7ff", 18, true);
      }

      if (kind === "nuke") {
        // ===== SINGULARITY: open a rift, drag the field in, then collapse it =====
        const pullT = 1.9 + 0.12 * lv;
        addZone({ x: spot.x, y: spot.y, r: 150, life: pullT, max: pullT, kind: "rift", color: hero.color, dps: 24 * power, slow: 0.55 });
        alive().forEach((e) => {
          e.pulled = pullT;
          e.stun = Math.max(e.stun, pullT);
        });
        // three meteors crash in while the rift holds
        for (let i = 0; i < 3; i++) {
          schedule(0.45 + i * 0.42, () => {
            const a = (i / 3) * Math.PI * 2 + 0.7;
            const mx = spot.x + Math.cos(a) * 120;
            const my = spot.y + Math.sin(a) * 70;
            shock(mx, my, hero.color2, 30, 0.5);
            glow(mx, my, hero.color2, 70, 0.4);
            shards(mx, my, hero.color2, 10, 240);
            g.shake = fxShake(5);
            alive().forEach((e) => {
              const ep = enemyPos(e);
              if (Math.hypot(ep.x - mx, ep.y - my) < 110) dealDamage(e, (110 + 30 * g.round) * power, { color: hero.color2 });
            });
          });
        }
        schedule(pullT, () => {
          // collapse: damage scales with how many got dragged in
          const caught = alive().filter((e) => Math.hypot(enemyPos(e).x - spot.x, enemyPos(e).y - spot.y) < 190);
          const mul = 1 + Math.min(1.5, caught.length * 0.08);
          const dmg = (320 + 80 * g.round) * power * mul;
          caught.forEach((e) => {
            e.pulled = 0;
            e.stun = Math.max(e.stun, 1.1);
            dealDamage(e, dmg, { alwaysCrit: true, color: hero.color });
          });
          alive().forEach((e) => (e.pulled = 0));
          flash("#ffffff", 0.22);
          g.shake = fxShake(14);
          punch(1, 0.8);
          hitStop(0.1);
          for (let i = 0; i < 4; i++) shock(spot.x, spot.y, i % 2 ? hero.color : "#ffffff", 30 + i * 18, 0.8 + i * 0.12);
          glow(spot.x, spot.y, hero.color, 200, 0.8);
          shards(spot.x, spot.y, hero.color2, 30, 420);
          stars(spot.x, spot.y, "#ffffff", 20, 160);
          addText(spot.x, spot.y - 70, `×${caught.length} CAUGHT`, hero.color, 20, true);
          sfx.hero();
        });
        addText(W / 2, H / 2 - 110, "SINGULARITY", hero.color, 30, true);
        return;
      }

      if (kind === "freeze") {
        // ===== ABSOLUTE ZERO: encase, amplify, then shatter =====
        const dur = 1.6 + 0.4 * lv * 0.5;
        alive().forEach((e, i) => {
          e.frozen = Math.max(e.frozen, dur);
          e.encased = Math.max(e.encased, dur);
          e.slow = Math.max(e.slow, 0.6);
          e.slowT = Math.max(e.slowT, 10);
          const ep = enemyPos(e);
          schedule(Math.min(0.45, i * 0.012), () => {
            shock(ep.x, ep.y, hero.color, 26, 0.45);
            glow(ep.x, ep.y, hero.color2, 36, 0.5);
            stars(ep.x, ep.y, "#ffffff", 3, 26);
          });
        });
        // frost fields left on the lane
        for (let i = 0; i < 3; i++) {
          const d = ((i + 0.5) / 3) * PATH_LEN;
          const p = pathPos(d);
          addZone({ x: p.x, y: p.y, r: 92, life: 9, max: 9, kind: "frost", color: hero.color, dps: 10 * power, slow: 0.5 });
        }
        schedule(1.6, () => {
          // shatter: the more health they are missing, the harder it hits
          flash(hero.color2, 0.24);
          g.shake = fxShake(13);
          punch(0.9, 0.6);
          hitStop(0.09);
          alive().forEach((e) => {
            if (e.encased <= 0) return;
            const missing = 1 - e.hp / e.max;
            const dmg = (180 + 50 * g.round) * power * (1 + missing * 2.2 * (1 + lv * 0.08));
            const ep = enemyPos(e);
            e.encased = 0;
            dealDamage(e, dmg, { alwaysCrit: true, color: hero.color2 });
            shards(ep.x, ep.y, hero.color2, 14, 300);
            shock(ep.x, ep.y, "#ffffff", 24, 0.5);
          });
          addText(W / 2, H / 2 - 60, "SHATTER!", hero.color2, 30, true);
          sfx.freeze();
        });
        addText(W / 2, H / 2 - 110, "ABSOLUTE ZERO", hero.color, 30, true);
        sfx.freeze();
        return;
      }

      if (kind === "burn") {
        // ===== FIRESTORM: a walking meteor barrage that floods the lane with lava =====
        const shots = 9 + lv;
        const dmg = (140 + 42 * g.round) * power;
        for (let i = 0; i < shots; i++) {
          schedule(0.3 + i * (1.7 / shots), () => {
            const d = ((i + 0.5) / shots) * PATH_LEN;
            const p = pathPos(d);
            // the meteor itself
            shock(p.x, p.y, hero.color, 34, 0.55);
            shock(p.x, p.y, hero.color2, 20, 0.35);
            glow(p.x, p.y, hero.color2, 80, 0.45);
            embers(p.x, p.y, hero.color2, 10);
            shards(p.x, p.y, hero.color, 8, 220);
            g.shake = fxShake(4);
            if (i % 3 === 0) punch(0.2, 0.1);
            alive().forEach((e) => {
              const ep = enemyPos(e);
              if (Math.hypot(ep.x - p.x, ep.y - p.y) > 120) return;
              dealDamage(e, dmg, { color: hero.color });
              if (!e.dead) {
                // burn now compounds instead of overwriting
                e.burnDps = e.burnDps + dmg * 0.22;
                e.burnT = Math.max(e.burnT, 9 * power);
              }
            });
          });
        }
        schedule(2.1, () => {
          // lava flood along the hottest third of the lane
          flash(hero.color, 0.22);
          g.shake = fxShake(10);
          punch(0.7, 0.4);
          for (let i = 0; i < 5; i++) {
            const d = ((i + 0.5) / 5) * PATH_LEN;
            const p = pathPos(d);
            addZone({ x: p.x, y: p.y, r: 80, life: 10, max: 10, kind: "lava", color: hero.color, dps: (34 + 9 * g.round) * power, slow: 0.2 });
            embers(p.x, p.y, hero.color2, 8);
          }
          addText(W / 2, H / 2 - 60, "LAVA FLOOD", hero.color2, 28, true);
        });
        addText(W / 2, H / 2 - 110, "FIRESTORM", hero.color, 30, true);
        return;
      }

      if (kind === "overdrive") {
        // ===== TIME DILATION: slow the world, supercharge towers, free volley =====
        const dur = OVERDRIVE_TIME * power + lv * 0.2;
        g.odT = dur;
        g.timeScale = 0.4;
        flash(hero.color, 0.3);
        schedule(0.35, () => {
          g.timeScale = 1;
        });
        g.towers.forEach((t, i) => {
          if (!t.cell) return;
          const p = cellCenter(t.cell.c, t.cell.r);
          schedule(0.1 + i * 0.07, () => {
            shock(p.x, p.y, hero.color, 34, 0.6);
            glow(p.x, p.y, hero.color2, 56, 0.5);
            stars(p.x, p.y, hero.color2, 6, 40);
            addText(p.x, p.y - 44, "OVERCHARGED", hero.color, 12, true);
          });
        });
        // free overcharged volleys at the toughest targets
        const volleys = 1 + Math.floor(lv / 3);
        for (let v = 0; v < volleys; v++) {
          schedule(1.2 + v * 0.28, () => {
            const live = alive().sort((a, b) => b.hp - a.hp);
            if (!live.length) return;
            g.towers.forEach((t, i) => {
              if (!t.cell) return;
              const tp = cellCenter(t.cell.c, t.cell.r);
              const e = live[i % live.length];
              const ep = enemyPos(e);
              if (g.bolts.length < 44) g.bolts.push(randBolt(tp.x, tp.y, ep.x, ep.y, hero.color2, 3, 0.26, performance.now()));
              dealDamage(e, (90 + 26 * g.round) * power, { alwaysCrit: true, color: hero.color, tw: t });
              glow(ep.x, ep.y, hero.color, 40, 0.3);
            });
            g.shake = fxShake(6);
            punch(0.3, 0.2);
          });
        }
        addText(W / 2, H / 2 - 110, "TIME DILATION", hero.color, 30, true);
        return;
      }

      // ===== STORM SOVEREIGN: a single instantaneous sky fracture =====
      // The old cast walked a bolt front down the lane over 1.5s and finished
      // with a delayed hammer. Now the whole lane is struck on ONE frame: every
      // column appears together, every mark/stun/damage lands together, and the
      // sovereign strike resolves in the same instant.
      const bolts = 8 + Math.round(lv * 1.6);
      const chains = 2 + Math.floor(lv / 2);
      const dmg = (150 + 42 * g.round) * power;
      const now2 = performance.now();
      for (let i = 0; i < bolts; i++) {
        const d = ((i + 0.5) / bolts) * PATH_LEN;
        const p = pathPos(d);
        const hit = alive().filter((e) => {
          const ep = enemyPos(e);
          return Math.hypot(ep.x - p.x, ep.y - p.y) <= 110;
        });
        hit.slice(0, chains + 4).forEach((e) => {
          e.stun = Math.max(e.stun, 0.5);
          e.mark = Math.max(e.mark, 6);
          inductionStrike(e);
          dealDamage(e, dmg, { alwaysCrit: true, color: hero.color, lightning: true });
        });
        for (let k = 1; k < Math.min(hit.length, chains + 1); k++) {
          const a = enemyPos(hit[k - 1]);
          const b = enemyPos(hit[k]);
          if (g.bolts.length < 44) g.bolts.push(randBolt(a.x, a.y, b.x, b.y, hero.color2, 2, 0.26, now2));
        }
        g.strikes.push({ x: p.x, y: p.y, life: 0.42, max: 0.42, width: 9, color: hero.color, seed: (i * 17) % 90, forks: 2 });
        shock(p.x, p.y, hero.color, 34, 0.5);
        glow(p.x, p.y, hero.color2, 70, 0.35);
        stars(p.x, p.y, "#ffffff", 4, 40);
      }
      // sovereign strike: three colossal bolts land on randomly chosen enemies
      // (not a fixed hotspot), and each one arcs through everything nearby
      const pool = alive();
      const picks: Enemy[] = [];
      for (let i = 0; i < Math.min(3, pool.length); i++) {
        const idx = Math.floor(Math.random() * pool.length);
        picks.push(pool.splice(idx, 1)[0]);
      }
      const sp = picks.length ? (() => {
        const ep = enemyPos(picks[0]);
        return { x: ep.x, y: ep.y };
      })() : hotspot();
      flash(hero.color2, 0.26);
      g.shake = fxShake(14);
      punch(0.9, 0.7);
      hitStop(0.08);
      const hit = new Set<Enemy>();
      picks.forEach((target, bi) => {
        const tp = enemyPos(target);
        for (let i = 0; i < 3; i++) shock(tp.x, tp.y, i % 2 ? hero.color : "#ffffff", 34 + i * 22, 0.7);
        glow(tp.x, tp.y, hero.color2, 170, 0.7);
        g.strikes.push({ x: tp.x, y: tp.y, life: 0.66, max: 0.66, width: 26, color: "#fff6c4", seed: 3 + bi * 7, forks: 4, top: -140 });
        g.strikes.push({ x: tp.x, y: tp.y, life: 0.5, max: 0.5, width: 14, color: "#ffffff", seed: 11 + bi * 5, forks: 2, top: -140 });
        alive().forEach((e) => {
          if (hit.has(e)) return;
          const ep = enemyPos(e);
          if (Math.hypot(ep.x - tp.x, ep.y - tp.y) > 200) return;
          hit.add(e);
          e.mark = Math.max(e.mark, 6);
          inductionStrike(e);
          dealDamage(e, dmg * 2.4, { alwaysCrit: true, color: hero.color2, lightning: true });
        });
      });
      addText(sp.x, sp.y - 70, "SOVEREIGN STRIKE", hero.color2, 22, true);
      addText(W / 2, H / 2 - 110, "STORM SOVEREIGN", hero.color, 30, true);
    };
    heroRef.current = hero;

    /**
     * SUMMON spawns a tower and does nothing else: one new tower, on a random
     * free cell. It never combines a spawn with an upgrade, and it never fuses
     * towers to make room — on a full board the player has to merge by hand,
     * which is the only thing that frees a cell.
     */
    const summon = () => {
      const cost = summonCost();
      if (g.sp < cost) {
        sfx.error();
        toastRef.current("Not enough SP", "#ff4d5e");
        return;
      }
      const unlocked = Object.keys(saveRef.current.levels).filter((id) => saveRef.current.levels[id] > 0);
      if (unlocked.length === 0) return;

      const cell = randFreeCell(g);
      if (!cell) {
        sfx.error();
        toastRef.current("Board full — merge two towers to free a cell", "#ff4d5e");
        return;
      }

      // ONLY rotation towers reach the board. The rotation is set in the Towers
      // tab, so nothing the player did not put on the list can ever appear —
      // merging cannot conjure a tower either, because it upgrades in place.
      const lineup = saveRef.current.lineup.filter((id) => saveRef.current.levels[id] > 0 && TOWER_BY_ID[id]);
      if (!lineup.length) {
        sfx.error();
        toastRef.current("Set your summon rotation in the Towers tab first", "#ff4d5e");
        return;
      }
      const pool0 = lineup;
      const counts = pool0.map((id) => ({ id, n: g.towers.filter((t) => t.def.id === id).length }));
      const least = Math.min(...counts.map((c) => c.n));
      const pool = counts.filter((c) => c.n === least);
      const id = pool[Math.floor(Math.random() * pool.length)].id;
      const def = TOWER_BY_ID[id];
      g.towers.push({
        uid: uidC++, def, menuLv: saveRef.current.levels[id], bLv: 1, points: 0, cell,
        cd: 0.6, shots: 0, angle: 0, rapidT: 0, rapidCool: 5, streak: 0, flash: 0,
        owner: "you", atkMul: 1, hexT: 0, downT: 0, hasteT: 0, hasteMul: 0,
        surgeT: 0, surgeMul: 0, honorMul: 0, superBuff: 0,
      });
      const p = cellCenter(cell.c, cell.r);
      levelFlourish(p.x, p.y, RARITY[def.rarity].color, "DEPLOYED", def.rarity === "legendary" ? 3 : 1);
      burst(p.x, p.y, RARITY[def.rarity].color, 14);
      sfx.summon();
      toastRef.current(`${def.name} deployed!`, RARITY[def.rarity].color);
      g.sp -= cost;
      g.spSpend++;
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
      const cost = ascCost(src.bLv);
      if (g.sp < cost) { sfx.error(); toastRef.current("Not enough SP", "#ff4d5e"); return; }
      g.sp -= cost;
      const lv = Math.min(MAX_BATTLE_LEVEL, src.bLv + 1);
      // every copy of the tower stays in lockstep
      for (const t of family) t.bLv = lv;
      sfx.ascend();
      // One simultaneous ascent flash: every copy's lightning lands together.
      flash("#35e0ff", 0.22);
      hitStop(0.045);
      open.forEach((t) => {
        if (!t.cell) return;
        const p = cellCenter(t.cell.c, t.cell.r);
        levelFlourish(p.x, p.y, "#35e0ff", `ASCENT ${ROMAN[lv] || lv}`, lv >= MAX_BATTLE_LEVEL ? 3 : 2);
        g.strikes.push({ x: p.x, y: p.y, life: 0.38, max: 0.38, width: 14, color: "#b9f4ff", seed: Math.random() * 100, forks: 3, top: -220 });
        g.strikes.push({ x: p.x, y: p.y, life: 0.26, max: 0.26, width: 5, color: "#ffffff", seed: Math.random() * 100, top: -220 });
        sparkAt(p.x, p.y, 18, 220);
      });
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
      for (const st of g.strikes) st.life -= dt;
      g.strikes = g.strikes.filter((st) => st.life > 0);
      g.bolts = g.bolts.filter((b) => b.life > 0);
      for (const p of g.parts) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === "spark") p.vy += 260 * dt;
        if (p.grav) p.vy += 420 * p.grav * dt;
        if (p.drag) {
          const k = Math.max(0, 1 - p.drag * dt);
          p.vx *= k;
          p.vy *= k;
        }
        if (p.spin) p.rot = (p.rot || 0) + p.spin * dt;
      }
      g.parts = g.parts.filter((p) => p.life > 0);

      // screen flash + camera punch + chromatic split all decay on their own
      if (g.flash) {
        g.flash.life -= dt;
        if (g.flash.life <= 0) g.flash = null;
      }
      g.punch = Math.max(0, g.punch - dt * 3.4);
      g.chroma = Math.max(0, g.chroma - dt * 2.6);
      for (const l of g.levelFx) l.t += dt;
      g.levelFx = g.levelFx.filter((l) => l.t < l.total);
      for (const t of g.texts) {
        t.life -= dt;
        t.y -= 34 * dt;
      }
      g.texts = g.texts.filter((t) => t.life > 0);
    };

    const update = (rawDt: number) => {
      // remember where everything was: with frame interpolation on, the draw
      // pass glides between this snapshot and the post-step positions
      for (const e of g.enemies) {
        e.ppd = e.pd ?? e.d;
        e.ppox = e.pox ?? e.ox;
        e.ppoy = e.poy ?? e.oy;
        e.pd = e.d;
        e.pox = e.ox;
        e.poy = e.oy;
      }
      for (const pr of g.projs) {
        pr.px = pr.x;
        pr.py = pr.y;
      }
      for (const p of g.parts) {
        p.px = p.x;
        p.py = p.y;
        p.prot = p.rot || 0;
      }
      for (const t of g.texts) t.py = t.y;
      // hit-stop freezes the simulation for a few frames on heavy impacts, and
      // Time Dilation scales the whole world down — both leave FX running.
      if (g.hitStop > 0) {
        g.hitStop = Math.max(0, g.hitStop - rawDt);
        updateFx(rawDt);
        return;
      }
      const dt = rawDt * g.timeScale;
      g.t += dt;
      g.bossImmunityT = Math.max(0, g.bossImmunityT - dt);
      g.shake = saveRef.current.shakeFx ? Math.max(0, g.shake - dt * 30) : 0;
      g.redFlash = Math.max(0, g.redFlash - dt * 2);
      g.heroCd = Math.max(0, g.heroCd - dt);
      g.odT = Math.max(0, g.odT - dt);

      // ---- hero cast timeline: fire every beat whose moment has arrived ----
      if (g.casts.length) {
        const due = g.casts.filter((c) => c.at <= g.t);
        if (due.length) {
          g.casts = g.casts.filter((c) => c.at > g.t);
          due.forEach((c) => c.run());
        }
      }
      if (g.skill) {
        g.skill.t += rawDt;
        if (g.skill.t >= g.skill.total) g.skill = null;
      }

      if (g.final) {
        updateFx(dt);
        return;
      }
      if (g.roulette) {
        g.roulette.t -= dt;
        if (g.roulette.t <= 0) g.roulette = null;
      }
      if (mode === "gemrush") {
        g.gemRushRemaining = Math.max(0, g.gemRushRemaining - rawDt);
        if (g.gemRushRemaining <= 0) {
          endGame(false);
          updateFx(dt);
          return;
        }
      }

      // the gauntlet boon card holds the sim: nothing may move behind the pick
      if (g.phase === "boon") {
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
        // the rings "lock on" a beat before the cut ends — the whole overlay
        // turns red-hot for that last second, then snaps straight into the fight
        if (!g.cut.locked && g.cut.t <= 0.9) {
          g.cut.locked = true;
          g.shake = fxShake(8);
          flash(ENEMY_TYPES[g.cut.type].color, 0.22);
          sfx.superbolt();
        }
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
          // two-gate modes alternate: every other body steps out of the second gate
          const fromGateB = hasSecondGate(mode) && g.waveSpawned % 2 === 1;
          g.waveSpawned++;
          const et = ENEMY_TYPES[s.type];
          const boss = isBossType(s.type);
          // elites: 2.8x-health variants with a golden sigil, 5x SP and double gold
          const elite = !boss && Math.random() < Math.min(0.35, 0.06 + g.round * 0.015);
          // Bosses use +78%; regulars use +90%, and elites gain the 2.8x variant multiplier.
          const hp = hardcoreEnemyHp(
            roundHp(g.round) * et.hpMul * (mode === "gemrush" ? GEM_RUSH_HP_MUL : EV_BONUS.hpMul * MONTH_BONUS.hpMul) * (elite ? ELITE_HP_MUL : 1) * (boss ? BOSS_HP_MUL : ENEMY_HP_SCALE) * (mode === "sandbox" ? sandboxCfgRef.current.hp : 1),
            mode
          );
          g.enemies.push({
            id: eidC++, d: fromGateB ? GATE_B_D : 0, hp, max: hp, speed: et.speed * ENEMY_SPEED_MUL * (1 + g.round * 0.012) * (elite ? 1.08 : 1) * (mode === "gemrush" ? GEM_RUSH_SPEED_MUL : modeSpeedMul(mode)) * (mode === "sandbox" ? sandboxCfgRef.current.speed : 1), type: s.type,
            elite,
            frozen: 0, stun: 0, armor: mode === "sandbox" ? sandboxCfgRef.current.shield : et.armor, lives: et.lives, gold: (et.gold + Math.floor(g.round / 2)) * (elite ? 2 : 1),
            spv: Math.round(killSp(elite, boss) * MONTH_BONUS.spMul), dead: false, wob: Math.random() * 7,
            slow: 0, slowT: 0, burnT: 0, burnDps: 0,
            summonCd: BOSS_SUMMON_CD, blinkCd: BOSS_BLINK_CD, wardCd: BOSS_WARD_CD, ward: 0,
            nullCd: BOSS_NULL_CD, devourCd: BOSS_DEVOUR_CD, meteorCd: BOSS_METEOR_CD,
            chainsCd: BOSS_CHAINS_CD, warpCd: BOSS_WARP_CD, link: 0,
            exCd: [4.5, 7.5, 10.5],
            enraged: false, cast: 0,
            encased: 0, mark: 0, pulled: 0, ox: 0, oy: 0,
          });
          // spawn-in: a rift opens at the gate and the body condenses out of it
          // (elites and bosses get a bigger, brighter ring)
          if (fxOn() && !saveRef.current.powerSaver) {
            const sp0 = pathPos(fromGateB ? GATE_B_D : 0);
            ring(sp0.x, sp0.y, et.color, boss ? 46 : elite ? 30 : 18);
            if (boss) {
              glow(sp0.x, sp0.y, et.accent, 140, 0.5);
              shock(sp0.x, sp0.y, et.color, 90, 0.5);
            }
          }
          // a boss walks in with a cutscene — the sim holds until it finishes.
          // When a wave carries several bosses the card introduces the marquee
          // one (highest hpMul), so the Abyss Leviathan is never upstaged by a
          // Warlord that happened to spawn a frame earlier.
          if (boss && g.bossIntro !== g.round) {
            g.bossIntro = g.round;
            let marquee = s.type;
            for (const q of g.spawnQ) {
              if (isBossType(q.type) && ENEMY_TYPES[q.type].hpMul > ENEMY_TYPES[marquee].hpMul) marquee = q.type;
            }
            const met = ENEMY_TYPES[marquee];
            if (saveRef.current.autoSkipBossCut) {
              // the player asked for no cutscenes: a one-line callout on the
              // boss cast banner replaces the card and the world never stops
              const sig = BOSS_SKILL_BY_ID[bossKit(marquee)[0]];
              g.bossCast = {
                skill: sig.name,
                tell: `${met.name} — ${met.title} · ${mode === "battle" ? "ROUND" : "WAVE"} ${g.round}`,
                color: sig.color,
                t: 2.2,
              };
              g.shake = fxShake(10);
              g.strikes.push({ x: W / 2, y: H * 0.4, life: 0.4, max: 0.4, width: 8, color: met.color, seed: Math.random() * 90, forks: 3, top: -160 });
              sfx.boss();
            } else {
              g.cut = { type: marquee, name: met.name, sub: `${mode === "battle" ? "ROUND" : "WAVE"} ${g.round} · BOSS INCOMING`, t: 3.4, total: 3.4 };
              g.shake = fxShake(10);
              sfx.boss();
            }
          }
        }
        if (!g.spawnQ.length && g.enemies.length === 0) {
          const bonus = 40 + 10 * g.round;
          g.sp += spGain(bonus);
          g.wavesCleared++;
          sfx.waveClear();
          // gold + gem payouts were buffed 40% (REWARD_MUL) in the balance patch
          g.gold += runGold(reward(bonus / 2) * g.goldMul * rewardMul);
          if (isRunMode(g.mode) && g.round >= g.maxRounds) {
            endGame(true);
          } else if (mode === "gauntlet") {
            // the run is never "won": it ends when the line breaks. Every clear
            // is a boon beat, and the next wave rolls straight out of the pick.
            g.phase = "boon";
            g.boonOffer = offerBoons();
            g.phaseT = 0;
            if (saveRef.current.fastWaves) {
              // fast waves skips the pause and auto-picks a random boon — the
              // effect must still be applied or the run silently loses power
              g.phase = "inter";
              g.phaseT = 0.6;
              g.boonOffer = null;
              applyBoon(GAUNTLET_BOONS[Math.floor(Math.random() * GAUNTLET_BOONS.length)]);
            }
            sfx.coin();
            if (!saveRef.current.hideWaveCleared) { sfx.waveCleared(); toastRef.current(`Wave ${g.round} cleared · choose a boon`, "#3dff8e"); }
            if (g.round % 5 === 0) {
              mutateRef.current((s) => {
                s.tokens += 1;
              });
              sfx.token();
              toastRef.current(`Gauntlet wave ${g.round}: +1 Magic Token`, "#ff4fd8");
            }
          } else {
            g.phase = "inter";
            g.phaseT = saveRef.current.fastWaves ? 1.2 : mode === "endless" ? 3 : 3.5;
            sfx.coin();
            if (!saveRef.current.hideWaveCleared) toastRef.current(
              `${mode === "endless" ? "Wave" : "Round"} ${g.round} cleared · +${spGain(bonus)} SP`,
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
        // Every boss runs ITS OWN three-skill kit (see BOSS_KITS). No skill is
        // shared between two bosses, so each fight has a different shape: the
        // Warlord rallies and cleaves, the Overlord bends the rift, the Titan
        // breaks the ground, the Leviathan coils, and the Herald owns the sky.
        if (isBossType(e.type)) {
          const kit = bossKit(e.type);
          const ep0 = enemyPos(e);
          const NAME = ENEMY_TYPES[e.type].name;
          /** fire a skill: banner + bar flash, all keyed off the shared table */
          const castSkill = (id: keyof typeof BOSS_SKILL_BY_ID, tell?: string) => {
            const sk = BOSS_SKILL_BY_ID[id];
            e.cast = 1.15;
            g.bossCast = { skill: sk.name, tell: tell ?? `${NAME} ${sk.tell}`, color: sk.color, t: 2.2 };
          };
          e.cast = Math.max(0, e.cast - dt);
          e.ward = Math.max(0, e.ward - dt);
          for (let i = 0; i < 3; i++) e.exCd[i] = Math.max(0, e.exCd[i] - dt);

          // Every boss opens with a bark naming the first skill in OWN kit — a
          // pure callout (no damage) so the player always learns which kit is
          // walking at them, even when the board is quiet and none of that
          // kit's conditions are met yet. It waits for the cutscene banner to
          // clear so the two callouts never talk over each other.
          if (!e.barked && !g.bossCast) {
            const sig = BOSS_SKILL_BY_ID[kit[0]];
            if (sig) {
              e.barked = true;
              e.cast = 1.15;
              g.bossCast = { skill: sig.name, tell: `${NAME} ${sig.tell}`, color: sig.color, t: 2.4 };
            }
          }

          // --- Blood Frenzy (Void Titan): one-shot, below 45% health
          if (kit.includes("enrage") && g.bossImmunityT <= 0 && !e.enraged && e.hp / e.max <= BOSS_ENRAGE_AT) {
            e.enraged = true;
            e.speed *= 1.45;
            e.ward = Math.max(e.ward, 1.2);
            castSkill("enrage");
            burst(ep0.x, ep0.y, "#ff4d5e", 22, 240);
            shock(ep0.x, ep0.y, "#ff4d5e", 90, 0.6);
            sfx.leak();
          }

          // ================= WARLORD: warcry · cleave · banner =================
          if (kit.includes("warcry") && g.bossImmunityT <= 0 && e.exCd[0] <= 0) {
            const herd = g.enemies.filter((o) => !o.dead && !isBossType(o.type) && Math.hypot(enemyPos(o).x - ep0.x, enemyPos(o).y - ep0.y) <= BOSS_WARCRY_RADIUS);
            if (herd.length) {
              e.exCd[0] = BOSS_WARCRY_CD;
              for (const m of herd) {
                m.rage = Math.max(m.rage || 0, BOSS_WARCRY_TIME);
                const mp = enemyPos(m);
                ring(mp.x, mp.y, "#ff9d4d", 26);
              }
              castSkill("warcry", `${NAME} drives ${herd.length} minion${herd.length > 1 ? "s" : ""} into a frenzy`);
              shock(ep0.x, ep0.y, "#ff9d4d", BOSS_WARCRY_RADIUS, 0.6);
              sfx.leak();
            }
          }
          if (kit.includes("cleave") && g.bossImmunityT <= 0 && e.exCd[1] <= 0) {
            const near = g.towers
              .filter((t) => t.cell)
              .map((t) => ({ t, p: cellCenter(t.cell!.c, t.cell!.r) }))
              .filter((x) => Math.hypot(x.p.x - ep0.x, x.p.y - ep0.y) <= 340)
              .sort((a, b) => Math.hypot(a.p.x - ep0.x, a.p.y - ep0.y) - Math.hypot(b.p.x - ep0.x, b.p.y - ep0.y))[0];
            if (near) {
              e.exCd[1] = BOSS_CLEAVE_CD;
              near.t.downT = Math.max(near.t.downT, BOSS_CLEAVE_DOWN);
              if (g.bolts.length < 44) g.bolts.push(randBolt(ep0.x, ep0.y, near.p.x, near.p.y, "#ff5d5d", 3.4, 0.3, performance.now()));
              shards(near.p.x, near.p.y, "#ff8f8f", 12, 240);
              ring(near.p.x, near.p.y, "#ff5d5d", 42);
              castSkill("cleave", `${NAME} cleaves a tower offline for ${BOSS_CLEAVE_DOWN}s`);
              g.shake = fxShake(7);
              sfx.explosion();
            }
          }
          if (kit.includes("banner") && g.bossImmunityT <= 0 && e.exCd[2] <= 0) {
            e.exCd[2] = BOSS_BANNER_CD;
            e.plating = Math.max(e.plating || 0, BOSS_BANNER_TIME);
            e.ward = Math.max(e.ward, BOSS_BANNER_TIME * 0.5);
            castSkill("banner", `${NAME} raises its banner (+${Math.round(BOSS_BANNER_ARMOR * 100)}% armour)`);
            glow(ep0.x, ep0.y, "#ffd23f", 90, 0.55);
            shock(ep0.x, ep0.y, "#ffd23f", 70, 0.5);
            sfx.hover();
          }

          // ================= OVERLORD: summon · nullfield · warp =================
          if (kit.includes("summon") && g.bossImmunityT <= 0) {
            e.summonCd -= dt;
            if (e.summonCd <= 0) {
              e.summonCd = BOSS_SUMMON_CD;
              const et0 = ENEMY_TYPES[0];
              const nSum = 2 + (g.round >= 16 ? 1 : 0);
              for (let i = 0; i < nSum; i++) {
                const hp = roundHp(g.round) * et0.hpMul * MONTH_BONUS.hpMul * 0.6 * ENEMY_HP_SCALE;
                const back = Math.max(0, e.d - 30 - i * 26);
                g.enemies.push({
                  id: eidC++, d: back, hp, max: hp, speed: et0.speed * ENEMY_SPEED_MUL * (1 + g.round * 0.012) * 1.25 * modeSpeedMul(mode), type: 0,
                  frozen: 0, stun: 0, armor: 0, lives: 1, gold: et0.gold + Math.floor(g.round / 4),
                  spv: killSp(false, false), dead: false, wob: Math.random() * 7,
                  slow: 0, slowT: 0, burnT: 0, burnDps: 0,
                  summonCd: 0, blinkCd: 0, wardCd: 0, ward: 0,
                  nullCd: 0, devourCd: 0, meteorCd: 0, chainsCd: 0, warpCd: 0, link: 0, exCd: [0, 0, 0],
                  enraged: false, cast: 0,
                  encased: 0, mark: 0, pulled: 0, ox: 0, oy: 0,
                });
                ring(ep0.x, ep0.y, "#c44dff", 30 + i * 8);
              }
              castSkill("summon");
              sfx.summon();
            }
          }
          if (kit.includes("nullfield") && g.bossImmunityT <= 0) {
            e.nullCd -= dt;
            if (e.nullCd <= 0) {
              const near = g.towers
                .filter((t) => t.cell && Math.hypot(cellCenter(t.cell.c, t.cell.r).x - ep0.x, cellCenter(t.cell.c, t.cell.r).y - ep0.y) <= BOSS_NULL_RADIUS)
                .slice(0, 4);
              if (near.length) {
                e.nullCd = BOSS_NULL_CD;
                for (const t of near) {
                  t.hexT = Math.max(t.hexT, BOSS_NULL_TIME);
                  const tp = cellCenter(t.cell!.c, t.cell!.r);
                  ring(tp.x, tp.y, "#b06bff", 44);
                  glow(tp.x, tp.y, "#b06bff", 60, 0.5);
                  if (g.bolts.length < 44) g.bolts.push(randBolt(ep0.x, ep0.y, tp.x, tp.y, "#c98cff", 2.6, 0.3, performance.now()));
                }
                castSkill("nullfield", `${NAME} hexes ${near.length} tower${near.length > 1 ? "s" : ""}`);
                shock(ep0.x, ep0.y, "#b06bff", BOSS_NULL_RADIUS, 0.7);
                sfx.zap();
              }
            }
          }
          if (kit.includes("warp") && g.bossImmunityT <= 0) {
            e.warpCd -= dt;
            if (e.warpCd <= 0) {
              e.warpCd = BOSS_WARP_CD;
              let moved = 0;
              for (const m of g.enemies) {
                if (m.dead || isBossType(m.type)) continue;
                const before = enemyPos(m);
                ring(before.x, before.y, "#ff4fd8", 26);
                m.d = Math.min(m.d + BOSS_WARP_DIST, PATH_LEN - 4);
                m.pd = m.d;
                const after = enemyPos(m);
                ring(after.x, after.y, "#ff4fd8", 30);
                burst(after.x, after.y, "#ff4fd8", 6, 140);
                moved++;
              }
              if (moved) {
                castSkill("warp", `${NAME} warps ${moved} enem${moved > 1 ? "ies" : "y"} forward`);
                g.shake = fxShake(6);
                flash("#ff4fd8", 0.18);
                sfx.summon();
              }
            }
          }

          // ================= VOID TITAN: quake · meteor · enrage =================
          if (kit.includes("quake") && g.bossImmunityT <= 0 && e.exCd[0] <= 0) {
            const near = g.towers.filter((t) => t.cell && Math.hypot(cellCenter(t.cell.c, t.cell.r).x - ep0.x, cellCenter(t.cell.c, t.cell.r).y - ep0.y) <= BOSS_QUAKE_RADIUS);
            if (near.length) {
              e.exCd[0] = BOSS_QUAKE_CD;
              for (const t of near) {
                t.downT = Math.max(t.downT, BOSS_QUAKE_DOWN);
                const tp = cellCenter(t.cell!.c, t.cell!.r);
                shards(tp.x, tp.y, "#22d3ee", 10, 220);
                ring(tp.x, tp.y, "#22d3ee", 46);
              }
              castSkill("quake", `${NAME} shatters the ground under ${near.length} tower${near.length > 1 ? "s" : ""}`);
              g.shake = fxShake(12);
              flash("#22d3ee", 0.16);
              sfx.explosion();
            }
          }
          if (kit.includes("meteor") && g.bossImmunityT <= 0) {
            e.meteorCd -= dt;
            if (e.meteorCd <= 0) {
              const targets = g.towers.filter((t) => t.cell && t.downT <= 0);
              if (targets.length) {
                e.meteorCd = BOSS_METEOR_CD;
                for (let i = 0; i < BOSS_METEOR_COUNT; i++) {
                  const t = targets[(i + Math.floor(g.t * 3)) % targets.length];
                  const tp = cellCenter(t.cell!.c, t.cell!.r);
                  g.meteors.push({ x: tp.x, y: tp.y, t: 0.75 + i * 0.12, total: 0.75 + i * 0.12, uid: t.uid, color: "#ff7a3d" });
                }
                castSkill("meteor");
                sfx.hover();
              }
            }
          }

          // ================= LEVIATHAN: devour · chains · undertow =================
          if (kit.includes("devour") && g.bossImmunityT <= 0) {
            e.devourCd -= dt;
            if (e.devourCd <= 0 && e.hp / e.max < 0.92) {
              const snacks = g.enemies.filter((o) => o !== e && !o.dead && !isBossType(o.type) && Math.hypot(enemyPos(o).x - ep0.x, enemyPos(o).y - ep0.y) <= 300).slice(0, 3);
              if (snacks.length) {
                e.devourCd = BOSS_DEVOUR_CD;
                for (const m of snacks) {
                  const mp = enemyPos(m);
                  m.dead = true;
                  e.hp = Math.min(e.max, e.hp + e.max * BOSS_DEVOUR_HEAL);
                  if (g.bolts.length < 44) g.bolts.push(randBolt(mp.x, mp.y, ep0.x, ep0.y, "#ff8c3d", 3, 0.3, performance.now()));
                  burst(mp.x, mp.y, "#ff8c3d", 12, 160);
                  stars(ep0.x, ep0.y, "#ffd23f", 6, 40);
                }
                castSkill("devour", `${NAME} devours ${snacks.length} minion${snacks.length > 1 ? "s" : ""} (+${Math.round(BOSS_DEVOUR_HEAL * snacks.length * 100)}% HP)`);
                sfx.explosion();
              }
            }
          }
          if (kit.includes("chains") && g.bossImmunityT <= 0) {
            e.chainsCd -= dt;
            if (e.chainsCd <= 0) {
              const herd = g.enemies.filter((o) => !o.dead && !isBossType(o.type) && Math.hypot(enemyPos(o).x - ep0.x, enemyPos(o).y - ep0.y) <= BOSS_CHAINS_RADIUS);
              if (herd.length) {
                e.chainsCd = BOSS_CHAINS_CD;
                for (const m of herd) {
                  m.link = Math.max(m.link, BOSS_CHAINS_TIME);
                  ring(enemyPos(m).x, enemyPos(m).y, "#4de8ff", 34);
                }
                castSkill("chains", `${NAME} shields ${herd.length} minion${herd.length > 1 ? "s" : ""}`);
                shock(ep0.x, ep0.y, "#4de8ff", BOSS_CHAINS_RADIUS, 0.7);
                sfx.freeze();
              }
            }
          }
          if (kit.includes("undertow") && g.bossImmunityT <= 0 && e.exCd[0] <= 0) {
            let dragged = 0;
            for (const m of g.enemies) {
              if (m.dead || isBossType(m.type)) continue;
              if (Math.abs(m.d - e.d) > 420) continue;
              if (m.d < e.d - 8) continue;
              const before = enemyPos(m);
              m.d = Math.max(0, m.d - BOSS_UNDERTOW_PULL);
              m.pd = m.d;
              const after = enemyPos(m);
              if (g.bolts.length < 44) g.bolts.push(randBolt(before.x, before.y, after.x, after.y, "#2ee6c8", 2.2, 0.24, performance.now()));
              dragged++;
            }
            if (dragged) {
              e.exCd[0] = BOSS_UNDERTOW_CD;
              castSkill("undertow", `${NAME} drags ${dragged} enem${dragged > 1 ? "ies" : "y"} back into its coils`);
              shock(ep0.x, ep0.y, "#2ee6c8", 260, 0.7);
              g.shake = fxShake(5);
              sfx.freeze();
            }
          }

          // ================= STORM HERALD: siphon · overcharge · maelstrom =================
          if (kit.includes("siphon") && g.bossImmunityT <= 0 && e.exCd[0] <= 0) {
            e.exCd[0] = BOSS_SIPHON_CD;
            const stolen = Math.min(g.sp, BOSS_SIPHON_SP + 10 * g.round);
            g.sp = Math.max(0, g.sp - stolen);
            e.hp = Math.min(e.max, e.hp + e.max * BOSS_SIPHON_HEAL);
            castSkill("siphon", `${NAME} siphons ${Math.round(stolen)} SP and heals ${Math.round(BOSS_SIPHON_HEAL * 100)}%`);
            for (let i = 0; i < 6; i++) {
              const a = Math.random() * Math.PI * 2;
              const pp = { x: ep0.x + Math.cos(a) * 50, y: ep0.y + Math.sin(a) * 40 };
              if (g.bolts.length < 44) g.bolts.push(randBolt(pp.x, pp.y, ep0.x, ep0.y, "#c98cff", 2.4, 0.3, performance.now()));
            }
            stars(ep0.x, ep0.y, "#c98cff", 8, 60);
            sfx.zap();
          }
          if (kit.includes("overcharge") && g.bossImmunityT <= 0 && e.exCd[1] <= 0) {
            const near = g.towers
              .filter((t) => t.cell)
              .map((t) => ({ t, p: cellCenter(t.cell!.c, t.cell!.r) }))
              .filter((x) => Math.hypot(x.p.x - ep0.x, x.p.y - ep0.y) <= 300)
              .slice(0, BOSS_OVERCHARGE_TARGETS);
            if (near.length) {
              e.exCd[1] = BOSS_OVERCHARGE_CD;
              for (const { t, p } of near) {
                t.downT = Math.max(t.downT, BOSS_OVERCHARGE_DOWN);
                if (g.bolts.length < 44) g.bolts.push(randBolt(ep0.x, ep0.y, p.x, p.y, "#7ce7ff", 3.2, 0.3, performance.now()));
                ring(p.x, p.y, "#7ce7ff", 40);
                glow(p.x, p.y, "#c9f7ff", 60, 0.45);
              }
              castSkill("overcharge", `${NAME} arcs through ${near.length} tower${near.length > 1 ? "s" : ""}`);
              g.shake = fxShake(8);
              sfx.zap();
            }
          }
          if (kit.includes("maelstrom") && g.bossImmunityT <= 0 && e.exCd[2] <= 0) {
            e.exCd[2] = BOSS_MAELSTROM_CD;
            let moved = 0;
            for (const m of g.enemies) {
              if (m.dead || isBossType(m.type)) continue;
              m.d = Math.min(m.d + BOSS_MAELSTROM_DIST, PATH_LEN - 4);
              m.pd = m.d;
              m.rage = Math.max(m.rage || 0, 3.5);
              const after = enemyPos(m);
              ring(after.x, after.y, "#4de8ff", 24);
              moved++;
            }
            if (moved) {
              castSkill("maelstrom", `${NAME} hurls ${moved} enem${moved > 1 ? "ies" : "y"} down the lane`);
              g.shake = fxShake(9);
              flash("#4de8ff", 0.16);
              sfx.summon();
            }
          }
        }
        if (e.slowT > 0) e.slowT -= dt;
        if (e.flash) e.flash = Math.max(0, e.flash - dt);
        // ---------- skill status effects ----------
        if (e.link > 0) {
          e.link -= dt;
          if (Math.random() < dt * 5) {
            const lp = enemyPos(e);
            pushPart({ x: lp.x, y: lp.y, vx: (Math.random() - 0.5) * 40, vy: -30, life: 0.35, max: 0.35, size: 3, color: "#4de8ff", kind: "spark", add: true });
          }
        }
        e.encased = Math.max(0, e.encased - dt);
        e.mark = Math.max(0, e.mark - dt);
        // Electrical Induction / War Cry / Iron Banner timers
        if (e.shieldCutT) {
          e.shieldCutT = Math.max(0, e.shieldCutT - dt);
          if (e.shieldCutT <= 0) e.shieldCut = 0;
          if (Math.random() < dt * 6) {
            const sp3 = enemyPos(e);
            pushPart({ x: sp3.x, y: sp3.y, vx: (Math.random() - 0.5) * 60, vy: -40, life: 0.3, max: 0.3, size: 2.6, color: "#7ce7ff", kind: "spark", add: true });
          }
        }
        if (e.rage) e.rage = Math.max(0, e.rage - dt);
        if (e.plating) e.plating = Math.max(0, e.plating - dt);
        if (e.pulled > 0) {
          // Singularity: drag the enemy sideways toward the rift anchor
          e.pulled -= dt;
          const rift = g.zones.find((z) => z.kind === "rift");
          if (rift) {
            const ep = enemyPos(e);
            const dx = rift.x - ep.x;
            const dy = rift.y - ep.y;
            const dist = Math.max(1, Math.hypot(dx, dy));
            const pull = Math.min(dist, 300 * dt);
            e.ox += (dx / dist) * pull;
            e.oy += (dy / dist) * pull;
            if (Math.random() < dt * 8) {
              const sp2 = enemyPos(e);
              pushPart({ x: sp2.x, y: sp2.y, vx: (dx / dist) * 120, vy: (dy / dist) * 120, life: 0.3, max: 0.3, size: 3, color: "#ff4fd8", kind: "glow", add: true });
            }
          }
          if (e.pulled <= 0) e.pulled = 0;
        } else if (e.ox !== 0 || e.oy !== 0) {
          // ease back onto the lane once the pull ends
          const k = Math.max(0, 1 - dt * 3);
          e.ox *= k;
          e.oy *= k;
          if (Math.abs(e.ox) < 0.4 && Math.abs(e.oy) < 0.4) {
            e.ox = 0;
            e.oy = 0;
          }
        }
        // ---------- ground zones (lava / frost / rift) ----------
        if (g.zones.length) {
          const zp = enemyPos(e);
          for (const z of g.zones) {
            if (Math.hypot(zp.x - z.x, zp.y - z.y) > z.r) continue;
            if (z.dps > 0) {
              e.hp -= z.dps * dt;
              if (z.kind === "lava" && Math.random() < dt * 4) embers(zp.x, zp.y, "#ffd23f", 1);
            }
            if (z.slow > 0) {
              e.slow = Math.max(e.slow, z.slow);
              e.slowT = Math.max(e.slowT, 0.3);
            }
          }
          if (e.hp <= 0 && !e.dead) killReward(e);
          if (e.dead) continue;
        }
        if (e.burnT > 0) {
          e.burnT -= dt;
          e.hp -= e.burnDps * dt;
          if (Math.random() < dt * 6) {
            const bp = enemyPos(e);
            if (g.parts.length < 380)
              g.parts.push({ x: bp.x, y: bp.y, vx: (Math.random() - 0.5) * 30, vy: -30 - Math.random() * 30, life: 0.4, max: 0.4, size: 3, color: "#ff7a3d", kind: "spark" });
          }
          if (e.hp <= 0 && !e.dead) killReward(e);
        }
        if (e.dead) continue;
        // Cinder Wraiths are weightless: chill and slow slide right off them
        if (e.type === WRAITH_TYPE) {
          e.slow = 0;
          e.slowT = 0;
        }
        const slowMul = e.slowT > 0 ? 1 - e.slow : 1;
        const rageMul = (e.rage || 0) > 0 ? 1 + BOSS_WARCRY_HASTE : 1;
        if (e.frozen > 0) e.frozen -= dt;
        else if (e.stun > 0) e.stun -= dt;
        else e.d += e.speed * slowMul * rageMul * dt;
        if (e.d >= PATH_LEN - 2) {
          e.dead = true;
          g.lives -= e.lives;
          g.redFlash = 1;
          g.shake = fxShake(8);
          sfx.leak();
        }
      }
      // Bolt from the Blue: resolve the thin bolts queued by this frame's hits
      if (boltQueue.length) {
        const pending = boltQueue.splice(0, 10);
        const power = heroPower(g.heroLv);
        for (const e of pending) {
          if (e.dead) continue;
          const p = enemyPos(e);
          const now3 = performance.now();
          if (g.strikes.length < 26) g.strikes.push({ x: p.x, y: p.y, life: 0.26, max: 0.26, width: 3, color: "#c9f7ff", seed: Math.random() * 90, forks: 1, top: -200 });
          if (g.bolts.length < 44) g.bolts.push(randBolt(p.x, p.y - 120, p.x, p.y, "#c9f7ff", 1.4, 0.16, now3));
          shock(p.x, p.y, "#7ce7ff", 18, 0.3);
          addText(p.x, p.y - 34, "BOLT", "#c9f7ff", 12, true);
          inductionStrike(e);
          dealDamage(e, (30 + 9 * g.round) * power, { lightning: true, color: "#c9f7ff", noCrit: true });
        }
      }

      // zones age out; the rift collapses with the Singularity timeline
      if (g.zones.length) {
        for (const z of g.zones) z.life -= dt;
        g.zones = g.zones.filter((z) => z.life > 0);
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
      const plantNetwork = powerPlantNetworkScale(plantCount);
      for (const target of g.towers) target.plantGlow = 0;
      for (const t of g.towers) {
        if (!t.cell || !t.def.aura) continue;
        const upg = t.menuLv - 1;
        const asc = t.bLv - 1;
        let bonus = (t.def.aspd || 0) + (t.def.upAspd || 0) * upg + (t.def.ascAspd || 0) * asc;
        bonus *= 1 + 0.5 * t.points;
        let atk = ((t.def.atkAura || 0) + (t.def.upAtkAura || 0) * upg + (t.def.ascAtkAura || 0) * asc) * (1 + 0.5 * t.points);
        // Power Plants feed both damage and attack speed through the network
        // tier. Other aura towers retain their own stat mix.
        if (t.def.id === "plant") {
          bonus *= plantNetwork;
          atk *= plantNetwork;
        }
        // War Anthem / Overclock / Bulwark Field: the aura's own awakenings
        const aw = auraAwk(t);
        bonus *= aw;
        const atkAw = atk * aw;
        const isPlant = t.def.id === "plant";
        for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
          if (dc === 0 && dr === 0) continue;
          if (!isPlant && Math.abs(dc) + Math.abs(dr) !== 1) continue;
          const c = t.cell.c + dc;
          const r = t.cell.r + dr;
          const nb = g.towers.find((x) => x.cell && x.cell.c === c && x.cell.r === r);
          if (nb && nb.def.target === "front") {
            aspdA.set(nb.uid, (aspdA.get(nb.uid) || 0) + bonus);
            atkA.set(nb.uid, (atkA.get(nb.uid) || 0) + atkAw);
            if (isPlant) nb.plantGlow = Math.max(nb.plantGlow || 0, plantNetwork);
          }
        }
      }
      for (const t of g.towers) t.atkMul = 1 + (atkA.get(t.uid) || 0);

      // pulse towers (Aegis Core) blast everything standing near them
      for (const t of g.towers) {
        if (!t.cell || !t.def.pulse) continue;
        t.rapidCool -= dt;
        if (t.rapidCool > 0) continue;
        t.rapidCool = t.def.pulseRate || 2.5;
        const pdmg = ((t.def.pulse || 0) + (t.def.upPulse || 0) * (t.menuLv - 1)) * Math.pow(ASC_DMG_MUL, Math.max(0, t.bLv - 1)) * (1 + POINT_DMG_STEP * t.points);
        const pp = cellCenter(t.cell.c, t.cell.r);
        const qc = rollAwk(t, 1); // Retribution / Collapse
        const radius = t.def.pulseRadius || 150;
        const upg2 = t.menuLv - 1;
        // Gravity Well & Maelstrom drag the horde back down the lane
        const drag = t.def.pull ? (t.def.pull + (t.def.upPull || 0) * upg2) * dt : 0;
        const slowAmt = t.def.slow
          ? Math.min(0.85, (t.def.slow || 0) + (t.def.upSlow || 0) * upg2 + (t.def.ascSlow || 0) * (t.bLv - 1))
          : 0;
        const shotFx = awkSpec(t, 0);
        const shotTier = rollAwk(t, 0);
        const pulseSlow = shotFx?.fx === "slow" && shotTier > 0 ? Math.min(0.9, slowAmt + shotFx.mult[shotTier - 1]) : slowAmt;
        const pulseBurn = shotFx?.fx === "burn" && shotTier > 0 ? (pdmg * shotFx.mult[shotTier - 1]) / 4 : 0;
        let hits = 0;
        for (const e of g.enemies) {
          if (e.dead) continue;
          const ep = enemyPos(e);
          if (Math.hypot(ep.x - pp.x, ep.y - pp.y) > radius) continue;
          hits++;
          if (pdmg > 0) dealDamage(e, pdmg, { tw: t, color: "#9fe8ff" });
          if (!e.dead) {
            if (drag) e.d = Math.max(0, e.d - drag);
            if (pulseSlow) {
              e.slow = Math.max(e.slow, pulseSlow);
              e.slowT = Math.max(e.slowT, t.def.slowDur || 2);
            }
            if (pulseBurn) {
              e.burnDps = Math.max(e.burnDps, pulseBurn);
              e.burnT = Math.max(e.burnT, 3.5);
            }
            if (qc > 0) {
              e.stun = Math.max(e.stun, qc);
              ring(ep.x, ep.y, "#9fe8ff", 30);
            }
          }
        }
        if (hits) {
          shock(pp.x, pp.y, "#9fe8ff", radius, 0.5);
          glow(pp.x, pp.y, "#9fe8ff", 90, 0.4);
          punch(0.2, 0.15);
          if (drag) {
            // visible tug: a ring drawn inwards, one per caught enemy
            for (let i = 0; i < Math.min(4, hits); i++) {
              const a = (i / 4) * Math.PI * 2 + g.t;
              ring(pp.x + Math.cos(a) * radius * 0.8, pp.y + Math.sin(a) * radius * 0.5, "#b9a7ff", radius * 0.5);
            }
            sfx.hover();
          }
        }
      }

      // ---------- tower active skills (game/skills.ts) ----------
      // Each mythic tower auto-casts its skill on a cooldown while enemies are
      // on the field. The effects are the shared skill vocabulary: blast1/2/3,
      // blade2, bombard, blaze, chainring, teleport, deathmark, tornado, meteor.
      for (const t of g.towers) {
        if (!t.cell || !t.def.skill) continue;
        const sk = SKILLS[t.def.skill];
        if (!sk) continue;
        t.skillCd = (t.skillCd ?? sk.cd * 0.6) - dt;
        if (t.skillCd > 0) continue;
        if (!g.enemies.some((e) => !e.dead)) continue;
        t.skillCd = sk.cd;
        const p = cellCenter(t.cell.c, t.cell.r);
        const base = towerDamage(t.def, t.menuLv, t.bLv, t.points, t.atkMul) * globalMul(t) * killStackMul(t) * sk.mult;
        addText(p.x, p.y - 52, sk.name.toUpperCase(), sk.color, 14, true);
        glow(p.x, p.y, sk.color, 60, 0.4);
        const living = g.enemies.filter((e) => !e.dead);
        const front = [...living].sort((x, y) => y.d - x.d);
        const now2 = performance.now();
        switch (sk.fx) {
          case "blade2": {
            // spinning blades that skewer a file of enemies each
            for (let i = 0; i < sk.hits && i < front.length; i++) {
              const e = front[i];
              const ep = enemyPos(e);
              g.projs.push({
                x: p.x, y: p.y, tid: e.id, lx: ep.x, ly: ep.y, speed: 640, dmg: base,
                kind: "arrow", tw: t, pierce: 6, hitIds: [], dead: false, age: 0,
              } as Proj);
            }
            sfx.zap();
            break;
          }
          case "bombard": {
            // shells walking across the densest cluster
            for (let i = 0; i < sk.hits && i < front.length; i++) {
              const e = front[Math.floor(Math.random() * front.length)];
              const ep = enemyPos(e);
              g.meteors.push({ x: ep.x, y: ep.y, t: 0.5 + i * 0.12, total: 0.5 + i * 0.12, uid: t.uid, color: sk.color, dmg: base, blast: sk.radius, tw: t });
            }
            sfx.meteor();
            break;
          }
          case "blaze": {
            // a wall of fire across the front of the lane
            for (let i = 0; i < sk.hits; i++) {
              const d = Math.max(0, (front[0]?.d ?? 100) - i * 70);
              const gp = pathPos(d);
              const dur = 3.2;
              addZone({ kind: "lava", x: gp.x, y: gp.y, r: sk.radius * 0.55, life: dur, max: dur, dps: base / 2.2, slow: 0.15, color: sk.color });
            }
            sfx.explosion();
            break;
          }
          case "blast3": {
            // one colossal detonation on the lead enemy
            const e = front[0];
            if (e) {
              const ep = enemyPos(e);
              g.projs.push({
                x: p.x, y: p.y, tid: e.id, lx: ep.x, ly: ep.y, speed: 380, dmg: base / 1.6,
                kind: "cannon", tw: t, fireball: 1.6, blast: sk.radius, dead: false, age: 0,
              } as Proj);
            }
            flash(sk.color, 0.12);
            g.shake = fxShake(6);
            sfx.blast3();
            break;
          }
          case "chainring": {
            // lightning arcing between enemies in a ring
            const targets = front.slice(0, sk.hits);
            let from = p;
            targets.forEach((e) => {
              const ep = enemyPos(e);
              if (g.bolts.length < 44) g.bolts.push(randBolt(from.x, from.y, ep.x, ep.y, sk.color, 2.4, 0.24, now2));
              dealDamage(e, base, { tw: t, color: sk.color });
              from = ep;
            });
            if (targets.length) {
              shock(p.x, p.y, sk.color, sk.radius, 0.5);
              sfx.superbolt();
            }
            break;
          }
          case "teleport": {
            // a shard blinking through every target at once
            front.slice(0, sk.hits).forEach((e) => {
              const ep = enemyPos(e);
              // all shards land together - no 50ms trickle of damage
              if (!e.dead) dealDamage(e, base, { tw: t, color: sk.color });
              stars(ep.x, ep.y, sk.color, 6, 60);
              if (g.bolts.length < 44) g.bolts.push(randBolt(p.x, p.y, ep.x, ep.y, sk.color, 2, 0.18, now2));
            });
            sfx.zap();
            break;
          }
          case "deathmark": {
            // mark the strongest enemy; the swing reaps it if it is wounded
            const e = front[0];
            if (e) {
              const ep = enemyPos(e);
              e.mark = Math.max(e.mark, 3);
              ring(ep.x, ep.y, sk.color, 60);
              addText(ep.x, ep.y - 44, "DEATH MARK", sk.color, 13, true);
              dealDamage(e, base, { tw: t, color: sk.color });
              if (!e.dead && e.hp / e.max <= 0.35) {
                addText(ep.x, ep.y - 60, "REAPED", sk.color, 16, true);
                shock(ep.x, ep.y, sk.color, 90, 0.55);
                dealDamage(e, e.hp + 1, { alwaysCrit: true, tw: t, color: sk.color });
              }
              sfx.superbolt();
            }
            break;
          }
          case "tornado": {
            // a storm walking the lane: damage + drag everything back
            const anchor = front[0];
            const d0 = anchor ? anchor.d : 60;
            for (const e of living) {
              const ep = enemyPos(e);
              const gp = pathPos(d0);
              if (Math.hypot(ep.x - gp.x, ep.y - gp.y) > sk.radius * 1.6 && Math.abs(e.d - d0) > 120) continue;
              dealDamage(e, base, { tw: t, color: sk.color });
              e.d = Math.max(0, e.d - 42);
              e.slow = Math.max(e.slow, 0.5);
              e.slowT = Math.max(e.slowT, 2);
              const ep2 = enemyPos(e);
              ring(ep2.x, ep2.y, sk.color, 26);
            }
            shock(p.x, p.y, sk.color, sk.radius, 0.6);
            sfx.meteor();
            break;
          }
          case "meteor": {
            for (let i = 0; i < sk.hits; i++) {
              const e = front[Math.floor(Math.random() * front.length)];
              if (!e) break;
              const ep = enemyPos(e);
              g.meteors.push({ x: ep.x, y: ep.y, t: 0.55 + i * 0.14, total: 0.55 + i * 0.14, uid: t.uid, color: sk.color, dmg: base, blast: sk.radius, tw: t });
            }
            sfx.meteor();
            break;
          }
          case "blast1": {
            // venom pools under the front enemies
            front.slice(0, sk.hits).forEach((e) => {
              const ep = enemyPos(e);
              const dur = 3;
              addZone({ kind: "lava", x: ep.x, y: ep.y, r: sk.radius * 0.5, life: dur, max: dur, dps: base / 2.5, slow: 0.35, color: sk.color });
            });
            sfx.blast1();
            break;
          }
          case "blast2":
          case "starburst":
          case "boomerang":
          case "armorbreak": {
            // generic area detonation / burst / debuff family
            for (const e of front.slice(0, sk.hits)) {
              const ep = enemyPos(e);
              dealDamage(e, base, { tw: t, color: sk.color });
              ring(ep.x, ep.y, sk.color, 34);
              if (sk.fx === "armorbreak") e.armor = Math.max(0, e.armor - 0.08);
            }
            shock(p.x, p.y, sk.color, sk.radius, 0.5);
            sfx.blast2();
            break;
          }
          default:
            break;
        }
      }

      // chrono time fields: chill everything inside the aura
      for (const t of g.towers) {
        if (!t.cell || t.def.id !== "chrono" || !t.def.slowAura) continue;
        const cp = cellCenter(t.cell.c, t.cell.r);
        const strength = Math.min(0.8, (t.def.slow || 0) + (t.def.upSlow || 0) * (t.menuLv - 1) + (t.def.ascSlow || 0) * (t.bLv - 1) + 0.02 * t.points);
        for (const e of g.enemies) {
          if (e.dead) continue;
          const ep = enemyPos(e);
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
        if (t.def.id === "demon") {
          // Execution lightning ignores ATK, ATK speed, auras and run buffs. Two
          // things come from the tower itself: the strike count equals its points
          // (one volley strike per point), and the cooldown shortens by the same
          // per-point buff that tower attack speed uses (POINT_STEP).
          t.cd -= dt;
          if (t.cd <= 0) {
            const volley = Math.max(1, Math.min(MAX_POINTS, t.points));
            t.cd = (t.def.execCd || 3) / (1 + POINT_STEP * t.points);
            for (let k = 0; k < volley; k++) {
              if (k === 0) demonStrike(t, 0);
              else schedule(k * 0.14, () => demonStrike(t, k));
            }
          }
          continue;
        }
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
        rate /= 1 + aspdSelf + (aspdA.get(t.uid) || 0) + t.superBuff;
        rate /= 1 + POINT_STEP * t.points;
        rate /= 1 + g.bonusAspd; // run-shop attack speed
        if (g.odT > 0) rate /= 1 + OVERDRIVE_ASPD; // Overdrive hero buff
        if (t.def.rapid && t.rapidT > 0) rate *= 0.32;
        if (t.hasteT > 0) rate /= 1 + t.hasteMul; // Super Clone surge
        t.hasteT = Math.max(0, t.hasteT - dt);
        // Heavenly God blessing: +300% attack speed while it lasts
        if (t.surgeT > 0) rate /= 1 + t.surgeMul;
        t.surgeT = Math.max(0, t.surgeT - dt);
        // Honor Emperor: every honor taken is a permanent +15% attack speed
        rate /= 1 + t.honorMul;
        // ---------- boss hexes ----------
        t.hexT = Math.max(0, t.hexT - dt);
        t.downT = Math.max(0, t.downT - dt);
        if (t.hexT > 0) {
          rate *= 1 + BOSS_NULL_SLOW; // Null Field
          if (Math.random() < dt * 3) {
            pushPart({ x: p.x + (Math.random() - 0.5) * 54, y: p.y + (Math.random() - 0.5) * 54, vx: (Math.random() - 0.5) * 30, vy: -40, life: 0.4, max: 0.4, size: 3, color: "#b06bff", kind: "spark", add: true });
          }
        }
        if (t.downT > 0) rate = 999; // Meteor Fall: offline until it reboots
        t.cd -= dt;
        if (t.cd <= 0) {
          let target: Enemy | undefined;
          if (t.def.target === "all") {
            target = g.enemies.find((e) => !e.dead);
          } else {
            // ENERGY TARGETING: the grid feeds every tower, so distance never
            // matters — a tower simply shoots the enemy furthest down the lane.
            let best = -1;
            for (const e of g.enemies) {
              if (e.dead) continue;
              if (e.d > best) {
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

      // ---------- boss meteors: telegraphed rocks that take towers offline ----------
      if (g.meteors.length) {
        for (const m of g.meteors) {
          m.t -= dt;
          // asteroids shed embers while they fall, so the descent reads as a burning rock
          if (m.asteroid && m.t > 0) {
            m.emitT = (m.emitT ?? 0) - dt;
            if (m.emitT <= 0) {
              m.emitT = 0.04;
              const kk = 1 - Math.max(0, m.t) / m.total;
              embers(m.x + (1 - kk) * 120, m.y - (1 - kk) * 300, kk > 0.6 ? "#ffd08a" : "#ff7a24", 2);
            }
          }
          if (m.t <= 0 && !m.done) {
            m.done = true;
            if (m.dmg !== undefined) {
              // Starfall: a friendly rock, so it craters the horde instead
              const blast = m.blast || 110;
              if (m.asteroid) {
                g.shake = fxShake(28); flash("#ff7a24", 0.32);
                const direct = g.enemies.find((e) => e.id === m.directId && !e.dead);
                if (direct) dealDamage(direct, direct.max * 100, { tw: m.tw, color: "#ff7a24", noCrit: true });
                const from = { x: m.x + 200, y: -120 };
                if (g.bolts.length < 32) g.bolts.push(randBolt(from.x, from.y, m.x, m.y, "#ff7a24", 8, 0.5, performance.now()));
                // segmented lightning: a charged sky channel forks down onto the crater,
                // with a second jagged arc splitting off it
                const sky = performance.now();
                if (g.strikes.length < 24) g.strikes.push({ x: m.x, y: m.y, life: 0.6, max: 0.6, width: 22, color: "#ff7a24", core: "#fff1d0", seed: Math.random() * 100, forks: 6, top: -H, jag: 1, jit: 1.4 });
                if (g.strikes.length < 24) g.strikes.push({ x: m.x, y: m.y, life: 0.4, max: 0.4, width: 8, color: "#ffd08a", core: "#ffffff", seed: Math.random() * 100, forks: 4, top: -H * 0.5, jag: 1, jit: 1.4 });
                if (g.bolts.length < 40) g.bolts.push(randBolt(m.x - 70, -60, m.x, m.y, "#ff7a24", 4, 0.42, sky, { jag: 1, jit: 1.4 }));
                if (g.bolts.length < 40) g.bolts.push(randBolt(m.x, m.y, m.x + 90, m.y - 60, "#ffb36b", 2.2, 0.3, sky, { jag: 1, jit: 1.4 }));
                // aftershock ring a beat later, and lightning that chains from the crater
                schedule(0.14, () => {
                  shock(m.x, m.y, "#ffb36b", blast * 0.7, 0.42);
                  ring(m.x, m.y, "#ff7a24", blast * 0.9);
                });
                const near = g.enemies
                  .filter((e) => !e.dead && e.id !== m.directId)
                  .map((e) => ({ e, p: enemyPos(e) }))
                  .filter(({ p }) => Math.hypot(p.x - m.x, p.y - m.y) <= blast * 1.5)
                  .slice(0, 3);
                const chainDmg = (m.dmg ?? 0) * 0.35;
                near.forEach(({ e, p }, i) => {
                  if (g.bolts.length < 44) g.bolts.push(randBolt(m.x, m.y, p.x, p.y, i % 2 ? "#ffd08a" : "#ff7a24", 3.2, 0.4, sky + i * 40, { jag: 1, jit: 1.2 }));
                  schedule(0.08 + i * 0.05, () => dealDamage(e, chainDmg, { tw: m.tw, color: "#ffb36b" }));
                });
              }
              shock(m.x, m.y, m.asteroid ? "#ff7a24" : "#ffd23f", blast, 0.55);
              burst(m.x, m.y, "#ffb324", 20, 260);
              shards(m.x, m.y, "#ffd23f", 10, 240);
              embers(m.x, m.y, "#ffd23f", 10);
              addZone({ kind: "rift", x: m.x, y: m.y, r: blast, life: 0.3, max: 0.3, dps: 0, slow: 0, color: "#ffd23f" });
              for (const e of g.enemies) {
                if (e.dead) continue;
                const ep = enemyPos(e);
                if (Math.hypot(ep.x - m.x, ep.y - m.y) <= blast) dealDamage(e, m.dmg, { tw: m.tw, color: "#ffd23f" });
              }
              punch(0.3, 0.2);
              g.shake = fxShake(5);
            } else {
              const tw2 = g.towers.find((t) => t.uid === m.uid);
              if (tw2 && g.bossImmunityT <= 0) {
                tw2.downT = Math.max(tw2.downT, BOSS_METEOR_DOWN);
                tw2.flash = 0.3;
              }
              shock(m.x, m.y, "#ff7a3d", 96, 0.6);
              burst(m.x, m.y, "#ffb324", 22, 280);
              shards(m.x, m.y, "#ff7a3d", 12, 260);
              embers(m.x, m.y, "#ffd23f", 10);
              flash("#ff7a3d", 0.14);
              punch(0.35, 0.25);
              g.shake = fxShake(6);
            }
            sfx.explosion();
          }
        }
        g.meteors = g.meteors.filter((m) => !m.done);
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
    };

    // ---------- draw ----------

    /**
     * Spawn and exit gates. Each is a sunken well of light with a stone
     * surround, counter-rotating rune rings, a swirling vortex throat and
     * energy motes being sucked in (exit) or flung out (spawn).
     */
    const drawPortal = (x: number, y: number, color: string, label: string) => {
      const t = performance.now() / 1000;
      const out = label === "SPAWN"; // spawn throws energy out, exit drinks it in
      ctx.save();
      ctx.translate(x, y);

      // stone surround with notched buttresses
      ctx.fillStyle = "#0a0722";
      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2e2470";
      ctx.lineWidth = 5;
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t * 0.15;
        ctx.save();
        ctx.rotate(a);
        ctx.fillStyle = "#241b5c";
        ctx.fillRect(-4, -36, 8, 10);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 2 + i));
        ctx.fillRect(-2, -34, 4, 6);
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      // the throat: a dark well with a glowing heart
      const well = ctx.createRadialGradient(0, 0, 2, 0, 0, 28);
      well.addColorStop(0, "#ffffff");
      well.addColorStop(0.2, color);
      well.addColorStop(0.65, color + "55");
      well.addColorStop(1, "#05030f");
      ctx.fillStyle = well;
      ctx.beginPath();
      ctx.arc(0, 0, 27, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "lighter";
      // swirling vortex arms
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      for (let a = 0; a < 4; a++) {
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        for (let k = 0; k <= 18; k++) {
          const f = k / 18;
          const ang = (out ? 1 : -1) * t * 2.6 + (a / 4) * Math.PI * 2 + f * 2.8;
          const rr = 26 * (1 - f * 0.9);
          const px = Math.cos(ang) * rr;
          const py = Math.sin(ang) * rr;
          k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      // counter-rotating rune rings
      ctx.lineWidth = 3.5;
      ctx.globalAlpha = 0.95;
      ctx.save();
      ctx.rotate(t * 1.6);
      ctx.beginPath();
      ctx.arc(0, 0, 22 + Math.sin(t * 5) * 3, 0.4, 2.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 22 + Math.sin(t * 5) * 3, 3.6, 5.6);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.rotate(-t * 2.3);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 2.9, 4.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 15, 6.0, 7.9);
      ctx.stroke();
      ctx.restore();
      // motes streaming in or out
      for (let i = 0; i < 9; i++) {
        const f = ((t * (out ? 0.8 : -0.8) + i / 9) % 1 + 1) % 1;
        const rr = out ? 6 + f * 34 : 40 - f * 34;
        const ang = i * 2.1 + t * 1.2;
        ctx.globalAlpha = (out ? 1 - f : f) * 0.85;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * rr, Math.sin(ang) * rr, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.globalAlpha = 0.85;
      ctx.font = `800 11px ${canvasUiFont}`;
      ctx.textAlign = "center";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      const ly = y + (y < OY ? -40 : 50);
      ctx.strokeText(label, x, ly);
      ctx.fillStyle = color;
      ctx.fillText(label, x, ly);
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
        const rr = (t.def.id === "plant" ? 72 : 60) + Math.sin(now / (t.def.id === "plant" ? 210 : 300)) * 4;
        ctx.globalAlpha *= 0.9;
        ctx.fillStyle = t.def.id === "plant" ? "rgba(61,255,142,0.10)" : "rgba(53,224,255,0.10)";
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = t.def.id === "plant" ? "#3dff8e" : "#35e0ff";
        ctx.lineWidth = 1.5;
        const auraArcs = t.def.id === "plant" ? 6 : 4;
        for (let i = 0; i < auraArcs; i++) {
          const a = now / (t.def.id === "plant" ? 430 : 700) + (i * Math.PI * 2) / auraArcs;
          ctx.beginPath();
          ctx.arc(x, y, rr, a, a + (t.def.id === "plant" ? 0.54 : 0.9));
          ctx.stroke();
        }
        if (ghost) ctx.globalAlpha = 0.65;
      }
      if (!ghost && (t.plantGlow || 0) > 0) {
        const intensity = Math.min(1, 0.4 + (t.plantGlow! - 1) * 0.28);
        const phase = now / 145;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = intensity;
        ctx.strokeStyle = "#8effc4";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(x, y, 38 + Math.sin(phase) * 2, phase * 0.7, phase * 0.7 + 4.6);
        ctx.stroke();
        // little live arcs orbit buffed towers so the plant's benefit reads on
        // the board even before the player inspects their stat panel
        for (let i = 0; i < 3; i++) {
          const a = phase + (i * Math.PI * 2) / 3;
          const sx = x + Math.cos(a) * 36;
          const sy = y + Math.sin(a) * 36;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + Math.cos(a + 0.7) * 7, sy + Math.sin(a + 0.7) * 7);
          ctx.lineTo(sx + Math.cos(a - 0.5) * 12, sy + Math.sin(a - 0.5) * 12);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (!ghost && t.superBuff > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.75, 0.18 + t.superBuff * 0.25);
        ctx.strokeStyle = "#ff315c";
        ctx.lineWidth = 2 + Math.min(2, t.superBuff);
        ctx.beginPath();
        ctx.arc(x, y, 34 + Math.sin(now / 130 + t.uid) * 2, now / 350, now / 350 + 4.8);
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.translate(x, y);
      const rec = t.flash > 0 ? t.flash * 30 : 0;
      const a = t.angle;
      const acc = t.def.accent || rc.color;
      // a hexed tower sparks purple, an offline one is dark and smoking
      if (t.hexT > 0 || t.downT > 0) {
        const hex = t.hexT > 0;
        const col = hex ? "#b06bff" : "#ff7a3d";
        ctx.save();
        ctx.globalAlpha = 0.35 + Math.sin(now / 90 + t.uid) * 0.15;
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 44, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const a0 = now / 220 + (i * Math.PI * 2) / 3;
          ctx.beginPath();
          ctx.arc(x, y, 38, a0, a0 + 0.7);
          ctx.stroke();
        }
        if (!hex) {
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = "#3a1206";
          ctx.beginPath();
          ctx.arc(x, y, 20, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = col;
          ctx.font = `bold 20px ${canvasUiFont}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("✕", x, y + 1);
        }
        ctx.restore();
      }
      switch (towerArt(t.def)) {
        case "beam": {
          // a rail with a charging glow at the muzzle
          ctx.rotate(a);
          ctx.fillStyle = "#243447";
          ctx.fillRect(-10 - rec, -5, 34, 10);
          ctx.fillStyle = "#7ef0ff";
          ctx.fillRect(16 - rec, -3, 12, 6);
          ctx.beginPath();
          ctx.arc(30 - rec, 0, 5 + Math.sin(now / 200) * 1.2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "howitzer": {
          // a fat siege barrel on a heavy mount
          ctx.rotate(a);
          ctx.fillStyle = "#3a2c14";
          ctx.fillRect(-14 - rec, -12, 30, 24);
          ctx.fillStyle = "#8a6a1a";
          ctx.fillRect(-6 - rec, -8, 38, 16);
          ctx.fillStyle = "#ffb324";
          ctx.beginPath();
          ctx.arc(30 - rec, 0, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.rotate(-a);
          ctx.fillStyle = "#241a08";
          ctx.beginPath();
          ctx.arc(0, 0, 13, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "flame": {
          // a nozzle with a live flame licking off the tip
          const fl = Math.sin(now / 110) * 3;
          ctx.rotate(a);
          ctx.fillStyle = "#4a2410";
          ctx.fillRect(-12, -8, 28, 16);
          ctx.fillStyle = "#ff7a3d";
          ctx.beginPath();
          ctx.moveTo(16, -6);
          ctx.quadraticCurveTo(32, -8 - fl, 36, 0);
          ctx.quadraticCurveTo(32, 8 + fl, 16, 6);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#ffd23f";
          ctx.beginPath();
          ctx.moveTo(18, -3);
          ctx.quadraticCurveTo(30, -4 - fl, 32, 0);
          ctx.quadraticCurveTo(30, 4 + fl, 18, 3);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case "gate": {
          // a standing portal with a burning core
          const th = 0.6 + 0.4 * Math.sin(now / 320);
          ctx.fillStyle = "#2a1212";
          ctx.strokeStyle = "#ff4d1f";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(-16, -18, 32, 38, 12);
          ctx.fill();
          ctx.stroke();
          const gr = ctx.createRadialGradient(0, 2, 2, 0, 2, 14);
          gr.addColorStop(0, `rgba(255,120,60,${th})`);
          gr.addColorStop(1, "rgba(255,60,20,0)");
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.arc(0, 2, 14, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "ion": {
          // a coil with an orbiting spark
          const oa = now / 420;
          ctx.strokeStyle = "#c9a7ff";
          ctx.lineWidth = 3;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, 8 + i * 5, 0.3 + i, 2.6 + i);
            ctx.stroke();
          }
          ctx.fillStyle = "#e6d9ff";
          ctx.beginPath();
          ctx.arc(Math.cos(oa) * 17, Math.sin(oa) * 17, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#c9a7ff";
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "aether": {
          // a floating prism with three satellite shards
          ctx.fillStyle = "#123a4a";
          ctx.strokeStyle = "#8fe9ff";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(0, -16);
          ctx.lineTo(13, 10);
          ctx.lineTo(-13, 10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          for (let i = 0; i < 3; i++) {
            const oa = now / 700 + (i / 3) * Math.PI * 2;
            ctx.fillStyle = "#8fe9ff";
            ctx.fillRect(Math.cos(oa) * 21 - 3, Math.sin(oa) * 14 - 3, 6, 6);
          }
          break;
        }
        case "scythe": {
          // a crescent blade sweeping
          const sw = Math.sin(now / 500) * 0.25;
          ctx.rotate(a + sw);
          ctx.fillStyle = "#2a1a4a";
          ctx.fillRect(-4, -4, 26, 8);
          ctx.fillStyle = "#b18cff";
          ctx.beginPath();
          ctx.arc(12, 0, 18, -1.15, 1.15);
          ctx.arc(12, 0, 9, 1.15, -1.15, true);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case "sling": {
          // a winding sling flinging sand
          const sp = now / 260;
          ctx.strokeStyle = "#c9b57e";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-8, 10);
          ctx.quadraticCurveTo(-2, -6, Math.cos(sp) * 12, Math.sin(sp) * 10 - 8);
          ctx.stroke();
          ctx.fillStyle = "#e8d9a0";
          ctx.beginPath();
          ctx.arc(Math.cos(sp) * 12, Math.sin(sp) * 10 - 8, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#8a7746";
          ctx.fillRect(-14, 6, 28, 8);
          break;
        }
        case "spire": {
          // a jagged bloodstone spire with a floating gem
          const fl = Math.sin(now / 380) * 2;
          ctx.fillStyle = "#3a1420";
          ctx.strokeStyle = "#ff5566";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -22);
          ctx.lineTo(11, -2);
          ctx.lineTo(7, 16);
          ctx.lineTo(-7, 16);
          ctx.lineTo(-11, -2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#ff5566";
          ctx.beginPath();
          ctx.moveTo(0, -14 + fl);
          ctx.lineTo(5, -6 + fl);
          ctx.lineTo(0, 2 + fl);
          ctx.lineTo(-5, -6 + fl);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case "venom": {
          // a bulb with venom dripping off it
          const bl = Math.sin(now / 300) * 2;
          ctx.fillStyle = "#123a24";
          ctx.strokeStyle = "#8effc4";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(0, -4, 12, 14 + bl, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#8effc4";
          for (let i = 0; i < 3; i++) {
            const dd = ((now / 240 + i * 1.3) % 3) / 3;
            ctx.beginPath();
            ctx.arc(-8 + i * 8, 8 + dd * 12, 3 * (1 - dd * 0.4), 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
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
        case "prism": {
          // Prism Array: a faceted crystal that spins and throws split beams
          ctx.save();
          ctx.rotate(now / 1400);
          ctx.fillStyle = "rgba(143,240,255,0.22)";
          ctx.strokeStyle = rc.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -30);
          ctx.lineTo(24, 12);
          ctx.lineTo(-24, 12);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, -30);
          ctx.lineTo(0, 12);
          ctx.moveTo(-12, -9);
          ctx.lineTo(12, -9);
          ctx.stroke();
          ctx.restore();
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const pg = ctx.createRadialGradient(0, -12, 1, 0, -12, 16);
          pg.addColorStop(0, "#ffffff");
          pg.addColorStop(1, "transparent");
          ctx.fillStyle = pg;
          ctx.beginPath();
          ctx.arc(0, -12, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }
        case "aegis": {
          // Aegis Core: a drifting shield generator with a rotating barrier
          const bob2 = Math.sin(now / 700) * 3;
          ctx.save();
          ctx.translate(0, bob2);
          ctx.fillStyle = "#10243d";
          ctx.strokeStyle = rc.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, -22);
          ctx.lineTo(20, -14);
          ctx.lineTo(20, 6);
          ctx.quadraticCurveTo(20, 20, 0, 30);
          ctx.quadraticCurveTo(-20, 20, -20, 6);
          ctx.lineTo(-20, -14);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = rc.color;
          ctx.beginPath();
          ctx.arc(0, 2, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          // the field itself: two dashed arcs counter-rotating
          ctx.save();
          ctx.globalAlpha = 0.55;
          ctx.strokeStyle = "#9fe8ff";
          ctx.lineWidth = 2;
          ctx.setLineDash([7, 7]);
          ctx.rotate(now / 1200);
          ctx.beginPath();
          ctx.arc(0, 0, 38, 0, Math.PI * 2);
          ctx.stroke();
          ctx.rotate(-now / 500);
          ctx.beginPath();
          ctx.arc(0, 0, 44, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          break;
        }
        case "nova": {
          // a three-barrel shell launcher with a starburst core
          const spin = now / 1600;
          ctx.fillStyle = "#4a3418";
          ctx.strokeStyle = rc.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 20, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          for (let i = 0; i < 3; i++) {
            const a2 = spin + (i / 3) * Math.PI * 2;
            ctx.save();
            ctx.rotate(a2);
            ctx.fillStyle = "#8a6a1a";
            ctx.fillRect(10, -5, 20, 10);
            ctx.fillStyle = rc.color;
            ctx.fillRect(26, -5, 4, 10);
            ctx.restore();
          }
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const g1 = ctx.createRadialGradient(0, 0, 1, 0, 0, 18);
          g1.addColorStop(0, "#fff2b0");
          g1.addColorStop(1, "transparent");
          ctx.fillStyle = g1;
          ctx.beginPath();
          ctx.arc(0, 0, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }
        case "well": {
          // a black core with rings collapsing into it
          ctx.fillStyle = "#160c2e";
          ctx.strokeStyle = rc.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          for (let i = 0; i < 3; i++) {
            const k2 = ((now / 900 + i / 3) % 1);
            ctx.globalAlpha = 0.5 * (1 - k2);
            ctx.strokeStyle = "#b9a7ff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 20 + (1 - k2) * 26, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const g2 = ctx.createRadialGradient(0, 0, 1, 0, 0, 14);
          g2.addColorStop(0, "#e0d5ff");
          g2.addColorStop(1, "transparent");
          ctx.fillStyle = g2;
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }
        case "crown": {
          // a spiked crown ring with lightning arcing over it
          ctx.strokeStyle = rc.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, 17, 0, Math.PI * 2);
          ctx.stroke();
          for (let i = 0; i < 8; i++) {
            const a2 = (i / 8) * Math.PI * 2 + now / 2200;
            ctx.fillStyle = i % 2 ? "#fff6c4" : rc.color;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a2) * 17, Math.sin(a2) * 17);
            ctx.lineTo(Math.cos(a2 + 0.22) * 28, Math.sin(a2 + 0.22) * 28);
            ctx.lineTo(Math.cos(a2 - 0.22) * 28, Math.sin(a2 - 0.22) * 28);
            ctx.closePath();
            ctx.fill();
          }
          ctx.fillStyle = "#ffe86b";
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(-14, -10);
          ctx.lineTo(-4, -2);
          ctx.lineTo(-10, 6);
          ctx.stroke();
          break;
        }
        case "ripper": {
          // a lance with a burning tear hanging under it
          ctx.rotate(a);
          ctx.fillStyle = "#2a1a4a";
          ctx.strokeStyle = rc.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-14, -6, 40, 12, 4);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#c9a7ff";
          ctx.beginPath();
          ctx.moveTo(26, 0);
          ctx.lineTo(12, -10);
          ctx.lineTo(12, 10);
          ctx.closePath();
          ctx.fill();
          ctx.rotate(-a);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const g3 = ctx.createRadialGradient(0, 0, 1, 0, 0, 16);
          g3.addColorStop(0, "#e0d5ff");
          g3.addColorStop(1, "transparent");
          ctx.fillStyle = g3;
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }
        case "furnace": {
          // a brazier: a stone bowl with a fire burning inside and embers rising
          ctx.fillStyle = "#3a1d10";
          ctx.strokeStyle = rc.color;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(-16, -4);
          ctx.lineTo(16, -4);
          ctx.lineTo(11, 18);
          ctx.lineTo(-11, 18);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          const fl = Math.sin(now / 120) * 3;
          ctx.fillStyle = "#ff8c3d";
          ctx.beginPath();
          ctx.moveTo(-9, -6);
          ctx.quadraticCurveTo(-3, -24 - fl, 0, -34 - fl);
          ctx.quadraticCurveTo(3, -24 - fl, 9, -6);
          ctx.quadraticCurveTo(0, 2, -9, -6);
          ctx.fill();
          ctx.fillStyle = "#ffd23f";
          ctx.beginPath();
          ctx.moveTo(-4, -6);
          ctx.quadraticCurveTo(-1, -16, 0, -22 - fl);
          ctx.quadraticCurveTo(1, -16, 4, -6);
          ctx.fill();
          for (let i = 0; i < 3; i++) {
            const t2 = (now / 700 + i / 3) % 1;
            ctx.globalAlpha = 1 - t2;
            ctx.fillStyle = "#ffd23f";
            ctx.beginPath();
            ctx.arc(Math.sin((now / 300) + i * 2) * 10, -20 - t2 * 26, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          break;
        }
        case "whirl": {
          // spinning blades over a dark pool
          ctx.strokeStyle = rc.color;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(0, 0, 20, 0, Math.PI * 2);
          ctx.stroke();
          ctx.save();
          ctx.rotate(now / 260);
          for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.fillStyle = i % 2 ? "#7fe9ff" : "#c9f4ff";
            ctx.beginPath();
            ctx.moveTo(6, 0);
            ctx.quadraticCurveTo(18, -8, 24, -2);
            ctx.quadraticCurveTo(16, 4, 6, 3);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const g4 = ctx.createRadialGradient(0, 0, 1, 0, 0, 20);
          g4.addColorStop(0, "#dffaff");
          g4.addColorStop(1, "transparent");
          ctx.fillStyle = g4;
          ctx.beginPath();
          ctx.arc(0, 0, 20, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }
        case "star": {
          // a mortar with three falling-star flares orbiting it
          ctx.fillStyle = "#4a3a10";
          ctx.strokeStyle = rc.color;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.roundRect(-14, -8, 28, 24, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#2b2208";
          ctx.beginPath();
          ctx.ellipse(0, -8, 13, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          for (let i = 0; i < 3; i++) {
            const ao = now / 900 + (i / 3) * Math.PI * 2;
            const sx = Math.cos(ao) * 30;
            const sy = Math.sin(ao) * 14 - 18;
            ctx.fillStyle = "#fff2b0";
            ctx.beginPath();
            ctx.moveTo(sx, sy - 6);
            ctx.lineTo(sx + 4, sy);
            ctx.lineTo(sx, sy + 6);
            ctx.lineTo(sx - 4, sy);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 0.45;
            ctx.strokeStyle = "#ffd23f";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + 12, sy - 12);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
          break;
        }
        case "lock": {
          // a clock face with a cog ring, hand sweeping
          ctx.fillStyle = "#10243d";
          ctx.strokeStyle = rc.color;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          for (let i = 0; i < 12; i++) {
            const a2 = (i / 12) * Math.PI * 2;
            ctx.fillStyle = i % 3 === 0 ? "#fff" : rc.color;
            ctx.fillRect(Math.cos(a2) * 13 - 1.4, Math.sin(a2) * 13 - 1.4, 2.8, 2.8);
          }
          ctx.save();
          ctx.rotate(now / 700);
          ctx.strokeStyle = "#9fe8ff";
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -11);
          ctx.stroke();
          ctx.restore();
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(0, 0, 3, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "bloom": {
          // a flower of blades that opens and closes
          const open = 1 + Math.sin(now / 420) * 0.18;
          ctx.save();
          ctx.rotate(now / 2000);
          for (let i = 0; i < 6; i++) {
            ctx.rotate(Math.PI / 3);
            ctx.fillStyle = i % 2 ? "#8effc4" : "#c9ffdf";
            ctx.beginPath();
            ctx.ellipse(15 * open, 0, 11 * open, 5, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          ctx.fillStyle = "#0b3d24";
          ctx.strokeStyle = "#8effc4";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const g5 = ctx.createRadialGradient(0, 0, 1, 0, 0, 16);
          g5.addColorStop(0, "#d9ffe9");
          g5.addColorStop(1, "transparent");
          ctx.fillStyle = g5;
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }
        case "colossus": {
          // a huge twin-barrelled siege bunker; the barrels kick back on reload
          const kick = Math.max(0, t.cd) * 14;
          ctx.fillStyle = "#2a1220";
          ctx.strokeStyle = rc.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(-24, -16, 48, 34, 8);
          ctx.fill();
          ctx.stroke();
          ctx.save();
          ctx.rotate(a);
          [-8, 8].forEach((off) => {
            ctx.fillStyle = "#4a5568";
            ctx.fillRect(-6 - kick, off - 5, 34, 10);
            ctx.fillStyle = rc.color;
            ctx.fillRect(26 - kick, off - 5, 4, 10);
          });
          ctx.restore();
          ctx.fillStyle = "#ffcf4d";
          for (let i = 0; i < 3; i++) ctx.fillRect(-18 + i * 7, 12, 4, 4);
          break;
        }
        case "demon": {
          // a horned executioner's seal: a black altar with a red blade hanging
          // over it, breathing
          const breathe = 1 + Math.sin(now / 320) * 0.06;
          ctx.save();
          ctx.scale(breathe, breathe);
          ctx.fillStyle = "#1a0509";
          ctx.strokeStyle = "#ff2b3d";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(-22, -6, 44, 22, 7);
          ctx.fill();
          ctx.stroke();
          // horns
          ctx.beginPath();
          ctx.moveTo(-20, -6);
          ctx.quadraticCurveTo(-30, -22, -14, -24);
          ctx.moveTo(20, -6);
          ctx.quadraticCurveTo(30, -22, 14, -24);
          ctx.stroke();
          // the blade
          ctx.fillStyle = "#ff2b3d";
          ctx.beginPath();
          ctx.moveTo(0, -34);
          ctx.lineTo(7, -14);
          ctx.lineTo(0, -2);
          ctx.lineTo(-7, -14);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.fillRect(-1.2, -32, 2.4, 26);
          // three red runes along the altar face
          ctx.fillStyle = "#ff6b78";
          for (let i = 0; i < 3; i++) ctx.fillRect(-14 + i * 10, 6, 5, 5);
          ctx.restore();
          break;
        }
        case "heavenly": {
          // a hovering halo above a lightning barrel; the ring spins and the
          // muzzle crackles with the next laser
          const spin = now / 700;
          ctx.strokeStyle = "#ffe86b";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(0, -24, 20, 6, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.save();
          ctx.rotate(spin);
          ctx.globalAlpha = 0.85;
          for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, -30);
            ctx.lineTo(0, -40);
            ctx.stroke();
          }
          ctx.restore();
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#2b2410";
          ctx.strokeStyle = "#ffe86b";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(-20, -10, 40, 26, 6);
          ctx.fill();
          ctx.stroke();
          ctx.save();
          ctx.rotate(a);
          ctx.fillStyle = "#ffe86b";
          ctx.fillRect(8, -4, 20, 8);
          const charge = 4 + Math.abs(Math.sin(now / 160)) * 6;
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = "#fff6c4";
          ctx.beginPath();
          ctx.arc(30, 0, charge * 0.5 + 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }
        case "honor": {
          // a gilded throne crown: a heavy gold block with a crown that bobs
          const bob = Math.sin(now / 380) * 2;
          ctx.fillStyle = "#3a2a12";
          ctx.strokeStyle = "#ffd76a";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(-20, -2, 40, 20, 7);
          ctx.fill();
          ctx.stroke();
          ctx.save();
          ctx.translate(0, -10 + bob);
          ctx.fillStyle = "#ffd76a";
          ctx.beginPath();
          ctx.moveTo(-17, 4);
          ctx.lineTo(-17, -10);
          ctx.lineTo(-8, -2);
          ctx.lineTo(0, -14);
          ctx.lineTo(8, -2);
          ctx.lineTo(17, -10);
          ctx.lineTo(17, 4);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#8a5a00";
          ctx.lineWidth = 1.6;
          ctx.stroke();
          ctx.fillStyle = "#ff4fd8";
          ctx.beginPath();
          ctx.arc(0, -2, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          ctx.fillStyle = "#fff6c4";
          ctx.fillRect(-13, 7, 5, 5);
          ctx.fillRect(8, 7, 5, 5);
          break;
        }
        case "supervisor": {
          const pulse = 1 + Math.sin(now / 110) * 0.08;
          ctx.save();
          ctx.scale(pulse, pulse);
          ctx.fillStyle = "#260812";
          ctx.strokeStyle = "#ff315c";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, -28);
          ctx.lineTo(21, -18);
          ctx.lineTo(19, 7);
          ctx.quadraticCurveTo(12, 20, 0, 27);
          ctx.quadraticCurveTo(-12, 20, -19, 7);
          ctx.lineTo(-21, -18);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#ff315c";
          ctx.beginPath();
          ctx.moveTo(3, -21);
          ctx.lineTo(-11, 1);
          ctx.lineTo(-2, 1);
          ctx.lineTo(-5, 20);
          ctx.lineTo(12, -5);
          ctx.lineTo(3, -5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;
        }
        case "eclipse": {
          // a black moon inside a violet crown, with a crescent blade orbiting
          const spin = now / 900;
          const breathe = 1 + Math.sin(now / 380) * 0.05;
          ctx.save();
          ctx.scale(breathe, breathe);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const halo = ctx.createRadialGradient(0, -4, 2, 0, -4, 30);
          halo.addColorStop(0, "rgba(176,107,255,0.8)");
          halo.addColorStop(0.55, "rgba(106,45,255,0.28)");
          halo.addColorStop(1, "transparent");
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(0, -4, 30, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          // the void itself
          ctx.fillStyle = "#12032a";
          ctx.strokeStyle = "#b06bff";
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.arc(0, -4, 17, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // thin crescent
          ctx.strokeStyle = "#e6d6ff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, -4, 12, -0.6, 1.9);
          ctx.stroke();
          // orbiting shard
          const ox = Math.cos(spin) * 25;
          const oy = -4 + Math.sin(spin) * 9;
          ctx.fillStyle = "#d8c2ff";
          ctx.save();
          ctx.translate(ox, oy);
          ctx.rotate(spin * 2);
          ctx.beginPath();
          ctx.moveTo(0, -5);
          ctx.lineTo(4, 0);
          ctx.lineTo(0, 5);
          ctx.lineTo(-4, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          // pedestal eyes
          ctx.fillStyle = "#6a2dff";
          ctx.fillRect(-16, 12, 8, 4);
          ctx.fillRect(8, 12, 8, 4);
          ctx.restore();
          break;
        }
        case "seraph": {
          // a winged spear of starlight; the halo counter-rotates
          const hover = Math.sin(now / 420) * 2;
          ctx.save();
          ctx.translate(0, hover);
          // wings
          ctx.strokeStyle = "#8ff0ff";
          ctx.lineWidth = 2.2;
          for (const dir of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(dir * 6, -4);
            ctx.quadraticCurveTo(dir * 22, -18, dir * 30, -2);
            ctx.quadraticCurveTo(dir * 22, 2, dir * 8, 4);
            ctx.stroke();
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(dir * 10, -2);
            ctx.quadraticCurveTo(dir * 22, -9, dir * 25, 0);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
          // halo
          ctx.save();
          ctx.rotate(now / 700);
          ctx.strokeStyle = "#ffe9a8";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, -22, 15, 4.5, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          // spear
          ctx.fillStyle = "#123244";
          ctx.strokeStyle = "#c9fbff";
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.roundRect(-4, -6, 8, 26, 3);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.moveTo(0, -30);
          ctx.lineTo(6, -8);
          ctx.lineTo(0, -2);
          ctx.lineTo(-6, -8);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#8ff0ff";
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.arc(0, -10, 3.2 + Math.abs(Math.sin(now / 170)) * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }
        case "clone": {
          // two offset diamonds — the tower and the copy it keeps promising
          const wob = Math.sin(now / 400) * 2;
          const dia = (dx: number, fill: string, alpha: number) => {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = fill;
            ctx.beginPath();
            ctx.moveTo(dx, -16 + wob);
            ctx.lineTo(dx + 13, wob);
            ctx.lineTo(dx, 16 + wob);
            ctx.lineTo(dx - 13, wob);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          };
          dia(-7, "#2f6f52", 1);
          dia(7, "#8effc4", 0.92);
          ctx.strokeStyle = "#d9ffe9";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-22, -22);
          ctx.lineTo(-13, -22);
          ctx.moveTo(-22, -22);
          ctx.lineTo(-22, -13);
          ctx.moveTo(22, 22);
          ctx.lineTo(13, 22);
          ctx.moveTo(22, 22);
          ctx.lineTo(22, 13);
          ctx.stroke();
          break;
        }
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
      ctx.font = `700 ${isMax ? 12 : 14}px ${canvasUiFont}`;
      ctx.textAlign = "center";
      ctx.fillText(isMax ? "MAX" : String(t.points), 0, 5);
      ctx.restore();
      // battle level pips
      for (let i = 0; i < t.bLv; i++) {
        ctx.fillStyle = "#35e0ff";
        ctx.fillRect(x - 30 + i * 5, y - 40, 3, 3);
      }
      // tower name plates are dropped on big boards / low quality frames
      if (fxQ() >= 0.7 || g.towers.length <= 18) {
        ctx.font = `700 11px ${canvasUiFont}`;
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(234,230,255,0.85)";
        ctx.fillText(`${tr(t.def.name)} · Lv${t.bLv}`, x, y - 46);
      }
      ctx.globalAlpha = 1;
    };

    /**
     * Enemy renderer (reworked). Every type now has a hand-drawn body built
     * from layered shapes: a ground shadow, a walk/float cycle, directional
     * facing along the path, shading, limbs and per-type details (armour
     * plates, robes and staff, warlord axe, overlord rift crown).
     */
    /**
     * One linear gradient per (enemy type, body height) is enough: gradient
     * coordinates are resolved against the CTM when they are painted, so the
     * cached object stays valid across the per-enemy translate.
     */
    const drawEnemy = (e: Enemy, now: number) => {
      // glide between sim steps when frame interpolation is on — path distance
      // and the lateral singularity offset are interpolated independently
      const hermite = saveRef.current.interpolationMethod === "hermite" && saveRef.current.frameInterp && !saveRef.current.powerSaver;
      const dDraw = e.pd === undefined ? e.d : hermite ? hermiteLerp(e.ppd, e.pd, e.d, rawRenderAlpha) : e.pd + (e.d - e.pd) * renderAlpha;
      const oxDraw = e.pox === undefined ? e.ox : hermite ? hermiteLerp(e.ppox, e.pox, e.ox, rawRenderAlpha) : e.pox + (e.ox - e.pox) * renderAlpha;
      const oyDraw = e.poy === undefined ? e.oy : hermite ? hermiteLerp(e.ppoy, e.poy, e.oy, rawRenderAlpha) : e.poy + (e.oy - e.poy) * renderAlpha;
      const p = enemyPos({ d: dDraw, ox: oxDraw, oy: oyDraw });
      const et = ENEMY_TYPES[e.type];
      // viewport cull: with the camera zoomed in, most of the path is offscreen
      if (p.x < -90 || p.x > W + 90 || p.y < -150 || p.y > H + 110) return;
      // facing: sample a point slightly ahead on the path
      const ahead = pathPos(e.d + 6);
      const face = Math.atan2(ahead.y - p.y, ahead.x - p.x);
      const flip = Math.cos(face) < 0 ? -1 : 1;
      const cycle = now / 1000 * et.bobRate * 6 + e.wob;
      const bob = Math.sin(cycle) * (et.shape === "slime" ? 0 : 2);
      const R = et.r;

      // elites walk inside a golden rift sigil so they read at a glance
      if (e.elite) {
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.22 * Math.sin(cycle * 1.6);
        ctx.strokeStyle = "#ffd23f";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + R * 0.72, R * 1.5, R * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.28;
        ctx.lineWidth = 7;
        ctx.stroke();
        ctx.globalAlpha = 1;
        const hy = p.y - R - 15 + Math.sin(cycle * 1.4) * 2.5;
        ctx.fillStyle = "#ffd23f";
        ctx.beginPath();
        ctx.moveTo(p.x, hy - 7);
        ctx.lineTo(p.x + 5.5, hy);
        ctx.lineTo(p.x, hy + 7);
        ctx.lineTo(p.x - 5.5, hy);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // ---------- PRESENCE FX ----------
      // Bosses carry a signature aura keyed on their shape (embers for the
      // Warlord, orbiting void shards for the Overlord, quake rings for the
      // Titan, ripples for the Leviathan, static for the Herald) and every
      // enemy gets a soft contact glow plus a white hit flash. It is all
      // additive geometry with no shadowBlur, and it is skipped whenever the
      // frame governor or the player's own FX budget dials quality down.
      const auraOn = fxOn() && fxQ() >= 0.7 && !saveRef.current.powerSaver;
      if (auraOn) {
        const bossE = isBossType(e.type);
        const pulse = 0.5 + 0.5 * Math.sin(cycle * 0.9 + e.wob);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        if (bossE) {
          // ground halo
          const hy = p.y + R * 0.55;
          const halo = ctx.createRadialGradient(p.x, hy, R * 0.2, p.x, hy, R * 2.2);
          halo.addColorStop(0, `${et.color}66`);
          halo.addColorStop(0.55, `${et.color}22`);
          halo.addColorStop(1, "transparent");
          ctx.globalAlpha = 0.3 + pulse * 0.22;
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.ellipse(p.x, hy, R * 2.1, R * 0.9, 0, 0, Math.PI * 2);
          ctx.fill();
          // slow rotating rune ring
          ctx.globalAlpha = 0.34;
          ctx.strokeStyle = et.accent;
          ctx.lineWidth = 1.3;
          ctx.setLineDash([7, 11]);
          ctx.lineDashOffset = -now / 45;
          ctx.beginPath();
          ctx.ellipse(p.x, hy, R * 1.7, R * 0.66, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineDashOffset = 0;
          // signature cue
          switch (et.shape) {
            case "warlord": {
              // Warlord: embers rising off the standard
              for (let i = 0; i < 4; i++) {
                const t = (now / 700 + i / 4) % 1;
                ctx.globalAlpha = (1 - t) * 0.75;
                ctx.fillStyle = i % 2 ? "#ffd23f" : "#ff7a3d";
                ctx.beginPath();
                ctx.arc(p.x + Math.sin(now / 320 + i * 2.1) * R * 0.85, p.y - R - t * 40, 2.6 * (1 - t) + 0.6, 0, Math.PI * 2);
                ctx.fill();
              }
              break;
            }
            case "overlord": {
              // Rift Overlord: three void shards orbiting the crown
              for (let i = 0; i < 3; i++) {
                const a = now / 900 + (i / 3) * Math.PI * 2;
                ctx.globalAlpha = 0.55 + 0.3 * Math.sin(a * 2);
                ctx.fillStyle = i === 0 ? "#ffffff" : et.accent;
                ctx.beginPath();
                const sx = p.x + Math.cos(a) * R * 1.5;
                const sy = p.y - R * 0.35 + Math.sin(a) * R * 0.55;
                ctx.moveTo(sx, sy - 4.5);
                ctx.lineTo(sx + 3, sy);
                ctx.lineTo(sx, sy + 4.5);
                ctx.lineTo(sx - 3, sy);
                ctx.closePath();
                ctx.fill();
              }
              break;
            }
            case "titan": {
              // Void Titan: slow quake rings spreading from its feet
              for (let i = 0; i < 2; i++) {
                const t = (now / 1400 + i / 2) % 1;
                ctx.globalAlpha = (1 - t) * 0.4;
                ctx.strokeStyle = et.accent;
                ctx.lineWidth = 2.2 * (1 - t) + 0.5;
                ctx.beginPath();
                ctx.ellipse(p.x, hy, R * (1 + t * 1.9), R * (0.4 + t * 0.75), 0, 0, Math.PI * 2);
                ctx.stroke();
              }
              break;
            }
            case "leviathan": {
              // Abyss Leviathan: water ripples lapping at the coils
              for (let i = 0; i < 3; i++) {
                const t = (now / 1100 + i / 3) % 1;
                ctx.globalAlpha = (1 - t) * 0.35;
                ctx.strokeStyle = i % 2 ? "#2ee6c8" : "#d6fff7";
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.ellipse(p.x, hy, R * (0.9 + t * 1.6), R * (0.32 + t * 0.6), 0, 0, Math.PI * 2);
                ctx.stroke();
              }
              break;
            }
            case "herald": {
              // Storm Herald: static crawling around the thunderhead
              ctx.globalAlpha = 0.65;
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 1.4;
              for (let i = 0; i < 2; i++) {
                const a0 = now / 260 + i * Math.PI;
                ctx.beginPath();
                for (let k = 0; k <= 6; k++) {
                  const a = a0 + (k / 6) * 1.5;
                  const rr = R * 1.25 * (k % 2 ? 1.08 : 0.96);
                  const px2 = p.x + Math.cos(a) * rr;
                  const py2 = p.y - R * 0.3 + Math.sin(a) * rr * 0.7;
                  k === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
                }
                ctx.stroke();
              }
              break;
            }
          }
        } else if (e.elite || e.flash) {
          // regular mobs only pay for a glow when they are elite or just hit
          ctx.globalAlpha = e.elite ? 0.2 + pulse * 0.12 : 0.26;
          ctx.fillStyle = e.elite ? "#ffd23f" : "#ffffff";
          ctx.beginPath();
          ctx.ellipse(p.x, p.y + R * 0.6, R * 1.5, R * 0.62, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        if (e.flash) {
          // hit flash: a white bloom that reads even through armour
          ctx.globalAlpha = Math.min(0.5, e.flash * 4);
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(p.x, p.y - R * 0.15, R * 1.05, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // ground shadow, squashed with the bob so the step reads as weight
      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + R * 0.92, R * 0.86, R * 0.3 + Math.sin(cycle) * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(p.x, p.y + bob);
      const shadowOn = saveRef.current.shadowFx;
      drawEnemyBodySprite(ctx, e.type, et, R, cycle, flip, shadowOn);
      paintEnemyStatus(ctx, e, et, now);
      ctx.restore();
      // health bar: rounded, outlined, with a lighter cap so it reads at speed
      const boss = isBossType(e.type);
      const w3 = Math.max(28, et.r * 2);
      const hpPct = Math.max(0, Math.min(1, e.hp / e.max));
      const by = p.y - et.r - (boss ? 22 : 15) + bob;
      const bh = boss ? 7 : 5;
      // current/max readout: sits just above the bar, outlined for contrast.
      // Text is the most expensive per-enemy primitive, so on a packed board
      // (or when the governor is throttling) only bosses and elites keep their
      // numbers — the bars themselves still read perfectly.
      const dense = g.enemies.length > 24 || fxQ() < 0.7;
      if (boss || e.elite || !dense) {
        const hpLabel = `${shortHp(e.hp)}/${shortHp(e.max)}`;
        ctx.save();
        const fs = boss ? 12 : 10;
        ctx.font = `800 ${fs}px ${canvasUiFont}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(0,0,0,0.88)";
        ctx.strokeText(hpLabel, p.x, by - 4);
        ctx.fillStyle = hpPct > 0.25 ? "#eafff2" : "#ffd7db";
        ctx.fillText(hpLabel, p.x, by - 4);
        ctx.restore();
      }
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.beginPath();
      ctx.roundRect(p.x - w3 / 2 - 1, by - 1, w3 + 2, bh + 2, 3);
      ctx.fill();
      const hpCol = hpPct > 0.5 ? "#3dff8e" : hpPct > 0.25 ? "#ffd23f" : "#ff4d5e";
      if (dense) {
        // a flat colour on packed boards: one gradient object per enemy per
        // frame is exactly the kind of allocation that shows up in a profile
        ctx.fillStyle = hpCol;
      } else {
        const hpGrad = ctx.createLinearGradient(0, by, 0, by + bh);
        hpGrad.addColorStop(0, "#ffffffaa");
        hpGrad.addColorStop(0.35, hpCol);
        hpGrad.addColorStop(1, hpCol);
        ctx.fillStyle = hpGrad;
      }
      ctx.beginPath();
      ctx.roundRect(p.x - w3 / 2, by, Math.max(1, w3 * hpPct), bh, 2);
      ctx.fill();
      // a thin cap line on top keeps the fill edge readable at max health
      ctx.fillStyle = "#ffffff55";
      ctx.beginPath();
      ctx.roundRect(p.x - w3 / 2, by, Math.max(1, w3 * hpPct), 1.5, 1);
      ctx.fill();
    };

    const drawProj = (pr: Proj) => {
      const px = pr.px === undefined ? pr.x : pr.px + (pr.x - pr.px) * renderAlpha;
      const py = pr.py === undefined ? pr.y : pr.py + (pr.y - pr.py) * renderAlpha;
      // shots that have just left the arena are never seen again
      if (px < -80 || px > W + 80 || py < -80 || py > H + 80) return;
      const ang = Math.atan2(pr.ly - py, pr.lx - px);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      switch (pr.kind) {
        case "eclipse": {
          // a collapsing dark moon with a violet corona and a trailing void wake
          const wake = 34;
          const tail = ctx.createLinearGradient(-wake, 0, 10, 0);
          tail.addColorStop(0, "rgba(106,45,255,0)");
          tail.addColorStop(0.6, "rgba(176,107,255,0.55)");
          tail.addColorStop(1, "rgba(216,194,255,0.95)");
          ctx.strokeStyle = tail;
          ctx.lineWidth = 7;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(-wake, 0);
          ctx.lineTo(6, 0);
          ctx.stroke();
          ctx.fillStyle = "#0b0218";
          ctx.strokeStyle = "#b06bff";
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(3, 0, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = "rgba(216,194,255,0.8)";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.ellipse(3, 0, 15 + Math.sin(pr.age * 18) * 2, 6, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalCompositeOperation = "source-over";
          break;
        }
        case "seraph": {
          // a starlight lance: white core, cyan sheath, star at the tip
          const tail = 54;
          const grd = ctx.createLinearGradient(-tail, 0, 18, 0);
          grd.addColorStop(0, "rgba(143,240,255,0)");
          grd.addColorStop(0.45, "rgba(143,240,255,0.55)");
          grd.addColorStop(1, "#ffffff");
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = grd;
          ctx.lineWidth = 8;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(-tail, 0);
          ctx.lineTo(16, 0);
          ctx.stroke();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(-tail * 0.5, 0);
          ctx.lineTo(20, 0);
          ctx.stroke();
          ctx.fillStyle = "#eaffff";
          ctx.beginPath();
          ctx.moveTo(26, 0);
          ctx.lineTo(18, -5);
          ctx.lineTo(18, 5);
          ctx.closePath();
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";
          break;
        }
        case "heavenly": {
          // the laser: a long white-hot core with a gold sheath behind it
          const tail = 46;
          const grd = ctx.createLinearGradient(-tail, 0, 14, 0);
          grd.addColorStop(0, "transparent");
          grd.addColorStop(0.55, "#ffe86b88");
          grd.addColorStop(1, "#fff6c4");
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = grd;
          ctx.lineWidth = 9;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(-tail, 0);
          ctx.lineTo(14, 0);
          ctx.stroke();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-tail * 0.45, 0);
          ctx.lineTo(16, 0);
          ctx.stroke();
          ctx.globalCompositeOperation = "source-over";
          break;
        }
        case "honor": {
          ctx.fillStyle = "#ffd76a";
          ctx.strokeStyle = "#8a5a00";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-8, -6);
          ctx.lineTo(-8, 4);
          ctx.lineTo(0, -10);
          ctx.lineTo(8, 4);
          ctx.lineTo(8, -6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        }
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

    /**
     * CAMERA SHAKE — high-frequency random offset on each axis, and nothing
     * else. Each axis gets its own white-noise sample every 1/120 s (1/30 s in
     * power-saving mode), so the camera jitters like a hard impact instead of
     * swaying on a slow sine wave. Amplitude is `g.shake` scaled by the player's
     * Shake Intensity slider; there is no rotation, zoom or drift mixed in.
     */
    let shakeStep = Number.NaN;
    let shakeAxisX = 0;
    let shakeAxisY = 0;
    const shakeNoise = (step: number, salt: number) => {
      const x = Math.sin((step + salt) * 12.9898 + salt * 0.017) * 43758.5453;
      return (x - Math.floor(x)) * 2 - 1;
    };
    const sampleShake = (now: number) => {
      const intensity = Math.max(0, Math.min(2, saveRef.current.shakeIntensity ?? 1));
      if (!saveRef.current.shakeFx || intensity <= 0) return { x: 0, y: 0 };
      const amp = Math.min(38, g.shake * intensity);
      if (amp <= 0.25) return { x: 0, y: 0 };
      const hz = saveRef.current.powerSaver ? 30 : 120;
      const step = Math.floor(now / (1000 / hz));
      if (step !== shakeStep) {
        shakeStep = step;
        shakeAxisX = shakeNoise(step, 11.7);
        shakeAxisY = shakeNoise(step, 47.3);
      }
      return { x: shakeAxisX * amp, y: shakeAxisY * amp };
    };

    const draw = () => {
      // Pixel Ratio changes the backing-store resolution, not the game world's
      // 1000×580 coordinate system. Reset this every frame because post-fx
      // compositing temporarily uses its own transform.
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.imageSmoothingEnabled = saveRef.current.antiAlias;
      const now = performance.now();
      let shakeX = 0;
      let shakeY = 0;
      ctx.clearRect(0, 0, W, H);

      // ================= BATTLEFIELD =================
      // The static half of the arena — backdrop, nebula, starfield and the
      // raised slab — is rendered once into an offscreen canvas. Every frame
      // just blits it, which removes ~120 gradient/path operations from the
      // hot path (the single biggest draw win during dense waves). The sky is
      // blitted before the camera transform so shake/punch never expose its edge.
      ctx.drawImage(bgCache, 0, 0);
      if (!saveRef.current.powerSaver) {
        // a handful of parallax twinkles keep the sky alive without re-running
        // the full starfield
        const T = now / 1000;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < 18; i++) {
          const hx = Math.abs(Math.sin(i * 12.9898 + 7) * 43758.5453) % 1;
          const hy = Math.abs(Math.sin(i * 78.233 + 3) * 12345.6789) % 1;
          const depth = 0.35 + (i % 3) * 0.3;
          const px = (hx * W + T * 5 * depth) % W;
          const py = hy * H;
          const tw = 0.3 + 0.7 * Math.abs(Math.sin(T * (0.7 + (i % 5) * 0.3) + i));
          ctx.globalAlpha = tw * depth * 0.55;
          ctx.fillStyle = i % 7 === 0 ? "#9fd8ff" : "#ffffff";
          ctx.fillRect(px, py, depth * 1.4, depth * 1.4);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // camera shake/punch move the arena content but never the sky
      ctx.save();
      {
        const offset = sampleShake(now);
        shakeX = offset.x;
        shakeY = offset.y;
        if (shakeX !== 0 || shakeY !== 0) ctx.translate(shakeX, shakeY);
      }
      if (g.punch > 0.01) {
        const sc = 1 + g.punch * 0.045;
        ctx.translate(W / 2, H / 2);
        ctx.scale(sc, sc);
        ctx.translate(-W / 2, -H / 2);
      }

      // --- build pads: a cached layer, re-rendered only when the board or the
      // drag hover changes (see renderPads above) ---
      const drag = dragRef.current;
      const showGuides = saveRef.current.guides;
      {
        const occupied = new Set<string>();
        for (const t of g.towers) if (t.cell) occupied.add(t.cell.c + "," + t.cell.r);
        const hover = drag && drag.moved ? { x: drag.x, y: drag.y } : null;
        const sig = (showGuides ? "1" : "0") + "|" + [...occupied].join(";") + "|" + (hover ? Math.floor(hover.x / C) + "," + Math.floor(hover.y / C) : "-");
        if (sig !== padSig) {
          padSig = sig;
          renderPads(occupied, hover, showGuides);
        }
        if (showGuides && padCache) ctx.drawImage(padCache, 0, 0);
      }

      // --- the lane: cached road bed, live conduit pulses ---
      ctx.drawImage(laneCacheFor(), 0, 0);
      const pathStrokeLive = () => {
        ctx.beginPath();
        ctx.moveTo(WPX[0].x, WPX[0].y);
        for (let i = 1; i < WPX.length; i++) ctx.lineTo(WPX[i].x, WPX[i].y);
        ctx.stroke();
      };
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      // the conduit: a glowing channel running the length of the lane
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(120,90,255,0.22)";
      ctx.lineWidth = 12;
      ctx.setLineDash([]);
      pathStrokeLive();
      ctx.strokeStyle = "rgba(53,224,255,0.3)";
      ctx.lineWidth = 3.5;
      pathStrokeLive();
      // energy pulses flowing from spawn toward the exit
      ctx.strokeStyle = "rgba(180,230,255,0.9)";
      ctx.lineWidth = 5;
      ctx.setLineDash([22, 150]);
      ctx.lineDashOffset = -((now / 4) % 172);
      pathStrokeLive();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.setLineDash([10, 162]);
      ctx.lineDashOffset = -((now / 4) % 172);
      pathStrokeLive();
      ctx.restore();
      ctx.setLineDash([]);

      // --- ambient motes drifting over the arena (skipped in power saving) ---
      const padX = OX - C * 0.55;
      const padY = OY - C * 0.55;
      const padW = COLS * C + C * 1.1;
      const padH = ROWS * C + C * 1.1;
      const T = now / 1000;
      if (!saveRef.current.powerSaver && fxQ() >= 0.7) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 26; i++) {
        const hx = Math.abs(Math.sin(i * 23.17) * 9731.3) % 1;
        const hy = Math.abs(Math.sin(i * 51.77) * 4571.9) % 1;
        const sp = 7 + (i % 4) * 5;
        const mx = padX + hx * padW + Math.sin(T * 0.4 + i) * 14;
        const my = padY + ((hy * padH - T * sp) % padH + padH) % padH;
        ctx.globalAlpha = 0.1 + 0.18 * Math.abs(Math.sin(T * 0.9 + i * 1.7));
        ctx.fillStyle = i % 4 === 0 ? "#ffcf4d" : "#7fd8ff";
        ctx.beginPath();
        ctx.arc(mx, my, 1 + (i % 3) * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      }

      drawPortal(WPX[0].x, WPX[0].y, "#c44dff", "SPAWN");
      if (mode !== "sandbox" && hasSecondGate(mode)) drawPortal(GATE_B.x, GATE_B.y, "#c44dff", "SPAWN");
      drawPortal(WPX[WPX.length - 1].x, WPX[WPX.length - 1].y, "#ff4d5e", "EXIT");

      // energy guides: one arena-wide field boundary plus a faint tether from
      // every tower to the front of the horde, which is what "range" means now
      if (saveRef.current.guides) {
        ctx.save();
        ctx.setLineDash([7, 9]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(53,224,255,0.16)";
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, Math.max(W, H) * 0.66, 0, Math.PI * 2);
        ctx.stroke();
        let front: Enemy | null = null;
        for (const e of g.enemies) if (!e.dead && (!front || e.d > front.d)) front = e;
        if (front) {
          const fp = enemyPos(front);
          ctx.setLineDash([3, 11]);
          ctx.lineWidth = 1;
          for (const t of g.towers) {
            if (!t.cell) continue;
            const p = cellCenter(t.cell.c, t.cell.r);
            ctx.strokeStyle = t.owner === "you" ? "rgba(53,224,255,0.14)" : t.owner + "33";
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(fp.x, fp.y);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // ---------- boss meteors: a growing shadow, then the rock itself ----------
      for (const m of g.meteors) {
        const k = 1 - Math.max(0, m.t) / m.total; // 0 -> 1 as it falls
        ctx.save();
        ctx.globalAlpha = 0.25 + k * 0.55;
        ctx.strokeStyle = m.color;
        ctx.lineWidth = 2 + k * 3;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(m.x, m.y, 26 + (1 - k) * 60, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.2 + k * 0.4;
        const shadow = ctx.createRadialGradient(m.x, m.y, 2, m.x, m.y, 40 + k * 16);
        shadow.addColorStop(0, m.color);
        shadow.addColorStop(1, "transparent");
        ctx.fillStyle = shadow;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 40 + k * 16, 0, Math.PI * 2);
        ctx.fill();
        // the rock, falling in from the top-right, with a fire trail
        const rx = m.x + (1 - k) * 120;
        const ry = m.y - (1 - k) * 300;
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "lighter";
        const trail = ctx.createLinearGradient(rx, ry, m.x, m.y);
        trail.addColorStop(0, "transparent");
        trail.addColorStop(1, m.color + "cc");
        ctx.strokeStyle = trail;
        ctx.lineWidth = m.asteroid ? 16 : 10;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
        const rock = m.asteroid ? rockSprite(m.color) : null;
        if (rock) {
          // the sprite spins as it falls; the scale grows as it nears the ground
          ctx.translate(rx, ry);
          ctx.rotate(performance.now() / 260 + k * 3);
          const sc = 0.9 + k * 0.35;
          ctx.drawImage(rock, -32 * sc, -32 * sc, 64 * sc, 64 * sc);
        } else {
          ctx.fillStyle = "#3a1206";
          ctx.strokeStyle = m.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(rx, ry, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }

      // ---------- Rift Chains: a living tether from the boss to each minion ----------
      if (g.enemies.some((e) => !e.dead && e.link > 0)) {
        const bosses = g.enemies.filter((e) => !e.dead && isBossType(e.type));
        for (const m of g.enemies) {
          if (m.dead || m.link <= 0 || isBossType(m.type)) continue;
          const mp = enemyPos(m);
          let best: Enemy | null = null;
          let bd = 1e9;
          for (const b of bosses) {
            const bp = enemyPos(b);
            const d = Math.hypot(bp.x - mp.x, bp.y - mp.y);
            if (d < bd) {
              bd = d;
              best = b;
            }
          }
          if (!best) continue;
          const bp = enemyPos(best);
          const fade = Math.min(1, m.link / 1.2);
          ctx.save();
          ctx.globalAlpha = 0.55 * fade;
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = "#4de8ff";
          ctx.lineWidth = 2;
          ctx.setLineDash([9, 6]);
          ctx.lineDashOffset = -now / 26;
          ctx.beginPath();
          ctx.moveTo(bp.x, bp.y);
          // sag the chain so it reads as weight, not a laser
          ctx.quadraticCurveTo((bp.x + mp.x) / 2, (bp.y + mp.y) / 2 + 26, mp.x, mp.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 0.35 * fade;
          ctx.beginPath();
          ctx.arc(mp.x, mp.y, 20, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // ---------- ground zones, drawn under everything that stands on them ----------
      for (const z of g.zones) {
        const life = Math.max(0, Math.min(1, z.life / z.max));
        const fade = Math.min(1, life * 3); // quick fade-out at the end
        const tt = now / 1000 + z.seed;
        ctx.save();
        if (z.kind === "rift") {
          // singularity: a collapsing well with an accretion disc
          const grow = Math.min(1, (z.max - z.life) * 3);
          const r = z.r * (0.4 + grow * 0.6) * (0.9 + Math.sin(tt * 7) * 0.04);
          ctx.globalCompositeOperation = "lighter";
          const halo = ctx.createRadialGradient(z.x, z.y, r * 0.1, z.x, z.y, r);
          halo.addColorStop(0, "transparent");
          halo.addColorStop(0.55, z.color + "55");
          halo.addColorStop(0.82, z.color + "cc");
          halo.addColorStop(1, "transparent");
          ctx.globalAlpha = fade;
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(z.x, z.y, r, 0, Math.PI * 2);
          ctx.fill();
          // spiralling accretion arms
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.6;
          for (let a = 0; a < 5; a++) {
            ctx.globalAlpha = fade * 0.5;
            ctx.beginPath();
            for (let k = 0; k <= 22; k++) {
              const f = k / 22;
              const ang = tt * 3.2 + (a / 5) * Math.PI * 2 + f * 3.4;
              const rr = r * (1 - f * 0.92);
              const px = z.x + Math.cos(ang) * rr;
              const py = z.y + Math.sin(ang) * rr * 0.62;
              k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.stroke();
          }
          ctx.globalCompositeOperation = "source-over";
          // the void core
          ctx.globalAlpha = fade;
          ctx.fillStyle = "#06000f";
          ctx.beginPath();
          ctx.arc(z.x, z.y, r * 0.22 * (1 + Math.sin(tt * 9) * 0.06), 0, Math.PI * 2);
          ctx.fill();
        } else if (z.kind === "execution") {
          // Demon Execution's reworked verdict sigil: a burning seal snaps shut under each target.
          const age = 1 - life;
          const radius = z.r * (0.28 + Math.min(1, age * 5) * 0.72);
          const spin = tt * (age < 0.35 ? 2.6 : -1.35);
          ctx.globalCompositeOperation = "lighter";
          const ember = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, radius);
          ember.addColorStop(0, "#ffeff0cc");
          ember.addColorStop(0.12, "#ff224499");
          ember.addColorStop(0.48, "#a0002390");
          ember.addColorStop(1, "transparent");
          ctx.globalAlpha = fade * 0.72;
          ctx.fillStyle = ember;
          ctx.beginPath();
          ctx.ellipse(z.x, z.y, radius, radius * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = fade * 0.95;
          for (let ringIdx = 0; ringIdx < 3; ringIdx++) {
            const rr = radius * (0.34 + ringIdx * 0.2);
            ctx.strokeStyle = ringIdx === 0 ? "#fff1f2" : ringIdx === 1 ? "#ff304b" : "#710018";
            ctx.lineWidth = ringIdx === 0 ? 2.8 : 1.4;
            ctx.setLineDash(ringIdx === 2 ? [6, 5] : []);
            ctx.lineDashOffset = spin * (ringIdx % 2 ? -16 : 16);
            ctx.beginPath();
            ctx.ellipse(z.x, z.y, rr, rr * 0.36, spin * (ringIdx % 2 ? -1 : 1), 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.setLineDash([]);
          for (let ray = 0; ray < 8; ray++) {
            const a = spin + ray * Math.PI / 4;
            const inner = radius * 0.12;
            const outer = radius * (0.48 + 0.18 * Math.sin(tt * 8 + ray));
            ctx.strokeStyle = ray % 2 ? "#ff405b" : "#ffc4cb";
            ctx.lineWidth = ray % 2 ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(z.x + Math.cos(a) * inner, z.y + Math.sin(a) * inner * 0.36);
            ctx.lineTo(z.x + Math.cos(a) * outer, z.y + Math.sin(a) * outer * 0.36);
            ctx.stroke();
          }
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = "#170007";
          ctx.globalAlpha = fade * 0.85;
          ctx.beginPath();
          ctx.ellipse(z.x, z.y, radius * 0.17, radius * 0.12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = fade;
          ctx.fillStyle = "#fff1f2";
          ctx.beginPath();
          ctx.arc(z.x, z.y, Math.max(2, 5 * life), 0, Math.PI * 2);
          ctx.fill();
        } else if (z.kind === "hell") {
          // Hell Dimensions impact scar: an obsidian portal surrounded by deep
          // crimson fissures that branch outward and pulse with hot light.
          const age = 1 - life;
          const grow = Math.min(1, age * 8);
          const r = z.r * (0.35 + grow * 0.65);
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = fade * 0.68;
          const heat = ctx.createRadialGradient(z.x, z.y, 2, z.x, z.y, r * 1.2);
          heat.addColorStop(0, "#ff5666aa");
          heat.addColorStop(0.32, "#a60025aa");
          heat.addColorStop(1, "transparent");
          ctx.fillStyle = heat;
          ctx.beginPath();
          ctx.ellipse(z.x, z.y, r * 1.2, r * 0.58, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";
          // branching cracks are drawn in the ground plane, not as a floating ring
          ctx.globalAlpha = fade * 0.9;
          ctx.lineCap = "round";
          for (let arm = 0; arm < 12; arm++) {
            const a = (arm / 12) * Math.PI * 2 + z.seed * 0.2;
            const reach = r * (0.72 + ((arm * 17) % 5) * 0.07);
            const bend = ((arm % 2) ? 1 : -1) * (8 + arm % 4 * 3);
            ctx.strokeStyle = arm % 3 === 0 ? "#ff4b5e" : "#6f0018";
            ctx.lineWidth = arm % 3 === 0 ? 3.2 : 2;
            ctx.beginPath();
            ctx.moveTo(z.x, z.y);
            ctx.lineTo(z.x + Math.cos(a) * reach * 0.45 + bend, z.y + Math.sin(a) * reach * 0.23);
            ctx.lineTo(z.x + Math.cos(a + 0.07) * reach * 0.72 - bend * 0.35, z.y + Math.sin(a + 0.07) * reach * 0.37);
            ctx.lineTo(z.x + Math.cos(a) * reach, z.y + Math.sin(a) * reach * 0.5);
            ctx.stroke();
          }
          ctx.globalAlpha = fade;
          ctx.strokeStyle = "#ff9aa7";
          ctx.lineWidth = 2 + Math.sin(tt * 9) * 0.8;
          ctx.beginPath();
          ctx.ellipse(z.x, z.y, r * 0.53, r * 0.22, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#160008";
          ctx.beginPath();
          ctx.ellipse(z.x, z.y, r * 0.4, r * 0.17, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (z.kind === "lava") {
          // molten pool: a wobbling blob with a bright crust and rising heat
          ctx.globalAlpha = fade * 0.75;
          const pool = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r);
          pool.addColorStop(0, "#ffd23f");
          pool.addColorStop(0.45, z.color);
          pool.addColorStop(1, "#5a1200");
          ctx.fillStyle = pool;
          ctx.beginPath();
          for (let i = 0; i <= 26; i++) {
            const a = (i / 26) * Math.PI * 2;
            const wob = 1 + Math.sin(a * 3 + tt * 2.4) * 0.07 + Math.sin(a * 5 - tt * 1.7) * 0.05;
            const px = z.x + Math.cos(a) * z.r * wob;
            const py = z.y + Math.sin(a) * z.r * 0.5 * wob;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = fade * (0.35 + 0.2 * Math.sin(tt * 4));
          ctx.strokeStyle = "#ffd23f";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.globalCompositeOperation = "source-over";
        } else {
          // frost field: a pale disc with crystal spokes
          ctx.globalAlpha = fade * 0.5;
          const fr = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r);
          fr.addColorStop(0, "#ffffff");
          fr.addColorStop(0.5, z.color + "aa");
          fr.addColorStop(1, "transparent");
          ctx.fillStyle = fr;
          ctx.beginPath();
          ctx.ellipse(z.x, z.y, z.r, z.r * 0.52, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = fade * 0.75;
          ctx.strokeStyle = "#dffaff";
          ctx.lineWidth = 1.6;
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + tt * 0.25;
            const rr = z.r * (0.45 + 0.4 * Math.abs(Math.sin(i * 1.7 + tt)));
            ctx.beginPath();
            ctx.moveTo(z.x, z.y);
            ctx.lineTo(z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr * 0.52);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      for (const t of g.towers) {
        if (t.cell) drawTowerAt(t, cellCenter(t.cell.c, t.cell.r).x, cellCenter(t.cell.c, t.cell.r).y, now, false);
      }
      for (const e of g.enemies) drawEnemy(e, now);
      for (const pr of g.projs) drawProj(pr);

      // bolts
      // ---------- vertical lightning pillars ----------
      // Demon Execution drops one pillar per enemy on the field, so a big wave
      // can put twenty of these on screen at once. The halo gradient and the two
      // side filaments are the expensive half: past the first ten pillars (or
      // whenever the frame governor is throttling) only the white core spine is
      // drawn, which still reads as a strike from across the arena.
      // ---------- segmented sky bolts ----------
      // Every strike is a polyline: a main channel with seeded lateral jitter
      // plus two forks, drawn glow -> colour -> white core. All geometry comes
      // from the strike seed, so a bolt does not shimmer randomly frame to
      // frame. Demon Execution can put a dozen of these on screen at once, so
      // only the first ten (and only when the frame governor allows) get the
      // halo and the forks; the rest draw a single cheap white channel.
      let pillarIdx = 0;
      const hash = (n: number) => {
        const v = Math.sin(n) * 43758.5453;
        return v - Math.floor(v);
      };
      for (const st of g.strikes) {
        const k = Math.max(0, Math.min(1, st.life / st.max)); // 1 -> 0
        const top = st.top ?? -70;
        const w = st.width * (0.34 + k * 0.18);
        const detailed = pillarIdx++ < 10 && fxQ() >= 0.7;
        const segs = 16 + (st.jag ?? 0);
        const jitMul = st.jit ?? 1;
        const coreColor = st.core ?? "#ffffff";
        const span = Math.max(40, st.y - top);
        const sway = w * 1.9;
        // Reuse a compact typed offset buffer and the point list. The bolt changes
        // shape at 100 Hz (10ms) rather than burning RNG and allocating per frame.
        if (!st.jitter || st.jitter.length !== segs + 1) st.jitter = new Float32Array(segs + 1);
        if (!st.points || st.points.length !== segs + 1) st.points = Array.from({ length: segs + 1 }, () => ({ x: 0, y: 0 }));
        if (now - (st.lastJit || 0) >= 10 || !st.lastJit) {
          for (let i = 0; i <= segs; i++) st.jitter[i] = i === 0 || i === segs ? 0 : Math.random() * 2 - 1;
          st.lastJit = now;
        }
        const channel = (salt: number, spread: number, from: number, to: number) => {
          const out = st.points!;
          for (let i = 0; i <= segs; i++) {
            const t = i / segs;
            // taper the wobble at both ends so the bolt is anchored
            const env = Math.sin(Math.PI * t) * 0.92;
            const jx = (st.jitter![i] + (salt ? hash(st.seed * 3.7 + i * 1.93 + salt) - 0.5 : 0)) * spread * jitMul * env;
            out[i].x = st.x + jx;
            out[i].y = top + span * (from + (to - from) * t);
          }
          return out;
        };
        const stroke = (pts: { x: number; y: number }[], width: number, color: string, alpha: number) => {
          if (pts.length < 2) return;
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.stroke();
        };
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        const main = channel(0, sway, 0, 1);
        if (detailed) {
          // wide halo first, then the coloured sheath, then the white core
          stroke(main, w * 4.2, st.color, 0.16 * k);
          stroke(main, w * 1.9, st.color, 0.5 * k);
          // forks: two shorter channels peeling off the main line
          const forks = st.forks ?? 2;
          for (let f = 0; f < forks; f++) {
            const at = 0.28 + hash(st.seed * 1.7 + f * 2.3) * 0.42;
            const dir = f % 2 === 0 ? 1 : -1;
            const anchor = main[Math.round(at * segs)];
            const forkPts: { x: number; y: number }[] = [];
            const len = 3 + Math.floor(hash(st.seed + f) * 3);
            for (let i = 0; i <= len; i++) {
              const t = i / len;
              forkPts.push({
                x: anchor.x + dir * (t * w * 5 + (hash(st.seed * 9 + f * 3 + i) - 0.5) * w * 2.4),
                y: anchor.y + t * (span * 0.22) + (hash(st.seed * 5 + i + f) - 0.5) * 16,
              });
            }
            stroke(forkPts, Math.max(0.8, w * 0.6), st.color, 0.34 * k);
            stroke(forkPts, Math.max(0.6, w * 0.26), coreColor, 0.55 * k);
          }
        }
        stroke(main, Math.max(1.2, w * (detailed ? 0.55 : 0.8)), coreColor, 0.9 * k);
        // the impact pool where the channel meets the ground
        if (detailed) {
          const pool = ctx.createRadialGradient(st.x, st.y, 1, st.x, st.y, w * 4.5);
          pool.addColorStop(0, "#ffffff");
          pool.addColorStop(0.4, st.color);
          pool.addColorStop(1, "transparent");
          ctx.globalAlpha = 0.6 * (0.35 + k * 0.65);
          ctx.fillStyle = pool;
          ctx.beginPath();
          ctx.ellipse(st.x, st.y, w * 4.5, w * 2.1, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalAlpha = 0.3 * k;
          ctx.fillStyle = st.color;
          ctx.beginPath();
          ctx.ellipse(st.x, st.y, w * 3, w * 1.4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Lightning: additive glow body, a flickering outer sheath, short side
      // branches off the jagged spine and a flare where the bolt lands.
      if (g.bolts.length) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (const b of g.bolts) {
          boltPts(b, boltCache);
          if (boltCache.length < 2) continue;
          const flick = 0.86 + 0.14 * Math.sin(now / 37 + b.x0 * 0.05 + b.y0 * 0.03);
          const alpha = Math.min(1, b.life / b.max + 0.25) * flick;
          const pathOf = (pts: { x: number; y: number }[]) => {
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();
          };
          // outer sheath and body
          ctx.globalAlpha = alpha * 0.26;
          ctx.strokeStyle = b.color;
          ctx.lineWidth = b.w * 5.2;
          pathOf(boltCache);
          ctx.globalAlpha = alpha * 0.7;
          ctx.lineWidth = b.w * 1.9;
          pathOf(boltCache);
          // side branches: every few vertices a short fork peels off, alternating sides
          ctx.globalAlpha = alpha * 0.6;
          ctx.lineWidth = Math.max(0.8, b.w * 0.55);
          ctx.beginPath();
          for (let i = 2; i < boltCache.length - 2; i += 4) {
            const q = boltCache[i];
            const dir = (i >> 2) % 2 ? 1 : -1;
            const len = b.w * (2.6 + (i % 3));
            ctx.moveTo(q.x, q.y);
            ctx.lineTo(q.x + dir * len, q.y + len * 0.7);
          }
          ctx.stroke();
          // white-hot core
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = Math.max(0.9, b.w * 0.75);
          pathOf(boltCache);
          // landing flare
          const tip = boltCache[boltCache.length - 1];
          const gs = glowSprite(b.color);
          if (gs) {
            const fs = b.w * 9;
            ctx.globalAlpha = alpha * 0.85;
            ctx.drawImage(gs, tip.x - fs / 2, tip.y - fs / 2, fs, fs);
          }
        }
        ctx.restore();
      }

      // ---------- particles ----------
      // Everything flagged `add` is drawn in a second additive pass so glows,
      // shockwaves and sparkles stack into hot white cores instead of muddying.
      const drawPart = (p: Part) => {
        const al = Math.max(0, p.life / p.max);
        const t = 1 - al; // 0 -> 1 over the particle's life
        // frame interpolation: draw where the particle was heading, not where
        // the last 1/60s step left it. Off-screen debris is skipped before any
        // path work, which is most of the win during a dense crit streak.
        const px = p.px === undefined ? p.x : p.px + (p.x - p.px) * renderAlpha;
        const py = p.py === undefined ? p.y : p.py + (p.y - p.py) * renderAlpha;
        const rot = p.prot === undefined || p.rot === undefined ? p.rot || 0 : p.prot + (p.rot - p.prot) * renderAlpha;
        if (px < -140 || px > W + 140 || py < -140 || py > H + 140) return;
        ctx.save();
        ctx.translate(px - p.x, py - p.y);
        const sprite = glowSprite(p.color);

        if (p.kind === "ring") {
          // a clean double ring: a fast outer edge and a hot inner hairline
          const r = p.size * (1.5 - al * 0.5);
          ctx.globalAlpha = al * 0.9;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3.2 * al;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = al * 0.55;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.2 * al + 0.4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 0.82, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.kind === "shock") {
          // REWORKED: a gradient annulus that expands fast, thins out and
          // leaves a hot white leading edge. Reads clearly on every background.
          const ease = 1 - Math.pow(1 - t, 3);
          const r = p.size * (0.3 + ease * 2.3);
          const grad = ctx.createRadialGradient(p.x, p.y, r * 0.52, p.x, p.y, r);
          grad.addColorStop(0, "transparent");
          grad.addColorStop(0.62, p.color);
          grad.addColorStop(0.86, "rgba(255,255,255,0.92)");
          grad.addColorStop(1, "transparent");
          ctx.globalAlpha = al * al * 0.9;
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = al * 0.85;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = Math.max(0.7, 2.4 * al * al);
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 0.86, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.kind === "glow") {
          const r = p.size * (0.65 + t * 0.75);
          ctx.globalAlpha = al * 0.95;
          if (sprite) {
            ctx.drawImage(sprite, p.x - r, p.y - r, r * 2, r * 2);
            ctx.globalAlpha = al * 0.65;
            const core = r * 0.42;
            ctx.drawImage(sprite, p.x - core, p.y - core, core * 2, core * 2);
          } else {
            const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            gr.addColorStop(0, "#ffffff");
            gr.addColorStop(0.28, p.color);
            gr.addColorStop(1, "transparent");
            ctx.fillStyle = gr;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (p.kind === "shard") {
          // faceted debris with a light trail behind it
          ctx.globalAlpha = al * 0.9;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(rot);
          const trailLen = Math.min(20, Math.hypot(p.vx, p.vy) * 0.08);
          const tr = ctx.createLinearGradient(-trailLen, 0, 0, 0);
          tr.addColorStop(0, "transparent");
          tr.addColorStop(1, p.color);
          ctx.strokeStyle = tr;
          ctx.lineWidth = p.size * 0.7;
          ctx.beginPath();
          ctx.moveTo(-trailLen, 0);
          ctx.lineTo(0, 0);
          ctx.stroke();
          const sh = ctx.createLinearGradient(-p.size, -p.size, p.size, p.size);
          sh.addColorStop(0, "#ffffff");
          sh.addColorStop(0.45, p.color);
          sh.addColorStop(1, p.color + "88");
          ctx.fillStyle = sh;
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.72, p.size * 0.7);
          ctx.lineTo(0, p.size * 0.34);
          ctx.lineTo(-p.size * 0.72, p.size * 0.7);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (p.kind === "star") {
          // four-point sparkle with a soft halo and a white hot core
          const sc = al * (0.55 + Math.sin(t * Math.PI) * 0.85);
          ctx.globalAlpha = al;
          if (sprite) {
            const gr = p.size * 3 * sc;
            ctx.globalAlpha = al * 0.3;
            ctx.drawImage(sprite, p.x - gr, p.y - gr, gr * 2, gr * 2);
            ctx.globalAlpha = al;
          }
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(rot);
          ctx.fillStyle = p.color;
          const L = p.size * 2.1 * sc;
          const Wd = p.size * 0.26 * sc;
          ctx.beginPath();
          ctx.moveTo(0, -L);
          ctx.quadraticCurveTo(Wd, -Wd, L, 0);
          ctx.quadraticCurveTo(Wd, Wd, 0, L);
          ctx.quadraticCurveTo(-Wd, Wd, -L, 0);
          ctx.quadraticCurveTo(-Wd, -Wd, 0, -L);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.3 * sc, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (p.kind === "ember") {
          // glowing ember with a short upward tail
          const r = p.size * (0.7 + al * 0.5);
          ctx.globalAlpha = al * (0.55 + 0.45 * Math.sin(p.life * 24));
          if (sprite) {
            ctx.drawImage(sprite, p.x - r * 2.4, p.y - r * 2.4, r * 4.8, r * 4.8);
          } else {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.strokeStyle = p.color;
          ctx.globalAlpha *= 0.5;
          ctx.lineWidth = r * 0.7;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
          ctx.stroke();
        } else if (p.kind === "smoke") {
          const r = p.size * (0.8 + t * 1.9);
          ctx.globalAlpha = al * 0.3;
          if (sprite) {
            ctx.drawImage(sprite, p.x - r, p.y - r, r * 2, r * 2);
          } else {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (p.kind === "rune") {
          // a rotating glyph ring: hexagon + cardinal ticks + inner sigil
          const r = p.size * (0.55 + Math.min(1, t * 1.8) * 0.6);
          ctx.globalAlpha = al * 0.85;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(rot);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i <= 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const qx = Math.cos(a) * r;
            const qy = Math.sin(a) * r;
            i === 0 ? ctx.moveTo(qx, qy) : ctx.lineTo(qx, qy);
          }
          ctx.stroke();
          ctx.globalAlpha = al * 0.7;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1;
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82);
            ctx.lineTo(Math.cos(a) * r * 1.12, Math.sin(a) * r * 1.12);
            ctx.stroke();
          }
          ctx.rotate(-rot * 2.4);
          ctx.globalAlpha = al * 0.55;
          ctx.strokeStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.42, 0, Math.PI * 1.4);
          ctx.stroke();
          ctx.restore();
        } else if (p.kind === "wave") {
          // ground-plane shockwave: a flattened annulus that races outward
          const ease = 1 - Math.pow(1 - t, 4);
          const r = p.size * (0.2 + ease * 2.4);
          const grad = ctx.createRadialGradient(p.x, p.y, r * 0.42, p.x, p.y, r);
          grad.addColorStop(0, "transparent");
          grad.addColorStop(0.7, p.color + "aa");
          grad.addColorStop(1, "transparent");
          ctx.globalAlpha = al * 0.7;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.scale(1, 0.48);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.globalAlpha = al * 0.4;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (p.kind === "sparkle") {
          // fine drifting glint: a tiny cross with a soft halo
          const r = p.size * (0.5 + al * 0.8);
          ctx.globalAlpha = al * 0.9;
          if (sprite) {
            ctx.drawImage(sprite, p.x - r * 2.6, p.y - r * 2.6, r * 5.2, r * 5.2);
          }
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x - r * 1.6, p.y);
          ctx.lineTo(p.x + r * 1.6, p.y);
          ctx.moveTo(p.x, p.y - r * 1.6);
          ctx.lineTo(p.x, p.y + r * 1.6);
          ctx.stroke();
        } else {
          // sparks stretch along their velocity so fast debris reads as streaks
          const sp = Math.hypot(p.vx, p.vy);
          ctx.globalAlpha = al;
          ctx.fillStyle = p.color;
          if (sp > 120) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Math.atan2(p.vy, p.vx));
            const len = Math.min(18, p.size + sp * 0.035);
            ctx.fillRect(-len, -p.size / 2, len + p.size, p.size);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(-p.size * 0.5, -p.size * 0.22, p.size * 2.2, p.size * 0.44);
            ctx.restore();
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 0.62, 0, Math.PI * 2);
            ctx.fill();
            if (sprite && p.size > 3) {
              ctx.globalAlpha = al * 0.45;
              const r = p.size * 3;
              ctx.drawImage(sprite, p.x - r, p.y - r, r * 2, r * 2);
            }
          }
        }
        ctx.restore();
      };
      for (const p of g.parts) if (!p.add) drawPart(p);
      ctx.globalCompositeOperation = "lighter";
      for (const p of g.parts) if (p.add) drawPart(p);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      // ---------- upgrade / ascend flourishes ----------
      for (const l of g.levelFx) {
        const t = l.t / l.total;
        const ease = 1 - Math.pow(1 - t, 3);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        // rising column of light
        const colH = 150 * ease;
        const cg = ctx.createLinearGradient(l.x, l.y, l.x, l.y - colH);
        cg.addColorStop(0, l.color + "cc");
        cg.addColorStop(1, "transparent");
        ctx.globalAlpha = (1 - t) * 0.8;
        ctx.fillStyle = cg;
        ctx.fillRect(l.x - 20 - l.tier * 5, l.y - colH, 40 + l.tier * 10, colH);
        // expanding hex rune rings, one per tier
        for (let k = 0; k < l.tier; k++) {
          const rt = Math.max(0, Math.min(1, (t - k * 0.12) * 1.6));
          if (rt <= 0) continue;
          const r = 22 + rt * (54 + k * 16);
          ctx.globalAlpha = (1 - rt) * 0.9;
          ctx.strokeStyle = k === 0 ? "#ffffff" : l.color;
          ctx.lineWidth = 3 * (1 - rt) + 0.6;
          ctx.beginPath();
          for (let i = 0; i <= 6; i++) {
            const a = (i / 6) * Math.PI * 2 + t * 2 + k;
            const px = l.x + Math.cos(a) * r;
            const py = l.y + Math.sin(a) * r * 0.55;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        // chevrons climbing the column
        ctx.globalAlpha = (1 - t) * 0.9;
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 3;
        for (let k = 0; k < 3; k++) {
          const ct = (t * 1.6 + k / 3) % 1;
          const cy = l.y - ct * 120;
          ctx.globalAlpha = (1 - ct) * (1 - t) * 0.9;
          ctx.beginPath();
          ctx.moveTo(l.x - 14, cy + 8);
          ctx.lineTo(l.x, cy);
          ctx.lineTo(l.x + 14, cy + 8);
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
        // the label, punching in then floating up
        const pop = 1 + 0.5 * Math.max(0, 1 - t * 6);
        ctx.globalAlpha = Math.min(1, (1 - t) * 2.2);
        ctx.save();
        ctx.translate(l.x, l.y - 46 - ease * 26);
        ctx.scale(pop, pop);
        ctx.textAlign = "center";
        ctx.font = `800 15px ${canvasUiFont}`;
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(0,0,0,0.85)";
        ctx.strokeText(l.label, 0, 0);
        ctx.fillStyle = l.color;
        ctx.fillText(l.label, 0, 0);
        ctx.restore();
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      // floating damage text
      for (const t of g.texts) {
        const al = Math.min(1, t.life / 0.4);
        const age = 0.9 - t.life;
        const ty = t.py === undefined ? t.y : t.py + (t.y - t.py) * renderAlpha;
        ctx.globalAlpha = al;
        ctx.textAlign = "center";
        if (t.crit) {
          // punchy overshoot: snaps in at 1.35x then settles
          const pop = 1 + 0.45 * Math.max(0, 1 - age * 5) + 0.08 * Math.sin(age * 22) * Math.max(0, 1 - age * 3);
          ctx.save();
          ctx.translate(t.x, ty);
          ctx.scale(pop, pop);
          // the eight-ray starburst behind the number is eight more paths per
          // crit: kept for the crits that matter, dropped when text is busy
          if (age < 0.32 && (fxQ() >= 1 || t.size >= 40)) {
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
          // setting ctx.font re-parses the font string, so only do it on change
          const font = `700 ${t.size}px ${canvasDispFont}`;
          if (font !== lastFont) {
            ctx.font = font;
            lastFont = font;
          }
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
        ctx.font = `700 ${t.size}px ${canvasUiFont}`;
        ctx.fillStyle = t.color;
        ctx.fillText(t.txt, t.x, ty);
      }
      ctx.globalAlpha = 1;

      // drag ghost
      if (drag && drag.moved) {
        const t = g.towers.find((x) => x.uid === drag.uid);
        if (t && drag.x >= 0 && drag.x <= W && drag.y >= 0 && drag.y <= H) drawTowerAt(t, drag.x, drag.y, now, true);
      }

      ctx.restore();

      // ---------- full-screen post pass ----------
      // chromatic aberration: re-stamp the frame twice, offset and tinted, in
      // additive mode. Cheap, and it makes every big hit feel like it shoved
      // the camera.
      if (g.chroma > 0.02 && fxOn() && fxQ() >= 0.7) {
        const off = g.chroma * 6;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = g.chroma * 0.3;
        ctx.fillStyle = "#ff0040";
        ctx.fillRect(-off, 0, W, H);
        ctx.fillStyle = "#00e5ff";
        ctx.fillRect(off, 0, W, H);
        ctx.restore();
      }
      if (g.flash) {
        const a = Math.max(0, g.flash.life / g.flash.max);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = a * a * 0.55;
        ctx.fillStyle = g.flash.color;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
      if (g.redFlash > 0) {
        ctx.fillStyle = `rgba(255,40,60,${g.redFlash * 0.22})`;
        ctx.fillRect(0, 0, W, H);
      }
      // vignette pulse while a hero ultimate is resolving
      if (g.skill) {
        const k = Math.sin((g.skill.t / g.skill.total) * Math.PI);
        const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
        vg.addColorStop(0, "transparent");
        vg.addColorStop(1, g.skill.color);
        ctx.save();
        ctx.globalAlpha = k * 0.34;
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      // Bloom is a subtle additive halo, kept in a quarter-resolution buffer.
      if (saveRef.current.bloomFx && fxOn() && !saveRef.current.powerSaver) {
        bloomCtx.clearRect(0, 0, bloomCanvas.width, bloomCanvas.height);
        bloomCtx.drawImage(renderCanvas, 0, 0, bloomCanvas.width, bloomCanvas.height);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.11;
        ctx.filter = "blur(10px) brightness(1.7) saturate(1.4)";
        ctx.drawImage(bloomCanvas, 0, 0, bloomCanvas.width, bloomCanvas.height, 0, 0, W, H);
        ctx.filter = "none";
        ctx.restore();
      }

      // Directional motion blur. The camera's per-frame motion vector sets the
      // direction and length of a smear. The blur is a running average of four
      // taps along that vector (the live frame plus three samples of the previous
      // frame, each pushed back along the motion path), so it reads as a soft
      // streak rather than a ghost. Its strength follows the shake energy, and the
      // blurred layer cross-fades over the sharp frame, so a calm frame is never
      // softened. Only the Motion Blur switch and Power Saving disable it.
      const shakeVelX = shakeX - lastShakeX;
      const shakeVelY = shakeY - lastShakeY;
      const shakeVelocity = Math.hypot(shakeVelX, shakeVelY);
      const shakeMag = Math.hypot(shakeX, shakeY);
      const motion = Math.max(shakeVelocity, shakeMag * 0.35);
      const blurAmt = Math.min(1, Math.max(0, motion - 0.6) * 0.08);
      const useMotionBlur =
        hasPreviousFrame && blurAmt > 0.04 && saveRef.current.motionBlur && saveRef.current.shakeFx && !saveRef.current.powerSaver;
      const tw = trailCanvas.width;
      const th = trailCanvas.height;
      // world units -> trail-buffer pixels (the buffer is half resolution)
      const toTrail = tw / W;
      currentCtx.clearRect(0, 0, tw, th);
      currentCtx.drawImage(renderCanvas, 0, 0, tw, th);
      if (useMotionBlur) {
        // smear vector in trail pixels, clamped so a huge hit never tears the frame apart
        let vx = (shakeVelocity > 0.2 ? shakeVelX : shakeX * 0.5) * toTrail * 2.2;
        let vy = (shakeVelocity > 0.2 ? shakeVelY : shakeY * 0.5) * toTrail * 2.2;
        const vl = Math.hypot(vx, vy);
        const maxLen = 9 + blurAmt * 9;
        if (vl > maxLen) {
          vx = (vx / vl) * maxLen;
          vy = (vy / vl) * maxLen;
        }
        trailCtx.clearRect(0, 0, tw, th);
        trailCtx.globalAlpha = 1;
        trailCtx.drawImage(currentCanvas, 0, 0, tw, th);
        // running average: each further tap gets 1/(k+1) so the four weights are equal
        trailCtx.globalAlpha = 1 / 2;
        trailCtx.drawImage(previousCanvas, -vx / 3, -vy / 3, tw, th);
        trailCtx.globalAlpha = 1 / 3;
        trailCtx.drawImage(previousCanvas, (-vx * 2) / 3, (-vy * 2) / 3, tw, th);
        trailCtx.globalAlpha = 1 / 4;
        trailCtx.drawImage(previousCanvas, -vx, -vy, tw, th);
        trailCtx.globalAlpha = 1;
        ctx.save();
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.globalAlpha = Math.min(1, blurAmt * 1.4);
        ctx.drawImage(trailCanvas, 0, 0, tw, th, 0, 0, W, H);
        ctx.restore();
      }
      previousCtx.clearRect(0, 0, tw, th);
      previousCtx.drawImage(currentCanvas, 0, 0, tw, th);
      // present: upscale the finished frame onto the visible canvas
      if (upscaler) upscaler.draw(renderCanvas);
      else if (presentCtx) {
        presentCtx.imageSmoothingEnabled = true;
        presentCtx.imageSmoothingQuality = "high";
        presentCtx.drawImage(renderCanvas, 0, 0, canvas.width, canvas.height);
      }
      lastShakeX = shakeX;
      lastShakeY = shakeY;
      hasPreviousFrame = true;
    };

    // ---------- loop ----------
    // Fixed 1/60 simulation steps with a render budget. The battle can run at
    // 1x / 1.5x / 2x speed, can be paused, and in POWER SAVING mode caps itself
    // at 30 FPS with effects dialled back. FRAME INTERPOLATION draws between
    // the last two sim states; when the loop has to drop a backlog it snaps
    // alpha to 1 instead of gliding backwards through stale state.
    const STEP = 1 / 60;
    let acc = 0;
    let pausedDraw = false;
    const onVisibility = () => {
      if (document.hidden) return;
      // a backgrounded tab can return with seconds of backlog: restart clean
      last = performance.now();
      lastDraw = last;
      acc = 0;
      pausedDraw = false;
    };
    document.addEventListener("visibilitychange", onVisibility);
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      const ps = !!saveRef.current.powerSaver;
      // power saving wins over the manual cap: never above 30 FPS
      const cap = ps ? Math.min(30, saveRef.current.maxFps || 30) : saveRef.current.maxFps || 0;
      if (cap > 0 && now - lastDraw < 1000 / cap - 0.6) return;
      lastDraw = now;

      // paused: hold the sim, draw the frozen frame once, and then idle
      if (pausedRef.current) {
        last = now;
        if (!pausedDraw) {
          renderAlpha = 1;
          fxUserLevel = ps ? 2 : saveRef.current.fxq || 0;
          draw();
          pausedDraw = true;
        }
        return;
      }
      pausedDraw = false;

      // rAF timestamps can start behind performance.now(), which would make dt negative
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      const speed = speedRef.current || 1;
      acc += dt * speed;
      const maxSteps = Math.min(8, Math.ceil(3 * speed));
      let steps = 0;
      while (acc >= STEP && steps < maxSteps) {
        update(STEP);
        acc -= STEP;
        steps++;
      }
      // fell too far behind: drop the backlog and draw the true state
      const dropped = acc >= STEP;
      if (dropped) acc = 0;
      rawRenderAlpha = dropped ? 1 : Math.max(0, Math.min(1, acc / STEP));
      renderAlpha = saveRef.current.frameInterp && !ps
        ? saveRef.current.interpolationMethod === "smoothstep"
          ? rawRenderAlpha * rawRenderAlpha * (3 - 2 * rawRenderAlpha)
          : rawRenderAlpha
        : 1;
      fxUserLevel = ps ? 2 : saveRef.current.fxq || 0;
      const drawStart = performance.now();
      draw();
      // render FPS (not simulation steps) so speed ×2 does not read as 120fps
      g.frames++;
      g.fpsT += dt;
      if (g.fpsT >= 0.5) {
        g.fps = Math.round(g.frames / g.fpsT);
        g.frames = 0;
        g.fpsT = 0;
      }
      // slide the quality factor on the real cost of the last frame
      fxGov.avg += (Math.min(40, performance.now() - drawStart) - fxGov.avg) * 0.08;
      fxGov.q = fxGov.avg > 13 ? 0.4 : fxGov.avg > 8.5 ? 0.7 : 1;

      // HUD re-render gate: only wake React when a visible value actually moved.
      if (now - lastHud > (ps ? 320 : 120)) {
        lastHud = now;
        const sig = [
          Math.floor(g.sp),
          Math.floor(g.gold),
          g.lives,
          g.round,
          mode === "gemrush" ? gemRushClock : "",
          g.roulette ? Math.ceil(g.roulette.t * 10) : "",
          g.phase,
          Math.ceil(g.phaseT),
          g.enemies.length,
          g.towers.length,
          g.spawnQ.length,
          Math.ceil(g.heroCd),
          g.crits,
          g.bestHit,
          g.waveTotal,
          g.waveSpawned,
          g.final ? "final" : "-",
          g.cut ? `cut${Math.ceil(g.cut.t)}${g.cut.locked ? "L" : ""}` : "",
          g.skill ? `skill${g.skill.phase}${Math.ceil(g.skill.t * 10)}` : "",
          g.bossCast ? `cast${Math.ceil(g.bossCast.t * 4)}` : "",
          saveRef.current.perf ? `${g.fps}:${g.projs.length}:${g.parts.length}` : "",
        ].join("|");
        if (sig !== hudSig) {
          hudSig = sig;
          setTick((t) => t + 1);
        }
      }
    };
    raf = requestAnimationFrame(loop);
    // Canvas gestures: tower drags, one-finger scroll-pan when zoomed, wheel
    // zoom, and two-finger pinch. Pinch persists once on release, not on every
    // pointermove, so localStorage and React stay out of the hot path.
    const cameraPointers = new Map<number, { x: number; y: number }>();
    let pinchStart: { distance: number; zoom: number } | null = null;
    let panStart: { id: number; x: number; y: number; left: number; top: number } | null = null;
    const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
    const toCanvas = (e: PointerEvent) => canvasPoint(canvas, e.clientX, e.clientY);
    const cellAt = (x: number, y: number) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      const c = Math.floor((x - OX) / C);
      const r = Math.floor((y - OY) / C);
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS || isPathCell(c, r)) return null;
      return { c, r };
    };
    const down = (e: PointerEvent) => {
      cameraPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (cameraPointers.size >= 2) {
        const pts = [...cameraPointers.values()];
        pinchStart = { distance: Math.max(1, distance(pts[0], pts[1])), zoom: zoomRef.current };
        dragRef.current = null;
        panStart = null;
        try { canvas.setPointerCapture(e.pointerId); } catch { /* old WebViews */ }
        e.preventDefault();
        return;
      }
      const p = toCanvas(e);
      const cell = cellAt(p.x, p.y);
      const tower = cell ? g.towers.find((x) => x.cell && x.cell.c === cell.c && x.cell.r === cell.r) : undefined;
      if (tower) {
        dragRef.current = { kind: "field", uid: tower.uid, x: p.x, y: p.y, moved: false };
        try { canvas.setPointerCapture(e.pointerId); } catch { /* old WebViews */ }
        sfx.hover();
      } else if (zoomRef.current > 1.01) {
        panStart = { id: e.pointerId, x: e.clientX, y: e.clientY, left: wrap.scrollLeft, top: wrap.scrollTop };
        try { canvas.setPointerCapture(e.pointerId); } catch { /* old WebViews */ }
      }
    };
    const move = (e: PointerEvent) => {
      if (cameraPointers.has(e.pointerId)) cameraPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinchStart && cameraPointers.size >= 2) {
        const pts = [...cameraPointers.values()];
        const nextZoom = clampZoom(pinchStart.zoom * distance(pts[0], pts[1]) / pinchStart.distance);
        if (nextZoom !== zoomRef.current) {
          zoomRef.current = nextZoom;
          setZoom(nextZoom);
          fit();
        }
        e.preventDefault();
        return;
      }
      const activePan = panStart;
      if (activePan && activePan.id === e.pointerId) {
        wrap.scrollLeft = activePan.left - (e.clientX - activePan.x);
        wrap.scrollTop = activePan.top - (e.clientY - activePan.y);
        e.preventDefault();
        return;
      }
      const drag = dragRef.current;
      if (!drag || drag.kind !== "field") return;
      const p = toCanvas(e);
      drag.x = p.x;
      drag.y = p.y;
      drag.moved = true;
    };
    const up = (e: PointerEvent) => {
      cameraPointers.delete(e.pointerId);
      if (pinchStart && cameraPointers.size < 2) {
        pinchStart = null;
        mutateRef.current((s) => { s.zoom = zoomRef.current; });
      }
      if (panStart?.id === e.pointerId) panStart = null;
      if (cameraPointers.size > 0 && !dragRef.current) return;
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag || !drag.moved) return;
      const p = toCanvas(e);
      const cell = cellAt(p.x, p.y);
      const src = g.towers.find((x) => x.uid === drag.uid);
      if (!src || !cell) return;
      if (cell.c === src.cell?.c && cell.r === src.cell?.r) return;
      const occ = g.towers.find((x) => x.cell && x.cell.c === cell.c && x.cell.r === cell.r && x.uid !== src.uid);
      if (occ) {
        if (src.def.id === "clone" && occ.def.id === "clone") {
          if (src.points === occ.points) mergeTowers(src, occ);
          else { sfx.error(); toastRef.current(`Points must match to merge (${src.points} vs ${occ.points})`, "#ff4d5e"); }
        } else if (occ.def.id === "clone") {
          cloneTower(src, occ);
        } else if (src.def.id === "clone") {
          cloneTower(occ, src);
        } else if (occ.points >= MAX_POINTS) {
          sfx.error();
          toastRef.current(`${occ.def.name} is already at ${MAX_POINTS} points`, "#ff4d5e");
        } else if (occ.points === src.points) mergeTowers(src, occ);
        else {
          sfx.error();
          toastRef.current(`Points must match to merge (${src.points} vs ${occ.points})`, "#ff4d5e");
        }
        return;
      }
      onPlaced(src, cell.c, cell.r);
    };
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const nextZoom = clampZoom(zoomRef.current * Math.exp(-e.deltaY * 0.0015));
      if (nextZoom !== zoomRef.current) {
        zoomRef.current = nextZoom;
        setZoom(nextZoom);
        fit();
        mutateRef.current((s) => { s.zoom = nextZoom; });
      }
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", wheel, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("wheel", wheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const g = gRef.current;
  const gemRushClock = g ? Math.ceil(g.gemRushRemaining) : GEM_RUSH_SECONDS;
  const cost = g ? spCost(g.spSpend) : SP_BASE_COST;

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
    const cost = ascSpCost(Math.max(0, t.bLv - 1));
    if (gg.sp < cost) {
      sfx.error();
      push("Not enough SP", "#ff4d5e");
      return;
    }
    ascendRef.current(uid);
  };

  const maxRounds = BATTLE_ROUNDS;

  /**
   * The results screen's salvage list, built from the run's payout so the card
   * can tick the rewards in one row at a time.
   */
  const endRows = (f: NonNullable<G["final"]>) => {
    const rows: { icon: React.ReactNode; label: string; val: string; color: string }[] = [];
    if (f.gold) rows.push({ icon: <CoinIcon size={16} />, label: "Gold", val: f.gold.toLocaleString("en-US"), color: "#ffcf4d" });
    if (f.gems) rows.push({ icon: <GemIcon size={16} />, label: "Gems", val: f.gems.toLocaleString("en-US"), color: "#35e0ff" });
    if (f.tokens) rows.push({ icon: <TokenIcon size={16} />, label: "Magic Tokens", val: String(f.tokens), color: "#ff4fd8" });
    if (f.potions) rows.push({ icon: <PotionIcon size={16} />, label: "Crystal Potions", val: String(f.potions), color: "#b98bff" });
    f.frags.forEach((fr) => {
      const def = TOWER_BY_ID[fr.id];
      const col = RARITY[def?.rarity ?? "normal"].color;
      rows.push({ icon: <ShardIcon size={16} color={col} />, label: (def?.name ?? fr.id) + " fragments", val: "x" + fr.n, color: col });
    });
    (["basic", "advanced", "elite"] as const).forEach((k) => {
      const n = f.chips?.[k] || 0;
      if (n > 0) rows.push({ icon: <ChipIcon id={k} size={16} />, label: k + " chip modules", val: "x" + n, color: "#8fe9ff" });
    });
    if (!isRunMode(mode) && f.rounds)
      rows.push({
        icon: <span className="text-[14px]">~</span>,
        label: "Waves survived",
        val: String(f.rounds),
        color: mode === "gauntlet" ? "#3dff8e" : "#ff9be9",
      });
    if (f.gauntlet) {
      rows.push({ icon: <span className="text-[14px]">✦</span>, label: "Boons taken", val: String(f.gauntlet.boons), color: "#b06bff" });
      if (f.gauntlet.record)
        rows.push({ icon: <span className="text-[14px]">★</span>, label: "New gauntlet record", val: "BEST", color: "#ffd23f" });
    }
    if (mode === "hardcore")
      rows.push({
        icon: <span className="text-[14px]">✖</span>,
        label: "Hardcore best",
        val: `${Math.max(save.hardcoreBest, f.rounds)}/${BATTLE_ROUNDS}`,
        color: "#ff315c",
      });
    if (mode === "battle")
      rows.push({
        icon: <TrophyIcon size={16} />,
        label: f.won ? "Trophies won" : "Trophies lost",
        val: (f.won ? "+" : "") + Math.abs(trophyDelta(f.won, EV_BONUS, saveRef.current.streak)),
        color: f.won ? "#3dff8e" : "#ff8f9a",
      });
    return rows;
  };

  const collect = () => {
    if (!g?.final) return;
    const f = g.final;
    if (mode === "sandbox") { onExit(); return; }
    mutate((s) => {
      s.gold += f.gold;
      s.gems += f.gems;
      s.tokens += f.tokens;
      s.potions += f.potions;
      // every finished run banks monthly event points: waves + a clear bonus
      addMonthPoints(s, f.rounds * 8 + (f.won ? 40 : 0));
      f.frags.forEach((fr) => {
        s.frags[fr.id] = (s.frags[fr.id] || 0) + fr.n;
      });
      s.runs++;
      if (mode === "endless") s.bestEndless = Math.max(s.bestEndless, f.rounds);
      else if (mode === "gauntlet") s.gauntletBest = Math.max(s.gauntletBest, f.rounds);
      else if (mode === "hardcore") s.hardcoreBest = Math.max(s.hardcoreBest, f.rounds);
      else if (mode !== "gemrush") s.best = Math.max(s.best, f.rounds);
      if (f.won) s.wins++;
      if (f.chips) addChips(s, f.chips);
      if (mode === "battle") {
        // Trophy gains rise by +5 per prior consecutive win (capped at +50); losses remain bounded at zero.
        applyBattleTrophies(s, f.won, EV_BONUS.trophyWin + trophyStreakBonus(s.streak), EV_BONUS.trophyLoss);
        s.streak = f.won ? s.streak + 1 : 0;
        if (f.won) bumpQuest(s, "wins", 1);
      }
      bumpQuest(s, "runs", 1);
      // daily tasks
      bumpTask(s, "play", 1);
      bumpTask(s, "waves", f.rounds);
      bumpTask(s, "kills", g.kills);
      bumpTask(s, "skill", g.skillCasts);
      if (isRunMode(mode) && f.won) bumpTask(s, "win", 1);
    });
    sfx.coin();
    onExit();
  };

  const heroReady = g ? g.heroCd <= 0 : true;
  const heroDef = HERO_BY_ID[save.hero] || HERO_BY_ID.nova;
  /** the fixed six-slot list the ascent bar renders. Never grows with the board. */
  const lineupIds = useMemo(() => {
    const chosen = save.lineup.filter((id) => (save.levels[id] || 0) > 0 && TOWER_BY_ID[id]);
    const rest = TOWERS.filter((t) => (save.levels[t.id] || 0) > 0 && !chosen.includes(t.id)).map((t) => t.id);
    return [...chosen, ...rest].slice(0, 6);
  }, [save.lineup, save.levels]);

  return (
    <div className="app-bg relative flex h-full flex-col">
      <Toasts toasts={toasts} />
      {g?.roulette && !g.final && !g.cut && !g.enemies.some((e) => !e.dead && isBossType(e.type)) && (() => {
        const elapsed = Math.max(0, g.roulette.total - g.roulette.t);
        const progress = Math.min(1, elapsed / Math.max(0.01, g.roulette.total));
        const settled = g.roulette.t <= 0.55;
        // Ease the reel to a halt instead of cycling at a constant, arbitrary rate.
        const reelStep = Math.floor((1 - Math.pow(1 - progress, 3)) * 12);
        const rollingType = reelStep >= 12
          ? g.roulette.type
          : BOSS_TYPES[(g.roulette.type + reelStep + 1) % BOSS_TYPES.length] ?? g.roulette.type;
        const displayType = settled ? g.roulette.type : rollingType;
        // COMPACT ROULETTE: one thin strip pinned under the HUD. The reel, a
        // small portrait, the name and a hairline progress bar share a single
        // row, so it never covers the arena the way the old card did.
        return <div className="boss-roulette-overlay" data-testid="boss-roulette" role="status" aria-live="polite">
          <div className={`boss-roulette-card ${settled ? "is-locked" : "is-spinning"}`} style={{ borderColor: settled ? undefined : `${ENEMY_TYPES[displayType].color}88` }}>
            <div className="boss-roulette-spinner">
              <div className="boss-roulette-wheel" style={{ animation: `bossRouletteSpin ${g.roulette.total}s cubic-bezier(.08,.68,.22,1) both` }} />
              <span>✦</span>
            </div>
            <div className="boss-roulette-focus" style={{ color: ENEMY_TYPES[displayType].color }}><BossPortrait type={displayType} /></div>
            <div className="boss-roulette-copy">
              <div className="boss-roulette-kicker">NEXT BOSS{settled ? "" : " · DRAWING"}</div>
              <div className="boss-roulette-result" style={{ color: ENEMY_TYPES[displayType].color }}>
                {settled ? ENEMY_TYPES[g.roulette.type].name.toUpperCase() : "SCANNING…"}
              </div>
            </div>
            <div className="boss-roulette-caption">{settled ? "LOCKED" : `${Math.round(progress * 100)}%`}</div>
            <div className="boss-roulette-track"><span style={{ width: `${progress * 100}%` }} /></div>
          </div>
        </div>;
      })()}
            {/* TOP HUD — one bar, grouped so it always fits. The groups wrap as whole
          units instead of scattering loose pills: economy on the left, round
          state and the run stat on the right, SUMMON pinned in front. */}
      <div className="hud" data-testid="hud">
        <button
          className="hud-summon"
          disabled={g ? g.sp < cost : true}
          data-testid="summon-btn"
          onClick={() => summonRef.current()}
        >
          <span className="hud-summon-main">SUMMON</span>
          <span className="hud-summon-cost num">{cost} SP</span>
        </button>

        {g && (
          <>
            <div className="hud-group" data-testid="hud-economy">
              <span data-testid="sp-chip" className="hud-pill" style={{ color: "#7fe9ff" }}>
                <i className="hud-dot" style={{ background: "#7fe9ff" }} />
                <b className="num">{Math.floor(g.sp)}</b>
                <em>SP</em>
              </span>
              <span className="hud-pill" style={{ color: "#ffcf4d" }}>
                <CoinIcon size={14} />
                <b className="num">{Math.floor(g.gold)}</b>
              </span>
              <span className="hud-pill" data-testid="hud-lives" style={{ color: g.lives <= 5 ? "#ff4d5e" : "#ff8f9a" }}>
                <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    d="M10 17S2 11.5 2 6.6C2 4 4 2.5 6 2.5c1.6 0 3 .8 4 2.2 1-1.4 2.4-2.2 4-2.2 2 0 4 1.5 4 4.1C18 11.5 10 17 10 17z"
                    fill="currentColor"
                  />
                </svg>
                <b className="num">{g.lives}</b>
              </span>
              <span className="hud-pill hud-dim" style={{ color: "#8fb0ff" }} data-testid="enemies-left">
                <b className="num">{g.enemies.length + g.spawnQ.length}</b>
                <em>left</em>
              </span>
              {mode === "gemrush" && <span className="hud-pill" style={{ color: "#35e0ff" }} data-testid="gem-rush-earned"><GemIcon size={14} /><b className="num">{g.gemRushGems.toLocaleString()}</b><em>earned</em></span>}
              {(mode === "hardcore" || mode === "superhardcore") && (
                <span className="hud-pill hud-hardcore" data-testid="hardcore-plays" title={mode === "superhardcore" ? `Super Hardcore · ${SUPER_HARDCORE_WEEKLY_PLAYS} attempts per week` : `Hardcore · ${HARDCORE_DAILY_PLAYS} attempts per day · best round ${save.hardcoreBest}`}>
                  <b className="num">{mode === "superhardcore" ? superHardcorePlaysLeft(save) : hardcorePlaysLeft(save)}</b>
                  <em>/ {mode === "superhardcore" ? SUPER_HARDCORE_WEEKLY_PLAYS : HARDCORE_DAILY_PLAYS} left</em>
                </span>
              )}
              <span className="hud-pill hud-dim" style={{ color: "#8effc4" }} data-testid="towers-on-board" title="Towers deployed">
                <b className="num">{g.towers.filter((t) => t.cell).length}</b>
                <em>towers</em>
              </span>
              {g.odT > 0 && (
                <span className="hud-pill" style={{ color: "#8effc4" }}>
                  <b className="num">{g.odT.toFixed(0)}</b>
                  <em>overdrive</em>
                </span>
              )}
            </div>

            <div className="hud-group" data-testid="hud-round">
              <span
                className="hud-pill"
                data-testid={mode === "gemrush" ? "gem-rush-timer" : undefined}
                style={{
                  color:
                    mode === "gauntlet"
                      ? "#3dff8e"
                      : mode === "endless"
                        ? "#ff9be9"
                        : mode === "gemrush"
                          ? "#35e0ff"
                          : mode === "hardcore"
                            ? "#ff315c"
                            : "#ffcf4d",
                }}
                title={
                  mode === "gauntlet"
                    ? `Gauntlet · best wave ${save.gauntletBest}`
                    : mode === "hardcore"
                      ? `Hardcore · best round ${save.hardcoreBest}`
                      : undefined
                }
              >
                <b className="num">
                  {isRunMode(mode) ? Math.min(g.round, maxRounds) + "/" + maxRounds : mode === "gemrush" ? `${String(Math.floor(gemRushClock / 60)).padStart(2, "0")}:${String(gemRushClock % 60).padStart(2, "0")}` : "W" + g.round}
                </b>
                <em>{isRunMode(mode) ? (mode === "hardcore" ? "hardcore" : "round") : mode === "gauntlet" ? "gauntlet" : mode === "gemrush" ? "remaining" : "endless"}</em>
              </span>
              {mode === "gauntlet" && (
                <span className="hud-pill hud-dim" style={{ color: "#3dff8e" }} data-testid="gauntlet-boons" title="Boons taken this run">
                  <b className="num">{g.boons.length}</b>
                  <em>boons</em>
                </span>
              )}
              <span
                className="hud-pill hud-crit num-pop"
                key={"crit-" + g.crits}
                data-testid="crit-chip"
                title={"Crit damage merged from " + towerUpgradeCount(save.levels) + " tower upgrades"}
              >
                <span className="crit-chip-star">✦</span>
                <b className="num" data-testid="crit-stat">
                  {fmtCritPct(critBonusFrom(save.levels))}
                </b>
                {g.crits > 0 && (
                  <em>
                    <span className="num">{g.crits}</span> crits · best <span className="num">{g.bestHit.toLocaleString("en-US")}</span>
                  </em>
                )}
              </span>
              <button
                data-testid="battle-shop"
                onClick={() => {
                  sfx.click();
                  setShopOpen(true);
                }}
                className="hud-shop"
                title="Run shop"
              >
                <span className="hud-shop-glyph">🛒</span>
                <span>SHOP</span>
              </button>
              <button
                data-testid="speed-btn"
                className="hud-tool"
                title="Battle speed"
                onClick={() => {
                  sfx.uiTab();
                  setRunSpeed((s2) => (s2 === 1 ? 1.5 : s2 === 1.5 ? 2 : 1));
                }}
              >
                <span className="num">×{runSpeed}</span>
              </button>
              <button
                data-testid="pause-btn"
                className={`hud-tool ${paused ? "on" : ""}`}
                title={paused ? "Resume" : "Pause"}
                onClick={() => {
                  sfx.click();
                  setPaused((p2) => !p2);
                }}
              >
                {paused ? "▶" : "❚❚"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* WAVE STRIP — a thin progress line under the HUD, so the arena itself
          does not need another overlay */}
      {g && !g.final && (
        <div className="wave-strip" data-testid="wave-strip">
          <span className="wave-strip-label">
            {isRunMode(mode) ? "ROUND" : "WAVE"} <b className="num">{g.round}</b>
            {g.phase === "boon" ? (
              <> · <span style={{ color: "#3dff8e" }}>BOON READY</span></>
            ) : g.phase === "wave" ? (
              save.hideWaveCleared ? null : <> · <span className="num">{Math.max(0, g.waveTotal - g.spawnQ.length - g.enemies.filter((e) => !e.dead).length)}</span>/<span className="num">{g.waveTotal}</span> CLEARED</>
            ) : g.phase === "deploy" ? (
              <> · DEPLOY <span className="num">{Math.ceil(g.phaseT)}</span>s</>
            ) : (
              <> · NEXT IN <span className="num">{Math.ceil(g.phaseT)}</span>s</>
            )}
          </span>
          <span className="wave-strip-track">
            <span
              className="wave-strip-fill"
              style={{
                width:
                  g.phase === "wave" && g.waveTotal > 0
                    ? `${Math.min(100, ((g.waveTotal - g.spawnQ.length - g.enemies.filter((e) => !e.dead).length) / g.waveTotal) * 100)}%`
                    : "0%",
              }}
            />
          </span>
          <span className="wave-strip-hp">HP ×{mode === "gemrush" ? GEM_RUSH_HP_MUL : mode === "hardcore" || mode === "superhardcore" ? (Math.pow(HP_GROWTH, Math.max(0, g.round - 1)) * hardcoreEnemyHp(1, mode)).toFixed(1) : Math.pow(HP_GROWTH, Math.max(0, g.round - 1)).toFixed(1)}</span>
          {mode === "hardcore" && <span className="wave-strip-hp hud-hardcore" data-testid="hardcore-rules">10× HP · 2× SPAWNS · 2 GATES · NO CRITS · 25% SPEED · 5× REWARDS</span>}
          {mode === "superhardcore" && <span className="wave-strip-hp hud-hardcore" data-testid="superhardcore-rules">710× HP · +75% SPEED · 2 GATES · 10× REWARDS · 1 LIFE</span>}
          {g.bossImmunityT > 0 && <span className="wave-strip-hp" data-testid="thunder-ward">THUNDER WARD · {g.bossImmunityT.toFixed(1)}s</span>}
          {mode === "gemrush" && <span className="wave-strip-hp" data-testid="gem-rush-rules">50 GEMS/KILL · ELITE ×5 · BOSS ×10 · 1.5× SPEED</span>}
          {g.round % 4 === 0 && <span className="wave-strip-boss">BOSS</span>}
          {save.powerSaver && <span className="wave-strip-saver" title="Power Saving Mode is on">SAVER</span>}
          <button
            type="button"
            className={`wave-strip-toggle ${save.hideWaveCleared ? "on" : ""}`}
            aria-pressed={!!save.hideWaveCleared}
            data-testid="hide-cleared-toggle"
            title="Hide the WAVE CLEARED banners, toasts and counter"
            onClick={() => { sfx.calloutToggle(); mutate((s2) => { s2.hideWaveCleared = !s2.hideWaveCleared; }); }}
          >
            {save.hideWaveCleared ? "CLEARED: HIDDEN" : "CLEARED: SHOWN"}
          </button>
          {(mode === "endless" || mode === "gauntlet") && (() => {
            const uses = save.mail.autoWeek === weekStr() ? save.mail.autoUses : 0;
            const deployed = g.towers.filter((t) => !!t.cell && t.downT <= 0 && t.hexT <= 0);
            const dps = deployed.reduce((sum, t) => {
              const upg = t.menuLv - 1;
              let personalSpeed = (t.def.aspd || 0) + (t.def.upAspd || 0) * upg + (t.def.ascAspd || 0) * (t.bLv - 1);
              if (t.def.id === "lightning") personalSpeed = 0;
              let rate = t.def.rate / (1 + personalSpeed + t.superBuff);
              rate /= 1 + POINT_STEP * t.points;
              rate /= 1 + g.bonusAspd;
              if (g.odT > 0) rate /= 1 + OVERDRIVE_ASPD;
              rate = Math.max(0.08, rate);
              let damage = towerDamage(t.def, t.menuLv, t.bLv, t.points, t.atkMul) * (1 + g.dmgBonus) * (g.odT > 0 ? 1 + OVERDRIVE_DMG : 1);
              if (isLightningTower(t.def)) damage *= 1 + g.lightningBonus;
              damage *= 1 + t.honorMul;
              if (t.surgeT > 0) damage *= 1 + t.surgeMul;
              if (t.def.killStack) { const tier = save.awn[t.def.id]?.[1] || 0; const cap = tier > 0 ? t.def.awk2?.mult[tier - 1] || 0 : 0; damage *= 1 + Math.min(cap, t.streak) * t.def.killStack; }
              const targetFactor = t.def.target === "all" ? WAVE_ENEMY_COUNT : 1;
              const chainFactor = t.def.chain ? Math.min(2.5, 1 + t.def.chain * 0.22) : 1;
              const splashFactor = t.def.splash ? Math.min(1.6, 1 + t.def.splash / 180) : 1;
              return sum + damage / rate * targetFactor * chainFactor * splashFactor;
            }, 0);
            return <button type="button" disabled={!!g.final || uses >= 3} className="ml-auto rounded-md border border-[#ff4fd8]/50 bg-black/70 px-2 py-1 text-[10px] font-bold text-[#ff9be9] disabled:opacity-40" data-testid="auto-resolve" onClick={() => onAutoBattle?.(mode, dps, deployed.length, g.phase === "inter" || g.phase === "boon" ? g.round + 1 : g.round, g.gold, g.goldMul, g.boons.length)}>{uses >= 3 ? "AUTO LIMIT · 3/3" : `AUTO-RESOLVE · ${Math.max(0, 3 - uses)}/3`}</button>;
          })()}
        </div>
      )}

{/* CANVAS */}
      {mode === "sandbox" && <div className="flex flex-wrap items-center gap-3 border-b border-[#9b7cff55] bg-[#17102e] px-3 py-2 text-[11px] font-bold text-[#d7ccff]">
        <span>SANDBOX CONTROLS</span>
        <label><input type="checkbox" aria-label="Max level towers" checked={sandboxCfg.maxLevel} onChange={(e) => setSandboxCfg((c) => ({ ...c, maxLevel: e.target.checked }))} /> Max-level owned towers</label>
        <label><input type="checkbox" aria-label="Max awakening towers" checked={sandboxCfg.awakened} onChange={(e) => setSandboxCfg((c) => ({ ...c, awakened: e.target.checked }))} /> Max awakenings</label>
        <label>Spawn interval <input type="range" min="0.15" max="2" step="0.05" value={sandboxCfg.interval} onChange={(e) => setSandboxCfg((c) => ({ ...c, interval: Number(e.target.value) }))} /> {sandboxCfg.interval.toFixed(2)}s</label>
        <label>Enemy HP ×{sandboxCfg.hp.toFixed(1)} <input type="range" min="0.1" max="10" step="0.1" value={sandboxCfg.hp} onChange={(e) => setSandboxCfg((c) => ({ ...c, hp: Number(e.target.value) }))} /></label>
        <label>Speed ×{sandboxCfg.speed.toFixed(1)} <input type="range" min="0.2" max="4" step="0.1" value={sandboxCfg.speed} onChange={(e) => setSandboxCfg((c) => ({ ...c, speed: Number(e.target.value) }))} /></label>
        <label>Shield {Math.round(sandboxCfg.shield * 100)}% <input type="range" min="0" max="0.9" step="0.05" value={sandboxCfg.shield} onChange={(e) => setSandboxCfg((c) => ({ ...c, shield: Number(e.target.value) }))} /></label>
      </div>}
      <div className="relative min-h-0 flex-1">
        <div className="scroll-thin h-full w-full overflow-auto">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="mx-auto block"
            style={{ touchAction: "none", cursor: "grab", maxWidth: "none", maxHeight: "none" }}
          />
        </div>
        {g && (g.phase === "deploy" || g.phase === "inter") && (
          <div className="pointer-events-none absolute left-1/2 top-[8%] -translate-x-1/2 text-center">
            {(g.phase === "deploy" || !save.hideWaveCleared) && (
            <div className="font-disp text-4xl text-[#ffcf4d]" style={{ textShadow: "0 0 26px rgba(255,179,36,.7)" }}>
              {g.phase === "deploy"
                ? "DEPLOY TOWERS"
                : `${isRunMode(mode) ? "ROUND" : "WAVE"} ${g.round} CLEARED`}
            </div>
            )}
            <div className="mt-1 text-base font-bold tracking-[0.25em] text-[var(--txt)]">
              {g.phase === "deploy" ? "PRESS SUMMON — TOWERS DROP STRAIGHT ONTO THE GRID" : `NEXT WAVE IN ${Math.ceil(g.phaseT)}`}
            </div>
            <div className="mt-1 text-[13px] font-bold tracking-[0.2em] text-[#ff9be9]">
              WAVE {g.phase === "deploy" ? g.round : g.round + 1} · ENEMY HP ×{Math.pow(HP_GROWTH, g.phase === "deploy" ? g.round - 1 : g.round).toFixed(1)}
            </div>
            {(() => {
              const nr = g.phase === "deploy" ? g.round : g.round + 1;
              const kinds = [ENEMY_TYPES[0].name];
              if (nr >= 3) kinds.push(ENEMY_TYPES[1].name);
              if (nr >= 5) kinds.push(ENEMY_TYPES[2].name);
              if (nr >= 7) kinds.push(ENEMY_TYPES[3].name);
              if (nr >= 9) kinds.push(ENEMY_TYPES[HOUND_TYPE].name);
              if (nr >= 11) kinds.push(ENEMY_TYPES[WRAITH_TYPE].name);
              if (nr >= 13) kinds.push(ENEMY_TYPES[GOLEM_TYPE].name);
              return (
                <div className="mt-1 flex flex-wrap items-center justify-center gap-1 text-[10px] font-bold tracking-[0.14em] text-[var(--dim)]" data-testid="wave-preview">
                  <span className="num text-[#7fe9ff]">{Math.min(46, 8 + nr * 2)}</span> HOSTILES · {kinds.join(" · ").toUpperCase()}
                  {nr % 4 === 0 && <span className="text-[#ff8f9a]"> · {ENEMY_TYPES[nr >= 32 ? 6 : nr >= 16 ? 5 : 4].name.toUpperCase()}</span>}
                  {nr >= 20 && nr % 8 === 0 && (
                    <span className="text-[#3dffc0]"> · {ENEMY_TYPES[LEVIATHAN_TYPE].name.toUpperCase()} SURFACES</span>
                  )}
                </div>
              );
            })()}
            {(g.phase === "deploy" ? g.round : g.round + 1) % 4 === 0 && (
              <div className="boss-warning mt-1 text-[11px] font-bold tracking-[0.25em] text-[#ff4d5e]">
                ⚠ BOSS WAVE INCOMING
              </div>
            )}
            <button
              className="btn pointer-events-auto mt-2 px-4 py-1.5 text-[12px]"
              data-testid="call-wave"
              onClick={() => {
                const gg = gRef.current;
                if (gg && (gg.phase === "deploy" || gg.phase === "inter")) {
                  // calling the wave early banks the countdown as bonus SP: a
                  // small reward for playing forward instead of idling
                  const bonus = Math.round(Math.max(0, gg.phaseT) * 4);
                  gg.phaseT = 0;
                  if (bonus > 0) {
                    gg.sp += bonus;
                    push(`Early call · +${bonus} SP`, "#7fe9ff");
                  }
                  sfx.click();
                  setTick((t) => t + 1);
                }
              }}
            >
              CALL WAVE EARLY{Math.round(Math.max(0, g.phaseT) * 4) > 0 ? ` · +${Math.round(Math.max(0, g.phaseT) * 4)} SP` : ""}
            </button>
          </div>
        )}
        {/* boss health bar — compact single-strip HUD: name, %, two-line bar
            and a row of tiny skill glyphs. It sits under the wave counter and
            never eats more than 44px of the arena. */}
        {g && (() => {
          const bosses = g.enemies.filter((e) => !e.dead && isBossType(e.type));
          if (!bosses.length) return null;
          const e = bosses.reduce((a, b) => (a.hp / a.max > b.hp / b.max ? a : b));
          const et = ENEMY_TYPES[e.type];
          const frac = Math.max(0, e.hp / e.max);
          return (
            <div data-testid="boss-bar" className="pointer-events-none absolute left-1/2 top-[54px] z-20 w-[440px] max-w-[94%] -translate-x-1/2">
              <div className="boss-hud" style={{ borderColor: `${et.color}77`, boxShadow: `0 0 18px ${et.color}33` }}>
                <div className="flex items-center gap-1.5">
                  <span className="boss-hud-dot" style={{ background: et.color, boxShadow: `0 0 10px ${et.color}` }} />
                  <span className="font-disp truncate text-[11.5px] leading-none" style={{ color: et.color }}>
                    {et.name.toUpperCase()}
                  </span>
                  {e.enraged && <span className="boss-hud-tag" style={{ background: "#ff4d5e", color: "#180008" }}>RAGE</span>}
                  {e.ward > 0 && <span className="boss-hud-tag" style={{ background: "#8fb0ff", color: "#080f22" }}>WARD</span>}
                  {(e.plating || 0) > 0 && <span className="boss-hud-tag" style={{ background: "#ffd23f", color: "#1a1200" }}>PLATE</span>}
                  {(e.shieldCutT || 0) > 0 && <span className="boss-hud-tag" style={{ background: "#7ce7ff", color: "#001a20" }}>STRIPPED</span>}
                  <span className="num ml-auto text-[9.5px] font-bold text-[var(--dim)]">
                    {bosses.length > 1 ? `${bosses.length} BOSSES` : `${shortHp(e.hp)} / ${shortHp(e.max)} · ${Math.ceil(frac * 100)}%`}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full border border-black/60 bg-black/70">
                  <div
                    className={`h-full rounded-full ${e.enraged ? "boss-bar-rage" : "boss-bar"}`}
                    style={{ width: `${frac * 100}%`, background: `linear-gradient(90deg, ${et.color}, #ffcf4d)` }}
                  />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1" data-testid="boss-kit">
                  {bossKit(e.type).map((id) => {
                    const sk = BOSS_SKILL_BY_ID[id];
                    const live = g.bossCast?.skill === sk.name;
                    return (
                      <span
                        key={id}
                        data-skill={id}
                        title={sk.name}
                        className={`boss-chip boss-chip-sm ${live ? "on boss-chip-fire" : ""}`}
                        style={{
                          background: live ? sk.color : "rgba(0,0,0,0.42)",
                          color: live ? "#160a2c" : sk.color,
                          borderColor: `${sk.color}66`,
                        }}
                      >
                        <i className="boss-chip-glyph">{sk.glyph}</i>
                        <span className="boss-chip-label">{sk.name}</span>
                      </span>
                    );
                  })}
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
              {isRunMode(mode) ? "ROUND" : "WAVE"} {g.round}
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
              {/* awakening tiers earned with Magic Tokens */}
              {heroAwkSpec(heroDef.id, 0) && (() => {
                const t1 = save.heroAwn?.[heroDef.id]?.[0] || 0;
                const t2 = save.heroAwn?.[heroDef.id]?.[1] || 0;
                if (!t1 && !t2) return null;
                return (
                  <span className="hero-awk-badges" data-testid="hero-awakening-badges">
                    {[t1, t2].map((t, i) => (
                      <i key={i} className={t > 0 ? "on" : ""} title={`Awakening ${i + 1}`}>
                        {t > 0 ? ROMAN[t] : "·"}
                      </i>
                    ))}
                  </span>
                );
              })()}
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
            className="rounded-md bg-black/40 px-1.5 py-1 text-[9px] font-bold tracking-wider text-[var(--dim)] hover:text-white"
            onClick={() => changeZoom(1)}
            aria-label="Fit arena"
            title="Fit arena"
          >FIT</button>
          <button
            className="grid h-7 w-7 place-items-center rounded-lg bg-black/40 text-[17px] font-bold leading-none text-[var(--txt)] transition hover:bg-black/70"
            onClick={() => changeZoom(zoom + 0.1)}
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
        <div className="pointer-events-auto">
          <FullscreenButton />
        </div>
      </div>

      </div>

      {/* GAUNTLET BOON PICK — the run's only progression beat: three cards, one
          pick, and the next wave rolls the instant it lands */}
      {g && g.phase === "boon" && g.boonOffer && (
        <div className="battle-pause absolute inset-0 z-[75] flex items-center justify-center p-4" data-testid="boon-overlay">
          <div className="panel anim-pop w-[600px] max-w-full p-5" style={{ borderColor: "#3dff8e88" }}>
            <div className="text-center">
              <div className="text-[10px] font-bold tracking-[0.3em] text-[#3dff8e]">
                {save.hideWaveCleared ? <>GAUNTLET · NEXT BOON</> : <>WAVE <span className="num">{g.round}</span> CLEARED · GAUNTLET</>}
              </div>
              <div className="font-disp text-3xl text-[#3dff8e]">CHOOSE A BOON</div>
              <div className="mt-1 text-[11.5px] font-semibold text-[var(--dim)]">
                <span className="num">{g.boons.length}</span> banked this run · the next wave starts the moment you pick
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {g.boonOffer.map((b) => (
                <button
                  key={b.id}
                  data-testid={`boon-${b.id}`}
                  className="tile tile-hover flex flex-col items-center gap-1 p-3 text-center"
                  style={{ borderColor: b.color }}
                  onClick={() => {
                    sfx.click();
                    boonPickRef.current(b);
                  }}
                >
                  <span className="text-2xl leading-none" style={{ color: b.color, textShadow: `0 0 14px ${b.color}88` }}>
                    {b.glyph}
                  </span>
                  <span className="font-disp text-[15px] leading-tight" style={{ color: b.color }}>
                    {b.name}
                  </span>
                  <span className="text-[11px] font-semibold leading-snug text-[var(--txt)]/80">{b.desc}</span>
                </button>
              ))}
            </div>
            {g.boons.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-1" data-testid="boon-stack">
                <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--dim)]">BANKED</span>
                {g.boons.map((b, i) => (
                  <span
                    key={i}
                    className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                    style={{ color: b.color, background: b.color + "1a", border: `1px solid ${b.color}55` }}
                  >
                    {b.glyph} {b.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAUSE — the sim is held, the arena stays visible behind a light scrim */}
      {paused && g && !g.final && (
        <div className="battle-pause absolute inset-0 z-[80] flex items-center justify-center p-4" data-testid="pause-overlay">
          <div className="panel anim-pop w-[380px] max-w-full p-5 text-center" style={{ borderColor: "#35e0ff88" }}>
            <div className="font-disp text-3xl text-[#35e0ff]">PAUSED</div>
            <div className="mt-1 text-[12px] font-semibold text-[var(--dim)]">
              {mode === "gauntlet" ? "GAUNTLET" : mode === "endless" ? "ENDLESS" : mode === "hardcore" ? "HARDCORE" : mode === "superhardcore" ? "SUPER HARDCORE" : "BATTLE"} ·{" "}
              {isRunMode(mode) ? "ROUND" : "WAVE"} {g.round} ·{" "}
              <span className="num">{g.kills}</span> kills · <span className="num">{g.lives}</span> lives
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button
                className="btn btn-cyan py-2.5 text-[14px]"
                data-testid="resume-btn"
                onClick={() => {
                  sfx.click();
                  setPaused(false);
                }}
              >
                RESUME
              </button>
              <button
                className="btn py-2 text-[12px]"
                onClick={() => {
                  sfx.click();
                  setRunSpeed((s2) => (s2 === 1 ? 1.5 : s2 === 1.5 ? 2 : 1));
                }}
              >
                SPEED ×{runSpeed} → ×{runSpeed === 1 ? 1.5 : runSpeed === 1.5 ? 2 : 1}
              </button>
              <button
                className="btn btn-danger py-2 text-[12px]"
                data-testid="quit-btn"
                onClick={() => {
                  sfx.click();
                  onExit();
                }}
              >
                ABANDON RUN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM BAR — one fixed card per lineup tower *type*, not per instance.
          COMPACT: a 40px strip instead of a three-row card, so the arena keeps
          its height on a phone. The ascent button is the only tall element. */}
      {g && (
        <div className="ascent-strip flex shrink-0 items-stretch gap-1 overflow-x-auto px-1.5 pb-1" data-testid="ascent-bar">
          {lineupIds.map((id, i) => {
            const def = TOWER_BY_ID[id];
            const copies = g.towers.filter((x) => x.def.id === id);
            const lead = copies[0];
            const bLv = lead ? lead.bLv : 1;
            const pts = lead ? Math.max(...copies.map((x) => x.points)) : 0;
            const maxed = !!lead && bLv >= MAX_BATTLE_LEVEL;
            const ascentCost = lead ? ascSpCost(Math.max(0, lead.bLv - 1)) : ASC_BASE_COST;
            const canAscend = !!lead && !maxed && g.sp >= ascentCost;
            const rc = RARITY[def.rarity];
            return (
              <div
                key={id}
                data-slot={i}
                data-tower={id}
                className="tile ascent-slot flex min-w-0 flex-1 items-center gap-1 px-1 py-0.5"
                style={{ opacity: lead ? 1 : 0.4, borderColor: lead ? rc.color : undefined }}
              >
                <TowerIcon def={def} size={16} />
                <div className="min-w-0 flex-1 leading-none">
                  <div className="truncate text-[9.5px] font-bold" style={{ color: rc.color }}>
                    {def.name}
                  </div>
                  <div className="flex items-center gap-x-1 whitespace-nowrap text-[8.5px] font-bold">
                    <span className="text-[var(--dim)]">Lv {bLv}/{MAX_BATTLE_LEVEL}</span>
                    <span style={{ color: ptColor(pts) }}>{pts >= MAX_POINTS ? "MAX" : `${pts}p`}</span>
                    {copies.length > 1 && <span className="text-[#7fe9ff]">×{copies.length}</span>}
                  </div>
                </div>
                <button
                  data-testid={`ascend-${i}`}
                  disabled={!canAscend}
                  onClick={() => {
                    if (!lead) {
                      sfx.error();
                      push(`${def.name} isn't on the board yet`, "#ff4d5e");
                      return;
                    }
                    if (!canAscend) {
                      sfx.error();
                      push(maxed ? `${def.name} is already maxed` : "Not enough SP", "#ff4d5e");
                      return;
                    }
                    ascendTower(lead.uid);
                  }}
                  className={`ascend-btn ascend-btn-compact shrink-0 ${canAscend ? "on" : ""}`}
                  title={lead ? `Ascend ${def.name} family for ${ascentCost} SP · cost scales with this family’s battle level` : `${def.name} is not deployed`}
                >
                  {!lead ? (
                    "NOT DEPLOYED"
                  ) : maxed ? (
                    "MAX LEVEL"
                  ) : (
                    <>
                      <span>ASCENT</span>
                      <b>{ascentCost}{copies.length > 1 ? `×${copies.length}` : ""}</b>
                    </>
                  )}
                </button>
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
          mode={mode}
          gold={g.gold}
          bought={g.shopBought}
          onBuy={(item) => shopRef.current(item)}
          onClose={() => setShopOpen(false)}
        />
      )}

      {/* BOSS CUTSCENE — the wave holds while the boss makes an entrance */}
      {/* hero ultimate banner — slides in, holds, and tracks the cast phases */}
      {g?.skill && (
        <div className="pointer-events-none absolute inset-x-0 top-[18%] z-[60] flex flex-col items-center" data-testid="skill-banner">
          <div
            className="skill-banner relative px-8 py-2"
            style={{
              borderColor: g.skill.color,
              background: `linear-gradient(90deg, transparent, ${g.skill.color}33 20%, ${g.skill.color}55 50%, ${g.skill.color}33 80%, transparent)`,
            }}
          >
            <span className="skill-banner-sweep absolute inset-0" />
            <span
              className="font-disp relative block text-center text-[34px] leading-none tracking-wide"
              style={{ color: "#fff", textShadow: `0 0 10px ${g.skill.color}, 0 0 34px ${g.skill.color}, 0 2px 0 #000` }}
            >
              {g.skill.name}
            </span>
          </div>
          <div
            key={g.skill.phase}
            className="skill-phase mt-2 text-[13px] font-bold tracking-[0.42em]"
            style={{ color: g.skill.color2, textShadow: `0 0 12px ${g.skill.color}` }}
          >
            {g.skill.phase}
          </div>
          <div className="skill-bar mt-2" style={{ borderColor: g.skill.color + "66" }}>
            <span
              className="skill-bar-fill"
              style={{
                width: `${Math.min(100, (g.skill.t / g.skill.total) * 100)}%`,
                background: `linear-gradient(90deg, ${g.skill.color}, #fff)`,
              }}
            />
          </div>
        </div>
      )}

      {g?.cut && (
        <div
          data-testid="boss-cutscene"
          role="dialog"
          aria-modal="true"
          aria-labelledby="boss-cutscene-title"
          tabIndex={-1}
          className="boss-cutscene-overlay absolute inset-0 z-[98] flex items-center justify-center overflow-hidden p-3"
          onKeyDown={(e) => {
            if (e.key === "Escape" && g) { g.cut = null; sfx.bossSkip(); }
          }}
        >
          <div className="boss-backdrop absolute inset-0" />
          {/* COMPACT CUTSCENE: one landscape card, portrait on the left, all the
              numbers on the right. It never covers the whole arena and it never
              needs a scroll bar, so the fight starts from a calm screen. */}
          <div className="boss-cut-card relative w-[min(620px,96%)] overflow-hidden rounded-2xl">
            <div className="boss-cut-scan" />
            <div className="boss-cut-stripe" style={{ background: `linear-gradient(90deg, ${ENEMY_TYPES[g.cut.type].color}, transparent)` }} />
            <div className="relative flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
              <div className={`boss-cut-portrait boss-cut-portrait-sm ${g.cut.locked ? "locked" : ""}`}>
                <div className="boss-cut-portrait-glow" style={{ background: `radial-gradient(circle, ${ENEMY_TYPES[g.cut.type].color}88, transparent 68%)` }} />
                <BossPortrait type={g.cut.type} />
              </div>
              <div className="relative min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="boss-cut-warn text-[10px] font-bold tracking-[0.42em] text-[#ffcf4d]">WARNING</span>
                  <span className="h-px flex-1 bg-gradient-to-r from-[#ffcf4d88] to-transparent" />
                  <span className="boss-cut-count boss-cut-count-sm" aria-hidden="true">
                    {g.cut.locked ? "!" : Math.max(1, Math.ceil(g.cut.t))}
                  </span>
                </div>
                <div
                  id="boss-cutscene-title"
                  className="font-disp boss-cut-name truncate text-2xl leading-tight sm:text-3xl"
                  style={{ color: ENEMY_TYPES[g.cut.type].color, textShadow: `0 0 24px ${ENEMY_TYPES[g.cut.type].color}` }}
                >
                  {g.cut.name.toUpperCase()}
                </div>
                <div className="boss-cut-title truncate text-[10.5px] font-bold tracking-[0.22em] text-[#ff9be9]">
                  {ENEMY_TYPES[g.cut.type].title.toUpperCase()} · {g.cut.sub}
                </div>
                {/* live stat readout, compacted into one line */}
                <div className="boss-cut-stats mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] font-bold">
                  <span className="text-[var(--dim)]">HEALTH <span className="num" style={{ color: "#ff8f9a" }}>×{(ENEMY_TYPES[g.cut.type].hpMul * BOSS_HP_MUL).toFixed(1)}</span></span>
                  <span className="text-[var(--dim)]">ARMOUR <span className="num text-[#8fb0ff]">{Math.round(ENEMY_TYPES[g.cut.type].armor * 100)}%</span></span>
                  <span className="text-[var(--dim)]">LIVES <span className="num text-[#ff4d5e]">{ENEMY_TYPES[g.cut.type].lives}</span></span>
                  <span className="text-[var(--dim)]">BOUNTY <span className="num text-[#ffcf4d]">{ENEMY_TYPES[g.cut.type].gold}</span></span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {bossKit(g.cut.type).map((id, i) => {
                    const sk = BOSS_SKILL_BY_ID[id];
                    return (
                      <span
                        key={id}
                        className="boss-chip boss-chip-cut"
                        style={{ borderColor: `${sk.color}88`, color: sk.color, background: "rgba(0,0,0,0.45)", animationDelay: `${i * 70}ms` }}
                      >
                        <i className="boss-chip-glyph">{sk.glyph}</i>
                        {sk.name}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-cyan px-3 py-1.5 text-[11px]"
                    aria-label="Skip boss cutscene"
                    onClick={() => { sfx.bossSkip(); if (g) g.cut = null; }}
                  >
                    SKIP BOSS INTRO
                  </button>
                  <button
                    type="button"
                    className="btn px-2.5 py-1.5 text-[10.5px] text-[var(--dim)]"
                    data-testid="boss-cut-auto-skip"
                    onClick={() => {
                      sfx.uiTab();
                      mutateRef.current((save) => { save.autoSkipBossCut = true; });
                      toastRef.current("Boss cutscenes will be skipped from now on", "#7ce7ff");
                      if (gRef.current) gRef.current.cut = null;
                    }}
                  >
                    ALWAYS SKIP
                  </button>
                  <span className="ml-auto text-[10px] font-bold tracking-[0.2em] text-[var(--dim)]">
                    {g.cut.locked ? <b style={{ color: "#ff4d5e" }}>ENGAGED</b> : "CUTSCENE"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

            {/* GAME OVER — a staged results screen: the verdict stamps in, the salvage
          list ticks in row by row, then one button banks it. */}
      {g?.final && (
        <div className="gameover" data-testid="game-over">
          <div className="gameover-bg" />
          <div className={"gameover-card " + (g.final.won ? "won" : "lost") + (!isRunMode(mode) ? " endless" : "")}>
            <div className="gameover-rays" />
            <div className="gameover-head">
              <div className="gameover-eyebrow">
                {mode === "sandbox" ? "SANDBOX" : mode === "gemrush" ? "SUNDAY GEM RUSH" : mode === "gauntlet" ? "GAUNTLET RUN" : mode === "endless" ? "ENDLESS RUN" : mode === "hardcore" ? "HARDCORE RUN" : mode === "superhardcore" ? "SUPER HARDCORE RUN" : g.final.won ? "THE RIFT CLOSED" : "THE LINE BROKE"}
              </div>
              <div className="gameover-title">
                {mode === "sandbox" ? "TEST RUN OVER" : mode === "gemrush" ? "GEM RUSH OVER" : mode === "gauntlet" ? "RUN OVER" : mode === "endless" ? "RUN OVER" : mode === "hardcore" || mode === "superhardcore" ? (g.final.won ? "VICTORY" : "DEFEAT") : g.final.won ? "VICTORY" : "DEFEAT"}
              </div>
              <div className="gameover-sub">
                {mode === "gemrush" ? `SURVIVED ${String(Math.floor((GEM_RUSH_SECONDS - g.gemRushRemaining) / 60)).padStart(2, "0")}:${String(Math.floor((GEM_RUSH_SECONDS - g.gemRushRemaining) % 60)).padStart(2, "0")}` : !isRunMode(mode) ? "REACHED WAVE " + g.final.rounds : g.final.won ? "THE LINE HELD" : "FELL ON ROUND " + g.round} ·{" "}
                <span className="num">{g.kills.toLocaleString("en-US")}</span> KILLS ·{" "}
                <span className="num">{g.crits.toLocaleString("en-US")}</span> CRITS
              </div>
            </div>

            <div className="gameover-stats">
              <div className="gameover-stat">
                <span>BIGGEST HIT</span>
                <b className="num">{g.bestHit.toLocaleString("en-US")}</b>
              </div>
              <div className="gameover-stat">
                <span>WAVES CLEARED</span>
                <b className="num">{g.final.rounds}</b>
              </div>
              <div className="gameover-stat">
                <span>TOWERS BUILT</span>
                <b className="num">{g.towers.length}</b>
              </div>
              <div className="gameover-stat">
                <span>BEST HIT TIER</span>
                <b className="num" style={{ color: "#ffd23f" }}>{g.crits > 0 ? Math.min(4, 1 + Math.floor(g.bestHit / Math.max(1, g.bestHit * 0.35))) : 0}</b>
              </div>
            </div>

            <div className="gameover-rewards" data-testid="game-over-rewards">
              <div className="gameover-rewards-title">SALVAGED FROM THE RUN</div>
              {endRows(g.final).map((r, i) => (
                <div key={r.label} className="gameover-row" style={{ animationDelay: 0.1 + i * 0.08 + "s" }}>
                  <span className="gameover-row-icon">{r.icon}</span>
                  <span className="gameover-row-label">{r.label}</span>
                  <b className="num" style={{ color: r.color }}>
                    {r.val}
                  </b>
                </div>
              ))}
              {endRows(g.final).length === 0 && (
                <div className="gameover-row">
                  <span className="gameover-row-label text-[var(--dim)]">Nothing recovered from this run.</span>
                </div>
              )}
            </div>

            <div className="gameover-actions">
              <button className="btn btn-gold flex-1 py-3 text-[15px]" data-testid="game-over-collect" onClick={collect}>
                {mode === "gemrush" ? `CLAIM ${g.final.gems.toLocaleString()} GEMS & RETURN` : "COLLECT & RETURN"}
              </button>
            </div>
            <div className="gameover-note">
              {mode === "gemrush"
                ? `${g.final.gems.toLocaleString()} gems are ready to claim — 50 per normal kill, 250 per elite, 500 per boss.`
                : mode === "gauntlet"
                ? "The gauntlet never ends — it only pays deeper. Stack boons and go again."
                : mode === "endless"
                ? "Endless pays on depth — the further you pushed, the richer the salvage."
                : g.final.won
                  ? "Win streaks raise your trophy stake for the next run."
                  : "Trophies dip on a loss — level your towers and try again."}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/** in-battle shop: spends the gold banked during this run */
function RunShop({
  mode,
  gold,
  bought,
  onBuy,
  onClose,
}: {
  mode: GameMode;
  gold: number;
  bought: Record<string, number>;
  onBuy: (item: RunShopItem) => void;
  onClose: () => void;
}) {
  return (
    <ViewportPortal>
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="panel anim-pop max-h-[88dvh] w-[min(560px,94vw)] overflow-y-auto scroll-thin p-3 sm:p-5" data-testid="run-shop">
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
          {RUN_SHOP.filter((item) => mode !== "superhardcore" || item.id !== "life").map((item) => {
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
    </ViewportPortal>
  );
}

/** a big flat silhouette of a boss, for the cutscene — pure SVG so it scales crisply */
function BossPortrait({ type }: { type: number }) {
  const et = ENEMY_TYPES[type];
  const c = et.color;
  const a = et.accent;
  const sh = et.shade;
  return (
    <svg width={190} height={190} viewBox="-100 -100 200 200" className="relative">
      <defs>
        <radialGradient id="bp-core" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor={a} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      {/* silhouette per shape — kept deliberately chunky so it reads at a glance */}
      {et.shape === "titan" && (
        <g stroke={sh} strokeWidth={3}>
          <path d="M-78-58 H78 L62 22 Q0 72 -62 22 Z" fill={c} />
          <path d="M-66-40 H66 M-58-16 H58 M-50 8 H50" stroke={a} strokeWidth={3} fill="none" opacity={0.7} />
          <circle r={30} fill="url(#bp-core)" />
          <rect x={-58} y={-82} width={44} height={26} rx={4} fill={sh} />
          <rect x={14} y={-82} width={44} height={26} rx={4} fill={sh} />
          <rect x={-28} y={-104} width={56} height={38} rx={6} fill={c} />
          <rect x={-20} y={-94} width={40} height={9} rx={3} fill="#ffffff" />
          <path d="M-44 30 L-58 74 M44 30 L58 74" stroke={sh} strokeWidth={9} strokeLinecap="round" />
        </g>
      )}
      {et.shape === "overlord" && (
        <g stroke={sh} strokeWidth={3}>
          <path d="M0-88 L52-30 L34 62 L0 84 L-34 62 L-52-30 Z" fill={c} />
          <path d="M0-70 L34-26 L22 48 L0 64 L-22 48 L-34-26 Z" fill={a} opacity={0.55} />
          <circle r={22} fill="url(#bp-core)" />
          <path d="M-40-96 L-26-118 L-12-92 M40-96 L26-118 L12-92 M0-108 L0-128" stroke={a} strokeWidth={5} fill="none" strokeLinecap="round" />
        </g>
      )}
      {et.shape === "warlord" && (
        <g stroke={sh} strokeWidth={3}>
          <path d="M-56-52 H56 L46 44 Q0 66 -46 44 Z" fill={c} />
          <path d="M-44-30 H44" stroke={a} strokeWidth={4} />
          <path d="M-66-46 L-86-14 L-70 10" fill={sh} />
          <path d="M66-46 L86-14 L70 10" fill={sh} />
          <rect x={-30} y={-78} width={60} height={30} rx={5} fill={c} />
          <path d="M-20-64 H20" stroke="#ffffff" strokeWidth={6} strokeLinecap="round" />
          <path d="M-34 50 L-44 80 M34 50 L44 80" stroke={sh} strokeWidth={8} strokeLinecap="round" />
        </g>
      )}
      {et.shape === "knight" && (
        <g stroke={sh} strokeWidth={3}>
          <path d="M-48-40 H48 L40 40 Q0 58 -40 40 Z" fill={c} />
          <path d="M-34-20 H34 M-30 4 H30" stroke={a} strokeWidth={3} />
          <path d="M-56-44 L-72-6 L-58 10 Z" fill={sh} />
          <rect x={-26} y={-64} width={52} height={26} rx={4} fill={c} />
          <path d="M-18-52 H18" stroke="#ffffff" strokeWidth={5} strokeLinecap="round" />
        </g>
      )}
      {et.shape === "mage" && (
        <g stroke={sh} strokeWidth={3}>
          <path d="M0-84 L34-24 L26 54 Q0 70 -26 54 L-34-24 Z" fill={c} />
          <path d="M0-84 L20-30 L0 60 L-20-30 Z" fill={a} opacity={0.5} />
          <circle r={18} fill="url(#bp-core)" />
          <circle cx={0} cy={-40} r={6} fill="#ffffff" />
          <path d="M34-40 L54-70" stroke={sh} strokeWidth={5} strokeLinecap="round" />
          <circle cx={58} cy={-76} r={9} fill={a} />
        </g>
      )}
      {et.shape === "runner" && (
        <g stroke={sh} strokeWidth={3}>
          <path d="M-30-46 Q0-70 30-46 L40 26 Q0 58 -40 26 Z" fill={c} />
          <path d="M-40 26 L-70 48 L-34 42 M40 26 L70 48 L34 42" fill={sh} />
          <circle r={14} fill="url(#bp-core)" />
          <path d="M-18-52 L26-70" stroke={a} strokeWidth={5} strokeLinecap="round" />
        </g>
      )}
      {et.shape === "slime" && (
        <g stroke={sh} strokeWidth={3}>
          <path d="M-70 24 Q-58-72 0-72 Q58-72 70 24 Q40 56 0 56 Q-40 56 -70 24 Z" fill={c} />
          <circle cx={-22} cy={-24} r={11} fill="#ffffff" />
          <circle cx={22} cy={-24} r={11} fill="#ffffff" />
          <circle cx={-19} cy={-21} r={5} fill={sh} />
          <circle cx={25} cy={-21} r={5} fill={sh} />
          <circle cy={14} r={16} fill="url(#bp-core)" />
        </g>
      )}
      {et.shape === "herald" && (
        <g stroke={sh} strokeWidth={3}>
          {/* thunderhead */}
          <ellipse cy={62} rx={78} ry={17} fill="none" stroke={c} strokeWidth={4} opacity={0.5} />
          <ellipse cy={62} rx={52} ry={11} fill="none" stroke={a} strokeWidth={2} opacity={0.35} />
          {/* robe */}
          <path d="M-56 66 Q-46-26 0-58 Q46-26 56 66 Q0 88 -56 66 Z" fill={c} />
          {/* sigil */}
          <path d="M-8-24 L10 4 L-6 20 L12 48" stroke={a} strokeWidth={5} fill="none" strokeLinecap="round" />
          {/* hood */}
          <ellipse cy={-62} rx={32} ry={38} fill={sh} />
          <ellipse cy={-58} rx={21} ry={27} fill="#04121a" stroke="none" />
          <circle cx={-10} cy={-62} r={4.5} fill="#ffffff" stroke="none" />
          <circle cx={10} cy={-62} r={4.5} fill="#ffffff" stroke="none" />
          {/* storm halo */}
          <ellipse cy={-64} rx={56} ry={14} fill="none" stroke={c} strokeWidth={3} opacity={0.6} transform="rotate(-12)" />
          <ellipse cy={-64} rx={72} ry={19} fill="none" stroke={a} strokeWidth={2} opacity={0.35} transform="rotate(9)" />
          {/* fork */}
          <path d="M58-30 L44-6 L56 6 L42 34" stroke={a} strokeWidth={4} fill="none" strokeLinecap="round" />
        </g>
      )}
      {et.shape === "leviathan" && (
        <g stroke={sh} strokeWidth={3}>
          {/* rift pool */}
          <ellipse cy={64} rx={82} ry={20} fill="none" stroke={c} strokeWidth={4} opacity={0.55} />
          <ellipse cy={64} rx={58} ry={13} fill="none" stroke={a} strokeWidth={2} opacity={0.4} />
          {/* coiled body */}
          <ellipse cy={38} rx={56} ry={17} fill="none" stroke={sh} strokeWidth={18} strokeLinecap="round" />
          <ellipse cy={14} rx={38} ry={12} fill="none" stroke={c} strokeWidth={14} strokeLinecap="round" />
          {/* neck */}
          <path d="M-14 6 Q-24-42 0-64 Q24-42 14 6 Z" fill={c} />
          {/* head with an open maw */}
          <path d="M-30-58 Q0-96 30-58 Q0-38 -30-58 Z" fill={c} />
          <path d="M-18-58 L18-58 L0-30 Z" fill="#03211f" stroke="none" />
          {[-12, -6, 0, 6, 12].map((x, i) => (
            <path key={i} d={`M${x}-58 L${x + 3}-46 L${x + 6}-58 Z`} fill="#eafffb" stroke="none" />
          ))}
          {/* eyes */}
          <circle cx={-16} cy={-74} r={4.5} fill="#ffffff" stroke="none" />
          <circle cx={16} cy={-74} r={4.5} fill="#ffffff" stroke="none" />
          {/* dorsal fins */}
          <path d="M-34 2 L-58-10 L-34 18 Z" fill={a} />
          <path d="M-38 26 L-64 20 L-38 44 Z" fill={a} />
          <circle r={20} cy={-52} fill="url(#bp-core)" opacity={0.7} stroke="none" />
        </g>
      )}
    </svg>
  );
}

