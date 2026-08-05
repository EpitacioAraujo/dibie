import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminProducts } from "../../../hooks/useAdminProducts";
import {
  mockupErrorMessage,
  useMockupRender,
  type MockupQuality,
} from "../../../hooks/useMockupRender";
import { VIEW_AZIMUTHS, type MugView } from "./mug-geometry";
import {
  MUG_DEFAULTS,
  MugStage,
  type MugSettings,
  type MugStageHandle,
} from "./components/MugStage";

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

const DEFAULTS: MugSettings = {
  artUrl: null,
  mugColor: "#ffffff",
  handleColor: "#ffffff",
  ...MUG_DEFAULTS,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  azimuth: VIEW_AZIMUTHS["three-quarter"],
  elevation: 22,
};

export default function AdminMockups() {
  const stage = useRef<MugStageHandle>(null);
  const [settings, setSettings] = useState<MugSettings>(DEFAULTS);
  const [preset, setPreset] = useState(PRESETS[0].scene);
  const [quality, setQuality] = useState<MockupQuality>("medium");
  const [customScene, setCustomScene] = useState("");
  const [shot, setShot] = useState<string | null>(null); // render 3D cru
  const [photo, setPhoto] = useState<string | null>(null); // versão fotorrealista
  const [productId, setProductId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { products, update } = useAdminProducts();
  const render = useMockupRender();

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

  function shoot() {
    const dataUrl = stage.current?.capture();
    if (!dataUrl) return;
    setShot(dataUrl);
    setPhoto(null);
    setSaved(false);
    setError(null);
  }

  async function photorealize() {
    if (!shot) return;
    setError(null);
    try {
      setPhoto(
        await render.mutateAsync({
          image: shot,
          prompt: buildPrompt(customScene.trim() || preset),
          quality,
        }),
      );
      setSaved(false);
    } catch (e) {
      setError(mockupErrorMessage(e));
    }
  }

  /** Salva a imagem escolhida como imagem do produto, pelo upload que já existe. */
  async function saveToProduct(dataUrl: string) {
    const product = products.find((p) => String(p.id) === productId);
    if (!product) return;
    setError(null);
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      // O update valida esses campos como obrigatórios — reenvia sem alterar.
      fd.append("slug", product.slug);
      fd.append("name", product.name);
      fd.append("price", String(product.price));
      fd.append("cat", product.cat);
      fd.append("active", product.active ? "1" : "0");
      fd.append("images[]", new File([blob], "mockup.png", { type: "image/png" }));
      await update.mutateAsync({ id: product.id, body: fd });
      setSaved(true);
    } catch (e) {
      setError(mockupErrorMessage(e));
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-h4">Mockups</h1>
        <p className="text-body text-ink-40">
          suba a arte, escolha o ângulo, fotografe e gere a foto realista
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-wine/10 px-4 py-3 text-body text-wine">{error}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* ---- Controles ---- */}
        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-body text-ink-40">Arte</p>
            <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-ink-10 px-4 py-6 text-body text-ink-40 hover:bg-ink-5">
              {settings.artUrl ? "trocar arte" : "escolher arquivo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) set("artUrl", URL.createObjectURL(file));
                  e.target.value = "";
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
            <p className="mb-2 text-body text-ink-40">
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
            <p className="mb-2 text-body text-ink-40">Área de impressão (cm)</p>
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
            label="Posição ↔"
            min={-settings.circumference / 4}
            max={settings.circumference / 4}
            step={0.1}
            value={settings.offsetX}
            onChange={(v) => set("offsetX", v)}
            unit=" cm"
          />
          <Slider
            label="Posição ↕"
            min={-settings.height / 2}
            max={settings.height / 2}
            step={0.1}
            value={settings.offsetY}
            onChange={(v) => set("offsetY", v)}
            unit=" cm"
          />
          <Slider label="Rotação" min={-180} max={180} step={1} value={settings.rotation} onChange={(v) => set("rotation", v)} unit="°" />

          <div>
            <p className="mb-2 text-body text-ink-40">Ângulo da câmera</p>
            <div className="mb-3 flex gap-2">
              {(["front", "three-quarter", "side"] as MugView[]).map((v, i) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set("azimuth", VIEW_AZIMUTHS[v])}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-body ${
                    settings.azimuth === VIEW_AZIMUTHS[v]
                      ? "border-ink bg-ink text-white"
                      : "border-ink-10 hover:bg-ink-5"
                  }`}
                >
                  {["frente", "3/4", "lateral"][i]}
                </button>
              ))}
            </div>
            <Slider
              label="Giro (alça)"
              min={-180}
              max={-60}
              step={1}
              value={settings.azimuth}
              onChange={(v) => set("azimuth", v)}
              unit="°"
            />
            <Slider
              label="Altura da vista"
              min={0}
              max={70}
              step={1}
              value={settings.elevation}
              onChange={(v) => set("elevation", v)}
              unit="°"
            />
          </div>

          <div>
            <p className="mb-2 text-body text-ink-40">Cenário</p>
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
            <p className="mb-2 text-body text-ink-40">Qualidade da geração</p>
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
        </div>

        {/* ---- Viewport + resultado ---- */}
        <div className="flex flex-col gap-4">
          <div className="aspect-square w-full overflow-hidden rounded-2xl border border-ink-10 bg-bg">
            <MugStage ref={stage} settings={settings} onError={onStageError} />
          </div>

          <button
            type="button"
            onClick={shoot}
            className="cursor-pointer self-start rounded-full bg-ink px-5 py-2 text-body text-white"
          >
            fotografar este ângulo
          </button>

          {shot && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Result title="render 3D" src={shot} onSave={() => saveToProduct(shot)} canSave={!!productId} saving={update.isPending} />
              <div>
                <p className="mb-2 text-body text-ink-40">foto realista (IA)</p>
                {photo ? (
                  <Result title={null} src={photo} onSave={() => saveToProduct(photo)} canSave={!!productId} saving={update.isPending} />
                ) : (
                  <button
                    type="button"
                    onClick={photorealize}
                    disabled={render.isPending}
                    className="flex aspect-square w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-ink-10 text-body text-ink-40 hover:bg-ink-5 disabled:cursor-wait"
                  >
                    {render.isPending ? "gerando… (~20s)" : "fotorrealizar"}
                  </button>
                )}
              </div>
            </div>
          )}

          {shot && (
            <div className="flex items-center gap-3">
              <select
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  setSaved(false);
                }}
                className="cursor-pointer rounded-md border border-ink-10 bg-bg px-3 py-2 text-body"
              >
                <option value="">salvar em qual produto?</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.images.length}/4)
                  </option>
                ))}
              </select>
              {saved && <span className="text-body text-ink-40">salvo ✓</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Result({
  title,
  src,
  onSave,
  canSave,
  saving,
}: {
  title: string | null;
  src: string;
  onSave: () => void;
  canSave: boolean;
  saving: boolean;
}) {
  return (
    <div>
      {title && <p className="mb-2 text-body text-ink-40">{title}</p>}
      <img src={src} alt="" className="aspect-square w-full rounded-lg object-cover" />
      <div className="mt-2 flex gap-3 text-body">
        <a href={src} download="mockup.png" className="cursor-pointer underline">
          baixar
        </a>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave || saving}
          className="cursor-pointer underline disabled:cursor-default disabled:text-ink-40 disabled:no-underline"
        >
          {saving ? "salvando…" : "usar no produto"}
        </button>
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
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
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
        step={0.1}
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
  label: string;
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
        {label}
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
