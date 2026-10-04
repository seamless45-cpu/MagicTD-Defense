import {
  DAILY_REWARDS,
  HERO_BY_ID,
  HERO_MAX_LEVEL,
  RARITY,
  TOWER_BY_ID,
  heroUpgradeCost,
  type Rarity,
} from "./data";

export interface SaveData {
  gold: number;
  gems: number;
  tokens: number;
  levels: Record<string, number>; // tower id -> menu level (1..15); absent = locked
  frags: Record<string, number>;
  lineup: string[]; // max 6 tower ids
  awn: Record<string, [number, number]>; // tower id -> [awk1Tier, awk2Tier] 0..5
  hero: string; // selected hero id
  heroLv: Record<string, number>; // hero id -> level (1..HERO_MAX_LEVEL)
  best: number;
  bestEndless: number;
  wins: number;
  runs: number;
  sfx: boolean;
  fx: boolean;
  /** 0..1 master volume */
  vol: number;
  /** floating damage numbers */
  dmgNums: boolean;
  /** camera shake on explosions */
  shakeFx: boolean;
  /** grid + range guides on the battlefield */
  guides: boolean;
  /** skip the countdown between waves */
  fastWaves: boolean;
  /** calmer animations (fewer particles, no pulsing glow) */
  reducedMotion: boolean;
  /** fps + entity counter overlay */
  perf: boolean;
  /** how many days in a row the daily reward has been claimed (1..7) */
  dailyStreak: number;
  lastDaily: string;
  lastSeen: number;
  /** arena zoom multiplier, 1 = fitted to the screen */
  zoom: number;
}

const KEY = "magictd_save_v1";

export function defaultSave(): SaveData {
  return {
    gold: 100,
    gems: 0,
    tokens: 0,
    levels: { arrow: 1, cannon: 1, ice: 1 },
    frags: { arrow: 2, cannon: 1, ice: 0 },
    lineup: ["arrow", "cannon", "ice"],
    awn: {},
    hero: "nova",
    heroLv: {},
    best: 0,
    bestEndless: 0,
    wins: 0,
    runs: 0,
    sfx: true,
    fx: true,
    vol: 0.7,
    dmgNums: true,
    shakeFx: true,
    guides: true,
    fastWaves: false,
    reducedMotion: false,
    perf: false,
    dailyStreak: 0,
    lastDaily: "",
    lastSeen: 0,
    zoom: 1.1,
  };
}

/** merge an exported save blob back into a playable save */
export function importSave(raw: string): SaveData {
  const parsed = JSON.parse(raw) as Partial<SaveData>;
  const s: SaveData = { ...defaultSave(), ...parsed };
  s.levels = s.levels && Object.keys(s.levels).length ? s.levels : defaultSave().levels;
  s.lineup = (Array.isArray(s.lineup) ? s.lineup : []).filter((id) => s.levels[id]);
  if (!HERO_BY_ID[s.hero]) s.hero = "nova";
  s.vol = Math.min(1, Math.max(0, Number.isFinite(s.vol) ? s.vol : 0.7));
  s.zoom = clampZoom(s.zoom);
  s.heroLv = s.heroLv && typeof s.heroLv === "object" ? s.heroLv : {};
  s.dailyStreak = Number.isFinite(s.dailyStreak) ? Math.max(0, Math.min(7, s.dailyStreak)) : 0;
  return s;
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const s = { ...defaultSave(), ...(JSON.parse(raw) as Partial<SaveData>) };
    if (!s.levels || Object.keys(s.levels).length === 0) s.levels = { arrow: 1 };
    if (!Array.isArray(s.lineup)) s.lineup = [];
    s.lineup = s.lineup.filter((id) => s.levels[id]);
    if (!HERO_BY_ID[s.hero]) s.hero = "nova";
    s.zoom = clampZoom(s.zoom);
    s.heroLv = s.heroLv && typeof s.heroLv === "object" ? s.heroLv : {};
    s.dailyStreak = Number.isFinite(s.dailyStreak) ? Math.max(0, Math.min(7, s.dailyStreak)) : 0;
    return s;
  } catch {
    return defaultSave();
  }
}

export function persistSave(s: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function todayStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/** the day before `todayStr()`, used to keep daily streaks alive */
export function yesterdayStr() {
  return todayStr(new Date(Date.now() - 86400000));
}

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 2;
export function clampZoom(z: number) {
  if (!Number.isFinite(z)) return 1.1;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 20) / 20));
}

/** 1-based day of the streak the player is about to claim, plus the new streak */
export function nextDailyStreak(s: SaveData): number {
  if (s.lastDaily === todayStr()) return s.dailyStreak; // already claimed today
  if (s.lastDaily === yesterdayStr() && s.dailyStreak >= 1 && s.dailyStreak < 7) return s.dailyStreak + 1;
  return 1;
}

export function heroLevel(s: SaveData, id: string): number {
  return Math.max(1, Math.min(HERO_MAX_LEVEL, s.heroLv[id] || 1));
}

/** apply a hero level-up, returning false when it is not affordable / maxed */
export function upgradeHero(s: SaveData, id: string): boolean {
  const lv = heroLevel(s, id);
  if (lv >= HERO_MAX_LEVEL) return false;
  const cost = heroUpgradeCost(lv);
  if (s.gold < cost) return false;
  s.gold -= cost;
  s.heroLv[id] = lv + 1;
  return true;
}

/** grant the reward for the day the player is on; mutates the save */
export function claimDailyReward(s: SaveData): { day: number; label: string; color: string } | null {
  if (s.lastDaily === todayStr()) return null;
  const day = nextDailyStreak(s);
  const reward = DAILY_REWARDS[day - 1];
  s.gold += reward.gold || 0;
  s.gems += reward.gems || 0;
  s.tokens += reward.tokens || 0;
  for (let i = 0; i < (reward.frags || 0); i++) addFrag(s, randFrag(rarityBias(reward.rarity)), 1);
  s.dailyStreak = day;
  s.lastDaily = todayStr();
  return { day, label: reward.label, color: reward.rarity ? RARITY[reward.rarity].color : "#ffcf4d" };
}

/** chests bias toward a rarity; the daily reward uses the same dial */
function rarityBias(rarity?: Rarity): number {
  if (rarity === "legendary") return 1;
  if (rarity === "epic") return 0.5;
  if (rarity === "decent") return 0.2;
  return 0;
}

export function unlockedTowers(s: SaveData): string[] {
  return Object.entries(s.levels)
    .filter(([, lv]) => lv > 0)
    .map(([id]) => id);
}

export function addFrag(s: SaveData, id: string, n: number) {
  if (!TOWER_BY_ID[id]) return;
  s.frags[id] = (s.frags[id] || 0) + n;
}

export function randFrag(bias: number): string {
  // bias 0..1 pushes toward legendary
  const r = Math.random() + bias * 0.5;
  const weights =
    r > 1
      ? ["legendary", "legendary", "epic"]
      : r > 0.85
        ? ["epic", "epic", "legendary", "decent"]
        : r > 0.6
          ? ["epic", "decent", "decent", "normal"]
          : ["normal", "decent", "decent", "epic"];
  const pool = (["normal", "decent", "epic", "legendary"] as const).flatMap(
    (rar) =>
      weights
        .filter((w) => w === rar)
        .map(() =>
          Object.keys(TOWER_BY_ID).filter((id) => TOWER_BY_ID[id].rarity === rar)
        ).flat()
  );
  return pool[Math.floor(Math.random() * pool.length)];
}
