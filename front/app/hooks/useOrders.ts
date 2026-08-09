import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../src/clients/laravel/config/client";

/** Só slug e quantidade: preço e total são do banco, e o backend recusa se vierem. */
export type OrderPayload = {
  items: { slug: string; qty: number }[];
};

/* Cria o pedido no backend e devolve o código gerado no servidor. */
export function useCreateOrder() {
  return useMutation({
    mutationFn: async (payload: OrderPayload) => {
      const res = await apiFetch<{ code: string }>("/api/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return res.code;
    },
  });
}
