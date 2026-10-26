import { Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { fmtSet } from "./logic";
import type { Exercise, PRKind, SetEntry, Unit } from "./types";

const KIND_LABEL: Record<PRKind, string> = {
  weight: "Heaviest yet",
  reps: "Most reps at this weight",
  hold: "Longest hold yet",
};

export function announcePR(ex: Exercise, set: SetEntry, unit: Unit, kind: PRKind) {
  toast("New personal best", {
    description: `${ex.name} · ${fmtSet(set, ex, unit)} · ${KIND_LABEL[kind]}`,
    icon: <Sparkle size={18} weight="fill" className="text-accent" />,
  });
}

export function prKindLabel(kind: PRKind): string {
  return kind === "weight" ? "Weight PR" : kind === "hold" ? "Hold PR" : "Rep PR";
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
