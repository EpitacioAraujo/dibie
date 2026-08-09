import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAdminProducts } from "../../../hooks/useAdminProducts";
import {
  mockupErrorMessage,
  useMockupRender,
  type MockupQuality,
} from "../../../hooks/useMockupRender";
import { move } from "../../../lib/move";
import {
  CameraIcon,
  MoveHorizontalIcon,
  MoveVerticalIcon,
  SparklesIcon,
} from "../../../src/components/ui/icons";
import { CurrencyInput } from "../../../src/components/ui/CurrencyInput";
import { toast } from "../../../src/components/ui/Toast";
import { WRAP_W } from "../../../src/components/mug/mug-geometry";
import { ShotList, type Shot } from "./components/ShotList";
import {
  MUG_DEFAULTS,
  MugStage,
  ZOOM,
  type MugSettings,
  type MugStageHandle,
} from "../../../src/components/mug/MugStage";

// O custo por imagem varia ~30x entre os níveis. Itere no rascunho e só gere
// em "final" a versão que vai para o catálogo.
const QUALITIES: { value: MockupQuality; label: string }[] = [
  { value: "low", label: "rascunho (~US$ 0,01)" },
  { value: "medium", label: "boa (~US$ 0,04)" },
  { value: "high", label: "final (~US$ 0,14)" },
];

const PRESETS = [
  {
    label: "Mesa de madeira, luz de janela",
    scene: "on a rustic wooden table next to an open notebook, soft morning light from a window, shallow depth of field",
  },
  {
    label: "Estúdio, fundo neutro",
    scene: "on a seamless light grey studio backdrop, soft diffused softbox lighting, subtle contact shadow",
  },
  {
    label: "Bancada de mármore",
    scene: "on a white marble countertop, bright kitchen background softly blurred, natural daylight",
  },
];

// A instrução de preservar a estampa é o que segura a arte no lugar. Sem ela o
// Kontext reinterpreta a impressão e texto/logo saem deformados.
const PRESERVE =
  "Keep the mug's printed artwork exactly as it is — do not redraw, restyle, reword or move any part of the design, and keep the mug shape, colour and camera angle identical.";

const buildPrompt = (scene: string) =>
  `Turn this 3D render into a photorealistic product photograph of a ceramic mug ${scene}. ${PRESERVE}`;

const MAX_IMAGES = 4; // mesmo teto do ProductController

const EMPTY_FORM = { name: "", priceCents: 0, cat: "", active: true };

async function toFile(dataUrl: string, i: number) {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], `mockup-${i + 1}.png`, { type: "image/png" });
}

/** Lado maior do PNG gerado a partir de um SVG: o da textura, para não perder traço. */
const RASTER = WRAP_W;

/**
 * Converte SVG em PNG antes de subir. Dois motivos: SVG é XML e, servido do
 * nosso domínio, roda script; e o navegador rasteriza a estampa de qualquer
 * jeito, então nada se perde. Outros formatos passam direto.
 */
async function rasterize(file: File): Promise<File> {
  if (file.type !== "image/svg+xml") return file;

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();

    // Vetor: rasteriza no tamanho da textura, não no tamanho nominal do arquivo.
    const scale = RASTER / Math.max(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((done) =>
      canvas.toBlob(done, "image/png"),
    );
    if (!blob) throw new Error("canvas vazio");

    return new File([blob], file.name.replace(/\.svg$/i, "") + ".png", {
      type: "image/png",
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

const DEFAULTS: MugSettings = {
  artUrl: null,
  mugColor: "#ffffff",
  handleColor: "#ffffff",
  ...MUG_DEFAULTS,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  rotateX: 0,
  rotateY: 45,
  zoom: 100,
};

export default function AdminMockups() {
  const stage = useRef<MugStageHandle>(null);
  const [settings, setSettings] = useState<MugSettings>(DEFAULTS);
  // O arquivo em si, além do object URL: é ele que vai para o servidor e vira a
  // caneca 3D que o cliente gira no site.
  const [artFile, setArtFile] = useState<File | null>(null);
  const [preset, setPreset] = useState(PRESETS[0].scene);
  const [quality, setQuality] = useState<MockupQuality>("medium");
  const [customScene, setCustomScene] = useState("");
  const [shots, setShots] = useState<Shot[]>([]); // renders 3D crus
  const [gens, setGens] = useState<Shot[]>([]); // versões fotorrealistas
  const [source, setSource] = useState(0); // print que alimenta a IA
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [form, setForm] = useState(EMPTY_FORM);
  const [productId, setProductId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { products, create, update } = useAdminProducts();
  const render = useMockupRender();

  const picked = [...shots, ...gens].filter((s) => s.picked);
  const target = products.find((p) => String(p.id) === productId);
  const room = MAX_IMAGES - (mode === "existing" ? (target?.images.length ?? 0) : 0);
  const busy = create.isPending || update.isPending;

  const set = <K extends keyof MugSettings>(key: K, value: MugSettings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  // Revoga o object URL da arte anterior ao trocar/desmontar.
  useEffect(() => {
    const url = settings.artUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [settings.artUrl]);

  const onStageError = useCallback((message: string) => setError(message), []);

  // Mexer na cena é o mesmo que mexer nos inputs: arrasto e roda entram pelo
  // mesmo estado, então os campos mostram sempre o que está na tela.
  const onStageChange = useCallback(
    (patch: Partial<MugSettings>) => setSettings((s) => ({ ...s, ...patch })),
    [],
  );

  function shoot() {
    const dataUrl = stage.current?.capture();
    if (!dataUrl) return;
    setShots((s) => [...s, { url: dataUrl, picked: false }]);
    setSource(shots.length); // o novo print vira a fonte da IA
    setError(null);
  }

  async function photorealize() {
    const from = shots[source];
    if (!from) return;
    setError(null);
    try {
      const image = await render.mutateAsync({
        image: from.url,
        prompt: buildPrompt(customScene.trim() || preset),
        quality,
      });
      setGens((g) => [...g, { url: image, picked: true }]);
    } catch (e) {
      setError(mockupErrorMessage(e));
    }
  }

  /** Remove um item da lista, mantendo o print selecionado apontando para o certo. */
  function removeShot(i: number) {
    setShots((s) => s.filter((_, idx) => idx !== i));
    setSource((cur) => (i < cur ? cur - 1 : cur === i ? 0 : cur));
  }

  const toggle =
    (setList: typeof setShots) => (i: number) =>
      setList((l) => l.map((s, idx) => (idx === i ? { ...s, picked: !s.picked } : s)));

  /** Anexa as imagens marcadas a um produto novo ou existente. */
  async function submit() {
    if (!picked.length && !artFile) return;
    setError(null);
    try {
      const fd = new FormData();
      const files = await Promise.all(picked.map((s, i) => toFile(s.url, i)));
      files.forEach((f) => fd.append("images[]", f));

      // A arte + as medidas viram a caneca 3D do produto. artUrl fica de fora: é
      // um object URL local, sem serventia no servidor.
      if (artFile) {
        const { artUrl: _, ...scene } = settings;
        fd.append("art", artFile);
        fd.append("mockup", JSON.stringify(scene));
      }

      if (mode === "existing") {
        if (!target) return;
        // O update valida esses campos como obrigatórios — reenvia sem alterar.
        // O slug fica de fora: sem ele o backend mantém o código atual.
        fd.append("name", target.name);
        fd.append("price_cents", String(target.price_cents));
        fd.append("cat", target.cat);
        fd.append("active", target.active ? "1" : "0");
        await update.mutateAsync({ id: target.id, body: fd });
        toast(`Imagens adicionadas a ${target.name}`);
        return;
      }

      // Sem slug: o código de 8 caracteres vem do backend.
      fd.append("name", form.name);
      fd.append("price_cents", String(form.priceCents));
      fd.append("cat", form.cat);
      fd.append("active", form.active ? "1" : "0");
      // Sem guardar o id: todo clique é sempre um POST novo, e o formulário fica
      // preenchido para o próximo item da coleção.
      const created = await create.mutateAsync(fd);
      toast(`Produto cadastrado como ${created.slug}`);
    } catch (e) {
      setError(mockupErrorMessage(e));
    }
  }

  function clearAll() {
    setSettings(DEFAULTS);
    setArtFile(null);
    setShots([]);
    setGens([]);
    setSource(0);
    setForm(EMPTY_FORM);
    setProductId("");
    setCustomScene("");
    setError(null);
  }

  return (
    // A tela toda cabe na viewport: 4rem = o p-8 do <main> do layout admin.
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden max-lg:h-auto max-lg:overflow-visible">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <h1 className="text-h6">Mockups</h1>
        <p className="text-body text-ink-40">
          suba a arte, escolha o ângulo, fotografe e gere a foto realista
        </p>
      </div>

      {error && (
        <p className="mb-2 shrink-0 rounded-md bg-wine/10 px-4 py-2 text-body text-wine">
          {error}
        </p>
      )}

      {/* a linha precisa ser 1fr definido: senão ela cresce com o conteúdo e o
          overflow-hidden do container corta em vez das colunas rolarem */}
      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[240px_minmax(0,1fr)_320px] lg:grid-rows-[minmax(0,1fr)]">
        {/* ---- Controles ---- */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <div>
            <p className="mb-1 text-body text-ink-40">Arte</p>
            <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-ink-10 px-3 py-3 text-body text-ink-40 hover:bg-ink-5">
              {settings.artUrl ? "trocar arte" : "escolher arquivo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = ""; // antes do await: o input some do evento depois
                  if (!file) return;
                  try {
                    // O preview usa o mesmo arquivo que vai subir: o que você vê
                    // na caneca é exatamente o que o cliente vai ver.
                    const art = await rasterize(file);
                    set("artUrl", URL.createObjectURL(art));
                    setArtFile(art);
                    setError(null);
                  } catch {
                    setError("Não foi possível ler essa arte. Tente um PNG ou JPG.");
                  }
                }}
              />
            </label>
          </div>

          <div className="flex gap-4">
            <ColorField
              label="Caneca"
              value={settings.mugColor}
              onChange={(v) => set("mugColor", v)}
            />
            <ColorField
              label="Alça"
              value={settings.handleColor}
              onChange={(v) => set("handleColor", v)}
            />
          </div>

          <div>
            <p className="mb-1 text-body text-ink-40">
              Caneca (cm) — ⌀ {(settings.circumference / Math.PI).toFixed(1)}
            </p>
            <div className="flex gap-3">
              <NumberField
                label="circunferência"
                value={settings.circumference}
                min={10}
                max={60}
                onChange={(v) => set("circumference", v)}
              />
              <NumberField
                label="altura"
                value={settings.height}
                min={4}
                max={30}
                onChange={(v) => set("height", v)}
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-body text-ink-40">Área de impressão (cm)</p>
            <div className="flex gap-3">
              <NumberField
                label="largura"
                value={settings.artWidth}
                min={1}
                max={settings.circumference}
                onChange={(v) => set("artWidth", v)}
              />
              <NumberField
                label="altura"
                value={settings.artHeight}
                min={1}
                max={settings.height}
                onChange={(v) => set("artHeight", v)}
              />
            </div>
          </div>

          <Slider
            label={<><MoveHorizontalIcon />Posição</>}
            min={-settings.circumference / 4}
            max={settings.circumference / 4}
            step={0.1}
            value={settings.offsetX}
            onChange={(v) => set("offsetX", v)}
            unit=" cm"
          />
          <Slider
            label={<><MoveVerticalIcon />Posição</>}
            min={-settings.height / 2}
            max={settings.height / 2}
            step={0.1}
            value={settings.offsetY}
            onChange={(v) => set("offsetY", v)}
            unit=" cm"
          />
          <Slider label="Rotação" min={-180} max={180} step={1} value={settings.rotation} onChange={(v) => set("rotation", v)} unit="°" />

          <div>
            <p className="mb-1 text-body text-ink-40">
              Giro (°) e zoom — arraste e role o mouse na caneca
            </p>
            <div className="flex gap-3">
              <NumberField
                label="x"
                value={settings.rotateX}
                min={0}
                max={360}
                step={1}
                onChange={(v) => set("rotateX", Math.round(v))}
              />
              <NumberField
                label="y"
                value={settings.rotateY}
                min={0}
                max={360}
                step={1}
                onChange={(v) => set("rotateY", Math.round(v))}
              />
              <NumberField
                label="zoom %"
                value={settings.zoom}
                min={ZOOM.min}
                max={ZOOM.max}
                step={5}
                onChange={(v) => set("zoom", Math.round(v))}
              />
            </div>
          </div>
        </div>

        {/* ---- Caneca: quadrada (o capture é 1:1), dimensionada pela altura livre ---- */}
        <div className="flex min-h-0 items-center justify-center max-lg:aspect-square">
          <div className="aspect-square h-full max-w-full overflow-hidden rounded-2xl border border-ink-10 bg-bg">
            <MugStage
              ref={stage}
              settings={settings}
              onError={onStageError}
              onChange={onStageChange}
            />
          </div>
        </div>

        {/* ---- Prints, IA e destino ---- */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <ShotList
            label="Prints do 3D"
            items={shots}
            addIcon={<CameraIcon />}
            addTitle="fotografar este ângulo"
            onAdd={shoot}
            onRemove={removeShot}
            onToggle={toggle(setShots)}
            onReorder={(from, to) => {
              setShots((s) => move(s, from, to));
              setSource((cur) => (cur === from ? to : cur));
            }}
            selected={source}
            onSelect={setSource}
          />
          <ShotList
            label={
              render.isPending
                ? "Fotos realistas (IA) — gerando… (~20s)"
                : "Fotos realistas (IA)"
            }
            items={gens}
            addIcon={<SparklesIcon />}
            addTitle="fotorrealizar o print selecionado"
            busy={render.isPending}
            disabled={!shots[source]}
            onAdd={photorealize}
            onRemove={(i) => setGens((g) => g.filter((_, idx) => idx !== i))}
            onToggle={toggle(setGens)}
            onReorder={(from, to) => setGens((g) => move(g, from, to))}
          />

          <div>
            <p className="mb-1 text-body text-ink-40">Cenário</p>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className="w-full cursor-pointer rounded-md border border-ink-10 bg-bg px-3 py-2 text-body"
            >
              {PRESETS.map((p) => (
                <option key={p.scene} value={p.scene}>
                  {p.label}
                </option>
              ))}
            </select>
            <input
              value={customScene}
              onChange={(e) => setCustomScene(e.target.value)}
              placeholder="ou descreva o cenário…"
              className="mt-2 w-full rounded-md border border-ink-10 bg-bg px-3 py-2 text-body"
            />
          </div>

          <div>
            <p className="mb-1 text-body text-ink-40">Qualidade da geração</p>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as MockupQuality)}
              className="w-full cursor-pointer rounded-md border border-ink-10 bg-bg px-3 py-2 text-body"
            >
              {QUALITIES.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>

          {/* ---- Destino das imagens marcadas ---- */}
          <div className="border-t border-ink-10 pt-3">
            <div className="mb-3 flex gap-2">
              {(["new", "existing"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-body ${
                    mode === m
                      ? "border-ink bg-ink text-white"
                      : "border-ink-10 hover:bg-ink-5"
                  }`}
                >
                  {m === "new" ? "cadastrar produto" : "associar a um produto"}
                </button>
              ))}
            </div>

            {mode === "new" ? (
              <div className="flex flex-col gap-2">
                {(["name", "cat"] as const).map((f) => (
                  <label key={f} className="block text-body text-ink-40">
                    {f === "name" ? "nome" : "categoria"}
                    <input
                      value={form[f]}
                      onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                      className="mt-1 w-full rounded-md border border-ink-10 bg-bg px-3 py-1.5 text-ink outline-none"
                    />
                  </label>
                ))}
                <label className="block text-body text-ink-40">
                  preço
                  <CurrencyInput
                    value={form.priceCents}
                    onChange={(v) => setForm({ ...form, priceCents: v })}
                    className="mt-1 w-full rounded-md border border-ink-10 bg-bg px-3 py-1.5 text-ink outline-none"
                  />
                </label>
              </div>
            ) : (
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full cursor-pointer rounded-md border border-ink-10 bg-bg px-3 py-2 text-body"
              >
                <option value="">escolha o produto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.images.length}/{MAX_IMAGES})
                  </option>
                ))}
              </select>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {mode === "new" && (
                <label className="flex items-center gap-2 text-body">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  />
                  ativo
                </label>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={
                  busy ||
                  (!picked.length && !artFile) ||
                  picked.length > room ||
                  (mode === "new" ? !form.name.trim() : !target)
                }
                className="cursor-pointer rounded-full bg-ink px-5 py-2 text-body text-white disabled:cursor-default disabled:opacity-50"
              >
                {busy
                  ? "salvando…"
                  : mode === "new"
                    ? "cadastrar"
                    : "adicionar ao produto"}
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="cursor-pointer rounded-full border border-ink-10 px-5 py-2 text-body hover:bg-ink-5"
              >
                limpar
              </button>
            </div>
            <p className="mt-2 text-body text-ink-40">
              {picked.length > room
                ? `${picked.length} marcadas, cabem ${room}`
                : `${picked.length} imagem(ns) marcada(s)${
                    artFile ? " + caneca 3D" : ""
                  }`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex-1 text-body text-ink-40">
      {label}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-9 w-full cursor-pointer rounded-md border border-ink-10 bg-bg"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 0.1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex-1 text-body text-ink-40">
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (v >= min && v <= max) onChange(v);
        }}
        className="mt-1 w-full rounded-md border border-ink-10 bg-bg px-2 py-1.5 text-ink"
      />
    </label>
  );
}

function Slider({
  label,
  value,
  onChange,
  unit = "",
  ...range
}: {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <label className="block text-body text-ink-40">
      <span className="flex justify-between">
        <span className="flex items-center gap-1">{label}</span>
        <span>
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        {...range}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full cursor-pointer accent-wine"
      />
    </label>
  );
}
