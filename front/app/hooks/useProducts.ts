import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiFetch } from "../src/clients/laravel/config/client";
import type { MugSettings } from "../src/components/mug/MugStage";
import type { Product } from "../src/types/product";

type ApiProduct = {
  slug: string;
  name: string;
  price: number | string;
  cat: string;
  image_url: string;
  images: { image_url: string }[];
  featured: boolean;
  mockup: Omit<MugSettings, "artUrl"> | null;
  mockup_art_url: string | null;
};

/** Resposta paginada do Laravel. */
type Page = {
  data: ApiProduct[];
  current_page: number;
  last_page: number;
  total: number;
};

const toProduct = (r: ApiProduct): Product => ({
  slug: r.slug,
  name: r.name,
  price: Number(r.price),
  cat: r.cat,
  img: r.image_url,
  images: r.images.map((i) => i.image_url),
  featured: r.featured,
  // O backend guarda o path da arte separado das medidas; o MugStage quer a URL.
  mockup: r.mockup ? { ...r.mockup, artUrl: r.mockup_art_url } : null,
});

/* Produtos buscados da API em runtime (o site é SSG; o grid hidrata e busca). */

/** Os destaques da home, já filtrados e ordenados pelo backend. */
export function useFeaturedProducts() {
  const { data, isError } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () =>
      apiFetch<Page>("/api/products?featured=1&per_page=5").then((p) =>
        p.data.map(toProduct),
      ),
  });

  return { products: data ?? null, error: isError };
}

/**
 * Catálogo com busca e filtro de categoria. As páginas do backend se acumulam
 * numa lista só: o catálogo cresce no "quero ver mais", nunca troca de página.
 */
export function useProductSearch({ q, cat }: { q: string; cat: string }) {
  const { data, isError, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["products", "search", q, cat],
      initialPageParam: 1,
      queryFn: ({ pageParam }) => {
        const params = new URLSearchParams({ page: String(pageParam) });
        if (q) params.set("q", q);
        if (cat) params.set("cat", cat);
        return apiFetch<Page>(`/api/products?${params}`);
      },
      getNextPageParam: (last) =>
        last.current_page < last.last_page ? last.current_page + 1 : undefined,
      // sem isso a lista some a cada troca de busca/categoria
      placeholderData: keepPreviousData,
    });

  return {
    items: data?.pages.flatMap((p) => p.data.map(toProduct)) ?? [],
    total: data?.pages[0]?.total ?? 0,
    hasMore: hasNextPage,
    loadMore: fetchNextPage,
    isLoadingMore: isFetchingNextPage,
    isLoading,
    error: isError,
  };
}

export function useCategories() {
  const { data } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<string[]>("/api/categories"),
  });

  return data ?? [];
}
