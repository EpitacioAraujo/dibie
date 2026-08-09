import { test } from "node:test";
import assert from "node:assert/strict";
import { formatCents } from "./money.ts";

// O Intl separa o símbolo com espaço não-quebrável.
const nb = (s: string) => s.replace(/ /g, " ");

test("formata centavos em BRL", () => {
  assert.equal(nb(formatCents(4590)), "R$ 45,90");
  assert.equal(nb(formatCents(0)), "R$ 0,00");
  assert.equal(nb(formatCents(4500)), "R$ 45,00");
  // 3 canecas de 45,90: o caso que saía como R$ 137.70000000000002
  assert.equal(nb(formatCents(13770)), "R$ 137,70");
});
