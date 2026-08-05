import { ApiError } from "../src/clients/laravel/config/client";

/** Mensagem legível de um erro da API (o Laravel manda `message` em 422/500). */
export function apiMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const data = error.data as { message?: string } | string;
    if (typeof data === "object" && data?.message) return data.message;
  }
  return fallback;
}
