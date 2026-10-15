import { useEffect, useRef } from 'react';

/* Panal vivo: rejilla de hexágonos que se ilumina por donde pasan las abejas,
   y abejas que vuelan solas; una de ellas persigue el puntero (o el dedo)
   durante unos segundos después de moverlo o tocar la pantalla.
   Es solo decorativo (pointer-events: none) y respeta prefers-reduced-motion. */

type Bee = { x: number; y: number; a: number; sp: number; ph: number; s: number };

export default function LivingHive() {
  const bgRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const bg = bgRef.current, fx = fxRef.current;
    if (!bg || !fx) return;
    const bctx = bg.getContext('2d'), fctx = fx.getContext('2d');
    if (!bctx || !fctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const grid = document.createElement('canvas');
    const gctx = grid.getContext('2d');
    if (!gctx) return;

    let W = 0, H = 0, DPR = 1, R = 30, cw = 0, rh = 0, cols = 0, rows = 0;
    const glow = new Map<number, { c: number; r: number; v: number }>();
    let bees: Bee[] = [];
    let target: { x: number; y: number } | null = null;
    let lastMove = 0;
    let raf = 0;
    let running = true;

    const hexPath = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 180) * (60 * i - 30);
        const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.closePath();
    };
    const cxOf = (c: number, r: number) => c * cw + (r & 1 ? cw / 2 : 0);
    const cyOf = (r: number) => r * rh;

    const size = () => {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      [bg, fx, grid].forEach((c) => { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); });
      bg.style.width = fx.style.width = W + 'px';
      bg.style.height = fx.style.height = H + 'px';
      R = W < 520 ? 26 : 32; cw = Math.sqrt(3) * R; rh = 1.5 * R;
      cols = Math.ceil(W / cw) + 3; rows = Math.ceil(H / rh) + 3;
      gctx.setTransform(DPR, 0, 0, DPR, 0, 0); gctx.clearRect(0, 0, W, H);
      gctx.strokeStyle = 'rgba(242,167,27,.10)'; gctx.lineWidth = 1; gctx.beginPath();
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) hexPath(gctx, cxOf(c, r), cyOf(r), R - 1);
      gctx.stroke();
      glow.clear();
      const n = W < 520 ? 3 : 5;
      bees = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.8, a: Math.random() * 6.28, sp: 48 + Math.random() * 34, ph: Math.random() * 20, s: 1.05 + Math.random() * 0.45 }));
    };

    const lightAt = (x: number, y: number, strength: number) => {
      const r0 = Math.round(y / rh);
      for (let r = r0 - 2; r <= r0 + 2; r++) {
        if (r < 0 || r >= rows) continue;
        const c0 = Math.round((x - (r & 1 ? cw / 2 : 0)) / cw);
        for (let c = c0 - 2; c <= c0 + 2; c++) {
          if (c < 0 || c >= cols) continue;
          const d = Math.hypot(x - cxOf(c, r), y - cyOf(r)), lim = R * 1.9;
          if (d < lim) {
            const v = (1 - d / lim) * strength, k = r * cols + c;
            let o = glow.get(k);
            if (!o) { o = { c, r, v: 0 }; glow.set(k, o); }
            if (v > o.v) o.v = v;
          }
        }
      }
    };

    const drawBee = (ctx: CanvasRenderingContext2D, b: Bee, t: number) => {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a); ctx.scale(b.s, b.s);
      const f = Math.sin(t * 75 + b.ph) * 0.5 + 0.5;
      ctx.shadowColor = 'rgba(242,167,27,.65)'; ctx.shadowBlur = 12;
      ctx.fillStyle = 'rgba(255,244,214,.6)';
      [-1, 1].forEach((g) => { ctx.beginPath(); ctx.ellipse(-1, g * (5 + f * 1.6), 6.5, 2.1 + f * 2.3, g * -0.55, 0, 6.283); ctx.fill(); });
      ctx.shadowBlur = 6; ctx.fillStyle = '#F2A71B';
      ctx.beginPath(); ctx.ellipse(0, 0, 7.5, 4.4, 0, 0, 6.283); ctx.fill();
      ctx.shadowBlur = 0; ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 7.5, 4.4, 0, 0, 6.283); ctx.clip();
      ctx.fillStyle = '#1a1208'; ctx.fillRect(-4.2, -6, 2.2, 12); ctx.fillRect(0, -6, 2.2, 12); ctx.restore();
      ctx.fillStyle = '#1a1208'; ctx.beginPath(); ctx.arc(8, 0, 2.7, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7.4, 0); ctx.lineTo(-10, 0); ctx.strokeStyle = '#1a1208'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    };

    const drawGlow = () => {
      bctx.setTransform(DPR, 0, 0, DPR, 0, 0); bctx.clearRect(0, 0, W, H); bctx.drawImage(grid, 0, 0, W, H);
      glow.forEach((o) => {
        bctx.beginPath(); hexPath(bctx, cxOf(o.c, o.r), cyOf(o.r), R - 1.5);
        bctx.fillStyle = `rgba(242,167,27,${(o.v * 0.2).toFixed(3)})`; bctx.fill();
        bctx.strokeStyle = `rgba(255,196,70,${(o.v * 0.75).toFixed(3)})`; bctx.lineWidth = 1.2; bctx.stroke();
      });
    };

    size();
    let lastW = window.innerWidth, rt = 0;
    const onResize = () => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth; window.clearTimeout(rt); rt = window.setTimeout(size, 150);
    };
    window.addEventListener('resize', onResize);

    let cleanupMove = () => {};
    if (reduce) {
      for (let i = 0; i < 14; i++) lightAt(Math.random() * W, Math.random() * Math.min(H, 700), 0.9);
      drawGlow();
    } else {
      const mv = (e: PointerEvent) => { target = { x: e.clientX, y: e.clientY }; lastMove = performance.now(); };
      window.addEventListener('pointermove', mv, { passive: true });
      window.addEventListener('pointerdown', mv, { passive: true });
      cleanupMove = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerdown', mv); };

      let last = performance.now(), amb = 0;
      const frame = (now: number) => {
        if (!running) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
        amb += dt; if (amb > 0.3) { amb = 0; lightAt(Math.random() * W, Math.random() * H, 0.45); }
        fctx.setTransform(DPR, 0, 0, DPR, 0, 0); fctx.clearRect(0, 0, W, H);
        bees.forEach((b, i) => {
          const follow = i === 0 && target && now - lastMove < 2600;
          if (follow && target) {
            const dx = target.x - b.x, dy = target.y - b.y, dist = Math.hypot(dx, dy), want = Math.atan2(dy, dx);
            const diff = Math.atan2(Math.sin(want - b.a), Math.cos(want - b.a));
            b.a += Math.max(-6 * dt, Math.min(6 * dt, diff * 8 * dt));
            b.sp = dist < 26 ? 70 : Math.min(220, 60 + dist * 2.2);
            if (dist < 26) b.a += dt * 4;
          } else {
            b.a += (Math.sin(t * 0.9 + b.ph) + Math.sin(t * 1.7 + b.ph * 2.3)) * dt * 1.5;
            b.sp += (48 + Math.sin(t + b.ph) * 18 - b.sp) * dt;
            const m = 50;
            if (b.x < m || b.x > W - m || b.y < m || b.y > H - m) {
              const w2 = Math.atan2(H / 2 - b.y, W / 2 - b.x), d2 = Math.atan2(Math.sin(w2 - b.a), Math.cos(w2 - b.a));
              b.a += d2 * dt * 2.6;
            }
          }
          b.x += Math.cos(b.a) * b.sp * dt; b.y += Math.sin(b.a) * b.sp * dt;
          b.x = Math.max(-20, Math.min(W + 20, b.x)); b.y = Math.max(-20, Math.min(H + 20, b.y));
          lightAt(b.x, b.y, 1);
          drawBee(fctx, b, t);
        });
        glow.forEach((o, k) => { o.v -= dt * 0.55; if (o.v <= 0.02) glow.delete(k); });
        drawGlow();
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);

      // Pausa cuando la pestaña no está visible (ahorra batería).
      const vis = () => {
        if (document.hidden) { running = false; cancelAnimationFrame(raf); }
        else if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      };
      document.addEventListener('visibilitychange', vis);
      const prev = cleanupMove;
      cleanupMove = () => { prev(); document.removeEventListener('visibilitychange', vis); };
    }

    return () => {
      running = false; cancelAnimationFrame(raf); window.clearTimeout(rt);
      window.removeEventListener('resize', onResize); cleanupMove();
    };
  }, []);

  return (
    <>
      <canvas ref={bgRef} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[1]" />
      <canvas ref={fxRef} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[30]" />
    </>
  );
}
