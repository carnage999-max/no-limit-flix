import { useMemo } from "react";
import { ROOM } from "../../data/layout";
import { getCeilingTexture, getFloorTexture, getWallTexture } from "../../lib/surfaceTextures";

const RECESSED_LIGHT_ROWS = 3;
const RECESSED_LIGHT_COLS = 4;
const LIT_FIXTURE_INDICES = new Set([1, 10]);

export function Environment() {
  const floorTexture = useMemo(getFloorTexture, []);
  const wallTexture = useMemo(getWallTexture, []);
  const ceilingTexture = useMemo(getCeilingTexture, []);

  const width = ROOM.wallX * 2;
  const roomLength = ROOM.frontZ - ROOM.backZ;
  const centerZ = (ROOM.frontZ + ROOM.backZ) / 2;

  const recessedLights = useMemo(() => {
    const lights: { x: number; z: number }[] = [];
    for (let r = 0; r < RECESSED_LIGHT_ROWS; r++) {
      for (let c = 0; c < RECESSED_LIGHT_COLS; c++) {
        lights.push({
          x: -ROOM.wallX + 1.6 + (c * (width - 3.2)) / (RECESSED_LIGHT_COLS - 1),
          z: ROOM.backZ + 1.6 + (r * (roomLength - 3.2)) / (RECESSED_LIGHT_ROWS - 1),
        });
      }
    }
    return lights;
  }, [roomLength, width]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, ROOM.floorY, centerZ]} receiveShadow>
        <planeGeometry args={[width, roomLength]} />
        <meshStandardMaterial map={floorTexture} roughness={0.5} metalness={0.08} color="#726858" />
      </mesh>

      <mesh position={[-ROOM.wallX, ROOM.ceilingY / 2, centerZ]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[roomLength, ROOM.ceilingY]} />
        <meshStandardMaterial map={wallTexture} roughness={0.9} color="#232019" />
      </mesh>

      <mesh position={[ROOM.wallX, ROOM.ceilingY / 2, centerZ]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[roomLength, ROOM.ceilingY]} />
        <meshStandardMaterial map={wallTexture} roughness={0.9} color="#232019" />
      </mesh>

      <mesh position={[0, ROOM.ceilingY / 2, ROOM.backZ]} receiveShadow>
        <planeGeometry args={[width, ROOM.ceilingY]} />
        <meshStandardMaterial map={wallTexture} roughness={0.9} color="#1c1914" />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.ceilingY, centerZ]}>
        <planeGeometry args={[width, roomLength]} />
        <meshStandardMaterial map={ceilingTexture} roughness={1} color="#111010" />
      </mesh>

      {[-6, -2, 2, 6].map((z) => (
        <mesh key={z} position={[0, ROOM.ceilingY - 0.12, z]}>
          <boxGeometry args={[width - 0.4, 0.22, 0.32]} />
          <meshStandardMaterial color="#0a0908" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}

      {recessedLights.map((l, i) => (
        <group key={i} position={[l.x, ROOM.ceilingY - 0.05, l.z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.22, 16]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.4} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
            <circleGeometry args={[0.13, 16]} />
            <meshStandardMaterial color="#fff3d4" emissive="#ffdca0" emissiveIntensity={2.2} toneMapped={false} />
          </mesh>
          {LIT_FIXTURE_INDICES.has(i) && (
            <pointLight position={[0, -0.3, 0]} intensity={115} distance={15} decay={2} color="#ffd9a0" />
          )}
        </group>
      ))}

      <mesh position={[-ROOM.wallX + 0.05, 0.15, centerZ]}>
        <boxGeometry args={[0.1, 0.3, roomLength]} />
        <meshStandardMaterial color="#050403" roughness={0.8} />
      </mesh>
      <mesh position={[ROOM.wallX - 0.05, 0.15, centerZ]}>
        <boxGeometry args={[0.1, 0.3, roomLength]} />
        <meshStandardMaterial color="#050403" roughness={0.8} />
      </mesh>
    </group>
  );
}
