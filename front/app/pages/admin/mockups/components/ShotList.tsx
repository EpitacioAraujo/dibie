import { useRef, type ReactNode } from "react";
import {
  CheckIcon,
  DownloadIcon,
  TrashIcon,
} from "../../../../src/components/ui/icons";

/** Uma imagem gerada na tela (dataURL) e se ela vai para o produto ao salvar. */
export type Shot = { url: string; picked: boolean };

export function ShotList({
  label,
  items,
  addIcon,
  addTitle,
  busy = false,
  disabled = false,
  onAdd,
  onRemove,
  onToggle,
  onReorder,
  selected,
  onSelect,
}: {
  label: string;
  items: Shot[];
  addIcon: ReactNode;
  addTitle: string;
  busy?: boolean;
  disabled?: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onToggle: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  selected?: number;
  onSelect?: (index: number) => void;
}) {
  const dragging = useRef<number | null>(null);

  return (
    <div>
      <p className="mb-2 text-body text-ink-40">{label}</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          title={addTitle}
          aria-label={addTitle}
          onClick={onAdd}
          disabled={busy || disabled}
          className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-md border border-dashed border-ink-10 text-ink-40 hover:bg-ink-5 disabled:cursor-default disabled:opacity-50"
        >
          {busy ? "…" : addIcon}
        </button>

        {items.map((item, i) => (
          <div
            key={item.url.slice(-32) + i}
            draggable
            onDragStart={() => (dragging.current = i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging.current !== null) onReorder(dragging.current, i);
              dragging.current = null;
            }}
            onClick={onSelect && (() => onSelect(i))}
            className={`group relative h-16 w-16 overflow-hidden rounded-md border ${
              onSelect ? "cursor-pointer" : ""
            } ${selected === i ? "border-ink" : "border-transparent"} ${
              item.picked ? "ring-2 ring-wine" : ""
            }`}
          >
            <img src={item.url} alt="" className="h-full w-full object-cover" />

            <button
              type="button"
              aria-label={item.picked ? "Não usar no produto" : "Usar no produto"}
              title={item.picked ? "não usar no produto" : "usar no produto"}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(i);
              }}
              className={`absolute left-1 top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded border ${
                item.picked
                  ? "border-wine bg-wine text-white"
                  : "border-white/70 bg-black/35 text-transparent"
              }`}
            >
              <CheckIcon className="h-3 w-3" />
            </button>

            <a
              href={item.url}
              download="mockup.png"
              title="Baixar"
              aria-label="Baixar imagem"
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-1 right-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <DownloadIcon className="h-3 w-3" />
            </a>

            <button
              type="button"
              aria-label="Remover imagem"
              title="Remover"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(i);
              }}
              className="absolute right-1 top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <TrashIcon className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
