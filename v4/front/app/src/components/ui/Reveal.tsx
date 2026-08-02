import { useEffect, useRef, useState, type ElementType } from "react";
import { prefersReducedMotion } from "../../../lib/motion";

type RevealProps = {
  as?: ElementType;
  delay?: number; // segundos — stagger por grupo
  className?: string;
  children?: React.ReactNode;
} & Record<string, unknown>;

/* Padrão único de reveal (fade + translateY 20px), dispara uma vez.
   Reduced-motion entrega o estado final sem transição. */
export function Reveal({
  as: Tag = "div",
  delay = 0,
  className = "",
  children,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setReduced(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style = reduced
    ? undefined
    : {
        opacity: inView ? 1 : 0,
        transform: inView ? "none" : "translateY(20px)",
        transition:
          "opacity 0.6s var(--ease-milo), transform 0.6s var(--ease-milo)",
        transitionDelay: `${delay}s`,
      };

  return (
    <Tag ref={ref} className={className} style={style} {...rest}>
      {children}
    </Tag>
  );
}
