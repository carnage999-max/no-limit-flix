// Store floor plan and collision geometry. Positions are fixed set-dressing;
// WHAT appears at each shelf/sign/standee (real movies, real genre labels)
// is resolved at runtime from the library — see lib/useLibraryMovies.ts.
export interface Box2D {
  x: number;
  z: number;
  halfW: number;
  halfD: number;
}

export const STORE_BOUNDS = {
  minX: -9.0,
  maxX: 9.0,
  minZ: -12.0,
  maxZ: 6.6,
};

export const ROOM = {
  wallX: 9.3,
  backZ: -12.5,
  frontZ: 7.2,
  ceilingY: 5.2,
  floorY: 0,
};

export const EYE_HEIGHT = 1.68;
export const PLAYER_RADIUS = 0.42;

export const SHELF_HEIGHT = 3.1;
export const SHELF_LEVELS = 5;

export const SHELF_ISLANDS: Box2D[] = [
  { x: -3.35, z: -6, halfW: 0.55, halfD: 5.0 },
  { x: 3.35, z: -6, halfW: 0.55, halfD: 5.0 },
];

export const WALL_SHELVES: Box2D[] = [
  { x: -8.75, z: -6, halfW: 0.45, halfD: 5.3 },
  { x: 8.75, z: -6, halfW: 0.45, halfD: 5.3 },
];

export const BACK_SHELVES: Box2D[] = [
  { x: -5.0, z: -12.0, halfW: 2.9, halfD: 0.4 },
  { x: 5.0, z: -12.0, halfW: 2.9, halfD: 0.4 },
];

export const CENTRAL_DISPLAY: Box2D = { x: 0, z: -2.6, halfW: 1.7, halfD: 1.05 };

/** Fixed hanging points for the two standee cut-outs; which movies appear there is chosen at runtime. */
export const STANDEE_SPOTS: { x: number; z: number; rotationY: number }[] = [
  { x: -2.35, z: 0.2, rotationY: 0.32 },
  { x: 2.35, z: 0.2, rotationY: -0.32 },
];

export const OBSTACLES: Box2D[] = [
  ...SHELF_ISLANDS,
  ...WALL_SHELVES,
  ...BACK_SHELVES,
  CENTRAL_DISPLAY,
  ...STANDEE_SPOTS.map((s) => ({ x: s.x, z: s.z, halfW: 0.42, halfD: 0.42 })),
];

/**
 * Fixed hanging points for the genre signs, one per shelf run (the two wall
 * shelves and the two shelf islands). Which genre label hangs at each point
 * is decided at runtime from what's actually in the library.
 */
export const GENRE_SIGN_SPOTS: { x: number; z: number }[] = [
  { x: -7.0, z: -1.6 }, // above WALL_SHELVES[0]
  { x: -3.4, z: -1.6 }, // above SHELF_ISLANDS[0]
  { x: 3.4, z: -1.6 }, // above SHELF_ISLANDS[1]
  { x: 7.0, z: -1.6 }, // above WALL_SHELVES[1]
];

export const PLAYER_START = { x: 0, z: 4.2, yaw: 0, pitch: -0.06 };
