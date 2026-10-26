import { ArrowDown, ArrowsClockwise, ArrowUp, Info, Plus, Trash } from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Group, Note, Row, ScreenHeader, Section, Segmented, Stepper, Switch, VideoLink } from "../components/ui";
import { isWeighted } from "../data/library";
import { DAY_NAME, DAY_SHORT, WEEK_ORDER } from "../data/plan";
import { estimateMinutes, fmtRange, fmtTarget } from "../lib/logic";
import { useNav } from "../lib/nav";
import { PREVIEW, resetStorage, useStore } from "../lib/store";
import type { DayKey, PlanItem, Theme, Unit } from "../lib/types";
import { LibraryPicker } from "./LibraryPicker";

/** Text input that saves when it loses focus, so typing never thrashes the store. */
function CommitField({
  value,
  onCommit,
  placeholder,
  label,
  multiline = false,
  rows = 3,
  bare = false,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  label: string;
  multiline?: boolean;
  rows?: number;
  bare?: boolean;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = () => {
    if (text !== value) onCommit(text);
  };
  if (multiline) {
    return (
      <textarea
        aria-label={label}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        placeholder={placeholder}
        rows={rows}
        className={`block w-full resize-none bg-transparent t-body outline-none placeholder:text-ink-3 ${bare ? "py-1" : "px-4 py-3"}`}
      />
    );
  }
  return (
    <input
      aria-label={label}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      placeholder={placeholder}
      enterKeyHint="done"
      className="min-w-0 flex-1 bg-transparent text-right t-body text-ink-2 outline-none placeholder:text-ink-3 focus:text-ink"
    />
  );
}

function FieldRow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="group relative flex min-h-[52px] items-center gap-3 px-4 py-1.5">
      <span className="absolute left-4 right-0 top-0 h-[0.5px] bg-line group-first:hidden" />
      <span className="shrink-0 t-body">{title}</span>
      <div className="flex min-w-0 flex-1 justify-end">{children}</div>
    </div>
  );
}

/** For longer text: the label sits above a full-width field. */
function StackRow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="group relative px-4 pb-2 pt-3">
      <span className="absolute left-4 right-0 top-0 h-[0.5px] bg-line group-first:hidden" />
      <div className="t-foot text-ink-2">{title}</div>
      {children}
    </div>
  );
}

export function PlanScreen() {
  const { data, dispatch, getEx } = useStore();
  const { push } = useNav();
  const s = data.settings;

  return (
    <>
      <ScreenHeader title="Plan" subtitle="Her week, Saturday to Friday. Tap a day to change it." />
      <div className="space-y-7">
        <Section>
          <Group>
            {WEEK_ORDER.map((k) => {
              const p = data.plan[k];
              return (
                <Row
                  key={k}
                  left={
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full t-foot font-semibold ${
                        p.rest ? "bg-fill text-ink-2" : "bg-accent-soft text-accent-strong"
                      }`}
                    >
                      {DAY_SHORT[k]}
                    </span>
                  }
                  title={p.rest ? "Rest day" : p.title}
                  subtitle={
                    p.rest
                      ? DAY_NAME[k]
                      : `${DAY_NAME[k]} · ${p.items.length} exercises · about ${estimateMinutes(
                          data,
                          p.items.filter((i) => getEx(i.exId)),
                        )} min`
                  }
                  onClick={() => push({ name: "dayEditor", key: k })}
                />
              );
            })}
          </Group>
        </Section>

        <Section title="Settings">
          <Group>
            <FieldRow title="Her name">
              <CommitField label="Her name" value={s.name} placeholder="Optional" onCommit={(name) => dispatch({ type: "settings", patch: { name: name.trim() } })} />
            </FieldRow>
            <FieldRow title="Chime when rest ends">
              <Switch label="Chime when rest ends" on={s.sound} onChange={(sound) => dispatch({ type: "settings", patch: { sound } })} />
            </FieldRow>
            <div className="group relative px-4 py-3">
              <span className="absolute left-4 right-0 top-0 h-[0.5px] bg-line" />
              <div className="mb-2 t-body">Appearance</div>
              <Segmented<Theme>
                label="Appearance"
                value={s.theme ?? "system"}
                onChange={(theme) => dispatch({ type: "settings", patch: { theme } })}
                options={[
                  { value: "system", label: "Automatic" },
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ]}
              />
            </div>
          </Group>
          <p className="mt-2 px-1 t-foot text-ink-3">The screen always flashes and the phone buzzes (where supported) when a rest ends. The chime is extra.</p>
        </Section>

        {PREVIEW && (
          <Section title="Preview">
            <Group>
              <Row
                left={<ArrowsClockwise size={20} className="text-ink-2" />}
                title="Reset sample data"
                subtitle="Puts the six weeks of example history back"
                onClick={() => {
                  const before = data;
                  dispatch({ type: "replace", data: resetStorage() });
                  toast("Sample data reset", { action: { label: "Undo", onClick: () => dispatch({ type: "replace", data: before }) } });
                }}
              />
            </Group>
            <p className="mt-2 px-1 t-foot text-ink-3">
              This is a preview with made-up history so every screen has something to show. Nothing here touches her real app.
            </p>
          </Section>
        )}

        <Section title="About">
          <Group>
            <Row left={<Info size={20} className="text-ink-2" />} title="Credits" onClick={() => push({ name: "credits" })} />
          </Group>
        </Section>
      </div>
    </>
  );
}

export function DayEditor({ dayKey, back }: { dayKey: DayKey; back: string }) {
  const { data, dispatch, getEx } = useStore();
  const { push, pop } = useNav();
  const day = data.plan[dayKey];
  const [reorder, setReorder] = useState(false);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <ScreenHeader
        title={DAY_NAME[dayKey]}
        subtitle={day.rest ? "Rest day" : `${day.items.length} exercises · about ${estimateMinutes(data, day.items)} min`}
        back={{ label: back, onClick: pop }}
        right={
          !day.rest && day.items.length > 1 ? (
            <button onClick={() => setReorder((r) => !r)} className="press h-11 px-1 t-body font-semibold text-accent-strong">
              {reorder ? "Done" : "Reorder"}
            </button>
          ) : undefined
        }
      />
      <div className="space-y-7">
        <Section>
          <Group>
            <FieldRow title="Name">
              <CommitField label="Workout name" value={day.title} onCommit={(title) => dispatch({ type: "planDay", key: dayKey, patch: { title: title.trim() || day.title } })} />
            </FieldRow>
            <StackRow title="Focus">
              <CommitField
                label="Focus"
                multiline
                bare
                rows={2}
                value={day.focus}
                placeholder="What this day is for"
                onCommit={(focus) => dispatch({ type: "planDay", key: dayKey, patch: { focus: focus.trim() } })}
              />
            </StackRow>
            <FieldRow title="Rest day">
              <Switch label="Rest day" on={day.rest} onChange={(rest) => dispatch({ type: "planDay", key: dayKey, patch: { rest } })} />
            </FieldRow>
          </Group>
        </Section>

        {!day.rest && (
          <Section title="Exercises">
            {day.items.length > 0 && (
              <Group>
                {day.items.map((it, i) => {
                  const ex = getEx(it.exId);
                  return (
                    <Row
                      key={it.uid}
                      left={<span className="w-5 shrink-0 text-center t-sub font-semibold text-ink-3 tnum">{i + 1}</span>}
                      title={ex?.name ?? "Unknown exercise"}
                      subtitle={`${fmtTarget(it, ex)}${it.rest ? ` · ${it.rest} s rest` : ""}${it.optional ? " · optional" : ""}`}
                      chevron={!reorder}
                      right={
                        reorder ? (
                          <span className="flex shrink-0 gap-1">
                            <MoveButton label={`Move ${ex?.name ?? "exercise"} up`} disabled={i === 0} onClick={() => dispatch({ type: "moveItem", key: dayKey, uid: it.uid, dir: -1 })}>
                              <ArrowUp size={18} weight="bold" />
                            </MoveButton>
                            <MoveButton
                              label={`Move ${ex?.name ?? "exercise"} down`}
                              disabled={i === day.items.length - 1}
                              onClick={() => dispatch({ type: "moveItem", key: dayKey, uid: it.uid, dir: 1 })}
                            >
                              <ArrowDown size={18} weight="bold" />
                            </MoveButton>
                          </span>
                        ) : undefined
                      }
                      onClick={reorder ? undefined : () => push({ name: "itemEditor", key: dayKey, uid: it.uid })}
                    />
                  );
                })}
              </Group>
            )}
            <button onClick={() => setAdding(true)} className="press btn-secondary mt-3 h-12 w-full">
              <Plus size={18} weight="bold" />
              Add exercise
            </button>
          </Section>
        )}
        <Note>Changes apply to new workouts. Workouts already logged keep the targets they had.</Note>
      </div>
      <LibraryPicker
        open={adding}
        onOpenChange={setAdding}
        title={`Add to ${DAY_NAME[dayKey]}`}
        onPick={(exId) => {
          dispatch({ type: "addItem", key: dayKey, exId });
          toast(`Added ${getEx(exId)?.name ?? "exercise"}`);
        }}
      />
    </>
  );
}

function MoveButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="press press-sm grid h-10 w-10 place-items-center rounded-full bg-fill text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export function ItemEditor({ dayKey, itemUid, back }: { dayKey: DayKey; itemUid: string; back: string }) {
  const { data, dispatch, getEx } = useStore();
  const { pop } = useNav();
  const [swapping, setSwapping] = useState(false);
  const day = data.plan[dayKey];
  const index = day.items.findIndex((i) => i.uid === itemUid);
  const item = day.items[index];
  const ex = item ? getEx(item.exId) : undefined;
  if (!item || !ex) {
    return <ScreenHeader title="Exercise" subtitle="This exercise was removed from the day." back={{ label: back, onClick: pop }} />;
  }

  const set = (patch: Partial<PlanItem>) => dispatch({ type: "planItem", key: dayKey, uid: itemUid, patch });
  const what = ex.type === "hold" ? "Seconds" : ex.type === "time" ? "Minutes" : "Reps";
  const step = ex.type === "hold" ? 5 : ex.type === "time" ? 5 : 1;

  return (
    <>
      <ScreenHeader title={ex.name} eyebrow={<span className="eyebrow">{DAY_NAME[dayKey]}</span>} subtitle={fmtTarget(item, ex)} back={{ label: back, onClick: pop }} />
      <div className="space-y-7">
        <Section title="Target">
          <Group>
            {ex.type !== "time" && (
              <FieldRow title="Sets">
                <div className="w-[150px]">
                  <Stepper label="Sets" value={item.sets} step={1} min={1} max={10} onChange={(sets) => set({ sets })} />
                </div>
              </FieldRow>
            )}
            <FieldRow title={`${what}, from`}>
              <div className="w-[150px]">
                <Stepper label={`${what} from`} value={item.min} step={step} min={1} max={300} onChange={(min) => set({ min, max: Math.max(min, item.max) })} />
              </div>
            </FieldRow>
            <FieldRow title="to">
              <div className="w-[150px]">
                <Stepper label={`${what} to`} value={item.max} step={step} min={1} max={300} onChange={(max) => set({ max, min: Math.min(max, item.min) })} />
              </div>
            </FieldRow>
            {ex.type !== "time" && (
              <FieldRow title="Rest">
                <div className="w-[150px]">
                  <Stepper label="Rest in seconds" value={item.rest} step={15} min={0} max={300} suffix="s" onChange={(rest) => set({ rest })} />
                </div>
              </FieldRow>
            )}
            {isWeighted(ex) && (
              <FieldRow title="Weight unit">
                <div className="w-[150px]">
                  <Segmented<Unit>
                    label="Weight unit"
                    value={item.unit}
                    onChange={(unit) => set({ unit })}
                    options={[
                      { value: "kg", label: "kg" },
                      { value: "lb", label: "lb" },
                    ]}
                  />
                </div>
              </FieldRow>
            )}
            <FieldRow title="Optional">
              <Switch label="Optional" on={!!item.optional} onChange={(optional) => set({ optional })} />
            </FieldRow>
          </Group>
          <p className="mt-2 px-1 t-foot text-ink-3">
            Target now: {fmtTarget(item, ex)}
            {ex.type !== "time" && item.rest ? `, ${item.rest} s rest` : ""}.
            {item.optional ? " Optional exercises never hold up finishing the day." : ""}
            {isWeighted(ex) ? ` Cable and Smith weights read in lb on her machine; dumbbells in kg.` : ""}
          </p>
        </Section>

        <Section title="Note">
          <div className="card">
            <CommitField label="Note" multiline value={item.note ?? ""} placeholder="A cue for herself, like “squeeze at the top”" onCommit={(note) => set({ note: note.trim() || undefined })} />
          </div>
        </Section>

        <Section>
          {ex.video && (
            <div className="mb-3">
              <VideoLink href={ex.video} />
            </div>
          )}
          <Group>
            <Row left={<ArrowsClockwise size={20} className="text-ink-2" />} title="Swap for another exercise" onClick={() => setSwapping(true)} />
            <Row
              left={<ArrowUp size={20} className="text-ink-2" />}
              title="Move up"
              chevron={false}
              onClick={index > 0 ? () => dispatch({ type: "moveItem", key: dayKey, uid: itemUid, dir: -1 }) : undefined}
              className={index > 0 ? "" : "opacity-40"}
            />
            <Row
              left={<ArrowDown size={20} className="text-ink-2" />}
              title="Move down"
              chevron={false}
              onClick={index < day.items.length - 1 ? () => dispatch({ type: "moveItem", key: dayKey, uid: itemUid, dir: 1 }) : undefined}
              className={index < day.items.length - 1 ? "" : "opacity-40"}
            />
            <Row
              left={<Trash size={20} className="text-ink-2" />}
              title={`Remove from ${DAY_NAME[dayKey]}`}
              chevron={false}
              onClick={() => {
                const removed = item;
                const at = index;
                dispatch({ type: "removeItem", key: dayKey, uid: itemUid });
                pop();
                toast(`Removed ${ex.name}`, {
                  action: { label: "Undo", onClick: () => dispatch({ type: "insertItem", key: dayKey, item: removed, index: at }) },
                });
              }}
            />
          </Group>
          <p className="mt-2 px-1 t-foot text-ink-3">
            {fmtRange(item.min, item.max)} {what.toLowerCase()} per set is the target range. When every set reaches the top of it, go a little heavier next time.
          </p>
        </Section>
      </div>
      <LibraryPicker
        open={swapping}
        onOpenChange={setSwapping}
        title="Swap exercise"
        mode="swap"
        exclude={[ex.id]}
        onPick={(exId) => {
          dispatch({ type: "swapItem", key: dayKey, uid: itemUid, exId });
          toast(`Swapped to ${getEx(exId)?.name ?? "the new exercise"}`);
        }}
      />
    </>
  );
}

export function Credits({ back }: { back: string }) {
  const { pop } = useNav();
  return (
    <>
      <ScreenHeader title="Credits" back={{ label: back, onClick: pop }} />
      <div className="space-y-6 px-5 pb-6 t-sub text-ink-2">
        <div>
          <h2 className="mb-1 t-headline text-ink">Body diagram</h2>
          <p>
            The muscle map artwork is adapted from react-native-body-highlighter by ELABBASSI Hicham, used under the MIT License.
          </p>
          <pre className="mt-3 whitespace-pre-wrap rounded-[14px] bg-fill p-4 font-sans text-[12px] leading-[17px] text-ink-2">{`MIT License

Copyright (c) 2022 ELABBASSI Hicham

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`}</pre>
        </div>
        <div>
          <h2 className="mb-1 t-headline text-ink">Exercise videos</h2>
          <p>“Watch how” links open YouTube videos made by their own creators. They are linked, not copied.</p>
        </div>
      </div>
    </>
  );
}
