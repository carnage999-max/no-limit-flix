# No Limit Flix — Step 1 Complete

## Project Structure

```
no-limit-flix/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout with Inter font & metadata
│   │   ├── page.tsx            # Home page (test page for now)
│   │   └── globals.css         # Design system & tokens
│   ├── components/             # Reusable UI components (to be built)
│   ├── lib/                    # Utilities & helpers
│   └── types/                  # TypeScript type definitions
│       └── index.ts            # Core data types
├── public/                     # Static assets
├── instructions.txt            # Product specification (locked)
└── no-limit-flix-logo.png     # Brand logo
```

## Design System Overview

### Design Tokens (Locked)

All design tokens are defined in `src/app/globals.css` and follow the specification exactly:

#### Colors
- **Background**: `#0B0B0D` (deep dark)
- **Foreground**: `#F3F4F6` (light text)
- **Silver**: `#A7ABB4` (secondary/borders)

#### Gold Coin Gradient (Primary CTA)
```css
linear-gradient(135deg, #F6D365 0%, #D4AF37 50%, #B8860B 100%)
```

#### Accent Colors (for section rotation)
- Purple: `#8B5CF6`
- Blue: `#3B82F6`
- Teal: `#14B8A6`
- Rose: `#F43F5E`

### Typography Scale

Using **Inter** font from Google Fonts with responsive sizing:

- **Display**: `clamp(2.5rem, 8vw, 5rem)` — Hero headings
- **Heading**: `clamp(1.75rem, 5vw, 3rem)` — Section titles
- **Subheading**: `clamp(1.25rem, 3vw, 1.75rem)` — Subtitles
- **Body**: `1rem` — Standard text
- **Small**: `0.875rem` — Captions & labels

### Animation System

Predefined animations with consistent timing:

- **fadeIn**: Opacity transition
- **slideUp**: Vertical entrance
- **scaleIn**: Scale entrance
- **shimmer**: Loading state animation

Timing variables:
- Fast: `150ms`
- Base: `250ms`
- Slow: `400ms`
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`

### Utility Classes

#### Layout
- `.container-custom` — Max-width container with padding
- `.snap-container` — Scroll snap wrapper
- `.snap-section` — Individual snap section (100vh)

#### Effects
- `.gold-gradient` — Background gradient
- `.gold-gradient-text` — Text gradient
- `.glass-effect` — Glassmorphism effect
- `.hover-lift` — Lift on hover
- `.hover-glow` — Glow on hover
- `.section-cutout` — Bottom cut-out shape

#### Typography
- `.text-display`, `.text-heading`, `.text-subheading`, `.text-body`, `.text-small`

## Mobile-First Principles

1. **Scroll Snap Behavior**: Each section occupies full viewport with snap scrolling
2. **One Decision Per Screen**: No cluttered grids by default
3. **Touch-Optimized**: All interactive elements support touch
4. **Responsive Typography**: Fluid type scales with viewport

## SEO & Accessibility

- Proper semantic HTML structure
- Meta tags for SEO and social sharing
- Keyboard navigation support
- Focus states with gold outline
- ARIA labels (to be added to components)

## Type System

Core TypeScript types defined in `src/types/index.ts`:

- `Movie` — Base movie data
- `MoviePick` — Movie with explanation & providers
- `AIPickRequest/Response` — AI endpoint contracts
- `RepickRequest/Response` — Re-pick endpoint contracts
- `Collection` — Curated collection data
- Filter types for collections

## Next Steps

Step 1 is complete. The foundation is ready:

✅ Project structure created  
✅ Design tokens implemented  
✅ Global styles with animations  
✅ Typography scale defined  
✅ Base layout with Inter font  
✅ Type definitions created  
✅ Development server running  

**Ready for Step 2**: Core UI Components

---

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Server runs at: http://localhost:3000

## Internet Archive Import

Admin-only import tool for direct playback URLs (no downloads, no S3).

Route:
- `GET /admin/import` — UI to import items
- `POST /api/admin/archive/import` — server import endpoint

Request body:
```json
{
  "preset": "public-domain-feature-films",
  "limit": 10,
  "allowMkv": false
}
```

Presets (queries are IA Advanced Search):
- `public-domain-feature-films`: `(collection:(feature_films) OR collection:(publicdomainmovies)) AND mediatype:(movies)`
- `public-domain-cartoons`: `(collection:(classic_cartoons) OR subject:(cartoons)) AND mediatype:(movies)`
- `film-noir`: `(collection:(film_noir) OR subject:("film noir")) AND mediatype:(movies)`

Notes:
- Rights/license metadata is stored as provided by Internet Archive.
- Playback uses direct IA download URLs (`external_legal` source).
