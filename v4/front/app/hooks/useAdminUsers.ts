import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../src/clients/laravel/config/client";

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  roles: string[];
  direct_permissions: string[];
  permissions: string[];
};

const KEY = ["admin-users"];

export function useAdminUsers() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: KEY,
    queryFn: () => apiFetch<AdminUser[]>("/api/admin/users"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<AdminUser>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      apiFetch<AdminUser>(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  return { ...query, users: query.data ?? [], create, update, remove };
}
