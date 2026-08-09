import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../src/clients/laravel/config/client";

export type OrderItem = { id: number; name: string; price_cents: number; qty: number };
export type Order = {
  id: number;
  code: string;
  total_cents: number;
  status: string;
  contact: string | null;
  created_at: string;
  items: OrderItem[];
};
export type Paginated<T> = { data: T[]; current_page: number; last_page: number };

const KEY = ["admin-orders"];

export function useAdminOrders() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: KEY,
    queryFn: () => apiFetch<Paginated<Order>>("/api/admin/orders"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiFetch<Order>(`/api/admin/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });

  return { ...query, orders: query.data?.data ?? [], updateStatus };
}
