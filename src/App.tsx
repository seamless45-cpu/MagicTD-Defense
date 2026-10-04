import { useCallback, useEffect, useState } from "react";
import { loadSave, persistSave, type SaveData } from "./game/save";
import { sfx, setSfx, initAudio } from "./game/audio";
import { CurrencyBar, Emblem, Toasts, useToasts } from "./components/ui";
import { LoadingScreen, Home, Specials, Guild, SettingsModal, makeDefaults } from "./screens/Menus";
import Shop from "./screens/Shop";
import Towers from "./screens/Towers";
import Battle from "./screens/Battle";

type Screen = "loading" | "home" | "shop" | "towers" | "specials" | "guild" | "battle" | "party";

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

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { toasts, push } = useToasts();

  useEffect(() => {
    setSfx(save.sfx);
  }, [save.sfx]);

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

  const mutate = useCallback((fn: (s: SaveData) => void) => {
    setSave((prev) => {
      const next: SaveData = JSON.parse(JSON.stringify(prev));
      fn(next);
      persistSave(next);
      return next;
    });
  }, []);

  if (screen === "loading") {
    return (
      <div className="h-full">
        <LoadingScreen onDone={() => setScreen("home")} />
      </div>
    );
  }

  if (screen === "battle" || screen === "party") {
    return (
      <div className="h-full">
        <Battle
          key={screen + save.lastSeen}
          mode={screen === "party" ? "party" : "battle"}
          save={save}
          mutate={mutate}
          onExit={() => setScreen("home")}
        />
      </div>
    );
  }

  return (
    <div className="app-bg flex h-full flex-col">
      <Toasts toasts={toasts} />
      {/* top bar */}
      <div className="flex shrink-0 items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-3">
          <Emblem size={34} />
          <div className="leading-none">
            <div className="font-disp text-xl text-[#ffb324]">MagicTD</div>
            <div className="text-[10px] font-bold tracking-[0.4em] text-[var(--cyan)]">DEFENSE</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CurrencyBar gold={save.gold} gems={save.gems} tokens={save.tokens} />
          <button
            className="relative rounded-lg border border-[var(--line)] bg-black/40 p-2 text-[var(--dim)] transition hover:text-[var(--txt)]"
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

      {/* content */}
      <div className="min-h-0 flex-1 px-4 pt-4">
        {screen === "home" && (
          <Home
            save={save}
            push={push}
            onBattle={() => setScreen("battle")}
            onParty={() => setScreen("party")}
          />
        )}
        {screen === "shop" && <Shop save={save} mutate={mutate} push={push} />}
        {screen === "towers" && <Towers save={save} mutate={mutate} push={push} />}
        {screen === "specials" && <Specials save={save} mutate={mutate} push={push} />}
        {screen === "guild" && <Guild push={push} />}
      </div>

      {/* bottom nav */}
      <div className="shrink-0 border-t border-[var(--line)] bg-[#0a0724]/80 px-2 pb-2 pt-1.5">
        <div className="mx-auto flex max-w-3xl items-center justify-around">
          {NAV.map((n) => (
            <button key={n.id} className={`nav-btn flex-1 ${screen === n.id ? "on" : ""}`} onClick={() => { sfx.click(); setScreen(n.id); }}>
              {n.icon}
              {n.label}
            </button>
          ))}
        </div>
      </div>

      {settingsOpen && <SettingsModal save={save} mutate={mutate} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
