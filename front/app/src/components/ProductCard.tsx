import { useUI } from "../../stores/ui";
import { formatBRL, type Product } from "../types/product";

export function ProductCard({ product }: { product: Product }) {
  const openProduct = useUI((s) => s.openProduct);
  return (
    <button
      type="button"
      onClick={() => openProduct(product)}
      className="block w-full cursor-pointer text-left"
    >
      <img
        src={product.img}
        alt={product.name}
        className="aspect-[3/2] w-full rounded object-cover"
      />
      <div className="mt-3 flex justify-between text-body">
        <span className="font-semibold">{product.name}</span>
        <span className="text-ink-40">{formatBRL(product.price)}</span>
      </div>
      <p className="mt-1 font-mono text-[0.5625rem] uppercase tracking-[0.06em] text-ink-40">
        {product.cat}
      </p>
    </button>
  );
}
