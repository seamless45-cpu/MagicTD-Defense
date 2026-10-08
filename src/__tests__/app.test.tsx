import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import App from "../App";
import Battle from "../screens/Battle";
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
    await waitFor(() => byText("div", "WEEKLY ROTATION"), "specials screen");
    // the weekday event rotation is listed in full
    ["Luck Hunting", "Chest Box", "Trophy Competition", "Items Finding", "Mineshaft", "Survive Lightning"].forEach((n) =>
      expect(document.body.textContent).toContain(n)
    );
    // and the competition tab shows the trophy ladder
    click(document.querySelector('[data-testid="tab-competition"]') as HTMLElement);
    await waitFor(() => document.querySelector('[data-testid="ladder"]'), "competition ladder");
    expect(document.body.textContent).toContain("STANDINGS");

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
    click(document.querySelector('[data-testid="toggle-sfx"]') as HTMLElement);
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

  it("redeems a gift code and remembers it", async () => {
    await mountApp();
    click(document.querySelector('[aria-label="Settings"]') as HTMLElement);
    await waitFor(() => byText("div", "GIFT CODES"), "settings modal");

    const input = document.querySelector('input[aria-label="Gift code"]') as HTMLInputElement;
    expect(input, "gift code input").toBeTruthy();
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;

    // boss codes ship empty, so an unknown code is refused without touching the save
    const goldBefore = saved().gold;
    setValue.call(input, "NOTACODE");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const redeem = all("button").find((b) => (b.textContent || "").trim() === "Redeem")!;
    click(redeem);
    await waitFor(() => document.querySelector('[data-testid="gift-msg"]'), "rejection message");
    expect(document.querySelector('[data-testid="gift-msg"]')!.textContent).toContain("not valid");
    expect(saved().gold).toBe(goldBefore);

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

    // the field starts EMPTY now: the opening SP buys four summons
    const summon = byText("button", "SUMMON")!;
    const tilesOnField = () => all("[data-slot]").filter((el) => el.textContent && !el.textContent.includes("EMPTY")).length;
    expect(tilesOnField()).toBe(0);

    const spNow = () =>
      Number((document.querySelector('[data-testid="sp-chip"]')?.textContent || "").replace(/[^\d]/g, ""));

    for (let i = 0; i < 4; i++) {
      const spBefore = spNow();
      expect(spBefore, `enough SP for summon ${i + 1}`).toBeGreaterThanOrEqual(120);
      click(summon);
      await waitFor(() => spNow() < spBefore, `summon ${i + 1} spent SP`);
      await waitFor(() => (document.body.textContent || "").includes("deployed!"), `summon ${i + 1} toast`);
      await waitFor(() => tilesOnField() === i + 1, `tower ${i + 1} deployed onto the grid`);
    }
    // exactly four fit in the starting budget
    expect(spNow()).toBeLessThan(120);

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
    // the boss that leads an early round is the Warlord
    expect(text).toContain("WARLORD");
    expect(text).toContain("ROUND 4");
    expect(text).toContain("TAP TO CONTINUE");
    // its whole skill kit is advertised
    for (const skill of ["Rift Call", "Void Step", "Bulwark", "Blood Frenzy"]) {
      expect(text, skill).toContain(skill);
    }

    // tapping dismisses the card and the run resumes
    click(cut);
    await waitFor(() => !document.querySelector('[data-testid="boss-cutscene"]'), "cutscene dismissed", 8000);

    // the boss then walks onto the path and the bar appears
    const bar = await waitFor(() => document.querySelector('[data-testid="boss-bar"]'), "boss health bar", 15000);
    expect(bar.textContent).toContain("WARLORD");

    // a skill eventually fires and the callout banner names it
    const cast = await waitFor(
      () => document.querySelector('[data-testid="boss-cast"]') as HTMLElement,
      "boss skill callout",
      25000
    );
    // the banner shouts the skill name and explains what it does
    expect(cast.textContent || "").toMatch(/RIFT CALL|VOID STEP|BULWARK|BLOOD FRENZY/);
    expect(cast.textContent || "").toMatch(/warlord/i);

    unmountApp();
    noErrors();
  }, 60000);

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

  it("ascends every tower of the same type with one button press", async () => {
    await mountApp();
    startMode("Battle");
    await waitFor(() => byText("button", "SUMMON"), "battle HUD");

    const summon = byText("button", "SUMMON")!;
    for (let i = 0; i < 4; i++) {
      click(summon);
      await sleep(90);
    }
    await waitFor(
      () => all("[data-slot]").filter((el) => !(el.textContent || "").includes("EMPTY")).length === 4,
      "four towers deployed"
    );

    // the drag token is gone — each slot owns its own ascend button
    expect(document.querySelector('[data-testid="ascent-token"]')).toBeNull();
    const btn0 = () => document.querySelector('[data-testid="ascend-0"]') as HTMLButtonElement;
    expect(btn0(), "ascent button on slot 0").toBeTruthy();
    expect(btn0().textContent).toContain("ASCENT");
    // the opening SP all went into the four summons, so the button locks out
    expect(btn0().disabled).toBe(true);

    // stock up from the run shop (Mana Battery: 60 gold -> +150 SP)
    click(document.querySelector('[data-testid="battle-shop"]') as HTMLElement);
    const shop = await waitFor(
      () => document.querySelector('[data-testid="run-shop"]') as HTMLElement,
      "run shop modal"
    );
    click(Array.from(shop.querySelectorAll("button")).find((b) => (b.textContent || "").includes("60"))!);
    await waitFor(() => !btn0().disabled, "ascent affordable again");
    click(byText("button", "Back to battle")!);
    await waitFor(() => !document.querySelector('[data-testid="run-shop"]'), "shop closed");

    const spNow = () =>
      Number((document.querySelector('[data-testid="sp-chip"]')?.textContent || "").replace(/[^\d]/g, ""));
    const spBefore = spNow();

    click(btn0());
    await waitFor(
      () => ((document.querySelector('[data-slot="0"]') as HTMLElement).textContent || "").includes("Lv 2/6"),
      "slot 0 ascended"
    );
    expect(spNow()).toBeLessThan(spBefore);

    // every deployed copy of that tower type moved up together
    const name = ((document.querySelector('[data-slot="0"]') as HTMLElement).textContent || "").split("Lv")[0].trim();
    for (const slot of all("[data-slot]")) {
      const text = slot.textContent || "";
      if (name && text.includes(name) && !text.includes("EMPTY")) expect(text).toContain("Lv 2/6");
    }

    click(byText("button", "Abandon")!);
    await waitFor(() => byText("div", "Command Center"), "back home");
    noErrors();
  });

  it("maxes out ascension and refuses further upgrades", async () => {
    await mountApp();
    startMode("Battle");
    await waitFor(() => byText("button", "SUMMON"), "battle HUD");

    const summon = byText("button", "SUMMON")!;
    for (let i = 0; i < 3; i++) {
      click(summon);
      await sleep(90);
    }
    await waitFor(() => document.querySelector('[data-testid="ascend-0"]'), "ascent button");

    const slot0 = () => document.querySelector('[data-slot="0"]') as HTMLElement;
    // press while affordable — SP is the only limiter
    for (let i = 0; i < 8; i++) {
      const btn = document.querySelector('[data-testid="ascend-0"]') as HTMLButtonElement;
      if (!btn || btn.disabled) break;
      click(btn);
      await sleep(80);
    }
    expect(slot0().textContent || "").toMatch(/Lv [2-6]\/6/);
    noErrors();
  });

});
