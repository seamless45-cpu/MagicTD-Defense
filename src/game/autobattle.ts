import { BOSS_HP_MUL, ENEMY_HP_SCALE, HP_GROWTH, TOWER_BY_ID, towerDamage, type TowerDef } from "./data";
import type { SaveData } from "./save";

export interface AutoBattlePlan {
  mode: "endless" | "gauntlet";
  /** waves successfully simulated from the player's current wave onward */
  waves: number;
  /** wave on which the model predicts the squad will fall */
  breaksAtWave: number;
  minutes: number;
  squadDps: number;
}

/**
 * Simulate future wave health budgets against the live deployed squad's DPS.
 * If no towers have been deployed yet, estimate the squad from its actual
 * unlocked lineup and hero rather than reporting a fabricated one-wave run.
 */
export function estimateAutoBattle(
  save: SaveData,
  mode: AutoBattlePlan["mode"],
  liveSquadDps?: number,
  deployedCount?: number,
  currentWave = 1
): AutoBattlePlan {
  const ids = [...new Set(save.lineup)].filter((id) => (save.levels[id] || 0) > 0 && TOWER_BY_ID[id]);
  const roster = ids.length ? ids : ["arrow", "cannon", "ice"];
  let lineupDps = 0;
  for (const id of roster) {
    const def = TOWER_BY_ID[id] as TowerDef;
    const level = Math.max(1, save.levels[id] || 1);
    const awakening = save.awn[id] || [0, 0];
    const awakenBonus = 1 + (awakening[0] || 0) * 0.18 + (awakening[1] || 0) * 0.12;
    const hitsPerSecond = Math.max(0.15, 1 / Math.max(0.08, def.rate));
    // The lineup estimate represents two deployed copies per selected tower.
    lineupDps += towerDamage(def, level, 1, 0) * hitsPerSecond * awakenBonus * 2;
  }
  lineupDps *= 1 + Math.max(0, (save.heroLv[save.hero] || 1) - 1) * 0.035;
  const dps = Number.isFinite(liveSquadDps) && (liveSquadDps || 0) > 0 ? liveSquadDps as number : lineupDps;
  const towerCount = Math.max(1, deployedCount || roster.length * 2);
  const startWave = Math.max(1, Math.floor(currentWave));
  let waves = 0;
  let totalSeconds = 0;
  let breaksAtWave = startWave;

  // Each wave advances only when its full HP budget can be removed during the
  // lane's defense window. Boss waves use their dedicated boss HP multiplier.
  for (let wave = startWave; wave < startWave + 100; wave++) {
    const count = Math.min(46, 8 + wave * 2);
    const avgEnemyMul = wave >= 16 ? 3.2 : wave >= 7 ? 1.8 : 1.25;
    const base = 46 * Math.pow(HP_GROWTH, wave - 1);
    const enemyHp = base * ENEMY_HP_SCALE * avgEnemyMul;
    const bossHp = wave % 4 === 0 ? base * BOSS_HP_MUL * 12 : 0;
    const healthBudget = enemyHp * count + bossHp;
    const clearWindow = 24 + towerCount * 4;
    breaksAtWave = wave;
    if (healthBudget > dps * clearWindow) break;
    waves++;
    totalSeconds += Math.min(150, 18 + healthBudget / Math.max(1, dps));
    if (mode === "gauntlet") totalSeconds += 7;
  }
  if (!totalSeconds) totalSeconds = 24 + towerCount * 4;
  return {
    mode,
    waves,
    breaksAtWave,
    minutes: Math.max(1, Math.ceil(totalSeconds / 60)),
    squadDps: Math.round(dps),
  };
}
