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
    route("pecas", "pages/pecas.tsx"),
  ]),

  // Admin (client-only, fora do prerender; sem o chrome do site)
  route("admin/login", "pages/admin/login.tsx"),
  route("admin", "pages/admin/layout.tsx", [
    index("pages/admin/dashboard.tsx"),
    route("products", "pages/admin/products/route.tsx"),
    route("orders", "pages/admin/orders.tsx"),
    route("users", "pages/admin/users.tsx"),
    route("roles", "pages/admin/roles.tsx"),
  ]),
] satisfies RouteConfig;
