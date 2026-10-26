import { useEffect, type CSSProperties, type ReactNode } from "react";
import { Toaster } from "sonner";
import { PushLayer, useCovered } from "./components/Push";
import { RestDock } from "./components/RestDock";
import { TabBar, TABS } from "./components/TabBar";
import { BottomSpacer } from "./components/ui";
import { DAY_NAME } from "./data/plan";
import { fmtWeekday, fromKey } from "./lib/dates";
import { NavProvider, useNav, type Route } from "./lib/nav";
import { RestProvider, useRest } from "./lib/rest";
import { StoreProvider, useStore } from "./lib/store";
import { FocusOverlay } from "./screens/Focus";
import { Credits, DayEditor, ItemEditor, PlanScreen } from "./screens/Plan";
import { ExerciseDetail, ProgressScreen } from "./screens/Progress";
import { TodayScreen } from "./screens/Today";
import { DayPage, WeekScreen } from "./screens/Week";

export default function App() {
  return (
    <StoreProvider>
      <WithRest>
        <NavProvider>
          <Shell />
        </NavProvider>
      </WithRest>
    </StoreProvider>
  );
}

function WithRest({ children }: { children: ReactNode }) {
  const { data } = useStore();
  return <RestProvider sound={data.settings.sound}>{children}</RestProvider>;
}

function Shell() {
  const { data, getEx } = useStore();
  const { tab, focusDate } = useNav();
  const { flashKey } = useRest();
  const covered = useCovered();
  const theme = data.settings.theme ?? "system";

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  const label = (r: Route): string => {
    switch (r.name) {
      case "day":
        return fmtWeekday(fromKey(r.date));
      case "exercise":
        return getEx(r.exId)?.name ?? "Exercise";
      case "dayEditor":
        return DAY_NAME[r.key];
      case "itemEditor": {
        const it = data.plan[r.key].items.find((i) => i.uid === r.uid);
        return (it && getEx(it.exId)?.name) || "Exercise";
      }
      case "credits":
        return "Credits";
    }
  };

  const render = (r: Route, back: string): ReactNode => {
    switch (r.name) {
      case "day":
        return <DayPage date={r.date} back={back} />;
      case "exercise":
        return <ExerciseDetail exId={r.exId} unit={r.unit} back={back} />;
      case "dayEditor":
        return <DayEditor dayKey={r.key} back={back} />;
      case "itemEditor":
        return <ItemEditor dayKey={r.key} itemUid={r.uid} back={back} />;
      case "credits":
        return <Credits back={back} />;
    }
  };

  return (
    <>
      <main className="col" inert={covered || !!focusDate}>
        {tab === "today" && <TodayScreen />}
        {tab === "week" && <WeekScreen />}
        {tab === "progress" && <ProgressScreen />}
        {tab === "plan" && <PlanScreen />}
        <BottomSpacer />
      </main>
      <PushLayer render={render} label={label} rootLabel={TABS.find((t) => t.id === tab)?.label ?? "Back"} />
      {!focusDate && <RestDock placement="tabs" />}
      <TabBar />
      <FocusOverlay />
      {flashKey > 0 && <div key={flashKey} aria-hidden="true" className="rest-flash pointer-events-none fixed inset-0 z-[90]" />}
      <Toaster
        position="top-center"
        theme={theme}
        offset={{ top: "calc(env(safe-area-inset-top) + 10px)" }}
        mobileOffset={{ top: "calc(env(safe-area-inset-top) + 10px)" }}
        toastOptions={{
          classNames: {
            toast: "!rounded-[16px] !shadow-[0_10px_30px_rgba(0,0,0,0.14)]",
            title: "!text-[15px] !font-semibold",
            description: "!text-[13px] !text-ink-2",
            actionButton: "!h-8 !rounded-full !bg-btn !px-3.5 !text-[13px] !font-semibold !text-btn-fg",
          },
        }}
        style={
          {
            "--normal-bg": "var(--surface)",
            "--normal-text": "var(--text)",
            "--normal-border": "var(--line)",
          } as CSSProperties
        }
      />
    </>
  );
}
