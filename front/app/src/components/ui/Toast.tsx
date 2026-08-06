import { create } from "zustand";
import { CheckIcon } from "./icons";

type Toast = { id: number; message: string };

const DURATION = 4000;

const useToasts = create<{
  items: Toast[];
  push: (message: string) => void;
  drop: (id: number) => void;
}>((set) => ({
  items: [],
  push: (message) => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items, { id, message }] }));
    setTimeout(
      () => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
      DURATION,
    );
  },
  drop: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

/** Avisa que algo deu certo. Chamável de qualquer lugar, sem hook. */
export const toast = (message: string) => useToasts.getState().push(message);

/** Montado uma vez no root: as telas só chamam toast(). */
export function Toaster() {
  const items = useToasts((s) => s.items);
  const drop = useToasts((s) => s.drop);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-6 bottom-6 z-[60] flex flex-col gap-2"
    >
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => drop(t.id)}
          className="pointer-events-auto flex cursor-pointer items-center gap-2 rounded-full bg-ink px-5 py-3 text-body text-white shadow-lg"
        >
          <CheckIcon />
          {t.message}
        </button>
      ))}
    </div>
  );
}
