import { useEffect } from "react";

/* Overlay escuro compartilhado por modal e drawer. Trava o scroll do body
   enquanto aberto e fecha no clique ou Esc. */
export function Overlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div
      aria-hidden
      onClick={onClose}
      className="fixed inset-0 z-40 bg-black/35 transition-opacity duration-300 ease-milo"
      style={{
        opacity: open ? 1 : 0,
        visibility: open ? "visible" : "hidden",
      }}
    />
  );
}
