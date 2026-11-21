import type { DayKey, Plan, PlanDay, PlanItem } from "../lib/types";
import { defaultUnit, findExercise } from "./library";

export const WEEK_ORDER: DayKey[] = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];

export const DAY_NAME: Record<DayKey, string> = {
  sat: "Saturday",
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
};

export const DAY_SHORT: Record<DayKey, string> = {
  sat: "Sat",
  sun: "Sun",
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
};

/** The built-in plan's revision. Saved plans below it are brought up to date by upgradePlan. */
export const PLAN_REV = 2;

type Spec = [exId: string, sets: number, min: number, max: number, rest: number, extra?: Partial<PlanItem>];

function item(uid: string, [exId, sets, min, max, rest, extra]: Spec): PlanItem {
  const ex = findExercise(exId, []);
  return { uid, exId, sets, min, max, rest, unit: ex ? defaultUnit(ex.equipment) : "kg", ...extra };
}

function day(key: DayKey, title: string, focus: string, specs: Spec[]): PlanDay {
  return { key, rest: false, title, focus, items: specs.map((s, i) => item(`${key}-${i}`, s)) };
}

const SUNDAY_FOCUS = "Every part of the back, plus shoulders and abs";

// Lats (pulldown, straight-arm pulldown, rows), mid back (rows, face pull), upper back (face pull)
// and lower back (superman), then shoulders, a little biceps and abs.
const SUNDAY: Spec[] = [
  ["lat-pulldown", 3, 10, 12, 90],
  ["seated-cable-row", 3, 10, 12, 90],
  ["cable-straight-arm-pulldown", 2, 12, 15, 60, { note: "Arms stay straight; pull with your back, not your arms." }],
  ["db-single-arm-row", 2, 10, 10, 60],
  ["cable-face-pull", 3, 12, 15, 60, { note: "Pull towards your eyes and squeeze your shoulder blades together." }],
  ["cable-lateral-raise", 3, 12, 15, 45],
  ["db-bicep-curl", 2, 12, 15, 60],
  ["superman", 3, 10, 12, 45, { note: "Lift only a few inches and pause at the top." }],
  ["cable-crunch", 3, 15, 15, 45],
  ["db-russian-twist", 3, 16, 16, 45, { note: "8 each side." }],
  ["reverse-crunch", 3, 12, 15, 45],
];

const BIRD_DOG: Spec = ["bird-dog", 2, 8, 8, 30, { note: "Keep your back flat and reach long, not high." }];

export function defaultPlan(): Plan {
  return {
    sat: day("sat", "Lower body", "Glutes, hamstrings and a light walk", [
      ["db-hip-thrust", 4, 10, 12, 90, { note: "Main lift. Add weight when every set hits 12." }],
      ["cable-pull-through", 3, 12, 12, 75],
      ["db-glute-bridge", 3, 15, 15, 60],
      ["cable-leg-curl", 3, 12, 15, 60],
      ["db-sumo-squat", 3, 12, 12, 75],
      ["cable-glute-kickback", 2, 15, 15, 45],
      ["incline-walk", 1, 15, 15, 0],
    ]),
    sun: day("sun", "Back and shoulders", SUNDAY_FOCUS, SUNDAY),
    mon: day("mon", "Cardio and core", "Steady cardio, abs and mobility", [
      ["cardio-session", 1, 25, 35, 0],
      ["cable-crunch", 3, 15, 15, 45],
      ["pallof-press", 2, 10, 10, 45],
      ["db-weighted-situp", 3, 12, 12, 45],
      ["reverse-crunch", 2, 15, 15, 45],
      ["plank", 3, 45, 60, 45],
      BIRD_DOG,
      ["mobility", 1, 15, 15, 0],
    ]),
    tue: day("tue", "Full body", "A little of everything, in lighter doses", [
      ["db-goblet-squat", 3, 12, 12, 90],
      ["cable-pull-through", 3, 12, 12, 75],
      ["cable-chest-press", 2, 12, 12, 60],
      ["lat-pulldown", 2, 10, 12, 75],
      ["seated-cable-row", 2, 12, 12, 75],
      ["cable-lateral-raise", 2, 12, 15, 45],
      ["cable-crunch", 3, 12, 15, 45],
    ]),
    wed: day("wed", "Lower body", "Quads, glutes and a cardio finish", [
      ["db-goblet-squat", 4, 8, 10, 120, { note: "Main lift. Add weight when every set hits 10." }],
      ["db-reverse-lunge", 3, 10, 10, 75],
      ["db-walking-lunge", 2, 12, 12, 75],
      ["cable-hip-abduction", 3, 15, 20, 45],
      ["db-step-up", 2, 10, 10, 60],
      ["cable-glute-kickback", 2, 15, 15, 45],
      ["db-calf-raise", 2, 15, 15, 45, { optional: true }],
      ["cable-wood-chop", 2, 12, 12, 45],
      ["incline-walk", 1, 15, 20, 0],
    ]),
    thu: day("thu", "Upper body", "Chest, shoulders, arms, abs and a walk", [
      ["smith-bench-press", 3, 10, 12, 90],
      ["db-shoulder-press", 2, 10, 12, 75],
      ["cable-lateral-raise", 2, 12, 15, 45],
      ["db-chest-fly", 2, 12, 12, 60],
      ["cable-chest-press", 2, 12, 15, 60],
      ["rope-pushdown", 2, 12, 15, 45],
      ["db-overhead-triceps", 2, 12, 15, 45],
      ["cable-crunch", 3, 15, 15, 45],
      ["db-side-bend", 2, 12, 12, 45],
      ["side-plank", 2, 30, 30, 30],
      ["incline-walk", 1, 15, 20, 0],
    ]),
    fri: { key: "fri", rest: true, title: "Rest day", focus: "Recovery is when the training turns into muscle", items: [] },
  };
}

/* ---------- bringing saved plans up to date ---------- */

// Sunday exactly as revision 1 shipped it, to tell an untouched day from one she edited.
const SUNDAY_REV1: Spec[] = [
  ["lat-pulldown", 3, 10, 12, 90],
  ["seated-cable-row", 3, 10, 12, 90],
  ["db-single-arm-row", 2, 10, 10, 60],
  ["db-bicep-curl", 2, 12, 15, 60],
  ["cable-lateral-raise", 3, 12, 15, 45],
  ["db-rear-delt-fly", 2, 12, 15, 45],
  ["cable-crunch", 3, 15, 15, 45],
  ["db-russian-twist", 3, 16, 16, 45, { note: "8 each side." }],
  ["reverse-crunch", 3, 12, 15, 45],
];

const CORE_IDS = new Set([
  "cable-crunch",
  "db-russian-twist",
  "reverse-crunch",
  "pallof-press",
  "db-weighted-situp",
  "plank",
  "side-plank",
  "db-side-bend",
  "cable-wood-chop",
  "mobility",
]);

function matches(items: PlanItem[], specs: Spec[]): boolean {
  return (
    items.length === specs.length &&
    specs.every((spec, i) => {
      const a = items[i];
      const b = item(a.uid, spec);
      return (
        a.exId === b.exId &&
        a.sets === b.sets &&
        a.min === b.min &&
        a.max === b.max &&
        a.rest === b.rest &&
        a.unit === b.unit &&
        (a.note ?? "") === (b.note ?? "") &&
        !!a.optional === !!b.optional
      );
    })
  );
}

/** Inserts each spec the day lacks just before its first core exercise, or at the end. */
function addMissing(d: PlanDay, specs: Spec[], tag: string): boolean {
  let added = false;
  specs.forEach((spec, i) => {
    if (d.items.some((it) => it.exId === spec[0])) return;
    const at = d.items.findIndex((it) => CORE_IDS.has(it.exId));
    d.items.splice(at < 0 ? d.items.length : at, 0, item(`${d.key}-${tag}-${i}`, spec));
    added = true;
  });
  return added;
}

/**
 * Brings a saved plan (changed in place) up to the current revision while keeping her own edits:
 * an untouched day takes the new version, an edited one only gains what it is missing.
 * Returns the days that changed.
 */
export function upgradePlan(plan: Plan, fromRev: number): DayKey[] {
  const changed: DayKey[] = [];
  if (fromRev < 2) {
    // Revision 2: every part of the back is trained, and the lower back twice a week.
    const sun = plan.sun;
    if (!sun.rest) {
      let updated = false;
      if (matches(sun.items, SUNDAY_REV1)) {
        sun.items = SUNDAY.map((s, i) => item(`sun-${i}`, s));
        updated = true;
      } else {
        const additions = SUNDAY.filter(([id]) => ["cable-straight-arm-pulldown", "cable-face-pull", "superman"].includes(id));
        updated = addMissing(sun, additions, "r2");
      }
      if (updated) {
        if (sun.focus === "Back, shoulders and abs") sun.focus = SUNDAY_FOCUS;
        changed.push("sun");
      }
    }
    const mon = plan.mon;
    if (!mon.rest && !mon.items.some((it) => it.exId === BIRD_DOG[0])) {
      const at = mon.items.findIndex((it) => it.exId === "mobility");
      mon.items.splice(at < 0 ? mon.items.length : at, 0, item("mon-r2-0", BIRD_DOG));
      changed.push("mon");
    }
  }
  return changed;
}
