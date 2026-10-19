export interface MusicSettings {
  volume: number;
  start: number;
  end: number;
  rate: number;
}

export interface MusicSnapshot {
  hasTrack: boolean;
  name: string;
  duration: number;
  currentTime: number;
  playing: boolean;
}

const DB_NAME = "magictd-personal-music";
const STORE = "tracks";
const KEY = "loop-track";
let audio: HTMLAudioElement | null = null;
let objectUrl = "";
let fileName = "";
let duration = 0;
let listeners = new Set<(state: MusicSnapshot) => void>();
let settings: MusicSettings = { volume: 0.5, start: 0, end: 0, rate: 1 };
let dbPromise: Promise<IDBDatabase | null> | null = null;
let loaded = false;

function snapshot(): MusicSnapshot {
  return { hasTrack: !!audio?.src, name: fileName, duration, currentTime: audio?.currentTime || 0, playing: !!audio && !audio.paused };
}
function emit() {
  const state = snapshot();
  listeners.forEach((fn) => fn(state));
}
export function subscribeMusic(fn: (state: MusicSnapshot) => void) {
  listeners.add(fn);
  fn(snapshot());
  return () => { listeners.delete(fn); };
}
export function getMusicSnapshot() { return snapshot(); }

function database(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

function applySettings() {
  if (!audio) return;
  audio.volume = Math.max(0, Math.min(1, settings.volume));
  audio.playbackRate = Math.max(0.5, Math.min(2, settings.rate));
  // Browser defaults preservePitch=true; explicitly turn it off so speed changes
  // also shift pitch as requested by the player.
  (audio as HTMLAudioElement & { preservesPitch?: boolean; mozPreservesPitch?: boolean; webkitPreservesPitch?: boolean }).preservesPitch = false;
  (audio as HTMLAudioElement & { mozPreservesPitch?: boolean }).mozPreservesPitch = false;
  (audio as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = false;
}

function ensureAudio() {
  if (audio || typeof Audio === "undefined") return;
  audio = new Audio();
  audio.preload = "metadata";
  audio.addEventListener("loadedmetadata", () => {
    duration = Number.isFinite(audio?.duration) ? audio!.duration : 0;
    if (settings.end <= 0 || settings.end > duration) settings.end = duration;
    applySettings();
    emit();
  });
  audio.addEventListener("timeupdate", () => {
    if (!audio || settings.end <= settings.start || settings.end <= 0) return;
    if (audio.currentTime >= settings.end) {
      audio.currentTime = Math.min(settings.start, Math.max(0, duration - 0.05));
      if (!audio.paused) void audio.play().catch(() => {});
    }
    emit();
  });
  audio.addEventListener("play", emit);
  audio.addEventListener("pause", emit);
  audio.addEventListener("ended", () => {
    if (!audio) return;
    audio.currentTime = settings.start;
    void audio.play().catch(() => {});
  });
  applySettings();
}

export function setMusicSettings(next: Partial<MusicSettings>) {
  settings = {
    volume: Math.max(0, Math.min(1, next.volume ?? settings.volume)),
    start: Math.max(0, next.start ?? settings.start),
    end: Math.max(0, next.end ?? settings.end),
    rate: Math.round(Math.max(0.5, Math.min(2, next.rate ?? settings.rate)) * 10) / 10,
  };
  if (duration > 0) {
    settings.start = Math.min(settings.start, Math.max(0, duration - 0.1));
    settings.end = Math.min(duration, Math.max(settings.start + 0.1, settings.end || duration));
  }
  applySettings();
  emit();
}

async function useBlob(blob: Blob, name: string) {
  ensureAudio();
  if (!audio) return;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(blob);
  fileName = name;
  duration = 0;
  audio.pause();
  audio.src = objectUrl;
  audio.load();
  applySettings();
  emit();
}

export async function loadSavedMusic() {
  if (loaded) return;
  loaded = true;
  const db = await database();
  if (!db) return;
  const item = await new Promise<{ blob: Blob; name: string } | undefined>((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result as { blob: Blob; name: string } | undefined);
    req.onerror = () => resolve(undefined);
  });
  if (item?.blob) await useBlob(item.blob, item.name || "Music track");
}

export async function uploadMusic(file: File) {
  await useBlob(file, file.name);
  const db = await database();
  if (db) {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ blob: file, name: file.name }, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  }
  return snapshot();
}

export async function clearMusic() {
  audio?.pause();
  if (audio) audio.removeAttribute("src");
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = "";
  fileName = "";
  duration = 0;
  settings = { ...settings, start: 0, end: 0 };
  const db = await database();
  if (db) await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
  emit();
}

export async function toggleMusic() {
  await loadSavedMusic();
  ensureAudio();
  if (!audio?.src) return false;
  if (audio.paused) {
    if (audio.currentTime < settings.start || (settings.end > 0 && audio.currentTime >= settings.end)) audio.currentTime = settings.start;
    try { await audio.play(); return true; } catch { return false; }
  }
  audio.pause();
  return true;
}
