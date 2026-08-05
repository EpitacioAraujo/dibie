const TARGET_W = 1600;

/**
 * Rasteriza SVG em PNG no navegador — o backend valida `image` (que não aceita
 * SVG) e não tem GD/Imagick. Outros formatos passam intactos.
 */
export async function svgToPng(file: File): Promise<File> {
  if (file.type !== "image/svg+xml" && !file.name.toLowerCase().endsWith(".svg")) {
    return file;
  }

  const url = URL.createObjectURL(
    new Blob([withSize(await file.text())], { type: "image/svg+xml" }),
  );

  try {
    const img = await load(url);
    const ratio = img.width && img.height ? img.height / img.width : 9 / 16;
    const canvas = document.createElement("canvas");
    canvas.width = TARGET_W;
    canvas.height = Math.round(TARGET_W * ratio);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw new Error("Não foi possível converter o SVG.");

    return new File([blob], file.name.replace(/\.svg$/i, "") + ".png", {
      type: "image/png",
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Sem width/height na raiz, o Firefox rasteriza o SVG em branco. */
function withSize(svg: string) {
  const root = svg.match(/<svg[^>]*>/i)?.[0];
  if (!root || /\swidth=/i.test(root)) return svg;

  const box = root.match(/viewBox=["']\s*[\d.-]+[ ,]+[\d.-]+[ ,]+([\d.]+)[ ,]+([\d.]+)/i);
  const [w, h] = box ? [box[1], box[2]] : ["1600", "900"];

  return svg.replace(root, root.replace(/^<svg/i, `<svg width="${w}" height="${h}"`));
}

function load(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível ler o SVG enviado."));
    img.src = src;
  });
}
