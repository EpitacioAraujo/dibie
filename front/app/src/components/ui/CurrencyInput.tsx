import { type ComponentProps } from "react";
import { formatCents } from "../../../lib/money";

/**
 * Input de preço com máscara de real: digita-se só números, os dois últimos
 * dígitos são sempre os centavos (como em caixa de loja). `value`/`onChange`
 * trafegam em centavos inteiros — a mesma unidade do banco e da API — e só a
 * exibição vira "R$ 45,90".
 */
export function CurrencyInput({
  value,
  onChange,
  ...rest
}: {
  value: number;
  onChange: (cents: number) => void;
} & Omit<ComponentProps<"input">, "value" | "onChange" | "type">) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      value={value ? formatCents(value) : ""}
      placeholder={rest.placeholder ?? "R$ 0,00"}
      onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "") || 0))}
    />
  );
}
