import { useEffect, useState } from "react";
import type { Route } from "./+types/produtos";
import { Reveal } from "../src/components/ui/Reveal";
import { ProductRow } from "../src/components/ProductGrid";
import { useCategories, useProductSearch } from "../hooks/useProducts";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Nossas peças — dibiê" },
    {
      name: "description",
      content: "Todas as canecas e kits personalizados da dibiê.",
    },
  ];
}

export default function Produtos() {
  const [search, setSearch] = useState(""); // o que está digitado
  const [q, setQ] = useState(""); // o que já foi para a API
  const [cat, setCat] = useState("");

  const categories = useCategories();
  const { items, hasMore, loadMore, isLoadingMore, isLoading } = useProductSearch({
    q,
    cat,
  });

  // debounce: não dispara uma request por tecla
  useEffect(() => {
    const id = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  // linhas de 3 para manter o stagger do Reveal por linha
  const rows = Array.from({ length: Math.ceil(items.length / 3) }, (_, i) =>
    items.slice(i * 3, i * 3 + 3),
  );

  return (
    <>
      {/* heading estático, sem animação de entrada */}
      <div className="px-6 pt-[120px] pb-8 md:px-12">
        <h1 className="m-0 text-h2">Nossas peças</h1>
      </div>

      <div className="flex flex-wrap gap-3 px-6 pb-10 md:px-12">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="buscar por nome ou código"
          aria-label="Buscar peças"
          className="min-w-0 flex-1 rounded-full bg-ink-5 px-5 py-2.5 text-body outline-none"
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          aria-label="Filtrar por categoria"
          className="cursor-pointer rounded-full bg-ink-5 px-5 py-2.5 text-body outline-none"
        >
          <option value="">todas as categorias</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <section className="px-6 md:px-12">
        {rows.map((row, i) => (
          <ProductRow key={i} products={row} cols={3} />
        ))}

        {items.length === 0 && (
          <p className="py-10 text-body text-ink-40">
            {isLoading ? "carregando…" : "nenhuma peça encontrada"}
          </p>
        )}

        {hasMore && (
          <div className="flex justify-center py-6">
            <button
              type="button"
              onClick={() => loadMore()}
              disabled={isLoadingMore}
              className="cursor-pointer rounded-full bg-ink-5 px-6 py-2.5 text-body transition-colors hover:bg-ink-10 disabled:cursor-default disabled:opacity-40"
            >
              {isLoadingMore ? "carregando…" : "quero ver mais"}
            </button>
          </div>
        )}

        {/* Fim do catálogo: a frase é o que fecha a página quando não há mais o
            que carregar. */}
        {!hasMore && items.length > 0 && (
          <Reveal className="pt-10 text-right">
            <h2 className="m-0 text-h2">...e muito mais por vir.</h2>
          </Reveal>
        )}
      </section>
    </>
  );
}
