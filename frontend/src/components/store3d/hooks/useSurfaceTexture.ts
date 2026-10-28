import { useEffect, useState } from "react";
import type * as THREE from "three";
import { loadRealSurfaceTexture } from "../lib/environmentTextures";

/** Real tileable photo if one has been dropped in public/3d/textures/, else the given procedural fallback. */
export function useSurfaceTexture(key: "floor" | "wall" | "ceiling", fallback: THREE.Texture): THREE.Texture {
  const [texture, setTexture] = useState(fallback);

  useEffect(() => {
    let cancelled = false;
    loadRealSurfaceTexture(key).then((real) => {
      if (!cancelled && real) setTexture(real);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return texture;
}
