export type Rarity = "normal" | "decent" | "epic" | "legendary" | "mystical";

export const RARITY: Record<Rarity, { name: string; color: string; glow: string }> = {
  normal: { name: "Normal", color: "#9fb4c7", glow: "rgba(159,180,199,0.4)" },
  decent: { name: "Decent", color: "#3fb6ff", glow: "rgba(63,182,255,0.5)" },
  epic: { name: "Epic", color: "#c44dff", glow: "rgba(196,77,255,0.55)" },
  legendary: { name: "Legendary", color: "#ffb324", glow: "rgba(255,179,36,0.6)" },
  mystical: { name: "Mystical", color: "#ff315c", glow: "rgba(255,49,92,0.72)" },
};

export const RARITY_ORDER: Rarity[] = ["normal", "decent", "epic", "legendary", "mystical"];

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
  | "rime"
  | "siphon"
  | "quake"
  | "storm"
  | "plague"
  | "rail"
  | "reaper"
  | "prism"
  | "aegis"
  | "hellgate"
  | "nova"
  | "gravity"
  | "thundercrown"
  | "voidrip"
  | "furnace"
  | "maelstrom"
  | "starfall"
  | "chronolock"
  | "gravebloom"
  | "colossus"
  | "axe"
  | "frost"
  | "mortar"
  | "laser"
  | "missile"
  | "dragon"
  | "sun"
  | "clone"
  | "demon"
  | "heavenly"
  | "honor"
  | "supervisor"
  | "gale"
  | "bombardment"
  | "wildfire"
  | "hades"
  | "ion"
  | "aether"
  | "scythe"
  | "sandstorm"
  | "bloodstone"
  | "venom"
  | "eclipse"
  | "seraph";

export type GameMode = "battle" | "endless" | "gauntlet" | "gemrush" | "hardcore" | "superhardcore";

export interface ModeRules { hpMul: number; rewardMul: number; speedMul: number; lives: number | null; }
export const MODE_RULES: Record<GameMode, ModeRules> = {
  battle: { hpMul: 1, rewardMul: 1, speedMul: 1, lives: null },
  endless: { hpMul: 1, rewardMul: 1, speedMul: 1, lives: null },
  gauntlet: { hpMul: 1, rewardMul: 1, speedMul: 1, lives: null },
  gemrush: { hpMul: 1, rewardMul: 1, speedMul: 1, lives: null },
  hardcore: { hpMul: 10, rewardMul: 120, speedMul: 1.25, lives: null },
  superhardcore: { hpMul: 710, rewardMul: 720, speedMul: 1.75, lives: 1 },
};

/** HARDCORE is a campaign-shaped run (12 rounds) with brutal modifiers. */
export const isRunMode = (mode: GameMode) => mode === "battle" || mode === "hardcore" || mode === "superhardcore";

/** every enemy walks 20% faster than its data sheet, in every mode */
export const ENEMY_SPEED_MUL = 1.2;

// ---------- hardcore rules ----------
/** enemies spawn in pairs: two bodies per spawn slot */
export const HARDCORE_SPAWN_MUL = 2;
/** ten times the health of the same enemy in Battle */
export const HARDCORE_HP_MUL = 10;
/** Super Hardcore enemy-health multiplier. */
export const SUPER_HARDCORE_HP_MUL = 710;
/** rewards for Hardcore, as requested */
export const HARDCORE_REWARD_MUL = 120;
export const SUPER_HARDCORE_REWARD_MUL = 720;
export const HARDCORE_SPEED_MUL = 1.25;
export const SUPER_HARDCORE_SPEED_MUL = 1.75;
export const modeSpeedMul = (mode: GameMode) => mode === "hardcore" ? HARDCORE_SPEED_MUL : mode === "superhardcore" ? SUPER_HARDCORE_SPEED_MUL : 1;
/** the mode is a daily ladder: three attempts per calendar day */
export const HARDCORE_DAILY_PLAYS = 3;
export const HARDCORE_LIVES = 12;
/** enemies are immune to crits: crit chance and crit damage never apply */
export const HARDCORE_CRIT_IMMUNE = true;

/** the single source of truth for every hardcore modifier, used by Battle */
export const hardcoreEnemyHp = (base: number, mode: GameMode) =>
  base * (mode === "hardcore" ? HARDCORE_HP_MUL : mode === "superhardcore" ? SUPER_HARDCORE_HP_MUL : 1);
/** hardcore fields two bodies per slot, so the wave is doubled in place */
export const hardcoreSpawnPlan = (comp: number[], mode: GameMode) =>
  mode === "hardcore" ? comp.flatMap((type) => [type, type]) : comp;
/** every payout — gold, gems, potions, fragments, tokens — scales with this */
export const payoutMul = (mode: GameMode) => mode === "hardcore" ? HARDCORE_REWARD_MUL : mode === "superhardcore" ? SUPER_HARDCORE_REWARD_MUL : 1;
/** crits are rolled and applied only when the mode allows them */
export const critAllowed = (mode: GameMode) => !(mode === "hardcore" && HARDCORE_CRIT_IMMUNE);

/**
 * How an awakening behaves, so one implementation in the battle engine can
 * drive every tower's kit. Towers with a hand-written special still get first
 * say (lightning, plasma, dragon, sun, hellstorm, rail); everything else is
 * routed through these.
 */
export type AwkFx =
  | "heavy" // chance to fire a shot with far more damage
  | "critup" // chance to make the shot always crit
  | "volley" // chance to loose an extra shot at another enemy
  | "freeze" // chance to encase whatever it hits
  | "burn" // chance to leave a burn on whatever it hits
  | "chain" // chance to arc the hit into nearby enemies
  | "slow" // chance to chill whatever it hits
  | "splash" // chance to widen the blast
  | "sp" // bonus SP per kill
  | "bounty" // bonus gold per kill
  | "aura" // aura towers: stronger aura at all times
  | "execute" // instantly kill enemies under a share of their max HP
  | "leech" // heal lives back on kills
  | "quake" // chance to stun everything in the blast
  | "clonesuper" // Clone tower: chance to copy towers with any points + haste
  | "cloneperfect"; // Clone tower: chance the copy gains bonus points

export interface AwkSpec {
  name: string;
  desc: string;
  chance: number[]; // per tier I..VI
  mult: number[]; // effect magnitude per tier
  mult2?: number[]; // secondary magnitude per tier
  /** engine hook — absent means the tower has bespoke handling in Battle.tsx */
  fx?: AwkFx;
  /** bespoke kits describe their own tier line (share, seconds, points…) */
  fmt?: (mult: number, mult2: number | undefined) => string;
}

/**
 * Awakening factory. `chance` and `mult` are given as [tier I, tier V] pairs and
 * interpolated across the original five tiers, then extended to Tier VI for every tower.
 */
export function awking(
  name: string,
  fx: AwkFx,
  desc: string,
  chance: [number, number],
  mult: [number, number],
  mult2?: [number, number]
): AwkSpec {
  const spread = (pair: [number, number]) =>
    Array.from({ length: 5 }, (_, i) => {
      const v = pair[0] + ((pair[1] - pair[0]) * i) / 4;
      return Math.round(v * 1000) / 1000;
    });
  return {
    name,
    fx,
    desc,
    chance: spread(chance),
    mult: spread(mult),
    ...(mult2 ? { mult2: spread(mult2) } : {}),
  };
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
  /** bonus gold per kill this tower lands */
  goldGain?: number;
  /** aura towers: damage of a periodic pulse in radius, and how often it fires */
  pulse?: number;
  upPulse?: number;
  pulseRate?: number;
  /** shots that leave a burning pool on the ground where they land */
  lava?: boolean;
  /** active skill key (see skills.ts); the tower auto-casts it on a cooldown */
  skill?: string;
  /** Demon Execution: seconds between executioner strikes (base, un-awakened) */
  execCd?: number;
  /** Heavenly God: how many enemies behind the target the laser also burns */
  laserBehind?: number;
  /** Heavenly God: damage share the enemies behind the target take */
  laserBehindMul?: number;
  /** Heavenly God: bolts + points + attack surge handed out by a merge */
  mergeBolts?: number;
  mergePoints?: number;
  mergeBuff?: number;
  mergeBuffT?: number;
  /** Honor Emperor: dragging it onto a matching tower grows a point instead of merging */
  honor?: boolean;
  /** support towers: how far a pulse drags enemies back along the path */
  pull?: number;
  upPull?: number;
  /** armour shredded off whatever a shot hits (0.06 = -6% per hit) */
  shred?: number;
  upShred?: number;
  ascShred?: number;
  /** rocks a volley calls down on random enemies */
  meteors?: number;
  upMeteors?: number;
  /** radius a pulse or meteor hits, when it differs from the default */
  pulseRadius?: number;
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

    awk1: awking("Quick Draw", "volley",
      "Chance to loose a second arrow at the next enemy in line", [0.12, 0.5], [1, 1]),
    awk2: awking("Serrated Heads", "burn",
      "Arrows leave a bleeding wound that keeps damaging the target", [0.2, 0.65], [0.5, 2.2]),  },
  {
    id: "cannon", name: "Cannon", rarity: "normal", kind: "cannon", target: "front",
    desc: "Fires a bomb shell. Explodes in 2m radius.",
    dmg: 100, upDmg: 4, ascDmg: 10, rate: 0.7, upRate: 0.01, ascRate: 0.02,
    splash: 30, upSplash: 3, ascSplash: 5, unlockFrags: 0,

    awk1: awking("Heavy Shells", "heavy",
      "Chance to load a far heavier shell", [0.15, 0.55], [1, 5]),
    awk2: awking("Shrapnel Load", "splash",
      "The shell bursts wider and scatters burning shards", [0.2, 0.7], [0.4, 1.1]),  },
  {
    id: "ice", name: "Ice Cube", rarity: "normal", kind: "ice", target: "front",
    desc: "Fires a big ice cube. Chance to freeze the enemy for 3s.",
    dmg: 20, upDmg: 4, ascDmg: 13, rate: 1.2, upRate: 0.02, ascRate: 0.025,
    freeze: 0.1, upFreeze: 0.05, ascFreeze: 0.1, unlockFrags: 0,

    awk1: awking("Deep Freeze", "freeze",
      "Chance to encase the target in solid ice", [0.15, 0.6], [1.2, 2.4]),
    awk2: awking("Frostbite", "slow",
      "Ice bites deeper: hits chill for longer and harder", [0.25, 0.8], [0.2, 0.45]),  },
  {
    id: "speaker", name: "S-Speaker", rarity: "decent", kind: "speaker", target: "none",
    desc: "Buffs attack speed of surrounding towers (left / right / up / down). The bonus increases with tower points.",
    dmg: 0, upDmg: 0, ascDmg: 0, rate: 1, upRate: 0, ascRate: 0,
    aura: true, aspd: 0.03, upAspd: 0.01, ascAspd: 0.02, unlockFrags: 5,

    awk1: awking("War Anthem", "aura",
      "The attack-speed aura grows stronger with every tier", [1, 1], [0.5, 2.5]),
    awk2: awking("Resonance", "aura",
      "A second stack of aura that also lifts attack power", [1, 1], [0.3, 1.6]),  },
  {
    id: "tesla", name: "Tesla Coil", rarity: "decent", kind: "tesla", target: "front",
    desc: "Shoots an electrical bullet that chains damage to enemies.",
    dmg: 35, upDmg: 20, ascDmg: 10, rate: 0.8, upRate: 0.02, ascRate: 0,
    chain: 6, upChain: 4, ascChain: 8, unlockFrags: 8,

    awk1: awking("Ionised Air", "chain",
      "Chance to arc the bolt into two more enemies", [0.2, 0.7], [2, 6]),
    awk2: awking("Static Bloom", "heavy",
      "Chance to discharge a shot that hits far harder", [0.12, 0.5], [1, 4.5]),  },
  {
    id: "gatling", name: "Gatling", rarity: "epic", kind: "gatling", target: "front",
    desc: "Shoots a bullet. Every 5s activates rapid fire for 6s.",
    dmg: 180, upDmg: 40, ascDmg: 100, rate: 0.4, upRate: 0, ascRate: 0,
    aspd: 2.0, upAspd: 0.5, ascAspd: 0.25, rapid: true, unlockFrags: 12,

    awk1: awking("Drum Mag", "volley",
      "Chance to fire an extra round at a second target", [0.15, 0.6], [1, 1]),
    awk2: awking("Hollow Points", "critup",
      "Chance for a burst of rounds that always crits", [0.08, 0.35], [1, 1]),  },
  {
    id: "core", name: "Energy Core", rarity: "epic", kind: "core", target: "front",
    desc: "Fires a blue orb that pushes enemies back 3m, then stuns for 2s.",
    dmg: 10, upDmg: 2, ascDmg: 3, rate: 0.9, upRate: 0.03, ascRate: 0,
    stun: 2, upStun: 0.5, ascStun: 1, unlockFrags: 12,

    awk1: awking("Force Push", "quake",
      "The orb stuns everything caught in its wake", [0.2, 0.7], [0.6, 1.8]),
    awk2: awking("Reactor Vent", "chain",
      "Chance to vent a second orb at the nearest enemy", [0.18, 0.6], [1, 1]),  },
  {
    id: "lightning", name: "Lightning Princess", rarity: "legendary", kind: "lightning",
    target: "all",
    desc: "Strikes a lightning bolt to all enemies.",
    dmg: 400, upDmg: 0, ascDmg: 0, rate: 0.5, upRate: 0, ascRate: 0,
    aspd: 0.12, upAspd: 0.02, ascAspd: 0.03, exotic: true, unlockFrags: 1,
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
    fbChance: 0.25, upFb: 0.05, ascFb: 0.025, exotic: true, unlockFrags: 1,
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
    unlockFrags: 1,


    awk1: awking("Absolute Zero", "freeze",
      "Chance to encase the target solid in ice for several seconds", [0.15, 0.6], [1.5, 3.5]),
    awk2: awking("Glacial Shards", "chain",
      "Icicles splinter into the enemies packed around the target", [0.25, 0.8], [2, 5]),  },
  {
    id: "plant", name: "Power Plant", rarity: "legendary", kind: "plant", target: "none",
    desc: "A living reactor aura boosts adjacent towers' attack speed and damage; 4 / 6 / 8 / 12 Power Plants in the network amplify both buffs by +25 / +50 / +75 / +100%.",
    dmg: 0, upDmg: 0, ascDmg: 0, rate: 1, upRate: 0, ascRate: 0,
    aura: true, aspd: 0.03, upAspd: 0.01, ascAspd: 0.02,
    atkAura: 0.03, upAtkAura: 0.01, ascAtkAura: 0.02,
    hpState: [4, 6, 8, 12], unlockFrags: 1,

    awk1: awking("Overclock", "aura",
      "The aura surges: attack speed and damage both climb", [1, 1], [0.5, 2.4]),
    awk2: awking("Capacitor Bank", "sp",
      "Every enemy killed inside the aura feeds the grid", [0.3, 1], [2, 9]),  },
  {
    id: "swarm", name: "Arcane Swarm", rarity: "decent", kind: "swarm", target: "front",
    desc: "Loose three homing bolts at once, at up to three different enemies.",
    dmg: 34, upDmg: 11, ascDmg: 0, rate: 0.85, upRate: 0.02, ascRate: 0,
    multi: 3, unlockFrags: 10,

    awk1: awking("Swarm Surge", "volley",
      "Chance to loose two extra homing bolts", [0.18, 0.65], [1, 3]),
    awk2: awking("Void Locus", "heavy",
      "Chance for a bolt to collapse into a heavy detonation", [0.1, 0.45], [1.5, 6]),  },
  {
    id: "chrono", name: "Chrono Spire", rarity: "epic", kind: "chrono", target: "front",
    desc: "Time field: slows enemies around it and chills whatever it hits. Slowed enemies take +25% damage.",
    dmg: 70, upDmg: 18, ascDmg: 0, rate: 0.95, upRate: 0.02, ascRate: 0,
    slow: 0.4, upSlow: 0.04, ascSlow: 0.03, slowDur: 3.5, slowAura: 210, unlockFrags: 14,

    awk1: awking("Time Lock", "slow",
      "Chance to freeze a caught enemy's clock completely", [0.15, 0.6], [0.3, 0.7]),
    awk2: awking("Paradox", "chain",
      "Slowed enemies take a rebound hit from their own timeline", [0.2, 0.7], [0.4, 1.4]),  },
  {
    id: "void", name: "Void Cannon", rarity: "epic", kind: "void", target: "front",
    desc: "Slow siege gun that shaves a share of the target's maximum HP on every hit.",
    dmg: 110, upDmg: 22, ascDmg: 0, rate: 1.7, upRate: 0.03, ascRate: 0,
    pctHp: 0.05, upPctHp: 0.009, ascPctHp: 0.014, unlockFrags: 16,

    awk1: awking("Event Horizon", "execute",
      "Chance to erase an enemy that is already badly wounded", [0.1, 0.4], [0.12, 0.3]),
    awk2: awking("Collapse", "splash",
      "Hits pull harder and drag nearby enemies into the wound", [0.25, 0.8], [0.5, 1.6]),  },
  {
    id: "plasma", name: "Plasma Lance", rarity: "legendary", kind: "plasma", target: "front",
    desc: "Skewers a whole file of enemies with one lance.",
    dmg: 560, upDmg: 0, ascDmg: 0, rate: 0.95, upRate: 0.02, ascRate: 0,
    pierce: 3, upPierce: 1, ascPierce: 1, exotic: true, unlockFrags: 1,
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

    awk1: awking("Double Shot", "volley",
      "Chance to snap a second stone at another enemy", [0.18, 0.6], [1, 1]),
    awk2: awking("Flint Load", "burn",
      "Stones strike sparks and set the target alight", [0.2, 0.65], [0.5, 2]),  },
  {
    id: "flame", name: "Flamethrower", rarity: "normal", kind: "flame", art: "flame", accent: "#ff8c3d",
    target: "front",
    desc: "Coats the target in fire: 60% of the hit damage keeps burning for 4s.",
    dmg: 34, upDmg: 4, ascDmg: 11, rate: 0.55, upRate: 0.012, ascRate: 0.02,
    burnPct: 0.6, upBurnPct: 0.06, ascBurnPct: 0.08, burnDur: 4, unlockFrags: 3,

    awk1: awking("Napalm", "burn",
      "The burn lasts longer and spreads to enemies beside it", [0.2, 0.7], [0.6, 2.6]),
    awk2: awking("Blue Flame", "heavy",
      "Chance to ignite a searingly hot shot", [0.12, 0.5], [1, 4.5]),  },
  {
    id: "spike", name: "Spike Trap", rarity: "normal", kind: "spike", art: "spike", accent: "#c8d6e5",
    target: "front",
    desc: "Erupts under the front enemy, shredding everything packed around it.",
    dmg: 70, upDmg: 6, ascDmg: 16, rate: 0.9, upRate: 0.015, ascRate: 0.02,
    splash: 95, upSplash: 6, ascSplash: 8, unlockFrags: 4,

    awk1: awking("Rupture", "quake",
      "Chance to stun everything the spikes erupt under", [0.2, 0.7], [0.6, 2]),
    awk2: awking("Caltrops", "slow",
      "The crater is left littered with spikes that slow anything walking in", [0.25, 0.8], [0.25, 0.5]),  },
  {
    id: "boomer", name: "Boomerang", rarity: "normal", kind: "boomer", art: "sling", accent: "#9fe8ff",
    target: "front",
    desc: "Hurls a blade that curves through the whole file of enemies.",
    dmg: 42, upDmg: 5, ascDmg: 14, rate: 0.6, upRate: 0.012, ascRate: 0.02,
    pierce: 3, upPierce: 1, ascPierce: 1, unlockFrags: 5,

    awk1: awking("Ricochet", "chain",
      "The blade bounces into more enemies before it returns", [0.2, 0.7], [2, 6]),
    awk2: awking("Serrated Edge", "burn",
      "Every enemy it cuts keeps bleeding", [0.2, 0.65], [0.4, 1.6]),  },
  {
    id: "toxin", name: "Toxic Sprayer", rarity: "normal", kind: "toxin", art: "flame", accent: "#8effc4",
    target: "front",
    desc: "Sprays a poison cloud that splashes on impact and rots the pack over time.",
    dmg: 20, upDmg: 2, ascDmg: 7, rate: 0.5, upRate: 0.01, ascRate: 0.015,
    splash: 70, upSplash: 5, ascSplash: 6,
    burnPct: 0.35, upBurnPct: 0.04, ascBurnPct: 0.05, burnDur: 5, unlockFrags: 6,

    awk1: awking("Virulence", "burn",
      "The poison eats into the target far harder", [0.25, 0.8], [0.8, 3.2]),
    awk2: awking("Miasma", "splash",
      "The cloud is larger and lingers as a choking pool", [0.2, 0.7], [0.6, 1.8]),  },
  {
    id: "axe", name: "Axe Thrower", rarity: "decent", kind: "axe", art: "tube", accent: "#ff9d5c",
    target: "front",
    desc: "Spins a heavy axe that cuts through the front line and keeps going.",
    dmg: 105, upDmg: 16, ascDmg: 0, rate: 0.8, upRate: 0.018, ascRate: 0,
    pierce: 4, upPierce: 1, splash: 60, upSplash: 6, unlockFrags: 9,

    awk1: awking("Hurled Reaper", "critup",
      "Chance for a spinning axe that always crits", [0.1, 0.4], [1, 1]),
    awk2: awking("Bleeding Cut", "burn",
      "Axes leave deep wounds that bleed the target dry", [0.22, 0.7], [0.5, 2.2]),  },
  {
    id: "frost", name: "Frost Spire", rarity: "decent", kind: "frost", art: "spike", accent: "#9fe8ff",
    target: "front",
    desc: "Deep chill field: slows everything nearby and locks its target in ice.",
    dmg: 62, upDmg: 10, ascDmg: 0, rate: 1, upRate: 0.02, ascRate: 0,
    freeze: 0.2, upFreeze: 0.03, ascFreeze: 0,
    slow: 0.35, upSlow: 0.03, slowDur: 3.2, slowAura: 190, unlockFrags: 11,

    awk1: awking("Permafrost", "freeze",
      "Chance to lock the target in a block of ice", [0.18, 0.65], [1.4, 3]),
    awk2: awking("Cold Snap", "splash",
      "Chance to burst a ring of frost that chills everything around", [0.25, 0.8], [0.4, 1.2]),  },
  {
    id: "mortar", name: "Siege Mortar", rarity: "decent", kind: "mortar", art: "tube", accent: "#d0d6e0",
    target: "front",
    desc: "Lobs one enormous shell every two seconds. Huge crater, huge damage.",
    dmg: 340, upDmg: 45, ascDmg: 0, rate: 2, upRate: 0.04, ascRate: 0,
    splash: 230, upSplash: 14, ascSplash: 0, unlockFrags: 13,

    awk1: awking("Siege Load", "splash",
      "Chance to fire a far wider crater shell", [0.2, 0.7], [0.4, 1.1]),
    awk2: awking("Thermite", "burn",
      "The shell leaves a burning crater behind", [0.25, 0.8], [0.6, 2.4]),  },
  {
    id: "laser", name: "Laser Cutter", rarity: "epic", kind: "laser", art: "beam", accent: "#ff4fd8",
    target: "front",
    desc: "Sustained beam that arcs to two more enemies. Fires four times a second.",
    dmg: 58, upDmg: 12, ascDmg: 0, rate: 0.25, upRate: 0.006, ascRate: 0,
    chain: 3, upChain: 1, ascChain: 0, unlockFrags: 14,

    awk1: awking("Prism Split", "chain",
      "Chance for the beam to fan out into extra enemies", [0.2, 0.7], [2, 6]),
    awk2: awking("Overburn", "burn",
      "Beams scorch on contact and keep burning", [0.25, 0.8], [0.4, 1.8]),  },
  {
    id: "missile", name: "Missile Battery", rarity: "epic", kind: "missile", art: "tube", accent: "#ffd23f",
    target: "front",
    desc: "Launches four homing rockets at four different enemies. Every one pops.",
    dmg: 135, upDmg: 22, ascDmg: 0, rate: 1.15, upRate: 0.02, ascRate: 0,
    multi: 4, splash: 70, upSplash: 6, ascSplash: 0, unlockFrags: 16,

    awk1: awking("Cluster Payload", "volley",
      "Chance for two more rockets in the salvo", [0.18, 0.6], [1, 2]),
    awk2: awking("Incendiary", "burn",
      "Every rocket leaves a burning pool where it pops", [0.25, 0.8], [0.5, 2]),  },
  {
    id: "dragon", name: "Dragon's Maw", rarity: "legendary", kind: "dragon", art: "flame", accent: "#ff5d3d",
    target: "front",
    desc: "Devours the pack: colossal splash, a vicious burn, and it grows with every kill.",
    dmg: 820, upDmg: 0, ascDmg: 0, rate: 1.05, upRate: 0.02, ascRate: 0,
    splash: 240, upSplash: 12, ascSplash: 0,
    burnPct: 0.5, upBurnPct: 0.03, ascBurnPct: 0, burnDur: 4,
    killStack: 0.01, exotic: true, unlockFrags: 1,
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
    burnPct: 0.3, upBurnPct: 0.03, ascBurnPct: 0, burnDur: 4, exotic: true, unlockFrags: 1,
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
  // ---------------------------------------------------------------
  // SECOND WAVE OF TOWERS — 6 more, one for every niche
  // ---------------------------------------------------------------
  {
    id: "rime", name: "Rime Cannon", rarity: "normal", kind: "cannon", art: "cannon", accent: "#9fe8ff",
    target: "front",
    desc: "Frost shells that burst wide and lock whole packs into ice.",
    dmg: 90, upDmg: 7, ascDmg: 18, rate: 1.1, upRate: 0.018, ascRate: 0.02,
    splash: 85, upSplash: 6, ascSplash: 8,
    freeze: 0.22, upFreeze: 0.04, ascFreeze: 0.05, unlockFrags: 7,

    awk1: awking("Flash Freeze", "freeze",
      "Chance to lock the whole blast zone solid", [0.2, 0.65], [1.2, 2.8]),
    awk2: awking("Shatterpoint", "critup",
      "Chance for a shell that always crits and shreds ice", [0.1, 0.4], [1, 1]),  },
  {
    id: "siphon", name: "Soul Siphon", rarity: "decent", kind: "siphon", art: "tube", accent: "#c44dff",
    target: "front",
    desc: "Every kill it lands feeds the grid: bonus SP and a rising damage aura.",
    dmg: 96, upDmg: 14, ascDmg: 0, rate: 1.05, upRate: 0.02, ascRate: 0,
    spGain: 9, unlockFrags: 10,

    awk1: awking("Soul Tithe", "sp",
      "Every kill feeds far more SP into the grid", [0.35, 1], [3, 14]),
    awk2: awking("Withering", "burn",
      "Stolen souls linger and rot the target from inside", [0.25, 0.8], [0.5, 2.2]),  },
  {
    id: "quake", name: "Quake Pylon", rarity: "decent", kind: "quake", art: "spike", accent: "#ffd23f",
    target: "front",
    desc: "Slams the ground: wide crater plus a stun that stops the pack dead.",
    dmg: 150, upDmg: 22, ascDmg: 0, rate: 1.6, upRate: 0.03, ascRate: 0,
    splash: 190, upSplash: 12, ascSplash: 0,
    stun: 1.1, upStun: 0.15, ascStun: 0, unlockFrags: 13,

    awk1: awking("Fault Line", "quake",
      "Chance to stagger everything on the lane", [0.2, 0.7], [0.8, 2.6]),
    awk2: awking("Aftershock", "heavy",
      "Chance for a slam that lands twice as hard", [0.15, 0.55], [1, 4]),  },
  {
    id: "storm", name: "Storm Caller", rarity: "epic", kind: "storm", art: "beam", accent: "#a0e8ff",
    target: "front",
    desc: "Arc lightning that forks through five enemies at once.",
    dmg: 120, upDmg: 20, ascDmg: 0, rate: 0.8, upRate: 0.02, ascRate: 0,
    chain: 5, upChain: 1, ascChain: 0, unlockFrags: 15,

    awk1: awking("Thunderhead", "chain",
      "Chance for the arc to fork into two extra enemies", [0.22, 0.7], [2, 6]),
    awk2: awking("Skyfall", "heavy",
      "Chance to call a bolt straight down on the target", [0.12, 0.5], [1.5, 6]),  },
  {
    id: "plague", name: "Plague Mortar", rarity: "epic", kind: "plague", art: "tube", accent: "#8effc4",
    target: "front",
    desc: "Lobs a plague canister: massive crater, creeping rot and a heavy slow.",
    dmg: 260, upDmg: 34, ascDmg: 0, rate: 1.9, upRate: 0.035, ascRate: 0,
    splash: 200, upSplash: 12, ascSplash: 0,
    burnPct: 0.55, upBurnPct: 0.05, ascBurnPct: 0, burnDur: 5,
    slow: 0.3, upSlow: 0.02, slowDur: 3, unlockFrags: 17,

    awk1: awking("Pandemic", "burn",
      "The rot spreads harder and the crater keeps burning", [0.25, 0.8], [0.7, 2.8]),
    awk2: awking("Blight", "slow",
      "Plague victims are left barely able to walk", [0.25, 0.8], [0.25, 0.55]),  },
  {
    id: "rail", name: "Railgun", rarity: "legendary", kind: "rail", art: "plasma", accent: "#7fe9ff",
    target: "front",
    desc: "One shot, one line of corpses: 900 raw damage skewers six enemies deep.",
    dmg: 900, upDmg: 0, ascDmg: 0, rate: 1.35, upRate: 0.025, ascRate: 0,
    pierce: 6, upPierce: 1, ascPierce: 0, exotic: true, unlockFrags: 1,
    awk1: {
      name: "Overpenetration",
      desc: "Chance to load a hypervelocity slug: colossal damage that always crits.",
      chance: [0.12, 0.18, 0.25, 0.4, 0.55],
      mult: [2, 5, 14, 32, 55],
    },
    awk2: {
      name: "Rail Burn",
      desc: "The slug's friction leaves a searing heat trail on everything it pierces.",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1.5, 3, 5, 8, 13],
    },
  },
  // ---------------------------------------------------------------
  // MYTHIC ARSENAL — four more legendaries for the endgame roster
  // ---------------------------------------------------------------
  {
    id: "reaper", name: "Reaper's Toll", rarity: "legendary", kind: "reaper", art: "scythe", accent: "#c9a7ff",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Tolls for the wounded: shaves a fifth of the target's maximum HP and reaps anything already dying.",
    dmg: 360, upDmg: 0, ascDmg: 0, rate: 1.5, upRate: 0.02, ascRate: 0,
    pctHp: 0.2, upPctHp: 0.012, ascPctHp: 0,
    awk1: awking("Last Rites", "execute",
      "Chance to reap anything below a share of its maximum health outright", [0.1, 0.4], [0.12, 0.3]),
    awk2: awking("Soul Tithe", "bounty",
      "Every soul it reaps pays out extra gold", [0.3, 1], [0.5, 3]),
  },
  {
    id: "prism", name: "Prism Array", rarity: "legendary", kind: "prism", art: "prism", accent: "#8ff0ff",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Splits one beam into four, each finding its own enemy and burning what it touches.",
    dmg: 300, upDmg: 0, ascDmg: 0, rate: 0.9, upRate: 0.02, ascRate: 0,
    multi: 4, chain: 2, upChain: 1,
    awk1: awking("Refraction", "volley",
      "Chance to split into extra beams", [0.2, 0.6], [1, 3]),
    awk2: awking("Scorch Prism", "burn",
      "Every beam leaves a searing burn on whatever it strikes", [0.3, 0.9], [0.5, 2.4]),
  },
  {
    id: "aegis", name: "Aegis Core", rarity: "legendary", kind: "aegis", art: "aegis", accent: "#9fe8ff",
    target: "none", exotic: true, unlockFrags: 1,
    desc: "Fortress generator: a huge attack-speed and power aura, and it blasts anything that comes close.",
    dmg: 0, upDmg: 0, ascDmg: 0, rate: 2, upRate: 0, ascRate: 0,
    aura: true, aspd: 0.05, upAspd: 0.01, ascAspd: 0.02,
    atkAura: 0.05, upAtkAura: 0.012, ascAtkAura: 0.02,
    pulse: 260, upPulse: 24, pulseRate: 2.4,
    awk1: awking("Bulwark Field", "aura",
      "The field hardens: an even stronger aura for everything it covers", [1, 1], [0.6, 2.8]),
    awk2: awking("Retribution", "quake",
      "Chance for its pulse to stagger everything it hits", [0.25, 0.8], [0.6, 2]),
  },
  {
    id: "hellgate", name: "Hellgate", rarity: "legendary", kind: "hellgate", art: "gate", accent: "#ff8c3d",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Rips open a burning gate on the lane: colossal damage and a lake of fire left behind.",
    dmg: 700, upDmg: 0, ascDmg: 0, rate: 1.6, upRate: 0.02, ascRate: 0,
    splash: 210, upSplash: 12, ascSplash: 0,
    burnPct: 0.7, upBurnPct: 0.05, ascBurnPct: 0, burnDur: 5, lava: true,
    awk1: awking("Gates Undone", "splash",
      "Chance for the gate to tear open far wider", [0.2, 0.65], [0.4, 1.2]),
    awk2: awking("Lake of Fire", "burn",
      "The fire it leaves burns far hotter and longer", [0.3, 0.9], [0.6, 2.6]),
  },
  // ---------- mythic arsenal II: ten more legendaries ----------
  {
    id: "nova", name: "Nova Cannon", rarity: "legendary", kind: "nova", art: "nova", accent: "#ffd7a1",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Lobs a three-shell salvo that flowers into a wide starburst on impact.",
    dmg: 620, upDmg: 16, ascDmg: 22, rate: 1.55, upRate: 0.03, ascRate: 0.04,
    splash: 120, upSplash: 6, ascSplash: 8, multi: 3, aspd: 0.04, upAspd: 0.01, ascAspd: 0.012,
    awk1: awking("Nova Core", "heavy", "Chance to load a core shell that detonates for far more damage.", [0.14, 0.55], [0.6, 10]),
    awk2: awking("Supernova Bloom", "splash", "Chance for a shell to bloom into a much wider starburst.", [0.25, 1], [0.25, 1.5]),
  },
  {
    id: "gravity", name: "Gravity Well", rarity: "legendary", kind: "gravity", art: "well", accent: "#b9a7ff",
    target: "none", exotic: true, unlockFrags: 1,
    desc: "Fires nothing. Its well pulses on a timer, dragging the horde backwards down the lane.",
    dmg: 0, upDmg: 0, ascDmg: 0, rate: 1, upRate: 0, ascRate: 0,
    aspd: 0.05, upAspd: 0.01, ascAspd: 0.02, pulse: 190, upPulse: 18, pulseRate: 3, pulseRadius: 168,
    pull: 34, upPull: 3, slow: 0.45, slowDur: 2,
    awk1: awking("Event Horizon", "slow", "Chance the pulse pins everything it catches in place for longer.", [0.3, 1], [0.15, 0.7]),
    awk2: awking("Collapse", "quake", "Chance the pulse slams shut, staggering everything nearby.", [0.2, 0.8], [0.3, 1.8]),
  },
  {
    id: "thundercrown", name: "Thunder Crown", rarity: "legendary", kind: "thundercrown", art: "crown", accent: "#ffe86b",
    target: "all", exotic: true, unlockFrags: 1,
    desc: "Calls a ring of sky pillars down on the field and forks the light between them.",
    dmg: 300, upDmg: 9, ascDmg: 12, rate: 1.1, upRate: 0.02, ascRate: 0.03,
    chain: 3, upChain: 1, ascChain: 1, aspd: 0.06, upAspd: 0.01, ascAspd: 0.015,
    awk1: awking("Storm Judge", "critup", "Chance the whole strike lands as a guaranteed crit.", [0.16, 0.5], [0.3, 1.6]),
    awk2: awking("Chain Crown", "chain", "Chance for the strike to fork into more enemies.", [0.25, 1], [1, 6]),
  },
  {
    id: "voidrip", name: "Void Ripper", rarity: "legendary", kind: "voidrip", art: "ripper", accent: "#c9a7ff",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "A lance that rips through a whole file, eating a slice of every maximum HP it touches.",
    dmg: 460, upDmg: 12, ascDmg: 16, rate: 0.9, upRate: 0.02, ascRate: 0.03,
    pierce: 5, upPierce: 1, ascPierce: 1, pctHp: 0.09, upPctHp: 0.004, ascPctHp: 0.006,
    burnPct: 0.5, burnDur: 4, aspd: 0.05, upAspd: 0.01, ascAspd: 0.015,
    awk1: awking("Rift Tear", "heavy", "Chance to tear a much deeper wound on the first thing it hits.", [0.16, 0.5], [0.5, 4]),
    awk2: awking("Rift Fire", "burn", "Chance to leave a burning rift on whatever it lands on.", [0.3, 1], [0.5, 2.6]),
  },
  {
    id: "furnace", name: "Soul Furnace", rarity: "legendary", kind: "furnace", art: "furnace", accent: "#ff8c3d",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Feeds on every kill: each one stokes the fire and pays a bounty in gold.",
    dmg: 380, upDmg: 10, ascDmg: 14, rate: 0.7, upRate: 0.015, ascRate: 0.02,
    splash: 90, upSplash: 4, ascSplash: 6, burnPct: 0.9, burnDur: 5,
    killStack: 0.05, goldGain: 6, aspd: 0.04, upAspd: 0.01, ascAspd: 0.012,
    awk1: awking("Ember Feed", "burn", "Chance to douse the target in a much longer, hotter blaze.", [0.3, 1], [0.6, 3]),
    awk2: awking("Ash Tithe", "bounty", "Chance a kill pays out an extra purse of gold.", [0.35, 1], [6, 40]),
  },
  {
    id: "maelstrom", name: "Maelstrom", rarity: "legendary", kind: "maelstrom", art: "whirl", accent: "#7fe9ff",
    target: "none", exotic: true, unlockFrags: 1,
    desc: "A whirling pool of blade-wind that chews and slows everything caught inside it.",
    dmg: 0, upDmg: 0, ascDmg: 0, rate: 1, upRate: 0, ascRate: 0,
    aspd: 0.05, upAspd: 0.012, ascAspd: 0.02, pulse: 240, upPulse: 20, pulseRate: 2.2, pulseRadius: 152,
    slow: 0.55, slowDur: 1.6, pull: 16, upPull: 2,
    awk1: awking("Undertow", "slow", "Chance the whirlpool drags harder and holds what it catches.", [0.3, 1], [0.2, 0.8]),
    awk2: awking("Drowning Rot", "burn", "Chance the blades leave a rotting burn on everything in the pool.", [0.25, 0.9], [0.4, 2.2]),
  },
  {
    id: "starfall", name: "Starfall Battery", rarity: "legendary", kind: "starfall", art: "star", accent: "#ffd23f",
    target: "all", exotic: true, unlockFrags: 1,
    desc: "Marks a handful of enemies and calls burning rocks down on their heads.",
    dmg: 300, upDmg: 9, ascDmg: 12, rate: 1.3, upRate: 0.025, ascRate: 0.035,
    meteors: 5, upMeteors: 0, aspd: 0.05, upAspd: 0.01, ascAspd: 0.015,
    awk1: awking("Guided Rocks", "heavy", "Chance for one rock in the volley to hit far harder.", [0.18, 0.6], [0.7, 5]),
    awk2: awking("Double Barrage", "volley", "Chance to call a second volley down on top of the first.", [0.2, 0.75], [2, 7]),
  },
  {
    id: "chronolock", name: "Chrono Lock", rarity: "legendary", kind: "chronolock", art: "lock", accent: "#9fe8ff",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Stops time around whatever it hits: freezing shots, staggering blasts and a long chill.",
    dmg: 240, upDmg: 7, ascDmg: 10, rate: 0.6, upRate: 0.012, ascRate: 0.018,
    freeze: 0.45, upFreeze: 0.02, ascFreeze: 0.03, slow: 0.5, upSlow: 0.015, ascSlow: 0.02, slowDur: 3,
    stun: 0.5, upStun: 0.02, ascStun: 0.03, splash: 70, upSplash: 3, aspd: 0.05, upAspd: 0.01, ascAspd: 0.015,
    awk1: awking("Deep Lock", "freeze", "Chance to lock a target out of time for much longer.", [0.3, 1], [0.6, 2.4]),
    awk2: awking("Clockwork Chill", "slow", "Chance to leave the target crawling in slow motion.", [0.3, 1], [0.2, 0.75]),
  },
  {
    id: "gravebloom", name: "Grave Bloom", rarity: "legendary", kind: "gravebloom", art: "bloom", accent: "#8effc4",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Blooms on the wounded: heavy percent-of-max-HP strikes and a purse for every kill.",
    dmg: 420, upDmg: 11, ascDmg: 15, rate: 1.2, upRate: 0.025, ascRate: 0.035,
    pctHp: 0.14, upPctHp: 0.006, ascPctHp: 0.009, goldGain: 8, aspd: 0.05, upAspd: 0.01, ascAspd: 0.015,
    awk1: awking("Grave Tithe", "execute", "Chance to reap anything already under a quarter of its health.", [0.2, 0.6], [0.16, 0.3]),
    awk2: awking("Bloom Offering", "bounty", "Chance a kill blooms into an extra purse of gold.", [0.35, 1], [8, 52]),
  },
  {
    id: "colossus", name: "Rift Colossus", rarity: "legendary", kind: "colossus", art: "colossus", accent: "#ff8f9a",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Slow, enormous siege shells that shatter armour on impact and flatten a whole cell.",
    dmg: 980, upDmg: 26, ascDmg: 34, rate: 2.2, upRate: 0.04, ascRate: 0.05,
    splash: 100, upSplash: 5, ascSplash: 7, shred: 0.06, upShred: 0.004, ascShred: 0.006,
    aspd: 0.03, upAspd: 0.008, ascAspd: 0.01,
    awk1: awking("Siege Core", "heavy", "Chance to load a siege shell that cracks the target wide open.", [0.2, 0.6], [0.8, 6]),
    awk2: awking("Colossus Rage", "critup", "Chance the shell lands as a guaranteed crit.", [0.14, 0.45], [0.4, 2]),
  },
  // ---------- the Clone tower ----------
  {
    id: "clone", name: "Clone", rarity: "legendary", kind: "clone", art: "clone", accent: "#8effc4",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Drag any tower with matching points onto it to grow a second copy of that tower — the original stays. Awakened, it can copy anything.",
    dmg: 300, upDmg: 9, ascDmg: 12, rate: 0.85, upRate: 0.018, ascRate: 0.025,
    aspd: 0.05, upAspd: 0.01, ascAspd: 0.015, chain: 1, upChain: 1,
    awk1: awking("Super Clone", "clonesuper", "Chance to become a super clone: copies towers with ANY points and gains +200% attack speed for 6 seconds.", [0.2, 0.2], [2, 2]),
    awk2: awking("Perfect Replica", "cloneperfect", "Chance the copy also grows +1 point the moment it is made.", [0.35, 1], [1, 2]),
  },
  // ---------- mythic arsenal III: the ten casters ----------
  {
    id: "gale", name: "Gale Blade", rarity: "legendary", kind: "gale", art: "beam", accent: "#7ef0ff",
    target: "front", exotic: true, unlockFrags: 1, skill: "gale",
    desc: "Wind-forged blade launcher; every few seconds it looses a cyclone of skewering blades.",
    dmg: 340, upDmg: 9, ascDmg: 12, rate: 0.75, upRate: 0.015, ascRate: 0.02,
    pierce: 3, upPierce: 1, ascPierce: 1, aspd: 0.06, upAspd: 0.01, ascAspd: 0.015,
    awk1: awking("Wind Pressure", "heavy", "Chance to fire a shot with far more damage.", [0.15, 0.5], [0.5, 3]),
    awk2: awking("Twin Fangs", "volley", "Chance to loose an extra blade at another enemy.", [0.25, 1], [1, 3]),
  },
  {
    id: "bombardment", name: "Thousand-Pounder", rarity: "legendary", kind: "bombardment", art: "howitzer", accent: "#ffb324",
    target: "front", exotic: true, unlockFrags: 1, skill: "bombardment",
    desc: "A siege legend. Its shells flatten clusters, and its skill walks bombardment across the horde.",
    dmg: 520, upDmg: 14, ascDmg: 18, rate: 1.35, upRate: 0.025, ascRate: 0.03,
    splash: 95, upSplash: 5, ascSplash: 7, stun: 0.6, upStun: 0.03, ascStun: 0.04, aspd: 0.03, upAspd: 0.008, ascAspd: 0.012,
    awk1: awking("Siege Doctrine", "splash", "Chance for the shell to crater far wider.", [0.25, 1], [0.3, 1.2]),
    awk2: awking("Deep Pockets", "volley", "Chance to fire a second shell at another enemy.", [0.2, 0.7], [1, 2]),
  },
  {
    id: "wildfire", name: "Wildfire", rarity: "legendary", kind: "wildfire", art: "flame", accent: "#ff7a3d",
    target: "front", exotic: true, unlockFrags: 1, skill: "wildfire",
    desc: "Burns a little — then a lot. Every kill feeds the fire, and Firestorm sets the lane alight.",
    dmg: 210, upDmg: 6, ascDmg: 8, rate: 0.35, upRate: 0.01, ascRate: 0.015,
    burnPct: 1.2, upBurnPct: 0.05, ascBurnPct: 0.07, burnDur: 4, killStack: 0.04, aspd: 0.08, upAspd: 0.012, ascAspd: 0.018,
    awk1: awking("Fire Mastery", "burn", "Chance to leave a far hotter, longer blaze.", [0.3, 1], [0.6, 3]),
    awk2: awking("Kindling", "sp", "Chance a kill feeds spell power back into the grid.", [0.25, 0.9], [4, 16]),
  },
  {
    id: "hades", name: "Hades Gate", rarity: "legendary", kind: "hades", art: "gate", accent: "#ff4d1f",
    target: "front", exotic: true, unlockFrags: 1, skill: "hades",
    desc: "A gate to somewhere worse. Slow, enormous shots — and its skill rips a burning gate open on the lane.",
    dmg: 600, upDmg: 16, ascDmg: 22, rate: 1.25, upRate: 0.025, ascRate: 0.03,
    splash: 140, upSplash: 8, ascSplash: 10, lava: true, burnPct: 1.0, upBurnPct: 0.05, burnDur: 5, aspd: 0.03, upAspd: 0.008, ascAspd: 0.012,
    awk1: awking("Abyssal Reach", "splash", "Chance the detonation reaches much further.", [0.2, 0.8], [0.3, 1.2]),
    awk2: awking("Soul Burn", "burn", "Chance to leave a burning soul on whatever it hits.", [0.3, 1], [0.5, 2.5]),
  },
  {
    id: "ion", name: "Ion Storm", rarity: "legendary", kind: "ion", art: "ion", accent: "#c9a7ff",
    target: "front", exotic: true, unlockFrags: 1, skill: "ion",
    desc: "Ball lightning in a bottle: chaining arcs on every shot, and a Chain Ring on a leash.",
    dmg: 190, upDmg: 5, ascDmg: 7, rate: 0.55, upRate: 0.012, ascRate: 0.018,
    chain: 5, upChain: 1, ascChain: 1, aspd: 0.08, upAspd: 0.012, ascAspd: 0.018,
    awk1: awking("Overcharge", "critup", "Chance the arc lands as a guaranteed crit.", [0.18, 0.55], [0.4, 2]),
    awk2: awking("Ionized Air", "chain", "Chance the arc forks into more enemies.", [0.25, 1], [2, 6]),
  },
  {
    id: "aether", name: "Aether Prism", rarity: "legendary", kind: "aether", art: "aether", accent: "#8fe9ff",
    target: "front", exotic: true, unlockFrags: 1, skill: "aether",
    desc: "Light folded until it cuts. Shots split toward many enemies; the skill blinks a shard through all of them.",
    dmg: 150, upDmg: 4, ascDmg: 6, rate: 0.5, upRate: 0.01, ascRate: 0.015,
    multi: 3, burnPct: 0.5, upBurnPct: 0.03, burnDur: 3, aspd: 0.1, upAspd: 0.012, ascAspd: 0.018,
    awk1: awking("Refraction", "volley", "Chance to split one more beam toward another enemy.", [0.3, 1], [1, 3]),
    awk2: awking("Spectrum", "burn", "Chance the beam leaves a burning spectrum.", [0.25, 0.9], [0.4, 1.8]),
  },
  {
    id: "scythe", name: "Death Scythe", rarity: "legendary", kind: "scythe", art: "scythe", accent: "#b18cff",
    target: "front", exotic: true, unlockFrags: 1, skill: "scythe",
    desc: "Harvests the wounded: every shot carves a chunk of max HP, and Death Mark reaps the marked.",
    dmg: 380, upDmg: 10, ascDmg: 14, rate: 0.95, upRate: 0.02, ascRate: 0.025,
    pctHp: 0.12, upPctHp: 0.005, ascPctHp: 0.007, aspd: 0.05, upAspd: 0.01, ascAspd: 0.015,
    awk1: awking("Soul Harvest", "execute", "Chance to reap anything already under a quarter of its health.", [0.15, 0.5], [0.15, 0.3]),
    awk2: awking("Grave Momentum", "heavy", "Chance to land a far heavier swing.", [0.18, 0.6], [0.5, 3]),
  },
  {
    id: "sandstorm", name: "Sandstorm", rarity: "legendary", kind: "sandstorm", art: "sling", accent: "#e8d9a0",
    target: "front", exotic: true, unlockFrags: 1, skill: "sandstorm",
    desc: "Slow, wide, relentless — scarabs that grind everything down, and a storm that drags them back.",
    dmg: 230, upDmg: 6, ascDmg: 9, rate: 0.8, upRate: 0.016, ascRate: 0.022,
    splash: 85, upSplash: 4, ascSplash: 6, slow: 0.5, upSlow: 0.015, ascSlow: 0.02, slowDur: 3, aspd: 0.05, upAspd: 0.01, ascAspd: 0.015,
    awk1: awking("Desert Curse", "slow", "Chance to leave the target crawling for far longer.", [0.3, 1], [0.2, 0.6]),
    awk2: awking("Bury Them", "quake", "Chance the impact buries everything nearby in place.", [0.2, 0.8], [0.4, 1.5]),
  },
  {
    id: "bloodstone", name: "Bloodstone Spire", rarity: "legendary", kind: "bloodstone", art: "spire", accent: "#ff5566",
    target: "front", exotic: true, unlockFrags: 1, skill: "bloodstone",
    desc: "A relic of the crimson war: pulses of blood energy, and a meteor rain when the stone is sated.",
    dmg: 300, upDmg: 8, ascDmg: 11, rate: 0.7, upRate: 0.015, ascRate: 0.02,
    pulse: 180, upPulse: 12, pulseRate: 2.2, pulseRadius: 170, spGain: 3, aspd: 0.05, upAspd: 0.01, ascAspd: 0.015,
    awk1: awking("Blood Siphon", "sp", "Chance a kill pays extra spell power.", [0.3, 1], [6, 24]),
    awk2: awking("Stone Heart", "aura", "Chance the pulse hits far harder.", [0.25, 1], [0.25, 1]),
  },
  {
    id: "venom", name: "Venom Spitter", rarity: "legendary", kind: "venom", art: "venom", accent: "#8effc4",
    target: "front", exotic: true, unlockFrags: 1, skill: "venom",
    desc: "Spits corrosive venom that pools under the horde — everything standing in it melts and slows.",
    dmg: 190, upDmg: 5, ascDmg: 8, rate: 0.55, upRate: 0.012, ascRate: 0.018,
    burnPct: 0.9, upBurnPct: 0.05, ascBurnPct: 0.07, burnDur: 5, slow: 0.45, upSlow: 0.015, slowDur: 2.5, lava: true, aspd: 0.06, upAspd: 0.01, ascAspd: 0.015,
    awk1: awking("Corrosive", "burn", "Chance to spit a far more corrosive venom.", [0.3, 1], [0.5, 2.2]),
    awk2: awking("Toxic Bloom", "splash", "Chance the venom pools far wider.", [0.25, 1], [0.3, 1.1]),
  },
  // ---------- mythic arsenal IV: the demon court, the heavens and the throne ----------
  {
    id: "demon", name: "Demon Execution", rarity: "mystical", kind: "demon", art: "demon", accent: "#9b001b",
    target: "all", exotic: true, unlockFrags: 1,
    desc: "Every 5 seconds, deep-red execution lightning detonates across the battlefield and executes every enemy—including bosses—through immunity. This strike ignores attack, attack speed and all buffs.",
    dmg: 0, upDmg: 0, ascDmg: 0, rate: 5, upRate: 0, ascRate: 0,
    execCd: 5,
    awk1: {
      name: "Soul Wipeout",
      desc: "When merging, fires a beam of deep-red powerful lasers at enemies, with base beam count equal to the Demon Execution tower's points.",
      chance: [1, 1, 1, 1, 1, 1],
      mult: [2, 4, 6, 8, 10, 12],
      fmt: (m) => `+${m} merge beams`,
    },
    awk2: {
      name: "Hell Dimensions",
      desc: "When execution lightning strikes an elite or boss, a portal drops at tremendous speed, opens blazing ground cracks, sends its target back to spawn and blasts nearby enemies backward.",
      chance: [1, 1, 1, 1, 1, 1],
      mult: [0.25, 0.5, 0.75, 1, 1.25, 1.5],
      mult2: [1, 2, 3, 4, 5, 6],
      fmt: (m, m2) => `portal +${Math.round(m * 100)}% · knockback +${m2}m`,
    },
  },
  {
    id: "heavenly", name: "Heavenly God", rarity: "legendary", kind: "heavenly", art: "heavenly", accent: "#ffe86b",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Fires a lightning laser that punches down the lane — five enemies behind the target take 50% damage. Merging blesses two random towers with points and a surge.",
    dmg: 470, upDmg: 13, ascDmg: 17, rate: 0.95, upRate: 0.02, ascRate: 0.025,
    aspd: 0.06, upAspd: 0.012, ascAspd: 0.018,
    laserBehind: 5, laserBehindMul: 0.5,
    mergeBolts: 2, mergePoints: 2, mergeBuff: 3, mergeBuffT: 13,
    awk1: {
      name: "Positive Lightning",
      desc: "40% chance a merge forks 1-3 extra bolts onto random towers: an extra point each and a 500% attack and attack-speed surge.",
      chance: [0.4, 0.4, 0.4, 0.4, 0.4],
      mult: [1, 1, 2, 2, 3],
      mult2: [5, 5, 5, 5, 5],
      fmt: (m, m2) => `+${m} bolt${m === 1 ? "" : "s"} · +${Math.round((m2 || 0) * 100)}% attack & speed`,
    },
    awk2: {
      name: "Super Charged Ray",
      desc: "10% chance a laser hit superheats the air around the target to 40,000°C — everything nearby detonates in a supersonic shockwave.",
      chance: [0.1, 0.1, 0.1, 0.1, 0.1],
      mult: [110, 125, 145, 165, 190],
      fmt: (m) => `${Math.round(m)} range · anything inside is vaporised`,
    },
  },
  {
    id: "honor", name: "Honor Emperor", rarity: "legendary", kind: "honor", art: "honor", accent: "#ffd76a",
    target: "front", exotic: true, unlockFrags: 1, honor: true,
    desc: "Drag it onto a tower sitting on matching points and that tower grows a point instead of merging away — the Emperor himself is consumed.",
    dmg: 280, upDmg: 8, ascDmg: 11, rate: 0.8, upRate: 0.015, ascRate: 0.02,
    aspd: 0.05, upAspd: 0.01, ascAspd: 0.015,
    awk1: {
      name: "Honor Blessing",
      desc: "16% chance the honored tower grows a second point from the same ceremony.",
      chance: [0.16, 0.16, 0.16, 0.16, 0.16],
      mult: [1, 1, 1, 1, 1],
      fmt: (m) => `16% chance of +${m} extra point`,
    },
    awk2: {
      name: "Super Bless",
      desc: "Every honored tower keeps +15% attack and attack speed permanently for the rest of the run.",
      chance: [1, 1, 1, 1, 1],
      mult: [0.15, 0.15, 0.15, 0.15, 0.15],
      fmt: (m) => `+${Math.round(m * 100)}% attack & attack speed, permanent`,
    },
  },
  {
    id: "supervisor", name: "Supervisor", rarity: "mystical", kind: "supervisor", art: "supervisor", accent: "#ff315c",
    target: "none", exotic: true, unlockFrags: 1,
    desc: "A deep-red sovereign that permanently speeds every tower by 1% per kill, up to +2,000%. Each kill has a 20% chance to amplify that buff tick tenfold. Merging unleashes ten red lightning executions along the path.",
    dmg: 0, upDmg: 0, ascDmg: 0, rate: 1, upRate: 0, ascRate: 0,
    awk1: {
      name: "Hypervisor",
      desc: "The Superbuff amplification rises by 100% each wave, up to 12,000%.",
      chance: [1, 1, 1, 1, 1], mult: [1, 1, 1, 1, 1],
      fmt: () => "+100% amplification per wave · capped at +12,000%",
    },
    awk2: {
      name: "Doomsday",
      desc: "Every merge has a 19% chance to drop a nuclear bomb, instantly destroying enemies within 900m and violently shaking the arena.",
      chance: [0.19, 0.19, 0.19, 0.19, 0.19, 0.19], mult: [900, 900, 900, 900, 900, 900],
      fmt: (m) => `19% merge chance · instant kill within ${m}m`,
    },
  },
  // ---------- the mystical court: two new endgame summons ----------
  {
    id: "eclipse", name: "Eclipse Oracle", rarity: "mystical", kind: "eclipse", art: "eclipse", accent: "#b06bff",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Hurls a collapsing dark moon. On impact it implodes: a violet singularity tears nearby enemies backward along the lane, slows them and burns a share of their maximum health.",
    dmg: 780, upDmg: 22, ascDmg: 30, rate: 1.5, upRate: 0.025, ascRate: 0.03,
    aspd: 0.04, upAspd: 0.008, ascAspd: 0.012,
    splash: 120, upSplash: 6, ascSplash: 8,
    pctHp: 0.06, upPctHp: 0.006, ascPctHp: 0.008,
    slow: 0.5, upSlow: 0.012, ascSlow: 0.016, slowDur: 2.6,
    awk1: awking("Total Eclipse", "splash",
      "Chance the dark moon swallows a far wider patch of lane", [0.35, 1], [0.4, 1.5]),
    awk2: awking("Event Horizon", "execute",
      "Chance the implosion drags anything beneath a health threshold across the event horizon", [0.12, 0.42], [0.18, 0.36]),
  },
  {
    id: "seraph", name: "Astral Seraph", rarity: "mystical", kind: "seraph", art: "seraph", accent: "#8ff0ff",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Spears the lane with a lance of starlight: it pierces four enemies, arcs a choir of holy bolts through the pack, and every kill it lands restores grid SP.",
    dmg: 520, upDmg: 18, ascDmg: 26, rate: 0.95, upRate: 0.02, ascRate: 0.025,
    aspd: 0.06, upAspd: 0.01, ascAspd: 0.015,
    pierce: 4, upPierce: 1, ascPierce: 1,
    chain: 3, upChain: 1, ascChain: 1,
    spGain: 6,
    awk1: awking("Ascension", "critup",
      "Chance the lance descends as a guaranteed critical starfall", [0.12, 0.45], [1, 1]),
    awk2: awking("Choir of Stars", "chain",
      "Chance the holy arc forks into extra enemies", [0.2, 0.7], [1, 4]),
  },
];

/** Tier VI extends every tower's two awakening paths beyond the original five tiers.
 * It adds half of the Tier IV→V increase (or +25% when the old tiers were flat),
 * while probability values remain capped at 100%. */
export const AWAKENING_MAX_TIER = 6;
function extendAwakeningToTierSix(spec: AwkSpec | undefined) {
  if (!spec) return;
  const extend = (values: number[], cap = Number.POSITIVE_INFINITY) => {
    if (values.length >= AWAKENING_MAX_TIER) return;
    while (values.length < AWAKENING_MAX_TIER) {
      const prev = values[values.length - 2] ?? 0;
      const last = values[values.length - 1] ?? 0;
      const delta = last - prev;
      // Preserve direction for descending stats such as cooldowns; flat stats
      // continue gaining a small 25% step at Tier VI.
      const bump = delta > 0 ? delta * 0.5 : delta < 0 ? delta * 0.5 : last > 0 ? last * 0.25 : 0;
      values.push(Math.round(Math.min(cap, last + bump) * 1000) / 1000);
    }
  };
  extend(spec.chance, 1);
  extend(spec.mult);
  if (spec.mult2) extend(spec.mult2);
}
for (const tower of TOWERS) {
  extendAwakeningToTierSix(tower.awk1);
  extendAwakeningToTierSix(tower.awk2);
}

/** tower id -> art family used by the canvas + the menu icon */
export function towerArt(def: TowerDef): string {
  return def.art || def.id;
}

export const TOWER_BY_ID: Record<string, TowerDef> = Object.fromEntries(
  TOWERS.map((t) => [t.id, t])
);

export const ROMAN = ["", "I", "II", "III", "IV", "V", "VI"];

export const MAX_MENU_LEVEL = 15;
export const MAX_BATTLE_LEVEL = 6;
export const POINT_STEP = 0.25; // +25% attack speed per point
export const POINT_DMG_STEP = 0.3; // +30% damage per point
export const ASC_DMG_MUL = 1.55; // every battle level multiplies damage
export const MAX_POINTS = 8;
export const SP_BASE_COST = 100;
export const SP_COST_STEP = 10;
/** ascension starts at 100 SP and climbs 100 a press — a deliberate sink that
 *  keeps summoning cheap and makes every in-battle upgrade a real decision */
export const ASC_BASE_COST = 100;
export const ASC_COST_STEP = 100;

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

/** SP price of one ascension, on its own ladder (never affected by summons). */
export function ascSpCost(spend: number) {
  return ASC_BASE_COST + ASC_COST_STEP * spend;
}

/** base SP every kill pays: 10, elites x5, bosses x10 */
export const KILL_SP = 10;
export const KILL_SP_ELITE = 5;
export const KILL_SP_BOSS = 10;
export function killSp(elite: boolean, boss: boolean) {
  return KILL_SP * (boss ? KILL_SP_BOSS : elite ? KILL_SP_ELITE : 1);
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

/** Enemy durability grows by 72% each wave, compounding with the run length. */
export const HP_GROWTH = 1.72;

/** Network bonus applied to both Power Plant damage and attack-speed auras. */
export function powerPlantNetworkScale(plantCount: number): number {
  if (plantCount >= 12) return 2;
  if (plantCount >= 8) return 1.75;
  if (plantCount >= 6) return 1.5;
  if (plantCount >= 4) return 1.25;
  return 1;
}

/**
 * Damage a tower deals per shot.
 * Menu levels add flat damage, battle levels multiply it, points multiply it again,
 * and aura buffs come in as `atkMul`. Growth is multiplicative so it can keep up
 * with the 1.72x enemy curve.
 */
// ---------- crit damage ----------------
/**
 * Crit damage is a single account-wide stat: the base crit multiplier plus a
 * bonus banked from every tower upgrade the player has ever bought. Each menu
 * level on every tower adds CRIT_DMG_PER_UPGRADE, and the running total is
 * merged into one number that every crit in the arena multiplies by.
 */
export const CRIT_CHANCE = 0.1;
/** multiplier a crit starts at before any upgrades (1.6x = +60%) */
export const CRIT_DMG_BASE = 0.6;
/** every single tower upgrade level adds +8% crit damage */
export const CRIT_DMG_PER_UPGRADE = 0.08;
/** hard ceiling on the merged bonus: 90,000% */
export const CRIT_DMG_MAX = 900;
/** 0.6 -> 60 (%) */
export const critPct = (bonus: number) => Math.min(CRIT_DMG_MAX, bonus) * 100;

/** every upgrade level bought across every tower */
export function towerUpgradeCount(levels: Record<string, number>): number {
  let n = 0;
  for (const lv of Object.values(levels || {})) n += Math.max(0, Math.min(MAX_MENU_LEVEL, lv) - 1);
  return n;
}

/** the merged account crit bonus, e.g. 3.4 = +340% */
export function critBonusFrom(levels: Record<string, number>): number {
  return Math.min(CRIT_DMG_MAX, CRIT_DMG_BASE + CRIT_DMG_PER_UPGRADE * towerUpgradeCount(levels));
}

/** the multiplier a crit applies, e.g. 4.4 */
export const critMultiplierFrom = (levels: Record<string, number>) => 1 + critBonusFrom(levels);

/** how much one more upgrade is worth, for the menus */
export function critAfterUpgrade(levels: Record<string, number>): number {
  return Math.min(CRIT_DMG_MAX, critBonusFrom(levels) + CRIT_DMG_PER_UPGRADE);
}

/** "27,400%" — the stat is meant to look enormous, so it gets thousands separators */
export const fmtCritPct = (bonus: number) =>
  `${Math.round(critPct(bonus)).toLocaleString("en-US")}%`;

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

/** gold price of one menu level — scaled by 0.95 (balance patch: tower upgrades -5%) */
export function upgradeGoldCost(level: number) {
  return Math.round(50 * 0.95 * Math.pow(1.5, level - 1));
}
export function upgradeFragCost(level: number) {
  return 1 + Math.floor(level / 3);
}
/** Mystical tower levels use gems only; the next level costs 500, then +75% each time. */
export function mysticalUpgradeCost(level: number) {
  return Math.round(500 * Math.pow(1.75, Math.max(0, level - 1)));
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
    rows.push({ label: "Attacks", value: def.id === "demon" ? "Unbuffable execution" : "Support tower", better: "up" });
  }
  if (def.id === "demon") {
    rows.push({ label: "Execution", value: "All enemies and bosses · ignores immunity", better: "up" });
    rows.push({ label: "Strike Interval", value: `${def.execCd || 5}s · unaffected by attack speed or buffs`, better: "down", maxed: true });
  }
  if (def.id === "supervisor") {
    rows.push({ label: "Kill Buff", value: "+1% ATK speed per kill · +2,000% cap", better: "up" });
    rows.push({ label: "Superbuff", value: "20% chance · +6,000% amplified", better: "up" });
    rows.push({ label: "Merge Strike", value: "Executes up to 10 path enemies", better: "up" });
  }
  if (def.id === "eclipse") {
    rows.push({ label: "Implosion", value: "Dragged back up the lane · slowed", better: "up" });
    rows.push({ label: "Dark Moon", value: "Burns a share of maximum health on every hit", better: "up" });
  }
  if (def.id === "seraph") {
    rows.push({ label: "Holy Choir", value: "Every hit arcs to nearby enemies", better: "up" });
    rows.push({ label: "Soul Tithe", value: `+${def.spGain || 0} SP per kill`, better: "up" });
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
  // every run-shop stat ladder is capped at 20 purchases, so a long endless
  // run can keep scaling without ever hitting a dead end
  { id: "dmg", name: "Forged Ammo", desc: "+21% tower damage for the rest of the run", cost: 90, step: 1.35, max: 20 },
  { id: "aspd", name: "Quickspring", desc: "+21% attack speed for the rest of the run", cost: 90, step: 1.35, max: 20 },
  { id: "critrate", name: "Keen Sight", desc: "+5% crit rate for the rest of the run", cost: 110, step: 1.3, max: 10 },
  { id: "critdmg", name: "Killing Edge", desc: "+15% crit damage for the rest of the run", cost: 110, step: 1.3, max: 10 },
  { id: "sp", name: "Mana Battery", desc: "Instantly gain 150 SP", cost: 60, step: 1.15, max: 20 },
  { id: "spgain", name: "Mana Conduit", desc: "+10% SP from every kill and wave clear for the rest of the run", cost: 120, step: 1.32, max: 10 },
  { id: "life", name: "Ward Stone", desc: "+3 lives for the rest of the run", cost: 140, step: 1.3, max: 20 },
  { id: "points", name: "Point Surge", desc: "+2 points on a random tower", cost: 130, step: 1.3, max: 20 },
  { id: "hero", name: "Hero Sigil", desc: "Reset your hero's cooldown right now", cost: 80, step: 1.2, max: 20 },
  { id: "ascend", name: "Ascension Scroll", desc: "Ascend a random tower to its next battle level", cost: 200, step: 1.35, max: 20 },
  { id: "meteor", name: "Meteor Strike", desc: "Smash every enemy on the field for 25% of its max HP", cost: 240, step: 1.4, max: 20 },
];

// ---------- gauntlet: the roguelite mode's boon pool ----------
export type GauntletBoonId =
  | "power"
  | "haste"
  | "edge"
  | "greed"
  | "mana"
  | "ward"
  | "barrage"
  | "ascension"
  | "bounty";

export interface GauntletBoon {
  id: GauntletBoonId;
  name: string;
  desc: string;
  color: string;
  glyph: string;
}

/**
 * THE GAUNTLET is a roguelite run: no wave cap, and every cleared wave offers
 * three boons. A boon is a permanent run modifier, so a deep run snowballs —
 * but the waves never stop coming and the run ends with your last life.
 */
export const GAUNTLET_BOONS: GauntletBoon[] = [
  { id: "power", name: "Rift Forged", desc: "+18% tower damage for the rest of the run", color: "#ff4d5e", glyph: "⚔" },
  { id: "haste", name: "Quickening", desc: "+12% attack speed for the rest of the run", color: "#35e0ff", glyph: "≫" },
  { id: "edge", name: "Killing Edge", desc: "+8% crit chance and +35% crit damage", color: "#ffd23f", glyph: "✦" },
  { id: "greed", name: "Deep Pockets", desc: "+25% run gold from every payout", color: "#ffb020", glyph: "◈" },
  { id: "mana", name: "Mana Font", desc: "+20% SP from kills and wave clears", color: "#b06bff", glyph: "❋" },
  { id: "ward", name: "Bulwark", desc: "+4 lives, right now", color: "#8fb0ff", glyph: "⛨" },
  { id: "barrage", name: "Barrage", desc: "+2 points on three random towers", color: "#ff4fd8", glyph: "⁂" },
  { id: "ascension", name: "Rift Surge", desc: "Ascend a random tower one battle level", color: "#3dff8e", glyph: "▲" },
  { id: "bounty", name: "War Chest", desc: "Instantly bank 500 run gold", color: "#ffe9a8", glyph: "▣" },
];

export function runShopCost(item: RunShopItem, bought: number) {
  return Math.round(item.cost * Math.pow(item.step ?? 1, bought));
}

// ---------- crystals (account-wide small buffs) ----------
/**
 * The crystal vault lives inside the Towers tab. Every crystal is a permanent,
 * account-wide buff paid for with **crystal potions** — a currency that only
 * drops from runs, events and monthly crates. The three Super Crystals have
 * stronger but explicitly capped account-wide effects.
 */
export type CrystalId = "ruby" | "sapphire" | "emerald" | "topaz" | "amethyst" | "diamond" | "magicianKing" | "superbolt" | "superCrit";

export interface CrystalDef {
  id: CrystalId;
  name: string;
  /** one-line flavour used on the card */
  desc: string;
  /** the stat the crystal feeds */
  stat: string;
  /** flat share added per level (0.02 = +2%) */
  perLevel: number;
  max: number;
  color: string;
  /** starting amount at level one; later levels add `perLevel` */
  base?: number;
  /** optional second stat bundled into a crystal */
  secondaryBase?: number;
  secondaryPerLevel?: number;
  secondaryMax?: number;
  /** cap the primary amount when the curve reaches its ceiling */
  maxValue?: number;
  /** true when the buff is flat lives rather than a percentage */
  flat?: boolean;
}

export const CRYSTAL_MAX_LEVEL = 20;
export const POTION_BASE_COST = 3;
export const POTION_COST_STEP = 1.22;

export const CRYSTALS: CrystalDef[] = [
  { id: "ruby", name: "Ruby", desc: "Molten core shards ground into every tower's ammunition.", stat: "Tower ATK", perLevel: 0.02, max: CRYSTAL_MAX_LEVEL, color: "#ff4d5e" },
  { id: "sapphire", name: "Sapphire", desc: "A calm blue lattice that sharpens every critical read.", stat: "Crit Chance", perLevel: 0.015, max: CRYSTAL_MAX_LEVEL, color: "#3fb6ff" },
  { id: "emerald", name: "Emerald", desc: "Rift sap that makes every kill spill more spell power.", stat: "SP Gain", perLevel: 0.03, max: CRYSTAL_MAX_LEVEL, color: "#3dff8e" },
  { id: "topaz", name: "Topaz", desc: "Sun-baked amber that draws extra gold out of the wreck.", stat: "Run Gold", perLevel: 0.03, max: CRYSTAL_MAX_LEVEL, color: "#ffcf4d" },
  { id: "amethyst", name: "Amethyst", desc: "A humming shard that speeds up every firing mechanism.", stat: "ATK Speed", perLevel: 0.02, max: CRYSTAL_MAX_LEVEL, color: "#c44dff" },
  { id: "diamond", name: "Diamond", desc: "A flawless ward crystal. Each level adds a starting life.", stat: "Start Lives", perLevel: 1, max: 10, color: "#9fe8ff", flat: true },
  { id: "magicianKing", name: "Magician King", desc: "A royal super crystal: +25% tower ATK and ATK speed at level 1, then +5% each level, capped at +75%.", stat: "ATK + Speed", base: 0.25, perLevel: 0.05, max: 11, maxValue: 0.75, color: "#ffd76a" },
  { id: "superbolt", name: "Superbolt", desc: "Raises the damage of lightning-type towers by +10% per level, up to +100%; lightning strikes chain behind their targets.", stat: "Lightning ATK", base: 0.1, perLevel: 0.1, max: 10, maxValue: 1, color: "#ffef77" },
  { id: "superCrit", name: "Super Crit", desc: "At level 1: +150% crit damage and +7.5% crit chance. Each later level adds +50% damage and +0.5% chance, capped at +850% and +22.5%.", stat: "Crit DMG + Chance", base: 1.5, perLevel: 0.5, max: 31, maxValue: 8.5, secondaryBase: 0.075, secondaryPerLevel: 0.005, secondaryMax: 0.225, color: "#ff4fd8" },
];

export const CRYSTAL_BY_ID: Record<CrystalId, CrystalDef> = Object.fromEntries(
  CRYSTALS.map((c) => [c.id, c])
) as Record<CrystalId, CrystalDef>;

/** potions needed to take a crystal from `level` to `level + 1` */
export function crystalUpgradeCost(level: number) {
  return Math.max(POTION_BASE_COST, Math.round(POTION_BASE_COST * Math.pow(POTION_COST_STEP, level)));
}

export interface CrystalBonus {
  /** +share of tower damage, e.g. 0.2 = +20% */
  atk: number;
  /** flat crit chance added to the base roll */
  crit: number;
  /** +share of SP from kills and wave clears */
  sp: number;
  /** +share of run gold */
  gold: number;
  /** +share of attack speed */
  aspd: number;
  /** extra starting lives */
  lives: number;
  /** Magician King: matching global damage and attack-speed buff */
  magicianKing: number;
  /** Superbolt: damage bonus for lightning-family towers */
  lightning: number;
  /** Super Crit: bonus crit damage and chance */
  critDamage: number;
  superCritChance: number;
}

export const NO_CRYSTAL_BONUS: CrystalBonus = { atk: 0, crit: 0, sp: 0, gold: 0, aspd: 0, lives: 0, magicianKing: 0, lightning: 0, critDamage: 0, superCritChance: 0 };

/** fold every crystal level into one set of run modifiers */
export function crystalBonus(levels: Partial<Record<CrystalId, number>>): CrystalBonus {
  const out: CrystalBonus = { ...NO_CRYSTAL_BONUS };
  for (const def of CRYSTALS) {
    const lv = Math.max(0, Math.min(def.max, Math.floor(levels[def.id] || 0)));
    if (lv <= 0) continue;
    const v = Math.min(def.maxValue ?? Number.POSITIVE_INFINITY, def.base !== undefined ? def.base + def.perLevel * (lv - 1) : def.perLevel * lv);
    if (def.id === "ruby") out.atk += v;
    else if (def.id === "sapphire") out.crit += v;
    else if (def.id === "emerald") out.sp += v;
    else if (def.id === "topaz") out.gold += v;
    else if (def.id === "amethyst") out.aspd += v;
    else if (def.id === "diamond") out.lives += v;
    else if (def.id === "magicianKing") out.magicianKing += v;
    else if (def.id === "superbolt") out.lightning += v;
    else if (def.id === "superCrit") {
      out.critDamage += v;
      out.superCritChance += Math.min(def.secondaryMax ?? Number.POSITIVE_INFINITY, (def.secondaryBase ?? 0) + (def.secondaryPerLevel ?? 0) * (lv - 1));
    }
  }
  return out;
}

/** "Ruby Lv 4 · +8% Tower ATK" — the line under a crystal card */
export function crystalBuffText(def: CrystalDef, level: number): string {
  if (level <= 0) return "Not awakened — spend crystal potions to ignite it";
  const v = Math.min(def.maxValue ?? Number.POSITIVE_INFINITY, def.base !== undefined ? def.base + def.perLevel * (level - 1) : def.perLevel * level);
  if (def.id === "superCrit") {
    const chance = Math.min(def.secondaryMax ?? Number.POSITIVE_INFINITY, (def.secondaryBase ?? 0) + (def.secondaryPerLevel ?? 0) * (level - 1));
    return `+${Math.round(v * 100)}% crit damage · +${(chance * 100).toFixed(1)}% crit chance`;
  }
  if (def.flat) return `+${Math.round(v)} starting ${v === 1 ? "life" : "lives"}`;
  return `+${(Math.round(v * 1000) / 10).toFixed(1).replace(/\.0$/, "")}% ${def.stat}`;
}

export type EnemyShape = "slime" | "runner" | "knight" | "mage" | "warlord" | "overlord" | "titan" | "hound" | "wraith" | "golem" | "leviathan" | "herald";

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
// eslint-disable-next-line prefer-const
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

/**
 * The third boss. A walking siege engine with its own shape, the biggest health
 * multiplier in the game and the full nine-skill kit.
 */
const TITAN: EnemyType = {
  name: "Void Titan",
  title: "Titan of the Last Rift",
  color: "#22d3ee",
  accent: "#d8fbff",
  shade: "#0b4a5c",
  shape: "titan",
  hpMul: 34,
  speed: 26,
  r: 34,
  armor: 0.3,
  lives: 10,
  gold: 90,
  legs: 2,
  bobRate: 0.5,
};
ENEMY_TYPES.push(TITAN);

/** index of the Void Titan in ENEMY_TYPES, for the wave comp and the cutscene */
export const TITAN_TYPE = ENEMY_TYPES.length - 1;

/**
 * THREE NEW RIFT-BORN MONSTERS.
 *
 * They are appended after the bosses so every existing type index (and every
 * saved run / test that pins one) keeps its meaning. Boss detection is a set
 * lookup rather than "index >= 4", precisely so a late monster can never be
 * mistaken for a boss.
 */
const HOUND: EnemyType = {
  name: "Rift Hound",
  title: "Starving Rift Hound",
  color: "#ff8a3d",
  accent: "#ffe0b0",
  shade: "#7a2c00",
  shape: "hound",
  hpMul: 1.35,
  speed: 96,
  r: 13,
  armor: 0.05,
  lives: 1,
  gold: 6,
  legs: 4,
  bobRate: 2.6,
};
const WRAITH: EnemyType = {
  name: "Cinder Wraith",
  title: "Ashen Cinder Wraith",
  color: "#b06bff",
  accent: "#f0dcff",
  shade: "#3a0f66",
  shape: "wraith",
  hpMul: 1.15,
  speed: 62,
  r: 14,
  armor: 0,
  lives: 2,
  gold: 7,
  legs: 0,
  bobRate: 1.1,
};
const GOLEM: EnemyType = {
  name: "Shard Golem",
  title: "Riftglass Shard Golem",
  color: "#6f8bff",
  accent: "#cfe2ff",
  shade: "#1d2c66",
  shape: "golem",
  hpMul: 2.6,
  speed: 34,
  r: 19,
  armor: 0.5,
  lives: 3,
  gold: 11,
  legs: 2,
  bobRate: 0.55,
};
/** the append slot for the new mobs — never hardcode the index */
const MOB_APPEND = ENEMY_TYPES.length;
ENEMY_TYPES.push(HOUND, WRAITH, GOLEM);
export const HOUND_TYPE = MOB_APPEND;
/** wraiths are weightless: nothing can slow them down */
export const WRAITH_TYPE = MOB_APPEND + 1;
export const GOLEM_TYPE = MOB_APPEND + 2;

/**
 * THE FOURTH BOSS — Abyss Leviathan. A coiled serpent that drags its own rift
 * behind it, ships the biggest health pool in the game and cycles the full
 * nine-skill kit. It leads the deep waves of every mode.
 */
const LEVIATHAN: EnemyType = {
  name: "Abyss Leviathan",
  title: "Devourer of the Deep Rift",
  color: "#2ee6c8",
  accent: "#d6fff7",
  shade: "#053f39",
  shape: "leviathan",
  hpMul: 46,
  speed: 22,
  r: 38,
  armor: 0.34,
  lives: 12,
  gold: 120,
  legs: 0,
  bobRate: 0.4,
};
ENEMY_TYPES.push(LEVIATHAN);
export const LEVIATHAN_TYPE = ENEMY_TYPES.length - 1;

/**
 * THE FIFTH BOSS — Storm Herald. An iron-skied executioner that rides a
 * personal thunderhead. It is the only boss that attacks the player's economy
 * (SP siphon), the only one that can knock every tower offline at once, and it
 * drags the horde forward behind it. Three skills, all exclusive to it.
 */
const HERALD: EnemyType = {
  name: "Storm Herald",
  title: "Sovereign of the Iron Sky",
  color: "#7ce7ff",
  accent: "#ffffff",
  shade: "#08313d",
  shape: "herald",
  hpMul: 52,
  speed: 25,
  r: 35,
  armor: 0.32,
  lives: 12,
  gold: 140,
  legs: 0,
  bobRate: 0.5,
};
ENEMY_TYPES.push(HERALD);
export const HERALD_TYPE = ENEMY_TYPES.length - 1;

/** every boss index, in the order they enter the campaign */
export const BOSS_TYPES = [4, 5, 6, TITAN_TYPE, LEVIATHAN_TYPE, HERALD_TYPE];
export const BOSS_TYPE = 4;
export const isBossType = (type: number) => BOSS_TYPES.includes(type);

export type BossSkillId =
  | "summon"
  | "blink"
  | "ward"
  | "enrage"
  | "nullfield"
  | "devour"
  | "meteor"
  | "chains"
  | "warp"
  | "warcry"
  | "cleave"
  | "banner"
  | "quake"
  | "undertow"
  | "siphon"
  | "overcharge"
  | "maelstrom";

export interface BossSkillRow {
  id: BossSkillId;
  name: string;
  tell: string;
  color: string;
  /** icon glyph drawn on the boss bar chip */
  glyph: string;
}

/**
 * Every skill a boss can pull out. Bosses do not all get the same kit — the
 * Devil walks in with three, the Rift Overlord cycles all nine — and each skill
 * fires off its own cooldown, so a long boss fight keeps changing shape.
 */
export const BOSS_SKILLS: BossSkillRow[] = [
  { id: "summon", name: "Rift Call", tell: "calls minions through the rift", color: "#c44dff", glyph: "❖" },
  { id: "blink", name: "Void Step", tell: "blinks down the path", color: "#35e0ff", glyph: "➤" },
  { id: "ward", name: "Bulwark", tell: "shields itself for a moment", color: "#8fb0ff", glyph: "⬢" },
  { id: "enrage", name: "Blood Frenzy", tell: "enrages below 45% health", color: "#ff4d5e", glyph: "✚" },
  { id: "nullfield", name: "Null Field", tell: "hexes the towers around it", color: "#b06bff", glyph: "⊗" },
  { id: "devour", name: "Soul Devour", tell: "eats its own minions to heal", color: "#ff8c3d", glyph: "✷" },
  { id: "meteor", name: "Meteor Fall", tell: "drops burning rocks on the grid", color: "#ff7a3d", glyph: "☄" },
  { id: "chains", name: "Rift Chains", tell: "shields every minion beside it", color: "#4de8ff", glyph: "⛓" },
  { id: "warp", name: "Warp Surge", tell: "wrenches the whole horde forward", color: "#ff4fd8", glyph: "⇉" },
  { id: "warcry", name: "War Cry", tell: "drives every nearby minion into a frenzy", color: "#ff9d4d", glyph: "♫" },
  { id: "cleave", name: "Shield Cleave", tell: "hacks the nearest tower offline", color: "#ff5d5d", glyph: "⚔" },
  { id: "banner", name: "Iron Banner", tell: "plates itself in living iron", color: "#ffd23f", glyph: "⚑" },
  { id: "quake", name: "Foundation Quake", tell: "shatters the ground under the grid", color: "#22d3ee", glyph: "≋" },
  { id: "undertow", name: "Undertow", tell: "drags the horde into its coils", color: "#2ee6c8", glyph: "🌀" },
  { id: "siphon", name: "Soul Siphon", tell: "bleeds SP out of your grid", color: "#c98cff", glyph: "🩸" },
  { id: "overcharge", name: "Overcharge", tell: "arcs lightning through your towers", color: "#7ce7ff", glyph: "⚡" },
  { id: "maelstrom", name: "Maelstrom", tell: "hurls the whole horde down the lane", color: "#4de8ff", glyph: "🌪" },
];

export const BOSS_SKILL_BY_ID: Record<BossSkillId, BossSkillRow> = Object.fromEntries(
  BOSS_SKILLS.map((s) => [s.id, s])
) as Record<BossSkillId, BossSkillRow>;

/**
 * boss type -> ITS OWN kit. No two bosses share a skill: the Warlord fights
 * with banners and cleaves, the Overlord with the rift, the Titan with the
 * ground itself, the Leviathan with its coils, and the Storm Herald with the
 * sky. Every entry here is exclusive to that boss.
 */
export const BOSS_KITS: Record<number, BossSkillId[]> = {
  4: ["warcry", "cleave", "banner"],
  5: ["summon", "nullfield", "warp"],
  6: ["quake", "meteor", "enrage"],
};
BOSS_KITS[LEVIATHAN_TYPE] = ["devour", "chains", "undertow"];
BOSS_KITS[HERALD_TYPE] = ["siphon", "overcharge", "maelstrom"];

export const bossKit = (type: number): BossSkillId[] => BOSS_KITS[type] || BOSS_KITS[BOSS_TYPE];

export const BOSS_SUMMON_CD = 11;
export const BOSS_BLINK_CD = 9;
export const BOSS_WARD_CD = 14;
export const BOSS_WARD_TIME = 3.4;
export const BOSS_ENRAGE_AT = 0.45;
/** Null Field: towers caught in the hex fire this much slower */
export const BOSS_NULL_CD = 13;
export const BOSS_NULL_RADIUS = 210;
export const BOSS_NULL_TIME = 5;
export const BOSS_NULL_SLOW = 0.62;
/** Soul Devour: eats its own minions for a share of its max HP each */
export const BOSS_DEVOUR_CD = 16;
export const BOSS_DEVOUR_HEAL = 0.045;
/** Meteor Fall: burning rocks that smash towers offline for a few seconds */
export const BOSS_METEOR_CD = 12;
export const BOSS_METEOR_COUNT = 3;
export const BOSS_METEOR_DOWN = 4.5;
/** Rift Chains: minions near the boss take much less damage */
export const BOSS_CHAINS_CD = 15;
export const BOSS_CHAINS_RADIUS = 230;
export const BOSS_CHAINS_TIME = 5;
export const BOSS_CHAINS_DR = 0.55;
/** Warp Surge: drags the whole horde down the lane */
export const BOSS_WARP_CD = 18;
export const BOSS_WARP_DIST = 150;

// ---------- boss-exclusive skills ----------
/** War Cry: nearby minions sprint for a while */
export const BOSS_WARCRY_CD = 12;
export const BOSS_WARCRY_RADIUS = 320;
export const BOSS_WARCRY_TIME = 5;
export const BOSS_WARCRY_HASTE = 0.45;
/** Shield Cleave: the nearest tower goes offline */
export const BOSS_CLEAVE_CD = 11;
export const BOSS_CLEAVE_DOWN = 2.2;
/** Iron Banner: temporary armour plating */
export const BOSS_BANNER_CD = 15;
export const BOSS_BANNER_TIME = 6;
export const BOSS_BANNER_ARMOR = 0.25;
/** Foundation Quake: every tower near the boss is knocked out */
export const BOSS_QUAKE_CD = 17;
export const BOSS_QUAKE_RADIUS = 300;
export const BOSS_QUAKE_DOWN = 2.6;
/** Undertow: pulls the horde backwards into the boss */
export const BOSS_UNDERTOW_CD = 14;
export const BOSS_UNDERTOW_PULL = 90;
/** Soul Siphon: steals run SP and heals */
export const BOSS_SIPHON_CD = 13;
export const BOSS_SIPHON_SP = 90;
export const BOSS_SIPHON_HEAL = 0.025;
/** Overcharge: lightning arcs knock towers offline */
export const BOSS_OVERCHARGE_CD = 10;
export const BOSS_OVERCHARGE_TARGETS = 3;
export const BOSS_OVERCHARGE_DOWN = 2;
/** Maelstrom: hurls the horde forward and hastes it */
export const BOSS_MAELSTROM_CD = 16;
export const BOSS_MAELSTROM_DIST = 130;

export function roundHp(round: number) {
  return 46 * Math.pow(HP_GROWTH, round - 1);
}

/**
 * Bosses receive a dedicated +78% health scale; normal enemies and elites use
 * the regular-enemy scale, with elites also carrying their 2.8x elite modifier.
 * Type-specific multipliers remain on top. Speed, armour, lives and gold are untouched.
 */
export const BOSS_HP_MUL = 1.78;

/**
 * Non-boss enemies receive +90% maximum health at spawn time, including
 * elites, normal waves and Rift Call summons. Bosses use BOSS_HP_MUL instead; elites
 * additionally have 2.8x their type-scaled health.
 */
export const ENEMY_HP_SCALE = 1.9;
/** Elites are markedly tougher than their base enemy type. */
export const ELITE_HP_MUL = 2.8;

/**
 * Compact number for the in-battle health readout: 987, 12.3k, 4.56M, 7.9B.
 * Enemies scale exponentially with the wave, so a raw 47-digit number would
 * never fit over a slime's head.
 */
export function shortHp(v: number): string {
  const n = Math.max(0, v);
  if (n < 1000) return String(Math.ceil(n - 1e-9));
  const units = ["k", "M", "B", "T", "Qa"];
  let x = n;
  let u = -1;
  while (x >= 1000 && u < units.length - 1) {
    x /= 1000;
    u++;
  }
  const pick = () => (x >= 100 ? 0 : x >= 10 ? 1 : 2);
  let digits = pick();
  let t = x.toFixed(digits);
  // rounding can push 999.6k to "1000k" - step up a unit instead
  if (Number(t) >= 1000 && u < units.length - 1) {
    x /= 1000;
    u++;
    digits = pick();
    t = x.toFixed(digits);
  }
  return `${t.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")}${units[u]}`;
}

/**
 * Run gold is paid out 50% richer: every kill, every bounty awakening and the
 * wave-clear purse. Account gold from chests and tasks is a different economy
 * and is not touched by this. Whatever is left in the wallet is settled when the
 * run ends, so the bonus carries into the results screen too.
 */
export const GOLD_GAIN_MUL = 1.5;
export const runGold = (v: number) => Math.round(v * GOLD_GAIN_MUL);

export const WAVE_ENEMY_COUNT = 10;
export const SPAWN_INTERVAL_SECONDS = 0.72;
export const SPAWN_INTERVAL_STEP = 0.00002;
export function enemySpawnInterval(wave: number): number {
  return Math.max(0.08, SPAWN_INTERVAL_SECONDS - Math.max(0, wave - 1) * SPAWN_INTERVAL_STEP);
}

export function waveComp(round: number, randomRoll: () => number = Math.random): number[] {
  const bosses: number[] = [];
  // Bosses take slots in the fixed ten-enemy wave rather than adding extra kills.
  if (round % 4 === 0) bosses.push(round >= 32 ? 6 : round >= 16 ? 5 : 4);
  if (round >= 16 && round % 4 === 0) bosses.push(round >= 32 ? 5 : 4);
  if (round >= 32 && round % 8 === 0) bosses.push(6);
  if (round >= 20 && round % 8 === 0) bosses.push(LEVIATHAN_TYPE);
  // the Storm Herald takes the deepest slot: first seen on round 24
  if (round >= 24 && round % 12 === 0) bosses.push(HERALD_TYPE);

  const regularCount = Math.max(0, WAVE_ENEMY_COUNT - bosses.length);
  const out: number[] = [];
  for (let i = 0; i < regularCount; i++) {
    let t = 0;
    const roll = randomRoll();
    if (round >= 7 && roll < 0.16) t = 3;
    else if (round >= 5 && roll < 0.3) t = 2;
    else if (round >= 3 && roll < 0.54) t = 1;
    else if (round >= 13 && roll < 0.64) t = GOLEM_TYPE;
    else if (round >= 11 && roll < 0.76) t = WRAITH_TYPE;
    else if (round >= 9 && roll < 0.9) t = HOUND_TYPE;
    out.push(t);
  }
  return [...out, ...bosses];
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
export const HERO_MAX_LEVEL = 20;
/** gold needed to take a hero from `lv` to `lv + 1` */
export const heroUpgradeCost = (lv: number) => Math.round(120 * Math.pow(1.45, Math.max(0, lv - 1)));
/** every level adds 30% ability power (damage, burn, freeze/overdrive duration) */
export const heroPower = (lv: number) => 1 + 0.3 * (Math.max(1, lv) - 1);
/** and shaves 3% off the cooldown, down to a floor of 60% */
export const heroCooldown = (cd: number, lv: number) =>
  cd * Math.max(0.6, 1 - 0.03 * (Math.max(1, lv) - 1));

// ---------- hero awakenings ----------
/**
 * Hero awakenings are a separate track from tower awakenings: they are bought
 * with Magic Tokens, they are per-hero, and they can be taken at any hero
 * level. Each hero gets two exclusive paths.
 */
export interface HeroAwkSpec {
  id: string;
  name: string;
  /** true when the path is always on instead of riding the ultimate */
  passive?: boolean;
  /** one-line flavour shown on the card */
  desc: string;
  /** short label for the effect at a given tier (1..6) */
  fmt: (tier: number) => string;
}

export const HERO_AWAKENING_MAX_TIER = 6;
/** Magic Token price of one hero awakening tier */
export function heroAwakenCost(tier: number) {
  return Math.round(40 * Math.pow(1.6, Math.max(0, tier - 1)));
}

/** Electrical Induction: shield strip applied by any lightning strike */
export const inductionShieldCut = (tier: number) => (tier > 0 ? 1.2 + 0.2 * (tier - 1) : 0);
/** Electrical Induction: bonus SP and run gold on lightning kills */
export const inductionBonus = (tier: number) => (tier > 0 ? 0.5 + 0.05 * (tier - 1) : 0);
/** Bolt from the Blue: the health share that arms the passive bolt */
export const boltThreshold = (tier: number) => (tier > 0 ? Math.max(0.4, 0.8 - 0.01 * (tier - 1)) : 0);
/** Bolt from the Blue: chance a hero cast resets its own cooldown */
export const boltResetChance = (tier: number) => (tier > 0 ? Math.min(0.95, 0.4 + 0.02 * (tier - 1)) : 0);
/** Bolt from the Blue: the interval left on the cooldown after a reset */
export const boltResetInterval = (tier: number) => (tier > 0 ? Math.max(0.2, 0.5 - 0.01 * (tier - 1)) : 0);

const awkTier = (tier: number) => Math.max(1, Math.min(HERO_AWAKENING_MAX_TIER, tier));

export const HERO_AWAKENINGS: Record<string, [HeroAwkSpec, HeroAwkSpec]> = {
  thunder: [
    {
      id: "induction",
      name: "Electrical Induction",
      desc: "Every lightning strike stuns its target and strips their shield for 5s. Lightning kills pay +50% SP and run gold.",
      fmt: (tier) => {
        const t = awkTier(tier);
        return `${Math.round(inductionShieldCut(t) * 100)}% shield cut · +${Math.round(inductionBonus(t) * 100)}% SP & gold on lightning kills`;
      },
    },
    {
      id: "boltblue",
      name: "Bolt from the Blue",
      passive: true,
      desc: "Passive: enemies that fall below 80% health are struck by a thin bolt. Hero casts have a 40% chance to reset the cooldown to a 0.5s interval.",
      fmt: (tier) => {
        const t = awkTier(tier);
        return `bolts below ${Math.round(boltThreshold(t) * 100)}% HP · ${Math.round(boltResetChance(t) * 100)}% cooldown reset at ${boltResetInterval(t).toFixed(2)}s`;
      },
    },
  ],
};

export function heroAwkSpec(heroId: string, slot: 0 | 1): HeroAwkSpec | null {
  const pair = HERO_AWAKENINGS[heroId];
  return pair ? pair[slot] : null;
}

/** "+120% shield cut · +50% SP & gold …" for the hero card */
export function heroAwkText(heroId: string, slot: 0 | 1, tier: number): string {
  const spec = heroAwkSpec(heroId, slot);
  if (!spec) return "";
  if (tier <= 0) return spec.passive ? "Passive · not awakened" : "Not awakened";
  return spec.fmt(awkTier(tier));
}

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
  /** crystal potions, the currency the crystal vault runs on */
  potions?: number;
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
  { chests: [{ id: "legendary", n: 1 }], potions: 2, label: "Legendary Chest + 2 potions", icon: "chest", accent: "#ffb324" },
  { frags: 5, rarity: "legendary", label: "×5 legendary tower fragments", icon: "frag", accent: "#ffb324" },
  { gold: 25000, gems: 900, label: "25,000 gold + 900 gems", icon: "gold", accent: "#ffcf4d" },
  { chips: { basic: 5, advanced: 2 }, label: "×5 basic + ×2 advanced chips", icon: "chip", accent: "#c44dff" },
  { chests: [{ id: "legendary", n: 3 }], potions: 3, label: "×3 Legendary Chests + 3 potions", icon: "chest", accent: "#ffb324" },
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
  // task gold/gems are scaled by 0.9 (balance patch: task rewards -10%)
  { id: "play", name: "Answer the Call", desc: "Finish any run", need: 3, points: 10, gold: 2250, gems: 36, color: "#8fb0ff" },
  { id: "win", name: "Hold the Line", desc: "Win a Battle run", need: 2, points: 20, gold: 5400, gems: 108, color: "#3dff8e" },
  { id: "waves", name: "Wave Breaker", desc: "Clear waves", need: 20, points: 15, gold: 3600, gems: 63, color: "#35e0ff" },
  { id: "kills", name: "Cull the Rift", desc: "Destroy enemies", need: 150, points: 15, gold: 4050, gems: 72, color: "#ff4d5e" },
  { id: "skill", name: "Hero's Moment", desc: "Unleash hero skills", need: 5, points: 10, gold: 1800, gems: 45, color: "#ff4fd8" },
  { id: "upgrade", name: "Arsenal Work", desc: "Upgrade towers or heroes", need: 4, points: 10, gold: 2700, gems: 54, color: "#ffcf4d" },
  { id: "chests", name: "Lockbreaker", desc: "Open chests", need: 3, points: 10, gold: 2250, gems: 50, color: "#c44dff" },
  { id: "spend", name: "Big Spender", desc: "Spend gold", need: 20000, points: 10, gold: 1350, gems: 81, color: "#ffb324" },
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
  /** crystal potions handed over with the crate */
  potions?: number;
}

/** the three chests on the daily task point track */
export const TASK_MILESTONES: TaskMilestone[] = [
  { points: 30, label: "Supply Cache", color: "#8fe9ff", chests: [{ id: "silver", n: 1 }], gems: 150, chips: { basic: 2 }, potions: 2 },
  { points: 60, label: "War Cache", color: "#c44dff", chests: [{ id: "support", n: 1 }, { id: "epic", n: 1 }], gems: 400, chips: { basic: 3, advanced: 1 }, potions: 4 },
  { points: TASK_POINTS_TOTAL, label: "Perfect Day", color: "#ffb324", chests: [{ id: "legendary", n: 2 }], gems: 1000, chips: { advanced: 3, elite: 1 }, potions: 8 },
];

// ---------- weekly event rotation ----------
export type EventId = "luck" | "chestbox" | "trophy" | "items" | "mineshaft" | "gemrush";

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
    id: "gemrush",
    name: "Gem Rush",
    days: [0],
    tagline: "Sunday",
    desc: "Hold the arena for five minutes. Each ordinary kill earns 50 gems; elites pay 5× and bosses 10×. Monsters have 12× health and move 50% faster.",
    perk: "5-minute survival · 50 gems per kill · elites ×5 · bosses ×10",
    color: "#35e0ff",
    icon: "gemrush",
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

export const GEM_RUSH_SECONDS = 5 * 60;
export const GEM_RUSH_NORMAL_GEMS = 50;
export const GEM_RUSH_ELITE_GEMS = 5;
export const GEM_RUSH_BOSS_GEMS = 10;
export const GEM_RUSH_HP_MUL = 12;
export const GEM_RUSH_SPEED_MUL = 1.5;
export function gemRushKillGems(elite: boolean, boss: boolean): number {
  return GEM_RUSH_NORMAL_GEMS * (boss ? GEM_RUSH_BOSS_GEMS : elite ? GEM_RUSH_ELITE_GEMS : 1);
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
    case "gemrush":
      return BASE_EVENT_BONUS;
  }
}

// ---------- monthly events ----------
export type MonthId =
  | "arsenal"
  | "heartfire"
  | "riftwinds"
  | "awakening"
  | "golden"
  | "gemrain"
  | "siege"
  | "festival"
  | "bounty"
  | "nightfall"
  | "harvest"
  | "winter";

export interface MonthlyEvent {
  id: MonthId;
  name: string;
  /** 0 = January … 11 = December, matching Date#getMonth */
  month: number;
  tagline: string;
  desc: string;
  perk: string;
  color: string;
}

/**
 * One event per calendar month, stacking on top of the weekday rotation.
 * Each one applies real numbers through `monthlyEventBonus()`.
 */
export const MONTHLY_EVENTS: MonthlyEvent[] = [
  {
    id: "arsenal",
    name: "New Year Arsenal",
    month: 0,
    tagline: "January",
    desc: "The forges reopen for the new year. Every tower upgrade is cheaper all month.",
    perk: "Tower upgrades -15% gold",
    color: "#8fb0ff",
  },
  {
    id: "heartfire",
    name: "Heartfire",
    month: 1,
    tagline: "February",
    desc: "The rift runs warm. Enemies pour more spell power into the grid when they fall.",
    perk: "+35% SP per kill",
    color: "#ff6b8a",
  },
  {
    id: "riftwinds",
    name: "Rift Winds",
    month: 2,
    tagline: "March",
    desc: "Tailwinds at your back: the horde marches weaker and the salvage crews pay more.",
    perk: "Enemy HP -8% · gold +25%",
    color: "#7fe9ff",
  },
  {
    id: "awakening",
    name: "Awakening Season",
    month: 3,
    tagline: "April",
    desc: "The towers stir. Fragment finds lean rare and every chest rolls an extra fragment.",
    perk: "+1 chest fragment · fragment rarity bias +0.3",
    color: "#c44dff",
  },
  {
    id: "golden",
    name: "Golden Bloom",
    month: 4,
    tagline: "May",
    desc: "Gold blooms across the arena floor. Everything you bank is worth half again as much.",
    perk: "+55% gold from every run",
    color: "#ffcf4d",
  },
  {
    id: "gemrain",
    name: "Gem Rain",
    month: 5,
    tagline: "June",
    desc: "The sky crystallises. Gem payouts from runs nearly double.",
    perk: "+90% gems from every run",
    color: "#35e0ff",
  },
  {
    id: "siege",
    name: "Midyear Siege",
    month: 6,
    tagline: "July",
    desc: "The horde tests the walls early — they hit harder, but spill far more spell power.",
    perk: "+45% SP per kill · enemy HP +8%",
    color: "#ff4d5e",
  },
  {
    id: "festival",
    name: "Tower Festival",
    month: 7,
    tagline: "August",
    desc: "Artisans flood the arena. Tower upgrades are at their cheapest all year.",
    perk: "Tower upgrades -20% gold",
    color: "#8effc4",
  },
  {
    id: "bounty",
    name: "Bounty Hunt",
    month: 8,
    tagline: "September",
    desc: "The marshals post bounties on the whole horde. Kills pay in gold and spell power.",
    perk: "+40% gold · +25% SP per kill",
    color: "#ffb324",
  },
  {
    id: "nightfall",
    name: "Nightfall",
    month: 9,
    tagline: "October",
    desc: "Long dark nights. The horde is tougher, but the rift gems glow brighter than ever.",
    perk: "2x gems from runs · enemy HP +12%",
    color: "#b14dff",
  },
  {
    id: "harvest",
    name: "Harvest",
    month: 10,
    tagline: "November",
    desc: "Gather everything. Gold pours in and salvage crews pull extra fragments from chests.",
    perk: "+65% gold · +1 chest fragment",
    color: "#ff8c3d",
  },
  {
    id: "winter",
    name: "Winter Festival",
    month: 11,
    tagline: "December",
    desc: "The season of gifts: gems, spell power and cheaper upgrades all month long.",
    perk: "+55% gems · +20% SP · tower upgrades -10%",
    color: "#9fe8ff",
  },
];

export const MONTH_BY_ID: Record<MonthId, MonthlyEvent> = Object.fromEntries(
  MONTHLY_EVENTS.map((m) => [m.id, m])
) as Record<MonthId, MonthlyEvent>;

/** the event live for the calendar month (defaults to now) */
export function monthlyEventForDate(d: Date = new Date()): MonthlyEvent {
  const month = d.getMonth();
  return MONTHLY_EVENTS.find((m) => m.month === month) || MONTHLY_EVENTS[0];
}

export interface MonthlyBonus {
  goldMul: number;
  gemMul: number;
  spMul: number;
  hpMul: number;
  upgradeCostMul: number;
  fragBias: number;
  chestFragBonus: number;
}

export const BASE_MONTHLY_BONUS: MonthlyBonus = {
  goldMul: 1,
  gemMul: 1,
  spMul: 1,
  hpMul: 1,
  upgradeCostMul: 1,
  fragBias: 0,
  chestFragBonus: 0,
};

/**
 * Monthly events are a three-tier reward track now. Every run banks event
 * points (waves cleared + a clear bonus), and each monthly event pays out at
 * 120 / 300 / 600 points. The tiers are deliberately front-loaded so a player
 * who only plays a little still gets something, while the 600-point cap takes
 * a couple of weeks of steady runs.
 */
export interface MonthlyTier {
  points: number;
  label: string;
  gold: number;
  gems: number;
  potions: number;
  chips?: ChipBag;
}

export const MONTHLY_TIER_POINTS = [120, 300, 600] as const;

/** the three reward crates for a month's event, coloured by the event itself */
export function monthlyTiers(id: MonthId): MonthlyTier[] {
  const ev = MONTH_BY_ID[id] || MONTHLY_EVENTS[0];
  const idx = MONTHLY_EVENTS.indexOf(ev);
  const mul = 1 + Math.max(0, idx) * 0.06; // later months pay a touch more
  return [
    {
      points: MONTHLY_TIER_POINTS[0],
      label: "Event Cache",
      gold: Math.round(6000 * mul),
      gems: Math.round(90 * mul),
      potions: 4,
      chips: { basic: 3 },
    },
    {
      points: MONTHLY_TIER_POINTS[1],
      label: "Event Vault",
      gold: Math.round(16000 * mul),
      gems: Math.round(240 * mul),
      potions: 8,
      chips: { basic: 6, advanced: 2 },
    },
    {
      points: MONTHLY_TIER_POINTS[2],
      label: "Month Crown",
      gold: Math.round(36000 * mul),
      gems: Math.round(520 * mul),
      potions: 16,
      chips: { advanced: 4, elite: 1 },
    },
  ];
}

/** numeric modifiers for the monthly event — the single source of truth for its perk */
export function monthlyEventBonus(id: MonthId): MonthlyBonus {
  switch (id) {
    case "arsenal":
      return { ...BASE_MONTHLY_BONUS, upgradeCostMul: 0.85 };
    case "heartfire":
      return { ...BASE_MONTHLY_BONUS, spMul: 1.35 };
    case "riftwinds":
      return { ...BASE_MONTHLY_BONUS, hpMul: 0.92, goldMul: 1.25 };
    case "awakening":
      return { ...BASE_MONTHLY_BONUS, fragBias: 0.3, chestFragBonus: 1 };
    case "golden":
      return { ...BASE_MONTHLY_BONUS, goldMul: 1.55 };
    case "gemrain":
      return { ...BASE_MONTHLY_BONUS, gemMul: 1.9 };
    case "siege":
      return { ...BASE_MONTHLY_BONUS, spMul: 1.45, hpMul: 1.08 };
    case "festival":
      return { ...BASE_MONTHLY_BONUS, upgradeCostMul: 0.8 };
    case "bounty":
      return { ...BASE_MONTHLY_BONUS, goldMul: 1.4, spMul: 1.25 };
    case "nightfall":
      return { ...BASE_MONTHLY_BONUS, gemMul: 2, hpMul: 1.12 };
    case "harvest":
      return { ...BASE_MONTHLY_BONUS, goldMul: 1.65, chestFragBonus: 1 };
    case "winter":
      return { ...BASE_MONTHLY_BONUS, gemMul: 1.55, spMul: 1.2, upgradeCostMul: 0.9 };
  }
}

// ---------- trophies & competition ----------
export const TROPHY_WIN = 70;
export const TROPHY_LOSS = 20;
/** Wins build momentum, rewarding streaks without making a single match decisive. */
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
export const trophyStreakBonus = (currentStreak: number): number => Math.min(50, Math.max(0, Math.floor(currentStreak)) * 5);

export function trophyDelta(won: boolean, bonus: EventBonus = BASE_EVENT_BONUS, currentStreak = 0): number {
  return won ? TROPHY_WIN + bonus.trophyWin + trophyStreakBonus(currentStreak) : -(TROPHY_LOSS - bonus.trophyLoss);
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
  /** special fixed-outcome reward table for the Mystical Chest */
  special?: "mystical";
  blurb: string;
}

export const CHESTS: ChestDef[] = [
  { id: "common", name: "Common Chest", cost: 80, gem: 1, color: "#9fb4c7", gold: [8, 20], frags: [1, 2], bias: 0, blurb: "Cheap and cheerful." },
  { id: "silver", name: "Silver Chest", cost: 200, gem: 1, color: "#cfd8e6", gold: [30, 70], frags: [3, 5], bias: 0.15, blurb: "Steady fragment income." },
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
    cost: 500,
    gem: 1,
    color: "#ff4fd8",
    gold: [60, 150],
    frags: [0, 1],
    heroShards: [4, 9],
    bias: 0.3,
    blurb: "Hero shards — level heroes for free.",
  },
  { id: "epic", name: "Epic Chest", cost: 800, gem: 1, color: "#c44dff", gold: [60, 140], frags: [5, 8], bias: 0.45, blurb: "Epic-leaning fragments." },
  { id: "legendary", name: "Legendary Chest", cost: 2000, gem: 1, color: "#ffb324", gold: [150, 320], frags: [8, 12], bias: 1, blurb: "Best odds at a legendary." },
  { id: "mystical", name: "Mystical Chest", cost: 4000, gem: 1, color: "#ff315c", gold: [0, 0], frags: [0, 0], bias: 1, special: "mystical", blurb: "65%: five legendary fragments · 35%: one mystical fragment — Supervisor, Eclipse Oracle or Astral Seraph." },
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
  { id: "astral", name: "Astral Cartographers", tag: "AST", members: 38, power: 6420, trophyReq: 250, color: "#63ffe1", motto: "Map the stars. Master the Rift.", perk: "+5% gems from completed runs" },
  { id: "ironclad", name: "Ironclad Protocol", tag: "ICP", members: 72, power: 11040, trophyReq: 1200, color: "#a8b5d8", motto: "No breach goes unanswered.", perk: "+8% gold from completed runs" },
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

// ---------- mail ----------
/**
 * The mailbox. Messages are static content with an optional attachment; the save
 * only records which ones have been read and which rewards were taken, so a new
 * message can be shipped simply by adding a row here.
 */
export type MailKind = "system" | "reward" | "season" | "guild" | "gift";

export interface MailItem {
  id: string;
  kind: MailKind;
  from: string;
  subject: string;
  body: string;
  /** shown when the mail is not claimable (a plain announcement) */
  color: string;
  /** optional reward, claimed with the CLAIM button */
  reward?: { gold?: number; gems?: number; tokens?: number; potions?: number; frags?: number; chips?: number };
  /** game-day stamp the message pretends to have been sent on */
  age: string;
}

export const MAIL_KIND: Record<MailKind, { label: string; color: string; glyph: string }> = {
  system: { label: "SYSTEM", color: "#8fb0ff", glyph: "⚙" },
  reward: { label: "REWARD", color: "#ffcf4d", glyph: "★" },
  season: { label: "SEASON", color: "#ff4fd8", glyph: "◈" },
  guild: { label: "GUILD", color: "#3dff8e", glyph: "✉" },
  gift: { label: "GIFT", color: "#35e0ff", glyph: "✦" },
};

export const MAIL: MailItem[] = [
  {
    id: "welcome",
    kind: "gift",
    from: "The Rift Watch",
    subject: "Welcome to the Watch",
    body: "Your first squad is paid for. Take these supplies and hold the line — the rift does not sleep.",
    color: "#35e0ff",
    reward: { gold: 4000, gems: 150, chips: 4 },
    age: "day 1",
  },
  {
    id: "season-open",
    kind: "season",
    from: "Season Command",
    subject: "Season 1 has begun",
    body: "Trophies now feed the season track. Every tier you pass hands over a crate — see Specials → Season.",
    color: "#ff4fd8",
    reward: { tokens: 5, gems: 100 },
    age: "day 1",
  },
  {
    id: "arsenal",
    kind: "system",
    from: "Quartermaster",
    subject: "New towers unlocked",
    body: "The Mythic Arsenal has been cleared for deployment. Reaper's Toll, Prism Array, Aegis Core and Hellgate are in the roster.",
    color: "#c9a7ff",
    reward: { frags: 6 },
    age: "day 2",
  },
  {
    id: "awakenings",
    kind: "system",
    from: "Awakened Council",
    subject: "Every tower can awaken",
    body: "Two awakenings per tower, six tiers each. Tier VI pushes each effect beyond its former limit. Spend Magic Tokens at the Towers screen to grow stronger.",
    color: "#ffcf4d",
    reward: { tokens: 8 },
    age: "day 3",
  },
  {
    id: "boss-warning",
    kind: "system",
    from: "Rift Watch",
    subject: "Something bigger is coming",
    body: "Scouts report a Titan walking the far side of the rift. It arrives after round 30. Bring crit damage.",
    color: "#22d3ee",
    age: "day 4",
  },
];

export const MAIL_BY_ID: Record<string, MailItem> = Object.fromEntries(MAIL.map((m) => [m.id, m]));

// ---------- season ----------
/**
 * The season track. Season points come off the trophy ladder (and a little off
 * wins), each tier pays out once, and the season rolls over on a fixed
 * 30-day cycle keyed to the epoch — so the numbering is the same for everyone.
 */
export const SEASON_LENGTH_DAYS = 30;
export const SEASON_POINTS_PER_TROPHY = 1;
export const SEASON_POINTS_PER_WIN = 12;

export interface SeasonTier {
  /** season points needed to unlock this tier */
  at: number;
  name: string;
  color: string;
  gems?: number;
  gold?: number;
  tokens?: number;
  frags?: number;
  chips?: number;
}

export const SEASON_TIERS: SeasonTier[] = [
  { at: 0, name: "Scout", color: "#8fb0ff", gold: 1500, gems: 40 },
  { at: 120, name: "Ranger", color: "#35e0ff", gold: 3000, gems: 60, chips: 1 },
  { at: 300, name: "Warden", color: "#3dff8e", gold: 5000, gems: 90, chips: 2 },
  { at: 560, name: "Captain", color: "#ffcf4d", gold: 8000, gems: 140, tokens: 3 },
  { at: 900, name: "Commander", color: "#ffb324", gold: 12000, gems: 200, chips: 3 },
  { at: 1350, name: "Champion", color: "#ff8c3d", gold: 18000, gems: 280, tokens: 6 },
  { at: 1900, name: "Warlord", color: "#ff4fd8", gold: 26000, gems: 380, chips: 5 },
  { at: 2600, name: "Ascendant", color: "#c44dff", gold: 36000, gems: 500, tokens: 10 },
  { at: 3500, name: "Mythic", color: "#ff4fd8", gold: 50000, gems: 700, frags: 8 },
  { at: 4600, name: "Rift Sovereign", color: "#ffcf4d", gold: 75000, gems: 1000, tokens: 20, frags: 12 },
];

/** which season we are in, counted from the epoch in 30-day blocks */
export function seasonNumber(now = Date.now()): number {
  return 1 + Math.floor(now / (SEASON_LENGTH_DAYS * 86400000));
}

/** 0..1 progress through the current season */
export function seasonProgress(now = Date.now()): number {
  const span = SEASON_LENGTH_DAYS * 86400000;
  return (now % span) / span;
}

/** season points earned so far, from the trophy ladder */
export function seasonPoints(trophies: number, wins: number): number {
  return Math.max(0, Math.round(trophies)) * SEASON_POINTS_PER_TROPHY + Math.max(0, wins) * SEASON_POINTS_PER_WIN;
}

/** index of the highest tier the player has unlocked, -1 if none */
export function seasonTierFor(points: number): number {
  let idx = -1;
  SEASON_TIERS.forEach((t, i) => {
    if (points >= t.at) idx = i;
  });
  return idx;
}
