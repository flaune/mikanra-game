import * as THREE from 'three';

/** Small, deterministic painted textures; no remote assets or runtime downloads. */
export function createStreetMaterials() {
  let seed = 417;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];

  function painted(base: string, kind: 'plaster' | 'brick' | 'wood' | 'road' | 'tile') {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const c = canvas.getContext('2d')!;
    c.fillStyle = base;
    c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 11000; i++) {
      c.fillStyle = random() > .5 ? `rgba(255,242,212,${random() * .09})` : `rgba(24,20,26,${random() * .12})`;
      const size = kind === 'road' ? 1 + random() * 3 : 1 + random() * 6;
      c.fillRect(random() * 512, random() * 512, size, size * .65);
    }
    if (kind === 'brick' || kind === 'tile') {
      const row = kind === 'brick' ? 32 : 64;
      for (let y = 0; y < 512; y += row) {
        for (let x = -64; x < 512; x += 128) {
          const offset = kind === 'brick' && (y / row) % 2 ? 64 : 0;
          c.fillStyle = `rgba(35,28,28,${.06 + random() * .13})`;
          c.fillRect(x + offset + 3, y + 3, 123, row - 5);
          c.strokeStyle = 'rgba(29,27,29,.28)'; c.lineWidth = 2;
          c.strokeRect(x + offset, y, 128, row);
          c.strokeStyle = 'rgba(248,226,183,.18)'; c.lineWidth = 1;
          c.strokeRect(x + offset + 2, y + 2, 124, row - 4);
        }
      }
    }
    if (kind === 'wood') {
      for (let x = 0; x < 512; x += 64) {
        c.fillStyle = 'rgba(14,16,20,.55)'; c.fillRect(x, 0, 3, 512);
        c.fillStyle = 'rgba(246,205,146,.12)'; c.fillRect(x + 3, 0, 2, 512);
      }
      for (let i = 0; i < 260; i++) {
        c.strokeStyle = `rgba(20,17,18,${random() * .16})`; c.lineWidth = 1;
        const x = random() * 512; const y = random() * 512;
        c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 5, y + 40, x - 5, y + 90, x + 2, y + 180); c.stroke();
      }
    }
    if (kind === 'plaster') {
      for (let i = 0; i < 40; i++) {
        const x = random() * 512; const y = random() * 512;
        const g = c.createRadialGradient(x, y, 1, x, y, 35 + random() * 50);
        g.addColorStop(0, 'rgba(50,42,39,.055)'); g.addColorStop(1, 'rgba(50,42,39,0)');
        c.fillStyle = g; c.fillRect(0, 0, 512, 512);
      }
    }
    if (kind === 'road') {
      c.strokeStyle = 'rgba(20,23,26,.38)'; c.lineWidth = 1.4;
      for (let i = 0; i < 7; i++) {
        let x = random() * 512; let y = random() * 512;
        c.beginPath(); c.moveTo(x, y);
        for (let j = 0; j < 5; j++) { x += random() * 24 - 12; y += random() * 24; c.lineTo(x, y); }
        c.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    textures.push(tex);
    return tex;
  }
  function material(color: number, map?: THREE.Texture, emissive = 0x000000) {
    const mat = new THREE.MeshStandardMaterial({ color, ...(map ? { map } : {}), roughness: .88, emissive, emissiveIntensity: .65 });
    materials.push(mat); return mat;
  }
  const palette = {
    plaster: material(0xffffff, painted('#afa083', 'plaster')),
    sage: material(0xffffff, painted('#717a70', 'plaster')),
    cream: material(0xffffff, painted('#d1bc92', 'plaster')),
    brick: material(0xffffff, painted('#765247', 'brick')),
    wood: material(0xffffff, painted('#543c2c', 'wood')),
    road: material(0xffffff, painted('#555457', 'road')),
    tile: material(0xffffff, painted('#8b8576', 'tile')),
    dark: material(0x262d30), metal: material(0x465153), trim: material(0x302a25),
    rust: material(0x924b38), linen: material(0xd6c7a2), roof: material(0x454e51),
    glass: material(0x394b4b, undefined, 0x273331),
    warmGlass: material(0xd9a560, undefined, 0xd99643),
    glow: material(0xffdf9b, undefined, 0xffb85a),
    terracotta: material(0x936449), green: material(0x415c3b), leaf: material(0x657649),
    blue: material(0x4b6877), white: material(0xc8c5b5), red: material(0xa4533b),
  };
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 64;
  const sc = shadowCanvas.getContext('2d')!;
  const gradient = sc.createRadialGradient(32, 32, 2, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(15,20,27,.55)'); gradient.addColorStop(.5, 'rgba(15,20,27,.25)'); gradient.addColorStop(1, 'rgba(15,20,27,0)');
  sc.fillStyle = gradient; sc.fillRect(0, 0, 64, 64);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas); textures.push(shadowTexture);
  const shadow = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  materials.push(shadow);
  return { ...palette, shadow, textures, materials };
}

export type StreetMaterials = ReturnType<typeof createStreetMaterials>;
