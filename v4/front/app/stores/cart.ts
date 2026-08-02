import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "../src/types/product";

export type CartItem = {
  slug: string;
  name: string;
  price: number;
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
              { slug: p.slug, name: p.name, price: p.price, img: p.img, qty },
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
    }
  )
);

export const cartCount = (items: CartItem[]) =>
  items.reduce((s, i) => s + i.qty, 0);
export const cartTotal = (items: CartItem[]) =>
  items.reduce((s, i) => s + i.price * i.qty, 0);
