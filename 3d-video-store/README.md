# No Limit Flix — 3D Video Store

A first-person, walkable 3D recreation of the "No Limit Flix" video store UI, built with React Three Fiber. This is a standalone app, independent from `frontend/` and `worker/` — it shares no code or build config with them.

## Run it

```bash
cd 3d-video-store
npm install
npm run dev
```

Open the printed local URL (defaults to `http://localhost:5173`).

Production build: `npm run build` (outputs to `dist/`), preview with `npm run preview`.

## Controls

- **Move:** `W` `A` `S` `D` or arrow keys, or the on-screen floor arrows (click/tap and hold)
- **Turn:** `Q` / `E`
- **Look around:** hold the right mouse button and drag
- **Select a movie:** click any case on the shelves or the central display
- **Play:** click "Play Now" in the right-hand info panel (confirms the selection flow — no real video is wired up)

## Structure

```
src/
  components/3d/     StoreScene, Environment, ShelfUnit, MovieCase, CentralDisplay,
                      NeonSign, GenreSign, PlayerController — all real 3D geometry
  components/ui/      Sidebar, MovieInfoPanel, NavigationArrows, NavigationHelp,
                      TopBar, BottomHelp — HTML/CSS overlays on top of the canvas
  data/                movies.ts (catalog), layout.ts (store floor plan / collision
                      geometry), types.ts
  hooks/               useMovieSelection (selection/favorites state),
                      useKeyboardControls (WASD/arrow binding)
  lib/                 posterTexture.ts / signTexture.ts / surfaceTextures.ts —
                      procedural canvas textures (no external image dependencies),
                      movementInput.ts (shared movement flags), collision.ts
```

## Notable choices

- **No external image/font assets.** Movie posters, the neon sign, genre signs, and
  floor/wall surfaces are all generated procedurally on `<canvas>` at runtime and
  turned into Three.js textures. Nothing depends on a network image URL that could
  break — swap in real poster art later by pointing `createPosterTexture` at real
  images instead.
- **Movement** is driven by a plain mutable `movementInput` object (not React state)
  so held-key/held-button movement doesn't trigger re-renders every frame; only the
  `PlayerController`'s `useFrame` loop reads it.
- **Collision** is simple 2D AABB resolution (`lib/collision.ts`) against the same
  shelf/display bounding boxes used to lay out the geometry (`data/layout.ts`), so
  the visual layout and the walkable space can't drift apart.
- **Perf:** all movie cases of a given size share one `BoxGeometry`, and materials
  are cached per movie id so repeated shelf cases don't allocate new GPU resources.
  Lighting uses three.js's physically-based light units (post r155) — point light
  intensities look large (40–55) on purpose.

## Known limitations

- Poster art is procedurally generated placeholder art, not real movie posters —
  swap `lib/posterTexture.ts` for real artwork when available.
- "Play Now" opens a placeholder confirmation modal; no video playback is wired up.
- The JS bundle is ~1.2MB (three.js + postprocessing) and unsplit — fine for a
  single-page 3D experience, but a candidate for `import()` code-splitting later.
- Tuned primarily for desktop (1920×1080 / 1440×900 / 1366×768); touch drag-to-look
  isn't implemented, only the on-screen arrow buttons for touch input.
