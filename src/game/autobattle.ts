/**
 * AUTO-RESOLVE — a wave-by-wave simulation, not a closed-form guess.
 *
 * The old estimator multiplied an approximate squad DPS by a "fight window"
 * derived from fractional rarity bands. That model was wrong in four ways:
 *
 *   1. it used fractional bands instead of the actual ten-slot wave the battle
 *      spawns (including which boss type occupies a slot),
 *   2. it ignored armour, so bosses with 30% armour died 40% faster than they
 *      really do,
 *   3. it ignored crits and auras, which on a developed account are most of the
 *      damage,
 *   4. it had no lives, so a squad that leaked half a wave was still credited
 *      with clearing it — and a squad that cleared 20 waves while losing every
 *      life was credited with all 20.
 *
 * The model below walks the real composition of every wave, converts each
 * enemy into *effective* health (armour folded in), applies the squad's
 * expected crit multiplier, hero casts and support auras, and leaks enemies
 * into the life pool whenever the squad cannot finish the wave before the last
 * spawn reaches the goal. The run ends when the lives run out — exactly like a
 * real battle.
 */
import {
  BOSS_HP_MUL,
  ELITE_HP_MUL,
  ENEMY_SPEED_MUL,
  ENEMY_HP_SCALE,
  ENEMY_TYPES,
  HERO_BY_ID,
  MAX_BATTLE_LEVEL,
  TOWER_BY_ID,
  WAVE_ENEMY_COUNT,
  crystalBonus,
  enemySpawnInterval,
  eventBonus,
  eventForDate,
  heroCooldown,
  heroPower,
  isBossType,
  monthlyEventBonus,
  monthlyEventForDate,
  roundHp,
  towerDamage,
  waveComp,
  type TowerDef,
} from "./data";
import { heroLevel, type SaveData } from "./save";

const RUN_HP_MULTIPLIER =
  eventBonus(eventForDate().id).hpMul * monthlyEventBonus(monthlyEventForDate().id).hpMul;

/** length of the arena path in canvas units (matches Battle.tsx) */
const PATH_LEN = 1206;
/** crit chance baseline that every tower shares */
const BASE_CRIT_CHANCE = 0.1;

export interface AutoBattlePlan {
  mode: "endless" | "gauntlet";
  /** waves successfully simulated from the player's current wave onward */
  waves: number;
  /** first wave the model predicts the squad cannot clear */
  breaksAtWave: number;
  minutes: number;
  squadDps: number;
  /** lives the simulation expects to lose before the run ends */
  livesLost: number;
  /** the last wave the sim believes is survivable */
  safestWave: number;
}

/**
 * Deterministic stratified roll for one wave: `waveComp` consumes ten random
 * numbers, so feeding it the band midpoints gives the same composition every
 * time we re-estimate. That keeps the mail report reproducible.
 */
function stratifiedRoll() {
  let i = 0;
  return () => {
    const v = (i + 0.5) / WAVE_ENEMY_COUNT;
    i++;
    return v;
  };
}

function waveComposition(wave: number): number[] {
  return waveComp(wave, stratifiedRoll());
}

/** expected elite share of a wave, matching the spawn roll in Battle.tsx */
const eliteChance = (wave: number) => Math.min(0.35, 0.06 + wave * 0.015);

interface EnemyBudget {
  /** health once armour is folded in */
  hp: number;
  /** lives the enemy costs if it leaks */
  lives: number;
  speed: number;
}

/**
 * Effective health of one enemy: raw health divided by the share of damage
 * that survives its armour. Elites are folded in as an expectation.
 */
function effectiveHp(type: number, wave: number): EnemyBudget {
  const et = ENEMY_TYPES[type];
  if (!et) return { hp: 0, lives: 1, speed: 55 };
  const boss = isBossType(type);
  const elite = boss ? 0 : eliteChance(wave);
  const hpMul = boss ? BOSS_HP_MUL : ENEMY_HP_SCALE * (1 + elite * (ELITE_HP_MUL - 1));
  const hp = roundHp(wave) * et.hpMul * RUN_HP_MULTIPLIER * hpMul;
  // Bulwark / Rift Chains are transient, so only permanent armour counts here
  const throughArmor = Math.max(0.3, 1 - Math.max(0, et.armor));
  return {
    hp: hp / throughArmor,
    lives: et.lives,
    // the shipped walk speed carries ENEMY_SPEED_MUL on top of the data sheet (+20% over the earlier build)
    speed: et.speed * ENEMY_SPEED_MUL * (1 + wave * 0.012) * (elite ? 1.08 : 1),
  };
}

/** one tower's expected damage per second, including its own multipliers */
function towerDps(save: SaveData, id: string, wave: number): number {
  const tower: TowerDef | undefined = TOWER_BY_ID[id];
  if (!tower) return 0;
  if (tower.target === "none") return 0; // support towers are handled as auras
  const level = Math.max(1, save.levels[id] || 1);
  const awakening = save.awn[id] || [0, 0];
  // awakening paths are rolled per shot; a tier is worth roughly this much
  const aw1 = tower.awk1 ? 1 + (awakening[0] || 0) * 0.1 : 1;
  const aw2 = tower.awk2 ? 1 + (awakening[1] || 0) * 0.08 : 1;
  // towers ascend through a long run: assume one ascent every four waves
  const battleLv = Math.max(1, Math.min(MAX_BATTLE_LEVEL, 1 + Math.floor((wave - 1) / 4)));
  const dmg = towerDamage(tower, level, battleLv, 0);
  const aspd = (tower.aspd || 0) + (tower.upAspd || 0) * (level - 1);
  const rate = Math.max(0.08, tower.rate / (1 + aspd));
  const perSecond = dmg / rate;
  const targetFactor = tower.target === "all" ? WAVE_ENEMY_COUNT * 0.6 : 1;
  const chainFactor = tower.chain ? Math.min(2.4, 1 + tower.chain * 0.18) : 1;
  const splashFactor = tower.splash ? Math.min(1.5, 1 + tower.splash / 220) : 1;
  const pierceFactor = tower.pierce ? Math.min(1.9, 1 + tower.pierce * 0.16) : 1;
  return perSecond * aw1 * aw2 * targetFactor * chainFactor * splashFactor * pierceFactor;
}

/** support auras in the rotation lift every shooter's output */
function auraMultiplier(save: SaveData): number {
  let mul = 1;
  for (const id of new Set(save.lineup)) {
    const tower = TOWER_BY_ID[id];
    if (!tower || (save.levels[id] || 0) <= 0) continue;
    const lv = Math.max(1, save.levels[id] || 1);
    const aspd = (tower.aspd || 0) + (tower.upAspd || 0) * (lv - 1);
    const atk = (tower.atkAura || 0) + (tower.upAtkAura || 0) * (lv - 1);
    if (tower.target === "none" || tower.aura) mul *= 1 + Math.max(0, aspd) + Math.max(0, atk);
  }
  return mul;
}

/**
 * Expected DPS for the account. `measured` is the live number the battle UI
 * computes from deployed towers; when it exists we use it and only add the
 * things it cannot know about (crits, hero casts, auras). Otherwise the
 * rotation is modelled with the same rules the battle engine uses.
 */
export function estimateSquadDps(save: SaveData, wave: number, measured = 0): number {
  const crystals = crystalBonus(save.crystals);
  const critChance = Math.min(1, BASE_CRIT_CHANCE + crystals.crit + crystals.superCritChance);
  const critMul = Math.max(1, 1 + crystals.critDamage);
  const critFactor = 1 + critChance * (critMul - 1);

  let base = measured > 0 ? measured : 0;
  if (!(base > 0)) {
    const ids = [...new Set(save.lineup)].filter((id) => (save.levels[id] || 0) > 0);
    const roster = ids.length ? ids : ["arrow", "cannon", "ice"];
    for (const id of roster) base += towerDps(save, id, wave);
  }

  // hero casts are burst damage on a cooldown: model them as a flat DPS trickle
  const hero = HERO_BY_ID[save.hero] || HERO_BY_ID.nova;
  const hLv = heroLevel(save, hero.id);
  const heroBurst = (220 + 55 * Math.max(1, wave)) * heroPower(hLv, hero.id);
  const heroDps = heroBurst / Math.max(4, heroCooldown(hero.cd, hLv, hero.id));

  return Math.max(0, base * critFactor * (1 + crystals.atk) * auraMultiplier(save) + heroDps);
}

/**
 * Simulate the run. Each wave costs `killTime` seconds; if that exceeds the
 * time until the last enemy reaches the goal, the overflow is converted into
 * leaked lives. The run ends when the life pool is empty.
 */
export function estimateAutoBattle(
  save: SaveData,
  mode: AutoBattlePlan["mode"],
  liveSquadDps?: number,
  _deployedCount?: number,
  currentWave = 1,
  boonsAlready = 0,
): AutoBattlePlan {
  const startWave = Math.max(1, Math.floor(Number.isFinite(currentWave) ? currentWave : 1));
  const crystals = crystalBonus(save.crystals);
  const maxLives = (mode === "endless" ? 15 : 12) + Math.round(crystals.lives);
  let lives = maxLives;
  let waves = 0;
  let totalSeconds = 0;
  let breaksAtWave = startWave;
  let safestWave = startWave - 1;
  let squadDps = 0;

  for (let wave = startWave; wave < startWave + 500; wave++) {
    const dps =
      estimateSquadDps(save, wave, liveSquadDps || 0) *
      (mode === "gauntlet" ? 1 + Math.max(0, boonsAlready + waves) * 0.05 : 1);
    squadDps = dps;

    const comp = waveComposition(wave);
    const spawnGap = enemySpawnInterval(wave);
    let effectiveHealth = 0;
    let lastArrival = 0;
    let livesAtRisk = 0;
    comp.forEach((type, i) => {
      const info = effectiveHp(type, wave);
      effectiveHealth += info.hp;
      livesAtRisk += info.lives;
      lastArrival = Math.max(lastArrival, i * spawnGap + PATH_LEN / Math.max(1, info.speed));
    });

    breaksAtWave = wave;
    if (!(dps > 0)) break;

    const killTime = effectiveHealth / dps;
    const clean = killTime <= lastArrival;
    totalSeconds += Math.min(240, Math.max(killTime, lastArrival * 0.5));
    if (mode === "gauntlet") totalSeconds += 7;

    if (!clean) {
      // share of the wave that gets through, measured against total health
      const share = Math.min(1, (killTime - lastArrival) / Math.max(1, killTime));
      const leaked = Math.max(1, Math.round(share * livesAtRisk));
      lives -= leaked;
      if (lives <= 0) {
        lives = 0;
        break;
      }
    }

    waves++;
    safestWave = wave;
    breaksAtWave = wave + 1;
  }

  // a run that never reaches the field still takes one spawn window
  if (!totalSeconds) {
    const comp = waveComposition(startWave);
    let last = 0;
    comp.forEach((type, i) => {
      const info = effectiveHp(type, startWave);
      last = Math.max(last, i * enemySpawnInterval(startWave) + PATH_LEN / Math.max(1, info.speed));
    });
    totalSeconds = last;
  }

  return {
    mode,
    waves,
    breaksAtWave,
    minutes: Math.max(1, Math.ceil(totalSeconds / 60)),
    squadDps: Math.round(squadDps),
    livesLost: maxLives - lives,
    safestWave,
  };
}
