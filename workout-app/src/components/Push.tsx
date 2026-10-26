import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNav, type Route, type StackItem } from "../lib/nav";
import { BottomSpacer, ScrollRootCtx } from "./ui";

// Screens that already slid in once (so returning to a tab does not replay the animation).
const entered = new Set<number>();

/** The pushed screens of the active tab, each a full-height layer that slides in from the right. */
export function PushLayer({
  render,
  label,
  rootLabel,
}: {
  render: (route: Route, back: string) => ReactNode;
  label: (route: Route) => string;
  rootLabel: string;
}) {
  const { tab, stacks } = useNav();
  const stack = stacks[tab];
  return (
    <>
      {stack.map((item, i) => (
        <PushScreen key={item.id} item={item} depth={i}>
          {render(item.route, i === 0 ? rootLabel : label(stack[i - 1].route))}
        </PushScreen>
      ))}
    </>
  );
}

function PushScreen({ item, depth, children }: { item: StackItem; depth: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(() => entered.has(item.id));

  useEffect(() => {
    if (ready) return;
    entered.add(item.id);
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [ready, item.id]);

  const shown = ready && !item.leaving;
  return (
    <div
      ref={ref}
      data-shown={shown}
      className="push-screen fixed inset-0 overflow-y-auto overscroll-contain bg-bg shadow-[-10px_0_30px_rgba(0,0,0,0.07)]"
      style={{ zIndex: 30 + depth }}
      inert={item.leaving}
    >
      <ScrollRootCtx.Provider value={ref}>
        <div className="col">{children}</div>
        <BottomSpacer />
      </ScrollRootCtx.Provider>
    </div>
  );
}

/** True while any pushed screen covers the tab's root screen. */
export function useCovered(): boolean {
  const { tab, stacks } = useNav();
  return stacks[tab].some((x) => !x.leaving);
}
