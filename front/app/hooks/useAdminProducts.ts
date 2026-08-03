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
};

const KEY = ["admin-products"];

export function useAdminProducts() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: KEY,
    queryFn: () => apiFetch<AdminProduct[]>("/api/admin/products"),
  });

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

  const remove = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/products/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
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
    products: query.data ?? [],
    create,
    update,
    remove,
    deleteImage,
  };
}
