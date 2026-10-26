import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { DayKey, Unit } from "./types";

export type Tab = "today" | "week" | "progress" | "plan";

export type Route =
  | { name: "day"; date: string }
  | { name: "exercise"; exId: string; unit: Unit }
  | { name: "dayEditor"; key: DayKey }
  | { name: "itemEditor"; key: DayKey; uid: string }
  | { name: "credits" };

export interface StackItem {
  id: number;
  route: Route;
  leaving?: boolean;
}

interface NavApi {
  tab: Tab;
  stacks: Record<Tab, StackItem[]>;
  setTab: (t: Tab) => void;
  push: (r: Route) => void;
  pop: () => void;
  focusDate: string | null;
  openFocus: (date: string) => void;
  closeFocus: () => void;
}

const Ctx = createContext<NavApi | null>(null);
const LEAVE_MS = 380;

export function NavProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<Tab>("today");
  const [stacks, setStacks] = useState<Record<Tab, StackItem[]>>({ today: [], week: [], progress: [], plan: [] });
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const nextId = useRef(1);
  const scrollMemo = useRef<Record<Tab, number>>({ today: 0, week: 0, progress: 0, plan: 0 });

  const popIn = useCallback((t: Tab) => {
    setStacks((st) => {
      const list = st[t];
      const top = [...list].reverse().find((x) => !x.leaving);
      if (!top) return st;
      window.setTimeout(() => {
        setStacks((s2) => ({ ...s2, [t]: s2[t].filter((x) => x.id !== top.id) }));
      }, LEAVE_MS);
      return { ...st, [t]: list.map((x) => (x.id === top.id ? { ...x, leaving: true } : x)) };
    });
  }, []);

  const setTab = useCallback(
    (t: Tab) => {
      if (t === tab) {
        // Tapping the active tab returns to its root, like iOS.
        setStacks((st) => ({ ...st, [t]: [] }));
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      scrollMemo.current[tab] = window.scrollY;
      setTabState(t);
      requestAnimationFrame(() => window.scrollTo(0, scrollMemo.current[t] ?? 0));
    },
    [tab],
  );

  const push = useCallback(
    (route: Route) => {
      const id = nextId.current++;
      setStacks((st) => ({ ...st, [tab]: [...st[tab], { id, route }] }));
    },
    [tab],
  );

  const pop = useCallback(() => popIn(tab), [popIn, tab]);

  const value = useMemo<NavApi>(
    () => ({
      tab,
      stacks,
      setTab,
      push,
      pop,
      focusDate,
      openFocus: (d) => setFocusDate(d),
      closeFocus: () => setFocusDate(null),
    }),
    [tab, stacks, setTab, push, pop, focusDate],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNav(): NavApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useNav outside NavProvider");
  return v;
}
