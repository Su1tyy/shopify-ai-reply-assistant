export type Unit = "kg" | "lb";

/** reps: sets of weight × reps (or bodyweight reps). hold: timed holds in seconds. time: cardio/mobility minutes. */
export type ExType = "reps" | "hold" | "time";

export type Equipment = "dumbbell" | "cable" | "smith" | "bodyweight" | "cardio";

export type Muscle =
  | "chest"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "traps"
  | "upper-back"
  | "lower-back"
  | "glutes"
  | "adductors"
  | "quads"
  | "hamstrings"
  | "calves";

export type DayKey = "sat" | "sun" | "mon" | "tue" | "wed" | "thu" | "fri";

export interface Exercise {
  id: string;
  name: string;
  equipment: Equipment;
  type: ExType;
  primary: Muscle[];
  secondary: Muscle[];
  video?: string;
  perSide?: boolean;
  custom?: boolean;
}

/** One exercise slot in a plan day. min/max mean reps, seconds or minutes depending on the exercise type. */
export interface PlanItem {
  uid: string;
  exId: string;
  sets: number;
  min: number;
  max: number;
  unit: Unit;
  rest: number;
  note?: string;
  optional?: boolean;
}

export interface PlanDay {
  key: DayKey;
  rest: boolean;
  title: string;
  focus: string;
  items: PlanItem[];
  /** Her own notes for this weekday, kept across weeks. */
  note?: string;
}

export type Plan = Record<DayKey, PlanDay>;

export interface SetEntry {
  w?: number;
  r?: number;
  s?: number;
  m?: number;
  done: boolean;
  at?: number;
}

/** An exercise as performed in one session; targets are snapshotted so later plan edits never rewrite history. */
export interface Entry {
  uid: string;
  exId: string;
  unit: Unit;
  sets: SetEntry[];
  min: number;
  max: number;
  rest: number;
  optional?: boolean;
  note?: string;
}

export interface Session {
  date: string;
  dayKey: DayKey;
  title: string;
  focus: string;
  startedAt?: number;
  finishedAt?: number;
  entries: Entry[];
  note?: string;
}

export type Theme = "system" | "light" | "dark";

export interface Settings {
  name: string;
  sound: boolean;
  theme?: Theme;
}

export interface AppData {
  v: 1;
  plan: Plan;
  sessions: Record<string, Session>;
  custom: Exercise[];
  settings: Settings;
  sample?: boolean;
}

export type PRKind = "weight" | "reps" | "hold";

export interface PREvent {
  date: string;
  uid: string;
  idx: number;
  exId: string;
  unit: Unit;
  kind: PRKind;
  w?: number;
  r?: number;
  s?: number;
}
