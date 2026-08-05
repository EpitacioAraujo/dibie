import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../../hooks/useAuth";

const NAV = [
  { to: "/admin", label: "Painel", perm: null },
  { to: "/admin/home", label: "Home", perm: "products.update" },
  { to: "/admin/products", label: "Produtos", perm: "products.view" },
  { to: "/admin/mockups", label: "Mockups", perm: "products.update" },
  { to: "/admin/orders", label: "Pedidos", perm: "orders.view" },
  { to: "/admin/users", label: "Usuários", perm: "users.view" },
  { to: "/admin/roles", label: "Perfis", perm: "roles.view" },
];

export default function AdminLayout() {
  const [ready, setReady] = useState(false);
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const hasPermission = useAuth((s) => s.hasPermission);
  const logout = useAuth((s) => s.logout);
  const location = useLocation();
  const navigate = useNavigate();

  // reidrata o token do storage antes de decidir o guard
  useEffect(() => {
    useAuth.persist.rehydrate();
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!token) return <Navigate to="/admin/login" replace />;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col gap-1 border-r border-ink-10 bg-ink-5 p-4">
        <p className="mb-4 text-h6">dibiê admin</p>
        {NAV.filter((n) => !n.perm || hasPermission(n.perm)).map((n) => {
          const active =
            n.to === "/admin"
              ? location.pathname === "/admin"
              : location.pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`rounded px-3 py-2 text-body ${
                active ? "bg-ink text-white" : "hover:bg-ink-10"
              }`}
            >
              {n.label}
            </Link>
          );
        })}
        <div className="mt-auto pt-4 text-body text-ink-40">
          <p className="mb-2 truncate">{user?.name}</p>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate("/admin/login");
            }}
            className="cursor-pointer rounded px-3 py-2 hover:bg-ink-10"
          >
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
