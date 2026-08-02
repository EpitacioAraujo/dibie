import { Outlet } from "react-router";
import { Header } from "../src/components/Header";
import { Footer } from "../src/components/Footer";
import { ProductModal } from "../src/components/ProductModal";
import { CartDrawer } from "../src/components/CartDrawer";
import { Preloader } from "../src/components/Preloader";

/* Layout do site público: preloader + header/footer + overlays do carrinho. */
export default function PublicLayout() {
  return (
    <>
      <Preloader />
      <Header />
      <Outlet />
      <Footer />
      <ProductModal />
      <CartDrawer />
    </>
  );
}
