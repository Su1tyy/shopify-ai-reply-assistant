import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { fmtShortDate, fmtWeekdayShortDate, fromKey } from "../lib/dates";
import { fmtNum } from "../lib/logic";

export interface ChartPoint {
  date: string;
  y: number;
  pr: boolean;
  /** What the tooltip says, e.g. "14 kg × 12". */
  label: string;
}

function niceStep(range: number, count: number): number {
  const raw = range / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * mag;
}

function niceScale(min: number, max: number, count = 4) {
  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.1);
    min -= pad;
    max += pad;
  }
  const step = niceStep(max - min, count);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { lo, hi, ticks };
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const PAD = { l: 34, r: 48, t: 14, b: 26 };

/**
 * Single-series line chart: hairline grid, 2px line, 8px markers with a surface ring,
 * personal bests drawn larger with an outer ring, crosshair and tooltip on touch or hover.
 */
export function LineChart({
  points,
  unit,
  height = 210,
  label,
}: {
  points: ChartPoint[];
  unit: string;
  height?: number;
  label: string;
}) {
  const [wrap, w] = useWidth();
  const [active, setActive] = useState<number | null>(null);

  const geo = useMemo(() => {
    if (!w || !points.length) return null;
    const xs = points.map((p) => fromKey(p.date).getTime());
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const { lo, hi, ticks } = niceScale(Math.min(...points.map((p) => p.y)), Math.max(...points.map((p) => p.y)));
    const iw = w - PAD.l - PAD.r;
    const ih = height - PAD.t - PAD.b;
    const sx = (t: number) => PAD.l + (x1 === x0 ? iw / 2 : ((t - x0) / (x1 - x0)) * iw);
    const sy = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo || 1)) * ih;
    const pts = points.map((p, i) => ({ ...p, x: sx(xs[i]), py: sy(p.y) }));
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.py.toFixed(1)}`).join("");
    const base = PAD.t + ih;
    const area = pts.length > 1 ? `${line}L${pts[pts.length - 1].x.toFixed(1)},${base}L${pts[0].x.toFixed(1)},${base}Z` : "";
    return { pts, line, area, ticks, sy, base };
  }, [w, points, height]);

  const pick = (e: PointerEvent<SVGRectElement>) => {
    if (!geo) return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left + PAD.l - 12; // the hit area starts 12px left of the plot
    let best = 0;
    for (let i = 1; i < geo.pts.length; i++) {
      if (Math.abs(geo.pts[i].x - x) < Math.abs(geo.pts[best].x - x)) best = i;
    }
    setActive(best);
  };

  const a = geo && active !== null ? geo.pts[active] : null;
  const last = geo ? geo.pts[geo.pts.length - 1] : null;
  const tipW = 148;

  return (
    <div className="relative" ref={wrap}>
      <svg width={w} height={height} role="img" aria-label={label} className="block overflow-visible">
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {geo && (
          <>
            {geo.ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.l} x2={w - PAD.r + 8} y1={geo.sy(t)} y2={geo.sy(t)} stroke="var(--line)" strokeWidth={1} />
                <text x={PAD.l - 8} y={geo.sy(t) + 4} textAnchor="end" fontSize={11} fill="var(--text-3)" className="tnum">
                  {fmtNum(t)}
                </text>
              </g>
            ))}
            {geo.area && <path d={geo.area} fill="url(#chart-fill)" />}
            {geo.pts.length > 1 && (
              <path d={geo.line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            )}
            {a && <line x1={a.x} x2={a.x} y1={PAD.t - 4} y2={geo.base} stroke="var(--text-3)" strokeWidth={1} />}
            {geo.pts.map((p, i) =>
              p.pr ? (
                <g key={p.date + i}>
                  <circle cx={p.x} cy={p.py} r={8.5} fill="none" stroke="var(--accent)" strokeWidth={1.5} />
                  <circle cx={p.x} cy={p.py} r={5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
                </g>
              ) : (
                <circle key={p.date + i} cx={p.x} cy={p.py} r={4} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
              ),
            )}
            {a && <circle cx={a.x} cy={a.py} r={6} fill="var(--text)" stroke="var(--surface)" strokeWidth={2} />}
            {last && (
              <text x={last.x + (last.pr ? 14 : 10)} y={last.py + 4} fontSize={12} fontWeight={600} fill="var(--text)" className="tnum">
                {fmtNum(last.y)} {unit}
              </text>
            )}
            <text x={PAD.l} y={height - 6} fontSize={11} fill="var(--text-3)">
              {fmtShortDate(fromKey(points[0].date))}
            </text>
            {points.length > 1 && (
              <text x={w - PAD.r} y={height - 6} fontSize={11} fill="var(--text-3)" textAnchor="end">
                {fmtShortDate(fromKey(points[points.length - 1].date))}
              </text>
            )}
            <rect
              x={PAD.l - 12}
              y={0}
              width={Math.max(0, w - PAD.l - PAD.r + 24)}
              height={height}
              fill="transparent"
              style={{ touchAction: "pan-y", cursor: "crosshair" }}
              onPointerDown={pick}
              onPointerMove={pick}
              onPointerLeave={(e) => {
                if (e.pointerType === "mouse") setActive(null);
              }}
            />
          </>
        )}
      </svg>
      {a && geo && (
        <div
          className="pointer-events-none absolute z-10 rounded-[12px] bg-surface px-3 py-2 shadow-[0_6px_24px_rgba(0,0,0,0.12)] ring-1 ring-line"
          style={{
            width: tipW,
            left: Math.min(Math.max(0, a.x - tipW / 2), Math.max(0, w - tipW)),
            top: a.py > 70 ? a.py - 70 : a.py + 16,
          }}
        >
          <div className="t-cap text-ink-2">{fmtWeekdayShortDate(fromKey(a.date))}</div>
          <div className="t-foot font-semibold tnum text-ink">{a.label}</div>
          {a.pr && <div className="t-cap font-semibold text-accent-strong">Personal best</div>}
        </div>
      )}
    </div>
  );
}

/** Tiny trend line for list rows: no axes, last point marked. */
export function Sparkline({ values, width = 64, height = 26 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <span style={{ width, height }} className="shrink-0" />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = 3;
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) => (hi === lo ? height / 2 : pad + (1 - (v - lo) / (hi - lo)) * (height - pad * 2));
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const lx = x(values.length - 1);
  const ly = y(values[values.length - 1]);
  return (
    <svg width={width} height={height} aria-hidden="true" className="shrink-0 overflow-visible">
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={3} fill="var(--accent)" stroke="var(--surface)" strokeWidth={1.5} />
    </svg>
  );
}
