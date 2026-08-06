import { useUI } from "../../stores/ui";
import { useCart, cartTotal, type CartItem } from "../../stores/cart";
import { formatBRL } from "../types/product";
import { WHATSAPP } from "../../lib/config";
import { useCreateOrder } from "../../hooks/useOrders";
import { Overlay } from "./ui/Overlay";
import { QtyStepper } from "./ui/QtyStepper";
import { CloseIcon } from "./ui/icons";

async function checkout(items: CartItem[], createOrder: (p: {
  total: number;
  items: { slug: string; name: string; price: number; qty: number }[];
}) => Promise<string>) {
  if (!items.length) return;
  const total = cartTotal(items);

  // persiste o pedido no backend e usa o código gerado no servidor;
  // se a API falhar, gera um código local para não travar a venda.
  let code: string;
  try {
    code = await createOrder({
      total,
      items: items.map((i) => ({
        slug: i.slug,
        name: i.name,
        price: i.price,
        qty: i.qty,
      })),
    });
  } catch {
    code = "DB-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  }

  const lines = items.map(
    (i) => `${i.qty}x ${i.name} — ${formatBRL(i.price * i.qty)}`
  );
  const msg =
    "Oi, dibiê! Quero fechar um pedido 🧡\n" +
    `Código do carrinho: ${code}\n\n` +
    lines.join("\n") +
    `\n\nTotal: ${formatBRL(total)}`;
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`);
}

export function CartDrawer() {
  const open = useUI((s) => s.drawerOpen);
  const closeDrawer = useUI((s) => s.closeDrawer);
  const items = useCart((s) => s.items);
  const inc = useCart((s) => s.inc);
  const dec = useCart((s) => s.dec);
  const { mutateAsync: createOrder } = useCreateOrder();

  return (
    <>
      <Overlay open={open} onClose={closeDrawer} />
      <aside
        aria-label="Carrinho"
        className="fixed inset-y-0 right-0 z-50 flex w-[min(380px,100vw)] flex-col bg-bg p-6 transition-transform duration-[400ms] ease-milo"
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
      >
        <div className="mb-6 flex items-center justify-between">
          <p className="m-0 text-h6">Carrinho</p>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Fechar"
            className="cursor-pointer p-1 leading-none opacity-60 hover:opacity-100"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-body text-ink-40">Seu carrinho está vazio.</p>
          ) : (
            items.map((i) => (
              <div key={i.slug} className="flex items-center gap-3">
                <img
                  src={i.img}
                  alt=""
                  className="h-12 w-16 flex-shrink-0 rounded-md object-cover"
                />
                <div className="flex flex-1 flex-col gap-0.5 text-body">
                  <span>{i.name}</span>
                  <span className="text-ink-40">{formatBRL(i.price)}</span>
                </div>
                <QtyStepper
                  value={i.qty}
                  onDec={() => dec(i.slug)}
                  onInc={() => inc(i.slug)}
                />
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex flex-col gap-4 border-t border-ink-10 pt-4">
          <div className="flex justify-between text-body">
            <span>Total</span>
            <span>{formatBRL(cartTotal(items))}</span>
          </div>
          <button
            type="button"
            onClick={() => checkout(items, createOrder)}
            className="cursor-pointer rounded-full bg-ink px-4 py-3 text-body text-white transition-opacity hover:opacity-85"
          >
            Finalizar pelo WhatsApp
          </button>
        </div>
      </aside>
    </>
  );
}
