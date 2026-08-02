import { Reveal } from "./ui/Reveal";
import { ProductCard } from "./ProductCard";
import type { Product } from "../types/product";

/* Uma linha do grid: fade por card com stagger (0.12s). Cada linha tem
   seu próprio trigger de viewport (o espaçamento vertical encadeia). */
export function ProductRow({
  products,
  cols,
}: {
  products: Product[];
  cols: 2 | 3;
}) {
  const colClass = cols === 3 ? "md:grid-cols-3" : "md:grid-cols-2";
  return (
    <div className={`mb-10 grid gap-x-4 gap-y-10 ${colClass}`}>
      {products.map((p, i) => (
        <Reveal key={p.slug} delay={i * 0.12}>
          <ProductCard product={p} />
        </Reveal>
      ))}
    </div>
  );
}
