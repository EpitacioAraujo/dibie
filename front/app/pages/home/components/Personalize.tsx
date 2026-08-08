import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Reveal } from "../../../src/components/ui/Reveal";
import { WHATSAPP_URL } from "../../../lib/config";
import { prefersReducedMotion } from "../../../lib/motion";

// three + o loader de .glb passam de 600 KB: só baixa quando a seção chega perto.
const MugStage = lazy(() =>
  import("../../../src/components/mug/MugStage").then((m) => ({
    default: m.MugStage,
  })),
);

/** As três artes do 3º slide da hero, na mesma ordem. */
const ARTS = [
  "/img/art-paciencia.webp",
  "/img/art-nature.webp",
  "/img/art-ele-vive.webp",
];

/** Uma volta completa. Lento de propósito: é vitrine, não carrossel. */
const TURN_MS = 14000;

/**
 * Medidas da caneca em cm, iguais às de MUG_DEFAULTS. Repetidas aqui de
 * propósito: importar o valor de MugStage puxaria o three inteiro para o chunk
 * da home e anularia o lazy acima.
 */
const MUG_CM = {
  circumference: 26.5,
  height: 9.5,
  artWidth: 21,
  artHeight: 9.3,
};

export function Personalize() {
  const sectionRef = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  const [art, setArt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reduced] = useState(prefersReducedMotion);

  // Só monta o 3D quando a seção se aproxima da viewport.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // A troca acontece com a arte de costas, então a próxima já tem que estar em
  // cache — senão o repaint pinta a caneca lisa até a imagem chegar.
  useEffect(() => {
    if (!near) return;
    ARTS.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [near]);

  return (
    <section
      ref={sectionRef}
      className="px-6 pt-[120px] pb-[140px] md:px-12"
      aria-labelledby="personalize-titulo"
    >
      <div className="relative mx-auto w-full max-w-[720px]">
        <Reveal
          as="h2"
          id="personalize-titulo"
          className="m-0 mb-6 text-h2 md:absolute md:left-0 md:top-0 md:z-10 md:mb-0 md:max-w-[300px]"
        >
          Personalizamos
        </Reveal>

        <div className="pointer-events-none relative aspect-square w-full md:mx-auto md:w-[86%]">
          {error ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-body text-ink-40">
              {error}
            </div>
          ) : (
            near && (
              <Suspense fallback={null}>
                <MugStage
                  settings={{
                    ...MUG_CM,
                    artUrl: ARTS[art],
                    mugColor: "#ffffff",
                    handleColor: "#ffffff",
                    offsetX: 0,
                    offsetY: 0,
                    rotation: 0,
                    rotateX: 350,
                    rotateY: 0,
                    zoom: 105,
                  }}
                  onError={setError}
                  spin={
                    reduced
                      ? undefined
                      : {
                          periodMs: TURN_MS,
                          onHandleFront: () =>
                            setArt((i) => (i + 1) % ARTS.length),
                        }
                  }
                />
              </Suspense>
            )
          )}
        </div>

        <Reveal
          as="p"
          delay={0.15}
          className="m-0 mt-6 text-right text-h2 md:absolute md:bottom-0 md:right-0 md:z-10 md:mt-0 md:max-w-[360px]"
        >
          do jeito que você quer.
        </Reveal>
      </div>

      <Reveal className="mt-12 flex flex-col items-center gap-4 md:mt-16">
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-ink px-6 py-3 text-body text-white transition-opacity hover:opacity-85"
        >
          Personalize a sua
        </a>
        <span className="text-body text-ink-40">
          Manda sua ideia no WhatsApp — a gente responde com a arte.
        </span>
      </Reveal>
    </section>
  );
}
