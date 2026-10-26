import {
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  CheckCircle,
  Circle,
  Fire,
  Plus,
  Timer,
  X,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { BodyMap } from "../components/BodyMap";
import { Burst } from "../components/Burst";
import { canLog } from "../components/EntryCard";
import { RestDock } from "../components/RestDock";
import { Sheet } from "../components/Sheet";
import { Chip, Group, PRChip, ProgressRing, Row, SetsRing, Stepper, VideoLink } from "../components/ui";
import { MUSCLE_LABEL, MUSCLE_ORDER } from "../data/library";
import { fmtClock, fmtDuration, fmtWeekday, fromKey, relativePhrase, today } from "../lib/dates";
import { announcePR, prKindLabel } from "../lib/feedback";
import {
  doneSetCount,
  fmtNum,
  fmtRange,
  fmtSet,
  fmtSets,
  fmtTarget,
  lastPerformance,
  muscleFocus,
  prKey,
  streaks,
  weightStep,
} from "../lib/logic";
import { useNav } from "../lib/nav";
import { buzz, unlockAudio, useNow, useRest } from "../lib/rest";
import { useStore } from "../lib/store";
import type { Entry, Session, SetEntry } from "../lib/types";

interface Hold {
  phase: "ready" | "hold" | "switch";
  endsAt: number;
  startedAt: number;
  total: number;
  side: 1 | 2;
  perSide: boolean;
  ei: number;
  si: number;
}

function firstOpenEntry(entries: Entry[]): number {
  const req = entries.findIndex((e) => !e.optional && e.sets.some((s) => !s.done));
  if (req >= 0) return req;
  const any = entries.findIndex((e) => e.sets.some((s) => !s.done));
  return any >= 0 ? any : 0;
}

function firstOpenSet(e: Entry | undefined): number {
  if (!e) return 0;
  const i = e.sets.findIndex((s) => !s.done);
  return i >= 0 ? i : Math.max(0, e.sets.length - 1);
}

/** Next exercise (wrapping round) that still has an open set, treating set (xi, yi) as just logged. */
function nextOpenEntry(entries: Entry[], xi: number, yi: number): number {
  for (let k = 1; k < entries.length; k++) {
    const j = (xi + k) % entries.length;
    if (entries[j].sets.some((s, i) => !s.done && !(j === xi && i === yi))) return j;
  }
  return -1;
}

/** The full-screen workout. Rises over the tabs; renders until its exit animation ends. */
export function FocusOverlay() {
  const { focusDate, closeFocus } = useNav();
  const [date, setDate] = useState<string | null>(focusDate);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (focusDate) {
      setDate(focusDate);
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setShown(false);
    const t = window.setTimeout(() => setDate(null), 440);
    return () => window.clearTimeout(t);
  }, [focusDate]);

  if (!date) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Workout"
      data-shown={shown}
      className="rise-screen fixed inset-0 z-[60] flex flex-col bg-bg"
    >
      <FocusBody key={date} date={date} onClose={closeFocus} />
    </div>
  );
}

function FocusBody({ date, onClose }: { date: string; onClose: () => void }) {
  const { data, dispatch, prs, getEx, logSet } = useStore();
  const restApi = useRest();
  const live = data.sessions[date];
  const keep = useRef<Session | undefined>(live);
  if (live) keep.current = live;
  const session = keep.current;

  const [view, setView] = useState<"workout" | "summary">(() => (session?.finishedAt ? "summary" : "workout"));
  const [ei, setEi] = useState(() => (session ? firstOpenEntry(session.entries) : 0));
  const [si, setSi] = useState(() => (session ? firstOpenSet(session.entries[firstOpenEntry(session.entries)]) : 0));
  const [hold, setHold] = useState<Hold | null>(null);
  const [burst, setBurst] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const now = useNow(hold ? 100 : 1000, view === "workout");

  // Celebrate when arriving straight from "Finish workout" on the list screen.
  useEffect(() => {
    if (session?.finishedAt && Date.now() - session.finishedAt < 5000) setBurst((b) => b + 1);
  }, []);

  const close = () => {
    setHold(null);
    onClose();
    // An opened-but-untouched workout leaves nothing behind.
    window.setTimeout(() => dispatch({ type: "discardSession", date, ifEmpty: true }), 450);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !listOpen && !confirmOpen) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const goTo = (i: number) => {
    const s = keep.current;
    if (!s || i < 0 || i >= s.entries.length) return;
    setHold(null);
    setEi(i);
    setSi(firstOpenSet(s.entries[i]));
    scroller.current?.scrollTo({ top: 0 });
  };

  const logAt = (xi: number, yi: number, values: Partial<SetEntry>) => {
    const s = keep.current;
    if (!s) return;
    const e = s.entries[xi];
    const ex = getEx(e.exId);
    if (!ex) return;
    const merged = { ...e.sets[yi], ...values };
    const kind = logSet(date, s.dayKey, e.uid, yi, { w: merged.w, r: merged.r, s: merged.s, m: merged.m });
    buzz(12);
    if (kind) {
      announcePR(ex, merged, e.unit, kind);
      setBurst((b) => b + 1);
    }
    const nextSet = e.sets.findIndex((x, i) => i !== yi && !x.done);
    const requiredLeft = s.entries.some((x, j) => !x.optional && x.sets.some((st, i) => !st.done && !(j === xi && i === yi)));
    if (nextSet >= 0) {
      setSi(nextSet);
      if (e.rest) restApi.start(e.rest, ex.name);
      return;
    }
    if (!requiredLeft) {
      restApi.skip();
      return;
    }
    if (e.rest) restApi.start(e.rest, ex.name);
    const ne = nextOpenEntry(s.entries, xi, yi);
    if (ne >= 0) window.setTimeout(() => goTo(ne), 650);
  };

  // Hold timer: 3 s to get into position, the hold, and for one-sided holds a 5 s switch and the second side.
  useEffect(() => {
    if (!hold || now < hold.endsAt) return;
    const t = Date.now();
    if (hold.phase === "ready" || hold.phase === "switch") {
      buzz(15);
      setHold({ ...hold, phase: "hold", side: hold.phase === "switch" ? 2 : 1, startedAt: t, endsAt: t + hold.total * 1000 });
      return;
    }
    if (hold.perSide && hold.side === 1) {
      restApi.ping();
      setHold({ ...hold, phase: "switch", endsAt: t + 5000 });
      return;
    }
    setHold(null);
    restApi.ping();
    logAt(hold.ei, hold.si, { s: hold.total });
  }, [now, hold]);

  if (!session) {
    return (
      <div className="grid flex-1 place-items-center p-6 text-center">
        <div>
          <p className="t-body text-ink-2">This workout is no longer here.</p>
          <button onClick={onClose} className="press btn-secondary mx-auto mt-4">
            Close
          </button>
        </div>
      </div>
    );
  }

  const doFinish = () => {
    dispatch({ type: "finish", date });
    restApi.skip();
    setHold(null);
    setView("summary");
    setBurst((b) => b + 1);
    buzz(25);
  };
  const openRequired = session.entries.filter((x) => !x.optional).reduce((n, x) => n + x.sets.filter((s) => !s.done).length, 0);
  const finish = () => (openRequired > 0 ? setConfirmOpen(true) : doFinish());

  if (view === "summary") {
    return (
      <>
        <TopBar left={<BarButton label="Close" onClick={close} icon={<X size={22} weight="bold" />} />} center={<span className="t-headline">Summary</span>} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <Summary session={session} date={date} />
        </div>
        <BottomBar>
          <button onClick={close} className="press btn-primary">
            Done
          </button>
        </BottomBar>
        <Burst fire={burst} originY={0.22} />
      </>
    );
  }

  const entry = session.entries[Math.min(ei, session.entries.length - 1)];
  const ex = getEx(entry.exId);
  const set = entry.sets[Math.min(si, entry.sets.length - 1)];
  const setIdx = Math.min(si, entry.sets.length - 1);
  const elapsed = session.startedAt ? ((session.finishedAt ?? now) - session.startedAt) / 1000 : 0;
  const n = session.entries.length;

  const patch = (p: Partial<SetEntry>) => dispatch({ type: "updateSet", date, uid: entry.uid, idx: setIdx, patch: p });
  const startHold = () => {
    unlockAudio();
    restApi.skip();
    const t = Date.now();
    setHold({ phase: "ready", endsAt: t + 3000, startedAt: t, total: set.s ?? entry.min, side: 1, perSide: !!ex?.perSide, ei, si: setIdx });
  };
  const stopHold = () => {
    if (!hold) return;
    const h = hold;
    setHold(null);
    if (h.phase === "ready") return;
    const held = h.phase === "switch" ? h.total : Math.round((Date.now() - h.startedAt) / 1000);
    if (held >= 3) {
      restApi.ping();
      logAt(h.ei, h.si, { s: held });
    }
  };

  let primary: { label: string; onClick: () => void; disabled?: boolean };
  const exDone = entry.sets.every((s) => s.done);
  if (!ex) primary = { label: "Next exercise", onClick: () => goTo(ei + 1) };
  else if (hold) primary = hold.phase === "ready" ? { label: "Cancel", onClick: () => setHold(null) } : { label: "Stop and log", onClick: stopHold };
  else if (!set.done && ex.type === "hold")
    primary = { label: `Start ${fmtNum(set.s ?? entry.min)} s hold`, onClick: startHold, disabled: !(set.s ?? entry.min) };
  else if (!set.done) primary = { label: `Log set ${setIdx + 1}`, onClick: () => logAt(ei, setIdx, {}), disabled: !canLog(ex, set) };
  else if (!exDone) primary = { label: "Next set", onClick: () => setSi(firstOpenSet(entry)) };
  else if (openRequired > 0) primary = { label: "Next exercise", onClick: () => goTo(nextOpenEntry(session.entries, ei, -1)) };
  else primary = { label: "Finish workout", onClick: finish };

  const last = ex ? lastPerformance(data, entry.exId, entry.unit, date) : undefined;
  const setPR = prs.byKey.get(prKey(date, entry.uid, setIdx));
  const upNext = session.entries[ei + 1];
  const upNextEx = upNext ? getEx(upNext.exId) : undefined;
  const muscles = ex ? muscleFocus([ex]) : {};
  const mainMuscles = MUSCLE_ORDER.filter((m) => muscles[m] === 1);
  const remaining = hold ? Math.max(0, hold.endsAt - now) : 0;

  return (
    <>
      <TopBar
        left={<BarButton label="Close workout" onClick={close} icon={<CaretDown size={22} weight="bold" />} />}
        center={
          <span className="inline-flex items-center gap-1.5 t-headline tnum" aria-label={`Workout time ${fmtClock(elapsed)}`}>
            <Timer size={18} weight="fill" className="text-accent" />
            {fmtClock(elapsed)}
          </span>
        }
        right={
          <button onClick={finish} className="press h-11 px-3 t-body font-semibold text-accent-strong">
            Finish
          </button>
        }
      >
        <div className="col flex gap-[3px] px-4 pb-2.5">
          {session.entries.map((e, i) => {
            const frac = e.sets.filter((s) => s.done).length / Math.max(1, e.sets.length);
            const on = i === ei;
            return (
              <button key={e.uid} onClick={() => goTo(i)} aria-label={`Go to exercise ${i + 1}`} className="flex h-4 flex-1 items-center">
                <span className={`relative block w-full overflow-hidden rounded-full ${on ? "h-[5px] bg-fill-strong" : "h-[4px] bg-fill"}`}>
                  <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${frac * 100}%`, transition: "width 300ms var(--ease-out)" }} />
                </span>
              </button>
            );
          })}
        </div>
      </TopBar>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="col px-4 pt-4">
          {ex ? (
            <>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <button onClick={() => setListOpen(true)} className="press -ml-1 inline-flex h-8 items-center gap-1 rounded-full px-1 eyebrow">
                    Exercise {ei + 1} of {n}
                    <CaretDown size={12} weight="bold" />
                  </button>
                  <h1 className="t-title2">{ex.name}</h1>
                  <p className="mt-1 t-sub text-ink-2">
                    {fmtTarget({ sets: entry.sets.length, min: entry.min, max: entry.max }, ex)}
                    {entry.rest ? ` · ${entry.rest} s rest` : ""}
                    {entry.optional ? " · optional" : ""}
                  </p>
                  {ex.video && (
                    <div className="mt-3">
                      <VideoLink href={ex.video} />
                    </div>
                  )}
                </div>
                {mainMuscles.length > 0 && (
                  <div className="shrink-0" style={{ "--map-gap": "var(--bg)" } as CSSProperties}>
                    <BodyMap values={muscles} height={118} gap={4} label={`Works ${mainMuscles.map((m) => MUSCLE_LABEL[m]).join(", ")}`} />
                  </div>
                )}
              </div>
              {entry.note && <p className="mt-4 rounded-[14px] bg-accent-soft px-3.5 py-2.5 t-foot text-ink">{entry.note}</p>}
              {last && (
                <p className="mt-3 t-foot text-ink-2">
                  Last time, {relativePhrase(fromKey(last.date), today())}: {fmtSets(last.sets, ex, entry.unit)}
                </p>
              )}

              <div className="card mt-4 p-4">
                <div className="flex min-h-[26px] items-center justify-between gap-2">
                  <div className="t-headline">
                    Set {setIdx + 1} <span className="font-normal text-ink-3">of {entry.sets.length}</span>
                  </div>
                  {setPR ? (
                    <PRChip kind={setPR} />
                  ) : set.done ? (
                    <span className="inline-flex items-center gap-1 t-foot font-semibold text-ink-2">
                      <CheckCircle size={18} weight="fill" className="text-ink" />
                      Logged
                    </span>
                  ) : (
                    <span className="t-foot text-ink-3">
                      Target {fmtRange(entry.min, entry.max)} {ex.type === "hold" ? "s" : ex.type === "time" ? "min" : "reps"}
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-2.5">
                  {ex.type === "hold" && hold ? (
                    <div className="grid place-items-center py-2">
                      <ProgressRing value={hold.phase === "hold" ? 1 - remaining / (hold.total * 1000) : 0} size={184} stroke={10}>
                        <div className="text-center">
                          <div className="text-[56px] font-semibold leading-none tnum">{Math.ceil(remaining / 1000)}</div>
                          <div className="mt-2 t-foot text-ink-2">
                            {hold.phase === "ready" ? "Get ready" : hold.phase === "switch" ? "Switch sides" : hold.perSide ? `Side ${hold.side} of 2` : "Hold"}
                          </div>
                        </div>
                      </ProgressRing>
                    </div>
                  ) : ex.type === "hold" ? (
                    <Stepper size="lg" label="Seconds" suffix="s" step={5} value={set.s} onChange={(s) => patch({ s })} />
                  ) : ex.type === "time" ? (
                    <Stepper size="lg" label="Minutes" suffix="min" step={1} value={set.m} onChange={(m) => patch({ m })} />
                  ) : ex.equipment === "bodyweight" ? (
                    <Stepper size="lg" label="Reps" suffix="reps" step={1} value={set.r} onChange={(r) => patch({ r })} />
                  ) : (
                    <>
                      <Stepper size="lg" label="Weight" suffix={entry.unit} step={weightStep(entry.unit)} decimals value={set.w} onChange={(w) => patch({ w })} />
                      <Stepper size="lg" label="Reps" suffix="reps" step={1} value={set.r} onChange={(r) => patch({ r })} />
                    </>
                  )}
                </div>

                {set.done && !hold && (
                  <button onClick={() => patch({ done: false, at: undefined })} className="press mt-3 h-10 w-full t-foot font-semibold text-ink-2">
                    Untick this set
                  </button>
                )}
                {ex.type === "hold" && !set.done && !hold && (
                  <button
                    onClick={() => logAt(ei, setIdx, {})}
                    disabled={set.s === undefined}
                    className="press mt-2 h-10 w-full t-foot font-semibold text-accent-strong disabled:opacity-40"
                  >
                    Log without the timer
                  </button>
                )}
              </div>

              <div className="mb-2 mt-5 px-1 t-foot font-semibold text-ink-2">All sets</div>
              <div className="card overflow-hidden">
                {entry.sets.map((s, i) => {
                  const pr = prs.byKey.get(prKey(date, entry.uid, i));
                  const on = i === setIdx;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setHold(null);
                        setSi(i);
                      }}
                      aria-current={on}
                      className={`press group relative flex h-[52px] w-full items-center gap-3 px-4 text-left ${on ? "bg-fill" : ""}`}
                    >
                      <span className="absolute left-4 right-0 top-0 h-[0.5px] bg-line group-first:hidden" />
                      <span className="w-5 t-sub font-semibold text-ink-2 tnum">{i + 1}</span>
                      <span className={`flex-1 t-body tnum ${s.done ? "" : "text-ink-2"}`}>{fmtSet(s, ex, entry.unit)}</span>
                      {pr && <PRChip kind={pr} compact />}
                      {s.done ? <CheckCircle size={24} weight="fill" className="text-ink" /> : <Circle size={24} className="text-ink-3" />}
                    </button>
                  );
                })}
                <button
                  onClick={() => dispatch({ type: "addSet", date, uid: entry.uid })}
                  className="press relative flex h-[52px] w-full items-center gap-2 px-4 t-body font-medium text-accent-strong"
                >
                  <span className="absolute left-4 right-0 top-0 h-[0.5px] bg-line" />
                  <Plus size={18} weight="bold" />
                  Add set
                </button>
              </div>

              {upNext && upNextEx && (
                <button onClick={() => goTo(ei + 1)} className="press card mt-4 flex w-full items-center gap-3 px-4 py-3.5 text-left">
                  <SetsRing done={upNext.sets.filter((s) => s.done).length} total={upNext.sets.length} size={24} />
                  <div className="min-w-0 flex-1">
                    <div className="t-cap text-ink-3">Up next</div>
                    <div className="truncate t-headline">{upNextEx.name}</div>
                    <div className="truncate t-foot text-ink-2">{fmtTarget({ sets: upNext.sets.length, min: upNext.min, max: upNext.max }, upNextEx)}</div>
                  </div>
                  <CaretRight size={16} weight="bold" className="text-ink-3" />
                </button>
              )}
            </>
          ) : (
            <p className="py-10 text-center t-body text-ink-2">This exercise is no longer in the library.</p>
          )}
          <div style={{ height: restApi.rest ? 96 : 24 }} />
        </div>
      </div>

      <BottomBar>
        <div className="flex items-center gap-2">
          <button
            aria-label="Previous exercise"
            disabled={ei === 0 || !!hold}
            onClick={() => goTo(ei - 1)}
            className="press grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[14px] bg-fill disabled:opacity-40"
          >
            <CaretLeft size={20} weight="bold" />
          </button>
          <button onClick={primary.onClick} disabled={primary.disabled} className="press btn-primary flex-1 disabled:opacity-40">
            {primary.label === "Finish workout" && <Check size={20} weight="bold" />}
            {primary.label}
          </button>
          <button
            aria-label="Next exercise"
            disabled={ei >= n - 1 || !!hold}
            onClick={() => goTo(ei + 1)}
            className="press grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[14px] bg-fill disabled:opacity-40"
          >
            <CaretRight size={20} weight="bold" />
          </button>
        </div>
      </BottomBar>

      <RestDock placement="focus" />
      <Burst fire={burst} originY={0.35} />

      <Sheet open={listOpen} onOpenChange={setListOpen} title="Exercises in this workout">
        <div className="min-h-0 overflow-y-auto px-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}>
          <h2 className="px-1 pb-3 pt-2 t-title3">Exercises</h2>
          <Group>
            {session.entries.map((e, i) => {
              const x = getEx(e.exId);
              return (
                <Row
                  key={e.uid}
                  left={<SetsRing done={e.sets.filter((s) => s.done).length} total={e.sets.length} size={24} />}
                  title={x?.name ?? "Unknown exercise"}
                  subtitle={`${fmtTarget({ sets: e.sets.length, min: e.min, max: e.max }, x)}${e.optional ? " · optional" : ""}`}
                  right={i === ei ? <Chip tone="accent">Now</Chip> : undefined}
                  chevron={false}
                  onClick={() => {
                    goTo(i);
                    setListOpen(false);
                  }}
                />
              );
            })}
          </Group>
        </div>
      </Sheet>

      <Sheet open={confirmOpen} onOpenChange={setConfirmOpen} title="Finish workout?">
        <div className="px-5 pt-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}>
          <h2 className="t-title3">
            Finish with {openRequired} {openRequired === 1 ? "set" : "sets"} open?
          </h2>
          <p className="mt-1 t-sub text-ink-2">Open sets stay unticked. The workout still counts for the day.</p>
          <div className="mt-5 space-y-2">
            <button
              onClick={() => {
                setConfirmOpen(false);
                doFinish();
              }}
              className="press btn-primary"
            >
              Finish workout
            </button>
            <button onClick={() => setConfirmOpen(false)} className="press btn-secondary h-[52px] w-full">
              Keep going
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}

function TopBar({ left, center, right, children }: { left?: ReactNode; center?: ReactNode; right?: ReactNode; children?: ReactNode }) {
  return (
    <div className="material hairline-b relative z-10 shrink-0" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="col relative flex h-12 items-center justify-between px-2">
        <div className="flex min-w-[88px] items-center">{left}</div>
        <div className="absolute inset-x-24 flex justify-center">{center}</div>
        <div className="flex min-w-[88px] items-center justify-end">{right}</div>
      </div>
      {children}
    </div>
  );
}

function BarButton({ label, onClick, icon }: { label: string; onClick: () => void; icon: ReactNode }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} className="press press-sm grid h-11 w-11 place-items-center rounded-full text-ink">
      {icon}
    </button>
  );
}

function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="material hairline-t relative z-10 shrink-0" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="col px-4 py-3">{children}</div>
    </div>
  );
}

function Summary({ session, date }: { session: Session; date: string }) {
  const { data, dispatch, prs, getEx } = useStore();
  const st = streaks(data, today());
  const events = prs.events.filter((e) => e.date === date);
  const minutes = session.finishedAt && session.startedAt ? (session.finishedAt - session.startedAt) / 60000 : null;
  const worked = session.entries.filter((e) => e.sets.some((s) => s.done)).map((e) => getEx(e.exId));
  const vals = muscleFocus(worked);
  const main = MUSCLE_ORDER.filter((m) => vals[m] === 1);
  const name = data.settings.name.trim();

  return (
    <div className="col px-4 pb-8">
      <div className="pt-7 text-center">
        <span className="check-pop mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-accent-strong">
          <Check size={30} weight="bold" />
        </span>
        <h1 className="mt-4 t-large">{name ? `Well done, ${name}` : "Workout complete"}</h1>
        <p className="mt-1 t-sub text-ink-2">
          {fmtWeekday(fromKey(date))} · {session.title}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        <SumStat label="Time" value={minutes ? fmtDuration(minutes) : "–"} />
        <SumStat label="Sets" value={String(doneSetCount(session))} />
        <SumStat label="Personal bests" value={String(events.length)} />
      </div>

      {st.current > 1 && (
        <div className="card mt-2 flex items-center gap-3 px-4 py-3.5">
          <Fire size={24} weight="fill" className="shrink-0 text-accent" />
          <p className="t-sub">
            <span className="font-semibold">{st.current} workouts in a row.</span>{" "}
            <span className="text-ink-2">Best streak: {st.best}.</span>
          </p>
        </div>
      )}

      {events.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 px-1 t-title3">Personal bests</h2>
          <Group>
            {events.map((e) => {
              const x = getEx(e.exId);
              return (
                <Row
                  key={`${e.uid}-${e.idx}`}
                  title={x?.name ?? "Exercise"}
                  subtitle={prKindLabel(e.kind)}
                  right={<span className="t-sub font-semibold tnum">{x ? fmtSet({ ...e, done: true }, x, e.unit) : ""}</span>}
                />
              );
            })}
          </Group>
        </>
      )}

      {main.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 px-1 t-title3">Muscles worked</h2>
          <div className="card px-4 py-5">
            <BodyMap values={vals} height={190} gap={14} label={`Worked ${main.map((m) => MUSCLE_LABEL[m]).join(", ")}`} />
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {main.map((m) => (
                <Chip key={m} tone="accent">
                  {MUSCLE_LABEL[m]}
                </Chip>
              ))}
            </div>
          </div>
        </>
      )}

      <h2 className="mb-2 mt-6 px-1 t-title3">Notes</h2>
      <textarea
        defaultValue={session.note ?? ""}
        onBlur={(e) => {
          if (e.target.value !== (session.note ?? "")) dispatch({ type: "sessionNote", date, note: e.target.value });
        }}
        rows={3}
        placeholder="How did it feel? Anything to remember next time?"
        className="card block w-full resize-none p-4 t-body outline-none placeholder:text-ink-3"
      />
    </div>
  );
}

function SumStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-3.5 py-3">
      <div className="truncate t-cap text-ink-2">{label}</div>
      <div className="mt-1 t-title2 tnum">{value}</div>
    </div>
  );
}
