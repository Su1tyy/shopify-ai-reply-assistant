import { useEffect, useRef } from "react";

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  color: string;
  round: boolean;
}

/** One-shot confetti, fired each time `fire` changes to a new positive number. Skipped under reduced motion. */
export function Burst({ fire, originY = 0.3 }: { fire: number; originY?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fire) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const css = getComputedStyle(document.documentElement);
    const palette = ["--accent", "--heat-1", "--heat-3", "--accent-soft", "--text"].map((v) => css.getPropertyValue(v).trim() || "#c2677a");
    const ox = W / 2;
    const oy = H * originY;
    const pieces: Piece[] = Array.from({ length: 90 }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.95;
      const speed = 7 + Math.random() * 9;
      return {
        x: ox + (Math.random() - 0.5) * 40,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        w: 5 + Math.random() * 4,
        h: 8 + Math.random() * 6,
        color: palette[Math.floor(Math.random() * palette.length)],
        round: Math.random() < 0.3,
      };
    });

    const start = performance.now();
    const LIFE = 1900;
    let raf = 0;
    const tick = (t: number) => {
      const age = t - start;
      ctx.clearRect(0, 0, W, H);
      const alpha = age > LIFE - 450 ? Math.max(0, (LIFE - age) / 450) : 1;
      for (const p of pieces) {
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + 0.32;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Squash the width with the spin so the pieces read as flat paper turning over.
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w * Math.abs(Math.cos(p.rot * 2)), p.h);
        }
        ctx.restore();
      }
      if (age < LIFE) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [fire, originY]);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[85] h-full w-full" />;
}
