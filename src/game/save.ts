import { TOWER_BY_ID } from "./data";

export interface SaveData {
  gold: number;
  gems: number;
  tokens: number;
  levels: Record<string, number>; // tower id -> menu level (1..15); absent = locked
  frags: Record<string, number>;
  lineup: string[]; // max 6 tower ids
  awn: Record<string, [number, number]>; // tower id -> [awk1Tier, awk2Tier] 0..5
  best: number;
  wins: number;
  sfx: boolean;
  fx: boolean;
  lastDaily: string;
  lastSeen: number;
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
    best: 0,
    wins: 0,
    sfx: true,
    fx: true,
    lastDaily: "",
    lastSeen: 0,
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const s = { ...defaultSave(), ...(JSON.parse(raw) as Partial<SaveData>) };
    if (!s.levels || Object.keys(s.levels).length === 0) s.levels = { arrow: 1 };
    if (!Array.isArray(s.lineup)) s.lineup = [];
    s.lineup = s.lineup.filter((id) => s.levels[id]);
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

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
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

export function randFrag(rarityBias: number): string {
  // rarityBias 0..1 pushes toward legendary
  const r = Math.random() + rarityBias * 0.5;
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
