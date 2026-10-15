import { useEffect, useRef } from 'react';

/* Panal vivo: rejilla de hexágonos que se ilumina por donde pasan las abejas,
   y abejas que vuelan solas; una de ellas persigue el puntero (o el dedo)
   durante unos segundos después de moverlo o tocar la pantalla.
   Es solo decorativo (pointer-events: none) y respeta prefers-reduced-motion. */

type Bee = {
  x: number; y: number; a: number; sp: number; ph: number; s: number;
  flip: number; // 1 = panza abajo, -1 = invertida; se interpola para que gire de verdad al cambiar de lado
  hold: number; // distancia a la que se queda de su objetivo al perseguir
  chain: boolean; // true: persigue a la abeja de adelante (va "por atrás"); false: persigue el puntero de cerca
  dir: 1 | -1; // sentido en que orbita al alcanzar su objetivo
};

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
      // 4 abejas más que antes (7 en celular, 9 en pantalla grande). Las 4 primeras
      // persiguen el puntero de cerca; las demás van detrás, en fila, siguiendo a la de adelante.
      const n = W < 520 ? 7 : 9;
      const holds = [18, 30, 44, 60];
      bees = Array.from({ length: n }, (_, i) => ({
        x: Math.random() * W, y: Math.random() * H * 0.8, a: Math.random() * 6.28, sp: 48 + Math.random() * 34,
        ph: Math.random() * 20, s: 1.05 + Math.random() * 0.45, flip: 1,
        hold: i < 4 ? holds[i] : 48 + (i - 4) * 6, chain: i >= 4, dir: i % 2 ? 1 : -1,
      }));
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

    /* Abeja con los trazos del logo de Apiarios Carrión (alas triangulares, tórax
       hexagonal, cabeza, antenas, abdomen rayado y patas), dibujada en
       coordenadas del logo (viewBox 120) y animada pieza por pieza:
       aleteo rápido de las tres alas, antenas que tantean, patas que cuelgan
       y abdomen que cabecea. Mira hacia donde vuela. */
    const P = {
      w1: new Path2D('M42 28 L18 8 L25 31 Z'),
      w2: new Path2D('M39 37 L10 24 L23 43 Z'),
      w3: new Path2D('M40 45 L18 48 L31 57 Z'),
      thorax: new Path2D('M42 26 L56 21 L64 34 L56 46 L42 46 L36 36 Z'),
      head: new Path2D('M62 18 Q74 15 76 27 Q77 36 67 38 Q60 39 59 30 Q58 22 62 18 Z'),
      a1: new Path2D('M0 0 L6 -10'),
      a2: new Path2D('M0 0 L8 -8'),
      abd: new Path2D('M38 48 Q27 58 29 74 L31 85 Q44 75 46 59 L46 50'),
      l1: new Path2D('M0 0 L-6 12'),
      l2: new Path2D('M0 0 L6 11'),
    };
    const stripes = ['M32 60 L45 58', 'M31 68 L43 66', 'M33 76 L40 74'].map((d) => new Path2D(d));
    const FACE = 0.705; // el logo mira ~40° hacia arriba-derecha: lo giramos para que mire a +x

    const drawBee = (ctx: CanvasRenderingContext2D, b: Bee, t: number) => {
      const k = b.s * 0.36;
      ctx.save();
      ctx.translate(b.x, b.y + Math.sin(t * 14 + b.ph) * 0.8);
      ctx.rotate(b.a);
      ctx.scale(k, k * b.flip);
      ctx.rotate(FACE);
      ctx.translate(-50, -48);

      const g = ctx.createLinearGradient(10, 5, 90, 100);
      g.addColorStop(0, '#F3D78C'); g.addColorStop(0.5, '#D9A94F'); g.addColorStop(1, '#A97A25');
      ctx.strokeStyle = g; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(243,200,100,.55)'; ctx.shadowBlur = 10 / k * 0.36;

      // Alas: giran sobre su raíz; fase distinta para que se vea aleteo, no un bloque.
      const flap = (path: Path2D, px: number, py: number, off: number, lw: number) => {
        const ang = Math.sin(t * 42 + b.ph + off) * 0.3;
        ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.translate(-px, -py);
        ctx.fillStyle = 'rgba(243,215,140,.12)'; ctx.lineWidth = lw; ctx.fill(path); ctx.stroke(path);
        ctx.restore();
      };
      flap(P.w1, 41, 33, 0, 4); flap(P.w2, 39, 40, 0.9, 4); flap(P.w3, 40, 46, 1.8, 3.5);

      // Patas (cuelgan y se balancean)
      ctx.lineWidth = 4;
      const leg = (path: Path2D, x: number, y: number, off: number) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 9 + b.ph + off) * 0.22); ctx.stroke(path); ctx.restore();
      };
      leg(P.l1, 47, 46, 0); leg(P.l2, 55, 45, 1.6);

      // Abdomen con sus rayas (cabecea apenas)
      ctx.save(); ctx.translate(42, 48); ctx.rotate(Math.sin(t * 7 + b.ph) * 0.06); ctx.translate(-42, -48);
      ctx.lineWidth = 4; ctx.stroke(P.abd); ctx.lineWidth = 3; stripes.forEach((s) => ctx.stroke(s));
      ctx.restore();

      // Tórax y cabeza (relleno oscuro para limpiar los cruces de líneas)
      ctx.fillStyle = 'rgba(26,20,16,.92)';
      ctx.lineWidth = 4; ctx.fill(P.thorax); ctx.stroke(P.thorax);
      ctx.fill(P.head); ctx.stroke(P.head);

      // Antenas tanteando
      ctx.lineWidth = 3.5;
      [[P.a1, 66, 16, 0], [P.a2, 73, 18, 1.3]].forEach(([path, x, y, off]) => {
        ctx.save(); ctx.translate(x as number, y as number); ctx.rotate(Math.sin(t * 6 + b.ph + (off as number)) * 0.16);
        ctx.stroke(path as Path2D); ctx.restore();
      });
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
        const chasing = !!target && now - lastMove < 3600;
        bees.forEach((b, i) => {
          if (chasing && target) {
            // Cerca: va al puntero. Atrás: va a la abeja anterior de la fila.
            const lead = b.chain && i > 0 ? bees[i - 1] : target;
            const wob = Math.sin(t * 2.2 + b.ph) * 0.35; // vaivén para que no vuelen en línea recta perfecta
            const dx = lead.x - b.x, dy = lead.y - b.y, dist = Math.hypot(dx, dy), want = Math.atan2(dy, dx) + wob * Math.min(1, dist / 160);
            const diff = Math.atan2(Math.sin(want - b.a), Math.cos(want - b.a));
            const turn = b.chain ? 7 : 10;
            b.a += Math.max(-turn * dt, Math.min(turn * dt, diff * 9 * dt));
            if (dist > b.hold) b.sp = Math.min(b.chain ? 210 : 250, 60 + (dist - b.hold) * 2.6);
            else { b.sp = 64; b.a += b.dir * dt * 4.2; } // alcanzó su sitio: orbita alrededor
          } else {
            b.a += (Math.sin(t * 0.9 + b.ph) + Math.sin(t * 1.7 + b.ph * 2.3)) * dt * 1.5;
            b.sp += (48 + Math.sin(t + b.ph) * 18 - b.sp) * dt;
            const m = 50;
            if (b.x < m || b.x > W - m || b.y < m || b.y > H - m) {
              const w2 = Math.atan2(H / 2 - b.y, W / 2 - b.x), d2 = Math.atan2(Math.sin(w2 - b.a), Math.cos(w2 - b.a));
              b.a += d2 * dt * 2.6;
            }
          }
          // Si va hacia la izquierda, se voltea (panza abajo) en vez de volar de cabeza.
          const wantFlip = Math.cos(b.a) < 0 ? -1 : 1;
          b.flip += (wantFlip - b.flip) * Math.min(1, dt * 12);
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
