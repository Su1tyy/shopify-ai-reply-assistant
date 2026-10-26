import { findExercise, isWeighted } from "../data/library";
import { addDays, dayKeyOf, toKey, weekStart } from "./dates";
import { createSession, estimateMinutes } from "./logic";
import type { AppData, Session, Unit } from "./types";

/** Preview-only: plausible starting and current numbers for a 56 kg beginner, per exercise. */
const RANGE: Record<string, [number, number]> = {
  "db-hip-thrust": [10, 16],
  "cable-pull-through": [30, 45],
  "db-glute-bridge": [8, 12],
  "cable-leg-curl": [10, 20],
  "db-sumo-squat": [10, 14],
  "cable-glute-kickback": [10, 20],
  "lat-pulldown": [50, 65],
  "seated-cable-row": [45, 60],
  "db-single-arm-row": [6, 9],
  "db-bicep-curl": [4, 6],
  "cable-lateral-raise": [5, 10],
  "db-rear-delt-fly": [2, 4],
  "cable-crunch": [30, 45],
  "db-russian-twist": [3, 5],
  "pallof-press": [15, 25],
  "db-weighted-situp": [3, 5],
  "db-goblet-squat": [10, 16],
  "cable-chest-press": [20, 30],
  "db-reverse-lunge": [4, 8],
  "db-walking-lunge": [4, 6],
  "cable-hip-abduction": [10, 20],
  "db-step-up": [4, 8],
  "db-calf-raise": [6, 10],
  "cable-wood-chop": [15, 25],
  "smith-bench-press": [30, 45],
  "db-shoulder-press": [4, 7],
  "db-chest-fly": [4, 6],
  "rope-pushdown": [20, 30],
  "db-overhead-triceps": [4, 6],
  "db-side-bend": [6, 10],
  plank: [30, 55],
  "side-plank": [20, 35],
  "reverse-crunch": [10, 15],
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundTo(v: number, unit: Unit): number {
  const step = unit === "kg" ? 1 : 5;
  return Math.max(step, Math.round(v / step) * step);
}

/** Where an exercise stands going into its next session. */
interface Progress {
  w: number;
  /** Sessions done at the current weight, and how many it takes before going heavier (2 or 3). */
  phase: number;
  need: number;
  hold: number;
  bodyReps: number;
}

/**
 * Six weeks of believable history: double progression for weighted lifts (add reps until every set
 * reaches the top of the range, then add weight), slow gains on holds and bodyweight moves, the odd
 * missed day, and yesterday left open (when it falls this week) so the catch-up prompt shows.
 */
export function withSampleHistory(data: AppData, now: Date): AppData {
  const start = addDays(weekStart(now), -42);
  const yesterday = addDays(now, -1);
  const sessions: Record<string, Session> = {};
  const out: AppData = { ...data, sessions, sample: true };
  const progress = new Map<string, Progress>();

  for (let d = new Date(start); d < now; d = addDays(d, 1)) {
    const key = toKey(d);
    const dk = dayKeyOf(d);
    const day = data.plan[dk];
    if (day.rest) continue;
    const r = rng(hash(key));
    const isYesterdayThisWeek = key === toKey(yesterday) && weekStart(d).getTime() === weekStart(now).getTime();
    if (isYesterdayThisWeek || r() < 0.07) continue;

    const session = createSession(out, dk, key);
    for (const e of session.entries) {
      const ex = findExercise(e.exId, data.custom);
      if (!ex) continue;
      const [lo, hi] = RANGE[e.exId] ?? [1, 1];
      const pk = `${e.exId}|${e.unit}`;
      let p = progress.get(pk);
      if (!p) {
        p = { w: roundTo(lo, e.unit), phase: 0, need: 2 + Math.floor(r() * 2), hold: lo, bodyReps: lo };
        progress.set(pk, p);
      }
      const cur = p;
      const last = e.sets.length - 1;
      // Reps climb from the bottom of the range to the top over the sessions at one weight.
      const topping = cur.phase >= cur.need - 1;
      const target = topping ? e.max : Math.round(e.min + ((e.max - e.min) * cur.phase) / Math.max(1, cur.need - 1));
      e.sets = e.sets.map((_, i) => {
        if (e.optional && r() < 0.3) return { done: false };
        if (ex.type === "time") return { m: Math.round(e.min + (e.max - e.min) * r()), done: true };
        if (ex.type === "hold") return { s: Math.max(15, cur.hold - (i === last ? 5 : 0)), done: true };
        if (!isWeighted(ex)) return { r: Math.max(1, cur.bodyReps - (i === last && r() < 0.5 ? 1 : 0)), done: true };
        // Before the session that tops the range, later sets sometimes fall a rep short, as they do in real life.
        const fade = i > 0 && !topping && r() < 0.3 ? 1 : 0;
        return { w: cur.w, r: Math.max(e.min - 1, target - fade), done: true };
      });

      if (ex.type === "hold") {
        if (r() < 0.55) cur.hold = Math.min(hi, cur.hold + 5);
      } else if (ex.type === "reps" && !isWeighted(ex)) {
        if (r() < 0.55) cur.bodyReps = Math.min(hi, cur.bodyReps + 1);
      } else if (isWeighted(ex)) {
        cur.phase += 1;
        const ceiling = roundTo(hi, e.unit);
        if (cur.phase >= cur.need && cur.w < ceiling) {
          const step = e.unit === "lb" ? 5 : cur.w >= 10 ? 2 : 1;
          cur.w = Math.min(ceiling, cur.w + step);
          cur.phase = 0;
          cur.need = 2 + Math.floor(r() * 2);
        }
      }
    }
    const startHour = 17 + Math.floor(r() * 3);
    const startedAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), startHour, Math.floor(r() * 50)).getTime();
    const minutes = estimateMinutes(out, session.entries.map((e) => ({ ...e, sets: e.sets.length }))) + Math.round((r() - 0.5) * 10);
    session.startedAt = startedAt;
    session.finishedAt = startedAt + minutes * 60000;
    sessions[key] = session;
  }
  return out;
}
