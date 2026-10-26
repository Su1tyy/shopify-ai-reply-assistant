import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { DAY_NAME, DAY_SHORT, WEEK_ORDER } from "../data/plan";
import { addDays, dayKeyOf, fmtDayMonth, fmtMonthYear, fromKey, toKey, today, weekStart } from "../lib/dates";
import { completedSlots, dayStatus, firstTrackedDate, type DayStatus } from "../lib/logic";
import { useStore } from "../lib/store";
import { IconButton } from "./ui";

export const STATUS_LABEL: Record<DayStatus, string> = {
  done: "done",
  partial: "started",
  missed: "missed",
  rest: "rest day",
  today: "today",
  upcoming: "upcoming",
  untracked: "not tracked",
};

/** Shape-coded day mark, so status never depends on colour alone: filled, half, ring, dash. */
export function DayMark({ status, size = 7 }: { status: DayStatus; size?: number }) {
  const box = { width: size, height: size };
  if (status === "done") return <span aria-hidden="true" className="block rounded-full bg-accent" style={box} />;
  if (status === "partial")
    return (
      <span
        aria-hidden="true"
        className="block rounded-full"
        style={{ ...box, background: "linear-gradient(90deg, var(--accent) 50%, transparent 50%)", boxShadow: "inset 0 0 0 1.5px var(--accent)" }}
      />
    );
  if (status === "missed")
    return <span aria-hidden="true" className="block rounded-full" style={{ ...box, boxShadow: "inset 0 0 0 1.5px var(--text-3)" }} />;
  if (status === "rest")
    return (
      <span aria-hidden="true" className="flex items-center" style={box}>
        <span className="block h-[2px] w-full rounded-full bg-ink-3 opacity-60" />
      </span>
    );
  return <span aria-hidden="true" className="block" style={box} />;
}

export function MarkLegend() {
  const items: [DayStatus, string][] = [
    ["done", "Done"],
    ["partial", "Started"],
    ["missed", "Missed"],
    ["rest", "Rest"],
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map(([s, l]) => (
        <span key={s} className="inline-flex items-center gap-1.5 t-cap text-ink-2">
          <DayMark status={s} size={8} />
          {l}
        </span>
      ))}
    </div>
  );
}

/** This week, Saturday to Friday, with today highlighted. */
export function WeekStrip({ onSelect }: { onSelect: (key: string) => void }) {
  const { data } = useStore();
  const now = today();
  const ws = weekStart(now);
  const done = useMemo(() => completedSlots(data), [data]);
  return (
    <div className="card grid grid-cols-7 px-1 py-2">
      {WEEK_ORDER.map((k, i) => {
        const d = addDays(ws, i);
        const key = toKey(d);
        const st = dayStatus(data, d, now, done);
        const isToday = key === toKey(now);
        return (
          <button
            key={k}
            onClick={() => onSelect(key)}
            aria-label={`${DAY_NAME[k]} ${fmtDayMonth(d)}, ${STATUS_LABEL[st]}`}
            className="press flex flex-col items-center gap-1 rounded-[14px] py-1"
          >
            <span className="t-cap font-medium text-ink-3">{DAY_SHORT[k]}</span>
            <span
              className={`grid h-9 w-9 place-items-center rounded-full text-[17px] font-semibold tnum ${
                isToday ? "bg-btn text-btn-fg" : st === "upcoming" ? "text-ink-2" : "text-ink"
              }`}
            >
              {d.getDate()}
            </span>
            <DayMark status={st} />
          </button>
        );
      })}
    </div>
  );
}

/** Month grid laid out in her training weeks (Saturday first), each day marked by status. */
export function MonthCalendar({ onSelect }: { onSelect: (key: string) => void }) {
  const { data } = useStore();
  const now = today();
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const done = useMemo(() => completedSlots(data), [data]);
  const first = firstTrackedDate(data);
  const firstMonth = first ? new Date(fromKey(first).getFullYear(), fromKey(first).getMonth(), 1) : month;
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const offset = (month.getDay() + 1) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <div className="card px-3 pb-4 pt-2">
      <div className="mb-1 flex items-center justify-between pl-2">
        <h3 className="t-headline">{fmtMonthYear(month)}</h3>
        <div className="flex">
          <IconButton label="Previous month" onClick={() => shift(-1)} disabled={month <= firstMonth} className="text-accent-strong disabled:text-ink-3 disabled:opacity-40">
            <CaretLeft size={20} weight="bold" />
          </IconButton>
          <IconButton label="Next month" onClick={() => shift(1)} disabled={month >= thisMonth} className="text-accent-strong disabled:text-ink-3 disabled:opacity-40">
            <CaretRight size={20} weight="bold" />
          </IconButton>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center">
        {WEEK_ORDER.map((k) => (
          <div key={k} className="pb-1 t-cap font-medium text-ink-3">
            {DAY_SHORT[k]}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`b${i}`} />;
          const key = toKey(d);
          const st = dayStatus(data, d, now, done);
          const isToday = key === toKey(now);
          const future = key > toKey(now);
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              aria-label={`${DAY_NAME[dayKeyOf(d)]} ${fmtDayMonth(d)}, ${STATUS_LABEL[st]}`}
              className="press flex flex-col items-center gap-[3px] py-1"
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-[15px] tnum ${
                  isToday ? "bg-btn font-semibold text-btn-fg" : future ? "text-ink-3" : "text-ink"
                }`}
              >
                {d.getDate()}
              </span>
              <DayMark status={st} />
            </button>
          );
        })}
      </div>
      <div className="mt-3 px-2">
        <MarkLegend />
      </div>
    </div>
  );
}
