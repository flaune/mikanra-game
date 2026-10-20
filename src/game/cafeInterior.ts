import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeTextTexture } from './textures';
import type { BuildResult } from './components';
import { createAvatar, avatarProfiles } from './avatar';
import type { Avatar } from './avatar';
import { COUNTER_SHIFT, COUNTER_TOP, STATIONS } from './cafeLayout';

/** Original Mikan kissaten: all art is local procedural geometry and canvas work. */
export function buildCafeInterior(): BuildResult & { owner: Avatar } {
  const group = new THREE.Group(); group.name = 'cafeInterior';
  const result: BuildResult = { group, colliders: [] };
  let surface = group;
  let seed = 941;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  function texture(kind: 'wood' | 'wall' | 'leather') {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
    const c = canvas.getContext('2d')!;
    c.fillStyle = kind === 'wood' ? '#6f4932' : kind === 'wall' ? '#b1a184' : '#782b2c';
    c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5000; i++) {
      c.fillStyle = `rgba(${random() > .5 ? '255,227,181' : '13,9,12'},${random() * .1})`;
      c.fillRect(random() * 512, random() * 512, kind === 'wood' ? .5 + random() : 1.5, kind === 'wood' ? 10 + random() * 150 : 1.5);
    }
    if (kind === 'wood') {
      for (let x = 0; x < 512; x += 85) { c.fillStyle = '#30251e'; c.fillRect(x, 0, 2, 512); }
      for (let i = 0; i < 70; i++) {
        const x = random() * 512, y = random() * 512;
        c.strokeStyle = 'rgba(27,16,10,.15)'; c.beginPath();
        c.ellipse(x, y, 3 + random() * 6, 24 + random() * 80, 0, 0, Math.PI * 2); c.stroke();
      }
    }
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 4;
    return map;
  }
  const woodMap = texture('wood');
  const mat = (color: number, roughness = .65, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const m = {
    wood: new THREE.MeshStandardMaterial({ map: woodMap, color: 0xb9a08a, roughness: .46 }),
    floor: new THREE.MeshStandardMaterial({ map: woodMap, color: 0xc6ad8c, roughness: .65 }),
    wall: new THREE.MeshStandardMaterial({ map: texture('wall'), color: 0xded0b2, roughness: .95 }),
    leather: new THREE.MeshStandardMaterial({ map: texture('leather'), color: 0xd19a98, roughness: .46 }),
    trim: mat(0x291c19, .48), black: mat(0x191d20, .5), brass: mat(0xb18c4d, .3, .65),
    cream: mat(0xeee0bb, .26), coffee: mat(0x271910, .24), steel: mat(0xadb5b0, .26, .7),
    burgundy: mat(0x662424, .36), teal: mat(0x395b53), paper: mat(0xd7c1a0),
    green: mat(0x3b5942), leaf: mat(0x73855a), clay: mat(0xa76440),
    glass: new THREE.MeshStandardMaterial({ color: 0x74857b, roughness: .24, metalness: .28 }),
    warm: new THREE.MeshStandardMaterial({ color: 0xffd799, emissive: 0xffa34e, emissiveIntensity: .7, roughness: .6 }),
  };
  function box(x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material, solid = false, radius = 0) {
    const mesh = new THREE.Mesh(radius ? new RoundedBoxGeometry(w, h, d, 2, radius) : new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; surface.add(mesh);
    if (material instanceof THREE.MeshStandardMaterial && material.map) {
      const uv = mesh.geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(w, d) / 1.6, uv.getY(i) * Math.max(h, d) / 1.6);
    }
    if (solid) result.colliders.push({ x, y, z: z + surface.position.z, hw: w / 2, hh: h / 2, hd: d / 2 });
    return mesh;
  }
  function cylinder(x: number, y: number, z: number, r: number, h: number, material: THREE.Material, top = r, segments = 20) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, r, h, segments), material);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; surface.add(mesh); return mesh;
  }
  function sphere(x: number, y: number, z: number, sx: number, sy: number, sz: number, material: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), material);
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; surface.add(mesh); return mesh;
  }
  function rod(a: number[], b: number[], r: number, material: THREE.Material) {
    const from = new THREE.Vector3(...a as [number, number, number]), to = new THREE.Vector3(...b as [number, number, number]);
    const mesh = cylinder(0, 0, 0, r, from.distanceTo(to), material, r, 10);
    mesh.position.copy(from).lerp(to, .5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize());
    return mesh;
  }
  function torus(x: number, y: number, z: number, r: number, tube: number, material: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 24), material); mesh.position.set(x, y, z); surface.add(mesh); return mesh;
  }
  const textMaterials = new Map<string, THREE.MeshBasicMaterial>();
  function text(text: string, x: number, y: number, z: number, w: number, h: number, options: { bg?: string; color?: string; fontSize?: number; yaw?: number } = {}) {
    const key = JSON.stringify([text, w, h, options.bg, options.color, options.fontSize]);
    let material = textMaterials.get(key);
    if (!material) {
      const width = Math.min(1024, Math.max(128, Math.ceil(w * 600 / 128) * 128));
      const map = makeTextTexture(text, { width, height: Math.round(width * h / w), fontSize: (options.fontSize ?? 65) * width / 1024, color: options.color ?? '#eee0bd', background: options.bg ?? '#22332e', padding: 32 * width / 1024, lineHeight: 1.6, verticalCenter: true });
      material = new THREE.MeshBasicMaterial({ map, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }); textMaterials.set(key, material);
    }
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    mesh.position.set(x, y, z); mesh.rotation.y = options.yaw ?? 0; surface.add(mesh); return mesh;
  }
  function cup(x: number, y: number, z: number, material = m.cream) {
    cylinder(x, y + .009, z, .106, .018, material);
    cylinder(x, y + .065, z, .051, .105, material, .068);
    cylinder(x, y + .119, z, .057, .004, m.coffee);
    torus(x + .07, y + .07, z, .035, .009, material);
    rod([x + .07, y + .022, z + .067], [x + .15, y + .022, z + .067], .006, m.brass);
  }
  function plant(x: number, y: number, z: number, scale = 1) {
    cylinder(x, y + .11 * scale, z, .10 * scale, .22 * scale, m.clay, .14 * scale);
    cylinder(x, y + .225 * scale, z, .128 * scale, .008, m.coffee);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4, h = (.25 + (i % 3) * .08) * scale;
      const leaf = sphere(x + Math.cos(a) * .12 * scale, y + h, z + Math.sin(a) * .12 * scale, .055 * scale, .17 * scale, .035 * scale, i % 2 ? m.green : m.leaf);
      leaf.rotation.z = Math.cos(a) * .6;
    }
  }

  // Envelope: raised paneling, narrow floorboards, exposed joists and brass rails.
  box(0, -.04, 0, 7, .08, 7, m.floor);
  box(0, 1.7, 3.5, 7, 3.4, .16, m.wall, true);
  // A real staff doorway, opening into a small pantry beyond the service aisle.
  box(-.75, 1.7, -3.5, 5.5, 3.4, .16, m.wall, true);
  box(3.35, 1.7, -3.5, .3, 3.4, .16, m.wall, true);
  box(2.6, 2.95, -3.5, 1.2, .9, .16, m.wall, true);
  box(2.6, -.04, -4.5, 1.6, .08, 2, m.floor, true);
  box(2.6, 1.7, -5.5, 1.6, 3.4, .16, m.wall, true);
  for (const x of [1.8, 3.4]) box(x, 1.7, -4.5, .12, 3.4, 2, m.wall, true);
  box(2.6, 3.4, -4.5, 1.6, .12, 2, m.wall);
  for (const x of [-3.5, 3.5]) box(x, 1.7, 0, .16, 3.4, 7, m.wall, true);
  box(0, 3.4, 0, 7, .14, 7, m.trim);
  for (let x = -3.4; x <= 3.5; x += .34) box(x, .012, 0, .008, .004, 7, m.trim);
  for (let x = -3.4; x < 3.5; x += .34) for (let z = -3.5 + (Math.round(x * 10) % 3) * .7; z < 3.5; z += 2.1) box(x + .17, .015, z, .34, .003, .007, m.trim);
  for (const x of [-3.38, 3.38]) {
    box(x, .6, 0, .12, 1.2, 6.95, m.wood);
    box(x, 1.23, 0, .17, .09, 6.95, m.trim);
    box(x, .12, 0, .19, .22, 6.95, m.trim);
    for (let z = -3.2; z < 3.5; z += .8) box(x - Math.sign(x) * .08, .64, z, .05, 1.06, .045, m.brass);
  }
  for (const z of [3.38]) {
    box(0, .58, z, 6.9, 1.16, .12, m.wood);
    box(0, 1.2, z, 6.9, .09, .17, m.trim);
    box(0, .1, z, 6.9, .2, .2, m.trim);
  }
  for (const z of [-3.25, -.9, 1.45, 3.25]) box(0, 3.23, z, 7, .25, .19, m.wood);
  for (const x of [-3.28, 3.28]) box(x, 3.23, 0, .18, .24, 7, m.wood);

  // Explicit counter assembly: furniture, tools and collision share its transform.
  const counter = new THREE.Group(); counter.name = 'Service counter';
  counter.position.z = COUNTER_SHIFT; group.add(counter); surface = counter;
  box(-.85, .52, -2.23, 4.6, 1.04, .79, m.wood, true, .04);
  box(-.85, COUNTER_TOP - .07, -2.23, 4.7, .14, .94, m.wood, false, .045);
  box(-.85, .99, -1.755, 4.65, .035, .028, m.brass);
  for (let x = -2.75; x < 1.5; x += .78) {
    box(x, .52, -1.817, .70, .78, .035, m.trim, false, .014);
    box(x, .52, -1.79, .60, .66, .025, m.wood, false, .01);
  }
  rod([-3, .2, -1.57], [1.6, .2, -1.57], .026, m.brass);
  for (const x of [-2.6, -.8, 1.2]) rod([x, .2, -1.57], [x, .2, -1.82], .022, m.brass);
  for (const x of [-2.35, -1.23]) {
    cylinder(x, .7, -1.2, .26, .10, m.leather);
    cylinder(x, .64, -1.2, .25, .055, m.trim);
    for (const dx of [-.15, .15]) for (const dz of [-.15, .15]) rod([x + dx, .64, -1.2 + dz], [x + dx * 1.2, .035, -1.2 + dz * 1.2], .028, m.trim);
    torus(x, .28, -1.2, .2, .015, m.brass).rotation.x = Math.PI / 2;
    result.colliders.push({ x, y: .36, z: -1.2 + COUNTER_SHIFT, hw: .25, hh: .36, hd: .25 });
  }

  surface = group;
  // A restrained back shelf keeps the preparation surface readable.
  box(-.65, .54, -3.12, 5.4, 1.08, .54, m.trim);
  box(-.65, 1.12, -3.1, 5.45, .07, .59, m.wood);
  box(-1.63, 2.13, -3.37, 3.42, 1.86, .1, m.trim);
  for (const y of [1.39, 1.96, 2.53, 3.03]) {
    box(-1.63, y, -3.13, 3.46, .065, .51, m.wood);
    box(-1.63, y + .04, -2.87, 3.44, .025, .027, m.brass);
  }
  for (const x of [-3.32, .06]) box(x, 2.2, -3.12, .075, 1.65, .5, m.wood);
  const jarColors = [m.glass, m.coffee, m.teal];
  for (let row = 0; row < 3; row++) for (let i = 0; i < 5; i++) {
    const x = -3.02 + i * .64, y = 1.44 + row * .56, z = -3.04;
    const h = .24 + ((i + row) % 3) * .045;
    cylinder(x, y + h / 2, z, .115, h, jarColors[(i + row) % 3]);
    cylinder(x, y + h + .018, z, .12, .04, m.brass);
    box(x, y + h * .52, z + .111, .16, .115, .008, m.paper);
    text(['深煎り', 'MIKAN', 'BLEND', '珈琲'][i % 4], x, y + h * .52, z + .117, .14, .067, { bg: '#d7c1a0', color: '#3b3026', fontSize: 125 });
  }
  // Menu faces into the room, with enough resolution to read from the counter.
  box(1.10, 2.32, -3.32, 1.74, 1.49, .08, m.wood, false, .015);
  const menu = text('喫茶 みかん\nコーヒー  ·  450円\nお茶  ·  350円\nお水  ·  無料\nCOFFEE & A LITTLE JAZZ', 1.10, 2.32, -3.245, 1.58, 1.33, { fontSize: 68 });
  menu.name = 'cafe-menu'; menu.userData.keep = true;
  box(1.10, 1.62, -3.2, 1.7, .04, .21, m.wood);
  for (const x of [.5, .63, .78]) cylinder(x, 1.67, -3.16, .018, .08, m.cream);
  text('自家焙煎  /  EST. 1986', -.8, 3.07, -3.235, 2.6, .18, { bg: '#291c19', color: '#bd9b61', fontSize: 60 });

  // Espresso machine faces the staff aisle; its buttons and spouts remain reachable.
  const machine = new THREE.Group();machine.name='Espresso machine';
  machine.position.set(STATIONS.coffee[0],0,STATIONS.coffee[1]+.3);group.add(machine);surface=machine;
  const machineStart = machine.children.length;
  // Espresso machine, drip tray, gauges, steam wand and grinder.
  box(-2.12, 1.42, -2.24, .95, .57, .49, m.burgundy, false, .07);
  box(-2.12, 1.43, -1.982, .88, .36, .035, m.steel, false, .015);
  box(-2.12, 1.18, -1.91, .96, .035, .25, m.black);
  for (let i = 0; i < 12; i++) box(-2.53 + i * .074, 1.204, -1.91, .008, .006, .2, m.steel);
  for (const x of [-2.34, -1.97]) {
    cylinder(x, 1.34, -1.94, .072, .1, m.steel);
    rod([x, 1.32, -1.94], [x, 1.32, -1.77], .018, m.black);
    const dial = cylinder(x, 1.55, -1.953, .06, .025, m.cream); dial.rotation.x = Math.PI / 2;
    torus(x, 1.55, -1.933, .055, .005, m.brass);
    rod([x, 1.55, -1.927], [x + .018, 1.58, -1.927], .003, m.black);
  }
  rod([-1.72, 1.44, -1.98], [-1.65, 1.30, -1.85], .009, m.steel);
  for (const x of [-2.4, -2.17, -1.94]) cylinder(x, 1.755, -2.20, .067, .085, m.cream, .051);
  for (const part of machine.children.slice(machineStart)) { part.position.x = -2.12 - part.position.x; part.position.z = -2.24 - part.position.z; part.rotateY(Math.PI); }
  surface = group;
  box(STATIONS.grinder[0], 1.29, STATIONS.grinder[1], .26, .29, .3, m.black, false, .025);
  cylinder(STATIONS.grinder[0], 1.59, STATIONS.grinder[1], .11, .3, m.glass, .17);
  cylinder(STATIONS.grinder[0], 1.75, STATIONS.grinder[1], .175, .028, m.black);
  surface = group;
  // A supported side worktop for washing, outside the staff passage.
  box(3.04, .53, -2.25, .68, 1.06, 1.4, m.wood, true, .025);
  box(3.04, COUNTER_TOP - .04, -2.25, .72, .08, 1.44, m.cream, false, .025);

  // Booths against the left wall; central aisle remains more than a metre wide.
  for (const z of [.12, 2.05]) {
    box(-3.03, .28, z, .69, .53, 1.58, m.trim, true, .04);
    box(-3.0, .56, z, .69, .18, 1.59, m.leather, false, .065);
    box(-3.25, 1.02, z, .19, .9, 1.61, m.leather, false, .075);
    for (const zz of [-.57, -.19, .19, .57]) for (const y of [.85, 1.17]) sphere(-3.145, y, z + zz, .014, .024, .024, m.burgundy);
    for (const zz of [-.84, .84]) box(-3.02, .83, z + zz, .74, .09, .095, m.wood, false, .025);
    box(-2.02, .77, z, 1.12, .11, 1.28, m.wood, false, .045);
    cylinder(-2.02, .37, z, .065, .74, m.black);
    box(-2.02, .055, z, .63, .09, .84, m.black, false, .025);
    result.colliders.push({ x: -2.02, y: .42, z, hw: .56, hh: .42, hd: .64 });
    cup(-2.16, .83, z + .22);
    box(-1.85, .837, z - .24, .23, .015, .32, m.paper);
    box(-2.28, .93, z - .38, .12, .2, .1, m.wood);
    plant(-2.16, .83, z - .43, .55);
  }
  // Right-hand reading corner, bookshelf and a small two-seat table.
  box(3.08, .35, 1.88, .64, .69, 1.77, m.trim, true, .03);
  box(3.08, .56, 1.88, .68, .18, 1.76, m.leather, false, .06);
  box(3.29, 1.02, 1.88, .17, .88, 1.78, m.leather, false, .05);
  for (const z of [1.25, 1.67, 2.09, 2.51]) sphere(3.19, 1.03, z, .02, .025, .025, m.burgundy);
  box(2.14, .77, 1.88, 1.05, .11, 1.12, m.wood, true, .04);
  cylinder(2.14, .38, 1.88, .055, .7, m.black);
  cylinder(2.14, .06, 1.88, .32, .05, m.black);
  cup(2.2, .83, 2.1); box(2.02, .845, 1.62, .32, .024, .4, m.teal);
  text('喫茶日和', 2.022, .87, 1.62, .27, .35, { bg: '#395b53', fontSize: 175 }).rotation.x = -Math.PI / 2;
  box(3.36, .85, -.35, .065, 1.7, 1.7, m.trim);
  for (const z of [-1.2, .5]) box(3.02, .85, z, .67, 1.7, .065, m.wood);
  result.colliders.push({ x: 3.05, y: .85, z: -.35, hw: .32, hh: .85, hd: .85 });
  for (const y of [.12, .63, 1.15, 1.68]) box(3.02, y, -.35, .67, .06, 1.73, m.wood);
  const bookMaterials = [m.teal, m.burgundy, m.paper, m.clay];
  for (let row = 0; row < 3; row++) for (let i = 0; i < 10; i++) {
    const z = -1.05 + i * .145, h = .29 + random() * .12;
    box(2.91, .16 + row * .51 + h / 2, z, .35, h, .075 + random() * .04, bookMaterials[(i + row) % 4]);
    box(2.73, .21 + row * .51, z, .008, .02, .065, m.brass);
  }
  plant(3.02, 1.73, -.83, 1.1);
  // Record player and vinyl sleeve, paired with bespoke in-world wall art.
  box(2.99, 1.75, .18, .45, .1, .45, m.wood, false, .02);
  cylinder(2.98, 1.812, .18, .18, .012, m.black);
  cylinder(2.98, 1.821, .18, .052, .006, m.burgundy);
  rod([3.17, 1.84, .32], [2.99, 1.84, .18], .006, m.brass);

  function poster(x: number, y: number, z: number, yaw: number, jazz: boolean) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 640;
    const c = canvas.getContext('2d')!;
    c.fillStyle = jazz ? '#233c3b' : '#d2ba88'; c.fillRect(0, 0, 512, 640);
    c.fillStyle = jazz ? '#b65c3a' : '#ba6d35'; c.beginPath(); c.arc(275, 263, 153, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#e9d4a4'; c.lineWidth = 5;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(250, 278, 70 + i * 18, .2, 5.1); c.stroke(); }
    c.fillStyle = '#132624';
    if (jazz) {
      c.lineWidth = 35; c.strokeStyle = '#132624'; c.beginPath(); c.moveTo(297, 161); c.lineTo(279, 211); c.lineTo(317, 363); c.quadraticCurveTo(323, 424, 258, 425); c.quadraticCurveTo(204, 427, 197, 377); c.stroke();
      c.beginPath(); c.moveTo(170, 345); c.lineTo(230, 345); c.lineTo(211, 390); c.lineTo(190, 390); c.closePath(); c.fill();
      c.fillStyle = '#e9d4a4'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(290 + i * 5, 238 + i * 24, 5, 0, Math.PI * 2); c.fill(); }
    } else {
      c.fillRect(190, 235, 123, 147);
      c.lineWidth = 18; c.strokeStyle = '#132624'; c.beginPath(); c.arc(312, 284, 39, -Math.PI / 2, Math.PI / 2); c.stroke();
    }
    c.fillStyle = '#e9d4a4'; c.font = 'bold 72px Georgia'; c.textAlign = 'center'; c.fillText(jazz ? 'AFTER HOURS' : 'MIKAN', 256, 100, 455);
    c.font = '26px Georgia'; c.fillText(jazz ? 'COFFEE  /  RECORDS  /  FRIENDS' : 'A LITTLE CUP OF TOKYO', 256, 516, 450);
    c.font = 'bold 37px "Noto Sans JP"'; c.fillText(jazz ? '土曜日のジャズ' : '珈琲と、いい時間。', 256, 578);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    const frame = box(x, y, z, .92, 1.15, .06, m.trim); frame.rotation.y = yaw;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(.83, 1.06), new THREE.MeshBasicMaterial({ map }));
    mesh.rotation.y = yaw; mesh.position.set(x + Math.sin(yaw) * .037, y, z + Math.cos(yaw) * .037); group.add(mesh);
  }
  poster(-3.29, 2.27, .06, Math.PI / 2, false);
  poster(-3.29, 2.27, 2.02, Math.PI / 2, true);
  poster(3.29, 2.42, -.38, -Math.PI / 2, true);

  // Leaded, amber street windows. Painted distant silhouettes suggest the lane.
  const windowCanvas = document.createElement('canvas'); windowCanvas.width = 512; windowCanvas.height = 768;
  const wc = windowCanvas.getContext('2d')!;
  const sky = wc.createLinearGradient(0, 0, 0, 768); sky.addColorStop(0, '#626d6d'); sky.addColorStop(.55, '#c99b6b'); sky.addColorStop(1, '#605244');
  wc.fillStyle = sky; wc.fillRect(0, 0, 512, 768);
  for (let i = 0; i < 6; i++) {
    wc.fillStyle = i % 2 ? '#454d48' : '#52534a'; const h = 140 + random() * 190;
    wc.fillRect(i * 100 - 25, 450 - h, 95, h + 400);
    wc.fillStyle = '#d5ab6c'; for (let y = 310; y < 620; y += 90) wc.fillRect(i * 100 + 10, y, 32, 46);
  }
  const windowMap = new THREE.CanvasTexture(windowCanvas); windowMap.colorSpace = THREE.SRGBColorSpace;
  const windowMaterial = new THREE.MeshStandardMaterial({ map: windowMap, emissiveMap: windowMap, emissive: 0xffffff, emissiveIntensity: .55, roughness: .38 });
  for (const x of [-2.03, 2.03]) {
    box(x, 2.06, 3.28, 1.74, 1.87, .13, m.trim);
    box(x, 2.06, 3.20, 1.54, 1.68, .025, windowMaterial);
    for (const dx of [-.52, 0, .52]) box(x + dx, 2.06, 3.17, .035, 1.7, .045, m.brass);
    for (const y of [1.58, 2.29]) box(x, y, 3.17, 1.57, .04, .05, m.trim);
    box(x, 1.14, 3.14, 1.93, .085, .4, m.wood);
    box(x, 2.96, 3.15, 1.87, .15, .20, m.wood);
  }
  plant(-2.68, 1.19, 3.1, .7);
  // Entry portal is aligned with the existing exit trigger at local z = 3.25.
  box(0, 1.29, 3.32, 1.21, 2.58, .12, m.trim);
  box(0, 1.27, 3.24, 1.02, 2.42, .06, m.wood);
  box(0, 1.67, 3.195, .72, 1.29, .025, windowMaterial);
  for (const x of [-.25, 0, .25]) box(x, 1.67, 3.17, .024, 1.3, .025, m.trim);
  rod([-.38, .95, 3.16], [-.38, 1.22, 3.16], .021, m.brass);
  text('またのお越しを\nSEE YOU SOON', 0, 1.57, 3.145, .62, .24, { yaw: Math.PI, bg: '#d2bc91', color: '#3d3026', fontSize: 60 });
  box(0, .009, 2.76, 1.37, .014, .59, m.teal);
  // Back service door, framed clock, wall hooks and small utility details.
  for (const x of [1.96, 3.24]) box(x, 1.19, -3.34, .08, 2.38, .14, m.trim);
  box(2.6, 2.4, -3.34, 1.36, .1, .14, m.trim);
  // The open door rests along the pantry wall; no invisible barrier across it.
  box(3.23, 1.16, -3.95, .08, 2.28, 1.08, m.wood);
  text('STAFF / スタッフ', 2.6, 2.58, -3.39, 1.05, .15, { fontSize: 85, bg: '#f1eddc', color: '#4c6955' });
  box(2.6, .52, -5.22, 1.25, 1.04, .35, m.wood, true);
  text('APRON & SUPPLIES', 2.6, 1.8, -5.39, 1.15, .2, { fontSize: 65, bg: '#eee2ca', color: '#52604f' });
  const pantryLight = new THREE.PointLight(0xffeed2, 12, 4, 2); pantryLight.position.set(2.6, 2.7, -4.4); group.add(pantryLight);
  const clock = cylinder(2.6, 2.89, -3.28, .28, .06, m.brass, .28, 32); clock.rotation.x = Math.PI / 2;
  const clockFace = cylinder(2.6, 2.89, -3.239, .247, .012, m.cream, .247, 32); clockFace.rotation.x = Math.PI / 2;
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; sphere(2.6 + Math.sin(a) * .208, 2.89 + Math.cos(a) * .208, -3.225, .01, .01, .007, m.trim); }
  rod([2.6, 2.89, -3.22], [2.47, 2.96, -3.22], .012, m.trim);
  rod([2.6, 2.89, -3.215], [2.61, 3.07, -3.215], .008, m.trim);

  // The owner uses the same original avatar proportions as the regulars.
  const haru = createAvatar(avatarProfiles.haru);
  haru.group.name = 'Haru';
  haru.group.position.set(1.2, 0, 2.75);
  haru.group.rotation.y = -.8;
  haru.setExpression('happy');
  group.add(haru.group);

  // Pendants: segmented colored glass with dark lead lines, warm emissive interiors.
  const lampColors = [0xdaa64e, 0x6b8c77, 0x9c573c, 0xe0b86e];
  const lampMats = lampColors.map(color => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .42, roughness: .55, side: THREE.DoubleSide }));
  function pendant(x: number, z: number, stained: boolean) {
    const y = stained ? 2.45 : 2.71, radius = stained ? .35 : .22;
    cylinder(x, 3.16, z, .09, .06, m.black);
    rod([x, 3.13, z], [x, y + .22, z], .012, m.black);
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6, b = (i + 1) * Math.PI / 6;
      const vertices = [x + Math.cos(a) * radius, y, z + Math.sin(a) * radius, x + Math.cos(b) * radius, y, z + Math.sin(b) * radius, x + Math.cos(b) * .075, y + .25, z + Math.sin(b) * .075, x + Math.cos(a) * .075, y + .25, z + Math.sin(a) * .075];
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex([0, 1, 2, 0, 2, 3]); geometry.computeVertexNormals();
      // Match standard geometry attributes for material batching.
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
      group.add(new THREE.Mesh(geometry, stained ? lampMats[i % 4] : m.brass));
      rod([vertices[0], y, vertices[2]], [vertices[9], y + .25, vertices[11]], .007, m.black);
    }
    torus(x, y, z, radius, .012, m.black).rotation.x = Math.PI / 2;
    cylinder(x, y + .01, z, radius * .93, .012, m.warm);
    if (stained) { const light = new THREE.PointLight(0xffbc73, 7, 4, 2); light.position.set(x, y - .09, z); group.add(light); }
  }
  for (const x of [-2.25, -.7, .85]) pendant(x, -1.95, false);
  pendant(-2.02, .12, true); pendant(-2.02, 2.05, true); pendant(2.14, 1.88, true);
  // Local lighting replaces exterior sun while inside; one shadowed key light.
  group.add(new THREE.HemisphereLight(0xfff0df, 0x737e72, 1.45));
  const fill = new THREE.PointLight(0xffd6a6, 18, 8, 2); fill.position.set(-.4, 2.8, -.8); group.add(fill);
  const key = new THREE.SpotLight(0xffd09a, 38, 9, 1.03, .65, 2);
  key.position.set(-.4, 3.05, -1.55); key.target.position.set(-.4, .1, -2.7);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.00015; key.shadow.normalBias = .025;
  key.shadow.camera.near = .2; key.shadow.camera.far = 10; group.add(key, key.target);
  // Broad soft counter fill keeps graphic faces readable without another shadow pass.
  const portrait = new THREE.DirectionalLight(0xfff3e5, 1.15);
  portrait.position.set(1.0, 2.6, -3.1); portrait.target.position.set(1.4, 1.5, -1.15);
  group.add(portrait, portrait.target);
  const front = new THREE.PointLight(0xb5c9cb, 8, 7, 2); front.position.set(.1, 2.3, 2.95); group.add(front);

  // Merge static geometry per material. Colliders remain deliberately simple.
  group.updateMatrixWorld(true);
  const batches = new Map<THREE.Material, { pieces: THREE.BufferGeometry[]; meshes: THREE.Mesh[] }>();
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material) || object.material.transparent || object.userData.keep) return;
    const batch = batches.get(object.material) ?? { pieces: [], meshes: [] };
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    // RoundedBoxGeometry carries the same position/normal/UV layout as primitives.
    geometry.applyMatrix4(object.matrixWorld); batch.pieces.push(geometry); batch.meshes.push(object); batches.set(object.material, batch);
  });
  const old = new Set<THREE.BufferGeometry>();
  for (const [material, batch] of batches) {
    const geometry = mergeGeometries(batch.pieces);
    if (geometry) {
      const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
      for (const original of batch.meshes) { old.add(original.geometry); original.removeFromParent(); }
    }
    batch.pieces.forEach(piece => piece.dispose());
  }
  old.forEach(geometry => geometry.dispose());
  return { ...result, owner: haru };
}
