import { beforeEach, describe, expect, it } from "vitest";
import { softCeiling } from "../game/sfxSamples";
import { clampZoom, defaultSave, importSave, ZOOM_MAX, ZOOM_MIN } from "../game/save";

beforeEach(() => {
  localStorage.clear();
});

describe("master bus ceiling (distortion fix)", () => {
  it("is a straight wire for normal levels, so the mix gets no extra harmonics", () => {
    for (let x = -0.8; x <= 0.8; x += 0.05) {
      expect(softCeiling(x)).toBeCloseTo(x, 10);
    }
  });

  it("never lets the bus exceed full scale, however hard the layers stack", () => {
    for (let x = -6; x <= 6; x += 0.01) {
      const y = softCeiling(x);
      expect(Math.abs(y)).toBeLessThanOrEqual(1);
      // rounds the overs but never flips them
      expect(Math.sign(y)).toBe(Math.sign(x) || 0);
    }
  });

  it("is monotonic and odd-symmetric", () => {
    let prev = -Infinity;
    for (let x = -3; x <= 3; x += 0.02) {
      const y = softCeiling(x);
      expect(y).toBeGreaterThanOrEqual(prev);
      prev = y;
      expect(softCeiling(-x)).toBeCloseTo(-y, 10);
    }
  });
});

describe("zoom default fills the screen", () => {
  it("starts at 100% (the full-screen cover fit), not an extra 110%", () => {
    expect(defaultSave().zoom).toBe(1);
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(ZOOM_MIN).toBeLessThan(1);
    expect(ZOOM_MAX).toBeGreaterThan(1);
  });
});

describe("guild removal", () => {
  it("drops the stale guild block from an older save without breaking the load", () => {
    const old = { ...defaultSave(), guild: { id: "vanguard", xp: 900, coins: 40 } };
    const s = importSave(JSON.stringify(old));
    expect((s as unknown as { guild?: unknown }).guild).toBeUndefined();
    expect(s.gold).toBeDefined();
  });
});

// ---------- round 6 ----------
import { classifyBgFile, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "../game/mediaBg";
import { lookupMoreRow, MORE_LANGUAGES, RTL_LANGUAGES } from "../game/i18nMore";
import { lookupInterface } from "../game/i18nTable";
import { LANGUAGES } from "../game/i18nExtras";
import { FONTS } from "../game/fonts";
import { DAILY_TASKS } from "../game/data";
import { TOWER_BY_ID } from "../game/data";

describe("background media upload", () => {
  it("accepts photos and videos and reports their kind", () => {
    expect(classifyBgFile({ type: "image/png", size: 1000 })).toEqual({ kind: "image" });
    expect(classifyBgFile({ type: "video/mp4", size: 1000 })).toEqual({ kind: "video" });
  });

  it("rejects other file types and oversized files with a message", () => {
    expect("error" in classifyBgFile({ type: "text/plain", size: 10 })).toBe(true);
    expect("error" in classifyBgFile({ type: "image/jpeg", size: MAX_IMAGE_BYTES + 1 })).toBe(true);
    expect("error" in classifyBgFile({ type: "video/webm", size: MAX_VIDEO_BYTES + 1 })).toBe(true);
    expect(classifyBgFile({ type: "video/webm", size: MAX_VIDEO_BYTES })).toEqual({ kind: "video" });
  });
});

describe("ten more interface languages", () => {
  it("ships Arabic, Turkish, Polish, Hindi, Dutch, Bangla, Punjabi, Vietnamese, Khmer and Isan", () => {
    expect(MORE_LANGUAGES).toEqual(["ar", "tr", "pl", "hi", "nl", "bn", "pa", "vi", "km", "isan"]);
    const ids = LANGUAGES.map((l) => l.id);
    for (const id of MORE_LANGUAGES) expect(ids).toContain(id);
    expect(LANGUAGES).toHaveLength(23);
  });

  it("translates the shell and falls back to English for unlisted strings", () => {
    expect(lookupMoreRow("Settings", "tr")).toBe("Ayarlar");
    expect(lookupMoreRow("Settings", "ar")).toBe("الإعدادات");
    expect(lookupMoreRow("Not a real key", "pl")).toBeUndefined();
    expect(lookupInterface("Home", "ar")).toBe("الرئيسية");
  });

  it("marks Arabic right-to-left", () => {
    expect(RTL_LANGUAGES).toEqual(["ar"]);
  });
});

describe("new font faces", () => {
  it("adds script faces for the new languages, all with unique ids", () => {
    const ids = FONTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ["noto-arabic", "cairo", "noto-devanagari", "noto-bengali", "noto-gurmukhi", "noto-khmer", "sarabun", "be-vietnam"]) {
      expect(ids).toContain(id);
    }
  });
});

describe("God of Zeus Cloud Annihilation", () => {
  it("replaces the lightning ball with clouds that keep the merge trigger", () => {
    const z = TOWER_BY_ID.godzeus;
    expect(z.awk1?.name).toBe("Cloud Annihilation");
    expect(z.awk1?.desc).toMatch(/cloud/i);
    expect(z.awk1?.desc).toMatch(/0\.02.*0\.05s/);
    expect(z.awk1?.desc).toMatch(/2\.5s per tier/);
    expect(z.awk1?.desc).not.toMatch(/900,000|ball/i);
  });

  it("keeps the daily task list intact", () => {
    expect(DAILY_TASKS.length).toBeGreaterThan(0);
  });
});
