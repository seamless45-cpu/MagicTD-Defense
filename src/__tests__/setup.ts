/**
 * jsdom stubs: the game draws to a <canvas> and uses a couple of browser APIs
 * that jsdom does not implement. We record canvas calls so tests can assert
 * that the engine is actually rendering.
 */
import { vi } from "vitest";

export const canvasStats = {
  calls: 0,
  fills: 0,
  strokes: 0,
  texts: 0,
  cleared: 0,
  lastText: "",
};

function makeContext(canvas: HTMLCanvasElement) {
  const store: Record<string | symbol, unknown> = { canvas };
  const noop = () => {};
  const count = {
    fill: () => {
      canvasStats.calls++;
      canvasStats.fills++;
    },
    stroke: () => {
      canvasStats.calls++;
      canvasStats.strokes++;
    },
    fillText: (_t: string) => {
      canvasStats.calls++;
      canvasStats.texts++;
      canvasStats.lastText = String(_t);
    },
    strokeText: () => {
      canvasStats.calls++;
    },
    clearRect: () => {
      canvasStats.calls++;
      canvasStats.cleared++;
    },
  } as Record<string, (...a: unknown[]) => void>;

  return new Proxy(store, {
    get(target, prop) {
      if (prop in count) return count[prop as string];
      if (prop in target) return target[prop];
      if (prop === "measureText") return (t: string) => ({ width: String(t).length * 7 });
      if (prop === "createLinearGradient" || prop === "createRadialGradient")
        return () => ({ addColorStop: noop });
      if (prop === "createPattern") return () => null;
      if (prop === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
      if (prop === "putImageData") return noop;
      if (typeof prop === "string" && /^[a-z]/.test(prop)) {
        const fn = () => {
          canvasStats.calls++;
        };
        target[prop] = fn;
        return fn;
      }
      return undefined;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

const ctxByCanvas = new WeakMap<HTMLCanvasElement, unknown>();

HTMLCanvasElement.prototype.getContext = function getContext(this: HTMLCanvasElement) {
  let ctx = ctxByCanvas.get(this);
  if (!ctx) {
    ctx = makeContext(this);
    ctxByCanvas.set(this, ctx);
  }
  return ctx as never;
} as never;

// Deterministic, non-zero layout box so pointer math (canvas -> world coords) works.
const RECT = { x: 0, y: 0, left: 0, top: 0, right: 1000, bottom: 580, width: 1000, height: 580 };
HTMLCanvasElement.prototype.getBoundingClientRect = function () {
  return { ...RECT, toJSON: () => RECT } as DOMRect;
};

// Pointer capture + ResizeObserver are used by the battle screen.
Element.prototype.setPointerCapture = function () {};
Element.prototype.releasePointerCapture = function () {};
Element.prototype.hasPointerCapture = function () {
  return false;
};

class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = RO;

// Audio: jsdom has no WebAudio; the game should degrade gracefully (it does).
if (!(globalThis as unknown as { AudioContext?: unknown }).AudioContext) {
  const makeNode = () => ({
    connect: (n: unknown) => n,
    disconnect: () => {},
    gain: { value: 0, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
    frequency: { value: 0, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
    type: "",
    start: () => {},
    stop: () => {},
  });
  class FakeAudioContext {
    state = "running";
    currentTime = 0;
    sampleRate = 44100;
    destination = makeNode();
    createGain() {
      return makeNode();
    }
    createOscillator() {
      return makeNode();
    }
    createBufferSource() {
      return makeNode();
    }
    createBiquadFilter() {
      return makeNode();
    }
    createBuffer(_c: number, len: number) {
      return { getChannelData: () => new Float32Array(len) };
    }
    resume() {
      return Promise.resolve();
    }
  }
  (globalThis as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
}

export const consoleErrors: string[] = [];
vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
  consoleErrors.push(args.map(String).join(" "));
});
vi.spyOn(console, "warn").mockImplementation(() => {});
