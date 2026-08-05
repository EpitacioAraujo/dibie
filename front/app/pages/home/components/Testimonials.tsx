import { useState, type CSSProperties } from "react";
import { Reveal } from "../../../src/components/ui/Reveal";

const TESTIMONIALS = [
  {
    name: "Ana Beatriz",
    role: "Presente para a família",
    text: "Pedi uma caneca com foto de família de presente pro aniversário da minha mãe e ela chorou de emoção. Acabamento impecável.",
    image: "/img/tile-01.webp",
  },
  {
    name: "Marcos Vinícius",
    role: "Revenda de kits personalizados",
    text: "Comprei um kit pra revender na minha loja e o retorno dos clientes foi ótimo — qualidade de sublimação muito acima do que eu esperava.",
    image: "/img/tile-05.webp",
  },
  {
    name: "Belas Artes Tech",
    role: "Brindes corporativos personalizados",
    text: "Fizemos um pedido corporativo com o logo da empresa pra distribuir com o time. Ficou com muito mais acabamento do que imaginávamos.",
    image: "/img/depoimento-empresa.jpg",
  },
  {
    name: "Juliana Prado",
    role: "Lembrancinhas de casamento",
    text: "Encomendei canecas personalizadas pros lembrancinhas do meu casamento. Todo mundo elogiou, virou o item mais comentado da festa.",
    image: "/img/tile-08.webp",
  },
];

// posição de cada card na pilha, por profundidade relativa ao card ativo (rel=0 → topo)
const STACK = [
  { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, z: 3 },
  { x: -14, y: 14, scale: 0.95, rotate: -4, opacity: 1, z: 2 },
  { x: -26, y: 26, scale: 0.9, rotate: -7, opacity: 0.95, z: 1 },
];
// além da pilha visível: posição do card saindo (sobe e encolhe) e de onde o próximo entra
const OFFSTACK = { x: -10, y: -70, scale: 0.75, rotate: -2, opacity: 0, z: 0 };

function stackStyle(rel: number): CSSProperties {
  const s = STACK[rel] ?? OFFSTACK;
  return {
    transform: `translate(${s.x}px, ${s.y}px) scale(${s.scale}) rotate(${s.rotate}deg)`,
    opacity: s.opacity,
    zIndex: s.z,
  };
}

export function Testimonials() {
  const [current, setCurrent] = useState(0);
  const total = TESTIMONIALS.length;
  const active = TESTIMONIALS[current];

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  return (
    <section className="px-6 pt-[140px] md:px-12">
      <Reveal>
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-40">
          Depoimentos
        </p>
      </Reveal>
      <Reveal className="mx-auto mt-12 grid max-w-[820px] items-center gap-10 md:grid-cols-[360px_1fr] md:gap-16">
        <div className="relative aspect-[4/5] w-full max-w-[360px]">
          {TESTIMONIALS.map((t, i) => {
            const rel = (i - current + total) % total;
            return (
              <img
                key={t.name}
                src={t.image}
                alt={`Peça entregue para ${t.name}`}
                className="absolute inset-0 h-full w-full rounded-2xl object-cover shadow-lg transition-all duration-500 ease-milo"
                style={stackStyle(rel)}
              />
            );
          })}
        </div>

        <div>
          <p className="text-h6">{active.name}</p>
          <p className="mt-1 text-body text-ink-40">{active.role}</p>
          <p className="mt-6 max-w-[420px] text-body text-ink-40">
            “{active.text}”
          </p>
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={prev}
              aria-label="Depoimento anterior"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-ink-5 text-body hover:bg-ink-10"
            >
              ←
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Próximo depoimento"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-ink-5 text-body hover:bg-ink-10"
            >
              →
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
