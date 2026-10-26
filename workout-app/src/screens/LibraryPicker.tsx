import { ArrowsClockwise, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Sheet } from "../components/Sheet";
import { Group, Row, Segmented } from "../components/ui";
import { EQUIPMENT_LABEL, groupOf, LIBRARY, LIBRARY_GROUPS, MUSCLE_LABEL, MUSCLE_ORDER } from "../data/library";
import { uid } from "../lib/logic";
import { useStore } from "../lib/store";
import type { Equipment, ExType, Exercise, Muscle } from "../lib/types";

/** Exercise library in a bottom sheet, grouped by body area, with search and a form for her own exercises. */
export function LibraryPicker({
  open,
  onOpenChange,
  title,
  onPick,
  exclude = [],
  mode = "add",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onPick: (exId: string) => void;
  exclude?: string[];
  mode?: "add" | "swap";
}) {
  const { data } = useStore();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);

  const all = [...LIBRARY, ...data.custom].filter((e) => !exclude.includes(e.id));
  const needle = q.trim().toLowerCase();
  const matches = needle
    ? all.filter(
        (e) =>
          e.name.toLowerCase().includes(needle) ||
          [...e.primary, ...e.secondary].some((m) => MUSCLE_LABEL[m].toLowerCase().includes(needle)) ||
          EQUIPMENT_LABEL[e.equipment].toLowerCase().includes(needle),
      )
    : all;
  const groups = [
    ...(data.custom.length ? [{ label: "Your exercises", items: matches.filter((e) => e.custom) }] : []),
    ...LIBRARY_GROUPS.map((g) => ({ label: g.label, items: matches.filter((e) => !e.custom && groupOf(e) === g.label) })),
  ].filter((g) => g.items.length);

  const pick = (id: string) => {
    onPick(id);
    onOpenChange(false);
    setQ("");
    setCreating(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setCreating(false);
      }}
      title={title}
      tall
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-1">
        <h2 className="t-title3">{creating ? "New exercise" : title}</h2>
        <button onClick={() => (creating ? setCreating(false) : onOpenChange(false))} className="press h-11 px-2 t-body font-semibold text-accent-strong">
          {creating ? "Back" : "Cancel"}
        </button>
      </div>

      {creating ? (
        <CustomForm onSaved={pick} />
      ) : (
        <>
          <div className="px-4 pb-3">
            <label className="flex h-11 items-center gap-2 rounded-ctl bg-fill px-3">
              <MagnifyingGlass size={18} className="shrink-0 text-ink-3" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search exercises or muscles"
                aria-label="Search exercises"
                enterKeyHint="search"
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-3"
              />
              {q && (
                <button onClick={() => setQ("")} aria-label="Clear search" className="press grid h-7 w-7 place-items-center rounded-full bg-fill-strong">
                  <X size={12} weight="bold" />
                </button>
              )}
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
            {groups.map((g) => (
              <div key={g.label} className="mb-5">
                <h3 className="mb-1.5 px-1 t-foot font-semibold text-ink-2">{g.label}</h3>
                <Group>
                  {g.items.map((e) => (
                    <Row
                      key={e.id}
                      title={e.name}
                      subtitle={`${EQUIPMENT_LABEL[e.equipment]}${e.primary.length ? ` · ${e.primary.map((m) => MUSCLE_LABEL[m]).join(", ")}` : ""}`}
                      chevron={false}
                      right={
                        mode === "add" ? (
                          <Plus size={18} weight="bold" className="shrink-0 text-accent-strong" />
                        ) : (
                          <ArrowsClockwise size={18} weight="bold" className="shrink-0 text-accent-strong" />
                        )
                      }
                      onClick={() => pick(e.id)}
                    />
                  ))}
                </Group>
              </div>
            ))}
            {groups.length === 0 && <p className="py-8 text-center t-sub text-ink-2">No exercise matches “{q}”.</p>}
            <button onClick={() => setCreating(true)} className="press btn-secondary h-12 w-full">
              <Plus size={18} weight="bold" />
              Create your own exercise
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}

function CustomForm({ onSaved }: { onSaved: (id: string) => void }) {
  const { dispatch } = useStore();
  const [name, setName] = useState("");
  const [equipment, setEquipment] = useState<Equipment>("dumbbell");
  const [type, setType] = useState<ExType>("reps");
  const [muscles, setMuscles] = useState<Muscle[]>([]);
  const [video, setVideo] = useState("");

  const ok = name.trim().length > 1 && (type === "time" || muscles.length > 0);
  const save = () => {
    if (!ok) return;
    const link = video.trim();
    const ex: Exercise = {
      id: `custom-${uid()}`,
      name: name.trim(),
      equipment: type === "time" ? "cardio" : equipment,
      type,
      primary: type === "time" ? [] : muscles,
      secondary: [],
      video: /^https?:\/\//i.test(link) ? link : undefined,
      custom: true,
    };
    dispatch({ type: "addCustom", ex });
    onSaved(ex.id);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
      <div className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block px-1 t-foot font-semibold text-ink-2">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cable squat" className="field" autoCapitalize="sentences" />
        </label>
        <div>
          <span className="mb-1.5 block px-1 t-foot font-semibold text-ink-2">Type</span>
          <Segmented
            label="Type"
            value={type}
            onChange={setType}
            options={[
              { value: "reps", label: "Sets and reps" },
              { value: "hold", label: "Timed hold" },
              { value: "time", label: "Cardio" },
            ]}
          />
        </div>
        {type !== "time" && (
          <>
            <div>
              <span className="mb-1.5 block px-1 t-foot font-semibold text-ink-2">Equipment</span>
              <Segmented
                label="Equipment"
                value={equipment}
                onChange={setEquipment}
                options={[
                  { value: "dumbbell", label: "Dumbbell" },
                  { value: "cable", label: "Cable" },
                  { value: "smith", label: "Smith" },
                  { value: "bodyweight", label: "Body" },
                ]}
              />
            </div>
            <div>
              <span className="mb-1.5 block px-1 t-foot font-semibold text-ink-2">Main muscles</span>
              <div className="flex flex-wrap gap-2">
                {MUSCLE_ORDER.map((m) => {
                  const on = muscles.includes(m);
                  return (
                    <button
                      key={m}
                      aria-pressed={on}
                      onClick={() => setMuscles(on ? muscles.filter((x) => x !== m) : [...muscles, m])}
                      className={`press h-9 rounded-full px-3.5 t-foot font-semibold transition-colors ${on ? "bg-btn text-btn-fg" : "bg-fill text-ink"}`}
                    >
                      {MUSCLE_LABEL[m]}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
        <label className="block">
          <span className="mb-1.5 block px-1 t-foot font-semibold text-ink-2">Video link (optional)</span>
          <input
            value={video}
            onChange={(e) => setVideo(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            className="field"
          />
        </label>
        <button onClick={save} disabled={!ok} className="press btn-primary disabled:opacity-40">
          Save and add
        </button>
      </div>
    </div>
  );
}
