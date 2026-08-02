import { create } from "zustand";
import type { Product } from "../src/types/product";

/* Fases da intro do hero (paridade com a sequência da v3):
   intro   → mosaico deslizando / tiles surgindo
   zooming → frame central parou no centro e cresce; header aparece
   ready   → carrossel pronto
   none    → sem intro (rota sem hero, ou intro pulada/reduced-motion) */
export type IntroPhase = "intro" | "zooming" | "ready" | "none";

type UIState = {
  // preloader terminou (contador 100%) → libera a intro do hero
  booted: boolean;
  setBooted: (v: boolean) => void;
  introPhase: IntroPhase;
  setIntroPhase: (p: IntroPhase) => void;
  activeProduct: Product | null;
  openProduct: (p: Product) => void;
  closeProduct: () => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

export const useUI = create<UIState>((set) => ({
  booted: false,
  setBooted: (booted) => set({ booted }),
  introPhase: "none",
  setIntroPhase: (introPhase) => set({ introPhase }),
  activeProduct: null,
  openProduct: (p) => set({ activeProduct: p, drawerOpen: false }),
  closeProduct: () => set({ activeProduct: null }),
  drawerOpen: false,
  openDrawer: () => set({ drawerOpen: true, activeProduct: null }),
  closeDrawer: () => set({ drawerOpen: false }),
}));
