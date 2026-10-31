import { useEffect, useRef, useState } from "react";
import { clearBackground, loadBackground, saveBackground, subscribeBackground, type BgKind } from "../game/mediaBg";
import type { SaveData } from "../game/save";

interface Current {
  url: string;
  kind: BgKind;
  name: string;
}

/** loads the stored background as an object URL and keeps it in step with uploads */
function useStoredBackground(): Current | null {
  const [current, setCurrent] = useState<Current | null>(null);
  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    const refresh = async () => {
      const rec = await loadBackground();
      if (!alive) return;
      if (url) URL.revokeObjectURL(url);
      url = rec ? URL.createObjectURL(rec.blob) : null;
      setCurrent(rec && url ? { url, kind: rec.kind, name: rec.name } : null);
    };
    void refresh();
    const off = subscribeBackground(() => void refresh());
    return () => {
      alive = false;
      off();
      if (url) URL.revokeObjectURL(url);
    };
  }, []);
  return current;
}

/**
 * The full-screen layer behind the whole app. It only exists while a background
 * is set, and the page's own gradient steps aside for it (see `:has(.media-bg)`
 * in index.css). Videos are muted, always.
 */
export function MediaBackground({ dim, paused }: { dim: number; paused: boolean }) {
  const bg = useStoredBackground();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    v.volume = 0;
    if (paused) v.pause();
    else void v.play().catch(() => undefined);
  }, [bg, paused]);
  if (!bg) return null;
  return (
    <div className="media-bg" aria-hidden="true" data-testid="media-bg">
      {bg.kind === "video" ? (
        <video ref={videoRef} src={bg.url} muted loop playsInline autoPlay preload="auto" />
      ) : (
        <img src={bg.url} alt="" draggable={false} />
      )}
      <div className="media-bg-dim" style={{ background: `rgba(2, 1, 8, ${Math.max(0, Math.min(0.9, dim))})` }} />
    </div>
  );
}

/** Settings row: upload a photo or video, darken it, or remove it */
export function BackgroundMediaRow({ save, mutate }: { save: SaveData; mutate: (fn: (s: SaveData) => void) => void }) {
  const bg = useStoredBackground();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      await saveBackground(file);
    } catch (err) {
      setError((err as Error).message || "Could not save that file");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="row-card mt-1.5" data-testid="media-bg-row">
      <div className="min-w-0 flex-1">
        <div className="font-bold">Background media</div>
        <div className="text-xs font-semibold text-[var(--dim)]">
          Put your own photo or video behind the game. Videos always play silently. Files stay on this device.
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="btn cursor-pointer px-3 py-1.5 text-xs">
            {busy ? "SAVING…" : "UPLOAD PHOTO / VIDEO"}
            <input
              type="file"
              accept="image/*,video/*"
              className="sr-only"
              data-testid="media-bg-input"
              aria-label="Upload background photo or video"
              disabled={busy}
              onChange={(e) => {
                void pick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {bg && (
            <button className="btn px-3 py-1.5 text-xs" data-testid="media-bg-clear" onClick={() => void clearBackground()}>
              REMOVE
            </button>
          )}
          {bg && <span className="max-w-[160px] truncate text-[11px] font-semibold text-[var(--dim)]">{bg.name}</span>}
        </div>
        {bg && (
          <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-[var(--dim)]">
            Darken
            <input
              type="range"
              className="orb-range w-40"
              min={0}
              max={90}
              value={Math.round(save.bgDim * 100)}
              aria-label="Background darkness"
              data-testid="media-bg-dim"
              onChange={(e) => {
                const v = Number(e.target.value) / 100;
                mutate((s) => {
                  s.bgDim = v;
                });
              }}
            />
            <span className="w-10 text-right font-bold text-[var(--txt)]">{Math.round(save.bgDim * 100)}%</span>
          </label>
        )}
        {error && <div className="mt-1 text-[11px] font-bold text-[#ff8f9a]" data-testid="media-bg-error">{error}</div>}
      </div>
    </div>
  );
}
