export const TOWERS: TowerDef[] = [
  {
    id: "arrow", name: "Arrow", rarity: "normal", kind: "arrow", target: "front",
    desc: "Fires an arrow at the enemy. The arrow gains an attack speed buff.",
    dmg: 50, upDmg: 2, ascDmg: 7, rate: 0.5, upRate: 0.01, ascRate: 0.02,
    aspd: 0.3, upAspd: 0.05, ascAspd: 0.1, unlockFrags: 0,

    awk1: awking("Quick Draw", "volley",
      "Chance to loose a second arrow at the next enemy in line", [0.12, 0.5], [1, 1]),
    awk2: awking("Serrated Heads", "burn",
      "Arrows leave a bleeding wound that keeps damaging the target", [0.2, 0.65], [0.5, 2.2]),  },
  {
    id: "cannon", name: "Cannon", rarity: "normal", kind: "cannon", target: "front",
    desc: "Fires a bomb shell. Explodes in 2m radius.",
    dmg: 100, upDmg: 4, ascDmg: 10, rate: 0.7, upRate: 0.01, ascRate: 0.02,
    splash: 30, upSplash: 3, ascSplash: 5, unlockFrags: 0,

    awk1: awking("Heavy Shells", "heavy",
      "Chance to load a far heavier shell", [0.15, 0.55], [1, 5]),
    awk2: awking("Shrapnel Load", "splash",
      "The shell bursts wider and scatters burning shards", [0.2, 0.7], [0.4, 1.1]),  },
  {
    id: "ice", name: "Ice Cube", rarity: "normal", kind: "ice", target: "front",
    desc: "Fires a big ice cube. Chance to freeze the enemy for 3s.",
    dmg: 20, upDmg: 4, ascDmg: 13, rate: 1.2, upRate: 0.02, ascRate: 0.025,
    freeze: 0.1, upFreeze: 0.05, ascFreeze: 0.1, unlockFrags: 0,

    awk1: awking("Deep Freeze", "freeze",
      "Chance to encase the target in solid ice", [0.15, 0.6], [1.2, 2.4]),
    awk2: awking("Frostbite", "slow",
      "Ice bites deeper: hits chill for longer and harder", [0.25, 0.8], [0.2, 0.45]),  },
  {
    id: "speaker", name: "S-Speaker", rarity: "decent", kind: "speaker", target: "none",
    desc: "Buffs attack speed of surrounding towers (left / right / up / down). The bonus increases with tower points.",
    dmg: 0, upDmg: 0, ascDmg: 0, rate: 1, upRate: 0, ascRate: 0,
    aura: true, aspd: 0.03, upAspd: 0.01, ascAspd: 0.02, unlockFrags: 5,

    awk1: awking("War Anthem", "aura",
      "The attack-speed aura grows stronger with every tier", [1, 1], [0.5, 2.5]),
    awk2: awking("Resonance", "aura",
      "A second stack of aura that also lifts attack power", [1, 1], [0.3, 1.6]),  },
  {
    id: "tesla", name: "Tesla Coil", rarity: "decent", kind: "tesla", target: "front",
    desc: "Shoots an electrical bullet that chains damage to enemies.",
    dmg: 35, upDmg: 20, ascDmg: 10, rate: 0.8, upRate: 0.02, ascRate: 0,
    chain: 6, upChain: 4, ascChain: 8, unlockFrags: 8,

    awk1: awking("Ionised Air", "chain",
      "Chance to arc the bolt into two more enemies", [0.2, 0.7], [2, 6]),
    awk2: awking("Static Bloom", "heavy",
      "Chance to discharge a shot that hits far harder", [0.12, 0.5], [1, 4.5]),  },
  {
    id: "gatling", name: "Gatling", rarity: "epic", kind: "gatling", target: "front",
    desc: "Shoots a bullet. Every 5s activates rapid fire for 6s.",
    dmg: 180, upDmg: 40, ascDmg: 100, rate: 0.4, upRate: 0, ascRate: 0,
    aspd: 2.0, upAspd: 0.5, ascAspd: 0.25, rapid: true, unlockFrags: 12,

    awk1: awking("Drum Mag", "volley",
      "Chance to fire an extra round at a second target", [0.15, 0.6], [1, 1]),
    awk2: awking("Hollow Points", "critup",
      "Chance for a burst of rounds that always crits", [0.08, 0.35], [1, 1]),  },
  {
    id: "core", name: "Energy Core", rarity: "epic", kind: "core", target: "front",
    desc: "Fires a blue orb that pushes enemies back 3m, then stuns for 2s.",
    dmg: 10, upDmg: 2, ascDmg: 3, rate: 0.9, upRate: 0.03, ascRate: 0,
    stun: 2, upStun: 0.5, ascStun: 1, unlockFrags: 12,

    awk1: awking("Force Push", "quake",
      "The orb stuns everything caught in its wake", [0.2, 0.7], [0.6, 1.8]),
    awk2: awking("Reactor Vent", "chain",
      "Chance to vent a second orb at the nearest enemy", [0.18, 0.6], [1, 1]),  },
  {
    id: "lightning", name: "Lightning Princess", rarity: "legendary", kind: "lightning",
    target: "all",
    desc: "Strikes a lightning bolt to all enemies.",
    dmg: 400, upDmg: 0, ascDmg: 0, rate: 0.5, upRate: 0, ascRate: 0,
    aspd: 0.12, upAspd: 0.02, ascAspd: 0.03, exotic: true, unlockFrags: 1,
    awk1: {
      name: "Superbolt",
      desc: "Chance to strike a superbolt that deals far more damage and always crits.",
      chance: [0.08, 0.12, 0.16, 0.36, 0.48],
      mult: [2.5, 6, 24, 48, 72],
    },
    awk2: {
      name: "Lightning Restrike",
      desc: "When lightning strikes, chance to strike additional bolts at random enemies.",
      chance: [0.25, 0.4, 0.55, 0.75, 1],
      mult: [1, 1, 2, 2, 4],
      mult2: [3, 2, 4, 3, 8],
    },
  },
  {
    id: "hellstorm", name: "Hellstorm", rarity: "legendary", kind: "hellstorm", target: "front",
    desc: "Fires a fire bullet. Chance to fire a fireball: 250% more damage, always crits, 5m explosion.",
    dmg: 480, upDmg: 0, ascDmg: 0, rate: 0.75, upRate: 0.03, ascRate: 0,
    fbChance: 0.25, upFb: 0.05, ascFb: 0.025, exotic: true, unlockFrags: 1,
    awk1: {
      name: "Scorching Hot",
      desc: "On deploy: massive crit damage and +1% attack per kill (stacks to cap).",
      chance: [0, 0, 0, 0, 0],
      mult: [6, 12, 24, 48, 72],
      mult2: [2000, 4000, 8000, 12000, 16000],
    },
    awk2: {
      name: "Deafening Blaze",
      desc: "When created by merging, fires blazing beams at the strongest enemies on the field.",
      chance: [1, 1, 1, 1, 1],
      mult: [2, 4, 7, 10, 15],
      mult2: [1.2, 2.4, 3.6, 5.4, 7.2],
    },
  },
  {
    id: "icestorm", name: "Icestorm", rarity: "legendary", kind: "icestorm", target: "front",
    desc: "Fires an ice bullet. Chance to fire an icicle that cuts 40% of the enemy's current HP.",
    dmg: 720, upDmg: 0, ascDmg: 0, rate: 0.75, upRate: 0.03, ascRate: 0,
    icChance: 0.45, upIc: 0.075, ascIc: 0.025, icPct: 0.4, upIcPct: 0.025, ascIcPct: 0.04,
    unlockFrags: 1,


    awk1: awking("Absolute Zero", "freeze",
      "Chance to encase the target solid in ice for several seconds", [0.15, 0.6], [1.5, 3.5]),
    awk2: awking("Glacial Shards", "chain",
      "Icicles splinter into the enemies packed around the target", [0.25, 0.8], [2, 5]),  },
  {
    id: "plant", name: "Power Plant", rarity: "legendary", kind: "plant", target: "none",
    desc: "A living reactor aura boosts adjacent towers' attack speed and damage; 4 / 6 / 8 / 12 Power Plants in the network amplify both buffs by +25 / +50 / +75 / +100%.",
    dmg: 0, upDmg: 0, ascDmg: 0, rate: 1, upRate: 0, ascRate: 0,
    aura: true, aspd: 0.03, upAspd: 0.01, ascAspd: 0.02,
    atkAura: 0.03, upAtkAura: 0.01, ascAtkAura: 0.02,
    hpState: [4, 6, 8, 12], unlockFrags: 1,

    awk1: awking("Overclock", "aura",
      "The aura surges: attack speed and damage both climb", [1, 1], [0.5, 2.4]),
    awk2: awking("Capacitor Bank", "sp",
      "Every enemy killed inside the aura feeds the grid", [0.3, 1], [2, 9]),  },
  {
    id: "swarm", name: "Arcane Swarm", rarity: "decent", kind: "swarm", target: "front",
    desc: "Loose three homing bolts at once, at up to three different enemies.",
    dmg: 34, upDmg: 11, ascDmg: 0, rate: 0.85, upRate: 0.02, ascRate: 0,
    multi: 3, unlockFrags: 10,

    awk1: awking("Swarm Surge", "volley",
      "Chance to loose two extra homing bolts", [0.18, 0.65], [1, 3]),
    awk2: awking("Void Locus", "heavy",
      "Chance for a bolt to collapse into a heavy detonation", [0.1, 0.45], [1.5, 6]),  },
  {
    id: "chrono", name: "Chrono Spire", rarity: "epic", kind: "chrono", target: "front",
    desc: "Time field: slows enemies around it and chills whatever it hits. Slowed enemies take +25% damage.",
    dmg: 70, upDmg: 18, ascDmg: 0, rate: 0.95, upRate: 0.02, ascRate: 0,
    slow: 0.4, upSlow: 0.04, ascSlow: 0.03, slowDur: 3.5, slowAura: 210, unlockFrags: 14,

    awk1: awking("Time Lock", "slow",
      "Chance to freeze a caught enemy's clock completely", [0.15, 0.6], [0.3, 0.7]),
    awk2: awking("Paradox", "chain",
      "Slowed enemies take a rebound hit from their own timeline", [0.2, 0.7], [0.4, 1.4]),  },
  {
    id: "void", name: "Void Cannon", rarity: "epic", kind: "void", target: "front",
    desc: "Slow siege gun that shaves a share of the target's maximum HP on every hit.",
    dmg: 110, upDmg: 22, ascDmg: 0, rate: 1.7, upRate: 0.03, ascRate: 0,
    pctHp: 0.05, upPctHp: 0.009, ascPctHp: 0.014, unlockFrags: 16,

    awk1: awking("Event Horizon", "execute",
      "Chance to erase an enemy that is already badly wounded", [0.1, 0.4], [0.12, 0.3]),
    awk2: awking("Collapse", "splash",
      "Hits pull harder and drag nearby enemies into the wound", [0.25, 0.8], [0.5, 1.6]),  },
  {
    id: "plasma", name: "Plasma Lance", rarity: "legendary", kind: "plasma", target: "front",
    desc: "Skewers a whole file of enemies with one lance.",
    dmg: 560, upDmg: 0, ascDmg: 0, rate: 0.95, upRate: 0.02, ascRate: 0,
    pierce: 3, upPierce: 1, ascPierce: 1, exotic: true, unlockFrags: 1,
    awk1: {
      name: "Overcharge",
      desc: "Chance to fire a supercharged lance that deals far more damage and always crits.",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [2, 5, 18, 40, 60],
    },
    awk2: {
      name: "Searing Path",
      desc: "Lances set enemies ablaze: chained burn damage over time on every enemy hit.",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },

  // ---------------------------------------------------------------
  // LegenDARY ARSENAL — 12 new towers: 5 normal, 3 decent, 2 epic, 2 legendary
  // ---------------------------------------------------------------
  {
    id: "sling", name: "Slingshot", rarity: "normal", kind: "sling", art: "sling", accent: "#ffd27f",
    target: "front",
    desc: "Snaps a stone at the front enemy three times a second. Cheap, quick, relentless.",
    dmg: 26, upDmg: 3, ascDmg: 9, rate: 0.3, upRate: 0.004, ascRate: 0.006,
    aspd: 0.4, upAspd: 0.06, ascAspd: 0.05, unlockFrags: 2,

    awk1: awking("Double Shot", "volley",
      "Chance to snap a second stone at another enemy", [0.18, 0.6], [1, 1]),
    awk2: awking("Flint Load", "burn",
      "Stones strike sparks and set the target alight", [0.2, 0.65], [0.5, 2]),  },
  {
    id: "flame", name: "Flamethrower", rarity: "normal", kind: "flame", art: "flame", accent: "#ff8c3d",
    target: "front",
    desc: "Coats the target in fire: 60% of the hit damage keeps burning for 4s.",
    dmg: 34, upDmg: 4, ascDmg: 11, rate: 0.55, upRate: 0.012, ascRate: 0.02,
    burnPct: 0.6, upBurnPct: 0.06, ascBurnPct: 0.08, burnDur: 4, unlockFrags: 3,

    awk1: awking("Napalm", "burn",
      "The burn lasts longer and spreads to enemies beside it", [0.2, 0.7], [0.6, 2.6]),
    awk2: awking("Blue Flame", "heavy",
      "Chance to ignite a searingly hot shot", [0.12, 0.5], [1, 4.5]),  },
  {
    id: "spike", name: "Spike Trap", rarity: "normal", kind: "spike", art: "spike", accent: "#c8d6e5",
    target: "front",
    desc: "Erupts under the front enemy, shredding everything packed around it.",
    dmg: 70, upDmg: 6, ascDmg: 16, rate: 0.9, upRate: 0, ascRate: 0,
    splash: 60, upSplash: 6, ascSplash: 12, shred: 0.06, upShred: 0.006, ascShred: 0.012, unlockFrags: 2,

    awk1: awking("Iron Shards", "splash",
      "The trap bursts into a wider radius of metal splinters", [0.2, 0.7], [1, 1.8]),
    awk2: awking("Bleeding Ground", "shred",
      "The shards strip armour more aggressively", [0.15, 0.6], [0.06, 0.18]),  },
  {
    id: "boomer", name: "Boomerang", rarity: "normal", kind: "boomer", art: "sling", accent: "#9fe8ff",
    target: "front",
    desc: "Throws a spinning blade that returns. Hits twice per throw.",
    dmg: 45, upDmg: 5, ascDmg: 12, rate: 0.4, upRate: 0.008, ascRate: 0.012,
    multi: 2, unlockFrags: 2,

    awk1: awking("Whirlwind", "volley",
      "Chance to throw two blades that criss-cross", [0.15, 0.6], [1, 1]),
    awk2: awking("Razor Edge", "shred",
      "The blade cuts deeper into armour", [0.2, 0.65], [0.06, 0.18]),  },
  {
    id: "toxin", name: "Toxic Sprayer", rarity: "normal", kind: "toxin", art: "flame", accent: "#8effc4",
    target: "front",
    desc: "Sprays toxic mist that poisons the target. Damage over time.",
    dmg: 18, upDmg: 3, ascDmg: 8, rate: 0.6, upRate: 0.015, ascRate: 0.02,
    burnPct: 0.4, upBurnPct: 0.05, ascBurnPct: 0.07, burnDur: 5, unlockFrags: 3,

    awk1: awking("Poison Cloud", "burn",
      "The mist spreads to nearby enemies", [0.2, 0.7], [0.5, 2]),
    awk2: awking("Corrosive", "shred",
      "The poison eats through armour", [0.15, 0.6], [0.06, 0.18]),  },
  {
    id: "axe", name: "Axe Thrower", rarity: "decent", kind: "axe", art: "tube", accent: "#ff9d5c",
    target: "front",
    desc: "Throws a heavy axe. High damage, slow rate.",
    dmg: 120, upDmg: 15, ascDmg: 30, rate: 0.6, upRate: 0.01, ascRate: 0.015,
    unlockFrags: 5,

    awk1: awking("Cleave", "heavy",
      "Chance to split the axe into two", [0.15, 0.6], [1, 1.5]),
    awk2: awking("Throwing Spin", "volley",
      "Chance to throw an extra axe", [0.1, 0.45], [1, 1]),  },
  {
    id: "frost", name: "Frost Spire", rarity: "decent", kind: "frost", art: "spike", accent: "#9fe8ff",
    target: "front",
    desc: "Fires ice shards that chill enemies.",
    dmg: 60, upDmg: 8, ascDmg: 18, rate: 0.8, upRate: 0.015, ascRate: 0.02,
    freeze: 0.15, upFreeze: 0.05, ascFreeze: 0.1, unlockFrags: 5,

    awk1: awking("Frost Nova", "freeze",
      "Chance to freeze a wider area", [0.15, 0.6], [1.2, 2.4]),
    awk2: awking("Cold Snap", "slow",
      "Chilled enemies move slower", [0.25, 0.8], [0.2, 0.45]),  },
  {
    id: "mortar", name: "Siege Mortar", rarity: "decent", kind: "mortar", art: "tube", accent: "#d0d6e0",
    target: "front",
    desc: "Fires a mortar shell that explodes in a large radius.",
    dmg: 150, upDmg: 20, ascDmg: 40, rate: 1.0, upRate: 0.02, ascRate: 0.03,
    splash: 80, upSplash: 8, ascSplash: 16, unlockFrags: 5,

    awk1: awking("Heavy Shell", "heavy",
      "Chance for a bigger explosion", [0.15, 0.6], [1, 1.5]),
    awk2: awking("Shrapnel", "splash",
      "The shell scatters further", [0.2, 0.7], [1, 1.8]),  },
  {
    id: "laser", name: "Laser Cutter", rarity: "epic", kind: "laser", art: "beam", accent: "#b6a0ff",
    target: "front",
    desc: "Cuts through enemies with a laser beam.",
    dmg: 200, upDmg: 30, ascDmg: 60, rate: 0.7, upRate: 0.015, ascRate: 0.02,
    pierce: 2, upPierce: 1, ascPierce: 1, unlockFrags: 12,

    awk1: awking("Beam Split", "volley",
      "Chance to split the beam into two", [0.15, 0.6], [1, 1]),
    awk2: awking("Focus", "heavy",
      "The beam deals more damage", [0.1, 0.45], [1, 1.5]),  },
  {
    id: "missile", name: "Missile Battery", rarity: "epic", kind: "missile", art: "tube", accent: "#ffd23f",
    target: "front",
    desc: "Fires missiles that explode on impact.",
    dmg: 250, upDmg: 35, ascDmg: 70, rate: 0.8, upRate: 0.015, ascRate: 0.02,
    splash: 100, upSplash: 10, ascSplash: 20, unlockFrags: 12,

    awk1: awking("Cluster", "splash",
      "Chance for missiles to split into smaller ones", [0.15, 0.6], [1, 1.5]),
    awk2: awking("Impact", "heavy",
      "Missiles deal more damage", [0.1, 0.45], [1, 1.5]),  },
  {
    id: "dragon", name: "Dragon's Maw", rarity: "legendary", kind: "dragon", art: "flame", accent: "#ff5d3d",
    target: "front",
    desc: "Breathes fire that burns enemies.",
    dmg: 600, upDmg: 0, ascDmg: 0, rate: 0.8, upRate: 0.02, ascRate: 0,
    burnPct: 0.8, upBurnPct: 0.08, ascBurnPct: 0.1, burnDur: 6, exotic: true, unlockFrags: 1,

    awk1: {
      name: "Dragon's Breath",
      desc: "Chance for a larger fire blast",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Fire Storm",
      desc: "Fire spreads to nearby enemies",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "sun", name: "Sunforge", rarity: "legendary", kind: "sun", art: "beam", accent: "#ffc457",
    target: "front",
    desc: "Fires a beam of sunlight that burns enemies.",
    dmg: 500, upDmg: 0, ascDmg: 0, rate: 0.9, upRate: 0.02, ascRate: 0,
    burnPct: 0.7, upBurnPct: 0.07, ascBurnPct: 0.09, burnDur: 5, exotic: true, unlockFrags: 1,

    awk1: {
      name: "Solar Flare",
      desc: "Chance for a larger beam",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Sunburst",
      desc: "Beam spreads to nearby enemies",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },

  // ---------------------------------------------------------------
  // SECOND WAVE OF TOWERS — 6 more, one for every niche
  // ---------------------------------------------------------------
  {
    id: "rime", name: "Rime Cannon", rarity: "normal", kind: "cannon", art: "cannon", accent: "#9fe8ff",
    target: "front",
    desc: "Fires an ice shell that freezes enemies.",
    dmg: 80, upDmg: 10, ascDmg: 20, rate: 0.8, upRate: 0.015, ascRate: 0.02,
    freeze: 0.2, upFreeze: 0.05, ascFreeze: 0.1, splash: 40, upSplash: 4, ascSplash: 8, unlockFrags: 2,

    awk1: awking("Ice Blast", "freeze",
      "Chance for a larger freeze", [0.15, 0.6], [1.2, 2.4]),
    awk2: awking("Cold Shell", "splash",
      "The shell scatters ice", [0.2, 0.7], [1, 1.8]),  },
  {
    id: "siphon", name: "Soul Siphon", rarity: "decent", kind: "siphon", art: "tube", accent: "#c44dff",
    target: "front",
    desc: "Siphons life from enemies.",
    dmg: 100, upDmg: 15, ascDmg: 30, rate: 0.9, upRate: 0.02, ascRate: 0.03,
    spGain: 5, upSpGain: 1, ascSpGain: 2, unlockFrags: 5,

    awk1: awking("Soul Drain", "sp",
      "Chance for more SP gain", [0.15, 0.6], [1, 1.5]),
    awk2: awking("Life Steal", "leech",
      "Chance to heal lives", [0.1, 0.45], [1, 1]),  },
  {
    id: "quake", name: "Quake Pylon", rarity: "decent", kind: "quake", art: "spike", accent: "#ffd23f",
    target: "front",
    desc: "Creates earthquakes that stun enemies.",
    dmg: 90, upDmg: 12, ascDmg: 24, rate: 0.85, upRate: 0.015, ascRate: 0.02,
    stun: 1.5, upStun: 0.3, ascStun: 0.6, splash: 50, upSplash: 5, ascSplash: 10, unlockFrags: 5,

    awk1: awking("Tremor", "stun",
      "Chance for a longer stun", [0.15, 0.6], [1.5, 3]),
    awk2: awking("Shockwave", "splash",
      "The quake spreads further", [0.2, 0.7], [1, 1.8]),  },
  {
    id: "storm", name: "Storm Caller", rarity: "epic", kind: "storm", art: "beam", accent: "#a0e8ff",
    target: "front",
    desc: "Calls storms that strike enemies with lightning.",
    dmg: 180, upDmg: 25, ascDmg: 50, rate: 0.75, upRate: 0.015, ascRate: 0.02,
    chain: 4, upChain: 2, ascChain: 4, unlockFrags: 12,

    awk1: awking("Lightning Strike", "chain",
      "Chance for more lightning strikes", [0.15, 0.6], [1, 1.5]),
    awk2: awking("Thunder", "heavy",
      "Lightning deals more damage", [0.1, 0.45], [1, 1.5]),  },
  {
    id: "plague", name: "Plague Mortar", rarity: "epic", kind: "plague", art: "tube", accent: "#8effc4",
    target: "front",
    desc: "Fires plague shells that poison enemies.",
    dmg: 160, upDmg: 22, ascDmg: 44, rate: 0.8, upRate: 0.015, ascRate: 0.02,
    burnPct: 0.5, upBurnPct: 0.05, ascBurnPct: 0.07, burnDur: 4, splash: 60, upSplash: 6, ascSplash: 12, unlockFrags: 12,

    awk1: awking("Plague Cloud", "burn",
      "Chance for a larger poison cloud", [0.15, 0.6], [1, 1.5]),
    awk2: awking("Contagion", "splash",
      "Poison spreads further", [0.2, 0.7], [1, 1.8]),  },
  {
    id: "rail", name: "Railgun", rarity: "legendary", kind: "rail", art: "plasma", accent: "#7fe9ff",
    target: "front",
    desc: "Fires a railgun projectile that pierces enemies.",
    dmg: 700, upDmg: 0, ascDmg: 0, rate: 0.85, upRate: 0.02, ascRate: 0,
    pierce: 5, upPierce: 1, ascPierce: 1, exotic: true, unlockFrags: 1,

    awk1: {
      name: "Rail Split",
      desc: "Chance for the projectile to split",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Rail Focus",
      desc: "Projectile deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },

  // ---------------------------------------------------------------
  // MYTHIC ARSENAL — four more legendaries for the endgame roster
  // ---------------------------------------------------------------
  {
    id: "reaper", name: "Reaper's Toll", rarity: "legendary", kind: "reaper", art: "scythe", accent: "#c9a7ff",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Harvests enemies with a scythe.",
    dmg: 800, upDmg: 0, ascDmg: 0, rate: 0.9, upRate: 0.02, ascRate: 0,
    pctHp: 0.08, upPctHp: 0.01, ascPctHp: 0.015, pierce: 2, upPierce: 1, ascPierce: 1,
    awk1: {
      name: "Harvest",
      desc: "Chance for a larger harvest",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Soul Reap",
      desc: "Reap more from enemies",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "prism", name: "Prism Array", rarity: "legendary", kind: "prism", art: "prism", accent: "#8ff0ff",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Refracts light into a prism array.",
    dmg: 650, upDmg: 0, ascDmg: 0, rate: 0.85, upRate: 0.02, ascRate: 0,
    multi: 3, upMulti: 1, ascMulti: 1,
    awk1: {
      name: "Refraction",
      desc: "Chance for more prisms",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Light Beam",
      desc: "Prisms deal more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "aegis", name: "Aegis Core", rarity: "legendary", kind: "aegis", art: "aegis", accent: "#9fe8ff",
    target: "none", exotic: true, unlockFrags: 1,
    desc: "Protects towers with an aegis.",
    dmg: 0, upDmg: 0, ascDmg: 0, rate: 1, upRate: 0, ascRate: 0,
    aura: true, aspd: 0.02, upAspd: 0.005, ascAspd: 0.01,
    awk1: {
      name: "Aegis Shield",
      desc: "Chance for a stronger shield",
      chance: [1, 1, 1, 1, 1, 1],
      mult: [1, 1, 1, 1, 1, 1],
      mult2: [10, 12, 14, 16, 18, 20],
      fmt: (m, m2) => `+${m} tower points shield · duration ${m2}s`
    },
    awk2: {
      name: "Aegis Blast",
      desc: "When shield breaks, blasts enemies",
      chance: [1, 1, 1, 1, 1, 1],
      mult: [1, 2, 3, 4, 5, 6],
      mult2: [10, 12, 14, 16, 18, 20],
      fmt: (m, m2) => `+${m}m knock · ${m2} miles/s`
    },
  },
  {
    id: "hellgate", name: "Hellgate", rarity: "legendary", kind: "hellgate", art: "gate", accent: "#ff8c3d",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Opens a hellgate that summons demons.",
    dmg: 750, upDmg: 0, ascDmg: 0, rate: 0.8, upRate: 0.02, ascRate: 0,
    multi: 4, upMulti: 1, ascMulti: 1,
    awk1: {
      name: "Gate Open",
      desc: "Chance for more demons",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Hell Fire",
      desc: "Demons deal more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "nova", name: "Nova Cannon", rarity: "legendary", kind: "nova", art: "nova", accent: "#ffd7a1",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Fires a nova cannon that explodes.",
    dmg: 850, upDmg: 0, ascDmg: 0, rate: 0.75, upRate: 0.02, ascRate: 0,
    splash: 150, upSplash: 15, ascSplash: 30,
    awk1: {
      name: "Nova Blast",
      desc: "Chance for a larger explosion",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Nova Focus",
      desc: "Explosion deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "gravity", name: "Gravity Well", rarity: "legendary", kind: "gravity", art: "well", accent: "#b9a7ff",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Creates a gravity well that pulls enemies.",
    dmg: 600, upDmg: 0, ascDmg: 0, rate: 0.8, upRate: 0.02, ascRate: 0,
    splash: 120, upSplash: 12, ascSplash: 24, pull: 5, upPull: 1, ascPull: 1,
    awk1: {
      name: "Gravity Pull",
      desc: "Chance for a stronger pull",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Gravity Blast",
      desc: "Pull deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "thundercrown", name: "Thunder Crown", rarity: "legendary", kind: "thundercrown", art: "crown", accent: "#ffe86b",
    target: "all", exotic: true, unlockFrags: 1,
    desc: "Strikes enemies with a thunder crown.",
    dmg: 550, upDmg: 0, ascDmg: 0, rate: 0.85, upRate: 0.02, ascRate: 0,
    chain: 5, upChain: 2, ascChain: 4,
    awk1: {
      name: "Crown Strike",
      desc: "Chance for more lightning strikes",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Crown Blast",
      desc: "Lightning deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "voidrip", name: "Void Ripper", rarity: "legendary", kind: "voidrip", art: "ripper", accent: "#c9a7ff",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Rips enemies with a void ripper.",
    dmg: 700, upDmg: 0, ascDmg: 0, rate: 0.9, upRate: 0.02, ascRate: 0,
    pctHp: 0.07, upPctHp: 0.009, ascPctHp: 0.014, pierce: 3, upPierce: 1, ascPierce: 1,
    awk1: {
      name: "Rip",
      desc: "Chance for a larger rip",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Void Blast",
      desc: "Rip deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "furnace", name: "Soul Furnace", rarity: "legendary", kind: "furnace", art: "furnace", accent: "#ff8c3d",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Burns enemies in a furnace.",
    dmg: 750, upDmg: 0, ascDmg: 0, rate: 0.8, upRate: 0.02, ascRate: 0,
    burnPct: 0.9, upBurnPct: 0.09, ascBurnPct: 0.11, burnDur: 7,
    awk1: {
      name: "Furnace Blast",
      desc: "Chance for a larger burn",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Furnace Focus",
      desc: "Burn deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "maelstrom", name: "Maelstrom", rarity: "legendary", kind: "maelstrom", art: "whirl", accent: "#7fe9ff",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Creates a maelstrom that pulls enemies.",
    dmg: 650, upDmg: 0, ascDmg: 0, rate: 0.85, upRate: 0.02, ascRate: 0,
    splash: 130, upSplash: 13, ascSplash: 26, pull: 6, upPull: 1, ascPull: 1,
    awk1: {
      name: "Maelstrom Pull",
      desc: "Chance for a stronger pull",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Maelstrom Blast",
      desc: "Pull deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "starfall", name: "Starfall Battery", rarity: "legendary", kind: "starfall", art: "star", accent: "#ffd23f",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Fires starfall projectiles.",
    dmg: 800, upDmg: 0, ascDmg: 0, rate: 0.75, upRate: 0.02, ascRate: 0,
    multi: 5, upMulti: 1, ascMulti: 1,
    awk1: {
      name: "Starfall Blast",
      desc: "Chance for more starfalls",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Starfall Focus",
      desc: "Starfalls deal more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "chronolock", name: "Chrono Lock", rarity: "legendary", kind: "chronolock", art: "lock", accent: "#9fe8ff",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Locks enemies in time.",
    dmg: 500, upDmg: 0, ascDmg: 0, rate: 0.8, upRate: 0.02, ascRate: 0,
    slow: 0.6, upSlow: 0.06, ascSlow: 0.09, slowDur: 4, slowAura: 250,
    awk1: {
      name: "Time Lock Blast",
      desc: "Chance for a longer lock",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Time Focus",
      desc: "Lock deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "gravebloom", name: "Grave Bloom", rarity: "legendary", kind: "gravebloom", art: "bloom", accent: "#8effc4",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Blooms graves that poison enemies.",
    dmg: 550, upDmg: 0, ascDmg: 0, rate: 0.8, upRate: 0.02, ascRate: 0,
    burnPct: 0.75, upBurnPct: 0.075, ascBurnPct: 0.095, burnDur: 5, splash: 100, upSplash: 10, ascSplash: 20,
    awk1: {
      name: "Bloom Blast",
      desc: "Chance for a larger poison",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Bloom Focus",
      desc: "Poison deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "colossus", name: "Rift Colossus", rarity: "legendary", kind: "colossus", art: "colossus", accent: "#ff8f9a",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Summons a rift colossus.",
    dmg: 900, upDmg: 0, ascDmg: 0, rate: 0.7, upRate: 0.02, ascRate: 0,
    splash: 180, upSplash: 18, ascSplash: 36, multi: 2, upMulti: 1, ascMulti: 1,
    awk1: {
      name: "Colossus Blast",
      desc: "Chance for a larger blast",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Colossus Focus",
      desc: "Blast deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "meteor", name: "Meteor", rarity: "mystical", kind: "starfall", art: "star", accent: "#ff9a3d",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Fires meteors that explode.",
    dmg: 1000, upDmg: 0, ascDmg: 0, rate: 0.7, upRate: 0.02, ascRate: 0,
    splash: 200, upSplash: 20, ascSplash: 40, multi: 6, upMulti: 1, ascMulti: 1,
    awk1: {
      name: "Meteor Blast",
      desc: "Chance for a larger explosion",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55, 0.6],
      mult: [1.5, 3, 6, 12, 18, 24],
    },
    awk2: {
      name: "Meteor Focus",
      desc: "Explosion deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1, 1],
      mult: [1, 2, 4, 6, 10, 12],
      mult2: [3, 6, 10, 16, 26, 30],
    },
  },
  {
    id: "clone", name: "Clone", rarity: "legendary", kind: "clone", art: "clone", accent: "#8effc4",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Clones enemies.",
    dmg: 600, upDmg: 0, ascDmg: 0, rate: 0.8, upRate: 0.02, ascRate: 0,
    multi: 3, upMulti: 1, ascMulti: 1,
    awk1: {
      name: "Clone Blast",
      desc: "Chance for more clones",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Clone Focus",
      desc: "Clones deal more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "gale", name: "Gale Blade", rarity: "legendary", kind: "gale", art: "beam", accent: "#7ef0ff",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Fires a gale blade.",
    dmg: 650, upDmg: 0, ascDmg: 0, rate: 0.85, upRate: 0.02, ascRate: 0,
    pierce: 4, upPierce: 1, ascPierce: 1,
    awk1: {
      name: "Gale Blast",
      desc: "Chance for a larger blade",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Gale Focus",
      desc: "Blade deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "bombardment", name: "Thousand-Pounder", rarity: "legendary", kind: "bombardment", art: "howitzer", accent: "#ffc457",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Bombards enemies.",
    dmg: 850, upDmg: 0, ascDmg: 0, rate: 0.75, upRate: 0.02, ascRate: 0,
    splash: 150, upSplash: 15, ascSplash: 30, multi: 3, upMulti: 1, ascMulti: 1,
    awk1: {
      name: "Bombardment Blast",
      desc: "Chance for a larger bombardment",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Bombardment Focus",
      desc: "Bombardment deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "wildfire", name: "Wildfire", rarity: "legendary", kind: "wildfire", art: "flame", accent: "#ff7a3d",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Burns enemies with wildfire.",
    dmg: 750, upDmg: 0, ascDmg: 0, rate: 0.8, upRate: 0.02, ascRate: 0,
    burnPct: 0.85, upBurnPct: 0.085, ascBurnPct: 0.105, burnDur: 6,
    awk1: {
      name: "Wildfire Blast",
      desc: "Chance for a larger burn",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Wildfire Focus",
      desc: "Burn deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "hades", name: "Hades Gate", rarity: "legendary", kind: "hades", art: "gate", accent: "#ff4d1f",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Opens a hades gate.",
    dmg: 800, upDmg: 0, ascDmg: 0, rate: 0.75, upRate: 0.02, ascRate: 0,
    multi: 4, upMulti: 1, ascMulti: 1,
    awk1: {
      name: "Hades Blast",
      desc: "Chance for a larger gate",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Hades Focus",
      desc: "Gate deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "ion", name: "Ion Storm", rarity: "legendary", kind: "ion", art: "ion", accent: "#c9a7ff",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Creates an ion storm.",
    dmg: 700, upDmg: 0, ascDmg: 0, rate: 0.8, upRate: 0.02, ascRate: 0,
    chain: 6, upChain: 2, ascChain: 4,
    awk1: {
      name: "Ion Blast",
      desc: "Chance for more ion strikes",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Ion Focus",
      desc: "Ion strikes deal more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "aether", name: "Aether Prism", rarity: "legendary", kind: "aether", art: "aether", accent: "#8fe9ff",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Refracts aether.",
    dmg: 600, upDmg: 0, ascDmg: 0, rate: 0.85, upRate: 0.02, ascRate: 0,
    multi: 3, upMulti: 1, ascMulti: 1,
    awk1: {
      name: "Aether Blast",
      desc: "Chance for more aether",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Aether Focus",
      desc: "Aether deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "scythe", name: "Death Scythe", rarity: "legendary", kind: "scythe", art: "scythe", accent: "#b18cff",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Harvests enemies with a death scythe.",
    dmg: 850, upDmg: 0, ascDmg: 0, rate: 0.8, upRate: 0.02, ascRate: 0,
    pctHp: 0.09, upPctHp: 0.011, ascPctHp: 0.016, pierce: 3, upPierce: 1, ascPierce: 1,
    awk1: {
      name: "Scythe Blast",
      desc: "Chance for a larger harvest",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Scythe Focus",
      desc: "Harvest deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "sandstorm", name: "Sandstorm", rarity: "legendary", kind: "sandstorm", art: "sling", accent: "#e8d9a0",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Creates a sandstorm.",
    dmg: 550, upDmg: 0, ascDmg: 0, rate: 0.8, upRate: 0.02, ascRate: 0,
    splash: 110, upSplash: 11, ascSplash: 22,
    awk1: {
      name: "Sandstorm Blast",
      desc: "Chance for a larger storm",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Sandstorm Focus",
      desc: "Storm deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "bloodstone", name: "Bloodstone Spire", rarity: "legendary", kind: "bloodstone", art: "spire", accent: "#ff5566",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Fires bloodstone projectiles.",
    dmg: 650, upDmg: 0, ascDmg: 0, rate: 0.85, upRate: 0.02, ascRate: 0,
    splash: 120, upSplash: 12, ascSplash: 24,
    awk1: {
      name: "Bloodstone Blast",
      desc: "Chance for a larger projectile",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Bloodstone Focus",
      desc: "Projectile deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "venom", name: "Venom Spitter", rarity: "legendary", kind: "venom", art: "venom", accent: "#8effc4",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Spits venom.",
    dmg: 550, upDmg: 0, ascDmg: 0, rate: 0.8, upRate: 0.02, ascRate: 0,
    burnPct: 0.8, upBurnPct: 0.08, ascBurnPct: 0.1, burnDur: 6,
    awk1: {
      name: "Venom Blast",
      desc: "Chance for a larger venom",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55],
      mult: [1.5, 3, 6, 12, 18],
    },
    awk2: {
      name: "Venom Focus",
      desc: "Venom deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1],
      mult: [1, 2, 4, 6, 10],
      mult2: [3, 6, 10, 16, 26],
    },
  },
  {
    id: "demon", name: "Demon Execution", rarity: "mystical", kind: "demon", art: "demon", accent: "#9b001b",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Executes enemies.",
    dmg: 1000, upDmg: 0, ascDmg: 0, rate: 0.6, upRate: 0.02, ascRate: 0,
    pctHp: 0.1, upPctHp: 0.012, ascPctHp: 0.018, execCd: 3.0, upExecCd: 0.1, ascExecCd: 0.2,
    awk1: {
      name: "Execution Blast",
      desc: "Chance for a larger execution",
      chance: [0.1, 0.16, 0.22, 0.4, 0.55, 0.6],
      mult: [1.5, 3, 6, 12, 18, 24],
    },
    awk2: {
      name: "Execution Focus",
      desc: "Execution deals more damage",
      chance: [0.3, 0.45, 0.6, 0.8, 1, 1],
      mult: [1, 2, 4, 6, 10, 12],
      mult2: [3, 6, 10, 16, 26, 30],
    },
  },
  {
    id: "heavenly", name: "Heavenly God", rarity: "legendary", kind: "heavenly", art: "heavenly", accent: "#ffe86b",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Fires a lightning laser that punches down the lane — five enemies behind the target take 50% damage. Merging blesses two random towers with points and a surge.",
    dmg: 470, upDmg: 13, ascDmg: 17, rate: 0.95, upRate: 0.02, ascRate: 0.025,
    aspd: 0.06, upAspd: 0.012, ascAspd: 0.018,
    laserBehind: 5, laserBehindMul: 0.5,
    mergeBolts: 2, mergePoints: 2, mergeBuff: 3, mergeBuffT: 13,
    awk1: {
      name: "Positive Lightning",
      desc: "40% chance a merge forks 1-3 extra bolts onto random towers: an extra point each and a 500% attack and attack-speed surge.",
      chance: [0.4, 0.4, 0.4, 0.4, 0.4],
      mult: [1, 1, 2, 2, 3],
      mult2: [5, 5, 5, 5, 5],
      fmt: (m, m2) => `+${m} bolt${m === 1 ? "" : "s"} · +${Math.round((m2 || 0) * 100)}% attack & speed`,
    },
    awk2: {
      name: "Super Charged Ray",
      desc: "10% chance a laser hit superheats the air around the target to 40,000°C — everything nearby detonates in a supersonic shockwave.",
      chance: [0.1, 0.1, 0.1, 0.1, 0.1],
      mult: [110, 125, 145, 165, 190],
      fmt: (m) => `${Math.round(m)} range · anything inside is vaporised`,
    },
  },
  {
    id: "honor", name: "Honor Emperor", rarity: "legendary", kind: "honor", art: "honor", accent: "#ffd76a",
    target: "front", exotic: true, unlockFrags: 1, honor: true,
    desc: "Drag it onto a tower sitting on matching points and that tower grows a point instead of merging away — the Emperor himself is consumed.",
    dmg: 280, upDmg: 8, ascDmg: 11, rate: 0.8, upRate: 0.015, ascRate: 0.02,
    aspd: 0.05, upAspd: 0.01, ascAspd: 0.015,
    awk1: {
      name: "Honor Blessing",
      desc: "16% chance the honored tower grows a second point from the same ceremony.",
      chance: [0.16, 0.16, 0.16, 0.16, 0.16],
      mult: [1, 1, 1, 1, 1],
      fmt: (m) => `16% chance of +${m} extra point`,
    },
    awk2: {
      name: "Super Bless",
      desc: "Every honored tower keeps +15% attack and attack speed permanently for the rest of the run.",
      chance: [1, 1, 1, 1, 1],
      mult: [0.15, 0.15, 0.15, 0.15, 0.15],
      fmt: (m) => `+${Math.round(m * 100)}% attack & attack speed, permanent`,
    },
  },
  {
    id: "supervisor", name: "Supervisor", rarity: "mystical", kind: "supervisor", art: "supervisor", accent: "#ff315c",
    target: "none", exotic: true, unlockFrags: 1,
    desc: "A deep-red sovereign that permanently speeds every tower by 1% per kill, up to +2,000%. Each kill has a 20% chance to amplify that buff tick tenfold. Merging unleashes ten red lightning executions along the path.",
    dmg: 0, upDmg: 0, ascDmg: 0, rate: 1, upRate: 0, ascRate: 0,
    awk1: {
      name: "Hypervisor",
      desc: "The Superbuff amplification rises by 100% each wave, up to 12,000%.",
      chance: [1, 1, 1, 1, 1], mult: [1, 1, 1, 1, 1],
      fmt: () => "+100% amplification per wave · capped at +12,000%",
    },
    awk2: {
      name: "Doomsday",
      desc: "Every merge has a 19% chance to drop a nuclear bomb, instantly destroying enemies within 900m and violently shaking the arena.",
      chance: [0.19, 0.19, 0.19, 0.19, 0.19, 0.19], mult: [900, 900, 900, 900, 900, 900],
      fmt: (m) => `19% merge chance · instant kill within ${m}m`,
    },
  },
  // ---------- the mystical court: two new endgame summons ----------
  {
    id: "eclipse", name: "Eclipse Oracle", rarity: "mystical", kind: "eclipse", art: "eclipse", accent: "#b06bff",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Hurls a collapsing dark moon. On impact it implodes: a violet singularity tears nearby enemies backward along the lane, slows them and burns a share of their maximum health.",
    dmg: 780, upDmg: 22, ascDmg: 30, rate: 1.5, upRate: 0.025, ascRate: 0.03,
    aspd: 0.04, upAspd: 0.008, ascAspd: 0.012,
    splash: 120, upSplash: 6, ascSplash: 8,
    pctHp: 0.06, upPctHp: 0.006, ascPctHp: 0.008,
    slow: 0.5, upSlow: 0.012, ascSlow: 0.016, slowDur: 2.6,
    awk1: awking("Total Eclipse", "splash",
      "Chance the dark moon swallows a far wider patch of lane", [0.35, 1], [0.4, 1.5]),
    awk2: awking("Event Horizon", "execute",
      "Chance the implosion drags anything beneath a health threshold across the event horizon", [0.12, 0.42], [0.18, 0.36]),
  },
  {
    id: "seraph", name: "Astral Seraph", rarity: "mystical", kind: "seraph", art: "seraph", accent: "#8ff0ff",
    target: "front", exotic: true, unlockFrags: 1,
    desc: "Spears the lane with a lance of starlight: it pierces four enemies, arcs a choir of holy bolts through the pack, and every kill it lands restores grid SP.",
    dmg: 520, upDmg: 18, ascDmg: 26, rate: 0.95, upRate: 0.02, ascRate: 0.025,
    aspd: 0.06, upAspd: 0.01, ascAspd: 0.015,
    pierce: 4, upPierce: 1, ascPierce: 1,
    chain: 3, upChain: 1, ascChain: 1,
    spGain: 6,
    awk1: awking("Ascension", "critup",
      "Chance the lance descends as a guaranteed critical starfall", [0.12, 0.45], [1, 1]),
    awk2: awking("Choir of Stars", "chain",
      "Chance the holy arc forks into extra enemies", [0.2, 0.7], [1, 4]),
  },
  // ---------- the storm throne ----------
  {
    id: "godzeus", name: "God of Zeus", rarity: "mystical", kind: "godzeus", art: "godzeus", accent: "#8ceaff",
    target: "all", exotic: true, unlockFrags: 1,
    desc: "Strikes one random enemy with a colossal lightning bolt that wipes bosses, elites and normals outright, straight through every immunity — then stuns the victim for 3 seconds. Cooldown: 2.5s. UPCOMING POWER: every 5 bolt hits give ALL God of Zeus towers +1 point, and points convert into attack speed up to +20%.",
    dmg: 0, upDmg: 0, ascDmg: 0, rate: 2.5, upRate: 0, ascRate: 0,
    zeusCd: 2.5, upZeusCd: 0.01,
    stun: 3, upStun: 0.1, ascStun: 0.5,
    awk1: {
      name: "Cloud Annihilation",
      desc: "When merging, chance to summon two cumulonimbus clouds over random spots of the field. They pour heavy rain and strike lightning bolts every 0.02–0.05s for 10 seconds (+2.5s per tier, bolts 0.005s faster per tier). Every enemy a bolt hits takes damage.",
      chance: [0.04, 0.08, 0.12, 0.16, 0.2, 0.24],
      /** per-bolt damage as a fraction of the enemy's maximum health */
      mult: [0.003, 0.004, 0.005, 0.006, 0.007, 0.008],
      fmt: (m) => `${(m * 100).toFixed(1)}% max HP per bolt · 10s +2.5s/tier`,
    },
    awk2: {
      name: "Electrical Death",
      desc: "Bolts no longer wipe in one strike: each hit consumes 12% of the enemy's maximum health and stuns for 1s instead. At the final tier the wipe returns.",
      chance: [1, 1, 1, 1, 1, 1],
      mult: [0.12, 0.15, 0.18, 0.21, 0.24, 0.27],
      mult2: [1, 1.25, 1.5, 1.75, 2, 2.25],
      fmt: (m, m2) => `consume ${Math.round(m * 100)}% max HP · stun ${m2?.toFixed(2) ?? "1.00"}s`,
    },
  },
  // ---------- NEW MYSTICAL TOWERS ----------
  {
    id: "electrical-protector",
    name: "Electrical Protector",
    rarity: "mystical",
    kind: "speaker",
    target: "none",
    desc: "Merging it triggers the shield that protects towers from enemy attacks for 8 seconds. Every 2 second strikes a lightning to stack the attack speed by 50%.",
    dmg: 0,
    upDmg: 0,
    ascDmg: 0,
    rate: 1,
    upRate: 0,
    ascRate: 0,
    aura: true,
    aspd: 0.02,
    upAspd: 0.005,
    ascAspd: 0.01,
    unlockFrags: 1,
    awk1: {
      name: "Shield Amplifier",
      desc: "When it enters the battlefield, it immediately spawns (+ tower points) shield. Duration increased to 15 seconds. Upgrade: +1 tower points + increase, duration +2s.",
      chance: [1, 1, 1, 1, 1, 1],
      mult: [1, 1, 1, 1, 1, 1],
      mult2: [15, 17, 19, 21, 23, 25],
      fmt: (m, m2) => `+${m} tower points shield · duration ${m2}s`
    },
    awk2: {
      name: "Sonic Boom",
      desc: "When shield disappears or breaks, slams a white powerful white wall from end to start point. Knocking the enemies back to start point. In speeds of 30 miles per second. Upgrade: +1 meter knock, +2 miles speed.",
      chance: [1, 1, 1, 1, 1, 1],
      mult: [1, 2, 3, 4, 5, 6],
      mult2: [30, 32, 34, 36, 38, 40],
      fmt: (m, m2) => `+${m}m knock · ${m2} miles/s`
    }
  },
  {
    id: "gravity-phyxic",
    name: "Gravity Phyxic",
    rarity: "mystical",
    kind: "gravity",
    target: "front",
    desc: "Fires a purple gravity projectile. When hits enemy, explodes in 2 meter radius. Attack speed: 2s (-0.05s upgrade and -0.1s ascent), attack: 8000 (+250 upgrade and +500 ascent).",
    dmg: 8000,
    upDmg: 250,
    ascDmg: 500,
    rate: 2.0,
    upRate: 0.05,
    ascRate: 0.1,
    splash: 200,
    upSplash: 5,
    ascSplash: 10,
    unlockFrags: 1,
    awk1: {
      name: "Pressure Waves",
      desc: "Every 5 seconds, spawn a purple pit that drags enemies for about 2 seconds before striking 2 powerful lightning bolt at them. (in 0.1s interval). Upgrade: -0.2s cooldown, -0.1s warm-up, +2 lightning bolts.",
      chance: [1, 1, 1, 1, 1, 1],
      mult: [5, 4.8, 4.6, 4.4, 4.2, 4.0],
      mult2: [2, 4, 6, 8, 10, 12],
      fmt: (m, m2) => `${m}s cooldown · ${m2} bolts`
    },
    awk2: {
      name: "End of Life",
      desc: "Merge the tower and spawns 3 giant asteroids down the random spot in the path. Explodes 6 meters across and strikes 13 deep orange lightning bolts in the burning pit for 26 seconds. Upgrade: +1 asteroid, +0.8m radius, +2 bolts, +2s duration.",
      chance: [1, 1, 1, 1, 1, 1],
      mult: [3, 4, 5, 6, 7, 8],
      mult2: [6, 6.8, 7.6, 8.4, 9.2, 10.0],
      fmt: (m, m2) => `+${m} asteroids · ${m2}m radius`
    }
  }
];

/** Tier VI extends every tower's two awakening paths beyond the original five tiers.
 * It adds half of the Tier IV→V increase (or +25% when the old tiers were flat),
 * while probability values remain capped at 100%. */
export const AWAKENING_MAX_TIER = 6;
function extendAwakeningToTierSix(spec: AwkSpec | undefined) {
  if (!spec) return;
  const extend = (values: number[], cap = Number.POSITIVE_INFINITY) => {
    if (values.length >= AWAKENING_MAX_TIER) return;
    while (values.length < AWAKENING_MAX_TIER) {
      const prev = values[values.length - 2] ?? 0;
      const last = values[values.length - 1] ?? 0;
      const delta = last - prev;
      // Preserve direction for descending stats such as cooldowns; flat stats
      // continue gaining a small 25% step at Tier VI.
      const bump = delta > 0 ? delta * 0.5 : delta < 0 ? delta * 0.5 : last > 0 ? last * 0.25 : 0;
      values.push(Math.round(Math.min(cap, last + bump) * 1000) / 1000);
    }
  };
  extend(spec.chance, 1);
  extend(spec.mult);
  if (spec.mult2) extend(spec.mult2);
}
for (const tower of TOWERS) {
  extendAwakeningToTierSix(tower.awk1);
  extendAwakeningToTierSix(tower.awk2);
}

/** tower id -> art family used by the canvas + the menu icon */
export function towerArt(def: TowerDef): string {
  return def.art || def.id;
}

export const TOWER_BY_ID: Record<string, TowerDef> = Object.fromEntries(
  TOWERS.map((t) => [t.id, t])
);

export const ROMAN = ["", "I", "II", "III", "IV", "V", "VI"];

export const MAX_MENU_LEVEL = 25;
export const MAX_BATTLE_LEVEL = 25;
export const POINT_STEP = 0.25; // +25% attack speed per point
export const POINT_DMG_STEP = 0.3; // +30% damage per point
export const ASC_DMG_MUL = 1.55; // every battle level multiplies damage
export const MAX_POINTS = 8;
export const SP_BASE_COST = 100;
export const SP_COST_STEP = 10;
/** ascension starts at 100 SP and climbs 100 a press — a deliberate sink that
 *  keeps summoning cheap and makes every in-battle upgrade a real decision */
export const ASC_BASE_COST = 100;
export const ASC_COST_STEP = 100;

/**
 * Towers never earn points on their own — the only sources are the Point Surge
 * run-shop item and merging two equally-levelled towers.
 */

/** How many towers a run starts able to summon (paid for out of the starting SP). */
export const SPAWN_BUDGET_TOWERS = 4;

/** SP price of one summon, given how many summons were already bought this run. */
export function spCost(spend: number) {
  return SP_BASE_COST + SP_COST_STEP * spend;
}

/** SP price of one ascension, on its own ladder (never affected by summons). */
export function ascSpCost(spend: number) {
  return ASC_BASE_COST + ASC_COST_STEP * spend;
}

/** base SP every kill pays: 10, elites x5, bosses x10 */
export const KILL_SP = 10;
export const KILL_SP_ELITE = 5;