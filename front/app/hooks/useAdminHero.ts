import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../src/clients/laravel/config/client";

/** Faixas da hero: o carrossel central e as quatro fileiras do mosaico. */
export const HERO_LANES = ["slide", "top", "midLeft", "midRight", "bottom"] as const;
export type HeroLane = (typeof HERO_LANES)[number];

export type HeroItem = {
  id: number;
  lane: HeroLane;
  position: number;
  image_url: string;
  title: string | null;
  sub: string | null;
  alt: string | null;
};

const KEY = ["admin-hero"];

export function useAdminHero() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: KEY,
    queryFn: () => apiFetch<HeroItem[]>("/api/admin/hero"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  const upload = useMutation({
    mutationFn: (body: FormData) =>
      apiFetch<HeroItem>("/api/admin/hero", { method: "POST", body }),
    onSuccess: invalidate,
  });

  const save = useMutation({
    mutationFn: (items: Partial<HeroItem>[]) =>
      apiFetch<HeroItem[]>("/api/admin/hero", {
        method: "PUT",
        body: JSON.stringify({ items }),
      }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/hero/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  return { ...query, items: query.data ?? [], upload, save, remove };
}
