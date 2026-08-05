import { useCallback, useEffect, useImperativeHandle, useRef, type Ref } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
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
  /** Câmera, em graus: giro ao redor da caneca e altura do ponto de vista. */
  azimuth: number;
  elevation: number;
};

export type MugStageHandle = {
  /** Renderiza e devolve o frame atual como data URI PNG. */
  capture: (size?: number) => string;
};




/** Redesenha a estampa: fundo na cor da caneca + arte na área de impressão. */
function paintWrap(canvas: HTMLCanvasElement, art: HTMLImageElement | null, s: MugSettings) {
  // 1 px quadrado no mundo: a arte não distorce ao enrolar.
  const pxPerCm = WRAP_W / s.circumference;
  const wrapH = Math.max(1, Math.round(s.height * pxPerCm));
  if (canvas.height !== wrapH) canvas.height = wrapH;

  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = s.mugColor;
  ctx.fillRect(0, 0, WRAP_W, wrapH);

  if (art) {
    // A arte cabe dentro da área de impressão preservando a proporção dela.
    const boxW = s.artWidth * pxPerCm;
    const boxH = s.artHeight * pxPerCm;
    const fit = Math.min(boxW / art.width, boxH / art.height);
    const width = art.width * fit;
    const height = art.height * fit;

    ctx.save();
    ctx.translate(WRAP_W / 2 + s.offsetX * pxPerCm, wrapH / 2 - s.offsetY * pxPerCm);
    ctx.rotate((s.rotation * Math.PI) / 180);
    ctx.drawImage(art, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  // Cantos chapados por último: a arte nunca pode invadi-los (ver HANDLE_UV).
  ctx.fillStyle = s.handleColor;
  ctx.fillRect(0, wrapH - PATCH, PATCH, PATCH);
  ctx.fillStyle = s.mugColor;
  ctx.fillRect(WRAP_W - PATCH, wrapH - PATCH, PATCH, PATCH);
}

export function MugStage({
  settings,
  ref,
  onError,
}: {
  settings: MugSettings;
  /** Só o editor precisa: no site o cliente apenas gira a caneca. */
  ref?: Ref<MugStageHandle>;
  onError: (message: string) => void;
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
    /** Medidas do .glb como veio, em cm — base para escalar às do usuário. */
    nominal: { circumference: number; height: number };
  } | null>(null);
  const artRef = useRef<HTMLImageElement | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  /** Redesenha a estampa e reajusta as medidas. Estável: lê tudo de refs. */
  const repaint = useCallback(() => {
    const s = sceneRef.current;
    if (!s) return;
    const settings = settingsRef.current;

    paintWrap(s.wrap, artRef.current, settings);
    s.texture.needsUpdate = true;

    if (s.model) {
      const radial = settings.circumference / s.nominal.circumference;
      s.model.scale.set(radial, settings.height / s.nominal.height, radial);
      s.controls.target.set(0, settings.height / 2, 0);
      s.controls.minDistance = settings.height;
      s.controls.maxDistance = settings.height * 6;
      s.controls.update();
    }
  }, []);

  /** Põe a câmera num dos ângulos, a uma distância que enquadra a caneca. */
  const placeCamera = (
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    s: MugSettings,
  ) => {
    const extent = Math.max(s.height, s.circumference / Math.PI) * FRAMING;
    const distance = extent / 2 / Math.tan((camera.fov * Math.PI) / 360);
    controls.target.set(0, s.height / 2, 0);
    camera.position
      .copy(controls.target)
      .addScaledVector(viewDirection(s.azimuth, s.elevation), distance);
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
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f3ef); // --color-bg

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 500);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    placeCamera(camera, controls, settingsRef.current);

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
    wrap.width = WRAP_W;
    const texture = new THREE.CanvasTexture(wrap);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const state = {
      renderer,
      scene,
      camera,
      controls,
      wrap,
      texture,
      model: null as THREE.Object3D | null,
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
        scene.add(state.model);
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
    const loop = () => {
      frame = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
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

  // Ângulos e medidas movem a câmera. Arrastar com o mouse continua livre — os
  // sliders só reposicionam quando você mexe neles.
  useEffect(() => {
    const s = sceneRef.current;
    if (s) placeCamera(s.camera, s.controls, settingsRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.azimuth, settings.elevation, settings.height, settings.circumference]);

  useImperativeHandle(ref, () => ({
    capture(size = 1024) {
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

  return <div ref={mountRef} className="h-full w-full" />;
}
