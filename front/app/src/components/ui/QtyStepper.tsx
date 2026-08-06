import { MinusIcon, PlusIcon } from "./icons";

export function QtyStepper({
  value,
  onDec,
  onInc,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-ink-5 p-1 text-body">
      <button
        type="button"
        onClick={onDec}
        aria-label="Diminuir"
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full hover:bg-ink-10"
      >
        <MinusIcon size={14} />
      </button>
      <span className="min-w-[20px] text-center">{value}</span>
      <button
        type="button"
        onClick={onInc}
        aria-label="Aumentar"
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full hover:bg-ink-10"
      >
        <PlusIcon size={14} />
      </button>
    </div>
  );
}
