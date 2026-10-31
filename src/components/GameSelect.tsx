import { useEffect, useRef, useState } from "react";
import { sfx } from "../game/audio";

export interface GameSelectOption {
  value: string;
  label: string;
}

/**
 * In-game option picker — the replacement for native <select> popups. The
 * trigger and option list are plain game UI: both animate in AND out
 * (scale + fade), the list closes on outside click or Escape, and the
 * browser's own chooser chrome never appears.
 */
export function GameSelect({
  value,
  options,
  onChange,
  ariaLabel,
  testId,
  title,
  className = "",
  triggerClassName = "",
}: {
  value: string;
  options: GameSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  testId?: string;
  title?: string;
  className?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);
  const selected = options.find((o) => o.value === value) ?? options[0];

  const close = () => {
    if (closeTimer.current) return;
    setShown(false);
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setOpen(false);
    }, 150);
  };

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => setShown(true));
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    []
  );

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        data-testid={testId}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={title}
        className={triggerClassName}
        onClick={() => {
          if (open && shown) {
            close();
            return;
          }
          if (open && closeTimer.current) {
            // mid-close: cancel the exit and swing back open
            window.clearTimeout(closeTimer.current);
            closeTimer.current = null;
            setShown(true);
            return;
          }
          sfx.uiTab();
          setOpen(true);
        }}
      >
        {selected?.label ?? value}
        <span className={`ml-1.5 inline-block text-[9px] transition-transform duration-150 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && (
        <div
          role="listbox"
          data-testid={testId ? `${testId}-options` : undefined}
          aria-label={ariaLabel}
          className={`absolute right-0 z-40 mt-1 min-w-full origin-top overflow-auto rounded-lg border border-[var(--line)] bg-[#101329] p-1 shadow-[0_12px_32px_rgba(0,0,0,.65)] transition duration-150 ${
            shown ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
          style={{ maxHeight: "16rem" }}
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={active}
                className={`block w-full rounded-md px-3 py-1.5 text-left text-xs font-bold transition-colors ${
                  active ? "bg-[#8ceaff22] text-[#8ceaff]" : "text-[#d7ccff] hover:bg-white/10"
                }`}
                onClick={() => {
                  sfx.click();
                  onChange(o.value);
                  close();
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
