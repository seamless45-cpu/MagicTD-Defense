import {
  CHEST_BY_ID,
  DAILY_RESET_HOUR,
  DAILY_TASKS,
  TASK_BY_ID,
  TASK_MILESTONES,
  TASK_POINTS_TOTAL,
  DAILY_REWARDS,
  GIFT_CODES,
  GUILD_BY_ID,
  GUILD_QUESTS,
  HERO_BY_ID,
  HERO_MAX_LEVEL,
  HERO_SHARD_COST,
  RARITY,
  TOWER_BY_ID,
  TROPHY_LOSS,
  TROPHY_WIN,
  eventForDate,
  heroUpgradeCost,
  leagueFor,
  normaliseCode,
  type ChipBag,
  type ChipId,
  type DailyReward,
  type GiftCode,
  type GuildShopItem,
  type Rarity,
  type TaskId,
} from "./data";

export interface TaskState {
  /** game-day stamp the progress belongs to */
  day: string;
  /** task id -> progress */
  prog: Partial<Record<TaskId, number>>;
  /** task ids already cashed in today */
  claimed: TaskId[];
  /** milestone indices already cashed in today */
  milestones: number[];
}

export interface GuildState {
  /** id of the guild the player belongs to, or null */
  id: string | null;
  /** total contribution xp poured into the guild */
  xp: number;
  /** guild coins, spent in the guild store */
  coins: number;
  /** game-day stamp of the last donation */
  lastDonate: string;
  /** how many donations were made on `lastDonate` */
  donatesToday: number;
  /** game-day stamp of the last claimed guild chest */
  lastChest: string;
  /** lifetime counters the weekly quests read from */
  quests: Record<string, number>;
  /** quest ids already cashed in this week, prefixed with the week stamp */
  questsDone: string[];
}

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
  /** hero id -> shards banked from Heroes Chests */
  heroShards: Record<string, number>;
  /** chip modules by id */
  chips: Record<ChipId, number>;
  /** ladder trophies */
  trophies: number;
  /** highest trophy count ever reached */
  bestTrophies: number;
  /** week stamps of competition payouts already collected */
  compClaimed: string[];
  /** guild membership + contribution state */
  guild: GuildState;
  /** game-day stamp of the last claimed daily event bonus */
  lastEvent: string;
  /** daily objectives, reset with the 07:00 game-day */
  tasks: TaskState;
  best: number;
  bestEndless: number;
  wins: number;
  runs: number;
  /** consecutive Battle victories */
  streak: number;
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
  /** gift codes already redeemed (normalised form) */
  redeemed: string[];
}

const KEY = "magictd_save_v1";

/** deep clone used by the UI to roll a reward before committing it to state */
export function cloneSave(s: SaveData): SaveData {
  return JSON.parse(JSON.stringify(s)) as SaveData;
}

export function emptyChips(): Record<ChipId, number> {
  return { basic: 0, advanced: 0, elite: 0 };
}

export function emptyTasks(day = ""): TaskState {
  return { day, prog: {}, claimed: [], milestones: [] };
}

export function emptyGuild(): GuildState {
  return { id: null, xp: 0, coins: 0, lastDonate: "", donatesToday: 0, lastChest: "", quests: {}, questsDone: [] };
}

export function defaultSave(): SaveData {
  return {
    gold: 100,
    // every chest is gem-priced now, so a fresh account starts with enough
    // gems to crack a couple of commons before the daily income kicks in
    gems: 300,
    tokens: 0,
    levels: { arrow: 1, cannon: 1, ice: 1 },
    frags: { arrow: 2, cannon: 1, ice: 0 },
    lineup: ["arrow", "cannon", "ice"],
    awn: {},
    hero: "nova",
    heroLv: {},
    heroShards: {},
    chips: emptyChips(),
    trophies: 0,
    bestTrophies: 0,
    compClaimed: [],
    guild: emptyGuild(),
    lastEvent: "",
    tasks: emptyTasks(),
    best: 0,
    bestEndless: 0,
    wins: 0,
    runs: 0,
    streak: 0,
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
    redeemed: [],
  };
}

/** repair a partially-shaped save blob (old versions, hand-edited imports) */
function normalise(s: SaveData): SaveData {
  if (!s.levels || Object.keys(s.levels).length === 0) s.levels = { arrow: 1 };
  if (!Array.isArray(s.lineup)) s.lineup = [];
  s.lineup = s.lineup.filter((id) => s.levels[id]);
  if (!HERO_BY_ID[s.hero]) s.hero = "nova";
  s.vol = Math.min(1, Math.max(0, Number.isFinite(s.vol) ? s.vol : 0.7));
  s.zoom = clampZoom(s.zoom);
  s.heroLv = s.heroLv && typeof s.heroLv === "object" ? s.heroLv : {};
  s.heroShards = s.heroShards && typeof s.heroShards === "object" ? s.heroShards : {};
  s.chips = { ...emptyChips(), ...(s.chips && typeof s.chips === "object" ? s.chips : {}) };
  s.trophies = Math.max(0, Number.isFinite(s.trophies) ? Math.round(s.trophies) : 0);
  s.bestTrophies = Math.max(s.trophies, Number.isFinite(s.bestTrophies) ? Math.round(s.bestTrophies) : 0);
  s.compClaimed = Array.isArray(s.compClaimed) ? s.compClaimed.map(String) : [];
  s.guild = { ...emptyGuild(), ...(s.guild && typeof s.guild === "object" ? s.guild : {}) };
  s.guild.quests = s.guild.quests && typeof s.guild.quests === "object" ? s.guild.quests : {};
  s.guild.questsDone = Array.isArray(s.guild.questsDone) ? s.guild.questsDone.map(String) : [];
  if (s.guild.id && !GUILD_BY_ID[s.guild.id]) s.guild.id = null;
  s.tasks = { ...emptyTasks(), ...(s.tasks && typeof s.tasks === "object" ? s.tasks : {}) };
  s.tasks.prog = s.tasks.prog && typeof s.tasks.prog === "object" ? s.tasks.prog : {};
  s.tasks.claimed = Array.isArray(s.tasks.claimed) ? (s.tasks.claimed as TaskId[]) : [];
  s.tasks.milestones = Array.isArray(s.tasks.milestones) ? s.tasks.milestones.map(Number) : [];
  s.streak = Math.max(0, Number.isFinite(s.streak) ? s.streak : 0);
  s.dailyStreak = Number.isFinite(s.dailyStreak) ? Math.max(0, Math.min(7, s.dailyStreak)) : 0;
  s.redeemed = Array.isArray(s.redeemed) ? s.redeemed.map(String) : [];
  return s;
}

/** merge an exported save blob back into a playable save */
export function importSave(raw: string): SaveData {
  const parsed = JSON.parse(raw) as Partial<SaveData>;
  const s: SaveData = { ...defaultSave(), ...parsed };
  s.levels = s.levels && Object.keys(s.levels).length ? s.levels : defaultSave().levels;
  return normalise(s);
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    return normalise({ ...defaultSave(), ...(JSON.parse(raw) as Partial<SaveData>) });
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

// ---------- the 07:00 game-day ----------
/**
 * A "game day" starts at 07:00 local time. Everything daily (reward streak,
 * event bonus, guild donations, free chest) keys off this stamp, so claiming at
 * 06:59 and again at 07:01 counts as two different days — which is the whole
 * point of a 7 A.M. reset.
 */
export function todayStr(d = new Date()) {
  const shifted = new Date(d.getTime() - DAILY_RESET_HOUR * 3600000);
  // local calendar date of the shifted instant
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, "0");
  const day = String(shifted.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** the game-day before `todayStr()`, used to keep daily streaks alive */
export function yesterdayStr(d = new Date()) {
  return todayStr(new Date(d.getTime() - 86400000));
}

/** ms until the next 07:00 rollover */
export function msUntilReset(d = new Date()): number {
  const next = new Date(d);
  next.setHours(DAILY_RESET_HOUR, 0, 0, 0);
  if (next.getTime() <= d.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - d.getTime();
}

/** "6h 12m" style countdown to the next reset */
export function resetCountdown(d = new Date()): string {
  const ms = msUntilReset(d);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** ISO-ish week stamp (year + week number), used to seed the competition */
export function weekStr(d = new Date()) {
  const shifted = new Date(d.getTime() - DAILY_RESET_HOUR * 3600000);
  const start = new Date(shifted.getFullYear(), 0, 1);
  const days = Math.floor((shifted.getTime() - start.getTime()) / 86400000);
  const week = Math.floor((days + start.getDay()) / 7);
  return `${shifted.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 2;
export function clampZoom(z: number) {
  if (!Number.isFinite(z)) return 1.1;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 20) / 20));
}

/** 1-based day of the streak the player is about to claim */
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

/** spend Heroes Chest shards instead of gold to level a hero */
export function levelHeroWithShards(s: SaveData, id: string): boolean {
  const lv = heroLevel(s, id);
  if (lv >= HERO_MAX_LEVEL) return false;
  if ((s.heroShards[id] || 0) < HERO_SHARD_COST) return false;
  s.heroShards[id] -= HERO_SHARD_COST;
  s.heroLv[id] = lv + 1;
  return true;
}

export function addHeroShards(s: SaveData, id: string, n: number) {
  if (!HERO_BY_ID[id]) return;
  s.heroShards[id] = (s.heroShards[id] || 0) + n;
}

export function addChips(s: SaveData, bag: ChipBag) {
  (Object.keys(bag) as ChipId[]).forEach((k) => {
    s.chips[k] = (s.chips[k] || 0) + (bag[k] || 0);
  });
}

// ---------- rewards ----------
/** one line of loot, used by every claim animation in the UI */
export interface RewardLine {
  kind: "gold" | "gems" | "tokens" | "frag" | "chip" | "heroShard" | "trophy";
  /** tower id / chip id / hero id where it applies */
  id?: string;
  label: string;
  n: number;
  color: string;
}

export interface ChestLoot {
  gold: number;
  gems: number;
  tokens: number;
  frags: { id: string; n: number }[];
  chips: ChipBag;
  heroShards: { id: string; n: number }[];
}

export function emptyLootPublic(): ChestLoot {
  return emptyLoot();
}

function emptyLoot(): ChestLoot {
  return { gold: 0, gems: 0, tokens: 0, frags: [], chips: {}, heroShards: [] };
}

function pushFrag(list: { id: string; n: number }[], id: string, n = 1) {
  const ex = list.find((f) => f.id === id);
  if (ex) ex.n += n;
  else list.push({ id, n });
}

const rint = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

/** roll the contents of a chest; `fragBonus`/`bias` come from the live event */
export function rollChest(chestId: string, fragBonus = 0, biasBonus = 0): ChestLoot {
  const c = CHEST_BY_ID[chestId];
  const loot = emptyLoot();
  if (!c) return loot;
  loot.gold = rint(c.gold[0], c.gold[1]);
  const nFrags = Math.max(0, rint(c.frags[0], c.frags[1]) + fragBonus);
  for (let i = 0; i < nFrags; i++) pushFrag(loot.frags, randFrag(Math.min(1, c.bias + biasBonus)));
  if (c.id === "epic" && Math.random() < 0.25) loot.gems = 1;
  if (c.id === "legendary") {
    if (Math.random() < 0.6) loot.gems = 1 + (Math.random() < 0.4 ? 1 : 0);
    if (Math.random() < 0.3) loot.tokens = 1;
  }
  c.chips?.forEach((ch) => {
    const n = rint(ch.min, ch.max);
    if (n > 0) loot.chips[ch.id] = (loot.chips[ch.id] || 0) + n;
  });
  if (c.heroShards) {
    const ids = Object.keys(HERO_BY_ID);
    const id = ids[Math.floor(Math.random() * ids.length)];
    loot.heroShards.push({ id, n: rint(c.heroShards[0], c.heroShards[1]) });
  }
  return loot;
}

export function mergeLoot(a: ChestLoot, b: ChestLoot): ChestLoot {
  const out: ChestLoot = {
    gold: a.gold + b.gold,
    gems: a.gems + b.gems,
    tokens: a.tokens + b.tokens,
    frags: a.frags.map((f) => ({ ...f })),
    chips: { ...a.chips },
    heroShards: a.heroShards.map((h) => ({ ...h })),
  };
  b.frags.forEach((f) => pushFrag(out.frags, f.id, f.n));
  (Object.keys(b.chips) as ChipId[]).forEach((k) => {
    out.chips[k] = (out.chips[k] || 0) + (b.chips[k] || 0);
  });
  b.heroShards.forEach((h) => pushFrag(out.heroShards, h.id, h.n));
  return out;
}

export function grantLoot(s: SaveData, loot: ChestLoot) {
  s.gold += loot.gold;
  s.gems += loot.gems;
  s.tokens += loot.tokens;
  loot.frags.forEach((f) => addFrag(s, f.id, f.n));
  addChips(s, loot.chips);
  loot.heroShards.forEach((h) => addHeroShards(s, h.id, h.n));
}

/** flatten loot into the animated lines the claim UI renders */
export function lootLines(loot: ChestLoot): RewardLine[] {
  const out: RewardLine[] = [];
  if (loot.gold) out.push({ kind: "gold", label: "Gold", n: loot.gold, color: "#ffcf4d" });
  if (loot.gems) out.push({ kind: "gems", label: "Gems", n: loot.gems, color: "#35e0ff" });
  if (loot.tokens) out.push({ kind: "tokens", label: "Magic Tokens", n: loot.tokens, color: "#ff4fd8" });
  loot.frags.forEach((f) =>
    out.push({
      kind: "frag",
      id: f.id,
      label: `${TOWER_BY_ID[f.id]?.name ?? f.id} fragments`,
      n: f.n,
      color: RARITY[TOWER_BY_ID[f.id]?.rarity ?? "normal"].color,
    })
  );
  (Object.keys(loot.chips) as ChipId[]).forEach((k) => {
    const n = loot.chips[k] || 0;
    if (n > 0) out.push({ kind: "chip", id: k, label: `${k[0].toUpperCase()}${k.slice(1)} Chip Module`, n, color: k === "basic" ? "#8fe9ff" : k === "advanced" ? "#c44dff" : "#ffb324" });
  });
  loot.heroShards.forEach((h) =>
    out.push({ kind: "heroShard", id: h.id, label: `${HERO_BY_ID[h.id]?.name ?? h.id} shards`, n: h.n, color: HERO_BY_ID[h.id]?.color ?? "#ff4fd8" })
  );
  return out;
}

export interface DailyClaim {
  day: number;
  label: string;
  color: string;
  reward: DailyReward;
  loot: ChestLoot;
  lines: RewardLine[];
  /** chests that were part of the reward, for the opening animation */
  chests: { id: string; n: number }[];
}

/** grant the reward for the day the player is on; mutates the save */
export function claimDailyReward(s: SaveData): DailyClaim | null {
  if (s.lastDaily === todayStr()) return null;
  const day = nextDailyStreak(s);
  const reward = DAILY_REWARDS[day - 1];
  let loot = emptyLoot();
  loot.gold += reward.gold || 0;
  loot.gems += reward.gems || 0;
  loot.tokens += reward.tokens || 0;
  for (let i = 0; i < (reward.frags || 0); i++) pushFrag(loot.frags, randFrag(rarityBias(reward.rarity)));
  if (reward.chips) {
    (Object.keys(reward.chips) as ChipId[]).forEach((k) => {
      loot.chips[k] = (loot.chips[k] || 0) + (reward.chips![k] || 0);
    });
  }
  reward.chests?.forEach((c) => {
    for (let i = 0; i < c.n; i++) loot = mergeLoot(loot, rollChest(c.id));
  });
  grantLoot(s, loot);
  if (reward.trophies) addTrophies(s, reward.trophies);
  s.dailyStreak = day;
  s.lastDaily = todayStr();
  return {
    day,
    label: reward.label,
    color: reward.accent,
    reward,
    loot,
    lines: lootLines(loot),
    chests: reward.chests ? reward.chests.map((c) => ({ ...c })) : [],
  };
}

/** chests bias toward a rarity; the daily reward uses the same dial */
function rarityBias(rarity?: Rarity): number {
  if (rarity === "legendary") return 1;
  if (rarity === "epic") return 0.5;
  if (rarity === "decent") return 0.2;
  return 0;
}

// ---------- daily tasks ----------
/**
 * Task progress is stamped with the game-day it belongs to; reading it after
 * 07:00 the next day transparently wipes the board. Call this before touching
 * `s.tasks` so a stale day can never leak progress or claims forward.
 */
export function rollTasks(s: SaveData): TaskState {
  const day = todayStr();
  if (s.tasks.day !== day) s.tasks = emptyTasks(day);
  return s.tasks;
}

export function bumpTask(s: SaveData, id: TaskId, n = 1) {
  if (n <= 0) return;
  const t = rollTasks(s);
  t.prog[id] = (t.prog[id] || 0) + n;
}

export function taskProgress(s: SaveData, id: TaskId): number {
  return s.tasks.day === todayStr() ? s.tasks.prog[id] || 0 : 0;
}

export function taskComplete(s: SaveData, id: TaskId): boolean {
  return taskProgress(s, id) >= TASK_BY_ID[id].need;
}

export function taskClaimed(s: SaveData, id: TaskId): boolean {
  return s.tasks.day === todayStr() && s.tasks.claimed.includes(id);
}

/** total task points banked today (only claimed tasks count toward milestones) */
export function taskPoints(s: SaveData): number {
  if (s.tasks.day !== todayStr()) return 0;
  return s.tasks.claimed.reduce((a, id) => a + (TASK_BY_ID[id]?.points || 0), 0);
}

export function tasksRemaining(s: SaveData): number {
  return DAILY_TASKS.filter((t) => !taskClaimed(s, t.id)).length;
}

/** how many tasks are sitting completed and unclaimed — drives the nav badge */
export function tasksReady(s: SaveData): number {
  return (
    DAILY_TASKS.filter((t) => taskComplete(s, t.id) && !taskClaimed(s, t.id)).length +
    TASK_MILESTONES.filter((m, i) => taskPoints(s) >= m.points && !milestoneClaimed(s, i)).length
  );
}

export function claimTask(s: SaveData, id: TaskId): ChestLoot | null {
  rollTasks(s);
  if (!taskComplete(s, id) || taskClaimed(s, id)) return null;
  const t = TASK_BY_ID[id];
  const loot: ChestLoot = { ...emptyLootPublic(), gold: t.gold, gems: t.gems };
  grantLoot(s, loot);
  s.tasks.claimed = [...s.tasks.claimed, id];
  return loot;
}

export function milestoneClaimed(s: SaveData, idx: number): boolean {
  return s.tasks.day === todayStr() && s.tasks.milestones.includes(idx);
}

export function claimMilestone(s: SaveData, idx: number): ChestLoot | null {
  rollTasks(s);
  const m = TASK_MILESTONES[idx];
  if (!m || milestoneClaimed(s, idx) || taskPoints(s) < m.points) return null;
  let loot: ChestLoot = { ...emptyLootPublic(), gems: m.gems, chips: { ...m.chips } };
  m.chests.forEach((c) => {
    for (let i = 0; i < c.n; i++) loot = mergeLoot(loot, rollChest(c.id));
  });
  grantLoot(s, loot);
  s.tasks.milestones = [...s.tasks.milestones, idx];
  return loot;
}

export const TASK_TOTAL_POINTS = TASK_POINTS_TOTAL;

// ---------- trophies ----------
export function addTrophies(s: SaveData, n: number): number {
  const before = s.trophies;
  s.trophies = Math.max(0, s.trophies + n);
  s.bestTrophies = Math.max(s.bestTrophies, s.trophies);
  return s.trophies - before;
}

/** apply the end-of-battle trophy swing; returns the actual delta */
export function applyBattleTrophies(s: SaveData, won: boolean, bonusWin = 0, bonusLossRelief = 0): number {
  const raw = won ? TROPHY_WIN + bonusWin : -(TROPHY_LOSS - bonusLossRelief);
  return addTrophies(s, raw);
}

export function playerLeague(s: SaveData) {
  return leagueFor(s.trophies);
}

// ---------- daily event ----------
export function liveEvent(d = new Date()) {
  return eventForDate(d);
}

export function eventClaimable(s: SaveData): boolean {
  return s.lastEvent !== todayStr();
}

/** the once-a-day event participation bonus */
export function claimEventBonus(s: SaveData): ChestLoot | null {
  if (!eventClaimable(s)) return null;
  const ev = liveEvent();
  let loot = emptyLoot();
  switch (ev.id) {
    case "luck":
      for (let i = 0; i < 3; i++) pushFrag(loot.frags, randFrag(0.6));
      loot.gold = 1500;
      break;
    case "chestbox":
      loot = mergeLoot(loot, rollChest("common"));
      loot = mergeLoot(loot, rollChest("silver"));
      break;
    case "trophy":
      loot.gems = 150;
      loot.gold = 3000;
      break;
    case "items":
      loot.chips = { basic: 3, advanced: 1 };
      break;
    case "mineshaft":
      loot.gold = 12000;
      break;
    case "lightning":
      loot.gems = 400;
      loot.tokens = 2;
      break;
  }
  grantLoot(s, loot);
  s.lastEvent = todayStr();
  return loot;
}

// ---------- guild ----------
export function joinGuild(s: SaveData, id: string): boolean {
  const g = GUILD_BY_ID[id];
  if (!g || s.trophies < g.trophyReq) return false;
  s.guild.id = id;
  return true;
}

export function leaveGuild(s: SaveData) {
  s.guild.id = null;
}

export const GUILD_DONATIONS_PER_DAY = 3;

export function donationsLeft(s: SaveData): number {
  if (s.guild.lastDonate !== todayStr()) return GUILD_DONATIONS_PER_DAY;
  return Math.max(0, GUILD_DONATIONS_PER_DAY - s.guild.donatesToday);
}

export function donateToGuild(s: SaveData, gold: number, xp: number, coins: number): boolean {
  if (!s.guild.id || s.gold < gold || donationsLeft(s) <= 0) return false;
  if (s.guild.lastDonate !== todayStr()) {
    s.guild.lastDonate = todayStr();
    s.guild.donatesToday = 0;
  }
  s.gold -= gold;
  s.guild.xp += xp;
  s.guild.coins += coins;
  s.guild.donatesToday++;
  bumpQuest(s, "donate", 1);
  return true;
}

export function buyGuildItem(s: SaveData, item: GuildShopItem): boolean {
  if (!s.guild.id || s.guild.coins < item.coins) return false;
  s.guild.coins -= item.coins;
  const g = item.grant;
  if (g.gold) s.gold += g.gold;
  if (g.gems) s.gems += g.gems;
  if (g.tokens) s.tokens += g.tokens;
  if (g.chips) addChips(s, g.chips);
  if (g.frags) for (let i = 0; i < g.frags.n; i++) addFrag(s, randFrag(rarityBias(g.frags.rarity)), 1);
  return true;
}

export function guildChestReady(s: SaveData): boolean {
  return !!s.guild.id && s.guild.lastChest !== todayStr();
}

/** the free daily guild chest; Null Sigil members get bonus chips */
export function claimGuildChest(s: SaveData): ChestLoot | null {
  if (!guildChestReady(s)) return null;
  let loot = rollChest("support");
  if (s.guild.id === "null") loot = mergeLoot(loot, { ...emptyLoot(), chips: { basic: 2 } });
  grantLoot(s, loot);
  s.guild.lastChest = todayStr();
  bumpQuest(s, "chests", 1);
  return loot;
}

export function bumpQuest(s: SaveData, id: string, n = 1) {
  s.guild.quests[id] = (s.guild.quests[id] || 0) + n;
}

export function questProgress(s: SaveData, id: string): number {
  return s.guild.quests[id] || 0;
}

export function questDone(s: SaveData, id: string): boolean {
  return s.guild.questsDone.includes(`${weekStr()}:${id}`);
}

export function claimQuest(s: SaveData, id: string): boolean {
  const q = GUILD_QUESTS.find((x) => x.id === id);
  if (!q || !s.guild.id || questDone(s, id) || questProgress(s, id) < q.need) return false;
  s.guild.xp += q.xp;
  s.guild.coins += q.coins;
  s.guild.questsDone = [...s.guild.questsDone, `${weekStr()}:${id}`];
  return true;
}

// ---------- competition ----------
export function compClaimed(s: SaveData): boolean {
  return s.compClaimed.includes(weekStr());
}

export function claimCompetition(s: SaveData, gems: number, gold: number, chips: ChipBag): boolean {
  if (compClaimed(s)) return false;
  s.gems += gems;
  s.gold += gold;
  addChips(s, chips);
  s.compClaimed = [...s.compClaimed, weekStr()];
  return true;
}

export type RedeemResult =
  | { ok: true; code: string; label: string; summary: string; color: string }
  | { ok: false; reason: "empty" | "unknown" | "used" };

/**
 * Redeem a gift code. Codes live in GIFT_CODES (src/game/data.ts) and each one
 * can only be claimed once per save.
 */
export function redeemGiftCode(s: SaveData, raw: string, codes: Record<string, GiftCode> = GIFT_CODES): RedeemResult {
  const code = normaliseCode(raw);
  if (!code) return { ok: false, reason: "empty" };
  if (s.redeemed.includes(code)) return { ok: false, reason: "used" };
  const gift = Object.entries(codes).find(([key]) => normaliseCode(key) === code)?.[1];
  if (!gift) return { ok: false, reason: "unknown" };

  const bits: string[] = [];
  if (gift.gold) {
    s.gold += gift.gold;
    bits.push(`${gift.gold} gold`);
  }
  if (gift.gems) {
    s.gems += gift.gems;
    bits.push(`${gift.gems} gems`);
  }
  if (gift.tokens) {
    s.tokens += gift.tokens;
    bits.push(`${gift.tokens} tokens`);
  }
  if (gift.frags) {
    for (let i = 0; i < gift.frags.n; i++) addFrag(s, randFrag(rarityBias(gift.frags.rarity)), 1);
    bits.push(`${gift.frags.n} ${gift.frags.rarity} fragments`);
  }
  gift.towers?.forEach((t) => {
    if (!TOWER_BY_ID[t.id]) return;
    addFrag(s, t.id, t.n);
    bits.push(`${t.n} ${TOWER_BY_ID[t.id].name} fragments`);
  });

  s.redeemed = [...s.redeemed, code];
  return {
    ok: true,
    code,
    label: gift.label,
    summary: bits.length ? bits.join(" · ") : "nothing but good vibes",
    color: gift.frags ? RARITY[gift.frags.rarity].color : "#ffcf4d",
  };
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
