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
npm run build      # bundles everything into a single self-contained dist/index.html
npm run preview    # serve the production build
npm test           # vitest + jsdom smoke suite (25 tests)
npm run typecheck  # tsc --noEmit
```

The production build is one HTML file (~300 kB, no external JS/CSS chunks) thanks to
`vite-plugin-singlefile`, so it can be opened straight from disk or dropped on any static host.

## How to play

**Home → Battle Mode** (12 rounds, solo) or **Party Mode** (15 rounds, AI teammates deploy towers
and chat; Magic Tokens awarded at round 10).

- **Deploy:** drag a tower from the lineup row at the top onto a build cell. The path (left column,
  right column, bottom row) is blocked. Seven build columns × three build rows.
- **Merge:** drag a placed tower onto another tower with the **same point count** to fuse them into
  a random tower with +1 point (max 8). Higher points = faster firing.
- **Points:** placed lineup towers pulse points to each other as they shoot (+1 point every 3rd
  volley) — lineup order is the pulse ring.
- **Ascend:** spend SP to raise a deployed tower's battle level (max 6) for more damage.
- **Summon:** spend SP for a random unlocked tower in an empty lineup slot. Cost rises each time.
- **Hero (NOVA):** screen-wide crit nuke with a 25s cooldown.
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
| Cannon | Normal | Splash explosion |
| Ice Cube | Normal | Chance to freeze for 3s |
| S-Speaker | Decent | Aura: attack speed of orthogonal neighbours |
| Tesla Coil | Decent | Chaining lightning |
| Gatling | Epic | Bursts of rapid fire every 5s |
| Energy Core | Epic | Knockback + stun |
| Lightning Princess | Legendary | Hits every enemy on screen; exotic awakenings |
| Hellstorm | Legendary | Fireballs, crit scaling, merge-triggered blaze |
| Icestorm | Legendary | Icicles cut a % of current HP |
| Power Plant | Legendary | Aura: attack speed + attack of neighbours |

## Layout

```
src/
  App.tsx              screen router + save state
  components/ui.tsx    icons, currency bar, toasts, modal
  game/data.ts         tower/enemy definitions, wave and cost formulas
  game/save.ts         localStorage save schema
  game/audio.ts        WebAudio synth SFX (no audio files)
  screens/Battle.tsx   canvas engine: update/draw loop, input, merging, FX
  screens/Menus.tsx    loading, home, specials, guild, settings
  screens/Shop.tsx     chests and reward rolls
  screens/Towers.tsx   lineup management, upgrades, awakenings
  __tests__/           vitest smoke suite (jsdom canvas stub)
```

## Tests

`npm test` boots the real app in jsdom with a stubbed 2D canvas and plays through it:
loading → every tab, settings toggles + reset persistence, buying/opening/collecting a chest,
upgrading and re-lineuping towers (tap and drag-and-drop), the daily rite, and a battle run that
deploys a tower from the lineup, waits for wave 1 to spawn and abandons. The suite also guards the
save-file helpers and wave/cost formulas.
