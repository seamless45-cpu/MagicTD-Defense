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
    await waitFor(() => byText("div", "BATTLE LINEUP"), "tower screen");
    expect(document.body.textContent).toContain("Ascent All");

    click(byText("button", "Specials")!);
    await waitFor(() => byText("div", "Season 3"), "specials screen");

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

describe("Loading screen", () => {
  it("runs a staged boot sequence with progress, a tip and a skip control", async () => {
    mountRaw();
    await waitFor(() => document.querySelector(".load-root"), "loading screen");

    // five stages, five bar segments, one ring pair and a progressbar
    await waitFor(() => document.querySelectorAll(".load-step").length === 5, "five load stages");
    expect(document.querySelectorAll(".load-seg")).toHaveLength(5);
    expect(document.querySelectorAll(".load-ring")).toHaveLength(2);
    expect(document.querySelectorAll(".load-spark").length).toBeGreaterThan(0);
    expect(document.body.textContent).toContain("TIP ·");
    expect(document.body.textContent).toContain("MagicTD");

    // progress really advances and stages complete as it does
    const pct = () => Number(document.querySelector("[role=progressbar]")!.getAttribute("aria-valuenow"));
    await waitFor(() => pct() > 0, "progress moving");
    await waitFor(() => document.querySelectorAll(".load-step.done").length >= 1, "first stage completed");
    expect(pct()).toBeLessThanOrEqual(100);

    // skipping cuts straight to the game
    click(byText("button", "SKIP")!);
    await waitFor(() => byText("div", "Command Center"), "home screen after skipping the intro");
    noErrors();
  });

  it("replays the boot sequence on demand from settings", async () => {
    await mountApp();
    click(document.querySelector('[aria-label="Settings"]') as HTMLElement);
    await waitFor(() => byText("div", "Loading Screen"), "settings modal");

    click(byText("button", "Replay")!);
    await waitFor(() => document.querySelector(".load-root"), "loading screen replayed");
    await waitFor(() => byText("div", "Command Center"), "back to the home screen");
    noErrors();
  });
});

describe("Settings", () => {
  it("stacks several toasts at once (regression: duplicate toast keys)", async () => {
    await mountApp();
    click(byText("button", "Towers")!);
    await waitFor(() => byText("div", "BATTLE LINEUP"), "tower screen");

    click(byText("button", "Remove from lineup")!);
    await waitFor(() => !saved().lineup.includes("arrow"), "arrow removed");
    click(byText("button", "Add to lineup")!);
    await waitFor(() => saved().lineup.includes("arrow"), "arrow re-added");

    await waitFor(() => all(".toast").length >= 2, "two toasts visible together");
    noErrors();
  });

  it("exposes the new gameplay and visual options", async () => {
    await mountApp();
    click(document.querySelector('[aria-label="Settings"]') as HTMLElement);
    await waitFor(() => byText("div", "Settings"), "settings modal");

    // every new toggle is present and persisted
    for (const label of ["Damage Numbers", "Screen Shake", "Battlefield Guides", "Auto-Start Waves", "Reduced Motion", "Performance HUD"]) {
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
    persistSave({ ...defaultSave(), gems: 4 });
    await mountApp();
    click(byText("button", "Shop")!);
    await waitFor(() => byText("div", "MAGIC TOKEN EXCHANGE"), "token exchange");

    const pack = all("button").find((b) => (b.textContent || "").replace(/\s/g, "") === "4")!;
    expect(pack, "5-token pack").toBeTruthy();
    click(pack);
    await waitFor(() => saved().tokens === 5, "tokens banked");
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
    // the hero button shows the equipped hero
    expect(document.body.textContent).toContain("GLACIER");
    click(byText("button", "Abandon")!);
    await waitFor(() => byText("div", "Command Center"), "back home");
    noErrors();
  });
});

describe("Towers", () => {
  it("previews a tower and upgrades it from the preview panel", async () => {
    persistSave({
      ...defaultSave(),
      gold: 5000,
      frags: { ...defaultSave().frags, arrow: 9 },
    });
    await mountApp();
    click(byText("button", "Towers")!);
    await waitFor(() => byText("div", "BATTLE LINEUP"), "tower screen");

    const card = () =>
      all(".tile").find((p) => (p.textContent || "").includes("Arrow") && (p.textContent || "").includes("Preview"))!;
    // the level badge in the card corner shows the menu level
    expect(card().querySelector(".badge-num")!.textContent).toBe("1");

    const before = saved();
    click(byText("button", "Preview & Upgrade")!);
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
    expect(saved().gold).toBe(before.gold - 50);
    expect(saved().frags.arrow).toBe(before.frags.arrow - 1);
    // the preview re-renders with the new level
    await waitFor(
      () => (document.querySelector('[data-testid="tower-preview"]') as HTMLElement).textContent?.includes("Lv 2/15"),
      "preview shows the new level"
    );

    click(byText("button", "Close")!);
    await waitFor(() => !document.querySelector('[data-testid="tower-preview"]'), "preview closed");
    expect(card().querySelector(".badge-num")!.textContent).toBe("2");

    click(byText("button", "Remove from lineup")!);
    await waitFor(() => !saved().lineup.includes("arrow"), "arrow removed from lineup");
    expect(byText("button", "Add to lineup")).toBeTruthy();
    // fragments are shown as a gem pill under each card (9 owned, 1 spent on the upgrade)
    const fragPill = card().querySelector(".pill-dark")!;
    expect(fragPill.textContent).toContain("8");
    expect(fragPill.textContent).toContain("1 next"); // level 2 costs 1 fragment

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

    const card = all(".tile").find((p) => (p.textContent || "").includes("Gatling"))!;
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

    const lockCard = all(".tile").find(
      (p) => (p.textContent || "").includes("Lightning Princess") && (p.textContent || "").includes("Unlock with")
    )!;
    expect(lockCard, "locked Lightning Princess card").toBeTruthy();
    click(Array.from(lockCard.querySelectorAll("button")).find((b) => /Preview/.test(b.textContent || ""))!);

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
    await waitFor(() => byText("div", "BATTLE LINEUP"), "tower screen");

    const card = all(".tile").find((p) => (p.textContent || "").includes("Lightning Princess"))!;
    click(Array.from(card.querySelectorAll("button")).find((b) => /Preview/.test(b.textContent || ""))!);
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
  it("claims the daily streak once per day and banks the reward", async () => {
    await mountApp();
    const panel = await waitFor(() => document.querySelector('[data-testid="daily-rewards"]') as HTMLElement, "daily panel");
    expect(panel.textContent).toContain("Daily Rewards");
    // the first day is highlighted as the one being claimed
    expect(panel.querySelectorAll(".day-tile")).toHaveLength(7);
    expect(panel.querySelector(".day-tile.next")).toBeTruthy();

    const goldBefore = saved().gold;
    click(document.querySelector('[data-testid="daily-claim"]') as HTMLElement);
    await waitFor(() => saved().lastDaily !== "", "daily claimed");
    await waitFor(() => saved().gold > goldBefore, "daily gold banked");
    expect(saved().dailyStreak).toBe(1);

    const btn = document.querySelector('[data-testid="daily-claim"]') as HTMLButtonElement;
    await waitFor(() => btn.hasAttribute("disabled"), "claim button locked for the day");
    click(btn);
    await sleep(60);
    expect(saved().gold).toBe(goldBefore + 75); // no double dip
    noErrors();
  });
});

describe("Heroes", () => {
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
  it("mounts the engine, spawns towers instantly, spawns a wave and can be abandoned", async () => {
    await mountApp();
    startMode("Battle");

    // engine + canvas boot
    const canvas = await waitFor(() => document.querySelector("canvas"), "battle canvas");
    expect(canvas.width).toBe(1000);
    expect(canvas.height).toBe(580);
    const startCalls = canvasStats.calls;
    await waitFor(() => canvasStats.calls > startCalls + 50, "render loop drawing frames");
    expect(document.body.textContent).toContain("ROUND");
    expect(document.body.textContent).toContain("1/12");

    // three lineup towers are already on the grid, shown on their HUD slots
    const summon = byText("button", "SUMMON")!;
    const slot0 = summon.parentElement!.children[0] as HTMLElement;
    expect(slot0.querySelector(".badge-num")!.textContent).toBe("1");
    await waitFor(() => slot0.querySelector('[class*="3dff8e"]'), "tower auto-deployed onto the grid");
    const tilesOnField = () => all("[data-slot]").filter((el) => el.textContent && !el.textContent.includes("EMPTY")).length;
    const fieldBefore = tilesOnField();

    // SUMMON drops a tower straight onto a random free cell - no dragging
    const spNow = () =>
      Number((document.querySelector('[data-testid="sp-chip"]')?.textContent || "").replace(/[^\d]/g, ""));
    const spBefore = spNow();
    click(summon);
    await waitFor(() => spNow() < spBefore, "summon spent SP");
    await waitFor(() => (document.body.textContent || "").includes("deployed!"), "summon toast");
    await waitFor(() => tilesOnField() >= fieldBefore, "the new tower holds a slot");

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

  it("boots endless mode with no wave cap", async () => {
    await mountApp();
    startMode("Endless");
    await waitFor(() => byText("button", "SUMMON"), "endless battle HUD");
    expect(document.body.textContent).toContain("WAVE 1");
    expect(document.body.textContent).toContain("ENDLESS");
    expect(document.body.textContent).not.toContain("1/12");

    await waitFor(() => canvasStats.calls > 50, "endless render loop drawing");
    click(byText("button", "Abandon")!);
    await waitFor(() => byText("div", "Command Center"), "back home");
    noErrors();
  });

  it("ascends a tower by dragging the ascent token into its slot", async () => {
    await mountApp();
    startMode("Battle");
    await waitFor(() => byText("button", "SUMMON"), "battle HUD");

    const token = document.querySelector('[data-testid="ascent-token"]') as HTMLElement;
    expect(token, "ascent token exists").toBeTruthy();
    expect(token.textContent).toContain("ASCENT");
    const slot0 = document.querySelector('[data-slot="0"]') as HTMLElement;
    expect(slot0.textContent).toContain("Lv 1/6");

    // drag the token from the tray into slot 0
    const rect = { left: 100, top: 700, right: 200, bottom: 760, width: 100, height: 60, x: 100, y: 700, toJSON: () => ({}) };
    slot0.getBoundingClientRect = () => rect as DOMRect;
    // the SP readout chip (SUMMON and the ascent token also show an "SP <cost>" label)
    const spNow = () => {
      const chip = document.querySelector('[data-testid="sp-chip"]');
      return Number((chip?.textContent || "").replace(/[^\d]/g, ""));
    };
    const spBefore = spNow();
    expect(spBefore).toBeGreaterThan(0);

    pointer("pointerdown", token, 20, 720);
    pointer("pointermove", window, 150, 730);
    pointer("pointerup", window, 150, 730);

    await waitFor(() => (document.querySelector('[data-slot="0"]') as HTMLElement).textContent?.includes("Lv 2/6"), "tower ascended to battle level 2");
    expect(spNow()).toBeLessThan(spBefore);

    // the token is not a per-slot button any more: slots hold no button element
    expect(slot0.querySelector("button")).toBeNull();

    click(byText("button", "Abandon")!);
    await waitFor(() => byText("div", "Command Center"), "back home");
    noErrors();
  });

  it("maxes out ascension and refuses further upgrades", async () => {
    await mountApp();
    startMode("Battle");
    await waitFor(() => byText("button", "SUMMON"), "battle HUD");

    const token = document.querySelector('[data-testid="ascent-token"]') as HTMLElement;
    const slot0 = () => document.querySelector('[data-slot="0"]') as HTMLElement;
    const rect = { left: 100, top: 700, right: 200, bottom: 760, width: 100, height: 60, x: 100, y: 700, toJSON: () => ({}) };
    slot0().getBoundingClientRect = () => rect as DOMRect;

    // SP starts at 200 and each ascent costs 120 + 75 per purchase; do the ones we can afford
    for (let i = 0; i < 5; i++) {
      pointer("pointerdown", token, 20, 720);
      pointer("pointermove", window, 150, 730);
      pointer("pointerup", window, 150, 730);
      await sleep(60);
    }
    const lvl = slot0().textContent || "";
    expect(lvl).toMatch(/Lv [2-6]\/6/);
    noErrors();
  });
});
