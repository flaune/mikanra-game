import * as THREE from "three";

// The receiving scene owns each texture; engines must not share a global cache.

export function makeTextTexture(
  text: string,
  opts: {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    background?: string;
    fontFamily?: string;
    padding?: number;
    width?: number;
    height?: number;
    align?: CanvasTextAlign;
    lineHeight?: number;
    verticalCenter?: boolean;
  } = {},
): THREE.CanvasTexture {
  const {
    fontSize = 64,
    fontWeight = "bold",
    color = "#1a1a1a",
    background = "transparent",
    fontFamily = "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif",
    padding = 16,
    width = 512,
    height,
    align = "center",
    lineHeight = 1.3,
  } = opts;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  const ctx = canvas.getContext("2d")!;

  const lines = text.split("\n");
  const lineH = Math.round(fontSize * lineHeight);
  const h = height ?? lineH * lines.length + padding * 2;
  canvas.height = h;

  ctx.fillStyle = background;
  if (background !== "transparent") {
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";

  const x = align === "center" ? canvas.width / 2 : align === "right" ? canvas.width - padding : padding;
  lines.forEach((line, i) => {
    const top = opts.verticalCenter ? (canvas.height - lines.length * lineH) / 2 : padding;
    const y = top + lineH / 2 + i * lineH;
    if (background === "transparent") {
      ctx.clearRect(0, y - lineH / 2, canvas.width, lineH);
    }
    ctx.fillText(line, x, y);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeSignMaterial(
  text: string,
  opts: {
    fontSize?: number;
    color?: string;
    background?: string;
    width?: number;
    height?: number;
  } = {},
): THREE.MeshBasicMaterial {
  const tex = makeTextTexture(text, {
    fontSize: opts.fontSize ?? 80,
    fontWeight: "bold",
    color: opts.color ?? "#ffffff",
    background: opts.background ?? "#1a1a2e",
    padding: 24,
    width: opts.width ?? 512,
    height: opts.height,
    align: "center",
  });
  return new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
}
