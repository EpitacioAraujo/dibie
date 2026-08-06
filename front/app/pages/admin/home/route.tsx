import { useEffect, useRef, useState } from "react";
import {
  useAdminHero,
  type HeroItem,
  type HeroLane,
} from "../../../hooks/useAdminHero";
import { useAdminProducts, type AdminProduct } from "../../../hooks/useAdminProducts";
import { apiMessage } from "../../../lib/apiMessage";
import { move } from "../../../lib/move";
import { svgToPng } from "../../../lib/svgToPng";
import { PlusIcon, TrashIcon } from "../../../src/components/ui/icons";
import { toast } from "../../../src/components/ui/Toast";
import { SlideEditor } from "./components/SlideEditor";

const MOSAIC: { lane: HeroLane; label: string }[] = [
  { lane: "top", label: "Fileira de cima" },
  { lane: "midLeft", label: "Meio — esquerda" },
  { lane: "midRight", label: "Meio — direita" },
  { lane: "bottom", label: "Fileira de baixo" },
];

/** Quantos destaques o layout da home comporta (3 + 2). */
const HOME_SLOTS = 5;

/** Busca sem depender de acento ou caixa. */
const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Classes da seção com alteração pendente. */
const dirtyBox = (dirty: boolean) =>
  `rounded-2xl p-4 transition-colors ${dirty ? "bg-amber-100/60" : ""}`;

const heroKey = (l: HeroItem[]) =>
  JSON.stringify(
    [...l]
      .sort((a, b) => a.id - b.id)
      .map((i) => [i.id, i.lane, i.position, i.title, i.sub, i.alt]),
  );

const featuredKey = (l: { id: number }[]) => l.map((p) => p.id).join(",");

export default function AdminHome() {
  const hero = useAdminHero();
  const { products, saveFeatured } = useAdminProducts();

  // Cópias locais: edita à vontade e só grava no "salvar".
  const [items, setItems] = useState<HeroItem[]>([]);
  const [picks, setPicks] = useState<AdminProduct[]>([]); // destaques, na ordem
  const [query, setQuery] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => setItems(hero.items), [hero.items]);
  useEffect(() => {
    setPicks(
      products.filter((p) => p.featured).sort((a, b) => a.position - b.position),
    );
  }, [products]);

  const lane = (l: HeroLane) => items.filter((i) => i.lane === l);

  /** Reordena dentro de uma faixa e devolve a lista completa atualizada. */
  function reorderLane(l: HeroLane, from: number, to: number) {
    const reordered = move(lane(l), from, to);
    setItems((all) => {
      const rest = all.filter((i) => i.lane !== l);
      return [...rest, ...reordered.map((i, position) => ({ ...i, position }))];
    });
  }

  function patch(id: number, field: "title" | "sub" | "alt", value: string) {
    setItems((all) => all.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  }

  async function upload(l: HeroLane, file: File) {
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("lane", l);
      fd.append("image", await svgToPng(file)); // SVG não passa na validação do backend
      hero.upload.mutate(fd);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Falha ao ler o arquivo.");
    }
  }

  function saveHero() {
    hero.save.mutate(
      items.map((i) => ({
        id: i.id,
        lane: i.lane,
        position: i.position,
        title: i.title,
        sub: i.sub,
        alt: i.alt,
      })),
      { onSuccess: () => toast("Hero salvo") },
    );
  }

  const slides = lane("slide");

  // "Sujo" = a cópia local difere do servidor nos campos que o salvar envia.
  // Upload e remoção de imagem já gravam na hora, então não contam.
  const heroDirty = heroKey(items) !== heroKey(hero.items);
  const picksDirty =
    featuredKey(picks) !==
    featuredKey(
      products.filter((p) => p.featured).sort((a, b) => a.position - b.position),
    );

  const full = picks.length >= HOME_SLOTS;
  // Cada palavra digitada precisa bater em nome, slug ou categoria — assim
  // "paulista pai" e o código do slug encontram o mesmo produto.
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const matches = terms.length
    ? products
        .filter((p) => {
          if (picks.some((s) => s.id === p.id)) return false;
          const haystack = normalize(`${p.name} ${p.slug} ${p.cat}`);
          return terms.every((t) => haystack.includes(t));
        })
        .slice(0, 8)
    : [];

  function saveFeaturedPicks() {
    const dropped = products
      .filter((p) => p.featured && !picks.some((s) => s.id === p.id))
      .map((p) => ({ id: p.id, featured: false, position: 0 }));

    saveFeatured.mutate(
      [
        ...picks.map((p, position) => ({ id: p.id, featured: true, position })),
        ...dropped,
      ],
      { onSuccess: () => toast("Vitrine salva") },
    );
  }

  const failure = [hero.upload, hero.save, hero.remove, saveFeatured].find(
    (m) => m.error,
  )?.error;

  return (
    <div className="max-w-[900px]">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-h4">Home</h1>
        <p className="text-body text-ink-40">
          o que aparece na primeira dobra e na vitrine do site
        </p>
      </div>

      {(uploadError || failure) && (
        <p className="mb-4 rounded-md bg-wine/10 px-4 py-3 text-body text-wine">
          {uploadError ??
            apiMessage(failure, "Não foi possível salvar. Tente de novo.")}
        </p>
      )}

      {/* ---- Slides do carrossel (mesmo botão de salvar do mosaico) ---- */}
      <section className={`mb-4 ${dirtyBox(heroDirty)}`}>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-h6">Slides do hero</h2>
          <p className="text-body text-ink-40">
            edite os textos sobre a imagem; arraste as miniaturas para ordenar
          </p>
        </div>

        <SlideEditor
          slides={slides}
          onPatch={patch}
          onAdd={(files) => files.forEach((f) => upload("slide", f))}
          onRemove={(id) => hero.remove.mutate(id)}
          onReorder={(from, to) => reorderLane("slide", from, to)}
        />
      </section>

      {/* ---- Mosaico ---- */}
      <section className={`mb-10 ${dirtyBox(heroDirty)}`}>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-h6">Mosaico do fundo</h2>
          {/* ponytail: arrastar entre faixas não é suportado — remova e suba na outra. */}
          <p className="text-body text-ink-40">
            arraste para ordenar dentro da faixa
          </p>
        </div>

        {MOSAIC.map(({ lane: l, label }) => (
          <div key={l} className="mb-4">
            <p className="mb-2 text-body text-ink-40">{label}</p>
            <div className="flex flex-wrap gap-3">
              <AddTile
                compact
                label={`adicionar imagem em ${label}`}
                onFiles={(files) => files.forEach((f) => upload(l, f))}
              />
              {lane(l).map((item, i) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/plain", String(i))
                  }
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    reorderLane(l, Number(e.dataTransfer.getData("text/plain")), i);
                  }}
                  className="group relative h-16 w-16 cursor-grab overflow-hidden rounded-md"
                >
                  <img
                    src={item.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remover imagem"
                    onClick={() => hero.remove.mutate(item.id)}
                    className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={saveHero}
            disabled={hero.save.isPending}
            className={`cursor-pointer rounded-full bg-ink px-5 py-2 text-body text-white disabled:opacity-60 ${
              heroDirty ? "pulse-save" : ""
            }`}
          >
            {hero.save.isPending ? "salvando…" : "salvar hero"}
          </button>
          {heroDirty && (
            <span className="text-body text-ink-40">alterações não salvas</span>
          )}
        </div>
      </section>

      {/* ---- Destaques ---- */}
      <section className={dirtyBox(picksDirty)}>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-h6">
            Produtos na home ({picks.length}/{HOME_SLOTS})
          </h2>
          <p className="text-body text-ink-40">arraste para ordenar</p>
        </div>

        <div className="mb-4 flex flex-col gap-2">
          {picks.length === 0 && (
            <p className="rounded-md border border-dashed border-ink-10 p-4 text-body text-ink-40">
              nenhum produto em destaque ainda — busque abaixo para adicionar
            </p>
          )}
          {picks.map((p, i) => (
            <Row
              key={p.id}
              index={i}
              onReorder={(from, to) => setPicks((s) => move(s, from, to))}
            >
              {p.image_url && (
                <img
                  src={p.image_url}
                  alt=""
                  className="h-10 w-10 rounded object-cover"
                />
              )}
              <span className="flex-1 text-body">{p.name}</span>
              <span className="text-body text-ink-40">slot {i + 1}</span>
              <RemoveButton
                label={`Tirar ${p.name} dos destaques`}
                onClick={() => setPicks((s) => s.filter((o) => o.id !== p.id))}
              />
            </Row>
          ))}
        </div>

        <div className="mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={full}
            placeholder={
              full
                ? `${HOME_SLOTS} de ${HOME_SLOTS} slots — remova um para trocar`
                : "buscar produto para adicionar…"
            }
            className="w-full rounded-md border border-ink-10 bg-bg px-3 py-2 text-body outline-none disabled:opacity-60"
          />
          {matches.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              {matches.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-md border border-ink-10 p-2"
                >
                  {p.image_url && (
                    <img
                      src={p.image_url}
                      alt=""
                      className="h-8 w-8 rounded object-cover"
                    />
                  )}
                  <span className="flex-1 text-body">{p.name}</span>
                  <button
                    type="button"
                    aria-label={`Adicionar ${p.name} aos destaques`}
                    onClick={() => {
                      setPicks((s) => [...s, p]);
                      setQuery("");
                    }}
                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full hover:bg-ink-10"
                  >
                    <PlusIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
          {terms.length > 0 && matches.length === 0 && (
            <p className="mt-2 text-body text-ink-40">nenhum produto encontrado</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={saveFeaturedPicks}
            disabled={saveFeatured.isPending}
            className={`cursor-pointer rounded-full bg-ink px-5 py-2 text-body text-white disabled:opacity-60 ${
              picksDirty ? "pulse-save" : ""
            }`}
          >
            {saveFeatured.isPending ? "salvando…" : "salvar destaques"}
          </button>
          {picksDirty && (
            <span className="text-body text-ink-40">alterações não salvas</span>
          )}
        </div>
      </section>
    </div>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title="Remover"
      onClick={onClick}
      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-wine hover:bg-ink-10"
    >
      <TrashIcon />
    </button>
  );
}

/** Linha arrastável genérica (slides e produtos). */
function Row({
  index,
  onReorder,
  children,
}: {
  index: number;
  onReorder: (from: number, to: number) => void;
  children: React.ReactNode;
}) {
  const dragging = useRef(false);
  return (
    <div
      draggable
      onDragStart={(e) => {
        dragging.current = true;
        e.dataTransfer.setData("text/plain", String(index));
      }}
      onDragEnd={() => (dragging.current = false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onReorder(Number(e.dataTransfer.getData("text/plain")), index);
      }}
      className="flex cursor-grab items-center gap-3 rounded-md border border-ink-10 p-3"
    >
      {children}
    </div>
  );
}

function AddTile({
  label,
  compact = false,
  onFiles,
}: {
  label: string;
  compact?: boolean;
  onFiles: (files: File[]) => void;
}) {
  return (
    <label
      title={label}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) onFiles(Array.from(e.dataTransfer.files));
      }}
      className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-ink-10 text-body text-ink-40 hover:bg-ink-5 ${
        compact ? "h-16 w-16" : "px-4 py-3"
      }`}
    >
      <PlusIcon />
      {!compact && label}
      <input
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
    </label>
  );
}
