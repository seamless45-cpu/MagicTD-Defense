import { ENEMY_HP_SCALE, HP_GROWTH, TOWER_BY_ID, towerDamage, type TowerDef } from "./data";
import type { SaveData } from "./save";

export interface AutoBattlePlan {
  mode: "endless" | "gauntlet";
  waves: number;
  minutes: number;
  squadDps: number;
}

/** Estimate an offline expedition from the unlocked, equipped squad's actual damage curve. */
export function estimateAutoBattle(save: SaveData, mode: AutoBattlePlan["mode"]): AutoBattlePlan {
  const ids = [...new Set(save.lineup)].filter((id) => (save.levels[id] || 0) > 0 && TOWER_BY_ID[id]);
  const roster = ids.length ? ids : ["arrow", "cannon", "ice"];
  let dps = 0;
  for (const id of roster) {
    const def = TOWER_BY_ID[id] as TowerDef;
    const level = Math.max(1, save.levels[id] || 1);
    const awakening = save.awn[id] || [0, 0];
    const awakenBonus = 1 + (awakening[0] || 0) * 0.18 + (awakening[1] || 0) * 0.12;
    const hitsPerSecond = Math.max(0.15, 1 / Math.max(0.08, def.rate));
    // Estimate 2.5 deployed copies per lineup slot; menu upgrades and awakenings
    // feed the same tower damage math used by live combat.
    dps += towerDamage(def, level, 1, 0) * hitsPerSecond * awakenBonus * 2.5;
  }
  dps *= 1 + Math.max(0, save.heroLv[save.hero] || 1) * 0.035;
  let waves = 0;
  let totalSeconds = 0;
  // Model each wave as a health budget against the full squad's sustained DPS.
  // We cap the report at 40 waves to bound rewards and keep estimates readable.
  for (let wave = 1; wave <= 40; wave++) {
    const count = Math.min(46, 8 + wave * 2);
    const avgEnemyMul = wave >= 16 ? 3.2 : wave >= 7 ? 1.8 : 1.25;
    const enemyHp = 46 * Math.pow(HP_GROWTH, wave - 1) * ENEMY_HP_SCALE * avgEnemyMul;
    const bossHp = wave % 4 === 0 ? 46 * Math.pow(HP_GROWTH, wave - 1) * ENEMY_HP_SCALE * 12 : 0;
    const healthBudget = enemyHp * count + bossHp;
    // The live game continually fires while enemies traverse the lane; allow a
    // wave's defense window to grow modestly with the number of deployed towers.
    const clearWindow = 24 + roster.length * 4;
    if (healthBudget > dps * clearWindow) break;
    waves = wave;
    const battleSeconds = Math.min(150, 18 + healthBudget / Math.max(1, dps));
    totalSeconds += battleSeconds;
    if (mode === "gauntlet") totalSeconds += 7; // boon-pick / transition time
  }
  // A basic squad is still allowed a short expedition, but never reports zero.
  waves = Math.max(1, waves);
  if (!totalSeconds) totalSeconds = 24 + roster.length * 4;
  return { mode, waves, minutes: Math.max(1, Math.ceil(totalSeconds / 60)), squadDps: Math.round(dps) };
}
