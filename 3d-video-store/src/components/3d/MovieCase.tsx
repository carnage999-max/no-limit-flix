import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Movie } from "../../data/types";
import { useMovieSelection } from "../../hooks/useMovieSelection";
import { DIMS, getCaseGeometry, getCaseMaterials, indicatorGeometry, indicatorMaterial } from "../../lib/caseAssets";
import { isClick } from "../../lib/dragState";

interface MovieCaseProps {
  movie: Movie;
  position: [number, number, number];
  rotationY?: number;
}

export function MovieCase({ movie, position, rotationY = 0 }: MovieCaseProps) {
  const { selectedId, hoveredId, selectMovie, setHoveredId } = useMovieSelection();
  const groupRef = useRef<THREE.Group>(null);
  const settled = useRef(true);

  const geometry = useMemo(() => getCaseGeometry("large"), []);
  const materials = useMemo(() => getCaseMaterials(movie, "large"), [movie]);
  const dims = DIMS.large;

  const isSelected = selectedId === movie.id;
  const isHovered = hoveredId === movie.id;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const active = isSelected || isHovered;
    if (!active && settled.current) return;

    const targetScale = isSelected ? 1.16 : isHovered ? 1.08 : 1;
    const targetZ = isSelected ? dims.d * 3 : isHovered ? dims.d * 1.6 : 0;
    const s = groupRef.current.scale;
    const lerpSpeed = 1 - Math.pow(0.001, delta);
    s.x += (targetScale - s.x) * lerpSpeed;
    s.y += (targetScale - s.y) * lerpSpeed;
    s.z += (targetScale - s.z) * lerpSpeed;
    groupRef.current.position.z += (targetZ - groupRef.current.position.z) * lerpSpeed;

    settled.current = !active && Math.abs(s.x - 1) < 0.001 && Math.abs(groupRef.current.position.z) < 0.0005;
    if (settled.current) {
      s.set(1, 1, 1);
      groupRef.current.position.z = 0;
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group ref={groupRef}>
        <mesh
          geometry={geometry}
          material={materials}
          onClick={(e) => {
            e.stopPropagation();
            if (isClick()) selectMovie(movie.id);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredId(movie.id);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            setHoveredId(null);
            document.body.style.cursor = "auto";
          }}
        />
        {isSelected && (
          <mesh
            position={[0, -dims.h / 2 - 0.02, 0]}
            scale={[dims.w * 1.08, 1, dims.d * 1.4]}
            geometry={indicatorGeometry}
            material={indicatorMaterial}
          />
        )}
      </group>
    </group>
  );
}
