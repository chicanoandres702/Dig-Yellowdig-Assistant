import { useEffect, useRef } from 'react';

export default function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    const mob = navigator.maxTouchPoints > 0;
    const rsz = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    rsz();
    window.addEventListener('resize', rsz);

    const blobs = [
      { x: .15, y: .25, r: .55, col: [35, 100, 220], sp: .00018, ph: 0 },
      { x: .80, y: .60, r: .45, col: [100, 60, 220], sp: .00013, ph: 2.1 },
      { x: .50, y: .92, r: .42, col: [15, 140, 200], sp: .00015, ph: 4.3 },
    ];
    let t = 0, fc = 0;
    let animationId: number;

    const frame = () => {
      t++;
      if (mob && ++fc % 2 !== 0) {
        animationId = requestAnimationFrame(frame);
        return;
      }
      ctx.clearRect(0, 0, c.width, c.height);
      const W = c.width, H = c.height;
      blobs.forEach(b => {
        const ox = Math.sin(t * b.sp + b.ph) * .08;
        const oy = Math.cos(t * b.sp * .7 + b.ph) * .06;
        const cx = (b.x + ox) * W, cy = (b.y + oy) * H, r = b.r * Math.min(W, H);
        const a = .055 + .015 * Math.sin(t * b.sp * 3 + b.ph);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `rgba(${b.col.join(',')},${a})`);
        g.addColorStop(.5, `rgba(${b.col.join(',')},${a * .32})`);
        g.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      });
      animationId = requestAnimationFrame(frame);
    };
    frame();

    return () => {
      window.removeEventListener('resize', rsz);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}
