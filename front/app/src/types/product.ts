import type { MugSettings } from "../components/mug/MugStage";

export type Product = {
  slug: string;
  name: string;
  price_cents: number;
  cat: string;
  img: string;
  images: string[];
  featured: boolean;
  /** Caneca 3D salva pela tela de mockups — nula em quem não tem. */
  mockup: MugSettings | null;
};
