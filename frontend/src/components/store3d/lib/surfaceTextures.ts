import * as THREE from "three";

let floorTex: THREE.CanvasTexture | null = null;
let wallTex: THREE.CanvasTexture | null = null;
let ceilingTex: THREE.CanvasTexture | null = null;

// Used until a real tileable photo is dropped into public/3d/textures/ (see environmentTextures.ts) —
// a flat fill with ruled lines reads as placeholder art, so this at least varies per-tile.
export function getFloorTexture(): THREE.CanvasTexture {
  if (floorTex) return floorTex;
  const size = 512;
  const tile = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  for (let ty = 0; ty < size; ty += tile) {
    for (let tx = 0; tx < size; tx += tile) {
      const shade = 54 + Math.floor(Math.random() * 10);
      ctx.fillStyle = `rgb(${shade + 10},${shade + 6},${shade - 8})`;
      ctx.fillRect(tx, ty, tile, tile);

      const sheen = ctx.createLinearGradient(tx, ty, tx + tile, ty + tile);
      sheen.addColorStop(0, "rgba(255,255,255,0.05)");
      sheen.addColorStop(0.5, "rgba(255,255,255,0)");
      sheen.addColorStop(1, "rgba(0,0,0,0.08)");
      ctx.fillStyle = sheen;
      ctx.fillRect(tx, ty, tile, tile);
    }
  }

  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += tile) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
  }

  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }

  floorTex = new THREE.CanvasTexture(canvas);
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(9, 10);
  floorTex.colorSpace = THREE.SRGBColorSpace;
  floorTex.anisotropy = 4;
  return floorTex;
}

export function getWallTexture(): THREE.CanvasTexture {
  if (wallTex) return wallTex;
  const size = 512;
  const panel = 85;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#221d17";
  ctx.fillRect(0, 0, size, size);

  for (let x = 0; x <= size; x += panel) {
    const highlight = ctx.createLinearGradient(x, 0, x + panel, 0);
    highlight.addColorStop(0, "rgba(255,255,255,0.05)");
    highlight.addColorStop(0.12, "rgba(255,255,255,0)");
    highlight.addColorStop(0.88, "rgba(255,255,255,0)");
    highlight.addColorStop(1, "rgba(0,0,0,0.3)");
    ctx.fillStyle = highlight;
    ctx.fillRect(x, 0, panel, size);
  }

  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }

  wallTex = new THREE.CanvasTexture(canvas);
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(6, 3);
  wallTex.colorSpace = THREE.SRGBColorSpace;
  wallTex.anisotropy = 4;
  return wallTex;
}

let lightPoolTex: THREE.CanvasTexture | null = null;

export function getLightPoolTexture(): THREE.CanvasTexture {
  if (lightPoolTex) return lightPoolTex;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,200,120,0.55)");
  grad.addColorStop(0.55, "rgba(255,160,90,0.22)");
  grad.addColorStop(1, "rgba(255,120,80,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  lightPoolTex = new THREE.CanvasTexture(canvas);
  lightPoolTex.colorSpace = THREE.SRGBColorSpace;
  return lightPoolTex;
}

export function getCeilingTexture(): THREE.CanvasTexture {
  if (ceilingTex) return ceilingTex;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#080706";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, size - 8, size - 8);
  ceilingTex = new THREE.CanvasTexture(canvas);
  ceilingTex.wrapS = ceilingTex.wrapT = THREE.RepeatWrapping;
  ceilingTex.repeat.set(8, 5);
  return ceilingTex;
}
