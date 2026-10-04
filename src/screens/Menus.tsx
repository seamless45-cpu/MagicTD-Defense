import { useCallback, useEffect, useRef, useState } from "react";
import type { SaveData } from "../game/save";
import {
  todayStr,
  clearSave,
  defaultSave,
  importSave,
  persistSave,
  claimDailyReward,
  heroLevel,
  nextDailyStreak,
  upgradeHero,
} from "../game/save";
import { sfx, setVolume } from "../game/audio";
import { CoinIcon, Emblem, GemIcon, HeroIcon, Modal, TokenIcon, TowerIcon } from "../components/ui";
import {
  TOWERS,
  BATTLE_ROUNDS,
  DAILY_REWARDS,
  HEROES,
  HERO_BY_ID,
  HERO_MAX_LEVEL,
  heroCooldown,
  heroPower,
  heroUpgradeCost,
} from "../game/data";

const LOAD_STEPS = [
  "Charging the mana lattice",
  "Raising towers on the grid",
  "Briefing the heroes",
  "Chalking the enemy path",
  "Opening the rift",
];

/** Rotating one-liners under the checklist — they double as a mini tutorial. */
const LOAD_TIPS = [
  "Gold levels a tower up; fragments push it through ascension.",
  "Endless waves scale enemy health ×1.57 every single round.",
  "Chilled enemies take 25% more damage from every source.",
  "Hero levels add power and shave seconds off the cooldown.",
  "Zoom the arena with the widget in the bottom-left corner.",
  "Tap any tower in the Towers tab for its full stat sheet.",
  "Bosses arrive from round 16 — twice as nasty, twice the loot.",
];

const LOAD_TIME = 2400;

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [p, setP] = useState(0);
  const [ready, setReady] = useState(false);
  const [tip, setTip] = useState(0);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setP(1);
    setReady(true);
  }, []);

  // progress bar (tap / skip jumps straight to the end)
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      if (doneRef.current) return;
      const raw = Math.min(1, (t - t0) / LOAD_TIME);
      setP(raw);
      if (raw < 1) raf = requestAnimationFrame(tick);
      else finish();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [finish]);

  // short "READY" beat, then hand off to the game
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => onDoneRef.current(), 520);
    return () => clearTimeout(t);
  }, [ready]);

  useEffect(() => {
    const t = setInterval(() => setTip((i) => (i + 1) % LOAD_TIPS.length), 1500);
    return () => clearInterval(t);
  }, []);

  const stage = ready ? LOAD_STEPS.length : p * LOAD_STEPS.length;
  const pct = Math.round((ready ? 1 : p) * 100);

  return (
    <div className="app-bg load-root h-full w-full" onClick={finish}>
      <div className="load-orb" style={{ width: 240, height: 240, left: "6%", top: "10%", background: "radial-gradient(circle, rgba(53,224,255,.3), transparent 70%)" }} />
      <div className="load-orb" style={{ width: 320, height: 320, right: "2%", top: "2%", background: "radial-gradient(circle, rgba(255,79,216,.22), transparent 70%)", animationDelay: "1.4s" }} />
      <div className="load-orb" style={{ width: 280, height: 280, left: "28%", bottom: "-8%", background: "radial-gradient(circle, rgba(255,179,36,.2), transparent 70%)", animationDelay: "2.3s" }} />

      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-[440px] flex-col items-center justify-center gap-5 px-5 py-8">
        <div className="load-emblem relative grid h-[186px] w-[186px] shrink-0 place-items-center">
          <div className="load-ring outer" />
          <div className="load-ring inner" />
          <span className="load-spark" style={{ top: 4, left: "50%" }} />
          <span className="load-spark" style={{ bottom: 8, left: "16%", animationDelay: ".7s" }} />
          <span className="load-spark" style={{ bottom: 16, right: "10%", animationDelay: "1.5s" }} />
          <div style={{ animation: "floaty 2.6s ease-in-out infinite" }}>
            <Emblem size={118} />
          </div>
        </div>

        <div className="text-center leading-none">
          <div className="font-disp text-[40px] tracking-wide text-[#ffb324]" style={{ textShadow: "0 0 34px rgba(255,179,36,.5)" }}>
            MagicTD
          </div>
          <div className="mt-1.5 font-disp text-lg tracking-[0.45em] text-[#35e0ff]">DEFENSE</div>
          <div className="load-divider mx-auto mt-3 h-[3px] w-[170px] rounded-full" />
        </div>

        <div className="panel panel-flat w-full p-4">
          <div className="flex items-center justify-between text-[11px] font-bold tracking-[0.3em]">
            <span className={ready ? "text-[var(--green)]" : "text-[var(--dim)]"}>{ready ? "READY" : "LOADING"}</span>
            <span className="text-[#ffcf4d]" style={{ fontVariantNumeric: "tabular-nums" }}>
              {pct}%
            </span>
          </div>

          <div
            className="mt-2.5 flex gap-1.5"
            role="progressbar"
            aria-label="Loading progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            {LOAD_STEPS.map((_, i) => (
              <div key={i} className={`load-seg flex-1 ${ready ? "ready" : ""}`}>
                <i style={{ width: `${Math.max(0, Math.min(1, stage - i)) * 100}%` }} />
              </div>
            ))}
          </div>

          <div className="mt-3.5 space-y-1.5">
            {LOAD_STEPS.map((label, i) => {
              const isDone = ready || stage >= i + 1;
              const isActive = !isDone && Math.floor(stage) === i;
              return (
                <div key={label} className={`load-step ${isDone ? "done" : isActive ? "active" : ""}`}>
                  <span className="load-mark">{isDone ? "✓" : i + 1}</span>
                  <span className="truncate">{label}</span>
                  {isActive && <span className="load-dots ml-auto">···</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div key={tip} className="load-tip w-full px-1 text-center text-[11px] font-semibold leading-snug text-[var(--dim)]">
          <span className="text-[#ffcf4d]">TIP · </span>
          {LOAD_TIPS[tip]}
        </div>

        <div className="flex w-full items-center justify-between gap-3">
          <span className="pill-dark text-[10px] tracking-[0.18em]">BUILD 1.0 · SINGLE FILE</span>
          <button
            className={`btn px-4 py-1.5 text-xs ${ready ? "btn-gold" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              finish();
            }}
          >
            {ready ? "ENTERING…" : "SKIP ▸"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Home({
  save,
  mutate,
  onBattle,
  onEndless,
  push,
}: {
  save: SaveData;
  mutate: (fn: (s: SaveData) => void) => void;
  onBattle: () => void;
  onEndless: () => void;
  push: (m: string, c?: string) => void;
}) {
  const hero = HERO_BY_ID[save.hero] || HERO_BY_ID.nova;
  const lv = heroLevel(save, hero.id);
  const cost = heroUpgradeCost(lv);
  const heroMaxed = lv >= HERO_MAX_LEVEL;
  const canClaim = save.lastDaily !== todayStr();
  const day = nextDailyStreak(save);

  const doUpgrade = () => {
    if (heroMaxed) {
      sfx.error();
      return push(`${hero.name} is already max level`, "#ff4d5e");
    }
    const ok = mutate((s) => {
      upgradeHero(s, hero.id);
    });
    if (save.gold < cost) {
      sfx.error();
      return push(`Need ${cost} gold to upgrade ${hero.name}`, "#ff4d5e");
    }
    sfx.buy();
    push(`${hero.name} reached Lv ${lv + 1}`, hero.color);
    return ok;
  };

  const claim = () => {
    const got = claimDailyReward(save);
    if (!got) {
      sfx.error();
      return push("Already claimed today — come back tomorrow", "#ff4d5e");
    }
    mutate((s) => {
      claimDailyReward(s);
    });
    sfx.chest();
    push(`Day ${got.day}: ${got.label}`, got.color);
  };

  return (
    <div className="scroll-thin relative flex h-full flex-col gap-3 overflow-y-auto py-1 pr-1">
      <div className="anim-slideup text-center">
        <div className="font-disp text-3xl tracking-wide text-[#ffb324]" style={{ textShadow: "0 0 24px rgba(255,179,36,.55)" }}>
          Command Center
        </div>
        <div className="mt-0.5 text-[12px] font-semibold tracking-[0.28em] text-[var(--dim)]">
          ENEMIES GROW +57% STRONGER EVERY WAVE · HOLD THE LINE
        </div>
      </div>

      {/* HERO CARD — portrait, level and the upgrade button */}
      <div className="tile tile-gold anim-pop relative p-3" data-testid="hero-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="frame-gold relative grid h-[104px] w-[104px] shrink-0 place-items-center">
            <HeroIcon kind={hero.kind} size={66} color={hero.color} />
            <span className="badge-num absolute -left-2 -top-2">{lv >= HERO_MAX_LEVEL ? "MAX" : `Lv ${lv}`}</span>
          </div>
          <div className="min-w-[210px] flex-1">
            <div className="text-[11px] font-bold tracking-[0.28em] text-[#ffcf4d]">HERO</div>
            <div className="font-disp text-2xl leading-none" style={{ color: hero.color }}>
              {hero.name}
            </div>
            <p className="mt-1 text-[12.5px] font-semibold leading-snug text-[var(--dim)]">{hero.desc}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="pill-dark text-[11px] text-[var(--dim)]">
                <span className="num" style={{ color: "#3dff8e" }}>
                  {Math.round(heroPower(lv) * 100)}%
                </span>
                power
              </span>
              <span className="pill-dark text-[11px] text-[var(--dim)]">
                <span className="num" style={{ color: "#35e0ff" }}>
                  {heroCooldown(hero.cd, lv).toFixed(0)}s
                </span>
                cooldown
              </span>
              <span className="text-[11px] font-bold text-[#8effc4]">{hero.scaling}</span>
            </div>
          </div>
          <button
            className="cta-banner shrink-0 px-5 py-3 text-[15px]"
            data-testid="hero-upgrade"
            disabled={heroMaxed || save.gold < cost}
            onClick={doUpgrade}
          >
            {heroMaxed ? (
              "MAX LEVEL"
            ) : (
              <span className="inline-flex items-center gap-2">
                UPGRADE <CoinIcon size={17} /> {cost}
              </span>
            )}
          </button>
        </div>

        {/* hero switcher */}
        <div className="mt-3 flex gap-2 overflow-x-auto scroll-thin pb-1">
          {HEROES.map((h) => {
            const on = h.id === hero.id;
            const hl = heroLevel(save, h.id);
            return (
              <button
                key={h.id}
                onClick={() => {
                  sfx.click();
                  mutate((s) => {
                    s.hero = h.id;
                  });
                  push(`${h.name} equipped`, h.color);
                }}
                className="tile tile-hover relative flex w-[132px] shrink-0 flex-col items-center gap-1 p-2"
                style={{
                  borderColor: on ? h.color : undefined,
                  boxShadow: on ? `0 0 16px ${h.color}66, 0 4px 0 #0b0722` : undefined,
                }}
              >
                <span className={`badge-num absolute -left-1.5 -top-1.5 ${hl > 1 ? "" : "dim"}`}>{hl}</span>
                <HeroIcon kind={h.kind} size={44} color={h.color} />
                <span className="truncate text-[12px] font-bold" style={{ color: h.color }}>
                  {h.name}
                </span>
                <span className="text-[10px] font-bold text-[var(--dim)]">
                  {on ? "EQUIPPED" : `${heroCooldown(h.cd, hl).toFixed(0)}s · ${h.kind}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MODES */}
      <div className="relative grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        <ModeCard
          accent="#ffcf4d"
          title="Battle"
          sub={`Solo defense · ${BATTLE_ROUNDS} rounds`}
          body="Fixed 12-wave gauntlet. Win it to bank gold, gems and fragments."
          onClick={onBattle}
          delay="0ms"
        />
        <ModeCard
          accent="#ff4fd8"
          title="Endless"
          sub="No wave limit · score attack"
          body="Survive as long as you can. Every wave banks more, deeper runs pay more."
          onClick={onEndless}
          delay="60ms"
          badge={`BEST ${save.bestEndless}`}
        />
      </div>

      {/* DAILY REWARDS */}
      <div className="tile relative p-3" data-testid="daily-rewards">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-disp text-xl text-[#ffcf4d]">Daily Rewards</div>
            <div className="text-[12px] font-semibold text-[var(--dim)]">
              Streak {save.dailyStreak}/7 · claiming today opens day {day}. Miss a day and the streak restarts.
            </div>
          </div>
          <button className="cta-banner shrink-0 px-5 py-2.5 text-[14px]" data-testid="daily-claim" disabled={!canClaim} onClick={claim}>
            {canClaim ? `CLAIM DAY ${day}` : "CLAIMED · TOMORROW"}
          </button>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {DAILY_REWARDS.map((r, i) => {
            const n = i + 1;
            const done = n < day || (n === save.dailyStreak && !canClaim);
            const next = n === day && canClaim;
            return (
              <div key={n} className={`day-tile relative flex flex-col items-center gap-1 p-2 ${next ? "next" : done ? "done" : ""}`}>
                <span className={`badge-num ${next ? "" : "dim"}`}>{n}</span>
                <div className="flex h-8 items-center gap-1">
                  {r.gems ? <GemIcon size={22} /> : r.tokens ? <TokenIcon size={22} /> : r.frags ? <TowerIcon def={TOWERS[0]} size={24} /> : <CoinIcon size={22} />}
                </div>
                <span className="text-center text-[9.5px] font-bold leading-tight text-[var(--dim)]">{r.label}</span>
                {done && <span className="absolute right-1 top-1 text-[12px] text-[#3dff8e]">✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="anim-slideup relative flex flex-wrap items-center justify-center gap-2 pb-1 text-[12px] font-bold tracking-wider text-[var(--dim)]" style={{ animationDelay: "120ms" }}>
        <span className="pill-dark">BEST ROUND <span className="num">{save.best}</span></span>
        <span className="pill-dark">ENDLESS <span className="num">{save.bestEndless}</span></span>
        <span className="pill-dark">VICTORIES <span className="num">{save.wins}</span></span>
        <span className="pill-dark">RUNS <span className="num">{save.runs}</span></span>
      </div>
      {save.lineup.length < 3 && (
        <button
          className="btn relative mx-auto text-sm"
          onClick={() => {
            sfx.click();
            push("Add at least 3 towers to your lineup in the Towers tab", "#ffd23f");
          }}
        >
          Lineup weak — visit Towers
        </button>
      )}
    </div>
  );
}

function ModeCard({
  accent,
  title,
  sub,
  body,
  onClick,
  delay,
  badge,
}: {
  accent: string;
  title: string;
  sub: string;
  body: string;
  onClick: () => void;
  delay: string;
  badge?: string;
}) {
  return (
    <button
      onClick={() => {
        sfx.click();
        onClick();
      }}
      className="tile tile-hover anim-pop group relative overflow-hidden p-4 text-left"
      style={{ animationDelay: delay, borderColor: accent }}
      data-mode={title}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-30 transition-opacity group-hover:opacity-60"
        style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }}
      />
      {badge && (
        <span className="badge-num absolute right-2 top-2" style={{ borderColor: accent }}>
          {badge}
        </span>
      )}
      <div className="font-disp relative text-3xl leading-none" style={{ color: accent }}>
        {title}
      </div>
      <div className="relative mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--dim)]">{sub}</div>
      <p className="relative mt-2 text-[12.5px] font-semibold leading-snug text-[var(--txt)]/85">{body}</p>
      <span className="cta-banner relative mt-3 inline-block px-6 py-2 text-[14px]">DEPLOY</span>
    </button>
  );
}

export function Specials() {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 overflow-y-auto scroll-thin pr-1">
      <div className="panel relative overflow-hidden p-5" style={{ borderColor: "#6b2fb0" }}>
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(600px 160px at 30% 0%, rgba(196,77,255,.5), transparent 70%)" }} />
        <div className="relative">
          <div className="font-disp text-2xl text-[#c44dff]">Season 3 · Arcane Siege</div>
          <p className="mt-1 max-w-lg text-[15px] font-semibold text-[var(--dim)]">
            Ranked arena, seasonal towers and guild wars are being forged. Check back soon, commander.
          </p>
          <span className="btn mt-3 inline-block cursor-not-allowed px-4 py-1 text-xs opacity-50">Coming Soon</span>
        </div>
      </div>
      <div className="tile p-5">
        <div className="font-disp text-xl text-[#ffcf4d]">Daily Rewards moved home</div>
        <p className="mt-1 text-sm font-semibold text-[var(--dim)]">
          The 7-day streak calendar now lives on the Command Center — claim it there before you deploy.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { t: "Frost Festival", d: "Icestorm-themed events and double freeze chests.", c: "#35e0ff" },
          { t: "Blaze Trials", d: "Inferno gauntlet for Hellstorm specialists.", c: "#ff7a3d" },
        ].map((e) => (
          <div key={e.t} className="panel p-4" style={{ borderColor: e.c + "55" }}>
            <div className="font-disp text-lg" style={{ color: e.c }}>{e.t}</div>
            <p className="mt-1 text-sm font-semibold text-[var(--dim)]">{e.d}</p>
            <span className="mt-2 inline-block rounded-md border border-[var(--line2)] px-2 py-0.5 text-[11px] font-bold tracking-widest text-[var(--dim)]">
              COMING SOON
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const GUILDS = [
  { name: "Arcane Vanguard", members: 84, power: 12480, color: "#ffb324" },
  { name: "Storm Callers", members: 61, power: 9310, color: "#35e0ff" },
  { name: "Ember Pact", members: 47, power: 7050, color: "#ff4d5e" },
];

export function Guild({ push }: { push: (m: string, c?: string) => void }) {
  const [joined, setJoined] = useState<string | null>(null);
  const lines = [
    ["Kael", "Anyone farming endless waves tonight?"],
    ["Mira", "Just hit Awakening II on my Lightning Princess."],
    ["Torin", "Power Plant next to a Chrono Spire is broken. In a good way."],
  ] as const;
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 overflow-y-auto scroll-thin pr-1">
      <div className="panel p-5" style={{ borderColor: joined ? "#ffb32466" : undefined }}>
        <div className="font-disp text-2xl text-[#ffcf4d]">Guild Hall</div>
        <p className="text-sm font-semibold text-[var(--dim)]">
          {joined ? `You are a member of ${joined}.` : "Join a guild to share war chests and compare endless records."}
        </p>
        <div className="mt-3 space-y-2">
          {GUILDS.map((g) => (
            <div key={g.name} className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-black/30 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg" style={{ background: `linear-gradient(135deg, ${g.color}, #171038)`, border: `1px solid ${g.color}` }} />
                <div>
                  <div className="font-bold tracking-wide" style={{ color: g.color }}>{g.name}</div>
                  <div className="text-xs font-semibold text-[var(--dim)]">{g.members} members · {g.power.toLocaleString()} power</div>
                </div>
              </div>
              <button
                className="btn px-4 py-1.5 text-xs"
                disabled={joined === g.name}
                onClick={() => {
                  setJoined(g.name);
                  sfx.gem();
                  push(`Invitation accepted — welcome to ${g.name}!`, g.color);
                }}
              >
                {joined === g.name ? "Joined" : "Join"}
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="panel p-5">
        <div className="font-disp text-lg text-[#35e0ff]">Guild Chat</div>
        <div className="mt-2 space-y-1.5 text-[15px] font-semibold">
          {lines.map(([n, m]) => (
            <div key={n}>
              <span className="text-[var(--cyan)]">{n}:</span> <span className="text-[var(--txt)]">{m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsModal({
  save,
  mutate,
  onClose,
}: {
  save: SaveData;
  mutate: (fn: (s: SaveData) => void) => void;
  onClose: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [diagOpen, setDiagOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const diagnostics = () => {
    const w = window as unknown as { __magictdBootErrors?: string[]; __magictdLastError?: string };
    return [
      `url: ${window.location.href}`,
      `ua: ${navigator.userAgent}`,
      `renderer: ${document.createElement("canvas").getContext("webgl2") ? "webgl2" : document.createElement("canvas").getContext("webgl") ? "webgl" : "2d"}`,
      `roundRect: ${typeof (CanvasRenderingContext2D.prototype as { roundRect?: unknown }).roundRect}`,
      `ResizeObserver: ${typeof ResizeObserver}`,
      `AudioContext: ${typeof (window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext)}`,
      `save version: ${localStorage.getItem("magictd_save_v1") ? "present" : "none"}`,
      `boot errors: ${w.__magictdBootErrors?.length ? w.__magictdBootErrors.join(" | ") : "none"}`,
      `last render error: ${w.__magictdLastError || "none"}`,
    ].join("\n");
  };
  const TOGGLES: [string, keyof SaveData & string, string][] = [
    ["Battle SFX", "sfx", "Sound effects during battle and menus"],
    ["Rich FX", "fx", "Extra particles, smoke and hit effects"],
    ["Damage Numbers", "dmgNums", "Floating damage values over every hit"],
    ["Screen Shake", "shakeFx", "Impact shake on explosions and hero skills"],
    ["Battlefield Guides", "guides", "Grid, buildable-cell and range circles"],
    ["Auto-Start Waves", "fastWaves", "Skip the countdown between waves"],
    ["Reduced Motion", "reducedMotion", "Calms looping menu animations"],
    ["Performance HUD", "perf", "FPS and live entity counter in battle"],
  ];
  return (
    <Modal onClose={onClose} w={470}>
      <div className="font-disp text-2xl text-[#ffcf4d]">Settings</div>

      <div className="mt-4 text-[12px] font-bold tracking-[0.25em] text-[var(--cyan)]">AUDIO</div>
      <div className="row-card mt-1.5">
        <div>
          <div className="font-bold">Master Volume</div>
          <div className="text-xs font-semibold text-[var(--dim)]">{Math.round(save.vol * 100)}%</div>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(save.vol * 100)}
          onChange={(e) => {
            const v = Number(e.target.value) / 100;
            mutate((s) => { s.vol = v; });
            setVolume(v);
          }}
          className="w-[150px] shrink-0 accent-[#35e0ff]"
          aria-label="Master Volume"
        />
      </div>

      <div className="mt-4 text-[12px] font-bold tracking-[0.25em] text-[var(--cyan)]">OPTIONS</div>
      <div className="mt-1.5 space-y-3">
        {TOGGLES.map(([label, key, d]) => (
          <div key={key} className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-black/30 px-4 py-3">
            <div>
              <div className="font-bold">{label}</div>
              <div className="text-xs font-semibold text-[var(--dim)]">{d}</div>
            </div>
            <button
              className={`toggle ${save[key] ? "on" : ""}`}
              aria-pressed={!!save[key]}
              onClick={() => {
                mutate((s) => { s[key] = !s[key] as never; });
                sfx.click();
              }}
            >
              {save[key] ? "ON" : "OFF"}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 text-[12px] font-bold tracking-[0.25em] text-[var(--cyan)]">SAVE DATA</div>
      <div className="mt-1.5 space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-black/30 px-4 py-3">
          <div>
            <div className="font-bold">Backup</div>
            <div className="text-xs font-semibold text-[var(--dim)]">Copy your progress as text, or paste one back in</div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              className="btn px-3 py-1.5 text-sm"
              onClick={() => {
                const text = JSON.stringify(save);
                navigator.clipboard?.writeText(text).catch(() => {});
                setCopied(true);
                sfx.click();
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied" : "Export"}
            </button>
            <button
              className="btn px-3 py-1.5 text-sm"
              onClick={() => {
                sfx.click();
                setImportOpen((v) => !v);
              }}
            >
              {importOpen ? "Hide" : "Import"}
            </button>
          </div>
        </div>
        {importOpen && (
          <div className="rounded-lg border border-[var(--line)] bg-black/30 p-3">
            <textarea
              className="scroll-thin h-24 w-full resize-none rounded-md border border-[var(--line)] bg-black/50 p-2 text-[11px] leading-snug text-[var(--txt)] outline-none"
              placeholder="Paste an exported save here..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <button
              className="btn btn-cyan mt-2 w-full py-1.5 text-sm"
              disabled={!importText.trim()}
              onClick={() => {
                try {
                  const next = importSave(importText);
                  persistSave(next);
                  mutate((s) => {
                    Object.assign(s, next);
                  });
                  setVolume(next.vol);
                  setImportOpen(false);
                  setImportText("");
                  sfx.gem();
                  window.dispatchEvent(new CustomEvent("magictd-imported"));
                } catch {
                  sfx.error();
                }
              }}
            >
              Restore Progress
            </button>
          </div>
        )}
        <div className="flex items-center justify-between rounded-lg border border-[#ff4d5e55] bg-black/30 px-4 py-3">
          <div>
            <div className="font-bold text-[#ff4d5e]">Reset Progress</div>
            <div className="text-xs font-semibold text-[var(--dim)]">Wipes gold, gems, tokens, towers and lineup</div>
          </div>
          <button
            className="btn btn-danger px-4 py-1.5 text-sm"
            onClick={() => {
              if (!confirmReset) {
                setConfirmReset(true);
                sfx.error();
                return;
              }
              clearSave();
              window.dispatchEvent(new CustomEvent("magictd-reset"));
              sfx.click();
              onClose();
            }}
          >
            {confirmReset ? "Confirm?" : "Reset"}
          </button>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-black/30 px-4 py-3">
          <div>
            <div className="font-bold">Loading Screen</div>
            <div className="text-xs font-semibold text-[var(--dim)]">Play the boot sequence again</div>
          </div>
          <button
            className="btn px-4 py-1.5 text-sm"
            onClick={() => {
              sfx.click();
              window.dispatchEvent(new CustomEvent("magictd-intro"));
              onClose();
            }}
          >
            Replay
          </button>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-black/30 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-bold">Diagnostics</div>
              <div className="text-xs font-semibold text-[var(--dim)]">
                Environment details — useful if the game misbehaves
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                className="btn px-3 py-1.5 text-sm"
                onClick={() => {
                  setDiagOpen((v) => !v);
                  sfx.click();
                }}
              >
                {diagOpen ? "Hide" : "Show"}
              </button>
              <button
                className="btn px-3 py-1.5 text-sm"
                onClick={() => {
                  const text = diagnostics();
                  navigator.clipboard?.writeText(text).catch(() => {});
                  setCopied(true);
                  sfx.click();
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          {diagOpen && (
            <pre className="scroll-thin mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md border border-[var(--line)] bg-black/40 p-2 text-[11px] leading-snug text-[var(--dim)]">
              {diagnostics()}
            </pre>
          )}
        </div>
      </div>
      <button className="btn mt-4 w-full py-2" onClick={() => { sfx.click(); onClose(); }}>
        Close
      </button>
    </Modal>
  );
}

export function ChestSVG({ color, size = 120 }: { color: string; size?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} style={{ animation: "floaty 2.5s ease-in-out infinite" }}>
      <svg width={size} height={size} viewBox="0 0 90 90">
        <rect x="12" y="34" width="66" height="40" rx="6" fill="#3a2a12" stroke={color} strokeWidth="3" />
        <path d="M12 42c0-14 14-22 33-22s33 8 33 22v6H12z" fill="#5c451f" stroke={color} strokeWidth="3" />
        <rect x="38" y="36" width="14" height="20" rx="3" fill={color} />
        <circle cx="45" cy="44" r="3.5" fill="#171038" />
        <path d="M45 6l2.6 5.4 6 .6-4.5 4 1.3 5.8L45 18.8 39.6 21.8 40.9 16l-4.5-4 6-.6z" fill={color} opacity="0.9" />
      </svg>
    </div>
  );
}

export function FragPreview({ save }: { save: SaveData }) {
  const top = Object.entries(save.frags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  return (
    <div className="flex flex-wrap gap-2">
      {top.length === 0 && <span className="text-sm font-semibold text-[var(--dim)]">No fragments yet — open chests in the Shop.</span>}
      {top.map(([id, n]) => (
        <div key={id} className="chip">
          <TowerIcon def={TOWERS.find((t) => t.id === id)!} size={22} />
          <span className="text-sm text-[var(--txt)]">×{n}</span>
        </div>
      ))}
    </div>
  );
}

export function makeDefaults(): SaveData {
  return defaultSave();
}
