/**
 * Skill effects — the shared effect library behind every active skill in the
 * game (the ten mythic towers' skills first and foremost). Each entry is the
 * single source of truth for a skill's numbers: the battle engine reads these
 * instead of hardcoding damage/radius per tower, so skills stay tunable and
 * testable outside the canvas.
 *
 * The effect family names match the game's skill vocabulary:
 *   blast1/2/3  — an area detonation, bigger number = bigger boom
 *   starburst   — many small hits spread across the field
 *   blade2      — a spinning blade that skewers a file of enemies
 *   boomerang   — a disc that flies out and returns, hitting both ways
 *   tornado     — a walking storm that damages and drags enemies back
 *   bombard     — shells raining on the densest cluster
 *   chainring   — lightning arcing between enemies in a ring
 *   armorbreak  — shatters armour on everything it touches
 *   teleport    — instant repositioning strike (blink + hit)
 *   meteor      — falling rocks with a shock on landing
 *   blaze       — a lane-wide wall of fire
 *   deathmark   — marks a target; the follow-up swing reaps it
 *   onKill      — a trigger that pays out whenever the tower lands a kill
 */

export interface SkillSpec {
  id: string;
  name: string;
  /** effect family, see the header */
  fx:
    | "blast1"
    | "blast2"
    | "blast3"
    | "starburst"
    | "blade2"
    | "boomerang"
    | "tornado"
    | "bombard"
    | "chainring"
    | "armorbreak"
    | "teleport"
    | "meteor"
    | "blaze"
    | "deathmark"
    | "onKill";
  /** seconds between automatic casts while enemies are on the field */
  cd: number;
  /** damage of the skill hit, as a multiple of the tower's per-shot damage */
  mult: number;
  /** area of effect, in canvas units */
  radius: number;
  /** how many targets/impacts the skill touches */
  hits: number;
  color: string;
  desc: string;
}

export const SKILLS: Record<string, SkillSpec> = {
  gale: {
    id: "gale",
    name: "Blade Cyclone",
    fx: "blade2",
    cd: 8,
    mult: 1.6,
    radius: 0,
    hits: 3,
    color: "#7ef0ff",
    desc: "Looses three spinning blades down the lane — each skewers a whole file of enemies.",
  },
  bombardment: {
    id: "bombardment",
    name: "Rolling Bombardment",
    fx: "bombard",
    cd: 10,
    mult: 2.2,
    radius: 120,
    hits: 3,
    color: "#ffb324",
    desc: "Walks a line of explosive shells across the densest cluster of enemies.",
  },
  wildfire: {
    id: "wildfire",
    name: "Firestorm",
    fx: "blaze",
    cd: 9,
    mult: 1.1,
    radius: 150,
    hits: 4,
    color: "#ff7a3d",
    desc: "Sets the front of the lane ablaze — a wall of fire that burns everything crossing it.",
  },
  hades: {
    id: "hades",
    name: "Hellgate",
    fx: "blast3",
    cd: 12,
    mult: 3.4,
    radius: 170,
    hits: 1,
    color: "#ff4d1f",
    desc: "Rips a burning gate open on the lane: one colossal detonation, then the rift burns on.",
  },
  ion: {
    id: "ion",
    name: "Chain Ring",
    fx: "chainring",
    cd: 8,
    mult: 1.4,
    radius: 220,
    hits: 8,
    color: "#c9a7ff",
    desc: "Lightning rings arc between up to eight enemies, jumping wider with every strike.",
  },
  aether: {
    id: "aether",
    name: "Refraction Burst",
    fx: "teleport",
    cd: 9,
    mult: 1.8,
    radius: 0,
    hits: 8,
    color: "#8fe9ff",
    desc: "Blinks a prism shard between eight enemies at once, striking each as it passes.",
  },
  scythe: {
    id: "scythe",
    name: "Death Mark",
    fx: "deathmark",
    cd: 7,
    mult: 2.0,
    radius: 0,
    hits: 1,
    color: "#b18cff",
    desc: "Marks the strongest enemy — the follow-up swing reaps it outright if it is wounded.",
  },
  sandstorm: {
    id: "sandstorm",
    name: "Tornado",
    fx: "tornado",
    cd: 10,
    mult: 1.3,
    radius: 130,
    hits: 6,
    color: "#e8d9a0",
    desc: "A storm walks the lane, chewing enemies and dragging them back toward the entrance.",
  },
  bloodstone: {
    id: "bloodstone",
    name: "Meteor Rain",
    fx: "meteor",
    cd: 11,
    mult: 2.4,
    radius: 110,
    hits: 5,
    color: "#ff5566",
    desc: "Calls five burning rocks down on random enemies, each landing with a shock.",
  },
  venom: {
    id: "venom",
    name: "Toxic Pool",
    fx: "blast1",
    cd: 8,
    mult: 1.5,
    radius: 120,
    hits: 3,
    color: "#8effc4",
    desc: "Spits pools of venom under the front enemies — they fester and slow whatever stands in them.",
  },
};

export const SKILL_BY_TOWER: Record<string, SkillSpec> = SKILLS;
