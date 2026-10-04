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
  PARTY_ROUNDS,
  ENEMY_TYPES,
} from "../game/data";
import {
  defaultSave,
  loadSave,
  persistSave,
  clearSave,
  unlockedTowers,
  randFrag,
  addFrag,
  todayStr,
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

  it("builds waves that only use known enemy types and grow", () => {
    for (let round = 1; round <= PARTY_ROUNDS; round++) {
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

  it("only spawns boss rounds for the configured round counts", () => {
    expect(BATTLE_ROUNDS).toBeLessThanOrEqual(PARTY_ROUNDS);
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

  it("todayStr is an iso date", () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
