import { useMemo } from "react";
import * as THREE from "three";
import { FEATURED_MOVIES } from "../../data/movies";
import { CENTRAL_DISPLAY } from "../../data/layout";
import { MovieCase } from "./MovieCase";
import { getLightPoolTexture } from "../../lib/surfaceTextures";

const COL_OFFSETS = [-0.76, 0, 0.76];
const ROW_OFFSETS = [1.97, 0.87];
const PANEL_Z_OFFSET = 0.56;
const CASE_D = 0.06;
const PANEL_CENTER_Y = 1.42;
const PANEL_SIZE: [number, number] = [2.42, 2.36];

export function CentralDisplay() {
  const { x, z } = CENTRAL_DISPLAY;
  const movies = FEATURED_MOVIES;
  const lightPool = useMemo(getLightPoolTexture, []);

  return (
    <group position={[x, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <planeGeometry args={[5.2, 4.2]} />
        <meshBasicMaterial
          map={lightPool}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.1, 0.2, 2.05]} />
        <meshStandardMaterial color="#0b0a08" roughness={0.35} metalness={0.55} />
      </mesh>
      <mesh position={[0, 0.205, 0]}>
        <boxGeometry args={[3.12, 0.015, 2.07]} />
        <meshStandardMaterial color="#f5c452" emissive="#f5c452" emissiveIntensity={0.4} roughness={0.4} />
      </mesh>

      <mesh position={[0, 1.42, 0]}>
        <boxGeometry args={[0.16, 2.55, 0.16]} />
        <meshStandardMaterial color="#0a0908" roughness={0.5} metalness={0.5} />
      </mesh>

      {[1, -1].map((dir) => (
        <group key={dir}>
          <mesh position={[0, PANEL_CENTER_Y, dir * PANEL_Z_OFFSET]} castShadow>
            <boxGeometry args={[PANEL_SIZE[0], PANEL_SIZE[1], 0.06]} />
            <meshStandardMaterial color="#0d0c0a" roughness={0.75} metalness={0.15} />
          </mesh>
        </group>
      ))}

      {[1, -1].map((dir) =>
        ROW_OFFSETS.map((rowY, rowIdx) =>
          COL_OFFSETS.map((colX, colIdx) => {
            const movie = movies[(rowIdx * 3 + colIdx) % movies.length];
            const slotZ = dir * (PANEL_Z_OFFSET + 0.03 + 0.01);
            const caseZ = dir * (PANEL_Z_OFFSET + 0.03 + 0.01 + CASE_D / 2 + 0.004);
            const rotationY = dir === 1 ? 0 : Math.PI;
            return (
              <group key={`${dir}-${rowIdx}-${colIdx}`}>
                <mesh position={[colX, rowY, slotZ]}>
                  <boxGeometry args={[0.7, 1.0, 0.02]} />
                  <meshStandardMaterial color="#020202" roughness={0.9} />
                </mesh>
                <MovieCase movie={movie} position={[colX, rowY, caseZ]} rotationY={rotationY} />
              </group>
            );
          })
        )
      )}

      <pointLight position={[0, 3.9, 0]} intensity={95} distance={8.5} decay={2} color="#fff4da" />
      <pointLight position={[0, 1.5, 2.1]} intensity={26} distance={5} decay={2} color="#ffb37a" />
    </group>
  );
}
