import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "../src/clients/laravel/config/client";
import type { Product } from "../src/types/product";

type ApiProduct = {
  slug: string;
  name: string;
  price: number | string;
  cat: string;
  image_url: string;
  images: { image_url: string }[];
  featured: boolean;
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

/** Catálogo com busca, filtro de categoria e paginação (tudo no backend). */
export function useProductSearch({
  q,
  cat,
  page,
}: {
  q: string;
  cat: string;
  page: number;
}) {
  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set("q", q);
  if (cat) params.set("cat", cat);

  const { data, isError, isLoading } = useQuery({
    queryKey: ["products", "search", q, cat, page],
    queryFn: () => apiFetch<Page>(`/api/products?${params}`),
    // sem isso a lista some a cada troca de página
    placeholderData: keepPreviousData,
  });

  return {
    items: data?.data.map(toProduct) ?? [],
    page: data?.current_page ?? page,
    lastPage: data?.last_page ?? 1,
    total: data?.total ?? 0,
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
