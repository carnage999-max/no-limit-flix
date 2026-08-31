import * as THREE from "three";
import type { Movie } from "../data/types";
import { createPosterTexture } from "./posterTexture";

export type CaseSize = "shelf" | "large";

export const CASE_DARK = new THREE.Color("#0c0b0a");

export const DIMS: Record<CaseSize, { w: number; h: number; d: number }> = {
  shelf: { w: 0.165, h: 0.245, d: 0.02 },
  large: { w: 0.64, h: 0.94, d: 0.06 },
};

const geometryCache = new Map<CaseSize, THREE.BoxGeometry>();
export function getCaseGeometry(size: CaseSize) {
  let geo = geometryCache.get(size);
  if (!geo) {
    const { w, h, d } = DIMS[size];
    geo = new THREE.BoxGeometry(w, h, d);
    geometryCache.set(size, geo);
  }
  return geo;
}

const materialCache = new Map<string, THREE.MeshStandardMaterial[]>();
export function getCaseMaterials(movie: Movie, size: CaseSize) {
  const key = `${movie.id}-${size}`;
  let mats = materialCache.get(key);
  if (!mats) {
    const texture = createPosterTexture(movie);
    const side = new THREE.MeshStandardMaterial({ color: CASE_DARK, roughness: 0.7, metalness: 0.1 });
    const back = new THREE.MeshStandardMaterial({ color: CASE_DARK, roughness: 0.8 });
    const front =
      size === "large"
        ? new THREE.MeshPhysicalMaterial({
            map: texture,
            roughness: 0.38,
            metalness: 0.08,
            clearcoat: 0.55,
            clearcoatRoughness: 0.28,
          })
        : new THREE.MeshStandardMaterial({ map: texture, roughness: 0.45, metalness: 0.05 });
    mats = [side, side, side, side, front, back];
    materialCache.set(key, mats);
  }
  return mats;
}

export const indicatorGeometry = new THREE.BoxGeometry(1, 0.014, 1);
export const indicatorMaterial = new THREE.MeshStandardMaterial({
  color: "#f5c452",
  emissive: "#f5c452",
  emissiveIntensity: 1.4,
});
