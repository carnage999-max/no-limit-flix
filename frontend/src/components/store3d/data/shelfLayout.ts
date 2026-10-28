import type { Movie } from "./types";
// Explicit .ts extension so this stays importable from node --test (see tests/shelf-layout.test.mjs),
// matching how lib/media-signing.ts imports lib/media.ts.
import { SHELF_HEIGHT, SHELF_LEVELS, SHELF_ISLANDS, WALL_SHELVES, BACK_SHELVES, GENRE_SIGN_SPOTS } from "./layout.ts";

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

export interface ShelfPlan {
  placements: ShelfCasePlacement[];
  /** Genre label for each GENRE_SIGN_SPOTS entry, in the same order. Empty string = hang no sign. */
  signLabels: string[];
}

/** One continuous run of shelving, and which overhead sign (if any) it belongs to. */
interface ShelfRun {
  center: { x: number; z: number };
  length: number;
  axis: Axis;
  thickness: number;
  sides: (1 | -1)[];
  signIndex: number | null;
}

const RUNS: ShelfRun[] = [
  // Wall units: one shopper-facing side each.
  {
    center: { x: WALL_SHELVES[0].x, z: WALL_SHELVES[0].z },
    length: WALL_SHELVES[0].halfD * 2,
    axis: "z",
    thickness: WALL_SHELVES[0].halfW,
    sides: [1],
    signIndex: 0,
  },
  {
    center: { x: WALL_SHELVES[1].x, z: WALL_SHELVES[1].z },
    length: WALL_SHELVES[1].halfD * 2,
    axis: "z",
    thickness: WALL_SHELVES[1].halfW,
    sides: [-1],
    signIndex: 3,
  },
  // Islands: stocked on both sides, so these hold the most.
  {
    center: { x: SHELF_ISLANDS[0].x, z: SHELF_ISLANDS[0].z },
    length: SHELF_ISLANDS[0].halfD * 2,
    axis: "z",
    thickness: SHELF_ISLANDS[0].halfW,
    sides: [1, -1],
    signIndex: 1,
  },
  {
    center: { x: SHELF_ISLANDS[1].x, z: SHELF_ISLANDS[1].z },
    length: SHELF_ISLANDS[1].halfD * 2,
    axis: "z",
    thickness: SHELF_ISLANDS[1].halfW,
    sides: [1, -1],
    signIndex: 2,
  },
  // Back wall: unsigned, holds whatever doesn't belong to a signed genre.
  {
    center: { x: BACK_SHELVES[0].x, z: BACK_SHELVES[0].z },
    length: BACK_SHELVES[0].halfW * 2,
    axis: "x",
    thickness: BACK_SHELVES[0].halfD,
    sides: [1],
    signIndex: null,
  },
  {
    center: { x: BACK_SHELVES[1].x, z: BACK_SHELVES[1].z },
    length: BACK_SHELVES[1].halfW * 2,
    axis: "x",
    thickness: BACK_SHELVES[1].halfD,
    sides: [1],
    signIndex: null,
  },
];

const slotsPerLevel = (length: number) => Math.max(1, Math.floor((length - 0.1) / CASE_STEP));
const capacityOf = (run: ShelfRun) => slotsPerLevel(run.length) * LEVEL_Y.length * run.sides.length;

function facePosition(axis: Axis, center: { x: number; z: number }, along: number, perp: number, y: number): [number, number, number] {
  return axis === "z" ? [center.x + perp, y, center.z + along] : [center.x + along, y, center.z + perp];
}

function faceRotation(axis: Axis, side: 1 | -1): number {
  if (axis === "z") return side === 1 ? Math.PI / 2 : -Math.PI / 2;
  return side === 1 ? 0 : Math.PI;
}

/**
 * Puts one movie in each slot, in order, and stops when the pool runs out — the remaining
 * slots stay empty rather than repeating a title to fill the shelf.
 */
function layOutRun(run: ShelfRun, pool: Movie[]): ShelfCasePlacement[] {
  const perLevel = slotsPerLevel(run.length);
  const start = -((perLevel - 1) * CASE_STEP) / 2;
  const items: ShelfCasePlacement[] = [];
  let next = 0;

  for (const side of run.sides) {
    for (const levelY of LEVEL_Y) {
      for (let i = 0; i < perLevel; i++) {
        const movie = pool[next];
        if (!movie) return items;
        next += 1;
        const along = start + i * CASE_STEP;
        const perp = side * (run.thickness + 0.012);
        const caseY = levelY + BOARD_THICKNESS / 2 + CASE_HALF_H + 0.006;
        items.push({
          movie,
          position: facePosition(run.axis, run.center, along, perp, caseY),
          rotationY: faceRotation(run.axis, side),
        });
      }
    }
  }
  return items;
}

/**
 * Stocks the store from the real library: every movie appears at most once, genres are grouped
 * under their sign, and the biggest genres get the biggest shelves so fewer titles are left out.
 * Anything without a signed shelf (and any genre too big for its shelf) goes to the back wall.
 */
export function buildStoreShelves(movies: Movie[]): ShelfPlan {
  const signLabels = GENRE_SIGN_SPOTS.map(() => "");
  if (movies.length === 0) return { placements: [], signLabels };

  const byGenre = new Map<string, Movie[]>();
  for (const movie of movies) {
    const existing = byGenre.get(movie.genreBucket);
    if (existing) existing.push(movie);
    else byGenre.set(movie.genreBucket, [movie]);
  }
  const ranked = Array.from(byGenre.entries()).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  const signedRuns = RUNS.filter((run) => run.signIndex !== null).sort((a, b) => capacityOf(b) - capacityOf(a));
  const backRuns = RUNS.filter((run) => run.signIndex === null);

  const poolByRun = new Map<ShelfRun, Movie[]>();
  const leftovers: Movie[] = [];

  signedRuns.forEach((run, index) => {
    const entry = ranked[index];
    if (!entry) {
      poolByRun.set(run, []);
      return;
    }
    const [genre, titles] = entry;
    signLabels[run.signIndex as number] = genre;
    const capacity = capacityOf(run);
    poolByRun.set(run, titles.slice(0, capacity));
    if (titles.length > capacity) leftovers.push(...titles.slice(capacity));
  });

  for (const [, titles] of ranked.slice(signedRuns.length)) leftovers.push(...titles);

  let cursor = 0;
  for (const run of backRuns) {
    const capacity = capacityOf(run);
    poolByRun.set(run, leftovers.slice(cursor, cursor + capacity));
    cursor += capacity;
  }

  const placements: ShelfCasePlacement[] = [];
  for (const run of RUNS) placements.push(...layOutRun(run, poolByRun.get(run) ?? []));

  return { placements, signLabels };
}
