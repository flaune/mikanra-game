import * as THREE from 'three';

export type AvatarExpression = 'neutral' | 'happy' | 'confused';
export type AvatarHair = 'bob' | 'side-part' | 'buns' | 'swept';

export interface AvatarProfile {
  id: string;
  name: string;
  skin: number;
  hair: number;
  iris: string;
  outfit: number;
  trousers: number;
  shoes: number;
  hairstyle: AvatarHair;
  glasses?: boolean;
  scarf?: number;
  apron?: number;
  cardigan?: boolean;
}

export interface Avatar {
  group: THREE.Group;
  head: THREE.Group;
  arms: THREE.Group[];
  legs: THREE.Group[];
  setExpression: (expression: AvatarExpression) => void;
  setBlink: (closed: boolean) => void;
}

/** Original, rounded café characters. Every instance owns its GPU resources. */
export const avatarProfiles: Record<'aoi' | 'ren' | 'yui' | 'haru', AvatarProfile> = {
  aoi: {
    id: 'aoi', name: 'Aoi', skin: 0xf0c9ad, hair: 0x34292c, iris: '#655244',
    outfit: 0x548b87, trousers: 0x39444f, shoes: 0xede3d5, hairstyle: 'bob',
  },
  ren: {
    id: 'ren', name: 'Ren', skin: 0xeac39d, hair: 0x50362b, iris: '#7b573b',
    outfit: 0xaf7058, trousers: 0x454754, shoes: 0x483a32, hairstyle: 'side-part',
    glasses: true, cardigan: true,
  },
  yui: {
    id: 'yui', name: 'Yui', skin: 0xf2d1b9, hair: 0x5c3d2e, iris: '#647343',
    outfit: 0x829c6c, trousers: 0x525d65, shoes: 0xf1e7d8, hairstyle: 'buns',
    scarf: 0xe7bd6a,
  },
  haru: {
    id: 'haru', name: 'Haru', skin: 0xe2bda1, hair: 0x514b48, iris: '#5a4940',
    outfit: 0xe9deca, trousers: 0x394b4b, shoes: 0x483c32, hairstyle: 'swept',
    glasses: true, apron: 0x446e61,
  },
};

export function getAvatarProfile(idOrName: string): AvatarProfile {
  const key = idOrName.toLowerCase() as keyof typeof avatarProfiles;
  return avatarProfiles[key] ?? avatarProfiles.haru;
}

const headWidth = 0.345;
const headHeight = 0.395;
const headDepth = 0.305;

function shapeHead(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    // A gently narrower jaw makes the face an oval, rather than a perfect ball.
    const jaw = y < -0.25 ? 1 - Math.min(0.075, (-y - 0.25) * 0.1) : 1;
    position.setXYZ(i, position.getX(i) * headWidth * jaw, y * headHeight, position.getZ(i) * headDepth);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function faceTexture(profile: AvatarProfile, expression: AvatarExpression, blink: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('A 2D canvas is required to draw café avatars.');
  const ctx = context;
  const ink = '#372a27';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Flat graphic features sit on a curved skin surface; there is no rectangular sticker.
  for (const [index, x] of [170, 342].entries()) {
    const y = 183;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 6;
    if (blink) {
      ctx.beginPath(); ctx.moveTo(x - 53, y + 2);
      ctx.quadraticCurveTo(x, y + 20, x + 53, y + 2); ctx.stroke();
    } else {
      // Simple graphic eyes and brows read clearly at handheld scale.
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.ellipse(x, y, 18, expression === 'happy' ? 22 : 30, 0, 0, Math.PI * 2); ctx.fill();
    }
    const browY = expression === 'confused' ? 118 + index * 15 : expression === 'happy' ? 123 : 132;
    ctx.strokeStyle = new THREE.Color(profile.hair).getStyle();
    ctx.lineWidth = profile.id === 'haru' ? 12 : 10;
    ctx.beginPath(); ctx.moveTo(x - 48, browY + 6);
    ctx.quadraticCurveTo(x - 3, browY - 12, x + 46, browY + (expression === 'confused' && index ? -2 : 5)); ctx.stroke();
  }

  // The nose is a small modeled shape, with the rest of the face drawn flat.
  ctx.fillStyle = 'rgba(220, 126, 111, 0.17)';
  for (const x of [133, 379]) { ctx.beginPath(); ctx.ellipse(x, 283, 28, 14, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#72463d'; ctx.lineWidth = 6;
  ctx.beginPath();
  if (expression === 'confused') {
    ctx.moveTo(211, 349); ctx.quadraticCurveTo(255, 339, 298, 352);
  } else {
    ctx.moveTo(199, 337); ctx.quadraticCurveTo(256, expression === 'happy' ? 381 : 362, 313, 337);
  }
  ctx.stroke();

  if (profile.glasses) {
    ctx.strokeStyle = profile.id === 'haru' ? '#4c4943' : '#3e3530';
    ctx.lineWidth = 7;
    for (const x of [102, 274]) {
      ctx.beginPath(); ctx.roundRect(x, 137, 136, 96, 24); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(238, 177); ctx.quadraticCurveTo(256, 163, 274, 177); ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(102, 164); ctx.lineTo(75, 152);
    ctx.moveTo(410, 164); ctx.lineTo(437, 152); ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = `${profile.id}-face-${expression}${blink ? '-blink' : ''}`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function hairGeometry(style: AvatarHair) {
  const positions: number[] = [], indices: number[] = [];
  const segments = 64, rings = 24;
  for (let ring = 0; ring <= rings; ring++) {
    for (let segment = 0; segment <= segments; segment++) {
      const phi = segment / segments * Math.PI * 2;
      const front = Math.pow(Math.max(0, Math.sin(phi)), 2.2);
      const bottom = style === 'bob' ? 0.79 - front * 0.42 : style === 'buns' ? 0.63 - front * 0.26 : 0.60 - front * 0.245;
      const theta = ring / rings * Math.PI * bottom;
      const y = Math.cos(theta);
      const jaw = y < -0.25 ? 1 - Math.min(0.075, (-y - 0.25) * 0.1) : 1;
      const bobFlare = style === 'bob' ? 1 + 0.075 * Math.sin(theta) ** 2 : 1;
      positions.push(
        -Math.cos(phi) * Math.sin(theta) * headWidth * 1.065 * jaw * bobFlare,
        y * headHeight * 1.065 + 0.008,
        Math.sin(phi) * Math.sin(theta) * headDepth * 1.065 - 0.009,
      );
      if (ring < rings && segment < segments) {
        const a = ring * (segments + 1) + segment, b = a + segments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

/** Smooth, original toy-like avatar, facing +Z and standing on y=0. */
export function createAvatar(profile: AvatarProfile): Avatar {
  const group = new THREE.Group(); group.name = `avatar-${profile.id}`;
  const head = new THREE.Group(); head.name = 'head'; head.position.y = 1.635; group.add(head);
  const arms: THREE.Group[] = [], legs: THREE.Group[] = [];
  const sphere = new THREE.SphereGeometry(1, 32, 24);
  const material = (color: number, roughness = 0.79) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
  const skin = material(profile.skin, 0.82), hair = material(profile.hair, 0.76);
  const outfit = material(profile.outfit), trousers = material(profile.trousers), shoes = material(profile.shoes, 0.7);
  const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true;
    // Café batching must leave animated avatars and their owned resources intact.
    object.userData.keep = true; parent.add(object); return object;
  };
  const oval = (parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const object = mesh(parent, sphere, mat, x, y, z); object.scale.set(sx, sy, sz); return object;
  };
  const patch = (parent: THREE.Object3D, shape: THREE.Shape, mat: THREE.Material, z: number, depth = 0.008) => mesh(parent,
    new THREE.ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.009, bevelThickness: 0.007, curveSegments: 16 }), mat, 0, 0, z);

  // A tailored rounded torso rather than a scaled ball.
  const bodyProfile = [
    new THREE.Vector2(0, 0.64), new THREE.Vector2(0.13, 0.64), new THREE.Vector2(0.165, 0.67),
    new THREE.Vector2(0.211, 1.12), new THREE.Vector2(0.22, 1.17), new THREE.Vector2(0.203, 1.21),
    new THREE.Vector2(0.137, 1.265), new THREE.Vector2(0.055, 1.28), new THREE.Vector2(0, 1.28),
  ];
  const body = mesh(group, new THREE.LatheGeometry(bodyProfile, 40), outfit); body.scale.z = 0.78;
  oval(group, skin, 0, 1.325, 0, 0.077, 0.115, 0.075);
  for (const sign of [-1, 1]) {
    const leg = new THREE.Group(); leg.name = sign < 0 ? 'leg-left' : 'leg-right'; leg.position.set(sign * 0.105, 0.64, 0); group.add(leg); legs.push(leg);
    mesh(leg, new THREE.CapsuleGeometry(0.078, 0.36, 8, 20), trousers, 0, -0.27, 0);
    oval(leg, shoes, 0, -0.57, 0.051, 0.101, 0.07, 0.152);
    const sole = oval(leg, material(0xcfc5b5), 0, -0.613, 0.052, 0.101, 0.024, 0.151);
    sole.castShadow = false;
    const arm = new THREE.Group(); arm.name = sign < 0 ? 'arm-left' : 'arm-right'; arm.position.set(sign * 0.222, 1.175, 0); group.add(arm); arms.push(arm);
    mesh(arm, new THREE.CapsuleGeometry(0.073, 0.125, 8, 20), outfit, sign * 0.017, -0.118, 0);
    mesh(arm, new THREE.CapsuleGeometry(0.052, 0.123, 8, 20), skin, sign * 0.033, -0.288, 0);
    oval(arm, skin, sign * 0.035, -0.393, 0.006, 0.058, 0.072, 0.058);
  }

  const headMesh = mesh(head, shapeHead(new THREE.SphereGeometry(1, 64, 40)), skin); headMesh.name = 'face-skin';
  oval(head, skin, 0, -.065, .302, .047, .05, .055);
  for (const sign of [-1, 1]) {
    oval(head, skin, sign * 0.34, -0.015, -0.006, 0.041, 0.068, 0.039);
    oval(head, material(0xdca789), sign * 0.359, -0.015, 0.023, 0.015, 0.034, 0.012);
  }

  const maps = new Map<string, THREE.CanvasTexture>();
  for (const expression of ['neutral', 'happy', 'confused'] as const) {
    for (const closed of [false, true]) maps.set(`${expression}-${closed}`, faceTexture(profile, expression, closed));
  }
  const faceMaterial = new THREE.MeshBasicMaterial({ map: maps.get('neutral-false'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, toneMapped: false });
  faceMaterial.userData.ownedTextures = [...maps.values()];
  const face = mesh(head, shapeHead(new THREE.SphereGeometry(1.004, 48, 40, Math.PI * 0.22, Math.PI * 0.56, Math.PI * 0.28, Math.PI * 0.52)), faceMaterial);
  face.name = 'graphic-face'; face.castShadow = false; face.receiveShadow = false; face.renderOrder = 1;

  const hairCap = mesh(head, hairGeometry(profile.hairstyle), hair); hairCap.name = `hair-${profile.hairstyle}`;
  const bangs = new THREE.Shape();
  if (profile.hairstyle === 'bob') {
    bangs.moveTo(-0.296, 0.236); bangs.bezierCurveTo(-0.236, 0.375, 0.201, 0.38, 0.295, 0.239);
    bangs.quadraticCurveTo(0.265, 0.183, 0.20, 0.143); bangs.lineTo(0.174, 0.195);
    bangs.quadraticCurveTo(0.146, 0.164, 0.113, 0.142); bangs.lineTo(0.099, 0.189);
    bangs.quadraticCurveTo(0.037, 0.147, -0.037, 0.153); bangs.lineTo(-0.042, 0.201);
    bangs.quadraticCurveTo(-0.116, 0.155, -0.177, 0.135); bangs.lineTo(-0.188, 0.203);
    bangs.quadraticCurveTo(-0.232, 0.156, -0.282, 0.119); bangs.quadraticCurveTo(-0.314, 0.177, -0.296, 0.236);
  } else {
    bangs.moveTo(-0.294, 0.23); bangs.bezierCurveTo(-0.16, 0.381, 0.15, 0.365, 0.28, 0.252);
    bangs.quadraticCurveTo(0.12, 0.275, 0.009, 0.183);
    bangs.quadraticCurveTo(-0.07, 0.107, -0.187, 0.126);
    bangs.quadraticCurveTo(-0.147, 0.167, -0.124, 0.214);
    bangs.quadraticCurveTo(-0.236, 0.099, -0.29, 0.11); bangs.quadraticCurveTo(-0.313, 0.166, -0.294, 0.23);
  }
  // Fit the fringe to the head instead of laying a flat plate across the forehead.
  const fringe = patch(head, bangs, hair, 0, 0.027);
  const fringePosition = fringe.geometry.getAttribute('position');
  for (let i = 0; i < fringePosition.count; i++) {
    const x = fringePosition.getX(i), y = fringePosition.getY(i);
    const surface = headDepth * Math.sqrt(Math.max(0.025, 1 - (x / headWidth) ** 2 - (y / headHeight) ** 2));
    fringePosition.setZ(i, surface + 0.008 + fringePosition.getZ(i));
  }
  fringe.geometry.computeVertexNormals(); fringe.name = 'sculpted-fringe';
  if (profile.hairstyle === 'buns') {
    const ribbon = material(profile.scarf ?? 0xe5b775);
    for (const sign of [-1, 1]) {
      oval(head, hair, sign * 0.316, 0.232, -0.116, 0.124, 0.143, 0.119);
      oval(head, ribbon, sign * 0.323, 0.171, -0.015, 0.086, 0.023, 0.039);
    }
  }

  if (profile.cardigan) {
    const shirt = new THREE.Shape(); shirt.moveTo(-0.116, 1.248); shirt.lineTo(0.116, 1.248); shirt.lineTo(0.041, 0.951); shirt.lineTo(-0.04, 0.951); shirt.closePath();
    patch(group, shirt, material(0xf0dfc7), 0.164);
    for (const y of [0.86, 0.97, 1.07]) oval(group, material(0x5c4536), 0, y, 0.177, 0.012, 0.012, 0.007);
    const collar = new THREE.Shape(); collar.moveTo(-0.109, 1.261); collar.lineTo(-0.039, 1.193); collar.lineTo(0, 1.249); collar.lineTo(0.039, 1.193); collar.lineTo(0.109, 1.261); collar.closePath();
    patch(group, collar, material(0xffedda), 0.177);
  }
  if (profile.scarf !== undefined) {
    const scarf = material(profile.scarf), scarfShade = material(0xc3944f);
    const wrap = mesh(group, new THREE.TorusGeometry(0.097, 0.038, 12, 36), scarf, 0, 1.30, 0.02); wrap.rotation.x = Math.PI / 2;
    const tail = new THREE.Shape(); tail.moveTo(0.013, 1.29); tail.lineTo(0.09, 1.26); tail.lineTo(0.089, 1.055); tail.quadraticCurveTo(0.045, 1.037, 0.012, 1.074); tail.closePath();
    patch(group, tail, scarf, 0.176, 0.015);
    for (const y of [1.09, 1.13]) mesh(group, new THREE.BoxGeometry(0.075, 0.009, 0.008), scarfShade, 0.051, y, 0.204);
  }
  if (profile.apron !== undefined) {
    const apron = material(profile.apron), trim = material(0x91a99a);
    const shape = new THREE.Shape(); shape.moveTo(-0.091, 1.191); shape.lineTo(0.091, 1.191); shape.lineTo(0.144, 0.998); shape.lineTo(0.126, 0.686); shape.quadraticCurveTo(0, 0.662, -0.126, 0.686); shape.lineTo(-0.144, 0.998); shape.closePath();
    patch(group, shape, apron, 0.183);
    const pocket = new THREE.Shape(); pocket.moveTo(-0.078, 0.946); pocket.lineTo(0.078, 0.946); pocket.lineTo(0.073, 0.847); pocket.quadraticCurveTo(0, 0.824, -0.073, 0.847); pocket.closePath();
    patch(group, pocket, trim, 0.201, 0.003);
    for (const sign of [-1, 1]) {
      const strap = mesh(group, new THREE.BoxGeometry(0.036, 0.135, 0.014), apron, sign * 0.106, 1.235, 0.151); strap.rotation.z = sign * -0.22;
      oval(group, material(0xe4c593, 0.52), sign * 0.076, 1.173, 0.206, 0.013, 0.013, 0.006);
    }
  }

  let expression: AvatarExpression = 'neutral', closed = false;
  const updateFace = () => { faceMaterial.map = maps.get(`${expression}-${closed}`)!; };
  return {
    group, head, arms, legs,
    setExpression(next) { if (expression !== next) { expression = next; updateFace(); } },
    setBlink(next) { if (closed !== next) { closed = next; updateFace(); } },
  };
}
