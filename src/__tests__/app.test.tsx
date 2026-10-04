import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import App from "../App";
import { canvasStats, consoleErrors } from "./setup";
import { defaultSave, persistSave, type SaveData } from "../game/save";

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

function saved(): SaveData {
  return { ...defaultSave(), ...(JSON.parse(localStorage.getItem("magictd_save_v1") || "{}") as SaveData) };
}
const fragTotal = (s: SaveData) => Object.values(s.frags || {}).reduce((a, b) => a + b, 0);

let root: Root | null = null;
let host: HTMLDivElement | null = null;

async function mountApp() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  // main.tsx renders inside StrictMode — mirror that so double-mounted effects are exercised
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  await waitFor(() => byText("button", "Battle Mode"), "home screen (loading screen finished)");
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
    expect(byText("button", "Battle Mode")).toBeTruthy();
    expect(byText("button", "Party Mode")).toBeTruthy();

    click(byText("button", "Shop")!);
    await waitFor(() => byText("div", "CHESTS"), "shop screen");
    expect(document.body.textContent).toContain("Common Chest");

    click(byText("button", "Towers")!);
    await waitFor(() => byText("div", "BATTLE LINEUP"), "tower screen");
    expect(document.body.textContent).toContain("Ascent All");

    click(byText("button", "Specials")!);
    await waitFor(() => byText("div", "Daily Rite"), "specials screen");

    click(byText("button", "Guild")!);
    await waitFor(() => byText("div", "Guild Hall"), "guild screen");

    click(byText("button", "Home")!);
    await waitFor(() => byText("div", "Command Center"), "home screen again");

    noErrors();
  });

  it("opens settings and persists the toggles", async () => {
    await mountApp();
    click(document.querySelector('[aria-label="Settings"]') as HTMLElement);
    await waitFor(() => byText("div", "Settings"), "settings modal");

    expect(saved().sfx).not.toBe(false);
    click(byText("button", "ON")!);
    await waitFor(() => saved().sfx === false, "sfx toggle persisted");

    click(byText("button", "Close")!);
    await waitFor(() => !byText("div", "Reset Progress"), "settings closed");
    noErrors();
  });
});

describe("Settings", () => {
  it("stacks several toasts at once (regression: duplicate toast keys)", async () => {
    await mountApp();
    click(byText("button", "Towers")!);
    await waitFor(() => byText("div", "BATTLE LINEUP"), "tower screen");

    click(byText("button", "In Lineup — Remove")!);
    await waitFor(() => !saved().lineup.includes("arrow"), "arrow removed");
    click(byText("button", "Add to Lineup")!);
    await waitFor(() => saved().lineup.includes("arrow"), "arrow re-added");

    await waitFor(() => all(".toast").length >= 2, "two toasts visible together");
    noErrors();
  });

  it("persists a reset instead of restoring the old save", async () => {
    persistSave({ ...defaultSave(), gold: 9999, levels: { arrow: 5 }, lineup: ["arrow"] });
    await mountApp();
    expect(saved().gold).toBe(9999);

    click(document.querySelector('[aria-label="Settings"]') as HTMLElement);
    await waitFor(() => byText("div", "Reset Progress"), "settings modal");
    click(byText("button", "Reset")!);
    await waitFor(() => byText("button", "Confirm?"), "confirm step");
    click(byText("button", "Confirm?")!);

    await waitFor(() => saved().gold === 100, "default save written back");
    expect(saved().levels.arrow).toBe(1);
    expect(saved().lineup).toHaveLength(3);
    noErrors();
  });
});

describe("Shop", () => {
  it("buys a chest, opens it and banks the reward", async () => {
    await mountApp();
    click(byText("button", "Shop")!);
    await waitFor(() => byText("div", "CHESTS"), "shop screen");

    const goldBefore = saved().gold;
    const fragsBefore = fragTotal(saved());
    expect(goldBefore).toBeGreaterThanOrEqual(40);

    // The common chest is the first chest card; its buy button shows the price.
    const buyBtn = all("button").find((b) => (b.textContent || "").trim() === "40");
    expect(buyBtn, "common chest buy button").toBeTruthy();
    click(buyBtn!);

    await waitFor(() => saved().gold === goldBefore - 40, "gold spent on chest");
    const smash = await waitFor(() => byText("button", "Smash Open!"), "smash button");
    click(smash);

    const collect = await waitFor(() => byText("button", "Collect"), "collect button");
    click(collect);

    await waitFor(() => fragTotal(saved()) > fragsBefore, "fragments banked");
    expect(saved().gold).toBeGreaterThan(goldBefore - 40);
    noErrors();
  });
});

describe("Towers", () => {
  it("upgrades a tower with gold + fragments and toggles the lineup", async () => {
    await mountApp();
    click(byText("button", "Towers")!);
    await waitFor(() => byText("div", "BATTLE LINEUP"), "tower screen");

    const card = () => all(".panel").find((p) => (p.textContent || "").includes("Arrow") && (p.textContent || "").includes("Upgrade"))!;
    const before = saved();
    expect(before.levels.arrow).toBe(1);

    click(byText("button", "Upgrade")!);
    await waitFor(() => saved().levels.arrow === 2, "arrow upgraded to level 2");
    expect(saved().gold).toBe(before.gold - 50);
    expect(saved().frags.arrow).toBe(before.frags.arrow - 1);
    expect(card().textContent).toContain("Lv 2/15");

    click(byText("button", "In Lineup — Remove")!);
    await waitFor(() => !saved().lineup.includes("arrow"), "arrow removed from lineup");
    expect(byText("button", "Add to Lineup")).toBeTruthy();

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
    await waitFor(() => byText("div", "BATTLE LINEUP"), "tower screen");

    const slots = all(".slot-dash");
    expect(slots).toHaveLength(6);
    slots.forEach((el, i) => {
      const left = 100 + i * 100;
      el.getBoundingClientRect = () =>
        ({ left, top: 0, right: left + 90, bottom: 70, width: 90, height: 70, x: left, y: 0, toJSON: () => ({}) }) as DOMRect;
    });

    const card = all(".panel").find((p) => (p.textContent || "").includes("Gatling"))!;
    pointer("pointerdown", card, 20, 400);
    pointer("pointermove", window, 345, 35); // centre of slot 2
    pointer("pointerup", window, 345, 35);

    await waitFor(() => saved().lineup[2] === "gatling", "gatling dropped into slot 2");
    noErrors();
  });

  it("refuses to unlock a tower without enough fragments", async () => {
    await mountApp();
    click(byText("button", "Towers")!);
    await waitFor(() => byText("div", "BATTLE LINEUP"), "tower screen");

    const unlockBtn = byText("button", "Unlock ·")!;
    expect(unlockBtn).toBeTruthy();
    click(unlockBtn);
    await waitFor(() => /not enough|need/i.test(document.body.textContent || ""), "denial toast");
    expect(saved().levels.hellstorm).toBeUndefined();
    noErrors();
  });
});

describe("Specials", () => {
  it("claims the daily rite exactly once per day", async () => {
    await mountApp();
    click(byText("button", "Specials")!);
    await waitFor(() => byText("div", "Daily Rite"), "specials screen");

    const goldBefore = saved().gold;
    click(byText("button", "Claim")!);
    await waitFor(() => saved().gold === goldBefore + 60, "daily gold banked");
    expect(saved().lastDaily).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await waitFor(() => byText("button", "Claimed")?.hasAttribute("disabled") === true, "claim button disabled");
    noErrors();
  });
});

describe("Battle", () => {
  it("mounts the engine, deploys a tower, spawns a wave and can be abandoned", async () => {
    await mountApp();
    click(byText("button", "Battle Mode")!);

    // engine + canvas boot
    const canvas = await waitFor(() => document.querySelector("canvas"), "battle canvas");
    expect(canvas.width).toBe(1000);
    expect(canvas.height).toBe(580);
    const startCalls = canvasStats.calls;
    await waitFor(() => canvasStats.calls > startCalls + 50, "render loop drawing frames");
    expect(document.body.textContent).toContain("ROUND 1/12");

    // drag the first lineup tower onto an empty build cell (c=1,r=0 -> 320,155)
    const summon = byText("button", "SUMMON")!;
    const slot0 = summon.parentElement!.children[0] as HTMLElement;
    expect(slot0.querySelector("svg"), "lineup slot holds a tower icon").toBeTruthy();
    expect(slot0.textContent).toContain("Lv1");
    pointer("pointerdown", slot0);
    pointer("pointermove", window, 320, 155);
    pointer("pointerup", window, 320, 155);
    await waitFor(
      () => (byText("button", "SUMMON")!.parentElement!.children[0] as HTMLElement).querySelector('[class*="3dff8e"]'),
      "tower placed on the grid"
    );

    // wave 1 begins ~7s after deploy phase starts
    const enemiesOut = await waitFor(() => {
      const chip = all("span").find((s) => /^\d+ left$/.test((s.textContent || "").trim()));
      const n = chip ? parseInt(chip.textContent!, 10) : 0;
      return n > 0 ? n : 0;
    }, "first wave to spawn", 15000);
    expect(enemiesOut).toBeGreaterThan(0);
    expect(canvasStats.texts).toBeGreaterThan(0);

    click(byText("button", "Abandon")!);
    await waitFor(() => byText("div", "Command Center"), "back home after abandoning");
    noErrors();
  });

  it("boots party mode with teammates and 15 rounds", async () => {
    await mountApp();
    click(byText("button", "Party Mode")!);
    await waitFor(() => byText("button", "SUMMON"), "party battle HUD");
    expect(document.body.textContent).toContain("ROUND 1/15");
    expect(document.body.textContent).toContain("PARTY MODE");
    expect(document.body.textContent).toContain("Kael");

    await waitFor(() => canvasStats.calls > 50, "party render loop drawing");
    click(byText("button", "Abandon")!);
    await waitFor(() => byText("div", "Command Center"), "back home");
    noErrors();
  });
});
