import { OBSTACLES, PLAYER_RADIUS, STORE_BOUNDS, type Box2D } from "../data/layout";

function resolveAxis(pos: { x: number; z: number }, box: Box2D, radius: number) {
  const minX = box.x - box.halfW - radius;
  const maxX = box.x + box.halfW + radius;
  const minZ = box.z - box.halfD - radius;
  const maxZ = box.z + box.halfD + radius;

  if (pos.x <= minX || pos.x >= maxX || pos.z <= minZ || pos.z >= maxZ) {
    return pos;
  }

  const distLeft = pos.x - minX;
  const distRight = maxX - pos.x;
  const distTop = pos.z - minZ;
  const distBottom = maxZ - pos.z;
  const min = Math.min(distLeft, distRight, distTop, distBottom);

  if (min === distLeft) return { x: minX, z: pos.z };
  if (min === distRight) return { x: maxX, z: pos.z };
  if (min === distTop) return { x: pos.x, z: minZ };
  return { x: pos.x, z: maxZ };
}

export function resolveCollision(x: number, z: number): { x: number; z: number } {
  let pos = { x, z };

  pos.x = Math.min(Math.max(pos.x, STORE_BOUNDS.minX + PLAYER_RADIUS), STORE_BOUNDS.maxX - PLAYER_RADIUS);
  pos.z = Math.min(Math.max(pos.z, STORE_BOUNDS.minZ + PLAYER_RADIUS), STORE_BOUNDS.maxZ - PLAYER_RADIUS);

  for (const box of OBSTACLES) {
    pos = resolveAxis(pos, box, PLAYER_RADIUS);
  }

  return pos;
}
