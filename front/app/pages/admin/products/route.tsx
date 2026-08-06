import { useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { useAdminProducts } from "../../../hooks/useAdminProducts";
import { move } from "../../../lib/move";
import { CurrencyInput } from "../../../src/components/ui/CurrencyInput";
import { PencilIcon, TrashIcon } from "../../../src/components/ui/icons";
import { toast } from "../../../src/components/ui/Toast";
import { ImageUploader, isSaved, type UploaderItem } from "./components/ImageUploader";

type Draft = {
  id?: number;
  name: string;
  price: string;
  cat: string;
  active: boolean;
  images: UploaderItem[];
};

/** Coluna ordenada no momento, ou null quando a ordenação está desativada. */
type Sort = { col: string; dir: "asc" | "desc" } | null;

const PER_PAGE = 10;

/** Colunas ordenáveis: rótulo → coluna aceita pelo backend. */
const COLUMNS: [label: string, col: string | null][] = [
  ["Imagem", null],
  ["Nome", "name"],
  ["Slug", null],
  ["Preço", "price"],
  ["Categoria", "cat"],
  ["Ativo", "active"],
];

const EMPTY: Draft = {
  name: "",
  price: "",
  cat: "",
  active: true,
  images: [],
};

export default function AdminProducts() {
  const can = useAuth((s) => s.hasPermission);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [sort, setSort] = useState<Sort>(null);
  const [page, setPage] = useState(1);

  // o backend só é consultado quando a digitação para
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const {
    products: rows,
    total,
    lastPage,
    cats,
    create,
    update,
    remove: removeProduct,
    deleteImage,
  } = useAdminProducts({
    q,
    cat,
    sort: sort?.col,
    dir: sort?.dir,
    page,
    per_page: PER_PAGE,
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const busy = create.isPending || update.isPending;

  const start = (page - 1) * PER_PAGE;

  // mesma coluna: asc → desc → desativado. Outra coluna: começa em asc (só uma ordena por vez).
  function toggleSort(col: string) {
    setSort((s) =>
      s?.col !== col
        ? { col, dir: "asc" }
        : s.dir === "asc"
          ? { col, dir: "desc" }
          : null,
    );
    setPage(1);
  }

  async function save() {
    if (!draft) return;
    // Sem slug: o backend gera o código de 8 caracteres no cadastro e mantém
    // o existente na edição.
    const fd = new FormData();
    fd.append("name", draft.name);
    fd.append("price", draft.price);
    fd.append("cat", draft.cat);
    fd.append("active", draft.active ? "1" : "0");
    // order[] carrega a ordem final: id da imagem salva ou new:<índice de images[]>.
    let pending = 0;
    draft.images.forEach((item) => {
      if (isSaved(item)) return fd.append("order[]", String(item.image.id));
      fd.append("images[]", item.file);
      fd.append("order[]", `new:${pending++}`);
    });
    if (draft.id) await update.mutateAsync({ id: draft.id, body: fd });
    else await create.mutateAsync(fd);
    toast(draft.id ? "Produto atualizado" : "Produto cadastrado");
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

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome"
          aria-label="Buscar por nome"
          className="w-full max-w-[260px] rounded-md border border-ink-10 bg-bg px-3 py-2 text-body outline-none"
        />
        <select
          value={cat}
          onChange={(e) => {
            setCat(e.target.value);
            setPage(1);
          }}
          aria-label="Filtrar por categoria"
          className="cursor-pointer rounded-md border border-ink-10 bg-bg px-3 py-2 text-body outline-none"
        >
          <option value="">Todas as categorias</option>
          {cats.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <table className="w-full border-collapse text-body">
        <thead>
          <tr className="border-b border-ink-10 text-left text-ink-40">
            {COLUMNS.map(([label, col]) => (
              <th
                key={label}
                className="py-2 font-normal"
                aria-sort={
                  sort?.col === col && col
                    ? sort.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {col ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(col)}
                    aria-label={`Ordenar por ${label}`}
                    className="flex cursor-pointer items-center gap-1 hover:text-ink"
                  >
                    {label}
                    <span
                      aria-hidden
                      className={sort?.col === col ? "text-ink" : "opacity-40"}
                    >
                      {sort?.col === col ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                ) : (
                  label
                )}
              </th>
            ))}
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
                        name: p.name,
                        price: String(p.price),
                        cat: p.cat,
                        active: p.active,
                        images: p.images.map((image) => ({ image })),
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
          {!rows.length && (
            <tr>
              <td colSpan={7} className="py-6 text-center text-ink-40">
                Nenhum produto encontrado
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-4 flex items-center justify-between text-body text-ink-40">
        <span>
          {total ? `${start + 1}–${start + rows.length} de ${total}` : "0 produtos"}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="cursor-pointer rounded-full px-3 py-1 hover:bg-ink-10 disabled:cursor-default disabled:opacity-40"
          >
            anterior
          </button>
          <span>
            {page} / {lastPage}
          </span>
          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={page >= lastPage}
            className="cursor-pointer rounded-full px-3 py-1 hover:bg-ink-10 disabled:cursor-default disabled:opacity-40"
          >
            próxima
          </button>
        </div>
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-[min(420px,100%)] rounded-2xl bg-bg p-6">
            <p className="mb-4 text-h6">
              {draft.id ? "Editar produto" : "Novo produto"}
            </p>
            {(["name", "cat"] as const).map((f) => (
              <label key={f} className="mb-3 block text-body capitalize">
                {f === "name" ? "nome" : "categoria"}
                <input
                  value={draft[f]}
                  onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
                  className="mt-1 w-full rounded-md border border-ink-10 bg-bg px-3 py-2 outline-none"
                />
              </label>
            ))}
            <label className="mb-3 block text-body">
              preço
              <CurrencyInput
                value={draft.price}
                onChange={(v) => setDraft({ ...draft, price: v })}
                className="mt-1 w-full rounded-md border border-ink-10 bg-bg px-3 py-2 outline-none"
              />
            </label>
            <div className="mb-3">
              <ImageUploader
                items={draft.images}
                onAddFiles={(files) =>
                  setDraft({
                    ...draft,
                    images: [...draft.images, ...files.map((file) => ({ file }))],
                  })
                }
                onRemove={(i) =>
                  setDraft({
                    ...draft,
                    images: draft.images.filter((_, idx) => idx !== i),
                  })
                }
                onReorder={(from, to) =>
                  setDraft({ ...draft, images: move(draft.images, from, to) })
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
