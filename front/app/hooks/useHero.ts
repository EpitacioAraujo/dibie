import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../src/clients/laravel/config/client";

export type HeroLane = "slide" | "top" | "midLeft" | "midRight" | "bottom";

export type HeroApiItem = {
  id: number;
  lane: HeroLane;
  position: number;
  image_url: string;
  title: string | null;
  sub: string | null;
  alt: string | null;
};

/** Conteúdo da hero em runtime (o site é SSG; sem resposta, a hero usa o fallback). */
export function useHero() {
  const { data } = useQuery({
    queryKey: ["hero"],
    queryFn: () => apiFetch<HeroApiItem[]>("/api/hero"),
    retry: false,
  });

  return data ?? null;
}
