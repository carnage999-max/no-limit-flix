import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { Movie } from "../../data/types";
import { buildShelfCasePlacements, type ShelfCasePlacement } from "../../data/shelfLayout";
import { getCaseGeometry, getCaseMaterials } from "../../lib/caseAssets";
import { useMovieSelection } from "../../hooks/useMovieSelection";
import { isClick } from "../../lib/dragState";

interface GroupedPlacements {
  movie: Movie;
  items: ShelfCasePlacement[];
}

function groupByMovie(placements: ShelfCasePlacement[]): GroupedPlacements[] {
  const map = new Map<string, GroupedPlacements>();
  placements.forEach((p) => {
    const existing = map.get(p.movie.id);
    if (existing) existing.items.push(p);
    else map.set(p.movie.id, { movie: p.movie, items: [p] });
  });
  return Array.from(map.values());
}

function ShelfCaseInstances({ movie, items }: GroupedPlacements) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { selectMovie, setHoveredId } = useMovieSelection();

  const geometry = useMemo(() => getCaseGeometry("shelf"), []);
  const materials = useMemo(() => getCaseMaterials(movie, "shelf"), [movie]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);

    items.forEach((item, i) => {
      position.set(item.position[0], item.position[1], item.position[2]);
      quaternion.setFromEuler(new THREE.Euler(0, item.rotationY, 0));
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, materials, items.length]}
      frustumCulled={false}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (isClick()) selectMovie(movie.id);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHoveredId(movie.id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHoveredId(null);
        document.body.style.cursor = "auto";
      }}
    />
  );
}

export function ShelfCases() {
  const { movies, shelfGenres } = useMovieSelection();
  const grouped = useMemo(() => groupByMovie(buildShelfCasePlacements(movies, shelfGenres)), [movies, shelfGenres]);
  return (
    <>
      {grouped.map((g) => (
        <ShelfCaseInstances key={g.movie.id} movie={g.movie} items={g.items} />
      ))}
    </>
  );
}
