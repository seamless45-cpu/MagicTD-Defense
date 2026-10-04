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
| **Party** | 15 rounds | AI teammates deploy their own towers and chat; Magic Tokens at round 10. |
| **Endless** | no limit | Score attack: survive as long as possible. Rewards scale with your depth — gold grows quadratically, gems every 3 waves, a token every 5. |

**Enemies get 57% stronger every wave** (×1.57 per wave, compounding), and both the wave banner
and the HUD show the current multiplier. Your towers keep up because their damage grows
multiplicatively: each battle level multiplies damage ×1.55, each point +30%, and Power Plant /
S-Speaker auras multiply on top.

### Heroes

Equip one hero on the Command Center; its ability is the big purple button in battle.

| Hero | Cooldown | Ability |
| --- | --- | --- |
| **Nova** | 25s | Screen-wide detonation: heavy damage + brief stun on everything. |
| **Glacier** | 30s | Flash-freezes every enemy for 4s, then leaves them chilled and slowed. |
| **Ember** | 30s | Ignites the field: burst damage plus a long burning wound. |
| **Overdrive** | 35s | Supercharges every tower: +150% attack speed and +50% damage for 8s. |

- **Deploy:** drag a tower from the lineup row at the top onto a build cell. The path (left column,
  right column, bottom row) is blocked. Seven build columns × three build rows.
- **Merge:** drag a placed tower onto another tower with the **same point count** to fuse them into
  a random tower with +1 point (max 8). Higher points = faster firing and +30% damage per point.
- **Points:** placed lineup towers pulse points to each other as they shoot (+1 point every 3rd
  volley) — lineup order is the pulse ring.
- **Ascend:** each slot holds a tower, not a button. Drag the gold **ASCENT** token from the left of
  the bottom bar into a tower's slot (or tap the token, then tap a slot) to buy a battle level
  (max 6, ×1.55 damage each). Dropping it on a tower on the grid works too.
- **Summon:** spend SP for a random unlocked tower in an empty lineup slot. Cost rises each time.
- **Battle SFX / Rich FX** toggles live in the settings gear (top right).
- Enemies leak toward the portal on the right and cost lives (20); at 0 lives the run ends.
  Winning a run banks gold, gems, fragments and (party) tokens.

## Progression

- **Shop:** chests give gold + tower fragments; rarer chests can also drop gems and tokens.
- **Towers:** fragments unlock locked towers (Arrow/Cannon/Ice Cube start unlocked), upgrade menu
  levels 1→15, and `Ascent All` raises every unlocked tower by one level for gold.
- **Awakenings:** exotic legendary towers (Lightning Princess, Hellstorm) have two awakening tracks
  that cost Magic Tokens, unlock at menu level 10 / 15 and go up to tier V.
- **Daily Rite:** 60 gold + a random fragment once per real-world day.
- Progress saves to `localStorage` under `magictd_save_v1`; Settings → Reset Progress wipes it.

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
scripts/sync-pages.mjs publishes dist/app.html to the repo root
```

## Tests

`npm test` boots the real app in jsdom with a stubbed 2D canvas and plays through it:
loading → every tab, settings toggles + reset persistence, buying/opening/collecting a chest,
upgrading and re-lineuping towers (tap and drag-and-drop), the daily rite, and a battle run that
deploys a tower from the lineup, waits for wave 1 to spawn and abandons. It also runs party mode,
guards the save-file helpers and wave/cost formulas, and executes the committed `index.html`
artifact end-to-end so a broken or missing build cannot reach the published site.

## Deployment

GitHub Pages serves this branch's root (`https://seamless45-cpu.github.io/MagicTD-Defense/`).
Because the game is a single self-contained file, publishing is just: `npm run build` and commit
`index.html`. The boot guard in the HTML means that if the published file is ever wrong (for
example the dev template gets served), the page explains the failure instead of going blank.
