import { useEffect, useMemo, useState } from "react";
import { createSignTexture } from "../../lib/signTexture";
import { ensureDisplayFont, displayFontFamily } from "../../lib/fontLoader";
import { ROOM } from "../../data/layout";

export function NeonSign() {
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    ensureDisplayFont().then(() => mounted && setFontReady(true));
    return () => {
      mounted = false;
    };
  }, []);

  const texture = useMemo(
    () =>
      createSignTexture({
        text: "NEW RELEASES",
        color: "#ff2d3d",
        width: 1280,
        height: 256,
        fontSize: 124,
        letterSpacing: 0.02,
        fontFamily: fontReady ? displayFontFamily() : undefined,
      }),
    [fontReady]
  );

  const y = ROOM.ceilingY - 0.85;
  const z = ROOM.backZ + 0.05;

  return (
    <group position={[0, y, z]}>
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[6.1, 1.5, 0.07]} />
        <meshStandardMaterial color="#050403" roughness={0.6} />
      </mesh>
      <mesh>
        <planeGeometry args={[5.85, 1.28]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>
      <pointLight position={[0, -0.1, 1.6]} color="#ff2d3d" intensity={68} distance={14} decay={2} />
    </group>
  );
}
