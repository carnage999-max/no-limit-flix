import type { Movie } from "./types";
import type { ShelfGenreAssignment } from "../lib/genreBuckets";
import { SHELF_HEIGHT, SHELF_LEVELS, SHELF_ISLANDS, WALL_SHELVES, BACK_SHELVES } from "./layout";

type Axis = "x" | "z";

export const LEVEL_Y = Array.from({ length: SHELF_LEVELS }, (_, i) => 0.06 + i * (SHELF_HEIGHT / SHELF_LEVELS));
export const CASE_STEP = 0.185;
export const BOARD_THICKNESS = 0.035;
const CASE_HALF_H = 0.245 / 2;

export interface ShelfCasePlacement {
  movie: Movie;
  position: [number, number, number];
  rotationY: number;
}

function facePosition(axis: Axis, center: { x: number; z: number }, along: number, perp: number, y: number): [number, number, number] {
  return axis === "z" ? [center.x + perp, y, center.z + along] : [center.x + along, y, center.z + perp];
}

function faceRotation(axis: Axis, side: 1 | -1): number {
  if (axis === "z") return side === 1 ? Math.PI / 2 : -Math.PI / 2;
  return side === 1 ? 0 : Math.PI;
}

/** Movies for one shelf run: everything in that genre, or the whole library if the genre is empty/unset. */
function poolFor(movies: Movie[], genre: string | null): Movie[] {
  if (!genre) return movies;
  const subset = movies.filter((m) => m.genreBucket === genre);
  return subset.length > 0 ? subset : movies;
}

function shelfCases(
  pool: Movie[],
  center: { x: number; z: number },
  length: number,
  axis: Axis,
  thickness: number,
  sides: (1 | -1)[],
  seed: number
): ShelfCasePlacement[] {
  if (pool.length === 0) return [];
  const caseCount = Math.max(1, Math.floor((length - 0.1) / CASE_STEP));
  const start = -((caseCount - 1) * CASE_STEP) / 2;
  const items: ShelfCasePlacement[] = [];
  let poolIndex = seed;

  sides.forEach((side) => {
    LEVEL_Y.forEach((y) => {
      for (let i = 0; i < caseCount; i++) {
        const along = start + i * CASE_STEP;
        const movie = pool[poolIndex % pool.length];
        poolIndex += 3;
        const perp = side * (thickness + 0.012);
        const caseY = y + BOARD_THICKNESS / 2 + CASE_HALF_H + 0.006;
        items.push({
          movie,
          position: facePosition(axis, center, along, perp, caseY),
          rotationY: faceRotation(axis, side),
        });
      }
    });
  });
  return items;
}

/**
 * Lays real movies onto the shelves, grouped by genre to match the signs
 * hanging above them (lib/genreBuckets.ts decides which genre goes where).
 * Pure function of (movies, shelfGenres) — callers should useMemo this.
 */
export function buildShelfCasePlacements(movies: Movie[], shelfGenres: ShelfGenreAssignment): ShelfCasePlacement[] {
  if (movies.length === 0) return [];
  const items: ShelfCasePlacement[] = [];

  const wallGenres = [shelfGenres.signed[0] ?? null, shelfGenres.signed[3] ?? null];
  WALL_SHELVES.forEach((box, i) => {
    const pool = poolFor(movies, wallGenres[i] ?? null);
    items.push(...shelfCases(pool, { x: box.x, z: box.z }, box.halfD * 2, "z", box.halfW, [box.x < 0 ? 1 : -1], i * 11 + 40));
  });

  const islandGenres = [shelfGenres.signed[1] ?? null, shelfGenres.signed[2] ?? null];
  SHELF_ISLANDS.forEach((box, i) => {
    const pool = poolFor(movies, islandGenres[i] ?? null);
    items.push(...shelfCases(pool, { x: box.x, z: box.z }, box.halfD * 2, "z", box.halfW, [1, -1], i * 7));
  });

  const backPool = poolFor(movies, shelfGenres.back);
  BACK_SHELVES.forEach((box, i) => {
    items.push(...shelfCases(backPool, { x: box.x, z: box.z }, box.halfW * 2, "x", box.halfD, [1], i * 13 + 80));
  });

  return items;
}
