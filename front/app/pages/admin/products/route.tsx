import { useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { useAdminProducts } from "../../../hooks/useAdminProducts";
import { PencilIcon, TrashIcon } from "../../../src/components/ui/icons";
import { ImageUploader } from "./components/ImageUploader";

type Draft = {
  id?: number;
  slug: string;
  name: string;
  price: string;
  cat: string;
  active: boolean;
  images: File[];
};

const EMPTY: Draft = {
  slug: "",
  name: "",
  price: "",
  cat: "",
  active: true,
  images: [],
};

export default function AdminProducts() {
  const can = useAuth((s) => s.hasPermission);
  const {
    products: rows,
    create,
    update,
    remove: removeProduct,
    deleteImage,
  } = useAdminProducts();
  const [draft, setDraft] = useState<Draft | null>(null);
  const busy = create.isPending || update.isPending;
  const existingImages = rows.find((r) => r.id === draft?.id)?.images ?? [];

  async function save() {
    if (!draft) return;
    const fd = new FormData();
    fd.append("slug", draft.slug);
    fd.append("name", draft.name);
    fd.append("price", draft.price);
    fd.append("cat", draft.cat);
    fd.append("active", draft.active ? "1" : "0");
    draft.images.forEach((file) => fd.append("images[]", file));
    if (draft.id) await update.mutateAsync({ id: draft.id, body: fd });
    else await create.mutateAsync(fd);
    setDraft(null);
  }

  async function remove(id: number) {
    if (!confirm("Remover este produto?")) return;
    await removeProduct.mutateAsync(id);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-h2">Produtos</h1>
        {can("products.create") && (
          <button
            type="button"
            onClick={() => setDraft({ ...EMPTY })}
            className="cursor-pointer rounded-full bg-ink px-4 py-2 text-body text-white"
          >
            Novo produto
          </button>
        )}
      </div>

      <table className="w-full border-collapse text-body">
        <thead>
          <tr className="border-b border-ink-10 text-left text-ink-40">
            <th className="py-2">Imagem</th>
            <th>Nome</th>
            <th>Slug</th>
            <th>Preço</th>
            <th>Categoria</th>
            <th>Ativo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b border-ink-10">
              <td className="py-2">
                {p.image_url && (
                  <img
                    src={p.image_url}
                    alt=""
                    className="h-10 w-14 rounded object-cover"
                  />
                )}
              </td>
              <td>{p.name}</td>
              <td className="text-ink-40">{p.slug}</td>
              <td>R$ {p.price}</td>
              <td>{p.cat}</td>
              <td>{p.active ? "sim" : "não"}</td>
              <td className="text-right">
                {can("products.update") && (
                  <button
                    type="button"
                    aria-label="Editar produto"
                    title="Editar"
                    onClick={() =>
                      setDraft({
                        id: p.id,
                        slug: p.slug,
                        name: p.name,
                        price: String(p.price),
                        cat: p.cat,
                        active: p.active,
                        images: [],
                      })
                    }
                    className="mr-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full hover:bg-ink-10"
                  >
                    <PencilIcon />
                  </button>
                )}
                {can("products.delete") && (
                  <button
                    type="button"
                    aria-label="Remover produto"
                    title="Remover"
                    onClick={() => remove(p.id)}
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
          <div className="w-[min(420px,100%)] rounded-2xl bg-bg p-6">
            <p className="mb-4 text-h6">
              {draft.id ? "Editar produto" : "Novo produto"}
            </p>
            {(["slug", "name", "cat"] as const).map((f) => (
              <label key={f} className="mb-3 block text-body capitalize">
                {f === "name" ? "nome" : f === "cat" ? "categoria" : f}
                <input
                  value={draft[f]}
                  onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
                  className="mt-1 w-full rounded-md border border-ink-10 bg-bg px-3 py-2 outline-none"
                />
              </label>
            ))}
            <label className="mb-3 block text-body">
              preço
              <input
                type="number"
                step="0.01"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                className="mt-1 w-full rounded-md border border-ink-10 bg-bg px-3 py-2 outline-none"
              />
            </label>
            <div className="mb-3">
              <ImageUploader
                existing={existingImages}
                pending={draft.images}
                onAddFiles={(files) =>
                  setDraft({ ...draft, images: [...draft.images, ...files] })
                }
                onRemovePending={(i) =>
                  setDraft({
                    ...draft,
                    images: draft.images.filter((_, idx) => idx !== i),
                  })
                }
                onDeleteExisting={(imageId) =>
                  draft.id &&
                  deleteImage.mutate({ productId: draft.id, imageId })
                }
              />
            </div>
            <label className="mb-6 flex items-center gap-2 text-body">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) =>
                  setDraft({ ...draft, active: e.target.checked })
                }
              />
              ativo
            </label>
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
                disabled={busy}
                onClick={save}
                className="cursor-pointer rounded-full bg-ink px-4 py-2 text-body text-white disabled:opacity-60"
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
