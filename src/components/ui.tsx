import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { sfx } from "../game/audio";
import type { ChipId, TowerDef } from "../game/data";
import { HERO_BY_ID, RARITY, TOWER_BY_ID, leagueFor, towerArt } from "../game/data";
import type { RewardLine } from "../game/save";

/** Escape fixed overlays from transformed/scrolling app panels into the viewport. */
export function ViewportPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return <>{children}</>;
  const root = document.documentElement;
  const classes = [
    root.dataset.reducedMotion === "on" ? "calm" : "",
    root.dataset.powerSaver === "on" ? "power-saver" : "",
  ].filter(Boolean).join(" ");
  return createPortal(<div className={classes} style={{ display: "contents" }}>{children}</div>, document.body);
}

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

/** a faceted crystal shard — the crystal vault's currency and card art */
export function CrystalIcon({ size = 18, color = "#c44dff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 1.4 16.2 6.2 13.6 18 6.4 18 3.8 6.2z" fill={color} stroke="#0b0726" strokeWidth="1.3" />
      <path d="M10 1.4 10 18M3.8 6.2 10 8.4l6.2-2.2M6.4 18 10 8.4l3.6 9.6" fill="none" stroke="#ffffff" strokeWidth="0.9" opacity="0.55" />
      <path d="M10 3.4 7 6.9 10 16z" fill="#ffffff" opacity="0.28" />
    </svg>
  );
}

/** a round-bottomed potion flask, the crystal upgrade currency */
export function PotionIcon({ size = 18, color = "#b98bff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M8 2.2h4v4.1l3.1 7.2A3.2 3.2 0 0 1 12.2 18H7.8a3.2 3.2 0 0 1-2.9-4.5L8 6.3z" fill={color} stroke="#0b0726" strokeWidth="1.3" />
      <path d="M6.6 12.4h6.8" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
      <path d="M7.6 4.2h4.8" stroke="#0b0726" strokeWidth="1.4" />
      <circle cx="8.5" cy="14" r="1" fill="#ffffff" opacity="0.7" />
      <circle cx="11.6" cy="15.2" r="0.7" fill="#ffffff" opacity="0.55" />
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
  if (line.kind === "potions") return <PotionIcon size={size} />;
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
  potions,
}: {
  gold: number;
  gems: number;
  tokens: number;
  trophies?: number;
  /** crystal potions — shown once the player has any */
  potions?: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {typeof trophies === "number" && (
        <div
          className="pill-dark pill-compact text-[10.5px]"
          style={{ borderColor: leagueFor(trophies).color + "88", color: leagueFor(trophies).color }}
          data-currency="trophies"
        >
          <TrophyIcon size={15} color={leagueFor(trophies).color} />
          <span className="num">{Math.floor(trophies).toLocaleString()}</span>
        </div>
      )}
      <div className="pill-dark pill-compact text-[10.5px] text-[#ffcf4d]" style={{ borderColor: "#8a6a1a" }} data-currency="gold">
        <CoinIcon size={15} />
        <span className="num">{Math.floor(gold).toLocaleString()}</span>
      </div>
      <div className="pill-dark pill-compact text-[10.5px] text-[#35e0ff]" style={{ borderColor: "#1f6f8c" }} data-currency="gems">
        <GemIcon size={15} />
        <span className="num">{Math.floor(gems).toLocaleString()}</span>
      </div>
      <div className="pill-dark pill-compact text-[10.5px] text-[#ff4fd8]" style={{ borderColor: "#7a2f6a" }} data-currency="tokens">
        <TokenIcon size={15} />
        <span className="num">{Math.floor(tokens).toLocaleString()}</span>
      </div>
      {typeof potions === "number" && potions > 0 && (
        <div className="pill-dark pill-compact text-[10.5px] text-[#b98bff]" style={{ borderColor: "#5b3b8c" }} data-currency="potions">
          <PotionIcon size={15} />
          <span className="num">{Math.floor(potions).toLocaleString()}</span>
        </div>
      )}
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
      case "scythe":
        return (
          <g>
            <path d="M30 8c-14 1-22 9-23 20 6-7 13-10 21-10z" fill={c} stroke="#2a1a4a" strokeWidth="1.6" />
            <path d="M13 26 30 42" stroke="#6b7f96" strokeWidth="3.4" strokeLinecap="round" />
            <path d="M28 40l7 3-3-7z" fill={a} />
            <circle cx="34" cy="14" r="3.4" fill={a} />
          </g>
        );
      case "prism":
        return (
          <g>
            <path d="M24 6 40 36H8z" fill="none" stroke={c} strokeWidth="2.6" strokeLinejoin="round" />
            <path d="M24 6v30M16 21h16" stroke={a} strokeWidth="1.8" opacity="0.85" />
            <path d="M24 20 6 34M24 20l18 14M24 20v20" stroke={a} strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
            <circle cx="24" cy="20" r="3.6" fill="#fff" />
          </g>
        );
      case "aegis":
        return (
          <g>
            <path d="M24 5l15 6v13c0 9-6 15-15 19-9-4-15-10-15-19V11z" fill="#10243d" stroke={c} strokeWidth="2.6" strokeLinejoin="round" />
            <path d="M24 12l8 3v8c0 5-3 8-8 11-5-3-8-6-8-11v-8z" fill="none" stroke={a} strokeWidth="2" />
            <circle cx="24" cy="24" r="4" fill="#fff" opacity="0.9" />
          </g>
        );
      case "gate":
        return (
          <g>
            <path d="M11 42V22a13 13 0 0 1 26 0v20z" fill="#2b1206" stroke={c} strokeWidth="2.6" />
            <path d="M17 42V23a7 7 0 0 1 14 0v19z" fill="none" stroke={a} strokeWidth="2.2" />
            <path d="M24 30c2 4 4 5 4 8a4 4 0 0 1-8 0c0-3 3-4 4-8z" fill="#ffd23f" />
            <path d="M8 42h32" stroke={c} strokeWidth="3" strokeLinecap="round" />
          </g>
        );
      // ---------- mythic arsenal II ----------
      case "demon":
        return (
          <g>
            <path d="M10 40c-3-8-2-20 14-20s17 12 14 20z" fill="#1a0509" stroke={c} strokeWidth="2.4" />
            <path d="M11 24c-5-9-3-16 3-15M37 24c5-9 3-16-3-15" fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" />
            <path d="M24 4l5 12-5 8-5-8z" fill={c} />
            <path d="M23 6v14" stroke="#fff" strokeWidth="1.6" />
            <path d="M16 34h16" stroke={a} strokeWidth="2.4" strokeLinecap="round" />
          </g>
        );
      case "heavenly":
        return (
          <g>
            <ellipse cx="24" cy="11" rx="13" ry="4" fill="none" stroke={a} strokeWidth="2.6" />
            <path d="M24 1v5M12 11h-4M36 11h4" stroke={a} strokeWidth="2.2" strokeLinecap="round" />
            <rect x="10" y="20" width="28" height="18" rx="5" fill="#2b2410" stroke={a} strokeWidth="2.4" />
            <path d="M24 24l-4 7h4l-2 6 7-9h-4l3-4z" fill="#ffe86b" />
            <path d="M10 29h28" stroke={a} strokeWidth="1.6" opacity="0.6" />
          </g>
        );
      case "supervisor":
        return (
          <g>
            <path d="M24 5 40 12v12c0 10-7 16-16 20C15 40 8 34 8 24V12z" fill="#260812" stroke="#ff315c" strokeWidth="2.5" />
            <path d="M26 10 15 26h8l-2 12 12-18h-8z" fill="#ff315c" stroke="#ffdbe2" strokeWidth="1.2" />
            <path d="M11 16h5M32 34h5" stroke="#ff9aaa" strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      case "honor":
        return (
          <g>
            <rect x="9" y="28" width="30" height="14" rx="4" fill="#3a2a12" stroke={a} strokeWidth="2.4" />
            <path d="M10 20l7 6 7-11 7 11 7-6v10H10z" fill={a} stroke="#8a5a00" strokeWidth="1.6" />
            <circle cx="24" cy="24" r="2.6" fill="#ff4fd8" />
            <path d="M14 34h6M28 34h6" stroke="#fff6c4" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        );
      case "beam":
        return (
          <g>
            <rect x="6" y="21" width="26" height="7" rx="3" fill={c} />
            <circle cx="36" cy="24.5" r="5" fill="#fff" opacity="0.9" />
            <circle cx="36" cy="24.5" r="8" fill="none" stroke={c} strokeWidth="2" opacity="0.5" />
            <path d="M10 14v-4M18 13V8M26 14v-4" stroke={c} strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
          </g>
        );
      case "howitzer":
        return (
          <g>
            <rect x="8" y="26" width="32" height="12" rx="4" fill="#2d3748" stroke={c} strokeWidth="2" />
            <rect x="14" y="12" width="26" height="10" rx="5" fill={c} transform="rotate(-18 27 17)" />
            <circle cx="13" cy="32" r="3.4" fill={a} />
            <circle cx="23" cy="32" r="3.4" fill={a} />
            <circle cx="33" cy="32" r="3.4" fill={a} />
          </g>
        );
      case "ion":
        return (
          <g>
            <circle cx="24" cy="24" r="12" fill="none" stroke={c} strokeWidth="2.5" />
            <circle cx="24" cy="24" r="5" fill={a} />
            <path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M38 38l-4-4M10 38l4-4M38 10l-4 4" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
          </g>
        );
      case "aether":
        return (
          <g>
            <path d="M24 8l8 12-8 20-8-20z" fill={c} opacity="0.9" />
            <path d="M24 8l8 12-8 4-8-4z" fill="#fff" opacity="0.85" />
            <path d="M8 24h8M32 24h8M14 14l5 5M34 34l-5-5" stroke={a} strokeWidth="2.6" strokeLinecap="round" />
          </g>
        );
      case "spire":
        return (
          <g>
            <path d="M24 4l9 22-9 18-9-18z" fill="#3a1420" stroke={c} strokeWidth="2" />
            <path d="M24 14l5 10-5 9-5-9z" fill={a} />
            <path d="M12 42h24" stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
          </g>
        );
      case "venom":
        return (
          <g>
            <ellipse cx="24" cy="18" rx="11" ry="13" fill={c} />
            <path d="M24 12c2 4 5 5 5 9a5 5 0 0 1-10 0c0-3 3-4 5-9z" fill="#d9ffe9" opacity="0.8" />
            <path d="M16 30l-3 8M24 32v9M32 30l3 8" stroke={c} strokeWidth="3" strokeLinecap="round" />
            <circle cx="20" cy="41" r="2.4" fill={a} />
            <circle cx="28" cy="43" r="2.4" fill={a} />
          </g>
        );
      case "clone":
        return (
          <g>
            <path d="M20 9l10 9-10 9-10-9z" fill="#2f6f52" stroke="#8effc4" strokeWidth="1.6" />
            <path d="M28 21l10 9-10 9-10-9z" fill="#8effc4" stroke="#d9ffe9" strokeWidth="1.6" opacity="0.95" />
            <path d="M7 7h6M7 7v6M41 41h-6M41 41v-6" stroke="#d9ffe9" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        );
      case "nova":
        return (
          <g>
            <circle cx="24" cy="24" r="7" fill="#fff2b0" />
            <circle cx="24" cy="24" r="11" fill="none" stroke={c} strokeWidth="2.4" />
            {Array.from({ length: 8 }).map((_, i) => {
              const ang = (i / 8) * Math.PI * 2;
              const x1 = 24 + Math.cos(ang) * 13;
              const y1 = 24 + Math.sin(ang) * 13;
              const x2 = 24 + Math.cos(ang) * 21;
              const y2 = 24 + Math.sin(ang) * 21;
              return <path key={i} d={`M${x1} ${y1} L${x2} ${y2}`} stroke={a} strokeWidth="3" strokeLinecap="round" />;
            })}
            <circle cx="24" cy="24" r="4" fill="#fff" />
          </g>
        );
      case "well":
        return (
          <g>
            <circle cx="24" cy="24" r="18" fill="rgba(0,0,0,0.55)" stroke={c} strokeWidth="2.2" />
            <circle cx="24" cy="24" r="12" fill="none" stroke={a} strokeWidth="2" opacity="0.8" />
            <circle cx="24" cy="24" r="6.5" fill="#1a0f33" stroke={c} strokeWidth="2" />
            <path d="M24 14v6M24 34v-6M14 24h6M34 24h-6" stroke={a} strokeWidth="2.6" strokeLinecap="round" />
            <circle cx="24" cy="24" r="2.6" fill="#fff" />
          </g>
        );
      case "crown":
        return (
          <g>
            <path d="M10 20l4-9 5 6 5-9 5 9 5-6 4 9z" fill={c} stroke="#4a3a10" strokeWidth="1.6" />
            <path d="M12 22h24l-2 6H14z" fill={a} opacity="0.85" />
            <path d="M26 12l-6 11h5l-3 13 9-14h-6l4-10z" fill="#fff6c4" stroke="#8a6a1a" strokeWidth="1.4" />
            <circle cx="24" cy="24" r="16" fill="none" stroke={a} strokeWidth="1.6" opacity="0.5" />
          </g>
        );
      case "ripper":
        return (
          <g>
            <path d="M8 24 20 12l4 8-4 4 4 4-4 8z" fill={c} opacity="0.9" />
            <path d="M40 24 28 12l-4 8 4 4-4 4 4 8z" fill={a} opacity="0.9" />
            <path d="M24 6v36" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="4 4" />
            <circle cx="24" cy="24" r="4" fill="#fff" />
          </g>
        );
      case "furnace":
        return (
          <g>
            <path d="M12 20h24l-3 20H15z" fill="#3a1d10" stroke={c} strokeWidth="2.2" />
            <path d="M24 8c3 8 9 9 9 16a9 9 0 0 1-18 0c0-5 3-6 4-11 2 3 4 3 5-5z" fill={a} />
            <path d="M24 18c1.4 4 5 4.5 5 9a5 5 0 0 1-10 0c0-3 3-3.5 5-9z" fill="#fff2b0" />
          </g>
        );
      case "whirl":
        return (
          <g>
            <path
              d="M24 6c10 0 18 8 18 18s-8 18-18 18S6 34 6 24 14 6 24 6zm0 7c-6 0-11 5-11 11s5 11 11 11 11-5 11-11-5-11-11-11z"
              fill={c}
              opacity="0.5"
            />
            <path d="M24 13a11 11 0 0 1 11 11c0 4-2 7-6 9 2-4 1-8-3-10s-8-1-10 3c-1-6 3-13 8-13z" fill={a} />
            <circle cx="24" cy="24" r="3.6" fill="#fff" />
          </g>
        );
      case "star":
        return (
          <g>
            <path d="M34 6l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff2b0" stroke={c} strokeWidth="1.6" />
            <path d="M20 16l2.4 5.6L28 24l-5.6 2.4L20 32l-2.4-5.6L12 24l5.6-2.4z" fill={a} opacity="0.9" />
            <path d="M14 34l14-6M12 40l10-4" stroke={c} strokeWidth="2.6" strokeLinecap="round" />
          </g>
        );
      case "lock":
        return (
          <g>
            <circle cx="24" cy="24" r="15" fill="#10243d" stroke={c} strokeWidth="2.6" />
            <path d="M24 12v12l8 5" stroke={a} strokeWidth="2.6" strokeLinecap="round" fill="none" />
            <circle cx="24" cy="24" r="3" fill="#fff" />
            <path d="M9 33l6 3M39 15l-6-3M15 9l3 6M33 39l-3-6" stroke={a} strokeWidth="2.2" strokeLinecap="round" />
          </g>
        );
      case "bloom":
        return (
          <g>
            {Array.from({ length: 6 }).map((_, i) => {
              const ang = (i / 6) * Math.PI * 2;
              return (
                <ellipse
                  key={i}
                  cx={24 + Math.cos(ang) * 11}
                  cy={24 + Math.sin(ang) * 11}
                  rx="6"
                  ry="3.6"
                  fill={i % 2 ? a : c}
                  opacity="0.85"
                  transform={`rotate(${(ang * 180) / Math.PI} ${24 + Math.cos(ang) * 11} ${24 + Math.sin(ang) * 11})`}
                />
              );
            })}
            <circle cx="24" cy="24" r="5" fill="#0b3d24" stroke="#8effc4" strokeWidth="1.8" />
            <circle cx="24" cy="24" r="2" fill="#fff" />
          </g>
        );
      case "colossus":
        return (
          <g>
            <path d="M24 5l14 5v13c0 9-6 15-14 20-8-5-14-11-14-20V10z" fill="#2a1220" stroke={c} strokeWidth="2.6" />
            <rect x="14" y="18" width="20" height="9" rx="3" fill={a} />
            <rect x="30" y="20" width="12" height="5" rx="2.5" fill="#4a5568" stroke={c} strokeWidth="1.6" />
            <path d="M18 32h12" stroke={a} strokeWidth="3" strokeLinecap="round" />
          </g>
        );
      default:
        return (
          <g>
            <circle cx="24" cy="24" r="16" fill="#11102a" stroke={c} strokeWidth="2.5" />
            <text x="24" y="31" textAnchor="middle" fontSize="20" fontWeight="900" fill={a}>{id.slice(0, 1).toUpperCase()}</text>
          </g>
        );
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
    <ViewportPortal>
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
    </ViewportPortal>
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
      Array.from({ length: 32 }, (_, i) => ({
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
    <ViewportPortal>
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
    </ViewportPortal>
  );
}

/** ---------- setting glyphs (one shared 24px stroke set) ---------- */
export type SetIconName =
  | "volume"
  | "booster"
  | "power"
  | "sfx"
  | "fx"
  | "dmg"
  | "shake"
  | "guides"
  | "fast"
  | "calm"
  | "perf"
  | "interp"
  | "fps"
  | "bolt"
  | "download"
  | "expand"
  | "backup"
  | "reset"
  | "replay"
  | "diag";

const SET_PATHS: Record<SetIconName, ReactNode> = {
  volume: (
    <>
      <path d="M4 9h3l5-4v14l-5-4H4z" />
      <path d="M16 8.6a5 5 0 0 1 0 6.8" />
      <path d="M18.6 6a8.4 8.4 0 0 1 0 12" />
    </>
  ),
  booster: (
    <>
      <path d="M4 9h3l5-4v14l-5-4H4z" />
      <path d="M16 8.6a5 5 0 0 1 0 6.8" />
      <path d="M18.6 6a8.4 8.4 0 0 1 0 12" />
      <path d="M21 3.2v5M18.5 5.7h5" />
    </>
  ),
  power: (
    <>
      <path d="M12 2.6v8.2" />
      <path d="M6.4 6.3a8 8 0 1 0 11.2 0" />
    </>
  ),
  sfx: (
    <>
      <path d="M9 18V6l10-2.4V16" />
      <circle cx="6.4" cy="18" r="2.6" />
      <circle cx="16.4" cy="16" r="2.6" />
    </>
  ),
  fx: (
    <>
      <path d="M11 3.2l1.7 4.3 4.3 1.7-4.3 1.7L11 15.2 9.3 10.9 5 9.2l4.3-1.7z" />
      <path d="M18 15.4l.85 2.15 2.15.85-2.15.85L18 21.4l-.85-2.15-2.15-.85 2.15-.85z" />
    </>
  ),
  bolt: (
    <>
      <path d="M13.4 2.4 5 13.6h5.4L9.4 21.6l8.6-11.4h-5.5z" />
    </>
  ),
  dmg: (
    <>
      <path d="M9.5 4 8 20" />
      <path d="M16 4l-1.5 16" />
      <path d="M4.6 9h15" />
      <path d="M3.9 15h15" />
    </>
  ),
  shake: (
    <>
      <rect x="8" y="3" width="8" height="18" rx="2.4" />
      <path d="M4.4 8.5v7" />
      <path d="M2 10.5v3" />
      <path d="M19.6 8.5v7" />
      <path d="M22 10.5v3" />
    </>
  ),
  guides: (
    <>
      <circle cx="12" cy="12" r="7.6" />
      <circle cx="12" cy="12" r="1.7" />
      <path d="M12 1.6v4.2M12 18.2v4.2M1.6 12h4.2M18.2 12h4.2" />
    </>
  ),
  fast: (
    <>
      <path d="M4 5.6 11 12l-7 6.4z" />
      <path d="M13 5.6 20 12l-7 6.4z" />
    </>
  ),
  calm: (
    <>
      <path d="M2.6 12c2.4-5 4.8-5 7.2 0s4.8 5 7.2 0" />
      <path d="M4.5 20 19.5 4" />
    </>
  ),
  perf: (
    <>
      <path d="M3.6 18.4a9 9 0 1 1 16.8 0" />
      <path d="M12 18.4l4.6-6.6" />
      <circle cx="12" cy="18.4" r="1.3" />
    </>
  ),
  interp: (
    <>
      <path d="M2 12c2.2-6.4 4.4-6.4 6.6 0s4.4 6.4 6.6 0 4.4-6.4 6.6 0" />
      <path d="M3 20h18" />
    </>
  ),
  fps: (
    <>
      <path d="M4 18V9" />
      <path d="M9.3 18V5" />
      <path d="M14.7 18v-8" />
      <path d="M20 18V7" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v11.5" />
      <path d="M7.2 10.4 12 15.2l4.8-4.8" />
      <path d="M4 20h16" />
    </>
  ),
  expand: (
    <>
      <path d="M4 9V4h5" />
      <path d="M20 9V4h-5" />
      <path d="M4 15v5h5" />
      <path d="M20 15v5h-5" />
    </>
  ),
  backup: (
    <>
      <ellipse cx="12" cy="6" rx="7.4" ry="3.1" />
      <path d="M4.6 6v12c0 1.7 3.3 3.1 7.4 3.1s7.4-1.4 7.4-3.1V6" />
      <path d="M4.6 12c0 1.7 3.3 3.1 7.4 3.1s7.4-1.4 7.4-3.1" />
    </>
  ),
  reset: (
    <>
      <path d="M4 7h16" />
      <path d="M9.2 7V4.4h5.6V7" />
      <path d="M6.2 7l1.1 13h9.4L17.8 7" />
      <path d="M10.4 11v5.6M13.6 11v5.6" />
    </>
  ),
  replay: (
    <>
      <path d="M3.4 12a8.6 8.6 0 1 0 2.9-6.4" />
      <path d="M3 4v5h5" />
    </>
  ),
  diag: <path d="M2.6 12h3.8l2.4-6.2 3.8 12.4 2.4-6.2h5.6" />,
};

/**
 * A rounded glyph tile used down the left side of every settings row, so each
 * option reads at a glance instead of being a wall of identical paragraphs.
 */
export function SetIcon({ name, color = "#35e0ff", size = 34 }: { name: SetIconName; color?: string; size?: number }) {
  return (
    <span className="set-ico" style={{ color, width: size, height: size, borderColor: color + "66", background: `radial-gradient(circle at 30% 20%, ${color}33, rgba(0,0,0,0.55))` }}>
      <svg
        width={size * 0.56}
        height={size * 0.56}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {SET_PATHS[name]}
      </svg>
    </span>
  );
}

/** mini frame-rate bars for the max-FPS chips (unlimited gets the infinity loop) */
export function FpsBars({ fps, active }: { fps: number; active: boolean }) {
  if (fps === 0) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden="true">
        <path d="M6.4 12c0-2 1.3-3.4 3-3.4 2.6 0 5.2 6.8 7.8 6.8 1.7 0 3-1.4 3-3.4s-1.3-3.4-3-3.4c-2.6 0-5.2 6.8-7.8 6.8-1.7 0-3-1.4-3-3.4z" />
      </svg>
    );
  }
  const bars = fps <= 30 ? 1 : fps <= 60 ? 2 : fps <= 120 ? 3 : 4;
  return (
    <span className="fps-bars" data-active={active ? "1" : "0"} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <i key={i} style={{ height: 4 + i * 2.6, opacity: i < bars ? 1 : 0.25 }} />
      ))}
    </span>
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
    <ViewportPortal>
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="panel anim-pop max-h-[88dvh] max-w-[calc(100vw-2rem)] overflow-y-auto scroll-thin p-5" style={{ width: w, maxWidth: "calc(100vw - 2rem)" }}>
        {children}
      </div>
    </div>
    </ViewportPortal>
  );
}

// ---------- reward claim animation ----------

/** stand-alone chest so the claim overlay does not depend on the menus module */
/**
 * The chest itself. Six beats drive it: `shut` (idle float), `charge` (it sucks
 * light inward and compresses), `shake` (violent rattle with escaping light),
 * `crack` (seams split, beams blast out of the gaps), `burst` (the lid is torn
 * off and spins away) and `open` (the aftermath, lid gone, interior glowing).
 */
export function ClaimChest({
  color,
  size = 150,
  stage,
}: {
  color: string;
  size?: number;
  stage: "shut" | "charge" | "shake" | "crack" | "burst" | "open";
}) {
  const cls =
    stage === "charge"
      ? "chest-charge"
      : stage === "shake"
        ? "chest-shake"
        : stage === "crack"
          ? "chest-crack"
          : stage === "burst"
            ? "chest-burst"
            : "";
  const cracked = stage === "crack" || stage === "burst" || stage === "open";
  const lidOff = stage === "burst" || stage === "open";
  return (
    <div className={cls} style={stage === "shut" ? { animation: "floaty 2.5s ease-in-out infinite" } : undefined}>
      <svg width={size} height={size} viewBox="0 0 90 90" style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id={`chestGlow-${color.slice(1)}`}>
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`chestBody-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6b4e22" />
            <stop offset="100%" stopColor="#2a1c0a" />
          </linearGradient>
          <linearGradient id={`chestShaft-${color.slice(1)}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0.85" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* light pouring out of the seams once it cracks */}
        {cracked && (
          <g className="chest-beams" style={{ transformOrigin: "45px 48px" }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <rect
                key={i}
                x="43.5"
                y="-40"
                width="3"
                height="88"
                fill={color}
                opacity="0.75"
                transform={`rotate(${i * 36} 45 48)`}
              />
            ))}
          </g>
        )}
        {(stage === "charge" || cracked) && (
          <circle cx="45" cy="48" r={cracked ? 40 : 26} fill={`url(#chestGlow-${color.slice(1)})`} opacity={cracked ? 0.95 : 0.5} className="chest-core" />
        )}

        {/* the light column: a shaft of raw reward shooting skyward as it opens */}
        {lidOff && (
          <g className="chest-shaft" style={{ transformOrigin: "45px 60px" }}>
            <rect x="30" y="-190" width="30" height="250" fill={`url(#chestShaft-${color.slice(1)})`} opacity="0.85" />
            <rect x="41" y="-190" width="8" height="250" fill="#ffffff" opacity="0.75" />
          </g>
        )}
        <ellipse cx="45" cy="78" rx="30" ry="5" fill="#000" opacity="0.45" />
        {/* the floor splits under the pressure right before the lid gives way */}
        {cracked && <ellipse className="chest-floor" cx="45" cy="79" rx="34" ry="7" fill="none" stroke={color} strokeWidth="2" opacity="0.65" />}
        {/* body */}
        <rect x="12" y="34" width="66" height="40" rx="6" fill={`url(#chestBody-${color.slice(1)})`} stroke={color} strokeWidth="3" />
        {/* metal banding gives it some heft */}
        <rect x="18" y="34" width="5" height="40" fill={color} opacity="0.35" />
        <rect x="67" y="34" width="5" height="40" fill={color} opacity="0.35" />
        <rect x="12" y="52" width="66" height="3" fill={color} opacity="0.3" />
        {/* the seam blazing open */}
        {cracked && <rect x="12" y="32" width="66" height="5" fill="#fff" opacity="0.95" />}

        <g
          className={lidOff ? "chest-lid-off" : cracked ? "chest-lid-lift" : ""}
          style={{ transformOrigin: "45px 44px" }}
        >
          <path d="M12 42c0-14 14-22 33-22s33 8 33 22v6H12z" fill="#5c451f" stroke={color} strokeWidth="3" />
          <path d="M22 40c0-10 10-16 23-16s23 6 23 16" fill="none" stroke={color} strokeWidth="2" opacity="0.5" />
          <path d="M45 6l2.6 5.4 6 .6-4.5 4 1.3 5.8L45 18.8 39.6 21.8 40.9 16l-4.5-4 6-.6z" fill={color} opacity="0.9" />
        </g>
        {!lidOff && (
          <>
            <rect x="38" y="36" width="14" height="20" rx="3" fill={color} />
            <circle cx="45" cy="44" r="3.5" fill="#171038" />
          </>
        )}
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

/** payouts at or above these amounts trigger the full currency downpour */
export const GOLD_RAIN_MIN = 1000;
export const GEM_RAIN_MIN = 100;

/**
 * The jackpot cascade. When a claim pays 1000+ gold or 100+ gems the whole
 * screen becomes the payout: a burst blows out from the card, coins and gems
 * fall as **comets** with a hot trail and a bounce at the bottom, embers spray
 * out of the impact line, and the screen pulses warm behind it all. Bigger
 * payouts make the cascade denser, longer and brighter.
 */
function CurrencyRain({ gold, gems }: { gold: number; gems: number }) {
  const { drops, sparks, heat } = useMemo(() => {
    type Drop = {
      id: string;
      kind: "gold" | "gems";
      left: number;
      delay: number;
      dur: number;
      size: number;
      spin: number;
      drift: number;
    };
    const out: Drop[] = [];
    // payout -> density, capped so even an absurd jackpot stays readable
    const mk = (kind: "gold" | "gems", amount: number, floor: number, cap: number) => {
      const n = Math.min(cap, Math.round(floor + Math.sqrt(amount / (kind === "gold" ? 30 : 3))));
      for (let i = 0; i < n; i++) {
        out.push({
          id: `${kind}-${i}`,
          kind,
          left: Math.random() * 100,
          delay: Math.random() * 1.1,
          dur: 1.25 + Math.random() * 1.1,
          size: 14 + Math.random() * 22,
          spin: Math.round((Math.random() - 0.5) * 1440),
          drift: Math.round((Math.random() - 0.5) * 160),
        });
      }
    };
    if (gold >= GOLD_RAIN_MIN) mk("gold", gold, 22, 62);
    if (gems >= GEM_RAIN_MIN) mk("gems", gems, 18, 52);
    // a burst of sparks along the bottom that reads as coins hitting the floor
    const sp = Array.from({ length: 26 }, (_, i) => ({
      id: `sp-${i}`,
      left: Math.random() * 100,
      bottom: Math.random() * 26,
      delay: Math.random() * 1.6,
      dur: 0.6 + Math.random() * 0.5,
      dx: Math.round((Math.random() - 0.5) * 70),
      dy: Math.round(-30 - Math.random() * 60),
    }));
    const h = Math.min(1, (gold / (GOLD_RAIN_MIN * 12) + gems / (GEM_RAIN_MIN * 8)) / 2);
    return { drops: out.sort(() => Math.random() - 0.5), sparks: sp, heat: h };
  }, [gold, gems]);

  if (!drops.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[92] overflow-hidden" data-testid="currency-rain">
      <div className="jackpot-scrim" />
      <div className="jackpot-burst" />
      {sparks.map((sp) => (
        <span
          key={sp.id}
          className="jackpot-spark"
          style={
            {
              left: `${sp.left}%`,
              bottom: `${sp.bottom}%`,
              animationDelay: `${sp.delay}s`,
              animationDuration: `${sp.dur}s`,
              "--dx": `${sp.dx}px`,
              "--dy": `${sp.dy}px`,
            } as React.CSSProperties
          }
        />
      ))}
      {drops.map((d) => (
        <span
          key={d.id}
          className="jackpot-coin coin-drop absolute top-0"
          style={
            {
              left: `${d.left}%`,
              animationDelay: `${d.delay}s`,
              animationDuration: `${d.dur}s`,
              opacity: 0.85 + heat * 0.15,
              "--spin": `${d.spin}deg`,
              "--drift": `${d.drift}px`,
            } as React.CSSProperties
          }
        >
          <span className="jackpot-comet coin-spin block">
            {d.kind === "gold" ? <CoinIcon size={d.size} /> : <GemIcon size={d.size} />}
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * Full-screen reward claim ceremony. The chest charges, rattles itself apart,
 * splits at the seams with light blasting out, then has its lid torn clean off
 * — and the loot lands as a compact grid of tiles rather than a tall list, so
 * even a ten-line legendary haul fits on one phone screen without scrolling.
 * Big payouts additionally trigger a downpour of coins or gems.
 */
export function RewardClaim({ data, onClose }: { data: ClaimData; onClose: () => void }) {
  const wantsChest = data.chest !== false && !!data.chest;
  const [phase, setPhase] = useState<"wind" | "rattle" | "crack" | "burst" | "loot">(wantsChest ? "wind" : "loot");

  const gold = data.lines.find((l) => l.kind === "gold")?.n || 0;
  const gems = data.lines.find((l) => l.kind === "gems")?.n || 0;
  const jackpot = gold >= GOLD_RAIN_MIN || gems >= GEM_RAIN_MIN;

  // the open sequence, beat by beat:
  // wind     the arena dims and every mote of light is dragged into the lock
  // rattle   the chest fights back — violent shake, lid hammering, floor cracks
  // crack    the seams split and beams tear out of the gaps
  // burst    the lid is torn clean off, a light column erupts, shards fly
  // loot     the haul lands tile by tile with a rising chime cascade
  useEffect(() => {
    if (!wantsChest) return;
    sfx.chestWind();
    const ts = [
      setTimeout(() => {
        setPhase("rattle");
        sfx.chestRattle();
      }, 700),
      setTimeout(() => {
        setPhase("crack");
        sfx.chestSlam();
        sfx.chestCrack();
      }, 1420),
      setTimeout(() => {
        setPhase("burst");
        sfx.chestBlast();
        sfx.chestLid();
      }, 1760),
      setTimeout(() => {
        setPhase("loot");
        sfx.chestLoot(data.lines.length || 3);
      }, 2440),
    ];
    return () => ts.forEach(clearTimeout);
  }, [wantsChest, data.lines.length]);

  // the jackpot rain and its sound fire the instant the loot is revealed
  useEffect(() => {
    if (phase !== "loot" || !jackpot) return;
    if (gold >= GOLD_RAIN_MIN) sfx.goldRain();
    if (gems >= GEM_RAIN_MIN) setTimeout(() => sfx.gemRain(), gold >= GOLD_RAIN_MIN ? 260 : 0);
  }, [phase, jackpot, gold, gems]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const sparks = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        id: i,
        dx: (Math.random() - 0.5) * 520,
        dy: -60 - Math.random() * 400,
        rot: `${Math.round((Math.random() - 0.5) * 900)}deg`,
        size: 4 + Math.random() * 10,
        delay: Math.random() * 0.4,
        color: [data.color, "#ffcf4d", "#35e0ff", "#ff4fd8", "#ffffff"][i % 5],
        round: i % 3 === 0,
      })),
    [data.color]
  );

  // debris thrown out at the moment the lid tears off
  const debris = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const a = (i / 26) * Math.PI * 2 + Math.random() * 0.3;
        const d = 80 + Math.random() * 190;
        return {
          id: i,
          dx: Math.cos(a) * d,
          dy: Math.sin(a) * d * 0.8 - 40,
          size: 3 + Math.random() * 7,
          rot: `${Math.round((Math.random() - 0.5) * 900)}deg`,
          color: [data.color, "#ffffff", "#ffcf4d"][i % 3],
          delay: Math.random() * 0.1,
        };
      }),
    [data.color]
  );

  // motes of light dragged inward during the wind-up
  const motes = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2 + Math.random() * 0.3;
        const r = 150 + Math.random() * 190;
        return {
          id: i,
          x: Math.cos(a) * r,
          y: Math.sin(a) * r * 0.7,
          size: 3 + Math.random() * 6,
          delay: Math.random() * 0.6,
          color: ["#ffffff", "#ffcf4d", data.color][i % 3],
        };
      }),
    [data.color]
  );

  // shockwave rings thrown out at the crack and again at the burst
  const waves = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        id: i,
        delay: i * 0.11,
        size: 60 + i * 26,
        color: [data.color, "#ffffff", "#ffcf4d", data.color][i % 4],
      })),
    [data.color]
  );

  // embers rising out of the opened chest
  const embers = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 130,
        size: 3 + Math.random() * 5,
        delay: Math.random() * 0.5,
        dur: 0.9 + Math.random() * 0.9,
        color: ["#ffcf4d", "#ffb324", data.color, "#ffffff"][i % 4],
      })),
    [data.color]
  );

  const chestCount = Math.max(1, data.chestCount || 1);
  const opening = phase !== "loot";
  const chestStage = phase === "loot" ? "open" : phase === "wind" ? "charge" : phase === "rattle" ? "shake" : phase;
  const shaking = phase === "rattle" || phase === "crack";

  return (
    <ViewportPortal>
      <div
      className={`claim-root fixed inset-0 z-[90] flex items-center justify-center p-4 ${shaking ? "claim-quake" : ""} ${phase === "wind" ? "claim-vacuum" : ""}`}
      data-testid="reward-claim"
      onPointerDown={onClose}
    >
      <div
        className="claim-rays pointer-events-none absolute"
        style={{ background: `conic-gradient(from 0deg, ${data.color}00, ${data.color}55, ${data.color}00, ${data.color}55, ${data.color}00)` }}
      />
      {phase === "loot" && jackpot && <CurrencyRain gold={gold} gems={gems} />}

      <div
        className={`panel claim-card relative w-[min(430px,94vw)] p-4 text-center ${phase === "burst" ? "claim-kick" : ""}`}
        style={{ borderColor: data.color + "aa", boxShadow: `0 0 60px ${data.color}44, 0 10px 0 #0b0722` }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="claim-title font-disp text-2xl leading-none" style={{ color: data.color, textShadow: `0 0 28px ${data.color}99` }}>
          {data.title}
        </div>
        <div className="mt-0.5 text-[11px] font-bold tracking-[0.22em] text-[var(--dim)]">{data.subtitle.toUpperCase()}</div>
        {phase === "loot" && jackpot && (
          <div className="jackpot-tag jackpot-count mt-1 text-[12px] font-black tracking-[0.3em]" style={{ color: "#ffcf4d" }}>
            ★ JACKPOT · {gold >= GOLD_RAIN_MIN ? `${gold.toLocaleString("en-US")} GOLD` : `${gems.toLocaleString("en-US")} GEMS`} ★
          </div>
        )}

        {opening ? (
          <div className="relative my-4 grid place-items-center" style={{ minHeight: 150 }}>
            {Array.from({ length: Math.min(3, chestCount) }).map((_, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  transform: `translateX(${(i - (Math.min(3, chestCount) - 1) / 2) * 62}px) scale(${chestCount > 1 ? 0.78 : 1})`,
                  animationDelay: `${i * 70}ms`,
                }}
              >
                <ClaimChest color={data.color} size={138} stage={chestStage} />
              </div>
            ))}
            {phase === "wind" &&
              motes.map((m) => (
                <span
                  key={m.id}
                  className="chest-mote absolute"
                  style={
                    {
                      width: m.size,
                      height: m.size,
                      background: m.color,
                      boxShadow: `0 0 10px ${m.color}`,
                      animationDelay: `${m.delay}s`,
                      "--mx": `${m.x}px`,
                      "--my": `${m.y}px`,
                    } as React.CSSProperties
                  }
                />
              ))}
            {(phase === "crack" || phase === "burst") && (
              <>
                {waves.map((w) => (
                  <span
                    key={`w-${w.id}`}
                    className="chest-wave absolute"
                    style={
                      {
                        width: w.size,
                        height: w.size,
                        borderColor: w.color,
                        animationDelay: `${w.delay}s`,
                      } as React.CSSProperties
                    }
                  />
                ))}
                <span className="claim-ring absolute" style={{ borderColor: data.color }} />
                <span className="claim-ring absolute" style={{ borderColor: "#ffffff", animationDelay: "100ms" }} />
                <span className="claim-flash absolute inset-0" style={{ background: `radial-gradient(circle, ${data.color}cc, transparent 65%)` }} />
              </>
            )}
            {phase === "burst" && (
              <>
                <span className="chest-blastwave absolute" style={{ background: `radial-gradient(circle, #ffffff, ${data.color}00 62%)` }} />
                {embers.map((e) => (
                  <span
                    key={`e-${e.id}`}
                    className="chest-ember absolute"
                    style={
                      {
                        width: e.size,
                        height: e.size,
                        background: e.color,
                        boxShadow: `0 0 10px ${e.color}`,
                        animationDelay: `${e.delay}s`,
                        animationDuration: `${e.dur}s`,
                        "--ex": `${e.x}px`,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </>
            )}
            {phase === "burst" &&
              debris.map((d) => (
                <span
                  key={d.id}
                  className="chest-debris absolute"
                  style={
                    {
                      width: d.size,
                      height: d.size,
                      background: d.color,
                      borderRadius: d.id % 2 ? "50%" : 1,
                      animationDelay: `${d.delay}s`,
                      "--dx": `${d.dx}px`,
                      "--dy": `${d.dy}px`,
                      "--rot": d.rot,
                    } as React.CSSProperties
                  }
                />
              ))}
          </div>
        ) : (
          <div className="relative my-3">
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

            {/* compact loot grid — two tiles per row, scrolls only past ~8 items */}
            <div className="scroll-thin relative grid max-h-[46vh] grid-cols-2 gap-1.5 overflow-y-auto pr-0.5" data-testid="claim-lines">
              {data.lines.length === 0 && (
                <div className="col-span-2 py-5 text-sm font-bold text-[var(--dim)]">Nothing but good vibes.</div>
              )}
              {data.lines.map((l, i) => (
                <div
                  key={`${l.kind}-${l.id ?? i}`}
                  className="claim-tile relative flex items-center gap-2 overflow-hidden rounded-lg border bg-black/50 px-2 py-1.5"
                  style={{ borderColor: l.color + "66", animationDelay: `${i * 65}ms` }}
                  title={l.label}
                >
                  <span
                    className="claim-line-icon grid h-8 w-8 shrink-0 place-items-center rounded-md"
                    style={{ background: l.color + "22", border: `1px solid ${l.color}55` }}
                  >
                    <RewardIcon line={l} size={20} />
                  </span>
                  <span className="min-w-0 flex-1 text-left leading-tight">
                    <span className="block truncate text-[10.5px] font-bold uppercase tracking-wide text-[var(--dim)]">{l.label}</span>
                    <span className="font-disp block text-[17px] leading-none" style={{ color: l.color }}>
                      {l.n.toLocaleString()}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btn btn-gold mt-1.5 w-full py-2.5 text-base" data-testid="claim-collect" disabled={opening} onClick={onClose}>
          {opening ? "Opening…" : "Collect"}
        </button>
      </div>
      </div>
    </ViewportPortal>
  );
}

// ---------- upgrade ceremony ----------

export interface UpgradeData {
  /** what levelled up */
  title: string;
  kind: "tower" | "hero";
  /** the thing's art */
  tower?: TowerDef;
  heroKind?: string;
  color: string;
  fromLv: number;
  toLv: number;
  /** stat deltas to roll in under the level flip */
  stats?: { label: string; from: string; to: string }[];
  /** extra caption, e.g. "MAX LEVEL" */
  note?: string;
}

/**
 * The upgrade flourish: a light burst, a ring of rays, flying chips, the level
 * counter physically flipping from the old number to the new one, and the
 * changed stats rolling in underneath. Shown whenever a tower or hero gains a
 * level from the menus.
 */
export function UpgradeCeremony({ data, onClose }: { data: UpgradeData; onClose: () => void }) {
  const rays = useMemo(() => Array.from({ length: 14 }, (_, i) => i), []);
  const chips = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 90 + Math.random() * 150;
        return {
          id: i,
          dx: Math.cos(a) * dist,
          dy: Math.sin(a) * dist - 30,
          rot: `${Math.round((Math.random() - 0.5) * 720)}deg`,
          size: 4 + Math.random() * 8,
          color: [data.color, "#ffffff", "#ffcf4d", "#35e0ff"][i % 4],
          round: i % 3 === 0,
          delay: Math.random() * 0.25,
        };
      }),
    [data.color]
  );

  // the ceremony is short and self-dismissing, but any input closes it early
  useEffect(() => {
    const t = setTimeout(onClose, 2100);
    const h = () => onClose();
    window.addEventListener("keydown", h);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", h);
    };
  }, [onClose]);

  return (
    <ViewportPortal>
      <div className="upg-root fixed inset-0 z-[95] flex items-center justify-center p-4" data-testid="upgrade-ceremony" onPointerDown={onClose}>
      <div className="relative flex flex-col items-center" onPointerDown={(e) => e.stopPropagation()}>
        {/* rays + burst rings behind the art */}
        <div className="relative grid place-items-center" style={{ width: 240, height: 240 }}>
          <span className="upg-burst" style={{ borderColor: data.color }} />
          <span className="upg-burst" style={{ borderColor: "#ffffff", animationDelay: "0.14s" }} />
          <span className="upg-burst" style={{ borderColor: data.color, animationDelay: "0.28s" }} />
          {rays.map((i) => (
            <span
              key={i}
              className="upg-ray"
              style={{
                background: `linear-gradient(to top, ${data.color}, transparent)`,
                transform: `translate(-50%, -100%) rotate(${(i / rays.length) * 360}deg)`,
                transformOrigin: "50% 100%",
                animationDelay: `${i * 0.012}s`,
              }}
            />
          ))}
          {chips.map((c) => (
            <span
              key={c.id}
              className="upg-chip"
              style={
                {
                  width: c.size,
                  height: c.size,
                  background: c.color,
                  borderRadius: c.round ? "50%" : 2,
                  animationDelay: `${c.delay}s`,
                  "--dx": `${c.dx}px`,
                  "--dy": `${c.dy}px`,
                  "--rot": c.rot,
                } as React.CSSProperties
              }
            />
          ))}
          <div className="upg-core relative grid place-items-center">
            {data.tower ? (
              <TowerIcon def={data.tower} size={118} />
            ) : (
              <HeroIcon kind={(data.heroKind as never) || "nuke"} size={118} color={data.color} />
            )}
          </div>
        </div>

        <div className="font-disp -mt-3 text-center text-[28px] leading-none" style={{ color: data.color, textShadow: `0 0 26px ${data.color}` }}>
          {data.title}
        </div>
        <div className="mt-0.5 text-[11px] font-bold tracking-[0.4em] text-[var(--dim)]">
          {data.note || "LEVEL UP"}
        </div>

        {/* the level counter flipping over */}
        <div className="relative mt-2 flex items-center gap-3" style={{ perspective: 600 }}>
          <span className="upg-oldlv font-disp absolute left-0 right-0 text-center text-[42px] leading-none text-[var(--dim)]">
            {data.fromLv}
          </span>
          <span
            className="upg-newlv font-disp text-[52px] leading-none"
            data-testid="upgrade-level"
            style={{ color: data.color, textShadow: `0 0 30px ${data.color}` }}
          >
            {data.toLv}
          </span>
        </div>

        {/* stat deltas */}
        {!!data.stats?.length && (
          <div className="mt-3 w-[260px] space-y-1">
            {data.stats.map((st, i) => (
              <div
                key={st.label}
                className="upg-statrow flex items-center justify-between rounded-lg border border-[var(--line)] bg-black/55 px-3 py-1.5"
                style={{ animationDelay: `${0.45 + i * 0.1}s` }}
              >
                <span className="text-[11.5px] font-bold text-[var(--dim)]">{st.label}</span>
                <span className="flex items-center gap-1.5 text-[12.5px] font-bold">
                  <span className="text-[var(--dim)] line-through opacity-70">{st.from}</span>
                  <span style={{ color: data.color }}>→</span>
                  <span className="upg-delta" style={{ color: "#3dff8e", animationDelay: `${0.6 + i * 0.1}s` }}>
                    {st.to}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </ViewportPortal>
  );
}
