import { useMemo } from "react";
import { SHELF_HEIGHT } from "../../data/layout";
import { LEVEL_Y, BOARD_THICKNESS } from "../../data/shelfLayout";

type Axis = "x" | "z";

interface ShelfUnitProps {
  center: { x: number; z: number };
  length: number;
  axis: Axis;
  thickness: number;
}

export function ShelfUnit({ center, length, axis, thickness }: ShelfUnitProps) {
  const frameSize: [number, number, number] =
    axis === "z" ? [thickness * 2, SHELF_HEIGHT, length] : [length, SHELF_HEIGHT, thickness * 2];

  const boards = useMemo(
    () =>
      LEVEL_Y.map((y) => ({
        y,
        size: (axis === "z"
          ? [thickness * 2 + 0.04, BOARD_THICKNESS, length]
          : [length, BOARD_THICKNESS, thickness * 2 + 0.04]) as [number, number, number],
        pos: [center.x, y, center.z] as [number, number, number],
      })),
    [axis, center.x, center.z, length, thickness]
  );

  return (
    <group>
      <mesh position={[center.x, SHELF_HEIGHT / 2, center.z]} receiveShadow>
        <boxGeometry args={frameSize} />
        <meshStandardMaterial color="#141212" roughness={0.85} metalness={0.25} />
      </mesh>
      {boards.map((b, i) => (
        <mesh key={i} position={b.pos} receiveShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color="#1c1a18" roughness={0.7} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
