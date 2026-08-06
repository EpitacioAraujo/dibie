/** node scripts/check-art-path.ts — confere a leitura de pasta/arquivo da carga. */
import assert from "node:assert/strict";
import { artPath } from "../app/lib/artPath.ts";

assert.deepEqual(artPath("artes/canecas/Café da manhã.png"), {
  cat: "canecas",
  name: "Café da manhã",
});
// Subpasta mais funda: vale a pasta imediata, não a raiz escolhida.
assert.deepEqual(artPath("artes/2026/natal/Rena.jpeg").cat, "natal");
// Ponto no nome do produto: só a extensão sai.
assert.deepEqual(artPath("frases/Bom dia. Boa sorte.png").name, "Bom dia. Boa sorte");
// Arquivo solto: sem categoria (o backend rejeita, e a tela mostra o erro).
assert.deepEqual(artPath("Solta.png"), { cat: "", name: "Solta" });

console.log("✓ artPath");
