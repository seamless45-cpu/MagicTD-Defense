import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChipId, TowerDef } from "../game/data";
import { HERO_BY_ID, RARITY, TOWER_BY_ID, leagueFor, towerArt } from "../game/data";
import type { RewardLine } from "../game/save";

export function CoinIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8.5" fill="#f59f00" stroke="#a86a00" strokeWidth="1.4" />
      <circle cx="10" cy="10" r="5.5" fill="#ffcf4d" stroke="#c07a00" strokeWidth="1" />
      <path d="M10 6.5 11.2 9l2.8.2-2.1 1.8.6 2.7L10 12l-2.5 1.7.6-2.7L6 9.2 8.8 9z" fill="#a86a00" />
    </svg>
  );
}
export function GemIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20">
      <path d="M5 3h10l4 5-9 10L1 8z" fill="#35e0ff" stroke="#0a7f9e" strokeWidth="1.4" />
      <path d="M5 3 10 8 15 3M1 8h18M10 8l0 10" stroke="#b9f4ff" strokeWidth="1" fill="none" />
    </svg>
  );
}
export function TokenIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8.5" fill="#2a0b33" stroke="#ff4fd8" strokeWidth="1.6" />
      <path d="M10 3.5 12 8l4.4.2-3.4 2.9 1.1 4.3L10 12.6 5.9 15.4 7 11.1 3.6 8.2 8 8z" fill="#ff4fd8" />
    </svg>
  );
}

export function TrophyIcon({ size = 18, color = "#ffcf4d" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20">
      <path d="M5 3h10v4a5 5 0 0 1-10 0z" fill={color} stroke="#7a5200" strokeWidth="1.2" />
      <path d="M5 4H2.5v1.5A3.5 3.5 0 0 0 6 9M15 4h2.5v1.5A3.5 3.5 0 0 1 14 9" fill="none" stroke={color} strokeWidth="1.4" />
      <path d="M8.6 11.6h2.8L11 14h2v3H7v-3h2z" fill={color} stroke="#7a5200" strokeWidth="1.1" />
    </svg>
  );
}

const CHIP_COLORS: Record<ChipId, [string, string]> = {
  basic: ["#8fe9ff", "#1b6b86"],
  advanced: ["#c44dff", "#5a1b8a"],
  elite: ["#ffb324", "#8a5200"],
};

export function ChipIcon({ id = "basic", size = 18 }: { id?: ChipId; size?: number }) {
  const [c, dark] = CHIP_COLORS[id] || CHIP_COLORS.basic;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20">
      <rect x="4.5" y="4.5" width="11" height="11" rx="2" fill="#120b2c" stroke={c} strokeWidth="1.6" />
      <rect x="7.5" y="7.5" width="5" height="5" rx="1" fill={c} />
      <g stroke={c} strokeWidth="1.3" strokeLinecap="round">
        <path d="M7 4.5V2M10 4.5V2M13 4.5V2M7 15.5V18M10 15.5V18M13 15.5V18" />
        <path d="M4.5 7H2M4.5 10H2M4.5 13H2M15.5 7H18M15.5 10H18M15.5 13H18" />
      </g>
      <rect x="7.5" y="7.5" width="5" height="5" rx="1" fill="none" stroke={dark} strokeWidth="0.8" />
    </svg>
  );
}

export function ShardIcon({ size = 18, color = "#ff4fd8" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20">
      <path d="M10 1.5 14 8l-4 10.5L6 8z" fill={color} stroke="#2a0b33" strokeWidth="1.2" />
      <path d="M10 1.5 10 18.5M6 8h8" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />
    </svg>
  );
}

export function GuildIcon({ size = 18, color = "#ffb324" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20">
      <path d="M10 1.8 17 4.4v5.3c0 4.2-2.9 7.3-7 8.5-4.1-1.2-7-4.3-7-8.5V4.4z" fill="#140d33" stroke={color} strokeWidth="1.5" />
      <path d="M10 5.2 11.7 8.7l3.8.5-2.8 2.6.7 3.8L10 13.8l-3.4 1.8.7-3.8-2.8-2.6 3.8-.5z" fill={color} />
    </svg>
  );
}

/** the icon that matches a reward line */
export function RewardIcon({ line, size = 26 }: { line: RewardLine; size?: number }) {
  if (line.kind === "gold") return <CoinIcon size={size} />;
  if (line.kind === "gems") return <GemIcon size={size} />;
  if (line.kind === "tokens") return <TokenIcon size={size} />;
  if (line.kind === "trophy") return <TrophyIcon size={size} />;
  if (line.kind === "chip") return <ChipIcon id={(line.id as ChipId) || "basic"} size={size} />;
  if (line.kind === "heroShard")
    return <ShardIcon size={size} color={HERO_BY_ID[line.id || ""]?.color || "#ff4fd8"} />;
  const def = TOWER_BY_ID[line.id || ""];
  return def ? <TowerIcon def={def} size={size} /> : <CoinIcon size={size} />;
}

export function LeagueBadge({ trophies, size = 18 }: { trophies: number; size?: number }) {
  const l = leagueFor(trophies);
  return (
    <span className="pill-dark text-[11px]" style={{ borderColor: l.color + "88", color: l.color }}>
      <TrophyIcon size={size} color={l.color} />
      <span className="num">{Math.floor(trophies).toLocaleString()}</span>
      <span className="ml-0.5 hidden font-bold tracking-wider sm:inline">{l.name.toUpperCase()}</span>
    </span>
  );
}

export function CurrencyBar({
  gold,
  gems,
  tokens,
  trophies,
}: {
  gold: number;
  gems: number;
  tokens: number;
  trophies?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {typeof trophies === "number" && (
        <div
          className="pill-dark text-[11px]"
          style={{ borderColor: leagueFor(trophies).color + "88", color: leagueFor(trophies).color }}
          data-currency="trophies"
        >
          <TrophyIcon size={20} color={leagueFor(trophies).color} />
          <span className="num">{Math.floor(trophies).toLocaleString()}</span>
        </div>
      )}
      <div className="pill-dark text-[11px] text-[#ffcf4d]" style={{ borderColor: "#8a6a1a" }} data-currency="gold">
        <CoinIcon size={20} />
        <span className="num">{Math.floor(gold).toLocaleString()}</span>
      </div>
      <div className="pill-dark text-[11px] text-[#35e0ff]" style={{ borderColor: "#1f6f8c" }} data-currency="gems">
        <GemIcon size={20} />
        <span className="num">{Math.floor(gems).toLocaleString()}</span>
      </div>
      <div className="pill-dark text-[11px] text-[#ff4fd8]" style={{ borderColor: "#7a2f6a" }} data-currency="tokens">
        <TokenIcon size={20} />
        <span className="num">{Math.floor(tokens).toLocaleString()}</span>
      </div>
    </div>
  );
}

export function TowerIcon({
  def,
  size = 48,
  locked,
}: {
  def: TowerDef;
  size?: number;
  locked?: boolean;
}) {
  const c = RARITY[def.rarity].color;
  const a = def.accent || c;
  const inner = (id: string) => {
    switch (id) {
      case "arrow":
        return (
          <g>
            <path d="M10 38 30 18" stroke={c} strokeWidth="4" strokeLinecap="round" />
            <path d="M38 10 22 13l6 5-3 6z" fill={c} />
            <path d="M14 30l-6 8M20 24l-7 9" stroke="#6b7f96" strokeWidth="2.5" />
          </g>
        );
      case "cannon":
        return (
          <g>
            <circle cx="18" cy="30" r="12" fill="#4a5568" stroke={c} strokeWidth="2.5" />
            <path d="M24 24 38 12" stroke="#2d3748" strokeWidth="9" strokeLinecap="round" />
            <circle cx="38" cy="12" r="4.5" fill={c} />
            <circle cx="18" cy="30" r="5" fill={c} />
          </g>
        );
      case "ice":
        return (
          <g>
            <rect x="10" y="12" width="26" height="26" rx="5" fill="#9fe8ff" stroke={c} strokeWidth="2.5" transform="rotate(8 23 25)" />
            <path d="M23 16v18M15 25h18M17 19l12 12M29 19 17 31" stroke="#0e7490" strokeWidth="2" />
          </g>
        );
      case "speaker":
        return (
          <g>
            <rect x="8" y="14" width="12" height="20" rx="2" fill={c} />
            <path d="M20 10l10-5v33l-10-5z" fill="#123" stroke={c} strokeWidth="2" />
            <path d="M35 16a12 12 0 0 1 0 16M39 11a19 19 0 0 1 0 26" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </g>
        );
      case "tesla":
        return (
          <g>
            <circle cx="24" cy="26" r="10" fill="#14263f" stroke={c} strokeWidth="2.5" />
            <path d="M16 22h16M15 26h18M16 30h16" stroke={c} strokeWidth="2.5" />
            <path d="M24 12v6M20 8l4 4 4-4" stroke={c} strokeWidth="2.5" fill="none" />
            <path d="M34 14l6-6M36 18l8-2" stroke="#9ff3ff" strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      case "gatling":
        return (
          <g>
            <rect x="8" y="24" width="14" height="12" rx="3" fill="#3b2f52" stroke={c} strokeWidth="2" />
            {[18, 24, 30].map((y) => (
              <g key={y}>
                <rect x="20" y={y - 2.5} width="20" height="5" rx="2.5" fill={c} />
                <circle cx="40" cy={y} r="2.5" fill="#ffe9b0" />
              </g>
            ))}
          </g>
        );
      case "core":
        return (
          <g>
            <circle cx="24" cy="24" r="9" fill="#0c2d5c" stroke={c} strokeWidth="3" />
            <circle cx="24" cy="24" r="4" fill={c} />
            <ellipse cx="24" cy="24" rx="16" ry="7" fill="none" stroke={c} strokeWidth="2" opacity="0.8" />
            <ellipse cx="24" cy="24" rx="16" ry="7" fill="none" stroke="#bfeaff" strokeWidth="1.5" transform="rotate(60 24 24)" opacity="0.6" />
          </g>
        );
      case "lightning":
        return (
          <g>
            <path d="M10 20 14 10l8 6 4-8 4 8 8-6-4 10z" fill={c} stroke="#8a5200" strokeWidth="1.5" />
            <path d="M27 20l-8 10h6l-4 10 10-13h-6l4-7z" fill="#fff2b0" stroke={c} strokeWidth="1.5" />
          </g>
        );
      case "hellstorm":
        return (
          <g>
            <path d="M24 6c2 7 10 9 10 18a10 10 0 0 1-20 0c0-5 3-7 4-11 1.5 3 4 4 6-7z" fill={c} stroke="#8a3000" strokeWidth="2" />
            <path d="M24 16c1 4 5 5 5 9a5 5 0 0 1-10 0c0-3 3-4 5-9z" fill="#fff2b0" />
          </g>
        );
      case "icestorm":
        return (
          <g>
            <path d="M24 4 34 16 24 44 14 16z" fill="#bfeaff" stroke={c} strokeWidth="2.5" />
            <path d="M24 4v40M14 16l20 0" stroke="#0e7490" strokeWidth="2" />
            <path d="M8 22l4 3-2 4M40 22l-4 3 2 4" stroke={c} strokeWidth="2" fill="none" />
          </g>
        );
      case "plant":
        return (
          <g>
            <path d="M24 6 38 14v16L24 38 10 30V14z" fill="#153024" stroke={c} strokeWidth="2.5" />
            <circle cx="24" cy="22" r="6" fill={c} />
            <circle cx="24" cy="22" r="9.5" fill="none" stroke={c} strokeWidth="1.5" strokeDasharray="4 3" />
            <path d="M24 34v6M14 30l-3 5M34 30l3 5" stroke={c} strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      case "swarm":
        return (
          <g>
            <circle cx="24" cy="24" r="7" fill="#1b1040" stroke={c} strokeWidth="2.5" />
            <path d="M24 17V8M20 20l-7-5M28 20l7-5" stroke={c} strokeWidth="2" strokeLinecap="round" />
            <circle cx="24" cy="7" r="3.4" fill={c} />
            <circle cx="12" cy="14" r="3.4" fill={c} />
            <circle cx="36" cy="14" r="3.4" fill={c} />
            <path d="M19 29l-5 8M29 29l5 8" stroke={c} strokeWidth="1.6" opacity="0.6" />
          </g>
        );
      case "chrono":
        return (
          <g>
            <circle cx="24" cy="26" r="13" fill="#0d1f3a" stroke={c} strokeWidth="2.6" />
            <path d="M24 26V17M24 26l7 5" stroke={c} strokeWidth="2.6" strokeLinecap="round" />
            <path d="M24 6v6M13 11l4 4M35 11l-4 4" stroke="#9ff3ff" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="24" cy="26" r="2.6" fill={c} />
          </g>
        );
      case "void":
        return (
          <g>
            <circle cx="24" cy="24" r="14" fill="#0a0620" stroke={c} strokeWidth="2.6" />
            <circle cx="24" cy="24" r="7" fill="#000" stroke={c} strokeWidth="1.6" />
            <ellipse cx="24" cy="24" rx="17" ry="6" fill="none" stroke={c} strokeWidth="2" transform="rotate(-28 24 24)" />
            <ellipse cx="24" cy="24" rx="17" ry="6" fill="none" stroke={c} strokeWidth="1.4" opacity="0.7" transform="rotate(30 24 24)" />
          </g>
        );
      case "plasma":
        return (
          <g>
            <path d="M8 30 40 14" stroke={c} strokeWidth="5" strokeLinecap="round" />
            <path d="M8 30 40 14" stroke="#fff2b0" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M6 22 20 24l-6 6 12 1" stroke={c} strokeWidth="2.2" fill="none" strokeLinejoin="round" />
            <circle cx="40" cy="14" r="4.6" fill={c} />
            <circle cx="40" cy="14" r="8" fill="none" stroke={c} strokeWidth="1.4" opacity="0.6" />
          </g>
        );
      // ---------- new art families (12-tower arsenal) ----------
      case "sling":
        return (
          <g>
            <path d="M24 40V22" stroke={a} strokeWidth="4" strokeLinecap="round" />
            <path d="M11 14 24 24l13-10" stroke={a} strokeWidth="3.6" strokeLinecap="round" fill="none" />
            <path d="M11 14v-4M37 14v-4" stroke={a} strokeWidth="3" strokeLinecap="round" />
            <circle cx="24" cy="26" r="5" fill={a} opacity="0.85" />
            <path d="M9 10 15 6M39 10 33 6" stroke="#fff2b0" strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      case "flame":
        return (
          <g>
            <rect x="8" y="26" width="20" height="14" rx="4" fill="#2b1f66" stroke={a} strokeWidth="2.5" />
            <path d="M27 30 42 22v22z" fill={a} opacity="0.35" />
            <path d="M30 24c2 6 9 8 9 14a7 7 0 0 1-14 0c0-4 3-6 5-14z" fill={a} stroke="#8a3000" strokeWidth="1.4" />
            <circle cx="14" cy="33" r="3.4" fill={a} />
          </g>
        );
      case "spike":
        return (
          <g>
            <path d="M10 36h28l-4-10H14z" fill="#2b1f66" stroke={a} strokeWidth="2.4" />
            {[14, 20, 26, 32].map((x) => (
              <path key={x} d={`M${x} 26 l4-16 l4 16z`} fill={a} stroke="#0b1030" strokeWidth="1.2" />
            ))}
            <path d="M6 40h36" stroke={a} strokeWidth="3" strokeLinecap="round" />
          </g>
        );
      case "tube":
        return (
          <g>
            <rect x="6" y="28" width="24" height="13" rx="4" fill="#2b1f66" stroke={a} strokeWidth="2.4" />
            <path d="M24 30 42 12" stroke={a} strokeWidth="10" strokeLinecap="round" />
            <path d="M24 30 42 12" stroke="#0b1030" strokeWidth="4" strokeLinecap="round" />
            <circle cx="42" cy="12" r="5" fill={a} />
            <circle cx="15" cy="34" r="3.4" fill={a} />
          </g>
        );
      case "beam":
        return (
          <g>
            <rect x="14" y="30" width="20" height="12" rx="4" fill="#2b1f66" stroke={a} strokeWidth="2.4" />
            <circle cx="24" cy="24" r="10" fill="none" stroke={a} strokeWidth="3" />
            <circle cx="24" cy="24" r="5" fill={a} />
            <path d="M24 4v8M8 24h6M40 24h-6M12 12l5 5M36 12l-5 5" stroke={a} strokeWidth="2.4" strokeLinecap="round" />
          </g>
        );
      default:
        return <circle cx="24" cy="24" r="14" fill={c} />;
    }
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      style={locked ? { filter: "grayscale(1) brightness(0.5)" } : undefined}
    >
      <rect x="2" y="2" width="44" height="44" rx="10" fill="rgba(8,5,26,0.6)" stroke={c} strokeWidth="2" />
      {inner(towerArt(def))}
    </svg>
  );
}

export function HeroIcon({
  kind,
  size = 34,
  color = "#ff4fd8",
}: {
  kind: string;
  size?: number;
  color?: string;
}) {
  const art = () => {
    switch (kind) {
      case "freeze":
        return (
          <g>
            <path d="M24 6v36M10 16l28 16M38 16 10 32" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
            <path d="M24 3l3 5-3 5-3-5zM24 45l3-5-3-5-3 5z" fill={color} />
            <circle cx="24" cy="24" r="5.5" fill="#0b2740" stroke={color} strokeWidth="2" />
          </g>
        );
      case "burn":
        return (
          <g>
            <path d="M24 5c3 10 13 12 13 24a13 13 0 0 1-26 0c0-7 4-9 5-15 2 4 5 5 8-9z" fill={color} stroke="#8a3000" strokeWidth="1.6" />
            <path d="M24 18c1.5 5 6 6 6 11a6 6 0 0 1-12 0c0-4 4-5 6-11z" fill="#fff2b0" />
          </g>
        );
      case "thunder":
        return (
          <g>
            <rect x="18" y="6" width="12" height="9" rx="3" fill="#6b5a2a" stroke={color} strokeWidth="2" />
            <rect x="21" y="14" width="6" height="26" rx="3" fill="#4a3a1a" stroke={color} strokeWidth="2" />
            <path d="M12 10 4 2M9 20H1M13 30H4" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
            <path d="M31 6l-5 9h5l-4 9" stroke="#fff6a8" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M24 40v6M19 44h10" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
          </g>
        );
      case "overdrive":
        return (
          <g>
            <path d="M27 4 13 26h8l-3 18 16-24h-9l5-16z" fill={color} stroke="#0a3d24" strokeWidth="1.6" />
            <path d="M24 2v44" stroke={color} strokeWidth="1.4" opacity="0.35" />
            <path d="M8 12h6M8 20h4M8 28h6M8 36h4" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
          </g>
        );
      default:
        return (
          <g>
            <circle cx="24" cy="24" r="15" fill="#2a0b33" stroke={color} strokeWidth="2.4" />
            <path d="M24 12v24M14 24h20M17 17l14 14M31 17 17 31" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="24" cy="24" r="4.5" fill={color} />
          </g>
        );
    }
  };
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <rect x="2" y="2" width="44" height="44" rx="12" fill="rgba(8,5,26,0.65)" stroke={color} strokeWidth="2" />
      {art()}
    </svg>
  );
}

export function Emblem({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ animation: "pulseGlow 2.6s ease-in-out infinite" }}>
      <path d="M50 6 88 26v34L50 94 12 60V26z" fill="none" stroke="#ffb324" strokeWidth="3" opacity="0.7" />
      <path d="M58 14 30 48h14l-6 30 34-40H56l8-24z" fill="#ffb324" />
      <path d="M58 14 30 48h14l-6 30 34-40H56l8-24z" fill="none" stroke="#fff2b0" strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}

export function useToasts() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; color?: string }[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const push = useCallback((msg: string, color?: string) => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-4), { id, msg, color }]);
    const timer = setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
      timersRef.current = timersRef.current.filter((x) => x !== timer);
    }, 2400);
    timersRef.current.push(timer);
  }, []);

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    },
    []
  );

  return { toasts, push };
}

export function Toasts({ toasts }: { toasts: { id: number; msg: string; color?: string }[] }) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-16 z-[90] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast rounded-lg border px-4 py-1.5 text-[15px] font-bold tracking-wide"
          style={{
            background: "rgba(10,6,30,0.92)",
            borderColor: t.color || "var(--line2)",
            color: t.color || "var(--txt)",
            boxShadow: `0 0 18px ${t.color ? t.color + "44" : "rgba(74,58,150,0.3)"}`,
          }}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export interface CeremonyData {
  kind: "awaken" | "unlock" | "level";
  headline: string;
  sub: string;
  tier?: string;
  color: string;
  desc?: string;
  tower: TowerDef;
}

/**
 * Full-screen celebration shown when a tower awakens (or is unlocked).
 * Rings expand, runes spin, confetti rains and the tower lands with a slam.
 */
export function Ceremony({ data, onClose }: { data: CeremonyData; onClose: () => void }) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: 40 + Math.random() * 20,
        dx: (Math.random() - 0.5) * 420,
        dy: -120 - Math.random() * 420,
        rot: `${Math.round((Math.random() - 0.5) * 900)}deg`,
        color: [data.color, "#ffcf4d", "#35e0ff", "#ff4fd8", "#ffffff"][i % 5],
        size: 5 + Math.random() * 8,
        delay: Math.random() * 0.7,
        round: i % 3 === 0,
      })),
    [data.color]
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const title = data.kind === "awaken" ? "CONGRATULATIONS!" : data.kind === "unlock" ? "TOWER UNLOCKED!" : "TOWER ASCENDED!";

  return (
    <div
      className="fixed inset-0 z-[98] flex items-center justify-center overflow-hidden bg-black/85"
      style={{ animation: "cerBackdrop 0.35s ease both" }}
      onPointerDown={onClose}
      data-testid="ceremony"
    >
      {/* expanding rings + spinning runes */}
      <div className="pointer-events-none absolute inset-0">
        {[0, 0.35, 0.7, 1.05].map((d, i) => (
          <div
            key={i}
            className="cer-ring absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: 220,
              height: 220,
              border: `3px solid ${data.color}`,
              boxShadow: `0 0 40px ${data.color}`,
              animationDelay: `${d}s`,
            }}
          />
        ))}
        <div
          className="cer-rune absolute left-1/2 top-1/2 rounded-full"
          style={{ width: 340, height: 340, border: `2px dashed ${data.color}aa` }}
        />
        <div
          className="cer-rune absolute left-1/2 top-1/2 rounded-full"
          style={{ width: 440, height: 440, border: `1px solid ${data.color}55`, animationDirection: "reverse" }}
        />
        {confetti.map((c) => (
          <span
            key={c.id}
            className="cer-confetti absolute"
            style={
              {
                left: `${c.left}%`,
                top: `${c.top}%`,
                width: c.size,
                height: c.size * (c.round ? 1 : 1.6),
                background: c.color,
                borderRadius: c.round ? "50%" : 2,
                animationDelay: `${c.delay}s`,
                boxShadow: `0 0 10px ${c.color}`,
                "--cx": `${c.dx}px`,
                "--cr": c.rot,
                "--cy": `${c.dy}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center px-6 text-center">
        <div
          className="cer-banner font-disp text-2xl tracking-widest sm:text-4xl"
          style={{ color: data.color, textShadow: `0 0 28px ${data.color}` }}
        >
          {title}
        </div>
        <div className="cer-tower mt-6" style={{ color: data.color }}>
          <TowerIcon def={data.tower} size={168} />
        </div>
        <div className="cer-banner mt-5" style={{ animationDelay: "0.55s" }}>
          <div className="font-disp text-3xl" style={{ color: data.color }}>
            {data.headline}
          </div>
          <div className="mt-1 text-sm font-bold tracking-[0.3em] text-[var(--txt)]">{data.sub}</div>
          {data.tier && (
            <div
              className="font-disp mt-3 inline-block rounded-lg border px-5 py-1 text-xl"
              style={{ borderColor: data.color, color: data.color }}
            >
              {data.tier}
            </div>
          )}
          {data.desc && (
            <p className="mx-auto mt-3 max-w-md text-[13px] font-semibold leading-snug text-[var(--dim)]">
              {data.desc}
            </p>
          )}
        </div>
        <button
          className="btn btn-gold cer-banner mt-7 px-10 py-2.5 text-base"
          style={{ animationDelay: "0.8s" }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onClose}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export function Modal({
  children,
  onClose,
  w = 520,
}: {
  children: React.ReactNode;
  onClose?: () => void;
  w?: number;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="panel anim-pop max-h-[88vh] overflow-y-auto scroll-thin p-5" style={{ width: w }}>
        {children}
      </div>
    </div>
  );
}

// ---------- reward claim animation ----------

/** stand-alone chest so the claim overlay does not depend on the menus module */
export function ClaimChest({ color, size = 150, stage }: { color: string; size?: number; stage: "shut" | "shake" | "burst" }) {
  return (
    <div
      className={stage === "shake" ? "claim-chest-shake" : stage === "burst" ? "claim-chest-burst" : ""}
      style={stage === "shut" ? { animation: "floaty 2.5s ease-in-out infinite" } : undefined}
    >
      <svg width={size} height={size} viewBox="0 0 90 90">
        <ellipse cx="45" cy="78" rx="30" ry="5" fill="#000" opacity="0.45" />
        <rect x="12" y="34" width="66" height="40" rx="6" fill="#3a2a12" stroke={color} strokeWidth="3" />
        <g className={stage === "burst" ? "claim-lid" : ""} style={{ transformOrigin: "45px 44px" }}>
          <path d="M12 42c0-14 14-22 33-22s33 8 33 22v6H12z" fill="#5c451f" stroke={color} strokeWidth="3" />
          <path d="M45 6l2.6 5.4 6 .6-4.5 4 1.3 5.8L45 18.8 39.6 21.8 40.9 16l-4.5-4 6-.6z" fill={color} opacity="0.9" />
        </g>
        <rect x="38" y="36" width="14" height="20" rx="3" fill={color} />
        <circle cx="45" cy="44" r="3.5" fill="#171038" />
      </svg>
    </div>
  );
}

export interface ClaimData {
  /** big headline, e.g. "DAY 3" */
  title: string;
  /** one-line description of what was won */
  subtitle: string;
  lines: RewardLine[];
  color: string;
  /** show the chest-opening beat before the loot */
  chest?: boolean;
  /** how many chests pop open in sequence (defaults to 1 when `chest`) */
  chestCount?: number;
}

/**
 * Full-screen reward claim ceremony: the chest rattles, bursts open, a shock
 * ring fires, sparks rain and each reward line flies in one after another.
 * Used by the daily streak, chests, guild chests and the competition payout.
 */
export function RewardClaim({ data, onClose }: { data: ClaimData; onClose: () => void }) {
  const wantsChest = data.chest !== false && !!data.chest;
  const [phase, setPhase] = useState<"shake" | "burst" | "loot">(wantsChest ? "shake" : "loot");

  useEffect(() => {
    if (!wantsChest) return;
    const a = setTimeout(() => setPhase("burst"), 900);
    const b = setTimeout(() => setPhase("loot"), 1650);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [wantsChest]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const sparks = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        id: i,
        dx: (Math.random() - 0.5) * 460,
        dy: -60 - Math.random() * 360,
        rot: `${Math.round((Math.random() - 0.5) * 720)}deg`,
        size: 5 + Math.random() * 9,
        delay: Math.random() * 0.45,
        color: [data.color, "#ffcf4d", "#35e0ff", "#ff4fd8", "#ffffff"][i % 5],
        round: i % 3 === 0,
      })),
    [data.color]
  );

  const chestCount = Math.max(1, data.chestCount || 1);

  return (
    <div className="claim-root fixed inset-0 z-[90] flex items-center justify-center p-4" data-testid="reward-claim" onPointerDown={onClose}>
      <div className="claim-rays pointer-events-none absolute" style={{ background: `conic-gradient(from 0deg, ${data.color}00, ${data.color}55, ${data.color}00, ${data.color}55, ${data.color}00)` }} />
      <div
        className="panel claim-card relative w-[min(460px,94vw)] p-5 text-center"
        style={{ borderColor: data.color + "aa", boxShadow: `0 0 60px ${data.color}44, 0 10px 0 #0b0722` }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="claim-title font-disp text-3xl" style={{ color: data.color, textShadow: `0 0 28px ${data.color}99` }}>
          {data.title}
        </div>
        <div className="mt-0.5 text-[12px] font-bold tracking-[0.22em] text-[var(--dim)]">{data.subtitle.toUpperCase()}</div>

        {phase !== "loot" ? (
          <div className="relative my-6 grid place-items-center" style={{ minHeight: 170 }}>
            {Array.from({ length: Math.min(3, chestCount) }).map((_, i) => (
              <div key={i} className="absolute" style={{ transform: `translateX(${(i - (Math.min(3, chestCount) - 1) / 2) * 66}px) scale(${chestCount > 1 ? 0.8 : 1})` }}>
                <ClaimChest color={data.color} size={150} stage={phase === "burst" ? "burst" : "shake"} />
              </div>
            ))}
            {phase === "burst" && (
              <>
                <span className="claim-ring absolute" style={{ borderColor: data.color }} />
                <span className="claim-ring absolute" style={{ borderColor: "#ffffff", animationDelay: "120ms" }} />
                <span className="claim-flash absolute inset-0" style={{ background: `radial-gradient(circle, ${data.color}cc, transparent 65%)` }} />
              </>
            )}
          </div>
        ) : (
          <div className="relative my-4">
            {/* sparks only fire once the loot lands */}
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0">
              {sparks.map((s) => (
                <span
                  key={s.id}
                  className="claim-spark absolute left-1/2 top-0"
                  style={
                    {
                      width: s.size,
                      height: s.size,
                      background: s.color,
                      borderRadius: s.round ? "50%" : 2,
                      animationDelay: `${s.delay}s`,
                      "--dx": `${s.dx}px`,
                      "--dy": `${s.dy}px`,
                      "--rot": s.rot,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
            <div className="relative space-y-1.5" data-testid="claim-lines">
              {data.lines.length === 0 && (
                <div className="py-6 text-sm font-bold text-[var(--dim)]">Nothing but good vibes.</div>
              )}
              {data.lines.map((l, i) => (
                <div
                  key={`${l.kind}-${l.id ?? i}`}
                  className="claim-line flex items-center gap-3 rounded-xl border bg-black/45 px-3 py-2"
                  style={{ borderColor: l.color + "66", animationDelay: `${i * 110}ms` }}
                >
                  <span className="claim-line-icon grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: l.color + "22", border: `1px solid ${l.color}55` }}>
                    <RewardIcon line={l} size={26} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-left text-[13px] font-bold text-[var(--txt)]">{l.label}</span>
                  <span className="font-disp shrink-0 text-xl" style={{ color: l.color }}>
                    ×{l.n.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          className="btn btn-gold mt-2 w-full py-3 text-lg"
          data-testid="claim-collect"
          disabled={phase !== "loot"}
          onClick={onClose}
        >
          {phase === "loot" ? "Collect" : "Opening…"}
        </button>
      </div>
    </div>
  );
}
