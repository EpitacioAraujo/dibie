import { useEffect, useState, type ComponentProps } from "react";

const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Input de preço com máscara de real: digita-se só números, os dois últimos
 * dígitos são sempre os centavos (como em caixa de loja). `value`/`onChange`
 * trafegam em decimal ("45.90") — o formato que os formulários já enviam ao
 * backend — só a exibição vira "R$ 45,90".
 */
export function CurrencyInput({
  value,
  onChange,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
} & Omit<ComponentProps<"input">, "value" | "onChange" | "type">) {
  const [cents, setCents] = useState(() => Math.round(Number(value || 0) * 100));

  // O valor pode mudar de fora (abrir outro registro, limpar o formulário).
  useEffect(() => {
    const next = Math.round(Number(value || 0) * 100);
    setCents((cur) => (cur === next ? cur : next));
  }, [value]);

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      value={cents ? formatBRL(cents) : ""}
      placeholder={rest.placeholder ?? "R$ 0,00"}
      onChange={(e) => {
        const next = Number(e.target.value.replace(/\D/g, "") || 0);
        setCents(next);
        onChange((next / 100).toFixed(2));
      }}
    />
  );
}
