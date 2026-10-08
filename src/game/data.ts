export type Rarity = "normal" | "decent" | "epic" | "legendary";

export const RARITY: Record<Rarity, { name: string; color: string; glow: string }> = {
  normal: { name: "Normal", color: "#9fb4c7", glow: "rgba(159,180,199,0.4)" },
  decent: { name: "Decent", color: "#3fb6ff", glow: "rgba(63,182,255,0.5)" },
  epic: { name: "Epic", color: "#c44dff", glow: "rgba(196,77,255,0.55)" },
  legendary: { name: "Legendary", color: "#ffb324", glow: "rgba(255,179,36,0.6)" },
};

export const RARITY_ORDER: Rarity[] = ["normal", "decent", "epic", "legendary"];

export type TowerKind =
  | "arrow"
  | "cannon"
  | "ice"
  | "speaker"
  | "tesla"
  | "gatling"
  | "core"
  | "lightning"
  | "hellstorm"
  | "icestorm"
  | "plant"
  | "swarm"
  | "chrono"
  | "void"
  | "plasma"
  | "sling"
  | "flame"
  | "spike"
  | "boomer"
  | "toxin"
  | "axe"
  | "frost"
  | "mortar"
  | "laser"
  | "missile"
  | "dragon"
  | "sun";

export type GameMode = "battle" | "endless";

export interface AwkSpec {
  name: string;
  desc: string;
  chance: number[]; // per tier I..V
  mult: number[]; // effect magnitude per tier
  mult2?: number[]; // secondary magnitude per tier
}

export interface TowerDef {
  id: string;
  name: string;
  rarity: Rarity;
  kind: TowerKind;
  desc: string;
  target: "front" | "all" | "none";
  dmg: number;
  upDmg: number;
  ascDmg: number;
  rate: number;
  upRate: number;
  ascRate: number;
  aspd?: number;
  upAspd?: number;
  ascAspd?: number;
  aura?: boolean;
  atkAura?: number;
  upAtkAura?: number;
  ascAtkAura?: number;
  hpState?: number[]; // power plant threshold
  splash?: number;
  upSplash?: number;
  ascSplash?: number;
  freeze?: number;
  upFreeze?: number;
  ascFreeze?: number;
  chain?: number;
  upChain?: number;
  ascChain?: number;
  stun?: number;
  upStun?: number;
  ascStun?: number;
  fbChance?: number;
  upFb?: number;
  ascFb?: number;
  icChance?: number;
  upIc?: number;
  ascIc?: number;
  icPct?: number;
  upIcPct?: number;
  ascIcPct?: number;
  rapid?: boolean;
  exotic?: boolean;
  /** projectiles per volley (hits that many enemies at once) */
  multi?: number;
  /** bonus damage as a share of the target's max HP (0.05 = 5%) */
  pctHp?: number;
  upPctHp?: number;
  ascPctHp?: number;
  /** how many extra enemies a shot skewers */
  pierce?: number;
  upPierce?: number;
  ascPierce?: number;
  /** slow strength applied on hit / to nearby enemies (0.4 = 40% slower) */
  slow?: number;
  upSlow?: number;
  ascSlow?: number;
  slowDur?: number;
  slowAura?: number;
  /** burn applied on every hit, as a share of the shot's damage per second */
  burnPct?: number;
  upBurnPct?: number;
  ascBurnPct?: number;
  burnDur?: number;
  /** sp earned on every kill this tower lands (Mana Siphon style) */
  spGain?: number;
  /** extra damage per kill this tower has landed, capped (Scorching Hot style) */
  killStack?: number;
  /** canvas + icon art family (defaults to the tower kind) */
  art?: string;
  /** art tint, when a tower should not use its rarity colour on the art itself */
  accent?: string;
  awk1?: AwkSpec;
  awk2?: AwkSpec;
  unlockFrags: number;
}

export const TOWERS: TowerDef[] = [
  {
    id: "arrow", name: "Arrow", rarity: "normal", kind: "arrow", target: "front",
    desc: "Fires an arrow at the enemy. The arrow gains an attack speed buff.",
    dmg: 50, upDmg: 2, ascDmg: 7, rate: 0.5, upRate: 0.01, ascRate: 0.02,
    aspd: 0.3, upAspd: 0.05, ascAspd: 0.1, unlockFrags: 0,
  },
  {
    id: "cannon", name: "Cannon", rarity: "normal", kind: "cannon", target: "front",
    desc: "Fires a bomb shell. Explodes in 2m radius.",
    dmg: 100, upDmg: 4, ascDmg: 10, rate: 0.7, upRate: 0.01, ascRate: 0.02,
    splash: 30, upSplash: 3, ascSplash: 5, unlockFrags: 0,
  },
  {
    id: "ice", name: "Ice Cube", rarity: "normal", kind: "ice", target: "front",
    desc: "Fires a big ice cube. Chance to freeze the enemy for 3s.",
    dmg: 20, upDmg: 4, ascDmg: 13, rate: 1.2, upRate: 0.02, ascRate: 0.025,
    freeze: 0.1, upFreeze: 0.05, ascFreeze: 0.1, unlockFrags: 0,
  },
  {
    id: "speaker", name: "S-Speaker", rarity: "decent", kind: "speaker", target: "none",
    desc: "Buffs attack speed of surrounding towers (left / right / up / down). The bonus increases with tower points.",
    dmg: 0, upDmg: 0, ascDmg: 0, rate: 1, upRate: 0, ascRate: 0,
    aura: true, aspd: 0.03, upAspd: 0.01, ascAspd: 0.02, unlockFrags: 5,
  },
  {
    id: "tesla", name: "Tesla Coil", rarity: "decent", kind: "tesla", target: "front",
    desc: "Shoots an electrical bullet that chains damage to enemies.",
    dmg: 35, upDmg: 20, ascDmg: 10, rate: 0.8, upRate: 0.02, ascRate: 0,
    chain: 6, upChain: 4, ascChain: 8, unlockFrags: 8,
  },
  {
    id: "gatling", name: "Gatling", rarity: "epic", kind: "gatling", target: "front",
    desc: "Shoots a bullet. Every 5s activates rapid fire for 6s.",
    dmg: 180, upDmg: 40, ascDmg: 100, rate: 0.4, upRate: 0, ascRate: 0,
    aspd: 2.0, upAspd: 0.5, ascAspd: 0.25, rapid: true, unlockFrags: 12,
  },
  {
    id: "core", name: "Energy Core", rarity: "epic", kind: "core", target: "front",
    desc: "Fires a blue orb that pushes enemies back 3m, then stuns for 2s.",
    dmg: 10, upDmg: 2, ascDmg: 3, rate: 0.9, upRate: 0.03, ascRate: 0,
    stun: 2, upStun: 0.5, ascStun: 1, unlockFrags: 12,
  },
  {
    id: "lightning", name: "Lightning Princess", rarity: "legendary", kind: "lightning",
    target: "all",
    desc: "Strikes a lightning bolt to all enemies.",
    dmg: 400, upDmg: 0, ascDmg: 0, rate: 0.5, upRate: 0, ascRate: 0,
    aspd: 0.12, upAspd: 0.02, ascAspd: 0.03, exotic: true, unlockFrags: 15,
    awk1: {
      name: "Superbolt",
      desc: "Chance to strike a superbolt that deals far more damage and always crits.",
      chance: [0.08, 0.12, 0.16, 0.36, 0.48],
      mult: [2.5, 6, 24, 48, 72],
    },
    awk2: {
      name: "Lightning Restrike",
      desc: "When lightning strikes, chance to strike additional bolts at random enemies.",
      chance: [0.25, 0.4, 0.55, 0.75, 1],
      mult: [1, 1, 2, 2, 4],
      mult2: [3, 2, 4, 3, 8],
    },
  },
  {
    id: "hellstorm", name: "Hellstorm", rarity: "legendary", kind: "hellstorm", target: "front",
    desc: "Fires a fire bullet. Chance to fire a fireball: 250% more damage, always crits, 5m explosion.",
    dmg: 480, upDmg: 0, ascDmg: 0, rate: 0.75, upRate: 0.03, ascRate: 0,
    fbChance: 0.25, upFb: 0.05, ascFb: 0.025, exotic: true, unlockFrags: 15,
    awk1: {
      name: "Scorching Hot",
      desc: "On deploy: massive crit damage and +1% attack per kill (stacks to cap).",
      chance: [0, 0, 0, 0, 0],
      mult: [6, 12, 24, 48, 72],
      mult2: [2000, 4000, 8000, 12000, 16000],
    },
    awk2: {
      name: "Deafening Blaze",
      desc: "When created by merging, fires blazing beams at the strongest enemies on the field.",
      chance: [1, 1, 1, 1, 1],
      mult: [2, 4, 7, 10, 15],
      mult2: [1.2, 2.4, 3.6, 5.4, 7.2],
    },
  },
  {
    id: "icestorm", name: "Icestorm", rarity: "legendary", kind: "icestorm", target: "front",
    desc: "Fires an ice bullet. Chance to fire an icicle that cuts 40% of the enemy's current HP.",
    dmg: 720, upDmg: 0, ascDmg: 0, rate: 0.75, upRate: 0.03, ascRate: 0,
    icChance: 0.45, upIc: 0.075, ascIc: 0.025, icPct: 0.4, upIcPct: 0.025, ascIcPct: 0.04,
    unlockFrags: 15,
  },
  {
    id: "plant", name: "Power Plant", rarity: "legendary", kind: "plant", target: "none",
    desc: "Buffs surrounding towers' attack speed by tower points. 4 / 6 / 8 / 12 placed = High Performance (+50% bonus).",
    dmg: 0, upDmg: 0, ascDmg: 0, rate: 1, upRate: 0, ascRate: 0,
    aura: true, aspd: 0.03, upAspd: 0.01, ascAspd: 0.02,
    atkAura: 0.03, upAtkAura: 0.01, ascAtkAura: 0.02,
    hpState: [4, 6, 8, 12], unlockFrags: 15,
  },
  {
    id: "swarm", name: "Arcane Swarm", rarity: "decent", kind: "swarm", target: "front",
    desc: "Loose three homing bolts at once, at up to three different enemies.",
    dmg: 34, upDmg: 11, ascDmg: 0, rate: 0.85, upRate: 0.02, ascRate: 0,
    multi: 3, unlockFrags: 10,
  },
  {
    id: "chrono", name: "Chrono Spire", rarity: "epic", kind: "chrono", target: "front",
    desc: "Time field: slows enemies around it and chills whatever it hits. Slowed enemies take +25% damage.",
    dmg: 70, upDmg: 18, ascDmg: 0, rate: 0.95, upRate: 0.02, ascRate: 0,
    slow: 0.4, upSlow: 0.04, ascSlow: 0.03, slowDur: 3.5, slowAura: 210, unlockFrags: 14,
  },
  {
    id: "void", name: "Void Cannon", rarity: "epic", kind: "void", target: "front",
    desc: "Slow siege gun that shaves a share of the target's maximum HP on every hit.",
    dmg: 110, upDmg: 22, ascDmg: 0, rate: 1.7, upRate: 0.03, ascRate: 0,
    pctHp: 0.05, upPctHp: 0.009, ascPctHp: 0.014, unlockFrags: 16,
  },
  {
    id: "plasma", name: "Plasma Lance", rarity: "legendary", kind: "plasma", target: "front",
    desc: "Skewers a whole file of enemies with one lance.",
    dmg: 560, upDmg: 0, ascDmg: 0, rate: 0.95, upRate: 0.02, ascRate: 0,
    pierce: 3, upPierce: 1, ascPierce: 1, exotic: true, unlockFrags: 15,
    awk1: {
      name: "Overcharge",
      desc: "Chance to fire a supercharged lance that deals far more damage and always crits.",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [2, 5, 18, 40, 60],
    },
    awk2: {
      name: "Searing Path",
      desc: "Lances set enemies ablaze: chained burn damage over time on every enemy hit.",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },

  // ---------------------------------------------------------------
  // LegenDARY ARSENAL — 12 new towers: 5 normal, 3 decent, 2 epic, 2 legendary
  // ---------------------------------------------------------------
  {
    id: "sling", name: "Slingshot", rarity: "normal", kind: "sling", art: "sling", accent: "#ffd27f",
    target: "front",
    desc: "Snaps a stone at the front enemy three times a second. Cheap, quick, relentless.",
    dmg: 26, upDmg: 3, ascDmg: 9, rate: 0.3, upRate: 0.004, ascRate: 0.006,
    aspd: 0.4, upAspd: 0.06, ascAspd: 0.05, unlockFrags: 2,
  },
  {
    id: "flame", name: "Flamethrower", rarity: "normal", kind: "flame", art: "flame", accent: "#ff8c3d",
    target: "front",
    desc: "Coats the target in fire: 60% of the hit damage keeps burning for 4s.",
    dmg: 34, upDmg: 4, ascDmg: 11, rate: 0.55, upRate: 0.012, ascRate: 0.02,
    burnPct: 0.6, upBurnPct: 0.06, ascBurnPct: 0.08, burnDur: 4, unlockFrags: 3,
  },
  {
    id: "spike", name: "Spike Trap", rarity: "normal", kind: "spike", art: "spike", accent: "#c8d6e5",
    target: "front",
    desc: "Erupts under the front enemy, shredding everything packed around it.",
    dmg: 70, upDmg: 6, ascDmg: 16, rate: 0.9, upRate: 0.015, ascRate: 0.02,
    splash: 95, upSplash: 6, ascSplash: 8, unlockFrags: 4,
  },
  {
    id: "boomer", name: "Boomerang", rarity: "normal", kind: "boomer", art: "sling", accent: "#9fe8ff",
    target: "front",
    desc: "Hurls a blade that curves through the whole file of enemies.",
    dmg: 42, upDmg: 5, ascDmg: 14, rate: 0.6, upRate: 0.012, ascRate: 0.02,
    pierce: 3, upPierce: 1, ascPierce: 1, unlockFrags: 5,
  },
  {
    id: "toxin", name: "Toxic Sprayer", rarity: "normal", kind: "toxin", art: "flame", accent: "#8effc4",
    target: "front",
    desc: "Sprays a poison cloud that splashes on impact and rots the pack over time.",
    dmg: 20, upDmg: 2, ascDmg: 7, rate: 0.5, upRate: 0.01, ascRate: 0.015,
    splash: 70, upSplash: 5, ascSplash: 6,
    burnPct: 0.35, upBurnPct: 0.04, ascBurnPct: 0.05, burnDur: 5, unlockFrags: 6,
  },
  {
    id: "axe", name: "Axe Thrower", rarity: "decent", kind: "axe", art: "tube", accent: "#ff9d5c",
    target: "front",
    desc: "Spins a heavy axe that cuts through the front line and keeps going.",
    dmg: 105, upDmg: 16, ascDmg: 0, rate: 0.8, upRate: 0.018, ascRate: 0,
    pierce: 4, upPierce: 1, splash: 60, upSplash: 6, unlockFrags: 9,
  },
  {
    id: "frost", name: "Frost Spire", rarity: "decent", kind: "frost", art: "spike", accent: "#9fe8ff",
    target: "front",
    desc: "Deep chill field: slows everything nearby and locks its target in ice.",
    dmg: 62, upDmg: 10, ascDmg: 0, rate: 1, upRate: 0.02, ascRate: 0,
    freeze: 0.2, upFreeze: 0.03, ascFreeze: 0,
    slow: 0.35, upSlow: 0.03, slowDur: 3.2, slowAura: 190, unlockFrags: 11,
  },
  {
    id: "mortar", name: "Siege Mortar", rarity: "decent", kind: "mortar", art: "tube", accent: "#d0d6e0",
    target: "front",
    desc: "Lobs one enormous shell every two seconds. Huge crater, huge damage.",
    dmg: 340, upDmg: 45, ascDmg: 0, rate: 2, upRate: 0.04, ascRate: 0,
    splash: 230, upSplash: 14, ascSplash: 0, unlockFrags: 13,
  },
  {
    id: "laser", name: "Laser Cutter", rarity: "epic", kind: "laser", art: "beam", accent: "#ff4fd8",
    target: "front",
    desc: "Sustained beam that arcs to two more enemies. Fires four times a second.",
    dmg: 58, upDmg: 12, ascDmg: 0, rate: 0.25, upRate: 0.006, ascRate: 0,
    chain: 3, upChain: 1, ascChain: 0, unlockFrags: 14,
  },
  {
    id: "missile", name: "Missile Battery", rarity: "epic", kind: "missile", art: "tube", accent: "#ffd23f",
    target: "front",
    desc: "Launches four homing rockets at four different enemies. Every one pops.",
    dmg: 135, upDmg: 22, ascDmg: 0, rate: 1.15, upRate: 0.02, ascRate: 0,
    multi: 4, splash: 70, upSplash: 6, ascSplash: 0, unlockFrags: 16,
  },
  {
    id: "dragon", name: "Dragon's Maw", rarity: "legendary", kind: "dragon", art: "flame", accent: "#ff5d3d",
    target: "front",
    desc: "Devours the pack: colossal splash, a vicious burn, and it grows with every kill.",
    dmg: 820, upDmg: 0, ascDmg: 0, rate: 1.05, upRate: 0.02, ascRate: 0,
    splash: 240, upSplash: 12, ascSplash: 0,
    burnPct: 0.5, upBurnPct: 0.03, ascBurnPct: 0, burnDur: 4,
    killStack: 0.01, exotic: true, unlockFrags: 15,
    awk1: {
      name: "Inferno Roar",
      desc: "Chance to breathe a firestorm: far more damage, always crits, wider crater.",
      chance: [0.12, 0.18, 0.26, 0.42, 0.55],
      mult: [1.5, 3, 8, 20, 40],
    },
    awk2: {
      name: "Molten Carapace",
      desc: "Every kill stokes the Maw: +1% damage per kill, capped by tier.",
      chance: [1, 1, 1, 1, 1],
      mult: [1500, 2500, 4000, 6000, 8000],
    },
  },
  {
    id: "sun", name: "Sunforge", rarity: "legendary", kind: "sun", art: "beam", accent: "#ffb324",
    target: "all",
    desc: "Calls a solar flare down on every enemy at once and sets the field alight.",
    dmg: 300, upDmg: 0, ascDmg: 0, rate: 0.6, upRate: 0.02, ascRate: 0,
    burnPct: 0.3, upBurnPct: 0.03, ascBurnPct: 0, burnDur: 4, exotic: true, unlockFrags: 15,
    awk1: {
      name: "Supernova",
      desc: "Chance to detonate: the flare deals far more damage and always crits.",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 8, 20, 40],
    },
    awk2: {
      name: "Solar Wind",
      desc: "Chance to leave every enemy scorched, and the burn stacks with each flare.",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 3, 5, 8],
    },
  },
];

/** tower id -> art family used by the canvas + the menu icon */
export function towerArt(def: TowerDef): string {
  return def.art || def.id;
}

export const TOWER_BY_ID: Record<string, TowerDef> = Object.fromEntries(
  TOWERS.map((t) => [t.id, t])
);

export const ROMAN = ["", "I", "II", "III", "IV", "V"];

export const MAX_MENU_LEVEL = 15;
export const MAX_BATTLE_LEVEL = 6;
export const POINT_STEP = 0.25; // +25% attack speed per point
export const POINT_DMG_STEP = 0.3; // +30% damage per point
export const ASC_DMG_MUL = 1.55; // every battle level multiplies damage
export const MAX_POINTS = 8;
export const SP_BASE_COST = 120;
export const SP_COST_STEP = 75;

/**
 * Towers never earn points on their own — the only sources are the Point Surge
 * run-shop item and merging two equally-levelled towers.
 */

/** How many towers a run starts able to summon (paid for out of the starting SP). */
export const SPAWN_BUDGET_TOWERS = 4;

/** SP price of one summon, given how many summons were already bought this run. */
export function spCost(spend: number) {
  return SP_BASE_COST + SP_COST_STEP * spend;
}

/** Starting SP: exactly enough for `n` summons, so 4 towers deploy before wave 1. */
export function spawnBudget(n = SPAWN_BUDGET_TOWERS) {
  let total = 0;
  for (let i = 0; i < n; i++) total += spCost(i);
  return total;
}

/** Round-clear and end-of-run payouts are scaled by this (balance patch: +40%). */
export const REWARD_MUL = 1.4;
export const reward = (v: number) => Math.round(v * REWARD_MUL);

/** Enemies get 57% stronger every wave - the game's difficulty curve. */
export const HP_GROWTH = 1.57;

/**
 * Damage a tower deals per shot.
 * Menu levels add flat damage, battle levels multiply it, points multiply it again,
 * and aura buffs come in as `atkMul`. Growth is multiplicative so it can keep up
 * with the 1.57x enemy curve.
 */
export function towerDamage(
  def: TowerDef,
  menuLv: number,
  bLv: number,
  points: number,
  atkMul = 1
): number {
  const flat = def.dmg + def.upDmg * (menuLv - 1);
  return flat * Math.pow(ASC_DMG_MUL, Math.max(0, bLv - 1)) * (1 + POINT_DMG_STEP * points) * atkMul;
}

export function upgradeGoldCost(level: number) {
  return Math.round(50 * Math.pow(1.5, level - 1));
}
export function upgradeFragCost(level: number) {
  return 1 + Math.floor(level / 3);
}
export function ascentAllCost(avgLevel: number) {
  return Math.round(300 + 120 * avgLevel);
}
export function awakenCost(tier: number) {
  // tier 1 -> 5, each upgrade +50%
  return Math.round(20 * Math.pow(1.5, tier - 1));
}

// ---------- tower preview ----------
export interface StatRow {
  label: string;
  value: string;
  /** value after one more menu level */
  next?: string;
  /** change the next upgrade buys: "+4" or "-0.02" */
  delta?: string;
  /** which direction is good, used to colour the delta */
  better?: "up" | "down";
  /** true when the stat is already maxed and can never grow */
  maxed?: boolean;
}

const n1 = (v: number) => (Math.round(v * 100) / 100).toFixed(2).replace(/\.?0+$/, "") || "0";
const n0 = (v: number) => String(Math.round(v));
const pct = (v: number) => `${Math.round(v * 100)}%`;
const dText = (v: number, digits = 2) => `${v > 0 ? "+" : "-"}${Math.abs(v).toFixed(digits).replace(/\.?0+$/, "") || "0"}`;

/**
 * Every number the tower preview panel shows, together with the exact
 * change the next menu level buys (positive = better, negative = cheaper/faster).
 */
export function towerStatRows(def: TowerDef, menuLv: number, battleLv = 1): StatRow[] {
  const lv = Math.max(1, menuLv);
  const nxt = lv + 1;
  const at = (l: number, base: number | undefined, up: number | undefined) => (base || 0) + (up || 0) * (l - 1);
  const rows: StatRow[] = [];

  const dmg = (l: number) => def.dmg + def.upDmg * (l - 1);
  const rate = (l: number) => Math.max(0.05, def.rate - def.upRate * (l - 1));
  const bMul = Math.pow(ASC_DMG_MUL, Math.max(0, battleLv - 1));
  const dps = (l: number) => (dmg(l) * bMul) / rate(l);

  if (def.dmg > 0) {
    rows.push({
      label: "Damage",
      value: n0(dmg(lv) * bMul),
      next: n0(dmg(nxt) * bMul),
      delta: def.upDmg > 0 ? `+${n0(def.upDmg * bMul)}` : undefined,
      better: "up",
      maxed: def.upDmg === 0,
    });
    rows.push({
      label: "DPS",
      value: n1(dps(lv)),
      next: n1(dps(nxt)),
      delta: def.upDmg > 0 || def.upRate > 0 ? `+${n1(dps(nxt) - dps(lv))}` : undefined,
      better: "up",
    });
    rows.push({
      label: "Shot Interval",
      value: `${rate(lv).toFixed(2)}s`,
      next: def.upRate > 0 ? `${rate(nxt).toFixed(2)}s` : undefined,
      delta: def.upRate > 0 ? `${(rate(nxt) - rate(lv)).toFixed(2)}s` : undefined,
      better: "down",
      maxed: def.upRate === 0,
    });
    rows.push({
      label: "Battle Level Bonus",
      value: `x${bMul.toFixed(2)} dmg`,
      delta: `+${Math.round((ASC_DMG_MUL - 1) * 100)}% per ascent`,
      better: "up",
    });
  } else {
    rows.push({ label: "Attacks", value: "Support tower", better: "up" });
  }

  const special: [string, number, number, (v: number) => string][] = [];
  if (def.splash) special.push(["Splash Radius", def.splash, def.upSplash || 0, (v) => `${n0(v)}m`]);
  if (def.chain) special.push(["Chain Targets", def.chain, def.upChain || 0, n0]);
  if (def.pierce) special.push(["Pierce", def.pierce, def.upPierce || 0, (v) => `${n0(v)} enemies`]);
  if (def.multi) special.push(["Volley Targets", def.multi, 0, (v) => `${n0(v)} enemies`]);
  if (def.freeze) special.push(["Freeze Chance", def.freeze, def.upFreeze || 0, pct]);
  if (def.slow) special.push(["Slow", def.slow, def.upSlow || 0, pct]);
  if (def.slowAura) special.push(["Slow Field", def.slowAura, 0, (v) => `${n0(v)}m`]);
  if (def.stun) special.push(["Stun", def.stun, def.upStun || 0, (v) => `${n1(v)}s`]);
  if (def.pctHp) special.push(["Max-HP Shred", def.pctHp, def.upPctHp || 0, pct]);
  if (def.burnPct) special.push(["Burn (of hit dmg)", def.burnPct, def.upBurnPct || 0, pct]);
  if (def.burnDur) special.push(["Burn Duration", def.burnDur, 0, (v) => `${n1(v)}s`]);
  if (def.fbChance) special.push(["Fireball Chance", def.fbChance, def.upFb || 0, pct]);
  if (def.icChance) special.push(["Icicle Chance", def.icChance, def.upIc || 0, pct]);
  if (def.aspd) special.push(["Attack Speed Aura", def.aspd, def.upAspd || 0, pct]);
  if (def.atkAura) special.push(["Damage Aura", def.atkAura, def.upAtkAura || 0, pct]);
  if (def.killStack) special.push(["Damage per Kill", def.killStack, 0, pct]);

  for (const [label, base, up, fmt] of special) {
    const v = at(lv, base, up);
    const nv = at(nxt, base, up);
    rows.push({
      label,
      value: fmt(v),
      next: up > 0 ? fmt(nv) : undefined,
      delta: up > 0 ? dText(nv - v, Math.abs(nv - v) < 0.1 ? 3 : 2) : undefined,
      better: "up",
      maxed: up === 0,
    });
  }

  rows.push({
    label: "Points Bonus",
    value: `+${Math.round(POINT_DMG_STEP * 100)}% dmg / +${Math.round(POINT_STEP * 100)}% rate per point`,
    better: "up",
  });
  return rows;
}

// ---------- run shop (spend in-battle gold) ----------
export interface RunShopItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
  /** cost multiplier per purchase; absent = one-shot */
  step?: number;
  max: number;
}

export const RUN_SHOP: RunShopItem[] = [
  { id: "dmg", name: "Forged Ammo", desc: "+15% tower damage for the rest of the run", cost: 90, step: 1.35, max: 6 },
  { id: "aspd", name: "Quickspring", desc: "+12% attack speed for the rest of the run", cost: 90, step: 1.35, max: 6 },
  { id: "sp", name: "Mana Battery", desc: "Instantly gain 150 SP", cost: 60, step: 1.15, max: 8 },
  { id: "life", name: "Ward Stone", desc: "+3 lives for the rest of the run", cost: 140, step: 1.3, max: 5 },
  { id: "points", name: "Point Surge", desc: "+2 points on a random tower", cost: 130, step: 1.3, max: 5 },
  { id: "hero", name: "Hero Sigil", desc: "Reset your hero's cooldown right now", cost: 80, step: 1.2, max: 6 },
  { id: "ascend", name: "Ascension Scroll", desc: "Ascend a random tower to its next battle level", cost: 200, step: 1.35, max: 4 },
  { id: "meteor", name: "Meteor Strike", desc: "Smash every enemy on the field for 25% of its max HP", cost: 240, step: 1.4, max: 4 },
];

export function runShopCost(item: RunShopItem, bought: number) {
  return Math.round(item.cost * Math.pow(item.step ?? 1, bought));
}

export type EnemyShape = "slime" | "runner" | "knight" | "mage" | "warlord" | "overlord";

export interface EnemyType {
  name: string;
  /** short flavour line used by the bestiary and boss cut-ins */
  title: string;
  color: string;
  /** secondary colour used for plating, robes, cores */
  accent: string;
  /** darker tone for shading and outlines */
  shade: string;
  shape: EnemyShape;
  hpMul: number;
  speed: number;
  r: number;
  armor: number;
  lives: number;
  gold: number;
  /** how many legs/limbs the walk cycle animates */
  legs: number;
  /** animation rate multiplier for the walk/bob cycle */
  bobRate: number;
}

/**
 * Reworked enemy roster. Every entry now carries a full palette (base, accent,
 * shade) plus a `shape` tag that the renderer uses to pick a hand-drawn body,
 * so enemies read as distinct silhouettes instead of coloured polygons.
 */
export const ENEMY_TYPES: EnemyType[] = [
  {
    name: "Slime",
    title: "Rift Ooze",
    color: "#5dff7a",
    accent: "#c7ffd4",
    shade: "#0f7a33",
    shape: "slime",
    hpMul: 1,
    speed: 55,
    r: 13,
    armor: 0,
    lives: 1,
    gold: 2,
    legs: 0,
    bobRate: 1,
  },
  {
    name: "Runner",
    title: "Wisp Courier",
    color: "#ffd23f",
    accent: "#fff3b0",
    shade: "#9a6b00",
    shape: "runner",
    hpMul: 0.55,
    speed: 118,
    r: 11,
    armor: 0,
    lives: 1,
    gold: 3,
    legs: 2,
    bobRate: 2.2,
  },
  {
    name: "Knight",
    title: "Bulwark Knight",
    color: "#8fb0ff",
    accent: "#e6edff",
    shade: "#2a3f7a",
    shape: "knight",
    hpMul: 1.7,
    speed: 46,
    r: 16,
    armor: 0.35,
    lives: 2,
    gold: 4,
    legs: 2,
    bobRate: 0.8,
  },
  {
    name: "Mage",
    title: "Rift Adept",
    color: "#d06bff",
    accent: "#f3d6ff",
    shade: "#55198a",
    shape: "mage",
    hpMul: 1.25,
    speed: 52,
    r: 14,
    armor: 0.15,
    lives: 2,
    gold: 5,
    legs: 0,
    bobRate: 1.1,
  },
  {
    name: "Warlord",
    title: "Crimson Warlord",
    color: "#ff5d5d",
    accent: "#ffd0b0",
    shade: "#7a1020",
    shape: "warlord",
    hpMul: 15,
    speed: 34,
    r: 27,
    armor: 0.2,
    lives: 5,
    gold: 30,
    legs: 2,
    bobRate: 0.7,
  },
  {
    name: "Rift Overlord",
    title: "Sovereign of the Rift",
    color: "#7b2cff",
    accent: "#d7b4ff",
    shade: "#2d0a63",
    shape: "overlord",
    hpMul: 26,
    speed: 30,
    r: 31,
    armor: 0.28,
    lives: 8,
    gold: 65,
    legs: 0,
    bobRate: 0.6,
  },
];

/** types 4+ are bosses: they get a cutscene, a health bar and skills */
export const BOSS_TYPE = 4;
export const isBossType = (type: number) => type >= BOSS_TYPE;

export interface BossSkillRow {
  id: "summon" | "blink" | "enrage" | "ward";
  name: string;
  tell: string;
  color: string;
}

/** Skill kit shown on the boss bar and called out in the arena when it fires. */
export const BOSS_SKILLS: BossSkillRow[] = [
  { id: "summon", name: "Rift Call", tell: "calls minions through the rift", color: "#c44dff" },
  { id: "blink", name: "Void Step", tell: "blinks down the path", color: "#35e0ff" },
  { id: "ward", name: "Bulwark", tell: "shields itself for a moment", color: "#8fb0ff" },
  { id: "enrage", name: "Blood Frenzy", tell: "enrages below 45% health", color: "#ff4d5e" },
];

export const BOSS_SUMMON_CD = 11;
export const BOSS_BLINK_CD = 9;
export const BOSS_WARD_CD = 14;
export const BOSS_WARD_TIME = 3.4;
export const BOSS_ENRAGE_AT = 0.45;

export function roundHp(round: number) {
  return 46 * Math.pow(HP_GROWTH, round - 1);
}

export function waveComp(round: number): number[] {
  const out: number[] = [];
  // balance patch: two more enemies every wave, capped at 46
  const n = Math.min(46, 8 + round * 2);
  for (let i = 0; i < n; i++) {
    let t = 0;
    const roll = Math.random();
    if (round >= 7 && roll < 0.18) t = 3;
    else if (round >= 5 && roll < 0.34) t = 2;
    else if (round >= 3 && roll < 0.62) t = 1;
    out.push(t);
  }
  // boss every 4th wave, and a second one once the waves get long
  if (round % 4 === 0) out.push(round >= 16 ? 5 : 4);
  if (round >= 16 && round % 4 === 0) out.push(4);
  return out;
}

export const BATTLE_ROUNDS = 12;
/** Endless never stops; this is only used for display before the first wave. */
export const ENDLESS_ROUNDS = 0;

// ---------- heroes ----------
export type HeroKind = "nuke" | "freeze" | "burn" | "overdrive" | "thunder";

/** a single beat of a hero's cast timeline, used by the battle renderer */
export interface SkillPhase {
  /** seconds after the cast starts */
  at: number;
  label: string;
}

export interface HeroDef {
  id: string;
  name: string;
  color: string;
  /** secondary colour for the skill's effects */
  color2: string;
  cd: number;
  kind: HeroKind;
  desc: string;
  /** shown in the hero card once the ability is levelled up */
  scaling: string;
  /** the ultimate's display name */
  skillName: string;
  /** how long the cast sequence runs for */
  castTime: number;
  /** the beats of the cast, called out in the arena as it unfolds */
  phases: SkillPhase[];
  /** bullet list of exactly what the ultimate does */
  effects: string[];
}

/**
 * Reworked hero ultimates. Every skill is now a multi-phase, timeline-driven
 * sequence with a real secondary mechanic (singularity pull, shatter damage,
 * lava pools, time dilation, static marks) instead of a single instant hit.
 */
export const HEROES: HeroDef[] = [
  {
    id: "nova",
    name: "Nova",
    color: "#ff4fd8",
    color2: "#9d4bff",
    cd: 25,
    kind: "nuke",
    skillName: "SINGULARITY",
    castTime: 2.6,
    desc: "Tears open a singularity that drags the whole field into one point, then collapses it.",
    scaling: "+30% collapse damage and +0.12s pull per level",
    phases: [
      { at: 0, label: "RIFT OPENS" },
      { at: 0.5, label: "EVENT HORIZON" },
      { at: 1.9, label: "COLLAPSE!" },
    ],
    effects: [
      "Opens a singularity on the busiest stretch of lane",
      "Pulls every enemy toward it for 1.9s and holds them there",
      "Collapses for massive damage, scaled up by how many were caught",
      "Three meteors crash down during the pull",
    ],
  },
  {
    id: "glacier",
    name: "Glacier",
    color: "#35e0ff",
    color2: "#b9f4ff",
    cd: 30,
    kind: "freeze",
    skillName: "ABSOLUTE ZERO",
    castTime: 2.2,
    desc: "Encases the field in ice, then shatters it — the more health they are missing, the harder they break.",
    scaling: "+0.4s encase and +8% shatter damage per level",
    phases: [
      { at: 0, label: "FROST FRONT" },
      { at: 0.45, label: "ENCASED" },
      { at: 1.6, label: "SHATTER!" },
    ],
    effects: [
      "Flash-freezes and encases every enemy solid",
      "Encased enemies take +100% damage from all sources",
      "Shatter wave at the end scales with their missing health",
      "Leaves three frost zones that chill anything crossing them",
    ],
  },
  {
    id: "ember",
    name: "Ember",
    color: "#ff7a3d",
    color2: "#ffd23f",
    cd: 30,
    kind: "burn",
    skillName: "FIRESTORM",
    castTime: 2.8,
    desc: "Walks a meteor barrage down the lane and floods it with lava that keeps burning.",
    scaling: "+1 meteor and +30% burn damage per level",
    phases: [
      { at: 0, label: "SKY IGNITES" },
      { at: 0.35, label: "BARRAGE" },
      { at: 2.1, label: "LAVA FLOOD" },
    ],
    effects: [
      "Rains a walking meteor barrage along the whole path",
      "Each impact detonates for splash damage and stacks burn",
      "Leaves lava pools that keep burning anything standing in them",
      "Burn stacks now compound instead of overwriting",
    ],
  },
  {
    id: "overdrive",
    name: "Overdrive",
    color: "#3dff8e",
    color2: "#8effc4",
    cd: 35,
    kind: "overdrive",
    skillName: "TIME DILATION",
    castTime: 1.8,
    desc: "Slams the world into slow motion while every tower fires a free overcharged volley.",
    scaling: "+1s dilation and +1 free volley per level",
    phases: [
      { at: 0, label: "TIME FRACTURES" },
      { at: 0.4, label: "DILATION" },
      { at: 1.2, label: "FREE VOLLEY" },
    ],
    effects: [
      "Drops every enemy to 35% speed for the duration",
      "+150% attack speed and +50% damage on every tower",
      "Each tower fires a free overcharged volley at the strongest target",
      "Towers vent chrono-rings while the dilation holds",
    ],
  },
  {
    id: "thunder",
    name: "Thunder God",
    color: "#ffe14d",
    color2: "#fff6a8",
    cd: 20,
    kind: "thunder",
    skillName: "STORM SOVEREIGN",
    castTime: 2.4,
    desc: "A storm front walks the lane, marking everything it touches so deaths re-arc into the next target.",
    scaling: "+1 bolt, +1 chain and +25% damage per level",
    phases: [
      { at: 0, label: "STORM FRONT" },
      { at: 0.3, label: "BOLT WALK" },
      { at: 1.8, label: "SOVEREIGN STRIKE" },
    ],
    effects: [
      "A bolt front walks the full length of the lane",
      "Every bolt chains between everything within its radius",
      "Struck enemies are marked with static for 6s",
      "A marked enemy that dies re-arcs its static into nearby enemies",
    ],
  },
];

export const HERO_BY_ID: Record<string, HeroDef> = Object.fromEntries(
  HEROES.map((h) => [h.id, h])
);

// ---------- hero levelling ----------
export const HERO_MAX_LEVEL = 10;
/** gold needed to take a hero from `lv` to `lv + 1` */
export const heroUpgradeCost = (lv: number) => Math.round(120 * Math.pow(1.45, Math.max(0, lv - 1)));
/** every level adds 30% ability power (damage, burn, freeze/overdrive duration) */
export const heroPower = (lv: number) => 1 + 0.3 * (Math.max(1, lv) - 1);
/** and shaves 3% off the cooldown, down to a floor of 60% */
export const heroCooldown = (cd: number, lv: number) =>
  cd * Math.max(0.6, 1 - 0.03 * (Math.max(1, lv) - 1));

// ---------- daily rewards ----------
// ---------- chip modules ----------
/**
 * Chip modules are the crafting currency introduced with the event rotation.
 * Basic chips come from Support Chests and the Items Finding event, advanced
 * chips are rarer, and elite chips only drop from the weekly competition.
 */
export type ChipId = "basic" | "advanced" | "elite";

export interface ChipDef {
  id: ChipId;
  name: string;
  short: string;
  color: string;
  desc: string;
}

export const CHIPS: ChipDef[] = [
  { id: "basic", name: "Basic Chip Module", short: "Basic", color: "#8fe9ff", desc: "Standard arcane circuitry. Feeds tower ascension and guild crafting." },
  { id: "advanced", name: "Advanced Chip Module", short: "Advanced", color: "#c44dff", desc: "Refined lattice core. Worth five basic modules at the exchange." },
  { id: "elite", name: "Elite Chip Module", short: "Elite", color: "#ffb324", desc: "Competition-only module stamped by the arena marshals." },
];

export const CHIP_BY_ID: Record<ChipId, ChipDef> = Object.fromEntries(CHIPS.map((c) => [c.id, c])) as Record<ChipId, ChipDef>;

export type ChipBag = Partial<Record<ChipId, number>>;

// ---------- daily rewards ----------
/** Rewards roll over at 07:00 local time, not at midnight. */
export const DAILY_RESET_HOUR = 7;

export interface DailyReward {
  gold?: number;
  gems?: number;
  tokens?: number;
  frags?: number;
  /** fragment rarity, used when frags are granted */
  rarity?: Rarity;
  /** chests handed over already opened — their loot is rolled on claim */
  chests?: { id: string; n: number }[];
  /** chip modules granted directly */
  chips?: ChipBag;
  /** trophies granted directly */
  trophies?: number;
  label: string;
  /** which icon the calendar tile shows */
  icon: "gold" | "gem" | "token" | "frag" | "chest" | "chip";
  /** tile accent colour */
  accent: string;
}

/**
 * Seven day streak, claimable once per game-day (a game-day flips at 07:00).
 * Miss a day and the streak restarts from day 1.
 */
export const DAILY_REWARDS: DailyReward[] = [
  { gems: 1200, label: "1,200 gems", icon: "gem", accent: "#35e0ff" },
  { chests: [{ id: "silver", n: 1 }], label: "Silver Chest", icon: "chest", accent: "#cfd8e6" },
  { chests: [{ id: "legendary", n: 1 }], label: "Legendary Chest", icon: "chest", accent: "#ffb324" },
  { frags: 5, rarity: "legendary", label: "×5 legendary tower fragments", icon: "frag", accent: "#ffb324" },
  { gold: 25000, gems: 900, label: "25,000 gold + 900 gems", icon: "gold", accent: "#ffcf4d" },
  { chips: { basic: 5, advanced: 2 }, label: "×5 basic + ×2 advanced chips", icon: "chip", accent: "#c44dff" },
  { chests: [{ id: "legendary", n: 3 }], label: "×3 Legendary Chests", icon: "chest", accent: "#ffb324" },
];

// ---------- daily tasks ----------
export type TaskId = "play" | "win" | "kills" | "chests" | "upgrade" | "skill" | "spend" | "waves";

export interface DailyTask {
  id: TaskId;
  name: string;
  desc: string;
  /** how much progress completes it */
  need: number;
  /** task points awarded, which feed the milestone track */
  points: number;
  gold: number;
  gems: number;
  color: string;
}

/**
 * Eight objectives that reset with the 07:00 game-day. Completing them feeds a
 * shared task-point track with three milestone chests.
 */
export const DAILY_TASKS: DailyTask[] = [
  { id: "play", name: "Answer the Call", desc: "Finish any run", need: 3, points: 10, gold: 2500, gems: 40, color: "#8fb0ff" },
  { id: "win", name: "Hold the Line", desc: "Win a Battle run", need: 2, points: 20, gold: 6000, gems: 120, color: "#3dff8e" },
  { id: "waves", name: "Wave Breaker", desc: "Clear waves", need: 20, points: 15, gold: 4000, gems: 70, color: "#35e0ff" },
  { id: "kills", name: "Cull the Rift", desc: "Destroy enemies", need: 150, points: 15, gold: 4500, gems: 80, color: "#ff4d5e" },
  { id: "skill", name: "Hero's Moment", desc: "Unleash hero skills", need: 5, points: 10, gold: 2000, gems: 50, color: "#ff4fd8" },
  { id: "upgrade", name: "Arsenal Work", desc: "Upgrade towers or heroes", need: 4, points: 10, gold: 3000, gems: 60, color: "#ffcf4d" },
  { id: "chests", name: "Lockbreaker", desc: "Open chests", need: 3, points: 10, gold: 2500, gems: 55, color: "#c44dff" },
  { id: "spend", name: "Big Spender", desc: "Spend gold", need: 20000, points: 10, gold: 1500, gems: 90, color: "#ffb324" },
];

export const TASK_BY_ID: Record<TaskId, DailyTask> = Object.fromEntries(DAILY_TASKS.map((t) => [t.id, t])) as Record<
  TaskId,
  DailyTask
>;

export const TASK_POINTS_TOTAL = DAILY_TASKS.reduce((a, t) => a + t.points, 0);

export interface TaskMilestone {
  points: number;
  label: string;
  color: string;
  chests: { id: string; n: number }[];
  gems: number;
  chips: ChipBag;
}

/** the three chests on the daily task point track */
export const TASK_MILESTONES: TaskMilestone[] = [
  { points: 30, label: "Supply Cache", color: "#8fe9ff", chests: [{ id: "silver", n: 1 }], gems: 150, chips: { basic: 2 } },
  { points: 60, label: "War Cache", color: "#c44dff", chests: [{ id: "support", n: 1 }, { id: "epic", n: 1 }], gems: 400, chips: { basic: 3, advanced: 1 } },
  { points: TASK_POINTS_TOTAL, label: "Perfect Day", color: "#ffb324", chests: [{ id: "legendary", n: 2 }], gems: 1000, chips: { advanced: 3, elite: 1 } },
];

// ---------- weekly event rotation ----------
export type EventId = "luck" | "chestbox" | "trophy" | "items" | "mineshaft" | "lightning";

export interface GameEvent {
  id: EventId;
  name: string;
  /** 0 = Sunday … 6 = Saturday, matching Date#getDay */
  days: number[];
  tagline: string;
  desc: string;
  /** what the event actually changes in game */
  perk: string;
  color: string;
  icon: EventId;
}

/**
 * One event is live per weekday. Each one applies a real modifier through
 * `eventBonus()` below, so the rotation is more than flavour text.
 */
export const EVENTS: GameEvent[] = [
  {
    id: "luck",
    name: "Luck Hunting",
    days: [1],
    tagline: "Monday",
    desc: "The rift leaks fortune. Fragment rolls lean rare and every chest rolls one extra fragment.",
    perk: "+1 chest fragment · fragment rarity bias +0.25",
    color: "#3dff8e",
    icon: "luck",
  },
  {
    id: "chestbox",
    name: "Chest Box",
    days: [2],
    tagline: "Tuesday",
    desc: "The quartermaster is in a giving mood — every chest in the Shop is discounted.",
    perk: "-25% chest price · free Common Chest each day",
    color: "#ffcf4d",
    icon: "chestbox",
  },
  {
    id: "trophy",
    name: "Trophy Competition",
    days: [3],
    tagline: "Wednesday",
    desc: "Ladder day. Victories are worth more trophies and defeats cost you less.",
    perk: "+30 trophies on a win · defeats only cost 10",
    color: "#ff4fd8",
    icon: "trophy",
  },
  {
    id: "items",
    name: "Items Finding",
    days: [4],
    tagline: "Thursday",
    desc: "Salvage crews sweep the battlefield after every run and pull chip modules out of the wreck.",
    perk: "Battle victories drop 2 basic chips (+1 advanced on a boss wave)",
    color: "#8fe9ff",
    icon: "items",
  },
  {
    id: "mineshaft",
    name: "Mineshaft",
    days: [5, 6],
    tagline: "Friday & Saturday",
    desc: "The old gold seams under the arena are open. Everything you bank is worth more.",
    perk: "+60% gold from every run",
    color: "#ffb324",
    icon: "mineshaft",
  },
  {
    id: "lightning",
    name: "Survive Lightning",
    days: [0],
    tagline: "Sunday",
    desc: "Storm clouds sit over the arena. Enemies hit harder, but gems rain down on anyone who holds.",
    perk: "×2 gems from runs · +15% enemy health",
    color: "#c44dff",
    icon: "lightning",
  },
];

export const EVENT_BY_ID: Record<EventId, GameEvent> = Object.fromEntries(EVENTS.map((e) => [e.id, e])) as Record<
  EventId,
  GameEvent
>;

/** the event live on a given date (defaults to now) */
export function eventForDate(d: Date = new Date()): GameEvent {
  const day = d.getDay();
  return EVENTS.find((e) => e.days.includes(day)) || EVENTS[0];
}

export interface EventBonus {
  goldMul: number;
  gemMul: number;
  fragBias: number;
  chestFragBonus: number;
  chestPriceMul: number;
  trophyWin: number;
  trophyLoss: number;
  hpMul: number;
  chipDrop: ChipBag | null;
}

export const BASE_EVENT_BONUS: EventBonus = {
  goldMul: 1,
  gemMul: 1,
  fragBias: 0,
  chestFragBonus: 0,
  chestPriceMul: 1,
  trophyWin: 0,
  trophyLoss: 0,
  hpMul: 1,
  chipDrop: null,
};

/** numeric modifiers for the given event — the single source of truth for perks */
export function eventBonus(id: EventId): EventBonus {
  switch (id) {
    case "luck":
      return { ...BASE_EVENT_BONUS, fragBias: 0.25, chestFragBonus: 1 };
    case "chestbox":
      return { ...BASE_EVENT_BONUS, chestPriceMul: 0.75 };
    case "trophy":
      return { ...BASE_EVENT_BONUS, trophyWin: 30, trophyLoss: 10 };
    case "items":
      return { ...BASE_EVENT_BONUS, chipDrop: { basic: 2 } };
    case "mineshaft":
      return { ...BASE_EVENT_BONUS, goldMul: 1.6 };
    case "lightning":
      return { ...BASE_EVENT_BONUS, gemMul: 2, hpMul: 1.15 };
  }
}

// ---------- trophies & competition ----------
export const TROPHY_WIN = 70;
export const TROPHY_LOSS = 20;

export interface League {
  name: string;
  min: number;
  color: string;
}

/** Ladder tiers; the player's league is the highest one they clear. */
export const LEAGUES: League[] = [
  { name: "Copper", min: 0, color: "#c98b5e" },
  { name: "Iron", min: 350, color: "#9fb4c7" },
  { name: "Silver", min: 900, color: "#cfd8e6" },
  { name: "Gold", min: 1700, color: "#ffcf4d" },
  { name: "Crystal", min: 2800, color: "#35e0ff" },
  { name: "Arcane", min: 4200, color: "#c44dff" },
  { name: "Mythic", min: 6000, color: "#ff4fd8" },
  { name: "Rift Legend", min: 8500, color: "#ffb324" },
];

export function leagueFor(trophies: number): League {
  let out = LEAGUES[0];
  for (const l of LEAGUES) if (trophies >= l.min) out = l;
  return out;
}

export function nextLeague(trophies: number): League | null {
  return LEAGUES.find((l) => l.min > trophies) || null;
}

/** trophies gained (positive) or lost (negative) for a finished battle */
export function trophyDelta(won: boolean, bonus: EventBonus = BASE_EVENT_BONUS): number {
  return won ? TROPHY_WIN + bonus.trophyWin : -(TROPHY_LOSS - bonus.trophyLoss);
}

export interface CompetitionTier {
  /** minimum rank (1 = champion) needed for the payout */
  rank: number;
  label: string;
  gems: number;
  gold: number;
  chips: ChipBag;
  color: string;
}

/** Weekly competition payout table, read top-down until the rank fits. */
export const COMPETITION_TIERS: CompetitionTier[] = [
  { rank: 1, label: "Champion", gems: 2500, gold: 40000, chips: { elite: 3, advanced: 5 }, color: "#ffb324" },
  { rank: 3, label: "Top 3", gems: 1400, gold: 24000, chips: { elite: 1, advanced: 3 }, color: "#cfd8e6" },
  { rank: 10, label: "Top 10", gems: 700, gold: 12000, chips: { advanced: 2, basic: 6 }, color: "#c98b5e" },
  { rank: 25, label: "Top 25", gems: 300, gold: 5000, chips: { basic: 4 }, color: "#8fe9ff" },
  { rank: 50, label: "Top 50", gems: 120, gold: 2000, chips: { basic: 2 }, color: "#9fb4c7" },
];

export function competitionTier(rank: number): CompetitionTier | null {
  return COMPETITION_TIERS.find((t) => rank <= t.rank) || null;
}

/** Deterministic rival ladder so the standings do not reshuffle on every render. */
export interface Rival {
  name: string;
  trophies: number;
  guild: string;
}

const RIVAL_NAMES = [
  "Kaelthas", "Mirabel", "Torin", "Sable", "Volkan", "Nyx", "Rhen", "Ossian",
  "Petra", "Ilyana", "Dorn", "Yuki", "Castor", "Brann", "Vesper", "Lumen",
  "Hadrik", "Seren", "Oryx", "Talia", "Garruk", "Fenna", "Ziv", "Marek",
  "Aurel", "Thale", "Nadir", "Quill", "Rosk", "Idris", "Belka", "Corvin",
  "Dazhen", "Eiko", "Fjall", "Grim", "Halia", "Ivar", "Jorun", "Kesh",
  "Lyra", "Mogul", "Nessa", "Orin", "Pike", "Qara", "Riven", "Sten",
  "Tove", "Ulric", "Vanya", "Wrenn", "Xalia", "Ysolde", "Zarek", "Ardan",
  "Brisa", "Cael", "Delphi", "Eron",
];

const RIVAL_GUILDS = ["Arcane Vanguard", "Storm Callers", "Ember Pact", "Null Sigil", "Gilded Spiral"];

/** cheap 32-bit string hash so rival stats are stable per name + week */
function hash32(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/**
 * Build the weekly standings around the player. Rivals are seeded from the
 * week stamp so the board is stable for the whole week but refreshes on Monday.
 */
export function competitionBoard(playerTrophies: number, weekStamp: string, playerName = "You"): Rival[] {
  const rivals: Rival[] = RIVAL_NAMES.map((name, i) => {
    const r = hash32(`${name}:${weekStamp}`);
    const r2 = hash32(`${name}:${weekStamp}:g`);
    // spread rivals around the player so the ladder always feels competitive
    const spread = 1 - i / RIVAL_NAMES.length;
    const base = Math.round(playerTrophies * (0.45 + spread * 1.15) + (r - 0.5) * 420);
    return { name, trophies: Math.max(0, base), guild: RIVAL_GUILDS[Math.floor(r2 * RIVAL_GUILDS.length)] };
  });
  rivals.push({ name: playerName, trophies: playerTrophies, guild: "—" });
  return rivals.sort((a, b) => b.trophies - a.trophies);
}

export const OVERDRIVE_TIME = 8;
export const OVERDRIVE_ASPD = 1.5;
export const OVERDRIVE_DMG = 0.5;
/** chilled enemies take extra damage */
export const SLOW_VULN = 0.25;

export interface ChestDef {
  id: string;
  name: string;
  /** 0 = priced in gold, 1 = priced in gems */
  gem: 0 | 1;
  cost: number;
  color: string;
  gold: [number, number];
  frags: [number, number];
  /** chip modules rolled on open */
  chips?: { id: ChipId; min: number; max: number }[];
  /** hero shards rolled on open */
  heroShards?: [number, number];
  /** fragment rarity bias 0..1 */
  bias: number;
  blurb: string;
}

export const CHESTS: ChestDef[] = [
  { id: "common", name: "Common Chest", cost: 40, gem: 0, color: "#9fb4c7", gold: [8, 20], frags: [1, 2], bias: 0, blurb: "Cheap and cheerful." },
  { id: "silver", name: "Silver Chest", cost: 250, gem: 0, color: "#cfd8e6", gold: [30, 70], frags: [3, 5], bias: 0.15, blurb: "Steady fragment income." },
  {
    id: "support",
    name: "Support Chest",
    cost: 900,
    gem: 0,
    color: "#3dff8e",
    gold: [120, 260],
    frags: [1, 3],
    chips: [
      { id: "basic", min: 2, max: 5 },
      { id: "advanced", min: 0, max: 2 },
    ],
    bias: 0.1,
    blurb: "Chip modules for the workshop.",
  },
  {
    id: "hero",
    name: "Heroes Chest",
    cost: 35,
    gem: 1,
    color: "#ff4fd8",
    gold: [60, 150],
    frags: [0, 1],
    heroShards: [4, 9],
    bias: 0.3,
    blurb: "Hero shards — level heroes for free.",
  },
  { id: "epic", name: "Epic Chest", cost: 20, gem: 1, color: "#c44dff", gold: [60, 140], frags: [5, 8], bias: 0.45, blurb: "Epic-leaning fragments." },
  { id: "legendary", name: "Legendary Chest", cost: 60, gem: 1, color: "#ffb324", gold: [150, 320], frags: [8, 12], bias: 1, blurb: "Best odds at a legendary." },
];

export const CHEST_BY_ID: Record<string, ChestDef> = Object.fromEntries(CHESTS.map((c) => [c.id, c]));

// ---------- hero shards ----------
/** shards needed to push a hero one level, regardless of current level */
export const HERO_SHARD_COST = 12;

// ---------- guild ----------
export interface GuildDef {
  id: string;
  name: string;
  tag: string;
  members: number;
  power: number;
  trophyReq: number;
  color: string;
  motto: string;
  perk: string;
}

export const GUILDS: GuildDef[] = [
  {
    id: "vanguard",
    name: "Arcane Vanguard",
    tag: "AVG",
    members: 84,
    power: 12480,
    trophyReq: 0,
    color: "#ffb324",
    motto: "Hold the line, then move it forward.",
    perk: "+10% gold from Battle runs",
  },
  {
    id: "storm",
    name: "Storm Callers",
    tag: "STM",
    members: 61,
    power: 9310,
    trophyReq: 400,
    color: "#35e0ff",
    motto: "Thunder answers to us.",
    perk: "+1 gem per completed wave bracket",
  },
  {
    id: "ember",
    name: "Ember Pact",
    tag: "EMB",
    members: 47,
    power: 7050,
    trophyReq: 900,
    color: "#ff4d5e",
    motto: "Burn bright, burn everything.",
    perk: "+15% trophies on win streaks",
  },
  {
    id: "null",
    name: "Null Sigil",
    tag: "NUL",
    members: 93,
    power: 15870,
    trophyReq: 1800,
    color: "#c44dff",
    motto: "We unmake what the rift sends.",
    perk: "+2 basic chips per guild chest",
  },
];

export const GUILD_BY_ID: Record<string, GuildDef> = Object.fromEntries(GUILDS.map((g) => [g.id, g]));

export const GUILD_MAX_LEVEL = 20;
/** xp needed to go from `level` to `level + 1` */
export const guildXpFor = (level: number) => Math.round(400 * Math.pow(1.28, Math.max(0, level - 1)));

export function guildLevel(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let rest = Math.max(0, xp);
  while (level < GUILD_MAX_LEVEL && rest >= guildXpFor(level)) {
    rest -= guildXpFor(level);
    level++;
  }
  return { level, into: rest, need: level >= GUILD_MAX_LEVEL ? 0 : guildXpFor(level) };
}

export interface DonationTier {
  id: string;
  label: string;
  gold: number;
  xp: number;
  coins: number;
}

export const GUILD_DONATIONS: DonationTier[] = [
  { id: "small", label: "Supply Drop", gold: 500, xp: 60, coins: 25 },
  { id: "medium", label: "War Chest", gold: 2500, xp: 340, coins: 140 },
  { id: "large", label: "Relic Tribute", gold: 10000, xp: 1500, coins: 650 },
];

/** things guild coins buy at the guild store */
export interface GuildShopItem {
  id: string;
  name: string;
  coins: number;
  desc: string;
  color: string;
  grant: { gold?: number; gems?: number; tokens?: number; chips?: ChipBag; frags?: { n: number; rarity: Rarity } };
}

export const GUILD_SHOP: GuildShopItem[] = [
  { id: "gcoin-gold", name: "Bullion Crate", coins: 80, desc: "8,000 gold straight into the vault.", color: "#ffcf4d", grant: { gold: 8000 } },
  { id: "gcoin-gem", name: "Gem Pouch", coins: 150, desc: "450 gems from the guild treasury.", color: "#35e0ff", grant: { gems: 450 } },
  { id: "gcoin-chip", name: "Workshop Pallet", coins: 220, desc: "6 basic and 2 advanced chip modules.", color: "#c44dff", grant: { chips: { basic: 6, advanced: 2 } } },
  { id: "gcoin-frag", name: "Relic Shard Case", coins: 400, desc: "4 legendary tower fragments.", color: "#ffb324", grant: { frags: { n: 4, rarity: "legendary" } } },
  { id: "gcoin-token", name: "Token Satchel", coins: 260, desc: "12 Magic Tokens for awakenings.", color: "#ff4fd8", grant: { tokens: 12 } },
];

export interface GuildQuest {
  id: string;
  name: string;
  desc: string;
  need: number;
  xp: number;
  coins: number;
}

/** weekly guild war objectives, tracked against lifetime counters */
export const GUILD_QUESTS: GuildQuest[] = [
  { id: "runs", name: "Deployment Orders", desc: "Finish runs for the guild", need: 5, xp: 240, coins: 60 },
  { id: "wins", name: "Hold The Line", desc: "Win Battle runs", need: 3, xp: 420, coins: 110 },
  { id: "donate", name: "Quartermaster", desc: "Donate to the guild vault", need: 2, xp: 300, coins: 80 },
  { id: "chests", name: "Lockpicker", desc: "Open chests of any grade", need: 6, xp: 260, coins: 70 },
];

// ---------- gift codes ----------
/**
 * Gift codes are redeemed from Settings → Gift Codes. The key is what a player
 * types; matching ignores case, spaces and dashes, so "MAGIC-TD" and "magictd"
 * are the same code.
 *
 * Codes are intentionally NOT shipped by default — add your own rows to the
 * object below and they go live in the next build. `frags` rolls random towers
 * of the given rarity, `towers` grants named towers directly.
 */
export interface GiftCode {
  /** shown in the "code accepted" toast */
  label: string;
  gold?: number;
  gems?: number;
  tokens?: number;
  /** random tower fragments of a rarity */
  frags?: { rarity: Rarity; n: number };
  /** specific tower ids with a fragment count */
  towers?: { id: string; n: number }[];
}

export const GIFT_CODES: Record<string, GiftCode> = {
  // ── add your codes here, e.g. ─────────────────────────────────────────────
  // "LAUNCHDAY": { label: "Launch day cache", gold: 1000, gems: 10, tokens: 2 },
  // "THUNDER": { label: "Thunder God blessing", frags: { rarity: "epic", n: 4 }, gems: 3 },
  // ──────────────────────────────────────────────────────────────────────────
};

/** normalise player input so spacing / casing / dashes never matter */
export const normaliseCode = (raw: string) => raw.trim().toUpperCase().replace(/[\s_-]+/g, "");
