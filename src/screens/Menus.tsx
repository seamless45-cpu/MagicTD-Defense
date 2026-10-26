import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SaveData } from "../game/save";
import type { ClaimData, UpgradeData } from "../components/ui";
import type { DailyTask } from "../game/data";
import { DAILY_TASKS, TASK_MILESTONES, TASK_POINTS_TOTAL } from "../game/data";
import { FONTS, FONT_BY_ID, DEFAULT_FONT, applyFont } from "../game/fonts";
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
  hardcorePlaysLeft,
  superHardcorePlaysLeft,
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
  claimMonthTier,
  donateToGuild,
  donationsLeft,
  eventClaimable,
  eventStreakMul,
  monthPoints,
  monthTierClaimed,
  nextEventStreak,
  guildChestReady,
  heroLevel,
  joinGuild,
  leaveGuild,
  levelHeroWithShards,
  lootLines,
  nextDailyStreak,
  questDone,
  questProgress,
  resetCountdown,
  upgradeHero,
  awakenHero,
  heroAwkTier,
  weekStr,
  buyGuildItem,
  claimCompetition,
  compClaimed,
  GUILD_DONATIONS_PER_DAY,
  UI_THEMES,
} from "../game/save";
import { sfx, setVolume, setVolumeBoost, setAudioEQ, setBassBoost, setTrebleBoost } from "../game/audio";
import { coreSampleFiles } from "../game/sfxSamples";
import { clearMusic, getMusicSnapshot, loadSavedMusic, pauseMusic, subscribeMusic, setMusicSettings, toggleMusic, uploadMusic, type MusicSnapshot } from "../game/music";
import {
  ChipIcon,
  CoinIcon,
  Emblem,
  GemIcon,
  GuildIcon,
  FpsBars,
  HeroIcon,
  Modal,
  PotionIcon,
  RewardClaim,
  SetIcon,
  ShardIcon,
  TokenIcon,
  TowerIcon,
  TrophyIcon,
  UpgradeCeremony,
  type SetIconName,
} from "../components/ui";
import {
  TOWERS,
  BATTLE_ROUNDS,
  HARDCORE_DAILY_PLAYS,
  SUPER_HARDCORE_WEEKLY_PLAYS,
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
  monthlyEventBonus,
  monthlyEventForDate,
  monthlyTiers,
  MONTHLY_EVENTS,
  guildLevel,
  heroCooldown,
  heroPower,
  heroAwakenCost,
  heroAwkSpec,
  heroAwkText,
  HERO_AWAKENING_MAX_TIER,
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

/**
 * The cold-open: pure black, a spark, then the logo assembles itself out of
 * light while the title slams in letter by letter. Tapping anywhere fast-forwards
 * straight into the loading screen.
 */
export function LaunchIntro({ onDone }: { onDone: () => void }) {
  const [beat, setBeat] = useState(0);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const BOOT_BEATS = [120, 620, 1180, 1700, 2180, 2750];

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDoneRef.current();
  }, []);

  useEffect(() => {
    const timers = BOOT_BEATS.map((ms, i) => setTimeout(() => setBeat(i + 1), ms));
    const out = setTimeout(finish, 3600);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(out);
    };
  }, [finish]);

  // A tap skips the intro — but only once the wordmark has had time to land.
  // The old listener armed on mount, so the very first tap of the session (the
  // one that unlocks audio, or a tap-clearing of the prior screen's toast)
  // killed the intro before it animated: that is the "intro is skipped" bug.
  useEffect(() => {
    const armed = setTimeout(() => {
      window.addEventListener("pointerdown", h, { once: true });
      window.addEventListener("keydown", h, { once: true });
    }, 2200);
    function h() {
      finish();
    }
    return () => {
      clearTimeout(armed);
      window.removeEventListener("pointerdown", h);
      window.removeEventListener("keydown", h);
    };
  }, [finish]);

  const TITLE = "MAGICTD";
  /** the system checks that tick in under the tagline, like a machine coming online */
  const CHECKS = ["LINK ESTABLISHED", "RENDERER ONLINE", "AUDIO ARMED"];
  return (
    <div className="boot-root bt-root" data-testid="launch-intro" aria-label="MagicTD Defense boot sequence">
      <div className="bt-grid" aria-hidden="true" />
      <div className={`bt-sweep ${beat >= 1 ? "on" : ""}`} aria-hidden="true" />
      <div className={`bt-flash ${beat >= 2 ? "on" : ""}`} aria-hidden="true" />
      <div className="boot-stars" aria-hidden="true">
        {Array.from({ length: 18 }, (_, i) => (
          <i key={i} style={{ left: `${(i * 47 + 11) % 100}%`, top: `${(i * 61 + 7) % 100}%`, animationDelay: `${(i % 7) * -0.43}s`, animationDuration: `${2.2 + (i % 5) * 0.4}s` }} />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center bt-stack">
        {/* the rune core: rings draw themselves on, then the emblem lights up */}
        <div className={`bt-core ${beat >= 1 ? "on" : ""} ${beat >= 2 ? "lit" : ""}`}>
          <svg className="bt-ring" viewBox="0 0 200 200" aria-hidden="true">
            <circle className="bt-ring-a" cx="100" cy="100" r="92" pathLength={1} />
            <circle className="bt-ring-b" cx="100" cy="100" r="76" pathLength={1} />
            <circle className="bt-ring-c" cx="100" cy="100" r="60" pathLength={1} />
          </svg>
          <div className="bt-emblem">
            <Emblem size={112} />
          </div>
        </div>

        <div className="mt-4 flex items-end justify-center bt-title">
          {TITLE.split("").map((ch, i) => (
            <span key={i} className={`boot-letter bt-letter ${beat >= 3 ? "on" : ""}`} style={{ animationDelay: `${i * 70}ms` }}>
              {ch}
            </span>
          ))}
        </div>

        <div className={`boot-sub bt-sub ${beat >= 4 ? "on" : ""}`}>DEFENSE</div>
        <div className={`boot-tagline bt-tagline ${beat >= 5 ? "on" : ""}`}>
          DEFEND THE RIFT <span className="boot-dot">◆</span> COMMAND THE STORM
        </div>
        <ul className={`bt-checks ${beat >= 5 ? "on" : ""}`} aria-hidden="true">
          {CHECKS.map((c, i) => (
            <li key={c} style={{ animationDelay: `${i * 180}ms` }}>
              <b>✓</b> {c}
            </li>
          ))}
        </ul>
      </div>

      <div className={`boot-skip ${beat >= 4 ? "on" : ""}`}>TAP TO SKIP</div>
    </div>
  );
}

const LOAD_TIPS = [
  "Gold levels a tower up; fragments push it through ascension.",
  "Endless waves scale enemy health ×2.2 every single round.",
  "Chilled enemies take 25% more damage from every source.",
  "Every tower upgrade adds +8% crit damage to your account.",
  "Bosses start throwing skills at you from round 16.",
  "Tap any tower in the Towers tab for its full stat sheet.",
];

/**
 * The loading screen: logo and title up top, and a single rocket car screaming
 * along a light-track at the bottom. The car's position *is* the progress bar —
 * when the track fills it blasts off and the game takes over.
 */
/** the real assets the first battle needs, each with a weight in the progress bar */
function loadTasks(): { w: number; run: () => Promise<unknown> }[] {
  const url = (path: string) => {
    try {
      return new URL(path, document.baseURI).href;
    } catch {
      return path;
    }
  };
  const fetchBytes = (path: string) =>
    fetch(url(path), { cache: "force-cache" }).then((r) => {
      if (!r.ok) throw new Error(path);
      return r.arrayBuffer();
    });
  // icons are fetched (not decoded) so the browser cache is warm for the shell's
  // own <img> requests; fetch also fails fast in environments without images
  const decodeImage = (path: string) => fetchBytes(path);
  const windowReady = () =>
    document.readyState === "complete"
      ? Promise.resolve()
      : new Promise<void>((resolve) => window.addEventListener("load", () => resolve(), { once: true }));
  const fontsReady = () => {
    const fs = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    return fs?.ready ?? Promise.resolve();
  };
  const sampleTasks = coreSampleFiles().map((file) => ({ w: 0.4, run: () => fetchBytes(`sfx/${file}`) }));
  return [
    { w: 3, run: windowReady },
    { w: 3, run: fontsReady },
    { w: 2, run: () => fetchBytes("fonts/edo.ttf") },
    { w: 1, run: () => decodeImage("icons/icon-192.png") },
    { w: 1, run: () => decodeImage("icons/icon-512.png") },
    { w: 1, run: () => decodeImage("icons/favicon-64.png") },
    ...sampleTasks,
  ];
}

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [p, setP] = useState(0);
  const [launching, setLaunching] = useState(false);
  const [tip, setTip] = useState(0);
  /** the shell and the fonts are in — the car is only waiting on its own lap now */
  const [ready, setReady] = useState(false);
  const doneRef = useRef(false);
  const readyRef = useRef(false);
  const pRef = useRef(0);
  const rafRef = useRef(0);
  const outRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** the skip gesture only arms once the screen has been up for a moment */
  const armedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  pRef.current = p;

  /**
   * End the warm-up the way it should end: drive the car to the end of the track
   * first, then let it launch. Cutting straight from 12% to the arena (the old
   * behaviour) is what made a skipped boot look like a glitch.
   */
  const finish = useCallback((from?: number) => {
    if (doneRef.current) return;
    doneRef.current = true;
    const start = Math.max(0, Math.min(1, from ?? pRef.current));
    const t0 = performance.now();
    const ramp = (t: number) => {
      const k = start >= 1 ? 1 : Math.min(1, (t - t0) / 340);
      setP(start + (1 - start) * k);
      if (k < 1) {
        rafRef.current = requestAnimationFrame(ramp);
        return;
      }
      setLaunching(true);
      outRef.current = setTimeout(() => onDoneRef.current(), 620);
    };
    rafRef.current = requestAnimationFrame(ramp);
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      if (outRef.current) clearTimeout(outRef.current);
    },
    []
  );

  /**
   * The lap is driven by two things: a minimum warm-up (so the car is always
   * seen) and the shell actually being ready (window load + webfonts). The old
   * version was a bare 2.2s timer, so on a slow first load the car reached the
   * end and the arena opened while Bungee was still swapping in — the first
   * frames of the game then reflowed. The hard cap keeps a stuck font request
   * from stranding the player on the loading screen.
   */
  /**
   * Real loading. The bar follows the resources the game actually needs: the
   * window, the webfonts, the EDO display font, the icon images and the core
   * sound samples. Each task counts once it has finished (or failed, or stalled
   * past its timeout), so the car tracks real work instead of a fixed clock.
   * The bar eases toward the true fraction and never runs ahead of it.
   */
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const tasks = loadTasks();
    const total = tasks.reduce((a, task) => a + task.w, 0) || 1;
    let loaded = 0;
    for (const task of tasks) {
      const stall = new Promise<void>((resolve) => setTimeout(resolve, 4000));
      Promise.race([task.run().catch(() => {}), stall]).then(() => {
        if (!cancelled) loaded += task.w;
      });
    }
    // hard cap: whatever is still pending after 5 s is counted as done, so a
    // bad network can never strand the player on the loading screen
    const cap = setTimeout(() => {
      if (!cancelled) loaded = total;
    }, 5000);
    const t0 = performance.now();
    let shown = 0;
    const tick = (t: number) => {
      if (doneRef.current || cancelled) return;
      const target = Math.min(1, loaded / total);
      // ease toward the real fraction; a small floor keeps the car moving
      shown = Math.min(target, shown + Math.max(0.004, (target - shown) * 0.14));
      setP(shown);
      if (!readyRef.current && loaded >= total) {
        readyRef.current = true;
        setReady(true);
      }
      // a short floor so the car lap is always seen, even on a fast cache hit
      const seen = t - t0 >= 900;
      if (readyRef.current && seen && shown >= 0.985) finish(shown);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(cap);
    };
  }, [finish]);

  useEffect(() => {
    const t = setInterval(() => setTip((i) => (i + 1) % LOAD_TIPS.length), 1800);
    return () => clearInterval(t);
  }, []);

  // A skip only counts when the gesture STARTS on this screen. The tap that
  // fast-forwards the intro dispatches its pointerup and click to whatever sits
  // under the finger by then — which is this screen — so listening for clicks
  // meant one tap on the intro also killed the car screen a heartbeat later.
  // That is the "boot screen is skipped" bug: pointerdown cannot be inherited
  // from a gesture that began on the previous screen.
  useEffect(() => {
    const arm = setTimeout(() => {
      armedRef.current = true;
    }, 400);
    const h = () => {
      if (armedRef.current) finish();
    };
    window.addEventListener("keydown", h);
    return () => {
      clearTimeout(arm);
      window.removeEventListener("keydown", h);
    };
  }, [finish]);

  const pct = Math.round((launching ? 1 : p) * 100);

  return (
    <div
      className={`load-root ld-root h-full w-full ${launching ? "launching" : ""}`}
      data-testid="loading-screen"
      onPointerDown={() => {
        if (armedRef.current) finish();
      }}
    >
      <div className="load-grid" />
      <div className="ld-aurora" aria-hidden="true" />
      <div className="ld-flare" aria-hidden="true" />

      {/* ---------- emblem with a live progress ring, title below ---------- */}
      <div className="load-top ld-top">
        <div className="ld-emblem">
          <svg className="ld-ring" viewBox="0 0 120 120" aria-hidden="true">
            <circle className="ld-ring-track" cx="60" cy="60" r="56" pathLength={1} />
            <circle className="ld-ring-fill" cx="60" cy="60" r="56" pathLength={1} style={{ strokeDashoffset: 1 - (launching ? 1 : p) }} />
            <circle className="ld-ring-orbit" cx="60" cy="60" r="48" pathLength={1} />
          </svg>
          <Emblem size={92} />
        </div>
        <div className="load-word ld-word">
          <span className="load-word-a">MagicTD</span>
          <span className="load-word-b">DEFENSE</span>
        </div>
      </div>

      {/* ---------- the progress bar: segmented fill with a travelling spark ---------- */}
      <div className="load-bay ld-bay">
        <div
          className="ld-track"
          role="progressbar"
          aria-label="Loading progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div className="ld-fill" style={{ width: `${pct}%` }} />
          <div className="ld-spark" style={{ left: `${pct}%` }} data-testid="loading-car">
            <span className="ld-spark-glow" />
            <span className="ld-spark-core" />
            <span className="ld-spark-ring r1" />
            <span className="ld-spark-ring r2" />
            <span className="ld-spark-trail" />
          </div>
        </div>
        <div className="load-bay-row">
          <span className="load-state" data-testid="load-state">
            {launching ? "ENTERING THE ARENA" : ready ? "READY" : "LOADING"}
          </span>
          <span className="load-pct ld-pct">{pct}%</span>
        </div>
        <div key={tip} className="load-tip ld-tip">
          <span className="load-tip-k">TIP</span> {LOAD_TIPS[tip]}
        </div>
        <div className="load-hint">TAP TO SKIP</div>
      </div>
    </div>
  );
}

export function Home({
  save,
  mutate,
  onBattle,
  onEndless,
  onGauntlet,
  onGemRush,
  onHardcore,
  onSuperHardcore,
  onSandbox,
  push,
}: {
  save: SaveData;
  mutate: (fn: (s: SaveData) => void) => void;
  onBattle: () => void;
  onEndless: () => void;
  onGauntlet: () => void;
  onGemRush: () => void;
  onHardcore: () => void;
  onSuperHardcore: () => void;
  onSandbox: () => void;
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
    // affordability is checked BEFORE the mutation — otherwise the hero levelled
    // up for free and only the toast complained about the missing gold
    if (save.gold < cost) {
      sfx.error();
      return push(`Need ${cost.toLocaleString("en-US")} gold to upgrade ${hero.name}`, "#ff4d5e");
    }
    mutate((s) => {
      // upgradeHero re-checks the price on the cloned save, so two taps in the
      // same frame can never buy the same level twice
      upgradeHero(s, hero.id);
    });
    sfx.awaken();
    setUpg(heroUpgData(lv, "LEVEL UP"));
    push(`${hero.name} reached Lv ${lv + 1}`, hero.color);
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
      const chain = nextEventStreak(s);
      grantLoot(s, loot);
      s.lastEvent = todayStr();
      s.eventStreak = chain;
    });
    sfx.chest();
    setClaim({
      title: liveEv.name.toUpperCase(),
      subtitle: `${liveEv.tagline} event bonus · day ${nextEventStreak(save)} streak`,
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

  /** hero awakening tier + purchase (Magic Tokens) */
  const awkTierOf = (slot: 0 | 1) => heroAwkTier(save, hero.id, slot);
  const doHeroAwaken = (slot: 0 | 1) => {
    const spec = heroAwkSpec(hero.id, slot);
    if (!spec) return;
    const cur = awkTierOf(slot);
    if (cur >= HERO_AWAKENING_MAX_TIER) {
      sfx.error();
      return push(`${spec.name} is already maxed`, "#ff4d5e");
    }
    const cost = heroAwakenCost(cur + 1);
    if (save.tokens < cost) {
      sfx.error();
      return push(`Need ${cost} Magic Tokens for ${spec.name}`, "#ff4d5e");
    }
    mutate((s) => {
      awakenHero(s, hero.id, slot);
    });
    sfx.ceremony();
    push(`${hero.name} · ${spec.name} ${["", "I", "II", "III", "IV", "V", "VI"][cur + 1]}`, "#ff4fd8");
  };

  return (
    <div className="scroll-thin relative flex h-full flex-col gap-3 overflow-y-auto py-1 pr-1">
      <div className="anim-slideup text-center">
        <div className="font-disp text-3xl tracking-wide text-[#ffb324]" style={{ textShadow: "0 0 24px rgba(255,179,36,.55)" }}>
          Command Center
        </div>
        <div className="mt-0.5 text-[12px] font-semibold tracking-[0.28em] text-[var(--dim)]">
          ENEMIES GROW +120% STRONGER EVERY WAVE · HOLD THE LINE
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

        {/* HERO AWAKENING — two exclusive token-bought paths per hero */}
        {heroAwkSpec(hero.id, 0) && (
          <div className="mt-3 rounded-xl border border-[#7ce7ff44] bg-[#04181f]/60 p-2.5" data-testid="hero-awakening">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-disp text-[15px] text-[#7ce7ff]">AWAKENING</span>
              <span className="text-[10.5px] font-bold tracking-[0.18em] text-[var(--dim)]">MAGIC TOKENS</span>
              <span className="pill-dark ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-[#ff4fd8]">
                <TokenIcon size={12} />
                <b className="num">{save.tokens}</b>
              </span>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {([0, 1] as const).map((slot) => {
                const spec = heroAwkSpec(hero.id, slot)!;
                const tier = awkTierOf(slot);
                const maxed = tier >= HERO_AWAKENING_MAX_TIER;
                const cost = heroAwakenCost(tier + 1);
                const afford = save.tokens >= cost;
                return (
                  <div
                    key={slot}
                    data-testid={`hero-awakening-${slot}`}
                    className="rounded-lg border border-[#7ce7ff33] bg-black/35 p-2"
                    style={tier > 0 ? { borderColor: "#ff4fd88c", boxShadow: "0 0 16px #ff4fd826" } : undefined}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11.5px] font-bold text-[#ff9be9]">
                        {slot === 0 ? "1" : "2"}. {spec.name}
                      </span>
                      {spec.passive && <span className="rounded bg-[#7ce7ff] px-1 text-[8.5px] font-black leading-tight text-black">PASSIVE</span>}
                    </div>
                    <div className="mt-1 flex gap-1">
                      {Array.from({ length: HERO_AWAKENING_MAX_TIER }, (_, i) => (
                        <i
                          key={i}
                          className="h-1.5 flex-1 rounded-full"
                          style={{ background: i < tier ? "linear-gradient(90deg,#7ce7ff,#ff4fd8)" : "rgba(255,255,255,0.12)" }}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-[10.5px] font-semibold leading-snug text-[var(--dim)]">{spec.desc}</p>
                    <div className="mt-1 text-[10.5px] font-bold" style={{ color: tier > 0 ? "#8effc4" : "var(--line2)" }}>
                      {heroAwkText(hero.id, slot, tier)}
                    </div>
                    <button
                      className={`btn mt-1.5 w-full py-1 text-[11px] ${!maxed && afford ? "btn-cyan" : ""}`}
                      data-testid={`hero-awaken-${slot}`}
                      disabled={maxed || !afford}
                      onClick={() => doHeroAwaken(slot)}
                    >
                      {maxed ? "MAX TIER" : (
                        <span className="inline-flex items-center gap-1">
                          <TokenIcon size={11} /> {cost} · TIER {["", "I", "II", "III", "IV", "V", "VI"][tier + 1]}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
      <div className="relative grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
        <ModeCard
          accent="#3dff8e"
          title="Gauntlet"
          sub="Roguelite · boons every wave"
          body="No wave cap. Pick a boon after every clear and stack the run until it breaks you."
          onClick={onGauntlet}
          delay="120ms"
          badge={`BEST ${save.gauntletBest}`}
        />
        <ModeCard
          accent="#9b7cff"
          title="Sandbox"
          sub="Custom testing arena"
          body="Test towers against adjustable enemies with no competitive rewards or pressure."
          onClick={onSandbox}
          delay="300ms"
          badge="CUSTOM"
        />
        <ModeCard
          accent="#ff315c"
          title="Hardcore"
          sub={`${BATTLE_ROUNDS} rounds · 3 runs a day${save.hardcoreBest ? ` · best R${save.hardcoreBest}` : ""}`}
          body="Double spawns, a second gate, 10× enemy HP, enemies immune to crits, 25% faster enemies — and 5× the rewards."
          onClick={onHardcore}
          delay="180ms"
          badge={hardcorePlaysLeft(save) > 0 ? `${hardcorePlaysLeft(save)}/${HARDCORE_DAILY_PLAYS} LEFT` : "NO RUNS LEFT"}
        />
        <ModeCard
          accent="#ff315c"
          title="Super Hardcore"
          sub="12 rounds · one life · 3 runs a week"
          body="710× enemy HP, 75% faster enemies and 10× rewards. One leak ends the run."
          onClick={onSuperHardcore}
          delay="240ms"
          badge={superHardcorePlaysLeft(save) > 0 ? `${superHardcorePlaysLeft(save)}/${SUPER_HARDCORE_WEEKLY_PLAYS} THIS WEEK` : "NO RUNS LEFT"}
        />
      </div>

      {/* TODAY'S EVENT */}
      <div className="tile event-card live relative p-3" data-testid="today-event" style={{ borderColor: liveEv.color + "77" }}>
        <div className="event-home-layout relative flex flex-wrap items-center gap-3">
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
          <button className="cta-banner shrink-0 px-4 py-2.5 text-[13px]" data-testid={liveEv.id === "gemrush" ? "enter-gem-rush" : "event-claim"} disabled={liveEv.id !== "gemrush" && !eventClaimable(save)} onClick={liveEv.id === "gemrush" ? onGemRush : doEventClaim}>
            {liveEv.id === "gemrush" ? "ENTER GEM RUSH" : eventClaimable(save) ? "CLAIM BONUS" : "CLAIMED"}
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
      {id === "gemrush" && (
        <g {...common}>
          <path d="M7 8.2 10 5h4l3 3.2-5 10.5z" fill={color + "44"} />
          <path d="M7 8.2h10M10 5l2 13.7L14 5M5 12h2M17 12h2" />
        </g>
      )}
      {!(["luck", "chestbox", "trophy", "items", "mineshaft", "gemrush"] as string[]).includes(id) && (
        <g {...common}><path d="M12 5 14.2 10l5.3 2-5.3 2-2.2 5-2.2-5-5.3-2 5.3-2z" fill={color + "66"} /></g>
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
  onAuto,
}: {
  accent: string;
  title: string;
  sub: string;
  body: string;
  onClick: () => void;
  delay: string;
  badge?: string;
  onAuto?: () => void;
}) {
  return (
    <div
      className="tile tile-hover anim-pop group relative overflow-hidden p-4 text-left"
      style={{ animationDelay: delay, borderColor: accent }}
      data-mode={title}
    >
      <button className="relative z-[1] w-full text-left" onClick={() => { sfx.click(); onClick(); }}>
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
      {onAuto && <button className="btn btn-cyan relative z-[2] mt-2 w-full px-3 py-2 text-[11px] font-black tracking-wider" data-testid={`auto-${title.toLowerCase()}`} onClick={() => { sfx.awaken(); onAuto(); }}>⚡ AUTO BATTLE · MAIL REWARDS</button>}
    </div>
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
  onGemRush,
}: {
  save: SaveData;
  mutate: (fn: (s: SaveData) => void) => void;
  push: (m: string, c?: string) => void;
  onGemRush: () => void;
}) {
  const [tab, setTab] = useState<"tasks" | "events" | "competition">("tasks");
  const ready = tasksReady(save);
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-3 overflow-y-auto scroll-thin pr-1">
      <div className="flex items-center gap-2">
        <button
          className={`tab-btn relative ${tab === "tasks" ? "on" : ""}`}
          data-testid="tab-tasks"
          onClick={() => { sfx.uiTab(); setTab("tasks"); }}
        >
          TASKS
          {ready > 0 && <span className="badge-ping">{ready}</span>}
        </button>
        <button className={`tab-btn ${tab === "events" ? "on" : ""}`} data-testid="tab-events" onClick={() => { sfx.uiTab(); setTab("events"); }}>
          EVENTS
        </button>
        <button className={`tab-btn ${tab === "competition" ? "on" : ""}`} data-testid="tab-competition" onClick={() => { sfx.uiTab(); setTab("competition"); }}>
          COMPETITION
        </button>
        <span className="ml-auto text-[11px] font-bold tracking-widest text-[var(--dim)]">RESETS 07:00 · {resetCountdown()}</span>
      </div>
      {tab === "tasks" ? (
        <TasksPanel save={save} mutate={mutate} push={push} />
      ) : tab === "events" ? (
        <EventsPanel save={save} mutate={mutate} push={push} onGemRush={onGemRush} />
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
  onGemRush,
}: {
  save: SaveData;
  mutate: (fn: (s: SaveData) => void) => void;
  push: (m: string, c?: string) => void;
  onGemRush: () => void;
}) {
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const live = eventForDate();
  const month = monthlyEventForDate();
  const monthBonus = monthlyEventBonus(month.id);
  const tiers = monthlyTiers(month.id);
  const monthPts = monthPoints(save);
  const today = new Date().getDay();
  const streak = nextEventStreak(save);

  const doMonthTier = (idx: number) => {
    const draft = cloneSave(save);
    const loot = claimMonthTier(draft, idx);
    if (!loot) {
      sfx.error();
      return push(`Need ${tiers[idx].points} event points`, "#ff4d5e");
    }
    mutate((s) => {
      claimMonthTier(s, idx);
    });
    sfx.ceremony();
    setClaim({
      title: tiers[idx].label.toUpperCase(),
      subtitle: `${month.name} · ${tiers[idx].points} event points`,
      lines: lootLines(loot),
      color: month.color,
      chest: true,
      chestCount: 2,
    });
  };

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
      // resolve the streak against the live save before stamping the date, so
      // the chain can never be double-counted by a stale render
      const chain = nextEventStreak(s);
      grantLoot(s, loot);
      s.lastEvent = todayStr();
      s.eventStreak = chain;
    });
    sfx.chest();
    setClaim({
      title: live.name.toUpperCase(),
      subtitle: `${live.tagline} bonus · day ${streak} streak`,
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
        <div className="event-live-layout relative flex flex-wrap items-start gap-4">
          <EventGlyph id={live.id} color={live.color} size={76} />
          <div className="event-live-copy min-w-0 flex-1">
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
          <div className="event-live-actions flex shrink-0 flex-col items-stretch gap-1.5">
            <button className="cta-banner px-5 py-3 text-[14px]" disabled={live.id !== "gemrush" && !eventClaimable(save)} onClick={live.id === "gemrush" ? onGemRush : doClaim}>
              {live.id === "gemrush" ? "ENTER GEM RUSH" : eventClaimable(save) ? "CLAIM BONUS" : "CLAIMED TODAY"}
            </button>
            {live.id !== "gemrush" ? <div className="rounded-lg border border-[var(--line)] bg-black/35 px-2 py-1 text-center text-[10.5px] font-bold tracking-wider text-[var(--dim)]" data-testid="event-streak">
              STREAK <span className="num" style={{ color: live.color }}>{save.eventStreak}</span>/7 · NEXT ×{eventStreakMul(streak).toFixed(1)} LOOT
            </div> : <div className="rounded-lg border border-[var(--line)] bg-black/35 px-2 py-1 text-center text-[10.5px] font-bold tracking-wider text-[var(--dim)]">5:00 · SURVIVE FOR GEMS</div>}
            <div className="flex justify-center gap-1" aria-hidden="true">
              {Array.from({ length: 7 }, (_, i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: i < save.eventStreak ? live.color : "rgba(120,110,160,0.35)" }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MONTHLY EVENT — the calendar's own modifier, stacking on the weekday rotation */}
      <div className="text-sm font-bold tracking-[0.25em] text-[var(--cyan)]">MONTHLY EVENT</div>
      <div className="panel month-card relative p-5" style={{ borderColor: month.color + "88" }} data-testid="month-live">
        <div className="absolute inset-0 opacity-25" style={{ background: `radial-gradient(620px 180px at 25% 0%, ${month.color}66, transparent 70%)` }} />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="min-w-[220px] flex-1">
            <div className="flex items-center gap-2">
              <span className="live-dot" style={{ background: month.color }} />
              <span className="text-[10px] font-bold tracking-[0.32em] text-[var(--dim)]">
                ALL {month.tagline.toUpperCase()} · {monthBonus.upgradeCostMul < 1 ? "UPGRADES DISCOUNTED" : monthBonus.spMul > 1 ? "SPELL POWER SURGE" : "RIFT MODIFIER LIVE"}
              </span>
            </div>
            <div className="font-disp text-2xl leading-none" style={{ color: month.color }}>
              {month.name}
            </div>
            <p className="mt-1.5 max-w-lg text-[13px] font-semibold text-[var(--dim)]">{month.desc}</p>
            <div className="mt-2 inline-block rounded-lg border px-2.5 py-1 text-[12px] font-bold" style={{ borderColor: month.color + "66", color: month.color }}>
              {month.perk}
            </div>
          </div>
        </div>
      </div>
      {/* MONTHLY TRACK — runs bank event points, three crates pay out */}
      <div className="panel p-3" data-testid="month-track">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold tracking-[0.3em]" style={{ color: month.color }}>
              MONTHLY TRACK
            </div>
            <div className="font-disp text-2xl leading-none text-white">
              <span className="num" style={{ color: month.color }}>{monthPts}</span>
              <span className="text-[var(--dim)]"> / {tiers[tiers.length - 1].points} EVENT PTS</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-black/35 px-2.5 py-1.5 text-[11.5px] font-bold text-[#b98bff]">
            <PotionIcon size={15} />
            <span className="num">{save.potions}</span>
            <span className="text-[var(--dim)]">potions</span>
          </div>
        </div>
        <div className="task-bar mt-2">
          <span
            className="task-bar-fill"
            style={{ width: `${Math.min(100, (monthPts / tiers[tiers.length - 1].points) * 100)}%`, background: `linear-gradient(90deg,${month.color},#ffe9a8)` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {tiers.map((t, i) => {
            const hit = monthPts >= t.points;
            const got = monthTierClaimed(save, i);
            return (
              <button
                key={t.points}
                className={`tile flex flex-col gap-1 p-2.5 text-left ${hit && !got ? "ready" : ""}`}
                data-testid={`month-tier-${i}`}
                disabled={!hit || got}
                style={{ borderColor: hit ? month.color : undefined, opacity: got ? 0.5 : 1 }}
                onClick={() => doMonthTier(i)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider" style={{ color: hit ? month.color : "var(--dim)" }}>
                    {t.label.toUpperCase()}
                  </span>
                  <span className="num text-[11px] font-bold text-[var(--dim)]">{t.points} PTS</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-bold text-[var(--dim)]">
                  <span className="num text-[#ffcf4d]">+{t.gold.toLocaleString()}</span>
                  <span className="num text-[#35e0ff]">+{t.gems}</span>
                  <span className="inline-flex items-center gap-1 text-[#b98bff]"><PotionIcon size={12} />+{t.potions}</span>
                  {t.chips && (
                    <span className="text-[#c44dff]">
                      +{Object.values(t.chips).reduce((a, b) => a + (b || 0), 0)} chips
                    </span>
                  )}
                </div>
                <span className="text-[10.5px] font-bold" style={{ color: got ? "#3dff8e" : hit ? month.color : "var(--line2)" }}>
                  {got ? "CLAIMED" : hit ? "CLAIM CRATE" : "EARN EVENT POINTS IN ANY RUN"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel p-3" data-testid="month-strip">
        <div className="month-strip">
          {MONTHLY_EVENTS.map((m) => (
            <div
              key={m.id}
              className={"month-tile" + (m.id === month.id ? " on" : "")}
              style={{ color: m.color, borderColor: m.id === month.id ? m.color : undefined, opacity: m.id === month.id ? 1 : 0.85 }}
              title={m.name + " — " + m.perk}
            >
              <span className="month-tile-m">{m.tagline.slice(0, 3).toUpperCase()}</span>
              <span className="month-tile-n">{m.name}</span>
            </div>
          ))}
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
        potions: 0,
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

// ---------- guild chat ----------

type ChatChannel = "guild" | "world" | "party";

interface ChatMsg {
  id: number;
  name: string;
  text: string;
  me?: boolean;
  sys?: boolean;
  role?: string;
  react?: string;
}

const CH_ROLE_COLOR: Record<string, string> = { LEADER: "#ffcf4d", OFFICER: "#ff9be9", MEMBER: "#35e0ff" };

const QUICK_CHAT = ["o7", "Need a party", "Boss strategy?", "GG ✨"];

const CHANNELS: [ChatChannel, string, string][] = [
  ["guild", "GUILD", "#35e0ff"],
  ["world", "WORLD", "#ffcf4d"],
  ["party", "PARTY", "#3dff8e"],
];

/** one message bubble: avatar, name plate, text, tappable reaction */
function ChatBubble({ msg, onReact }: { msg: ChatMsg; onReact: () => void }) {
  if (msg.sys) {
    return (
      <div className="chat-sys" data-testid="chat-msg">
        <span>{msg.text}</span>
      </div>
    );
  }
  const tint = msg.me ? "#ffcf4d" : CH_ROLE_COLOR[msg.role || "MEMBER"] || "#35e0ff";
  return (
    <div className={`chat-row ${msg.me ? "me" : ""}`} data-testid="chat-msg">
      <span className="chat-av" style={{ borderColor: tint, color: tint, background: `linear-gradient(140deg, ${tint}33, #0b0722)` }}>
        {msg.name.slice(0, 1).toUpperCase()}
      </span>
      <div className="chat-body">
        <div className="chat-head">
          <span className="chat-name" style={{ color: tint }}>
            {msg.name}
          </span>
          {msg.role && !msg.me && (
            <span className="chat-badge" style={{ borderColor: tint + "66", color: tint }}>
              {msg.role}
            </span>
          )}
          {msg.me && (
            <span className="chat-badge" style={{ borderColor: "#ffcf4d66", color: "#ffcf4d" }}>
              YOU
            </span>
          )}
        </div>
        <button className="chat-text" onClick={onReact} title="Tap to react">
          {msg.text}
          {msg.react && <span className="chat-react">{msg.react}</span>}
        </button>
      </div>
    </div>
  );
}

/**
 * Three persistent local channels, member roles, a same-browser tab presence
 * strip, quick-chat and tap-to-react. Remote multiplayer requires a server.
 */
function ChatPanel({ guildId, guildName, color }: { guildId: string; guildName: string; color: string }) {
  const [ch, setCh] = useState<ChatChannel>("guild");
  const [input, setInput] = useState("");
  const [reacted, setReacted] = useState(0);
  const seq = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(`local-${Math.random().toString(36).slice(2, 9)}`);
  const busRef = useRef<BroadcastChannel | null>(null);
  const lastSeenRef = useRef(new Map<string, number>());
  const [peerCount, setPeerCount] = useState(0);
  const [logs, setLogs] = useState<Record<ChatChannel, ChatMsg[]>>(() => {
    const seed: Record<ChatChannel, ChatMsg[]> = {
      guild: [
        { id: ++seq.current, name: "", text: `${guildName} · local room ready · open another game tab to chat`, sys: true },
      ],
      world: [{ id: ++seq.current, name: "", text: "World channel · messages are shared across your open game tabs", sys: true }],
      party: [{ id: ++seq.current, name: "", text: "Party channel · messages are shared across tabs in your guild", sys: true }],
    };
    try {
      const saved = localStorage.getItem(`magictd_chat_${guildId}`);
      if (!saved) return seed;
      const parsed = JSON.parse(saved) as Partial<Record<ChatChannel, ChatMsg[]>>;
      for (const channel of ["guild", "world", "party"] as const) {
        if (Array.isArray(parsed[channel])) seed[channel] = parsed[channel]!.filter((m) => typeof m?.text === "string").slice(-100);
      }
    } catch { /* local chat remains usable when storage is unavailable */ }
    return seed;
  });

  // The local link supports live chat between game tabs on this browser. It is
  // intentionally not advertised as online matchmaking: no remote server exists.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bus = new BroadcastChannel("magictd-local-chat-v1");
    busRef.current = bus;
    const announce = (online: boolean) => bus.postMessage({ kind: "presence", guildId, senderId: sessionId.current, online, at: Date.now() });
    const refreshPeers = () => {
      const now = Date.now();
      for (const [id, seen] of lastSeenRef.current) if (now - seen > 15000) lastSeenRef.current.delete(id);
      setPeerCount(lastSeenRef.current.size);
      announce(true);
    };
    bus.onmessage = (event: MessageEvent) => {
      const payload = event.data as { kind?: string; guildId?: string; senderId?: string; online?: boolean; channel?: ChatChannel; text?: string; at?: number; name?: string };
      if (!payload || payload.senderId === sessionId.current) return;
      if (payload.kind === "presence") {
        if (payload.guildId !== guildId) return;
        if (payload.online) lastSeenRef.current.set(payload.senderId || "", Date.now());
        else lastSeenRef.current.delete(payload.senderId || "");
        setPeerCount(lastSeenRef.current.size);
        return;
      }
      if (payload.kind !== "message" || typeof payload.text !== "string" || !payload.channel) return;
      if (payload.channel !== "world" && payload.guildId !== guildId) return;
      const text = payload.text.trim().slice(0, 140);
      if (!text) return;
      const msg: ChatMsg = { id: Date.now() + Math.floor(Math.random() * 1000), name: payload.name || `Guest ${payload.senderId?.slice(-4) || ""}`, text, role: "MEMBER" };
      setLogs((prev) => ({ ...prev, [payload.channel!]: [...prev[payload.channel!], msg].slice(-100) }));
    };
    announce(true);
    const heartbeat = window.setInterval(refreshPeers, 5000);
    return () => {
      window.clearInterval(heartbeat);
      announce(false);
      bus.close();
      busRef.current = null;
    };
  }, [guildId]);

  useEffect(() => {
    try { localStorage.setItem(`magictd_chat_${guildId}`, JSON.stringify(logs)); } catch { /* storage quota/private mode */ }
  }, [logs, guildId]);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs, ch]);

  const send = (raw?: string) => {
    const text = (raw ?? input).trim().replace(/\s+/g, " ").slice(0, 140);
    if (!text) return;
    setInput("");
    const mine: ChatMsg = { id: Date.now() + Math.floor(Math.random() * 1000), name: "You", text, me: true, role: "MEMBER" };
    setLogs((prev) => ({ ...prev, [ch]: [...prev[ch], mine].slice(-100) }));
    busRef.current?.postMessage({ kind: "message", channel: ch, guildId, senderId: sessionId.current, name: `Guest ${sessionId.current.slice(-4)}`, text, at: Date.now() });
    sfx.chatSend();
  };

  const react = (id: number) => {
    const glyphs = ["✨", "🔥", "👑", "💀", "🛡️", "💎"];
    const g = glyphs[reacted % glyphs.length];
    setReacted((v) => v + 1);
    sfx.uiPop();
    setLogs((l) => ({ ...l, [ch]: l[ch].map((m) => (m.id === id ? { ...m, react: g } : m)) }));
  };

  const log = logs[ch];

  return (
    <div className="tile chat-panel p-3" data-testid="guild-chat">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-disp text-lg" style={{ color }}>
          GUILD CHAT
        </div>
        <div className="chat-chans ml-auto">
          {CHANNELS.map(([id, label, c]) => (
            <button
              key={id}
              data-testid={`chat-chan-${id}`}
              className={`chat-chan ${ch === id ? "on" : ""}`}
              style={ch === id ? { borderColor: c, color: c, boxShadow: `0 0 14px -4px ${c}` } : undefined}
              onClick={() => {
                sfx.uiTab();
                setCh(id);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="chat-online" data-testid="chat-connection">
        <span className="chat-online-dot" />
        <span className="num">{peerCount + 1}</span> local tab{peerCount === 0 ? "" : "s"} · {peerCount ? "LIVE LINK" : "OPEN ANOTHER TAB TO CHAT LIVE"}
        <span className="ml-auto text-[9px] font-bold tracking-wider text-[var(--dim)]">SAME BROWSER ONLY · NO ONLINE MATCHMAKING SERVER</span>
      </div>

      <div className="chat-log scroll-thin" ref={logRef} data-testid="chat-log">
        {log.map((m) => (
          <ChatBubble key={m.id} msg={m} onReact={() => react(m.id)} />
        ))}

      </div>

      <div className="chat-quick">
        {QUICK_CHAT.map((q) => (
          <button
            key={q}
            className="chip chip-btn"
            onClick={() => {
              sfx.uiPop();
              send(q);
            }}
          >
            {q}
          </button>
        ))}
      </div>

      <div className="chat-input">
        <input
          className="chat-field"
          placeholder={`Message ${ch === "guild" ? guildName : ch === "world" ? "the world" : "your party"}…`}
          value={input}
          maxLength={140}
          data-testid="chat-input"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          className="btn btn-cyan px-4 py-2 text-[13px]"
          data-testid="chat-send"
          disabled={!input.trim()}
          onClick={() => send()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

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
          <button key={t} className={`tab-btn ${tab === t ? "on" : ""}`} onClick={() => { sfx.uiTab(); setTab(t); }}>
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
          <ChatPanel guildId={guild.id} guildName={guild.name} color={guild.color} />
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

/**
 * Fullscreen. Every browser spells this differently, and iOS Safari only really
 * supports it on the video element — so we report the state we can see and let
 * the button do whatever the platform allows.
 */
type FsDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenEnabled?: boolean;
};
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

export function fullscreenSupported() {
  const d = document as FsDoc;
  return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled || (document as FsDoc).webkitFullscreenElement !== undefined);
}

export function fullscreenNow() {
  const d = document as FsDoc;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
}

export async function toggleFullscreen(on?: boolean) {
  const d = document as FsDoc;
  const el = document.documentElement as FsEl;
  try {
    const want = on ?? !fullscreenNow();
    if (want) {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    } else if (d.exitFullscreen) await d.exitFullscreen();
    else if (d.webkitExitFullscreen) await d.webkitExitFullscreen();
    return true;
  } catch {
    // some mobile browsers refuse unless the call comes from a real gesture
    return false;
  }
}

/** live fullscreen state, updated by the browser, not by us */
export function useFullscreen() {
  const [on, setOn] = useState(fullscreenNow);
  useEffect(() => {
    const sync = () => setOn(fullscreenNow());
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync as EventListener);
    };
  }, []);
  const toggle = useCallback(async () => {
    const next = !fullscreenNow();
    const ok = await toggleFullscreen(next);
    if (ok) setOn(next);
    else if (next) {
      // fall back to the browser telling us later
      setOn(fullscreenNow());
    }
  }, []);
  return { on, toggle };
}

/** the settings switch: a chunky knob that rolls across its rail */
function KnobToggle({
  on,
  label,
  testId,
  onToggle,
}: {
  on: boolean;
  label: string;
  testId?: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      data-testid={testId}
      className={`knob ${on ? "on" : ""}`}
      onClick={onToggle}
    >
      <span className="knob-rail">
        <span className="knob-glow" />
        <span className="knob-state">{on ? "ON" : "OFF"}</span>
      </span>
      <span className="knob-head">
        <span className="knob-grip" />
      </span>
      <span className="knob-ripple" aria-hidden="true" />
    </button>
  );
}

/** bottom-left widget that floats the arena into a true fullscreen canvas */
export function FullscreenButton({ compact = false }: { compact?: boolean }) {
  const { on, toggle } = useFullscreen();
  // always rendered: browsers that refuse the request simply leave the page as
  // it was, and hiding the control on a capability guess confuses more than it helps
  const ok = fullscreenSupported();
  return (
    <button
      type="button"
      data-testid="fullscreen-button"
      aria-label={on ? "Exit fullscreen" : "Enter fullscreen"}
      title={ok ? (on ? "Leave fullscreen" : "Play fullscreen") : "This browser may only allow fullscreen from the video player"}
      className={`fs-btn ${compact ? "fs-btn-sm" : ""} ${on ? "on" : ""}`}
      onClick={() => {
        sfx.click();
        void toggle();
      }}
    >
      <svg width={compact ? 16 : 18} height={compact ? 16 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        {on ? (
          <>
            <path d="M9 3H5a2 2 0 0 0-2 2v4" />
            <path d="M3 15v4a2 2 0 0 0 2 2h4" />
            <path d="M15 3h4a2 2 0 0 1 2 2v4" />
            <path d="M21 15v4a2 2 0 0 1-2 2h-4" />
          </>
        ) : (
          <>
            <path d="M4 9V4h5" />
            <path d="M20 9V4h-5" />
            <path d="M4 15v5h5" />
            <path d="M20 15v5h-5" />
          </>
        )}
      </svg>
      {!compact && <span className="fs-btn-txt">{on ? "EXIT FULLSCREEN" : "FULLSCREEN"}</span>}
    </button>
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
  const [diagOpen, setDiagOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [closing, setClosing] = useState(false);
  const [music, setMusic] = useState<MusicSnapshot>(getMusicSnapshot);
  const musicFileRef = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<number | null>(null);
  const { promptEvent, installed } = useInstallPrompt();
  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, 220);
  };
  useEffect(() => {
    void loadSavedMusic();
    return subscribeMusic(setMusic);
  }, []);
  useEffect(() => {
    if (music.duration > 0 && save.musicEnd <= 0) {
      mutate((s) => { s.musicEnd = music.duration; if (!s.musicName) s.musicName = music.name; });
    }
  }, [music.duration, music.name, save.musicEnd, save.musicName, mutate]);
  useEffect(() => () => { if (closeTimer.current !== null) window.clearTimeout(closeTimer.current); }, []);
  const fs = useFullscreen();
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
  const TOGGLES: [string, keyof SaveData & string, string, SetIconName, string][] = [
    ["Battle SFX", "sfx", "Sound effects during battle and menus", "sfx", "#35e0ff"],
    ["Rich FX", "fx", "Extra particles, smoke and hit effects", "fx", "#ff4fd8"],
    ["Bloom", "bloomFx", "Soft light bloom on bright battlefield effects", "fx", "#54f4ff"],
    ["Dynamic Shadows", "shadowFx", "Canvas glow and shadow rendering", "fx", "#b98bff"],
    ["Anti-aliasing", "antiAlias", "Smooth edges and scaled canvas output", "fx", "#8effc4"],
    ["Damage Numbers", "dmgNums", "Floating damage values over every hit", "dmg", "#ffcf4d"],
    ["Battlefield Guides", "guides", "Grid, buildable-cell and range circles", "guides", "#8effc4"],
    ["Auto-Start Waves", "fastWaves", "Skip the countdown between waves", "fast", "#b98bff"],
    ["Auto-Skip Boss Cutscene", "autoSkipBossCut", "Bosses engage immediately — a one-line callout replaces the cutscene card", "boss", "#ff8a3d"],
    ["Reduced Motion", "reducedMotion", "Calms looping menu animations", "calm", "#9fb4c7"],
    ["Performance HUD", "perf", "FPS and live entity counter in battle", "perf", "#3dff8e"],
    ["Hide Notifications", "hideNotifs", "Mutes toast popups and battle callouts — rewards still land", "bell", "#ff9be9"],
    ["Hide Wave Cleared", "hideWaveCleared", "Hides the WAVE CLEARED banners, toasts and counter in battle", "guides", "#7ce7ff"],
    ["Advanced Frame Interpolation", "frameInterp", "Glides between simulation steps for smoother motion at any frame rate", "interp", "#7c5cff"],
    ["Super Performance Booster", "superBoost", "Cuts the heaviest effects, skips motion blur and bloom, and caps the arena at 60 FPS", "power", "#3dff8e"],
    ["Power Saving Mode", "powerSaver", "Caps the arena at 30 FPS, thins effects and skips interpolation — easier on battery and heat", "power", "#ffcf4d"],
    ["Liquid Glass UI", "liquidGlass", "Translucent layered surfaces, blur and specular glass highlights", "fx", "#8feaff"],
  ];
  return (
    <Modal onClose={requestClose} closing={closing} w={470}>
      <div className="font-disp text-2xl text-[#ffcf4d]">Settings</div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-black/25 p-3">
        <div><div className="font-bold">Language</div><div className="text-[11px] font-semibold text-[var(--dim)]">Choose the interface language</div></div>
        <select aria-label="Language" title="Language" data-testid="language-select" className="rounded-lg border border-[var(--line)] bg-[#101329] px-3 py-2 text-sm font-bold" value={save.language} onChange={(e) => mutate((s) => { s.language = e.target.value as SaveData["language"]; })}><option value="en">English</option><option value="th">ไทย</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="ja">日本語</option><option value="ko">한국어</option><option value="zh">简体中文</option></select>
      </div>
      <div className="mt-2 rounded-xl border border-[var(--line)] bg-black/25 p-3" data-testid="toggle-style-picker">
        <div className="mb-2"><div className="font-bold">Toggle mechanism</div><div className="text-[11px] font-semibold text-[var(--dim)]">Choose how the switch looks and warms up when turned on.</div></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([ ["fluorescent", "Fluorescent tube", "Flicker-start glow"], ["incandescent", "Incandescent bulb", "Warm filament fade"], ["led", "LED bulb", "Instant diode"], ["halogen", "Halogen", "Quartz flash-on"], ["edison", "Edison bulb", "Carbon filament warms in steps"] ] as const).map(([id, label, desc]) => (
            <button key={id} type="button" aria-pressed={save.toggleStyle === id} data-testid={`toggle-style-${id}`} onClick={() => { sfx.uiTab(); mutate((s) => { s.toggleStyle = id; }); }} className={`toggle-style-choice ${save.toggleStyle === id ? "active" : ""}`}><span className={`toggle-style-lamp lamp-${id}`} aria-hidden="true" /><span className="block text-[10px] font-bold leading-tight">{label}</span><span className="mt-0.5 block text-[9px] text-[var(--dim)]">{desc}</span></button>
          ))}
        </div>
      </div>

      <div className="mt-4 text-[12px] font-bold tracking-[0.25em] text-[var(--cyan)]">AUDIO</div>
      <div className="row-card mt-1.5">
        <SetIcon name="volume" color="#35e0ff" />
        <div className="min-w-0 flex-1">
          <div className="font-bold">Master Volume</div>
          <div className="text-xs font-semibold text-[var(--dim)]">
            {Math.round(save.vol * 100)}%{save.volBoost ? ` · boosted to ${Math.round(save.vol * 300)}%` : ""}
          </div>
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
      <div className="row-card mt-1.5" data-testid="volume-boost-row">
        <SetIcon name="booster" color="#ff4fd8" />
        <div className="min-w-0 flex-1">
          <div className="font-bold">Volume Booster</div>
          <div className="text-xs font-semibold text-[var(--dim)]">
            Push the master bus up to 300% — for phone speakers in a noisy room. The limiter still keeps peaks clean.
          </div>
        </div>
        <KnobToggle
          on={save.volBoost}
          label="Volume Booster"
          testId="toggle-volBoost"
          onToggle={() => {
            const next = !save.volBoost;
            mutate((s) => { s.volBoost = next; });
            setVolumeBoost(next);
            if (next) sfx.uiPop();
            else sfx.uiOff();
          }}
        />
      </div>

      <div className="mt-3 rounded-xl border border-[var(--line)] bg-black/25 p-3" data-testid="music-player">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-bold">Personal Music · Loop Player</div>
            <div className="truncate text-[11px] font-semibold text-[var(--dim)]" title={music.name || save.musicName}>{music.name || save.musicName || "Upload an audio file from this device"}</div>
          </div>
          <button className="btn btn-cyan px-3 py-1.5 text-xs" onClick={() => musicFileRef.current?.click()}>Choose Audio</button>
          {music.hasTrack && (music.playing
            ? <button className="btn px-3 py-1.5 text-xs" aria-label="Pause personal music" onClick={() => { sfx.click(); pauseMusic(); }}>Pause</button>
            : <button className="btn px-3 py-1.5 text-xs" aria-label="Play personal music" onClick={() => { sfx.click(); void toggleMusic(); }}>Play loop</button>)}
          {music.hasTrack && <button className="btn px-3 py-1.5 text-xs text-[#ff8f9a]" onClick={() => { void clearMusic(); mutate((s) => { s.musicName = ""; s.musicStart = 0; s.musicEnd = 0; }); }}>Remove</button>}
          <input ref={musicFileRef} type="file" accept="audio/*" className="hidden" aria-label="Upload music file" onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void uploadMusic(file).then(() => {
              mutate((s) => { s.musicName = file.name; s.musicStart = 0; s.musicEnd = 0; });
              setMusicSettings({ volume: save.musicVol, start: 0, end: 0, rate: save.musicRate });
            });
            e.currentTarget.value = "";
          }} />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-[11px] font-bold text-[var(--dim)]">Music volume <span className="ml-auto text-[var(--txt)]">{Math.round(save.musicVol * 100)}%</span>
            <input className="w-28 accent-[#35e0ff]" type="range" min="0" max="100" value={Math.round(save.musicVol * 100)} aria-label="Music volume" onChange={(e) => { const volume = Number(e.target.value) / 100; mutate((s) => { s.musicVol = volume; }); setMusicSettings({ volume }); }} />
          </label>
          <label className="flex items-center gap-2 text-[11px] font-bold text-[var(--dim)]">Playback speed / pitch <span className="ml-auto text-[var(--txt)]">{save.musicRate.toFixed(2)}×</span>
            <input className="w-28 accent-[#ff4fd8]" type="range" min="0.5" max="2" step="0.01" value={save.musicRate} aria-label="Music speed and pitch" onChange={(e) => { const rate = Number(e.target.value); mutate((s) => { s.musicRate = rate; }); setMusicSettings({ rate }); }} />
          </label>
          <label className="flex items-center gap-2 text-[11px] font-bold text-[var(--dim)]">Loop start <span className="ml-auto text-[var(--txt)]">{Math.min(save.musicStart, music.duration).toFixed(1)}s</span>
            <input className="w-28 accent-[#8effc4]" type="range" min="0" max={Math.max(0.1, music.duration)} step="0.1" value={Math.min(save.musicStart, Math.max(0, music.duration))} disabled={!music.hasTrack || !music.duration} aria-label="Music loop start" onChange={(e) => { const start = Math.min(Number(e.target.value), Math.max(0, Math.min(save.musicEnd || music.duration, music.duration) - 0.1)); mutate((s) => { s.musicStart = start; }); setMusicSettings({ start }); }} />
          </label>
          <label className="flex items-center gap-2 text-[11px] font-bold text-[var(--dim)]">Loop end <span className="ml-auto text-[var(--txt)]">{Math.min(save.musicEnd || music.duration, music.duration).toFixed(1)}s</span>
            <input className="w-28 accent-[#ffd76a]" type="range" min={Math.min(music.duration, save.musicStart + 0.1)} max={Math.max(0.1, music.duration)} step="0.1" value={Math.min(save.musicEnd || music.duration, Math.max(save.musicStart + 0.1, music.duration))} disabled={!music.hasTrack || !music.duration} aria-label="Music loop end" onChange={(e) => { const end = Math.max(save.musicStart + 0.1, Number(e.target.value)); mutate((s) => { s.musicEnd = end; }); setMusicSettings({ end }); }} />
          </label>
        </div>
        <div className="mt-1 text-[10px] font-semibold text-[var(--dim)]">Track stored privately on this device. Playback loops between the trim points; speed changes also change pitch.</div>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {([['Bass Boost', 'bassBoost', 'Low-end +6 dB', setBassBoost], ['Treble Boost', 'trebleBoost', 'High-end +6 dB', setTrebleBoost]] as const).map(([label, key, desc, apply]) => (
          <div key={key} className="row-card" data-testid={`toggle-${key}`}>
            <SetIcon name="volume" color={key === "bassBoost" ? "#ff8a3d" : "#35e0ff"} />
            <div className="min-w-0 flex-1"><div className="font-bold">{label}</div><div className="text-[11px] font-semibold text-[var(--dim)]">{desc}</div></div>
            <KnobToggle on={save[key]} label={label} onToggle={() => { const next = !save[key]; mutate((s) => { s[key] = next; }); apply(next); }} />
          </div>
        ))}
      </div>
      <div className="mt-2 rounded-xl border border-[var(--line)] bg-black/25 p-3" data-testid="sound-eq">
        <div className="mb-2 font-bold">Sound EQ <span className="text-[10px] font-semibold text-[var(--dim)]">· Sound effects only</span></div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {([['Bass', 'eqBass'], ['Mids', 'eqMid'], ['Treble', 'eqTreble']] as const).map(([label, key]) => (
            <label key={key} className="flex items-center gap-2 text-[11px] font-bold text-[var(--dim)]">{label}<span className="ml-auto min-w-8 text-right text-[var(--txt)]">{save[key] > 0 ? "+" : ""}{save[key]} dB</span>
              <input className="w-24 accent-[#b98bff]" type="range" min="-12" max="12" step="1" value={save[key]} aria-label={`${label} EQ`} onChange={(e) => {
                const value = Number(e.target.value);
                mutate((s) => { s[key] = value; });
                setAudioEQ(key === "eqBass" ? value : save.eqBass, key === "eqMid" ? value : save.eqMid, key === "eqTreble" ? value : save.eqTreble);
              }} />
            </label>
          ))}
        </div>
      </div>

      {/* CAMERA SHAKE — its own section: the on/off switch, the high-frequency
          intensity slider, and the trail smear that only runs while shaking. */}
      <div className="mt-4 text-[12px] font-bold tracking-[0.25em] text-[var(--cyan)]" data-testid="camera-shake-section">CAMERA SHAKE</div>
      <div className="mt-1.5 space-y-2 rounded-xl border border-[var(--line)] bg-black/25 p-3">
        <div className="flex items-center gap-3">
          <SetIcon name="shake" color="#ff8a3d" />
          <div className="min-w-0 flex-1">
            <div className="font-bold">Screen Shake</div>
            <div className="text-xs font-semibold text-[var(--dim)]">High-frequency random jitter on both camera axes for impacts and hero skills</div>
          </div>
          <KnobToggle
            on={save.shakeFx}
            label="Screen Shake"
            testId="toggle-shakeFx"
            onToggle={() => {
              const next = !save.shakeFx;
              mutate((s) => { s.shakeFx = next; });
              if (next) sfx.uiPop();
              else sfx.uiOff();
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-3" data-testid="shake-intensity-row">
          <SetIcon name="shake" color="#ffcf4d" />
          <div className="min-w-[150px] flex-1">
            <div className="font-bold">Shake Intensity</div>
            <div className="text-xs font-semibold text-[var(--dim)]">How hard the arena kicks · {Math.round((save.shakeIntensity ?? 1) * 100)}%</div>
          </div>
          <input
            className="w-40 accent-[#ff8a3d]"
            type="range"
            min="0"
            max="200"
            step="5"
            value={Math.round((save.shakeIntensity ?? 1) * 100)}
            aria-label="Shake intensity"
            data-testid="shake-intensity"
            disabled={!save.shakeFx}
            onChange={(e) => {
              const value = Number(e.target.value) / 100;
              mutate((s) => { s.shakeIntensity = value; });
            }}
          />
          <button
            className="btn shrink-0 px-2.5 py-1 text-[11px]"
            disabled={!save.shakeFx || Math.abs((save.shakeIntensity ?? 1) - 1) < 0.01}
            onClick={() => { sfx.uiTab(); mutate((s) => { s.shakeIntensity = 1; }); }}
          >
            RESET
          </button>
        </div>
        <div className="flex items-center gap-3 border-t border-[var(--line)] pt-3">
          <SetIcon name="shake" color="#ff315c" />
          <div className="min-w-0 flex-1">
            <div className="font-bold">Camera Motion Blur</div>
            <div className="text-xs font-semibold text-[var(--dim)]">Directional trail smear only while camera shake is active</div>
          </div>
          <KnobToggle
            on={save.motionBlur}
            label="Camera Motion Blur"
            testId="toggle-motionBlur"
            onToggle={() => {
              const next = !save.motionBlur;
              mutate((s) => { s.motionBlur = next; });
              if (next) sfx.uiPop();
              else sfx.uiOff();
            }}
          />
        </div>
        <div className="flex items-center gap-3 border-t border-[var(--line)] pt-3" data-testid="motion-blur-amt-row">
          <div className="min-w-0 flex-1">
            <div className="font-bold">Motion Blur Strength</div>
            <div className="text-[11px] font-semibold text-[var(--dim)]">100% is the tuned default. Above 100% the smear gets heavy and can hide enemies.</div>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            step="5"
            value={save.motionBlurAmt}
            aria-label="Motion blur strength"
            data-testid="motion-blur-amt"
            className="w-36"
            style={{ accentColor: save.motionBlurAmt > 100 ? "#ff315c" : "#35e0ff" }}
            onChange={(e) => { const motionBlurAmt = Number(e.target.value); mutate((s) => { s.motionBlurAmt = motionBlurAmt; }); }}
          />
          <span data-testid="motion-blur-amt-value" className="w-12 text-right font-bold" style={{ color: save.motionBlurAmt > 100 ? "#ff315c" : undefined }}>{save.motionBlurAmt}%</span>
        </div>
        <div className="text-[10px] font-semibold text-[var(--dim)]">
          Shake is pure random offset per axis at 120 Hz — no sway, rotation or zoom. Intensity 0% keeps the FX but holds the camera still.
        </div>
      </div>

      <div className="mt-4 text-[12px] font-bold tracking-[0.25em] text-[var(--cyan)]">OPTIONS</div>
      <div className="row-card mt-1.5" data-testid="pixel-ratio-row">
        <SetIcon name="perf" color="#54f4ff" />
        <div className="min-w-0 flex-1"><div className="font-bold">Pixel Ratio</div><div className="text-[11px] font-semibold text-[var(--dim)]">Canvas render resolution · {save.pixelRatio.toFixed(2)}× · 0.25 = fastest, 2.00 = sharpest</div></div>
        <input className="w-36" type="range" min="0.25" max="2" step="0.25" value={save.pixelRatio} aria-label="Pixel ratio" onChange={(e) => { const value = Number(e.target.value); mutate((s) => { s.pixelRatio = value; }); }} />
      </div>
      <div className="row-card mt-1.5" data-testid="upscale-row">
        <SetIcon name="perf" color="#54f4ff" />
        <div className="min-w-0 flex-1"><div className="font-bold">Upscale</div><div className="text-[11px] font-semibold text-[var(--dim)]">Presents the render at screen size · Sharp adds an edge-restoring GPU pass</div></div>
        <select className="w-36 rounded-lg border border-[var(--line)] bg-black/40 px-2 py-1 font-bold" value={save.upscale} aria-label="Upscale" onChange={(e) => { const value = e.target.value as "native" | "smooth" | "sharp"; mutate((s) => { s.upscale = value; }); }}>
          <option value="native">Native</option>
          <option value="smooth">Smooth</option>
          <option value="sharp">Sharp</option>
        </select>
      </div>
      <div className="row-card mt-1.5 border-[#f057ff55]" style={{ display: "block" }} data-testid="experimental-section">
        <div className="mb-2 text-[12px] font-bold tracking-[0.25em] text-[#f057ff]">EXPERIMENTAL</div>
        <div className="mb-2 text-[11px] font-semibold text-[var(--dim)]">Opt-in features that may cost frame time. Everything here is off by default.</div>
        <div className="flex items-center gap-3 border-t border-[var(--line)] pt-3" data-testid="exp-adaptive-scale-row">
          <SetIcon name="perf" color="#f057ff" />
          <div className="min-w-0 flex-1">
            <div className="font-bold">Adaptive render scale</div>
            <div className="text-xs font-semibold text-[var(--dim)]">Lowers the render resolution while frames run slow, then restores it once the arena calms down.</div>
          </div>
          <KnobToggle
            on={!!save.experimental?.adaptiveScale}
            label="Adaptive render scale"
            testId="exp-adaptive-scale"
            onToggle={() => {
              const next = !save.experimental?.adaptiveScale;
              mutate((s) => { s.experimental = { ...s.experimental, adaptiveScale: next }; });
              if (next) sfx.uiPop();
              else sfx.uiOff();
            }}
          />
        </div>
        <div className="flex items-center gap-3 border-t border-[var(--line)] pt-3" data-testid="exp-hq-motion-blur-row">
          <SetIcon name="perf" color="#f057ff" />
          <div className="min-w-0 flex-1">
            <div className="font-bold">High-quality motion blur</div>
            <div className="text-xs font-semibold text-[var(--dim)]">Ten-tap directional blur instead of six. Smoother streaks while the camera shakes, at extra cost.</div>
          </div>
          <KnobToggle
            on={!!save.experimental?.hqMotionBlur}
            label="High-quality motion blur"
            testId="exp-hq-motion-blur"
            onToggle={() => {
              const next = !save.experimental?.hqMotionBlur;
              mutate((s) => { s.experimental = { ...s.experimental, hqMotionBlur: next }; });
              if (next) sfx.uiPop();
              else sfx.uiOff();
            }}
          />
        </div>
        <div className="flex items-center gap-3 border-t border-[var(--line)] pt-3" data-testid="exp-rich-lightning-row">
          <SetIcon name="perf" color="#f057ff" />
          <div className="min-w-0 flex-1">
            <div className="font-bold">Rich lightning</div>
            <div className="text-xs font-semibold text-[var(--dim)]">More side branches and a wider glow on every bolt.</div>
          </div>
          <KnobToggle
            on={!!save.experimental?.richLightning}
            label="Rich lightning"
            testId="exp-rich-lightning"
            onToggle={() => {
              const next = !save.experimental?.richLightning;
              mutate((s) => { s.experimental = { ...s.experimental, richLightning: next }; });
              if (next) sfx.uiPop();
              else sfx.uiOff();
            }}
          />
        </div>
        <div className="flex items-center gap-3 border-t border-[var(--line)] pt-3" data-testid="exp-particle-boost-row">
          <SetIcon name="perf" color="#f057ff" />
          <div className="min-w-0 flex-1">
            <div className="font-bold">Particle boost</div>
            <div className="text-xs font-semibold text-[var(--dim)]">Half again as many sparks, embers and debris. Busier, but costs frame time.</div>
          </div>
          <KnobToggle
            on={!!save.experimental?.particleBoost}
            label="Particle boost"
            testId="exp-particle-boost"
            onToggle={() => {
              const next = !save.experimental?.particleBoost;
              mutate((s) => { s.experimental = { ...s.experimental, particleBoost: next }; });
              if (next) sfx.uiPop();
              else sfx.uiOff();
            }}
          />
        </div>
        <div className="flex items-center gap-3 border-t border-[var(--line)] pt-3" data-testid="exp-frame-hud-row">
          <SetIcon name="perf" color="#f057ff" />
          <div className="min-w-0 flex-1">
            <div className="font-bold">Frame-time readout</div>
            <div className="text-xs font-semibold text-[var(--dim)]">Shows the arena's draw time in the battle HUD.</div>
          </div>
          <KnobToggle
            on={!!save.experimental?.frameHud}
            label="Frame-time readout"
            testId="exp-frame-hud"
            onToggle={() => {
              const next = !save.experimental?.frameHud;
              mutate((s) => { s.experimental = { ...s.experimental, frameHud: next }; });
              if (next) sfx.uiPop();
              else sfx.uiOff();
            }}
          />
        </div>
      </div>
      <div className="theme-picker mt-1.5 rounded-xl border border-[var(--line)] bg-black/25 p-3" data-testid="ui-theme-picker">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <div className="font-bold">Interface Theme <span className="text-[10px] font-bold tracking-widest text-[#54f4ff]">· SUPER THEMES</span></div>
            <div className="text-[11px] font-semibold text-[var(--dim)]">Choose the arena control-room palette</div>
          </div>
          <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--dim)]">{save.uiTheme || "rift"}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Interface Theme">
          {UI_THEMES.map((theme) => {
            const active = (save.uiTheme || "rift") === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                role="radio"
                aria-checked={active}
                data-testid={`ui-theme-${theme.id}`}
                onClick={() => { sfx.uiTab(); mutate((s) => { s.uiTheme = theme.id; if (theme.id === "super" || theme.id === "liquid") s.liquidGlass = true; }); }}
                className={`theme-choice rounded-lg border p-1.5 text-left transition ${active ? "is-active" : ""}`}
                style={{ borderColor: active ? theme.accent : "var(--line)", "--theme-accent": theme.accent } as React.CSSProperties}
              >
                <span className="mb-1.5 flex h-5 overflow-hidden rounded-md" aria-hidden="true">
                  {theme.swatches.map((color) => <i key={color} className="h-full flex-1" style={{ background: color }} />)}
                </span>
                <span className="block truncate text-[10px] font-bold">{theme.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-1.5 space-y-3">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--line)] bg-black/30 px-4 py-3" data-testid="max-fps-row">
          <SetIcon name="fps" color="#3dff8e" />
          <div className="min-w-[130px] flex-1">
            <div className="font-bold">Max Frame Rate</div>
            <div className="text-xs font-semibold text-[var(--dim)]">Caps how hard the renderer works</div>
          </div>
          <div className="flex w-full flex-wrap gap-1.5 sm:w-auto">
            {[0, 30, 60, 120, 144, 240].map((fps) => (
              <button
                key={fps}
                data-testid={"fps-" + fps}
                title={fps === 0 ? "Unlimited" : fps + " FPS"}
                className={"chip chip-btn chip-ico" + (save.maxFps === fps ? " on" : "")}
                onClick={() => {
                  sfx.uiTab();
                  mutate((s) => {
                    s.maxFps = fps;
                  });
                }}
              >
                <FpsBars fps={fps} active={save.maxFps === fps} />
                {fps === 0 ? "" : fps}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--line)] bg-black/30 px-4 py-3" data-testid="fxq-row">
          <SetIcon name="bolt" color="#ffd23f" />
          <div className="min-w-[130px] flex-1">
            <div className="font-bold">Effect Quality</div>
            <div className="text-xs font-semibold text-[var(--dim)]">How heavy crits and explosions get — the game also eases off on its own when frames run long</div>
          </div>
          <div className="flex w-full flex-wrap gap-1.5 sm:w-auto">
            {([0, 1, 2] as const).map((lvl) => (
              <button
                key={lvl}
                data-testid={"fxq-" + lvl}
                className={"chip chip-btn" + (save.fxq === lvl ? " on" : "")}
                onClick={() => {
                  sfx.uiTab();
                  mutate((s) => {
                    s.fxq = lvl;
                  });
                }}
              >
                {lvl === 0 ? "ALL" : lvl === 1 ? "REDUCED" : "MINIMAL"}
              </button>
            ))}
          </div>
        </div>
        {TOGGLES.map(([label, key, d, icon, color]) => (
          <div key={key} className="flex items-center gap-3 rounded-lg border border-[var(--line)] bg-black/30 px-4 py-3">
            <SetIcon name={icon} color={color} />
            <div className="min-w-0 flex-1">
              <div className="font-bold">{label}</div>
              <div className="text-xs font-semibold text-[var(--dim)]">{d}</div>
            </div>
            <KnobToggle
              on={!!save[key]}
              label={label}
              testId={`toggle-${key}`}
              onToggle={() => {
                const next = !save[key];
                mutate((s) => { s[key] = !s[key] as never; });
                if (next) sfx.uiPop();
                else sfx.uiOff();
              }}
            />
          </div>
        ))}
        <div className="flex items-center gap-3 rounded-lg border border-[var(--line)] bg-black/30 px-4 py-3">
          <div className="min-w-0 flex-1"><div className="font-bold">Interpolation Method</div><div className="text-xs font-semibold text-[var(--dim)]">Hermite uses velocity-aware, monotonic easing; Smoothstep or Linear remain available.</div></div>
          <select aria-label="Interpolation Method" className="rounded border border-[var(--line)] bg-[#101329] px-2 py-1 text-xs" value={save.interpolationMethod} onChange={(e) => mutate((s) => { const method = e.target.value; s.interpolationMethod = (["linear", "smoothstep", "hermite", "extrapolate"] as const).includes(method as never) ? (method as typeof s.interpolationMethod) : "smoothstep"; })}><option value="linear">Linear</option><option value="smoothstep">Smoothstep</option><option value="hermite">Hermite</option>
          <option value="extrapolate">Extrapolate (lowest latency)</option></select>
        </div>
      </div>

      <div className="mt-4 text-[12px] font-bold tracking-[0.25em] text-[var(--cyan)]">APP</div>
      <div className="mt-1.5 flex items-center gap-3 rounded-lg border border-[var(--line)] bg-black/30 px-4 py-3">
        <SetIcon name="download" color="#ffcf4d" />
        <div className="min-w-0 flex-1">
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

      <div className="mt-4 text-[12px] font-bold tracking-[0.25em] text-[var(--cyan)]">DISPLAY</div>
      <div className="row-card mt-1.5">
        <SetIcon name="expand" color="#35e0ff" />
        <div className="min-w-0 flex-1">
          <div className="font-bold">Fullscreen</div>
          <div className="text-xs font-semibold text-[var(--dim)]">
            {fullscreenSupported()
              ? fs.on
                ? "The arena is running edge to edge"
                : "Fill the whole screen — no browser chrome, no accidental swipes"
              : "This browser only allows fullscreen from the video player"}
          </div>
        </div>
        <KnobToggle
          on={fs.on}
          label="Fullscreen"
          testId="toggle-fullscreen"
          onToggle={() => {
            sfx.click();
            void fs.toggle();
          }}
        />
      </div>

      {/* FONT VAULT — eighty faces, each tile previews itself. Picking one applies
          it live (UI + headings) and lazily pulls the Google stylesheet. */}
      <div className="mt-4 flex items-center gap-2">
        <div className="text-[12px] font-bold tracking-[0.25em] text-[var(--cyan)]">FONT</div>
        <span className="text-[10px] font-bold tracking-[0.18em] text-[var(--dim)]" data-testid="font-count">
          {FONTS.length} FACES · NOW {((FONT_BY_ID[save.font] || FONT_BY_ID[DEFAULT_FONT]).name || "").toUpperCase()}
        </span>
      </div>
      <div className="mt-1.5 rounded-lg border border-[var(--line)] bg-black/30 p-2" data-testid="font-grid">
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {FONTS.map((f) => {
            const on = (save.font || DEFAULT_FONT) === f.id;
            return (
              <button
                key={f.id}
                data-testid={`font-${f.id}`}
                data-font={f.id}
                title={`${f.name} · ${f.group}`}
                className={"font-tile" + (on ? " on" : "")}
                style={{ fontFamily: f.stack }}
                onClick={() => {
                  sfx.uiTab();
                  applyFont(f.id);
                  mutate((s) => {
                    s.font = f.id;
                  });
                }}
              >
                <span className="font-tile-sample">{f.name}</span>
                <span className="font-tile-group" style={{ fontFamily: "var(--font-ui, inherit)" }}>
                  {f.group}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 text-[12px] font-bold tracking-[0.25em] text-[var(--cyan)]">SAVE DATA</div>
      <div className="mt-1.5 space-y-3">
        <div className="flex items-center gap-3 rounded-lg border border-[var(--line)] bg-black/30 px-4 py-3">
          <SetIcon name="backup" color="#8effc4" />
          <div className="min-w-0 flex-1">
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
                  setVolumeBoost(!!next.volBoost);
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
        <div className="flex items-center gap-3 rounded-lg border border-[var(--line)] bg-black/30 px-4 py-3">
          <SetIcon name="replay" color="#ff9be9" />
          <div className="min-w-0 flex-1">
            <div className="font-bold">Loading Screen</div>
            <div className="text-xs font-semibold text-[var(--dim)]">Play the boot sequence again</div>
          </div>
          <button
            className="btn px-4 py-1.5 text-sm"
            onClick={() => {
              sfx.click();
              window.dispatchEvent(new CustomEvent("magictd-intro"));
              requestClose();
            }}
          >
            Replay
          </button>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-black/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <SetIcon name="diag" color="#b98bff" />
            <div className="min-w-0 flex-1">
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
      <button className="btn mt-4 w-full py-2" onClick={() => { sfx.click(); requestClose(); }}>
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
