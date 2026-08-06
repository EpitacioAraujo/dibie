import * as THREE from "three";

/**
 * Largura do canvas da estampa. A altura sai da proporção real da caneca.
 * 4096 para uma caneca de 26,5 cm dá ~155 px/cm: a área de impressão fica com
 * ~3200 px, então arte de 2000-3000 px entra sem ser reduzida — reduzir no
 * canvas 2D é o que borrava texto fino no render.
 */
export const WRAP_W = 4096;
// Cantos reservados de cor chapada, para onde a UV manda alça e interior — que
// não podem receber estampa. Ficam na base do canvas, fora da área de arte.
// Proporcional à largura: em px absolutos, o mipmap misturaria a arte neles.
export const PATCH = Math.round(WRAP_W * 0.012);
export const HANDLE_UV = [PATCH / 2 / WRAP_W, 0.002];
export const INSIDE_UV = [1 - PATCH / 2 / WRAP_W, 0.002];

/**
 * Reprojeta a UV do modelo para enrolar a estampa na parede externa.
 *
 * Vale para qualquer .glb de caneca, inclusive os baixados da web, que quase
 * sempre vêm com corpo e alça na mesma malha e com uma UV de unwrap inútil
 * aqui. Em vez de exigir malhas separadas, cada vértice é classificado pela
 * geometria: quem está fora do raio do corpo é alça, quem tem a normal virada
 * para dentro é o interior — os dois recebem UV nos cantos de cor sólida do
 * canvas. O resto é a parede, que ganha u ao redor e v na altura.
 *
 * Devolve as medidas nominais do modelo, para o editor escalá-lo aos cm reais.
 */
export function reprojectMugUV(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true);

  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) meshes.push(o);
  });

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  // O corpo é redondo, então o eixo horizontal mais estreito dá o diâmetro; o
  // mais largo é o que a alça estica.
  const radius = Math.min(size.x, size.z) / 2 || 1;
  const height = size.y || 1;

  // A alça estica o bbox para um dos quatro lados, então o corpo encosta no
  // lado oposto. Testa as quatro hipóteses e fica com a que mais vértices
  // alinha na casca do cilindro — contar quem cai *dentro* não serve, porque
  // um eixo centrado na própria alça também engloba muita coisa.
  const middle = box.getCenter(new THREE.Vector3());
  const candidates = [
    { x: box.min.x + radius, z: middle.z, handleAngle: Math.PI / 2 }, // alça em +X
    { x: box.max.x - radius, z: middle.z, handleAngle: -Math.PI / 2 },
    { x: middle.x, z: box.min.z + radius, handleAngle: 0 },
    { x: middle.x, z: box.max.z - radius, handleAngle: Math.PI },
  ];

  const probe = new THREE.Vector3();
  const onShell = candidates.map((candidate) => {
    let count = 0;
    for (const mesh of meshes) {
      const position = mesh.geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        probe.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
        const d = Math.hypot(probe.x - candidate.x, probe.z - candidate.z);
        if (d >= radius * 0.95 && d <= radius * 1.05) count++;
      }
    }
    return count;
  });

  const { x, z, handleAngle } = candidates[onShell.indexOf(Math.max(...onShell))];
  const center = new THREE.Vector3(x, middle.y, z);

  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();

  for (const mesh of meshes) {
    // Sem índice, cada triângulo tem vértices só seus — é o que permite
    // consertar a emenda sem arrastar os vizinhos junto (ver healSeam).
    if (mesh.geometry.index) mesh.geometry = mesh.geometry.toNonIndexed();

    const geometry = mesh.geometry;
    const position = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    normalMatrix.getNormalMatrix(mesh.matrixWorld);
    const uv = new Float32Array(position.count * 2);

    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      const dx = point.x - center.x;
      const dz = point.z - center.z;
      const distance = Math.hypot(dx, dz);

      let outward = 1;
      if (normals) {
        normal.fromBufferAttribute(normals, i).applyMatrix3(normalMatrix);
        // Só a parede externa aponta para fora do eixo; interior e fundo não.
        outward = distance > 1e-6 ? (normal.x * dx + normal.z * dz) / (distance * (normal.length() || 1)) : 0;
      }

      // Parede externa = está no raio do corpo E olha para fora. As duas
      // condições juntas descartam alça (longe demais), fundo e borda (perto
      // demais do eixo) e interior (raio parecido, mas normal virada p/ dentro).
      const isHandle = distance > radius * 1.05;
      if (isHandle || distance < radius * 0.85 || outward < 0.3) {
        uv[i * 2] = isHandle ? HANDLE_UV[0] : INSIDE_UV[0];
        uv[i * 2 + 1] = HANDLE_UV[1];
        continue;
      }

      // u=0.5 no lado oposto à alça; a emenda da textura cai atrás dela.
      const theta = Math.atan2(dx, dz) - handleAngle - Math.PI;
      uv[i * 2] = ((theta / (Math.PI * 2) + 0.5) % 1 + 1) % 1;
      uv[i * 2 + 1] = (point.y - box.min.y) / height;
    }

    healSeam(uv);
    geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  }

  return { circumference: 2 * Math.PI * radius, height, handleAngle, center, base: box.min.y };
}

/**
 * Fecha a volta da estampa nos triângulos da emenda, atrás da alça.
 *
 * Lá o u de um vértice é ~1 e o do vizinho é ~0: interpolando, o triângulo
 * varre a textura inteira ao contrário em poucos milímetros e vira uma faixa
 * com as cores das bordas da arte. Mandar os vértices baixos para além de 1
 * faz a volta seguir em frente — a textura precisa de wrapS = RepeatWrapping
 * para amostrar isso como continuação.
 */
function healSeam(uv: Float32Array) {
  for (let t = 0; t + 5 < uv.length; t += 6) {
    const us = [uv[t], uv[t + 2], uv[t + 4]];
    // Meia volta de diferença dentro de um triângulo só existe na emenda.
    if (Math.max(...us) - Math.min(...us) <= 0.5) continue;
    for (let k = 0; k < 3; k++) {
      if (us[k] < 0.5) uv[t + k * 2] = us[k] + 1;
    }
  }
}

/**
 * Normaliza a pose do modelo: base em y=0, eixo na origem e alça em +X — que é
 * o que as vistas predefinidas assumem. Devolve o nó a ser escalado.
 */
export function normalizeMugPose(
  model: THREE.Object3D,
  { handleAngle, center, base }: ReturnType<typeof reprojectMugUV>,
) {
  const pivot = new THREE.Group();
  model.position.set(-center.x, -base, -center.z);
  pivot.add(model);
  pivot.rotation.y = Math.PI / 2 - handleAngle;

  return pivot;
}

export type MugView = "front" | "three-quarter" | "side";

// Ângulo entre a câmera e a alça, visto de cima: 180° esconde a alça atrás,
// 90° a mostra de perfil, e quanto menor, mais alça aparece. O sinal negativo
// joga a alça para a esquerda da tela (positivo mandaria para a direita).
export const VIEW_AZIMUTHS: Record<MugView, number> = {
  front: 180,
  "three-quarter": -135,
  side: -90,
};

/** Quanto de folga deixar em volta da caneca. 1 = ela preenche o quadro. */
export const FRAMING = 2;

/**
 * A câmera fica parada olhando de frente para a caneca — quem gira é o objeto
 * (os 3 eixos do editor). Fica em +Z de propósito: assim os eixos do mundo são
 * os da tela (x = horizontal, y = vertical, z = profundidade) e girar em x/y/z
 * é girar no que se vê. Um pouco de elevação dá volume ao produto.
 */
export const FIXED_VIEW = { azimuth: 90, elevation: 18 };

/**
 * Direção da câmera em relação ao alvo. A alça aponta para +X depois de
 * normalizeMugPose, então o azimute é medido a partir dela; a elevação é o
 * quanto a câmera sobe, que é o que dá a sensação de volume.
 * Ambos em graus.
 */
export function viewDirection(azimuth: number, elevation: number) {
  const a = (azimuth * Math.PI) / 180;
  const e = (elevation * Math.PI) / 180;
  return new THREE.Vector3(
    Math.cos(a) * Math.cos(e),
    Math.sin(e),
    Math.sin(a) * Math.cos(e),
  ).normalize();
}
