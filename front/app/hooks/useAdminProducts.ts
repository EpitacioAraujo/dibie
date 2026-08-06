import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../src/clients/laravel/config/client";

export type AdminProductImage = { id: number; image_url: string };

export type AdminProduct = {
  id: number;
  slug: string;
  name: string;
  price: string | number;
  cat: string;
  image_url: string | null;
  images: AdminProductImage[];
  active: boolean;
  featured: boolean;
  position: number;
};

const KEY = ["admin-products"];

export type AdminProductQuery = {
  q?: string;
  cat?: string;
  sort?: string;
  dir?: "asc" | "desc";
  page?: number;
  per_page?: number;
};

type Page = { data: AdminProduct[]; total: number; last_page: number };

export function useAdminProducts(params: AdminProductQuery = {}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [...KEY, params],
    queryFn: () => {
      const search = new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== "" && v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      ).toString();
      // sem per_page o backend devolve a lista inteira; com ele, um paginador
      return apiFetch<AdminProduct[] | Page>(
        `/api/admin/products${search ? `?${search}` : ""}`,
      );
    },
    placeholderData: (prev) => prev, // troca de página/filtro não pisca a tabela
  });
  const data: AdminProduct[] | Page | undefined = query.data;
  const page = Array.isArray(data) ? undefined : data;
  const products: AdminProduct[] = (Array.isArray(data) ? data : page?.data) ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  const create = useMutation({
    mutationFn: (body: FormData) =>
      apiFetch<AdminProduct>("/api/admin/products", { method: "POST", body }),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: FormData }) => {
      body.append("_method", "PUT"); // multipart + PUT: usa method spoofing
      return apiFetch<AdminProduct>(`/api/admin/products/${id}`, {
        method: "POST",
        body,
      });
    },
    onSuccess: invalidate,
  });

  /** Quais produtos aparecem na home e em que ordem. */
  const saveFeatured = useMutation({
    mutationFn: (items: { id: number; featured: boolean; position: number }[]) =>
      apiFetch<AdminProduct[]>("/api/admin/products-featured", {
        method: "PATCH",
        body: JSON.stringify({ items }),
      }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/products/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  const cats = useQuery({
    queryKey: ["admin-product-cats"],
    queryFn: () => apiFetch<string[]>("/api/admin/products-cats"),
  });

  const deleteImage = useMutation({
    mutationFn: ({ productId, imageId }: { productId: number; imageId: number }) =>
      apiFetch(`/api/admin/products/${productId}/images/${imageId}`, {
        method: "DELETE",
      }),
    onSuccess: invalidate,
  });

  return {
    ...query,
    products,
    total: page?.total ?? products.length,
    lastPage: page?.last_page ?? 1,
    create,
    update,
    saveFeatured,
    remove,
    deleteImage,
    cats: cats.data ?? [],
  };
}
