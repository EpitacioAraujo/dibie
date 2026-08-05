/**
 * Confere se um .glb de caneca funciona no editor de mockups:
 *
 *   node scripts/check-mug-glb.ts [caminho.glb]
 *
 * Roda a mesma reprojeção de UV que o MugStage faz no browser e reporta como os
 * vértices foram classificados. Serve para validar um modelo baixado da web
 * antes de trocar public/models/mug.glb por ele.
 */
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  HANDLE_UV,
  INSIDE_UV,
  normalizeMugPose,
  reprojectMugUV,
  VIEW_AZIMUTHS,
  viewDirection,
  type MugView,
} from "../app/src/components/mug/mug-geometry.ts";

const file = process.argv[2] ?? "public/models/mug.glb";
const bytes = readFileSync(file);

const fail = (message: string) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};

new GLTFLoader().parse(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
  (gltf) => {
    const measures = reprojectMugUV(gltf.scene);
    const mug = normalizeMugPose(gltf.scene, measures);
    mug.updateWorldMatrix(true, true);

    console.log(`${file}`);
    console.log(
      `  medidas do modelo: ${measures.circumference.toFixed(2)} de circunferência × ${measures.height.toFixed(2)} de altura (unidades do arquivo)`,
    );

    let art = 0;
    let handle = 0;
    let inside = 0;
    // Ponto da parede que fica no centro da estampa (u≈0.5), já com a pose
    // normalizada: tem que cair em -X, oposto à alça em +X.
    let center: THREE.Vector3 | null = null;
    let bestDelta = Infinity;
    const point = new THREE.Vector3();

    gltf.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const uv = object.geometry.attributes.uv;
      const position = object.geometry.attributes.position;

      // A UV é gravada em Float32Array, então a comparação precisa de folga.
      const near = (a: number, b: number) => Math.abs(a - b) < 1e-5;

      for (let i = 0; i < uv.count; i++) {
        const u = uv.getX(i);
        const v = uv.getY(i);
        if (!near(v, HANDLE_UV[1])) {
          art++;
          const delta = Math.abs(u - 0.5);
          if (delta < bestDelta) {
            bestDelta = delta;
            center = point.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld).clone();
          }
        } else if (near(u, HANDLE_UV[0])) handle++;
        else if (near(u, INSIDE_UV[0])) inside++;
      }
    });

    const total = art + handle + inside;
    console.log(`  vértices: ${art} na estampa, ${handle} na alça, ${inside} no interior/fundo (${total})`);

    if (!art) return fail("nenhum vértice recebeu estampa — modelo não é uma caneca cilíndrica?");
    // A fração varia muito com a densidade da alça; só um valor ínfimo denuncia
    // que a parede não foi reconhecida.
    if (art / total < 0.05) fail(`só ${((art / total) * 100).toFixed(1)}% da malha recebe estampa; a parede externa não foi reconhecida`);
    if (!handle) console.log("  aviso: nenhuma alça detectada — a estampa vai dar a volta inteira");

    if (!center) return fail("não achei o centro da estampa");
    const c = center as THREE.Vector3;
    if (c.x > -measures.circumference / (2 * Math.PI) * 0.8) {
      fail(`centro da estampa em x=${c.x.toFixed(3)}; esperado bem negativo (oposto à alça em +X)`);
    } else {
      console.log(`  centro da estampa em x=${c.x.toFixed(3)}, oposto à alça ✓`);
    }

    const base = new THREE.Box3().setFromObject(mug);
    if (Math.abs(base.min.y) > 1e-3) fail(`base em y=${base.min.y.toFixed(4)}, deveria ser 0`);

    // As vistas assumem a alça em +X. Confere, para cada uma, de que lado da
    // tela ela aparece e a que ângulo — é o que o usuário enxerga no editor.
    const target = new THREE.Vector3(0, measures.height / 2, 0);
    const handleDir = new THREE.Vector3(1, 0, 0); // direção da alça após a pose
    for (const view of Object.keys(VIEW_AZIMUTHS) as MugView[]) {
      const eye = viewDirection(VIEW_AZIMUTHS[view], 22);
      const forward = target.clone().sub(eye).normalize();
      const right = forward.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
      const side = handleDir.dot(right) < 0 ? "esquerda" : "direita";
      // Ângulo entre a alça e a direção da câmera, visto de cima.
      const flat = new THREE.Vector2(eye.x, eye.z).normalize();
      const degrees = Math.round((Math.acos(flat.x) * 180) / Math.PI);
      console.log(`  vista ${view}: alça ${degrees}° à ${side}`);
      if (degrees !== Math.abs(VIEW_AZIMUTHS[view])) {
        fail(`vista ${view} ficou em ${degrees}°, esperado ${Math.abs(VIEW_AZIMUTHS[view])}°`);
      }
      if (VIEW_AZIMUTHS[view] < 0 && side !== "esquerda") {
        fail(`vista ${view}: azimute negativo deveria jogar a alça para a esquerda`);
      }
    }

    if (!process.exitCode) console.log("  ok: serve para o editor");
  },
  (error) => fail(`não é um .glb válido: ${String((error as Error).message ?? error)}`),
);
