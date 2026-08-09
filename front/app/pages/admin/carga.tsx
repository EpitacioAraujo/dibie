import { useCallback, useRef, useState } from "react";
import { useAdminProducts } from "../../hooks/useAdminProducts";
import { artPath } from "../../lib/artPath";
import { CurrencyInput } from "../../src/components/ui/CurrencyInput";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  EyeIcon,
  RetryIcon,
  TrashIcon,
} from "../../src/components/ui/icons";
import { svgToPng } from "../../lib/svgToPng";
import { mockupErrorMessage } from "../../hooks/useMockupRender";
import {
  MUG_DEFAULTS,
  MugStage,
  type MugSettings,
  type MugStageHandle,
} from "../../src/components/mug/MugStage";

/**
 * Carga em massa: uma pasta de artes vira um produto por arquivo.
 *
 *   pasta   -> categoria (dá para sobrescrever para a carga inteira)
 *   arquivo -> nome do produto (sem extensão) e estampa da caneca
 *   preço   -> igual para todos, editável na tela
 *
 * Cada produto sai com um print da caneca 3D por ângulo configurado. Roda no
 * navegador porque o print é WebGL: é a mesma cena do editor de mockups, sem
 * headless browser nem three.js em Node. Para subir em produção, basta abrir
 * esta tela logado no admin de produção e escolher a pasta.
 */
const SHOTS = [
  { rotateX: 340, rotateY: 70 },
  { rotateX: 340, rotateY: 0 },
  { rotateX: 340, rotateY: 290 },
];

const PRICE = 4000; // centavos

const MAX_SHOTS = 4; // mesmo teto de imagens por produto do ProductController

// ponytail: 1400px em vez dos 2048 do editor — os PNGs de um produto vão num
// POST só e precisam caber no post_max_size=20M do backend. Sobe se a estampa
// sair borrada no catálogo.
const CAPTURE = 1400;

const BASE: MugSettings = {
  artUrl: null,
  mugColor: "#ffffff",
  handleColor: "#ffffff",
  ...MUG_DEFAULTS,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  ...SHOTS[0],
  zoom: 100,
};

type Row = { cat: string; name: string; file: File; status: string };

const INPUT = "rounded-md border border-ink-10 bg-bg px-2 py-1.5 text-body text-ink";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-body text-ink-40">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

/** Seta ao lado da cena: anda na fila para conferir o pack antes de subir. */
function Step({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="cursor-pointer rounded-md border border-ink-10 p-2 text-ink-40 hover:bg-ink-5 hover:text-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** Ângulo de giro em graus, na mesma faixa 0-360 que o backend valida. */
function Angle({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      max={360}
      step={5}
      value={value}
      disabled={disabled}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (v >= 0 && v <= 360) onChange(v);
      }}
      className={INPUT + " w-20"}
    />
  );
}

/** Espera a cena redesenhar: o repaint é um efeito, e o render um rAF. */
const settle = () =>
  new Promise<void>((done) =>
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 80))),
  );

async function toFile(dataUrl: string, name: string) {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: "image/png" });
}

export default function AdminCarga() {
  const stage = useRef<MugStageHandle>(null);
  const [settings, setSettings] = useState<MugSettings>(BASE);
  const [rows, setRows] = useState<Row[]>([]);
  // Vazio = cada produto fica na categoria da pasta em que a arte está.
  const [cat, setCat] = useState("");
  const [price, setPrice] = useState(PRICE);
  const [shots, setShots] = useState(SHOTS);
  // Linha cuja arte está na cena (o olho); null = caneca vazia.
  const [seen, setSeen] = useState<number | null>(null);
  // Qual print a prévia está mostrando. Não muda o que é enviado.
  const [angle, setAngle] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { create } = useAdminProducts();

  const onStageError = useCallback((message: string) => setError(message), []);

  function pick(files: FileList | null) {
    setRows(
      [...(files ?? [])]
        .filter((f) => f.type.startsWith("image/") || /\.svg$/i.test(f.name))
        .map((file) => ({
          ...artPath(file.webkitRelativePath || file.name),
          file,
          status: "na fila",
        })),
    );
    setError(null);
  }

  const setShot = (i: number, patch: Partial<(typeof SHOTS)[number]>) =>
    setShots((s) => s.map((shot, idx) => (idx === i ? { ...shot, ...patch } : shot)));

  const mark = (i: number, status: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, status } : row)));

  /** Tira a arte da cena e solta o object URL dela. */
  function clearStage() {
    setSeen(null);
    setSettings((s) => {
      if (s.artUrl) URL.revokeObjectURL(s.artUrl);
      return BASE;
    });
  }

  /** Deixa a arte pronta para a cena: SVG vira PNG e a imagem já entra no cache. */
  async function load(file: File) {
    // SVG não sobe (o backend recusa) e o canvas rasteriza igual.
    const art = await svgToPng(file);
    const url = URL.createObjectURL(art);
    // Decodifica antes de entregar à cena: o <img> do MugStage acha no cache e
    // o settle() não precisa esperar rede.
    const probe = new Image();
    probe.src = url;
    await probe.decode();
    return { art, url };
  }

  /** Mostra a arte da linha na cena. Não envia nada. */
  async function preview(i: number) {
    if (running || !rows[i]) return;
    setError(null);
    try {
      const { url } = await load(rows[i].file);
      // O object URL anterior morre aqui: só a arte em cena precisa existir.
      setSettings((s) => {
        if (s.artUrl) URL.revokeObjectURL(s.artUrl);
        return { ...BASE, artUrl: url };
      });
      setSeen(i);
    } catch (e) {
      setError(mockupErrorMessage(e));
    }
  }

  /** Anda na fila a partir do que está em cena — para conferir o pack inteiro. */
  const step = (delta: number) =>
    preview(((seen ?? 0) + delta + rows.length) % Math.max(rows.length, 1));

  /** Tira a arte da fila (só daqui; nada é apagado no servidor). */
  function drop(i: number) {
    if (running) return;
    if (seen === i) clearStage();
    else if (seen !== null && i < seen) setSeen(seen - 1);
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  /** Renderiza os prints de uma linha e cadastra o produto. */
  async function upload(i: number, row: Row) {
    let url: string | null = null;
    try {
      mark(i, "renderizando…");
      const loaded = await load(row.file);
      url = loaded.url;

      const prints: string[] = [];
      for (const angle of shots) {
        setSettings({ ...BASE, ...angle, artUrl: url });
        await settle();
        const dataUrl = stage.current?.capture(CAPTURE);
        if (!dataUrl) throw new Error("A cena 3D não está pronta.");
        prints.push(dataUrl);
      }

      mark(i, "enviando…");
      const fd = new FormData();
      for (const [n, print] of prints.entries()) {
        fd.append("images[]", await toFile(print, `${row.name}-${n + 1}.png`));
      }
      // A caneca 3D do cliente abre no primeiro ângulo da lista.
      const { artUrl: _, ...scene } = { ...BASE, ...shots[0] };
      fd.append("art", loaded.art);
      fd.append("mockup", JSON.stringify(scene));
      fd.append("name", row.name);
      fd.append("price_cents", String(price));
      fd.append("cat", cat.trim() || row.cat);
      fd.append("active", "1");

      const created = await create.mutateAsync(fd);
      mark(i, `ok — ${created.slug}`);
    } catch (e) {
      mark(i, `falhou — ${mockupErrorMessage(e)}`);
    } finally {
      if (url) URL.revokeObjectURL(url);
      setSettings(BASE);
      setSeen(null);
    }
  }

  /** Sobe a fila inteira, pulando o que já entrou. */
  async function run() {
    setRunning(true);
    setError(null);
    clearStage();

    for (const [i, row] of rows.entries()) {
      if (!row.status.startsWith("ok")) await upload(i, row);
    }

    setRunning(false);
  }

  /** Uma linha só — para quem falhou, ou para refazer com outros ângulos. */
  async function retry(i: number) {
    if (running) return;
    setRunning(true);
    clearStage();
    await upload(i, rows[i]);
    setRunning(false);
  }

  const done = rows.filter((r) => r.status.startsWith("ok")).length;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h6">Carga</h1>

      {error && (
        <p className="rounded-md bg-wine/10 px-4 py-2 text-body text-wine">{error}</p>
      )}

      {/* Formulário fixo à direita; a cena e a fila ficam na coluna larga. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="flex flex-col gap-4">
          {/* A cena precisa estar no layout (o WebGL não renderiza em
              display:none). Parada, mostra a arte do olho no ângulo do print 1;
              durante a carga, o produto que está sendo fotografado. O print sai
              do buffer, não da tela. */}
          <div className="flex items-center gap-2">
            <Step
              label="Arte anterior"
              disabled={running || rows.length < 2}
              onClick={() => step(-1)}
            >
              <ArrowLeftIcon />
            </Step>
            {/* A cena precisa estar no layout (o WebGL não renderiza em
                display:none). Sem mouse de propósito: orbitar a câmera aqui
                sairia nos prints, que têm que valer os ângulos do formulário. */}
            <div className="pointer-events-none h-72 flex-1 rounded-md border border-ink-10">
              <MugStage
                settings={
                  running
                    ? settings
                    : { ...BASE, ...(shots[angle] ?? shots[0]), artUrl: settings.artUrl }
                }
                ref={stage}
                onError={onStageError}
              />
            </div>
            <Step
              label="Próxima arte"
              disabled={running || rows.length < 2}
              onClick={() => step(1)}
            >
              <ArrowRightIcon />
            </Step>
          </div>

          {/* Um botão por print configurado, na ordem do formulário. */}
          <div className="flex justify-center gap-2">
            {shots.map((_, i) => (
              <button
                key={i}
                type="button"
                disabled={running}
                onClick={() => setAngle(i)}
                aria-pressed={angle === i}
                title={`Ver o ângulo do print ${i + 1}`}
                className={`h-7 w-7 cursor-pointer rounded-md border border-ink-10 text-body disabled:opacity-40 ${
                  angle === i ? "bg-ink text-bg" : "text-ink-40 hover:bg-ink-5"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <p className="text-center text-body text-ink-40">
            {seen === null ? "nenhuma arte em cena" : rows[seen]?.name}
          </p>

          <div className="flex items-center gap-3">
            <label className="cursor-pointer rounded-md border border-dashed border-ink-10 px-4 py-2 text-body text-ink-40 hover:bg-ink-5">
              escolher pasta
              <input
                type="file"
                multiple
                // Só o Chrome/Edge/Safari têm; é o suficiente para uma carga manual.
                // @ts-expect-error atributo não tipado no React
                webkitdirectory=""
                className="hidden"
                disabled={running}
                onChange={(e) => pick(e.target.files)}
              />
            </label>
            <button
              type="button"
              disabled={running || !rows.length}
              onClick={run}
              className="cursor-pointer rounded-md bg-ink px-4 py-2 text-body text-bg disabled:opacity-40"
            >
              {running ? "subindo…" : `subir ${rows.length} produtos`}
            </button>
            {rows.length > 0 && (
              <p className="text-body text-ink-40">
                {done}/{rows.length} concluídos
              </p>
            )}
          </div>

          <table className="text-body">
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.cat + row.name + i}
                  className={`border-b border-ink-10 ${seen === i ? "bg-ink-5" : ""}`}
                >
                  <td className="w-px py-1 pr-1">
                    <button
                      type="button"
                      disabled={running}
                      onClick={() => preview(i)}
                      aria-label={`Ver ${row.name} na caneca`}
                      title="ver na caneca"
                      className={`cursor-pointer p-1 hover:text-ink disabled:opacity-40 ${
                        seen === i ? "text-ink" : "text-ink-40"
                      }`}
                    >
                      <EyeIcon />
                    </button>
                  </td>
                  <td className="w-px py-1 pr-1">
                    <button
                      type="button"
                      disabled={running}
                      onClick={() => retry(i)}
                      aria-label={`Refazer ${row.name}`}
                      title="refazer só este"
                      className="cursor-pointer p-1 text-ink-40 hover:text-ink disabled:opacity-40"
                    >
                      <RetryIcon />
                    </button>
                  </td>
                  <td className="w-px py-1 pr-3">
                    <button
                      type="button"
                      disabled={running}
                      onClick={() => drop(i)}
                      aria-label={`Tirar ${row.name} da fila`}
                      title="tirar da fila"
                      className="cursor-pointer p-1 text-ink-40 hover:text-wine disabled:opacity-40"
                    >
                      <TrashIcon />
                    </button>
                  </td>
                  <td className="py-1 pr-4 text-ink-40">{cat.trim() || row.cat}</td>
                  <td className="py-1 pr-4">{row.name}</td>
                  <td className="py-1 text-ink-40">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Categoria">
            <input
              type="text"
              value={cat}
              disabled={running}
              placeholder="nome"
              onChange={(e) => setCat(e.target.value)}
              className={INPUT + " w-full"}
            />
          </Field>
          <Field label="Preço">
            <CurrencyInput
              value={price}
              disabled={running}
              onChange={setPrice}
              className={INPUT + " w-full"}
            />
          </Field>

          {shots.map((shot, i) => (
            <Field key={i} label={`Print ${i + 1} (x / y)`}>
              <div className="flex items-center gap-1">
                <Angle
                  value={shot.rotateX}
                  disabled={running}
                  onChange={(v) => setShot(i, { rotateX: v })}
                />
                <Angle
                  value={shot.rotateY}
                  disabled={running}
                  onChange={(v) => setShot(i, { rotateY: v })}
                />
                {shots.length > 1 && (
                  <button
                    type="button"
                    disabled={running}
                    onClick={() => setShots((s) => s.filter((_, idx) => idx !== i))}
                    aria-label={`Remover print ${i + 1}`}
                    className="cursor-pointer px-1 text-ink-40 hover:text-wine"
                  >
                    ×
                  </button>
                )}
              </div>
            </Field>
          ))}
          {shots.length < MAX_SHOTS && (
            <button
              type="button"
              disabled={running}
              onClick={() => setShots((s) => [...s, s[s.length - 1]])}
              className="cursor-pointer rounded-md border border-dashed border-ink-10 px-3 py-2 text-body text-ink-40 hover:bg-ink-5"
            >
              + print
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
