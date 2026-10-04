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
  | "plasma";

export type GameMode = "battle" | "party" | "endless";

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
      desc: "When created by merging, fires blazing beams at enemies. Stronger in Party Mode.",
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
];

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

export interface EnemyType {
  name: string;
  color: string;
  hpMul: number;
  speed: number;
  r: number;
  armor: number;
  lives: number;
  gold: number;
}
export const ENEMY_TYPES: EnemyType[] = [
  { name: "Slime", color: "#5dff7a", hpMul: 1, speed: 55, r: 13, armor: 0, lives: 1, gold: 2 },
  { name: "Runner", color: "#ffd23f", hpMul: 0.55, speed: 118, r: 11, armor: 0, lives: 1, gold: 3 },
  { name: "Knight", color: "#8fb0ff", hpMul: 1.7, speed: 46, r: 16, armor: 0.35, lives: 2, gold: 4 },
  { name: "Mage", color: "#d06bff", hpMul: 1.25, speed: 52, r: 14, armor: 0.15, lives: 2, gold: 5 },
  { name: "Warlord", color: "#ff5d5d", hpMul: 15, speed: 34, r: 27, armor: 0.2, lives: 5, gold: 30 },
];

export function roundHp(round: number) {
  return 46 * Math.pow(HP_GROWTH, round - 1);
}

export function waveComp(round: number): number[] {
  const out: number[] = [];
  const n = Math.min(44, 6 + round * 2);
  for (let i = 0; i < n; i++) {
    let t = 0;
    const roll = Math.random();
    if (round >= 7 && roll < 0.18) t = 3;
    else if (round >= 5 && roll < 0.34) t = 2;
    else if (round >= 3 && roll < 0.62) t = 1;
    out.push(t);
  }
  // boss every 4th wave, and a second one once the waves get long
  if (round % 4 === 0) out.push(4);
  if (round >= 16 && round % 4 === 0) out.push(4);
  return out;
}

export const PARTY_ROUNDS = 15;
export const BATTLE_ROUNDS = 12;
/** Endless never stops; this is only used for display before the first wave. */
export const ENDLESS_ROUNDS = 0;

// ---------- heroes ----------
export type HeroKind = "nuke" | "freeze" | "burn" | "overdrive";

export interface HeroDef {
  id: string;
  name: string;
  color: string;
  cd: number;
  kind: HeroKind;
  desc: string;
}

export const HEROES: HeroDef[] = [
  {
    id: "nova",
    name: "Nova",
    color: "#ff4fd8",
    cd: 25,
    kind: "nuke",
    desc: "Screen-wide detonation: heavy damage and a brief stun on every enemy.",
  },
  {
    id: "glacier",
    name: "Glacier",
    color: "#35e0ff",
    cd: 30,
    kind: "freeze",
    desc: "Flash-freezes every enemy solid for 4s, then leaves them chilled and slowed.",
  },
  {
    id: "ember",
    name: "Ember",
    color: "#ff7a3d",
    cd: 30,
    kind: "burn",
    desc: "Ignites the whole field: heavy damage plus a long burning wound.",
  },
  {
    id: "overdrive",
    name: "Overdrive",
    color: "#3dff8e",
    cd: 35,
    kind: "overdrive",
    desc: "Supercharges every tower: +150% attack speed and +50% damage for 8s.",
  },
];

export const HERO_BY_ID: Record<string, HeroDef> = Object.fromEntries(
  HEROES.map((h) => [h.id, h])
);

export const OVERDRIVE_TIME = 8;
export const OVERDRIVE_ASPD = 1.5;
export const OVERDRIVE_DMG = 0.5;
/** chilled enemies take extra damage */
export const SLOW_VULN = 0.25;

export const CHESTS = [
  { id: "common", name: "Common Chest", cost: 40, gem: 0, color: "#9fb4c7", gold: [8, 20], frags: [1, 2] },
  { id: "silver", name: "Silver Chest", cost: 250, gem: 0, color: "#cfd8e6", gold: [30, 70], frags: [3, 5] },
  { id: "epic", name: "Epic Chest", cost: 20, gem: 1, color: "#c44dff", gold: [60, 140], frags: [5, 8] },
  { id: "legendary", name: "Legendary Chest", cost: 60, gem: 1, color: "#ffb324", gold: [150, 320], frags: [8, 12] },
] as const;

export const TEAMMATES = [
  { name: "Kael", color: "#35e0ff", tag: "Mage Slayer" },
  { name: "Mira", color: "#ff4fd8", tag: "Crit Queen" },
  { name: "Torin", color: "#3dff8e", tag: "Bulwark" },
];

export const CHAT_LINES = [
  "Save some SP for a summon!",
  "Nice shot!",
  "Merge when they match points!",
  "Watch the boss this round!",
  "My lineup is heating up!",
  "That burst was clean.",
  "Hold the corner cells.",
  "Points pulse = faster firing. Use it!",
];
