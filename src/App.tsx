import { useCallback, useEffect, useState } from "react";
import { loadSave, mailReady, persistSave, seasonReady, tasksReady, type SaveData } from "./game/save";
import { sfx, setSfx, setVolume, initAudio } from "./game/audio";
import { CurrencyBar, Toasts, useToasts } from "./components/ui";
import { LaunchIntro, LoadingScreen, Home, Specials, Guild, SettingsModal, FullscreenButton, makeDefaults } from "./screens/Menus";
import Shop from "./screens/Shop";
import Towers from "./screens/Towers";
import Battle from "./screens/Battle";
import Mail from "./screens/Mail";
import Season from "./screens/Season";

type Screen =
  | "intro"
  | "loading"
  | "home"
  | "shop"
  | "towers"
  | "specials"
  | "guild"
  | "mail"
  | "season"
  | "battle"
  | "endless";

const MODES = {
  battle: { mode: "battle" as const, title: "BATTLE", rounds: "12 rounds" },
  endless: { mode: "endless" as const, title: "ENDLESS", rounds: "no limit" },
};

const NAV: { id: Screen; label: string; icon: React.ReactNode }[] = [
  {
    id: "shop",
    label: "Shop",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 9h16l-1.5 11h-13z" />
        <path d="M8 9V7a4 4 0 0 1 8 0v2" />
      </svg>
    ),
  },
  {
    id: "towers",
    label: "Towers",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 21V8l3-2V4h3V2h2v2h3v2l3 2v13" />
        <path d="M9 21v-5h6v5" />
      </svg>
    ),
  },
  {
    id: "home",
    label: "Home",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 11 12 3l9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M12 14l1.5 3H15l1.5 3" />
      </svg>
    ),
  },
  {
    id: "mail",
    label: "Mail",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3.5 7 8.5 6 8.5-6" />
      </svg>
    ),
  },
  {
    id: "season",
    label: "Season",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 20V4M4 20h16" />
        <path d="M8 20v-6M13 20V8M18 20v-9" />
      </svg>
    ),
  },
  {
    id: "specials",
    label: "Specials",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l2.4 5.2L20 8l-4 4 1 6-5-3-5 3 1-6-4-4 5.6-.8z" />
      </svg>
    ),
  },
  {
    id: "guild",
    label: "Guild",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" />
        <circle cx="17.5" cy="9.5" r="2.4" />
        <path d="M16 15.2c3 .2 5 1.8 5 4.3" />
      </svg>
    ),
  },
];

/** Shows module-load failures that would otherwise leave the loading screen forever. */
function BootErrors() {
  const [errors, setErrors] = useState<string[]>([]);
  useEffect(() => {
    const h = (e: PromiseRejectionEvent) => {
      const msg = String((e.reason as Error)?.message ?? e.reason ?? "Unknown error");
      setErrors((prev) => (prev.includes(msg) ? prev : [...prev, msg]));
    };
    window.addEventListener("unhandledrejection", h);
    return () => window.removeEventListener("unhandledrejection", h);
  }, []);
  if (errors.length === 0) return null;
  return (
    <div className="panel absolute inset-x-4 top-4 z-[99] p-3 text-[13px] font-semibold text-[#ff8f9a]">
      Failed to load part of the game: {errors[0]} — try a hard reload.
    </div>
  );
}

export default function App() {
  // the cold open runs first: logo animation, then the loading car. Reduced
  // motion skips straight past it rather than holding a still frame for 3s.
  const [screen, setScreen] = useState<Screen>(() => (loadSave().reducedMotion ? "loading" : "intro"));
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { toasts, push } = useToasts();

  useEffect(() => {
    setSfx(save.sfx);
    setVolume(save.vol);
  }, [save.sfx, save.vol]);

  // the static splash in index.html is only there until the app has painted
  useEffect(() => {
    document.getElementById("boot-splash")?.remove();
  }, []);

  // unlock audio on first user gesture
  useEffect(() => {
    const h = () => initAudio();
    window.addEventListener("pointerdown", h, { once: true });
    window.addEventListener("keydown", h, { once: true });
    return () => {
      window.removeEventListener("pointerdown", h);
      window.removeEventListener("keydown", h);
    };
  }, []);

  // reset event from settings — must write the wiped save through, otherwise a
  // stale progress blob would be restored on the next load
  useEffect(() => {
    const h = () => {
      const fresh = makeDefaults();
      persistSave(fresh);
      setSave(fresh);
    };
    window.addEventListener("magictd-reset", h);
    return () => window.removeEventListener("magictd-reset", h);
  }, []);

  // "Replay" in settings: run the whole boot sequence again
  useEffect(() => {
    const h = () => setScreen("intro");
    window.addEventListener("magictd-intro", h);
    return () => window.removeEventListener("magictd-intro", h);
  }, []);

  const mutate = useCallback((fn: (s: SaveData) => void) => {
    setSave((prev) => {
      const next: SaveData = JSON.parse(JSON.stringify(prev));
      fn(next);
      persistSave(next);
      return next;
    });
  }, []);

  if (screen === "intro" || screen === "loading") {
    return (
      <div className={`h-full ${save.reducedMotion ? "calm" : ""}`}>
        {/* If a stale chunk is missing, dynamic import() fails asynchronously; surface it. */}
        <BootErrors />
        {screen === "intro" ? (
          <LaunchIntro onDone={() => setScreen("loading")} />
        ) : (
          <LoadingScreen onDone={() => setScreen("home")} />
        )}
      </div>
    );
  }

  if (screen === "battle" || screen === "endless") {
    return (
      <div className={`h-full ${save.reducedMotion ? "calm" : ""}`}>
        <Battle
          key={screen + save.hero}
          mode={MODES[screen].mode}
          save={save}
          mutate={mutate}
          onExit={() => setScreen("home")}
        />
      </div>
    );
  }

  return (
    <div className={`app-bg flex h-full flex-col ${save.reducedMotion ? "calm" : ""}`}>
      <Toasts toasts={toasts} />
      {/* top bar — wraps on narrow screens so the settings button is never clipped */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-2 px-3 pt-2.5">
        {/* no title up here — the wordmark lives on the boot screens, which keeps
            this bar from wrapping on narrow phones */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <CurrencyBar gold={save.gold} gems={save.gems} tokens={save.tokens} trophies={save.trophies} />
          <FullscreenButton compact />
          <button
            className="relative shrink-0 rounded-lg border border-[var(--line)] bg-black/40 p-2 text-[var(--dim)] transition hover:text-[var(--txt)]"
            onClick={() => {
              sfx.click();
              setSettingsOpen(true);
            }}
            aria-label="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* content — keyed so every tab change replays the entrance animation */}
      <div className="min-h-0 flex-1 px-3 pt-3">
        <div key={screen} className="screen-enter h-full">
        {screen === "home" && (
          <Home
            save={save}
            mutate={mutate}
            push={push}
            onBattle={() => setScreen("battle")}
            onEndless={() => setScreen("endless")}
          />
        )}
        {screen === "shop" && <Shop save={save} mutate={mutate} push={push} />}
        {screen === "towers" && <Towers save={save} mutate={mutate} push={push} />}
        {screen === "specials" && <Specials save={save} mutate={mutate} push={push} />}
          {screen === "guild" && <Guild save={save} mutate={mutate} push={push} />}
          {screen === "mail" && <Mail save={save} mutate={mutate} push={push} />}
          {screen === "season" && <Season save={save} mutate={mutate} push={push} />}
        </div>
      </div>

      {/* bottom nav */}
      <div className="shrink-0 border-t border-[var(--line)] bg-[#0a0724]/80 px-2 pb-2 pt-1.5">
        <div className="mx-auto flex max-w-3xl items-center justify-around">
          {NAV.map((n) => {
            // unclaimed things surface as a badge on their tab
            const badge =
              n.id === "specials"
                ? tasksReady(save)
                : n.id === "mail"
                  ? mailReady(save)
                  : n.id === "season"
                    ? seasonReady(save)
                    : 0;
            return (
              <button
                key={n.id}
                className={`nav-btn relative flex-1 ${screen === n.id ? "on" : ""}`}
                onClick={() => { sfx.click(); setScreen(n.id); }}
              >
                {n.icon}
                {n.label}
                {badge > 0 && <span className="badge-ping" data-testid={`nav-badge-${n.id}`}>{badge}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {settingsOpen && <SettingsModal save={save} mutate={mutate} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
