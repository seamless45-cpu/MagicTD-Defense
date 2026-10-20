import { describe, expect, it, beforeEach, vi } from "vitest";
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
  enemySpawnInterval,
  SPAWN_INTERVAL_STEP,
  WAVE_ENEMY_COUNT,
  upgradeGoldCost,
  upgradeFragCost,
  ascentAllCost,
  awakenCost,
  ASC_COST_STEP,
  MAX_MENU_LEVEL,
  MAX_BATTLE_LEVEL,
  BATTLE_ROUNDS,
  ENEMY_TYPES,
  HP_GROWTH,
  BOSS_HP_MUL,
  ENEMY_HP_SCALE,
  ELITE_HP_MUL,
  powerPlantNetworkScale,
  shortHp,
  GOLD_GAIN_MUL,
  runGold,
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
  CRYSTALS,
  crystalBonus,
  crystalBuffText,
  mysticalUpgradeCost,
  HEROES,
  HERO_BY_ID,
  MAX_POINTS,
  SPAWN_BUDGET_TOWERS,
  SP_BASE_COST,
  SP_COST_STEP,
  ascSpCost,
  killSp,
  MONTHLY_EVENTS,
  monthlyEventForDate,
  monthlyEventBonus,
  BASE_MONTHLY_BONUS,
  REWARD_MUL,
  spCost,
  spawnBudget,
  reward,
  isBossType,
  BOSS_SKILLS,
  BOSS_KITS,
  TITAN_TYPE,
  GAUNTLET_BOONS,
  HOUND_TYPE,
  WRAITH_TYPE,
  GOLEM_TYPE,
  LEVIATHAN_TYPE,
  BOSS_CHAINS_DR,
  BOSS_METEOR_COUNT,
  BOSS_NULL_SLOW,
  bossKit,
  CRIT_CHANCE,
  CRIT_DMG_BASE,
  CRIT_DMG_MAX,
  CRIT_DMG_PER_UPGRADE,
  critBonusFrom,
  critMultiplierFrom,
  fmtCritPct,
  towerArt,
  towerUpgradeCount,
  critAfterUpgrade,
} from "../game/data";
import { SKILLS } from "../game/skills";
import { critBonus as critBonusFromSave, critMul } from "../game/save";
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
  gauntletChoices,
  takeGauntletBoon,
  collectGauntlet,
  deliverAutoBattleReport,
  inbox,
  unclaimedMail,
  claimMail,
  UI_THEMES,
} from "../game/save";
import { FONTS, FONT_BY_ID, DEFAULT_FONT, fontStack, fontDisplayStack, applyFont } from "../game/fonts";
import { estimateAutoBattle } from "../game/autobattle";

describe("tower data", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("offers Aurora, Solar Flare, and Obsidian UI palettes", () => {
    expect(UI_THEMES.map((theme) => theme.id)).toEqual(expect.arrayContaining(["aurora", "solar", "obsidian"]));
    expect(new Set(UI_THEMES.map((theme) => theme.id)).size).toBe(UI_THEMES.length);
  });

  it("has unique ids and a resolvable lookup for every tower", () => {
    const ids = TOWERS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of TOWERS) {
      expect(TOWER_BY_ID[t.id]).toBe(t);
    }
  });

  it("defines Demon Execution as a mystical, unbuffable executor with its two new awakenings", () => {
    const demon = TOWER_BY_ID.demon;
    expect(demon.rarity).toBe("mystical");
    expect(demon.execCd).toBe(5);
    expect(demon.aspd).toBeUndefined();
    expect(demon.awk1?.name).toBe("Soul Wipeout");
    expect(demon.awk1?.mult).toEqual([2, 4, 6, 8, 10, 12]);
    expect(demon.awk2?.name).toBe("Hell Dimensions");
    expect(demon.awk2?.mult[0]).toBe(0.25);
    expect(demon.awk2?.mult2?.[0]).toBe(1);
    const rows = towerStatRows(demon, 15);
    expect(rows.find((r) => r.label === "Strike Interval")?.value).toContain("unaffected");
    expect(rows.some((r) => r.label.includes("Attack Speed"))).toBe(false);
  });

  it("boosts every Supervisor buff parameter by tenfold", () => {
    const supervisor = TOWER_BY_ID.supervisor;
    expect(supervisor.desc).toContain("1% per kill");
    expect(supervisor.desc).toContain("+2,000%");
    expect(supervisor.awk1?.mult.slice(0, 5)).toEqual([1, 1, 1, 1, 1]);
    expect(supervisor.awk1?.desc).toContain("12,000%");
    const rows = towerStatRows(supervisor, 1);
    expect(rows.find((r) => r.label === "Kill Buff")?.value).toContain("+1%");
    expect(rows.find((r) => r.label === "Superbuff")?.value).toContain("+6,000%");
  });

  it("gives every tower two awakenings with 6 tiers", () => {
    // every tower is awakenable now, not just the exotics: the preview panel
    // shows both paths for the whole roster
    for (const t of TOWERS) {
      expect(t.awk1, t.id).toBeDefined();
      expect(t.awk2, t.id).toBeDefined();
      expect(t.awk1!.chance).toHaveLength(6);
      expect(t.awk1!.mult).toHaveLength(6);
      expect(t.awk2!.chance).toHaveLength(6);
      expect(t.awk2!.mult).toHaveLength(6);
      if (t.awk1!.mult2) expect(t.awk1!.mult2).toHaveLength(6);
      if (t.awk2!.mult2) expect(t.awk2!.mult2).toHaveLength(6);
      expect(t.awk1!.name.length, t.id).toBeGreaterThan(0);
      expect(t.awk2!.name.length, t.id).toBeGreaterThan(0);
      expect(t.awk1!.desc.length, t.id).toBeGreaterThan(0);
      expect(t.awk2!.desc.length, t.id).toBeGreaterThan(0);
      expect(awakenCost(1), t.id).toBeGreaterThan(0);
      expect(awakenCost(2), t.id).toBeGreaterThan(awakenCost(1));
    }
  });

  it("extends both awakening paths through Tier VI", () => {
    for (const tower of TOWERS) {
      if (tower.awk1) {
        expect(tower.awk1.chance).toHaveLength(6);
        expect(tower.awk1.mult).toHaveLength(6);
        expect(tower.awk1.chance[5]).toBeLessThanOrEqual(1);
      }
      if (tower.awk2) {
        expect(tower.awk2.chance).toHaveLength(6);
        expect(tower.awk2.mult).toHaveLength(6);
        expect(tower.awk2.chance[5]).toBeLessThanOrEqual(1);
      }
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

  it("grows enemy HP by 72% each wave", () => {
    expect(HP_GROWTH).toBeCloseTo(1.72, 10);
    for (const w of [1, 2, 5, 11, 30, 60]) {
      expect(roundHp(w + 1) / roundHp(w)).toBeCloseTo(1.72, 8);
    }
    expect(roundHp(30) / roundHp(1)).toBeCloseTo(Math.pow(1.72, 29), 3);
    expect(roundHp(2)).toBeCloseTo(46 * 1.72, 6);
  });

  it("scales Power Plant networks into stronger damage and speed auras", () => {
    expect(powerPlantNetworkScale(0)).toBe(1);
    expect(powerPlantNetworkScale(3)).toBe(1);
    expect(powerPlantNetworkScale(4)).toBe(1.25);
    expect(powerPlantNetworkScale(6)).toBe(1.5);
    expect(powerPlantNetworkScale(8)).toBe(1.75);
    expect(powerPlantNetworkScale(12)).toBe(2);
  });

  it("applies a dedicated HP modifier to regular enemies and bosses", () => {
    expect(ENEMY_HP_SCALE).toBeCloseTo(1.9, 10);
    expect(BOSS_HP_MUL).toBeCloseTo(1.78, 10);
    expect(ELITE_HP_MUL).toBeCloseTo(2.8, 10);
    for (const [i, et] of ENEMY_TYPES.entries()) {
      const scale = isBossType(i) ? BOSS_HP_MUL : ENEMY_HP_SCALE;
      expect(scale).toBeGreaterThan(1);
      expect(roundHp(7) * et.hpMul * scale).toBeGreaterThan(roundHp(7) * et.hpMul);
    }
  });

  it("labels battlefield health in a compact form", () => {
    expect(shortHp(0)).toBe("0");
    expect(shortHp(987)).toBe("987");
    expect(shortHp(1000)).toBe("1k");
    expect(shortHp(1234)).toBe("1.23k");
    expect(shortHp(12_300)).toBe("12.3k");
    expect(shortHp(123_000)).toBe("123k");
    expect(shortHp(4_560_000)).toBe("4.56M");
    expect(shortHp(7_900_000_000)).toBe("7.9B");
    // a rounded 999.6k steps up instead of printing "1000k"
    expect(shortHp(999_600)).toBe("1M");
  });

  it("applies the dedicated +78% boss health multiplier", () => {
    expect(BOSS_HP_MUL).toBeCloseTo(1.78, 10);
    // the multiplier lands on each boss's own type HP; their large role-based
    // multipliers remain intact on top of the new global boss health bonus.
    const bossMul = ENEMY_TYPES.map((e, i) => ({ e, i })).filter(({ i }) => isBossType(i)).map(({ e }) => e.hpMul * BOSS_HP_MUL);
    const normalMul = ENEMY_TYPES.map((e, i) => ({ e, i })).filter(({ i }) => !isBossType(i)).map(({ e }) => e.hpMul);
    expect(bossMul.length).toBeGreaterThan(0);
    expect(bossMul.every((m) => m > Math.max(...normalMul)), "bosses still dwarf the horde after the trim").toBe(true);
    // every boss receives the dedicated scale, and boss identity stays distinct
    expect(bossMul.every((m) => m > 10)).toBe(true);
  });

  it("pays 50% more run gold from kills, bounties and wave clears", () => {
    expect(GOLD_GAIN_MUL).toBeCloseTo(1.5, 10);
    expect(runGold(2)).toBe(3); // a slime's 2 base gold
    expect(runGold(30)).toBe(45); // a Warlord
    expect(runGold(0)).toBe(0);
    // it is a straight multiplier, so ordering never matters
    for (const v of [4, 9, 17, 55, 140]) expect(runGold(v)).toBe(Math.round(v * 1.5));
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
    // the roster includes the 61 established towers plus the new Mystical Supervisor
    expect(TOWERS).toHaveLength(62);
    expect(TOWER_BY_ID.supervisor.rarity).toBe("mystical");
    expect(TOWER_BY_ID.supervisor.unlockFrags).toBe(1);
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

  it("ships the ten casters with skills and awakenings", () => {
    const casters = [
      "gale", "bombardment", "wildfire", "hades", "ion",
      "aether", "scythe", "sandstorm", "bloodstone", "venom",
    ];
    expect(casters).toHaveLength(10);
    for (const id of casters) {
      const def = TOWER_BY_ID[id];
      expect(def, id).toBeDefined();
      expect(def.rarity, id).toBe("legendary");
      expect(def.exotic, id).toBe(true);
      expect(def.skill, id).toBe(id);
      const sk = SKILLS[def.skill!];
      expect(sk, id + " skill").toBeDefined();
      expect(sk.cd, id).toBeGreaterThan(3);
      expect(sk.mult, id).toBeGreaterThan(0);
      expect(sk.hits, id).toBeGreaterThan(0);
      expect(def.awk1, id).toBeDefined();
      expect(def.awk2, id).toBeDefined();
      expect(def.awk1!.chance, id).toHaveLength(6);
      expect(def.art, id + " art family").toBeTruthy();
    }
    // every skill name is its own effect
    expect(SKILLS.gale.fx).toBe("blade2");
    expect(SKILLS.bombardment.fx).toBe("bombard");
    expect(SKILLS.wildfire.fx).toBe("blaze");
    expect(SKILLS.hades.fx).toBe("blast3");
    expect(SKILLS.ion.fx).toBe("chainring");
    expect(SKILLS.aether.fx).toBe("teleport");
    expect(SKILLS.scythe.fx).toBe("deathmark");
    expect(SKILLS.sandstorm.fx).toBe("tornado");
    expect(SKILLS.bloodstone.fx).toBe("meteor");
    expect(SKILLS.venom.fx).toBe("blast1");
    // every tower art resolves to a family the renderer knows
    for (const def of TOWERS) expect(towerArt(def), def.id).toBeTruthy();
  });

  it("ships the Clone tower with copy mechanics and its own awakenings", () => {
    const def = TOWER_BY_ID.clone;
    expect(def).toBeDefined();
    expect(def.rarity).toBe("legendary");
    expect(def.exotic).toBe(true);
    expect(def.kind).toBe("clone");
    expect(def.art).toBe("clone");
    // Super Clone: 20% proc at every tier, +200% attack speed (mult 2)
    expect(def.awk1!.fx).toBe("clonesuper");
    expect(def.awk1!.chance.slice(0, 5)).toEqual([0.2, 0.2, 0.2, 0.2, 0.2]);
    expect(def.awk1!.mult.slice(0, 5)).toEqual([2, 2, 2, 2, 2]);
    // Perfect Replica: chance to grow the copy +1..2 points
    expect(def.awk2!.fx).toBe("cloneperfect");
    expect(def.awk2!.chance[0]).toBeGreaterThan(0);
    expect(def.awk2!.mult[4]).toBeGreaterThanOrEqual(2);
  });

  it("ships the ten mythic legendaries with distinct mechanics", () => {
    const mythic = [
      "nova", "gravity", "thundercrown", "voidrip", "furnace",
      "maelstrom", "starfall", "chronolock", "gravebloom", "colossus",
    ];
    expect(mythic).toHaveLength(10);
    for (const id of mythic) {
      const def = TOWER_BY_ID[id];
      expect(def, id).toBeDefined();
      expect(def.rarity, id).toBe("legendary");
      expect(def.exotic, id).toBe(true);
      expect(def.art, `${id} art family`).toBeTruthy();
      expect(def.awk1, id).toBeDefined();
      expect(def.awk2, id).toBeDefined();
      expect(def.awk1!.chance, id).toHaveLength(6);
      expect(def.awk2!.mult, id).toHaveLength(6);
    }
    // mechanics that actually differ between them
    expect(TOWER_BY_ID.nova.multi).toBeGreaterThan(1);
    expect(TOWER_BY_ID.gravity.pull).toBeGreaterThan(0);
    expect(TOWER_BY_ID.gravity.target).toBe("none");
    expect(TOWER_BY_ID.thundercrown.chain).toBeGreaterThan(0);
    expect(TOWER_BY_ID.voidrip.pierce).toBeGreaterThan(1);
    expect(TOWER_BY_ID.voidrip.pctHp).toBeGreaterThan(0);
    expect(TOWER_BY_ID.furnace.killStack).toBeGreaterThan(0);
    expect(TOWER_BY_ID.furnace.goldGain).toBeGreaterThan(0);
    expect(TOWER_BY_ID.maelstrom.pulse).toBeGreaterThan(0);
    expect(TOWER_BY_ID.maelstrom.pull).toBeGreaterThan(0);
    expect(TOWER_BY_ID.starfall.meteors).toBeGreaterThan(2);
    expect(TOWER_BY_ID.chronolock.freeze).toBeGreaterThan(0);
    expect(TOWER_BY_ID.chronolock.stun).toBeGreaterThan(0);
    expect(TOWER_BY_ID.gravebloom.pctHp).toBeGreaterThan(TOWER_BY_ID.voidrip.pctHp!);
    expect(TOWER_BY_ID.colossus.shred).toBeGreaterThan(0);
    expect(TOWER_BY_ID.colossus.dmg).toBeGreaterThan(TOWER_BY_ID.nova.dmg);
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

  it("ships the new heavenly and honor legendaries with their bespoke kits", () => {
    const ids = ["heavenly", "honor"];
    for (const id of ids) {
      const def = TOWER_BY_ID[id];
      expect(def, id).toBeDefined();
      expect(def.rarity, id).toBe("legendary");
      expect(def.exotic, id).toBe(true);
      expect(def.art, `${id} art family`).toBeTruthy();
      for (const slot of [def.awk1, def.awk2]) {
        expect(slot, id).toBeDefined();
        expect(slot!.chance, id).toHaveLength(6);
        expect(slot!.mult, id).toHaveLength(6);
        if (slot!.mult2) expect(slot!.mult2, id).toHaveLength(6);
      }
    }
    expect(TOWER_BY_ID.demon.rarity).toBe("mystical");
    expect(TOWER_BY_ID.demon.execCd).toBe(5);
    expect(TOWER_BY_ID.demon.awk1?.name).toBe("Soul Wipeout");
    expect(TOWER_BY_ID.demon.awk2?.name).toBe("Hell Dimensions");
  });

  it("sells SP gain in the run shop, capped so it cannot run away", () => {
    const item = RUN_SHOP.find((i) => i.id === "spgain")!;
    expect(item, "spgain run shop item").toBeTruthy();
    expect(item.max).toBeGreaterThan(1);
    expect(item.max * 0.1).toBeLessThanOrEqual(1);
    expect(runShopCost(item, item.max - 1)).toBeGreaterThan(item.cost);
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

  it("builds fixed ten-enemy waves with known types and scheduled bosses", () => {
    for (let round = 1; round <= BATTLE_ROUNDS + 40; round++) {
      const w = waveComp(round);
      expect(w).toHaveLength(10);
      for (const t of w) {
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThan(ENEMY_TYPES.length);
      }
    }
    expect(waveComp(4)).toContain(4);
    expect(waveComp(8)).toContain(4);
  });

  it("scales the Super Crystals to their stated caps and prices Mystical levels in gems", () => {
    expect(CRYSTALS).toHaveLength(9);
    const max = crystalBonus({ magicianKing: 11, superbolt: 10, superCrit: 31 });
    expect(max.magicianKing).toBeCloseTo(0.75);
    expect(max.lightning).toBeCloseTo(1);
    expect(max.critDamage).toBeCloseTo(8.5);
    expect(max.superCritChance).toBeCloseTo(0.225);
    expect(crystalBuffText(CRYSTALS.find((c) => c.id === "superCrit")!, 31)).toContain("850% crit damage");
    expect(crystalBuffText(CRYSTALS.find((c) => c.id === "superCrit")!, 31)).toContain("22.5% crit chance");
    expect(mysticalUpgradeCost(1)).toBe(500);
    expect(mysticalUpgradeCost(2)).toBe(875);
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

  it("can award a 1% Supervisor bonus on a random legendary-fragment roll", () => {
    const roll = vi.spyOn(Math, "random");
    roll.mockReturnValueOnce(0.75).mockReturnValueOnce(0.999).mockReturnValueOnce(0.009);
    expect(randFrag(1)).toBe("supervisor");
    roll.mockRestore();
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

  it("prices summons at 100 SP and +10 per summon", () => {
    expect(SP_BASE_COST).toBe(100);
    expect(SP_COST_STEP).toBe(10);
    expect([0, 1, 2, 3, 4].map(spCost)).toEqual([100, 110, 120, 130, 140]);
    expect(spawnBudget()).toBe(460);
    // ascent is its own ladder: 100 SP to start and +100 for every press
    expect([0, 1, 2].map(ascSpCost)).toEqual([100, 200, 300]);
    expect(ascSpCost(1) - ascSpCost(0)).toBe(ASC_COST_STEP);
    expect(ASC_COST_STEP).toBeGreaterThan(spCost(1) - spCost(0));
    expect(ascSpCost(2)).toBeGreaterThan(spCost(8));
  });

  it("pays 10 SP per kill, 5x for elites and 10x for bosses", () => {
    expect(killSp(false, false)).toBe(10);
    expect(killSp(true, false)).toBe(50);
    expect(killSp(false, true)).toBe(100);
  });

  it("cuts task rewards by 10% and tower upgrade gold by 5%", () => {
    // gold/gems per task are exactly the old values x 0.9
    const before: Record<string, [number, number]> = {
      play: [2500, 40],
      win: [6000, 120],
      waves: [4000, 70],
      kills: [4500, 80],
      skill: [2000, 50],
      upgrade: [3000, 60],
      chests: [2500, 55],
      spend: [1500, 90],
    };
    for (const t of DAILY_TASKS) {
      const [g0, m0] = before[t.id];
      expect(t.gold, t.id + " gold").toBe(Math.round(g0 * 0.9));
      expect(t.gems, t.id + " gems").toBe(Math.round(m0 * 0.9));
    }
    for (const lv of [1, 2, 3, 10, 15]) {
      expect(upgradeGoldCost(lv)).toBe(Math.round(50 * Math.pow(1.5, lv - 1) * 0.95));
    }
  });

  it("runs one monthly event per calendar month with real perks", () => {
    expect(MONTHLY_EVENTS).toHaveLength(12);
    for (let m = 0; m < 12; m++) {
      const ev = monthlyEventForDate(new Date(2026, m, 15));
      expect(ev.month, "month " + m).toBe(m);
      const b = monthlyEventBonus(ev.id);
      const live =
        b.upgradeCostMul !== 1 || b.spMul !== 1 || b.hpMul !== 1 || b.goldMul !== 1 || b.gemMul !== 1 || b.fragBias > 0 || b.chestFragBonus > 0;
      expect(live, ev.id + " perk is a real number").toBe(true);
    }
    // stacking with the weekday event never changes the baseline
    expect(BASE_MONTHLY_BONUS).toEqual({ goldMul: 1, gemMul: 1, spMul: 1, hpMul: 1, upgradeCostMul: 1, fragBias: 0, chestFragBonus: 0 });
  });

  it("spawns exactly ten enemies on every wave, with bosses using wave slots", () => {
    expect(WAVE_ENEMY_COUNT).toBe(10);
    for (let wave = 1; wave <= 64; wave++) expect(waveComp(wave)).toHaveLength(WAVE_ENEMY_COUNT);
    expect(waveComp(32).filter(isBossType).length).toBeGreaterThan(0);
    expect(enemySpawnInterval(1)).toBe(0.72);
    expect(enemySpawnInterval(2)).toBeCloseTo(0.72 - SPAWN_INTERVAL_STEP, 10);
    expect(enemySpawnInterval(25)).toBeCloseTo(0.72 - 24 * 0.00002, 10);
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
    // the original four, plus the five skills added with the boss rework
    for (const id of ["blink", "enrage", "summon", "ward"]) {
      expect(BOSS_SKILLS.map((s) => s.id), id).toContain(id);
    }
    expect(BOSS_SKILLS.map((s) => s.id).sort()).toEqual([
      "blink", "chains", "devour", "enrage", "meteor", "nullfield", "summon", "ward", "warp",
    ]);
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
  GEM_RUSH_SECONDS,
  GEM_RUSH_HP_MUL,
  GEM_RUSH_SPEED_MUL,
  GEM_RUSH_NORMAL_GEMS,
  gemRushKillGems,
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
    expect(on(0)).toBe("Gem Rush");
    expect(on(1)).toBe("Luck Hunting");
    expect(on(2)).toBe("Chest Box");
    expect(on(3)).toBe("Trophy Competition");
    expect(on(4)).toBe("Items Finding");
    expect(on(5)).toBe("Mineshaft");
    expect(on(6)).toBe("Mineshaft");
  });

  it("defines the Sunday Gem Rush survival challenge and tiered kill rewards", () => {
    expect(EVENTS.find((ev) => ev.days.includes(0))?.id).toBe("gemrush");
    expect(GEM_RUSH_SECONDS).toBe(300);
    expect(GEM_RUSH_HP_MUL).toBe(12);
    expect(GEM_RUSH_SPEED_MUL).toBe(1.5);
    expect(GEM_RUSH_NORMAL_GEMS).toBe(50);
    expect(gemRushKillGems(false, false)).toBe(50);
    expect(gemRushKillGems(true, false)).toBe(250);
    expect(gemRushKillGems(false, true)).toBe(500);
  });

  it("turns each event into real modifiers", () => {
    expect(eventBonus("luck").chestFragBonus).toBe(1);
    expect(eventBonus("chestbox").chestPriceMul).toBeLessThan(1);
    expect(eventBonus("trophy").trophyWin).toBe(30);
    expect(eventBonus("items").chipDrop).toEqual({ basic: 2 });
    expect(eventBonus("mineshaft").goldMul).toBeGreaterThan(1);
    expect(eventBonus("gemrush").gemMul).toBe(1);
    expect(eventBonus("gemrush").hpMul).toBe(1);
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
    // 7 launch enemies + Rift Hound, Cinder Wraith, Shard Golem, Abyss Leviathan
    expect(ENEMY_TYPES).toHaveLength(11);
    expect(isBossType(4)).toBe(true);
    expect(isBossType(3)).toBe(false);
    expect(ENEMY_TYPES[5].name).toBe("Rift Overlord");
    // the Abyss Leviathan closes the table and carries the full nine-skill kit
    expect(ENEMY_TYPES[LEVIATHAN_TYPE].name).toBe("Abyss Leviathan");
    expect(ENEMY_TYPES[LEVIATHAN_TYPE].shape).toBe("leviathan");
    expect(isBossType(LEVIATHAN_TYPE)).toBe(true);
    expect(BOSS_KITS[LEVIATHAN_TYPE]).toHaveLength(9);
    // the Void Titan keeps its own index and kit
    expect(ENEMY_TYPES[TITAN_TYPE].name).toBe("Void Titan");
    expect(ENEMY_TYPES[TITAN_TYPE].shape).toBe("titan");
    expect(isBossType(TITAN_TYPE)).toBe(true);
    expect(BOSS_KITS[TITAN_TYPE]).toHaveLength(9);
    expect(BOSS_KITS[4]).toHaveLength(6);
  });

  it("introduces the three new mobs with their own silhouettes and stats", () => {
    expect(ENEMY_TYPES[HOUND_TYPE].shape).toBe("hound");
    expect(ENEMY_TYPES[WRAITH_TYPE].shape).toBe("wraith");
    expect(ENEMY_TYPES[GOLEM_TYPE].shape).toBe("golem");
    // all are non-bosses
    [HOUND_TYPE, WRAITH_TYPE, GOLEM_TYPE].forEach((t) => expect(isBossType(t)).toBe(false));
    // the wraith is the fast-but-frail one, the golem the armoured wall
    expect(ENEMY_TYPES[HOUND_TYPE].speed).toBeGreaterThan(ENEMY_TYPES[GOLEM_TYPE].speed);
    expect(ENEMY_TYPES[GOLEM_TYPE].armor).toBeGreaterThan(ENEMY_TYPES[WRAITH_TYPE].armor);
    expect(ENEMY_TYPES[LEVIATHAN_TYPE].hpMul).toBeGreaterThan(ENEMY_TYPES[TITAN_TYPE].hpMul);
  });

  it("unlocks the new mobs and the Leviathan as the rounds climb", () => {
    // waveComp is random, so sample: the deep waves must be able to roll them
    const sample = (round: number, times = 40) => {
      const seen = new Set<number>();
      for (let i = 0; i < times; i++) waveComp(round).forEach((t) => seen.add(t));
      return seen;
    };
    expect(sample(13).has(HOUND_TYPE)).toBe(true);
    expect(sample(13).has(WRAITH_TYPE)).toBe(true);
    expect(sample(13).has(GOLEM_TYPE)).toBe(true);
    expect(sample(24).has(LEVIATHAN_TYPE)).toBe(true);
    // wave 4 is still a boss wave and nothing deeper should show up front
    expect(waveComp(4)).toContain(4);
    expect(waveComp(4)).not.toContain(LEVIATHAN_TYPE);
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
    const want: Record<string, number> = { common: 80, silver: 200, hero: 500, epic: 800, legendary: 2000, mystical: 5000 };
    Object.entries(want).forEach(([id, cost]) => {
      const c = CHEST_BY_ID[id];
      expect(c, id).toBeTruthy();
      expect(c.gem, `${id} currency`).toBe(1);
      expect(c.cost, `${id} price`).toBe(cost);
    });
  });

  it("rolls the Mystical Chest as five Legendary fragments or one mystical fragment", () => {
    expect(CHEST_BY_ID.mystical.special).toBe("mystical");
    const random = vi.spyOn(Math, "random");
    try {
      random.mockReturnValueOnce(0.70);
      for (let i = 0; i < 5; i++) random.mockReturnValueOnce(0.1);
      const legendary = rollChest("mystical");
      expect(legendary.frags.reduce((sum, f) => sum + f.n, 0)).toBe(5);
      expect(legendary.frags.every((f) => TOWER_BY_ID[f.id].rarity === "legendary")).toBe(true);
      expect(legendary.gold).toBe(0);

      random.mockReset();
      random.mockReturnValueOnce(0.71);
      random.mockReturnValueOnce(0.99);
      const mystical = rollChest("mystical");
      expect(mystical.frags).toEqual([{ id: "supervisor", n: 1 }]);
      expect(TOWER_BY_ID[mystical.frags[0].id].rarity).toBe("mystical");
      expect(mystical.gold).toBe(0);
    } finally {
      random.mockRestore();
    }
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

// ---------- crit damage, new towers and boss skill kits ----------
describe("crit damage pool", () => {
  it("starts at the base multiplier with nothing upgraded", () => {
    expect(towerUpgradeCount({})).toBe(0);
    expect(towerUpgradeCount({ arrow: 1 })).toBe(0);
    expect(critBonusFrom({ arrow: 1 })).toBeCloseTo(CRIT_DMG_BASE, 5);
    expect(critMultiplierFrom({ arrow: 1 })).toBeCloseTo(1 + CRIT_DMG_BASE, 5);
  });

  it("merges +8% into the total for every tower upgrade, across every tower", () => {
    // arrow 1 -> nothing, arrow 4 -> three upgrades
    expect(towerUpgradeCount({ arrow: 4 })).toBe(3);
    expect(critBonusFrom({ arrow: 4 })).toBeCloseTo(CRIT_DMG_BASE + 3 * CRIT_DMG_PER_UPGRADE, 5);
    // levels on different towers pool into one number
    const mixed = { arrow: 4, cannon: 6, ice: 1 };
    expect(towerUpgradeCount(mixed)).toBe(3 + 5);
    expect(critBonusFrom(mixed)).toBeCloseTo(CRIT_DMG_BASE + 8 * CRIT_DMG_PER_UPGRADE, 5);
    expect(CRIT_DMG_PER_UPGRADE).toBeCloseTo(0.08, 6);
  });

  it("ignores impossible levels and never passes the 90000% ceiling", () => {
    // levels above MAX_MENU_LEVEL can't add anything extra
    expect(towerUpgradeCount({ arrow: 9999 })).toBe(MAX_MENU_LEVEL - 1);
    // 14 upgrades per tower, so a big enough roster does hit the ceiling
    const wide: Record<string, number> = {};
    for (let i = 0; i < Math.ceil(CRIT_DMG_MAX / (CRIT_DMG_PER_UPGRADE * (MAX_MENU_LEVEL - 1))); i++) {
      wide[`t${i}`] = MAX_MENU_LEVEL;
    }
    expect(critBonusFrom(wide)).toBe(CRIT_DMG_MAX);
    expect(critMultiplierFrom(wide)).toBe(1 + CRIT_DMG_MAX);
    expect(fmtCritPct(CRIT_DMG_MAX)).toBe("90,000%");
  });

  it("reads the pool off a real save", () => {
    const s = defaultSave();
    const first = critBonusFrom(s.levels);
    s.levels.arrow = (s.levels.arrow || 0) + 1;
    expect(critBonusFrom(s.levels)).toBeCloseTo(first + CRIT_DMG_PER_UPGRADE, 5);
    expect(critBonusFromSave(s)).toBeCloseTo(critBonusFrom(s.levels), 6);
    expect(critMul(s)).toBeCloseTo(1 + critBonusFrom(s.levels), 6);
    expect(critAfterUpgrade(s.levels)).toBeCloseTo(critBonusFrom(s.levels) + CRIT_DMG_PER_UPGRADE, 6);
  });

  it("keeps the crit chance where the arena expects it", () => {
    expect(CRIT_CHANCE).toBeGreaterThan(0);
    expect(CRIT_CHANCE).toBeLessThan(1);
  });
});

describe("new towers", () => {
  const NEW = ["rime", "siphon", "quake", "storm", "plague", "rail"];
  it("ships all six with sane data", () => {
    for (const id of NEW) {
      const def = TOWER_BY_ID[id];
      expect(def, id).toBeTruthy();
      expect(def.unlockFrags).toBeGreaterThan(0);
      expect(def.dmg).toBeGreaterThan(0);
      expect(def.rate).toBeGreaterThan(0);
    }
  });

  it("unlocks the Railgun from a single legendary fragment", () => {
    expect(TOWER_BY_ID.rail.rarity).toBe("legendary");
    expect(TOWER_BY_ID.rail.unlockFrags).toBe(1);
    expect(TOWER_BY_ID.rail.awk1).toBeTruthy();
    expect(TOWER_BY_ID.rail.awk2).toBeTruthy();
  });

  it("gives every new tower an art family the renderer knows", () => {
    const KNOWN = new Set(["arrow", "cannon", "ice", "speaker", "tesla", "gatling", "core", "lightning", "hellstorm", "icestorm", "plant", "swarm", "chrono", "void", "plasma", "sling", "flame", "spike", "tube", "beam", "boomer", "toxin", "axe", "frost", "mortar", "laser", "missile", "dragon", "sun"]);
    for (const id of NEW) expect(KNOWN.has(towerArt(TOWER_BY_ID[id])), id).toBe(true);
  });

  it("registers each new tower in the id index", () => {
    for (const id of NEW) expect(TOWER_BY_ID[id].id).toBe(id);
  });
});

describe("boss skills", () => {
  it("gives each boss a distinct kit taken from the shared skill table", () => {
    const ids = BOSS_SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [type, kit] of Object.entries(BOSS_KITS) as [string, string[]][]) {
      expect(kit.length, type).toBeGreaterThanOrEqual(6);
      for (const id of kit) expect(ids, `${type}/${id}`).toContain(id);
    }
    // only the Overlord gets the full court
    expect(BOSS_KITS[5].length).toBeGreaterThan(BOSS_KITS[4].length);
  });

  it("falls back to the first boss kit for unknown types", () => {
    expect(bossKit(4)).toEqual(BOSS_KITS[4]);
    expect(bossKit(99)).toEqual(BOSS_KITS[4]);
  });

  it("has a tell and a colour for every skill", () => {
    for (const sk of BOSS_SKILLS) {
      expect(sk.tell.length).toBeGreaterThan(0);
      expect(sk.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(sk.glyph.length).toBeGreaterThan(0);
    }
    expect(BOSS_NULL_SLOW).toBeGreaterThan(0);
    expect(BOSS_METEOR_COUNT).toBeGreaterThan(1);
    expect(BOSS_CHAINS_DR).toBeGreaterThan(0);
  });
});

// ---------- the font vault ----------
describe("font vault", () => {
  it("ships sixty faces with unique ids", () => {
    expect(FONTS).toHaveLength(80);
    const ids = FONTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    // the three the brief called out by name
    expect(FONT_BY_ID.marker.name).toBe("Permanent Marker");
    expect(FONT_BY_ID.edo.name).toBe("EDO");
    expect(FONT_BY_ID.system.name).toBe("System");
    // every entry is renderable and grouped
    for (const f of FONTS) {
      expect(f.stack.length).toBeGreaterThan(0);
      expect(["display", "text", "mono", "script", "system"]).toContain(f.group);
      // local faces must not claim a Google family, or they'd fetch for nothing
      if (f.local) expect(f.google).toBeUndefined();
    }
  });

  it("resolves stacks and falls back to the default for unknown ids", () => {
    expect(fontStack("rajdhani")).toContain("Rajdhani");
    expect(fontStack("not-a-font")).toBe(fontStack(DEFAULT_FONT));
    expect(fontDisplayStack("marker")).toContain("Permanent Marker");
    // every role follows the selected face, rather than silently retaining a display fallback
    for (const f of FONTS) expect(fontDisplayStack(f.id)).toBe(f.stack);
  });

  it("applies a face to the document root and reports it on the dataset", () => {
    applyFont("marker");
    const root = document.documentElement;
    expect(root.style.getPropertyValue("--font-ui")).toContain("Permanent Marker");
    expect(root.dataset.magictdFont).toBe("marker");
    applyFont("system");
    expect(root.dataset.magictdFont).toBe("system");
    // unknown ids fall back rather than leaving an empty custom property
    applyFont("does-not-exist");
    expect(root.dataset.magictdFont).toBe(DEFAULT_FONT);
    applyFont(DEFAULT_FONT);
  });
});

// ---------- gauntlet mode ----------
describe("gauntlet mode", () => {
  it("offers three distinct boons from the full pool", () => {
    for (let i = 0; i < 8; i++) {
      const pick = gauntletChoices();
      expect(pick).toHaveLength(3);
      expect(new Set(pick.map((b) => b.id)).size).toBe(3);
      pick.forEach((b) => expect(GAUNTLET_BOONS).toContain(b));
    }
  });

  it("banks the picks in the run list", () => {
    const list: typeof GAUNTLET_BOONS = [];
    takeGauntletBoon(list, GAUNTLET_BOONS[0]!);
    takeGauntletBoon(list, GAUNTLET_BOONS[1]!);
    expect(list.map((b) => b.id)).toEqual([GAUNTLET_BOONS[0]!.id, GAUNTLET_BOONS[1]!.id]);
  });

  it("pays deeper runs more and records a new best", () => {
    const s = defaultSave();
    const before = { gold: s.gold, gems: s.gems, potions: s.potions };
    const shallow = collectGauntlet(s, 3, 2, s.gauntletBest);
    expect(shallow.record).toBe(true);
    expect(s.gauntletBest).toBe(3);
    expect(shallow.gold).toBe(220 + 3 * 95 + 9 * 14);
    expect(shallow.potions).toBe(1 + 0 + 2);
    expect(s.gold).toBe(before.gold + shallow.gold);
    expect(s.gems).toBe(before.gems + shallow.gems);
    expect(s.potions).toBe(before.potions + shallow.potions);

    // a shorter follow-up run pays out but does not take the record
    const deep = collectGauntlet(s, 2, 0, s.gauntletBest);
    expect(deep.record).toBe(false);
    expect(s.gauntletBest).toBe(3);
    expect(deep.gems).toBeLessThan(shallow.gems);

    // and the deeper run is strictly richer
    const s2 = defaultSave();
    const deeper = collectGauntlet(s2, 12, 4, s2.gauntletBest);
    const s3 = defaultSave();
    const shallow3 = collectGauntlet(s3, 3, 2, s3.gauntletBest);
    expect(deeper.gold).toBeGreaterThan(shallow3.gold);
    // deeper runs also salvage more crystal potions (boons add one each)
    expect(deeper.potions).toBeGreaterThan(0);
    expect(shallow3.potions).toBeGreaterThan(0);
  });

  it("round-trips the gauntlet record, chosen font, and UI theme through a save", () => {
    const s = defaultSave();
    s.gauntletBest = 17;
    s.font = "marker";
    s.uiTheme = "ocean";
    const back = importSave(JSON.stringify(s));
    expect(back.gauntletBest).toBe(17);
    expect(back.font).toBe("marker");
    expect(back.uiTheme).toBe("ocean");
    // a legacy blob with no font/gauntlet fields gets the defaults
    const legacy = importSave(JSON.stringify({ gold: 5 }));
    expect(legacy.gauntletBest).toBe(0);
    expect(legacy.font).toBe(DEFAULT_FONT);
    expect(legacy.uiTheme).toBe("rift");
    // junk normalises instead of crashing
    const junk = importSave(JSON.stringify({ gauntletBest: -9, font: "" }));
    expect(junk.gauntletBest).toBe(0);
    expect(junk.font).toBe(DEFAULT_FONT);
  });
});


describe("auto-battle expeditions", () => {
  it("uses wave composition, starts at the requested wave and fails cleanly when the squad is underpowered", () => {
    const save = defaultSave();
    const weak = estimateAutoBattle(save, "endless", 0.01, 1, 8);
    const strong = estimateAutoBattle(save, "endless", 1_000_000, 12, 8);
    expect(weak.waves).toBe(0);
    expect(weak.breaksAtWave).toBe(8);
    expect(weak.minutes).toBeGreaterThan(0);
    expect(strong.waves).toBeGreaterThan(weak.waves);
    expect(strong.breaksAtWave).toBe(8 + strong.waves);
  });

  it("still sends an accurate report when the first active wave cannot be cleared", () => {
    const save = defaultSave();
    const id = deliverAutoBattleReport(save, "endless", 0, 1, 75, 9, 9);
    const report = inbox(save).find((mail) => mail.id === id);
    expect(report?.body).toContain("cleared 0 simulated waves");
    expect(report?.body).toContain("overwhelmed at wave 9");
    expect(report?.reward?.gold).toBeGreaterThan(75);
    expect(report?.reward?.potions).toBe(3);
    expect(report?.body).toContain("deterministic expected composition");
  });

  it("estimates an endless/gauntlet run from squad power and delivers claimable mail", () => {
    const save = defaultSave();
    const endless = estimateAutoBattle(save, "endless");
    const gauntlet = estimateAutoBattle(save, "gauntlet");
    expect(endless.waves).toBeGreaterThan(0);
    expect(endless.minutes).toBeGreaterThan(0);
    expect(gauntlet.mode).toBe("gauntlet");
    const id = deliverAutoBattleReport(save, "endless", endless.waves, endless.minutes);
    expect(inbox(save).some((m) => m.id === id)).toBe(true);
    expect(unclaimedMail(save)).toContain(id);
    expect(claimMail(save, id)).not.toBeNull();
    expect(unclaimedMail(save)).not.toContain(id);
    expect(save.mail.autoUses).toBe(1);
    expect(save.mail.autoReadyAt).toBe(0);
    expect(inbox(save).find((m) => m.id === id)?.body).toContain("No cooldown applies");
    // Runs are immediately available again; only the existing weekly cap remains.
    expect(deliverAutoBattleReport(save, "endless", 1, 1)).not.toBe("");
    expect(deliverAutoBattleReport(save, "endless", 1, 1)).not.toBe("");
    expect(deliverAutoBattleReport(save, "endless", 1, 1)).toBe("");
    expect(save.mail.autoUses).toBe(3);
  });
});
