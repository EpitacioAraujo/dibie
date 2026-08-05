import { useMutation } from "@tanstack/react-query";
import { ApiError, apiFetch } from "../src/clients/laravel/config/client";

export type MockupQuality = "low" | "medium" | "high";

/** Manda o render 3D para a IA fotorrealizar. Devolve um data URI PNG. */
export function useMockupRender() {
  return useMutation({
    mutationFn: (body: { image: string; prompt: string; quality: MockupQuality }) =>
      apiFetch<{ image: string }>("/api/admin/mockups/render", {
        method: "POST",
        body: JSON.stringify(body),
      }).then((r) => r.image),
  });
}

export function mockupErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const data = error.data as { message?: string } | string;
    if (typeof data === "object" && data?.message) return data.message;
  }
  return "Falha ao gerar a imagem. Tente de novo.";
}
