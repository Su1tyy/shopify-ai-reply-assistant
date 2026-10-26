import { memo } from "react";
import body from "../data/body_female.json";
import type { Muscle } from "../lib/types";

/*
 * Female figure artwork adapted from react-native-body-highlighter
 * (c) 2022 ELABBASSI Hicham, MIT License. Full notice in src/data/BODY_DIAGRAM_LICENSE.txt
 * and on the app's Credits screen.
 */

type View = "front" | "back";
interface PathSet {
  common?: string[];
  left?: string[];
  right?: string[];
}
const DATA = body as unknown as {
  front: Record<string, PathSet>;
  back: Record<string, PathSet>;
  outline: Record<View, string>;
};

// Both figures measure 629 x 1428 units; matching boxes keep them the same size side by side.
const VIEWBOX: Record<View, string> = {
  front: "-4 -10 649 1448",
  back: "818 -10 649 1448",
};

const SLUG_TO_MUSCLE: Record<string, Muscle> = {
  chest: "chest",
  deltoids: "shoulders",
  biceps: "biceps",
  triceps: "triceps",
  forearm: "forearms",
  abs: "abs",
  obliques: "obliques",
  trapezius: "traps",
  "upper-back": "upper-back",
  "lower-back": "lower-back",
  gluteal: "glutes",
  adductors: "adductors",
  quadriceps: "quads",
  hamstring: "hamstrings",
  calves: "calves",
};

export type MapMode = "focus" | "heat";
export type MuscleValues = Partial<Record<Muscle, number>>;

/** Heat buckets, in sets per week. Kept in one place so the legend and the fills always agree. */
export const HEAT_STEPS: { max: number; label: string; color: string }[] = [
  { max: 4, label: "1–4", color: "var(--heat-1)" },
  { max: 8, label: "5–8", color: "var(--heat-2)" },
  { max: 12, label: "9–12", color: "var(--heat-3)" },
  { max: Infinity, label: "13+", color: "var(--heat-4)" },
];

function muscleFill(v: number, mode: MapMode): string {
  if (v <= 0) return "var(--body-muscle)";
  if (mode === "focus") return v >= 1 ? "var(--heat-3)" : "var(--heat-1)";
  return HEAT_STEPS.find((s) => v <= s.max)!.color;
}

function allPaths(ps: PathSet): string[] {
  return [...(ps.common ?? []), ...(ps.left ?? []), ...(ps.right ?? [])];
}

const Figure = memo(function Figure({ view, values, mode }: { view: View; values: MuscleValues; mode: MapMode }) {
  return (
    <svg viewBox={VIEWBOX[view]} className="h-full w-auto overflow-visible" aria-hidden="true">
      <path
        d={DATA.outline[view]}
        fill="var(--body-skin)"
        stroke="var(--body-outline)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
      {Object.entries(DATA[view]).map(([slug, ps]) => {
        const muscle = SLUG_TO_MUSCLE[slug];
        const fill = muscle
          ? muscleFill(values[muscle] ?? 0, mode)
          : slug === "hair"
            ? "var(--body-hair)"
            : "var(--body-skin)";
        return allPaths(ps).map((d, i) => (
          <path
            key={`${slug}-${i}`}
            d={d}
            fill={fill}
            stroke="var(--map-gap, var(--surface))"
            strokeWidth={1.25}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            style={{ transition: "fill 320ms var(--ease-out)" }}
          />
        ));
      })}
    </svg>
  );
});

export function BodyMap({
  values,
  mode = "focus",
  height = 160,
  gap = 10,
  className = "",
  label,
}: {
  values: MuscleValues;
  mode?: MapMode;
  height?: number;
  gap?: number;
  className?: string;
  label?: string;
}) {
  return (
    <div className={`flex items-end justify-center ${className}`} style={{ height, gap }} role="img" aria-label={label}>
      <Figure view="front" values={values} mode={mode} />
      <Figure view="back" values={values} mode={mode} />
    </div>
  );
}
