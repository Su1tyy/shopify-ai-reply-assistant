import { findExercise, isWeighted } from "../data/library";
import { WEEK_ORDER } from "../data/plan";
import { addDays, dayKeyOf, fromKey, toKey, weekStart } from "./dates";
import type {
  AppData,
  DayKey,
  Entry,
  Exercise,
  Muscle,
  PlanDay,
  PlanItem,
  PREvent,
  PRKind,
  Session,
  SetEntry,
  Unit,
} from "./types";

/* ---------- formatting ---------- */

export function fmtNum(n: number | undefined): string {
  if (n === undefined || Number.isNaN(n)) return "–";
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export function fmtRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}–${max}`;
}

export function fmtTarget(t: { sets: number; min: number; max: number }, ex: Exercise | undefined): string {
  if (!ex) return "";
  const range = fmtRange(t.min, t.max);
  const side = ex.perSide ? " each side" : "";
  if (ex.type === "time") return `${range} min`;
  if (ex.type === "hold") return `${t.sets} × ${range} s${side}`;
  return `${t.sets} × ${range}${side}`;
}

export function fmtSet(set: SetEntry, ex: Exercise | undefined, unit: Unit): string {
  if (!ex) return "";
  if (ex.type === "time") return `${fmtNum(set.m)} min`;
  if (ex.type === "hold") return `${fmtNum(set.s)} s`;
  if (!isWeighted(ex)) return `${fmtNum(set.r)} reps`;
  return `${fmtNum(set.w)} ${unit} × ${fmtNum(set.r)}`;
}

/** Several sets in one short line: "45 lb × 15, 15, 12" when the weight holds, "50, 45 s" for holds. */
export function fmtSets(sets: SetEntry[], ex: Exercise | undefined, unit: Unit): string {
  if (!ex || !sets.length) return "";
  const list = (vals: (number | undefined)[]) => vals.map(fmtNum).join(", ");
  if (ex.type === "time") return `${list(sets.map((s) => s.m))} min`;
  if (ex.type === "hold") return `${list(sets.map((s) => s.s))} s`;
  if (!isWeighted(ex)) return `${list(sets.map((s) => s.r))} reps`;
  const w = sets[0].w;
  if (sets.every((s) => s.w === w)) return `${fmtNum(w)} ${unit} × ${list(sets.map((s) => s.r))}`;
  return sets.map((s) => fmtSet(s, ex, unit)).join(", ");
}

export function weightStep(unit: Unit): number {
  return unit === "kg" ? 1 : 5;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/* ---------- sessions ---------- */

export function sortedDates(data: AppData): string[] {
  return Object.keys(data.sessions).sort();
}

export function isComplete(s: Session | undefined): boolean {
  if (!s) return false;
  if (s.finishedAt) return true;
  const required = s.entries.filter((e) => !e.optional);
  return required.length > 0 && required.every((e) => e.sets.length > 0 && e.sets.every((x) => x.done));
}

export function isStarted(s: Session | undefined): boolean {
  return !!s && s.entries.some((e) => e.sets.some((x) => x.done));
}

export function doneSetCount(s: Session): number {
  return s.entries.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
}

export function totalSetCount(s: Session): number {
  return s.entries.reduce((n, e) => n + e.sets.length, 0);
}

/** The most recent earlier session where this exercise was logged in the same unit. */
export function lastPerformance(
  data: AppData,
  exId: string,
  unit: Unit,
  beforeDate: string,
): { date: string; sets: SetEntry[] } | undefined {
  const dates = sortedDates(data);
  for (let i = dates.length - 1; i >= 0; i--) {
    const d = dates[i];
    if (d >= beforeDate) continue;
    const s = data.sessions[d];
    for (const e of s.entries) {
      if (e.exId !== exId || e.unit !== unit) continue;
      const done = e.sets.filter((x) => x.done);
      if (done.length) return { date: d, sets: done };
    }
  }
  return undefined;
}

function suggestedSet(item: PlanItem, ex: Exercise | undefined, last: SetEntry | undefined): SetEntry {
  if (!ex) return { done: false };
  if (ex.type === "time") return { m: last?.m ?? item.min, done: false };
  if (ex.type === "hold") return { s: last?.s ?? item.min, done: false };
  if (!isWeighted(ex)) return { r: last?.r ?? item.max, done: false };
  return { w: last?.w, r: last?.r ?? item.max, done: false };
}

export function entryFromItem(data: AppData, item: PlanItem, date: string): Entry {
  const ex = findExercise(item.exId, data.custom);
  const last = lastPerformance(data, item.exId, item.unit, date);
  const sets: SetEntry[] = [];
  for (let i = 0; i < item.sets; i++) {
    const prev = last ? last.sets[Math.min(i, last.sets.length - 1)] : undefined;
    sets.push(suggestedSet(item, ex, prev));
  }
  return {
    uid: item.uid,
    exId: item.exId,
    unit: item.unit,
    sets,
    min: item.min,
    max: item.max,
    rest: item.rest,
    optional: item.optional,
    note: item.note,
  };
}

export function createSession(data: AppData, dayKey: DayKey, date: string): Session {
  const day = data.plan[dayKey];
  return {
    date,
    dayKey,
    title: day.title,
    focus: day.focus,
    entries: day.items.map((item) => entryFromItem(data, item, date)),
  };
}

/* ---------- personal bests ---------- */

interface Running {
  baseline: string;
  w?: number;
  rAtW?: number;
  r?: number;
  s?: number;
}

export function prKey(date: string, entryUid: string, idx: number): string {
  return `${date}|${entryUid}|${idx}`;
}

/**
 * Walks every logged set in order. The first session for an exercise sets the baseline,
 * so week one is not a wall of personal bests. After that: heavier weight is a weight PR,
 * more reps at the heaviest weight is a rep PR, a longer hold is a hold PR.
 */
export function computePRs(data: AppData): { byKey: Map<string, PRKind>; events: PREvent[] } {
  const byKey = new Map<string, PRKind>();
  const events: PREvent[] = [];
  const running = new Map<string, Running>();
  for (const date of sortedDates(data)) {
    const s = data.sessions[date];
    for (const e of s.entries) {
      const ex = findExercise(e.exId, data.custom);
      if (!ex || ex.type === "time") continue;
      const weighted = isWeighted(ex);
      const key = weighted ? `${ex.id}|${e.unit}` : ex.id;
      e.sets.forEach((set, idx) => {
        if (!set.done) return;
        let b = running.get(key);
        let kind: PRKind | undefined;
        if (weighted) {
          if (set.w === undefined || set.r === undefined) return;
          if (!b) {
            running.set(key, { baseline: date, w: set.w, rAtW: set.r });
            return;
          }
          if (set.w > (b.w ?? 0)) {
            kind = "weight";
            b.w = set.w;
            b.rAtW = set.r;
          } else if (set.w === b.w && set.r > (b.rAtW ?? 0)) {
            kind = "reps";
            b.rAtW = set.r;
          }
        } else if (ex.type === "hold") {
          if (set.s === undefined) return;
          if (!b) {
            running.set(key, { baseline: date, s: set.s });
            return;
          }
          if (set.s > (b.s ?? 0)) {
            kind = "hold";
            b.s = set.s;
          }
        } else {
          if (set.r === undefined) return;
          if (!b) {
            running.set(key, { baseline: date, r: set.r });
            return;
          }
          if (set.r > (b.r ?? 0)) {
            kind = "reps";
            b.r = set.r;
          }
        }
        b = running.get(key)!;
        if (kind && date !== b.baseline) {
          byKey.set(prKey(date, e.uid, idx), kind);
          events.push({ date, uid: e.uid, idx, exId: ex.id, unit: e.unit, kind, w: set.w, r: set.r, s: set.s });
        }
      });
    }
  }
  return { byKey, events };
}

export interface ExerciseHistoryPoint {
  date: string;
  top: SetEntry;
  sets: SetEntry[];
  pr: boolean;
}

/** True when set a beats set b: heavier, then more reps at that weight; or a longer hold; or more reps. */
export function isBetter(ex: Exercise, a: SetEntry, b: SetEntry): boolean {
  if (ex.type === "hold") return (a.s ?? 0) > (b.s ?? 0);
  if (ex.type === "time") return (a.m ?? 0) > (b.m ?? 0);
  if (isWeighted(ex)) return (a.w ?? 0) > (b.w ?? 0) || ((a.w ?? 0) === (b.w ?? 0) && (a.r ?? 0) > (b.r ?? 0));
  return (a.r ?? 0) > (b.r ?? 0);
}

/** The number a progress chart plots for a set: weight, hold seconds, minutes or reps. */
export function metricOf(ex: Exercise, s: SetEntry): number {
  if (ex.type === "hold") return s.s ?? 0;
  if (ex.type === "time") return s.m ?? 0;
  if (isWeighted(ex)) return s.w ?? 0;
  return s.r ?? 0;
}

/** One point per session: the top set (heaviest, then most reps; or longest hold). */
export function exerciseHistory(
  data: AppData,
  exId: string,
  unit: Unit,
  prs: Map<string, PRKind>,
): ExerciseHistoryPoint[] {
  const ex = findExercise(exId, data.custom);
  if (!ex) return [];
  const weighted = isWeighted(ex);
  const out: ExerciseHistoryPoint[] = [];
  for (const date of sortedDates(data)) {
    for (const e of data.sessions[date].entries) {
      if (e.exId !== exId || (weighted && e.unit !== unit)) continue;
      const done = e.sets.filter((x) => x.done);
      if (!done.length) continue;
      const top = done.reduce((best, x) => (isBetter(ex, x, best) ? x : best));
      const pr = e.sets.some((_, i) => prs.has(prKey(date, e.uid, i)));
      out.push({ date, top, sets: done, pr });
    }
  }
  return out;
}

export interface LoggedExercise {
  exId: string;
  unit: Unit;
  lastDate: string;
  sessions: number;
}

export function loggedExercises(data: AppData): LoggedExercise[] {
  const map = new Map<string, LoggedExercise>();
  for (const date of sortedDates(data)) {
    for (const e of data.sessions[date].entries) {
      const ex = findExercise(e.exId, data.custom);
      if (!ex || ex.type === "time" || !e.sets.some((x) => x.done)) continue;
      const key = isWeighted(ex) ? `${e.exId}|${e.unit}` : e.exId;
      const cur = map.get(key);
      if (cur) {
        cur.lastDate = date;
        cur.sessions += 1;
      } else map.set(key, { exId: e.exId, unit: e.unit, lastDate: date, sessions: 1 });
    }
  }
  return [...map.values()].sort((a, b) => (a.lastDate < b.lastDate ? 1 : -1));
}

/* ---------- schedule, streaks, calendar ---------- */

export function trainingKeys(data: AppData): DayKey[] {
  return WEEK_ORDER.filter((k) => !data.plan[k].rest);
}

/** weekStartKey -> set of plan days completed during that week (by any date in it). */
export function completedSlots(data: AppData): Map<string, Set<DayKey>> {
  const map = new Map<string, Set<DayKey>>();
  for (const date of sortedDates(data)) {
    const s = data.sessions[date];
    if (!isComplete(s)) continue;
    const wk = toKey(weekStart(fromKey(date)));
    if (!map.has(wk)) map.set(wk, new Set());
    map.get(wk)!.add(s.dayKey);
  }
  return map;
}

export function firstTrackedDate(data: AppData): string | undefined {
  return sortedDates(data)[0];
}

/**
 * Streak = consecutive scheduled sessions completed, counting back from today. Rest days never break it,
 * and a day missed this week only counts as missed once the week is over, since it can still be made up.
 */
export function streaks(data: AppData, now: Date): { current: number; best: number } {
  const first = firstTrackedDate(data);
  if (!first) return { current: 0, best: 0 };
  const done = completedSlots(data);
  const keys = trainingKeys(data);
  const todayKey = toKey(now);
  const thisWeek = toKey(weekStart(now));
  const statuses: ("done" | "missed" | "pending")[] = [];
  for (let ws = weekStart(fromKey(first)); ws <= now; ws = addDays(ws, 7)) {
    const wsKey = toKey(ws);
    for (const k of keys) {
      const date = addDays(ws, WEEK_ORDER.indexOf(k));
      const dk = toKey(date);
      if (dk < first) continue;
      if (dk > todayKey) break;
      const isDone = done.get(wsKey)?.has(k) ?? false;
      statuses.push(isDone ? "done" : wsKey === thisWeek ? "pending" : "missed");
    }
  }
  let best = 0;
  let run = 0;
  for (const st of statuses) {
    if (st === "done") {
      run += 1;
      best = Math.max(best, run);
    } else if (st === "missed") run = 0;
  }
  let current = 0;
  for (let i = statuses.length - 1; i >= 0; i--) {
    if (statuses[i] === "pending") continue;
    if (statuses[i] === "done") current += 1;
    else break;
  }
  return { current, best };
}

export type DayStatus = "done" | "partial" | "missed" | "rest" | "today" | "upcoming" | "untracked";

export function dayStatus(data: AppData, date: Date, now: Date, done = completedSlots(data)): DayStatus {
  const key = toKey(date);
  const s = data.sessions[key];
  if (isComplete(s)) return "done";
  const todayKey = toKey(now);
  const dk = dayKeyOf(date);
  if (key === todayKey) return isStarted(s) ? "partial" : data.plan[dk].rest ? "rest" : "today";
  if (key > todayKey) return data.plan[dk].rest ? "rest" : "upcoming";
  if (isStarted(s)) return "partial";
  if (data.plan[dk].rest) return "rest";
  const first = firstTrackedDate(data);
  if (!first || key < first) return "untracked";
  const caughtUp = done.get(toKey(weekStart(date)))?.has(dk);
  return caughtUp ? "untracked" : "missed";
}

/** Earlier training days this week with no completed session, most recent first. */
export function missedThisWeek(data: AppData, now: Date): DayKey[] {
  const ws = weekStart(now);
  const done = completedSlots(data).get(toKey(ws));
  const first = firstTrackedDate(data);
  const out: DayKey[] = [];
  for (const k of WEEK_ORDER) {
    const date = addDays(ws, WEEK_ORDER.indexOf(k));
    if (toKey(date) >= toKey(now)) break;
    if (data.plan[k].rest) continue;
    if (first && toKey(date) < first) continue;
    if (done?.has(k)) continue;
    if (Object.values(data.sessions).some((s) => s.dayKey === k && toKey(weekStart(fromKey(s.date))) === toKey(ws) && isStarted(s))) continue;
    out.push(k);
  }
  return out.reverse();
}

export function weekSummary(data: AppData, ws: Date) {
  const keys = trainingKeys(data);
  const done = completedSlots(data).get(toKey(ws)) ?? new Set<DayKey>();
  let sets = 0;
  let minutes = 0;
  for (let i = 0; i < 7; i++) {
    const s = data.sessions[toKey(addDays(ws, i))];
    if (!s) continue;
    sets += doneSetCount(s);
    if (s.startedAt && s.finishedAt) minutes += (s.finishedAt - s.startedAt) / 60000;
  }
  return { scheduled: keys.length, done: keys.filter((k) => done.has(k)).length, sets, minutes: Math.round(minutes) };
}

/* ---------- muscles ---------- */

/** Weighted set count per muscle: primary muscles count 1 per set, secondary 0.5. */
export function muscleSets(data: AppData, from: Date, to: Date): Partial<Record<Muscle, number>> {
  const out: Partial<Record<Muscle, number>> = {};
  const fromK = toKey(from);
  const toK = toKey(to);
  for (const date of sortedDates(data)) {
    if (date < fromK || date > toK) continue;
    for (const e of data.sessions[date].entries) {
      const ex = findExercise(e.exId, data.custom);
      if (!ex || ex.type === "time") continue;
      const n = e.sets.filter((x) => x.done).length;
      if (!n) continue;
      for (const m of ex.primary) out[m] = (out[m] ?? 0) + n;
      for (const m of ex.secondary) out[m] = (out[m] ?? 0) + n * 0.5;
    }
  }
  return out;
}

/** Primary = 1, secondary = 0.5, for showing what a day or exercise works. */
export function muscleFocus(exercises: (Exercise | undefined)[]): Partial<Record<Muscle, number>> {
  const out: Partial<Record<Muscle, number>> = {};
  for (const ex of exercises) {
    if (!ex) continue;
    for (const m of ex.secondary) out[m] = Math.max(out[m] ?? 0, 0.5);
  }
  for (const ex of exercises) {
    if (!ex) continue;
    for (const m of ex.primary) out[m] = 1;
  }
  return out;
}

export function dayMuscles(data: AppData, day: PlanDay): Muscle[] {
  const focus = muscleFocus(day.items.map((i) => findExercise(i.exId, data.custom)));
  return (Object.keys(focus) as Muscle[]).filter((m) => focus[m] === 1);
}

/* ---------- estimates ---------- */

export function estimateMinutes(data: AppData, items: { exId: string; sets: number; min: number; max: number; rest: number }[]): number {
  let sec = 0;
  for (const it of items) {
    const ex = findExercise(it.exId, data.custom);
    if (!ex) continue;
    if (ex.type === "time") sec += ((it.min + it.max) / 2) * 60;
    else if (ex.type === "hold") sec += it.sets * ((it.min + it.max) / 2 + it.rest + 15) * (ex.perSide ? 2 : 1);
    else sec += it.sets * (40 * (ex.perSide ? 2 : 1) + it.rest);
  }
  return Math.max(5, Math.round(sec / 60 / 5) * 5);
}
