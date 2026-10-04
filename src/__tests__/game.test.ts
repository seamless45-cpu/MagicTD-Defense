import { describe, expect, it, beforeEach } from "vitest";
import {
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
    expect(s.gold).toBe(100 + DAILY_REWARDS[0].gold!);
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
