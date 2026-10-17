import { beforeEach, describe, expect, it } from "vitest";
import {
  CRYSTALS,
  CRYSTAL_MAX_LEVEL,
  RUN_SHOP,
  crystalBonus,
  crystalBuffText,
  crystalUpgradeCost,
  monthlyTiers,
  monthlyEventForDate,
  runShopCost,
} from "../game/data";
import {
  addMonthPoints,
  claimDailyReward,
  claimEventBonus,
  claimMonthTier,
  crystalLevel,
  defaultSave,
  eventClaimable,
  eventStreakMul,
  lootLines,
  monthPoints,
  monthTierClaimed,
  nextCrystalCost,
  nextEventStreak,
  todayStr,
  upgradeCrystal,
  yesterdayStr,
} from "../game/save";

beforeEach(() => {
  localStorage.clear();
});

describe("reworked in-battle upgrades", () => {
  it("pays +21% ATK and lets ATK / ATK speed reach 20 purchases", () => {
    const dmg = RUN_SHOP.find((i) => i.id === "dmg")!;
    const aspd = RUN_SHOP.find((i) => i.id === "aspd")!;
    expect(dmg.desc).toContain("+21%");
    expect(dmg.max).toBe(20);
    expect(aspd.max).toBe(20);
    // the price still climbs with every purchase
    expect(runShopCost(dmg, 19)).toBeGreaterThan(runShopCost(dmg, 18));
    expect(runShopCost(aspd, 19)).toBeGreaterThan(runShopCost(aspd, 0));
  });
});

describe("crystal vault", () => {
  it("ships six crystals with small per-level buffs", () => {
    expect(CRYSTALS).toHaveLength(6);
    expect(CRYSTALS.map((c) => c.id)).toEqual([
      "ruby",
      "sapphire",
      "emerald",
      "topaz",
      "amethyst",
      "diamond",
    ]);
    for (const c of CRYSTALS) {
      expect(c.max).toBeGreaterThan(0);
      expect(c.perLevel).toBeGreaterThan(0);
      expect(c.max).toBeLessThanOrEqual(CRYSTAL_MAX_LEVEL);
    }
    expect(CRYSTALS.find((c) => c.id === "diamond")!.max).toBe(10);
  });

  it("prices every level in crystal potions and clamps at max", () => {
    const s = defaultSave();
    expect(s.potions).toBeGreaterThan(0);
    const cost = nextCrystalCost(s, "ruby");
    expect(cost).toBe(crystalUpgradeCost(0));
    const before = s.potions;
    expect(upgradeCrystal(s, "ruby")).toBe(true);
    expect(s.potions).toBe(before - cost);
    expect(crystalLevel(s, "ruby")).toBe(1);
    // gold and fragments are untouched — potions are the only currency
    expect(crystalBonus(s.crystals).atk).toBeCloseTo(0.02);

    s.potions = 0;
    expect(upgradeCrystal(s, "ruby")).toBe(false);
    // a maxed crystal cannot take more potions
    s.potions = 99999;
    s.crystals.ruby = CRYSTAL_MAX_LEVEL;
    expect(upgradeCrystal(s, "ruby")).toBe(false);
    expect(s.potions).toBe(99999);
  });

  it("folds every crystal into one bonus block", () => {
    const b = crystalBonus({ ruby: 5, sapphire: 4, emerald: 3, topaz: 2, amethyst: 1, diamond: 6 });
    expect(b.atk).toBeCloseTo(0.1);
    expect(b.crit).toBeCloseTo(0.06);
    expect(b.sp).toBeCloseTo(0.09);
    expect(b.gold).toBeCloseTo(0.06);
    expect(b.aspd).toBeCloseTo(0.02);
    expect(b.lives).toBe(6);
    // an empty vault is neutral
    expect(crystalBonus({})).toEqual({ atk: 0, crit: 0, sp: 0, gold: 0, aspd: 0, lives: 0 });
    expect(crystalBuffText(CRYSTALS[0], 0)).toContain("Not awakened");
    expect(crystalBuffText(CRYSTALS[0], 5)).toContain("%");
  });
});

describe("reworked daily events", () => {
  it("banks a streak and scales the claim with it", () => {
    const s = defaultSave();
    expect(eventClaimable(s)).toBe(true);
    expect(nextEventStreak(s)).toBe(1);
    const first = claimEventBonus(s)!;
    expect(first.potions).toBeGreaterThanOrEqual(1);
    expect(s.eventStreak).toBe(1);
    expect(eventClaimable(s)).toBe(false);
    expect(claimEventBonus(s)).toBeNull();

    // yesterday's claim keeps the chain alive
    s.lastEvent = yesterdayStr();
    expect(nextEventStreak(s)).toBe(2);
    expect(eventStreakMul(2)).toBeGreaterThan(eventStreakMul(1));
    const second = claimEventBonus(s)!;
    expect(s.eventStreak).toBe(2);
    expect(second.potions).toBeGreaterThan(first.potions);

    // a gap resets it
    s.lastEvent = "2000-01-01";
    expect(nextEventStreak(s)).toBe(1);
    // and the multiplier caps at day 7
    expect(eventStreakMul(7)).toBe(eventStreakMul(99));
  });

  it("shows crystal potions as a reward line", () => {
    const lines = lootLines({
      gold: 0,
      gems: 0,
      tokens: 0,
      potions: 4,
      frags: [],
      chips: {},
      heroShards: [],
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ kind: "potions", n: 4 });
  });
});

describe("reworked monthly events", () => {
  it("gives every month a three-tier track", () => {
    const ev = monthlyEventForDate();
    const tiers = monthlyTiers(ev.id);
    expect(tiers).toHaveLength(3);
    expect(tiers[0].points).toBeLessThan(tiers[1].points);
    expect(tiers[1].points).toBeLessThan(tiers[2].points);
    for (const t of tiers) {
      expect(t.gold).toBeGreaterThan(0);
      expect(t.gems).toBeGreaterThan(0);
      expect(t.potions).toBeGreaterThan(0);
    }
  });

  it("rips the track when a new month starts", () => {
    const s = defaultSave();
    addMonthPoints(s, 200);
    expect(monthPoints(s)).toBe(200);
    expect(monthTierClaimed(s, 0)).toBe(false);
    const loot = claimMonthTier(s, 0)!;
    expect(loot.potions).toBeGreaterThan(0);
    expect(monthTierClaimed(s, 0)).toBe(true);
    expect(claimMonthTier(s, 0)).toBeNull();
    // a stale month stamp returns a fresh track on the next write
    s.monthKey = "1999-01";
    expect(monthPoints(s)).toBe(0);
    addMonthPoints(s, 10);
    expect(monthPoints(s)).toBe(10);
    expect(s.monthClaimed).toEqual([]);
  });

  it("still pays a daily reward with the new potion drops", () => {
    const s = defaultSave();
    s.dailyStreak = 6;
    s.lastDaily = yesterdayStr();
    const day7 = claimDailyReward(s)!;
    expect(day7.day).toBe(7);
    expect(day7.loot.potions).toBeGreaterThan(0);
    expect(s.lastDaily).toBe(todayStr());
  });
});
