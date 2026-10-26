import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { defaultUnit, findExercise } from "../data/library";
import { defaultPlan } from "../data/plan";
import { today } from "./dates";
import { computePRs, createSession, isStarted, prKey, uid } from "./logic";
import { withSampleHistory } from "./sample";
import type { AppData, DayKey, Exercise, PlanDay, PlanItem, PRKind, PREvent, Session, SetEntry, Settings } from "./types";

export const PREVIEW = true;
const STORAGE_KEY = PREVIEW ? "my-training.preview.v1" : "my-training.v1";

export function freshData(): AppData {
  const base: AppData = { v: 1, plan: defaultPlan(), sessions: {}, custom: [], settings: { name: "", sound: false } };
  return PREVIEW ? withSampleHistory(base, today()) : base;
}

function loadLocal(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed && parsed.v === 1 && parsed.plan && parsed.sessions) return parsed;
    }
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  return freshData();
}

export type Action =
  | { type: "replace"; data: AppData }
  | { type: "ensureSession"; date: string; dayKey: DayKey }
  | { type: "switchSession"; date: string; dayKey: DayKey }
  | { type: "discardSession"; date: string; ifEmpty?: boolean }
  | { type: "startClock"; date: string }
  | { type: "updateSet"; date: string; uid: string; idx: number; patch: Partial<SetEntry> }
  | { type: "addSet"; date: string; uid: string }
  | { type: "removeSet"; date: string; uid: string; idx: number }
  | { type: "finish"; date: string }
  | { type: "reopen"; date: string }
  | { type: "sessionNote"; date: string; note: string }
  | { type: "planDay"; key: DayKey; patch: Partial<Omit<PlanDay, "key" | "items">> }
  | { type: "planItem"; key: DayKey; uid: string; patch: Partial<PlanItem> }
  | { type: "addItem"; key: DayKey; exId: string }
  | { type: "insertItem"; key: DayKey; item: PlanItem; index: number }
  | { type: "removeItem"; key: DayKey; uid: string }
  | { type: "moveItem"; key: DayKey; uid: string; dir: -1 | 1 }
  | { type: "swapItem"; key: DayKey; uid: string; exId: string }
  | { type: "addCustom"; ex: Exercise }
  | { type: "settings"; patch: Partial<Settings> };

/** A session with nothing logged is only a placeholder, so rebuild it after a plan edit to match the new plan. */
function refreshPlaceholders(s: AppData, key: DayKey) {
  for (const [date, x] of Object.entries(s.sessions)) {
    if (x.dayKey !== key || x.finishedAt || isStarted(x)) continue;
    if (s.plan[key].rest || !s.plan[key].items.length) delete s.sessions[date];
    else s.sessions[date] = { ...createSession(s, key, date), startedAt: x.startedAt };
  }
}

function reducer(state: AppData, a: Action): AppData {
  if (a.type === "replace") return a.data;
  const s = applyAction(state, a);
  if (s !== state && "key" in a) refreshPlaceholders(s, a.key);
  return s;
}

function applyAction(state: AppData, a: Exclude<Action, { type: "replace" }>): AppData {
  const s: AppData = structuredClone(state);
  const sess = (date: string): Session | undefined => s.sessions[date];
  const entry = (date: string, id: string) => sess(date)?.entries.find((e) => e.uid === id);

  switch (a.type) {
    case "ensureSession":
      if (!s.sessions[a.date]) s.sessions[a.date] = createSession(s, a.dayKey, a.date);
      return s;
    case "switchSession":
      s.sessions[a.date] = createSession(s, a.dayKey, a.date);
      return s;
    case "discardSession": {
      const x = sess(a.date);
      if (!x || (a.ifEmpty && (isStarted(x) || x.finishedAt))) return state;
      delete s.sessions[a.date];
      return s;
    }
    case "startClock": {
      const x = sess(a.date);
      if (x && !x.startedAt) x.startedAt = Date.now();
      return s;
    }
    case "updateSet": {
      const e = entry(a.date, a.uid);
      if (!e || !e.sets[a.idx]) return state;
      e.sets[a.idx] = { ...e.sets[a.idx], ...a.patch };
      const x = sess(a.date)!;
      if (a.patch.done && !x.startedAt) x.startedAt = Date.now();
      return s;
    }
    case "addSet": {
      const e = entry(a.date, a.uid);
      if (!e) return state;
      const last = e.sets[e.sets.length - 1];
      e.sets.push({ ...(last ?? {}), done: false, at: undefined });
      return s;
    }
    case "removeSet": {
      const e = entry(a.date, a.uid);
      if (!e || e.sets.length <= 1) return state;
      e.sets.splice(a.idx, 1);
      return s;
    }
    case "finish": {
      const x = sess(a.date);
      if (x) {
        x.finishedAt = Date.now();
        if (!x.startedAt) x.startedAt = x.finishedAt;
      }
      return s;
    }
    case "reopen": {
      const x = sess(a.date);
      if (x) x.finishedAt = undefined;
      return s;
    }
    case "sessionNote": {
      const x = sess(a.date);
      if (x) x.note = a.note;
      return s;
    }
    case "planDay":
      Object.assign(s.plan[a.key], a.patch);
      return s;
    case "planItem": {
      const it = s.plan[a.key].items.find((i) => i.uid === a.uid);
      if (it) Object.assign(it, a.patch);
      return s;
    }
    case "addItem": {
      const ex = findExercise(a.exId, s.custom);
      if (!ex) return state;
      const item: PlanItem =
        ex.type === "time"
          ? { uid: uid(), exId: ex.id, sets: 1, min: 15, max: 20, unit: "kg", rest: 0 }
          : ex.type === "hold"
            ? { uid: uid(), exId: ex.id, sets: 3, min: 30, max: 45, unit: "kg", rest: 45 }
            : { uid: uid(), exId: ex.id, sets: 3, min: 10, max: 12, unit: defaultUnit(ex.equipment), rest: 60 };
      s.plan[a.key].items.push(item);
      if (s.plan[a.key].rest) s.plan[a.key].rest = false;
      return s;
    }
    case "insertItem":
      s.plan[a.key].items.splice(a.index, 0, a.item);
      return s;
    case "removeItem":
      s.plan[a.key].items = s.plan[a.key].items.filter((i) => i.uid !== a.uid);
      return s;
    case "moveItem": {
      const items = s.plan[a.key].items;
      const i = items.findIndex((x) => x.uid === a.uid);
      const j = i + a.dir;
      if (i < 0 || j < 0 || j >= items.length) return state;
      [items[i], items[j]] = [items[j], items[i]];
      return s;
    }
    case "swapItem": {
      const it = s.plan[a.key].items.find((i) => i.uid === a.uid);
      const ex = findExercise(a.exId, s.custom);
      if (!it || !ex) return state;
      it.exId = ex.id;
      it.unit = defaultUnit(ex.equipment);
      if (ex.type === "time") Object.assign(it, { sets: 1, min: 15, max: 20, rest: 0 });
      else if (ex.type === "hold") Object.assign(it, { min: 30, max: 45 });
      return s;
    }
    case "addCustom":
      s.custom.push(a.ex);
      return s;
    case "settings":
      Object.assign(s.settings, a.patch);
      return s;
  }
}

interface Store {
  data: AppData;
  dispatch: (a: Action) => void;
  prs: { byKey: Map<string, PRKind>; events: PREvent[] };
  getEx: (id: string) => Exercise | undefined;
  /** Logs one set (creating the day's session if needed) and reports whether it is a personal best. */
  logSet: (date: string, dayKey: DayKey, uid: string, idx: number, values: Partial<SetEntry>) => PRKind | undefined;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, loadLocal);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        /* storage full or blocked: keep running in memory */
      }
    }, 250);
  }, [data]);

  const prs = useMemo(() => computePRs(data), [data]);
  const value = useMemo<Store>(() => {
    const logSet: Store["logSet"] = (date, dayKey, id, idx, values) => {
      const ensure: Action = { type: "ensureSession", date, dayKey };
      const update: Action = { type: "updateSet", date, uid: id, idx, patch: { ...values, done: true, at: Date.now() } };
      const next = reducer(reducer(data, ensure), update);
      if (!data.sessions[date]) dispatch(ensure);
      dispatch(update);
      return computePRs(next).byKey.get(prKey(date, id, idx));
    };
    return { data, dispatch, prs, getEx: (id) => findExercise(id, data.custom), logSet };
  }, [data, prs]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}

export function resetStorage(): AppData {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return freshData();
}
