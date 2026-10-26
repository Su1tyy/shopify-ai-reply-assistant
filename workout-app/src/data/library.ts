import type { Equipment, Exercise, Muscle, Unit } from "../lib/types";

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: "Chest",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  abs: "Abs",
  obliques: "Obliques",
  traps: "Traps",
  "upper-back": "Upper back",
  "lower-back": "Lower back",
  glutes: "Glutes",
  adductors: "Inner thighs",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
};

export const MUSCLE_ORDER: Muscle[] = [
  "glutes",
  "hamstrings",
  "quads",
  "adductors",
  "calves",
  "abs",
  "obliques",
  "lower-back",
  "upper-back",
  "traps",
  "shoulders",
  "chest",
  "biceps",
  "triceps",
  "forearms",
];

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  dumbbell: "Dumbbell",
  cable: "Cable",
  smith: "Smith machine",
  bodyweight: "Bodyweight",
  cardio: "Cardio",
};

const yt = (id: string) => `https://www.youtube.com/watch?v=${id}`;

export const LIBRARY: Exercise[] = [
  // Glutes and legs
  { id: "db-hip-thrust", name: "Dumbbell hip thrust", equipment: "dumbbell", type: "reps", primary: ["glutes"], secondary: ["hamstrings", "quads"], video: yt("29OfN4ztW_g") },
  { id: "cable-pull-through", name: "Cable pull-through", equipment: "cable", type: "reps", primary: ["glutes", "hamstrings"], secondary: ["lower-back"], video: yt("fbF4_pn_0xc") },
  { id: "db-glute-bridge", name: "Dumbbell glute bridge", equipment: "dumbbell", type: "reps", primary: ["glutes"], secondary: ["hamstrings"], video: yt("8bbE64NuDTU") },
  { id: "cable-leg-curl", name: "Cable leg curl", equipment: "cable", type: "reps", primary: ["hamstrings"], secondary: ["calves"], video: yt("QerRbPE55D8"), perSide: true },
  { id: "db-sumo-squat", name: "Dumbbell sumo squat", equipment: "dumbbell", type: "reps", primary: ["glutes", "adductors", "quads"], secondary: ["hamstrings"], video: yt("MwNY25e4QEA") },
  { id: "cable-glute-kickback", name: "Cable glute kickback", equipment: "cable", type: "reps", primary: ["glutes"], secondary: ["hamstrings"], video: yt("VSgMyiOu0uE"), perSide: true },
  { id: "db-goblet-squat", name: "Dumbbell goblet squat", equipment: "dumbbell", type: "reps", primary: ["quads", "glutes"], secondary: ["adductors", "abs"], video: yt("SVE9GOmSxcc") },
  { id: "db-reverse-lunge", name: "Dumbbell reverse lunge", equipment: "dumbbell", type: "reps", primary: ["glutes", "quads"], secondary: ["hamstrings", "adductors"], video: yt("sjlsISvHyZs"), perSide: true },
  { id: "db-walking-lunge", name: "Dumbbell walking lunge", equipment: "dumbbell", type: "reps", primary: ["quads", "glutes"], secondary: ["hamstrings"], video: yt("kRzcRkKy1ns"), perSide: true },
  { id: "cable-hip-abduction", name: "Cable hip abduction", equipment: "cable", type: "reps", primary: ["glutes"], secondary: [], video: yt("bGlm-qTnfTI"), perSide: true },
  { id: "db-step-up", name: "Dumbbell step-up", equipment: "dumbbell", type: "reps", primary: ["quads", "glutes"], secondary: ["hamstrings"], video: yt("pELJzIHXeN8"), perSide: true },
  { id: "db-calf-raise", name: "Dumbbell calf raise", equipment: "dumbbell", type: "reps", primary: ["calves"], secondary: [], video: yt("wxwY7GXxL4k") },
  { id: "db-curtsy-lunge", name: "Dumbbell curtsy lunge", equipment: "dumbbell", type: "reps", primary: ["glutes", "adductors"], secondary: ["quads"], video: yt("tmnz4xsBnYE"), perSide: true },
  { id: "fire-hydrant", name: "Fire hydrant", equipment: "bodyweight", type: "reps", primary: ["glutes"], secondary: [], video: yt("12whZWUANRY"), perSide: true },

  // Back and shoulders
  { id: "lat-pulldown", name: "Lat pulldown", equipment: "cable", type: "reps", primary: ["upper-back"], secondary: ["biceps", "shoulders"], video: yt("6MLs17iyK9I") },
  { id: "seated-cable-row", name: "Seated cable row", equipment: "cable", type: "reps", primary: ["upper-back"], secondary: ["biceps", "traps"], video: yt("OeLb503NZHk") },
  { id: "db-single-arm-row", name: "Dumbbell single-arm row", equipment: "dumbbell", type: "reps", primary: ["upper-back"], secondary: ["biceps"], video: yt("nMFCMNKnLgQ"), perSide: true },
  { id: "cable-lateral-raise", name: "Cable lateral raise", equipment: "cable", type: "reps", primary: ["shoulders"], secondary: ["traps"], video: yt("Az_0nsym9AY"), perSide: true },
  { id: "db-rear-delt-fly", name: "Dumbbell rear-delt fly", equipment: "dumbbell", type: "reps", primary: ["shoulders"], secondary: ["upper-back", "traps"], video: yt("buuYPLVXsJg") },
  { id: "db-shoulder-press", name: "Dumbbell shoulder press", equipment: "dumbbell", type: "reps", primary: ["shoulders"], secondary: ["triceps"], video: yt("qEwKCR5JCog") },

  // Chest and arms
  { id: "smith-bench-press", name: "Smith bench press", equipment: "smith", type: "reps", primary: ["chest"], secondary: ["shoulders", "triceps"], video: yt("7FyJdsXeta8") },
  { id: "cable-chest-press", name: "Cable chest press", equipment: "cable", type: "reps", primary: ["chest"], secondary: ["shoulders", "triceps"], video: yt("FVWJglwid4I") },
  { id: "db-chest-fly", name: "Dumbbell chest fly", equipment: "dumbbell", type: "reps", primary: ["chest"], secondary: ["shoulders"], video: yt("98aRvyw-IGg") },
  { id: "db-bicep-curl", name: "Dumbbell bicep curl", equipment: "dumbbell", type: "reps", primary: ["biceps"], secondary: ["forearms"], video: yt("KS-1_r9K4XA") },
  { id: "rope-pushdown", name: "Rope triceps pushdown", equipment: "cable", type: "reps", primary: ["triceps"], secondary: [], video: yt("qHDrQglWgS4") },
  { id: "db-overhead-triceps", name: "Overhead triceps extension", equipment: "dumbbell", type: "reps", primary: ["triceps"], secondary: [], video: yt("YbX7Wd8jQ-Q") },

  // Core
  { id: "cable-crunch", name: "Kneeling cable crunch", equipment: "cable", type: "reps", primary: ["abs"], secondary: [], video: yt("kc0PRn372lo") },
  { id: "db-russian-twist", name: "Dumbbell Russian twist", equipment: "dumbbell", type: "reps", primary: ["obliques"], secondary: ["abs"], video: yt("FShbaqrGGu4") },
  { id: "reverse-crunch", name: "Reverse crunch", equipment: "bodyweight", type: "reps", primary: ["abs"], secondary: [], video: yt("YDvaOlhaA1U") },
  { id: "pallof-press", name: "Pallof press", equipment: "cable", type: "reps", primary: ["obliques", "abs"], secondary: [], video: yt("xeFp4MXad98"), perSide: true },
  { id: "db-weighted-situp", name: "Weighted sit-up", equipment: "dumbbell", type: "reps", primary: ["abs"], secondary: [], video: yt("kZvSaq192cg") },
  { id: "cable-wood-chop", name: "Cable wood chop", equipment: "cable", type: "reps", primary: ["obliques"], secondary: ["abs", "shoulders"], video: yt("kB3VKmOa_oQ"), perSide: true },
  { id: "db-side-bend", name: "Dumbbell side bend", equipment: "dumbbell", type: "reps", primary: ["obliques"], secondary: [], video: yt("SAc_r42va6g"), perSide: true },
  { id: "plank", name: "Plank", equipment: "bodyweight", type: "hold", primary: ["abs"], secondary: ["obliques", "shoulders"], video: yt("mwlp75MS6Rg") },
  { id: "side-plank", name: "Side plank", equipment: "bodyweight", type: "hold", primary: ["obliques"], secondary: ["abs"], video: yt("NXr4Fw8q60o"), perSide: true },

  // Cardio and mobility
  { id: "incline-walk", name: "Incline walk", equipment: "cardio", type: "time", primary: [], secondary: [] },
  { id: "cardio-session", name: "Incline walk, bike or elliptical", equipment: "cardio", type: "time", primary: [], secondary: [] },
  { id: "mobility", name: "Stretching and mobility", equipment: "cardio", type: "time", primary: [], secondary: [] },
];

const BY_ID = new Map(LIBRARY.map((e) => [e.id, e]));

export function findExercise(id: string, custom: Exercise[]): Exercise | undefined {
  return BY_ID.get(id) ?? custom.find((e) => e.id === id);
}

export function defaultUnit(equipment: Equipment): Unit {
  return equipment === "cable" || equipment === "smith" ? "lb" : "kg";
}

export function isWeighted(ex: Exercise): boolean {
  return ex.type === "reps" && ex.equipment !== "bodyweight";
}

/** Library groupings for the picker, by where the work lands. */
export const LIBRARY_GROUPS: { label: string; muscles: Muscle[]; time?: boolean }[] = [
  { label: "Glutes and legs", muscles: ["glutes", "hamstrings", "quads", "adductors", "calves"] },
  { label: "Back and shoulders", muscles: ["upper-back", "traps", "shoulders", "lower-back"] },
  { label: "Chest and arms", muscles: ["chest", "biceps", "triceps", "forearms"] },
  { label: "Core", muscles: ["abs", "obliques"] },
  { label: "Cardio and mobility", muscles: [], time: true },
];

export function groupOf(ex: Exercise): string {
  if (ex.type === "time") return "Cardio and mobility";
  const lead = ex.primary[0];
  const g = LIBRARY_GROUPS.find((grp) => lead && grp.muscles.includes(lead));
  return g ? g.label : "Core";
}
