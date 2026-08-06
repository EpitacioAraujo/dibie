import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useAdminRoles } from "../../hooks/useAdminRoles";
import { usePermissionsCatalog } from "../../hooks/usePermissionsCatalog";
import { PencilIcon, TrashIcon } from "../../src/components/ui/icons";
import { toast } from "../../src/components/ui/Toast";

type Draft = { id?: number; name: string; permissions: string[] };

export default function AdminRoles() {
  const can = useAuth((s) => s.hasPermission);
  const { roles: rows, create, update, remove: removeRole } = useAdminRoles();
  const { permissions: catalog } = usePermissionsCatalog();
  const [draft, setDraft] = useState<Draft | null>(null);

  function toggle(perm: string) {
    if (!draft) return;
    const has = draft.permissions.includes(perm);
    setDraft({
      ...draft,
      permissions: has
        ? draft.permissions.filter((p) => p !== perm)
        : [...draft.permissions, perm],
    });
  }

  async function save() {
    if (!draft) return;
    const body = { name: draft.name, permissions: draft.permissions };
    if (draft.id) await update.mutateAsync({ id: draft.id, body });
    else await create.mutateAsync(body);
    toast(draft.id ? "Perfil atualizado" : "Perfil cadastrado");
    setDraft(null);
  }

  async function remove(id: number) {
    if (!confirm("Remover este perfil?")) return;
    await removeRole.mutateAsync(id);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-h2">Perfis</h1>
        {can("roles.manage") && (
          <button
            type="button"
            onClick={() => setDraft({ name: "", permissions: [] })}
            className="cursor-pointer rounded-full bg-ink px-4 py-2 text-body text-white"
          >
            Novo perfil
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-start justify-between rounded-lg bg-ink-5 p-4"
          >
            <div>
              <p className="text-h6">{r.name}</p>
              <p className="mt-1 text-body text-ink-40">
                {r.permissions.join(", ") || "sem permissões"}
              </p>
            </div>
            {can("roles.manage") && (
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Editar perfil"
                  title="Editar"
                  onClick={() =>
                    setDraft({
                      id: r.id,
                      name: r.name,
                      permissions: [...r.permissions],
                    })
                  }
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full hover:bg-ink-10"
                >
                  <PencilIcon />
                </button>
                <button
                  type="button"
                  aria-label="Remover perfil"
                  title="Remover"
                  onClick={() => remove(r.id)}
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-wine hover:bg-ink-10"
                >
                  <TrashIcon />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="max-h-[85vh] w-[min(480px,100%)] overflow-y-auto rounded-2xl bg-bg p-6">
            <p className="mb-4 text-h6">
              {draft.id ? "Editar perfil" : "Novo perfil"}
            </p>
            <label className="mb-4 block text-body">
              nome
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="mt-1 w-full rounded-md border border-ink-10 bg-bg px-3 py-2 outline-none"
              />
            </label>
            <p className="mb-2 text-body text-ink-40">Permissões</p>
            <div className="mb-6 grid grid-cols-2 gap-2">
              {catalog.map((perm) => (
                <label key={perm} className="flex items-center gap-2 text-body">
                  <input
                    type="checkbox"
                    checked={draft.permissions.includes(perm)}
                    onChange={() => toggle(perm)}
                  />
                  {perm}
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
