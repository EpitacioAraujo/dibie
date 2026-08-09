import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, cubicBezier } from "animejs";
import { useUI } from "../../../stores/ui";
import { useHero, type HeroApiItem, type HeroLane } from "../../../hooks/useHero";
import { prefersReducedMotion } from "../../../lib/motion";
import "./hero.css";

const milo = cubicBezier(0.44, 0, 0.56, 1);
const INTRO_SEEN = "dibie-intro-seen";
const ZOOM_MS = 1200;

/* Os arrays abaixo são o fallback: valem no primeiro paint (o site é pré-renderizado)
   e sempre que a API de hero não responder. O admin sobrescreve pelo /api/hero. */
const TILES = {
  top: [
    { src: "/img/tile-01.webp", delay: 1.1 },
    { src: "/img/tile-02.webp", delay: 0.5 },
    { src: "/img/tile-03.webp", delay: 1.35 },
    { src: "/img/tile-04.webp", delay: 0.8 },
    { src: "/img/tile-09.webp", delay: 1.6 },
  ],
  midLeft: [
    { src: "/img/tile-07.webp", delay: 1.3 },
    { src: "/img/tile-05.webp", delay: 0.65 },
  ],
  midRight: [
    { src: "/img/tile-06.webp", delay: 1.25 },
    { src: "/img/tile-01.webp", delay: 0.9 },
  ],
  bottom: [
    { src: "/img/tile-07.webp", delay: 0.75 },
    { src: "/img/tile-08.webp", delay: 1.45 },
    { src: "/img/tile-10.webp", delay: 0.6 },
    { src: "/img/tile-02.webp", delay: 1.15 },
    { src: "/img/tile-05.webp", delay: 0.85 },
  ],
};

/* `mobile`: versão vertical do mesmo cenário — a hero no celular é retrato e o
   recorte da imagem larga cortava as canecas. Só o fallback tem: o que vem do
   admin é uma imagem só. */
type Slide = {
  src: string;
  mobile?: string;
  alt: string;
  title: string;
  sub: string;
};

const SLIDES: Slide[] = [
  {
    src: "/img/slide-01.webp",
    mobile: "/img/slide-01-mobile.jpg",
    alt: "Canecas personalizadas com a logo de uma empresa",
    title: "Sua marca em cada mesa",
    sub: "Brindes corporativos sob encomenda",
  },
  {
    src: "/img/slide-02.webp",
    mobile: "/img/slide-02-mobile.jpg",
    alt: "Caneca sendo personalizada com a arte do cliente",
    title: "Feito com você.\nFeito para você.",
    sub: "Do rascunho à peça pronta",
  },
  {
    src: "/img/slide-03.webp",
    mobile: "/img/slide-03-mobile.jpg",
    alt: "Canecas dibiê com artes diferentes",
    title: "Uma arte para\ncada gosto",
    sub: "Escolha uma das nossas ou crie a sua",
  },
];

const DRIFT = {
  top: { from: 4, to: -7, dur: 6000 },
  mid: { from: 12, to: -12, dur: 7000 },
  bottom: { from: 5, to: -6.5, dur: 7500 },
};

type Tile = { src: string; delay: number };

/** Junta o conteúdo vindo da API com o fallback local, faixa por faixa. */
function useHeroContent() {
  const remote = useHero();

  const pick = <T,>(
    l: HeroLane,
    map: (i: HeroApiItem, n: number) => T,
    fallback: T[],
  ) => {
    const rows = (remote ?? []).filter((i) => i.lane === l);
    return rows.length ? rows.map(map) : fallback;
  };

  // ponytail: o delay do stagger sai da posição — nunca foi editável mesmo.
  const tile = (i: HeroApiItem, n: number): Tile => ({
    src: i.image_url,
    delay: 0.5 + (n % 5) * 0.25,
  });

  return {
    tiles: {
      top: pick("top", tile, TILES.top),
      midLeft: pick("midLeft", tile, TILES.midLeft),
      midRight: pick("midRight", tile, TILES.midRight),
      bottom: pick("bottom", tile, TILES.bottom),
    },
    slides: pick<Slide>(
      "slide",
      (i) => ({
        src: i.image_url,
        alt: i.alt ?? "",
        title: i.title ?? "",
        sub: i.sub ?? "",
      }),
      SLIDES,
    ),
  };
}

export function Hero() {
  const { tiles, slides } = useHeroContent();
  const setIntroPhase = useUI((s) => s.setIntroPhase);
  const introPhase = useUI((s) => s.introPhase);
  const booted = useUI((s) => s.booted);

  const startedRef = useRef(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const topTrackRef = useRef<HTMLDivElement>(null);
  const midTrackRef = useRef<HTMLDivElement>(null);
  const bottomTrackRef = useRef<HTMLDivElement>(null);
  const topRowRef = useRef<HTMLDivElement>(null);
  const bottomRowRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState(false);

  // posição/tamanho final do frame (preenche a .hero, menos padding).
  // No celular o slide fica com 70% da altura, centralizado.
  function finalFrame(h: DOMRect) {
    const mobile = window.innerWidth < 768;
    const pad = mobile ? 24 : 48;
    const height = mobile ? h.height * 0.7 : h.height - 24;
    return {
      left: pad,
      top: mobile ? (h.height - height) / 2 : 0,
      width: h.width - pad * 2,
      height,
    };
  }

  useLayoutEffect(() => {
    const hero = heroRef.current;
    const frame = frameRef.current;
    if (!hero || !frame) return;

    const reduced = prefersReducedMotion();
    const seen =
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem(INTRO_SEEN);

    // estado inicial dos trilhos (translateX --from), antes de qualquer medida
    if (topTrackRef.current)
      topTrackRef.current.style.transform = `translateX(${DRIFT.top.from}%)`;
    if (midTrackRef.current)
      midTrackRef.current.style.transform = `translateX(${DRIFT.mid.from}%)`;
    if (bottomTrackRef.current)
      bottomTrackRef.current.style.transform = `translateX(${DRIFT.bottom.from}%)`;

    // pular a intro: já vista nesta sessão ou reduced-motion → estado final
    if (reduced || seen) {
      const f = finalFrame(hero.getBoundingClientRect());
      Object.assign(frame.style, {
        left: `${f.left}px`,
        top: `${f.top}px`,
        width: `${f.width}px`,
        height: `${f.height}px`,
        opacity: "1",
      });
      frame.classList.add("zoomed");
      if (topRowRef.current) topRowRef.current.style.display = "none";
      if (bottomRowRef.current) bottomRowRef.current.style.display = "none";
      hero
        .querySelectorAll<HTMLElement>('[data-row="mid"] .mosaic-tile')
        .forEach((t) => (t.style.display = "none"));
      setIntroPhase("ready");
      setReady(true);
      return;
    }

    // espera o contador do preloader chegar a 100% (booted) para iniciar
    if (!booted || startedRef.current) return;
    startedRef.current = true;

    // ---- sequência animada ----
    setIntroPhase("intro");
    document.body.style.overflow = "hidden";

    const tiles = hero.querySelectorAll<HTMLElement>(".mosaic-tile");
    let cancelled = false;

    const startTimer = window.setTimeout(() => {
      if (cancelled) return;

      // tiles surgem fora de ordem (só fade-in, delay individual)
      tiles.forEach((tile) => {
        animate(tile, {
          opacity: [0, 1],
          duration: 800,
          delay: parseFloat(tile.dataset.delay || "0") * 1000,
          ease: milo,
        });
      });
      // frame aparece
      animate(frame, { opacity: [0, 1], duration: 800, delay: 1000, ease: milo });

      // trilhos deslizam (cada um numa velocidade, linear, sem parar)
      const drift = (
        ref: React.RefObject<HTMLDivElement | null>,
        d: { to: number; dur: number }
      ) => {
        if (ref.current)
          animate(ref.current, {
            translateX: `${d.to}%`,
            duration: d.dur,
            ease: "linear",
          });
      };
      drift(topTrackRef, DRIFT.top);
      drift(midTrackRef, DRIFT.mid);
      drift(bottomTrackRef, DRIFT.bottom);

      // frame desliza sincronizado com o trilho do meio até o centro
      const spacer = spacerRef.current;
      const midTrack = midTrackRef.current;
      if (!spacer || !midTrack) return;
      const s = spacer.getBoundingClientRect();
      const h = hero.getBoundingClientRect();
      const t = midTrack.getBoundingClientRect();

      const startLeft = s.left - h.left;
      const top = s.top - h.top;
      const targetLeft = h.width / 2 - s.width / 2;
      const speed = (0.24 * t.width) / 7000; // px/ms (mid: 24% em 7s)
      const duration = Math.max(1, (startLeft - targetLeft) / speed);

      frame.style.left = `${startLeft}px`;
      frame.style.top = `${top}px`;

      animate(frame, {
        left: `${targetLeft}px`,
        duration,
        ease: "linear",
        onComplete: () => {
          if (!cancelled) startZoom();
        },
      });
    }, 400);

    function startZoom() {
      const heroEl = heroRef.current;
      const frameEl = frameRef.current;
      if (!heroEl || !frameEl) return;

      setIntroPhase("zooming"); // header entra
      frameEl.classList.add("zoomed");

      const h = heroEl.getBoundingClientRect();
      const f = finalFrame(h);

      // linhas de cima/baixo saem; tiles do meio somem
      if (topRowRef.current)
        animate(topRowRef.current, {
          translateY: "-160%",
          opacity: 0,
          duration: 1000,
          ease: milo,
        });
      if (bottomRowRef.current)
        animate(bottomRowRef.current, {
          translateY: "160%",
          opacity: 0,
          duration: 1000,
          ease: milo,
        });
      heroEl
        .querySelectorAll<HTMLElement>('[data-row="mid"] .mosaic-tile')
        .forEach((tile) =>
          animate(tile, { opacity: 0, duration: 600, delay: 500, ease: milo })
        );

      // o frame cresce a partir da posição real (centro) até preencher a hero
      animate(frameEl, {
        left: `${f.left}px`,
        top: `${f.top}px`,
        width: `${f.width}px`,
        height: `${f.height}px`,
        duration: ZOOM_MS,
        ease: milo,
        onComplete: () => {
          if (!cancelled) finishIntro();
        },
      });
    }

    function finishIntro() {
      document.body.style.overflow = "";
      try {
        sessionStorage.setItem(INTRO_SEEN, "1");
      } catch {
        /* sessionStorage indisponível: intro roda de novo, sem problema */
      }
      setIntroPhase("ready");
      setReady(true);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      document.body.style.overflow = "";
    };
  }, [setIntroPhase, booted]);

  // carrossel: só roda quando a hero está pronta
  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(
      () => setCurrent((c) => (c + 1) % slides.length),
      5000
    );
    return () => window.clearInterval(id);
  }, [ready]);

  const on = introPhase === "ready";

  return (
    <div className="hero" ref={heroRef}>
      <div className="hero-mosaic">
        <div className="hero-mosaic-row" data-row="top" ref={topRowRef}>
          <div className="mosaic-track" ref={topTrackRef}>
            {tiles.top.map((t, i) => (
              <img
                key={i}
                className="mosaic-tile"
                data-delay={t.delay}
                src={t.src}
                alt=""
              />
            ))}
          </div>
        </div>

        <div className="hero-mosaic-row" data-row="mid">
          <div className="mosaic-track" ref={midTrackRef}>
            {tiles.midLeft.map((t, i) => (
              <img
                key={`l${i}`}
                className="mosaic-tile"
                data-delay={t.delay}
                src={t.src}
                alt=""
              />
            ))}
            <div className="mosaic-spacer" ref={spacerRef} />
            {tiles.midRight.map((t, i) => (
              <img
                key={`r${i}`}
                className="mosaic-tile"
                data-delay={t.delay}
                src={t.src}
                alt=""
              />
            ))}
          </div>

          <div className="hero-frame" ref={frameRef}>
            {slides.map((sl, i) => (
              <div
                key={i}
                className={`hero-slide${i === current ? " active" : ""}`}
              >
                <picture>
                  {sl.mobile && (
                    <source media="(max-width: 767px)" srcSet={sl.mobile} />
                  )}
                  <img src={sl.src} alt={sl.alt} />
                </picture>
              </div>
            ))}
            <div className={`hero-shade${on ? " on" : ""}`} />
            <div className={`hero-caption${on ? " on" : ""}`}>
              <div className="hero-caption-slides">
                {slides.map((sl, i) => (
                  <div
                    key={i}
                    className={`caption${i === current ? " active" : ""}`}
                  >
                    <p className="text-h2">{sl.title}</p>
                    <p className="text-body">{sl.sub}</p>
                  </div>
                ))}
              </div>
              <div className="hero-dots">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    className={`dot${i === current ? " active" : ""}`}
                    aria-label={`Slide ${i + 1}`}
                    onClick={() => setCurrent(i)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="hero-mosaic-row" data-row="bottom" ref={bottomRowRef}>
          <div className="mosaic-track" ref={bottomTrackRef}>
            {tiles.bottom.map((t, i) => (
              <img
                key={i}
                className="mosaic-tile"
                data-delay={t.delay}
                src={t.src}
                alt=""
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
