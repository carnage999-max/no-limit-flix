# Frontend Redesign Design

Date: 2026-07-07
Topic: frontend redesign
Scope: `frontend/` only
Constraint: UI-only redesign. No functionality, routing, data flow, API, auth, or interaction logic changes.

## Goal

Apply the new cinematic app-style visual direction across the frontend while preserving all existing behavior. The redesign should closely match the provided mockup on the homepage and extend the same visual system to the rest of the frontend in a way that fits desktop and mobile cleanly.

## Product Direction

### Visual Thesis

Cinematic black-glass interface with gold edge-lighting, restrained magenta and violet glow accents, and a premium entertainment-app feel. The first impression should feel closer to a polished streaming app than to a generic web dashboard.

### Content Thesis

The homepage should read like a discovery poster:
- logo and mode switch first
- headline and search prompt second
- mood and genre selection next
- branded action bars next
- results below the fold

Inner pages should inherit the same shell and styling system without being forced into the homepage composition.

### Interaction Thesis

Motion should be restrained and visual only:
- active nav glow transitions
- gentle tile hover/selection emphasis
- soft section and content reveal

No interaction behavior changes are allowed.

## Non-Goals

- No changes to search logic
- No changes to state shape or state flow
- No changes to API calls or endpoints
- No changes to route structure
- No changes to auth rules or access gating
- No new filters, prompts, or discovery behaviors
- No admin redesign requirement unless explicitly requested later

## Source Material and Assets

The redesign will use:
- existing No Limit Flix logo
- `frontend/public/chair.png` for the homepage hero artwork
- `frontend/public/new-icons/*` for mood and genre tile visuals

The goal is to match the supplied mockup closely, not just borrow general inspiration from it.

## Design Scope

### Shared App Shell

The shared shell should be redesigned across the main frontend experience:
- top navigation/header
- page background treatment
- content spacing and max-width rules
- shared section wrappers
- mobile bottom navigation

The shell should create one consistent visual language across:
- home
- collections
- search
- account
- favorites
- settings
- devices
- support
- about
- privacy
- terms
- watch history
- title/detail pages where the shared frame already applies
- auth, because it renders through the main frontend layout

Pages outside this redesign scope:
- admin pages
- error and not-found pages

### Homepage

The homepage receives the closest visual match to the mockup.

Required characteristics:
- logo in the top-left
- center mode switch treatment for existing watch/discovery behavior
- circular utility actions on the top-right
- chair-based cinematic hero using `chair.png`
- bold headline with gradient emphasis
- pill-style search input
- mood tile row using `public/new-icons`
- secondary explore/category row using `public/new-icons`
- large branded CTA bars matching the visual direction of the mockup
- branded bottom navigation on mobile and a desktop-adapted equivalent

The homepage must remain functionally identical to the current implementation. Existing handlers, conditions, search modes, and result rendering remain intact.

### Inner Pages

All non-admin frontend pages should inherit the same redesign system:
- shared chrome
- black-glass surfaces
- gold-highlight borders and accents
- stronger typography hierarchy
- more deliberate spacing
- consistent input/button/list styling

Inner pages should not be forced into the homepage hero layout. They should adapt the same visual system to their existing utility-focused content.

## Layout Strategy

### Mobile

Mobile should feel closest to the app-style mockup:
- compact cinematic header
- strong hero hierarchy on the homepage
- floating or anchored bottom dock styling
- tile sizing and spacing optimized for touch

### Desktop

Desktop should not simply scale the phone layout. It should become a wider web adaptation of the same system:
- centered shell
- room for wider hero composition
- preserved black-glass and gold/neon styling
- wider content columns where useful

The desktop homepage should keep the chair artwork visually dominant while allowing the left text and controls to breathe.

## Implementation Boundaries

### Layer 1: Shared Shell

Primary files:
- `frontend/src/components/AppFrame.tsx`
- `frontend/src/components/Navbar.tsx`
- `frontend/src/components/MobileTabBar.tsx`
- `frontend/src/app/globals.css`

Responsibilities:
- establish the shared shell
- define background treatment
- define top bar and bottom nav styling
- define global page containers and reusable visual classes

The current app-download banner should be removed from the main shared shell composition for this redesign.

### Layer 2: Homepage UI Rewrite

Primary file:
- `frontend/src/app/page.tsx`

Responsibilities:
- recompose the existing homepage UI into the new visual layout
- replace current mood and genre icon presentation with the matching provided assets from `frontend/public/new-icons`
- preserve all current functionality and handlers

Allowed changes:
- markup structure
- styling
- visual grouping
- layout order where it does not alter behavior

Not allowed:
- changing what controls do
- changing search mode behavior
- changing route behavior
- changing API behavior

### Layer 3: Shared Visual System

Primary file:
- `frontend/src/app/globals.css`

The stylesheet should define reusable primitives for:
- page background
- elevated glass panels
- segmented controls
- pill inputs
- icon tiles
- CTA bars
- section labels
- app dock states

This reduces the amount of one-off inline styling and allows other pages to adopt the same design language consistently.

## Page-by-Page Design Intent

### Home

Highest-fidelity match to the provided mockup. This page acts as the visual benchmark for the redesign.

### Collections, Search, Favorites, Watch History

Keep current page purpose and structure, but restyle with:
- new shell
- stronger hierarchy
- redesigned filters/search inputs
- updated tile and section treatments

### Account, Settings, Devices, Support, About, Privacy, Terms

Keep current informational or utility structure, but present it inside the new cinematic shell rather than the old plain web treatment.

### Watch and Detail Pages

Preserve playback and metadata functionality, and restyle the surrounding chrome, surfaces, and spacing to match the new shared shell.

## Verification Criteria

The redesign is successful when:
- the homepage visually matches the supplied mockup at a glance
- the existing logo, `chair.png`, and `new-icons` assets are integrated cleanly
- the rest of the frontend reads as one consistent product system
- desktop feels like a deliberate widescreen adaptation, not a stretched mobile screen
- all existing interactions still behave exactly as before
- no frontend route loses existing access to actions or content because of the redesign

## Verification Plan

After implementation:
- run the existing frontend checks available in the repository
- verify the main shared-shell routes render correctly
- verify homepage watch/discovery switching still works
- verify homepage search modes still work
- verify mood selection still works
- verify CTA actions still trigger the same handlers as before
- verify bottom navigation and top navigation still route correctly
- verify account/profile entry points still work

## Risks

- The homepage file currently mixes substantial UI and logic, so the UI rewrite must avoid accidental behavior changes.
- Shared shell changes can unintentionally affect utility pages that currently rely on simpler spacing and structure.
- The redesign depends on maintaining a tight line between layout changes and logic changes; that boundary must be reviewed carefully during implementation.

## Recommended Implementation Sequence

1. Build the shared visual tokens and shell primitives.
2. Redesign the shared top and bottom navigation.
3. Recompose the homepage UI around the mockup while preserving current logic.
4. Apply the shared shell and visual system to the rest of the non-admin frontend pages.
5. Verify unchanged behavior on key routes.
