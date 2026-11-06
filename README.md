# LITHOS — Maison de Pierres

**Live: https://3danimatedsite.vercel.app**

A real-time 3D landing page for a (fictional) haute-joaillerie house. Seven gemstones, each cut, lit and
ray-traced live in WebGL, with no image or model files. Scroll through the collection, then follow a diamond
from rough crystal to polished stone and through the four Cs.

## Run

```bash
npm install
npm run dev        # http://localhost:5173  (add ?tune for live material controls)
npm run build      # type-check + production build to dist/
```

## How it's built

| Area | Where | Notes |
|---|---|---|
| Gem cuts | `src/cut.ts` | 7 cuts generated as convex hulls. The round brilliant has exactly 57 planar facets (`node src/cut.check.ts`). |
| Gem shader | `src/gemMaterial.ts` | BVH ray-traced refraction (three-mesh-bvh), Fresnel gloss, Beer–Lambert colour, exit-facet dispersion, shatter. |
| Scene | `src/Scene.tsx` | Procedural studio cube map, glints, rough crystal, adaptive quality, post-processing. |
| Intro | `src/Loader.tsx` | DrawSVG facet drawing, then the studio lights switch on one by one. |
| Stone transitions | `src/App.tsx` | One GSAP context: shatter out, text out, assemble in, light sweep, text in. |
| Scroll story | `src/useScrollStory.ts`, `src/Story.tsx` | Lenis + ScrollTrigger pins. One function maps scroll position to everything visual. |
| Shared state | `src/stage.ts` | Plain values the DOM writes and the scene reads every frame (no re-renders). |
| Data | `src/gems.ts` | Real geology, fictional pieces (`node src/gems.check.ts`). |

Stack: Vite, React 19, three r187, React Three Fiber 9, drei, postprocessing, GSAP 3.15 (SplitText, DrawSVG,
ScrambleText, ScrollTrigger), Motion, Lenis.

## Scripts

- `node scripts/shoot.mjs <outDir> <waitMs> <stoneId…>`: real-time headless-Chrome screenshots with fps per stone.
  The in-app preview pane throttles WebGL when it isn't focused, so use this for visual review.
- `node scripts/og.mjs`: regenerates `public/og.jpg` (social card) and `public/apple-touch-icon.png` from the live scene.

Both take `URL=` if the dev server isn't on `:5173`.

## Deploy

The Vercel project is linked to this repo: every push to `main` deploys to production, and other branches and PRs get preview deployments.

## Notes

- The private-viewing form has no backend yet. Wire it to an email or CRM service before launch.
- `prefers-reduced-motion` is fully supported: cross-fades instead of shatters, and nothing moves on its own.
- See `PLAN.md` for the phase-by-phase build log and decisions.
