import { useEffect, useMemo, useState } from "react";
import { Overlay } from "../../../../src/components/ui/Overlay";
import { PlusIcon, TrashIcon } from "../../../../src/components/ui/icons";
import type { AdminProductImage } from "../../../../hooks/useAdminProducts";

const MAX_IMAGES = 4;

export function ImageUploader({
  existing,
  pending,
  onAddFiles,
  onRemovePending,
  onDeleteExisting,
}: {
  existing: AdminProductImage[];
  pending: File[];
  onAddFiles: (files: File[]) => void;
  onRemovePending: (index: number) => void;
  onDeleteExisting: (id: number) => void;
}) {
  const [confirming, setConfirming] = useState<AdminProductImage | null>(null);
  const total = existing.length + pending.length;

  const previews = useMemo(() => pending.map((f) => URL.createObjectURL(f)), [pending]);
  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  function addFiles(files: FileList | File[]) {
    const room = MAX_IMAGES - total;
    if (room <= 0) return;
    onAddFiles(Array.from(files).slice(0, room));
  }

  return (
    <div>
      <p className="mb-2 text-body text-ink-40">Imagens (até {MAX_IMAGES})</p>
      <div className="flex flex-wrap gap-3">
        {existing.map((img) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setConfirming(img)}
            className="group relative h-20 w-20 cursor-pointer overflow-hidden rounded-md"
          >
            <img src={img.image_url} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <TrashIcon />
            </span>
          </button>
        ))}

        {pending.map((file, i) => (
          <button
            key={`${file.name}-${i}`}
            type="button"
            onClick={() => onRemovePending(i)}
            className="group relative h-20 w-20 cursor-pointer overflow-hidden rounded-md"
          >
            <img src={previews[i]} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <TrashIcon />
            </span>
          </button>
        ))}

        {total < MAX_IMAGES && (
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
            }}
            className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-ink-10 text-ink-40 hover:bg-ink-5"
          >
            <PlusIcon />
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      {confirming && (
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
                  onDeleteExisting(confirming.id);
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
