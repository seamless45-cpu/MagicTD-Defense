import { useCallback, useEffect, useRef, useState } from "react";
import type { TowerDef } from "../game/data";
import { RARITY } from "../game/data";

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

export function CurrencyBar({
  gold,
  gems,
  tokens,
}: {
  gold: number;
  gems: number;
  tokens: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="chip text-[15px] text-[#ffcf4d]">
        <CoinIcon />
        <span>{Math.floor(gold).toLocaleString()}</span>
      </div>
      <div className="chip text-[15px] text-[#35e0ff]">
        <GemIcon />
        <span>{Math.floor(gems).toLocaleString()}</span>
      </div>
      <div className="chip text-[15px] text-[#ff4fd8]">
        <TokenIcon />
        <span>{Math.floor(tokens).toLocaleString()}</span>
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
      {inner(def.id)}
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
