import { CaretLeft, CaretRight, Minus, PlayCircle, Plus, Sparkle } from "@phosphor-icons/react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import { fmtNum } from "../lib/logic";
import { useRest } from "../lib/rest";
import type { PRKind } from "../lib/types";

/* The scroll container a pushed screen lives in; null means the window scrolls. */
export const ScrollRootCtx = createContext<RefObject<HTMLDivElement | null> | null>(null);

/** Large title that hands off to a compact, translucent bar once it scrolls away (iOS navigation). */
export function ScreenHeader({
  title,
  subtitle,
  back,
  right,
  eyebrow,
}: {
  title: string;
  subtitle?: ReactNode;
  back?: { label: string; onClick: () => void };
  right?: ReactNode;
  eyebrow?: ReactNode;
}) {
  const root = useContext(ScrollRootCtx);
  const sentinel = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting), {
      root: root?.current ?? null,
      rootMargin: "-44px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  return (
    <>
      <div
        className={`sticky top-0 z-20 transition-[background-color] duration-200 ${compact ? "material hairline-b" : ""}`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="relative flex h-11 items-center justify-between px-2">
          <div className="flex min-w-[80px] items-center">
            {back && (
              <button
                onClick={back.onClick}
                className="press flex h-11 items-center gap-0.5 pl-1 pr-2 text-[17px] text-accent-strong"
              >
                <CaretLeft size={22} weight="bold" />
                {/* Once the title moves into the bar, the label steps aside so long titles never collide with it. */}
                <span className={`max-w-[120px] truncate transition-opacity duration-200 ${compact ? "opacity-0" : "opacity-100"}`}>
                  {back.label}
                </span>
              </button>
            )}
          </div>
          <div
            className={`pointer-events-none absolute inset-x-[84px] truncate text-center t-headline transition-opacity duration-200 ${
              compact ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={!compact}
          >
            {title}
          </div>
          <div className="flex min-w-[80px] items-center justify-end pr-2">{right}</div>
        </div>
      </div>
      <header className="px-5 pb-4">
        {eyebrow && <div className="mb-1">{eyebrow}</div>}
        <h1 className="t-large">{title}</h1>
        {subtitle && <div className="mt-1 t-sub text-ink-2">{subtitle}</div>}
        <div ref={sentinel} className="h-px" />
      </header>
    </>
  );
}

export function Section({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`px-4 ${className}`}>
      {(title || action) && (
        <div className="mb-2 flex items-baseline justify-between px-1">
          {title && <h2 className="t-title3">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Group({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card overflow-hidden ${className}`}>{children}</div>;
}

/** A row inside a Group. Separators are inset like iOS and hidden above the first row. */
export function Row({
  title,
  subtitle,
  left,
  right,
  onClick,
  chevron = !!onClick,
  className = "",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  chevron?: boolean;
  className?: string;
}) {
  const inner = (
    <>
      <span className="absolute left-4 right-0 top-0 h-[0.5px] bg-line group-first:hidden" />
      {left}
      <div className="min-w-0 flex-1">
        <div className="truncate t-body">{title}</div>
        {subtitle && <div className="mt-0.5 truncate t-foot text-ink-2">{subtitle}</div>}
      </div>
      {right}
      {chevron && <CaretRight size={16} weight="bold" className="shrink-0 text-ink-3" />}
    </>
  );
  const cls = `group relative flex w-full min-h-[52px] items-center gap-3 px-4 py-2.5 text-left ${className}`;
  return onClick ? (
    <button onClick={onClick} className={`press hover-fill ${cls}`}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function PRChip({ kind, compact = false }: { kind: PRKind; compact?: boolean }) {
  const label = compact ? "PR" : kind === "weight" ? "Weight PR" : kind === "hold" ? "Hold PR" : "Rep PR";
  return (
    <span className="pr-chip inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold leading-4 text-accent-strong">
      <Sparkle size={11} weight="fill" />
      {label}
    </span>
  );
}

export function Chip({ children, tone = "fill" }: { children: ReactNode; tone?: "fill" | "accent" }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[12px] font-medium leading-4 ${
        tone === "accent" ? "bg-accent-soft text-accent-strong" : "bg-fill text-ink-2"
      }`}
    >
      {children}
    </span>
  );
}

export function IconButton({ label, children, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} title={label} className={`press press-sm grid h-11 w-11 place-items-center rounded-full ${className}`} {...rest}>
      {children}
    </button>
  );
}

/** Number field flanked by - and +; hold either button to repeat. */
export function Stepper({
  value,
  onChange,
  step,
  min = 0,
  max,
  decimals = false,
  label,
  suffix,
  size = "md",
}: {
  value: number | undefined;
  onChange: (n: number) => void;
  step: number;
  min?: number;
  max?: number;
  decimals?: boolean;
  label: string;
  suffix?: string;
  size?: "md" | "lg";
}) {
  const [text, setText] = useState(value === undefined ? "" : fmtNum(value));
  const latest = useRef(value);
  latest.current = value;
  const timers = useRef<{ t?: number; i?: number }>({});

  useEffect(() => setText(value === undefined ? "" : fmtNum(value)), [value]);

  const clamp = (n: number) => {
    const r = Math.round(n * 100) / 100;
    return Math.min(max ?? Infinity, Math.max(min, r));
  };
  const bump = (dir: -1 | 1) => {
    const base = latest.current ?? (dir > 0 ? min - step + step : min);
    const next = clamp((latest.current === undefined && dir > 0 ? 0 : base) + dir * step);
    latest.current = next;
    onChange(next);
  };
  const stop = () => {
    window.clearTimeout(timers.current.t);
    window.clearInterval(timers.current.i);
  };
  const startHold = (dir: -1 | 1) => {
    stop();
    timers.current.t = window.setTimeout(() => {
      timers.current.i = window.setInterval(() => bump(dir), 90);
    }, 420);
  };
  useEffect(() => stop, []);

  const commit = (raw: string) => {
    const n = parseFloat(raw.replace(",", "."));
    if (Number.isNaN(n)) setText(value === undefined ? "" : fmtNum(value));
    else onChange(clamp(n));
  };

  const h = size === "lg" ? "h-14" : "h-11";
  const btn = `press press-sm grid ${h} w-11 shrink-0 place-items-center rounded-ctl text-ink-2`;
  return (
    <div className={`flex ${h} min-w-0 items-center rounded-ctl bg-fill`}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        className={btn}
        onClick={() => bump(-1)}
        onPointerDown={() => startHold(-1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
      >
        <Minus size={18} weight="bold" />
      </button>
      {/* A label, so tapping anywhere between the buttons edits the number; number and unit stay centred together. */}
      <label className="flex h-full min-w-0 flex-1 cursor-text items-center justify-center gap-1">
        <input
          inputMode={decimals ? "decimal" : "numeric"}
          enterKeyHint="done"
          aria-label={label}
          value={text}
          placeholder="–"
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          onFocus={(e) => e.target.select()}
          style={{ width: `${Math.max(1, text.length) + 0.7}ch` }}
          className={`min-w-0 max-w-full bg-transparent text-center tnum outline-none placeholder:text-ink-3 ${
            size === "lg" ? "text-[22px] font-semibold" : "text-[17px] font-semibold"
          }`}
        />
        {suffix && <span className="shrink-0 translate-y-[1px] t-foot text-ink-3">{suffix}</span>}
      </label>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        className={btn}
        onClick={() => bump(1)}
        onPointerDown={() => startHold(1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
      >
        <Plus size={18} weight="bold" />
      </button>
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="press relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200"
      style={{ background: on ? "var(--accent)" : "var(--fill-strong)" }}
    >
      <span
        className="absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.18)] transition-transform duration-200 ease-out"
        style={{ transform: on ? "translateX(20px)" : "none" }}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-[10px] bg-fill p-[2px]">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`press h-8 flex-1 rounded-[8px] px-3 text-[13px] font-semibold transition-colors ${
              on ? "bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-ink-2"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Meter: accent fill on a lighter step of the same hue. */
export function ProgressRing({ value, size = 44, stroke = 5, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent-soft)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: "stroke-dashoffset 500ms var(--ease-out)" }}
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}

export function StatTile({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="card flex-1 px-4 py-3.5">
      <div className="t-foot text-ink-2">{label}</div>
      <div className="mt-1 text-[28px] font-semibold leading-8 tracking-[-0.01em]">{value}</div>
      {detail && <div className="mt-0.5 t-cap text-ink-3">{detail}</div>}
    </div>
  );
}

/** Status circle for an exercise: empty ring, partial arc, or a filled check. */
export function SetsRing({ done, total, size = 26 }: { done: number; total: number; size?: number }) {
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  if (total > 0 && done >= total) {
    return (
      <span className="check-pop grid shrink-0 place-items-center rounded-full bg-ink text-bg" style={{ width: size, height: size }}>
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 20 20" aria-hidden="true">
          <path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fill-strong)" strokeWidth={stroke} />
      {done > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--text)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - done / total)}
          style={{ transition: "stroke-dashoffset 400ms var(--ease-out)" }}
        />
      )}
    </svg>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="px-5 t-foot text-ink-3">{children}</p>;
}

/** Plain number input for list logging: commits on blur or Enter, empty clears the value. */
export function NumField({
  value,
  onCommit,
  label,
  decimals = false,
}: {
  value: number | undefined;
  onCommit: (n: number | undefined) => void;
  label: string;
  decimals?: boolean;
}) {
  const shown = value === undefined ? "" : fmtNum(value);
  const [text, setText] = useState(shown);
  useEffect(() => setText(shown), [shown]);

  const commit = () => {
    const t = text.trim();
    if (t === "") {
      if (value !== undefined) onCommit(undefined);
      return;
    }
    const n = parseFloat(t.replace(",", "."));
    if (Number.isNaN(n) || n < 0) {
      setText(shown);
      return;
    }
    const v = decimals ? Math.round(n * 100) / 100 : Math.round(n);
    if (v !== value) onCommit(v);
    else setText(shown);
  };

  return (
    <input
      inputMode={decimals ? "decimal" : "numeric"}
      enterKeyHint="done"
      aria-label={label}
      value={text}
      placeholder="–"
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      onFocus={(e) => {
        const el = e.target;
        requestAnimationFrame(() => el.select());
      }}
      className="h-11 w-full min-w-0 rounded-ctl bg-fill text-center text-[17px] font-semibold tnum outline-none placeholder:text-ink-3"
    />
  );
}

export function VideoLink({ href }: { href?: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-fill pl-2.5 pr-3.5 t-foot font-semibold text-ink"
    >
      <PlayCircle size={18} weight="fill" className="text-accent" />
      Watch how
    </a>
  );
}

/** Keeps the last rows clear of the tab bar, plus the rest timer when it is showing. */
export function BottomSpacer({ tabBar = true }: { tabBar?: boolean }) {
  const { rest } = useRest();
  const extra = rest ? 92 : 28;
  return (
    <div
      aria-hidden="true"
      style={{
        height: tabBar
          ? `calc(var(--tabbar-h) + env(safe-area-inset-bottom) + ${extra}px)`
          : `calc(env(safe-area-inset-bottom) + ${extra}px)`,
      }}
    />
  );
}
