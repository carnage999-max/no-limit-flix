# 3D store — optional real textures

The 3D store (`/3d`) generates its floor/wall/ceiling textures procedurally on a
`<canvas>` so it never depends on an external image. It looks fine, but a real
tileable photo will always read as more "built" than a flat colour with drawn
lines on it.

The code already looks for real images at the paths below and swaps them in
automatically — no code changes needed. Drop a file at a path and reload the
page; if it's missing, the procedural version keeps being used.

| Surface | Path | Repeats |
|---|---|---|
| Floor | `frontend/public/3d/textures/floor.jpg` | 9 × 10 |
| Wall | `frontend/public/3d/textures/wall.jpg` | 6 × 3 |
| Ceiling | `frontend/public/3d/textures/ceiling.jpg` | 8 × 5 |

Each one should be a **seamless, tileable, square** image — the same pattern
repeated on all four edges with no visible seam — not a single room photo.
2048×2048 for the floor, 1024×1024 for the wall and ceiling is plenty; this
app has no normal/roughness maps, just one colour image per surface.

## Prompts

**Floor** (`floor.jpg`)
> Seamless, tileable, top-down texture of a polished dark charcoal-grey
> concrete/terrazzo floor for a retro video rental store. Subtle warm
> reflections, faint scuff wear, no visible seams at the edges. Square,
> 2048×2048. Flat, even studio lighting with no strong directional shadow
> baked in, so it can be relit in a 3D scene. No text, no logos, no people.

**Wall** (`wall.jpg`)
> Seamless, tileable material texture of a dark acoustic wall panel —
> charcoal fabric-wrapped panels with thin brushed-metal trim lines between
> them, subtle noise grain. Square, 1024×1024. Flat, even lighting, no text,
> no logos.

**Ceiling** (`ceiling.jpg`)
> Seamless, tileable texture of a dark matte acoustic ceiling tile grid,
> charcoal/near-black, faint grid seams, subtle noise. Square, 1024×1024.
> Flat, even lighting, no text, no logos, no light fixtures (the scene
> places its own recessed lights on top).

## Optional: a nicer control-hint graphic

The "How to Navigate" card currently draws its move/look/select hint as a
small CSS grid. A flat icon-style remote control (like the reference image)
would read better there. Not wired up yet — ask if you want this added once
the image exists.

> Flat vector-style illustration of a modern streaming-box remote control:
> dark matte body, a central purple/gold circular d-pad with an "OK" button,
> a few small icon buttons below it. Viewed straight-on, transparent
> background, PNG, clean minimal icon style, no shadow, no brand logos,
> 512×512.
