import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { useAdminProducts, type AdminProduct } from "../../../hooks/useAdminProducts";
import type { MugSettings } from "../../../src/components/mug/MugStage";
import { move } from "../../../lib/move";
import { CurrencyInput } from "../../../src/components/ui/CurrencyInput";
import {
  GridIcon,
  ListIcon,
  PencilIcon,
  TrashIcon,
} from "../../../src/components/ui/icons";
import { toast } from "../../../src/components/ui/Toast";
import { formatCents } from "../../../lib/money";
import { ImageUploader, isSaved, type UploaderItem } from "./components/ImageUploader";

// three + o loader de .glb passam de 600 KB: só baixa quando abre um produto com caneca.
const MugStage = lazy(() =>
  import("../../../src/components/mug/MugStage").then((m) => ({ default: m.MugStage })),
);

type Draft = {
  id?: number;
  name: string;
  priceCents: number;
  cat: string;
  active: boolean;
  images: UploaderItem[];
  /** Caneca 3D já salva, só para prévia — quem edita medidas é a tela de mockups. */
  mockup: MugSettings | null;
};

/** Como a lista é exibida. Fica no localStorage porque é preferência de quem
    usa o admin, não estado da navegação. */
type View = "table" | "card";

/** Coluna ordenada no momento, ou null quando a ordenação está desativada. */
type Sort = { col: string; dir: "asc" | "desc" } | null;

const PER_PAGE = 10;

/** Colunas ordenáveis: rótulo → coluna aceita pelo backend. */
const COLUMNS: [label: string, col: string | null][] = [
  ["Imagem", null],
  ["Nome", "name"],
  ["Slug", null],
  ["Preço", "price_cents"],
  ["Categoria", "cat"],
  ["Ativo", "active"],
];

const EMPTY: Draft = {
  name: "",
  priceCents: 0,
  cat: "",
  active: true,
  images: [],
  mockup: null,
};

/** O backend guarda o path da arte separado das medidas; o MugStage quer a URL. */
const toMugSettings = (p: AdminProduct): MugSettings | null =>
  p.mockup ? { ...p.mockup, artUrl: p.mockup_art_url } : null;

const toDraft = (p: AdminProduct): Draft => ({
  id: p.id,
  name: p.name,
  priceCents: p.price_cents,
  cat: p.cat,
  active: p.active,
  images: p.images.map((image) => ({ image })),
  mockup: toMugSettings(p),
});

export default function AdminProducts() {
  const can = useAuth((s) => s.hasPermission);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [sort, setSort] = useState<Sort>(null);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<View>("table");

  // SSG: localStorage só existe no cliente, então a preferência entra depois da
  // hidratação (mesmo motivo do skipHydration no carrinho).
  useEffect(() => {
    if (localStorage.getItem("dibie-admin-produtos-view") === "card") setView("card");
  }, []);

  function changeView(next: View) {
    setView(next);
    localStorage.setItem("dibie-admin-produtos-view", next);
  }

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
  const [mugError, setMugError] = useState<string | null>(null);
  const busy = create.isPending || update.isPending;

  // erro do 3D é do produto aberto, não do modal: some ao trocar de produto
  useEffect(() => setMugError(null), [draft?.id]);

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
    fd.append("price_cents", String(draft.priceCents));
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

  /** Editar/remover: os mesmos botões na tabela e no card. */
  const Actions = ({ p }: { p: AdminProduct }) => (
    <>
      {can("products.update") && (
        <button
          type="button"
          aria-label="Editar produto"
          title="Editar"
          onClick={() => setDraft(toDraft(p))}
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
    </>
  );

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

        <div
          role="group"
          aria-label="Visualização"
          className="ml-auto flex items-center gap-1"
        >
          {([
            ["table", "Tabela", ListIcon],
            ["card", "Cards", GridIcon],
          ] as const).map(([mode, label, Icon]) => (
            <button
              key={mode}
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={view === mode}
              onClick={() => changeView(mode)}
              className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md ${
                view === mode ? "bg-ink-10 text-ink" : "text-ink-40 hover:bg-ink-5"
              }`}
            >
              <Icon />
            </button>
          ))}
        </div>
      </div>

      {view === "card" ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {rows.map((p) => (
            <li
              key={p.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-ink-10"
            >
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt=""
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center bg-ink-5 text-body text-ink-40">
                  sem imagem
                </div>
              )}
              <div className="flex flex-1 flex-col gap-1 p-3 text-body">
                <span className="font-mono text-[0.5625rem] uppercase tracking-[0.06em] text-ink-40">
                  {p.cat}
                </span>
                <span className="truncate font-semibold">{p.name}</span>
                <span className="text-ink-40">{formatCents(p.price_cents)}</span>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-ink-40">
                    {p.active ? p.slug : `${p.slug} — inativo`}
                  </span>
                  <span className="flex-shrink-0">
                    <Actions p={p} />
                  </span>
                </div>
              </div>
            </li>
          ))}
          {!rows.length && (
            <li className="col-span-full py-6 text-center text-body text-ink-40">
              Nenhum produto encontrado
            </li>
          )}
        </ul>
      ) : (
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
              <td>{formatCents(p.price_cents)}</td>
              <td>{p.cat}</td>
              <td>{p.active ? "sim" : "não"}</td>
              <td className="text-right">
                <Actions p={p} />
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
      )}

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
          <div className="max-h-[90vh] w-[min(460px,100%)] overflow-y-auto rounded-2xl bg-bg p-6">
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
                value={draft.priceCents}
                onChange={(v) => setDraft({ ...draft, priceCents: v })}
                className="mt-1 w-full rounded-md border border-ink-10 bg-bg px-3 py-2 outline-none"
              />
            </label>
            {draft.mockup && (
              <div className="mb-3">
                <p className="mb-2 text-body text-ink-40">
                  Caneca 3D — arraste para girar. As medidas se editam em Mockups.
                </p>
                <div className="aspect-[3/2] w-full overflow-hidden rounded-lg border border-ink-10">
                  {mugError ? (
                    <div className="flex h-full items-center justify-center px-6 text-center text-body text-ink-40">
                      {mugError}
                    </div>
                  ) : (
                    <Suspense
                      fallback={
                        <div className="flex h-full items-center justify-center text-body text-ink-40">
                          carregando 3D…
                        </div>
                      }
                    >
                      {/* sem ref: aqui ninguém fotografa, só confere o resultado */}
                      <MugStage settings={draft.mockup} onError={setMugError} />
                    </Suspense>
                  )}
                </div>
              </div>
            )}
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
