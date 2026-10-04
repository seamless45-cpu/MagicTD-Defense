import { useEffect, useRef, useState } from "react";
import type { SaveData } from "../game/save";
import { todayStr, clearSave, defaultSave } from "../game/save";
import { sfx } from "../game/audio";
import { Emblem, Modal, TowerIcon } from "../components/ui";
import { TOWERS, BATTLE_ROUNDS, PARTY_ROUNDS } from "../game/data";

const LOAD_STEPS = [
  "Charging mana lattice...",
  "Forging towers...",
  "Binding lightning...",
  "Calibrating hero skills...",
  "Summoning enemies...",
];

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0);
  const [step, setStep] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const dur = 2300;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setPct(Math.round(p * 100));
      setStep(Math.min(LOAD_STEPS.length - 1, Math.floor(p * LOAD_STEPS.length)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(onDone, 300);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);
  return (
    <div className="app-bg flex h-full flex-col items-center justify-center gap-8">
      <div style={{ animation: "floaty 2.4s ease-in-out infinite" }}>
        <Emblem size={130} />
      </div>
      <div className="font-disp text-5xl tracking-wide text-[#ffb324]" style={{ textShadow: "0 0 30px rgba(255,179,36,.5)" }}>
        MagicTD
      </div>
      <div className="-mt-4 font-disp text-xl tracking-[0.4em] text-[#35e0ff]">DEFENSE</div>
      <div className="w-[340px]">
        <div className="h-4 overflow-hidden rounded-full border border-[var(--line2)] bg-black/50">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg,#35e0ff,#ff4fd8,#ffb324)",
              boxShadow: "0 0 14px rgba(53,224,255,.7)",
              transition: "width 80ms linear",
            }}
          />
        </div>
        <div className="mt-3 flex justify-between text-sm font-semibold tracking-widest text-[var(--dim)]">
          <span>{LOAD_STEPS[step]}</span>
          <span>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

export function Home({
  save,
  onBattle,
  onParty,
  push,
}: {
  save: SaveData;
  onBattle: () => void;
  onParty: () => void;
  push: (m: string, c?: string) => void;
}) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-7">
      <div
        className="pointer-events-none absolute left-[8%] top-[12%] h-40 w-40 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(53,224,255,.25), transparent 70%)", animation: "orbDrift 7s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none absolute bottom-[18%] right-[10%] h-52 w-52 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,79,216,.2), transparent 70%)", animation: "orbDrift 9s ease-in-out infinite reverse" }}
      />
      <div className="anim-slideup text-center">
        <div className="font-disp text-4xl tracking-wide text-[#ffb324]" style={{ textShadow: "0 0 24px rgba(255,179,36,.55)" }}>
          Command Center
        </div>
        <div className="mt-1 text-base font-semibold tracking-[0.3em] text-[var(--dim)]">CHOOSE YOUR BATTLEFIELD</div>
      </div>

      <div className="flex flex-wrap items-stretch justify-center gap-5">
        <button className="btn btn-gold anim-pop group w-64 px-6 py-5" onClick={() => { sfx.click(); onBattle(); }}>
          <span className="font-disp block text-2xl leading-tight">Battle Mode</span>
          <span className="mt-1 block text-[13px] font-bold normal-case tracking-wide text-[#5c3a00]">
            Solo defense · {BATTLE_ROUNDS} rounds · earn gold, fragments & gems
          </span>
        </button>
        <button className="btn btn-cyan anim-pop group w-64 px-6 py-5" style={{ animationDelay: "80ms" }} onClick={() => { sfx.click(); onParty(); }}>
          <span className="font-disp block text-2xl leading-tight">Party Mode</span>
          <span className="mt-1 block text-[13px] font-bold normal-case tracking-wide text-[#033540]">
            Co-op with teammates · {PARTY_ROUNDS} rounds · Magic Tokens every 10 rounds
          </span>
        </button>
      </div>

      <div className="anim-slideup flex items-center gap-3 text-sm font-bold tracking-wider text-[var(--dim)]" style={{ animationDelay: "160ms" }}>
        <span className="chip">BEST ROUND · {save.best}</span>
        <span className="chip">VICTORIES · {save.wins}</span>
      </div>
      {save.lineup.length < 3 && (
        <button className="btn text-sm" onClick={() => { sfx.click(); push("Add at least 3 towers to your lineup in the Tower tab", "#ffd23f"); }}>
          Lineup weak — visit Towers
        </button>
      )}
    </div>
  );
}

export function Specials({
  save,
  mutate,
  push,
}: {
  save: SaveData;
  mutate: (fn: (s: SaveData) => void) => void;
  push: (m: string, c?: string) => void;
}) {
  const canDaily = save.lastDaily !== todayStr();
  const [claimed, setClaimed] = useState(!canDaily);
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
      <div className="panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-disp text-xl text-[#ffcf4d]">Daily Rite</div>
            <p className="text-sm font-semibold text-[var(--dim)]">Claim 60 gold and a random tower fragment, once per day.</p>
          </div>
          <button
            className="btn btn-gold px-5 py-2"
            disabled={claimed}
            onClick={() => {
              const frag = TOWERS[Math.floor(Math.random() * TOWERS.length)].id;
              mutate((s) => {
                s.gold += 60;
                s.frags[frag] = (s.frags[frag] || 0) + 1;
                s.lastDaily = todayStr();
              });
              setClaimed(true);
              sfx.coin();
              push(`+60 gold · +1 ${TOWERS.find((t) => t.id === frag)?.name} fragment`, "#ffcf4d");
            }}
          >
            {claimed ? "Claimed" : "Claim"}
          </button>
        </div>
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
    ["Kael", "Anyone up for a Party raid tonight?"],
    ["Mira", "Just hit Awakening II on my Lightning Princess."],
    ["Torin", "Power Plant synergy is broken. In a good way."],
  ] as const;
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 overflow-y-auto scroll-thin pr-1">
      <div className="panel p-5" style={{ borderColor: joined ? "#ffb32466" : undefined }}>
        <div className="font-disp text-2xl text-[#ffcf4d]">Guild Hall</div>
        <p className="text-sm font-semibold text-[var(--dim)]">
          {joined ? `You are a member of ${joined}.` : "Join a guild to share war chests and rally for party raids."}
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
  return (
    <Modal onClose={onClose} w={440}>
      <div className="font-disp text-2xl text-[#ffcf4d]">Settings</div>
      <div className="mt-4 space-y-3">
        {([
          ["Battle SFX", "sfx", "Sound effects during battle and menus"],
          ["Rich FX", "fx", "Extra particles and screen shake"],
        ] as const).map(([label, key, d]) => (
          <div key={key} className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-black/30 px-4 py-3">
            <div>
              <div className="font-bold">{label}</div>
              <div className="text-xs font-semibold text-[var(--dim)]">{d}</div>
            </div>
            <button
              className="btn px-4 py-1.5 text-sm"
              onClick={() => {
                mutate((s) => { s[key] = !s[key]; });
                sfx.click();
              }}
            >
              {save[key] ? "ON" : "OFF"}
            </button>
          </div>
        ))}
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
