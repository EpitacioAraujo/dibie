import { useAuth } from "../../hooks/useAuth";
import { useAdminOrders } from "../../hooks/useAdminOrders";
import { formatCents } from "../../lib/money";

const STATUSES = ["novo", "em produção", "enviado", "concluído", "cancelado"];

export default function AdminOrders() {
  const can = useAuth((s) => s.hasPermission);
  const { orders: rows, updateStatus } = useAdminOrders();

  function changeStatus(id: number, status: string) {
    updateStatus.mutate({ id, status });
  }

  return (
    <div>
      <h1 className="mb-6 text-h2">Pedidos</h1>
      <table className="w-full border-collapse text-body">
        <thead>
          <tr className="border-b border-ink-10 text-left text-ink-40">
            <th className="py-2">Código</th>
            <th>Itens</th>
            <th>Total</th>
            <th>Status</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-b border-ink-10 align-top">
              <td className="py-3 font-semibold">{o.code}</td>
              <td className="text-ink-40">
                {o.items.map((i) => (
                  <div key={i.id}>
                    {i.qty}x {i.name}
                  </div>
                ))}
              </td>
              <td>{formatCents(o.total_cents)}</td>
              <td>
                {can("orders.update") ? (
                  <select
                    value={o.status}
                    onChange={(e) => changeStatus(o.id, e.target.value)}
                    className="rounded-md border border-ink-10 bg-bg px-2 py-1"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  o.status
                )}
              </td>
              <td className="text-ink-40">
                {new Date(o.created_at).toLocaleDateString("pt-BR")}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-ink-40">
                Nenhum pedido ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
