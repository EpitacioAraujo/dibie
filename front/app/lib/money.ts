/**
 * Dinheiro trafega em centavos inteiros — banco, API, carrinho, tudo. Reais só
 * existem aqui, na string que vai para a tela: é o que garante que nenhuma conta
 * de preço passe por ponto flutuante.
 */
export const formatCents = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
