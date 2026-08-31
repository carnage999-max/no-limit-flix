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

export const STANDEES: { x: number; z: number; rotationY: number; movieId: string }[] = [
  { x: -2.35, z: 0.2, rotationY: 0.32, movieId: "john-wick-4" },
  { x: 2.35, z: 0.2, rotationY: -0.32, movieId: "top-gun-maverick" },
];

export const OBSTACLES: Box2D[] = [
  ...SHELF_ISLANDS,
  ...WALL_SHELVES,
  ...BACK_SHELVES,
  CENTRAL_DISPLAY,
  ...STANDEES.map((s) => ({ x: s.x, z: s.z, halfW: 0.42, halfD: 0.42 })),
];

export const GENRE_SIGNS: { label: string; x: number; z: number }[] = [
  { label: "ACTION", x: -7.0, z: -1.6 },
  { label: "COMEDY", x: -3.4, z: -1.6 },
  { label: "HORROR", x: 3.4, z: -1.6 },
  { label: "SCI-FI", x: 7.0, z: -1.6 },
];

export const PLAYER_START = { x: 0, z: 4.2, yaw: 0, pitch: -0.06 };
