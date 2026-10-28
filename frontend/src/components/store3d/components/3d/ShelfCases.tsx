import type { ThreeEvent } from "@react-three/fiber";
import { getCaseGeometry, getCaseMaterials } from "../../lib/caseAssets";
import { useMovieSelection } from "../../hooks/useMovieSelection";
import { isClick } from "../../lib/dragState";

/**
 * Every case on the shelves. Each movie occupies exactly one slot (see buildStoreShelves), so
 * these are plain meshes rather than instanced ones: they share a geometry and a per-movie
 * cached material, and each gets frustum-culled on its own as you walk the aisles.
 */
export function ShelfCases() {
  const { shelfPlan, selectMovie, setHoveredId } = useMovieSelection();
  const geometry = getCaseGeometry("shelf");

  return (
    <>
      {shelfPlan.placements.map(({ movie, position, rotationY }) => (
        <mesh
          key={movie.id}
          geometry={geometry}
          material={getCaseMaterials(movie, "shelf")}
          position={position}
          rotation={[0, rotationY, 0]}
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
      ))}
    </>
  );
}
