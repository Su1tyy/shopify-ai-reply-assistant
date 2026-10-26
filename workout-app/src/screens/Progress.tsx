import { Fire, ListBullets, Sparkle } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { BodyMap, HEAT_STEPS } from "../components/BodyMap";
import { MonthCalendar } from "../components/Calendar";
import { LineChart, Sparkline, type ChartPoint } from "../components/Chart";
import { Group, PRChip, Row, ScreenHeader, Section, Segmented, StatTile, VideoLink } from "../components/ui";
import { EQUIPMENT_LABEL, isWeighted, MUSCLE_LABEL, MUSCLE_ORDER } from "../data/library";
import { addDays, fmtWeekdayShortDate, fromKey, relativeDay, toKey, today, weekStart } from "../lib/dates";
import { prKindLabel } from "../lib/feedback";
import {
  exerciseHistory,
  fmtNum,
  fmtSet,
  fmtSets,
  isBetter,
  loggedExercises,
  metricOf,
  muscleFocus,
  muscleSets,
  streaks,
  weekSummary,
} from "../lib/logic";
import { useNav } from "../lib/nav";
import { useStore } from "../lib/store";
import type { Exercise, Muscle, Unit } from "../lib/types";

function metricUnit(ex: Exercise, unit: Unit): string {
  if (ex.type === "hold") return "s";
  if (ex.type === "time") return "min";
  return isWeighted(ex) ? unit : "reps";
}

export function ProgressScreen() {
  const { data, prs, getEx } = useStore();
  const { push } = useNav();
  const now = today();
  const st = streaks(data, now);
  const sum = weekSummary(data, weekStart(now));
  const weekPRs = prs.events.filter((e) => e.date >= toKey(weekStart(now))).length;

  const [range, setRange] = useState<"this" | "last">("this");
  const [asList, setAsList] = useState(false);
  const ws = weekStart(now);
  const heat = muscleSets(data, range === "this" ? ws : addDays(ws, -7), range === "this" ? now : addDays(ws, -1));
  const trained = MUSCLE_ORDER.filter((m) => (heat[m] ?? 0) > 0).sort((a, b) => (heat[b] ?? 0) - (heat[a] ?? 0));
  const untrained = MUSCLE_ORDER.filter((m) => !(heat[m] ?? 0));

  const exerciseRows = useMemo(
    () =>
      loggedExercises(data).flatMap((l) => {
        const ex = getEx(l.exId);
        if (!ex) return [];
        const hist = exerciseHistory(data, l.exId, l.unit, prs.byKey);
        const best = hist.reduce((b, h) => (isBetter(ex, h.top, b) ? h.top : b), hist[0].top);
        return [{ ...l, ex, best, trend: hist.slice(-10).map((h) => metricOf(ex, h.top)) }];
      }),
    [data, prs, getEx],
  );
  const latestPRs = [...prs.events].reverse().slice(0, 6);

  return (
    <>
      <ScreenHeader title="Progress" />
      <div className="space-y-7">
        <div className="grid grid-cols-3 gap-2 px-4">
          <StatTile
            label="Streak"
            value={
              <span className="inline-flex items-center gap-1">
                {st.current}
                <Fire size={20} weight="fill" className="text-accent" />
              </span>
            }
            detail={`Best ${st.best}`}
          />
          <StatTile label="This week" value={`${sum.done}/${sum.scheduled}`} detail="workouts" />
          <StatTile label="PRs" value={weekPRs} detail="this week" />
        </div>

        <Section title="Calendar">
          <MonthCalendar onSelect={(k) => push({ name: "day", date: k })} />
        </Section>

        <Section
          title="Muscles"
          action={
            <button
              onClick={() => setAsList((v) => !v)}
              className="press inline-flex h-9 items-center gap-1.5 rounded-full px-2 t-foot font-semibold text-accent-strong"
              aria-pressed={asList}
            >
              <ListBullets size={16} weight="bold" />
              {asList ? "Show body" : "Show list"}
            </button>
          }
        >
          <div className="card px-4 pb-4 pt-3">
            <Segmented
              label="Week"
              value={range}
              onChange={setRange}
              options={[
                { value: "this", label: "This week" },
                { value: "last", label: "Last week" },
              ]}
            />
            {asList ? (
              <div className="mt-3">
                {trained.length === 0 && <p className="py-6 text-center t-sub text-ink-2">Nothing logged yet this week.</p>}
                {trained.map((m) => (
                  <div key={m} className="flex items-center justify-between border-b border-line py-2.5 [border-bottom-width:0.5px] last:border-0">
                    <span className="t-body">{MUSCLE_LABEL[m]}</span>
                    <span className="t-sub text-ink-2 tnum">{fmtNum(Math.round((heat[m] ?? 0) * 2) / 2)} sets</span>
                  </div>
                ))}
                {untrained.length > 0 && trained.length > 0 && (
                  <p className="mt-3 t-foot text-ink-3">Not worked: {untrained.map((m) => MUSCLE_LABEL[m]).join(", ")}</p>
                )}
              </div>
            ) : (
              <>
                <BodyMap
                  values={heat}
                  mode="heat"
                  height={250}
                  gap={14}
                  className="mt-4"
                  label={trained.length ? `Most worked: ${trained.slice(0, 4).map((m) => MUSCLE_LABEL[m]).join(", ")}` : "No sets logged"}
                />
                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 t-cap text-ink-2">
                  <span className="font-medium">Sets per muscle</span>
                  {[{ label: "0", color: "var(--body-muscle)" }, ...HEAT_STEPS].map((s) => (
                    <span key={s.label} className="inline-flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color, boxShadow: "inset 0 0 0 0.5px var(--line)" }} />
                      {s.label}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
          <p className="mt-2 px-1 t-foot text-ink-3">Main muscles count a full set, helpers count half.</p>
        </Section>

        <Section title="Personal bests">
          {latestPRs.length === 0 ? (
            <div className="card px-4 py-5 t-sub text-ink-2">Personal bests show up here once you beat your first numbers.</div>
          ) : (
            <Group>
              {latestPRs.map((e) => {
                const ex = getEx(e.exId);
                return (
                  <Row
                    key={`${e.date}-${e.uid}-${e.idx}`}
                    left={
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-strong">
                        <Sparkle size={16} weight="fill" />
                      </span>
                    }
                    title={ex?.name ?? "Exercise"}
                    subtitle={`${ex ? fmtSet({ ...e, done: true }, ex, e.unit) : ""} · ${prKindLabel(e.kind)} · ${relativeDay(fromKey(e.date), now)}`}
                    onClick={ex ? () => push({ name: "exercise", exId: e.exId, unit: e.unit }) : undefined}
                  />
                );
              })}
            </Group>
          )}
        </Section>

        <Section title="Exercises">
          {exerciseRows.length === 0 ? (
            <div className="card px-4 py-5 t-sub text-ink-2">Log a workout and every exercise gets its own progress chart.</div>
          ) : (
            <Group>
              {exerciseRows.map((l) => (
                <Row
                  key={`${l.exId}|${l.unit}`}
                  title={l.ex.name}
                  subtitle={`Best ${fmtSet(l.best, l.ex, l.unit)} · ${relativeDay(fromKey(l.lastDate), now)}`}
                  right={<Sparkline values={l.trend} />}
                  onClick={() => push({ name: "exercise", exId: l.exId, unit: l.unit })}
                />
              ))}
            </Group>
          )}
        </Section>
      </div>
    </>
  );
}

export function ExerciseDetail({ exId, unit, back }: { exId: string; unit: Unit; back: string }) {
  const { data, prs, getEx } = useStore();
  const { push, pop } = useNav();
  const ex = getEx(exId);
  const hist = useMemo(() => (ex ? exerciseHistory(data, exId, unit, prs.byKey) : []), [data, exId, unit, prs, ex]);
  if (!ex) {
    return <ScreenHeader title="Exercise" back={{ label: back, onClick: pop }} subtitle="This exercise is no longer in the library." />;
  }
  const mu = metricUnit(ex, unit);
  const points: ChartPoint[] = hist.map((h) => ({ date: h.date, y: metricOf(ex, h.top), pr: h.pr, label: fmtSet(h.top, ex, unit) }));
  const best = hist.length ? hist.reduce((b, h) => (isBetter(ex, h.top, b.top) ? h : b)) : null;
  const last = hist[hist.length - 1];
  const vals = muscleFocus([ex]);
  const main = MUSCLE_ORDER.filter((m: Muscle) => vals[m] === 1);
  const helpers = MUSCLE_ORDER.filter((m: Muscle) => vals[m] === 0.5);
  const now = today();

  return (
    <>
      <ScreenHeader
        title={ex.name}
        subtitle={`${EQUIPMENT_LABEL[ex.equipment]}${isWeighted(ex) ? ` · ${unit}` : ""}${ex.perSide ? " · each side" : ""}`}
        back={{ label: back, onClick: pop }}
      />
      <div className="space-y-7">
        <div className="grid grid-cols-3 gap-2 px-4">
          <StatTile label="Best" value={best ? fmtNum(metricOf(ex, best.top)) : "–"} detail={best ? fmtSet(best.top, ex, unit) : mu} />
          <StatTile label="Last" value={last ? fmtNum(metricOf(ex, last.top)) : "–"} detail={last ? relativeDay(fromKey(last.date), now) : "Not yet"} />
          <StatTile label="Sessions" value={hist.length} detail="logged" />
        </div>

        <Section title="Top set over time">
          <div className="card px-3 pb-3 pt-4">
            {points.length === 0 ? (
              <p className="px-2 py-8 text-center t-sub text-ink-2">Log this exercise once and the chart starts here.</p>
            ) : (
              <>
                <LineChart
                  points={points}
                  unit={mu}
                  label={`${ex.name}: top set each session, from ${fmtNum(points[0].y)} to ${fmtNum(points[points.length - 1].y)} ${mu}`}
                />
                <div className="mt-2 flex items-center gap-2 px-2 t-cap text-ink-2">
                  <svg width="18" height="18" aria-hidden="true">
                    <circle cx="9" cy="9" r="7.5" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
                    <circle cx="9" cy="9" r="4" fill="var(--accent)" />
                  </svg>
                  Personal best
                  {points.length > 1 && <span className="ml-auto text-ink-3">Touch the chart for details</span>}
                </div>
              </>
            )}
          </div>
        </Section>

        <Section title="What it works">
          <div className="card flex items-center gap-4 px-4 py-4">
            <BodyMap values={vals} height={130} gap={5} label={`Works ${main.map((m) => MUSCLE_LABEL[m]).join(", ")}`} />
            <div className="min-w-0 flex-1 space-y-2">
              {main.length > 0 && (
                <div>
                  <div className="t-cap text-ink-3">Main</div>
                  <div className="t-sub">{main.map((m) => MUSCLE_LABEL[m]).join(", ")}</div>
                </div>
              )}
              {helpers.length > 0 && (
                <div>
                  <div className="t-cap text-ink-3">Also works</div>
                  <div className="t-sub text-ink-2">{helpers.map((m) => MUSCLE_LABEL[m]).join(", ")}</div>
                </div>
              )}
              <VideoLink href={ex.video} />
            </div>
          </div>
        </Section>

        {hist.length > 0 && (
          <Section title="Every session">
            <Group>
              {[...hist].reverse().map((h) => (
                <Row
                  key={h.date}
                  title={fmtWeekdayShortDate(fromKey(h.date))}
                  subtitle={fmtSets(h.sets, ex, unit)}
                  right={h.pr ? <PRChip kind={ex.type === "hold" ? "hold" : "weight"} compact /> : undefined}
                  onClick={() => push({ name: "day", date: h.date })}
                />
              ))}
            </Group>
          </Section>
        )}
      </div>
    </>
  );
}
