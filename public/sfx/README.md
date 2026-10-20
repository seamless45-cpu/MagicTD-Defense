# MagicTD sound bank

Every sound in the game is built from these short recordings. The synth engine
in `src/game/audio.ts` is now only a fallback for browsers without Web Audio (or
when a clip cannot be fetched); on a normal browser `src/game/sfxSamples.ts`
plays these files.

The files are plain MP3 so they stream from the same folder as the game —
nothing is bundled into the single-file build.

## Provenance

All packs are **CC0-1.0 (public domain)** by Kenney Vleugels / Kenney.nl. The
licence text shipped with each pack is kept verbatim in `LICENSES/`.

| folder   | packs                                              | used for |
| -------- | -------------------------------------------------- | -------- |
| `ui/`    | Interface Sounds, UI Audio                         | clicks, hovers, toggles, confirms, glass + pluck loot sparkles |
| `rpg/`   | RPG Audio                                          | coins, chest hardware, book lids, cloth, blades, doors |
| `impact/`| Impact Sounds                                      | punches, plates, wood, metal, bells, glass, mining |
| `scifi/` | Sci-Fi Sounds                                      | lasers, force fields, explosions, engines, thrusters, slime |
| `music/` | Music Jingles                                      | win, lose, wave, boss, ceremony, rally and hero stingers |

The packs were mirrored from the CC0 Kenney asset mirrors on GitHub
(`GeorgeQLe/assets-sfx-combat`, `GeorgeQLe/assets-sfx-ui`,
`GeorgeQLe/assets-music`) and re-encoded from Ogg Vorbis to 44.1 kHz mono MP3
(the format every browser can decode, including iOS Safari).

## Re-encoding

Source `.ogg` → trim near-silence below −80 dBFS (4 ms / 12 ms margins) →
peak-normalise to −1.5 dBFS → resample to 44.1 kHz → 3 ms fades in/out → mono →
MP3 128 kbps. This keeps the whole bank around 1.3 MB.

## Adding a sound

1. Drop the file into the right folder (lowercase kebab-case).
2. Reference it from a cue in `src/game/sfxSamples.ts` (`CUES` or `SHOOT_CUES`).
3. Bump the `CACHE` name in `public/sw.js` so installed PWAs refetch the bank.

Missing clips are not fatal: the cue falls back to the Tone.js voice in
`src/game/audio.ts`, and if the whole bank fails to load the game stays playable
with the synth engine.
