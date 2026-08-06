import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import {
  LogoutIcon,
  SidebarCloseIcon,
  SidebarOpenIcon,
} from "../../src/components/ui/icons";

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
  const [collapsed, setCollapsed] = useState(false);
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
      <aside
        className={`flex flex-col gap-1 border-r border-ink-10 bg-ink-5 p-4 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          {!collapsed && <p className="text-h6">dibiê admin</p>}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            className="mx-auto flex cursor-pointer items-center rounded px-2 py-1 text-ink-40 hover:bg-ink-10"
          >
            {collapsed ? <SidebarOpenIcon /> : <SidebarCloseIcon />}
          </button>
        </div>
        {NAV.filter((n) => !n.perm || hasPermission(n.perm)).map((n) => {
          const active =
            n.to === "/admin"
              ? location.pathname === "/admin"
              : location.pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              title={n.label}
              className={`truncate rounded px-3 py-2 text-body ${
                collapsed ? "text-center" : ""
              } ${active ? "bg-ink text-white" : "hover:bg-ink-10"}`}
            >
              {/* recolhido: só a inicial, o title diz o resto */}
              {collapsed ? n.label[0] : n.label}
            </Link>
          );
        })}
        <div className="mt-auto pt-4 text-body text-ink-40">
          {!collapsed && <p className="mb-2 truncate">{user?.name}</p>}
          <button
            type="button"
            title={collapsed ? user?.name : undefined}
            onClick={async () => {
              await logout();
              navigate("/admin/login");
            }}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded px-3 py-2 hover:bg-ink-10"
          >
            <LogoutIcon />
            {!collapsed && "Sair"}
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
