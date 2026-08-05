import { useEffect, useState } from "react";
import { useUI } from "../../stores/ui";
import { prefersReducedMotion } from "../../lib/motion";

const DURATION = 1100; // ms do 0 → 100

/* Contador de carregamento 0→100%, no visual do sistema (fundo, tinta,
   DM Sans + IBM Plex Mono, easing milo). Ao chegar em 100% libera a intro
   do hero (booted) e desaparece com um fade. */
export function Preloader() {
  const setBooted = useUI((s) => s.setBooted);
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false); // iniciou o fade
  const [gone, setGone] = useState(false); // desmontou

  useEffect(() => {
    if (prefersReducedMotion()) {
      setBooted(true);
      setGone(true);
      return;
    }
    document.body.style.overflow = "hidden";
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setCount(Math.round(eased * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setBooted(true); // handoff para a intro do hero durante o fade
        document.body.style.overflow = "";
        setTimeout(() => setDone(true), 120);
        setTimeout(() => setGone(true), 720);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = "";
    };
  }, [setBooted]);

  if (gone) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100] flex flex-col justify-end bg-bg p-6 transition-opacity duration-[600ms] ease-milo md:p-12"
      style={{ opacity: done ? 0 : 1 }}
      aria-hidden
    >
      <div className="flex items-end justify-between">
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-40">
          dibiê — carregando
        </span>
        <span
          className="font-semibold leading-none tracking-[-0.04em]"
          style={{ fontSize: "clamp(4rem, 14vw, 11.25rem)" }}
        >
          {count}
          <span className="text-ink-40">%</span>
        </span>
      </div>
      <div className="mt-6 h-px w-full bg-ink-10">
        <div
          className="h-full bg-ink"
          style={{ width: `${count}%` }}
        />
      </div>
    </div>
  );
}
