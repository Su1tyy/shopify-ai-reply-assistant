import {
  ArrowsClockwise,
  Barbell,
  CalendarBlank,
  Check,
  Clock,
  MoonStars,
  PencilSimple,
  Play,
  Trash,
} from "@phosphor-icons/react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { BodyMap } from "../components/BodyMap";
import { EntryCard } from "../components/EntryCard";
import { Chip, Group, ProgressRing, Row, Section } from "../components/ui";
import { MUSCLE_LABEL, MUSCLE_ORDER } from "../data/library";
import { DAY_NAME } from "../data/plan";
import { addDays, dayKeyOf, fmtDuration, fmtWeekday, fromKey, toKey, today, weekStart } from "../lib/dates";
import { prefersReducedMotion } from "../lib/feedback";
import {
  createSession,
  doneSetCount,
  estimateMinutes,
  fmtTarget,
  isStarted,
  missedThisWeek,
  muscleFocus,
  totalSetCount,
  weekSummary,
} from "../lib/logic";
import { useNav } from "../lib/nav";
import { unlockAudio } from "../lib/rest";
import { useStore } from "../lib/store";
import type { DayKey, Muscle, Session } from "../lib/types";

// The week whose catch-up banner was dismissed, so it stays hidden while switching tabs.
let dismissedCatchUp: string | null = null;

/** Everything about one calendar day: today's workout, a past log, a future plan, or a rest day. */
export function SessionView({ date }: { date: string }) {
  const { data, dispatch, getEx } = useStore();
  const nav = useNav();
  const now = today();
  const todayKey = toKey(now);
  const d = fromKey(date);
  const isToday = date === todayKey;
  const isFuture = date > todayKey;
  const real = data.sessions[date];
  const dayKey: DayKey = real?.dayKey ?? dayKeyOf(d);
  const plan = data.plan[dayKey];

  // Today's workout is shown (and loggable) before anything is saved; the first tick creates the session.
  const virtual = useMemo(
    () => (!real && isToday && !plan.rest && plan.items.length ? createSession(data, dayKey, date) : undefined),
    [real, isToday, plan, data, dayKey, date],
  );
  const session = real ?? virtual;

  const [openUid, setOpenUid] = useState<string | null>(null);
  const [catchUpHidden, setCatchUpHidden] = useState(() => dismissedCatchUp === toKey(weekStart(now)));
  const entriesRef = useRef(session?.entries ?? []);
  entriesRef.current = session?.entries ?? [];

  const required = session?.entries.filter((e) => !e.optional) ?? [];
  const requiredLeft = required.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0);

  const start = () => {
    unlockAudio();
    dispatch({ type: "ensureSession", date, dayKey });
    dispatch({ type: "startClock", date });
    nav.openFocus(date);
  };
  const finish = () => {
    dispatch({ type: "finish", date });
    nav.openFocus(date);
  };

  const swapToday = (k: DayKey) => {
    const before = data;
    dispatch({ type: "switchSession", date: todayKey, dayKey: k });
    toast(`Today is ${DAY_NAME[k]}'s workout now`, {
      action: { label: "Undo", onClick: () => dispatch({ type: "replace", data: before }) },
    });
  };

  const advanceFrom = (i: number) => {
    window.setTimeout(() => {
      const list = entriesRef.current;
      const next = list.findIndex((e, j) => j > i && e.sets.some((x) => !x.done));
      if (next >= 0) {
        setOpenUid(list[next].uid);
        requestAnimationFrame(() =>
          document
            .getElementById(`entry-${list[next].uid}`)
            ?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" }),
        );
        return;
      }
      setOpenUid(null);
      const left = list.filter((e) => !e.optional).some((e) => e.sets.some((x) => !x.done));
      if (!left) toast("Every set is logged", { action: { label: "Finish", onClick: finish } });
    }, 380);
  };

  const todaySession = data.sessions[todayKey];
  const missed =
    isToday && !isStarted(real) ? missedThisWeek(data, now).filter((k) => k !== real?.dayKey) : [];
  const swapped = !!real && real.dayKey !== dayKeyOf(d);

  let card: ReactNode;
  if (!session && plan.rest) card = <RestCard date={date} />;
  else if (!session && isFuture) card = <HeroCard date={date} dayKey={dayKey} isFuture onStart={start} onFinish={finish} />;
  else if (!session)
    card = (
      <MissedCard
        title={plan.title}
        onLogNow={() => dispatch({ type: "ensureSession", date, dayKey })}
        onDoToday={
          toKey(weekStart(d)) === toKey(weekStart(now)) && !isStarted(todaySession)
            ? () => {
                swapToday(dayKey);
                nav.setTab("today");
              }
            : undefined
        }
      />
    );
  else card = <HeroCard date={date} dayKey={dayKey} session={session} swapped={swapped} onStart={start} onFinish={finish} />;

  return (
    <div className="space-y-6">
      {missed.length > 0 && !catchUpHidden && (
        <div className="px-4">
          <CatchUp
            missed={missed}
            restToday={!real && plan.rest}
            onPick={swapToday}
            onDismiss={() => {
              dismissedCatchUp = toKey(weekStart(now));
              setCatchUpHidden(true);
            }}
          />
        </div>
      )}

      <div className="px-4">
        {card}
        {isToday && swapped && real && !isStarted(real) && (
          <button
            onClick={() => {
              const own = dayKeyOf(d);
              if (data.plan[own].rest) dispatch({ type: "discardSession", date });
              else dispatch({ type: "switchSession", date, dayKey: own });
            }}
            className="press mx-auto mt-2 block h-11 px-3 t-foot font-semibold text-accent-strong"
          >
            {data.plan[dayKeyOf(d)].rest ? "Rest today instead" : `Switch back to ${DAY_NAME[dayKeyOf(d)]}'s plan`}
          </button>
        )}
      </div>

      {session && (
        <Section
          title="Exercises"
          action={
            <span className="t-foot text-ink-2 tnum">
              {doneSetCount(session)} of {totalSetCount(session)} sets
            </span>
          }
        >
          <div className="space-y-2.5">
            {session.entries.map((e, i) => (
              <EntryCard
                key={e.uid}
                date={date}
                dayKey={dayKey}
                entry={e}
                open={openUid === e.uid}
                onToggle={() => setOpenUid((o) => (o === e.uid ? null : e.uid))}
                onExerciseDone={() => advanceFrom(i)}
                requiredLeft={requiredLeft}
              />
            ))}
          </div>
        </Section>
      )}

      {!session && isFuture && !plan.rest && (
        <Section title="Exercises">
          <Group>
            {plan.items.map((it, i) => {
              const ex = getEx(it.exId);
              return (
                <Row
                  key={it.uid}
                  left={<span className="w-5 shrink-0 text-center t-sub font-semibold text-ink-3 tnum">{i + 1}</span>}
                  title={ex?.name ?? "Unknown exercise"}
                  subtitle={`${fmtTarget(it, ex)}${it.optional ? " · optional" : ""}`}
                  onClick={ex && ex.type !== "time" ? () => nav.push({ name: "exercise", exId: ex.id, unit: it.unit }) : undefined}
                />
              );
            })}
          </Group>
        </Section>
      )}

      {real && (isStarted(real) || real.finishedAt) && (
        <Section title="Notes">
          <textarea
            key={date}
            defaultValue={real.note ?? ""}
            onBlur={(e) => {
              if (e.target.value !== (real.note ?? "")) dispatch({ type: "sessionNote", date, note: e.target.value });
            }}
            rows={3}
            placeholder="How did it feel? Anything to remember next time?"
            className="card block w-full resize-none p-4 t-body outline-none placeholder:text-ink-3"
          />
        </Section>
      )}

      <Section>
        <Group>
          <Row
            left={<PencilSimple size={20} className="text-ink-2" />}
            title={`Edit ${DAY_NAME[dayKey]}'s plan`}
            onClick={() => nav.push({ name: "dayEditor", key: dayKey })}
          />
          {real && isStarted(real) && (
            <Row
              left={<Trash size={20} className="text-ink-2" />}
              title="Delete this workout log"
              onClick={() => {
                const before = data;
                dispatch({ type: "discardSession", date });
                toast("Workout log deleted", { action: { label: "Undo", onClick: () => dispatch({ type: "replace", data: before }) } });
              }}
            />
          )}
        </Group>
      </Section>
    </div>
  );
}

function HeroCard({
  date,
  dayKey,
  session,
  isFuture = false,
  swapped = false,
  onStart,
  onFinish,
}: {
  date: string;
  dayKey: DayKey;
  session?: Session;
  isFuture?: boolean;
  swapped?: boolean;
  onStart: () => void;
  onFinish: () => void;
}) {
  const { data, prs, getEx } = useStore();
  const nav = useNav();
  const plan = data.plan[dayKey];
  const items = session
    ? session.entries.map((e) => ({ exId: e.exId, sets: e.sets.length, min: e.min, max: e.max, rest: e.rest }))
    : plan.items;
  const focusVals = muscleFocus(items.map((i) => getEx(i.exId)));
  // Lead with the muscles that get the most sets today.
  const load = new Map<Muscle, number>();
  for (const it of items) getEx(it.exId)?.primary.forEach((m) => load.set(m, (load.get(m) ?? 0) + it.sets));
  const main = MUSCLE_ORDER.filter((m) => focusVals[m] === 1).sort((a, b) => (load.get(b) ?? 0) - (load.get(a) ?? 0));
  const minutes = estimateMinutes(data, items);

  const done = session ? doneSetCount(session) : 0;
  const total = session ? totalSetCount(session) : 0;
  const required = session?.entries.filter((e) => !e.optional) ?? [];
  const allDone = required.length > 0 && required.every((e) => e.sets.every((s) => s.done));
  const finished = !!session?.finishedAt;
  const actual = session?.finishedAt && session.startedAt ? (session.finishedAt - session.startedAt) / 60000 : null;
  const prCount = prs.events.filter((e) => e.date === date).length;

  const title = session?.title ?? plan.title;
  const focus = session?.focus ?? plan.focus;
  const eyebrow = swapped ? `Moved from ${DAY_NAME[dayKey]}` : `${fmtWeekday(fromKey(date))}'s workout`;

  let action: ReactNode;
  if (isFuture) {
    action = (
      <div className="flex items-center gap-2.5 rounded-[14px] bg-fill px-4 py-3 t-foot text-ink-2">
        <CalendarBlank size={18} className="shrink-0" />
        Scheduled. You can log it on the day.
      </div>
    );
  } else if (finished) {
    action = (
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-btn text-btn-fg">
          <Check size={20} weight="bold" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="t-headline">Completed</div>
          <div className="t-foot text-ink-2">
            {done} sets{prCount ? ` · ${prCount} personal best${prCount > 1 ? "s" : ""}` : ""}
          </div>
        </div>
        <button onClick={() => nav.openFocus(date)} className="press btn-secondary">
          Summary
        </button>
      </div>
    );
  } else if (allDone) {
    action = (
      <button onClick={onFinish} className="press btn-primary">
        <Check size={20} weight="bold" />
        Finish workout
      </button>
    );
  } else if (done > 0) {
    action = (
      <div className="flex items-center gap-3">
        <ProgressRing value={done / total} size={52} stroke={5}>
          <span className="t-cap font-semibold tnum">
            {done}/{total}
          </span>
        </ProgressRing>
        <button
          onClick={() => {
            unlockAudio();
            nav.openFocus(date);
          }}
          className="press btn-primary flex-1"
        >
          <Play size={18} weight="fill" />
          Resume workout
        </button>
      </div>
    );
  } else {
    action = (
      <>
        <button onClick={onStart} className="press btn-primary">
          <Play size={18} weight="fill" />
          Start workout
        </button>
        <p className="mt-2 text-center t-cap text-ink-3">Or tick sets off in the list below</p>
      </>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex gap-3 px-5 pt-5">
        <div className="min-w-0 flex-1">
          <div className="eyebrow">{eyebrow}</div>
          <h2 className="mt-1 t-title2">{title}</h2>
          <p className="mt-1 t-sub text-ink-2">{focus}</p>
          {main.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {main.slice(0, 4).map((m) => (
                <Chip key={m} tone="accent">
                  {MUSCLE_LABEL[m]}
                </Chip>
              ))}
            </div>
          )}
        </div>
        {main.length > 0 && (
          <div className="flex shrink-0 flex-col items-center">
            <BodyMap values={focusVals} height={140} gap={5} label={`Works ${main.map((m) => MUSCLE_LABEL[m]).join(", ")}`} />
            <div className="mt-2 flex gap-2.5 t-cap text-ink-2">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-[2px]" style={{ background: "var(--heat-3)" }} />
                Main
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-[2px]" style={{ background: "var(--heat-1)" }} />
                Also
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center gap-4 px-5 t-foot text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <Barbell size={16} />
          {items.length} exercises
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock size={16} />
          {actual ? fmtDuration(actual) : `About ${minutes} min`}
        </span>
      </div>
      <div className="p-4">{action}</div>
    </div>
  );
}

function RestCard({ date }: { date: string }) {
  const { data } = useStore();
  const nav = useNav();
  const d = fromKey(date);
  const now = today();
  const plan = data.plan[dayKeyOf(d)];
  const thisWeek = toKey(weekStart(d)) === toKey(weekStart(now));
  const sum = weekSummary(data, weekStart(d));
  const next = addDays(d, 1);
  const nextPlan = data.plan[dayKeyOf(next)];
  const name = data.settings.name.trim();

  return (
    <div className="space-y-2.5">
      <div className="card px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-strong">
            <MoonStars size={24} weight="fill" />
          </span>
          <div>
            <div className="eyebrow">Rest day</div>
            <h2 className="t-title2">{name ? `Rest up, ${name}` : "Rest and recover"}</h2>
          </div>
        </div>
        <p className="mt-3 t-sub text-ink-2">{plan.focus}</p>
        {thisWeek && (
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 [border-top-width:0.5px]">
            <MiniStat label="Workouts" value={`${sum.done}/${sum.scheduled}`} />
            <MiniStat label="Sets" value={String(sum.sets)} />
            <MiniStat label="Time" value={fmtDuration(sum.minutes)} />
          </div>
        )}
      </div>
      {!nextPlan.rest && (
        <Group>
          <Row
            left={<CalendarBlank size={20} className="text-ink-2" />}
            title={`Next: ${nextPlan.title}`}
            subtitle={DAY_NAME[dayKeyOf(next)]}
            onClick={() => nav.push({ name: "day", date: toKey(next) })}
          />
        </Group>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="t-cap text-ink-2">{label}</div>
      <div className="mt-0.5 t-headline tnum">{value}</div>
    </div>
  );
}

function MissedCard({ title, onLogNow, onDoToday }: { title: string; onLogNow: () => void; onDoToday?: () => void }) {
  return (
    <div className="card px-5 py-5">
      <div className="eyebrow">Not logged</div>
      <h2 className="mt-1 t-title2">{title}</h2>
      <p className="mt-1 t-sub text-ink-2">
        Trained but forgot to log it? Add it now.{onDoToday ? " Missed it? Move it to today." : ""}
      </p>
      <div className="mt-4 flex gap-2">
        <button onClick={onLogNow} className="press btn-secondary h-12 flex-1">
          Log it now
        </button>
        {onDoToday && (
          <button onClick={onDoToday} className="press btn-primary h-12 flex-1">
            Do it today
          </button>
        )}
      </div>
    </div>
  );
}

function CatchUp({
  missed,
  restToday,
  onPick,
  onDismiss,
}: {
  missed: DayKey[];
  restToday: boolean;
  onPick: (k: DayKey) => void;
  onDismiss: () => void;
}) {
  const { data } = useStore();
  const first = missed[0];
  return (
    <div className="card flex gap-3 px-4 py-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-strong">
        <ArrowsClockwise size={18} weight="bold" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="t-headline">Missed {DAY_NAME[first]}?</div>
        <p className="mt-0.5 t-foot text-ink-2">
          {restToday
            ? `Today is a rest day, but you can make up ${DAY_NAME[first]}'s ${data.plan[first].title.toLowerCase()} instead.`
            : `Do ${DAY_NAME[first]}'s ${data.plan[first].title.toLowerCase()} today and keep the week on track.`}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {missed.slice(0, 3).map((k) => (
            <button key={k} onClick={() => onPick(k)} className="press h-9 rounded-full bg-btn px-3.5 t-foot font-semibold text-btn-fg">
              Do {DAY_NAME[k]}'s
            </button>
          ))}
          <button onClick={onDismiss} className="press h-9 rounded-full px-3 t-foot font-semibold text-ink-2">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
