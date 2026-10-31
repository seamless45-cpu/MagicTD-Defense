/**
 * BACKGROUND MEDIA
 *
 * The player can put their own photo or video behind the game. The file is
 * kept in IndexedDB (a video is far too large for localStorage), so it never
 * leaves the device. Photos and videos are both accepted. Videos are always
 * played muted: the page never plays their sound.
 */

export type BgKind = "image" | "video";

export interface BgRecord {
  blob: Blob;
  kind: BgKind;
  name: string;
}

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

const DB_NAME = "magictd-media";
const STORE = "bg";
const KEY = "background";

/** checks a picked file: returns its kind, or an error message for the player */
export function classifyBgFile(file: { type: string; size: number }): { kind: BgKind } | { error: string } {
  const type = file.type || "";
  if (type.startsWith("image/")) {
    if (file.size > MAX_IMAGE_BYTES) return { error: "Photos must be 25 MB or smaller" };
    return { kind: "image" };
  }
  if (type.startsWith("video/")) {
    if (file.size > MAX_VIDEO_BYTES) return { error: "Videos must be 200 MB or smaller" };
    return { kind: "video" };
  }
  return { error: "Choose a photo or a video file" };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("no storage"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = op(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((fn) => fn());
}
export function subscribeBackground(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export async function saveBackground(file: File): Promise<BgRecord> {
  const verdict = classifyBgFile(file);
  if ("error" in verdict) throw new Error(verdict.error);
  const record: BgRecord = { blob: file, kind: verdict.kind, name: file.name };
  await run("readwrite", (store) => store.put(record, KEY));
  notify();
  return record;
}

export async function loadBackground(): Promise<BgRecord | null> {
  try {
    const rec = await run<BgRecord | undefined>("readonly", (store) => store.get(KEY));
    return rec ?? null;
  } catch {
    return null;
  }
}

export async function clearBackground(): Promise<void> {
  try {
    await run("readwrite", (store) => store.delete(KEY));
  } catch {
    // nothing stored, or storage is unavailable: either way there is nothing to clear
  }
  notify();
}
