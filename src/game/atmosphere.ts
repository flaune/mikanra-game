import * as THREE from 'three';
import type { CharacterMotor } from './physics';

/** Painted sky and faceted ginkgo trees: a modest, local handheld-era art pass. */
export function addLaneAtmosphere(scene: THREE.Scene, motor: CharacterMotor) {
  // Seamless, camera-independent 360° skybox with clouds, sun and a distant skyline.
  const sky = document.createElement('canvas'); sky.width = 2048; sky.height = 1024;
  const context = sky.getContext('2d')!;
  const gradient = context.createLinearGradient(0, 0, 0, 1024);
  gradient.addColorStop(0, '#437fa8'); gradient.addColorStop(.28, '#87b6cf');
  gradient.addColorStop(.49, '#f6dec0'); gradient.addColorStop(.62, '#c8c9b9'); gradient.addColorStop(1, '#b9b8a5');
  context.fillStyle = gradient; context.fillRect(0, 0, 2048, 1024);
  const sunlight = context.createRadialGradient(1450, 310, 12, 1450, 310, 220);
  sunlight.addColorStop(0, '#fff4d9'); sunlight.addColorStop(.15, '#fff4d9b0'); sunlight.addColorStop(1, '#fff4d900');
  context.fillStyle = sunlight; context.fillRect(1230, 90, 440, 440);
  for (let i = 0; i < 36; i++) {
    const x = (i * 193) % 2048, y = 180 + (i * 47) % 205;
    // Wrap brush marks across the panorama seam.
    for (const offset of [-2048, 0, 2048]) {
      context.fillStyle = '#fff6e885'; context.beginPath();
      context.ellipse(x + offset, y, 55 + i % 5 * 22, 9 + i % 4 * 6, -.02, 0, Math.PI * 2); context.fill();
      context.fillStyle = '#edf1e75a'; context.beginPath();
      context.ellipse(x + offset + 23, y + 12, 70 + i % 4 * 18, 8, 0, 0, Math.PI * 2); context.fill();
    }
  }
  for (let layer = 0; layer < 2; layer++) {
    context.fillStyle = layer ? '#879b9e' : '#a6b4b5';
    for (let i = 0; i < 72; i++) {
      const x = i * 29, top = 490 - ((i * 31 + layer * 23) % 65);
      context.fillRect(x, top + layer * 22, 25, 100);
      if (i % 9 === 0) context.fillRect(x + 10, top - 28 + layer * 22, 3, 30);
    }
  }
  const skyMap = new THREE.CanvasTexture(sky); skyMap.colorSpace = THREE.SRGBColorSpace;
  skyMap.mapping = THREE.EquirectangularReflectionMapping;
  skyMap.wrapS = THREE.RepeatWrapping; skyMap.generateMipmaps = true;
  scene.background = skyMap; scene.backgroundIntensity = .85;
  scene.fog = new THREE.Fog(0xc8c9b9, 32, 90);

  const trees = new THREE.Group(); trees.name = 'Golden ginkgo / painted low-poly canopy'; scene.add(trees);
  const bark = new THREE.MeshStandardMaterial({ color: 0x70634e, roughness: 1, flatShading: true });
  const trunkGeometry = new THREE.CylinderGeometry(.12, .21, 3.8, 7);
  const foliageGeometry = new THREE.IcosahedronGeometry(1, 1);
  const leafMaterials = [0xc4b958, 0xe0c36c, 0xafa75e].map(color => new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }));
  const trunk = new THREE.InstancedMesh(trunkGeometry, bark, 2);
  const leaves = leafMaterials.map(material => new THREE.InstancedMesh(foliageGeometry, material, 12));
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion();
  const positions = [[-10.7, 6.8], [9.7, 5.6]];
  positions.forEach(([x, z], treeIndex) => {
    trunk.setMatrixAt(treeIndex, matrix.makeTranslation(x, 1.9, z));
    motor.addBoxCollider(x, 1.9, z, .22, 1.9, .22);
    for (let i = 0; i < 18; i++) {
      const angle = i * 2.4, radius = .4 + (i % 4) * .43;
      quaternion.setFromEuler(new THREE.Euler(i * .8, i * .4, .2));
      matrix.compose(new THREE.Vector3(x + Math.cos(angle) * radius, 3.7 + (i % 5) * .32, z + Math.sin(angle) * radius), quaternion, new THREE.Vector3(.9, .6 + i % 3 * .2, .8));
      leaves[i % 3].setMatrixAt(treeIndex * 6 + Math.floor(i / 3), matrix);
    }
  });
  for (const mesh of [trunk, ...leaves]) { mesh.castShadow = mesh.receiveShadow = true; mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); trees.add(mesh); }

  const fallen = new THREE.InstancedMesh(new THREE.CircleGeometry(.06, 5), new THREE.MeshStandardMaterial({ color: 0xcdb16a, side: THREE.DoubleSide, roughness: 1 }), 70);
  for (let i = 0; i < 70; i++) {
    const [x, z] = positions[i % 2]; const angle = i * 2.4, radius = (i % 11) * .26;
    quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, angle));
    matrix.compose(new THREE.Vector3(x + Math.cos(angle) * radius, .032, z + Math.sin(angle) * radius), quaternion, new THREE.Vector3(1, 1.8, 1));
    fallen.setMatrixAt(i, matrix);
  }
  fallen.receiveShadow = true; fallen.computeBoundingSphere(); trees.add(fallen);
}
