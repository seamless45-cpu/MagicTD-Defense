import {
  BOSS_HP_MUL,
  ENEMY_HP_SCALE,
  ELITE_HP_MUL,
  eventBonus,
  eventForDate,
  ENEMY_TYPES,
  GOLEM_TYPE,
  HOUND_TYPE,
  HP_GROWTH,
  WAVE_ENEMY_COUNT,
  enemySpawnInterval,
  LEVIATHAN_TYPE,
  WRAITH_TYPE,
  TOWER_BY_ID,
  towerDamage,
  monthlyEventBonus,
  monthlyEventForDate,
  type TowerDef,
} from "./data";
import type { SaveData } from "./save";

const RUN_HP_MULTIPLIER =
  eventBonus(eventForDate().id).hpMul * monthlyEventBonus(monthlyEventForDate().id).hpMul;

export interface AutoBattlePlan {
  mode: "endless" | "gauntlet";
  /** waves successfully simulated from the player's current wave onward */
  waves: number;
  /** first wave the model predicts the squad cannot clear */
  breaksAtWave: number;
  minutes: number;
  squadDps: number;
}

/** Expected health multiplier of the normal enemies selected by waveComp(). */
function averageNormalHpMultiplier(wave: number): number {
  let boundary = 0;
  let weighted = 0;
  const addBand = (limit: number, type: number) => {
    if (limit <= boundary) return;
    weighted += (limit - boundary) * (ENEMY_TYPES[type]?.hpMul || 1);
    boundary = limit;
  };

  // Keep the same ordered probability bands as waveComp, including the later
  // special enemy types. Using expected composition avoids random estimates.
  if (wave >= 7) addBand(0.16, 3);
  if (wave >= 5) addBand(0.3, 2);
  if (wave >= 3) addBand(0.54, 1);
  if (wave >= 13) addBand(0.64, GOLEM_TYPE);
  if (wave >= 11) addBand(0.76, WRAITH_TYPE);
  if (wave >= 9) addBand(0.9, HOUND_TYPE);
  weighted += (1 - boundary) * (ENEMY_TYPES[0]?.hpMul || 1);
  return weighted;
}

function averageNormalTravelSeconds(wave: number): number {
  let boundary = 0;
  let weightedTravel = 0;
  const addBand = (limit: number, type: number) => {
    if (limit <= boundary) return;
    const p = limit - boundary;
    const speed = Math.max(1, ENEMY_TYPES[type]?.speed || 55) * (1 + wave * 0.012);
    weightedTravel += p * (1206 / speed);
    boundary = limit;
  };
  if (wave >= 7) addBand(0.16, 3);
  if (wave >= 5) addBand(0.3, 2);
  if (wave >= 3) addBand(0.54, 1);
  if (wave >= 13) addBand(0.64, GOLEM_TYPE);
  if (wave >= 11) addBand(0.76, WRAITH_TYPE);
  if (wave >= 9) addBand(0.9, HOUND_TYPE);
  weightedTravel += (1 - boundary) * (1206 / (Math.max(1, ENEMY_TYPES[0]?.speed || 55) * (1 + wave * 0.012)));
  const eliteChance = Math.min(0.35, 0.06 + wave * 0.015);
  return weightedTravel / (1 + eliteChance * 0.08);
}

function bossTypesForWave(wave: number): number[] {
  if (wave % 4 !== 0) return [];
  const bosses = [wave >= 32 ? 6 : wave >= 16 ? 5 : 4];
  if (wave >= 16) bosses.push(wave >= 32 ? 5 : 4);
  if (wave >= 32 && wave % 8 === 0) bosses.push(6);
  if (wave >= 20 && wave % 8 === 0) bosses.push(LEVIATHAN_TYPE);
  return bosses;
}

function waveHealthBudget(wave: number): number {
  const bosses = bossTypesForWave(wave);
  const count = Math.max(0, WAVE_ENEMY_COUNT - bosses.length);
  const eliteChance = Math.min(0.35, 0.06 + wave * 0.015);
  const averageEliteMultiplier = 1 + eliteChance * (ELITE_HP_MUL - 1);
  const normalHp =
    46 * Math.pow(HP_GROWTH, wave - 1) *
    ENEMY_HP_SCALE *
    RUN_HP_MULTIPLIER *
    averageNormalHpMultiplier(wave) *
    averageEliteMultiplier;
  const bossHp = bosses.reduce(
    (sum, type) => sum + 46 * Math.pow(HP_GROWTH, wave - 1) * BOSS_HP_MUL * RUN_HP_MULTIPLIER * (ENEMY_TYPES[type]?.hpMul || 1),
    0,
  );
  return normalHp * count + bossHp;
}

/**
 * Simulate future waves using the actual enemy mix and wave growth rules. If
 * the live run has towers deployed, their current DPS is used; otherwise build
 * a conservative estimate from the unlocked lineup. The estimator always
 * reports the first wave predicted to fail, even when no wave can be cleared.
 */
export function estimateAutoBattle(
  save: SaveData,
  mode: AutoBattlePlan["mode"],
  liveSquadDps?: number,
  _deployedCount?: number,
  currentWave = 1,
  boonsAlready = 0,
): AutoBattlePlan {
  const ids = [...new Set(save.lineup)].filter((id) => (save.levels[id] || 0) > 0 && TOWER_BY_ID[id]);
  const roster = ids.length ? ids : ["arrow", "cannon", "ice"];
  let lineupDps = 0;
  for (const id of roster) {
    const def = TOWER_BY_ID[id] as TowerDef;
    const level = Math.max(1, save.levels[id] || 1);
    const awakening = save.awn[id] || [0, 0];
    const awakenBonus = 1 + (awakening[0] || 0) * 0.18 + (awakening[1] || 0) * 0.12;
    const aspd = (def.aspd || 0) + (def.upAspd || 0) * (level - 1);
    const effectiveRate = Math.max(0.08, def.rate / (1 + aspd));
    const hitsPerSecond = 1 / effectiveRate;
    const targetFactor = def.target === "all" ? WAVE_ENEMY_COUNT : 1;
    const chainFactor = def.chain ? Math.min(2.5, 1 + def.chain * 0.22) : 1;
    const splashFactor = def.splash ? Math.min(1.6, 1 + def.splash / 180) : 1;
    // Two deployed copies per selected tower is the fallback lineup assumption.
    lineupDps += towerDamage(def, level, 1, 0) * hitsPerSecond * awakenBonus * targetFactor * chainFactor * splashFactor * 2;
  }
  lineupDps *= 1 + Math.max(0, (save.heroLv[save.hero] || 1) - 1) * 0.035;
  const dps = Number.isFinite(liveSquadDps) && (liveSquadDps || 0) > 0 ? liveSquadDps as number : lineupDps;
  const startWave = Math.max(1, Math.floor(Number.isFinite(currentWave) ? currentWave : 1));
  let waves = 0;
  let totalSeconds = 0;
  let breaksAtWave = startWave;

  // Include the longer exposure of staggered spawns and the time enemies spend
  // walking the lane. The previous count*4 window inflated survivability by
  // several times on large waves, so it incorrectly predicted very deep runs.
  for (let wave = startWave; wave < startWave + 500; wave++) {
    const bosses = bossTypesForWave(wave);
    const normalCount = Math.max(0, WAVE_ENEMY_COUNT - bosses.length);
    const spawnSpan = (WAVE_ENEMY_COUNT - 1) * enemySpawnInterval(wave);
    const normalTravel = averageNormalTravelSeconds(wave);
    const travelBudget = (
      normalCount * normalTravel +
      bosses.reduce((sum, type) => sum + 1206 / Math.max(1, (ENEMY_TYPES[type]?.speed || 28) * (1 + wave * 0.012)), 0)
    ) / WAVE_ENEMY_COUNT;
    const effectiveFightWindow = spawnSpan * 0.5 + travelBudget;
    const healthBudget = waveHealthBudget(wave);
    const effectiveDps = mode === "gauntlet" ? dps * (1 + Math.max(0, boonsAlready + waves) * 0.05) : dps;
    breaksAtWave = wave;
    if (healthBudget > effectiveDps * effectiveFightWindow) break;
    waves++;
    totalSeconds += Math.min(150, spawnSpan + healthBudget / Math.max(1, effectiveDps));
    if (mode === "gauntlet") totalSeconds += 7;
  }
  if (!totalSeconds) {
    const bosses = bossTypesForWave(startWave);
    const normalCount = Math.max(0, WAVE_ENEMY_COUNT - bosses.length);
    const travel = (normalCount * averageNormalTravelSeconds(startWave) + bosses.reduce((sum, type) => sum + 1206 / Math.max(1, ENEMY_TYPES[type]?.speed || 28), 0)) / WAVE_ENEMY_COUNT;
    totalSeconds = (WAVE_ENEMY_COUNT - 1) * enemySpawnInterval(startWave) + travel;
  }
  return {
    mode,
    waves,
    breaksAtWave,
    minutes: Math.max(1, Math.ceil(totalSeconds / 60)),
    squadDps: Math.round(dps),
  };
}
