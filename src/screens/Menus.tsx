import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SaveData } from "../game/save";
import type { ClaimData, UpgradeData } from "../components/ui";
import type { DailyTask } from "../game/data";
import { DAILY_TASKS, TASK_MILESTONES, TASK_POINTS_TOTAL } from "../game/data";
import {
  claimMilestone,
  claimTask,
  milestoneClaimed,
  taskClaimed,
  taskComplete,
  taskPoints,
  taskProgress,
  tasksReady,
  tasksRemaining,
} from "../game/save";
import {
  todayStr,
  clearSave,
  defaultSave,
  importSave,
  persistSave,
  claimDailyReward,
  claimEventBonus,
  cloneSave,
  grantLoot,
  claimGuildChest,
  bumpQuest,
  claimQuest,
  donateToGuild,
  donationsLeft,
  eventClaimable,
  guildChestReady,
  heroLevel,
  joinGuild,
  leaveGuild,
  levelHeroWithShards,
  lootLines,
  nextDailyStreak,
  questDone,
  questProgress,
  redeemGiftCode,
  resetCountdown,
  upgradeHero,
  weekStr,
  buyGuildItem,
  claimCompetition,
  compClaimed,
  GUILD_DONATIONS_PER_DAY,
} from "../game/save";
import { sfx, setVolume } from "../game/audio";
import {
  ChipIcon,
  CoinIcon,
  Emblem,
  GemIcon,
  GuildIcon,
  HeroIcon,
  Modal,
  RewardClaim,
  ShardIcon,
  TokenIcon,
  TowerIcon,
  TrophyIcon,
  UpgradeCeremony,
} from "../components/ui";
import {
  TOWERS,
  BATTLE_ROUNDS,
  CHIPS,
  COMPETITION_TIERS,
  DAILY_REWARDS,
  EVENTS,
  GUILDS,
  GUILD_DONATIONS,
  GUILD_QUESTS,
  GUILD_SHOP,
  HEROES,
  HERO_BY_ID,
  HERO_MAX_LEVEL,
  HERO_SHARD_COST,
  LEAGUES,
  TROPHY_LOSS,
  TROPHY_WIN,
  competitionBoard,
  competitionTier,
  eventBonus,
  eventForDate,
  guildLevel,
  heroCooldown,
  heroPower,
  heroUpgradeCost,
  leagueFor,
  nextLeague,
  type ChipId,
} from "../game/data";

/**
 * PWA install prompt. Chrome/Edge fire `beforeinstallprompt`; we stash it so the
 * Settings row can trigger the real install flow on demand. Safari never fires
 * it, in which case the row explains the Share -> Add to Home Screen route.
 */
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches
  );
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return { promptEvent, installed };
}

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
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [upg, setUpg] = useState<UpgradeData | null>(null);
  const liveEv = eventForDate();
  const shards = save.heroShards[hero.id] || 0;
  const league = leagueFor(save.trophies);
  const nextL = nextLeague(save.trophies);

  /** build the level-up flourish payload for the hero's new level */
  const heroUpgData = (from: number, note: string): UpgradeData => ({
    title: hero.name,
    kind: "hero",
    heroKind: hero.kind,
    color: hero.color,
    fromLv: from,
    toLv: from + 1,
    note: from + 1 >= HERO_MAX_LEVEL ? "MAX LEVEL" : note,
    stats: [
      { label: "Skill power", from: `${Math.round(heroPower(from) * 100)}%`, to: `${Math.round(heroPower(from + 1) * 100)}%` },
      { label: "Cooldown", from: `${heroCooldown(hero.cd, from).toFixed(0)}s`, to: `${heroCooldown(hero.cd, from + 1).toFixed(0)}s` },
    ],
  });

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
    sfx.awaken();
    setUpg(heroUpgData(lv, "LEVEL UP"));
    push(`${hero.name} reached Lv ${lv + 1}`, hero.color);
    return ok;
  };

  /**
   * Daily claim. The reward is rolled once inside `mutate` so the loot the
   * animation shows is exactly the loot that was banked (chests roll random
   * contents, so rolling twice would desync the UI from the save).
   */
  const doClaim = () => {
    if (!canClaim) {
      sfx.error();
      return push("Already claimed — the next day unlocks at 07:00", "#ff4d5e");
    }
    // roll on a clone first so the animation shows exactly what gets banked
    const g = claimDailyReward(cloneSave(save));
    if (!g) {
      sfx.error();
      return push("Already claimed — the next day unlocks at 07:00", "#ff4d5e");
    }
    mutate((s) => {
      if (s.lastDaily === todayStr()) return;
      grantLoot(s, g.loot);
      s.dailyStreak = g.day;
      s.lastDaily = todayStr();
    });
    sfx.chest();
    setClaim({
      title: `DAY ${g.day}`,
      subtitle: g.label,
      lines: g.lines,
      color: g.color,
      chest: g.chests.length > 0,
      chestCount: g.chests.reduce((a, c) => a + c.n, 0),
    });
  };

  /** the once-a-day bonus attached to whatever event is live */
  const doEventClaim = () => {
    if (!eventClaimable(save)) {
      sfx.error();
      return push("Event bonus already taken today", "#ff4d5e");
    }
    const draft = cloneSave(save);
    const loot = claimEventBonus(draft);
    if (!loot) return;
    mutate((s) => {
      if (s.lastEvent === todayStr()) return;
      grantLoot(s, loot);
      s.lastEvent = todayStr();
    });
    sfx.chest();
    setClaim({
      title: liveEv.name.toUpperCase(),
      subtitle: `${liveEv.tagline} event bonus`,
      lines: lootLines(loot),
      color: liveEv.color,
      chest: liveEv.id === "chestbox",
      chestCount: 2,
    });
  };

  const doShardLevel = () => {
    if (lv >= HERO_MAX_LEVEL) {
      sfx.error();
      return push(`${hero.name} is already max level`, "#ff4d5e");
    }
    if (shards < HERO_SHARD_COST) {
      sfx.error();
      return push(`Need ${HERO_SHARD_COST} ${hero.name} shards — open Heroes Chests`, "#ff4d5e");
    }
    mutate((s) => {
      levelHeroWithShards(s, hero.id);
    });
    sfx.awaken();
    setUpg(heroUpgData(lv, "SHARD ASCENSION"));
    push(`${hero.name} reached Lv ${lv + 1} with shards`, hero.color);
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

      {/* TODAY'S EVENT */}
      <div className="tile event-card live relative p-3" data-testid="today-event" style={{ borderColor: liveEv.color + "77" }}>
        <div className="relative flex flex-wrap items-center gap-3">
          <EventGlyph id={liveEv.id} color={liveEv.color} size={46} />
          <div className="min-w-[200px] flex-1">
            <div className="flex items-center gap-2">
              <span className="live-dot" style={{ background: liveEv.color }} />
              <span className="text-[10px] font-bold tracking-[0.3em] text-[var(--dim)]">LIVE TODAY · {liveEv.tagline.toUpperCase()}</span>
            </div>
            <div className="font-disp text-xl leading-none" style={{ color: liveEv.color }}>
              {liveEv.name}
            </div>
            <div className="mt-1 text-[11.5px] font-bold text-[#8effc4]">{liveEv.perk}</div>
          </div>
          <button className="cta-banner shrink-0 px-4 py-2.5 text-[13px]" data-testid="event-claim" disabled={!eventClaimable(save)} onClick={doEventClaim}>
            {eventClaimable(save) ? "CLAIM BONUS" : "CLAIMED"}
          </button>
        </div>
      </div>

      {/* TROPHY STANDING */}
      <div className="tile relative flex flex-wrap items-center gap-3 p-3" data-testid="trophy-card">
        <div className="frame-gold grid h-[58px] w-[58px] shrink-0 place-items-center" style={{ borderColor: league.color }}>
          <TrophyIcon size={34} color={league.color} />
        </div>
        <div className="min-w-[180px] flex-1">
          <div className="text-[10px] font-bold tracking-[0.3em] text-[var(--dim)]">LADDER</div>
          <div className="font-disp text-xl leading-none" style={{ color: league.color }}>
            {league.name} · <span className="num">{save.trophies.toLocaleString()}</span> 🏆
          </div>
          <div className="mt-1 text-[11.5px] font-semibold text-[var(--dim)]">
            Victory <span className="font-bold text-[#3dff8e]">+{TROPHY_WIN}</span> · Defeat{" "}
            <span className="font-bold text-[#ff4d5e]">-{TROPHY_LOSS}</span>
            {nextL ? ` · ${(nextL.min - save.trophies).toLocaleString()} to ${nextL.name}` : " · top league reached"}
          </div>
          {nextL && (
            <div className="bar-track mt-1.5">
              <div
                className="bar-fill"
                style={{
                  width: `${Math.max(4, Math.min(100, ((save.trophies - league.min) / Math.max(1, nextL.min - league.min)) * 100))}%`,
                  background: `linear-gradient(90deg, ${league.color}, ${nextL.color})`,
                }}
              />
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="pill-dark text-[11px] text-[var(--dim)]">
            BEST <span className="num">{save.bestTrophies.toLocaleString()}</span>
          </span>
          <span className="pill-dark text-[11px] text-[var(--dim)]">
            STREAK <span className="num">{save.streak}</span>
          </span>
        </div>
      </div>

      {/* DAILY REWARDS */}
      <div className="tile relative p-3" data-testid="daily-rewards">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-disp text-xl text-[#ffcf4d]">Daily Rewards</div>
            <div className="text-[12px] font-semibold text-[var(--dim)]">
              Streak {save.dailyStreak}/7 · claiming now opens day {day}. Resets every day at{" "}
              <span className="font-bold text-[#ffcf4d]">07:00</span> — next in{" "}
              <span className="font-bold text-[var(--cyan)]">{resetCountdown()}</span>. Miss a day and the streak restarts.
            </div>
          </div>
          <button className="cta-banner shrink-0 px-5 py-2.5 text-[14px]" data-testid="daily-claim" disabled={!canClaim} onClick={doClaim}>
            {canClaim ? `CLAIM DAY ${day}` : "CLAIMED · 07:00"}
          </button>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {DAILY_REWARDS.map((r, i) => {
            const n = i + 1;
            const done = n < day || (n === save.dailyStreak && !canClaim);
            const next = n === day && canClaim;
            return (
              <div
                key={n}
                className={`day-tile relative flex flex-col items-center gap-1 p-2 ${next ? "next" : done ? "done" : ""}`}
                style={next ? { borderColor: r.accent } : undefined}
              >
                <span className={`badge-num ${next ? "" : "dim"}`}>{n}</span>
                <div className="flex h-9 items-center gap-1">
                  <DailyIcon reward={r} />
                </div>
                <span className="text-center text-[9.5px] font-bold leading-tight" style={{ color: next ? r.accent : "var(--dim)" }}>
                  {r.label}
                </span>
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

      {/* chip + shard inventory strip */}
      <div className="relative flex flex-wrap items-center justify-center gap-2 pb-2">
        {CHIPS.map((c) => (
          <span key={c.id} className="pill-dark text-[11px]" style={{ borderColor: c.color + "66", color: c.color }} title={c.desc}>
            <ChipIcon id={c.id} size={18} />
            {c.short} <span className="num">{save.chips[c.id] || 0}</span>
          </span>
        ))}
        <span className="pill-dark text-[11px]" style={{ borderColor: hero.color + "66", color: hero.color }}>
          <ShardIcon size={16} color={hero.color} />
          {hero.name} shards <span className="num">{shards}</span>
        </span>
        <button className="btn px-3 py-1 text-[11px]" disabled={shards < HERO_SHARD_COST || lv >= HERO_MAX_LEVEL} onClick={doShardLevel}>
          Level with {HERO_SHARD_COST} shards
        </button>
      </div>

      {upg && <UpgradeCeremony data={upg} onClose={() => setUpg(null)} />}
      {claim && <RewardClaim data={claim} onClose={() => setClaim(null)} />}
    </div>
  );
}

/** calendar tile icon chosen from the reward's `icon` hint */
function DailyIcon({ reward }: { reward: (typeof DAILY_REWARDS)[number] }) {
  switch (reward.icon) {
    case "gem":
      return <GemIcon size={26} />;
    case "token":
      return <TokenIcon size={26} />;
    case "chip":
      return (
        <span className="flex items-center">
          <ChipIcon id="basic" size={22} />
          <ChipIcon id="advanced" size={22} />
        </span>
      );
    case "chest":
      return <MiniChest color={reward.accent} size={30} n={reward.chests?.reduce((a, c) => a + c.n, 0) || 1} />;
    case "frag":
      return <TowerIcon def={TOWERS.find((t) => t.rarity === "legendary") || TOWERS[0]} size={26} />;
    default:
      return <CoinIcon size={26} />;
  }
}

function MiniChest({ color, size = 28, n = 1 }: { color: string; size?: number; n?: number }) {
  return (
    <span className="relative inline-flex">
      <svg width={size} height={size} viewBox="0 0 90 90">
        <rect x="12" y="34" width="66" height="40" rx="6" fill="#3a2a12" stroke={color} strokeWidth="5" />
        <path d="M12 42c0-14 14-22 33-22s33 8 33 22v6H12z" fill="#5c451f" stroke={color} strokeWidth="5" />
        <rect x="38" y="36" width="14" height="20" rx="3" fill={color} />
      </svg>
      {n > 1 && (
        <span className="absolute -right-1.5 -top-1 rounded bg-black/80 px-1 text-[9px] font-bold" style={{ color }}>
          ×{n}
        </span>
      )}
    </span>
  );
}

/** little glyph per event, drawn inline so there are still no image assets */
export function EventGlyph({ id, color, size = 40 }: { id: string; color: string; size?: number }) {
  const common = { fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill={color + "18"} stroke={color + "66"} strokeWidth="1" />
      {id === "luck" && (
        <g {...common}>
          <path d="M12 6c2.2 0 3 1.6 3 2.8 0 2.4-3 2.2-3 5.2" />
          <path d="M9 9c0-2 1.3-3 3-3" />
          <circle cx="12" cy="17.5" r="0.9" fill={color} />
          <path d="M6.5 7.5 5 6M17.5 7.5 19 6" />
        </g>
      )}
      {id === "chestbox" && (
        <g {...common}>
          <rect x="5" y="10" width="14" height="8" rx="1.5" />
          <path d="M5 12.5c0-3 3-4.5 7-4.5s7 1.5 7 4.5" />
          <path d="M11 10h2v4h-2z" fill={color} />
        </g>
      )}
      {id === "trophy" && (
        <g {...common}>
          <path d="M8.5 5h7v3.5a3.5 3.5 0 0 1-7 0z" />
          <path d="M8.5 6H6v1a2.6 2.6 0 0 0 2.5 2.6M15.5 6H18v1a2.6 2.6 0 0 1-2.5 2.6" />
          <path d="M10.6 12h2.8l-.4 2.4H15V17H9v-2.6h2.1z" />
        </g>
      )}
      {id === "items" && (
        <g {...common}>
          <path d="M12 5.5 17.5 8.5v6L12 17.5 6.5 14.5v-6z" />
          <path d="M6.5 8.5 12 11.5l5.5-3M12 11.5v6" />
        </g>
      )}
      {id === "mineshaft" && (
        <g {...common}>
          <path d="M6 16.5 13.5 9" />
          <path d="M11 6.5c2.5-1 5 .5 6 2.2-1.8.3-2.6 1-3.2 2-1.1-1.6-1.9-2.9-2.8-4.2z" />
          <path d="M5 18.5h5" />
        </g>
      )}
      {id === "lightning" && (
        <g {...common}>
          <path d="M13 4.5 8 13h3.5L10.5 19.5 16 11h-3.5z" fill={color + "44"} />
          <path d="M4.5 9A3.5 3.5 0 0 1 8 6" />
        </g>
      )}
    </svg>
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

/**
 * The Specials hub. Two tabs: the weekday event rotation and the weekly trophy
 * competition ladder.
 */
export function Specials({
  save,
  mutate,
  push,
}: {
  save: SaveData;
  mutate: (fn: (s: SaveData) => void) => void;
  push: (m: string, c?: string) => void;
}) {
  const [tab, setTab] = useState<"tasks" | "events" | "competition">("tasks");
  const ready = tasksReady(save);
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-3 overflow-y-auto scroll-thin pr-1">
      <div className="flex items-center gap-2">
        <button
          className={`tab-btn relative ${tab === "tasks" ? "on" : ""}`}
          data-testid="tab-tasks"
          onClick={() => { sfx.click(); setTab("tasks"); }}
        >
          TASKS
          {ready > 0 && <span className="badge-ping">{ready}</span>}
        </button>
        <button className={`tab-btn ${tab === "events" ? "on" : ""}`} data-testid="tab-events" onClick={() => { sfx.click(); setTab("events"); }}>
          EVENTS
        </button>
        <button className={`tab-btn ${tab === "competition" ? "on" : ""}`} data-testid="tab-competition" onClick={() => { sfx.click(); setTab("competition"); }}>
          COMPETITION
        </button>
        <span className="ml-auto text-[11px] font-bold tracking-widest text-[var(--dim)]">RESETS 07:00 · {resetCountdown()}</span>
      </div>
      {tab === "tasks" ? (
        <TasksPanel save={save} mutate={mutate} push={push} />
      ) : tab === "events" ? (
        <EventsPanel save={save} mutate={mutate} push={push} />
      ) : (
        <CompetitionPanel save={save} mutate={mutate} push={push} />
      )}
    </div>
  );
}

/**
 * Daily tasks. Eight objectives reset at 07:00 alongside the rest of the daily
 * content; each pays gold + gems on claim and banks points toward three
 * escalating milestone caches.
 */
function TasksPanel({
  save,
  mutate,
  push,
}: {
  save: SaveData;
  mutate: (fn: (s: SaveData) => void) => void;
  push: (m: string, c?: string) => void;
}) {
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const pts = taskPoints(save);
  const pct = Math.min(100, (pts / TASK_POINTS_TOTAL) * 100);

  const doClaim = (t: DailyTask) => {
    // roll on a draft so the loot is available synchronously for the overlay,
    // then commit through mutate with the claimed-guard doing the real work
    const draft = cloneSave(save);
    const loot = claimTask(draft, t.id);
    if (!loot) {
      sfx.error();
      return push("Task not complete yet", "#ff4d5e");
    }
    mutate((s) => {
      claimTask(s, t.id);
    });
    sfx.chest();
    setClaim({ title: t.name.toUpperCase(), subtitle: `+${t.points} task points`, lines: lootLines(loot), color: t.color });
  };

  const doMilestone = (idx: number) => {
    const m = TASK_MILESTONES[idx];
    const draft = cloneSave(save);
    const loot = claimMilestone(draft, idx);
    if (!loot) {
      sfx.error();
      return push(`Need ${m.points} task points`, "#ff4d5e");
    }
    mutate((s) => {
      claimMilestone(s, idx);
    });
    sfx.ceremony();
    setClaim({ title: m.label.toUpperCase(), subtitle: `${m.points} task points reached`, lines: lootLines(loot), color: "#ffcf4d", chest: true, chestCount: 2 });
  };

  return (
    <div className="flex flex-col gap-3" data-testid="daily-tasks">
      {/* milestone track */}
      <div className="tile tile-gold holo p-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-[0.3em] text-[#ffcf4d]">DAILY TASKS</div>
            <div className="font-disp text-2xl leading-none text-white">
              <span className="num" style={{ color: "#ffcf4d" }}>{pts}</span>
              <span className="text-[var(--dim)]"> / {TASK_POINTS_TOTAL} PTS</span>
            </div>
          </div>
          <div className="text-right text-[11px] font-bold text-[var(--dim)]">
            {tasksRemaining(save)} TASKS LEFT
          </div>
        </div>
        <div className="task-bar mt-2">
          <span className="task-bar-fill" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#ffb324,#ffe9a8)" }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {TASK_MILESTONES.map((m, i) => {
            const hit = pts >= m.points;
            const got = milestoneClaimed(save, i);
            return (
              <button
                key={m.points}
                className={`milestone-node tile flex flex-col items-center gap-1 p-2 ${hit && !got ? "ready" : ""} ${hit ? "hit" : ""}`}
                data-testid={`milestone-${i}`}
                disabled={!hit || got}
                style={{ opacity: got ? 0.5 : 1, borderColor: hit ? "#ffcf4d" : undefined }}
                onClick={() => doMilestone(i)}
              >
                <MiniChest size={34} color={hit ? "#ffcf4d" : "#5a5f87"} />
                <span className="text-[11px] font-bold" style={{ color: hit ? "#ffcf4d" : "var(--dim)" }}>
                  {m.points} PTS
                </span>
                <span className="text-[10.5px] font-semibold text-[var(--dim)]">{got ? "CLAIMED" : m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* the task list */}
      {DAILY_TASKS.map((t) => {
        const prog = Math.min(t.need, taskProgress(save, t.id));
        const done = taskComplete(save, t.id);
        const got = taskClaimed(save, t.id);
        return (
          <div
            key={t.id}
            className={`task-row tile flex items-center gap-3 p-3 ${done && !got ? "ready" : ""} ${got ? "done" : ""}`}
            data-testid={`task-${t.id}`}
            style={{ borderColor: done && !got ? "#3dff8e" : undefined }}
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border" style={{ borderColor: t.color + "66", background: t.color + "1c" }}>
              <span className="font-disp text-[17px]" style={{ color: t.color }}>
                {Math.round((prog / t.need) * 100)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-disp text-[17px] leading-none" style={{ color: t.color }}>{t.name}</span>
                <span className="text-[11px] font-bold text-[var(--dim)]">+{t.points} PTS</span>
              </div>
              <div className="truncate text-[12px] font-semibold text-[var(--dim)]">{t.desc}</div>
              <div className="task-bar mt-1.5">
                <span
                  className="task-bar-fill"
                  style={{ width: `${(prog / t.need) * 100}%`, background: `linear-gradient(90deg,${t.color},#ffffff)` }}
                />
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-[var(--dim)]">
                <span className="num">{prog.toLocaleString()} / {t.need.toLocaleString()}</span>
                <span className="inline-flex items-center gap-1"><CoinIcon size={13} />{t.gold.toLocaleString()}</span>
                <span className="inline-flex items-center gap-1"><GemIcon size={13} />{t.gems}</span>
              </div>
            </div>
            <button
              className={`shrink-0 px-4 py-2 text-[13px] ${done && !got ? "cta-banner" : "btn-ghost"}`}
              data-testid={`task-claim-${t.id}`}
              disabled={!done || got}
              onClick={() => doClaim(t)}
            >
              {got ? "DONE" : done ? "CLAIM" : "GO"}
            </button>
          </div>
        );
      })}

      {claim && <RewardClaim data={claim} onClose={() => setClaim(null)} />}
    </div>
  );
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** the seven-day event rotation, with the live one pinned to the top */
function EventsPanel({
  save,
  mutate,
  push,
}: {
  save: SaveData;
  mutate: (fn: (s: SaveData) => void) => void;
  push: (m: string, c?: string) => void;
}) {
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const live = eventForDate();
  const today = new Date().getDay();

  const doClaim = () => {
    if (!eventClaimable(save)) {
      sfx.error();
      return push("Event bonus already taken today", "#ff4d5e");
    }
    const draft = cloneSave(save);
    const loot = claimEventBonus(draft);
    if (!loot) return;
    mutate((s) => {
      if (s.lastEvent === todayStr()) return;
      grantLoot(s, loot);
      s.lastEvent = todayStr();
    });
    sfx.chest();
    setClaim({
      title: live.name.toUpperCase(),
      subtitle: `${live.tagline} event bonus`,
      lines: lootLines(loot),
      color: live.color,
      chest: live.id === "chestbox",
      chestCount: 2,
    });
  };

  return (
    <>
      <div className="panel event-card live relative overflow-hidden p-5" style={{ borderColor: live.color + "88" }} data-testid="event-live">
        <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(620px 180px at 25% 0%, ${live.color}66, transparent 70%)` }} />
        <div className="relative flex flex-wrap items-start gap-4">
          <EventGlyph id={live.id} color={live.color} size={76} />
          <div className="min-w-[220px] flex-1">
            <div className="flex items-center gap-2">
              <span className="live-dot" style={{ background: live.color }} />
              <span className="text-[10px] font-bold tracking-[0.32em] text-[var(--dim)]">LIVE NOW · {live.tagline.toUpperCase()}</span>
            </div>
            <div className="font-disp text-3xl leading-none" style={{ color: live.color }}>
              {live.name}
            </div>
            <p className="mt-1.5 max-w-lg text-[14px] font-semibold text-[var(--dim)]">{live.desc}</p>
            <div className="mt-2 inline-block rounded-lg border px-2.5 py-1 text-[12px] font-bold" style={{ borderColor: live.color + "66", color: live.color }}>
              {live.perk}
            </div>
          </div>
          <button className="cta-banner shrink-0 px-5 py-3 text-[14px]" disabled={!eventClaimable(save)} onClick={doClaim}>
            {eventClaimable(save) ? "CLAIM BONUS" : "CLAIMED TODAY"}
          </button>
        </div>
      </div>

      <div className="text-sm font-bold tracking-[0.25em] text-[var(--cyan)]">WEEKLY ROTATION</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {WEEKDAYS.map((name, day) => {
          const ev = EVENTS.find((e) => e.days.includes(day))!;
          const on = day === today;
          const b = eventBonus(ev.id);
          return (
            <div
              key={name}
              className={`tile flex items-start gap-3 p-3 ${on ? "event-card live" : ""}`}
              style={{ borderColor: on ? ev.color : ev.color + "33", opacity: on ? 1 : 0.82 }}
            >
              <EventGlyph id={ev.id} color={ev.color} size={42} />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold tracking-[0.26em] text-[var(--dim)]">{name.toUpperCase()}{on ? " · TODAY" : ""}</div>
                <div className="font-disp text-lg leading-none" style={{ color: ev.color }}>
                  {ev.name}
                </div>
                <p className="mt-1 text-[11.5px] font-semibold leading-snug text-[var(--dim)]">{ev.desc}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {b.goldMul !== 1 && <span className="pill-dark text-[10px] text-[#ffcf4d]">×{b.goldMul} GOLD</span>}
                  {b.gemMul !== 1 && <span className="pill-dark text-[10px] text-[#35e0ff]">×{b.gemMul} GEMS</span>}
                  {b.trophyWin > 0 && <span className="pill-dark text-[10px] text-[#ff4fd8]">+{b.trophyWin} 🏆</span>}
                  {b.chestPriceMul !== 1 && <span className="pill-dark text-[10px] text-[#3dff8e]">-{Math.round((1 - b.chestPriceMul) * 100)}% CHESTS</span>}
                  {b.chipDrop && <span className="pill-dark text-[10px] text-[#8fe9ff]">CHIP DROPS</span>}
                  {b.fragBias > 0 && <span className="pill-dark text-[10px] text-[#ffb324]">RARE LUCK</span>}
                  {b.hpMul !== 1 && <span className="pill-dark text-[10px] text-[#ff4d5e]">+{Math.round((b.hpMul - 1) * 100)}% ENEMY HP</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {claim && <RewardClaim data={claim} onClose={() => setClaim(null)} />}
    </>
  );
}

/** weekly trophy ladder with a payout the player collects once per week */
function CompetitionPanel({
  save,
  mutate,
  push,
}: {
  save: SaveData;
  mutate: (fn: (s: SaveData) => void) => void;
  push: (m: string, c?: string) => void;
}) {
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const week = weekStr();
  const board = useMemo(() => competitionBoard(save.trophies, week), [save.trophies, week]);
  const rank = board.findIndex((r) => r.name === "You") + 1;
  const tier = competitionTier(rank);
  const claimed = compClaimed(save);
  const league = leagueFor(save.trophies);

  const doClaim = () => {
    if (!tier) {
      sfx.error();
      return push("Reach the top 50 to earn a payout", "#ff4d5e");
    }
    if (claimed) {
      sfx.error();
      return push("This week's payout is already collected", "#ff4d5e");
    }
    mutate((s) => {
      claimCompetition(s, tier.gems, tier.gold, tier.chips);
    });
    sfx.chest();
    setClaim({
      title: tier.label.toUpperCase(),
      subtitle: `Week ${week} · rank #${rank}`,
      color: tier.color,
      chest: true,
      lines: lootLines({
        gold: tier.gold,
        gems: tier.gems,
        tokens: 0,
        frags: [],
        chips: tier.chips,
        heroShards: [],
      }),
    });
  };

  // show the player plus their neighbours instead of all 61 rows
  const window = board.slice(Math.max(0, rank - 6), Math.max(12, rank + 5));

  return (
    <>
      <div className="panel relative overflow-hidden p-5" style={{ borderColor: league.color + "88" }} data-testid="competition">
        <div className="absolute inset-0 opacity-25" style={{ background: `radial-gradient(620px 180px at 70% 0%, ${league.color}66, transparent 70%)` }} />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="trophy-pop frame-gold grid h-[86px] w-[86px] shrink-0 place-items-center" style={{ borderColor: league.color }}>
            <TrophyIcon size={52} color={league.color} />
          </div>
          <div className="min-w-[200px] flex-1">
            <div className="text-[10px] font-bold tracking-[0.3em] text-[var(--dim)]">WEEKLY COMPETITION · {week}</div>
            <div className="font-disp text-3xl leading-none" style={{ color: league.color }}>
              Rank #{rank}
            </div>
            <div className="mt-1 text-[13px] font-bold text-[var(--dim)]">
              {league.name} league · <span className="num text-[var(--txt)]">{save.trophies.toLocaleString()}</span> trophies ·{" "}
              {tier ? <span style={{ color: tier.color }}>{tier.label} payout</span> : "outside the payout bracket"}
            </div>
          </div>
          <button className="cta-banner shrink-0 px-5 py-3 text-[14px]" data-testid="comp-claim" disabled={!tier || claimed} onClick={doClaim}>
            {claimed ? "COLLECTED" : tier ? "COLLECT PAYOUT" : "TOP 50 ONLY"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {COMPETITION_TIERS.map((t) => (
          <div
            key={t.label}
            className="tile p-2 text-center"
            style={{ borderColor: rank <= t.rank ? t.color : "var(--line)", opacity: rank <= t.rank ? 1 : 0.6 }}
          >
            <div className="font-disp text-[15px]" style={{ color: t.color }}>
              {t.label}
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1 text-[10.5px] font-bold text-[var(--dim)]">
              <span className="inline-flex items-center gap-0.5 text-[#35e0ff]"><GemIcon size={13} />{t.gems}</span>
              <span className="inline-flex items-center gap-0.5 text-[#ffcf4d]"><CoinIcon size={13} />{t.gold.toLocaleString()}</span>
              {(Object.keys(t.chips) as ChipId[]).map((k) => (
                <span key={k} className="inline-flex items-center gap-0.5">
                  <ChipIcon id={k} size={13} />
                  {t.chips[k]}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-sm font-bold tracking-[0.25em] text-[var(--cyan)]">STANDINGS</div>
      <div className="tile divide-y divide-[var(--line)] p-1" data-testid="ladder">
        {window.map((r) => {
          const pos = board.indexOf(r) + 1;
          const me = r.name === "You";
          return (
            <div key={r.name} className={`ladder-row flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 ${me ? "me" : ""}`}>
              <span className="w-8 shrink-0 text-center font-disp text-[15px]" style={{ color: pos <= 3 ? "#ffcf4d" : "var(--dim)" }}>
                {pos}
              </span>
              <span className="h-7 w-7 shrink-0 rounded-lg" style={{ background: `linear-gradient(135deg, ${leagueFor(r.trophies).color}, #171038)`, border: `1px solid ${leagueFor(r.trophies).color}66` }} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-bold" style={{ color: me ? "#ffcf4d" : "var(--txt)" }}>
                {me ? "You" : r.name}
                <span className="ml-1.5 text-[10.5px] font-semibold text-[var(--dim)]">{r.guild}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-bold" style={{ color: leagueFor(r.trophies).color }}>
                <TrophyIcon size={15} color={leagueFor(r.trophies).color} />
                {r.trophies.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5 pb-3">
        {LEAGUES.map((l) => (
          <span key={l.name} className="pill-dark text-[10.5px]" style={{ borderColor: l.color + "55", color: save.trophies >= l.min ? l.color : "var(--dim)" }}>
            {l.name} <span className="num">{l.min.toLocaleString()}</span>
          </span>
        ))}
      </div>
      {claim && <RewardClaim data={claim} onClose={() => setClaim(null)} />}
    </>
  );
}

// ---------- guild ----------

const GUILD_CHATTER: Record<string, [string, string][]> = {
  vanguard: [
    ["Kael", "Anyone farming endless waves tonight?"],
    ["Mira", "Just hit Awakening II on my Lightning Princess."],
    ["Torin", "Power Plant next to a Chrono Spire is broken. In a good way."],
  ],
  storm: [
    ["Vesper", "Storm day doubles gems — do not sleep on Sunday."],
    ["Lumen", "Thunder God at Lv 10 clears wave 20 on its own."],
    ["Rhen", "Donated the war chest, we are two levels off the next perk."],
  ],
  ember: [
    ["Volkan", "Burn comp only run. Who is in?"],
    ["Sable", "Trophy day is tomorrow, bank your wins."],
    ["Brann", "Hellstorm + Toxic Sprayer melts the Rift Overlord."],
  ],
  null: [
    ["Nyx", "Guild chest gave me four advanced chips. Null perk is real."],
    ["Oryx", "We are rank 1 on the weekly board again."],
    ["Quill", "Reminder: three donations a day, every day."],
  ],
};

/**
 * Reworked Guild hall: real membership stored in the save, a contribution
 * level with perks, daily donations, a free daily guild chest, a coin-funded
 * guild store, weekly war objectives and a roster.
 */
export function Guild({
  save,
  mutate,
  push,
}: {
  save: SaveData;
  mutate: (fn: (s: SaveData) => void) => void;
  push: (m: string, c?: string) => void;
}) {
  const [tab, setTab] = useState<"hall" | "store" | "war">("hall");
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState<[string, string][]>([]);
  const guild = save.guild.id ? GUILDS.find((g) => g.id === save.guild.id) || null : null;
  const lvl = guildLevel(save.guild.xp);

  const roster = useMemo(() => {
    if (!guild) return [];
    const board = competitionBoard(save.trophies, weekStr());
    return board
      .filter((r) => r.guild === guild.name || r.name === "You")
      .slice(0, 12)
      .map((r) => ({ ...r, me: r.name === "You" }));
  }, [guild, save.trophies]);

  const doJoin = (id: string) => {
    const g = GUILDS.find((x) => x.id === id)!;
    if (save.trophies < g.trophyReq) {
      sfx.error();
      return push(`${g.name} requires ${g.trophyReq.toLocaleString()} trophies`, "#ff4d5e");
    }
    mutate((s) => {
      joinGuild(s, id);
    });
    sfx.gem();
    push(`Welcome to ${g.name}!`, g.color);
  };

  const doLeave = () => {
    mutate((s) => leaveGuild(s));
    sfx.click();
    push("You left the guild", "#ff4d5e");
  };

  const doDonate = (id: string) => {
    const tier = GUILD_DONATIONS.find((d) => d.id === id)!;
    if (donationsLeft(save) <= 0) {
      sfx.error();
      return push("No donations left today — resets at 07:00", "#ff4d5e");
    }
    if (save.gold < tier.gold) {
      sfx.error();
      return push(`Need ${tier.gold.toLocaleString()} gold`, "#ff4d5e");
    }
    mutate((s) => {
      donateToGuild(s, tier.gold, tier.xp, tier.coins);
    });
    sfx.coin();
    push(`+${tier.xp} guild XP · +${tier.coins} guild coins`, guild?.color || "#ffcf4d");
  };

  const doChest = () => {
    if (!guildChestReady(save)) {
      sfx.error();
      return push("Guild chest already opened today", "#ff4d5e");
    }
    const draft = cloneSave(save);
    const loot = claimGuildChest(draft);
    if (!loot) return;
    mutate((s) => {
      if (s.guild.lastChest === todayStr()) return;
      grantLoot(s, loot);
      s.guild.lastChest = todayStr();
      bumpQuest(s, "chests", 1);
    });
    sfx.chest();
    setClaim({ title: "GUILD CHEST", subtitle: guild?.name || "Daily supply drop", color: guild?.color || "#3dff8e", chest: true, lines: lootLines(loot) });
  };

  const doBuy = (itemId: string) => {
    const item = GUILD_SHOP.find((i) => i.id === itemId)!;
    if (save.guild.coins < item.coins) {
      sfx.error();
      return push(`Need ${item.coins} guild coins`, "#ff4d5e");
    }
    mutate((s) => {
      buyGuildItem(s, item);
    });
    sfx.buy();
    push(`${item.name} redeemed`, item.color);
  };

  const doQuest = (id: string) => {
    const q = GUILD_QUESTS.find((x) => x.id === id)!;
    if (questProgress(save, id) < q.need || questDone(save, id)) {
      sfx.error();
      return push("Objective not ready", "#ff4d5e");
    }
    mutate((s) => {
      claimQuest(s, id);
    });
    sfx.gem();
    push(`${q.name} complete · +${q.coins} coins`, guild?.color || "#ffcf4d");
  };

  const send = () => {
    const text = msg.trim();
    if (!text) return;
    setChat((c) => [...c, ["You", text]]);
    setMsg("");
    sfx.click();
    const pool = GUILD_CHATTER[guild?.id || "vanguard"];
    const reply = pool[Math.floor(Math.random() * pool.length)];
    setTimeout(() => setChat((c) => [...c, reply]), 700);
  };

  if (!guild) {
    return (
      <div className="mx-auto flex h-full max-w-3xl flex-col gap-3 overflow-y-auto scroll-thin pr-1" data-testid="guild">
        <div className="panel p-5">
          <div className="flex items-center gap-3">
            <GuildIcon size={38} />
            <div>
              <div className="font-disp text-2xl text-[#ffcf4d]">Guild Hall</div>
              <p className="text-sm font-semibold text-[var(--dim)]">
                Join a guild to unlock a daily supply chest, the coin store, weekly war objectives and a shared roster.
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {GUILDS.map((g) => {
            const locked = save.trophies < g.trophyReq;
            return (
              <div key={g.id} className="tile p-3" style={{ borderColor: g.color + (locked ? "33" : "88") }}>
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg" style={{ background: `linear-gradient(135deg, ${g.color}, #171038)`, border: `1px solid ${g.color}` }}>
                    <span className="font-disp text-[13px] text-[#0b0722]">{g.tag}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-disp text-lg leading-none" style={{ color: g.color }}>
                      {g.name}
                    </div>
                    <div className="text-[11px] font-bold text-[var(--dim)]">
                      {g.members} members · {g.power.toLocaleString()} power
                    </div>
                  </div>
                </div>
                <p className="mt-1.5 text-[12px] font-semibold italic text-[var(--dim)]">“{g.motto}”</p>
                <div className="mt-1.5 text-[11.5px] font-bold" style={{ color: g.color }}>
                  PERK · {g.perk}
                </div>
                <button className={`btn mt-2 w-full py-2 text-[13px] ${locked ? "" : "btn-gold"}`} disabled={locked} onClick={() => doJoin(g.id)}>
                  {locked ? `Needs ${g.trophyReq.toLocaleString()} 🏆 (you have ${save.trophies.toLocaleString()})` : "Join Guild"}
                </button>
              </div>
            );
          })}
        </div>
        <div className="h-2 shrink-0" />
      </div>
    );
  }

  const left = donationsLeft(save);

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-3 overflow-y-auto scroll-thin pr-1" data-testid="guild">
      {/* banner */}
      <div className="panel relative overflow-hidden p-4" style={{ borderColor: guild.color + "99" }}>
        <div className="absolute inset-0 opacity-25" style={{ background: `radial-gradient(600px 160px at 20% 0%, ${guild.color}77, transparent 70%)` }} />
        <div className="relative flex flex-wrap items-center gap-3">
          <div className="grid h-[62px] w-[62px] shrink-0 place-items-center rounded-xl" style={{ background: `linear-gradient(135deg, ${guild.color}, #171038)`, border: `2px solid ${guild.color}` }}>
            <span className="font-disp text-lg text-[#0b0722]">{guild.tag}</span>
          </div>
          <div className="min-w-[200px] flex-1">
            <div className="font-disp text-2xl leading-none" style={{ color: guild.color }}>
              {guild.name}
            </div>
            <div className="text-[11.5px] font-bold text-[var(--dim)]">
              Guild Lv {lvl.level} · {guild.members} members · PERK: <span style={{ color: guild.color }}>{guild.perk}</span>
            </div>
            <div className="bar-track mt-1.5">
              <div className="bar-fill" style={{ width: `${lvl.need ? Math.min(100, (lvl.into / lvl.need) * 100) : 100}%`, background: `linear-gradient(90deg, ${guild.color}, #fff6)` }} />
            </div>
            <div className="mt-0.5 text-[10.5px] font-bold text-[var(--dim)]">
              {lvl.need ? `${lvl.into.toLocaleString()} / ${lvl.need.toLocaleString()} contribution XP` : "MAX GUILD LEVEL"}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="pill-dark text-[11px]" style={{ borderColor: guild.color + "66", color: guild.color }}>
              <GuildIcon size={15} color={guild.color} /> <span className="num">{save.guild.coins.toLocaleString()}</span> coins
            </span>
            <button className="btn px-3 py-1 text-[11px]" onClick={doLeave}>
              Leave
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(["hall", "store", "war"] as const).map((t) => (
          <button key={t} className={`tab-btn ${tab === t ? "on" : ""}`} onClick={() => { sfx.click(); setTab(t); }}>
            {t === "hall" ? "HALL" : t === "store" ? "COIN STORE" : "GUILD WAR"}
          </button>
        ))}
      </div>

      {tab === "hall" && (
        <>
          {/* daily chest + donations */}
          <div className="tile flex flex-wrap items-center gap-3 p-3">
            <MiniChest color={guild.color} size={46} />
            <div className="min-w-[180px] flex-1">
              <div className="font-disp text-lg" style={{ color: guild.color }}>
                Daily Guild Chest
              </div>
              <div className="text-[11.5px] font-semibold text-[var(--dim)]">
                Chips, gold and fragments from the guild vault. Refills at 07:00 ({resetCountdown()}).
              </div>
            </div>
            <button className="cta-banner shrink-0 px-4 py-2.5 text-[13px]" data-testid="guild-chest" disabled={!guildChestReady(save)} onClick={doChest}>
              {guildChestReady(save) ? "OPEN CHEST" : "OPENED"}
            </button>
          </div>

          <div className="tile p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-disp text-lg text-[#ffcf4d]">Donations</div>
              <span className="pill-dark text-[11px] text-[var(--dim)]">
                {left}/{GUILD_DONATIONS_PER_DAY} LEFT TODAY
              </span>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {GUILD_DONATIONS.map((d) => (
                <button
                  key={d.id}
                  className="tile tile-hover p-2.5 text-left disabled:opacity-50"
                  disabled={left <= 0 || save.gold < d.gold}
                  onClick={() => doDonate(d.id)}
                >
                  <div className="font-disp text-[15px] text-[var(--txt)]">{d.label}</div>
                  <div className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-bold text-[#ffcf4d]">
                    <CoinIcon size={14} /> {d.gold.toLocaleString()}
                  </div>
                  <div className="text-[11px] font-bold text-[#8effc4]">
                    +{d.xp} XP · +{d.coins} coins
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* roster */}
          <div className="tile p-3">
            <div className="font-disp text-lg text-[#ffcf4d]">Roster</div>
            <div className="mt-1.5 divide-y divide-[var(--line)]">
              {roster.map((r) => (
                <div key={r.name} className={`ladder-row flex items-center gap-3 rounded-lg border border-transparent px-2 py-1.5 ${r.me ? "me" : ""}`}>
                  <span className="h-7 w-7 shrink-0 rounded-lg" style={{ background: `linear-gradient(135deg, ${leagueFor(r.trophies).color}, #171038)`, border: `1px solid ${leagueFor(r.trophies).color}66` }} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-bold" style={{ color: r.me ? "#ffcf4d" : "var(--txt)" }}>
                    {r.name}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[12.5px] font-bold" style={{ color: leagueFor(r.trophies).color }}>
                    <TrophyIcon size={14} color={leagueFor(r.trophies).color} />
                    {r.trophies.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* chat */}
          <div className="tile p-3">
            <div className="font-disp text-lg text-[var(--cyan)]">Guild Chat</div>
            <div className="mt-1.5 max-h-48 space-y-1 overflow-y-auto scroll-thin text-[14px] font-semibold">
              {[...GUILD_CHATTER[guild.id], ...chat].map(([n, m], i) => (
                <div key={`${n}-${i}`}>
                  <span style={{ color: n === "You" ? "#ffcf4d" : "var(--cyan)" }}>{n}:</span>{" "}
                  <span className="text-[var(--txt)]">{m}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-black/40 px-3 py-2 text-[13px] font-semibold text-[var(--txt)] outline-none focus:border-[var(--cyan)]"
                placeholder="Message the guild…"
                value={msg}
                maxLength={120}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <button className="btn btn-cyan px-4 py-2 text-[13px]" onClick={send}>
                Send
              </button>
            </div>
          </div>
        </>
      )}

      {tab === "store" && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {GUILD_SHOP.map((item) => {
            const afford = save.guild.coins >= item.coins;
            return (
              <div key={item.id} className="tile p-3" style={{ borderColor: item.color + "55" }}>
                <div className="font-disp text-lg" style={{ color: item.color }}>
                  {item.name}
                </div>
                <p className="mt-0.5 text-[12px] font-semibold text-[var(--dim)]">{item.desc}</p>
                <button className={`btn mt-2 w-full py-2 text-[13px] ${afford ? "btn-gold" : ""}`} disabled={!afford} onClick={() => doBuy(item.id)}>
                  <span className="inline-flex items-center gap-1.5">
                    <GuildIcon size={14} color={afford ? "#0b0722" : item.color} /> {item.coins} coins
                  </span>
                </button>
              </div>
            );
          })}
          <div className="sm:col-span-2 text-[11.5px] font-semibold text-[var(--dim)]">
            Guild coins come from donations, war objectives and the daily chest. You have{" "}
            <span className="font-bold" style={{ color: guild.color }}>
              {save.guild.coins.toLocaleString()}
            </span>
            .
          </div>
        </div>
      )}

      {tab === "war" && (
        <div className="flex flex-col gap-2">
          <div className="text-[11.5px] font-bold tracking-widest text-[var(--dim)]">WEEKLY OBJECTIVES · {weekStr()}</div>
          {GUILD_QUESTS.map((q) => {
            const have = questProgress(save, q.id);
            const done = questDone(save, q.id);
            const ready = have >= q.need && !done;
            return (
              <div key={q.id} className="tile flex flex-wrap items-center gap-3 p-3" style={{ borderColor: ready ? "#3dff8e" : undefined }}>
                <div className="min-w-[180px] flex-1">
                  <div className="font-disp text-[16px] text-[var(--txt)]">{q.name}</div>
                  <div className="text-[11.5px] font-semibold text-[var(--dim)]">
                    {q.desc} · +{q.xp} XP · +{q.coins} coins
                  </div>
                  <div className="bar-track mt-1.5">
                    <div className="bar-fill" style={{ width: `${Math.min(100, (have / q.need) * 100)}%`, background: ready ? "#3dff8e" : guild.color }} />
                  </div>
                  <div className="mt-0.5 text-[10.5px] font-bold text-[var(--dim)]">
                    {Math.min(have, q.need)} / {q.need}
                  </div>
                </div>
                <button className={`btn shrink-0 px-4 py-2 text-[12px] ${ready ? "btn-gold" : ""}`} disabled={!ready} onClick={() => doQuest(q.id)}>
                  {done ? "CLAIMED" : ready ? "CLAIM" : "IN PROGRESS"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="h-2 shrink-0" />
      {claim && <RewardClaim data={claim} onClose={() => setClaim(null)} />}
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
  const [giftCode, setGiftCode] = useState("");
  const [giftMsg, setGiftMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { promptEvent, installed } = useInstallPrompt();
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
              data-testid={`toggle-${key}`}
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

      <div className="mt-4 text-[12px] font-bold tracking-[0.25em] text-[var(--cyan)]">APP</div>
      <div className="mt-1.5 flex items-center justify-between rounded-lg border border-[var(--line)] bg-black/30 px-4 py-3">
        <div>
          <div className="font-bold">Install App</div>
          <div className="text-xs font-semibold text-[var(--dim)]">
            {installed
              ? "Running as an installed app — nice"
              : promptEvent
                ? "Add MagicTD to your home screen and play offline"
                : "Use your browser menu → Add to Home Screen"}
          </div>
        </div>
        <button
          data-testid="install-app"
          className="btn btn-cyan shrink-0 px-4 py-1.5 text-sm"
          disabled={installed || !promptEvent}
          onClick={() => {
            sfx.click();
            promptEvent?.prompt();
          }}
        >
          {installed ? "Installed" : "Install"}
        </button>
      </div>

      <div className="mt-4 text-[12px] font-bold tracking-[0.25em] text-[var(--cyan)]">GIFT CODES</div>
      <div className="mt-1.5 rounded-lg border border-[var(--line)] bg-black/30 px-4 py-3">
        <div className="font-bold">Redeem a code</div>
        <div className="text-xs font-semibold text-[var(--dim)]">
          Codes are announced on our socials — each one works once per save.
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={giftCode}
            onChange={(e) => {
              setGiftCode(e.target.value);
              setGiftMsg(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.currentTarget.nextElementSibling as HTMLButtonElement)?.click();
            }}
            placeholder="ENTER CODE"
            aria-label="Gift code"
            className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-black/50 px-3 py-2 text-sm font-bold tracking-[0.15em] text-[var(--txt)] uppercase outline-none placeholder:text-[var(--line2)] focus:border-[var(--cyan)]"
          />
          <button
            className="btn btn-cyan shrink-0 px-4 py-2 text-sm"
            disabled={!giftCode.trim()}
            onClick={() => {
              // redeem on a copy first so the UI can report the outcome immediately
              const next: SaveData = JSON.parse(JSON.stringify(save));
              const r = redeemGiftCode(next, giftCode);
              if (r.ok) {
                persistSave(next);
                mutate((s) => {
                  Object.assign(s, next);
                });
                sfx.gem();
                setGiftCode("");
                setGiftMsg({ ok: true, text: `${r.label} · ${r.summary}` });
              } else {
                sfx.error();
                setGiftMsg({
                  ok: false,
                  text: r.reason === "used" ? "That code was already used on this save" : "That code is not valid",
                });
              }
            }}
          >
            Redeem
          </button>
        </div>
        {giftMsg && (
          <div
            data-testid="gift-msg"
            className="mt-2 text-xs font-bold"
            style={{ color: giftMsg.ok ? "#3dff8e" : "#ff4d5e" }}
          >
            {giftMsg.ok ? "✓ " : "✕ "}
            {giftMsg.text}
          </div>
        )}
        {save.redeemed.length > 0 && (
          <div className="mt-2 text-[11px] font-semibold text-[var(--dim)]">
            Redeemed so far: {save.redeemed.join(", ")}
          </div>
        )}
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
