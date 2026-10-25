import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import App from "../App";
import Battle from "../screens/Battle";
import { canvasStats, consoleErrors } from "./setup";
import { defaultSave, persistSave, todayStr, type SaveData } from "../game/save";
import { upgradeGoldCost, monthlyEventBonus, monthlyEventForDate, TOWERS } from "../game/data";

// ---------- tiny helpers (no testing-library dependency) ----------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor<T>(fn: () => T | null | undefined | false, label: string, timeout = 12000): Promise<T> {
  const t0 = Date.now();
  for (;;) {
    const v = fn();
    if (v) return v as T;
    if (Date.now() - t0 > timeout) throw new Error(`Timed out waiting for: ${label}`);
    await sleep(40);
  }
}

const all = (sel: string) => Array.from(document.querySelectorAll<HTMLElement>(sel));
const byText = <T extends HTMLElement = HTMLElement>(sel: string, text: string) =>
  all(sel).find((el) => (el.textContent || "").includes(text)) as T | undefined;

const click = (el: HTMLElement) => el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

function pointer(type: string, target: EventTarget, x = 0, y = 0) {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }));
}

/**
 * Tap a tower-grid cell. The grid opens the tower sheet from a pointerup that
 * never moved, so a plain `click` would not trigger it.
 */
function tapCell(id: string) {
  const cell = document.querySelector(`[data-tower="${id}"]`) as HTMLElement;
  if (!cell) throw new Error(`tower cell ${id} not found`);
  pointer("pointerdown", cell, 200, 300);
  pointer("pointerup", window, 200, 300);
  return cell;
}

function saved(): SaveData {
  return { ...defaultSave(), ...(JSON.parse(localStorage.getItem("magictd_save_v1") || "{}") as SaveData) };
}
const fragTotal = (s: SaveData) => Object.values(s.frags || {}).reduce((a, b) => a + b, 0);

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function mountRaw() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  // main.tsx renders inside StrictMode — mirror that so double-mounted effects are exercised
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

async function mountApp() {
  mountRaw();
  await waitFor(() => byText("div", "Command Center"), "home screen (loading screen finished)");
}

/** click the DEPLOY button on one of the home mode cards */
function startMode(title: string) {
  const card = all("button").find((b) => (b.textContent || "").includes(title) && (b.textContent || "").includes("DEPLOY"));
  if (!card) throw new Error(`mode card not found: ${title}`);
  click(card);
}

function unmountApp() {
  root?.unmount();
  root = null;
  host?.remove();
  host = null;
}

const noErrors = () => {
  const real = consoleErrors.filter((e) => !/not wrapped in act|Warning: ReactDOM/.test(e));
  expect(real, `unexpected console errors:\n${real.join("\n")}`).toHaveLength(0);
};

beforeEach(() => {
  localStorage.clear();
  persistSave(defaultSave()); // the app only writes on first mutation
  consoleErrors.length = 0;
  canvasStats.calls = 0;
  canvasStats.texts = 0;
});

afterEach(() => {
  unmountApp();
});

describe("MagicTD app shell", () => {
  it("boots from the loading screen and navigates every tab", async () => {
    await mountApp();
    expect(document.body.textContent).toContain("Command Center");
    expect(byText("button", "Battle")).toBeTruthy();
    expect(byText("button", "Endless")).toBeTruthy();
    // party mode was retired
    expect(byText("button", "Party")).toBeUndefined();

    click(byText("button", "Shop")!);
    await waitFor(() => byText("div", "CHESTS"), "shop screen");
    expect(document.body.textContent).toContain("Common Chest");

    click(byText("button", "Towers")!);
    await waitFor(() => byText("div", "SUMMON ROTATION"), "tower screen");
    expect(document.body.textContent).toContain("Ascent All");

    click(byText("button", "Specials")!);
    // Specials opens on the daily tasks tab
    await waitFor(() => document.querySelector('[data-testid="daily-tasks"]'), "tasks tab");
    expect(document.body.textContent).toContain("DAILY TASKS");
    click(document.querySelector('[data-testid="tab-events"]') as HTMLElement);
    await waitFor(() => byText("div", "WEEKLY ROTATION"), "specials screen");
    // the weekday event rotation is listed in full
    ["Luck Hunting", "Chest Box", "Trophy Competition", "Items Finding", "Mineshaft", "Gem Rush"].forEach((n) =>
      expect(document.body.textContent).toContain(n)
    );
    // and the competition tab shows the trophy ladder
    click(document.querySelector('[data-testid="tab-competition"]') as HTMLElement);
    await waitFor(() => document.querySelector('[data-testid="ladder"]'), "competition ladder");
    expect(document.body.textContent).toContain("STANDINGS");

    click(byText("button", "Guild")!);
    await waitFor(() => byText("div", "Guild Hall"), "guild screen");

    click(byText("button", "Mail")!);
    await waitFor(() => byText("div", "MAILBOX"), "mail screen");
    expect(document.body.textContent).toContain("Welcome to the Watch");

    click(byText("button", "Season")!);
    await waitFor(() => byText("div", "RIFT SEASON"), "season screen");
    expect(document.body.textContent).toContain("Scout");

    click(byText("button", "Home")!);
    await waitFor(() => byText("div", "Command Center"), "home screen again");

    noErrors();
  });

  it("opens settings and persists the toggles", async () => {
    await mountApp();
    click(document.querySelector('[aria-label="Settings"]') as HTMLElement);
    await waitFor(() => byText("div", "Settings"), "settings modal");

    const language = document.querySelector('[data-testid="language-select"]') as HTMLSelectElement;
    const setLanguage = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!;
    setLanguage.call(language, "th");
    language.dispatchEvent(new Event("change", { bubbles: true }));
    await waitFor(() => saved().language === "th", "Thai language saved");
    expect(document.documentElement.lang).toBe("th");
    click(document.querySelector('[data-testid="toggle-style-fluorescent"]') as HTMLElement);
    await waitFor(() => saved().toggleStyle === "fluorescent", "fluorescent switch style saved");
    const englishSelect = document.querySelector('[data-testid="language-select"]') as HTMLSelectElement;
    setLanguage.call(englishSelect, "en");
    englishSelect.dispatchEvent(new Event("change", { bubbles: true }));
    await waitFor(() => saved().language === "en", "English language restored");

    expect(saved().sfx).not.toBe(false);
    click(document.querySelector('[data-testid="toggle-sfx"]') as HTMLElement);
    await waitFor(() => saved().sfx === false, "sfx toggle persisted");

    click(byText("button", "Close")!);
    await waitFor(() => !byText("div", "Reset Progress"), "settings closed");
    noErrors();
  });
});

describe("Boot sequence", () => {
  it("plays the launch intro, then the loading car, then the game", async () => {
    mountRaw();

    // 1. the cold open: logo + animated title over pure black
    const intro = await waitFor(() => document.querySelector('[data-testid="launch-intro"]'), "launch intro");
    expect(intro.textContent).toContain("MAGICTD");
    expect(intro.textContent).toContain("DEFENSE");
    expect(document.querySelectorAll(".boot-letter").length).toBe("MAGICTD".length);
    expect(document.querySelector(".bt-core")).toBeTruthy();

    // 2. the loading screen: logo + title on top, one car on a track below
    await waitFor(() => document.querySelector('[data-testid="loading-screen"]'), "loading screen");
    expect(document.querySelector(".ld-emblem")).toBeTruthy();
    expect(document.body.textContent).toContain("MagicTD");
    expect(document.body.textContent).toContain("DEFENSE");
    expect(document.querySelector('[data-testid="loading-car"]'), "loading car").toBeTruthy();
    expect(document.querySelector('[data-testid="loading-car"]')!.querySelectorAll("span").length).toBeGreaterThan(4);
    // only one car, and no leftover checklist / skip button clutter
    expect(document.querySelectorAll('[data-testid="loading-car"]')).toHaveLength(1);
    expect(document.querySelectorAll(".load-step")).toHaveLength(0);
    expect(document.querySelectorAll(".load-seg")).toHaveLength(0);
    expect(byText("button", "SKIP")).toBeUndefined();
    expect(document.body.textContent).toContain("TIP");

    // the car drives as the track fills
    const bar = document.querySelector("[role=progressbar]")!;
    const pct = () => Number(bar.getAttribute("aria-valuenow"));
    await waitFor(() => pct() > 0, "progress moving");
    const spark = () => document.querySelector(".ld-spark") as HTMLElement;
    const run1 = spark().style.left;
    await waitFor(() => spark().style.left !== run1, "car moved");
    expect(pct()).toBeLessThanOrEqual(100);

    // 3. then the game itself
    await waitFor(() => byText("div", "Command Center"), "home screen after the boot sequence");
    noErrors();
  }, 20000);

  it("lets a tap skip the intro", async () => {
    mountRaw();
    await waitFor(() => document.querySelector('[data-testid="launch-intro"]'), "launch intro");
    window.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    const loading = await waitFor(
      () => document.querySelector('[data-testid="loading-screen"]') as HTMLElement,
      "loading screen after skipping"
    );
    // the tap that skipped the intro must NOT also skip the car screen: the skip
    // gesture only arms once the screen has been up for a moment
    await sleep(120);
    pointer("pointerdown", loading, 400, 400);
    await sleep(250);
    expect(document.querySelector('[data-testid="loading-screen"]'), "car screen survives the intro tap").toBeTruthy();
    // a fresh tap once it is armed drops straight into the game
    await sleep(420);
    pointer("pointerdown", loading, 400, 400);
    await waitFor(() => byText("div", "Command Center"), "home screen after skipping both");
    noErrors();
  }, 20000);

  it("replays the whole boot sequence on demand from settings", async () => {
    await mountApp();
    click(document.querySelector('[aria-label="Settings"]') as HTMLElement);
    await waitFor(() => byText("div", "Loading Screen"), "settings modal");

    click(byText("button", "Replay")!);
    await waitFor(() => document.querySelector('[data-testid="launch-intro"]'), "intro replayed");
    await waitFor(() => byText("div", "Command Center"), "back to the home screen");
    noErrors();
  }, 20000);
});

describe("Settings", () => {
  it("stacks several toasts at once (regression: duplicate toast keys)", async () => {
    await mountApp();
    click(byText("button", "Towers")!);
    await waitFor(() => byText("div", "SUMMON ROTATION"), "tower screen");

    click(document.querySelector('[data-testid="chip-x-arrow"]') as HTMLElement);
    await waitFor(() => !saved().lineup.includes("arrow"), "arrow removed");
    tapCell("arrow");
    const pv = await waitFor(
      () => document.querySelector('[data-testid="tower-preview"]') as HTMLElement,
      "preview panel"
    );
    click(Array.from(pv.querySelectorAll("button")).find((b) => (b.textContent || "").includes("Add to Lineup"))!);
    await waitFor(() => saved().lineup.includes("arrow"), "arrow re-added");
    click(byText("button", "Close")!);

    await waitFor(() => all(".toast").length >= 2, "two toasts visible together");
    noErrors();
  });

  it("exposes the new gameplay and visual options", async () => {
    await mountApp();
    click(document.querySelector('[aria-label="Settings"]') as HTMLElement);
    await waitFor(() => byText("div", "Settings"), "settings modal");

    // every new toggle is present and persisted
    for (const label of ["Damage Numbers", "Screen Shake", "Battlefield Guides", "Auto-Start Waves", "Reduced Motion", "Performance HUD", "Auto-Skip Boss Cutscene"]) {
      expect(document.body.textContent, label).toContain(label);
    }
    // the label sits in a wrapper div inside its option row — walk up to the row
    const rowFor = (label: string) => {
      const lab = all("div").find((d) => (d.textContent || "").trim() === label)!;
      let el: HTMLElement | null = lab.parentElement;
      while (el && !el.querySelector("button")) el = el.parentElement;
      return el!;
    };
    expect(saved().dmgNums).toBe(true);
    click(rowFor("Damage Numbers").querySelector("button")!);
    await waitFor(() => saved().dmgNums === false, "damage numbers off");

    click(rowFor("Auto-Start Waves").querySelector("button")!);
    await waitFor(() => saved().fastWaves === true, "auto-start on");
    click(rowFor("Performance HUD").querySelector("button")!);
    await waitFor(() => saved().perf === true, "perf hud on");
    // boss cutscenes can be retired for good from settings
    click(rowFor("Auto-Skip Boss Cutscene").querySelector("button")!);
    await waitFor(() => saved().autoSkipBossCut === true, "auto-skip boss cutscenes on");

    // master volume slider
    const slider = document.querySelector('input[type="range"]') as HTMLInputElement;
    expect(slider).toBeTruthy();
    // React tracks the value property, so drive the native setter like a real drag
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    setValue.call(slider, "30");
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    await waitFor(() => Math.abs(saved().vol - 0.3) < 0.001, "volume persisted");

    // reduced motion class is applied to the shell
    click(rowFor("Reduced Motion").querySelector("button")!);
    await waitFor(() => saved().reducedMotion === true, "reduced motion on");
    await waitFor(() => document.querySelector(".calm"), "calm class applied");

    click(byText("button", "Close")!);
    await waitFor(() => !byText("div", "Reset Progress"), "settings closed");
    noErrors();
  });

  it("exposes motion blur, SFX EQ, bass/treble boosts and personal music controls", async () => {
    await mountApp();
    click(document.querySelector('[aria-label="Settings"]') as HTMLElement);
    await waitFor(() => document.querySelector('[data-testid="music-player"]'), "music player");
    expect(document.querySelector('[data-testid="sound-eq"]')).toBeTruthy();
    expect(document.querySelector('[aria-label="Upload music file"]')).toBeTruthy();
    expect(document.querySelector('[aria-label="Music speed and pitch"]')?.getAttribute("step")).toBe("0.01");
    click(document.querySelector('[data-testid="toggle-motionBlur"]') as HTMLElement);
    click(document.querySelector('[data-testid="toggle-bassBoost"] [role="switch"]') as HTMLElement);
    click(document.querySelector('[data-testid="toggle-trebleBoost"] [role="switch"]') as HTMLElement);
    await waitFor(() => saved().motionBlur && saved().bassBoost && saved().trebleBoost, "audio and motion toggles saved");
    const eq = document.querySelector('[aria-label="Bass EQ"]') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    setter.call(eq, "5");
    eq.dispatchEvent(new Event("input", { bubbles: true }));
    await waitFor(() => saved().eqBass === 5, "bass EQ saved");
    noErrors();
  });

  it("gives every option a knob switch instead of an ON/OFF button", async () => {
    await mountApp();
    click(document.querySelector('[aria-label="Settings"]') as HTMLElement);
    await waitFor(() => byText("div", "Settings"), "settings modal");

    // State text is now embedded inside the switch, rather than being a
    // separate ON/OFF action button.
    const knobs = all(".knob");
    expect(knobs.some((k) => /ON|OFF/.test(k.textContent || ""))).toBe(true);
    expect(knobs.length, "one knob per option").toBeGreaterThanOrEqual(8);
    for (const k of knobs) {
      expect(k.getAttribute("role")).toBe("switch");
      expect(k.getAttribute("aria-checked")).toMatch(/true|false/);
      expect(k.querySelector(".knob-rail")).toBeTruthy();
      expect(k.querySelector(".knob-head")).toBeTruthy();
    }
    // the head slides across the rail when the knob is thrown
    const off = all(".knob").find((k) => k.getAttribute("aria-checked") === "false")!;
    expect(off).toBeTruthy();
    click(off);
    await waitFor(() => off.getAttribute("aria-checked") === "true", "knob threw");
    expect(off.classList.contains("on")).toBe(true);

    // every gameplay toggle still writes through to the save
    const dmg = document.querySelector('[data-testid="toggle-dmgNums"]') as HTMLElement;
    expect(dmg.getAttribute("aria-checked")).toBe("true");
    click(dmg);
    await waitFor(() => saved().dmgNums === false, "toggled through the knob");
    const oceanTheme = document.querySelector('[data-testid="ui-theme-ocean"]') as HTMLElement;
    expect(oceanTheme).toBeTruthy();
    click(oceanTheme);
    await waitFor(() => saved().uiTheme === "ocean", "theme preference saved");
    await waitFor(() => document.documentElement.dataset.uiTheme === "ocean", "theme palette applied");
    const glass = document.querySelector('[data-testid="toggle-liquidGlass"]') as HTMLElement;
    expect(glass).toBeTruthy();
    expect(document.documentElement.dataset.uiGlass).toBe("off");
    click(glass);
    await waitFor(() => saved().liquidGlass === true, "liquid-glass preference saved");
    await waitFor(() => document.documentElement.dataset.uiGlass === "on", "liquid-glass theme applied");
    noErrors();
  }, 20000);

  it("offers a fullscreen control in settings and in the top bar", async () => {
    await mountApp();
    // top-bar button exists and is labelled
    const bar = document.querySelector('[data-testid="fullscreen-button"]') as HTMLElement;
    expect(bar, "top bar fullscreen button").toBeTruthy();
    expect(bar.getAttribute("aria-label")).toMatch(/fullscreen/i);

    click(document.querySelector('[aria-label="Settings"]') as HTMLElement);
    await waitFor(() => byText("div", "Settings"), "settings modal");
    expect(document.body.textContent).toContain("Fullscreen");
    expect(document.querySelector('[data-testid="toggle-fullscreen"]')).toBeTruthy();
    click(byText("button", "Close")!);
    await waitFor(() => !byText("div", "Reset Progress"), "settings closed");
    noErrors();
  }, 20000);

  it("does not expose a destructive reset-progress action", async () => {
    persistSave({ ...defaultSave(), gold: 9999, levels: { arrow: 5 }, lineup: ["arrow"] });
    await mountApp();
    click(document.querySelector('[aria-label="Settings"]') as HTMLElement);
    await waitFor(() => byText("div", "Settings"), "settings modal");
    expect(document.body.textContent).not.toContain("Reset Progress");
    expect(document.querySelector('[data-testid="reset-progress"]')).toBeNull();
    expect(saved().gold).toBe(9999);
    expect(saved().levels.arrow).toBe(5);
    noErrors();
  });
});

describe("Font vault", () => {
  it("offers eighty previewable faces and applies the picked one", async () => {
    await mountApp();
    click(document.querySelector('[aria-label="Settings"]') as HTMLElement);
    await waitFor(() => byText("div", "Settings"), "settings modal");

    // every tile carries data-font; the section/grid/count testids do not
    expect(all("[data-font]").length).toBe(80);
    expect(document.body.textContent).toContain("Permanent Marker");
    expect(document.body.textContent).toContain("EDO");

    click(document.querySelector('[data-testid="font-marker"]') as HTMLElement);
    await waitFor(() => saved().font === "marker", "font persisted");
    expect(document.documentElement.dataset.magictdFont).toBe("marker");
    expect(document.documentElement.style.getPropertyValue("--font-ui")).toContain("Permanent Marker");

    click(document.querySelector('[data-testid="font-edo"]') as HTMLElement);
    await waitFor(() => saved().font === "edo", "font switched");
    expect(document.documentElement.dataset.magictdFont).toBe("edo");

    // back to the default so the boot screens of later tests stay calm
    click(document.querySelector('[data-testid="font-rajdhani"]') as HTMLElement);
    await waitFor(() => saved().font === "rajdhani", "font restored");
    noErrors();
  });
});

describe("Gauntlet mode", () => {
  it("adds a third home card and starts a boon run", async () => {
    await mountApp();
    expect(document.body.textContent).toContain("Gauntlet");
    startMode("Gauntlet");
    await waitFor(() => document.querySelector('[data-testid="hud"]'), "battle HUD");
    // the run is tagged as a gauntlet, with the boon counter live
    await waitFor(() => byText("em", "gauntlet"), "gauntlet round chip");
    expect(document.querySelector('[data-testid="gauntlet-boons"]')).toBeTruthy();
    expect(document.body.textContent).toContain("boons");
    noErrors();
  });
  it("auto-resolves from an active endless run and delivers the aggregate report by mail", async () => {
    await mountApp();
    startMode("Endless");
    await waitFor(() => document.querySelector('[data-testid="summon-btn"]'), "active battle HUD");
    click(document.querySelector('[data-testid="summon-btn"]') as HTMLElement);
    const auto = await waitFor(() => document.querySelector('[data-testid="auto-resolve"]'), "in-game auto resolve");
    expect(auto).toBeTruthy();
    click(auto as HTMLElement);
    await waitFor(() => document.body.textContent?.includes("Auto-Defense Command"), "auto battle report in mailbox");
    expect(document.body.textContent).toContain("expedition report");
    const report = document.querySelector('[data-mail^="auto-"]') as HTMLElement;
    expect(report).toBeTruthy();
    click(report);
    await waitFor(() => document.body.textContent?.includes("simulated waves"), "report opened");
    noErrors();
  });
});

describe("Gauntlet content", () => {
  it("surfaces the Abyss Leviathan and the new mobs in a deep gauntlet wave", async () => {
    // round 24 guarantees the Leviathan roll (every 8th wave from 20) and every
    // new mob is unlocked by 13 — so one frame exercises all the new art
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
      <StrictMode>
        <Battle mode="gauntlet" save={defaultSave()} mutate={() => {}} onExit={() => {}} debugRound={24} />
      </StrictMode>
    );

    // the deploy preview lists the new roster before the wave rolls
    const preview = await waitFor(
      () => document.querySelector('[data-testid="wave-preview"]') as HTMLElement,
      "wave preview"
    );
    const names = (preview.textContent || "").toUpperCase();
    expect(names).toContain("RIFT HOUND");
    expect(names).toContain("CINDER WRAITH");
    expect(names).toContain("SHARD GOLEM");
    expect(names).toContain("ABYSS LEVIATHAN");

    // the Leviathan opens the wave with its own portrait card
    const cut = await waitFor(
      () => document.querySelector('[data-testid="boss-cutscene"]') as HTMLElement,
      "leviathan cutscene",
      20000
    );
    const text = (cut.textContent || "").toUpperCase();
    // several bosses share wave 24 — the card introduces the marquee one, and
    // the Storm Herald is the deepest boss on the board (highest HP multiplier)
    expect(text).toContain("STORM HERALD");
    expect(text).toContain("WAVE 24");
    // it advertises its OWN three-skill kit — nothing borrowed from another boss
    for (const skill of ["Soul Siphon", "Overcharge", "Maelstrom"]) {
      expect(text, skill).toContain(skill.toUpperCase());
    }
    for (const skill of ["Rift Call", "Void Step", "Bulwark", "Meteor Fall", "Rift Chains", "Warp", "Foundation Quake"]) {
      expect(text, skill).not.toContain(skill.toUpperCase());
    }
    // the kit chips are exactly the three exclusive skills
    expect(cut.querySelectorAll(".boss-chip").length).toBe(3);

    // the canvas keeps painting through the new silhouettes
    await waitFor(() => canvasStats.calls > 0, "canvas painting");
    noErrors();
  }, 30000);
});

describe("Gauntlet boons", () => {
  it("banks the picked boon and rolls straight into the next wave", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
      <StrictMode>
        <Battle mode="gauntlet" save={defaultSave()} mutate={() => {}} onExit={() => {}} debugBoon />
      </StrictMode>
    );

    const overlay = await waitFor(
      () => document.querySelector('[data-testid="boon-overlay"]') as HTMLElement,
      "boon overlay"
    );
    const cards = Array.from(overlay.querySelectorAll<HTMLElement>('[data-testid^="boon-"]'));
    expect(cards.length).toBe(3);
    // every card names its boon and explains the buff
    cards.forEach((c) => expect((c.textContent || "").length).toBeGreaterThan(10));
    const picked = cards[0].getAttribute("data-testid")!.replace("boon-", "");

    click(cards[0]);
    await waitFor(() => !document.querySelector('[data-testid="boon-overlay"]'), "overlay dismissed");
    // the run is on wave 2 with one boon banked
    await waitFor(() => document.querySelector('[data-testid="gauntlet-boons"]')?.textContent?.includes("1"), "boon counted");
    expect(document.body.textContent).toContain("WAVE 2");
    // the banked stack is still reachable on the next clear
    expect(picked.length).toBeGreaterThan(0);
    noErrors();
  }, 30000);
});

describe("Crit damage", () => {
  it("shows the merged crit stat and grows it by 8% per tower upgrade", async () => {
    persistSave({
      ...defaultSave(),
      gold: 9000,
      levels: { arrow: 1, cannon: 1, ice: 1 },
      frags: { ...defaultSave().frags, arrow: 9 },
    });
    await mountApp();
    click(byText("button", "Towers")!);
    await waitFor(() => document.querySelector('[data-testid="crit-band"]'), "crit band");

    const read = () => document.querySelector('[data-testid="crit-total"]')!.textContent!.trim();
    const before = read();
    const upgradesBefore = Number(document.querySelector('[data-testid="crit-upgrades"]')!.textContent);
    expect(before).toBe("60%");
    expect(upgradesBefore).toBe(0);

    // buy one upgrade on the arrow tower from its sheet (a tap on the grid cell)
    tapCell("arrow");
    await waitFor(() => document.querySelector('[data-testid="tower-preview"]'), "preview panel");
    const upBtn = all("button").find((b) => /^Upgrade/.test((b.textContent || "").trim()))!;
    expect(upBtn, "upgrade button").toBeTruthy();
    click(upBtn);
    await waitFor(() => saved().levels.arrow === 2, "arrow levelled");

    // the band merges the new upgrade straight into the total
    await waitFor(() => document.querySelector('[data-testid="crit-upgrades"]')!.textContent === "1", "one merged upgrade");
    await waitFor(() => read() === "68%", "crit total grew by 8%");
    noErrors();
  }, 20000);
});

describe("Shop", () => {
  it("buys a chest, opens it and banks the reward", async () => {
    await mountApp();
    click(byText("button", "Shop")!);
    await waitFor(() => byText("div", "CHESTS"), "shop screen");

    const gemsBefore = saved().gems;
    const fragsBefore = fragTotal(saved());
    const card = document.querySelector('[data-chest="common"]')!;
    const buyBtn = card.querySelector("button") as HTMLButtonElement;
    expect(buyBtn.disabled).toBe(false);
    click(buyBtn);

    await waitFor(() => saved().gems < gemsBefore, "gems spent on chest");
    const gemsAfterPurchase = saved().gems;
    const smash = await waitFor(() => byText("button", "Smash Open!"), "smash button");
    click(smash);

    const collect = await waitFor(() => byText("button", "Collect"), "collect button");
    click(collect);

    await waitFor(() => fragTotal(saved()) > fragsBefore, "fragments banked");
    expect(saved().gems).toBe(gemsAfterPurchase);
    noErrors();
  });

  it("opens the 4000-gem Mystical Chest and banks its rarity-tier reward", async () => {
    persistSave({ ...defaultSave(), gems: 20000 });
    await mountApp();
    click(byText("button", "Shop")!);
    await waitFor(() => document.querySelector('[data-chest="mystical"]'), "Mystical Chest card");
    const fragmentsBefore = fragTotal(saved());
    const gemsBefore = saved().gems;
    const card = document.querySelector('[data-chest="mystical"]')!;
    expect(card.textContent).toContain("65% · 5 Legendary / 35% · 1 Mystical");
    const buy = card.querySelector("button") as HTMLButtonElement;
    expect(buy.disabled).toBe(false);
    click(buy);
    await waitFor(() => saved().gems < gemsBefore, "Mystical Chest gems spent");
    const price = gemsBefore - saved().gems;
    expect(price).toBeGreaterThan(0);
    click(await waitFor(() => byText("button", "Smash Open!"), "Mystical Chest smash"));
    click(await waitFor(() => byText("button", "Collect"), "Mystical reward"));
    await waitFor(() => fragTotal(saved()) > fragmentsBefore, "rarity reward banked");
    noErrors();
  });

  it("exchanges gold for gems and gems back to gold at the published rate", async () => {
    persistSave({ ...defaultSave(), gold: 5000, gems: 0 });
    await mountApp();
    click(byText("button", "Shop")!);
    const section = await waitFor(() => document.querySelector('[data-testid="gold-gem-exchange"]'), "gold-gem exchange");
    const buttons = Array.from(section.querySelectorAll("button"));
    click(buttons[0]);
    await waitFor(() => saved().gold === 0 && saved().gems === 1000, "gold exchanged for gems");
    click(buttons[1]);
    await waitFor(() => saved().gold === 5000 && saved().gems === 0, "gems exchanged back for gold");
    noErrors();
  });

  it("trades gold for specific fragments in the exchange", async () => {
    persistSave({ ...defaultSave(), gold: 1000, frags: {} });
    await mountApp();
    click(byText("button", "Shop")!);
    await waitFor(() => byText("div", "FRAGMENT EXCHANGE"), "shop exchange");

    const arrowPick = all("button").find((b) => (b.textContent || "").includes("Arrow"))!;
    click(arrowPick);
    const panel = byText("div", "FRAGMENT EXCHANGE")!.parentElement!;
    const buy = Array.from(panel.querySelectorAll("button")).find((b) => (b.textContent || "").trim() === "120")!;
    expect(buy, "fragment buy button").toBeTruthy();
    const goldBefore = saved().gold;
    click(buy);
    await waitFor(() => (saved().frags.arrow || 0) === 1, "arrow fragment bought");
    expect(saved().gold).toBe(goldBefore - 120);

    // x5 buys five at once
    click(all("button").find((b) => (b.textContent || "").trim() === "×5")!);
    await sleep(60);
    const buy5 = Array.from(panel.querySelectorAll("button")).find((b) => (b.textContent || "").trim() === "600")!;
    click(buy5);
    await waitFor(() => (saved().frags.arrow || 0) === 6, "five more fragments bought");
    noErrors();
  });

  it("exchanges gems for magic tokens", async () => {
    persistSave({ ...defaultSave(), gems: 128 });
    await mountApp();
    click(byText("button", "Shop")!);
    await waitFor(() => byText("div", "MAGIC TOKEN EXCHANGE"), "token exchange");

    // the 5-token pack now costs 128 gems (exchange gem prices scaled x16)
    const pack = all("button").find((b) => (b.textContent || "").replace(/\s/g, "") === "128")!;
    expect(pack, "5-token pack").toBeTruthy();
    click(pack);
    await waitFor(() => saved().tokens === 5, "tokens banked");
    expect(saved().gems).toBe(0);
    noErrors();
  });

  it("offers the 200-token exchange for exactly 2000 gems", async () => {
    persistSave({ ...defaultSave(), gems: 2000 });
    await mountApp();
    click(byText("button", "Shop")!);
    await waitFor(() => byText("div", "MAGIC TOKEN EXCHANGE"), "token exchange");
    const bulk = all("button").find((b) => (b.textContent || "").replace(/\s/g, "") === "2000")!;
    expect(bulk).toBeTruthy();
    click(bulk);
    await waitFor(() => saved().tokens === 200, "200 tokens banked");
    expect(saved().gems).toBe(0);
    noErrors();
  });
});

describe("Heroes", () => {
  it("selects a hero from the home screen and equips it in battle", async () => {
    await mountApp();
    const glacier = all("button").find((b) => (b.textContent || "").includes("Glacier"))!;
    expect(glacier).toBeTruthy();
    click(glacier);
    await waitFor(() => saved().hero === "glacier", "hero saved");

    startMode("Battle");
    await waitFor(() => byText("button", "SUMMON"), "battle HUD");
    // the hero button shows the equipped hero (wait for the card itself — the
    // SUMMON button is mounted a beat before the engine state is ready)
    const card = await waitFor(() => document.querySelector('[data-testid="hero-card-battle"]'), "hero card");
    expect(card.textContent).toContain("GLACIER");
    click(byText("button", "Abandon")!);
    await waitFor(() => byText("div", "Command Center"), "back home");
    noErrors();
  });
});

describe("Clone tower", () => {
  it("copies a dragged tower and never consumes the original", async () => {
    // two Clones only: every drag then lands ON a clone, which is the copy path
    persistSave({
      ...defaultSave(),
      lineup: ["clone"],
      levels: { ...defaultSave().levels, clone: 1 },
    });
    await mountApp();
    startMode("Battle");
    await waitFor(() => byText("button", "SUMMON"), "battle HUD");
    const summon = document.querySelector('[data-testid="summon-btn"]') as HTMLButtonElement;
    await sleep(120); // let the battle engine bind the imperative summon callback
    summon.click();
    await waitFor(() => (document.body.textContent || "").includes("deployed!"), "first clone");
    summon.click();
    await waitFor(() => (document.body.textContent || "").includes("deployed!"), "second clone");
    const towersOnBoard = () =>
      Number((document.querySelector('[data-testid="towers-on-board"]')?.textContent || "").replace(/[^\d]/g, ""));
    await waitFor(() => towersOnBoard() === 2, "two clones on the grid");

    // drag one onto the other: the copy path fires and BOTH towers remain.
    // Summons land on random cells, so brute-force every ordered cell pair
    // until the copy lands (both towers are clones, so any occupied target is
    // a clone destination and points always match).
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    const cx = (c: number) => 185 + (c + 0.5) * 90;
    const cy = (r: number) => 158 + (r + 0.5) * 90;
    const cells: [number, number][] = [];
    for (let c = 1; c <= 5; c++) for (let r = 0; r <= 2; r++) cells.push([cx(c), cy(r)]);
    for (const [x1, y1] of cells) {
      for (const [x2, y2] of cells) {
        if (x1 === x2 && y1 === y2) continue;
        pointer("pointerdown", canvas, x1, y1);
        pointer("pointermove", canvas, x2, y2);
        pointer("pointerup", canvas, x2, y2);
      }
    }
    // the copy lands on the first real pair — the toast renders on React's next
    // flush, so wait for it instead of reading the DOM in the same tick
    await waitFor(() => /cloned|SUPER CLONE/i.test(document.body.textContent || ""), "clone toast", 6000);
    await waitFor(() => towersOnBoard() === 2, "the original was never consumed");
    noErrors();
    unmountApp();
  }, 25000);
});

describe("Frame settings", () => {
  it("caps the frame rate and toggles frame interpolation", async () => {
    await mountApp();
    click(document.querySelector('[aria-label="Settings"]') as HTMLElement);
    await waitFor(() => byText("div", "Settings"), "settings modal");
    const row = await waitFor(() => document.querySelector('[data-testid="max-fps-row"]'), "max fps row");
    click(row.querySelector('[data-testid="fps-60"]') as HTMLElement);
    await waitFor(() => saved().maxFps === 60, "fps cap saved");
    click(row.querySelector('[data-testid="fps-0"]') as HTMLElement);
    await waitFor(() => saved().maxFps === 0, "fps cap cleared");
    const knob = document.querySelector('[data-testid="toggle-frameInterp"]') as HTMLElement;
    expect(knob, "frame interpolation toggle").toBeTruthy();
    const was = saved().frameInterp;
    click(knob);
    await waitFor(() => saved().frameInterp === !was, "interpolation flipped");

    // effect quality is the manual version of what the frame governor does on
    // its own: ALL -> REDUCED -> MINIMAL, saved with the rest of the options
    const fxq = await waitFor(() => document.querySelector('[data-testid="fxq-row"]'), "effect quality row");
    click(fxq.querySelector('[data-testid="fxq-1"]') as HTMLElement);
    await waitFor(() => saved().fxq === 1, "effect quality saved");
    click(fxq.querySelector('[data-testid="fxq-0"]') as HTMLElement);
    await waitFor(() => saved().fxq === 0, "effect quality back to all");
    noErrors();
    unmountApp();
  });
});

describe("Monthly events", () => {
  it("shows the live monthly event and the whole calendar on Specials", async () => {
    await mountApp();
    click(byText("button", "Specials")!);
    click(await waitFor(() => document.querySelector('[data-testid="tab-events"]') as HTMLElement, "events tab"));
    const live = await waitFor(() => document.querySelector('[data-testid="month-live"]'), "monthly event card");
    expect(live.textContent).toContain("ALL ");
    const strip = await waitFor(() => document.querySelector('[data-testid="month-strip"]'), "month strip");
    expect(strip.querySelectorAll(".month-tile").length).toBe(12);
    expect(document.querySelectorAll(".month-tile.on").length).toBe(1);
    // the weekday rotation still sits right beside it
    expect(document.querySelector('[data-testid="event-live"]')).toBeTruthy();
    noErrors();
    unmountApp();
  });
});

describe("Towers", () => {
  it("scrolls the whole roster on one surface instead of a nested box", async () => {
    await mountApp();
    click(byText("button", "Towers")!);
    await waitFor(() => byText("div", "SUMMON ROTATION"), "tower screen");

    // the tab is a single scroll surface...
    const page = document.querySelector(".tower-page") as HTMLElement;
    expect(page, "tower page").toBeTruthy();
    expect(page.className).toContain("overflow-y-auto");
    // ...that is actually bounded by the app shell: the tab is h-full all the way
    // up into the min-h-0 flex-1 content area, otherwise a 62-cell grid would
    // just push the nav bar off the bottom of the screen
    const chain: string[] = [];
    for (let el = page.parentElement; el && el !== document.body; el = el.parentElement) chain.push(el.className);
    expect(chain.some((c) => c.includes("min-h-0") && c.includes("flex-1")), `bounded ancestor: ${chain.join(" > ")}`).toBe(true);
    expect(chain.every((c) => !/overflow-(y-)?(auto|scroll|hidden)/.test(c)), "a second scroller between the tab and the shell").toBe(true);

    // the 62-cell grid hangs directly off it: it used to live inside
    // `flex min-h-0 flex-1` with a pinned ASCENT ALL footer below, which capped
    // the box at a handful of rows and made the last groups unreachable
    const grid = document.querySelector('[data-testid="tower-grid"]') as HTMLElement;
    expect(grid.parentElement).toBe(page);
    expect(grid.className).not.toContain("overflow-y-auto");
    expect(grid.className).not.toContain("min-h-0");

    // no nested vertical scrollers anywhere in the tab
    const nested = Array.from(page.querySelectorAll<HTMLElement>("*")).filter((el) =>
      /(^|\s)(overflow-y-auto|overflow-y-scroll|overflow-auto|overflow-scroll)(\s|$)/.test(el.className)
    );
    expect(nested, "nested scroll boxes inside the tab").toHaveLength(0);

    // every tower is in that one grid: 64 cells + 5 rarity headers
    expect(grid.children.length).toBe(69);
    const towerCells = page.querySelectorAll(".tw-cell[data-tower]").length;
    expect(towerCells).toBe(64);

    // the rotation strip and the filters ride along on top of the scroll, so the
    // drag-to-rotation drop target never scrolls out of reach
    const sticky = document.querySelector(".towers-sticky") as HTMLElement;
    expect(sticky.className).toContain("sticky");
    expect(sticky.querySelector('[data-testid="lineup-row"]')).toBeTruthy();
    expect(sticky.querySelector('[data-testid="tw-filters"]')).toBeTruthy();

    // and the footer still exists, just below the grid instead of pinning it
    expect(byText("div", "Ascent All")).toBeTruthy();
    noErrors();
    unmountApp();
  });

  it("previews a tower and upgrades it from the preview panel", async () => {
    persistSave({
      ...defaultSave(),
      gold: 5000,
      frags: { ...defaultSave().frags, arrow: 9 },
    });
    await mountApp();
    click(byText("button", "Towers")!);
    await waitFor(() => byText("div", "SUMMON ROTATION"), "tower screen");

    const cell = () => document.querySelector('[data-tower="arrow"]') as HTMLElement;
    // the grid cell is an icon with the level underneath and a rarity outline
    expect(cell().className).toContain("tw-cell");
    expect(cell().querySelector(".tw-cell-lv")!.textContent).toBe("LV 1");
    // normal-rarity outline (#9fb4c7 as the browser normalises it)
    expect(cell().getAttribute("style")).toContain("rgb(159, 180, 199)");
    // no button anywhere on the tile
    expect(cell().querySelectorAll("button")).toHaveLength(0);

    const before = saved();
    tapCell("arrow");
    const pv = await waitFor(
      () => document.querySelector('[data-testid="tower-preview"]') as HTMLElement,
      "tower preview panel"
    );
    // name on top, description below it, stats with upgrade deltas, ascent section
    expect(pv.textContent).toContain("Arrow");
    expect(pv.textContent).toContain("Fires an arrow at the enemy");
    expect(pv.textContent).toContain("Damage");
    expect(pv.textContent).toContain("+2"); // the next level buys +2 damage
    expect(pv.textContent).toContain("ASCENT");

    const upgrade = Array.from(pv.querySelectorAll("button")).find((b) => /Upgrade/.test(b.textContent || ""))!;
    click(upgrade);
    await waitFor(() => saved().levels.arrow === 2, "arrow upgraded to level 2");
    const upgPrice = Math.round(
      upgradeGoldCost(1) * monthlyEventBonus(monthlyEventForDate().id).upgradeCostMul
    );
    expect(saved().gold).toBe(before.gold - upgPrice);
    expect(saved().frags.arrow).toBe(before.frags.arrow - 1);
    // the preview re-renders with the new level
    await waitFor(
      () => (document.querySelector('[data-testid="tower-preview"]') as HTMLElement).textContent?.includes("Lv 2/15"),
      "preview shows the new level"
    );

    click(byText("button", "Close")!);
    await waitFor(() => !document.querySelector('[data-testid="tower-preview"]'), "preview closed");
    await waitFor(() => cell().querySelector(".tw-cell-lv")!.textContent === "LV 2", "grid shows the new level");

    // the rotation chip's ✕ removes the tower, the sheet puts it back
    click(document.querySelector('[data-testid="chip-x-arrow"]') as HTMLElement);
    await waitFor(() => !saved().lineup.includes("arrow"), "arrow removed from the rotation");
    tapCell("arrow");
    await waitFor(() => document.querySelector('[data-testid="tower-preview"]'), "sheet reopened");
    click(byText("button", "Add to Lineup")!);
    await waitFor(() => saved().lineup.includes("arrow"), "arrow back in the rotation");
    click(byText("button", "Close")!);
    await waitFor(() => !document.querySelector('[data-testid="tower-preview"]'), "sheet closed again");
    // fragments are shown in the cell itself (9 owned, 1 spent on the upgrade)
    expect(cell().querySelector(".tw-cell-frag")!.textContent).toContain("8");
    expect(cell().querySelector(".tw-cell-frag")!.textContent).toContain("/1"); // level 2 costs 1 fragment

    noErrors();
  });

  it("drags an unlocked tower into a specific lineup slot", async () => {
    persistSave({
      ...defaultSave(),
      gold: 5000,
      levels: { ...defaultSave().levels, gatling: 3 },
      frags: { ...defaultSave().frags, gatling: 12 },
    });
    await mountApp();
    click(byText("button", "Towers")!);
    await waitFor(() => byText("div", "SUMMON ROTATION"), "tower screen");

    const chips = all(".tw-chip");
    expect(chips.length).toBeGreaterThanOrEqual(3);
    chips.forEach((el, i) => {
      const left = 100 + i * 100;
      el.getBoundingClientRect = () =>
        ({ left, top: 0, right: left + 90, bottom: 60, width: 90, height: 60, x: left, y: 0, toJSON: () => ({}) }) as DOMRect;
    });

    pointer("pointerdown", document.querySelector('[data-tower="gatling"]') as HTMLElement, 20, 400);
    pointer("pointermove", window, 250, 30); // centre of chip 1
    pointer("pointerup", window, 250, 30);

    await waitFor(() => saved().lineup[1] === "gatling", "gatling dropped into rotation slot 1");
    noErrors();
  });

  it("refuses to unlock a tower without enough fragments", async () => {
    await mountApp();
    click(byText("button", "Towers")!);
    await waitFor(() => byText("div", "SUMMON ROTATION"), "tower screen");

    const lockCell = document.querySelector('[data-tower="lightning"]') as HTMLElement;
    expect(lockCell, "locked Lightning Princess cell").toBeTruthy();
    expect(lockCell.getAttribute("data-locked")).toBe("1");
    expect(lockCell.querySelector(".tw-cell-lv")!.textContent).toBe("LOCKED");
    tapCell("lightning");

    const pv = await waitFor(
      () => document.querySelector('[data-testid="tower-preview"]') as HTMLElement,
      "locked tower preview"
    );
    expect(pv.textContent).toContain("LOCKED");
    click(Array.from(pv.querySelectorAll("button")).find((b) => (b.textContent || "").trim() === "Unlock")!);
    await waitFor(() => /not enough|need/i.test(document.body.textContent || ""), "denial toast");
    expect(saved().levels.hellstorm).toBeUndefined();
    noErrors();
  });
});

describe("Mystical towers", () => {
  it("unlocks Supervisor from its fragment and upgrades it with gems only", async () => {
    persistSave({ ...defaultSave(), gold: 0, gems: 1000, frags: { ...defaultSave().frags, supervisor: 1 } });
    await mountApp();
    click(byText("button", "Towers")!);
    await waitFor(() => byText("div", "SUMMON ROTATION"), "tower screen");
    tapCell("supervisor");
    let preview = await waitFor(() => document.querySelector('[data-testid="tower-preview"]') as HTMLElement, "Supervisor preview");
    expect(preview.textContent).toContain("MYSTICAL");
    click(Array.from(preview.querySelectorAll("button")).find((b) => (b.textContent || "").trim() === "Unlock")!);
    await waitFor(() => saved().levels.supervisor === 1, "Supervisor unlocked");
    click(byText("button", "Continue")!);
    await waitFor(() => !document.querySelector('[data-testid="ceremony"]'), "unlock ceremony closed");
    tapCell("supervisor");
    preview = await waitFor(() => document.querySelector('[data-testid="tower-preview"]') as HTMLElement, "Supervisor level-up preview");
    expect(preview.textContent).toContain("500 gems");
    click(Array.from(preview.querySelectorAll("button")).find((b) => /Upgrade/.test(b.textContent || ""))!);
    await waitFor(() => saved().levels.supervisor === 2, "Supervisor upgraded");
    expect(saved().gems).toBe(500);
    expect(saved().gold).toBe(0);
    expect(saved().frags.supervisor).toBe(0);
    noErrors();
  });
});

describe("Awakenings", () => {
  it("plays a congratulations ceremony when a tower awakens", async () => {
    persistSave({
      ...defaultSave(),
      gold: 5000,
      tokens: 99,
      levels: { ...defaultSave().levels, lightning: 13 },
      lineup: ["arrow", "cannon", "ice"],
    });
    await mountApp();
    click(byText("button", "Towers")!);
    await waitFor(() => byText("div", "SUMMON ROTATION"), "tower screen");

    tapCell("lightning");
    const pv = await waitFor(
      () => document.querySelector('[data-testid="tower-preview"]') as HTMLElement,
      "preview panel"
    );
    expect(pv.textContent).toContain("Lightning Princess");
    // the preview lists the awakening paths for exotic towers
    expect(pv.textContent).toContain("Superbolt");
    const awakenBtn = Array.from(pv.querySelectorAll("button")).find((b) => /Tier I\b/.test(b.textContent || ""));
    expect(awakenBtn, "awaken button").toBeTruthy();
    click(awakenBtn!);

    const cer = await waitFor(
      () => document.querySelector('[data-testid="ceremony"]') as HTMLElement,
      "awakening ceremony"
    );
    expect(cer.textContent).toContain("CONGRATULATIONS");
    expect(cer.textContent).toContain("TIER I");
    expect(cer.textContent).toContain("Lightning Princess");
    expect(saved().awn.lightning?.[0]).toBe(1);

    click(byText("button", "Continue")!);
    await waitFor(() => !document.querySelector('[data-testid="ceremony"]'), "ceremony dismissed");
    noErrors();
  });
});

describe("Daily rewards", () => {
  it("claims the 7am streak once per day and plays the claim animation", async () => {
    await mountApp();
    const panel = await waitFor(() => document.querySelector('[data-testid="daily-rewards"]') as HTMLElement, "daily panel");
    expect(panel.textContent).toContain("Daily Rewards");
    // the reset hour is spelled out on the panel
    expect(panel.textContent).toContain("07:00");
    // the first day is highlighted as the one being claimed
    expect(panel.querySelectorAll(".day-tile")).toHaveLength(7);
    expect(panel.querySelector(".day-tile.next")).toBeTruthy();

    const gemsBefore = saved().gems;
    click(document.querySelector('[data-testid="daily-claim"]') as HTMLElement);
    await waitFor(() => saved().lastDaily !== "", "daily claimed");
    // day 1 is 1,200 gems
    await waitFor(() => saved().gems === gemsBefore + 1200, "day 1 gems banked");
    expect(saved().dailyStreak).toBe(1);

    // the claim ceremony is on screen with the reward lines
    const overlay = await waitFor(() => document.querySelector('[data-testid="reward-claim"]') as HTMLElement, "claim animation");
    expect(overlay.textContent).toContain("DAY 1");
    await waitFor(() => document.querySelector('[data-testid="claim-lines"]'), "reward lines");
    click(document.querySelector('[data-testid="claim-collect"]') as HTMLElement);
    await waitFor(() => !document.querySelector('[data-testid="reward-claim"]'), "claim dismissed");

    const btn = document.querySelector('[data-testid="daily-claim"]') as HTMLButtonElement;
    await waitFor(() => btn.hasAttribute("disabled"), "claim button locked for the day");
    click(btn);
    await sleep(60);
    expect(saved().gems).toBe(gemsBefore + 1200); // no double dip
    noErrors();
  });

  it("claims the weekday event bonus once a day", async () => {
    await mountApp();
    const card = await waitFor(() => document.querySelector('[data-testid="today-event"]') as HTMLElement, "event card");
    expect(card.textContent).toContain("LIVE TODAY");
    click(document.querySelector('[data-testid="event-claim"]') as HTMLElement);
    await waitFor(() => saved().lastEvent !== "", "event bonus claimed");
    await waitFor(() => document.querySelector('[data-testid="reward-claim"]'), "event claim animation");
    await waitFor(() => !(document.querySelector('[data-testid="claim-collect"]') as HTMLButtonElement).disabled, "event reward opened");
    click(document.querySelector('[data-testid="claim-collect"]') as HTMLElement);
    await waitFor(() => !document.querySelector('[data-testid="reward-claim"]'), "claim dismissed");
    expect((document.querySelector('[data-testid="event-claim"]') as HTMLButtonElement).disabled).toBe(true);
    noErrors();
  });
});

describe("Trophies", () => {
  it("shows the ladder standing and the win/loss stake on the home screen", async () => {
    await mountApp();
    const card = await waitFor(() => document.querySelector('[data-testid="trophy-card"]') as HTMLElement, "trophy card");
    expect(card.textContent).toContain("+70");
    expect(card.textContent).toContain("-20");
    expect(card.textContent).toContain("Copper");
    noErrors();
  });
});

describe("Guild", () => {
  it("joins a guild, donates and opens the daily guild chest", async () => {
    await mountApp();
    click(byText("button", "Guild")!);
    await waitFor(() => document.querySelector('[data-testid="guild"]'), "guild screen");
    expect(document.body.textContent).toContain("Arcane Vanguard");

    click(byText("button", "Join Guild")!);
    await waitFor(() => saved().guild.id === "vanguard", "joined the guild");
    await waitFor(() => byText("button", "COIN STORE"), "guild tabs");

    // the daily guild chest pays out through the claim ceremony
    click(document.querySelector('[data-testid="guild-chest"]') as HTMLElement);
    await waitFor(() => saved().guild.lastChest !== "", "guild chest opened");
    await waitFor(() => document.querySelector('[data-testid="reward-claim"]'), "guild chest animation");
    // the chest rattles open before the loot lands, so wait for the collect button
    await waitFor(() => !(document.querySelector('[data-testid="claim-collect"]') as HTMLButtonElement).disabled, "chest opened");
    click(document.querySelector('[data-testid="claim-collect"]') as HTMLElement);
    await waitFor(() => !document.querySelector('[data-testid="reward-claim"]'), "claim dismissed");
    noErrors();
  });
});

describe("Heroes", () => {
  it("sells the Thunder God two token-bought awakening paths", async () => {
    persistSave({ ...defaultSave(), hero: "thunder", tokens: 500 });
    await mountApp();

    const panel = await waitFor(
      () => document.querySelector('[data-testid="hero-awakening"]') as HTMLElement,
      "awakening panel"
    );
    const text = panel.textContent || "";
    expect(text).toContain("Electrical Induction");
    expect(text).toContain("Bolt from the Blue");
    expect(text).toContain("PASSIVE");
    // two independent tracks, each with its own token price
    const first = panel.querySelector('[data-testid="hero-awaken-0"]') as HTMLButtonElement;
    const second = panel.querySelector('[data-testid="hero-awaken-1"]') as HTMLButtonElement;
    expect((first.textContent || "").toUpperCase()).toContain("TIER I");
    expect(first.disabled).toBe(false);

    const before = saved().tokens;
    click(first);
    await waitFor(() => saved().heroAwn?.thunder?.[0] === 1, "first tier bought");
    expect(saved().tokens).toBeLessThan(before);
    // the second path is still untouched and its button now asks for Tier I too
    expect(saved().heroAwn?.thunder?.[1] || 0).toBe(0);
    await waitFor(() => /TIER I/i.test(second.textContent || ""), "second path still at tier 0");
    noErrors();
  }, 30000);

  it("upgrades the equipped hero with gold", async () => {
    persistSave({ ...defaultSave(), gold: 5000 });
    await mountApp();
    const card = await waitFor(() => document.querySelector('[data-testid="hero-card"]') as HTMLElement, "hero card");
    expect(card.textContent).toContain("Nova");
    expect(card.textContent).toContain("power");
    expect(card.textContent).toContain("cooldown");

    const btn = document.querySelector('[data-testid="hero-upgrade"]') as HTMLButtonElement;
    expect(btn.textContent).toContain("UPGRADE");
    const goldBefore = saved().gold;
    click(btn);
    await waitFor(() => (saved().heroLv.nova || 1) === 2, "nova levelled up");
    expect(saved().gold).toBeLessThan(goldBefore);
    await waitFor(() => (document.querySelector('[data-testid="hero-card"]') as HTMLElement).textContent!.includes("Lv 2"), "card shows the new level");
    noErrors();
  });

  it("offers the Thunder God hero with a 20s cooldown", async () => {
    await mountApp();
    const card = document.querySelector('[data-testid="hero-card"]') as HTMLElement;
    expect(card.textContent).toContain("Thunder God");
    expect(card.textContent).toContain("20s");
    click(Array.from(card.querySelectorAll("button")).find((b) => (b.textContent || "").includes("Thunder God"))!);
    await waitFor(() => saved().hero === "thunder", "thunder god equipped");
    noErrors();
  });
});

describe("Battle", () => {
  it("starts Super Hardcore with one life and its published scaling", async () => {
    await mountApp();
    startMode("Super Hardcore");
    const rules = await waitFor(() => document.querySelector('[data-testid="superhardcore-rules"]') as HTMLElement, "Super Hardcore HUD");
    expect(rules.textContent).toContain("710× HP · +75% SPEED · 2 GATES · 10× REWARDS · 1 LIFE");
    const lives = document.querySelector('[data-testid="hud-lives"]') as HTMLElement;
    expect(lives.textContent).toContain("1");
    noErrors();
  }, 25000);

  it("starts the Sunday Gem Rush with its five-minute timer and boss roulette", async () => {
    const sunday = vi.spyOn(Date.prototype, "getDay").mockReturnValue(0);
    try {
      await mountApp();
      expect(document.querySelector('[data-testid="enter-gem-rush"]')).toBeTruthy();
      click(document.querySelector('[data-testid="enter-gem-rush"]') as HTMLElement);
      const timer = await waitFor(() => document.querySelector('[data-testid="gem-rush-timer"]') as HTMLElement, "Gem Rush clock");
      expect(timer.textContent).toContain("05:00");
      await waitFor(() => document.querySelector('[data-testid="boss-roulette"]'), "automatic opening boss roulette");
      expect(document.querySelector('[data-testid="gem-rush-rules"]')?.textContent).toContain("50 GEMS/KILL");
      noErrors();
    } finally {
      sunday.mockRestore();
    }
  });

  it("mounts the engine, spawns towers instantly, spawns a wave and can be abandoned", async () => {
    await mountApp();
    startMode("Battle");

    // engine + canvas boot
    const canvas = await waitFor(() => document.querySelector("canvas"), "battle canvas");
    expect(canvas.width).toBe(1000);
    expect(canvas.height).toBe(580);
    const startCalls = canvasStats.calls;
    await waitFor(() => canvasStats.calls > startCalls + 50, "render loop drawing frames");
    // the compact HUD labels the round group in lower case ("1/12 round")
    expect(document.querySelector('[data-testid="hud-round"]')!.textContent).toContain("round");
    expect(document.body.textContent).toMatch(/1\/\d+round/);
    expect(document.body.textContent).toContain("1/12");

    // the field starts EMPTY now: the opening SP buys four summons
    const summon = document.querySelector('[data-testid="summon-btn"]') as HTMLButtonElement;
    expect(summon, "summon button").toBeTruthy();
    const towersOnBoard = () =>
      Number((document.querySelector('[data-testid="towers-on-board"]')?.textContent || "").replace(/[^\d]/g, ""));
    expect(towersOnBoard()).toBe(0);

    // the bottom bar is FIXED: one card per rotation tower, all of them already
    // present before a single tower is summoned
    const bar = document.querySelector('[data-testid="ascent-bar"]') as HTMLElement;
    expect(bar, "ascent bar").toBeTruthy();
    const barIds = () => all('[data-testid="ascent-bar"] [data-tower]').map((el) => el.getAttribute("data-tower"));
    const fixedIds = barIds();
    const barCount = fixedIds.length;
    expect(barCount).toBeGreaterThan(0);
    expect(barCount).toBeLessThanOrEqual(6);
    for (const id of barIds()) {
      const card = document.querySelector(`[data-testid="ascent-bar"] [data-tower="${id}"]`) as HTMLElement;
      expect(card.textContent).toContain("NOT DEPLOYED");
    }
    // neither the retired top strip nor the old ascent token came back
    expect(document.querySelector('[data-testid="deck-strip"]')).toBeNull();
    expect(document.querySelector('[data-testid="ascent-token"]')).toBeNull();

    const spNow = () =>
      Number((document.querySelector('[data-testid="sp-chip"]')?.textContent || "").replace(/[^\d]/g, ""));

    for (let i = 0; i < 4; i++) {
      const spBefore = spNow();
      expect(spBefore, `enough SP for summon ${i + 1}`).toBeGreaterThanOrEqual(120);
      click(summon);
      await waitFor(() => spNow() < spBefore, `summon ${i + 1} spent SP`);
      await waitFor(() => (document.body.textContent || "").includes("deployed!"), `summon ${i + 1} toast`);
      await waitFor(() => towersOnBoard() === i + 1, `tower ${i + 1} deployed onto the grid`);
    }
    // exactly four fit in the starting budget
    expect(spNow()).toBeLessThan(120);

    // spawning never moved or duplicated the bar: same cards, same order
    expect(barIds()).toEqual(fixedIds);
    expect(barIds().length).toBe(barCount);
    // and the cards that own a tower show its live battle level
    const deployed = barIds().filter((id) => {
      const card = document.querySelector(`[data-testid="ascent-bar"] [data-tower="${id}"]`) as HTMLElement;
      return !card.textContent!.includes("NOT DEPLOYED");
    });
    expect(deployed.length).toBeGreaterThan(0);
    for (const id of deployed) {
      const card = document.querySelector(`[data-testid="ascent-bar"] [data-tower="${id}"]`) as HTMLElement;
      expect(card.textContent).toMatch(/Lv 1/);
    }

    // wave 1 begins ~7s after deploy phase starts
    const enemiesOut = await waitFor(() => {
      const chip = document.querySelector('[data-testid="enemies-left"]');
      const n = parseInt((chip?.textContent || "0").replace(/[^\d]/g, ""), 10);
      return n > 0 ? n : 0;
    }, "first wave to spawn", 15000);
    expect(enemiesOut).toBeGreaterThan(0);
    expect(canvasStats.texts).toBeGreaterThan(0);

    click(byText("button", "Abandon")!);
    await waitFor(() => byText("div", "Command Center"), "back home after abandoning");
    noErrors();
  });

  it("shows the merged crit damage in the HUD and counts up as crits land", async () => {
    // a deep save: lots of upgrades banked, so the merged stat is a big number
    persistSave({
      ...defaultSave(),
      gold: 60000,
      levels: { arrow: 9, cannon: 5, ice: 3, tesla: 2 },
      lineup: ["arrow", "cannon", "ice", "tesla"],
      frags: { arrow: 40, cannon: 40, ice: 40, tesla: 40 },
    });
    await mountApp();
    startMode("Battle");

    const chip = await waitFor(() => document.querySelector('[data-testid="crit-chip"]'), "crit chip");
    // 8 + 4 + 2 + 1 = 15 upgrades * 8% + 60% base = 180%
    expect(chip.textContent).toContain("180%");
    expect(chip.getAttribute("title")).toContain("15 tower upgrades");

    // deploy a tower and wait for crits to start landing
    const summon = await waitFor(() => byText("button", "SUMMON"), "battle HUD");
    for (let i = 0; i < 4; i++) {
      click(summon);
      await sleep(90);
    }
    await waitFor(
      () => (document.querySelector('[data-testid="crit-chip"]')!.textContent || "").includes("crits"),
      "crit counter running",
      40000
    );
    expect(document.querySelector('[data-testid="crit-stat"]')!.textContent).toContain("180%");

    click(byText("button", "Abandon")!);
    await waitFor(() => byText("div", "Command Center"), "back home");
    noErrors();
  }, 60000);

  it("gives the boss bar a skill kit with the new skills", async () => {
    await mountApp();
    startMode("Battle");
    await waitFor(() => byText("button", "SUMMON"), "battle HUD");
    // bosses arrive from round 16; the kit is data-driven, so assert on the table
    const kit = document.querySelector('[data-testid="boss-kit"]');
    if (kit) {
      // every boss runs exactly its own three exclusive skills
      expect(kit.children.length).toBe(3);
    }
    click(byText("button", "Abandon")!);
    await waitFor(() => byText("div", "Command Center"), "back home");
    noErrors();
  }, 30000);

  it("moves the hero card to the bottom and shows a cooldown ring", async () => {
    await mountApp();
    startMode("Battle");
    await waitFor(() => byText("button", "SUMMON"), "battle HUD");

    const hero = document.querySelector('[data-testid="hero-card-battle"]') as HTMLElement;
    expect(hero, "hero card").toBeTruthy();
    // the card was moved from the middle of the arena down to the corner
    expect(hero.className).toContain("bottom-3");
    expect(hero.className).not.toContain("top-1/2");
    // reworked cooldown: a two-part progress ring plus the countdown readout
    expect(hero.querySelector('[data-testid="hero-ring"]'), "cooldown ring").toBeTruthy();
    expect(hero.querySelector('[data-testid="hero-ring-track"]'), "ring track").toBeTruthy();
    const circumference = 2 * Math.PI * 32;
    expect(Number(hero.querySelector('[data-testid="hero-ring"]')!.getAttribute("stroke-dasharray"))).toBeCloseTo(circumference, 1);

    // fire the skill, then the card flips into its cooldown state
    click(hero);
    await waitFor(() => (hero.textContent || "").includes("COOLDOWN"), "hero on cooldown");
    expect(hero.className).not.toContain("hero-ready");

    click(byText("button", "Abandon")!);
    await waitFor(() => byText("div", "Command Center"), "back home");
    noErrors();
  });

  it("opens a boss cutscene, shows the boss bar and calls out its skills", async () => {
    // mount the engine straight onto a boss round (4) so the cutscene is reachable
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
      <StrictMode>
        <Battle mode="battle" save={defaultSave()} mutate={() => {}} onExit={() => {}} debugRound={4} />
      </StrictMode>
    );

    const cut = await waitFor(
      () => document.querySelector('[data-testid="boss-cutscene"]') as HTMLElement,
      "boss cutscene",
      15000
    );
    const text = cut.textContent || "";
    expect(text).toContain("WARNING");
    // The automatic roulette may select any boss; verify that the reveal is one of the live roster.
    expect(["WARLORD", "RIFT OVERLORD", "VOID TITAN", "ABYSS LEVIATHAN", "STORM HERALD"].some((name) => text.includes(name))).toBe(true);
    expect(text).toContain("ROUND 4");
    expect(text).toContain("SKIP BOSS INTRO");
    // The roulette reveal carries a title, live stats, and the selected boss's own kit.
    expect(["CRIMSON WARLORD", "RIFT OVERLORD", "VOID TITAN", "ABYSS LEVIATHAN", "STORM HERALD"].some((name) => text.includes(name))).toBe(true);
    expect(text).toContain("HEALTH");
    expect(text).toContain("ARMOUR");
    expect(text).toContain("LIVES");
    expect(text).toContain("BOUNTY");
    // Each rolled boss advertises its own skill kit in the reveal card.
    expect(cut.querySelectorAll(".boss-chip").length).toBeGreaterThan(0);

    // the visible skip control dismisses the card and the run resumes
    click(cut.querySelector('[aria-label="Skip boss cutscene"]') as HTMLElement);
    await waitFor(() => !document.querySelector('[data-testid="boss-cutscene"]'), "cutscene dismissed", 8000);

    // the boss then walks onto the path and the bar appears
    const bar = await waitFor(() => document.querySelector('[data-testid="boss-bar"]'), "boss health bar", 15000);
    expect(["WARLORD", "RIFT OVERLORD", "VOID TITAN", "ABYSS LEVIATHAN", "STORM HERALD"].some((name) => (bar.textContent || "").includes(name))).toBe(true);

    // a skill eventually fires and the callout banner names it
    const cast = await waitFor(
      () => document.querySelector('[data-testid="boss-cast"]') as HTMLElement,
      "boss skill callout",
      25000
    );
    // the banner shouts the skill name and explains what it does
    expect(cast.textContent || "").toMatch(/RIFT CALL|WAR CRY|SHIELD CLEAVE|IRON BANNER|FOUNDATION QUAKE|BLOOD FRENZY|SOUL SIPHON|OVERCHARGE|MAELSTROM|UNDERTOW|METEOR|RIFT CHAINS|SOUL DEVOUR|NULL FIELD|WARP SURGE/);
    expect(cast.textContent || "").toMatch(/warlord|overlord|titan|leviathan|herald/i);

    unmountApp();
    noErrors();
  }, 60000);

  it("skips the cutscene entirely when auto-skip is on", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    const s = defaultSave();
    s.autoSkipBossCut = true;
    root.render(
      <StrictMode>
        <Battle mode="battle" save={s} mutate={() => {}} onExit={() => {}} debugRound={4} />
      </StrictMode>
    );

    // the banner names the boss and its signature skill ...
    const cast = await waitFor(
      () => document.querySelector('[data-testid="boss-cast"]') as HTMLElement,
      "auto-skip callout",
      20000
    );
    const text = cast.textContent || "";
    expect(text).toMatch(/ROUND 4|WAVE 4/);
    expect(text).toMatch(/RIFT CALL|WAR CRY|SHIELD CLEAVE|SOUL SIPHON|OVERCHARGE|MAELSTROM|FOUNDATION QUAKE|METEOR FALL|SOUL DEVOUR|RIFT CHAINS|UNDERTOW/i);
    // ... and the card never mounts
    expect(document.querySelector('[data-testid="boss-cutscene"]')).toBeNull();

    unmountApp();
  }, 40000);

  it("zooms the arena in and out", async () => {
    await mountApp();
    startMode("Battle");
    await waitFor(() => byText("button", "SUMMON"), "battle HUD");
    const zoom = await waitFor(() => document.querySelector('[data-testid="zoom"]') as HTMLElement, "zoom control");
    const before = Number(zoom.textContent!.replace(/[^\d]/g, ""));
    expect(before).toBeGreaterThanOrEqual(100);

    click(document.querySelector('[aria-label="Zoom in"]') as HTMLElement);
    await waitFor(() => Number(document.querySelector('[data-testid="zoom"]')!.textContent!.replace(/[^\d]/g, "")) > before, "zoomed in");
    await waitFor(() => saved().zoom > 1, "zoom persisted");
    click(document.querySelector('[aria-label="Zoom out"]') as HTMLElement);
    await waitFor(() => Number(document.querySelector('[data-testid="zoom"]')!.textContent!.replace(/[^\d]/g, "")) === before, "zoomed back out");

    click(byText("button", "Abandon")!);
    await waitFor(() => byText("div", "Command Center"), "back home");
    noErrors();
  });

  it("buys upgrades from the in-battle shop with run gold", async () => {
    await mountApp();
    startMode("Battle");
    await waitFor(() => byText("button", "SUMMON"), "battle HUD");

    const spNow = () =>
      Number((document.querySelector('[data-testid="sp-chip"]')?.textContent || "").replace(/[^\d]/g, ""));
    const spBefore = spNow();

    click(document.querySelector('[data-testid="battle-shop"]') as HTMLElement);
    const shop = await waitFor(
      () => document.querySelector('[data-testid="run-shop"]') as HTMLElement,
      "run shop modal"
    );
    expect(shop.textContent).toContain("Mana Battery");
    expect(shop.textContent).toContain("Meteor Strike");

    // Mana Battery: 60 gold -> +150 SP
    const buyBtn = Array.from(shop.querySelectorAll("button")).find((b) => (b.textContent || "").includes("60"))!;
    expect(buyBtn, "mana battery price button").toBeTruthy();
    click(buyBtn);
    await waitFor(() => spNow() >= spBefore + 150, "SP banked from the shop");
    expect(document.querySelector('[data-testid="run-shop"]')).toBeTruthy();

    click(byText("button", "Back to battle")!);
    await waitFor(() => !document.querySelector('[data-testid="run-shop"]'), "shop closed");
    click(byText("button", "Abandon")!);
    await waitFor(() => byText("div", "Command Center"), "back home");
    noErrors();
  });

  it("sells SP gain in the battle shop and banks the multiplier", async () => {
    await mountApp();
    startMode("Battle");
    await waitFor(() => byText("button", "SUMMON"), "battle HUD");

    click(document.querySelector('[data-testid="battle-shop"]') as HTMLElement);
    const shop = await waitFor(
      () => document.querySelector('[data-testid="run-shop"]') as HTMLElement,
      "run shop modal"
    );
    expect(shop.textContent).toContain("Mana Conduit");
    expect(shop.textContent).toContain("0/10 bought");

    // 120 run gold buys the first level of the multiplier
    const row = Array.from(shop.querySelectorAll(".row-card")).find((r) =>
      (r.textContent || "").includes("Mana Conduit")
    ) as HTMLElement;
    click(row.querySelector("button") as HTMLElement);
    await waitFor(() => /1\/10 bought/.test(shop.textContent || ""), "first SP gain level bought");
    noErrors();
    click(byText("button", "Back to battle")!);
    await waitFor(() => !document.querySelector('[data-testid="run-shop"]'), "shop closed");
    click(byText("button", "Abandon")!);
    await waitFor(() => byText("div", "Command Center"), "back home");
    noErrors();
    unmountApp();
  });

  it("runs Demon Execution and the new legendary kits without errors", async () => {
    // all three are unlocked and leading the rotation, so every summon that lands
    // has a chance of exercising their bespoke combat paths
    const seed = defaultSave();
    seed.levels = { ...(seed.levels || {}), demon: 1, heavenly: 1, honor: 1 };
    seed.lineup = ["demon", "heavenly", "honor"];
    persistSave(seed);

    await mountApp();
    startMode("Battle");
    const summon = await waitFor(
      () => document.querySelector('[data-testid="summon-btn"]') as HTMLButtonElement,
      "battle HUD"
    );
    const boardCount = () =>
      Number((document.querySelector('[data-testid="towers-on-board"]')!.textContent || "0").replace(/[^\d]/g, ""));

    for (let i = 0; i < 3; i++) {
      // the button stays disabled until the engine binds its summon handle
      await waitFor(() => !summon.disabled, "summon enabled");
      click(summon);
      await sleep(150);
    }
    await waitFor(() => boardCount() === 3, "three towers deployed");

    // let them shoot: the demon bolt is on a timer and the heavenly laser
    // pierces whatever it lands on, so a few seconds covers both
    const before = canvasStats.calls;
    const sp = () =>
      Number((document.querySelector('[data-testid="sp-chip"]')?.textContent || "0").replace(/[^\d]/g, ""));
    const afterSummons = sp(); // 460 opening budget minus three summons
    // SP only ever comes from kills and wave clears, and these towers are on the
    // far side of the board half the time: income proves distance never blocks a
    // shot any more
    await waitFor(() => sp() > afterSummons, "kills paying SP with no range limit", 16000);
    expect(canvasStats.calls, "engine kept rendering").toBeGreaterThan(before);
    noErrors();
    unmountApp();
  }, 30000);

  it("boots endless mode with no wave cap", async () => {
    await mountApp();
    startMode("Endless");
    await waitFor(() => byText("button", "SUMMON"), "endless battle HUD");
    expect(document.body.textContent).toContain("WAVE 1");
    expect(document.querySelector('[data-testid="hud-round"]')!.textContent).toContain("endless");
    expect(document.body.textContent).toMatch(/W\d+endless/);
    expect(document.body.textContent).not.toContain("1/12");

    await waitFor(() => canvasStats.calls > 50, "endless render loop drawing");
    click(byText("button", "Abandon")!);
    await waitFor(() => byText("div", "Command Center"), "back home");
    noErrors();
  });

  it("ascends a tower type from the fixed bottom bar without the bar moving", async () => {
    await mountApp();
    startMode("Battle");
    await waitFor(() => byText("button", "SUMMON"), "battle HUD");

    const summon = document.querySelector('[data-testid="summon-btn"]') as HTMLButtonElement;
    for (let i = 0; i < 4; i++) {
      click(summon);
      await sleep(90);
    }
    await waitFor(
      () => Number((document.querySelector('[data-testid="towers-on-board"]')!.textContent || "0").replace(/[^\d]/g, "")) === 4,
      "four towers deployed"
    );

    // the drag token is gone — the bar is fixed and owns every ascend button
    expect(document.querySelector('[data-testid="ascent-token"]')).toBeNull();
    const barIds = () => all("[data-testid=\"ascent-bar\"] [data-tower]").map((el) => el.getAttribute("data-tower"));
    const fixedIds = barIds();

    // find the first card that actually owns a tower
    const owned = fixedIds.filter((id) => {
      const card = document.querySelector(`[data-testid="ascent-bar"] [data-tower="${id}"]`) as HTMLElement;
      return !card.textContent!.includes("NOT DEPLOYED");
    });
    expect(owned.length).toBeGreaterThan(0);
    const idx = fixedIds.indexOf(owned[0]);
    const card = () => document.querySelector(`[data-testid="ascent-bar"] [data-tower="${fixedIds[idx]}"]`) as HTMLElement;
    const btn = () => document.querySelector(`[data-testid="ascend-${idx}"]`) as HTMLButtonElement;
    expect(btn(), "ascent button").toBeTruthy();
    expect(btn().textContent).toContain("ASCENT");
    // the opening SP all went into the four summons, so the button locks out
    expect(btn().disabled).toBe(true);

    // stock up from the run shop (Mana Battery: 60 gold -> +150 SP)
    click(document.querySelector('[data-testid="battle-shop"]') as HTMLElement);
    const shop = await waitFor(
      () => document.querySelector('[data-testid="run-shop"]') as HTMLElement,
      "run shop modal"
    );
    click(Array.from(shop.querySelectorAll("button")).find((b) => (b.textContent || "").includes("60"))!);
    await waitFor(() => !btn().disabled, "ascent affordable again");
    click(byText("button", "Back to battle")!);
    await waitFor(() => !document.querySelector('[data-testid="run-shop"]'), "shop closed");

    const spNow = () =>
      Number((document.querySelector('[data-testid="sp-chip"]')?.textContent || "").replace(/[^\d]/g, ""));
    const spBefore = spNow();

    click(btn());
    await waitFor(() => (card().textContent || "").includes("Lv 2/6"), "the tower type ascended");
    expect(btn().textContent).toContain("200");
    expect(spNow()).toBeLessThan(spBefore);

    // the bar is byte-for-byte the same set of cards afterwards
    expect(barIds()).toEqual(fixedIds);
    // and summoning more towers still cannot duplicate a card
    click(summon);
    await sleep(120);
    expect(barIds()).toEqual(fixedIds);

    click(byText("button", "Abandon")!);
    await waitFor(() => byText("div", "Command Center"), "back home");
    noErrors();
  });

  it("spawns only through the grid and merges into a tower from the rotation", async () => {
    await mountApp();
    startMode("Battle");
    await waitFor(() => document.querySelector('[data-testid="summon-btn"]'), "battle HUD");

    const boardCount = () =>
      Number((document.querySelector('[data-testid="towers-on-board"]')!.textContent || "0").replace(/[^\d]/g, ""));
    const summon = document.querySelector('[data-testid="summon-btn"]') as HTMLButtonElement;
    for (let i = 0; i < 2; i++) {
      click(summon);
      await sleep(120);
    }
    await waitFor(() => boardCount() === 2, "two towers summoned");

    // the build cells: c=1..5 x r=0..2 (c=0, c=6 and r=3 are the path). The canvas
    // maps client coordinates 1:1 onto its 1000x580 backing store in jsdom.
    const cells: [number, number][] = [];
    for (let c = 1; c <= 5; c++) for (let r = 0; r <= 2; r++) cells.push([185 + (c + 0.5) * 90, 158 + (r + 0.5) * 90]);

    // drag every cell onto every other cell: the two towers are somewhere in the
    // grid and both sit on 0 points, so the first real pair merges
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    for (const [ax, ay] of cells) {
      for (const [bx, by] of cells) {
        if (ax === bx && ay === by) continue;
        pointer("pointerdown", canvas, ax, ay);
        pointer("pointermove", canvas, bx, by);
        pointer("pointerup", canvas, bx, by);
        if (boardCount() === 1) break;
      }
      if (boardCount() === 1) break;
    }
    await waitFor(() => boardCount() === 1, "two towers merged into one");

    // the roulette only rolls the summon rotation: the survivor is a rotation
    // tower on a point tier higher than the pair it came from
    const merged = await waitFor(
      () => (document.body.textContent || "").match(/merged to (\d+) pts/),
      "merge toast"
    );
    expect(Number(merged[1])).toBeGreaterThan(0);
    const barText = (document.querySelector('[data-testid="ascent-bar"]') as HTMLElement).textContent || "";
    expect(barText).toContain(`${merged[1]}p`);

    click(byText("button", "Abandon")!);
    await waitFor(() => byText("div", "Command Center"), "back home");
    noErrors();
  }, 40000);

  it("never rolls a merge result from outside the summon rotation", async () => {
    // all 62 towers unlocked, but the rotation holds ONE: a merge can only ever
    // hand back an Arrow. If the roulette drew from the unlocked roster instead,
    // the survivor would be one of the other 60 and the toast would say so.
    const everyTower: Record<string, number> = {};
    for (const t of TOWERS) everyTower[t.id] = 1;
    persistSave({ ...defaultSave(), levels: everyTower, lineup: ["arrow"] });

    await mountApp();
    startMode("Battle");
    const summon = await waitFor(
      () => document.querySelector('[data-testid="summon-btn"]') as HTMLButtonElement,
      "battle HUD"
    );
    const boardCount = () =>
      Number((document.querySelector('[data-testid="towers-on-board"]')!.textContent || "0").replace(/[^\d]/g, ""));
    // the opening pool buys exactly four arrows: two 0-point pairs, so two merges
    for (let i = 0; i < 4; i++) {
      click(summon);
      await sleep(120);
    }
    await waitFor(() => boardCount() === 4, "four arrows deployed");

    const cells: [number, number][] = [];
    for (let c = 1; c <= 5; c++) for (let r = 0; r <= 2; r++) cells.push([185 + (c + 0.5) * 90, 158 + (r + 0.5) * 90]);
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    // Drag cell onto cell until the board is down to two towers. The engine is
    // imperative — the HUD count only refreshes on its own tick — so every
    // attempt gets a beat to land, and the sweep stops the moment the count
    // moves (one more matched pair and the survivors would fuse into one).
    const sweep = async () => {
      for (const [ax, ay] of cells) {
        for (const [bx, by] of cells) {
          if (ax === bx && ay === by) continue;
          const before = boardCount();
          pointer("pointerdown", canvas, ax, ay);
          pointer("pointermove", canvas, bx, by);
          pointer("pointerup", canvas, bx, by);
          await sleep(25);
          if (boardCount() < before) {
            await sleep(160);
            return true; // a merge landed — let the caller decide what is next
          }
        }
      }
      return false;
    };
    let guard = 0;
    while (boardCount() > 2 && guard++ < 6) {
      if (!(await sweep())) break;
    }
    await waitFor(() => boardCount() <= 2, "the merges landed");

    // every evolution the toast ever announced has to be the rotation tower.
    // (Identical toasts collapse into one, so this is a name check rather than a
    // count: the point tiers below are what prove the roulette ran twice.)
    const evolutions = Array.from((document.body.textContent || "").matchAll(/Evolved into ([^·]+?) ·/g)).map((m) =>
      m[1].trim()
    );
    expect(evolutions.length, "merges that announced an evolution").toBeGreaterThanOrEqual(1);
    for (const name of evolutions) expect(name, "a merge left the summon rotation").toBe("Arrow");
    // the survivors are still the rotation tower, on real point tiers
    const bar = document.querySelector('[data-testid="ascent-bar"]')!.textContent || "";
    expect(bar, "the survivors kept their type").toContain("Arrow");
    expect(document.body.textContent || "").toMatch(/merged to [1-8] pts/);

    click(byText("button", "Abandon")!);
    await waitFor(() => byText("div", "Command Center"), "back home");
    noErrors();
    unmountApp();
  }, 40000);

  it("maxes out ascension and refuses further upgrades", async () => {
    await mountApp();
    startMode("Battle");
    await waitFor(() => byText("button", "SUMMON"), "battle HUD");

    const summon = document.querySelector('[data-testid="summon-btn"]') as HTMLButtonElement;
    for (let i = 0; i < 3; i++) {
      click(summon);
      await sleep(90);
    }
    await waitFor(() => document.querySelector('[data-testid="ascend-0"]'), "ascent button");

    // the bar slot to press is the first one that owns a deployed tower
    const ids = all('[data-testid="ascent-bar"] [data-tower]').map((el) => el.getAttribute("data-tower")!);
    const idx = ids.findIndex((id) => {
      const card = document.querySelector(`[data-testid="ascent-bar"] [data-tower="${id}"]`) as HTMLElement;
      return !card.textContent!.includes("NOT DEPLOYED");
    });
    expect(idx, "a bar slot owning a tower").toBeGreaterThanOrEqual(0);
    const card = () => document.querySelector(`[data-testid="ascent-bar"] [data-tower="${ids[idx]}"]`) as HTMLElement;
    const btn = () => document.querySelector(`[data-testid="ascend-${idx}"]`) as HTMLButtonElement;

    // press while affordable — SP is the only limiter
    for (let i = 0; i < 8; i++) {
      if (!btn() || btn().disabled) break;
      click(btn());
      await sleep(80);
    }
    expect(card().textContent || "").toMatch(/Lv [2-6]/);
    // and it is still mounted, still in the same slot, once it tops out
    expect(document.querySelector(`[data-testid="ascend-${idx}"]`), "maxed card still mounted").toBeTruthy();
    expect(all('[data-testid="ascent-bar"] [data-tower]').map((el) => el.getAttribute("data-tower"))).toEqual(ids);
    noErrors();
  });

});

describe("Mail", () => {
  it("lists the inbox, reads a message, collects its attachment and deletes it", async () => {
    await mountApp();
    click(byText("button", "Mail")!);
    await waitFor(() => byText("div", "MAILBOX"), "mail screen");

    // the static inbox is listed newest-first
    const rows = all("[data-mail]");
    expect(rows.length).toBe(5);
    expect(document.body.textContent).toContain("Welcome to the Watch");
    expect(document.body.textContent).toContain("Something bigger is coming");

    // the nav badge counts unread + unclaimed mail
    expect(document.querySelector('[data-testid="nav-badge-mail"]')).toBeTruthy();

    // open the welcome message: it has an attachment
    const welcome = document.querySelector('[data-mail="welcome"]') as HTMLElement;
    click(welcome);
    await waitFor(() => saved().mail.read.includes("welcome"), "welcome marked read");
    await waitFor(() => document.querySelector('[data-testid="mail-claim"]'), "claim button");
    expect(document.body.textContent).toContain("ATTACHED");

    const goldBefore = saved().gold;
    const gemsBefore = saved().gems;
    click(document.querySelector('[data-testid="mail-claim"]') as HTMLElement);
    await waitFor(() => saved().mail.claimed.includes("welcome"), "welcome claimed");
    expect(saved().gold).toBe(goldBefore + 4000);
    expect(saved().gems).toBe(gemsBefore + 150);

    // the claim plays the reward card, which is dismissed to get back to the inbox
    await waitFor(() => byText("div", "WELCOME TO THE WATCH"), "claim card");
    click(document.querySelector('[data-testid="claim-collect"]') as HTMLElement);
    await waitFor(() => !byText("div", "WELCOME TO THE WATCH"), "claim card dismissed");

    // deleting the message takes it out of the inbox
    click(document.querySelector('[data-mail="welcome"]') as HTMLElement);
    await waitFor(() => document.querySelector('[data-testid="mail-delete"]'), "delete button");
    click(document.querySelector('[data-testid="mail-delete"]') as HTMLElement);
    await waitFor(() => saved().mail.deleted.includes("welcome"), "welcome deleted");
    await waitFor(() => !document.querySelector('[data-mail="welcome"]'), "row removed from the list");

    noErrors();
  }, 30000);

  it("collects every ready attachment in one press", async () => {
    await mountApp();
    click(byText("button", "Mail")!);
    await waitFor(() => byText("div", "MAILBOX"), "mail screen");

    const ready = document.querySelector('[data-testid="mail-claim-all"]') as HTMLButtonElement;
    expect(ready.disabled).toBe(false);
    expect(ready.textContent).toContain("COLLECT ALL");

    const before = saved();
    click(ready);
    await waitFor(() => saved().mail.claimed.length >= 4, "every attachment claimed");
    expect(saved().gold).toBeGreaterThan(before.gold);
    expect(saved().tokens).toBeGreaterThan(before.tokens);
    // nothing is left waiting, so the button locks out
    await waitFor(
      () => (document.querySelector('[data-testid="mail-claim-all"]') as HTMLButtonElement).disabled,
      "collect-all disabled"
    );
    noErrors();
  }, 30000);
});

describe("Season", () => {
  it("derives season points from the ladder and pays a tier", async () => {
    // 600 trophies + 5 wins = 600 + 60 = 660 points -> tiers 0..3 (560) unlocked
    persistSave({ ...defaultSave(), trophies: 600, wins: 5 });
    await mountApp();
    click(byText("button", "Season")!);
    await waitFor(() => byText("div", "RIFT SEASON"), "season screen");

    expect(document.querySelector('[data-testid="season-points"]')!.textContent).toContain("660");
    expect(document.querySelector('[data-testid="season-tier-name"]')!.textContent).toContain("CAPTAIN");
    // four crates are ready, the rest are locked out
    const tiers = all("[data-tier]");
    expect(tiers.length).toBe(10);
    expect(tiers.filter((t) => t.getAttribute("data-ready") === "1").length).toBe(4);
    expect((document.querySelector('[data-testid="season-tier-9"]') as HTMLButtonElement).disabled).toBe(true);

    const goldBefore = saved().gold;
    click(document.querySelector('[data-testid="season-tier-0"]') as HTMLElement);
    await waitFor(() => saved().season.claimed.includes(0), "tier 0 claimed");
    expect(saved().gold).toBe(goldBefore + 1500);
    await waitFor(() => document.querySelector('[data-testid="claim-collect"]'), "season claim card");
    click(document.querySelector('[data-testid="claim-collect"]') as HTMLElement);
    await waitFor(() => !byText("div", "SCOUT"), "claim card dismissed");

    // collecting everything left over clears the badge
    click(document.querySelector('[data-testid="season-claim-all"]') as HTMLElement);
    await waitFor(() => saved().season.claimed.length === 4, "all reached tiers claimed");
    noErrors();
  }, 30000);
});

describe("Crystal vault UI", () => {
  it("opens the crystal section inside Towers and spends potions on a level", async () => {
    persistSave({ ...defaultSave(), potions: 40, crystals: {} });
    await mountApp();
    click(byText("button", "Towers")!);
    await waitFor(() => byText("div", "SUMMON ROTATION"), "tower screen");

    click(document.querySelector('[data-testid="tower-section-crystals"]') as HTMLElement);
    const vault = await waitFor(
      () => document.querySelector('[data-testid="crystal-vault"]') as HTMLElement,
      "crystal vault"
    );
    expect(vault.textContent).toContain("CRYSTAL VAULT");
    expect(document.querySelectorAll("[data-crystal]")).toHaveLength(9);
    expect((document.querySelector('[data-testid="potion-balance"]') as HTMLElement).textContent).toContain("40");

    const before = saved().potions;
    click(document.querySelector('[data-testid="crystal-upgrade-ruby"]') as HTMLElement);
    await waitFor(() => saved().crystals.ruby === 1, "ruby upgraded");
    expect(saved().potions).toBeLessThan(before);
    // it costs potions only — gold never moves
    expect(saved().gold).toBe(defaultSave().gold);
    expect(saved().frags).toEqual(defaultSave().frags);

    // the roster is still one click away
    click(document.querySelector('[data-testid="tower-section-towers"]') as HTMLElement);
    await waitFor(() => document.querySelector('[data-testid="tower-grid"]'), "tower grid");
    noErrors();
    unmountApp();
  }, 30000);
});

describe("Audio + power settings", () => {
  it("toggles the 300% volume booster and power saving mode", async () => {
    await mountApp();
    click(document.querySelector('[aria-label="Settings"]') as HTMLElement);
    await waitFor(() => byText("div", "Settings"), "settings modal");

    const boostRow = await waitFor(
      () => document.querySelector('[data-testid="volume-boost-row"]') as HTMLElement,
      "volume booster row"
    );
    expect(boostRow.textContent).toContain("300%");
    click(document.querySelector('[data-testid="toggle-volBoost"]') as HTMLElement);
    await waitFor(() => saved().volBoost === true, "booster on");
    click(document.querySelector('[data-testid="toggle-volBoost"]') as HTMLElement);
    await waitFor(() => saved().volBoost === false, "booster off");

    const power = document.querySelector('[data-testid="toggle-powerSaver"]') as HTMLElement;
    expect(power, "power saving toggle").toBeTruthy();
    click(power);
    await waitFor(() => saved().powerSaver === true, "power saver on");
    // the app shell picks up the class that calms CSS animation
    expect(document.querySelector(".power-saver")).toBeTruthy();
    noErrors();
    unmountApp();
  }, 25000);
});

describe("Battle controls", () => {
  it("pauses, resumes and cycles battle speed", async () => {
    await mountApp();
    startMode("Battle");
    await waitFor(() => byText("button", "SUMMON"), "battle HUD");

    const speed = document.querySelector('[data-testid="speed-btn"]') as HTMLElement;
    expect(speed.textContent).toContain("×1");
    click(speed);
    await waitFor(() => (speed.textContent || "").includes("×1.5"), "speed 1.5x");
    click(speed);
    await waitFor(() => (speed.textContent || "").includes("×2"), "speed 2x");

    click(document.querySelector('[data-testid="pause-btn"]') as HTMLElement);
    await waitFor(() => document.querySelector('[data-testid="pause-overlay"]'), "pause overlay");
    click(document.querySelector('[data-testid="resume-btn"]') as HTMLElement);
    await waitFor(() => !document.querySelector('[data-testid="pause-overlay"]'), "resumed");

    // the wave strip replaced the old top-of-arena overlay clutter
    expect(document.querySelector('[data-testid="wave-strip"]')).toBeTruthy();
    // and a deploy phase can be called early
    expect(document.querySelector('[data-testid="call-wave"]')).toBeTruthy();
    noErrors();
    unmountApp();
  }, 30000);
});


describe("Hardcore", () => {
  it("spends a daily attempt to enter and shows the mode rules", async () => {
    await mountApp();
    const card = document.querySelector('[data-mode="Hardcore"]') as HTMLElement;
    expect(card, "hardcore mode card").toBeTruthy();
    expect(card.textContent).toContain("3/3 LEFT");

    click(card.querySelector("button") as HTMLElement);
    await waitFor(() => saved().hardcoreUses === 1, "attempt banked");
    // the HUD advertises the remaining daily attempts and the rule set
    const plays = await waitFor(
      () => document.querySelector('[data-testid="hardcore-plays"]') as HTMLElement,
      "hardcore HUD pill"
    );
    expect(plays.textContent || "").toContain("2");
    expect(plays.textContent || "").toContain("/ 3 left");
    expect((document.querySelector('[data-testid="hardcore-rules"]') as HTMLElement).textContent).toContain("5× REWARDS");

    // the first wave fields two bodies per slot: thirty enemies (15 slots x 2)
    const fielded = await waitFor(() => {
      const n = Number((document.querySelector('[data-testid="enemies-left"]')?.textContent || "").replace(/[^\d]/g, ""));
      return n >= 30 ? n : 0;
    }, "double-spawn wave", 20000);
    expect(fielded).toBe(30);

    // abandoning does not refund the attempt
    click(byText("button", "Abandon") as HTMLElement);
    await waitFor(() => byText("div", "Command Center"), "back home");
    expect(saved().hardcoreUses).toBe(1);
    expect((document.querySelector('[data-mode="Hardcore"]') as HTMLElement).textContent).toContain("2/3 LEFT");
    noErrors();
  }, 40000);

  it("locks the mode out after three runs in one day", async () => {
    persistSave({ ...defaultSave(), hardcoreUses: 3, hardcoreDay: todayStr() });
    await mountApp();
    const card = document.querySelector('[data-mode="Hardcore"]') as HTMLElement;
    expect(card.textContent).toContain("NO RUNS LEFT");
    click(card.querySelector("button") as HTMLElement);
    await sleep(250);
    // still on the home screen, and the budget was not overspent
    expect(document.querySelector('[data-testid="hud"]')).toBeNull();
    expect(saved().hardcoreUses).toBe(3);
    noErrors();
  }, 20000);
});

describe("Notifications", () => {
  it("suppresses every toast when notifications are hidden", async () => {
    persistSave({ ...defaultSave(), hideNotifs: true });
    await mountApp();
    // equipping a hero normally raises an "equipped" toast
    const glacier = all("button").find((b) => (b.textContent || "").includes("Glacier")) as HTMLElement;
    click(glacier);
    await waitFor(() => saved().hero === "glacier", "hero saved");
    await sleep(200);
    expect(document.querySelectorAll(".toast")).toHaveLength(0);
    // the setting round-trips through the Settings toggle
    click(document.querySelector('[aria-label="Settings"]') as HTMLElement);
    await waitFor(() => byText("div", "Settings"), "settings modal");
    expect(document.body.textContent).toContain("Hide Notifications");
    noErrors();
  }, 30000);
});

describe("Boss roulette strip", () => {
  it("draws a compact single-row reel above the arena", async () => {
    await mountApp();
    startMode("Battle");
    const reel = await waitFor(
      () => document.querySelector('[data-testid="boss-roulette"]') as HTMLElement,
      "boss roulette"
    );
    // one row: copy block, small portrait, hairline progress track
    expect(reel.querySelector(".boss-roulette-copy")).toBeTruthy();
    expect(reel.textContent || "").toContain("NEXT BOSS");
    expect(reel.querySelectorAll(".boss-roulette-kicker")).toHaveLength(1);
    expect(reel.querySelector(".boss-roulette-track")).toBeTruthy();
    expect(reel.querySelector(".boss-roulette-result")).toBeTruthy();
    click(byText("button", "Abandon") as HTMLElement);
    await waitFor(() => byText("div", "Command Center"), "back home");
    noErrors();
  }, 30000);
});
