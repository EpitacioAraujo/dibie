import { useEffect, useRef, useState } from "react";
import type { HeroItem } from "../../../../hooks/useAdminHero";
import { PlusIcon, TrashIcon } from "../../../../src/components/ui/icons";

/**
 * Preview do slide como ele sai na home — o palco replica .hero-shade e
 * .hero-caption de pages/home/components/hero.css. Só os textos são editáveis;
 * a disposição é a do site.
 */
export function SlideEditor({
  slides,
  onPatch,
  onAdd,
  onRemove,
  onReorder,
}: {
  slides: HeroItem[];
  onPatch: (id: number, field: "title" | "sub" | "alt", value: string) => void;
  onAdd: (files: File[]) => void;
  onRemove: (id: number) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const [selected, setSelected] = useState(0);
  const dragging = useRef<number | null>(null);

  // slide removido (ou lista recarregada): não deixa o índice apontar pro vazio
  useEffect(() => {
    if (selected >= slides.length) setSelected(Math.max(0, slides.length - 1));
  }, [slides.length, selected]);

  const current = slides[selected];

  return (
    <div>
      {current ? (
        <div className="relative aspect-[2/1] w-full overflow-hidden rounded-3xl">
          <img
            src={current.image_url}
            alt=""
            className="h-full w-full object-cover"
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to left, rgba(0,0,0,0.65), transparent 60%)",
            }}
          />

          <div className="absolute right-6 top-[55%] flex w-[min(420px,60%)] -translate-y-1/2 items-center gap-4 md:right-12">
            <div className="flex-1">
              <input
                value={current.title ?? ""}
                onChange={(e) => onPatch(current.id, "title", e.target.value)}
                placeholder="título do slide"
                aria-label="Título do slide"
                className="w-full rounded-md border border-dashed border-white/40 bg-transparent px-3 py-1 text-right text-h2 text-white outline-none placeholder:text-white/40 focus:border-white/80"
              />
              <input
                value={current.sub ?? ""}
                onChange={(e) => onPatch(current.id, "sub", e.target.value)}
                placeholder="subtítulo"
                aria-label="Subtítulo do slide"
                className="mt-2 w-full rounded-md border border-dashed border-white/40 bg-transparent px-3 py-1 text-right text-body text-white/85 outline-none placeholder:text-white/40 focus:border-white/80"
              />
            </div>

            <div className="flex flex-col gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setSelected(i)}
                  className={`h-[7px] w-[7px] cursor-pointer rounded-full transition-colors ${
                    i === selected ? "bg-white" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex aspect-[2/1] w-full items-center justify-center rounded-3xl border border-dashed border-ink-10 text-body text-ink-40">
          nenhum slide ainda — adicione o primeiro abaixo
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-3">
        <label
          title="adicionar slide"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length) onAdd(Array.from(e.dataTransfer.files));
          }}
          className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-md border border-dashed border-ink-10 text-ink-40 hover:bg-ink-5"
        >
          <PlusIcon />
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) onAdd(Array.from(e.target.files));
              e.target.value = "";
            }}
          />
        </label>

        {slides.map((s, i) => (
          <div
            key={s.id}
            draggable
            onDragStart={() => (dragging.current = i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging.current !== null) {
                onReorder(dragging.current, i);
                setSelected(i);
              }
              dragging.current = null;
            }}
            onClick={() => setSelected(i)}
            className={`group relative h-16 w-16 cursor-pointer overflow-hidden rounded-md border-2 ${
              i === selected ? "border-ink" : "border-transparent"
            }`}
          >
            <img src={s.image_url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label="Remover slide"
              title="Remover"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(s.id);
              }}
              className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>

      {current && (
        <label className="mt-3 block text-body text-ink-40">
          descrição da imagem (acessibilidade)
          <input
            value={current.alt ?? ""}
            onChange={(e) => onPatch(current.id, "alt", e.target.value)}
            className="mt-1 w-full rounded-md border border-ink-10 bg-bg px-3 py-1.5 text-ink outline-none"
          />
        </label>
      )}
    </div>
  );
}
