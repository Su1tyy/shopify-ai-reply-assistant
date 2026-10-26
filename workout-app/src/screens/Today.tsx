import { WeekStrip } from "../components/Calendar";
import { Chip, ScreenHeader } from "../components/ui";
import { fmtDayMonth, fmtWeekday, toKey, today } from "../lib/dates";
import { prefersReducedMotion } from "../lib/feedback";
import { useNav } from "../lib/nav";
import { PREVIEW } from "../lib/store";
import { SessionView } from "./SessionView";

export function TodayScreen() {
  const { push } = useNav();
  const now = today();
  const key = toKey(now);
  return (
    <>
      <ScreenHeader
        title="Today"
        eyebrow={
          <div className="flex items-center gap-2">
            <span className="eyebrow">
              {fmtWeekday(now)} {fmtDayMonth(now)}
            </span>
            {PREVIEW && <Chip tone="accent">Preview</Chip>}
          </div>
        }
      />
      <div className="space-y-6">
        <div className="px-4">
          <WeekStrip
            onSelect={(k) =>
              k === key ? window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" }) : push({ name: "day", date: k })
            }
          />
        </div>
        <SessionView date={key} />
      </div>
    </>
  );
}
