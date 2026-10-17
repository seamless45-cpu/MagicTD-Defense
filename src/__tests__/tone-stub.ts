/**
 * Test stand-in for the `tone` package.
 *
 * Tone eagerly creates a real `AudioContext` the moment the module is imported
 * (and `standardized-audio-context` crashes outright on jsdom's fake), so under
 * vitest the package resolves to this stub instead — see the `tone` alias in
 * vitest.config.ts. Every export is a "magic" proxy: construct it, call it,
 * chain it, set properties on it — it all no-ops and returns more magic. The
 * sound engine therefore runs unchanged through its whole API surface in tests
 * without a single sample of real audio being produced.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function magic(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn: any = function magicCallable() {
    return magic();
  };
  return new Proxy(fn, {
    get(_t, prop) {
      // never look thenable/iterable/primitive-convertible: `await node` must
      // resolve to the proxy itself, not hang trying to call `then`
      if (prop === "then" || prop === Symbol.toPrimitive || prop === Symbol.iterator || prop === Symbol.asyncIterator) return undefined;
      if (prop === "toJSON") return () => ({ stub: true });
      return magic();
    },
    set: () => true,
    apply: () => magic(),
    construct: () => magic(),
  });
}

const m = magic();

export const start = () => Promise.resolve();
export const now = () => 0;
export const getContext = () => m;
export const getDestination = () => m;
export const setContext = () => undefined;
export const Gain = m;
export const Volume = m;
export const Compressor = m;
export const Limiter = m;
export const Reverb = m;
export const FeedbackDelay = m;
export const Delay = m;
export const Filter = m;
export const EQ3 = m;
export const Distortion = m;
export const BitCrusher = m;
export const Chorus = m;
export const Tremolo = m;
export const PitchShift = m;
export const AutoFilter = m;
export const Oscillator = m;
export const AMOscillator = m;
export const FMOscillator = m;
export const Noise = m;
export const AmplitudeEnvelope = m;
export const Envelope = m;
export const Synth = m;
export const PolySynth = m;
export const FMSynth = m;
export const MembraneSynth = m;
export const NoiseSynth = m;
export const MetalSynth = m;
export const PluckSynth = m;
export const DuoSynth = m;
export const Frequency = m;
export const Time = m;
export const Draw = m;
export const Transport = m;
export const Sampler = m;
export const Player = m;

export default m;
