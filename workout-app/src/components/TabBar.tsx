import { CalendarBlank, ChartLineUp, ListChecks, Sun, type Icon } from "@phosphor-icons/react";
import { useNav, type Tab } from "../lib/nav";

export const TABS: { id: Tab; label: string; icon: Icon }[] = [
  { id: "today", label: "Today", icon: Sun },
  { id: "week", label: "Week", icon: CalendarBlank },
  { id: "progress", label: "Progress", icon: ChartLineUp },
  { id: "plan", label: "Plan", icon: ListChecks },
];

export function TabBar() {
  const { tab, setTab } = useNav();
  return (
    <nav
      aria-label="Sections"
      className="material hairline-t fixed inset-x-0 bottom-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="col flex" style={{ height: "var(--tabbar-h)" }}>
        {TABS.map(({ id, label, icon: I }) => {
          const on = id === tab;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={on ? "page" : undefined}
              className={`press press-sm flex flex-1 flex-col items-center justify-center gap-[3px] pt-1 ${
                on ? "text-accent-strong" : "text-ink-3"
              }`}
            >
              <I size={25} weight={on ? "fill" : "regular"} />
              <span className="text-[10.5px] font-semibold leading-3 tracking-[0.01em]">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
