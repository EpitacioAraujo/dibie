import { LARAVEL_BASE_URL } from "../hosts";

let authToken: string | null = null;
export function setApiToken(t: string | null) {
  authToken = t;
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, data: unknown) {
    super(`API ${status}`);
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers as Record<string, string>),
  };
  if (opts.body && !(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(LARAVEL_BASE_URL + path, { ...opts, headers });
  if (res.status === 204) return null as T;
  const data = res.headers.get("content-type")?.includes("json")
    ? await res.json()
    : await res.text();
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
