import { Timer } from "@phosphor-icons/react";
import { fmtClock } from "../lib/dates";
import { useRest } from "../lib/rest";

/** Floating rest countdown. Sits above the tab bar, or above the workout's action bar in focus mode. */
export function RestDock({ placement }: { placement: "tabs" | "focus" }) {
  const { rest, remaining, extend, skip } = useRest();
  if (!rest) return null;
  const over = remaining <= 0;
  const pct = rest.total ? Math.max(0, Math.min(1, remaining / rest.total)) : 0;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 px-3"
      style={{
        zIndex: placement === "tabs" ? 45 : 65,
        bottom:
          placement === "tabs"
            ? "calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 10px)"
            : "calc(env(safe-area-inset-bottom) + 86px)",
      }}
      role="timer"
      aria-live="off"
    >
      <div className="col dock-in material pointer-events-auto relative flex h-16 items-center gap-3 overflow-hidden rounded-[20px] pl-4 pr-2 shadow-[0_10px_30px_rgba(0,0,0,0.12)] ring-1 ring-line">
        <Timer size={22} weight="fill" className="shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <div className="truncate t-cap text-ink-2">{over ? "Rest over" : `Rest · ${rest.label}`}</div>
          <div className="text-[24px] font-semibold leading-7 tnum">{over ? "Next set" : fmtClock(Math.ceil(remaining))}</div>
        </div>
        {!over && (
          <>
            <button onClick={() => extend(15)} className="press btn-secondary h-10 px-3">
              +15 s
            </button>
            <button onClick={skip} className="press btn-secondary h-10 px-3">
              Skip
            </button>
          </>
        )}
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-accent-soft">
          <div className="h-full bg-accent" style={{ width: `${pct * 100}%`, transition: "width 250ms linear" }} />
        </div>
      </div>
    </div>
  );
}
