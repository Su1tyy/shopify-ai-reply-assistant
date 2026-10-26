import type { DayKey } from "./types";

const JS_DAY: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + n);
  return out;
}

export function dayKeyOf(d: Date): DayKey {
  return JS_DAY[d.getDay()];
}

/** Her training week runs Saturday to Friday. */
export function weekStart(d: Date): Date {
  const offset = (d.getDay() + 1) % 7; // Saturday -> 0, Sunday -> 1, ... Friday -> 6
  return addDays(d, -offset);
}

export function weekIndex(key: DayKey): number {
  return ["sat", "sun", "mon", "tue", "wed", "thu", "fri"].indexOf(key);
}

export function today(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const k = JSON.stringify(opts);
  let f = fmtCache.get(k);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", opts);
    fmtCache.set(k, f);
  }
  return f;
}

export const fmtDayMonth = (d: Date) => fmt({ day: "numeric", month: "long" }).format(d);
export const fmtShortDate = (d: Date) => fmt({ day: "numeric", month: "short" }).format(d);
export const fmtWeekdayShortDate = (d: Date) => fmt({ weekday: "short", day: "numeric", month: "short" }).format(d);
export const fmtMonthYear = (d: Date) => fmt({ month: "long", year: "numeric" }).format(d);
export const fmtWeekday = (d: Date) => fmt({ weekday: "long" }).format(d);

export function fmtRange(start: Date, end: Date): string {
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${fmt({ month: "short" }).format(end)}`;
  }
  return `${fmtShortDate(start)} – ${fmtShortDate(end)}`;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function relativeDay(d: Date, ref: Date): string {
  const diff = daysBetween(d, ref);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  return fmtShortDate(d);
}

/** For use mid-sentence: "today", "yesterday", "3 days ago", "on 12 Oct". */
export function relativePhrase(d: Date, ref: Date): string {
  const diff = daysBetween(d, ref);
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  return `on ${fmtShortDate(d)}`;
}

/** For headings: "Today", "Tomorrow", "In 3 days", "Yesterday", "3 days ago", or the date. */
export function relativeLabel(d: Date, ref: Date): string {
  const diff = daysBetween(ref, d);
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  return relativeDay(d, ref);
}

export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

export function fmtDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 1) return minutes > 0 ? "Under 1 min" : "0 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}

export function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
