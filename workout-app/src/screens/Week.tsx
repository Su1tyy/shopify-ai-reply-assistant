import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { DayMark, MarkLegend } from "../components/Calendar";
import { Group, IconButton, ProgressRing, ScreenHeader, Section } from "../components/ui";
import { DAY_NAME, DAY_SHORT, WEEK_ORDER } from "../data/plan";
import {
  addDays,
  daysBetween,
  fmtDayMonth,
  fmtDuration,
  fmtRange,
  fmtShortDate,
  fmtWeekday,
  fromKey,
  relativeLabel,
  toKey,
  today,
  weekStart,
} from "../lib/dates";
import {
  completedSlots,
  dayStatus,
  doneSetCount,
  estimateMinutes,
  firstTrackedDate,
  totalSetCount,
  weekSummary,
  type DayStatus,
} from "../lib/logic";
import { useNav } from "../lib/nav";
import { useStore } from "../lib/store";
import type { AppData, DayKey, Session } from "../lib/types";
import { SessionView } from "./SessionView";

function rowSubtitle(data: AppData, st: DayStatus, s: Session | undefined, k: DayKey, slotsDone: boolean): string {
  const p = data.plan[s?.dayKey ?? k];
  const moved = s && s.dayKey !== k ? `${DAY_NAME[s.dayKey]}'s workout · ` : "";
  switch (st) {
    case "done": {
      const mins = s?.finishedAt && s.startedAt ? `${fmtDuration((s.finishedAt - s.startedAt) / 60000)} · ` : "";
      return `${moved}Done · ${mins}${s ? doneSetCount(s) : 0} sets`;
    }
    case "partial":
      return `${moved}Started · ${s ? `${doneSetCount(s)} of ${totalSetCount(s)} sets` : ""}`;
    case "missed":
      return "Missed";
    case "rest":
      return "Recovery";
    case "today":
      return `${moved}Today · ${p.items.length} exercises`;
    case "upcoming":
      return `${p.items.length} exercises · about ${estimateMinutes(data, p.items)} min`;
    default:
      return slotsDone ? "Made up on another day" : "Not tracked";
  }
}

export function WeekScreen() {
  const { data } = useStore();
  const { push } = useNav();
  const now = today();
  const [offset, setOffset] = useState(0);
  const ws = addDays(weekStart(now), offset * 7);
  const we = addDays(ws, 6);
  const sum = weekSummary(data, ws);
  const done = useMemo(() => completedSlots(data), [data]);
  const first = firstTrackedDate(data);
  const minOffset = first ? -Math.round(daysBetween(weekStart(fromKey(first)), weekStart(now)) / 7) : 0;
  const allDone = sum.scheduled > 0 && sum.done === sum.scheduled;

  return (
    <>
      <ScreenHeader title="Week" subtitle={offset === 0 ? `This week · ${fmtRange(ws, we)}` : offset === 1 ? `Next week · ${fmtRange(ws, we)}` : fmtRange(ws, we)} />
      <div className="space-y-6">
        <div className="px-4">
          <div className="card flex items-center gap-4 py-4 pl-4 pr-2">
            <ProgressRing value={sum.scheduled ? sum.done / sum.scheduled : 0} size={60} stroke={6}>
              <span className="t-sub font-semibold tnum">
                {sum.done}/{sum.scheduled}
              </span>
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <div className="t-headline">{allDone ? "Every workout done" : `${sum.done} of ${sum.scheduled} workouts`}</div>
              <div className="mt-0.5 t-foot text-ink-2">
                {sum.sets} sets · {fmtDuration(sum.minutes)}
              </div>
            </div>
            <div className="flex">
              <IconButton
                label="Previous week"
                disabled={offset <= minOffset}
                onClick={() => setOffset((o) => o - 1)}
                className="text-accent-strong disabled:text-ink-3 disabled:opacity-40"
              >
                <CaretLeft size={20} weight="bold" />
              </IconButton>
              <IconButton
                label="Next week"
                disabled={offset >= 1}
                onClick={() => setOffset((o) => o + 1)}
                className="text-accent-strong disabled:text-ink-3 disabled:opacity-40"
              >
                <CaretRight size={20} weight="bold" />
              </IconButton>
            </div>
          </div>
        </div>

        <Section>
          <Group>
            {WEEK_ORDER.map((k, i) => {
              const d = addDays(ws, i);
              const key = toKey(d);
              const s = data.sessions[key];
              const st = dayStatus(data, d, now, done);
              const p = data.plan[s?.dayKey ?? k];
              const isToday = key === toKey(now);
              const title = s ? s.title : p.rest ? "Rest day" : p.title;
              return (
                <button
                  key={k}
                  onClick={() => push({ name: "day", date: key })}
                  className="press hover-fill group relative flex w-full items-center gap-3 px-4 py-2.5 text-left"
                  aria-label={`${DAY_NAME[k]} ${fmtDayMonth(d)}: ${title}`}
                >
                  <span className="absolute left-16 right-0 top-0 h-[0.5px] bg-line group-first:hidden" />
                  <div className="flex w-9 shrink-0 flex-col items-center">
                    <span className="t-cap font-medium text-ink-3">{DAY_SHORT[k]}</span>
                    <span
                      className={`mt-0.5 grid h-8 w-8 place-items-center rounded-full text-[17px] font-semibold tnum ${
                        isToday ? "bg-btn text-btn-fg" : st === "upcoming" ? "text-ink-2" : ""
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate t-body ${p.rest && !s ? "text-ink-2" : ""}`}>{title}</div>
                    <div className="mt-0.5 truncate t-foot text-ink-2">
                      {rowSubtitle(data, st, s, k, !!done.get(toKey(ws))?.has(k))}
                    </div>
                  </div>
                  <DayMark status={st} size={10} />
                  <CaretRight size={16} weight="bold" className="shrink-0 text-ink-3" />
                </button>
              );
            })}
          </Group>
          <div className="mt-3 px-1">
            <MarkLegend />
          </div>
          {offset !== 0 && (
            <button onClick={() => setOffset(0)} className="press mt-3 h-11 px-1 t-sub font-semibold text-accent-strong">
              Back to this week
            </button>
          )}
        </Section>
      </div>
    </>
  );
}

export function DayPage({ date, back }: { date: string; back: string }) {
  const { pop } = useNav();
  const d = fromKey(date);
  const rel = relativeLabel(d, today());
  return (
    <>
      <ScreenHeader
        title={fmtWeekday(d)}
        subtitle={rel === fmtShortDate(d) ? fmtDayMonth(d) : `${fmtDayMonth(d)} · ${rel}`}
        back={{ label: back, onClick: pop }}
      />
      <SessionView date={date} />
    </>
  );
}
