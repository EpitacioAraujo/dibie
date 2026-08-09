import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useUI } from "../../stores/ui";
import { useCart, cartCount } from "../../stores/cart";
import { INSTAGRAM, WHATSAPP_URL } from "../../lib/config";
import {
  CartIcon,
  CloseIcon,
  InstagramIcon,
  MenuIcon,
  WhatsAppIcon,
} from "./ui/icons";
import { Overlay } from "./ui/Overlay";

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")";

export function Header() {
  const introPhase = useUI((s) => s.introPhase);
  const openDrawer = useUI((s) => s.openDrawer);
  const items = useCart((s) => s.items);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menu, setMenu] = useState(false);

  // reidrata o carrinho do localStorage no cliente (persist com skipHydration)
  useEffect(() => {
    useCart.persist.rehydrate();
    setMounted(true);
  }, []);

  // véu texturizado: liga assim que houver qualquer scroll (> 0)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hidden = introPhase === "intro";
  const count = mounted ? cartCount(items) : 0;

  return (
    <>
    <header
      className="sticky top-0 z-30 flex h-[88px] items-center justify-between px-6 transition-[opacity,transform] duration-[800ms] ease-milo md:px-12"
      style={{
        opacity: hidden ? 0 : 1,
        transform: hidden ? "translateY(-8px)" : "none",
      }}
    >
      {/* véu texturizado atrás do conteúdo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-[400ms] ease-milo"
        style={{
          opacity: scrolled ? 1 : 0,
          backgroundColor: "rgba(245, 243, 239, 0.6)",
          backgroundImage: GRAIN,
          backdropFilter: "blur(6px)",
        }}
      />
      <Link to="/" className="transition-opacity hover:opacity-70">
        <img src="/img/logo.svg" alt="Dibiê" className="h-7 w-auto md:h-9" />
      </Link>

      <div className="flex items-center gap-4 md:gap-8">
        <nav className="hidden text-body md:flex">
          <Link to="/produtos" className="hover:opacity-70">
            Produtos
          </Link>
        </nav>

        {/* no celular só carrinho + sanduíche: o resto vive no menu lateral */}
        <div className="flex items-center gap-2">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Fale com a dibiê no WhatsApp"
            title="WhatsApp"
            className="hidden h-9 w-9 items-center justify-center rounded-full bg-roxo text-white transition-opacity hover:opacity-85 md:flex"
          >
            <WhatsAppIcon size={22} />
          </a>
          <a
            href={INSTAGRAM}
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram da dibiê"
            title="Instagram"
            className="hidden h-9 w-9 items-center justify-center rounded-full bg-roxo text-white transition-opacity hover:opacity-85 md:flex"
          >
            <InstagramIcon size={22} />
          </a>

          <button
            type="button"
            onClick={openDrawer}
            aria-label={`Carrinho (${count})`}
            className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-ink-5 transition-colors hover:bg-ink-10"
          >
            <CartIcon size={20} />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ink px-1 text-[10px] leading-none text-white">
                {count}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMenu(true)}
            aria-label="Abrir menu"
            aria-expanded={menu}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-ink-5 transition-colors hover:bg-ink-10 md:hidden"
          >
            <MenuIcon size={20} />
          </button>
        </div>
      </div>
    </header>

      {/* fora do <header>: ele usa transform, que quebraria o position:fixed */}
      <Overlay open={menu} onClose={() => setMenu(false)} />
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-[78%] max-w-[320px] flex-col gap-8 bg-bg px-6 py-6 shadow-lg transition-transform duration-300 ease-milo md:hidden"
        style={{ transform: menu ? "none" : "translateX(100%)" }}
        aria-hidden={!menu}
      >
        <button
          type="button"
          onClick={() => setMenu(false)}
          aria-label="Fechar menu"
          className="flex h-9 w-9 cursor-pointer items-center justify-center self-end rounded-full bg-ink-5"
        >
          <CloseIcon size={20} />
        </button>

        <nav className="flex flex-col gap-6 text-h6">
          <Link to="/" onClick={() => setMenu(false)}>
            Início
          </Link>
          <Link to="/produtos" onClick={() => setMenu(false)}>
            Produtos
          </Link>
        </nav>

        <div className="mt-auto flex gap-3">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Fale com a dibiê no WhatsApp"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-roxo text-white"
          >
            <WhatsAppIcon size={24} />
          </a>
          <a
            href={INSTAGRAM}
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram da dibiê"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-roxo text-white"
          >
            <InstagramIcon size={24} />
          </a>
        </div>
      </aside>
    </>
  );
}
