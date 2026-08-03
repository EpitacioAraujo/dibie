import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiFetch, setApiToken } from "../src/clients/laravel/config/client";

export type AuthUser = { id: number; name: string; email: string };

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  permissions: string[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (p: string) => boolean;
};

type LoginResponse = {
  token: string;
  user: AuthUser;
  permissions: string[];
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      permissions: [],
      login: async (email, password) => {
        const res = await apiFetch<LoginResponse>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setApiToken(res.token);
        set({ token: res.token, user: res.user, permissions: res.permissions });
      },
      logout: async () => {
        try {
          await apiFetch("/api/auth/logout", { method: "POST" });
        } catch {
          /* token já inválido: segue limpando local */
        }
        setApiToken(null);
        set({ token: null, user: null, permissions: [] });
      },
      hasPermission: (p) => get().permissions.includes(p),
    }),
    {
      name: "dibie-auth",
      skipHydration: true,
      // ao reidratar do storage, reinjeta o token no cliente HTTP
      onRehydrateStorage: () => (state) => {
        if (state?.token) setApiToken(state.token);
      },
    }
  )
);
