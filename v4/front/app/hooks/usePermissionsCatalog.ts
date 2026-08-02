import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../src/clients/laravel/config/client";

export function usePermissionsCatalog() {
  const query = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: () => apiFetch<string[]>("/api/admin/permissions"),
  });

  return { ...query, permissions: query.data ?? [] };
}
