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
