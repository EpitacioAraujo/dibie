import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../src/clients/laravel/config/client";
import type { Product } from "../src/types/product";

type ApiProduct = {
  slug: string;
  name: string;
  price: number | string;
  cat: string;
  image_url: string;
  images: { image_url: string }[];
};

/* Produtos buscados da API em runtime (o site é SSG; o grid hidrata e busca). */
export function useProducts() {
  const { data, isError } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const rows = await apiFetch<ApiProduct[]>("/api/products");
      return rows.map((r): Product => ({
        slug: r.slug,
        name: r.name,
        price: Number(r.price),
        cat: r.cat,
        img: r.image_url,
        images: r.images.map((i) => i.image_url),
      }));
    },
  });

  return { products: data ?? null, error: isError };
}
