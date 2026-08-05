import type { Route } from "./+types/route";
import { Link } from "react-router";
import { Hero } from "./components/Hero";
import { Testimonials } from "./components/Testimonials";
import { Reveal } from "../../src/components/ui/Reveal";
import { ProductRow } from "../../src/components/ProductGrid";
import { useFeaturedProducts } from "../../hooks/useProducts";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "dibiê — Sublimação com carinho" },
    {
      name: "description",
      content:
        "Desenvolvemos produtos personalizados sob medida para empresas, eventos e pessoas que valorizam originalidade e qualidade.",
    },
  ];
}

const TRUST = [
  {
    title: "Pagamento seguro",
    desc: "Transações protegidas para comprar sem preocupação",
    icon: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </>
    ),
  },
  {
    title: "Atendimento próximo",
    desc: "Sempre por perto para ajudar no seu pedido",
    icon: (
      <>
        <path d="M4 13a8 8 0 0 1 16 0" />
        <rect x="2" y="13" width="4" height="6" rx="2" />
        <rect x="18" y="13" width="4" height="6" rx="2" />
      </>
    ),
  },
  {
    title: "Troca em 30 dias",
    desc: "Compre sem medo com nossa política de troca",
    icon: (
      <>
        <path d="M4 9v10h16V9" />
        <path d="M9 5l3-3 3 3" />
        <path d="M12 2v12" />
      </>
    ),
  },
  {
    title: "Envio para todo o Brasil",
    desc: "Onde você estiver, sua caneca chega",
    icon: (
      <>
        <path d="M12 2 3 7v10l9 5 9-5V7l-9-5z" />
        <path d="M3 7l9 5 9-5" />
        <path d="M12 12v10" />
      </>
    ),
  },
];

export default function Home() {
  // A API já devolve só os destaques, na ordem definida no admin (máx. 5).
  const { products } = useFeaturedProducts();
  const featured = products ?? [];
  return (
    <>
      <Hero />

      {/* Seção 1: intro da dibiê (bloco único) */}
      <section className="grid gap-6 px-6 pt-[100px] pb-[70px] md:grid-cols-2 md:gap-8 md:px-12">
        <Reveal>
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-40">
            A dibiê
          </p>
        </Reveal>
        <Reveal>
          <h2 className="m-0 max-w-[720px] text-h4">
            Desenvolvemos produtos personalizados sob medida para empresas,
            eventos e pessoas que valorizam originalidade e qualidade.
          </h2>
        </Reveal>
      </section>

      {/* Seção 2: produtos em destaque (por linha, stagger por card) */}
      <section className="px-6 pt-16 md:px-12">
        <ProductRow products={featured.slice(0, 3)} cols={3} />
        {featured.length > 3 && (
          // Os 2 cards grandes só fazem sentido com os 5 slots preenchidos;
          // com 4 destaques o último vira um card normal em vez de gigante.
          <ProductRow
            products={featured.slice(3, 5)}
            cols={featured.length >= 5 ? 2 : 3}
          />
        )}
        <Reveal className="flex justify-center">
          <Link
            to="/pecas"
            className="inline-block rounded-full bg-ink-5 px-[18px] py-2.5 text-body transition-colors hover:bg-ink-10"
          >
            Ver todas
          </Link>
        </Reveal>
      </section>

      {/* Seção 3: confiança (heading em bloco, cards staggered) */}
      <section className="px-6 pt-[140px] text-center md:px-12">
        <Reveal>
          <h2 className="text-h2">
            Confiança de quem
            <br />
            já estampou com a gente
          </h2>
          <p className="mx-auto mt-4 max-w-[340px] text-body text-ink-40">
            Nosso cuidado em cada peça conquistou clientes pelo Brasil inteiro.
          </p>
        </Reveal>
        <div className="mt-16 grid gap-4 text-center md:grid-cols-4">
          {TRUST.map((c, i) => (
            <Reveal
              key={c.title}
              delay={i * 0.12}
              className="rounded-lg bg-ink-5 px-6 py-10"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mx-auto mb-6 block text-ink"
              >
                {c.icon}
              </svg>
              <p className="m-0 text-body">{c.title}</p>
              <p className="mx-auto mt-1.5 max-w-[200px] text-body text-ink-40">
                {c.desc}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      <Testimonials />

      {/* Seção 4: a dibiê por dentro (texto + imagem em bloco) */}
      <section className="grid items-center gap-6 px-6 pt-[140px] md:grid-cols-2 md:gap-8 md:px-12">
        <Reveal>
          <h2 className="m-0 max-w-[480px] text-h2">
            Uma empresa apaixonada por transformar memórias em peças
          </h2>
          <p className="my-8 max-w-[300px] text-body text-ink-40">
            Depois de anos estampando histórias — presentes de família,
            lembranças de festa, canecas de equipe — decidimos levar a dibiê
            para todo mundo.
          </p>
        </Reveal>
        <Reveal
          as="img"
          src="/img/slide-02.webp"
          alt="Produção das peças personalizadas dibiê"
          className="aspect-square w-full rounded object-cover"
        />
      </section>

      {/* Seção 5: newsletter */}
      <section className="px-6 pt-[160px] pb-[120px] text-center md:px-12">
        <Reveal>
          <h2 className="text-h2">Fica de olho na gente</h2>
          <p className="mx-auto mt-4 mb-8 max-w-[320px] text-body text-ink-40">
            Cadastre-se para saber das novidades em primeira mão e ganhar
            descontos especiais.
          </p>
          <form
            className="mx-auto flex w-[min(320px,100%)] items-center gap-2 rounded-full bg-ink-5 py-1.5 pr-1.5 pl-5"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="tel"
              inputMode="tel"
              placeholder="Seu WhatsApp"
              aria-label="Seu WhatsApp"
              className="min-w-0 flex-1 border-none bg-transparent outline-none"
            />
            <button
              type="submit"
              aria-label="Enviar"
              className="h-10 w-10 flex-shrink-0 cursor-pointer rounded-full bg-ink text-white"
            >
              →
            </button>
          </form>
        </Reveal>
      </section>
    </>
  );
}
