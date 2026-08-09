import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "../src/types/product";

export type CartItem = {
  slug: string;
  name: string;
  priceCents: number;
  img: string;
  qty: number;
};

type CartState = {
  items: CartItem[];
  add: (p: Product, qty: number) => void;
  inc: (slug: string) => void;
  dec: (slug: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (p, qty) =>
        set((s) => {
          const found = s.items.find((i) => i.slug === p.slug);
          if (found) {
            return {
              items: s.items.map((i) =>
                i.slug === p.slug ? { ...i, qty: i.qty + qty } : i
              ),
            };
          }
          return {
            items: [
              ...s.items,
              { slug: p.slug, name: p.name, priceCents: p.price_cents, img: p.img, qty },
            ],
          };
        }),
      inc: (slug) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.slug === slug ? { ...i, qty: i.qty + 1 } : i
          ),
        })),
      dec: (slug) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.slug === slug ? { ...i, qty: i.qty - 1 } : i))
            .filter((i) => i.qty > 0),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "dibie-cart",
      // SSG: sem localStorage no build. Reidratamos no cliente (Header effect)
      // para evitar mismatch de hidratação.
      skipHydration: true,
      // v0 guardava `price` em reais. Sem esta conversão quem já tinha carrinho
      // aberto voltaria com priceCents undefined e veria "R$ NaN".
      version: 1,
      migrate: (state, from) =>
        from === 0
          ? {
              ...(state as CartState),
              items: ((state as { items: (CartItem & { price: number })[] }).items ?? []).map(
                ({ price, ...i }) => ({ ...i, priceCents: Math.round(price * 100) })
              ),
            }
          : (state as CartState),
    }
  )
);

export const cartCount = (items: CartItem[]) =>
  items.reduce((s, i) => s + i.qty, 0);
/** Soma de inteiros: exata por construção, sem erro de ponto flutuante. */
export const cartTotal = (items: CartItem[]) =>
  items.reduce((s, i) => s + i.priceCents * i.qty, 0);
