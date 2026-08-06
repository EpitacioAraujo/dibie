import { lazy, Suspense, useEffect, useState } from "react";
import { useUI } from "../../stores/ui";
import { useCart } from "../../stores/cart";
import { formatBRL } from "../types/product";
import { Overlay } from "./ui/Overlay";
import { QtyStepper } from "./ui/QtyStepper";
import { CloseIcon } from "./ui/icons";

// three + o loader de .glb passam de 600 KB: só baixa quando o cliente pede o 3D.
const MugStage = lazy(() =>
  import("./mug/MugStage").then((m) => ({ default: m.MugStage })),
);

/** Índice reservado para a vista 3D na tira de miniaturas. */
const VIEW_3D = -1;

export function ProductModal() {
  const product = useUI((s) => s.activeProduct);
  const closeProduct = useUI((s) => s.closeProduct);
  const openDrawer = useUI((s) => s.openDrawer);
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [mugError, setMugError] = useState<string | null>(null);

  // reseta quantidade e imagem em destaque a cada produto aberto
  useEffect(() => {
    setQty(1);
    setActiveImage(0);
    setMugError(null);
  }, [product]);

  const open = !!product;

  return (
    <>
      <Overlay open={open} onClose={closeProduct} />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 z-50 w-[min(560px,calc(100vw-32px))] overflow-hidden rounded-2xl bg-bg p-5 transition-[opacity,transform] duration-300 ease-milo"
        style={{
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          transform: `translate(-50%, ${open ? "-50%" : "-46%"})`,
        }}
      >
        {product && (
          <>
            <button
              type="button"
              onClick={closeProduct}
              aria-label="Fechar"
              className="absolute right-3 top-3 z-10 cursor-pointer p-1 leading-none opacity-60 hover:opacity-100"
            >
              <CloseIcon size={20} />
            </button>
            <div className="flex flex-col gap-3 md:flex-row md:gap-4">
              {(product.images.length > 1 || product.mockup) && (
                <div className="flex gap-2 overflow-x-auto md:w-16 md:flex-shrink-0 md:flex-col md:overflow-visible">
                  {product.images.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setActiveImage(i)}
                      className={`aspect-square w-14 flex-shrink-0 overflow-hidden rounded md:w-full ${
                        i === activeImage ? "ring-2 ring-ink" : "opacity-60"
                      }`}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                  {product.mockup && (
                    <button
                      type="button"
                      onClick={() => setActiveImage(VIEW_3D)}
                      className={`aspect-square w-14 flex-shrink-0 cursor-pointer rounded border border-ink-10 font-mono text-[0.625rem] uppercase tracking-[0.06em] md:w-full ${
                        activeImage === VIEW_3D ? "ring-2 ring-ink" : "opacity-60"
                      }`}
                    >
                      3D
                    </button>
                  )}
                </div>
              )}
              {activeImage === VIEW_3D && product.mockup ? (
                <div className="aspect-[3/2] w-full min-w-0 flex-1 overflow-hidden rounded-lg bg-bg">
                  {mugError ? (
                    <div className="flex h-full items-center justify-center px-6 text-center text-body text-ink-40">
                      {mugError}
                    </div>
                  ) : (
                    <Suspense
                      fallback={
                        <div className="flex h-full items-center justify-center text-body text-ink-40">
                          carregando 3D…
                        </div>
                      }
                    >
                      {/* sem ref: aqui ninguém fotografa, o cliente só gira */}
                      <MugStage settings={product.mockup} onError={setMugError} />
                    </Suspense>
                  )}
                </div>
              ) : (
                <img
                  src={product.images[activeImage] ?? product.img}
                  alt={product.name}
                  className="aspect-[3/2] w-full min-w-0 flex-1 rounded-lg object-cover"
                />
              )}
            </div>
            <p className="mt-4 font-mono text-[0.5625rem] uppercase tracking-[0.06em] text-ink-40">
              {product.cat}
            </p>
            <div className="mt-1 flex justify-between text-body">
              <span className="font-semibold">{product.name}</span>
              <span className="text-ink-40">{formatBRL(product.price)}</span>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <QtyStepper
                value={qty}
                onDec={() => setQty((q) => Math.max(1, q - 1))}
                onInc={() => setQty((q) => q + 1)}
              />
              <button
                type="button"
                onClick={() => {
                  add(product, qty);
                  openDrawer();
                }}
                className="flex-1 cursor-pointer rounded-full bg-ink px-4 py-3 text-body text-white transition-opacity hover:opacity-85"
              >
                Adicionar ao carrinho
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
