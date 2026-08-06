/**
 * Lê categoria e nome do produto do caminho de uma arte, como vem do input de
 * pasta: `webkitRelativePath` = "raiz/categoria/arquivo.png".
 */
export function artPath(path: string) {
  const parts = path.split("/").filter(Boolean);
  return {
    // A categoria é a pasta imediata; arquivo solto na raiz fica sem categoria.
    cat: parts.length > 1 ? parts[parts.length - 2] : "",
    name: (parts[parts.length - 1] ?? "").replace(/\.[^.]+$/, ""),
  };
}
