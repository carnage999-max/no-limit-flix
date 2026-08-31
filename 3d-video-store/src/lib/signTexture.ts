import * as THREE from "three";

interface SignTextureOptions {
  text: string;
  color: string;
  width?: number;
  height?: number;
  fontSize?: number;
  fontWeight?: string;
  letterSpacing?: number;
}

const cache = new Map<string, THREE.CanvasTexture>();

export function createSignTexture({
  text,
  color,
  width = 512,
  height = 160,
  fontSize = 88,
  fontWeight = "800",
  letterSpacing = 0.02,
}: SignTextureOptions): THREE.CanvasTexture {
  const key = `${text}|${color}|${width}|${height}|${fontSize}|${fontWeight}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, width, height);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${fontWeight} ${fontSize}px Arial`;

  const cx = width / 2;
  const cy = height / 2;

  const drawSpaced = (t: string, x: number, y: number) => {
    if (letterSpacing === 0) {
      ctx.fillText(t, x, y);
      return;
    }
    const widths = t.split("").map((ch) => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + letterSpacing * fontSize * (t.length - 1);
    let cursor = x - total / 2;
    ctx.textAlign = "left";
    t.split("").forEach((ch, i) => {
      ctx.fillText(ch, cursor, y);
      cursor += widths[i] + letterSpacing * fontSize;
    });
    ctx.textAlign = "center";
  };

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  for (const blur of [40, 26, 14]) {
    ctx.shadowBlur = blur;
    drawSpaced(text, cx, cy);
  }
  ctx.shadowBlur = 4;
  ctx.fillStyle = "#ffffff";
  drawSpaced(text, cx, cy);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  cache.set(key, texture);
  return texture;
}
