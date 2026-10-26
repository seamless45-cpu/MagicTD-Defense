import { useEffect, useState } from "react";
import { getRecorderState, stopRecording, subscribeRecorder, type RecorderState } from "../game/recorder";

/** live recorder state for any component */
export function useRecorder(): RecorderState {
  const [s, setS] = useState<RecorderState>(getRecorderState);
  useEffect(() => subscribeRecorder(setS), []);
  return s;
}

/** a small REC pill with elapsed time and a stop button, shown while recording */
export function RecordingPill() {
  const rec = useRecorder();
  const [, tick] = useState(0);
  useEffect(() => {
    if (!rec.recording) return;
    const id = window.setInterval(() => tick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, [rec.recording]);
  if (!rec.recording) return null;
  const secs = Math.max(0, Math.floor((Date.now() - rec.startedAt) / 1000));
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return (
    <div
      data-testid="recording-pill"
      role="status"
      className="fixed bottom-3 left-3 z-[9000] flex items-center gap-2 rounded-full border border-[#ff315c88] bg-black/80 px-3 py-1.5 text-[11px] font-bold text-white shadow-[0_0_18px_#ff315c55]"
    >
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#ff315c]" aria-hidden="true" />
      <span>REC {mm}:{ss}</span>
      <span className="text-[10px] font-semibold text-[var(--dim)]">{rec.source === "canvas" ? "battle canvas" : "screen"}</span>
      <button className="btn px-2 py-0.5 text-[10px]" aria-label="Stop recording" onClick={() => stopRecording()}>
        STOP & SAVE
      </button>
    </div>
  );
}
