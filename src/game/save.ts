import {
  CHEST_BY_ID,
  CRYSTALS,
  CRYSTAL_BY_ID,
  DAILY_RESET_HOUR,
  DAILY_TASKS,
  TASK_BY_ID,
  TASK_MILESTONES,
  TASK_POINTS_TOTAL,
  DAILY_REWARDS,
  MONTHLY_EVENTS,
  monthlyEventForDate,
  monthlyTiers,
  GAUNTLET_BOONS,
  type GauntletBoon,
  GUILD_BY_ID,
  GUILD_QUESTS,
  HERO_BY_ID,
  HERO_MAX_LEVEL,
  HERO_SHARD_COST,
  HERO_AWAKENING_MAX_TIER,
  heroAwakenCost,
  BATTLE_ROUNDS,
  HARDCORE_DAILY_PLAYS,
  SUPER_HARDCORE_WEEKLY_PLAYS,
  heroAwkSpec,
  MAIL,
  MAIL_BY_ID,
  RARITY,
  REWARD_MUL,
  reward,
  runGold,
  SEASON_TIERS,
  seasonNumber,
  seasonPoints,
  seasonTierFor,
  TOWER_BY_ID,
  TROPHY_LOSS,
  crystalUpgradeCost,
  type CrystalId,
  TROPHY_WIN,
  eventForDate,
  eventBonus,
  waveComp,
  ENEMY_TYPES,
  isBossType,
  monthlyEventBonus,
  critBonusFrom,
  critMultiplierFrom,
  heroUpgradeCost,
  leagueFor,
  towerUpgradeCount,
  type ChipBag,
  type ChipId,
  type MailItem,
  type SeasonTier,
  type DailyReward,
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

export interface MailState {
  /** dynamically generated messages such as auto-battle reports */
  custom: MailItem[];
  /** unix timestamp when the next automatic expedition may be started */
  autoReadyAt: number;
  /** weekly Auto Battle usage stamp and count */
  autoWeek: string;
  autoUses: number;
  /** message ids already opened */
  read: string[];
  /** message ids whose attachment has been taken */
  claimed: string[];
  /** message ids the player deleted (they stay gone) */
  deleted: string[];
}

export interface SeasonState {
  /** the season number this progress belongs to */
  number: number;
  /** tier indices already collected this season */
  claimed: number[];
  /** season points banked from previous seasons (flavour only) */
  best: number;
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

export const UI_THEMES = [
  { id: "rift", name: "Rift", accent: "#b06bff", swatches: ["#0c0824", "#251454", "#b06bff"] },
  { id: "ocean", name: "Ocean", accent: "#35e0ff", swatches: ["#061827", "#123b58", "#35e0ff"] },
  { id: "ember", name: "Ember", accent: "#ff8a3d", swatches: ["#210b12", "#4a1722", "#ff8a3d"] },
  { id: "forest", name: "Forest", accent: "#3dff8e", swatches: ["#071a18", "#123c2d", "#3dff8e"] },
  { id: "royal", name: "Royal", accent: "#ff4fd8", swatches: ["#130a2b", "#30205c", "#ff4fd8"] },
  { id: "aurora", name: "Aurora", accent: "#63ffe1", swatches: ["#04191d", "#0d3941", "#63ffe1"] },
  { id: "solar", name: "Solar Flare", accent: "#ff9f43", swatches: ["#241006", "#52210c", "#ff9f43"] },
  { id: "obsidian", name: "Obsidian", accent: "#a8b5d8", swatches: ["#080b14", "#171d2d", "#a8b5d8"] },
  { id: "super", name: "Sci-Fi Super", accent: "#54f4ff", swatches: ["#020914", "#073953", "#54f4ff"] },
  { id: "liquid", name: "Liquid Glass", accent: "#a8ecff", swatches: ["#101a29", "#526d85", "#c6f3ff"] },
] as const;
export type UiTheme = (typeof UI_THEMES)[number]["id"];

export interface SaveData {
  gold: number;
  gems: number;
  tokens: number;
  levels: Record<string, number>; // tower id -> menu level (1..15); absent = locked
  frags: Record<string, number>;
  lineup: string[]; // max 6 tower ids
  /** owned cosmetic battlefield scenes; no gameplay bonuses */
  scenes: string[];
  awn: Record<string, [number, number]>; // tower id -> [awk1Tier, awk2Tier] 0..5
  /** hero id -> [awk1Tier, awk2Tier], bought with Magic Tokens */
  heroAwn: Record<string, [number, number]>;
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
  /** mailboxes: read/claimed ids, plus ids the player has deleted */
  mail: MailState;
  /** season track progress (season number + tier indices already collected) */
  season: SeasonState;
  best: number;
  bestEndless: number;
  /** deepest wave ever reached in the Gauntlet roguelite mode */
  gauntletBest: number;
  /** deepest round ever cleared in Hardcore */
  hardcoreBest: number;
  /** game-day stamp the Hardcore daily attempts belong to */
  hardcoreDay: string;
  /** Hardcore runs started today (max HARDCORE_DAILY_PLAYS) */
  hardcoreUses: number;
  /** week stamp the Super Hardcore attempts belong to (weekStr) */
  superHardcoreWeek: string;
  /** Super Hardcore runs started this week (max SUPER_HARDCORE_WEEKLY_PLAYS) */
  superHardcoreUses: number;
  wins: number;
  runs: number;
  /** consecutive Battle victories */
  streak: number;
  sfx: boolean;
  fx: boolean;
  /** 0..1 master volume */
  vol: number;
  /** volume booster — pushes the master bus up to 300% */
  volBoost: boolean;
  /** power saving: 30fps cap, minimal effects, no interpolation */
  powerSaver: boolean;
  /** directional temporal smear during camera shake */
  motionBlur: boolean;
  /** hide the "WAVE N CLEARED" banners, toasts and progress counter in battle */
  hideWaveCleared: boolean;
  /** boost low frequencies on the sound-effects mix */
  bassBoost: boolean;
  /** boost high frequencies on the sound-effects mix */
  trebleBoost: boolean;
  /** three-band SFX EQ in decibels (-12..12) */
  eqBass: number;
  eqMid: number;
  eqTreble: number;
  /** independent music player settings; the track itself is stored in IndexedDB */
  musicVol: number;
  musicStart: number;
  musicEnd: number;
  musicRate: number;
  musicName: string;
  /** enable optional translucent liquid-glass UI styling */
  liquidGlass: boolean;
  /** color palette selected in the theme picker */
  uiTheme: UiTheme;
  language: "en" | "th" | "es" | "fr" | "de" | "ja" | "ko" | "zh";
  toggleStyle: "fluorescent" | "incandescent" | "led" | "halogen";
  /** selected UI font id from the 80-font catalog in game/fonts.ts */
  font: string;
  /** crystal potions, spent on the crystal vault in the Towers tab */
  potions: number;
  /** crystal id -> level (0 = dormant) */
  crystals: Partial<Record<CrystalId, number>>;
  /** month stamp ("2026-10") the monthly event points belong to */
  monthKey: string;
  /** event points banked toward the monthly reward track */
  monthPts: number;
  /** monthly tier ids already claimed (`2026-10-1`) */
  monthClaimed: string[];
  /** consecutive game-days the weekday event bonus has been claimed */
  eventStreak: number;
  /** floating damage numbers */
  dmgNums: boolean;
  /** render frame-rate cap, 0 = unlimited */
  maxFps: number;
  /** draw between sim steps for smoother motion */
  frameInterp: boolean;
  /** interpolation curve used between fixed-step updates */
  interpolationMethod: "linear" | "smoothstep" | "hermite";
  /** effects budget: 0 = everything, 1 = reduced, 2 = minimal */
  fxq: number;
  /** camera shake on explosions */
  shakeFx: boolean;
  /** camera shake strength multiplier, 0 = off, 1 = 100%, 2 = 200% */
  shakeIntensity: number;
  /** skip the boss cutscene card and jump straight into the fight */
  autoSkipBossCut: boolean;
  /** internal canvas resolution multiplier (0.25..2) */
  pixelRatio: number;
  /** how the render is presented: native browser stretch, smooth GPU resample, or sharpened GPU upscale */
  upscale: "native" | "smooth" | "sharp";
  bloomFx: boolean;
  shadowFx: boolean;
  antiAlias: boolean;
  /** grid + range guides on the battlefield */
  guides: boolean;
  /** skip the countdown between waves */
  fastWaves: boolean;
  /** calmer animations (fewer particles, no pulsing glow) */
  reducedMotion: boolean;
  /** fps + entity counter overlay */
  perf: boolean;
  /** suppress every toast popup, including battle callouts */
  hideNotifs: boolean;
  /** how many days in a row the daily reward has been claimed (1..7) */
  dailyStreak: number;
  lastDaily: string;
  lastSeen: number;
  /** arena zoom multiplier, 1 = fitted to the screen */
  zoom: number;
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

export function emptyMail(): MailState {
  return { custom: [], autoReadyAt: 0, autoWeek: "", autoUses: 0, read: [], claimed: [], deleted: [] };
}

export function emptySeason(number = seasonNumber()): SeasonState {
  return { number, claimed: [], best: 0 };
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
    scenes: [],
    awn: {},
    heroAwn: {},
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
    mail: emptyMail(),
    season: emptySeason(),
    best: 0,
    bestEndless: 0,
    gauntletBest: 0,
    hardcoreBest: 0,
    hardcoreDay: "",
    hardcoreUses: 0,
    superHardcoreWeek: "",
    superHardcoreUses: 0,
    wins: 0,
    runs: 0,
    streak: 0,
    sfx: true,
    fx: true,
    vol: 0.7,
    volBoost: false,
    powerSaver: false,
    motionBlur: false,
    hideWaveCleared: false,
    bassBoost: false,
    trebleBoost: false,
    eqBass: 0,
    eqMid: 0,
    eqTreble: 0,
    musicVol: 0.5,
    musicStart: 0,
    musicEnd: 0,
    musicRate: 1,
    musicName: "",
    liquidGlass: false,
    uiTheme: "rift",
    language: "en",
    toggleStyle: "led",
    font: "rajdhani",
    // a new account can immediately ignite one crystal
    potions: 6,
    crystals: {},
    monthKey: "",
    monthPts: 0,
    monthClaimed: [],
    eventStreak: 0,
    dmgNums: true,
    maxFps: 0,
    frameInterp: true,
    interpolationMethod: "smoothstep",
    fxq: 0,
    shakeFx: true,
    shakeIntensity: 1,
    autoSkipBossCut: false,
    pixelRatio: 1,
    upscale: "sharp",
    bloomFx: true,
    shadowFx: true,
    antiAlias: true,
    guides: true,
    fastWaves: false,
    reducedMotion: false,
    perf: false,
    hideNotifs: false,
    dailyStreak: 0,
    lastDaily: "",
    lastSeen: 0,
    zoom: 1.1,
  };
}

/** repair a partially-shaped save blob (old versions, hand-edited imports) */
function normalise(s: SaveData): SaveData {
  if (!s.levels || Object.keys(s.levels).length === 0) s.levels = { arrow: 1 };
  // The tower was originally saved as "mystical-meteor". Preserve unlocked
  // levels, fragments, awakenings and summon rotation after its corrected ID.
  if (s.levels["mystical-meteor"] !== undefined) {
    s.levels.meteor = Math.max(s.levels.meteor || 0, s.levels["mystical-meteor"]);
    delete s.levels["mystical-meteor"];
    s.frags ||= {};
    s.frags.meteor = (s.frags.meteor || 0) + (s.frags["mystical-meteor"] || 0);
    delete s.frags["mystical-meteor"];
    s.awn ||= {};
    const oldAwn = s.awn["mystical-meteor"];
    if (oldAwn) {
      const current = s.awn.meteor || [0, 0];
      s.awn.meteor = [Math.max(current[0], oldAwn[0]), Math.max(current[1], oldAwn[1])];
      delete s.awn["mystical-meteor"];
    }
    if (Array.isArray(s.lineup)) s.lineup = [...new Set(s.lineup.map((id) => id === "mystical-meteor" ? "meteor" : id))];
  }
  if (!Array.isArray(s.lineup)) s.lineup = [];
  s.lineup = s.lineup.filter((id) => s.levels[id]);
  s.scenes = Array.isArray(s.scenes) ? [...new Set(s.scenes.filter((id) => typeof id === "string"))] : [];
  if (!HERO_BY_ID[s.hero]) s.hero = "nova";
  s.vol = Math.min(1, Math.max(0, Number.isFinite(s.vol) ? s.vol : 0.7));
  s.volBoost = !!s.volBoost;
  s.powerSaver = !!s.powerSaver;
  s.motionBlur = !!s.motionBlur;
  s.bassBoost = !!s.bassBoost;
  s.trebleBoost = !!s.trebleBoost;
  const eq = (n: number) => Math.max(-12, Math.min(12, Number.isFinite(n) ? n : 0));
  s.eqBass = eq(s.eqBass);
  s.eqMid = eq(s.eqMid);
  s.eqTreble = eq(s.eqTreble);
  s.musicVol = Math.max(0, Math.min(1, Number.isFinite(s.musicVol) ? s.musicVol : 0.5));
  s.musicStart = Math.max(0, Number.isFinite(s.musicStart) ? s.musicStart : 0);
  s.musicEnd = Math.max(0, Number.isFinite(s.musicEnd) ? s.musicEnd : 0);
  s.musicRate = Math.round(Math.max(0.5, Math.min(2, Number.isFinite(s.musicRate) ? s.musicRate : 1)) * 100) / 100;
  s.musicName = typeof s.musicName === "string" ? s.musicName.slice(0, 160) : "";
  s.font = typeof s.font === "string" && s.font ? s.font : "rajdhani";
  s.interpolationMethod = s.interpolationMethod === "linear" || s.interpolationMethod === "hermite" ? s.interpolationMethod : "smoothstep";
  s.potions = Math.max(0, Number.isFinite(s.potions) ? Math.round(s.potions) : 0);
  s.crystals = s.crystals && typeof s.crystals === "object" ? s.crystals : {};
  for (const def of CRYSTALS) {
    const lv = Math.floor(Number(s.crystals[def.id]) || 0);
    s.crystals[def.id] = Math.max(0, Math.min(def.max, lv));
  }
  s.monthClaimed = Array.isArray(s.monthClaimed) ? s.monthClaimed.map(String) : [];
  s.monthPts = Math.max(0, Number.isFinite(s.monthPts) ? Math.round(s.monthPts) : 0);
  // a new calendar month wipes the previous month's track
  if (s.monthKey !== monthStamp()) {
    s.monthKey = monthStamp();
    s.monthPts = 0;
    s.monthClaimed = [];
  }
  s.eventStreak = Math.max(0, Math.min(7, Number.isFinite(s.eventStreak) ? Math.round(s.eventStreak) : 0));
  s.zoom = clampZoom(s.zoom);
  // the floor is a quarter-resolution render (0.25) for low-end phones
  s.pixelRatio = Math.round(Math.max(0.25, Math.min(2, Number.isFinite(s.pixelRatio) ? s.pixelRatio : 1)) * 4) / 4;
  s.shakeIntensity = Math.round(Math.max(0, Math.min(2, Number.isFinite(s.shakeIntensity) ? s.shakeIntensity : 1)) * 20) / 20;
  s.upscale = s.upscale === "native" || s.upscale === "smooth" ? s.upscale : "sharp";
  s.bloomFx = s.bloomFx !== false;
  s.shadowFx = s.shadowFx !== false;
  s.antiAlias = s.antiAlias !== false;
  if (!UI_THEMES.some((theme) => theme.id === s.uiTheme)) s.uiTheme = "rift";
  // keep any supported language; anything unknown falls back to English
  s.language = (["en", "th", "es", "fr", "de", "ja", "ko", "zh"] as const).includes(s.language) ? s.language : "en";
  if (!["fluorescent", "incandescent", "led", "halogen"].includes(s.toggleStyle)) s.toggleStyle = "led";
  s.autoSkipBossCut = s.autoSkipBossCut === true;
  s.heroAwn = s.heroAwn && typeof s.heroAwn === "object" ? s.heroAwn : {};
  // clamp every hero awakening pair into 0..HERO_AWAKENING_MAX_TIER
  for (const id of Object.keys(s.heroAwn)) {
    const pair = s.heroAwn[id];
    if (!Array.isArray(pair)) { delete s.heroAwn[id]; continue; }
    s.heroAwn[id] = [
      Math.max(0, Math.min(HERO_AWAKENING_MAX_TIER, Math.floor(Number(pair[0]) || 0))),
      Math.max(0, Math.min(HERO_AWAKENING_MAX_TIER, Math.floor(Number(pair[1]) || 0))),
    ];
  }
  s.heroLv = s.heroLv && typeof s.heroLv === "object" ? s.heroLv : {};
  s.heroShards = s.heroShards && typeof s.heroShards === "object" ? s.heroShards : {};
  s.chips = { ...emptyChips(), ...(s.chips && typeof s.chips === "object" ? s.chips : {}) };
  s.trophies = Math.max(0, Number.isFinite(s.trophies) ? Math.round(s.trophies) : 0);
  s.bestTrophies = Math.max(s.trophies, Number.isFinite(s.bestTrophies) ? Math.round(s.bestTrophies) : 0);
  s.best = Math.max(0, Math.floor(Number(s.best) || 0));
  s.bestEndless = Math.max(0, Math.floor(Number(s.bestEndless) || 0));
  s.gauntletBest = Math.max(0, Math.floor(Number(s.gauntletBest) || 0));
  s.hardcoreBest = Math.max(0, Math.min(BATTLE_ROUNDS, Math.floor(Number(s.hardcoreBest) || 0)));
  s.hardcoreDay = typeof s.hardcoreDay === "string" ? s.hardcoreDay : "";
  s.hardcoreUses = Math.max(0, Math.min(HARDCORE_DAILY_PLAYS, Math.floor(Number(s.hardcoreUses) || 0)));
  // a stale day stamp retires yesterday's attempts
  if (s.hardcoreDay !== todayStr()) {
    s.hardcoreDay = todayStr();
    s.hardcoreUses = 0;
  }
  s.superHardcoreWeek = typeof s.superHardcoreWeek === "string" ? s.superHardcoreWeek : "";
  s.superHardcoreUses = Math.max(0, Math.min(SUPER_HARDCORE_WEEKLY_PLAYS, Math.floor(Number(s.superHardcoreUses) || 0)));
  // a stale week stamp retires last week's Super Hardcore attempts
  if (s.superHardcoreWeek !== weekStr()) {
    s.superHardcoreWeek = weekStr();
    s.superHardcoreUses = 0;
  }
  s.hideNotifs = s.hideNotifs === true;
  s.hideWaveCleared = s.hideWaveCleared === true;
  s.compClaimed = Array.isArray(s.compClaimed) ? s.compClaimed.map(String) : [];
  s.guild = { ...emptyGuild(), ...(s.guild && typeof s.guild === "object" ? s.guild : {}) };
  s.guild.quests = s.guild.quests && typeof s.guild.quests === "object" ? s.guild.quests : {};
  s.guild.questsDone = Array.isArray(s.guild.questsDone) ? s.guild.questsDone.map(String) : [];
  if (s.guild.id && !GUILD_BY_ID[s.guild.id]) s.guild.id = null;
  s.tasks = { ...emptyTasks(), ...(s.tasks && typeof s.tasks === "object" ? s.tasks : {}) };
  s.tasks.prog = s.tasks.prog && typeof s.tasks.prog === "object" ? s.tasks.prog : {};
  s.tasks.claimed = Array.isArray(s.tasks.claimed) ? (s.tasks.claimed as TaskId[]) : [];
  s.tasks.milestones = Array.isArray(s.tasks.milestones) ? s.tasks.milestones.map(Number) : [];
  s.mail = { ...emptyMail(), ...(s.mail && typeof s.mail === "object" ? s.mail : {}) };
  s.mail.custom = Array.isArray(s.mail.custom) ? s.mail.custom : [];
  s.mail.autoReadyAt = Math.max(0, Number(s.mail.autoReadyAt) || 0);
  s.mail.autoWeek = typeof s.mail.autoWeek === "string" ? s.mail.autoWeek : "";
  s.mail.autoUses = Math.max(0, Math.min(3, Math.floor(Number(s.mail.autoUses) || 0)));
  s.mail.read = Array.isArray(s.mail.read) ? s.mail.read.map(String) : [];
  s.mail.claimed = Array.isArray(s.mail.claimed) ? s.mail.claimed.map(String) : [];
  s.mail.deleted = Array.isArray(s.mail.deleted) ? s.mail.deleted.map(String) : [];
  s.season = { ...emptySeason(), ...(s.season && typeof s.season === "object" ? s.season : {}) };
  s.season.number = Number.isFinite(s.season.number) ? s.season.number : seasonNumber();
  s.season.claimed = Array.isArray(s.season.claimed) ? s.season.claimed.map(Number) : [];
  // a new season clears last season's collection state but keeps the record
  if (s.season.number !== seasonNumber()) {
    s.season.best = Math.max(s.season.best, seasonPointsFor(s));
    s.season = emptySeason();
  }
  s.streak = Math.max(0, Number.isFinite(s.streak) ? s.streak : 0);
  s.dailyStreak = Number.isFinite(s.dailyStreak) ? Math.max(0, Math.min(7, s.dailyStreak)) : 0;
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


// ---------- mail ----------
/** every message still sitting in the inbox, newest last */
export function inbox(s: SaveData): MailItem[] {
  return [...MAIL, ...s.mail.custom].filter((m) => !s.mail.deleted.includes(m.id));
}

export function mailItem(s: SaveData, id: string): MailItem | undefined {
  return MAIL_BY_ID[id] || s.mail.custom.find((m) => m.id === id);
}

/** ids whose attachment is still waiting to be collected */
export function unclaimedMail(s: SaveData): string[] {
  return [...MAIL, ...s.mail.custom].filter(
    (m) => m.reward && !s.mail.claimed.includes(m.id) && !s.mail.deleted.includes(m.id)
  ).map((m) => m.id);
}

/** how many messages are unopened or unclaimed — drives the badge */
export function mailReady(s: SaveData): number {
  return [...MAIL, ...s.mail.custom].filter(
    (m) => !s.mail.deleted.includes(m.id) && (!s.mail.read.includes(m.id) || (m.reward && !s.mail.claimed.includes(m.id)))
  ).length;
}

export function openMail(s: SaveData, id: string) {
  if (!mailItem(s, id)) return;
  if (!s.mail.read.includes(id)) s.mail.read = [...s.mail.read, id];
}

export function deleteMail(s: SaveData, id: string) {
  if (!s.mail.deleted.includes(id)) s.mail.deleted = [...s.mail.deleted, id];
}

/** take a message's attachment. Returns the loot lines for the claim UI. */
export function deliverAutoBattleReport(
  s: SaveData,
  mode: "endless" | "gauntlet",
  waves: number,
  minutes: number,
  walletGold = 0,
  startingWave = 1,
  breakAtWave = startingWave + waves,
  runGoldMul = 1,
  boons = 0,
): string {
  const week = weekStr();
  if (s.mail.autoWeek !== week) { s.mail.autoWeek = week; s.mail.autoUses = 0; }
  if (s.mail.autoUses >= 3) return "";
  const count = Math.max(0, Math.floor(waves));
  const start = Math.max(1, Math.floor(startingWave));
  const brokenAt = Math.max(start, Math.floor(breakAtWave));
  const rounds = Math.max(0, brokenAt - 1);
  const event = eventBonus(eventForDate().id);
  const month = monthlyEventBonus(monthlyEventForDate().id);
  let accruedWallet = Math.max(0, Math.floor(walletGold));
  let tokens = 0;

  // Reproduce the run wallet over the simulated waves: wave-clear gold plus
  // expected enemy kill-gold from the exact ten-slot wave composition. Stratified
  // rolls keep the estimate deterministic while matching the wave's rarity bands.
  for (let wave = start; wave < brokenAt; wave++) {
    const waveTypes = waveComp(wave, (() => { let i = 0; return () => { const value = (i + 0.5) / 10; i++; return value; }; })());
    let killGold = 0;
    for (const type of waveTypes) {
      const enemy = ENEMY_TYPES[type];
      if (!enemy) continue;
      const boss = isBossType(type);
      const eliteChance = boss ? 0 : Math.min(0.35, 0.06 + wave * 0.015);
      const base = enemy.gold + Math.floor(wave / 2);
      const expected = base * (boss ? 1 : 1 + eliteChance);
      killGold += runGold(Math.round(expected * month.goldMul * runGoldMul));
    }
    const clearGold = runGold(reward((40 + 10 * wave) / 2) * runGoldMul);
    accruedWallet += killGold + clearGold;
    if (wave % 5 === 0) tokens++;
  }

  let gold = 0;
  let gems = 0;
  let frags = 0;
  let potions = 0;
  if (mode === "endless") {
    const clearReward = reward(60 + 45 * rounds + 12 * rounds * rounds);
    gold = Math.round((runGold(clearReward) + accruedWallet) * event.goldMul * month.goldMul);
    gems = Math.round(Math.floor((rounds / 3) * REWARD_MUL) * event.gemMul * month.gemMul);
    // Endless grants tokens on each fifth wave plus its end-of-run sixth-wave bonus.
    tokens += Math.floor(rounds / 6);
    frags = Math.min(12, 1 + Math.floor(rounds / 3));
    potions = 1 + Math.floor(rounds / 3);
  } else {
    const payout = collectGauntlet({ ...s }, rounds, boons + count, s.gauntletBest);
    // Expected gold from the random boon pool: Bounty contributes +500 per pick
    // at a 1-in-9 rate. Greed's multiplier is left inside the payout estimate's
    // conservative margin rather than assumed to be selected every time.
    accruedWallet += Math.round(count * 500 / 9);
    gold = Math.round((runGold(payout.gold) + accruedWallet) * event.goldMul * month.goldMul);
    gems = Math.round(payout.gems * event.gemMul * month.gemMul);
    potions = payout.potions;
    tokens += 0;
    frags = Math.min(12, 1 + Math.floor(rounds / 3));
  }
  // Legacy field retained for old save compatibility; Auto-Resolve has no cooldown.
  s.mail.autoReadyAt = 0;
  s.mail.autoUses += 1;
  const id = `auto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  s.mail.custom.push({
    id, kind: "reward", from: "Auto-Defense Command", subject: `${mode === "gauntlet" ? "Gauntlet" : "Endless"} expedition report`,
    body: `Your active run was ended. Your squad cleared ${count} simulated waves and was overwhelmed at wave ${brokenAt} (${minutes} minutes estimated). Rewards mirror the run's completed-wave wallet and end-of-run payout; enemy kill gold uses a deterministic expected composition. No cooldown applies. Weekly uses: ${s.mail.autoUses}/3.`,
    color: mode === "gauntlet" ? "#3dff8e" : "#ff4fd8",
    reward: { gold, gems, tokens, frags, potions }, age: "just now",
  });
  return id;
}

export function claimMail(s: SaveData, id: string): ChestLoot | null {
  const m = mailItem(s, id);
  if (!m || !m.reward || s.mail.claimed.includes(id) || s.mail.deleted.includes(id)) return null;
  const loot: ChestLoot = { ...emptyLoot(), gold: m.reward.gold || 0, gems: m.reward.gems || 0, tokens: m.reward.tokens || 0, potions: m.reward.potions || 0 };
  if (m.reward.chips) loot.chips = { basic: m.reward.chips, advanced: 0, elite: 0 };
  if (m.reward.frags) {
    // fragments are rolled off the rarity table, so a mail drop is never a dud
    for (let i = 0; i < m.reward.frags; i++) pushFrag(loot.frags, randFrag(i % 3 === 0 ? 0.6 : 0.2), 1);
  }
  grantLoot(s, loot);
  s.mail.claimed = [...s.mail.claimed, id];
  openMail(s, id);
  return loot;
}

/** collect every ready attachment at once */
export function claimAllMail(s: SaveData): ChestLoot | null {
  const ready = unclaimedMail(s);
  if (!ready.length) return null;
  let total: ChestLoot | null = null;
  for (const id of ready) {
    const l = claimMail(s, id);
    if (l) total = total ? mergeLoot(total, l) : l;
  }
  return total;
}

// ---------- season rewards ----------
/** points this account has earned on the season track */
export function seasonPointsFor(s: SaveData): number {
  return seasonPoints(s.trophies, s.wins);
}

/** the tier index the player has reached, -1 when the track has not started */
export function seasonTier(s: SaveData): number {
  return seasonTierFor(seasonPointsFor(s));
}

export function seasonClaimed(s: SaveData, idx: number): boolean {
  return s.season.number === seasonNumber() && s.season.claimed.includes(idx);
}

/** how many season crates are sitting ready to collect */
export function seasonReady(s: SaveData): number {
  let n = 0;
  const top = seasonTier(s);
  for (let i = 0; i <= top; i++) if (!seasonClaimed(s, i)) n++;
  return n;
}

export function claimSeasonTier(s: SaveData, idx: number): ChestLoot | null {
  const t = SEASON_TIERS[idx] as SeasonTier | undefined;
  if (!t || seasonClaimed(s, idx) || idx > seasonTier(s)) return null;
  const loot: ChestLoot = { ...emptyLoot(), gold: t.gold || 0, gems: t.gems || 0, tokens: t.tokens || 0 };
  if (t.chips) loot.chips = { basic: t.chips, advanced: 0, elite: 0 };
  if (t.frags) for (let i = 0; i < t.frags; i++) pushFrag(loot.frags, randFrag(0.8), 1);
  grantLoot(s, loot);
  s.season.claimed = [...s.season.claimed, idx];
  return loot;
}

/**
 * Copy the season-claim state forward when a new season rolls around. Called on
 * load; keeping it here means the UI never has to think about it.
 */
export function rollSeason(s: SaveData): boolean {
  if (s.season.number === seasonNumber()) return false;
  s.season = emptySeason(seasonNumber());
  return true;
}

// ---------- the 07:00 game-day ----------
/**
 * A "game day" starts at 07:00 local time. Everything daily (reward streak,
 * event bonus, guild donations, free chest) keys off this stamp, so claiming at
 * 06:59 and again at 07:01 counts as two different days — which is the whole
 * point of a 7 A.M. reset.
 */
/** Hardcore attempts left today (0..3), reset with the 07:00 game-day */
export function hardcorePlaysLeft(s: SaveData, day = todayStr()): number {
  const used = s.hardcoreDay === day ? Math.max(0, Math.min(HARDCORE_DAILY_PLAYS, s.hardcoreUses || 0)) : 0;
  return Math.max(0, HARDCORE_DAILY_PLAYS - used);
}

/** Super Hardcore attempts left this week (0..3), reset with the weekly stamp */
export function superHardcorePlaysLeft(s: SaveData, week = weekStr()): number {
  const used = s.superHardcoreWeek === week ? Math.max(0, Math.min(SUPER_HARDCORE_WEEKLY_PLAYS, s.superHardcoreUses || 0)) : 0;
  return Math.max(0, SUPER_HARDCORE_WEEKLY_PLAYS - used);
}

/** Spend one Super Hardcore attempt. Returns false when the weekly budget is gone. */
export function spendSuperHardcorePlay(s: SaveData, week = weekStr()): boolean {
  if (s.superHardcoreWeek !== week) {
    s.superHardcoreWeek = week;
    s.superHardcoreUses = 0;
  }
  if ((s.superHardcoreUses || 0) >= SUPER_HARDCORE_WEEKLY_PLAYS) return false;
  s.superHardcoreUses = (s.superHardcoreUses || 0) + 1;
  return true;
}

/** Spend one Hardcore attempt. Returns false when the daily budget is gone. */
export function spendHardcorePlay(s: SaveData, day = todayStr()): boolean {
  if (s.hardcoreDay !== day) {
    s.hardcoreDay = day;
    s.hardcoreUses = 0;
  }
  if ((s.hardcoreUses || 0) >= HARDCORE_DAILY_PLAYS) return false;
  s.hardcoreUses = (s.hardcoreUses || 0) + 1;
  return true;
}

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

export const ZOOM_MIN = 0.75;
export const ZOOM_MAX = 2.5;
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

/** hero awakening tier for one path (0 = not awakened) */
export function heroAwkTier(s: SaveData, id: string, slot: 0 | 1): number {
  return Math.max(0, Math.min(HERO_AWAKENING_MAX_TIER, s.heroAwn?.[id]?.[slot] || 0));
}

/**
 * Buy one hero awakening tier with Magic Tokens. Returns the new tier, or 0
 * when the purchase was refused (no path, maxed, or not enough tokens).
 */
export function awakenHero(s: SaveData, id: string, slot: 0 | 1): number {
  if (!heroAwkSpec(id, slot)) return 0;
  const cur = heroAwkTier(s, id, slot);
  if (cur >= HERO_AWAKENING_MAX_TIER) return 0;
  const cost = heroAwakenCost(cur + 1);
  if (s.tokens < cost) return 0;
  s.tokens -= cost;
  const pair = s.heroAwn[id] || [0, 0];
  pair[slot] = cur + 1;
  s.heroAwn[id] = pair as [number, number];
  return cur + 1;
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
  kind: "gold" | "gems" | "tokens" | "potions" | "frag" | "chip" | "heroShard" | "trophy";
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
  potions: number;
  frags: { id: string; n: number }[];
  chips: ChipBag;
  heroShards: { id: string; n: number }[];
}

export function emptyLootPublic(): ChestLoot {
  return emptyLoot();
}

function emptyLoot(): ChestLoot {
  return { gold: 0, gems: 0, tokens: 0, potions: 0, frags: [], chips: {}, heroShards: [] };
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
  if (c.special === "mystical") {
    // 65% five legendary fragments, 35% one mystical fragment
    if (Math.random() < 0.65) {
      const legendaryIds = Object.keys(TOWER_BY_ID).filter((id) => TOWER_BY_ID[id].rarity === "legendary");
      for (let i = 0; i < 5; i++) {
        const id = legendaryIds[Math.floor(Math.random() * legendaryIds.length)];
        if (id) pushFrag(loot.frags, id);
      }
    } else {
      const mysticalIds = Object.keys(TOWER_BY_ID).filter((id) => TOWER_BY_ID[id].rarity === "mystical");
      const id = mysticalIds[Math.floor(Math.random() * mysticalIds.length)];
      if (id) pushFrag(loot.frags, id);
    }
    return loot;
  }
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
    potions: a.potions + b.potions,
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
  s.potions += loot.potions || 0;
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
  if (loot.potions) out.push({ kind: "potions", label: "Crystal Potions", n: loot.potions, color: "#b98bff" });
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
  loot.potions += reward.potions || 0;
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
  if (rarity === "mystical") return 1.25;
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
  const loot: ChestLoot = { ...emptyLootPublic(), gold: t.gold, gems: t.gems, potions: 1 };
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
  let loot: ChestLoot = { ...emptyLootPublic(), gems: m.gems, chips: { ...m.chips }, potions: m.potions || 0 };
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

// ---------- gauntlet (roguelite mode) ----------
/** the three boons offered at the end of a gauntlet wave */
export function gauntletChoices(): GauntletBoon[] {
  const pool = [...GAUNTLET_BOONS];
  const out: GauntletBoon[] = [];
  while (out.length < 3 && pool.length) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

/** apply one boon to the run's saved stack; mutates the array in place */
export function takeGauntletBoon(list: GauntletBoon[], boon: GauntletBoon): GauntletBoon[] {
  list.push(boon);
  return list;
}

/** collect a finished gauntlet run: account gold/gems/potions + the new record */
export function collectGauntlet(s: SaveData, wave: number, boons: number, best: number): { gold: number; gems: number; potions: number; record: boolean } {
  const record = wave > best;
  const gold = Math.round(220 + wave * 95 + wave * wave * 14);
  const gems = Math.floor(wave / 2) + (record ? 40 : 5);
  const potions = 1 + Math.floor(wave / 4) + boons;
  s.gold += gold;
  s.gems += gems;
  s.potions += potions;
  if (record) s.gauntletBest = wave;
  s.runs++;
  return { gold, gems, potions, record };
}

// ---------- daily event ----------
export function liveEvent(d = new Date()) {
  return eventForDate(d);
}

/** the streak a claim made right now would land on (1..7) */
export function nextEventStreak(s: SaveData): number {
  if (s.lastEvent === todayStr()) return Math.max(1, Math.min(7, s.eventStreak));
  if (s.lastEvent === yesterdayStr() && s.eventStreak >= 1) return Math.min(7, s.eventStreak + 1);
  return 1;
}

/** +10% loot for every day of the streak, capped at +60% */
export function eventStreakMul(streak: number): number {
  return 1 + 0.1 * Math.max(0, Math.min(7, streak) - 1);
}

export function eventClaimable(s: SaveData): boolean {
  return s.lastEvent !== todayStr();
}

/** the once-a-day event participation bonus, now streak-scaled */
export function claimEventBonus(s: SaveData): ChestLoot | null {
  if (!eventClaimable(s)) return null;
  const ev = liveEvent();
  const streak = nextEventStreak(s);
  const mul = eventStreakMul(streak);
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
    case "gemrush":
      // Sunday is an active survival mode, not a passive claim bonus.
      break;
  }
  // the streak scales the currency side of the claim and hands out crystal
  // potions every single day — the vault is fed by showing up
  loot.gold = Math.round(loot.gold * mul);
  loot.gems = Math.round(loot.gems * mul);
  loot.tokens = Math.round(loot.tokens * mul);
  loot.potions += streak;
  grantLoot(s, loot);
  s.lastEvent = todayStr();
  s.eventStreak = streak;
  return loot;
}

// ---------- crystal vault ----------
export function crystalLevel(s: SaveData, id: CrystalId): number {
  const def = CRYSTAL_BY_ID[id];
  if (!def) return 0;
  return Math.max(0, Math.min(def.max, Math.floor(s.crystals[id] || 0)));
}

/** the potion price of the next level on a crystal */
export function nextCrystalCost(s: SaveData, id: CrystalId): number {
  return crystalUpgradeCost(crystalLevel(s, id));
}

/**
 * Spend crystal potions to raise one crystal a level. Every crystal upgrade in
 * the game is paid for in potions only — no gold, no fragments.
 */
export function upgradeCrystal(s: SaveData, id: CrystalId): boolean {
  const def = CRYSTAL_BY_ID[id];
  if (!def) return false;
  const lv = crystalLevel(s, id);
  if (lv >= def.max) return false;
  const cost = crystalUpgradeCost(lv);
  if (s.potions < cost) return false;
  s.potions -= cost;
  s.crystals[id] = lv + 1;
  bumpTask(s, "upgrade", 1);
  return true;
}

export function totalCrystalLevels(s: SaveData): number {
  return CRYSTALS.reduce((a, c) => a + crystalLevel(s, c.id), 0);
}

// ---------- monthly event track ----------
/** "2026-10" — the calendar month a monthly event track belongs to */
export function monthStamp(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** reset the track when a new month starts; returns true when it rolled over */
export function rollMonth(s: SaveData): boolean {
  if (s.monthKey === monthStamp()) return false;
  s.monthKey = monthStamp();
  s.monthPts = 0;
  s.monthClaimed = [];
  return true;
}

export function monthPoints(s: SaveData): number {
  return s.monthKey === monthStamp() ? s.monthPts : 0;
}

/** add monthly event points from a finished run; mutates the save */
export function addMonthPoints(s: SaveData, n: number): number {
  if (n <= 0) return 0;
  rollMonth(s);
  s.monthPts += Math.round(n);
  return s.monthPts;
}

export function monthTierClaimed(s: SaveData, idx: number): boolean {
  if (s.monthKey !== monthStamp()) return false;
  return s.monthClaimed.includes(`${monthStamp()}-${idx}`);
}

export function monthReady(s: SaveData): number {
  if (s.monthKey !== monthStamp()) return 0;
  const pts = monthPoints(s);
  return monthlyTiers(monthlyEventForDate().id).filter(
    (t, i) => pts >= t.points && !monthTierClaimed(s, i)
  ).length;
}

/** cash in one tier of the live monthly track; mutates the save */
export function claimMonthTier(s: SaveData, idx: number): ChestLoot | null {
  rollMonth(s);
  const ev = monthlyEventForDate();
  const tiers = monthlyTiers(ev.id);
  const t = tiers[idx];
  if (!t || monthTierClaimed(s, idx) || monthPoints(s) < t.points) return null;
  const loot: ChestLoot = { ...emptyLoot(), gold: t.gold, gems: t.gems, potions: t.potions, chips: { ...(t.chips || {}) } };
  grantLoot(s, loot);
  s.monthClaimed = [...s.monthClaimed, `${monthStamp()}-${idx}`];
  return loot;
}

export const MONTH_TRACK_EVENTS = MONTHLY_EVENTS.length;

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

// ---------- crit damage (merged from every tower upgrade) ----------
/** total upgrade levels banked across every tower the player owns */
export const towerUpgrades = (s: SaveData) => towerUpgradeCount(s.levels);
/** merged account crit bonus: 0.6 base + 0.08 per tower upgrade, capped */
export const critBonus = (s: SaveData) => critBonusFrom(s.levels);
/** the multiplier every crit in the arena uses */
export const critMul = (s: SaveData) => critMultiplierFrom(s.levels);

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
        .map(() => Object.keys(TOWER_BY_ID).filter((id) => TOWER_BY_ID[id].rarity === rar))
        .flat()
  );
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  // A mystical Supervisor fragment is a 1% bonus drop only on a random
  // legendary-fragment roll; the fragment shop never rolls or sells it.
  if (chosen && TOWER_BY_ID[chosen].rarity === "legendary" && TOWER_BY_ID.supervisor && Math.random() < 0.01) return "supervisor";
  return chosen;
}
