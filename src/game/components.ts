import * as THREE from "three";
import { makeSignMaterial } from "./textures";

export interface ColliderDef {
  x: number;
  y: number;
  z: number;
  hw: number;
  hh: number;
  hd: number;
}

export interface BuildResult {
  group: THREE.Group;
  colliders: ColliderDef[];
}

function std(color: number, roughness = 0.8): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function box(
  w: number, h: number, d: number,
  mat: THREE.Material,
  x: number, y: number, z: number,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function addCollider(result: BuildResult, x: number, y: number, z: number, hw: number, hh: number, hd: number) {
  result.colliders.push({ x, y, z, hw, hh, hd });
}

function signMesh(
  text: string,
  w: number,
  h: number,
  bg: string,
  fg: string,
  fontSize?: number,
): THREE.Mesh {
  const mat = makeSignMaterial(text, { fontSize: fontSize ?? 80, color: fg, background: bg, width: 512, height: 128 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

// ── StationFacade ──────────────────────────────────────────────
export function buildStationFacade(x: number, z: number, facing: number): BuildResult {
  const result: BuildResult = { group: new THREE.Group(), colliders: [] };
  const g = result.group;
  g.position.set(x, 0, z);
  g.rotation.y = facing;

  const wallMat = std(0x8a8a92, 0.85);
  const roofMat = std(0x4a4a52, 0.7);
  const frameMat = std(0x3a3a3e, 0.6);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x6688aa, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.7 });

  // Main building body
  g.add(box(10, 4.5, 4, wallMat, 0, 2.25, 0));
  addCollider(result, 0, 2.25, 0, 5, 2.25, 2);

  // Roof canopy overhang
  g.add(box(11, 0.3, 5, roofMat, 0, 4.65, 0.3));
  addCollider(result, 0, 4.65, 0.3, 5.5, 0.15, 2.5);

  // Entrance arch (recessed)
  g.add(box(3, 3, 0.2, frameMat, 0, 1.5, -2.05));
  g.add(box(2, 2.6, 0.15, glassMat, 0, 1.3, -2.08));

  // Pillars at entrance
  g.add(box(0.3, 4.5, 0.3, frameMat, -5, 2.25, -1.8));
  g.add(box(0.3, 4.5, 0.3, frameMat, 5, 2.25, -1.8));
  addCollider(result, -5, 2.25, -1.8, 0.15, 2.25, 0.15);
  addCollider(result, 5, 2.25, -1.8, 0.15, 2.25, 0.15);

  // Station sign
  const sign = signMesh("駅", 2, 0.8, "#2a2a3e", "#ffffff", 100);
  sign.position.set(0, 3.8, -2.12);
  sign.rotation.y = Math.PI;
  g.add(sign);

  // Clock
  const clockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), clockMat);
  clock.position.set(-3, 3.5, -2.06);
  clock.rotation.y = Math.PI;
  g.add(clock);

  return result;
}

// ── JapaneseHouse ──────────────────────────────────────────────
export function buildJapaneseHouse(x: number, z: number, facing: number, color: number): BuildResult {
  const result: BuildResult = { group: new THREE.Group(), colliders: [] };
  const g = result.group;
  g.position.set(x, 0, z);
  g.rotation.y = facing;

  const wallMat = std(color, 0.85);
  const roofMat = std(0x4a3a2e, 0.7);
  const frameMat = std(0x3a2e24, 0.6);
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x88aabb, roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.6 });

  // Ground floor
  g.add(box(4, 2.5, 4, wallMat, 0, 1.25, 0));
  addCollider(result, 0, 1.25, 0, 2, 1.25, 2);

  // Upper floor (slightly smaller)
  g.add(box(3.6, 1.8, 3.6, wallMat, 0, 3.4, 0));
  addCollider(result, 0, 3.4, 0, 1.8, 0.9, 1.8);

  // Tiled roof
  g.add(box(4.4, 0.25, 4.4, roofMat, 0, 4.45, 0));
  addCollider(result, 0, 4.45, 0, 2.2, 0.125, 2.2);

  // Roof ridge
  g.add(box(4.6, 0.15, 0.3, roofMat, 0, 4.6, 0));

  // Door
  g.add(box(0.9, 1.8, 0.1, frameMat, 0, 0.9, -2.02));

  // Windows ground floor
  g.add(box(0.8, 0.8, 0.08, windowMat, -1.2, 1.4, -2.02));
  g.add(box(0.8, 0.8, 0.08, windowMat, 1.2, 1.4, -2.02));

  // Window frames
  g.add(box(0.85, 0.08, 0.05, frameMat, -1.2, 1.0, -2.04));
  g.add(box(0.85, 0.08, 0.05, frameMat, -1.2, 1.8, -2.04));
  g.add(box(0.85, 0.08, 0.05, frameMat, 1.2, 1.0, -2.04));
  g.add(box(0.85, 0.08, 0.05, frameMat, 1.2, 1.8, -2.04));

  // Balcony on upper floor
  g.add(box(3.8, 0.1, 0.6, frameMat, 0, 2.5, -1.8));
  g.add(box(3.8, 0.6, 0.05, frameMat, 0, 2.8, -2.1));

  // AC unit on side
  g.add(box(0.6, 0.4, 0.5, std(0x666670, 0.6), 2.1, 1.5, 0));

  return result;
}

// ── SmallStorefront ────────────────────────────────────────────
export function buildSmallStorefront(
  x: number, z: number, facing: number,
  bodyColor: number, signText: string, signBg: string, signFg: string,
): BuildResult {
  const result: BuildResult = { group: new THREE.Group(), colliders: [] };
  const g = result.group;
  g.position.set(x, 0, z);
  g.rotation.y = facing;

  const wallMat = std(bodyColor, 0.8);
  const frameMat = std(0x3a3a3e, 0.6);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x99bbcc, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.65 });
  const awningMat = std(0xcc6644, 0.7);

  // Body
  g.add(box(5, 3.5, 4, wallMat, 0, 1.75, 0));
  addCollider(result, 0, 1.75, 0, 2.5, 1.75, 2);

  // Upper section
  g.add(box(5, 0.8, 4, wallMat, 0, 3.9, 0));
  addCollider(result, 0, 3.9, 0, 2.5, 0.4, 2);

  // Awning
  g.add(box(5, 0.12, 0.8, awningMat, 0, 2.8, -2.2));
  g.add(box(0.08, 0.4, 0.08, frameMat, -2.4, 2.6, -2.4));
  g.add(box(0.08, 0.4, 0.08, frameMat, 2.4, 2.6, -2.4));

  // Door
  g.add(box(1, 2, 0.1, frameMat, 0, 1, -2.03));

  // Window display
  g.add(box(1.8, 1.5, 0.08, glassMat, -1.6, 1.1, -2.03));
  g.add(box(1.8, 1.5, 0.08, glassMat, 1.6, 1.1, -2.03));

  // Window frames
  g.add(box(1.85, 0.06, 0.05, frameMat, -1.6, 0.4, -2.05));
  g.add(box(1.85, 0.06, 0.05, frameMat, -1.6, 1.8, -2.05));
  g.add(box(1.85, 0.06, 0.05, frameMat, 1.6, 0.4, -2.05));
  g.add(box(1.85, 0.06, 0.05, frameMat, 1.6, 1.8, -2.05));

  // Sign
  const sign = signMesh(signText, 4, 0.7, signBg, signFg, 70);
  sign.position.set(0, 3.2, -2.06);
  sign.rotation.y = Math.PI;
  g.add(sign);

  return result;
}

// ── CafeStorefront ─────────────────────────────────────────────
export function buildCafeStorefront(x: number, z: number, facing: number): BuildResult {
  const result: BuildResult = { group: new THREE.Group(), colliders: [] };
  const g = result.group;
  g.position.set(x, 0, z);
  g.rotation.y = facing;

  const wallMat = std(0xd4a574, 0.8);
  const upperMat = std(0xc4956a, 0.8);
  const frameMat = std(0x4a3a28, 0.6);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xaaccdd, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.6 });
  const awningMat = std(0x8b5e3c, 0.7);

  // Ground floor
  g.add(box(5, 3, 4, wallMat, 0, 1.5, 0));
  addCollider(result, 0, 1.5, 0, 2.5, 1.5, 2);

  // Upper section
  g.add(box(5, 1.2, 4, upperMat, 0, 3.6, 0));
  addCollider(result, 0, 3.6, 0, 2.5, 0.6, 2);

  // Roof
  g.add(box(5.4, 0.2, 4.4, std(0x6b4a32, 0.7), 0, 4.3, 0));

  // Awning
  g.add(box(5, 0.12, 0.9, awningMat, 0, 2.6, -2.3));
  g.add(box(0.08, 0.35, 0.08, frameMat, -2.4, 2.45, -2.5));
  g.add(box(0.08, 0.35, 0.08, frameMat, 2.4, 2.45, -2.5));

  // Door (wooden)
  g.add(box(1, 2.1, 0.1, frameMat, 0, 1.05, -2.03));

  // Windows
  g.add(box(1.6, 1.6, 0.08, glassMat, -1.7, 1.2, -2.03));
  g.add(box(1.6, 1.6, 0.08, glassMat, 1.7, 1.2, -2.03));

  // Window frames
  g.add(box(1.65, 0.06, 0.05, frameMat, -1.7, 0.45, -2.05));
  g.add(box(1.65, 0.06, 0.05, frameMat, -1.7, 1.95, -2.05));
  g.add(box(1.65, 0.06, 0.05, frameMat, 1.7, 0.45, -2.05));
  g.add(box(1.65, 0.06, 0.05, frameMat, 1.7, 1.95, -2.05));

  // Café sign (カフェ)
  const sign = signMesh("カフェ", 4, 0.8, "#3a2a1a", "#f0e0c0", 90);
  sign.position.set(0, 3.1, -2.06);
  sign.rotation.y = Math.PI;
  g.add(sign);

  // Small chalkboard sign by door
  const chalkMat = std(0x2a2a2a, 0.9);
  const chalk = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), chalkMat);
  chalk.position.set(0.8, 0.7, -2.08);
  chalk.rotation.y = Math.PI;
  g.add(chalk);

  // Outdoor table
  const tableTop = box(0.7, 0.06, 0.7, std(0x6b4a32, 0.7), 1.5, 0.75, -2.8);
  g.add(tableTop);
  const tableLeg = box(0.06, 0.75, 0.06, std(0x4a3a28, 0.6), 1.5, 0.375, -2.8);
  g.add(tableLeg);
  addCollider(result, 1.5, 0.375, -2.8, 0.35, 0.375, 0.35);

  return result;
}

// ── KonbiniStorefront ──────────────────────────────────────────
export function buildKonbiniStorefront(x: number, z: number, facing: number): BuildResult {
  const result: BuildResult = { group: new THREE.Group(), colliders: [] };
  const g = result.group;
  g.position.set(x, 0, z);
  g.rotation.y = facing;

  const wallMat = std(0x4a90d9, 0.7);
  const frameMat = std(0x2a4a6a, 0.6);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xaaddff, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.7 });
  const awningMat = std(0x3a7ac0, 0.6);

  // Body
  g.add(box(5, 3.5, 4, wallMat, 0, 1.75, 0));
  addCollider(result, 0, 1.75, 0, 2.5, 1.75, 2);

  // Upper section
  g.add(box(5, 0.6, 4, wallMat, 0, 3.8, 0));

  // Flat roof
  g.add(box(5.3, 0.15, 4.3, std(0x3a6aaa, 0.5), 0, 4.15, 0));

  // Big awning
  g.add(box(5.2, 0.15, 1, awningMat, 0, 2.6, -2.4));
  g.add(box(0.08, 0.5, 0.08, frameMat, -2.5, 2.35, -2.7));
  g.add(box(0.08, 0.5, 0.08, frameMat, 2.5, 2.35, -2.7));

  // Sliding door (glass)
  g.add(box(1.6, 2, 0.08, glassMat, 0, 1, -2.03));
  g.add(box(1.65, 0.06, 0.05, frameMat, 0, 0.05, -2.05));
  g.add(box(1.65, 0.06, 0.05, frameMat, 0, 2.05, -2.05));

  // Window display
  g.add(box(1.6, 1.5, 0.08, glassMat, -1.8, 1.1, -2.03));
  g.add(box(1.65, 0.06, 0.05, frameMat, -1.8, 0.4, -2.05));
  g.add(box(1.65, 0.06, 0.05, frameMat, -1.8, 1.8, -2.05));

  // Sign
  const sign = signMesh("コンビニ", 4, 0.6, "#1a3a6a", "#ffffff", 65);
  sign.position.set(0, 3.2, -2.06);
  sign.rotation.y = Math.PI;
  g.add(sign);

  return result;
}

// ── ApartmentFacade ────────────────────────────────────────────
export function buildApartmentFacade(x: number, z: number, facing: number, color: number): BuildResult {
  const result: BuildResult = { group: new THREE.Group(), colliders: [] };
  const g = result.group;
  g.position.set(x, 0, z);
  g.rotation.y = facing;

  const wallMat = std(color, 0.85);
  const frameMat = std(0x4a4a4e, 0.6);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x88aabb, roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.5 });
  const railMat = std(0x55555a, 0.5);

  // Body
  g.add(box(4, 6, 4, wallMat, 0, 3, 0));
  addCollider(result, 0, 3, 0, 2, 3, 2);

  // Flat roof
  g.add(box(4.2, 0.15, 4.2, std(0x3a3a3e, 0.5), 0, 6.1, 0));

  // Window grid (2x3)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const wx = -1 + col * 2;
      const wy = 1.5 + row * 1.6;
      g.add(box(0.9, 1, 0.08, glassMat, wx, wy, -2.02));
      g.add(box(0.95, 0.05, 0.04, frameMat, wx, wy - 0.5, -2.04));
      g.add(box(0.95, 0.05, 0.04, frameMat, wx, wy + 0.5, -2.04));
    }
  }

  // Balcony railings on each floor
  for (let row = 0; row < 3; row++) {
    const wy = 1.5 + row * 1.6;
    g.add(box(3.5, 0.05, 0.05, railMat, 0, wy - 0.65, -2.06));
    g.add(box(3.5, 0.6, 0.03, railMat, 0, wy - 0.35, -2.08));
  }

  // Entrance
  g.add(box(0.9, 2, 0.1, frameMat, 0, 1, -2.03));

  return result;
}

// ── VendingMachine ─────────────────────────────────────────────
export function buildVendingMachine(x: number, z: number, facing: number): BuildResult {
  const result: BuildResult = { group: new THREE.Group(), colliders: [] };
  const g = result.group;
  g.position.set(x, 0, z);
  g.rotation.y = facing;

  const bodyMat = std(0x2a4a6a, 0.5);
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x4488cc, roughness: 0.2, metalness: 0.4, emissive: 0x224466, emissiveIntensity: 0.3 });
  const slotMat = std(0x1a1a1a, 0.4);

  // Body
  g.add(box(1, 2, 0.8, bodyMat, 0, 1, 0));
  addCollider(result, 0, 1, 0, 0.5, 1, 0.4);

  // Lit front panel
  g.add(box(0.8, 1.4, 0.02, panelMat, 0, 1.2, 0.41));

  // Drink slots (6 small rectangles)
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      g.add(box(0.2, 0.15, 0.02, slotMat, -0.2 + j * 0.4, 1.5 - i * 0.3, 0.43));
    }
  }

  // Coin slot
  g.add(box(0.15, 0.05, 0.02, slotMat, 0, 0.8, 0.43));

  // Dispense slot
  g.add(box(0.6, 0.2, 0.02, slotMat, 0, 0.4, 0.43));

  return result;
}

// ── UtilityPole ─────────────────────────────────────────────────
export function buildUtilityPole(x: number, z: number): BuildResult {
  const result: BuildResult = { group: new THREE.Group(), colliders: [] };
  const g = result.group;
  g.position.set(x, 0, z);

  const poleMat = std(0x6b5a4a, 0.9);

  g.add(box(0.15, 6, 0.15, poleMat, 0, 3, 0));
  addCollider(result, 0, 3, 0, 0.08, 3, 0.08);

  // Crossbar
  g.add(box(1.5, 0.1, 0.1, poleMat, 0, 5.5, 0));

  // Transformer
  g.add(box(0.3, 0.4, 0.3, std(0x55555a, 0.5), 0, 4.5, 0));

  return result;
}

// ── StreetSign ──────────────────────────────────────────────────
export function buildStreetSign(x: number, z: number, facing: number, text: string): BuildResult {
  const result: BuildResult = { group: new THREE.Group(), colliders: [] };
  const g = result.group;
  g.position.set(x, 0, z);
  g.rotation.y = facing;

  const poleMat = std(0x66666a, 0.5);

  g.add(box(0.08, 2.5, 0.08, poleMat, 0, 1.25, 0));
  addCollider(result, 0, 1.25, 0, 0.04, 1.25, 0.04);

  const sign = signMesh(text, 1, 0.4, "#2a4a6a", "#ffffff", 40);
  sign.position.set(0, 2.2, 0.05);
  g.add(sign);

  return result;
}

// ── Planter ──────────────────────────────────────────────────────
export function buildPlanter(x: number, z: number): BuildResult {
  const result: BuildResult = { group: new THREE.Group(), colliders: [] };
  const g = result.group;
  g.position.set(x, 0, z);

  const planterMat = std(0x8a7a6a, 0.8);
  const plantMat = std(0x3a6a3a, 0.8);

  g.add(box(0.8, 0.5, 0.8, planterMat, 0, 0.25, 0));
  addCollider(result, 0, 0.25, 0, 0.4, 0.25, 0.4);

  // Greenery
  const foliage = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), plantMat);
  foliage.position.set(0, 0.7, 0);
  foliage.castShadow = true;
  g.add(foliage);

  return result;
}

// ── Tree ────────────────────────────────────────────────────────
export function buildTree(x: number, z: number): BuildResult {
  const result: BuildResult = { group: new THREE.Group(), colliders: [] };
  const g = result.group;
  g.position.set(x, 0, z);

  const trunkMat = std(0x6b4f3a, 0.9);
  const foliageMat = std(0x3a6a3a, 0.85);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.8, 8), trunkMat);
  trunk.position.set(0, 0.9, 0);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  g.add(trunk);
  addCollider(result, 0, 0.9, 0, 0.09, 0.9, 0.09);

  // Layered foliage (3 spheres for fuller look)
  const f1 = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), foliageMat);
  f1.position.set(0, 2.2, 0);
  f1.castShadow = true;
  f1.receiveShadow = true;
  g.add(f1);

  const f2 = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), foliageMat);
  f2.position.set(0.4, 2.8, 0.2);
  f2.castShadow = true;
  g.add(f2);

  const f3 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), foliageMat);
  f3.position.set(-0.3, 2.6, -0.2);
  f3.castShadow = true;
  g.add(f3);

  return result;
}

// ── Bicycle ──────────────────────────────────────────────────────
export function buildBicycle(x: number, z: number, facing: number): BuildResult {
  const result: BuildResult = { group: new THREE.Group(), colliders: [] };
  const g = result.group;
  g.position.set(x, 0, z);
  g.rotation.y = facing;

  const frameMat = std(0xcc4444, 0.5);
  const tireMat = std(0x111111, 0.6);

  // Wheels
  const wheelGeo = new THREE.TorusGeometry(0.32, 0.04, 6, 16);
  const w1 = new THREE.Mesh(wheelGeo, tireMat);
  w1.position.set(0, 0.32, 0);
  w1.rotation.y = Math.PI / 2;
  w1.castShadow = true;
  g.add(w1);

  const w2 = new THREE.Mesh(wheelGeo, tireMat);
  w2.position.set(0, 0.32, 1);
  w2.rotation.y = Math.PI / 2;
  w2.castShadow = true;
  g.add(w2);

  // Frame bars
  g.add(box(0.04, 0.04, 1, frameMat, 0, 0.5, 0.5));
  g.add(box(0.04, 0.04, 0.5, frameMat, 0, 0.7, 0.3));
  g.add(box(0.04, 0.04, 0.5, frameMat, 0, 0.4, 0.7));

  // Seat
  g.add(box(0.15, 0.05, 0.3, std(0x222222, 0.7), 0, 0.75, 0.9));

  // Handlebars
  g.add(box(0.5, 0.04, 0.04, frameMat, 0, 0.85, 0.05));

  return result;
}

// ── Bench ────────────────────────────────────────────────────────
export function buildBench(x: number, z: number, facing: number): BuildResult {
  const result: BuildResult = { group: new THREE.Group(), colliders: [] };
  const g = result.group;
  g.position.set(x, 0, z);
  g.rotation.y = facing;

  const benchMat = std(0x8a7a6b, 0.8);
  const legMat = std(0x55555a, 0.5);

  // Seat
  g.add(box(1.5, 0.08, 0.45, benchMat, 0, 0.45, 0));
  addCollider(result, 0, 0.45, 0, 0.75, 0.04, 0.225);

  // Backrest
  g.add(box(1.5, 0.5, 0.06, benchMat, 0, 0.7, -0.2));

  // Legs
  g.add(box(0.06, 0.45, 0.4, legMat, -0.65, 0.225, 0));
  g.add(box(0.06, 0.45, 0.4, legMat, 0.65, 0.225, 0));

  return result;
}

export { buildCafeInterior } from './cafeInterior';
