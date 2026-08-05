import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../lib/motion";
import { INSTAGRAM, WHATSAPP_URL } from "../../lib/config";

export function Footer() {
  const ref = useRef<HTMLParagraphElement>(null);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);

  // wordmark: transição de cor (cinza → tinta), trigger próprio e independente
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

  const wordmarkColor = reduced || inView ? "var(--color-ink)" : "#b9b5ae";

  return (
    <footer className="px-6 pt-12 pb-8 md:px-12">
      <p
        ref={ref}
        aria-hidden
        className="m-0 font-semibold leading-[0.9] tracking-[-0.06em]"
        style={{
          fontSize: "clamp(6rem, 24vw, 23.75rem)",
          color: wordmarkColor,
          transition: "color 1.2s var(--ease-milo)",
        }}
      >
        dibiê
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-6 text-body">
        <div className="flex gap-6">
          <a
            href={INSTAGRAM}
            target="_blank"
            rel="noreferrer"
            className="hover:opacity-70"
          >
            Instagram
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="hover:opacity-70"
          >
            Whatsapp
          </a>
        </div>
        <a href="mailto:contato@dibie.com.br" className="hover:opacity-70">
          contato@dibie.com.br
        </a>
      </div>
    </footer>
  );
}
