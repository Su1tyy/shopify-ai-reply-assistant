import { CaretDown, ChartLine, Check, Minus, Plus, Sparkle } from "@phosphor-icons/react";
import { useMemo } from "react";
import { toast } from "sonner";
import { isWeighted } from "../data/library";
import { fromKey, relativePhrase, today } from "../lib/dates";
import { announcePR } from "../lib/feedback";
import { fmtSet, fmtSets, fmtTarget, isBetter, lastPerformance, prKey } from "../lib/logic";
import { useNav } from "../lib/nav";
import { buzz, useRest } from "../lib/rest";
import { useStore } from "../lib/store";
import type { DayKey, Entry, Exercise, SetEntry } from "../lib/types";
import { NumField, SetsRing, VideoLink } from "./ui";

/** What the set fields mean for this exercise, in column order. */
function fieldsFor(ex: Exercise, unit: string): { key: "w" | "r" | "s" | "m"; head: string; decimals?: boolean }[] {
  if (ex.type === "time") return [{ key: "m", head: "Minutes" }];
  if (ex.type === "hold") return [{ key: "s", head: "Seconds" }];
  if (!isWeighted(ex)) return [{ key: "r", head: "Reps" }];
  return [
    { key: "w", head: unit, decimals: true },
    { key: "r", head: "Reps" },
  ];
}

export function canLog(ex: Exercise, s: SetEntry): boolean {
  if (ex.type === "time") return s.m !== undefined;
  if (ex.type === "hold") return s.s !== undefined;
  if (!isWeighted(ex)) return s.r !== undefined;
  return s.w !== undefined && s.r !== undefined;
}

/**
 * One exercise in list mode: a summary row that opens into its sets.
 * `requiredLeft` is how many required sets in the whole session are still open (no rest after the last one).
 */
export function EntryCard({
  date,
  dayKey,
  entry,
  open,
  onToggle,
  onExerciseDone,
  requiredLeft,
}: {
  date: string;
  dayKey: DayKey;
  entry: Entry;
  open: boolean;
  onToggle: () => void;
  onExerciseDone: () => void;
  requiredLeft: number;
}) {
  const { data, dispatch, prs, getEx, logSet } = useStore();
  const { start: startRest } = useRest();
  const { push } = useNav();
  const ex = getEx(entry.exId);
  const last = useMemo(() => lastPerformance(data, entry.exId, entry.unit, date), [data, entry.exId, entry.unit, date]);
  if (!ex) return null;

  const done = entry.sets.filter((s) => s.done).length;
  const fields = fieldsFor(ex, entry.unit);
  const target = fmtTarget({ sets: entry.sets.length, min: entry.min, max: entry.max }, ex);
  const lastTop = last ? fmtSet(last.sets.reduce((b, x) => (isBetter(ex, x, b) ? x : b)), ex, entry.unit) : null;

  const ensure = () => {
    if (!data.sessions[date]) dispatch({ type: "ensureSession", date, dayKey });
  };
  const patch = (idx: number, p: Partial<SetEntry>) => {
    ensure();
    dispatch({ type: "updateSet", date, uid: entry.uid, idx, patch: p });
  };

  const toggle = (idx: number) => {
    const set = entry.sets[idx];
    if (set.done) {
      patch(idx, { done: false, at: undefined });
      return;
    }
    if (!canLog(ex, set)) {
      toast("Add the numbers first", { description: "Fill in this set, then tick it." });
      return;
    }
    const kind = logSet(date, dayKey, entry.uid, idx, { w: set.w, r: set.r, s: set.s, m: set.m });
    buzz(12);
    if (kind) announcePR(ex, set, entry.unit, kind);
    const openHere = entry.sets.filter((s, i) => !s.done && i !== idx).length;
    const sessionDone = !entry.optional && requiredLeft <= 1;
    if (entry.rest > 0 && !sessionDone) startRest(entry.rest, ex.name);
    if (openHere === 0) onExerciseDone();
  };

  const addSet = () => {
    ensure();
    dispatch({ type: "addSet", date, uid: entry.uid });
  };
  const removeSet = () => {
    const snapshot = data;
    dispatch({ type: "removeSet", date, uid: entry.uid, idx: entry.sets.length - 1 });
    toast("Set removed", { action: { label: "Undo", onClick: () => dispatch({ type: "replace", data: snapshot }) } });
  };

  const grid = fields.length === 2 ? "grid-cols-[28px_1fr_1fr_44px]" : "grid-cols-[28px_1fr_44px]";

  return (
    <div id={`entry-${entry.uid}`} className="card scroll-mt-24 overflow-hidden">
      <button onClick={onToggle} aria-expanded={open} className="press flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <SetsRing done={done} total={entry.sets.length} />
        <div className="min-w-0 flex-1">
          <div className="truncate t-headline">{ex.name}</div>
          <div className="mt-0.5 truncate t-foot text-ink-2">
            {done === entry.sets.length ? (
              fmtSets(entry.sets, ex, entry.unit)
            ) : (
              <>
                {target}
                {entry.optional ? " · optional" : ""}
                {lastTop && ` · last ${lastTop}`}
              </>
            )}
          </div>
        </div>
        <CaretDown size={16} weight="bold" className={`shrink-0 text-ink-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="reveal px-4 pb-4">
          {entry.note && <p className="mb-3 rounded-[12px] bg-accent-soft px-3 py-2 t-foot text-ink">{entry.note}</p>}
          <div className="mb-3 flex flex-wrap gap-2">
            <VideoLink href={ex.video} />
            {ex.type !== "time" && (
              <button
                onClick={() => push({ name: "exercise", exId: ex.id, unit: entry.unit })}
                className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-fill pl-2.5 pr-3.5 t-foot font-semibold"
              >
                <ChartLine size={17} weight="bold" className="text-ink-2" />
                Progress
              </button>
            )}
          </div>
          {last && (
            <p className="mb-2 t-foot text-ink-2">
              Last time, {relativePhrase(fromKey(last.date), today())}: {fmtSets(last.sets, ex, entry.unit)}
            </p>
          )}

          <div className={`grid ${grid} items-center gap-2 px-0.5 pb-1 t-cap font-medium text-ink-3`}>
            <span className="text-center">Set</span>
            {fields.map((f) => (
              <span key={f.key} className="text-center">
                {f.head}
              </span>
            ))}
            <span />
          </div>
          <div className="space-y-1.5">
            {entry.sets.map((set, i) => {
              const pr = prs.byKey.get(prKey(date, entry.uid, i));
              return (
                <div key={i} className={`grid ${grid} items-center gap-2`}>
                  <span className="grid place-items-center t-sub font-semibold text-ink-2 tnum">
                    {pr ? <Sparkle size={18} weight="fill" className="text-accent" aria-label={`Set ${i + 1}, personal best`} /> : i + 1}
                  </span>
                  {fields.map((f) => (
                    <NumField
                      key={f.key}
                      label={`Set ${i + 1} ${f.head.toLowerCase()}`}
                      value={set[f.key]}
                      decimals={f.decimals}
                      onCommit={(n) => patch(i, { [f.key]: n } as Partial<SetEntry>)}
                    />
                  ))}
                  <button
                    onClick={() => toggle(i)}
                    aria-pressed={set.done}
                    aria-label={set.done ? `Untick set ${i + 1}` : `Tick set ${i + 1}`}
                    className={`press press-sm grid h-11 w-11 place-items-center rounded-full transition-colors ${
                      set.done ? "bg-btn text-btn-fg" : "bg-fill text-ink-3"
                    }`}
                  >
                    <Check key={String(set.done)} size={20} weight="bold" className={set.done ? "check-pop" : ""} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2">
            <button onClick={addSet} className="press btn-secondary h-10 flex-1">
              <Plus size={16} weight="bold" />
              Add set
            </button>
            {entry.sets.length > 1 && (
              <button onClick={removeSet} className="press btn-secondary h-10 text-ink-2">
                <Minus size={16} weight="bold" />
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
