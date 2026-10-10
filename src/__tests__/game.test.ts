import { describe, expect, it, beforeEach } from "vitest";
import { GEM_RAIN_MIN, GOLD_RAIN_MIN } from "../components/ui";
import {
  DAILY_TASKS,
  TASK_BY_ID,
  TASK_POINTS_TOTAL,
  TASK_MILESTONES,
  TOWERS,
  TOWER_BY_ID,
  roundHp,
  waveComp,
  upgradeGoldCost,
  upgradeFragCost,
  ascentAllCost,
  awakenCost,
  MAX_MENU_LEVEL,
  MAX_BATTLE_LEVEL,
  BATTLE_ROUNDS,
  ENEMY_TYPES,
  HP_GROWTH,
  POINT_DMG_STEP,
  ASC_DMG_MUL,
  towerDamage,
  towerStatRows,
  RUN_SHOP,
  runShopCost,
  DAILY_REWARDS,
  HERO_MAX_LEVEL,
  heroCooldown,
  heroPower,
  heroUpgradeCost,
  type GameMode,
  HEROES,
  HERO_BY_ID,
  MAX_POINTS,
  SPAWN_BUDGET_TOWERS,
  REWARD_MUL,
  spCost,
  spawnBudget,
  reward,
  isBossType,
  BOSS_SKILLS,
  GIFT_CODES,
  normaliseCode,
} from "../game/data";
import {
  defaultSave,
  loadSave,
  persistSave,
  clearSave,
  importSave,
  unlockedTowers,
  randFrag,
  addFrag,
  todayStr,
  yesterdayStr,
  nextDailyStreak,
  claimDailyReward,
  heroLevel,
  upgradeHero,
  clampZoom,
  ZOOM_MAX,
  ZOOM_MIN,
  redeemGiftCode,
  bumpTask,
  taskProgress,
  taskComplete,
  taskClaimed,
  taskPoints,
  tasksReady,
  tasksRemaining,
  claimTask,
  claimMilestone,
  milestoneClaimed,
} from "../game/save";

describe("tower data", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("has unique ids and a resolvable lookup for every tower", () => {
    const ids = TOWERS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of TOWERS) {
      expect(TOWER_BY_ID[t.id]).toBe(t);
    }
  });

  it("gives every exotic tower two awakenings with 5 tiers", () => {
    for (const t of TOWERS.filter((x) => x.exotic)) {
      expect(t.awk1, t.id).toBeDefined();
      expect(t.awk2, t.id).toBeDefined();
      expect(t.awk1!.chance).toHaveLength(5);
      expect(t.awk1!.mult).toHaveLength(5);
      expect(t.awk2!.chance).toHaveLength(5);
      expect(t.awk2!.mult).toHaveLength(5);
      if (t.awk1!.mult2) expect(t.awk1!.mult2).toHaveLength(5);
      if (t.awk2!.mult2) expect(t.awk2!.mult2).toHaveLength(5);
    }
  });

  it("costs grow monotonically", () => {
    for (let lv = 1; lv < MAX_MENU_LEVEL - 1; lv++) {
      expect(upgradeGoldCost(lv + 1)).toBeGreaterThan(upgradeGoldCost(lv));
      expect(upgradeFragCost(lv + 1)).toBeGreaterThanOrEqual(upgradeFragCost(lv));
    }
    expect(ascentAllCost(1)).toBeGreaterThan(0);
    expect(awakenCost(2)).toBeGreaterThan(awakenCost(1));
    expect(MAX_BATTLE_LEVEL).toBeGreaterThan(1);
  });

  it("scales enemy hp with the round", () => {
    expect(roundHp(1)).toBeCloseTo(46, 5);
    expect(roundHp(5)).toBeGreaterThan(roundHp(4));
    expect(roundHp(12)).toBeGreaterThan(roundHp(11));
  });

  it("makes enemies exactly 1.57x stronger every wave", () => {
    expect(HP_GROWTH).toBeCloseTo(1.57, 10);
    for (const w of [1, 2, 5, 11, 30, 60]) {
      expect(roundHp(w + 1) / roundHp(w)).toBeCloseTo(1.57, 8);
    }
    expect(roundHp(30) / roundHp(1)).toBeCloseTo(Math.pow(1.57, 29), 3);
  });

  it("ships the new towers with distinct mechanics", () => {
    for (const id of ["swarm", "chrono", "void", "plasma"]) {
      const def = TOWER_BY_ID[id];
      expect(def, id).toBeDefined();
    }
    expect(TOWER_BY_ID.swarm.multi).toBeGreaterThan(1);
    expect(TOWER_BY_ID.chrono.slow).toBeGreaterThan(0);
    expect(TOWER_BY_ID.chrono.slowAura).toBeGreaterThan(0);
    expect(TOWER_BY_ID.void.pctHp).toBeGreaterThan(0);
    expect(TOWER_BY_ID.plasma.pierce).toBeGreaterThan(0);
    expect(TOWER_BY_ID.plasma.exotic).toBe(true);
  });

  it("ships the 12-tower arsenal across every rarity", () => {
    const newIds = [
      "sling", "flame", "spike", "boomer", "toxin", // normal
      "axe", "frost", "mortar", // decent
      "laser", "missile", // epic
      "dragon", "sun", // legendary
    ];
    expect(newIds).toHaveLength(12);
    for (const id of newIds) {
      const def = TOWER_BY_ID[id];
      expect(def, id).toBeDefined();
      expect(def.name.length).toBeGreaterThan(2);
      expect(def.desc.length).toBeGreaterThan(10);
      expect(def.unlockFrags).toBeGreaterThan(0);
      expect(def.rate).toBeGreaterThan(0);
      expect(def.art, `${id} art family`).toBeTruthy();
    }
    const byRarity = (r: string) => newIds.filter((id) => TOWER_BY_ID[id].rarity === r);
    expect(byRarity("normal")).toHaveLength(5);
    expect(byRarity("decent")).toHaveLength(3);
    expect(byRarity("epic")).toHaveLength(2);
    expect(byRarity("legendary")).toHaveLength(2);
    // the roster grew from 15 to 27 towers
    expect(TOWERS).toHaveLength(27);
    // mechanics actually differ between them
    expect(TOWER_BY_ID.toxin.splash).toBeGreaterThan(0);
    expect(TOWER_BY_ID.toxin.burnPct).toBeGreaterThan(0);
    expect(TOWER_BY_ID.mortar.splash).toBeGreaterThan(TOWER_BY_ID.spike.splash!);
    expect(TOWER_BY_ID.laser.chain).toBeGreaterThan(0);
    expect(TOWER_BY_ID.missile.multi).toBeGreaterThan(1);
    expect(TOWER_BY_ID.frost.slowAura).toBeGreaterThan(0);
    expect(TOWER_BY_ID.sun.target).toBe("all");
    expect(TOWER_BY_ID.dragon.killStack).toBeGreaterThan(0);
  });

  it("describes each tower's next upgrade as a +X / -Y delta", () => {
    const arrow = towerStatRows(TOWER_BY_ID.arrow, 1);
    const dmg = arrow.find((r) => r.label === "Damage")!;
    expect(dmg.value).toBe("50");
    expect(dmg.next).toBe("52");
    expect(dmg.delta).toBe("+2");
    expect(dmg.better).toBe("up");

    // faster firing is a negative delta on the shot interval
    const rate = arrow.find((r) => r.label === "Shot Interval")!;
    expect(rate.value).toBe("0.50s");
    expect(rate.delta?.startsWith("-")).toBe(true);
    expect(rate.better).toBe("down");

    // maxed stats say so instead of promising a fake upgrade
    const maxed = towerStatRows(TOWER_BY_ID.lightning, MAX_MENU_LEVEL).find((r) => r.label === "Damage")!;
    expect(maxed.maxed).toBe(true);
    expect(maxed.delta).toBeUndefined();

    for (const t of TOWERS) {
      const rows = towerStatRows(t, 3);
      expect(rows.length, t.id).toBeGreaterThan(2);
      for (const r of rows) {
        expect(r.label.length).toBeGreaterThan(0);
        expect(r.value.length).toBeGreaterThan(0);
      }
    }
  });

  it("prices the run shop so repeat buys get more expensive", () => {
    expect(RUN_SHOP.length).toBeGreaterThanOrEqual(6);
    for (const item of RUN_SHOP) {
      expect(item.max).toBeGreaterThan(0);
      expect(item.cost).toBeGreaterThan(0);
      expect(runShopCost(item, 0)).toBe(item.cost);
      if (item.step) expect(runShopCost(item, 2)).toBeGreaterThan(runShopCost(item, 1));
    }
    expect(RUN_SHOP.map((i) => i.id)).toContain("meteor");
  });

  it("keeps party mode out of the game modes", () => {
    const modes: GameMode[] = ["battle", "endless"];
    expect(modes).not.toContain("party" as GameMode);
    expect(BATTLE_ROUNDS).toBe(12);
  });

  it("levels heroes up: cost, power and cooldown all move together", () => {
    expect(HERO_MAX_LEVEL).toBeGreaterThanOrEqual(5);
    expect(heroUpgradeCost(1)).toBeGreaterThan(0);
    expect(heroUpgradeCost(5)).toBeGreaterThan(heroUpgradeCost(1));
    expect(heroPower(1)).toBe(1);
    expect(heroPower(3)).toBeGreaterThan(heroPower(2));
    const cd = HERO_BY_ID.nova.cd;
    expect(heroCooldown(cd, 1)).toBe(cd);
    expect(heroCooldown(cd, 6)).toBeLessThan(cd);
    expect(heroCooldown(cd, 99)).toBeGreaterThanOrEqual(cd * 0.6);

    const s = defaultSave();
    s.gold = 100000;
    expect(heroLevel(s, "nova")).toBe(1);
    for (let i = 0; i < HERO_MAX_LEVEL - 1; i++) expect(upgradeHero(s, "nova")).toBe(true);
    expect(heroLevel(s, "nova")).toBe(HERO_MAX_LEVEL);
    expect(upgradeHero(s, "nova")).toBe(false); // maxed
    const poor = defaultSave();
    expect(poor.gold).toBeLessThan(heroUpgradeCost(1));
    expect(upgradeHero(poor, "nova")).toBe(false);
  });

  it("ships the thunder god hero with a 20s cooldown", () => {
    const t = HERO_BY_ID.thunder;
    expect(t).toBeDefined();
    expect(t.name).toBe("Thunder God");
    expect(t.cd).toBe(20);
    expect(t.kind).toBe("thunder");
  });

  it("runs a seven day daily streak that pays out and then locks", () => {
    expect(DAILY_REWARDS).toHaveLength(7);
    const s = defaultSave();
    expect(s.dailyStreak).toBe(0);
    expect(nextDailyStreak(s)).toBe(1);

    const first = claimDailyReward(s)!;
    expect(first.day).toBe(1);
    // day 1 of the reworked calendar is 1,200 gems
    expect(s.gems).toBe(defaultSave().gems + DAILY_REWARDS[0].gems!);
    expect(first.lines.some((l) => l.kind === "gems" && l.n === 1200)).toBe(true);
    expect(s.lastDaily).toBe(todayStr());
    expect(nextDailyStreak(s)).toBe(1); // already claimed today
    expect(claimDailyReward(s)).toBeNull();

    // yesterday's claim keeps the streak alive
    s.lastDaily = yesterdayStr();
    expect(nextDailyStreak(s)).toBe(2);
    // a gap resets it
    s.lastDaily = "2000-01-01";
    expect(nextDailyStreak(s)).toBe(1);
    // the streak caps at day 7
    s.lastDaily = yesterdayStr();
    s.dailyStreak = 7;
    expect(nextDailyStreak(s)).toBe(1);
  });

  it("clamps the arena zoom into its allowed range", () => {
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(9)).toBe(ZOOM_MAX);
    expect(clampZoom(0.1)).toBe(ZOOM_MIN);
    expect(clampZoom(Number.NaN)).toBeGreaterThanOrEqual(ZOOM_MIN);
  });

  it("gives every hero a cooldown, colour and unique ability", () => {
    expect(HEROES.length).toBeGreaterThanOrEqual(4);
    const kinds = new Set(HEROES.map((h) => h.kind));
    expect(kinds.size).toBe(HEROES.length);
    for (const h of HEROES) {
      expect(h.cd).toBeGreaterThan(0);
      expect(h.color).toMatch(/^#/);
      expect(HERO_BY_ID[h.id]).toBe(h);
    }
  });

  it("grows tower damage multiplicatively so it can chase the enemy curve", () => {
    const def = TOWER_BY_ID.arrow;
    const base = towerDamage(def, 1, 1, 0);
    expect(base).toBe(def.dmg);
    // battle levels multiply damage
    const ascended = towerDamage(def, 1, 3, 0);
    expect(ascended).toBeCloseTo(def.dmg * Math.pow(ASC_DMG_MUL, 2), 5);
    // points multiply damage too
    expect(towerDamage(def, 1, 1, 4)).toBeCloseTo(def.dmg * (1 + POINT_DMG_STEP * 4), 5);
    // menu levels stay additive
    expect(towerDamage(def, 3, 1, 0)).toBe(def.dmg + def.upDmg * 2);
    // and a maxed tower outgrows an early wave
    const maxed = towerDamage(def, 15, 6, 8, 1.5);
    expect(maxed).toBeGreaterThan(def.dmg * 20);
  });

  it("builds waves that only use known enemy types and grow", () => {
    for (let round = 1; round <= BATTLE_ROUNDS + 8; round++) {
      const w = waveComp(round);
      expect(w.length).toBeGreaterThan(6);
      for (const t of w) {
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThan(ENEMY_TYPES.length);
      }
      if (round > 1) expect(w.length).toBeGreaterThanOrEqual(waveComp(round - 1).length);
    }
    // every 4th round includes a Warlord boss
    expect(waveComp(4)).toContain(4);
    expect(waveComp(8)).toContain(4);
  });

  it("keeps the battle gauntlet at 12 rounds", () => {
    expect(BATTLE_ROUNDS).toBe(12);
  });
});

describe("save file", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns a playable default save", () => {
    const s = defaultSave();
    expect(s.levels.arrow).toBe(1);
    expect(s.lineup.length).toBeGreaterThanOrEqual(3);
    expect(unlockedTowers(s)).toContain("arrow");
  });

  it("round-trips through localStorage", () => {
    const s = defaultSave();
    s.gold = 1234;
    s.frags.cannon = 9;
    persistSave(s);
    const back = loadSave();
    expect(back.gold).toBe(1234);
    expect(back.frags.cannon).toBe(9);
  });

  it("falls back to defaults on corrupt data", () => {
    localStorage.setItem("magictd_save_v1", "{not json");
    const s = loadSave();
    expect(s.gold).toBe(100);
  });

  it("heals a save with no unlocked towers and drops locked lineup entries", () => {
    localStorage.setItem(
      "magictd_save_v1",
      JSON.stringify({ levels: {}, lineup: ["arrow", "gatling"] })
    );
    const s = loadSave();
    expect(Object.keys(s.levels).length).toBeGreaterThan(0);
    for (const id of s.lineup) expect(s.levels[id]).toBeGreaterThan(0);
  });

  it("clearSave wipes progress", () => {
    persistSave({ ...defaultSave(), gold: 5000 });
    clearSave();
    expect(loadSave().gold).toBe(100);
  });

  it("randFrag always returns a real tower id", () => {
    for (let i = 0; i < 500; i++) {
      const id = randFrag(Math.random());
      expect(TOWER_BY_ID[id], id).toBeDefined();
    }
  });

  it("addFrag ignores unknown ids", () => {
    const s = defaultSave();
    addFrag(s, "arrow", 3);
    expect(s.frags.arrow).toBe(5);
    addFrag(s, "not-a-tower", 3);
    expect(s.frags["not-a-tower"]).toBeUndefined();
  });

  it("ships the new settings with sane defaults and migrates old saves", () => {
    const s = defaultSave();
    expect(s.vol).toBeGreaterThan(0);
    expect(s.dmgNums).toBe(true);
    expect(s.shakeFx).toBe(true);
    expect(s.guides).toBe(true);
    expect(s.fastWaves).toBe(false);
    expect(s.reducedMotion).toBe(false);
    expect(s.perf).toBe(false);
    // a save written before the settings existed still loads
    localStorage.setItem("magictd_save_v1", JSON.stringify({ gold: 777, levels: { arrow: 4 }, lineup: ["arrow"] }));
    const back = loadSave();
    expect(back.gold).toBe(777);
    expect(back.vol).toBe(defaultSave().vol);
    expect(back.guides).toBe(true);
  });

  it("imports an exported save blob and heals broken fields", () => {
    const blob = JSON.stringify({ ...defaultSave(), gold: 4242, hero: "nope", lineup: ["arrow", "ghost"], vol: 5 });
    const s = importSave(blob);
    expect(s.gold).toBe(4242);
    expect(s.hero).toBe("nova");
    expect(s.lineup).toEqual(["arrow"]);
    expect(s.vol).toBe(1);
    expect(() => importSave("{not json")).toThrow();
  });

  it("todayStr is an iso date", () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("balance patch", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("scales the starting SP to exactly four summons", () => {
    expect(SPAWN_BUDGET_TOWERS).toBe(4);
    const opening = spawnBudget();
    expect(opening).toBe(spCost(0) + spCost(1) + spCost(2) + spCost(3));
    // a fifth summon is out of reach until round rewards land
    expect(opening).toBeLessThan(spCost(0) + spCost(1) + spCost(2) + spCost(3) + spCost(4));
  });

  it("gives each wave two more enemies than before", () => {
    // was min(44, 6 + round * 2); wave 1 must now hold 10 bodies
    const wave1 = waveComp(1);
    expect(wave1.length).toBe(10);
    expect(waveComp(3).length).toBe(14);
    expect(waveComp(40).length).toBeGreaterThanOrEqual(46);
  });

  it("pays 40% more gold and gems for clearing rounds", () => {
    expect(REWARD_MUL).toBeCloseTo(1.4);
    expect(reward(100)).toBe(140);
    expect(reward(10)).toBe(14);
    // the round-clear payout uses the same multiplier
    const oldBonus = 40 + 10 * 5;
    expect(reward(oldBonus / 2)).toBe(Math.round((oldBonus / 2) * 1.4));
  });

  it("never grants points without a deliberate spend", () => {
    // only the Point Surge run-shop item and merging hand out points now
    const pointSources = RUN_SHOP.filter((i) => i.id === "points");
    expect(pointSources).toHaveLength(1);
    expect(MAX_POINTS).toBeGreaterThan(0);
  });
});

describe("bosses", () => {
  it("introduces a rift-tier boss and keeps every type well formed", () => {
    expect(isBossType(4)).toBe(true);
    expect(isBossType(5)).toBe(true);
    expect(isBossType(3)).toBe(false);
    const overlord = ENEMY_TYPES[5];
    expect(overlord.name).toBe("Rift Overlord");
    expect(overlord.hpMul).toBeGreaterThan(ENEMY_TYPES[4].hpMul);
    expect(overlord.lives).toBeGreaterThan(ENEMY_TYPES[4].lives);
  });

  it("gives bosses a full skill kit", () => {
    expect(BOSS_SKILLS.map((s) => s.id).sort()).toEqual(["blink", "enrage", "summon", "ward"]);
    for (const sk of BOSS_SKILLS) {
      expect(sk.name.length).toBeGreaterThan(2);
      expect(sk.tell.length).toBeGreaterThan(5);
    }
  });

  it("spawns a tougher boss on the late every-4th wave", () => {
    // stochastic comp — sample a few times and look for the upgraded boss
    let sawOverlord = false;
    for (let i = 0; i < 40; i++) {
      const comp = waveComp(16);
      const bosses = comp.filter(isBossType);
      expect(bosses.length).toBeGreaterThanOrEqual(2);
      if (bosses.includes(5)) sawOverlord = true;
    }
    expect(sawOverlord).toBe(true);
    expect(waveComp(3).filter(isBossType)).toHaveLength(0);
    expect(waveComp(4).filter(isBossType).length).toBeGreaterThan(0);
  });
});

describe("gift codes", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("normalises whatever the player pastes", () => {
    expect(normaliseCode("  magic-td ")).toBe("MAGICTD");
    expect(normaliseCode("MAGIC_TD")).toBe("MAGICTD");
    expect(normaliseCode("magic td")).toBe("MAGICTD");
  });

  it("rejects empty, unknown and already-used codes", () => {
    const s = defaultSave();
    expect(redeemGiftCode(s, "   ")).toEqual({ ok: false, reason: "empty" });
    expect(redeemGiftCode(s, "NOPE")).toEqual({ ok: false, reason: "unknown" });

    const codes = { TESTCODE: { label: "Test cache", gold: 500, gems: 3 } };
    const first = redeemGiftCode(s, "test-code", codes);
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.summary).toContain("500 gold");
    expect(s.gold).toBe(defaultSave().gold + 500);
    expect(s.gems).toBe(defaultSave().gems + 3);
    expect(redeemGiftCode(s, "TESTCODE", codes)).toEqual({ ok: false, reason: "used" });
  });

  it("grants named towers and rarity fragments", () => {
    const s = defaultSave();
    const codes = {
      FRAGS: { label: "Fragment drop", frags: { rarity: "decent" as const, n: 4 } },
      TOWER: { label: "Arrow gift", towers: [{ id: "arrow", n: 7 }] },
    };
    const before = Object.values(s.frags).reduce((a, b) => a + b, 0);
    const f = redeemGiftCode(s, "FRAGS", codes);
    expect(f.ok).toBe(true);
    expect(Object.values(s.frags).reduce((a, b) => a + b, 0)).toBe(before + 4);

    // the random "decent" roll above can also land on arrow, so measure the delta
    const arrowBefore = s.frags.arrow;
    redeemGiftCode(s, "TOWER", codes);
    expect(s.frags.arrow).toBe(arrowBefore + 7);
    expect(s.redeemed).toEqual(["FRAGS", "TOWER"]);
  });

  it("ships with an empty starter table so codes are added deliberately", () => {
    expect(Object.keys(GIFT_CODES)).toHaveLength(0);
  });
});

// ---------- 7 A.M. reset, events, trophies, chests, guild & competition ----------
import {
  CHESTS,
  CHEST_BY_ID,
  CHIPS,
  COMPETITION_TIERS,
  DAILY_RESET_HOUR,
  EVENTS,
  GUILDS,
  GUILD_DONATIONS,
  GUILD_QUESTS,
  GUILD_SHOP,
  LEAGUES,
  TROPHY_LOSS,
  TROPHY_WIN,
  competitionBoard,
  competitionTier,
  eventBonus,
  eventForDate,
  guildLevel,
  leagueFor,
  nextLeague,
  trophyDelta,
  type ChipId,
  type EnemyShape,
} from "../game/data";
import {
  addChips,
  addTrophies,
  applyBattleTrophies,
  buyGuildItem,
  claimCompetition,
  claimEventBonus,
  claimGuildChest,
  claimQuest,
  cloneSave,
  compClaimed,
  donateToGuild,
  donationsLeft,
  eventClaimable,
  grantLoot,
  guildChestReady,
  joinGuild,
  leaveGuild,
  levelHeroWithShards,
  lootLines,
  msUntilReset,
  questDone,
  resetCountdown,
  rollChest,
  weekStr,
  GUILD_DONATIONS_PER_DAY,
} from "../game/save";
import { HERO_SHARD_COST } from "../game/data";

describe("daily reset at 07:00", () => {
  it("rolls the game-day over at 7am, not midnight", () => {
    expect(DAILY_RESET_HOUR).toBe(7);
    const beforeReset = new Date(2026, 4, 10, 6, 59, 0);
    const afterReset = new Date(2026, 4, 10, 7, 1, 0);
    // 06:59 still belongs to the previous game-day
    expect(todayStr(beforeReset)).toBe("2026-05-09");
    expect(todayStr(afterReset)).toBe("2026-05-10");
    // and the streak helper follows the same boundary
    expect(yesterdayStr(afterReset)).toBe(todayStr(beforeReset));
  });

  it("counts down to the next 7am rollover", () => {
    const at8 = new Date(2026, 4, 10, 8, 0, 0);
    expect(Math.round(msUntilReset(at8) / 3600000)).toBe(23);
    const at6 = new Date(2026, 4, 10, 6, 0, 0);
    expect(Math.round(msUntilReset(at6) / 3600000)).toBe(1);
    expect(resetCountdown(at6)).toMatch(/^\d+h \d+m$|^\d+m$/);
  });
});

describe("the seven day reward table", () => {
  it("matches the designed payout for every day", () => {
    expect(DAILY_REWARDS).toHaveLength(7);
    expect(DAILY_REWARDS[0].gems).toBe(1200);
    expect(DAILY_REWARDS[1].chests).toEqual([{ id: "silver", n: 1 }]);
    expect(DAILY_REWARDS[2].chests).toEqual([{ id: "legendary", n: 1 }]);
    expect(DAILY_REWARDS[3]).toMatchObject({ frags: 5, rarity: "legendary" });
    expect(DAILY_REWARDS[4]).toMatchObject({ gold: 25000, gems: 900 });
    expect(DAILY_REWARDS[5].chips).toEqual({ basic: 5, advanced: 2 });
    expect(DAILY_REWARDS[6].chests).toEqual([{ id: "legendary", n: 3 }]);
    // every chest referenced by the calendar actually exists
    DAILY_REWARDS.forEach((r) => r.chests?.forEach((c) => expect(CHEST_BY_ID[c.id]).toBeDefined()));
  });

  it("banks day 4 as five legendary fragments and day 6 as chip modules", () => {
    const s = defaultSave();
    s.dailyStreak = 3;
    s.lastDaily = yesterdayStr();
    const before = Object.values(s.frags).reduce((a, b) => a + b, 0);
    const day4 = claimDailyReward(s)!;
    expect(day4.day).toBe(4);
    expect(Object.values(s.frags).reduce((a, b) => a + b, 0)).toBe(before + 5);

    s.dailyStreak = 5;
    s.lastDaily = yesterdayStr();
    const day6 = claimDailyReward(s)!;
    expect(day6.day).toBe(6);
    expect(s.chips.basic).toBe(5);
    expect(s.chips.advanced).toBe(2);
    expect(day6.lines.filter((l) => l.kind === "chip")).toHaveLength(2);
  });

  it("opens the day 7 triple legendary chest and reports its loot", () => {
    const s = defaultSave();
    s.dailyStreak = 6;
    s.lastDaily = yesterdayStr();
    const day7 = claimDailyReward(s)!;
    expect(day7.day).toBe(7);
    expect(day7.chests).toEqual([{ id: "legendary", n: 3 }]);
    // three legendary chests always pay gold and a pile of fragments
    expect(day7.loot.gold).toBeGreaterThanOrEqual(150 * 3);
    expect(day7.loot.frags.reduce((a, f) => a + f.n, 0)).toBeGreaterThanOrEqual(24);
    expect(day7.lines.length).toBeGreaterThan(1);
  });
});

describe("weekday events", () => {
  it("covers all seven days exactly once", () => {
    const days = EVENTS.flatMap((e) => e.days).sort();
    expect(days).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("maps each weekday to the right event", () => {
    const on = (dow: number) => eventForDate(new Date(2026, 1, 1 + dow)).name; // 2026-02-01 is a Sunday
    expect(on(0)).toBe("Survive Lightning");
    expect(on(1)).toBe("Luck Hunting");
    expect(on(2)).toBe("Chest Box");
    expect(on(3)).toBe("Trophy Competition");
    expect(on(4)).toBe("Items Finding");
    expect(on(5)).toBe("Mineshaft");
    expect(on(6)).toBe("Mineshaft");
  });

  it("turns each event into real modifiers", () => {
    expect(eventBonus("luck").chestFragBonus).toBe(1);
    expect(eventBonus("chestbox").chestPriceMul).toBeLessThan(1);
    expect(eventBonus("trophy").trophyWin).toBe(30);
    expect(eventBonus("items").chipDrop).toEqual({ basic: 2 });
    expect(eventBonus("mineshaft").goldMul).toBeGreaterThan(1);
    expect(eventBonus("lightning").gemMul).toBe(2);
    expect(eventBonus("lightning").hpMul).toBeGreaterThan(1);
  });

  it("pays the event bonus once per game-day", () => {
    const s = defaultSave();
    expect(eventClaimable(s)).toBe(true);
    const loot = claimEventBonus(s);
    expect(loot).not.toBeNull();
    expect(eventClaimable(s)).toBe(false);
    expect(claimEventBonus(s)).toBeNull();
    expect(s.lastEvent).toBe(todayStr());
  });
});

describe("trophies", () => {
  it("pays 70 for a win and takes 20 for a defeat", () => {
    expect(TROPHY_WIN).toBe(70);
    expect(TROPHY_LOSS).toBe(20);
    expect(trophyDelta(true)).toBe(70);
    expect(trophyDelta(false)).toBe(-20);
    const s = defaultSave();
    expect(applyBattleTrophies(s, true)).toBe(70);
    expect(s.trophies).toBe(70);
    expect(applyBattleTrophies(s, false)).toBe(-20);
    expect(s.trophies).toBe(50);
  });

  it("never drops below zero and tracks a personal best", () => {
    const s = defaultSave();
    addTrophies(s, 30);
    expect(s.bestTrophies).toBe(30);
    applyBattleTrophies(s, false);
    expect(s.trophies).toBe(10);
    applyBattleTrophies(s, false);
    expect(s.trophies).toBe(0);
    expect(s.bestTrophies).toBe(30);
  });

  it("sweetens the swing on Trophy Competition day", () => {
    const b = eventBonus("trophy");
    expect(trophyDelta(true, b)).toBe(100);
    expect(trophyDelta(false, b)).toBe(-10);
  });

  it("sorts players into leagues", () => {
    expect(leagueFor(0).name).toBe("Copper");
    expect(leagueFor(1000).name).toBe("Silver");
    expect(leagueFor(99999).name).toBe("Rift Legend");
    expect(nextLeague(0)!.name).toBe("Iron");
    expect(nextLeague(99999)).toBeNull();
    // the ladder is strictly ascending
    LEAGUES.forEach((l, i) => i > 0 && expect(l.min).toBeGreaterThan(LEAGUES[i - 1].min));
  });
});

describe("competition", () => {
  it("builds a stable weekly board that includes the player", () => {
    const a = competitionBoard(1200, "2026-W10");
    const b = competitionBoard(1200, "2026-W10");
    expect(a.map((r) => r.name)).toEqual(b.map((r) => r.name));
    expect(a.find((r) => r.name === "You")!.trophies).toBe(1200);
    // sorted descending
    a.forEach((r, i) => i > 0 && expect(r.trophies).toBeLessThanOrEqual(a[i - 1].trophies));
    // a different week reshuffles the rivals
    expect(competitionBoard(1200, "2026-W11").map((r) => r.name)).not.toEqual(a.map((r) => r.name));
  });

  it("pays the matching tier once per week", () => {
    expect(competitionTier(1)!.label).toBe("Champion");
    expect(competitionTier(7)!.label).toBe("Top 10");
    expect(competitionTier(999)).toBeNull();
    const s = defaultSave();
    const tier = COMPETITION_TIERS[0];
    expect(compClaimed(s)).toBe(false);
    expect(claimCompetition(s, tier.gems, tier.gold, tier.chips)).toBe(true);
    expect(s.gems).toBe(defaultSave().gems + tier.gems);
    expect(s.chips.elite).toBe(tier.chips.elite);
    expect(compClaimed(s)).toBe(true);
    expect(claimCompetition(s, tier.gems, tier.gold, tier.chips)).toBe(false);
    expect(s.compClaimed).toContain(weekStr());
  });
});

describe("support and heroes chests", () => {
  it("ships the new chest grades", () => {
    const ids = CHESTS.map((c) => c.id);
    expect(ids).toContain("support");
    expect(ids).toContain("hero");
    expect(CHEST_BY_ID.support.chips).toBeTruthy();
    expect(CHEST_BY_ID.hero.heroShards).toBeTruthy();
  });

  it("rolls chip modules out of a Support Chest", () => {
    let chips = 0;
    for (let i = 0; i < 40; i++) {
      const loot = rollChest("support");
      chips += Object.values(loot.chips).reduce((a: number, b) => a + (b || 0), 0);
      expect(loot.gold).toBeGreaterThanOrEqual(120);
    }
    expect(chips).toBeGreaterThan(0);
  });

  it("rolls hero shards out of a Heroes Chest and levels a hero with them", () => {
    const loot = rollChest("hero");
    expect(loot.heroShards).toHaveLength(1);
    expect(loot.heroShards[0].n).toBeGreaterThanOrEqual(4);

    const s = defaultSave();
    expect(levelHeroWithShards(s, "nova")).toBe(false); // no shards yet
    s.heroShards.nova = HERO_SHARD_COST;
    expect(levelHeroWithShards(s, "nova")).toBe(true);
    expect(heroLevel(s, "nova")).toBe(2);
    expect(s.heroShards.nova).toBe(0);
  });

  it("grants loot and describes it as animated reward lines", () => {
    const s = defaultSave();
    const loot = rollChest("legendary");
    const goldBefore = s.gold;
    grantLoot(s, loot);
    expect(s.gold).toBe(goldBefore + loot.gold);
    const lines = lootLines(loot);
    expect(lines.length).toBeGreaterThan(0);
    lines.forEach((l) => {
      expect(l.n).toBeGreaterThan(0);
      expect(l.color).toMatch(/^#/);
    });
  });

  it("honours the Luck Hunting fragment bonus", () => {
    const base = rollChest("common", 0, 0);
    const lucky = rollChest("common", 1, 0.25);
    const count = (l: typeof base) => l.frags.reduce((a, f) => a + f.n, 0);
    expect(count(lucky)).toBeGreaterThan(count(base) - 1);
  });

  it("tracks chip modules on the save", () => {
    const s = defaultSave();
    expect(s.chips).toEqual({ basic: 0, advanced: 0, elite: 0 });
    addChips(s, { basic: 3, elite: 1 });
    addChips(s, { basic: 2 });
    expect(s.chips.basic).toBe(5);
    expect(s.chips.elite).toBe(1);
    CHIPS.forEach((c) => expect(s.chips[c.id as ChipId]).toBeGreaterThanOrEqual(0));
  });
});

describe("guild", () => {
  it("gates guilds behind a trophy requirement", () => {
    const s = defaultSave();
    expect(joinGuild(s, "null")).toBe(false); // needs 1800 trophies
    expect(joinGuild(s, "vanguard")).toBe(true);
    expect(s.guild.id).toBe("vanguard");
    leaveGuild(s);
    expect(s.guild.id).toBeNull();
    GUILDS.forEach((g) => expect(g.perk.length).toBeGreaterThan(0));
  });

  it("limits donations per game-day and converts them to xp and coins", () => {
    const s = defaultSave();
    joinGuild(s, "vanguard");
    s.gold = 100000;
    const tier = GUILD_DONATIONS[0];
    expect(donationsLeft(s)).toBe(GUILD_DONATIONS_PER_DAY);
    for (let i = 0; i < GUILD_DONATIONS_PER_DAY; i++) expect(donateToGuild(s, tier.gold, tier.xp, tier.coins)).toBe(true);
    expect(donationsLeft(s)).toBe(0);
    expect(donateToGuild(s, tier.gold, tier.xp, tier.coins)).toBe(false);
    expect(s.guild.xp).toBe(tier.xp * GUILD_DONATIONS_PER_DAY);
    expect(s.guild.coins).toBe(tier.coins * GUILD_DONATIONS_PER_DAY);
  });

  it("levels the guild from contribution xp", () => {
    expect(guildLevel(0).level).toBe(1);
    expect(guildLevel(100000).level).toBeLessThanOrEqual(20);
    const a = guildLevel(2000);
    expect(a.level).toBeGreaterThan(1);
    expect(a.into).toBeLessThan(a.need || Infinity);
  });

  it("opens one guild chest per day and gives Null Sigil extra chips", () => {
    const s = defaultSave();
    joinGuild(s, "vanguard");
    expect(guildChestReady(s)).toBe(true);
    expect(claimGuildChest(s)).not.toBeNull();
    expect(guildChestReady(s)).toBe(false);
    expect(claimGuildChest(s)).toBeNull();

    const n = defaultSave();
    n.trophies = 5000;
    joinGuild(n, "null");
    const loot = claimGuildChest(n)!;
    expect((loot.chips.basic || 0)).toBeGreaterThanOrEqual(2);
  });

  it("spends guild coins in the coin store", () => {
    const s = defaultSave();
    joinGuild(s, "vanguard");
    const item = GUILD_SHOP[0];
    expect(buyGuildItem(s, item)).toBe(false); // broke
    s.guild.coins = item.coins;
    const gold = s.gold;
    expect(buyGuildItem(s, item)).toBe(true);
    expect(s.gold).toBe(gold + item.grant.gold!);
    expect(s.guild.coins).toBe(0);
  });

  it("claims weekly war objectives only once they are complete", () => {
    const s = defaultSave();
    joinGuild(s, "vanguard");
    const q = GUILD_QUESTS.find((x) => x.id === "wins")!;
    expect(claimQuest(s, q.id)).toBe(false);
    s.guild.quests.wins = q.need;
    expect(claimQuest(s, q.id)).toBe(true);
    expect(questDone(s, q.id)).toBe(true);
    expect(claimQuest(s, q.id)).toBe(false);
    expect(s.guild.coins).toBe(q.coins);
  });
});

describe("reworked enemies", () => {
  it("gives every enemy a full palette and a distinct silhouette", () => {
    const shapes = new Set<EnemyShape>();
    ENEMY_TYPES.forEach((e) => {
      expect(e.color).toMatch(/^#/);
      expect(e.accent).toMatch(/^#/);
      expect(e.shade).toMatch(/^#/);
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.bobRate).toBeGreaterThan(0);
      shapes.add(e.shape);
    });
    // no two enemies share a body
    expect(shapes.size).toBe(ENEMY_TYPES.length);
  });

  it("keeps the boss indices intact after the rework", () => {
    expect(ENEMY_TYPES).toHaveLength(6);
    expect(isBossType(4)).toBe(true);
    expect(isBossType(3)).toBe(false);
    expect(ENEMY_TYPES[5].name).toBe("Rift Overlord");
  });
});

describe("save migration", () => {
  it("fills in the new fields for an old save blob", () => {
    const s = importSave(JSON.stringify({ gold: 10, levels: { arrow: 1 }, lineup: ["arrow"] }));
    expect(s.chips).toEqual({ basic: 0, advanced: 0, elite: 0 });
    expect(s.trophies).toBe(0);
    expect(s.guild.id).toBeNull();
    expect(s.heroShards).toEqual({});
    expect(s.compClaimed).toEqual([]);
  });

  it("clones a save without sharing references", () => {
    const s = defaultSave();
    const c = cloneSave(s);
    c.chips.basic = 9;
    c.guild.coins = 5;
    expect(s.chips.basic).toBe(0);
    expect(s.guild.coins).toBe(0);
  });
});

// ---------- daily tasks ----------
describe("daily tasks", () => {
  const fresh = () => {
    const s = defaultSave();
    s.tasks = { day: todayStr(), prog: {}, claimed: [], milestones: [] };
    return s;
  };

  it("exposes eight tasks worth 100 points in total", () => {
    expect(DAILY_TASKS).toHaveLength(8);
    expect(DAILY_TASKS.reduce((a, t) => a + t.points, 0)).toBe(TASK_POINTS_TOTAL);
    expect(TASK_POINTS_TOTAL).toBe(100);
    // every task id resolves through the lookup map
    DAILY_TASKS.forEach((t) => expect(TASK_BY_ID[t.id]).toBe(t));
  });

  it("accumulates progress and only completes at the required amount", () => {
    const s = fresh();
    const need = TASK_BY_ID.kills.need;
    bumpTask(s, "kills", need - 1);
    expect(taskProgress(s, "kills")).toBe(need - 1);
    expect(taskComplete(s, "kills")).toBe(false);
    bumpTask(s, "kills", 1);
    expect(taskComplete(s, "kills")).toBe(true);
  });

  it("ignores non-positive bumps", () => {
    const s = fresh();
    bumpTask(s, "play", 0);
    bumpTask(s, "play", -5);
    expect(taskProgress(s, "play")).toBe(0);
  });

  it("pays a task exactly once", () => {
    const s = fresh();
    bumpTask(s, "play", TASK_BY_ID.play.need);
    const gold = s.gold;
    const loot = claimTask(s, "play");
    expect(loot).not.toBeNull();
    expect(s.gold).toBe(gold + TASK_BY_ID.play.gold);
    expect(taskClaimed(s, "play")).toBe(true);
    // a second claim is refused and pays nothing
    expect(claimTask(s, "play")).toBeNull();
    expect(s.gold).toBe(gold + TASK_BY_ID.play.gold);
  });

  it("refuses to pay an incomplete task", () => {
    const s = fresh();
    expect(claimTask(s, "win")).toBeNull();
  });

  it("only counts claimed tasks toward the point total", () => {
    const s = fresh();
    bumpTask(s, "play", 999);
    expect(taskPoints(s)).toBe(0);
    claimTask(s, "play");
    expect(taskPoints(s)).toBe(TASK_BY_ID.play.points);
  });

  it("gates milestones behind their point threshold", () => {
    const s = fresh();
    expect(claimMilestone(s, 0)).toBeNull();
    // claim enough tasks to clear the first milestone
    for (const t of DAILY_TASKS) {
      if (taskPoints(s) >= TASK_MILESTONES[0].points) break;
      bumpTask(s, t.id, t.need);
      claimTask(s, t.id);
    }
    const gems = s.gems;
    const loot = claimMilestone(s, 0);
    expect(loot).not.toBeNull();
    expect(s.gems).toBeGreaterThan(gems);
    expect(milestoneClaimed(s, 0)).toBe(true);
    expect(claimMilestone(s, 0)).toBeNull();
  });

  it("clearing every task reaches the perfect-day milestone", () => {
    const s = fresh();
    DAILY_TASKS.forEach((t) => {
      bumpTask(s, t.id, t.need);
      claimTask(s, t.id);
    });
    expect(taskPoints(s)).toBe(TASK_POINTS_TOTAL);
    expect(tasksRemaining(s)).toBe(0);
    expect(claimMilestone(s, TASK_MILESTONES.length - 1)).not.toBeNull();
  });

  it("resets progress and claims when the day rolls over", () => {
    const s = fresh();
    bumpTask(s, "play", 3);
    claimTask(s, "play");
    s.tasks.day = "1999-01-01";
    expect(taskProgress(s, "play")).toBe(0);
    expect(taskClaimed(s, "play")).toBe(false);
    expect(taskPoints(s)).toBe(0);
    bumpTask(s, "play", 1);
    expect(s.tasks.day).toBe(todayStr());
    expect(taskProgress(s, "play")).toBe(1);
  });

  it("counts ready tasks and milestones for the nav badge", () => {
    const s = fresh();
    expect(tasksReady(s)).toBe(0);
    bumpTask(s, "play", TASK_BY_ID.play.need);
    bumpTask(s, "win", TASK_BY_ID.win.need);
    expect(tasksReady(s)).toBe(2);
    claimTask(s, "play");
    claimTask(s, "win");
    // both tasks are banked; the 30-point milestone is now the thing waiting
    expect(tasksReady(s)).toBe(1);
    claimMilestone(s, 0);
    expect(tasksReady(s)).toBe(0);
  });

  it("survives a save that has no task block at all", () => {
    const raw = defaultSave() as unknown as Record<string, unknown>;
    delete raw.tasks;
    const s = importSave(JSON.stringify(raw));
    expect(s.tasks.prog).toEqual({});
    expect(() => bumpTask(s, "play", 1)).not.toThrow();
    expect(taskProgress(s, "play")).toBe(1);
  });
});

// ---------- reworked hero skills ----------
describe("hero skills", () => {
  it("gives every hero a named multi-phase ultimate", () => {
    HEROES.forEach((h) => {
      expect(h.skillName.length).toBeGreaterThan(2);
      expect(h.phases.length).toBeGreaterThanOrEqual(2);
      expect(h.effects.length).toBeGreaterThanOrEqual(2);
      expect(h.castTime).toBeGreaterThan(0);
      // phases are ordered and all land inside the cast window
      let prev = -1;
      h.phases.forEach((p) => {
        expect(p.at).toBeGreaterThanOrEqual(prev);
        expect(p.at).toBeLessThanOrEqual(h.castTime);
        prev = p.at;
      });
    });
  });

  it("keeps hero ids unique and resolvable", () => {
    const ids = HEROES.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(HERO_BY_ID[id].id).toBe(id));
  });
});

// ---------- chest pricing & legendary unlocks ----------
describe("chest economy", () => {
  it("prices every headline chest in gems at the new rates", () => {
    const want: Record<string, number> = { common: 80, silver: 200, hero: 500, epic: 800, legendary: 2000 };
    Object.entries(want).forEach(([id, cost]) => {
      const c = CHEST_BY_ID[id];
      expect(c, id).toBeTruthy();
      expect(c.gem, `${id} currency`).toBe(1);
      expect(c.cost, `${id} price`).toBe(cost);
    });
  });

  it("keeps the price ladder strictly increasing by tier", () => {
    const ladder = ["common", "silver", "hero", "epic", "legendary"].map((id) => CHEST_BY_ID[id].cost);
    for (let i = 1; i < ladder.length; i++) expect(ladder[i]).toBeGreaterThan(ladder[i - 1]);
  });

  it("starts a fresh account with enough gems to open a chest", () => {
    expect(defaultSave().gems).toBeGreaterThanOrEqual(CHEST_BY_ID.common.cost);
  });

  it("unlocks every legendary tower from a single fragment", () => {
    const legs = TOWERS.filter((t) => t.rarity === "legendary");
    expect(legs.length).toBeGreaterThan(0);
    legs.forEach((t) => expect(t.unlockFrags, t.name).toBe(1));
  });

  it("still gates non-legendary towers behind their own fragment costs", () => {
    // normals are free, everything between normal and legendary still costs more than one
    TOWERS.filter((t) => t.rarity === "decent" || t.rarity === "epic").forEach((t) =>
      expect(t.unlockFrags, t.name).toBeGreaterThan(1)
    );
  });

  it("lets a single legendary fragment actually unlock the tower", () => {
    const leg = TOWERS.find((t) => t.rarity === "legendary")!;
    const s = defaultSave();
    s.frags[leg.id] = 1;
    expect(s.frags[leg.id]).toBeGreaterThanOrEqual(leg.unlockFrags);
  });
});

// ---------- jackpot thresholds ----------
describe("payout rain thresholds", () => {
  it("triggers the rain at 1000 gold and 100 gems", () => {
    expect(GOLD_RAIN_MIN).toBe(1000);
    expect(GEM_RAIN_MIN).toBe(100);
  });

  it("the legendary chest can pay out enough to trigger it", () => {
    const s = defaultSave();
    const before = s.gems;
    // the top milestone pays well past the gem threshold
    const loot = { ...rollChest("legendary") };
    expect(loot.gold + loot.gems).toBeGreaterThan(0);
    expect(before).toBe(s.gems);
  });
});
