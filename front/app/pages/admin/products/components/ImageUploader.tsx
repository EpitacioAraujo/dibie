import { useEffect, useMemo, useRef, useState } from "react";
import { Overlay } from "../../../../src/components/ui/Overlay";
import { PlusIcon, TrashIcon } from "../../../../src/components/ui/icons";
import type { AdminProductImage } from "../../../../hooks/useAdminProducts";

export const MAX_IMAGES = 4;

/** Imagem já salva no servidor ou arquivo ainda pendente de upload. */
export type UploaderItem = { image: AdminProductImage } | { file: File };

export const isSaved = (item: UploaderItem): item is { image: AdminProductImage } =>
  "image" in item;

export function ImageUploader({
  items,
  onAddFiles,
  onRemove,
  onReorder,
  onDeleteExisting,
}: {
  items: UploaderItem[];
  onAddFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  onDeleteExisting: (id: number) => void;
}) {
  const [confirming, setConfirming] = useState<number | null>(null);
  const dragging = useRef<number | null>(null);

  const previews = useMemo(
    () => items.map((i) => (isSaved(i) ? i.image.image_url : URL.createObjectURL(i.file))),
    [items],
  );
  useEffect(() => {
    return () =>
      previews.forEach((url, i) => {
        if (!isSaved(items[i])) URL.revokeObjectURL(url);
      });
  }, [previews, items]);

  function addFiles(files: FileList | File[]) {
    const room = MAX_IMAGES - items.length;
    if (room <= 0) return;
    onAddFiles(Array.from(files).slice(0, room));
  }

  const full = items.length >= MAX_IMAGES;

  return (
    <div>
      <p className="mb-2 text-body text-ink-40">
        Imagens (até {MAX_IMAGES}) — arraste para ordenar, a 1ª é a capa
      </p>
      <ul className="flex flex-col gap-1">
        {/* Adicionar é o primeiro item da lista: o alvo de soltar arquivo fica
            no topo, onde o olho começa a ler. */}
        <li>
          <label
            title={full ? `máximo de ${MAX_IMAGES} imagens` : "adicionar imagens"}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
            }}
            className={`flex items-center gap-3 rounded-md border border-dashed border-ink-10 px-2 py-2 text-body text-ink-40 ${
              full ? "opacity-40" : "cursor-pointer hover:bg-ink-5"
            }`}
          >
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center">
              <PlusIcon />
            </span>
            {full ? `máximo de ${MAX_IMAGES} imagens` : "adicionar imagens"}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={full}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </li>

        {items.map((item, i) => (
          <li
            key={isSaved(item) ? `img-${item.image.id}` : `file-${item.file.name}-${i}`}
            draggable
            onDragStart={() => (dragging.current = i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging.current !== null) onReorder(dragging.current, i);
              dragging.current = null;
            }}
            className="flex cursor-grab items-center gap-3 rounded-md px-2 py-2 hover:bg-ink-5"
          >
            <img
              src={previews[i]}
              alt=""
              className="h-12 w-12 flex-shrink-0 rounded object-cover"
            />
            <span className="flex-1 truncate text-body">
              {isSaved(item) ? `imagem ${i + 1}` : item.file.name}
            </span>
            {i === 0 && (
              <span className="font-mono text-[0.5625rem] uppercase tracking-[0.06em] text-ink-40">
                capa
              </span>
            )}
            <button
              type="button"
              aria-label="Remover imagem"
              title="Remover"
              onClick={() => (isSaved(item) ? setConfirming(i) : onRemove(i))}
              className="inline-flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-wine hover:bg-ink-10"
            >
              <TrashIcon />
            </button>
          </li>
        ))}
      </ul>

      {confirming !== null && (
        <>
          <Overlay open onClose={() => setConfirming(null)} />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed left-1/2 top-1/2 z-50 w-[min(340px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-bg p-6"
          >
            <p className="mb-4 text-h6">Remover esta imagem?</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="cursor-pointer px-4 py-2 text-body"
              >
                cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const item = items[confirming];
                  if (isSaved(item)) onDeleteExisting(item.image.id);
                  onRemove(confirming);
                  setConfirming(null);
                }}
                className="cursor-pointer rounded-full bg-wine px-4 py-2 text-body text-white"
              >
                remover
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
