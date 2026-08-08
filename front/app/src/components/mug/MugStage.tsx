import { useCallback, useEffect, useImperativeHandle, useRef, type Ref } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  FIXED_VIEW,
  FRAMING,
  normalizeMugPose,
  PATCH,
  reprojectMugUV,
  viewDirection,
  WRAP_W,
  type MugView,
} from "./mug-geometry";

export type { MugView };

/** Tudo em centímetros. Corresponde às medidas nominais do mug.glb. */
export const MUG_DEFAULTS = {
  circumference: 26.5,
  height: 9.5,
  artWidth: 21,
  artHeight: 9.3,
};

export type MugSettings = {
  artUrl: string | null;
  mugColor: string;
  handleColor: string;
  /** Circunferência externa da caneca, em cm. */
  circumference: number;
  /** Altura da caneca, em cm. */
  height: number;
  /** Área de impressão em cm — a arte entra dentro dela sem distorcer. */
  artWidth: number;
  artHeight: number;
  /** Deslocamento da arte a partir do centro, em cm. */
  offsetX: number;
  offsetY: number;
  rotation: number;
  /** Giro da caneca nos eixos da tela, em graus (0 a 360). A câmera fica parada. */
  rotateX: number;
  rotateY: number;
  /** Aproximação da câmera em %, onde 100 é o enquadramento padrão. */
  zoom: number;
};

/** Limites do zoom, em %. O backend valida a mesma faixa. */
export const ZOOM = { min: 50, max: 300 };

export type MugStageHandle = {
  /** Renderiza e devolve o frame atual como data URI PNG quadrado. */
  capture: (size?: number) => string;
};




// Mockup gravado antes dos eixos x/y/zoom não traz esses campos, e NaN na
// rotação some com a caneca. O padrão aqui é o mesmo do editor.
const deg = (graus: number | undefined) => THREE.MathUtils.degToRad(graus ?? 0);
const pct = (zoom: number | undefined) => (zoom || 100) / 100;

/** Redesenha a estampa: fundo na cor da caneca + arte na área de impressão. */
function paintWrap(canvas: HTMLCanvasElement, art: HTMLImageElement | null, s: MugSettings) {
  // A largura vem do canvas, não de WRAP_W: em GPU que não chega a 4096 ela é
  // reduzida no mount, e todo o resto tem que acompanhar.
  const wrapW = canvas.width;
  // 1 px quadrado no mundo: a arte não distorce ao enrolar.
  const pxPerCm = wrapW / s.circumference;
  const wrapH = Math.max(1, Math.round(s.height * pxPerCm));
  if (canvas.height !== wrapH) canvas.height = wrapH;

  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // Vale para o drawImage da arte: sem isto o navegador reamostra no vizinho
  // mais próximo e serrilha traço fino e texto pequeno.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = s.mugColor;
  ctx.fillRect(0, 0, wrapW, wrapH);

  if (art) {
    // A arte cabe dentro da área de impressão preservando a proporção dela.
    const boxW = s.artWidth * pxPerCm;
    const boxH = s.artHeight * pxPerCm;
    const fit = Math.min(boxW / art.width, boxH / art.height);
    const width = art.width * fit;
    const height = art.height * fit;

    ctx.save();
    ctx.translate(wrapW / 2 + s.offsetX * pxPerCm, wrapH / 2 - s.offsetY * pxPerCm);
    ctx.rotate((s.rotation * Math.PI) / 180);
    ctx.drawImage(art, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  // Cantos chapados por último: a arte nunca pode invadi-los (ver HANDLE_UV).
  ctx.fillStyle = s.handleColor;
  ctx.fillRect(0, wrapH - PATCH, PATCH, PATCH);
  ctx.fillStyle = s.mugColor;
  ctx.fillRect(wrapW - PATCH, wrapH - PATCH, PATCH, PATCH);
}

export function MugStage({
  settings,
  ref,
  onError,
  onChange,
  spin,
}: {
  settings: MugSettings;
  /** Só o editor precisa: no site o cliente apenas gira a caneca. */
  ref?: Ref<MugStageHandle>;
  onError: (message: string) => void;
  /**
   * Só o editor passa isto: a câmera fica parada, arrastar gira o objeto e a
   * roda dá zoom — tudo devolvido aqui para os inputs numéricos acompanharem.
   * Sem isto (site público) o mouse orbita a câmera, como sempre foi.
   */
  onChange?: (patch: Partial<Pick<MugSettings, "rotateX" | "rotateY" | "zoom">>) => void;
  /**
   * Giro contínuo em torno do eixo, tocado dentro do loop de render — o
   * settings.rotateY é ignorado enquanto isto estiver ligado. onHandleFront
   * avisa a cada meia volta, quando a alça (e a emenda da estampa) passa pela
   * frente: é a única janela em que dá para trocar a arte sem ninguém ver.
   */
  spin?: { periodMs: number; onHandleFront?: () => void };
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  // Guarda o que os efeitos de settings precisam mexer sem recriar a cena.
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    wrap: HTMLCanvasElement;
    texture: THREE.CanvasTexture;
    model: THREE.Object3D | null;
    /** Nó que recebe o giro do usuário, com origem no centro da caneca. */
    spin: THREE.Object3D | null;
    /** Medidas do .glb como veio, em cm — base para escalar às do usuário. */
    nominal: { circumference: number; height: number };
  } | null>(null);
  const artRef = useRef<HTMLImageElement | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const spinRef = useRef(spin);
  spinRef.current = spin;
  /** Ângulo do giro contínuo, em radianos. null = sem giro (usa o settings). */
  const spinYRef = useRef<number | null>(null);

  /** Redesenha a estampa e reajusta as medidas. Estável: lê tudo de refs. */
  const repaint = useCallback(() => {
    const s = sceneRef.current;
    if (!s) return;
    const settings = settingsRef.current;

    paintWrap(s.wrap, artRef.current, settings);
    s.texture.needsUpdate = true;

    if (s.model && s.spin) {
      const radial = settings.circumference / s.nominal.circumference;
      s.model.scale.set(radial, settings.height / s.nominal.height, radial);
      // A caneca gira em torno do próprio centro, não da base: o nó de giro
      // fica na meia altura e o modelo desce a mesma medida dentro dele.
      s.model.position.y = -settings.height / 2;
      s.spin.position.y = settings.height / 2;
      s.spin.rotation.set(
        deg(settings.rotateX),
        spinYRef.current ?? deg(settings.rotateY),
        0,
      );
      s.controls.target.set(0, settings.height / 2, 0);
      s.controls.update();
    }
  }, []);

  /** Põe a câmera parada de frente, à distância que o zoom pede. */
  const placeCamera = (
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    dims: { height: number; circumference: number; zoom: number },
  ) => {
    const extent = Math.max(dims.height, dims.circumference / Math.PI) * FRAMING;
    // Distância do enquadramento padrão (zoom 100%); o zoom é o divisor dela.
    const framed = extent / 2 / Math.tan((camera.fov * Math.PI) / 360);
    // Os limites da órbita são a própria faixa de zoom: assim o update() do
    // OrbitControls nunca puxa a câmera de volta de onde o zoom a colocou.
    controls.minDistance = framed / (ZOOM.max / 100);
    controls.maxDistance = framed / (ZOOM.min / 100);
    controls.target.set(0, dims.height / 2, 0);
    camera.position
      .copy(controls.target)
      .addScaledVector(
        viewDirection(FIXED_VIEW.azimuth, FIXED_VIEW.elevation),
        framed / pct(dims.zoom),
      );
    controls.update();
  };

  // Monta a cena uma vez. settings entram pelo repaint abaixo.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true, // necessário para o toDataURL do capture()
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // O tamanho na tela é do CSS, nunca do buffer: os setSize() abaixo passam
    // updateStyle=false para o capture() poder renderizar em 2048 sem mexer no
    // layout — sem isto o canvas ocuparia buffer/1 px e, em tela com dpr 2 ou 3,
    // sairia duas a três vezes maior que a caixa, cortado e fora de centro.
    Object.assign(renderer.domElement.style, {
      display: "block",
      width: "100%",
      height: "100%",
    });
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f3ef); // --color-bg

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 500);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    placeCamera(camera, controls, settingsRef.current);

    // No editor a câmera é fixa: o arrasto gira o objeto e a roda dá zoom —
    // os dois entram pelo estado, para os inputs mostrarem sempre o que se vê.
    let onDown: ((e: PointerEvent) => void) | null = null;
    let onMove: ((e: PointerEvent) => void) | null = null;
    let onUp: ((e: PointerEvent) => void) | null = null;
    let onWheel: ((e: WheelEvent) => void) | null = null;
    if (onChangeRef.current) {
      controls.enableRotate = false;
      controls.enableZoom = false;
      const DEG_PER_PX = 0.5;
      const WHEEL_STEP = 1.1; // ~10% por clique da roda
      const wrap360 = (v: number) => ((v % 360) + 360) % 360;
      let last: { x: number; y: number } | null = null;

      onDown = (e) => {
        last = { x: e.clientX, y: e.clientY };
        renderer.domElement.setPointerCapture(e.pointerId);
      };
      onMove = (e) => {
        if (!last) return;
        const dx = e.clientX - last.x;
        const dy = e.clientY - last.y;
        last = { x: e.clientX, y: e.clientY };
        const s = settingsRef.current;
        // A face de frente acompanha o mouse: arrastar para a direita gira em
        // anti-horário visto de cima (+y), e para cima afasta o topo da câmera
        // (-x). Como os eixos do mundo são os da tela, é só somar o arrasto.
        onChangeRef.current?.({
          rotateX: Math.round(wrap360(s.rotateX + dy * DEG_PER_PX)),
          rotateY: Math.round(wrap360(s.rotateY + dx * DEG_PER_PX)),
        });
      };
      onUp = () => (last = null);
      onWheel = (e) => {
        e.preventDefault();
        const zoom = settingsRef.current.zoom * (e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP);
        onChangeRef.current?.({
          zoom: Math.round(THREE.MathUtils.clamp(zoom, ZOOM.min, ZOOM.max)),
        });
      };

      renderer.domElement.addEventListener("pointerdown", onDown);
      renderer.domElement.addEventListener("pointermove", onMove);
      renderer.domElement.addEventListener("pointerup", onUp);
      renderer.domElement.addEventListener("pointercancel", onUp);
      renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    }

    // Luz de estúdio simples: ambiente + key + fill + rim.
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9b2a8, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(-8, 14, 12);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.9);
    fill.position.set(10, 6, 8);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 1.2);
    rim.position.set(2, 8, -14);
    scene.add(rim);

    const wrap = document.createElement("canvas");
    // Textura maior que o limite da GPU não sobe, e a caneca sairia sem estampa.
    wrap.width = Math.min(WRAP_W, renderer.capabilities.maxTextureSize);
    const texture = new THREE.CanvasTexture(wrap);
    texture.colorSpace = THREE.SRGBColorSpace;
    // A UV da emenda passa de 1 para fechar a volta: sem repetir, o clamp
    // esticaria o último texel ali (ver healSeam).
    texture.wrapS = THREE.RepeatWrapping;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const state = {
      renderer,
      scene,
      camera,
      controls,
      wrap,
      texture,
      model: null as THREE.Object3D | null,
      spin: null as THREE.Object3D | null,
      nominal: {
        circumference: MUG_DEFAULTS.circumference,
        height: MUG_DEFAULTS.height,
      },
    };
    sceneRef.current = state;

    new GLTFLoader().load(
      "/models/mug.glb",
      (gltf) => {
        const measures = reprojectMugUV(gltf.scene);
        state.nominal = measures;
        state.model = normalizeMugPose(gltf.scene, measures);
        // normalizeMugPose deixa a alça em +X, ou seja, a arte em -X. Mais 90°
        // põem a arte de frente para a câmera, que agora olha de +Z.
        state.model.rotation.y += Math.PI / 2;
        state.spin = new THREE.Group();
        state.spin.add(state.model);

        // Toda malha usa a mesma textura: as cores da caneca e da alça são
        // pintadas no canvas, então os materiais ficam neutros.
        gltf.scene.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return;
          for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) {
            const standard = mat as THREE.MeshStandardMaterial;
            standard.color.set(0xffffff);
            standard.map = texture;
            standard.roughness = Math.min(standard.roughness ?? 0.3, 0.35);
            standard.needsUpdate = true;
          }
        });

        repaint();
        scene.add(state.spin);
      },
      undefined,
      () => onError("Não foi possível carregar /models/mug.glb."),
    );

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let frame = 0;
    // Fase da volta atual (0 a 1). Meia volta = alça de frente.
    let phase = 0;
    let previous = performance.now();
    const loop = () => {
      frame = requestAnimationFrame(loop);

      const now = performance.now();
      // Aba em segundo plano não recebe rAF: sem o teto, o primeiro frame na
      // volta pularia a meia volta inteira (e a troca de arte apareceria).
      const elapsed = Math.min(now - previous, 100);
      previous = now;

      const turning = spinRef.current;
      if (turning && state.spin) {
        const before = phase;
        phase = (phase + elapsed / turning.periodMs) % 1;
        spinYRef.current = phase * Math.PI * 2;
        state.spin.rotation.y = spinYRef.current;
        if (before < 0.5 && phase >= 0.5) turning.onHandleFront?.();
      }

      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      if (onDown) renderer.domElement.removeEventListener("pointerdown", onDown);
      if (onMove) renderer.domElement.removeEventListener("pointermove", onMove);
      if (onUp) {
        renderer.domElement.removeEventListener("pointerup", onUp);
        renderer.domElement.removeEventListener("pointercancel", onUp);
      }
      if (onWheel) renderer.domElement.removeEventListener("wheel", onWheel);
      controls.dispose();
      state.texture.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  }, [onError, repaint]);

  // Arte: carrega a imagem uma vez e guarda para o repaint desenhar.
  useEffect(() => {
    if (!settings.artUrl) {
      artRef.current = null;
      repaint();
      return;
    }

    let cancelled = false;
    const img = new Image();
    // Sem isto o canvas fica tainted ao desenhar arte de outra origem e o WebGL
    // recusa a textura — a caneca renderiza branca. A rota /api/.../art manda os
    // cabeçalhos; em blob: (o editor) o atributo é ignorado.
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      artRef.current = img;
      repaint();
    };
    img.onerror = () => onError("Não foi possível ler a arte enviada.");
    img.src = settings.artUrl;

    return () => {
      cancelled = true;
    };
  }, [settings.artUrl, repaint, onError]);

  // Qualquer mudança de medida, cor ou posição só precisa redesenhar a estampa.
  useEffect(repaint, [settings, repaint]);

  // Mudou de tamanho ou de zoom: reposiciona a câmera parada.
  useEffect(() => {
    const s = sceneRef.current;
    if (s) placeCamera(s.camera, s.controls, settingsRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.height, settings.circumference, settings.zoom]);

  useImperativeHandle(ref, () => ({
    // 2048: é o print que vai para o catálogo e alimenta a IA — mais pixels
    // aqui é o que segura o texto da estampa legível.
    capture(size = 2048) {
      const s = sceneRef.current;
      if (!s) return "";
      // Renderiza quadrado em alta resolução, depois devolve ao tamanho do canvas.
      const previous = new THREE.Vector2();
      s.renderer.getSize(previous);
      s.renderer.setPixelRatio(1);
      s.renderer.setSize(size, size, false);
      s.camera.aspect = 1;
      s.camera.updateProjectionMatrix();
      s.renderer.render(s.scene, s.camera);
      const dataUrl = s.renderer.domElement.toDataURL("image/png");
      s.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      s.renderer.setSize(previous.x, previous.y, false);
      s.camera.aspect = previous.x / previous.y;
      s.camera.updateProjectionMatrix();
      return dataUrl;
    },
  }));

  return (
    <div
      ref={mountRef}
      className={`h-full w-full ${onChange ? "cursor-grab active:cursor-grabbing" : ""}`}
    />
  );
}
