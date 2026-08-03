import type { Route } from "./+types/pecas";
import { Reveal } from "../src/components/ui/Reveal";
import { ProductRow } from "../src/components/ProductGrid";
import { useProducts } from "../hooks/useProducts";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Nossas peças — dibiê" },
    {
      name: "description",
      content: "Todas as canecas e kits personalizados da dibiê.",
    },
  ];
}

export default function Pecas() {
  const { products: loaded } = useProducts();
  const products = loaded ?? [];
  return (
    <>
      {/* heading estático, sem animação de entrada */}
      <div className="px-6 pt-[120px] pb-14 md:px-12">
        <h1 className="m-0 text-h2">Nossas peças</h1>
      </div>

      <section className="px-6 md:px-12">
        <ProductRow products={products.slice(0, 3)} cols={3} />
        <ProductRow products={products.slice(3, 5)} cols={2} />
        <ProductRow products={products.slice(5, 8)} cols={3} />
        <Reveal className="pt-10 text-right">
          <h2 className="m-0 text-h2">...e muito mais por vir.</h2>
        </Reveal>
      </section>
    </>
  );
}
