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
  HP_GROWTH,
  POINT_DMG_STEP,
  ASC_DMG_MUL,
  towerDamage,
  HEROES,
  HERO_BY_ID,
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
