import * as THREE from 'three';
import { disposeScene } from './resources';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** A small, original train set. Scenery moves past a stationary carriage. */
export class TrainJourney {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(43, 1, .1, 240);
  private readonly cameraHeight = 1.8;
  private moving: { object: THREE.Object3D; speed: number }[] = [];
  private straps: THREE.Group[] = [];
  private time = 0;
  private arrival = -1;
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private sun = new THREE.DirectionalLight(0xffe8ac, 3.2);
  private audio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private rumble: GainNode | null = null;
  private materials = new Map<number, THREE.MeshToonMaterial>();

  constructor() {
    this.scene.background = new THREE.Color(0x9bd8de);
    this.scene.fog = new THREE.Fog(0xb6ded1, 65, 190);
    this.scene.add(new THREE.HemisphereLight(0xe4faff, 0x37566c, 2.6));
    this.sun.position.set(-8, 16, -12);
    this.scene.add(this.sun);
    this.camera.position.set(2.8, this.cameraHeight, 2.7);
    this.camera.lookAt(0, 1.85, -2.5);

    const wall = 0xe1decb, trim = 0x283d51, steel = 0x9bafaa;
    this.box(0, -.12, 1, 30, .2, 10, 0x365062);
    for (let i = -8; i <= 8; i++) this.box(i, -.012, 1, .018, .01, 10, 0x567282);
    this.box(0, 3.85, 1, 30, .2, 10, wall);
    this.box(0, .62, -2.7, 30, 1.2, .2, wall);
    this.box(0, 3.42, -2.7, 30, .8, .2, wall);
    this.box(0, 1.16, -2.55, 30, .09, .25, steel);
    this.box(0, 3.06, -2.55, 30, .1, .25, steel);

    // Close the carriage at both ends, including the unframed window gaps.
    // Wider screens should see a finished vestibule rather than the outdoors.
    for (const side of [-1, 1]) {
      const end = side * 10.55;
      const face = end - side * .12;
      this.box(end, 1.88, 1.6, .2, 3.76, 8.6, wall);
      this.box(side * 12.85, 2.15, -2.7, 4.3, 1.9, .2, wall);
      this.box(face, .16, 1.6, .06, .3, 8.6, trim);
      this.box(face, 1.42, 1.2, .08, 2.84, 1.65, trim);
      this.box(face - side * .05, 1.42, 1.2, .06, 2.7, 1.48, steel);
      for (const z of [.8, 1.6]) {
        this.box(face - side * .09, 1.94, z, .035, 1.08, .57, trim);
        this.box(face - side * .12, 1.94, z, .025, .94, .44, 0x486c75);
      }
      this.box(face - side * .09, 1.42, 1.2, .04, 2.7, .025, trim);
      this.box(face - side * .1, 1.1, 1.08, .045, .22, .045, 0xe9e1c5);
      this.box(face - side * .1, 1.1, 1.32, .045, .22, .045, 0xe9e1c5);
    }

    for (const x of [-10.4, -6.7, -3, .7, 4.4, 8.1]) {
      this.box(x, 2.15, -2.65, .3, 1.9, .25, wall);
      this.box(x + .18, 2.13, -2.57, .06, 1.77, .08, trim);
      this.box(x + 3.48, 2.13, -2.57, .06, 1.77, .08, trim);
      this.box(x + 1.82, 1.25, -2.56, 3.35, .055, .09, trim);
      this.box(x + 1.82, 3.01, -2.56, 3.35, .055, .09, trim);
      // A thin upper pane and latch make the windows read as train windows.
      this.box(x + 1.82, 2.82, -2.55, 3.35, .025, .045, steel);
      this.box(x + 1.82, 2.83, -2.5, .19, .05, .04, trim);
      this.box(x, 2.18, -2.42, .16, .3, .03, 0xf3efe2);
      this.box(x, 2.26, -2.39, .12, .055, .02, 0xe1a33f);
    }

    // Upholstery, individual cushions, seat dividers, and a dark plinth.
    this.box(0, .3, -1.99, 15, .55, 1.1, trim);
    for (let i = -9; i <= 9; i++) {
      const x = i * .77;
      this.box(x, .62, -1.87, .74, .21, 1.05, i % 3 === 0 ? 0x236d7d : 0x286377);
      const back = this.box(x, .96, -2.32, .74, .72, .18, 0x246177);
      back.rotation.x = -.09;
      this.box(x, 1.22, -2.21, .67, .025, .012, 0x478293);
    }
    for (const x of [-5.5, -.9, 3.75, 7.7]) {
      this.rod([x, .67, -1.37], [x, 3.73, -1.37], .027, steel);
      this.rod([x, .88, -2.35], [x, .88, -1.4], .027, steel);
    }
    this.rod([-9, 3.47, -.98], [9, 3.47, -.98], .03, steel);
    this.box(0, 3.7, -.2, 16, .035, .19, 0xfff8d3);
    // Luggage rack and slats above the windows.
    this.box(0, 3.28, -2.01, 18, .04, .75, steel);
    for (let i = -35; i <= 35; i++) this.box(i * .25, 3.335, -2.01, .025, .025, .75, trim);
    for (let i = -7; i < 9; i++) {
      const strap = new THREE.Group();
      strap.position.set(i * .92, 3.46, -.98);
      strap.add(this.localBox(0, -.2, 0, .035, .4, .025, 0xe9e1c5));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.115, .018, 5, 16), this.mat(0xf1e6cd));
      ring.position.y = -.49; strap.add(ring);
      this.scene.add(strap); this.straps.push(strap);
    }
    this.sign('次は 渋谷   /   SHIBUYA', 2.5, 3.47, -2.55, 2.8, .28, '#142c2d', '#f2c764');
    this.sign('みかんら鉄道   MIKANRA RAIL', -3.4, 3.48, -2.55, 2.7, .27, '#d8d3b9', '#2b4551');
    this.sign('A NEW DAY\nA NEW WORD.', 5.9, 3.45, -2.53, 1, .4, '#b54d39', '#fff7db');

    // Suitcase sits above the cushion; attached straps remain outside its front face.
    const bag = new THREE.Group(); bag.name = 'Travel bag'; bag.position.set(1.25, .75, -1.85);
    bag.add(this.localBox(0, .29, 0, .75, .56, .48, 0xac683d));
    bag.add(this.localBox(0, .59, 0, .77, .06, .5, 0xd29b5d));
    for (const x of [-.22, .22]) bag.add(this.localBox(x, .29, .27, .055, .55, .04, 0x463d35));
    bag.add(this.localBox(-.17, .7, 0, .05, .18, .05, trim));
    bag.add(this.localBox(0, .79, 0, .39, .05, .05, trim));
    bag.add(this.localBox(.17, .7, 0, .05, .18, .05, trim));
    this.scene.add(bag);

    this.box(0, -2.1, -70, 380, .3, 150, 0x87b974);
    this.box(0, -1.91, -35, 380, .08, 9, 0x79c2c0);
    // Layered, faceted mountain silhouettes beyond the fields.
    for (let i = 0; i < 15; i++) {
      const mountain = new THREE.Mesh(new THREE.ConeGeometry(24 + (i % 4) * 5, 17 + (i % 3) * 7, 5), this.mat(i % 2 ? 0x709f92 : 0x80b3a2));
      mountain.position.set(i * 25 - 170, 3, -110 - (i % 3) * 9);
      mountain.scale.z = .6; this.scene.add(mountain);
      this.moving.push({ object: mountain, speed: .6 });
    }
    for (let i = 0; i < 28; i++) {
      const x = i * 7 - 95;
      const tree = new THREE.Group();
      tree.position.set(x, -1.8, -9 - (i % 4) * 5);
      tree.add(this.localBox(0, 1, 0, .25, 2, .25, 0x5a6850));
      for (let j = 0; j < 3; j++) {
        const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.55, 0), this.mat([0x497e5c, 0x629a60, 0x83af65][j]));
        crown.position.set((j - 1) * .65, 2.2 + (j % 2) * .7, 0);
        crown.scale.set(1, 1.2, .85); tree.add(crown);
      }
      this.scene.add(tree); this.moving.push({ object: tree, speed: 8 });
      if (i % 3 === 0) {
        const house = new THREE.Group(); house.position.set(x + 3, -1.8, -22);
        house.add(this.localBox(0, 1.1, 0, 3.8, 2.2, 3, 0xe5d5b2));
        const roof = new THREE.Mesh(new THREE.ConeGeometry(3, 1.3, 4), this.mat(0x546f77));
        roof.rotation.y = Math.PI / 4; roof.scale.z = .8; roof.position.y = 2.85; house.add(roof);
        for (const wx of [-1, 1]) house.add(this.localBox(wx, 1.3, 1.51, .7, .8, .025, 0x477883));
        this.scene.add(house); this.moving.push({ object: house, speed: 8 });
      }
    }
    for (let i = 0; i < 7; i++) {
      const pole = new THREE.Group(); pole.position.set(i * 28 - 100, 0, -5.8);
      pole.add(this.localBox(0, 1.5, 0, .14, 9, .14, 0x426467));
      pole.add(this.localBox(0, 5.3, 0, 3.4, .12, .12, 0x426467));
      this.scene.add(pole); this.moving.push({ object: pole, speed: 8 });
    }
    for (let i = 0; i < 13; i++) {
      const cloud = new THREE.Mesh(new THREE.IcosahedronGeometry(5, 1), this.mat(0xe8f5dc));
      cloud.position.set(i * 22 - 120, 16 + (i % 3) * 5, -90);
      cloud.scale.set(2.5, .25, .7); this.scene.add(cloud);
      this.moving.push({ object: cloud, speed: .35 });
    }
    // Only stationary carriage meshes are merged. Moving scenery and straps
    // keep their own transforms; the street renderer is not used during the trip.
    const moving = new Set(this.moving.map(item => item.object));
    const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
    for (const object of [...this.scene.children]) {
      if (!(object instanceof THREE.Mesh) || moving.has(object) || Array.isArray(object.material)) continue;
      object.updateMatrix();
      const geometry = object.geometry.clone().applyMatrix4(object.matrix);
      const batch = batches.get(object.material) ?? [];
      batch.push(geometry); batches.set(object.material, batch);
      object.geometry.dispose(); this.scene.remove(object);
    }
    for (const [material, geometries] of batches) {
      const merged = mergeGeometries(geometries);
      if (merged) this.scene.add(new THREE.Mesh(merged, material));
      geometries.forEach(geometry => geometry.dispose());
    }
  }

  private mat(color: number) {
    if (!this.materials.has(color)) this.materials.set(color, new THREE.MeshToonMaterial({ color }));
    return this.materials.get(color)!;
  }
  private localBox(x: number, y: number, z: number, w: number, h: number, d: number, color: number) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.mat(color));
    mesh.position.set(x, y, z); return mesh;
  }
  private box(x: number, y: number, z: number, w: number, h: number, d: number, color: number) {
    const mesh = this.localBox(x, y, z, w, h, d, color); this.scene.add(mesh); return mesh;
  }
  private rod(a: number[], b: number[], r: number, color: number) {
    const from = new THREE.Vector3(...a as [number, number, number]);
    const to = new THREE.Vector3(...b as [number, number, number]);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, from.distanceTo(to), 8), this.mat(color));
    mesh.position.copy(from).lerp(to, .5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize());
    this.scene.add(mesh);
  }
  private sign(text: string, x: number, y: number, z: number, w: number, h: number, bg: string, fg: string) {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 192;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = fg; ctx.font = 'bold 66px "Noto Sans JP", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lines = text.split('\n'); lines.forEach((line, i) => ctx.fillText(line, 512, 96 + (i - (lines.length - 1) / 2) * 76));
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture }));
    mesh.position.set(x, y, z); this.scene.add(mesh);
  }

  beginArrival(muted: boolean) {
    if (this.arrival >= 0) return;
    this.arrival = 0;
    if (muted) return;
    // Original procedural arrival sound; subtitles carry the station information.
    this.audio = new Audio(`${import.meta.env.BASE_URL}audio/arrival.mp3`);
    this.audio.volume = .8;
    void this.audio.play().catch(() => { /* Subtitles remain available if audio is blocked. */ });
    try {
      this.audioContext = new AudioContext();
      const ctx = this.audioContext;
      void ctx.resume().catch(() => {});
      this.rumble = ctx.createGain(); this.rumble.gain.value = .025; this.rumble.connect(ctx.destination);
      const motor = ctx.createOscillator(); motor.type = 'triangle'; motor.frequency.setValueAtTime(65, ctx.currentTime);
      motor.frequency.exponentialRampToValueAtTime(24, ctx.currentTime + 7);
      motor.connect(this.rumble); motor.start(); motor.stop(ctx.currentTime + 8);
      this.rumble.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + 8);
    } catch { /* Audio is optional; arrival and subtitles do not depend on it. */ }
  }
  get arriving() { return this.arrival >= 0; }
  setHidden(hidden: boolean) {
    if (hidden) { this.audio?.pause(); void this.audioContext?.suspend().catch(() => {}); }
    else { if (this.audio) void this.audio.play().catch(() => {}); void this.audioContext?.resume().catch(() => {}); }
  }
  update(dt: number) {
    this.time += dt;
    if (this.arrival >= 0) this.arrival += dt;
    const speed = this.arrival < 0 ? 1 : Math.pow(Math.max(0, 1 - this.arrival / 7), 1.7);
    if (!this.reducedMotion) {
      for (const { object, speed: rate } of this.moving) {
        object.position.x += rate * dt * speed;
        if (object.position.x > 105) object.position.x -= 210;
      }
      this.camera.position.y = this.cameraHeight + Math.sin(this.time * 2.7) * .009 * speed;
      this.camera.rotation.z = Math.sin(this.time * 1.8) * .0018 * speed;
      this.straps.forEach((strap, i) => { strap.rotation.z = Math.sin(this.time * 2.2 + i * .12) * .025 * speed; });
    }
    this.sun.intensity = this.arrival < 0 ? 3.2 : 3.2 * (1 - THREE.MathUtils.smoothstep(this.arrival, 10, 13));
    return this.arrival >= 14;
  }
  resize(w: number, h: number) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  dispose() {
    this.audio?.pause(); this.audio = null;
    void this.audioContext?.close().catch(() => {}); this.audioContext = null;
    this.rumble = null;
    disposeScene(this.scene);
    this.materials.clear();
    this.moving.length = 0;
    this.straps.length = 0;
  }
}
