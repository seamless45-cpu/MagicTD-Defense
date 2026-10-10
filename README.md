# MagicTD Defense

A 2D browser tower defense / merge game built with React 19, TypeScript, Tailwind CSS 4 and Vite.
Everything — menus, engine, audio, art and particles — is code; there are no image or audio assets.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm run build      # bundles the game and updates the committed deploy artifact
npm run preview    # serve the production build
npm test           # vitest + jsdom suite (27 tests)
npm run typecheck  # tsc --noEmit
```

The production build is a single self-contained HTML file (~310 kB, no external JS/CSS chunks)
thanks to `vite-plugin-singlefile`, so it can be opened straight from disk or dropped on any
static host.

### Two entry HTML files (important)

| File | Role |
| --- | --- |
| `app.html` | **Source entry.** The Vite dev/build template. Edit this one. |
| `index.html` | **Generated deploy artifact** — committed on purpose. Do not edit. |

GitHub Pages is configured to serve this branch's root, so the playable build has to live at
`./index.html`. `npm run build` runs `vite build` and then `scripts/sync-pages.mjs`, which copies
the built file to both `dist/index.html` and the repo-root `index.html`. The dev server still
serves the app at `/` (it rewrites `/` to `app.html`).

**After changing game code, run `npm run build` and commit `index.html`**, otherwise the
published site keeps serving the previous version.

## How to play

Pick a mode from the **Command Center**:

| Mode | Length | Notes |
| --- | --- | --- |
| **Battle** | 12 rounds | Solo gauntlet. Win it to bank gold, gems and fragments. |
| **Endless** | no limit | Score attack: survive as long as possible. Rewards scale with your depth — gold grows quadratically, gems every 3 waves, a token every 5. |

**Enemies get 57% stronger every wave** (×1.57 per wave, compounding), and both the wave banner
and the HUD show the current multiplier. Each wave holds two more enemies than it used to, and
every round-clear payout (gold + gems) was raised 40%.

### Bosses

Every 4th round a boss leads the wave in:

| Boss | Onset | Notes |
| --- | --- | --- |
| **Warlord** | rounds 4, 8, 12… | 5 lives, 15× HP, 20% armour |
| **Rift Overlord** | round 16+ every 4th | 8 lives, 26× HP, 28% armour, purple |

Bosses arrive with a **cutscene** (WARNING card, name, round, skill kit — tap to continue; the sim
holds while it plays), then fight with a **health bar** and four skills, each announced in the arena:

| Skill | Effect |
| --- | --- |
| **Rift Call** | summons a pack of minions behind itself |
| **Void Step** | blinks a chunk of the path forward |
| **Bulwark** | shields itself (45% damage taken) for 3.4s |
| **Blood Frenzy** | below 45% HP: +45% speed, ember aura, heavy burst | Your towers keep up because their damage grows
multiplicatively: each battle level multiplies damage ×1.55, each point +30%, and Power Plant /
S-Speaker auras multiply on top.

### Heroes

Equip one hero on the Command Center; its ability is the hero card in the **bottom-right** of the
arena, wrapped in a sweeping cooldown ring (the portrait dims and the ring drains while the skill
recharges, then pulses green with a READY ping).
Heroes level up to 10 with gold — each level adds 30% ability power and shaves 3% off the cooldown
(floored at 60%).

| Hero | Cooldown | Ability |
| --- | --- | --- |
| **Nova** | 25s | Screen-wide detonation: heavy damage + brief stun on everything. |
| **Glacier** | 30s | Flash-freezes every enemy for 4s, then leaves them chilled and slowed. |
| **Ember** | 30s | Ignites the field: burst damage plus a long burning wound. |
| **Overdrive** | 35s | Supercharges every tower: +150% attack speed and +50% damage for 8s. |
| **Thunder God** | 20s | Lightning bolts walk down the lane, chaining between everything they touch and stunning them. |

- **Summon:** tap **SUMMON** (top-left) to drop a random unlocked tower straight onto a free build
  cell — no dragging. SP cost rises with every summon, and a full grid converts the summon into a
  bonus point on a random tower. The path (left column, right column, bottom row) is blocked, so
  there are 15 build cells.
- **Arena zoom:** the − / % / + control sits in the bottom-left of the arena; zoom from fitted up to
  2× and the view scrolls when it overflows. The setting is remembered.
- **Merge:** drag a placed tower onto another tower with the **same point count** to fuse them into
  a random tower with +1 point (max 8). Higher points = faster firing and +30% damage per point.
- **Points:** placed lineup towers pulse points to each other as they shoot (+1 point every 3rd
  volley) — lineup order is the pulse ring.
- **Ascend:** each slot holds a tower, not a button. Drag the gold **ASCENT** token from the left of
  the bottom bar into a tower's slot (or tap the token, then tap a slot) to buy a battle level
  (max 6, ×1.55 damage each). Dropping it on a tower on the grid works too.
- **Summon:** spend SP for a random unlocked tower in an empty lineup slot. Cost rises each time.
- **Battle shop:** spend the gold you earn during a run (gold is a run currency, spent in the
  shop and paid out at the end of the run).
- **Battle SFX / Rich FX / Damage Numbers / Screen Shake / Battlefield Guides / Auto-Start Waves /
  Reduced Motion / Performance HUD** all live in the settings gear (top right), along with master
  volume and save export/import.
- Enemies leak toward the portal on the right and cost lives (20); at 0 lives the run ends.
  Winning a run banks gold, gems and fragments.

### Summoning and ascent

The battlefield starts **empty**. You get enough SP at the start of a run to summon exactly
**four towers** (120 / 195 / 270 / 345 SP), and each summon is paid for out of that pool before the
first wave arrives. Towers are never placed for free, and **towers no longer earn points on their
own** — points only come from merging two equally levelled towers or buying Point Surge in the run
shop.

**Ascent is a button, not a drag.** Every deployed tower card in the bottom bar carries its own
`ASCENT` button (showing the SP price and how many copies it will upgrade). One press upgrades
**every deployed tower of that same type at once**, so a family always shares one battle level.
Summoning and ascending have separate SP price ladders, so spamming summons never price-gouges
your upgrades.

## Progression

- **Shop:** chests give gold + tower fragments; rarer chests can also drop gems and tokens.
- **Towers:** fragments unlock locked towers (Arrow/Cannon/Ice Cube start unlocked), upgrade menu
  levels 1→15, and `Ascent All` raises every unlocked tower by one level for gold.
- **Awakenings:** exotic legendary towers (Lightning Princess, Hellstorm) have two awakening tracks
  that cost Magic Tokens, unlock at menu level 10 / 15 and go up to tier V.
- Progress saves to `localStorage` under `magictd_save_v1`; Settings → Reset Progress wipes it.

### Daily Rewards (resets at 07:00)

The 7-day streak calendar lives on the Command Center. **A "game day" starts at 07:00 local
time**, not at midnight — claiming at 06:59 and again at 07:01 counts as two different days.
The panel shows a live countdown to the next rollover. Miss a day and the streak resets to 1.

| Day | Reward |
| --- | --- |
| 1 | 1,200 gems |
| 2 | Silver Chest |
| 3 | Legendary Chest |
| 4 | ×5 random legendary tower fragments |
| 5 | 25,000 gold + 900 gems |
| 6 | ×5 Basic Chip Module + ×2 Advanced Chip Module |
| 7 | ×3 Legendary Chests |

Chest days roll their contents on claim, so the loot the animation shows is exactly what is
banked. Every claim — daily streak, event bonus, shop chest, guild chest, competition payout —
plays the **reward claim ceremony**: the chest rattles, bursts open with a shock ring and spark
shower, and each reward line flies in one after another (`RewardClaim` in `src/components/ui.tsx`).

### Daily events

One event is live per weekday and each one applies a real modifier (see `eventBonus()` in
`src/game/data.ts`), plus a once-a-day bonus you can claim from the Specials tab or the home
banner.

| Day | Event | Effect |
| --- | --- | --- |
| Monday | **Luck Hunting** | +1 chest fragment, fragment rolls bias rare |
| Tuesday | **Chest Box** | −25% on every chest in the Shop |
| Wednesday | **Trophy Competition** | +30 trophies per win, defeats only cost 10 |
| Thursday | **Items Finding** | Victories drop chip modules |
| Friday & Saturday | **Mineshaft** | +60% gold from every run |
| Sunday | **Survive Lightning** | ×2 gems from runs, +15% enemy health |

### Trophies & competition

Battle runs stake ladder trophies: **a victory pays +70 and a defeat costs −20** (never below 0).
Endless is a score mode and does not touch the ladder. Trophies sort you into eight leagues
(Copper → Rift Legend) and feed the **weekly competition** on Specials → Competition: a standings
board seeded from the week stamp, with a once-a-week payout for Champion / Top 3 / 10 / 25 / 50.

### Chips, Support and Heroes chests

Chip modules (Basic, Advanced, Elite) are the new crafting currency. The Shop now sells six chest
grades including the **Support Chest** (chip modules + gold) and the **Heroes Chest** (hero
shards). Banking `HERO_SHARD_COST` shards levels a hero for free, without spending gold.

### Guild

Joining a guild is now real state on the save. Guilds are gated behind a trophy requirement and
each one carries a perk. Members get a contribution level fed by daily donations (3 per game day),
a free daily guild chest, a guild-coin store, weekly war objectives tracked against your own
counters, a roster pulled from the ladder, and a chat you can post in.

### Towers

| Tower | Rarity | Role |
| --- | --- | --- |
| Arrow | Normal | Cheap single target, self attack-speed buff |
| Cannon | Normal | Splash explosion (scales with ascension) |
| Ice Cube | Normal | Chance to freeze for 3s |
| S-Speaker | Decent | Aura: attack speed of orthogonal neighbours |
| Arcane Swarm | Decent | Volley of three homing bolts at three different enemies |
| Tesla Coil | Decent | Chaining lightning |
| Gatling | Epic | Bursts of rapid fire every 5s |
| Energy Core | Epic | Knockback + stun |
| Chrono Spire | Epic | Time field: slows everything nearby; chilled enemies take +25% damage |
| Void Cannon | Epic | Siege gun that shaves 5%+ of the target's max HP per hit — the endless answer |
| Lightning Princess | Legendary | Hits every enemy on screen; exotic awakenings |
| Hellstorm | Legendary | Fireballs, crit scaling, merge-triggered blaze |
| Icestorm | Legendary | Icicles cut a % of current HP |
| Plasma Lance | Legendary | Pierces a whole file of enemies; exotic awakenings (Overcharge, Searing Path) |
| Power Plant | Legendary | Aura: attack speed + attack of neighbours |
| Slingshot | Normal | Fast single-target pebble, self attack-speed buff |
| Flamethrower | Normal | Sets the target alight for burn damage over time |
| Spike Trap | Normal | Ground burst that splashes damage around the hit |
| Boomerang | Normal | Piercing disc that keeps hitting down the lane |
| Toxic Sprayer | Normal | Splash volley plus a stacking poison burn |
| Axe Thrower | Decent | Piercing axes with a splash on impact |
| Frost Spire | Decent | Freeze chance, slow and a chilling aura |
| Siege Mortar | Decent | Huge splash, slow rate of fire |
| Laser Cutter | Decent | Rapid chaining beam |
| Missile Battery | Epic | Four homing rockets with splash damage |
| Dragon's Maw | Legendary | Heavy splash + burn; every kill stacks damage (exotic: Inferno Roar, Molten Carapace) |
| Sunforge | Legendary | Hits the whole field with burning flares (exotic: Supernova, Solar Wind) |

## Gift codes

Players redeem codes in **Settings → GIFT CODES** (they are matched ignoring case, spaces and
dashes, and each code can only be used once per save).

Codes are **not** shipped by default — you add your own rows to `GIFT_CODES` in
`src/game/data.ts` and rebuild:

```ts
export const GIFT_CODES: Record<string, GiftCode> = {
  LAUNCHDAY: { label: "Launch day cache", gold: 1000, gems: 10, tokens: 2 },
  THUNDER:   { label: "Thunder God blessing", frags: { rarity: "epic", n: 4 }, gems: 3 },
  ARROWHAND: { label: "Arrow hand-out", towers: [{ id: "arrow", n: 10 }] },
};
```

Every field is optional: `gold`, `gems`, `tokens`, `frags: { rarity, n }` (random fragments of a
rarity) and `towers: [{ id, n }]` (fragments for a named tower). `label` shows up in the
confirmation toast. Redeemed codes are stored in `save.redeemed` and listed under the input.

## PWA

MagicTD is installable. `public/manifest.webmanifest` + `public/sw.js` + the icon set are mirrored
to the repo root by `npm run build` (Pages serves the branch root), the service worker caches the
shell for offline play, and **Settings → APP → Install** is wired to the browser's install prompt.
The favicon/app icons are the pastel MagicCloud artwork (cloud mascot, wizard hat, castle) —
replace `public/icons/icon-*.png` (192/512) plus `icon-maskable-512.png`, `apple-touch-icon.png`
and `favicon-64.png` to change them.

## Layout

```
src/
  App.tsx              screen router + save state
  components/ui.tsx    icons, currency bar, toasts, modal
  components/ErrorBoundary.tsx  crash panel (never leave a blank page)
  game/data.ts         tower/enemy definitions, wave and cost formulas
  game/save.ts         localStorage save schema
  game/audio.ts        WebAudio synth SFX (no audio files)
  screens/Battle.tsx   canvas engine: update/draw loop, input, merging, FX
  screens/Menus.tsx    loading, home, specials, guild, settings
  screens/Shop.tsx     chests and reward rolls
  screens/Towers.tsx   lineup management, upgrades, awakenings
  __tests__/           vitest suite: data, app integration, deployed artifact
app.html               Vite entry (edit this)
index.html             generated build served by GitHub Pages (do not edit)
public/                manifest, service worker and app icons (mirrored to the root by the build)
scripts/sync-pages.mjs publishes dist/app.html + the PWA assets to the repo root
```

## Tests

`npm test` boots the real app in jsdom with a stubbed 2D canvas and plays through it:
loading → every tab, settings toggles + reset persistence, buying/opening/collecting a chest,
trading gold for fragments and gems for tokens, previewing + upgrading towers, waking a tower with
a congratulations ceremony, claiming the daily streak, upgrading a hero, zooming the arena, and a
battle run that summons towers onto the grid, buys from the run shop, spawns wave 1 and abandons.
It also pins down the new systems: the 07:00 game-day rollover, the exact 7-day reward table and
its claim ceremony, the weekday event rotation and its modifiers, the +70/−20 trophy swing with
league tiers, the weekly competition board and payout tiers, the Support/Heroes chest rolls, chip
modules, hero shards, the full guild loop (join gating, donation caps, chest, coin store, war
objectives) and the reworked enemy palettes/silhouettes.
It also covers the reworked balance (4-summon opening budget, +2 enemies per wave, +40% payouts),
the boss kit and the new boss cutscene/health bar/skill banners, gift-code redemption, the ascent
buttons, the moved hero card with its cooldown ring, the save-file helpers, tower/wave/cost
formulas and the committed `index.html` artifact (including its PWA plumbing) end-to-end, so a
broken or missing build cannot reach the published site.

## Deployment

GitHub Pages serves this branch's root (`https://seamless45-cpu.github.io/MagicTD-Defense/`).
Because the game is a single self-contained file, publishing is just: `npm run build` and commit
`index.html`. The boot guard in the HTML means that if the published file is ever wrong (for
example the dev template gets served), the page explains the failure instead of going blank.

## Daily tasks, upgrade animations, FX overhaul and reworked skills

**Daily tasks** — eight objectives (play, win, waves, kills, skill casts, upgrades,
chests, gold spent) reset at 07:00 with the rest of the daily content. Each pays
gold + gems and banks points toward three milestone caches (30 / 60 / 100 pts,
topping out at "Perfect Day": two legendary chests, 1000 gems and elite chips).
They live on a new **TASKS** tab in Specials, and unclaimed rewards raise a badge
on the Specials nav button so you never miss one.

**Upgrade animations** — levelling a tower or hero now plays a full ceremony: a
light burst with expanding rings, a radial ray fan, flying confetti chips, the
level counter physically flipping from the old number to the new one, and the
stats that actually changed rolling in beneath with before → after deltas. In
battle, summoning, point gains and Ascent All each throw a rarity-coloured
flourish — hex runes, a light pillar and climbing chevrons — with Ascent All
staggering one per tower so the whole board lights up in a wave.

**FX overhaul** — the particle system gained shockwaves, radial glows, spinning
shards, four-point sparkles, drifting embers and velocity-stretched sparks, all
composited additively so overlapping effects burn to white. On top of that:
screen flashes, camera punch-zoom, chromatic aberration, hit-stop, and a
vignette that pulses through a hero cast.

**Reworked skills** — every hero ultimate is now a timed, multi-phase cast with
an on-screen banner tracking its phases:

| Hero | Ultimate | What it does |
| --- | --- | --- |
| Nova | **Singularity** | Tears a rift that drags and stuns the field, drops three meteors, then collapses for damage scaled by how many enemies it caught |
| Glacier | **Absolute Zero** | Encases everything in ice (doubling damage taken) and shatters it, hitting hardest on enemies that are already hurt |
| Ember | **Firestorm** | Walks a barrage of meteors across the lane with compounding burn, leaving lava pools behind |
| Overdrive | **Time Dilation** | Slams time to 40%, overcharges every tower and fires free guaranteed-crit volleys |
| Thunder | **Storm Sovereign** | Rolls a chaining bolt front down the lane, marks survivors with static that re-arcs on death, then lands a Sovereign Strike pillar |

## Economy rework, reworked claim flow and a rebuilt battlefield

**Chest prices** — every headline chest is now gem-priced: Common 80, Silver 200,
Heroes 500, Epic 800, Legendary 2000. A fresh account starts with 300 gems so the
first chest is always reachable, and daily rewards/tasks/events supply the rest.

**Legendary unlocks** — all seven legendary towers (Lightning Princess, Hellstorm,
Icestorm, Power Plant, Plasma Lance, Dragon's Maw, Sunforge) now unlock from a
**single** fragment instead of 15, so pulling one legendary fragment immediately
puts the tower in your roster.

**Compact claim UI** — rewards land as a two-column grid of tiles (icon, label,
amount) instead of a tall stack of rows, so a ten-line legendary haul fits on one
phone screen. The card, title and button were all tightened to match.

**Chest opening, rebuilt** — a five-beat sequence instead of a shake-and-pop:
**charge** (the chest compresses and pulls light inward), **shake** (violent
accelerating rattle), **crack** (seams split and ten beams of light blast out,
spinning and stretching), **burst** (the lid tears off, tumbles away and throws
26 pieces of debris while the card itself takes a recoil kick), then the loot.
Each beat has its own sound — a rising charge whine and a heavy lid crack.

**Jackpot VFX** — claiming **1000+ gold** or **100+ gems** triggers a downpour of
actual coins and gems tumbling end-over-end down the screen with drift and
parallax, denser the bigger the payout, under a cascading coin-chime or glassy
gem-arpeggio soundtrack, with a pulsing ★ JACKPOT ★ tag on the card.

**Battlefield rework** — the arena was rebuilt from the backdrop up: a drifting
two-bloom nebula and a parallax twinkling starfield; a raised arena slab with a
drop shadow, bevelled rim and pulsing etched circuitry; build pads turned into
notched octagonal tech platforms with real thickness, socket rings and crosshairs;
the lane turned into a sunken stone road with a trench shadow, kerbs, paving ticks
and a live energy conduit pulsing from spawn to exit; ambient motes drifting over
the whole plate; and the portals rebuilt as stone-ringed wells with rune
buttresses, counter-rotating rings, swirling vortex arms and motes streaming out
of the spawn and into the exit.
