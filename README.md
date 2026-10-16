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
| **Void Titan** | round 32+ every 4th (plus an extra one every 8th) | 10 lives, 34× HP, 30% armour, an armoured siege colossus that walks in with **all nine skills** |

Bosses arrive with a **cutscene**: scanning bars sweep the screen while three rings spiral in, the
boss's own silhouette rises behind the name (drawn per shape, in its colours), and the card prints
the boss **title**, the live **stat block** (health multiplier, armour, lives, bounty) and its whole
skill kit chip by chip. A countdown badge ticks the last three seconds; when it hits zero the rings
**lock on** — the screen flashes the boss colour, the silhouette snaps to full brightness and the
readout flips to **ENGAGED** as the run resumes. Tap anywhere to skip. The sim holds while it plays.

Bosses then fight with a **health bar** and their kit, each skill announced in the arena:

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

- **Summon:** tap **SUMMON** (top-left) to drop a tower straight onto a **random free build cell** —
  no dragging, and no "summon plus upgrade" bundle: a summon is only ever a new tower. SP cost rises
  with every summon, and it is the **only** way a new tower type reaches the board. If every cell is
  taken the summon refuses and says so, because freeing a cell is the merge's job. The path (left
  column, right column, bottom row) is blocked, so there are 15 build cells.
- **Arena zoom:** the − / % / + control sits in the bottom-left of the arena; zoom from fitted up to
  2× and the view scrolls when it overflows. The setting is remembered.
- **Merge:** drag a placed tower onto another tower with the **same point count**. The tower you
  dropped onto keeps its identity and goes up a point tier (max 8) — the merge never rolls a new
  tower type, so it is a pure upgrade that also frees the cell the dragged tower occupied. Higher
  points = faster firing and +30% damage per point.
- **Points:** placed lineup towers pulse points to each other as they shoot (+1 point every 3rd
  volley) — lineup order is the pulse ring.
- **Ascend:** the bottom bar is **fixed** — six cards, one per rotation tower, in rotation order.
  Spawning towers changes the copy count and the battle level on a card, never the card set, so the
  buttons can never duplicate or shift under your thumb. Press **ASCENT** on the card that owns the
  tower type you want to push (max battle level 6, ×1.55 damage each).
- **Battle shop:** spend the gold you earn during a run (gold is a run currency, spent in the
  shop and paid out at the end of the run).
- **Battle SFX / Rich FX / Damage Numbers / Screen Shake / Battlefield Guides / Auto-Start Waves /
  Reduced Motion / Performance HUD** all live in the settings gear (top right), along with master
  volume and save export/import.
- Enemies leak toward the portal on the right and cost lives (20); at 0 lives the run ends.
  Winning a run banks gold, gems and fragments.

### Summoning and ascent

The battlefield starts **empty**. You get enough SP at the start of a run to summon exactly
**four towers** (100 / 110 / 120 / 130 SP — the opening pool is 460), and each summon is paid for out
of that pool before the first wave arrives. Towers are never placed for free, and **towers no longer
earn points on their own** — points only come from merging two equally levelled towers or buying
Point Surge in the run shop.

**Ascent** runs on its own, steeper ladder: the first press of a run costs **100 SP** and every press
after that costs **100 more** (100 / 200 / 300 / …), so cheap summons never cheapen an upgrade.

Towers spawn **only** through the random-grid summon — there is no combined spawn-and-upgrade path,
and no top-of-screen board duplicating the loadout: the HUD is a single compact row of currency
pills (SP, gold, lives, wave, enemies left, towers deployed, merged crit, run shop).

**The bottom bar is fixed.** It renders exactly one card per rotation tower (six max), always in the
same order, whether or not that tower is on the board — an undeployed card reads `NOT DEPLOYED`. Each
card carries its own **ASCENT** button showing the SP price and how many copies it will upgrade; one
press upgrades **every deployed tower of that same type at once**, so a family always shares one
battle level. Because the bar is built from the rotation rather than from the board, summoning and
ascending cannot duplicate, reorder or drop a button. Summoning and ascending have separate SP price
ladders, so spamming summons never price-gouges your upgrades.

## Progression

- **Shop:** chests give gold + tower fragments; rarer chests can also drop gems and tokens.
- **Towers:** fragments unlock locked towers (Arrow/Cannon/Ice Cube start unlocked), upgrade menu
  levels 1→15, and `Ascent All` raises every unlocked tower by one level for gold.
- **Awakenings:** **every tower in the roster** has two awakening tracks (34 of them are exotic and
  read as such), costing Magic Tokens, unlocking at menu level 10 / 15 and climbing to tier V. Each
  panel spells its own tiers out: "+12% crit rate", "40% of boss max HP every 2.5s", and so on.
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

### Monthly events

The calendar has its own modifier layer on top of the weekday rotation — one event per month,
stacking with whatever weekday event is live. Open **Specials** to see the live card and the whole
year at a glance:

| Month | Event | Perk |
| --- | --- | --- |
| January | New Year Arsenal | Tower upgrades -15% gold |
| February | Heartfire | +35% SP per kill |
| March | Rift Winds | Enemy HP -8% · gold +25% |
| April | Awakening Season | +1 chest fragment · fragment rarity bias +0.3 |
| May | Golden Bloom | +55% gold from every run |
| June | Gem Rain | +90% gems from every run |
| July | Midyear Siege | +45% SP per kill · enemy HP +8% |
| August | Tower Festival | Tower upgrades -20% gold |
| September | Bounty Hunt | +40% gold · +25% SP per kill |
| October | Nightfall | 2x gems from runs · enemy HP +12% |
| November | Harvest | +65% gold · +1 chest fragment |
| December | Winter Festival | +55% gems · +20% SP · tower upgrades -10% |

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
| Reaper's Toll | Legendary | Shaves 20% of the target's max HP per hit and reaps anything under the execute line (Last Rites, Soul Tithe) |
| Prism Array | Legendary | Splits one beam into four that each find their own enemy, then burns them (Refraction, Scorch) |
| Aegis Core | Legendary | Support: fires nothing, projects a huge attack-speed/power aura and pulses area damage on a timer (Bulwark Field, Retribution) |
| Hellgate | Legendary | Rips a burning gate open on the lane: colossal splash damage and a **lake of fire** left burning behind it (Gates Undone, Lake of Fire) |
| Nova Cannon | Legendary | Three-shell salvo, each shell blooming into a wide starburst (Nova Core, Supernova Bloom) |
| Gravity Well | Legendary | Support: pulses on a timer and **drags the horde backwards** down the lane (Event Horizon, Collapse) |
| Thunder Crown | Legendary | Sky pillars on up to six targets, then forks the light between them (Storm Judge, Chain Crown) |
| Void Ripper | Legendary | A lance through a whole file that eats a slice of every max HP and leaves a burning rift (Rift Tear, Rift Fire) |
| Soul Furnace | Legendary | Feeds on kills: each one stokes the fire, and every kill pays a gold bounty (Ember Feed, Ash Tithe) |
| Maelstrom | Legendary | Whirling pool of blade-wind that chews, slows and drags everything inside (Undertow, Drowning Rot) |
| Starfall Battery | Legendary | Marks a handful of enemies and calls burning rocks down on their heads (Guided Rocks, Double Barrage) |
| Chrono Lock | Legendary | Freezing shots, staggered blasts and a long chill — time stops around the target (Deep Lock, Clockwork Chill) |
| Grave Bloom | Legendary | Heavy percent-of-max-HP strikes on the wounded, and a purse for every kill (Grave Tithe, Bloom Offering) |
| Rift Colossus | Legendary | Slow siege shells that **shatter armour** on impact and flatten a whole cell (Siege Core, Colossus Rage) |
| Clone | Legendary | Drag any equal-point tower onto it to **copy** that tower — the original stays. Awakened: Super Clone (any points + +200% attack speed), Perfect Replica (bonus point) |
| Demon Execution | Legendary | Every 5s a red bolt executes normal enemies outright and tears 50% of a boss's **maximum** health (Rapid Strike, Demon Ritual) |
| Heavenly God | Legendary | A lightning laser that punches down the lane, burning five enemies behind the target for 50% (Positive Lightning, Super Charged Ray) |
| Honor Emperor | Legendary | Drop it on a tower sitting on matching points and that tower grows a point — the Emperor is consumed, never merged away (Honor Blessing, Super Bless) |

## Mailbox

Every account has an inbox of **five static messages** — a welcome gift, the season opener, a note on
the new arsenal, one on awakenings and a titan warning from the scouts. Messages carry an optional
attachment (gold, gems, magic tokens, chip modules or rolled tower fragments); **COLLECT ALL** takes
every waiting attachment in one press and merges the loot into a single reward card. Reading a
message marks it read, individual attachments can be taken or the message deleted, and the nav tab
carries a badge for anything unread or uncollected.

Messages are rows in `MAIL` in `src/game/data.ts`; the save only stores which ids are read, claimed
and deleted, so shipping a new message is a one-row change.

## Season rewards

The season track runs on a fixed **30-day cycle keyed to the epoch**, so every account is on the same
season number. Season points are **derived, never stored**: `trophies × 1 + wins × 12`. Ten tiers run
from **Scout** (0 points) to **Rift Sovereign** (4,600), each paying once — gold, gems, magic tokens,
chip modules or fragments.

The Season tab shows the season number and a live countdown, the current tier and how many points the
next one needs, a progress bar with a tick per tier, and a card per tier with its payout and a
**COLLECT** button (greyed out until it is reached). **COLLECT READY** sweeps every crate you have
unlocked. A new season clears the claim state and banks your best points as a record.

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

## Boot sequence, fullscreen, knob switches and the crit-damage pool

**Launch intro** — opening the game now plays a cold open: black, a spark that
collapses into the emblem, a shockwave, the logo snapping in with a spinning
halo, then `MAGICTD` slamming down one letter at a time, `DEFENSE` stretching out
under it and the tagline fading up. Tap or press any key to skip. Reduced motion
jumps straight to the loading screen instead.

**Loading screen, rebuilt** — the checklist, segments, build tag and skip button
are gone. What's left is exactly two things: the logo and title pinned to the
top, and a **rocket car** screaming along a light-track at the bottom. The car's
position *is* the progress bar — the road fills behind it, the pips light up as
it passes, and when the track is full it boosts off the top of the screen and
drops you into the game. A single rotating tip line sits under the road.

**No title inside the game** — the wordmark was removed from the in-game top bar,
which stops the bar wrapping on narrow phones. Branding now lives on the boot
screens only; the top bar is currencies, fullscreen and settings.

**Fullscreen** — a fullscreen control in the top bar, another next to the arena
zoom widget in battle, and a switch in Settings → Display. It uses the standard
API with the WebKit fallbacks, and the switch reads the browser's real
fullscreen state rather than guessing.

**Knob switches** — every ON/OFF button in Settings is now a chunky knob toggle:
a bordered rail, a rolling head with a grip, a green glow and a ripple when it
throws. The accessibility contract is the same (`role="switch"`,
`aria-checked`, `data-testid="toggle-*"`).

**Gift codes removed** — the code field, the redeemed-code list and the
underlying table, save field and helpers were all deleted.

**Crit damage, merged account-wide** — crits now use one number built from every
tower you own: **+8% crit damage for every upgrade level on every tower**, over a
60% base, capped at **90,000%**. The Towers screen opens with a **CRIT DAMAGE**
band showing the merged total, the upgrade count feeding it and the multiplier
crits actually hit for; every upgrade ceremony lists the crit delta as its first
row; and the battle HUD carries the stat next to a live crit counter and the
biggest hit of the run.

**Crit effects** — crits now come in four tiers instead of one. A tier-4
"APOCALYPTIC!" crit throws layered shockwaves, a spark storm, star sparkles,
spinning debris, a ground ring, a bolt of light back to the firing tower, a
screen flash, a colour-split camera punch, a freeze-frame and its own heavier
sound. Lower tiers scale the same package down so ordinary hits stay readable.
The floating number is labelled, and tier-3+ crits print the multiplier.

**Boss skills** — bosses now have kits instead of a fixed four:
`Rift Call`, `Void Step`, `Bulwark` and `Blood Frenzy` are joined by
**Null Field** (hexes up to four nearby towers, cutting their fire rate),
**Soul Devour** (eats its own minions to heal), **Meteor Fall** (telegraphed
rocks that knock towers offline), **Rift Chains** (shields every minion around
it) and **Warp Surge** (wrenches the whole horde down the lane). The Devil walks
in with six of them, the Rift Overlord with all nine, and the boss bar lists the
kit it actually brings.

**Six new towers** — Rime Cannon (splash + freeze), Soul Siphon (SP per kill),
Quake Pylon (crater + stun), Storm Caller (five-way chain), Plague Mortar (huge
crater, rot and slow) and the legendary **Railgun** (900 damage skewering six
enemies, with Overpenetration and Rail Burn awakenings).

## Fixed ascent bar, vertical sky bolts, Void Titan, icon grid and mail/season

- **Spawning is grid-only.** A summon always deploys a fresh tower on a random free cell, and the
  old "spend the summon on a point instead" fallback is gone. The auto-merge that used to fire on a
  full board is gone too: on a full board the summon refuses and tells you to merge by hand.
- **Merging only upgrades.** A same-point pair now fuses into the tower you dropped onto — same
  type, +1 point — instead of re-rolling into a random tower, so new tower types can only ever
  arrive through the summon.
- **The top installed-tower strip is gone.** The HUD is one compact row: SUMMON, then SP / gold /
  lives / wave / enemies-left / towers-deployed / merged-crit pills and the run shop.
- **The bottom bar is fixed.** One card per rotation tower, always in the same slots; spawning and
  ascending change the copy count and battle level on a card, never the card set. Each card's ASCENT
  button still upgrades every deployed copy of that type in lockstep.
- **Lightning is a vertical strike now.** `strikeLightning` (Lightning Princess) no longer fires
  sideways streaks: each target gets a **tall pillar from the top of the screen to the ground**, three
  jagged filaments over a bright impact pool, with a stunned beat before the damage lands. Awakened
  strikes add a white **SUPERBOLT** pillar (wider, with hit-stop and a screen dim), a restrike
  barrage and fork light between the targets. The **Storm Sovereign** hero's bolts and its
  **Sovereign Strike** use the same pillars, as does the ascent flourish.
- **Void Titan** — a new boss (shape `titan`) that steps in from round 32 with all nine skills, a
  slab-plated siege body with orbiting shards and a void core, plus the reworked cutscene above.
- **Awakenings for every tower** — 37 towers, two paths each, five tiers each. `AwkFx`
  (`heavy`, `critup`, `volley`, `freeze`, `burn`, `chain`, `slow`, `splash`, `sp`, `bounty`, `aura`,
  `execute`, `quake`) is implemented in the battle engine, and the Towers screen lists the live tier
  effect for each path.
- **Tower grid.** The Towers screen opens with the crit band and then a **compact icon grid** grouped
  into rarity rows (legendary first), one cell per tower with the art, the level underneath and a
  rarity-tinted outline, plus a fragment readout, an awakening badge and a rotation tick. A filter
  row (ALL / IN ROTATION / LOCKED / READY) keeps all 47 towers scannable. Tapping a cell opens the
  full sheet; dragging it onto a rotation chip reorders your summon preference.
- **The summon rotation decides what spawns.** Summoning draws **only** from the rotation you set in
  the Towers tab (an empty rotation refuses the summon), so no tower can ever appear on the board
  that you did not put on the list — merging cannot conjure one either.
- **Mail and Season** screens (see above), wired into the bottom nav with their own badges.

## Mythic arsenal II, Tone.js audio, staged results screen and a grouped tower section

- **Ten more legendaries** — 47 towers total, ten of them mythic-exotic with two five-tier
  awakenings each: **Nova Cannon** (three-shell starburst salvo), **Gravity Well** (a support well
  that pulses and drags the horde back down the lane), **Thunder Crown** (sky pillars plus forked
  light), **Void Ripper** (a file-wide lance that shaves max HP), **Soul Furnace** (kill-stacking
  fire that pays gold), **Maelstrom** (a churning pool that chews, slows and pulls), **Starfall
  Battery** (marks enemies and drops burning rocks on them), **Chrono Lock** (freezing, staggering,
  chilling shots), **Grave Bloom** (percent-of-max-HP strikes and kill bounties) and **Rift
  Colossus** (slow siege shells that **shatter armour** — every hit peels a slice of the target's
  armour off, so long boss fights get easier). Each has its own art family on the canvas and in the
  icon grid.
- **Audio rebuilt on Tone.js.** The mixer is Tone's (`Gain` bus into `Compressor` + `Limiter`, a
  `Reverb` plate on a send, `FeedbackDelay` slap, a dedicated bass lane) and every voice is a Tone
  instrument or node: `Oscillator` + `AmplitudeEnvelope` + sweeping `Filter` tones, `Noise` bursts,
  `FMSynth` clangs, `MembraneSynth` booms, `MetalSynth` sparkle. The whole palette — UI, currency,
  chests, building, every tower family, bosses, the jackpot and the win/lose stingers — is
  re-layered on top of it, and the ten new towers each got their own firing sound.
- **Game over, reworked** — a staged results screen instead of a small panel: the verdict stamps in
  over spinning rays, a stat strip (biggest hit, waves, towers built), then the **salvage list**
  ticks in row by row with rarity-coloured payouts, and one button banks it all.
- **Jackpot VFX, reworked** — a real cascade: a burst blows out of the card, coins and gems fall as
  **comets** with hot trails and a landing bounce, embers spray off the bottom of the screen, the
  backdrop pulses warm, and the JACKPOT tag now counts the actual payout.
- **Top HUD fits now** — one grouped bar: SUMMON, an economy cluster (SP / gold / lives / enemies
  left / towers deployed / overdrive) and a run cluster (round, merged crit stat, run shop). The
  groups wrap as whole units instead of scattering loose pills, so the currency readout stays intact
  on narrow screens.
- **Summoning is rotation-only** (see above): a summon draws exclusively from the summon rotation,
  and an empty rotation refuses the summon with a prompt to set one.

## Balance pass: summon pricing, elite kills, monthly events and a smoother arena

- **Summon pricing reworked.** A summon now costs **100 SP and +10 for every summon already made**
  this run (it used to start at 120 and climb by 75). Starting SP is retuned to buy exactly the
  opening four summons. Ascent keeps its own steeper ladder (120 + 75 per ascent) so the cheap
  summons never cheapen upgrades.
- **Kills pay spell power by rank.** Every kill now banks **10 SP**; **elite** enemies pay **5x**
  (50 SP) and **bosses 10x** (100 SP). Elites are a new spawn variant — tougher, double gold, a
  golden rift sigil under their feet and a floating diamond — appearing more often as rounds climb.
- **Task rewards are down 10%.** Every daily task's gold and gems payout is scaled by 0.9.
- **Tower upgrades cost 5% less gold.** The gold curve is scaled by 0.95 at every level.
- **Magic token exchange costs more.** Gem prices on the token packs are up 90% (1→2, 4→8, 9→17).
- **Monthly events** (above): a real modifier layer keyed to the calendar month, stacking on the
  weekday rotation — kill SP, gold, gems, enemy HP, chest fragments and upgrade discounts.
- **Crit effects no longer spike.** The crit starburst is throttled (one full burst per 55ms while
  small crits pop a cheap ring), spark counts are down ~40%, ordinary hits only sample their impact
  pop, and the particle field drops additive FX instead of shuffling the array once it saturates.
- **Awakening effects are visible.** Procs announce themselves — the awakening's name flares at the
  tower on Heavy Shells/Hollow Point/Volley rolls, kill-side procs glow with their colour, and
  **leech** awakenings now actually heal lives on kills (they were inert).
- **Tower section rebuilt (again).** One flat grid in rarity order with **sticky rarity headers**
  (legendary first), filters ALL / IN ROTATION / LOCKED / READY — the nested-group layout is gone,
  so cells, columns and scroll behaviour are back to the simple, stable arrangement.

## Clone tower, run-shop crit upgrades, frame-rate settings and a dense tower grid

- **Clone tower (legendary)** — 48 towers now. Drag any tower with matching points onto a Clone and
  it grows a **second copy** of that tower (type and levels); the original is never consumed. Its
  awakenings: **Super Clone** (20% per attempt) copies towers with ANY point spread and surges the
  copy with **+200% attack speed for 6 seconds**, and **Perfect Replica** chances the copy into
  +1–2 points the moment it is made. The copy keeps the Clone's own cell and points.
- **Gameplay shop reworked.** Upgrade caps are now **20** across the board — except the two pure
  stat items, which are held to **max 5** with juicier numbers: Forged Ammo gives **+18%** damage
  (was 15%) and Quickspring **+21%** attack speed (was 12%). Two new items join: **Keen Sight**
  (+5% crit rate, max 10) and **Killing Edge** (+15% crit damage, max 10).
- **Magic token exchange** costs far more gems again (32 / 128 / 272 for 1 / 5 / 12 tokens).
- **Max frame rate + advanced frame interpolation** in Settings. The renderer can be capped at
  30/60/120/144/240 FPS (or unlimited), and frame interpolation draws between fixed 1/60 sim steps
  so a capped or uneven frame rate still glides. Simulation speed is now display-independent.
- **Crit FX are GPU-friendly.** Additive glows draw from pre-rendered sprite cache instead of a
  fresh gradient per particle per frame (the source of the lag spikes), full crit starbursts fire at
  most once per 90ms with a cheap ring in between, damage numbers self-limit, and ordinary hit pops
  are sampled.
- **Tower grid is dense again.** The icon grid auto-fills compact ~86px cells (no more giant empty
  boxes), the rotation tile and Ascent bar are tightened up so the grid gets the screen, and rarity
  headers stay sticky while scrolling.

## Mythic arsenal III: the ten casters, their skills and their sounds

- **Ten new legendary casters** — 58 towers in total. Each has its own look, its own firing sound,
  two five-tier awakenings, and an **active skill that auto-casts on a cooldown** while enemies are
  on the field (banner + unique skill sound included):

  | Tower | Skill | Effect family |
  | --- | --- | --- |
  | Gale Blade | Blade Cyclone | three skewering blades down the lane (`blade2`) |
  | Thousand-Pounder | Rolling Bombardment | shells walking across the densest cluster (`bombard`) |
  | Wildfire | Firestorm | a wall of fire across the front of the lane (`blaze`) |
  | Hades Gate | Hellgate | one colossal gate-detonation (`blast3`) |
  | Ion Storm | Chain Ring | lightning arcing between eight enemies (`chainring`) |
  | Aether Prism | Refraction Burst | a shard blinking through every target (`teleport`) |
  | Death Scythe | Death Mark | marks the strongest enemy and reaps it when wounded (`deathmark`) |
  | Sandstorm | Tornado | a storm that chews and drags the horde backwards (`tornado`) |
  | Bloodstone Spire | Meteor Rain | five burning rocks on random enemies (`meteor`) |
  | Venom Spitter | Toxic Pool | festering pools under the front enemies (`blast1`) |

- **`src/game/skills.ts`** is the shared skill-effect library: `blast1/2/3`, `starburst`, `blade2`,
  `boomerang`, `tornado`, `bombard`, `chainring`, `armorbreak`, `teleport`, `meteor`, `blaze`,
  `deathmark` and `onKill` — one spec per skill (cooldown, damage multiple, radius, hit count) that
  the battle engine reads instead of hardcoding numbers per tower.
- **Unique sound per tower and per skill** — ten new `sfx.shoot` voices (blade slice, siege thump,
  fire bloom, gate grind, ball lightning, glass ping, scythe swing, sand grit, heart-throb, venom
  glop) plus the `blast1/2/3` skill family and an `onKill` payout chime.

## Awakenings for the whole roster, the demon court and energy targeting

- **Every tower is awakenable.** The preview panel used to render its two awakening tracks only for
  exotic towers, which left 27 towers showing a dead "no awakening paths yet" panel even though they
  had full five-tier specs. The gate is gone: all **61** towers show both tracks, their tier lines and
  their Magic Token prices, and the effects behind them were already wired into the engine (generic
  on-hit tags like burn/volley/freeze/chain plus the bespoke kits).
- **Three new legendaries** — **Demon Execution**, **Heavenly God** and **Honor Emperor** — with
  their own canvas art, projectile art, menu icons, sounds and two five-tier awakenings each
  (see the tower table above for the kits).
- **Energy targeting: no more range limit.** Towers used to be limited to a 236px bubble around
  their cell. The grid feeds every tower now, so a shot simply picks the enemy **furthest down the
  lane** and the distance never matters. The guide overlay was rebuilt for it: instead of a ring per
  tower there is one arena-wide dashed energy field plus a dashed tether from each tower to the front
  enemy, so you can see who is shooting whom at a glance.
- **Ascent repriced.** 100 SP for the first press of a run, +100 for every press after — a deliberate
  sink that keeps summons (100 + 10 each) cheap to spam.
- **Mana Conduit** joins the run shop: +10% SP from every kill and wave clear for the rest of the run,
  up to +100% (ten purchases, each one pricier than the last). It applies to kill payouts, bounty
  awakenings and the wave-clear bonus, and the toast shows the multiplied number.
- **Merging is a roulette again.** A same-point pair fuses into a **random unlocked tower** that is
  not one of the two you merged (points still go up by one), so fusing is a way to reroll your board
  into something new. Honor Emperor is the exception: it hands its point to the tower it is dropped
  on and leaves that tower standing.
- **Crit FX no longer melt the frame.** On top of the earlier throttle, the engine now measures how
  long each `draw()` actually took and slides a quality factor between 1.0 and 0.4: when frames run
  long the crit throttle stretches (90ms → 300ms), particle bursts scale down, the lance back to the
  tower is dropped, the starburst behind damage numbers goes, and the expensive full-screen drama —
  colour-split post pass, screen flash, camera punch, freeze-frame — is rationed to at most one every
  260ms (nothing at all while throttled, unless it is a top-tier crit). It recovers the moment the
  frame is cheap again. Settings also exposes the manual version: **Effect Quality → ALL / REDUCED /
  MINIMAL**.
