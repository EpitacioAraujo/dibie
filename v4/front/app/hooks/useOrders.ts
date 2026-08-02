import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../src/clients/laravel/config/client";

export type OrderPayload = {
  items: { slug: string; name: string; price: number; qty: number }[];
  total: number;
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
