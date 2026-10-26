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

type Spec = [exId: string, sets: number, min: number, max: number, rest: number, extra?: Partial<PlanItem>];

function day(key: DayKey, title: string, focus: string, specs: Spec[]): PlanDay {
  const items = specs.map(([exId, sets, min, max, rest, extra], i): PlanItem => {
    const ex = findExercise(exId, []);
    return {
      uid: `${key}-${i}`,
      exId,
      sets,
      min,
      max,
      rest,
      unit: ex ? defaultUnit(ex.equipment) : "kg",
      ...extra,
    };
  });
  return { key, rest: false, title, focus, items };
}

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
    sun: day("sun", "Back and shoulders", "Back, shoulders and abs", [
      ["lat-pulldown", 3, 10, 12, 90],
      ["seated-cable-row", 3, 10, 12, 90],
      ["db-single-arm-row", 2, 10, 10, 60],
      ["db-bicep-curl", 2, 12, 15, 60],
      ["cable-lateral-raise", 3, 12, 15, 45],
      ["db-rear-delt-fly", 2, 12, 15, 45],
      ["cable-crunch", 3, 15, 15, 45],
      ["db-russian-twist", 3, 16, 16, 45, { note: "8 each side." }],
      ["reverse-crunch", 3, 12, 15, 45],
    ]),
    mon: day("mon", "Cardio and core", "Steady cardio, abs and mobility", [
      ["cardio-session", 1, 25, 35, 0],
      ["cable-crunch", 3, 15, 15, 45],
      ["pallof-press", 2, 10, 10, 45],
      ["db-weighted-situp", 3, 12, 12, 45],
      ["reverse-crunch", 2, 15, 15, 45],
      ["plank", 3, 45, 60, 45],
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
