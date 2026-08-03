import { Link } from "react-router";
import { useAuth } from "../../hooks/useAuth";

const CARDS = [
  { to: "/admin/products", label: "Produtos", perm: "products.view" },
  { to: "/admin/orders", label: "Pedidos", perm: "orders.view" },
  { to: "/admin/users", label: "Usuários", perm: "users.view" },
  { to: "/admin/roles", label: "Perfis", perm: "roles.view" },
];

export default function AdminDashboard() {
  const user = useAuth((s) => s.user);
  const hasPermission = useAuth((s) => s.hasPermission);
  return (
    <div>
      <h1 className="mb-2 text-h2">Olá, {user?.name}</h1>
      <p className="mb-8 text-body text-ink-40">
        Gerencie o catálogo, os pedidos e os acessos da dibiê.
      </p>
      <div className="grid max-w-2xl grid-cols-2 gap-4">
        {CARDS.filter((c) => hasPermission(c.perm)).map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="rounded-lg bg-ink-5 p-6 text-h6 hover:bg-ink-10"
          >
            {c.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
