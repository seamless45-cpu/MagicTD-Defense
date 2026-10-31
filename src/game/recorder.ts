/**
 * SCREEN RECORDING
 *
 * Records the player's screen (or tab) with the browser's screen-capture
 * prompt, then saves a single file when stopped. Where the browser cannot
 * capture the screen at all, it falls back to the live battle canvas, which
 * keeps the playfield, its effects and bloom but not the menus.
 *
 * Output is WebM (VP9/VP8 + Opus) where the browser supports it, otherwise
 * MP4 (Safari). Nothing is uploaded: the file is offered as a download.
 */

export type RecordSource = "screen" | "canvas";

export interface RecorderState {
  recording: boolean;
  startedAt: number;
  source: RecordSource | null;
  /** last problem, shown in Settings; empty when fine */
  error: string;
}

let state: RecorderState = { recording: false, startedAt: 0, source: null, error: "" };
let recorder: MediaRecorder | null = null;
let stream: MediaStream | null = null;
let chunks: Blob[] = [];
const listeners = new Set<(s: RecorderState) => void>();

function publish(next: Partial<RecorderState>) {
  state = { ...state, ...next };
  listeners.forEach((fn) => fn(state));
}

export function getRecorderState(): RecorderState {
  return state;
}

export function subscribeRecorder(fn: (s: RecorderState) => void): () => void {
  listeners.add(fn);
  fn(state);
  return () => {
    listeners.delete(fn);
  };
}

/** container chosen from what this browser can encode */
export function recordingMime(): string {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";
  const options = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return options.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

function extFor(mime: string): string {
  return mime.startsWith("video/mp4") ? "mp4" : "webm";
}

function pickSource(): MediaStream | null {
  // the live battle canvas: the first canvas on the page while a battle is up
  const canvas = document.querySelector("canvas");
  if (!canvas || typeof canvas.captureStream !== "function") return null;
  return canvas.captureStream(60);
}

/** true when the game runs inside another page's frame (preview hosts, embeds) */
function inFrame(): boolean {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}

/** asks the browser for the screen, retrying video-only when audio capture is what failed */
async function requestScreen(): Promise<MediaStream> {
  const md = navigator.mediaDevices;
  if (!md || typeof md.getDisplayMedia !== "function") throw Object.assign(new Error("no display capture"), { name: "NotSupportedError" });
  try {
    return await md.getDisplayMedia({ video: { frameRate: 60 }, audio: true });
  } catch (err) {
    const name = (err as { name?: string })?.name ?? "";
    // only retry when the player did not refuse: a refusal stays a refusal
    if (name === "NotAllowedError" || name === "AbortError") throw err;
    return md.getDisplayMedia({ video: { frameRate: 60 }, audio: false });
  }
}

/** Starts a recording. Returns false (with `error` set) when it could not start. */
export async function startRecording(): Promise<boolean> {
  if (recorder) return true;
  if (typeof MediaRecorder === "undefined") {
    publish({ error: "This browser cannot record video" });
    return false;
  }
  let source: RecordSource = "screen";
  try {
    stream = await requestScreen();
  } catch (err) {
    const name = (err as { name?: string })?.name ?? "";
    if (name === "NotAllowedError" || name === "AbortError") {
      publish({
        error: inFrame()
          ? "Screen capture is blocked inside this embedded preview. Open the game in its own browser tab to record."
          : "Screen capture was cancelled or blocked by the browser. Allow it and try again.",
      });
      return false;
    }
    // no screen capture on this device: record the battle canvas instead, if one is up
    stream = pickSource();
    source = "canvas";
    if (!stream) {
      publish({
        error: name === "NotSupportedError"
          ? "This device cannot share its screen. Start a battle to record the battlefield."
          : "Start a battle to record. Menus can only be recorded where the screen can be shared.",
      });
      return false;
    }
  }

  const mime = recordingMime();
  try {
    recorder = new MediaRecorder(stream!, mime ? { mimeType: mime, videoBitsPerSecond: 8_000_000 } : undefined);
  } catch {
    stopTracks();
    publish({ error: "Could not start the recorder" });
    return false;
  }
  chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  recorder.onstop = () => saveRecording(mime);
  // the browser's own "stop sharing" button ends the capture: finish cleanly
  stream!.getVideoTracks().forEach((t) => t.addEventListener("ended", () => stopRecording()));
  recorder.start(1000);
  publish({ recording: true, startedAt: Date.now(), source, error: "" });
  return true;
}

function stopTracks() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}

function saveRecording(mime: string) {
  const type = mime || "video/webm";
  const blob = new Blob(chunks, { type });
  chunks = [];
  recorder = null;
  stopTracks();
  publish({ recording: false, startedAt: 0, source: null });
  if (blob.size === 0) {
    publish({ error: "Nothing was recorded" });
    return;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `magictd-recording-${stamp}.${extFor(type)}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15_000);
}

/** Stops the recording and downloads the file. */
export function stopRecording() {
  if (!recorder) return;
  if (recorder.state !== "inactive") recorder.stop();
}
