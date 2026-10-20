import { CafeEquipment } from './cafeEquipment';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createStreetMaterials } from './streetMaterials';
import { makeTextTexture } from './textures';
import { buildCafeInterior } from './components';
import { CustomerService } from './customerService';
import { addLaneAtmosphere } from './atmosphere';
import type { CharacterMotor } from './physics';
import type { InteractionSystem, Interactable } from './interaction';
import type { WorldData } from './world';

export const STREET_SPAWN = new THREE.Vector3(4.1, .03, 8);
export const STREET_YAW = .57;
export const CAFE_RETURN = new THREE.Vector3(-1.2, .03, 1.65);
export const INTERIOR_SPAWN = new THREE.Vector3(100, .03, 102);
export const STREET_SKY = 0xb9c6ca;

/** A bounded art sample. The original neighborhood builder remains in world.ts. */
export function buildCafeStreet(scene: THREE.Scene, motor: CharacterMotor, interaction: InteractionSystem): WorldData {
  const root = new THREE.Group(); root.name = 'Mikanra — café lane'; scene.add(root);
  addLaneAtmosphere(scene, motor);
  const m = createStreetMaterials();
  const interactables: Interactable[] = [];
  const v = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const unitBox = new THREE.BoxGeometry(1, 1, 1);

  function group(x: number, z: number, yaw = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; root.add(g); return g;
  }
  function box(g: THREE.Group, x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material, solid = false) {
    let geometry = unitBox;
    if (mat instanceof THREE.MeshStandardMaterial && mat.map) {
      geometry = unitBox.clone();
      const uv = geometry.getAttribute('uv');
      const tileSize = mat === m.road ? 3 : 2.5;
      const faceSizes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
      for (let face = 0; face < 6; face++) for (let i = 0; i < 4; i++) {
        const index = face * 4 + i;
        uv.setXY(index, uv.getX(index) * faceSizes[face][0] / tileSize, uv.getY(index) * faceSizes[face][1] / tileSize);
      }
    }
    const mesh = new THREE.Mesh(geometry, mat); mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
    mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh);
    if (solid) {
      g.updateWorldMatrix(true, false); v.set(x, y, z).applyMatrix4(g.matrixWorld);
      g.matrixWorld.decompose(new THREE.Vector3(), q, s);
      motor.addBoxCollider(v.x, v.y, v.z, w / 2, h / 2, d / 2, q);
    }
    return mesh;
  }
  function cylinder(g: THREE.Group, x: number, y: number, z: number, radius: number, h: number, mat: THREE.Material, top = radius) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, radius, h, 10), mat);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh;
  }
  function line(g: THREE.Group, points: number[][], radius = .015, mat: THREE.Material = m.dark) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p as [number, number, number])));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, radius, 5, false), mat); mesh.castShadow = true; g.add(mesh); return mesh;
  }
  function sign(g: THREE.Group, x: number, y: number, z: number, w: number, h: number, text: string, bg = '#282d2a', color = '#eee0b9', fontSize = 65) {
    const tex = makeTextTexture(text, { width: 1024, height: Math.round(1024 * h / w), fontSize, padding: 20, background: bg, color, lineHeight: 1.3, verticalCenter: true, fontFamily: "'Noto Sans JP', sans-serif" });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    mesh.position.set(x, y, z); g.add(mesh); return mesh;
  }
  function register(mesh: THREE.Object3D, id: string, prompt: string, japanesePrompt: string, type: Interactable['type'] = 'sign', range = 3) {
    mesh.userData.interactive = true;
    const target: Interactable = { mesh, id, prompt, japanesePrompt, type, range, interact: () => {} };
    interactables.push(target); interaction.register(target);
  }
  function shadow(g: THREE.Group, x: number, z: number, w: number, d: number) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m.shadow);
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, .045, z); g.add(mesh);
  }
  function windowFrame(g: THREE.Group, x: number, y: number, z: number, w: number, h: number, warm = false) {
    box(g, x, y, z, w + .16, h + .16, .14, m.trim);
    box(g, x, y, z + .085, w, h, .04, warm ? m.warmGlass : m.glass);
    box(g, x, y, z + .12, .055, h, .05, m.trim);
    box(g, x, y - h * .15, z + .12, w, .055, .05, m.trim);
    box(g, x, y - h / 2 - .12, z + .08, w + .32, .12, .3, m.trim);
    if (!warm) {
      for (let i = 0; i < 6; i++) box(g, x - w / 2 + .08 + i * w / 6, y, z + .145, .09, h - .05, .015, m.sage);
    }
  }
  function ac(g: THREE.Group, x: number, y: number, z: number) {
    box(g, x, y, z, 1.02, .63, .42, m.white);
    const fan = new THREE.Mesh(new THREE.RingGeometry(.15, .23, 16), m.metal); fan.position.set(x - .19, y, z + .22); g.add(fan);
    for (let i = 0; i < 6; i++) box(g, x + .24, y - .22 + i * .085, z + .22, .32, .025, .02, m.metal);
    for (let i = -1; i <= 1; i += 2) box(g, x + i * .36, y - .38, z - .03, .06, .13, .5, m.metal);
    line(g, [[x + .52, y, z], [x + .68, y - .15, z], [x + .68, .4, z]], .033, m.linen);
  }
  function plant(g: THREE.Group, x: number, z: number, size = 1) {
    cylinder(g, x, .22 * size, z, .2 * size, .44 * size, m.terracotta, .29 * size);
    cylinder(g, x, .43 * size, z, .3 * size, .07 * size, m.terracotta);
    cylinder(g, x, .47 * size, z, .25 * size, .02, m.trim);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4; const r = .15 * size;
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(.25 * size, 1), i % 2 ? m.green : m.leaf);
      leaf.position.set(x + Math.cos(a) * r, (.68 + (i % 3) * .18) * size, z + Math.sin(a) * r);
      leaf.scale.set(.65, 1.65, .5); leaf.rotation.z = Math.cos(a) * .6; leaf.castShadow = true; g.add(leaf);
    }
    shadow(g, x, z, .95 * size, .8 * size);
    g.updateWorldMatrix(true, false); v.set(x, .3 * size, z).applyMatrix4(g.matrixWorld);
    motor.addBoxCollider(v.x, v.y, v.z, .25 * size, .3 * size, .25 * size);
  }
  function lamp(g: THREE.Group, x: number, y: number, z: number) {
    line(g, [[x, y + .2, z - .35], [x, y + .4, z], [x, y + .2, z + .18]], .025, m.dark);
    cylinder(g, x, y + .1, z + .18, .22, .15, m.dark, .06);
    cylinder(g, x, y + .015, z + .18, .15, .015, m.glow);
  }
  function bicycle(g: THREE.Group, x: number, z: number) {
    const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = .12; g.add(b);
    for (const wx of [-.58, .58]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(.34, .035, 6, 24), m.dark); wheel.position.set(wx, .38, 0); b.add(wheel);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(.30, .012, 4, 24), m.white); rim.position.copy(wheel.position); b.add(rim);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        line(b, [[wx, .38, 0], [wx + Math.cos(a) * .3, .38 + Math.sin(a) * .3, 0]], .004, m.white);
      }
    }
    line(b, [[-.58, .38, 0], [-.22, .87, 0], [.04, .36, 0], [-.58, .38, 0]], .025, m.blue);
    line(b, [[-.22, .87, 0], [.42, .87, 0], [.04, .36, 0]], .025, m.blue);
    line(b, [[.58, .38, 0], [.42, .87, 0], [.40, 1.12, 0], [.28, 1.15, 0]], .022, m.white);
    line(b, [[-.25, .78, 0], [-.28, 1.03, 0]], .02, m.white);
    box(b, -.30, 1.03, 0, .3, .065, .16, m.trim);
    box(b, .59, 1.02, 0, .3, .24, .26, m.metal);
    box(b, .59, 1.15, 0, .25, .012, .21, m.dark);
    shadow(g, x, z, 2.1, .7);
  }

  // Ground and narrow drainage gutters establish human scale.
  box(root, 0, -.16, -3, 31, .3, 43, m.road, true);
  box(root, -4.4, .035, .48, 12.6, .07, 1, m.tile);
  box(root, 4.83, .03, -8, .36, .06, 20, m.tile);
  box(root, .66, .03, -8, .32, .06, 17, m.tile);
  for (let z = -17; z < 2; z += .55) {
    box(root, 4.72, .079, z, .2, .012, .035, m.dark);
    box(root, .75, .079, z, .18, .012, .025, m.dark);
  }
  for (let x = -12; x < 13; x += 2.8) box(root, x, .006, 5, 1.5, .008, .07, m.linen);
  for (const [x, z] of [[2.8, -3], [-3, 4.5], [2.6, -13]]) {
    const cover = cylinder(root, x, .014, z, .38, .025, m.metal);
    cover.castShadow = false;
    for (let n = -3; n <= 3; n++) box(root, x, .03, z + n * .08, .52, .01, .018, m.dark);
  }

  // Continuous perimeter: corners overlap and walls extend above any walkable prop.
  for (const x of [-14.4, 12.4]) motor.addBoxCollider(x, 6, -5, .3, 6, 18.2);
  for (const z of [-23, 13.1]) motor.addBoxCollider(-1, 6, z, 13.7, 6, .3);
  // Visible temporary closure uses the exact same extents as its collider.
  // These outer walls close both ends of the side alleys and the front corner gaps.
  for (const x of [-14.4, 12.4]) {
    const wall = box(root, x, 2.5, -5, .6, 5, 36.8, m.plaster, true); wall.name = `boundary-side-${x}`;
    box(root, x, 5.03, -5, .8, .12, 36.8, m.trim);
  }
  for (const z of [-23, 13.1]) {
    const wall = box(root, -1, 2.5, z, 27.4, 5, .6, m.brick, true); wall.name = `boundary-end-${z}`;
    box(root, -1, 5.03, z, 27.6, .12, .8, m.trim);
  }
  // Block side passages before the distant scenery, with readable closed gates.
  for (const [x, z, width] of [[-10, -18.7, 8.9], [8.65, -18.7, 7.6], [11.3, 11.7, 2.3], [-13.05, 11.7, 2.4]] as const) {
    box(root, x, 1.6, z, width, 3.2, .35, m.wood, true);
    box(root, x, 3.25, z, width + .15, .12, .5, m.trim);
    for (let dx = -width / 2 + .15; dx < width / 2; dx += .24) box(root, x + dx, 1.6, z + .2, .05, 3.1, .06, m.trim);
    const closedSign = sign(root, x, 1.75, z + (z > 0 ? -.25 : .25), Math.min(1.8, width - .2), .5, '工事中 / CLOSED', '#f3d388', '#3e3526', 90);
    if (z > 0) closedSign.rotation.y = Math.PI;
  }
  // Café: original shopfront with a warm, deep window and timber joinery.
  const cafe = group(-3, -3);
  box(cafe, 0, 3.25, 0, 7, 6.5, 6, m.plaster, true);
  box(cafe, 0, .48, 3.025, 7, .96, .09, m.brick);
  box(cafe, 0, 1.65, 3.09, 6.75, 2.25, .15, m.wood);
  box(cafe, -1.15, 1.62, 3.20, 3.5, 1.85, .12, m.trim);
  box(cafe, -1.15, 1.62, 3.28, 3.28, 1.67, .04, m.warmGlass);
  for (let i = 0; i < 4; i++) box(cafe, -2.8 + i * 1.1, 1.62, 3.33, .055, 1.78, .08, m.trim);
  box(cafe, -1.15, 1.5, 3.33, 3.4, .07, .08, m.trim);
  // Dark interior silhouettes give the luminous window depth without transparency.
  for (let i = 0; i < 3; i++) {
    box(cafe, -2.25 + i * 1.15, .95, 3.32, .72, .06, .018, m.trim);
    box(cafe, -2.25 + i * 1.15, .74, 3.32, .045, .42, .018, m.trim);
    cylinder(cafe, -2.25 + i * 1.15, 2.2, 3.32, .19, .15, m.trim, .06);
    box(cafe, -2.25 + i * 1.15, 2.37, 3.32, .015, .22, .015, m.trim);
  }
  // Treat the leaf, glass, handle and trim as one target so its own details
  // neither hide the interaction nor highlight other shared-material objects.
  const door = new THREE.Group(); cafe.add(door);
  box(door, 1.8, 1.25, 3.21, 1.18, 2.5, .14, m.trim);
  box(door, 1.8, 1.24, 3.30, .96, 2.36, .06, m.wood);
  box(door, 1.8, 1.7, 3.35, .71, 1.15, .025, m.warmGlass);
  for (let i = 0; i < 3; i++) box(door, 1.55 + i * .25, 1.7, 3.38, .028, 1.15, .03, m.trim);
  box(door, 2.1, 1.07, 3.40, .04, .28, .055, m.linen);
  box(cafe, 1.8, .065, 3.5, 1.5, .13, .8, m.tile);
  register(door, 'cafe-door', 'Enter the café', '入る', 'door', 2.6);
  sign(door, 1.8, 1.45, 3.415, .42, .19, '営業中', '#ecdbb5', '#3c3b30', 170);

  box(cafe, 0, 3.12, 3.13, 6.9, .63, .22, m.trim);
  const cafeSign = sign(cafe, 0, 3.13, 3.27, 5.9, .49, '喫 茶  み か ん', '#342d26', '#efdbb0', 61);
  register(cafeSign, 'cafe-sign', 'Read the café sign', '喫茶', 'sign', 4.5);
  // Real sloped canvas, alternating panels and a hanging scalloped valance.
  for (let i = 0; i < 22; i++) {
    const x = -3.3 + (i + .5) * .3;
    const canopy = box(cafe, x, 2.72, 3.59, .298, .055, 1.13, i % 3 === 0 ? m.linen : m.rust);
    canopy.rotation.x = .23;
    box(cafe, x, 2.49, 4.11, .298, .23, .045, i % 3 === 0 ? m.linen : m.rust);
  }
  line(cafe, [[-3.3, 2.38, 3.18], [-3.3, 2.40, 4.08], [3.3, 2.40, 4.08], [3.3, 2.38, 3.18]], .025, m.trim);
  for (const x of [-2.25, 0, 2.25]) lamp(cafe, x, 3.65, 3.45);
  for (const x of [-1.8, 1.55]) windowFrame(cafe, x, 4.93, 3.07, 1.62, 1.6);
  box(cafe, -1.8, 4.08, 3.4, 2.25, .13, .7, m.dark);
  for (let x = -2.85; x <= -.7; x += .18) box(cafe, x, 4.39, 3.73, .024, .56, .024, m.dark);
  box(cafe, -1.8, 4.69, 3.73, 2.2, .035, .035, m.dark);
  ac(cafe, 2.55, 3.96, 3.32);
  line(cafe, [[-3.35, 6.48, 3.18], [-3.35, 3.7, 3.18], [-3.21, 3.3, 3.2], [-3.21, .1, 3.2]], .048, m.metal);
  box(cafe, 0, 6.43, 0, 7.45, .20, 6.5, m.trim);
  const roofFront = box(cafe, 0, 6.90, 1.65, 7.65, .14, 3.53, m.roof); roofFront.rotation.x = .27;
  const roofBack = box(cafe, 0, 6.90, -1.65, 7.65, .14, 3.53, m.roof); roofBack.rotation.x = -.27;
  for (let x = -3.7; x < 3.8; x += .27) line(cafe, [[x, 6.45, 3.39], [x, 7.39, 0], [x, 6.45, -3.39]], .035, m.dark);
  line(cafe, [[-3.85, 7.4, 0], [3.85, 7.4, 0]], .09, m.roof);
  // Side blade sign, readable from both directions down the alley.
  box(cafe, 3.88, 3.75, 2.6, .08, 1.65, .82, m.trim);
  const blade = sign(cafe, 3.935, 3.75, 2.6, .73, 1.52, 'カ\nフ\nェ', '#e1d0a4', '#443b31', 425); blade.rotation.y = Math.PI / 2; (blade.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;
  box(cafe, 3.6, 4.65, 2.6, .8, .04, .05, m.dark);
  box(cafe, 3.6, 2.87, 2.6, .8, .04, .05, m.dark);
  plant(cafe, -3.0, 3.8, 1.1); plant(cafe, 2.9, 3.83, .8);
  plant(cafe, 3.9, 1.7, .8);
  const board = box(cafe, .55, .72, 4.04, .68, 1.02, .07, m.trim); board.rotation.x = -.12;
  const boardText = sign(cafe, .55, .75, 4.18, .59, .86, '本日のメニュー\n\nコーヒー  450円\nみず\n\nWELCOME', '#253932', '#e8d9b6', 68);
  boardText.rotation.x = -.12;
  for (const x of [.28, .82]) box(cafe, x, .29, 4.10, .04, .58, .08, m.wood);
  shadow(cafe, 0, 3.55, 8, 2.7);
  const cafeLight = new THREE.PointLight(0xffbe72, 9, 6, 2); cafeLight.position.set(-4, 2, 1); root.add(cafeLight);
  // The side wall is visible throughout the lane, so it gets its own joinery and utilities.
  const cafeSide = group(-3, -3, Math.PI / 2);
  windowFrame(cafeSide, -.85, 4.9, 3.56, 1.7, 1.5);
  windowFrame(cafeSide, 1.8, 4.9, 3.56, 1.1, 1.5);
  box(cafeSide, 1.45, 1.15, 3.54, 1, 2.3, .08, m.wood);
  box(cafeSide, -1.35, 1.5, 3.59, .9, 1.1, .06, m.trim);
  sign(cafeSide, -1.35, 1.5, 3.645, .79, .97, 'みかん通信\n\n珈琲と音楽\n\n土曜日  15:00', '#d9c9a4', '#5b5848', 110);
  ac(cafeSide, .15, 2.8, 3.73);
  line(cafeSide, [[-2.3, 5.7, 3.6], [-2.3, .2, 3.6]], .04, m.metal);
  for (let i = 0; i < 2; i++) {
    box(cafeSide, -.95 + i * .4, 2.55, 3.65, .28, .42, .16, m.metal);
    line(cafeSide, [[-.95 + i * .4, 2.55, 3.66], [-.95 + i * .4, 3.6, 3.66], [-2.3, 3.6, 3.66]], .012, m.dark);
  }

  // Little bookshop beside the café, with a shutter and stacked crates.
  const books = group(-9, -2.5);
  box(books, 0, 2.65, 0, 4.9, 5.3, 5, m.sage, true);
  box(books, 0, 1.4, 2.54, 3.85, 2.6, .15, m.trim);
  box(books, 0, 1.4, 2.64, 3.6, 2.4, .04, m.metal);
  for (let y = .25; y < 2.65; y += .095) box(books, 0, y, 2.69, 3.6, .025, .03, m.dark);
  box(books, 0, 3.14, 2.64, 4.25, .65, .16, m.linen);
  const bookSign = sign(books, 0, 3.14, 2.745, 3.9, .48, 'みどり書店  /  本', '#c4bd9c', '#394843', 76);
  register(bookSign, 'bookstore-sign', 'Read the bookshop sign', '書店', 'sign', 4.5);
  windowFrame(books, -.9, 4.35, 2.56, 1.1, 1.05);
  windowFrame(books, .9, 4.35, 2.56, 1.1, 1.05);
  box(books, 0, 5.32, 0, 5.2, .22, 5.3, m.roof);
  for (let i = 0; i < 3; i++) {
    box(books, 1.45, .2 + i * .35, 3, .65, .32, .55, m.wood);
    for (let j = 0; j < 6; j++) box(books, 1.19 + j * .095, 1.02, 3.05, .065, .23 + j % 2 * .05, .25, j % 2 ? m.rust : m.linen);
  }
  bicycle(books, -.75, 3.1);

  // East-side shop row faces the lane, creating a contained street canyon.
  const east = group(8, -3.2, -Math.PI / 2);
  box(east, 0, 4.2, 0, 7.3, 8.4, 6, m.cream, true);
  box(east, 0, 1.6, 3.06, 7.25, 3.2, .1, m.brick);
  box(east, 0, 1.48, 3.13, 4.4, 2.85, .12, m.trim);
  box(east, 0, 1.48, 3.21, 4.12, 2.65, .04, m.sage);
  for (let y = .2; y < 2.8; y += .105) box(east, 0, y, 3.25, 4.1, .023, .025, m.metal);
  const cleaningSign = sign(east, 0, 3.16, 3.2, 4.6, .55, 'さくらクリーニング', '#566f74', '#f1e8ce', 86);
  register(cleaningSign, 'laundromat-sign', 'Read the cleaning shop sign', 'クリーニング', 'sign', 4.5);
  const eave = box(east, 0, 2.88, 3.65, 4.9, .08, .9, m.blue); eave.rotation.x = .18;
  for (const y of [4.65, 6.8]) for (const x of [-2.35, 0, 2.35]) windowFrame(east, x, y, 3.08, 1.15, 1.32);
  ac(east, -2.6, 3.45, 3.25);
  box(east, 0, 8.47, 0, 7.65, .18, 6.45, m.roof);
  line(east, [[3.4, 8.45, 3.2], [3.4, .1, 3.2]], .055, m.metal);
  plant(east, 2.7, 3.6, .95);
  shadow(east, 0, 3.4, 8, 2);
  // Street-facing end of the opposite shop: a noticeboard, tile base and upper windows.
  const eastFront = group(8, .46);
  box(eastFront, 0, .52, 0, 6, 1.04, .1, m.brick);
  windowFrame(eastFront, -.9, 5.2, .06, 1.6, 1.7);
  windowFrame(eastFront, 1.45, 5.2, .06, 1.4, 1.7);
  box(eastFront, -.3, 2.0, .12, 2.6, 1.8, .14, m.trim);
  box(eastFront, -.3, 2.0, .21, 2.4, 1.6, .04, m.wood);
  sign(eastFront, -.95, 2.08, .24, .92, 1.21, '町のお知らせ\n\nみかん祭り\n\n9月28日\n\n商店街へようこそ', '#d7c6a0', '#444d49', 92);
  sign(eastFront, .22, 2.02, .24, .85, 1.08, '音楽の夕べ\n\nJAZZ\n\n喫茶みかん\n18:00', '#647775', '#eee0b9', 128);
  const frontEave = box(eastFront, -.3, 3.13, .38, 3.2, .10, 1.0, m.blue); frontEave.rotation.x = .15;
  line(eastFront, [[2.75, 8.3, .18], [2.75, .1, .18]], .05, m.metal);
  ac(eastFront, 1.8, 3.5, .28);
  plant(eastFront, 1.9, .62, 1.15);

  const rear = group(8, -11.9, -Math.PI / 2);
  box(rear, 0, 3.05, 0, 9.4, 6.1, 6, m.sage, true);
  box(rear, 0, .5, 3.05, 9.4, 1, .1, m.brick);
  for (const x of [-3, 0, 3]) {
    windowFrame(rear, x, 4.55, 3.09, 1.7, 1.5, x === 0);
    box(rear, x, 1.4, 3.1, 1.6, 2.8, .1, m.wood);
    windowFrame(rear, x, 1.75, 3.19, 1.2, 1.4);
    lamp(rear, x, 3.0, 3.35);
  }
  sign(rear, 0, 3.28, 3.21, 2.4, .45, '花 と 暮 ら し', '#6b795d', '#f2e8cc', 90);
  box(rear, 0, 6.13, 0, 9.8, .22, 6.4, m.roof);
  plant(rear, -1.2, 3.7, 1.15); plant(rear, 1.2, 3.65, .8); plant(rear, 1.85, 3.5, 1.2);

  const west = group(-2.5, -11.4, Math.PI / 2);
  box(west, 0, 3.65, 0, 10.5, 7.3, 6, m.plaster, true);
  box(west, 0, .7, 3.03, 10.5, 1.4, .1, m.brick);
  for (const x of [-3.3, 0, 3.3]) {
    windowFrame(west, x, 5.4, 3.09, 1.7, 1.8);
    windowFrame(west, x, 2.4, 3.09, 1.25, 1.4);
  }
  ac(west, 1.4, 3.6, 3.25);
  box(west, 0, 7.32, 0, 10.9, .18, 6.4, m.roof);
  for (const x of [-4.9, 4.8]) line(west, [[x, 7.3, 3.18], [x, .1, 3.18]], .05, m.metal);
  bicycle(west, -2.2, 3.45);
  sign(west, -.3, 1.5, 3.2, .5, .72, '路地\n徐行', '#d9d0b4', '#a4523c', 200);
  plant(west, 3.9, 3.7, 1.1);

  // Vending machine is a bright landmark at the far bend.
  const vend = group(1.25, -15.4, Math.PI / 2);
  box(vend, 0, 1.05, 0, 1.05, 2.1, .72, m.red, true);
  box(vend, -.1, 1.35, .38, .74, 1.1, .05, m.warmGlass);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
    cylinder(vend, -.36 + col * .17, 1.02 + row * .3, .44, .045, .16, col % 2 ? m.white : m.blue);
    box(vend, -.36 + col * .17, .90 + row * .3, .45, .06, .035, .018, m.glow);
  }
  box(vend, 0, .34, .38, .62, .21, .04, m.dark);
  box(vend, .38, .96, .39, .12, .4, .04, m.dark);
  sign(vend, 0, 1.99, .39, .9, .15, 'つめたい', '#eee4cb', '#a44832', 105);
  register(vend, 'vending-1', 'Read the vending machine', '自販機', 'info', 2.6);
  const vendingLight = new THREE.PointLight(0xffd2a0, 4, 4, 2); vendingLight.position.set(2.2, 1.2, -15.4); root.add(vendingLight);

  // End of the walk: a small turn, lantern, and gate rather than an empty horizon.
  const end = group(-1.5, -20);
  box(end, 0, 4, 0, 13, 8, 5, m.cream, true);
  for (const x of [-4, -.8, 2.4, 5]) windowFrame(end, x, 5.8, 2.57, 1.25, 1.8);
  box(end, 3.6, 1.7, 2.57, 2.2, 3.4, .13, m.wood);
  for (let x = 2.6; x < 4.7; x += .18) box(end, x, 1.65, 2.67, .045, 3.2, .07, m.trim);
  sign(end, 3.6, 3.65, 2.73, 2.2, .4, 'みかん小路', '#3c4e48', '#eee0bb', 100);
  cylinder(root, 3.8, 2.6, -17.1, .22, .55, m.glow, .2);
  for (let y = 2.37; y < 2.88; y += .08) cylinder(root, 3.8, y, -17.1, .225, .012, m.rust);

  // Utility poles and sagging cables make the skyline specific to the street.
  for (const z of [3, -8, -16]) {
    cylinder(root, 4.5, 4.7, z, .095, 9.4, m.metal, .075);
    box(root, 4.5, 7.9, z, 1.7, .1, .09, m.dark);
    cylinder(root, 4.5, 6.9, z, .25, .6, m.white);
    motor.addBoxCollider(4.5, 4.7, z, .1, 4.7, .1);
    for (const x of [3.9, 4.5, 5.1]) cylinder(root, x, 8.06, z, .05, .2, m.white);
  }
  for (const x of [3.9, 4.5, 5.1]) {
    line(root, [[x, 8.2, 10], [x, 7.9, 3], [x - .1, 7.2, -2.5], [x, 8.2, -8], [x, 7.5, -12], [x, 8.2, -16], [x, 8, -23]], .017);
  }
  line(root, [[-9, 6, 0], [-2, 5.8, 2], [4.5, 7.3, 3], [10, 7.5, 5]], .02);
  line(root, [[-3, 7.4, -6], [1.5, 6.5, -7], [4.5, 7.7, -8], [10, 8.5, -9]], .016);

  // Background silhouettes and physical sample bounds.
  for (let i = 0; i < 7; i++) {
    const x = -16 + i * 5.8; const h = 8 + (i * 7 % 5);
    box(root, x, h / 2, -29 - i % 2 * 3, 5.4, h, 7, i % 2 ? m.sage : m.plaster);
    for (let y = 3; y < h - 1; y += 2) for (let n = -1; n <= 1; n++) box(root, x + n * 1.5, y, -25.4 - i % 2 * 3, .7, 1.1, .06, m.glass);
  }
  box(root, -14, 2, -4, .4, 4, 30, m.plaster, true);
  const leftEdge = group(-14.15, 0, Math.PI / 2);
  box(leftEdge, 0, 3.6, -1.5, 9, 7.2, 3, m.sage);
  for (const x of [-3, 0, 3]) windowFrame(leftEdge, x, 5.0, .1, 1.6, 1.8);
  box(leftEdge, 0, 7.2, -1.5, 9.4, .2, 3.5, m.roof);
  box(root, 12, 2, -4, .4, 4, 30, m.plaster, true);
  box(root, 0, 1.2, 12.6, 28, 2.4, .4, m.brick, true);
  for (let x = -13; x < 13; x += 2.5) plant(root, x, 12.05, 1.15);

  // Retain the existing café conversation in a correctly placed, collidable room.
  const interior = buildCafeInterior(); interior.group.position.set(100, 0, 100); interior.group.visible = false; scene.add(interior.group);
  for (const c of interior.colliders) motor.addBoxCollider(c.x + 100, c.y, c.z + 100, c.hw, c.hh, c.hd);
  motor.addBoxCollider(100, -.06, 100, 3.5, .06, 3.5);
  const triggerMat = new THREE.MeshBasicMaterial({ visible: false });
  const barista = interior.group.getObjectByName('Haru');
  if (barista) register(barista, 'barista', 'Talk to Haru', '話す', 'dialogue', 3);
  function shiftStation(id: string, title: string, x: number, z: number, color: number) {
    const target = new THREE.Group(); target.position.set(x, 0, z); interior.group.add(target);
    const base = new THREE.Mesh(new THREE.BoxGeometry(.48, .025, .28), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .15 }));
    base.position.y = 1.18; target.add(base);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(.46, .095), new THREE.MeshBasicMaterial({ map: makeTextTexture(title, { background: '#f7f5e9', color: '#45614e' }), side: THREE.FrontSide }));
    label.position.set(0, 1.24, .15); target.add(label);
    const reverse = label.clone(); reverse.rotation.y = Math.PI; reverse.position.z = -.15; target.add(reverse);
    // The tool itself occupies this space above its counter label. The invisible
    // pick volume lets its own geometry remain usable without bypassing walls.
    const tool = new THREE.Mesh(new THREE.BoxGeometry(.50,.58,.46), new THREE.MeshBasicMaterial({visible:false}));
    tool.position.y = 1.43; target.add(tool);
    target.name = id;
    register(target, id, title, '仕事', 'dialogue', 3);
    return target;
  }
  // Keep the tea and water dispensers clear of the existing espresso machine.
  for (const [drink, label, x, color] of [['coffee', 'コーヒー', -2.12, 0x668b78], ['tea', 'お茶', -1.05, 0xb79558], ['water', 'お水', -.35, 0x719faf]] as const) {
    const station = shiftStation(`shift-${drink}`, label, x, drink === 'coffee' ? -2.05 : -1.65, color);
    station.rotation.y = Math.PI;
    const target = interactables.find(target => target.id === `shift-${drink}`)!;
    target.prompt = 'Prepare at this station'; target.japanesePrompt = label;
  }
  for (const [id, label, x, z] of [['cups','Clean cups',.65,-3.03],['kettle','Kettle',-.35,-1.65],['grinder','Grinder',-2.95,-1.65],['tray','Serving tray',.85,-1.65],['sink','Wash cups',2.65,-2.2],['pantry','Pantry',2.85,-3.05],['wipe','Wipe counter',1.8,-2.1]] as const) {
    const station = shiftStation('shift-'+id,label,x,z,0x52786a); station.rotation.y = Math.PI;
    const word = {cups:'カップ',kettle:'お湯',grinder:'コーヒー',tray:'できました',sink:'洗う',pantry:'仕事',wipe:'仕事'}[id];
    interactables.find(t => t.id === 'shift-'+id)!.japanesePrompt = word;
  }
  // Water pitcher is beside the kettle; each tool has its own interaction target.
  const waterTarget = interactables.find(t => t.id === 'shift-water')!;
  waterTarget.mesh.position.x = .25; waterTarget.mesh.position.z = -1.65;
  const equipment = new CafeEquipment(); interior.group.add(equipment.group);
  const registerStation = shiftStation('shift-register', 'Register', 1.4, -1.65, 0xb79558);
  registerStation.rotation.y = Math.PI;
  const coins = new THREE.Group(); coins.name = 'customer-payment'; registerStation.add(coins);
  const coinMaterial = new THREE.MeshStandardMaterial({color:0xe2ba68,metalness:.65,roughness:.4});
  for(const x of [-.16,0,.16]) {const coin=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.014,12),coinMaterial);coin.position.set(x,1.398,.05);coins.add(coin);}
  coins.visible=false;

  const customerService = new CustomerService(); interior.group.add(customerService.group);
  register(customerService.group, 'shift-customer', 'Speak with the customer', '話す', 'dialogue', 3);
  const returns = shiftStation('shift-return', 'Return cups', 2.1, -1.65, 0x886953); returns.rotation.y = Math.PI;
  for (const target of interactables) if (target.id === 'barista' || target.id.startsWith('shift-')) target.aimAssist = true;
  const menu = interior.group.getObjectByName('cafe-menu');
  if (menu) register(menu, 'cafe-menu', 'Read the coffee menu', 'メニュー', 'info', 4.5);
  const exit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, .3), triggerMat); exit.position.set(0, 1.1, 3.25); interior.group.add(exit);
  register(exit, 'cafe-exit', 'Return to the lane', '出る', 'door', 2.6);

  // Batch static opaque geometry by material; keep signs used by interaction independent.
  root.updateMatrixWorld(true);
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const originals: THREE.Mesh[] = [];
  root.traverse(obj => {
    if (!(obj instanceof THREE.Mesh) || obj.userData.interactive || Array.isArray(obj.material) || obj.material.transparent) return;
    for (let parent = obj.parent; parent; parent = parent.parent) if (parent.userData.interactive) return;
    const geometry = obj.geometry.clone().applyMatrix4(obj.matrixWorld);
    const list = batches.get(obj.material) ?? []; list.push(geometry); batches.set(obj.material, list); originals.push(obj);
  });
  for (const [material, geometries] of batches) {
    const geometry = mergeGeometries(geometries, false);
    if (geometry) { const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh); }
    for (const geo of geometries) geo.dispose();
  }
  const oldGeometries = new Set<THREE.BufferGeometry>();
  for (const obj of originals) { oldGeometries.add(obj.geometry); obj.removeFromParent(); }
  // unitBox is still referenced by the interactive door and vending machine.
  for (const geo of oldGeometries) if (geo !== unitBox) geo.dispose();
  root.updateMatrixWorld(true);
  return { interactables, cafeInterior: interior.group, cafeInteriorColliders: interior.colliders, customerService, equipment };
}
