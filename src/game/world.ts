import type { CafeEquipment } from './cafeEquipment';
import * as THREE from "three";
import type { CharacterMotor } from "./physics";
import type { InteractionSystem, Interactable } from "./interaction";
import {
  buildStationFacade, buildJapaneseHouse, buildSmallStorefront,
  buildCafeStorefront, buildKonbiniStorefront, buildApartmentFacade,
  buildVendingMachine, buildUtilityPole, buildStreetSign,
  buildPlanter, buildTree, buildBicycle, buildBench, buildCafeInterior,
  type ColliderDef,
} from "./components";

const COLORS = {
  ground: 0x4a4a4a,
  street: 0x383838,
  sidewalk: 0x777277,
  parkGround: 0x5a8a4a,
  alleyGround: 0x555055,
  sky: 0x87ceeb,
  boundary: 0x3a3a3e,
  houseA: 0xc4a88a,
  houseB: 0xb8a090,
  houseC: 0xd4b8a0,
  apartment: 0xa0a0a8,
};

export const SPAWN_POSITION = new THREE.Vector3(0, 0, 14);
export const SPAWN_YAW = 0;
export const SKY_COLOR = COLORS.sky;

const CAFE_EXTERIOR_POS = new THREE.Vector3(4, 0, 4);
const CAFE_EXTERIOR_FACING = Math.PI;
function applyBuild(
  parent: THREE.Group,
  result: { group: THREE.Group; colliders: ColliderDef[] },
  motor: CharacterMotor,
) {
  parent.add(result.group);
  for (const c of result.colliders) {
    motor.addBoxCollider(c.x, c.y, c.z, c.hw, c.hh, c.hd);
  }
}

function addGround(
  parent: THREE.Group,
  x: number, y: number, z: number,
  w: number, d: number,
  color: number,
) {
  const geo = new THREE.PlaneGeometry(w, d);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  parent.add(mesh);
}

function addBoundaryWall(
  parent: THREE.Group,
  motor: CharacterMotor,
  x: number, y: number, z: number,
  w: number, h: number, d: number,
) {
  const mat = new THREE.MeshStandardMaterial({ color: COLORS.boundary, roughness: 0.8 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  motor.addBoxCollider(x, y, z, w / 2, h / 2, d / 2);
}

export interface WorldData {
  equipment?: CafeEquipment;
  owner?: import('./avatar').Avatar;
  interactables: Interactable[];
  cafeInterior: THREE.Group;
  cafeInteriorColliders: ColliderDef[];
  customerService?: import('./customerService').CustomerService;
}

export function buildWorld(
  scene: THREE.Scene,
  motor: CharacterMotor,
  interaction: InteractionSystem,
): WorldData {
  const root = new THREE.Group();
  root.name = "neighborhood";

  // ── Ground layers (no z-fighting: each at distinct y) ──
  // Base ground (entire area)
  addGround(root, 0, 0, 0, 50, 70, COLORS.ground);
  // Main street (L-shaped, running north-south then bending west)
  addGround(root, 0, 0.02, 0, 5, 30, COLORS.street);
  // Street bend (east-west section)
  addGround(root, -5, 0.02, -12, 20, 5, COLORS.street);
  // Side alley (narrow, branching east)
  addGround(root, 6, 0.02, -12, 8, 4, COLORS.alleyGround);
  // Park path
  addGround(root, -10, 0.02, -18, 6, 8, COLORS.parkGround);
  // Sidewalks (slightly above street)
  addGround(root, 3, 0.04, 0, 1, 30, COLORS.sidewalk);
  addGround(root, -3, 0.04, 0, 1, 30, COLORS.sidewalk);
  addGround(root, 0, 0.04, -14, 20, 1, COLORS.sidewalk);
  addGround(root, -10, 0.04, -15, 1, 6, COLORS.sidewalk);

  // Main ground collider (single solid floor)
  motor.addBoxCollider(0, -0.05, 0, 25, 0.05, 35);

  // ── Boundary walls ──
  addBoundaryWall(root, motor, -25, 3, 0, 1, 6, 70);
  addBoundaryWall(root, motor, 25, 3, 0, 1, 6, 70);
  addBoundaryWall(root, motor, 0, 3, -35, 51, 6, 1);
  addBoundaryWall(root, motor, 0, 3, 35, 51, 6, 1);

  const interactables: Interactable[] = [];

  // ── Café (south side, facing north toward player spawn) ──
  const cafe = buildCafeStorefront(CAFE_EXTERIOR_POS.x, CAFE_EXTERIOR_POS.z, CAFE_EXTERIOR_FACING);
  applyBuild(root, cafe, motor);

  // Café sign interactable
  const cafeSignMesh = cafe.group.children.find(
    (c) => c instanceof THREE.Mesh && c.material instanceof THREE.MeshBasicMaterial,
  ) as THREE.Mesh | undefined;
  if (cafeSignMesh) {
    interactables.push({
      id: "cafe-sign",
      type: "sign",
      prompt: "Café",
      japanesePrompt: "カフェ (kafe)",
      range: 4,
      mesh: cafeSignMesh,
      interact: () => { /* handled by engine */ },
    });
  }

  // Café door interactable (invisible trigger box)
  const doorTrigger = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 2.2, 0.3),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  doorTrigger.position.set(CAFE_EXTERIOR_POS.x, 1.1, CAFE_EXTERIOR_POS.z + 2.1);
  root.add(doorTrigger);
  interactables.push({
    id: "cafe-door",
    type: "door",
    prompt: "Enter",
    japanesePrompt: "入る (hairu)",
    range: 3,
    mesh: doorTrigger,
    interact: () => { /* handled by engine */ },
  });

  // ── Train Station (north end, hidden by bend) ──
  const station = buildStationFacade(0, -28, 0);
  applyBuild(root, station, motor);

  // Station entrance interactable
  const stationTrigger = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2.5, 0.3),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  stationTrigger.position.set(0, 1.25, -25.8);
  root.add(stationTrigger);
  interactables.push({
    id: "station-entrance",
    type: "info",
    prompt: "Station",
    japanesePrompt: "駅 (eki)",
    range: 3,
    mesh: stationTrigger,
    interact: () => { /* handled by engine */ },
  });

  // ── Bookstore (west side of main street, facing east) ──
  const bookstore = buildSmallStorefront(-4, -6, Math.PI / 2, 0x8b6f47, "本屋", "#3a2a1a", "#f0e0c0");
  applyBuild(root, bookstore, motor);
  const bookSign = bookstore.group.children.find(
    (c) => c instanceof THREE.Mesh && c.material instanceof THREE.MeshBasicMaterial,
  ) as THREE.Mesh | undefined;
  if (bookSign) {
    interactables.push({
      id: "bookstore-sign",
      type: "sign",
      prompt: "Bookstore",
      japanesePrompt: "本屋 (honya)",
      range: 4,
      mesh: bookSign,
      interact: () => {},
    });
  }

  // ── Laundromat (east side of alley, facing west) ──
  const laundromat = buildSmallStorefront(9, -12, -Math.PI / 2, 0x4ecdc4, "コインランドリー", "#2a4a4a", "#e0ffff");
  applyBuild(root, laundromat, motor);
  const launSign = laundromat.group.children.find(
    (c) => c instanceof THREE.Mesh && c.material instanceof THREE.MeshBasicMaterial,
  ) as THREE.Mesh | undefined;
  if (launSign) {
    interactables.push({
      id: "laundromat-sign",
      type: "sign",
      prompt: "Laundromat",
      japanesePrompt: "コインランドリー (coin randorii)",
      range: 4,
      mesh: launSign,
      interact: () => {},
    });
  }

  // ── Convenience Store (east side of main street, facing west) ──
  const konbini = buildKonbiniStorefront(4, -6, -Math.PI / 2);
  applyBuild(root, konbini, motor);
  const konbiniSign = konbini.group.children.find(
    (c) => c instanceof THREE.Mesh && c.material instanceof THREE.MeshBasicMaterial,
  ) as THREE.Mesh | undefined;
  if (konbiniSign) {
    interactables.push({
      id: "konbini-sign",
      type: "sign",
      prompt: "Convenience Store",
      japanesePrompt: "コンビニ (konbini)",
      range: 4,
      mesh: konbiniSign,
      interact: () => {},
    });
  }

  // ── Residential Houses (south end, past café) ──
  const house1 = buildJapaneseHouse(-4, 14, 0, COLORS.houseA);
  applyBuild(root, house1, motor);

  const house2 = buildJapaneseHouse(4, 18, Math.PI, COLORS.houseB);
  applyBuild(root, house2, motor);

  const house3 = buildJapaneseHouse(-4, 24, 0, COLORS.houseC);
  applyBuild(root, house3, motor);

  // ── Apartment (alley corner) ──
  const apartment = buildApartmentFacade(9, -6, -Math.PI / 2, COLORS.apartment);
  applyBuild(root, apartment, motor);

  // ── Park (northwest corner) ──
  const parkTree1 = buildTree(-12, -20);
  applyBuild(root, parkTree1, motor);
  const parkTree2 = buildTree(-8, -22);
  applyBuild(root, parkTree2, motor);
  const parkTree3 = buildTree(-10, -16);
  applyBuild(root, parkTree3, motor);

  const parkBench = buildBench(-12, -18, 0);
  applyBuild(root, parkBench, motor);

  const parkBench2 = buildBench(-8, -20, Math.PI / 2);
  applyBuild(root, parkBench2, motor);

  // ── Street trees along main street ──
  const streetTree1 = buildTree(3, 8);
  applyBuild(root, streetTree1, motor);
  const streetTree2 = buildTree(-3, -2);
  applyBuild(root, streetTree2, motor);
  const streetTree3 = buildTree(3, -10);
  applyBuild(root, streetTree3, motor);

  // ── Vending machines (alley corner, facing west) ──
  const vending1 = buildVendingMachine(8.5, -14, -Math.PI / 2);
  applyBuild(root, vending1, motor);
  interactables.push({
    id: "vending-1",
    type: "info",
    prompt: "Vending Machine",
    japanesePrompt: "自販機 (jihanki)",
    range: 2.5,
    mesh: vending1.group,
    interact: () => {},
  });

  const vending2 = buildVendingMachine(8.5, -15.5, -Math.PI / 2);
  applyBuild(root, vending2, motor);

  // ── Utility poles along street edges ──
  const pole1 = buildUtilityPole(-4, 10);
  applyBuild(root, pole1, motor);
  const pole2 = buildUtilityPole(-4, 0);
  applyBuild(root, pole2, motor);
  const pole3 = buildUtilityPole(-4, -10);
  applyBuild(root, pole3, motor);

  // ── Bicycles against buildings ──
  const bike1 = buildBicycle(-3.5, 5.5, 0);
  applyBuild(root, bike1, motor);
  const bike2 = buildBicycle(3.5, -7.5, Math.PI);
  applyBuild(root, bike2, motor);

  // ── Planters outside houses ──
  const planter1 = buildPlanter(-3.5, 14);
  applyBuild(root, planter1, motor);
  const planter2 = buildPlanter(3.5, 18);
  applyBuild(root, planter2, motor);

  // ── Street signs ──
  const sign1 = buildStreetSign(2, 0, -Math.PI / 2, "商店街");
  applyBuild(root, sign1, motor);

  // ── Register all interactables ──
  for (const i of interactables) {
    interaction.register(i);
  }

  // ── Café Interior (hidden, toggled on entry) ──
  const cafeInteriorResult = buildCafeInterior();
  cafeInteriorResult.group.visible = false;
  cafeInteriorResult.group.position.set(100, 0, 100);
  root.add(cafeInteriorResult.group);

  // Interior interactables
  const baristaTrigger = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 1.5, 0.3),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  baristaTrigger.position.set(100.5, 1.5, 97.5);
  root.add(baristaTrigger);
  interactables.push({
    id: "barista",
    type: "dialogue",
    prompt: "Barista",
    japanesePrompt: "バリスタ (barisuta)",
    range: 3,
    mesh: baristaTrigger,
    interact: () => { /* handled by engine */ },
  });
  interaction.register(interactables[interactables.length - 1]);

  // Interior exit door
  const exitTrigger = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 2.2, 0.3),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  exitTrigger.position.set(100, 1.1, 103.4);
  root.add(exitTrigger);
  interactables.push({
    id: "cafe-exit",
    type: "door",
    prompt: "Exit",
    japanesePrompt: "出る (deru)",
    range: 3,
    mesh: exitTrigger,
    interact: () => { /* handled by engine */ },
  });
  interaction.register(interactables[interactables.length - 1]);

  scene.add(root);

  return {
    interactables,
    cafeInterior: cafeInteriorResult.group,
    cafeInteriorColliders: cafeInteriorResult.colliders,
  };
}
