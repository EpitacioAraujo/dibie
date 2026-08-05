import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../src/clients/laravel/config/client";
import { apiMessage } from "../lib/apiMessage";

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

export const mockupErrorMessage = (error: unknown) =>
  apiMessage(error, "Falha ao gerar a imagem. Tente de novo.");
