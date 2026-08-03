import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useUI } from "../../stores/ui";
import { useCart, cartCount } from "../../stores/cart";

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")";

export function Header() {
  const introPhase = useUI((s) => s.introPhase);
  const openDrawer = useUI((s) => s.openDrawer);
  const items = useCart((s) => s.items);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

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

      <nav className="hidden gap-8 text-body md:flex">
        <Link to="/pecas" className="hover:opacity-70">
          Produtos
        </Link>
        <a href="#" className="hover:opacity-70">
          Sobre
        </a>
        <a href="#" className="hover:opacity-70">
          Contato
        </a>
      </nav>

      <button
        type="button"
        onClick={openDrawer}
        className="cursor-pointer rounded-full bg-ink-5 px-3.5 py-2 text-body transition-colors hover:bg-ink-10"
      >
        Carrinho{" "}
        <span className="ml-1 inline-block min-w-[18px] rounded-full bg-ink px-1 py-px text-center text-white">
          {count}
        </span>
      </button>
    </header>
  );
}
