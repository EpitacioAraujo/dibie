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
        className="h-7 w-7 cursor-pointer rounded-full hover:bg-ink-10"
      >
        −
      </button>
      <span className="min-w-[20px] text-center">{value}</span>
      <button
        type="button"
        onClick={onInc}
        aria-label="Aumentar"
        className="h-7 w-7 cursor-pointer rounded-full hover:bg-ink-10"
      >
        +
      </button>
    </div>
  );
}
