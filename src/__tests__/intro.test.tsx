import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import App from "../App";
import { defaultSave, persistSave } from "../game/save";

/**
 * The launch intro regressed once already: the skip listener armed on mount, so
 * the first tap of the session — the one that unlocks the audio engine, or a
 * stray tap left over from the previous screen — killed the logo sequence
 * before a single frame of it played. These tests pin the behaviour down: the
 * first tap must NOT skip, the animation must actually run, and a later tap
 * must still skip.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor<T>(fn: () => T | null | undefined | false, label: string, timeout = 12000): Promise<T> {
  const t0 = Date.now();
  for (;;) {
    const v = fn();
    if (v) return v as T;
    if (Date.now() - t0 > timeout) throw new Error(`Timed out waiting for: ${label}`);
    await sleep(30);
  }
}

const intro = () => document.querySelector('[data-testid="launch-intro"]');
const tap = () => window.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, cancelable: true, clientX: 12, clientY: 12 }));

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function mount() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

beforeEach(() => {
  localStorage.clear();
  persistSave(defaultSave());
});

afterEach(() => {
  if (root) root.unmount();
  host?.remove();
  root = null;
  host = null;
});

describe("launch intro", () => {
  it("plays the whole logo sequence even when the first tap arrives with it", async () => {
    mount();
    await waitFor(intro, "intro mounted");

    // the audio-unlock gesture lands ~0.3s in — the exact tap that used to skip it
    await sleep(300);
    tap();
    await sleep(250);
    expect(intro(), "intro survives the audio-unlock tap").toBeTruthy();

    // the wordmark letters animate in on their own a beat later
    await waitFor(() => document.querySelectorAll(".boot-letter.on").length === 11, "letters animate in");
    expect(intro(), "intro is still on screen while it animates").toBeTruthy();

    // and it hands itself over to the loading screen without any input
    await waitFor(() => !intro(), "intro finishes on its own");
    await waitFor(() => document.querySelector('[data-testid="loading-screen"]'), "loading screen takes over");
  }, 20000);

  it("still lets a tap fast-forward once the wordmark has landed", async () => {
    mount();
    await waitFor(intro, "intro mounted");

    // before the arming window a tap is ignored
    await sleep(400);
    tap();
    await sleep(200);
    expect(intro(), "early tap ignored").toBeTruthy();

    // after it, a tap fast-forwards straight into the loading screen
    await sleep(2100);
    tap();
    await waitFor(() => document.querySelector('[data-testid="loading-screen"]'), "tap fast-forwarded the intro", 4000);
    expect(intro(), "intro is gone after the skip").toBeFalsy();

    // ...and the car screen must still be there afterwards. The tap that skipped
    // the intro dispatches its pointerup/click to whatever is under the finger by
    // then — the loading screen — so a click listener on it used to end the car
    // screen in the same gesture: the boot looked like it had been skipped.
    await sleep(1400);
    expect(
      document.querySelector('[data-testid="loading-screen"]'),
      "the car screen survives the tap that skipped the intro"
    ).toBeTruthy();
    expect(document.querySelector('[data-testid="loading-car"]')).toBeTruthy();
  }, 20000);
});
