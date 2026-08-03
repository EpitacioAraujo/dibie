import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useAdminUsers } from "../../hooks/useAdminUsers";
import { useAdminRoles } from "../../hooks/useAdminRoles";
import { usePermissionsCatalog } from "../../hooks/usePermissionsCatalog";
import { PencilIcon, TrashIcon } from "../../src/components/ui/icons";

type Draft = {
  id?: number;
  name: string;
  email: string;
  password: string;
  roles: string[];
  permissions: string[];
};

const EMPTY: Draft = {
  name: "",
  email: "",
  password: "",
  roles: [],
  permissions: [],
};

export default function AdminUsers() {
  const can = useAuth((s) => s.hasPermission);
  const { users: rows, create, update, remove: removeUser } = useAdminUsers();
  const { roles } = useAdminRoles();
  const roleNames = roles.map((r) => r.name);
  const { permissions: catalog } = usePermissionsCatalog();
  const [draft, setDraft] = useState<Draft | null>(null);

  function toggle(key: "roles" | "permissions", value: string) {
    if (!draft) return;
    const arr = draft[key];
    setDraft({
      ...draft,
      [key]: arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value],
    });
  }

  async function save() {
    if (!draft) return;
    const body: Record<string, unknown> = {
      name: draft.name,
      email: draft.email,
      roles: draft.roles,
      permissions: draft.permissions,
    };
    if (draft.password) body.password = draft.password;
    if (draft.id) await update.mutateAsync({ id: draft.id, body });
    else await create.mutateAsync(body);
    setDraft(null);
  }

  async function remove(id: number) {
    if (!confirm("Remover este usuário?")) return;
    await removeUser.mutateAsync(id);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-h2">Usuários</h1>
        {can("users.create") && (
          <button
            type="button"
            onClick={() => setDraft({ ...EMPTY })}
            className="cursor-pointer rounded-full bg-ink px-4 py-2 text-body text-white"
          >
            Novo usuário
          </button>
        )}
      </div>

      <table className="w-full border-collapse text-body">
        <thead>
          <tr className="border-b border-ink-10 text-left text-ink-40">
            <th className="py-2">Nome</th>
            <th>E-mail</th>
            <th>Perfis</th>
            <th>Permissões diretas</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className="border-b border-ink-10">
              <td className="py-2">{u.name}</td>
              <td className="text-ink-40">{u.email}</td>
              <td>{u.roles.join(", ") || "—"}</td>
              <td className="text-ink-40">
                {u.direct_permissions.join(", ") || "—"}
              </td>
              <td className="text-right">
                {can("users.update") && (
                  <button
                    type="button"
                    aria-label="Editar usuário"
                    title="Editar"
                    onClick={() =>
                      setDraft({
                        id: u.id,
                        name: u.name,
                        email: u.email,
                        password: "",
                        roles: [...u.roles],
                        permissions: [...u.direct_permissions],
                      })
                    }
                    className="mr-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full hover:bg-ink-10"
                  >
                    <PencilIcon />
                  </button>
                )}
                {can("users.delete") && (
                  <button
                    type="button"
                    aria-label="Remover usuário"
                    title="Remover"
                    onClick={() => remove(u.id)}
                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-wine hover:bg-ink-10"
                  >
                    <TrashIcon />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="max-h-[85vh] w-[min(480px,100%)] overflow-y-auto rounded-2xl bg-bg p-6">
            <p className="mb-4 text-h6">
              {draft.id ? "Editar usuário" : "Novo usuário"}
            </p>
            <label className="mb-3 block text-body">
              nome
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="mt-1 w-full rounded-md border border-ink-10 bg-bg px-3 py-2 outline-none"
              />
            </label>
            <label className="mb-3 block text-body">
              e-mail
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className="mt-1 w-full rounded-md border border-ink-10 bg-bg px-3 py-2 outline-none"
              />
            </label>
            <label className="mb-4 block text-body">
              senha {draft.id && <span className="text-ink-40">(deixe em branco para manter)</span>}
              <input
                type="password"
                value={draft.password}
                onChange={(e) =>
                  setDraft({ ...draft, password: e.target.value })
                }
                className="mt-1 w-full rounded-md border border-ink-10 bg-bg px-3 py-2 outline-none"
              />
            </label>

            <p className="mb-2 text-body text-ink-40">Perfis</p>
            <div className="mb-4 flex flex-wrap gap-3">
              {roleNames.map((r) => (
                <label key={r} className="flex items-center gap-2 text-body">
                  <input
                    type="checkbox"
                    checked={draft.roles.includes(r)}
                    onChange={() => toggle("roles", r)}
                  />
                  {r}
                </label>
              ))}
            </div>

            <p className="mb-2 text-body text-ink-40">
              Permissões pontuais (além dos perfis)
            </p>
            <div className="mb-6 grid grid-cols-2 gap-2">
              {catalog.map((p) => (
                <label key={p} className="flex items-center gap-2 text-body">
                  <input
                    type="checkbox"
                    checked={draft.permissions.includes(p)}
                    onChange={() => toggle("permissions", p)}
                  />
                  {p}
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="cursor-pointer px-4 py-2 text-body"
              >
                cancelar
              </button>
              <button
                type="button"
                onClick={save}
                className="cursor-pointer rounded-full bg-ink px-4 py-2 text-body text-white"
              >
                salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
