import * as THREE from "three";

let floorTex: THREE.CanvasTexture | null = null;
let wallTex: THREE.CanvasTexture | null = null;
let ceilingTex: THREE.CanvasTexture | null = null;

export function getFloorTexture(): THREE.CanvasTexture {
  if (floorTex) return floorTex;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#413a2e";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += 32) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  for (let i = 0; i <= size; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
  }
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
  floorTex = new THREE.CanvasTexture(canvas);
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(9, 10);
  floorTex.colorSpace = THREE.SRGBColorSpace;
  return floorTex;
}

export function getWallTexture(): THREE.CanvasTexture {
  if (wallTex) return wallTex;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#221d17";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 3;
  for (let i = 0; i <= size; i += 48) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
  }
  wallTex = new THREE.CanvasTexture(canvas);
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(6, 3);
  wallTex.colorSpace = THREE.SRGBColorSpace;
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
