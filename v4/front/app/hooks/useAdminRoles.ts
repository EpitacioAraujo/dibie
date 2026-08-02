import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../src/clients/laravel/config/client";

export type AdminRole = { id: number; name: string; permissions: string[] };

const KEY = ["admin-roles"];

export function useAdminRoles() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: KEY,
    queryFn: () => apiFetch<AdminRole[]>("/api/admin/roles"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<AdminRole>("/api/admin/roles", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      apiFetch<AdminRole>(`/api/admin/roles/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/roles/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  return { ...query, roles: query.data ?? [], create, update, remove };
}
