import * as THREE from "three";

// Real tileable photos make the biggest visual difference in this scene (a flat colour with a
// drawn grid reads as placeholder art). Drop a seamless square image at each path below — see
// docs/3d-store-texture-prompts.md for exact prompts — and it's picked up automatically on the
// next load; until then the room uses the generated canvas texture it always has.
const REAL_TEXTURE_PATHS = {
  floor: "/3d/textures/floor.jpg",
  wall: "/3d/textures/wall.jpg",
  ceiling: "/3d/textures/ceiling.jpg",
} as const;

type SurfaceKey = keyof typeof REAL_TEXTURE_PATHS;

const loader = new THREE.TextureLoader();
const realCache = new Map<SurfaceKey, THREE.Texture | null>(); // null = checked, not present

const REPEAT: Record<SurfaceKey, [number, number]> = {
  floor: [9, 10],
  wall: [6, 3],
  ceiling: [8, 5],
};

/**
 * Tries to load the real tileable photo for a surface. Resolves to null (not an error) when the
 * file is missing, so callers just keep their procedural fallback — this never throws.
 */
export function loadRealSurfaceTexture(key: SurfaceKey): Promise<THREE.Texture | null> {
  const cached = realCache.get(key);
  if (cached !== undefined) return Promise.resolve(cached);

  return new Promise((resolve) => {
    loader.load(
      REAL_TEXTURE_PATHS[key],
      (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(...REPEAT[key]);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        texture.needsUpdate = true;
        realCache.set(key, texture);
        resolve(texture);
      },
      undefined,
      () => {
        realCache.set(key, null);
        resolve(null);
      }
    );
  });
}
