import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

interface Rest {
  endsAt: number;
  total: number;
  label: string;
}

interface RestApi {
  rest: Rest | null;
  remaining: number;
  flashKey: number;
  start: (seconds: number, label: string) => void;
  extend: (seconds: number) => void;
  skip: () => void;
  /** Flash, buzz and (if sound is on) chime, for the end of a timed hold. */
  ping: () => void;
}

const Ctx = createContext<RestApi | null>(null);

let audio: AudioContext | null = null;

/** Must run inside a user gesture on iOS; afterwards the chime can play when rest ends. */
export function unlockAudio() {
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = "ambient";
    if (!audio) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) audio = new AC();
    }
    if (audio && audio.state === "suspended") void audio.resume();
  } catch {
    /* audio is optional */
  }
}

function chime() {
  if (!audio) return;
  const t = audio.currentTime;
  [880, 660].forEach((freq, i) => {
    const osc = audio!.createOscillator();
    const gain = audio!.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t + i * 0.16);
    gain.gain.linearRampToValueAtTime(0.18, t + i * 0.16 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.16 + 0.32);
    osc.connect(gain).connect(audio!.destination);
    osc.start(t + i * 0.16);
    osc.stop(t + i * 0.16 + 0.34);
  });
}

export function buzz(ms = 10) {
  try {
    if ("vibrate" in navigator) navigator.vibrate(ms);
  } catch {
    /* not supported on iOS */
  }
}

export function RestProvider({ children, sound }: { children: ReactNode; sound: boolean }) {
  const [rest, setRest] = useState<Rest | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [flashKey, setFlashKey] = useState(0);
  const firedFor = useRef<number | null>(null);

  useEffect(() => {
    if (!rest) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [rest]);

  const remaining = rest ? Math.max(0, (rest.endsAt - now) / 1000) : 0;

  useEffect(() => {
    if (!rest || remaining > 0 || firedFor.current === rest.endsAt) return;
    firedFor.current = rest.endsAt;
    setFlashKey((k) => k + 1);
    buzz(30);
    if (sound) chime();
    const id = window.setTimeout(() => setRest(null), 1200);
    return () => window.clearTimeout(id);
  }, [rest, remaining, sound]);

  const start = useCallback((seconds: number, label: string) => {
    if (seconds <= 0) {
      setRest(null);
      return;
    }
    const t = Date.now();
    setNow(t);
    setRest({ endsAt: t + seconds * 1000, total: seconds, label });
  }, []);

  const extend = useCallback((seconds: number) => {
    setRest((r) => (r ? { ...r, endsAt: Math.max(Date.now(), r.endsAt) + seconds * 1000, total: r.total + seconds } : r));
  }, []);

  const skip = useCallback(() => setRest(null), []);

  const ping = useCallback(() => {
    setFlashKey((k) => k + 1);
    buzz(30);
    if (sound) chime();
  }, [sound]);

  const value = useMemo(
    () => ({ rest, remaining, flashKey, start, extend, skip, ping }),
    [rest, remaining, flashKey, start, extend, skip, ping],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRest(): RestApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRest outside RestProvider");
  return v;
}

/** Re-renders every `ms` while `active`. */
export function useNow(ms: number, active = true): number {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setN(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms, active]);
  return n;
}
