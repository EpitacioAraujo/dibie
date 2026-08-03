export type Product = {
  slug: string;
  name: string;
  price: number;
  cat: string;
  img: string;
  images: string[];
};

export function formatBRL(v: number) {
  return "R$ " + v;
}
