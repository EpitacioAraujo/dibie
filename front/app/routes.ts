import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  // Site público (com header/footer/carrinho)
  layout("pages/public.tsx", [
    index("pages/home/route.tsx"),
    route("produtos", "pages/produtos.tsx"),
  ]),

  // Admin (client-only, fora do prerender; sem o chrome do site). Fica sob
  // /__/ para não disputar caminho com nenhuma página do site.
  route("__/admin/login", "pages/admin/login.tsx"),
  route("__/admin", "pages/admin/layout.tsx", [
    index("pages/admin/dashboard.tsx"),
    route("home", "pages/admin/home/route.tsx"),
    route("products", "pages/admin/products/route.tsx"),
    route("mockups", "pages/admin/mockups/route.tsx"),
    route("carga", "pages/admin/carga.tsx"),
    route("orders", "pages/admin/orders.tsx"),
    route("users", "pages/admin/users.tsx"),
    route("roles", "pages/admin/roles.tsx"),
  ]),
] satisfies RouteConfig;
