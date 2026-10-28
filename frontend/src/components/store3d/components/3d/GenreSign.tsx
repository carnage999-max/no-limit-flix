import { useEffect, useMemo, useState } from "react";
import { createSignTexture } from "../../lib/signTexture";
import { ensureDisplayFont, displayFontFamily } from "../../lib/fontLoader";
import { ROOM } from "../../data/layout";

interface GenreSignProps {
  label: string;
  x: number;
  z: number;
}

export function GenreSign({ label, x, z }: GenreSignProps) {
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
        text: label,
        color: "#f5c452",
        width: 640,
        height: 180,
        fontSize: 90,
        letterSpacing: 0.05,
        fontFamily: fontReady ? displayFontFamily() : undefined,
      }),
    [label, fontReady]
  );

  const signY = ROOM.ceilingY - 2.05;

  return (
    <group position={[x, 0, z]}>
      <mesh position={[-0.85, (ROOM.ceilingY + signY) / 2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, ROOM.ceilingY - signY, 8]} />
        <meshStandardMaterial color="#2a2620" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0.85, (ROOM.ceilingY + signY) / 2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, ROOM.ceilingY - signY, 8]} />
        <meshStandardMaterial color="#2a2620" metalness={0.7} roughness={0.4} />
      </mesh>

      <group position={[0, signY, 0]}>
        <mesh castShadow>
          <boxGeometry args={[2.1, 0.55, 0.08]} />
          <meshStandardMaterial color="#0c0a08" roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Recessed gold trim so the box reads as a built sign, not a flat card. */}
        <mesh position={[0, 0, 0.001]}>
          <boxGeometry args={[2.0, 0.45, 0.075]} />
          <meshStandardMaterial color="#1a1711" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.045]}>
          <planeGeometry args={[1.9, 0.4]} />
          <meshBasicMaterial map={texture} transparent toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, -0.045]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[1.9, 0.4]} />
          <meshBasicMaterial map={texture} transparent toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
