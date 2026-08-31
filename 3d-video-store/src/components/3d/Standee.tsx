import { useMemo } from "react";
import type { Movie } from "../../data/types";
import { createStandeeTexture } from "../../lib/posterTexture";

interface StandeeProps {
  movie: Movie;
  x: number;
  z: number;
  rotationY?: number;
}

const WIDTH = 1.32;
const HEIGHT = 2.95;
const FRAME = 0.045;

export function Standee({ movie, x, z, rotationY = 0 }: StandeeProps) {
  const texture = useMemo(() => createStandeeTexture(movie), [movie]);

  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
        <boxGeometry args={[WIDTH + 0.16, 0.14, 0.58]} />
        <meshStandardMaterial color="#0b0a08" roughness={0.35} metalness={0.55} />
      </mesh>
      <mesh position={[0, 0.145, 0]}>
        <boxGeometry args={[WIDTH + 0.18, 0.012, 0.6]} />
        <meshStandardMaterial color="#f5c452" emissive="#f5c452" emissiveIntensity={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, HEIGHT / 2 + 0.15, -0.025]} castShadow>
        <boxGeometry args={[WIDTH + FRAME * 2, HEIGHT + FRAME * 2, 0.035]} />
        <meshStandardMaterial color="#0a0908" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, HEIGHT / 2 + 0.15, 0]} castShadow>
        <boxGeometry args={[WIDTH, HEIGHT, 0.045]} />
        <meshStandardMaterial map={texture} roughness={0.4} metalness={0.08} />
      </mesh>
    </group>
  );
}
