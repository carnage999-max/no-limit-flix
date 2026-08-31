import * as THREE from "three";
import type { Movie } from "../data/types";

const cache = new Map<string, THREE.CanvasTexture>();

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawSpacedText(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, spacing: number) {
  const widths = text.split("").map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let cursor = cx - total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  text.split("").forEach((ch, i) => {
    ctx.fillText(ch, cursor, y);
    cursor += widths[i] + spacing;
  });
  ctx.textAlign = prevAlign;
}

function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((n >> 16) & 255) + amount);
  const g = Math.min(255, ((n >> 8) & 255) + amount);
  const b = Math.min(255, (n & 255) + amount);
  return `rgb(${r},${g},${b})`;
}

function drawHeroSilhouette(ctx: CanvasRenderingContext2D, cx: number, baseY: number, scale: number, accent: string) {
  const s = scale;
  ctx.save();

  ctx.beginPath();
  ctx.arc(cx, baseY - 430 * s, 46 * s, 0, Math.PI * 2);
  ctx.closePath();
  ctx.moveTo(cx - 22 * s, baseY - 392 * s);
  ctx.lineTo(cx + 22 * s, baseY - 392 * s);
  ctx.lineTo(cx + 98 * s, baseY - 338 * s);
  ctx.lineTo(cx + 72 * s, baseY - 148 * s);
  ctx.lineTo(cx + 58 * s, baseY - 55 * s);
  ctx.lineTo(cx + 64 * s, baseY + 42 * s);
  ctx.lineTo(cx + 36 * s, baseY + 345 * s);
  ctx.lineTo(cx + 9 * s, baseY + 345 * s);
  ctx.lineTo(cx + 11 * s, baseY + 32 * s);
  ctx.lineTo(cx - 11 * s, baseY + 32 * s);
  ctx.lineTo(cx - 9 * s, baseY + 345 * s);
  ctx.lineTo(cx - 36 * s, baseY + 345 * s);
  ctx.lineTo(cx - 64 * s, baseY + 42 * s);
  ctx.lineTo(cx - 58 * s, baseY - 55 * s);
  ctx.lineTo(cx - 72 * s, baseY - 148 * s);
  ctx.lineTo(cx - 98 * s, baseY - 338 * s);
  ctx.closePath();

  const grad = ctx.createLinearGradient(cx - 100 * s, 0, cx + 100 * s, 0);
  grad.addColorStop(0, "rgba(2,2,3,0.98)");
  grad.addColorStop(0.5, "rgba(12,10,9,0.94)");
  grad.addColorStop(1, "rgba(2,2,3,0.98)");
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = lighten(accent, 40);
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 2.5 * s;
  ctx.stroke();
  ctx.restore();
}

function drawEnsembleBlobs(ctx: CanvasRenderingContext2D, W: number, H: number, accent: string) {
  const positions = [0.3, 0.5, 0.7];
  positions.forEach((px, i) => {
    ctx.save();
    ctx.filter = "blur(18px)";
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = i === 1 ? lighten(accent, 25) : "rgba(8,6,5,0.92)";
    ctx.beginPath();
    ctx.ellipse(W * px, H * (i === 1 ? 0.4 : 0.48), 62, 140, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawEmblem(ctx: CanvasRenderingContext2D, W: number, H: number, accent: string) {
  ctx.save();
  ctx.translate(W / 2, H * 0.36);
  const rg = ctx.createRadialGradient(0, 0, 10, 0, 0, W * 0.37);
  rg.addColorStop(0, lighten(accent, 40));
  rg.addColorStop(0.5, accent);
  rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(0, 0, W * 0.37, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function addGrain(ctx: CanvasRenderingContext2D, W: number, H: number, amount: number) {
  const count = Math.floor((W * H) / 1400);
  for (let i = 0; i < count; i++) {
    const v = Math.random();
    ctx.fillStyle = v > 0.5 ? `rgba(255,255,255,${Math.random() * amount})` : `rgba(0,0,0,${Math.random() * amount})`;
    ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
  }
}

function drawGenreBadge(ctx: CanvasRenderingContext2D, x: number, y: number, accent: string, letter: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = accent;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = "800 15px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, x, y + 1);
  ctx.restore();
}

export function createPosterTexture(movie: Movie): THREE.CanvasTexture {
  const cached = cache.get(movie.id);
  if (cached) return cached;

  const W = 512;
  const H = 768;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const hash = hashCode(movie.id);
  const template = hash % 3;

  const angleSeed = (hash % 5) / 5;
  const grad = ctx.createLinearGradient(W * angleSeed * 0.4, 0, W * (1 - angleSeed * 0.3), H);
  grad.addColorStop(0, movie.colorTo);
  grad.addColorStop(0.5, movie.colorFrom);
  grad.addColorStop(1, movie.colorTo);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = movie.accent;
  for (let i = -2; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 175, 0);
    ctx.lineTo(i * 175 + 88, 0);
    ctx.lineTo(i * 175 - 275, H);
    ctx.lineTo(i * 175 - 363, H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  if (template === 0) {
    drawEmblem(ctx, W, H, movie.accent);
    drawHeroSilhouette(ctx, W / 2, H * 0.78, 0.58, movie.accent);
  } else if (template === 1) {
    drawEmblem(ctx, W, H, movie.accent);
    drawHeroSilhouette(ctx, W / 2, H * 0.8, 0.7, movie.accent);
  } else {
    drawEnsembleBlobs(ctx, W, H, movie.accent);
  }

  ctx.save();
  ctx.globalAlpha = 0.2;
  const rim = ctx.createLinearGradient(0, 0, W, H * 0.6);
  rim.addColorStop(0, lighten(movie.accent, 50));
  rim.addColorStop(0.5, "rgba(0,0,0,0)");
  rim.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, W, H * 0.7);
  ctx.restore();

  const vg = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.15, W / 2, H * 0.5, H * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  addGrain(ctx, W, H, 0.035);

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, W, 46);
  drawGenreBadge(ctx, 29, 23, movie.accent, movie.genre[0]);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = movie.accent;
  ctx.font = "700 16px Arial";
  ctx.fillText(movie.genre.toUpperCase(), 48, 23);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "700 18px Arial";
  ctx.fillText(String(movie.year), W - 18, 23);

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, 16, H);
  ctx.fillRect(W - 16, 0, 16, H);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (let y = 10; y < H; y += 32) {
    ctx.fillRect(4, y, 8, 16);
    ctx.fillRect(W - 12, y, 8, 16);
  }

  ctx.textAlign = "center";
  ctx.font = "800 43px Arial";
  const titleLines = wrapText(ctx, movie.title.toUpperCase(), W - 96);
  const startY = H * 0.66;
  ctx.fillStyle = "#fff";
  titleLines.slice(0, 3).forEach((line, i) => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 13;
    drawSpacedText(ctx, line, W / 2, startY + i * 48, 1.2);
    ctx.restore();
  });

  const ruleY = startY + titleLines.length * 48 - 5;
  ctx.strokeStyle = movie.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 43, ruleY);
  ctx.lineTo(W / 2 + 43, ruleY);
  ctx.stroke();

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, H - 62, W, 62);
  ctx.strokeStyle = movie.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, H - 62);
  ctx.lineTo(W, H - 62);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "700 16px Arial";
  ctx.fillText(movie.rating, 21, H - 31);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(16, H - 42, ctx.measureText(movie.rating).width + 10, 21);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "600 16px Arial";
  ctx.fillText(movie.duration, W - 21, H - 31);

  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 5;
  ctx.strokeRect(2.5, 2.5, W - 5, H - 5);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  cache.set(movie.id, texture);
  return texture;
}

const standeeCache = new Map<string, THREE.CanvasTexture>();

export function createStandeeTexture(movie: Movie): THREE.CanvasTexture {
  const cached = standeeCache.get(movie.id);
  if (cached) return cached;

  const W = 560;
  const H = 1280;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, W * 0.5, H);
  grad.addColorStop(0, movie.colorTo);
  grad.addColorStop(0.5, movie.colorFrom);
  grad.addColorStop(1, movie.colorTo);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = movie.accent;
  for (let i = -2; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 150, 0);
    ctx.lineTo(i * 150 + 70, 0);
    ctx.lineTo(i * 150 - 300, H);
    ctx.lineTo(i * 150 - 370, H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(W / 2, H * 0.4);
  const rg = ctx.createRadialGradient(0, 0, 20, 0, 0, 400);
  rg.addColorStop(0, lighten(movie.accent, 30));
  rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(0, 0, 400, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawHeroSilhouette(ctx, W / 2, H * 0.72, 1.55, movie.accent);

  const vg = ctx.createRadialGradient(W / 2, H * 0.4, H * 0.1, W / 2, H * 0.5, H * 0.7);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  addGrain(ctx, W, H, 0.035);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, H - 210, W, 210);
  ctx.strokeStyle = movie.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, H - 210);
  ctx.lineTo(W, H - 210);
  ctx.stroke();

  drawGenreBadge(ctx, W / 2 - 70, H - 168, movie.accent, movie.genre[0]);
  ctx.fillStyle = movie.accent;
  ctx.font = "700 24px Arial";
  ctx.textBaseline = "middle";
  ctx.fillText(movie.genre.toUpperCase(), W / 2 + 12, H - 168);

  ctx.fillStyle = "#fff";
  ctx.font = "800 56px Arial";
  const lines = wrapText(ctx, movie.title.toUpperCase(), W - 70);
  lines.slice(0, 2).forEach((line, i) => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 16;
    drawSpacedText(ctx, line, W / 2, H - 100 + i * 60, 1);
    ctx.restore();
  });

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 5;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  standeeCache.set(movie.id, texture);
  return texture;
}

export function disposePosterTextures() {
  cache.forEach((t) => t.dispose());
  cache.clear();
  standeeCache.forEach((t) => t.dispose());
  standeeCache.clear();
}
