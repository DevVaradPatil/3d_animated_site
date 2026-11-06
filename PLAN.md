# LITHOS — Maison de Pierres
A real-time 3D haute-joaillerie landing page. Seven stones and seven origins, one at a time.

> Working brand name and copy. Swap freely. Geology facts are real; the specific pieces (carat, grade) are fictional.

---

## 1. Concept
**"Light, split and returned."** The page is a dark, quiet gallery. Each stone floats alone under studio light, turning slowly, while its story and data arrive from the sides like an auction-catalogue entry. Swipe, scroll or use the arrow keys and the stone leaves, the room re-tints, and the next one arrives.

| # | Stone | Cut (procedural) | Origin | Signature effect |
|---|-------|------------------|--------|------------------|
| 01 | Diamond | Round brilliant | Jwaneng, Botswana | max fire / dispersion |
| 02 | Ruby | Oval | Mogok, Myanmar | red inner glow (fluorescence) |
| 03 | Sapphire | Cushion | Ratnapura, Sri Lanka | deep blue body colour |
| 04 | Emerald | Emerald step cut | Muzo, Colombia | long "hall of mirrors" flashes |
| 05 | Imperial Topaz | Pear | Ouro Preto, Brazil | warm sherry glow |
| 06 | Tanzanite | Marquise | Merelani Hills, Tanzania | violet ↔ blue tone |
| 07 | Alexandrite | Princess | Ural Mountains, Russia | live colour change, green → raspberry |

## 2. Design system
- **Palette:** ink `#050506`, ivory `#EDE6DA`, champagne gold `#C9A96E`, hairlines at 16% ivory. Each stone adds one tint that glows behind it.
- **Type:** *Cormorant Garamond* Light for the giant names and italic epithets. *Inter Tight* for UI. *JetBrains Mono* for data, coordinates and indices. All are OFL and self-hosted with @fontsource.
- **Layout:** catalogue grid. Story column on the left, stone at centre, spec sheet with hairline rules on the right, and an index rail along the bottom.
- **Motion language:** expo-out easing. Characters rise out of a mask, hairlines draw from right to left, and nothing bounces.

## 3. Stack (chosen from research, versions current on npm as of 2026-11-06)
| Layer | Choice | Why |
|---|---|---|
| Build | **Vite 8 + React 19 + TS** | Single-page WebGL piece with no SSR, so this is the leanest option. Static deploy to Vercel. |
| 3D | **three r187 + @react-three/fiber 9.8** | R3F v10 (WebGPU-first) is still alpha. |
| Gem shader | **Own GLSL material (forked from drei `MeshRefractionMaterial`) + three-mesh-bvh** | Multi-bounce ray-traced refraction, Fresnel gloss, Beer–Lambert colour and exit-facet dispersion. GLSL means WebGL2; WebGPURenderer can't run it. |
| Geometry | **Procedural cuts** (`src/cut.ts`) | Girdle outline + facet rings → `ConvexGeometry`. 7 cuts in ~70 lines, no model files or licences, and proportions can be tuned. |
| Lighting | **Procedural studio cube map** | Emissive softboxes baked once into a cube map, with no HDRI download. |
| Post | **@react-three/postprocessing** | Bloom (mipmap), AgX tone mapping, film grain, vignette. |
| Choreography | **GSAP 3.15** (free incl. SplitText, Observer, ScrollTrigger since the Webflow deal) + `@gsap/react` | Owns every timeline and text reveal, plus swipe input. |
| UI micro-motion | **Motion 14** | Menu, cursor and layout transitions (AnimatePresence). It stays out of GSAP's lane. |
| Smooth scroll | **Lenis** | Drives the pinned hero + story sections, synced to the GSAP ticker. |
| Tuning | **Leva** (dev only) | Live knobs for IOR, fire and bounces per stone. |

**Deliberately not used:** a WebGPU renderer (it breaks the gem shader), Next.js (no server needs), GLTF models (procedural is lighter), and Theatre.js (GSAP covers it).

## 4. Phases
Each phase ends runnable and is reviewed before the next starts.

### Phase 0: Research, init, plan, prototype ✅
- Vite/TS scaffold, dependencies, fonts, git.
- Procedural cut generator for all 7 cuts and the gem data file.
- Hero prototype: refracting diamond, studio light, post, brand layout, basic stone switching, SplitText reveals.

### Phase 1: Gem realism ✅
- **Own gem shader** (`src/gemMaterial.ts`), forked from drei's refraction material:
  - Schlick Fresnel surface gloss.
  - Beer–Lambert body colour from the real path length inside the stone, so stones are pale at the edges and saturated in the core.
  - Per-channel dispersion at the exit facet, which gives real "fire" for the cost of one trace.
  - It also removes the three r187 chunk shim.
- **True 57-facet brilliant**: every kite and pavilion main is placed to be exactly planar. `node src/cut.check.ts` asserts 57 + 16 girdle planes. The step cut is now a chamfered octagon with 3 + 3 tiers and a keel.
- **Glints**: star-burst point sprites on the crown facets, faded by facing angle and caught by bloom.
- **Giant name** floats behind the stone, sized to stay between the columns.
- **Adaptive quality**: `PerformanceMonitor` drops DPR, bounces, MSAA and glints.
- **Measured** on an Intel UHD iGPU: ~5 ms/frame; 61 fps in headless Chrome for all 7 stones.
- Per-stone optics are frozen in `gems.ts`. Tune live with `?tune` in dev, which shows Leva.
- **Dropped:** the name refracting *through* the stone. Brilliant and step cuts return light out of the top instead of transmitting it, so the effect was invisible. The studio cube is baked once; Phase 2 makes it live while the lights animate.
- **Deep links:** `#ruby`, `#emerald`, … open a stone directly. `scripts/shoot.mjs` takes real-time screenshots for review.

### Phase 2: Hero interaction ✅
- **Intro** (`src/Loader.tsx`):
  - GSAP DrawSVG draws the gold girdle, then the 57-facet top view line by line, with LITHOS rising and a 000 → 100 counter.
  - It **holds until the scene has compiled and drawn**, so there is never a black flash.
  - The mark blurs out and the stone appears in total darkness. The 16 softboxes then **switch on one by one with a fluorescent flicker** (re-rendering the studio cube only while they change), as the camera dollies in and the room glow, sparkles and glints fade up.
  - The text reveal and the nav/rail wait for the hand-over.
- **Drag to spin** with fling inertia that eases back to the idle spin. Vertical drag tilts and springs back. Pointer capture means releasing outside the window never leaves the stone stuck, and a drag on the stone never counts as a swipe to the next stone.
- **Custom cursor** (Motion springs, fine pointers only): dot + trailing ring; it grows over links, becomes a frosted "DRAG" lens over the stone and "← →" while dragging.
- `prefers-reduced-motion` skips the choreography: the lights are already on and the overlay just fades.
- `src/stage.ts` holds the shared DOM ↔ scene state as plain values and Motion values, so there are no React re-renders per frame.
- Verified with real-time headless captures: the intro timeline, hover/drag/release cursor states, wheel → next stone after the intro, and no exceptions.
- **Gotcha logged:** a GSAP tween created inside another GSAP context's timeline callback didn't render, so the nav/rail reveal is a CSS class transition instead. Phase 3 should use `contextSafe` for callback-created tweens.

### Phase 3: The stone-to-stone transition ✅
- **Exit (0.8 s):** the stone spins up, shrinks and **shatters**. Each facet triangle shrinks to its centroid and flies outward, staggered per shard, in the gem's vertex shader. The camera pushes in, the watermark fades, and the glints switch off. Meanwhile the name's characters leave upward through their mask, the index rolls, the story lines lift away and the spec rows slide out.
- **Arrival (1.6 s):** the next stone drops in spinning and **assembles from shards**. A bright strip then **sweeps across the studio cube**, so a flash runs across the crown, while the room re-tints and the camera eases back. Text rises in by character, the index rolls up from below, specs slide in and hairlines draw.
- **Direction-aware:** going backwards (←, ↑ or an earlier rail item) reverses the text and index roll.
- **Origin globe** (`src/Globe.tsx`): an orthographic wireframe graticule (pure math, no map data) that turns the shortest way round to each mine. A gold pin pops in with a pulse, and the coordinates resolve through **GSAP ScrambleText**. `node src/gems.check.ts` validates every stone's coordinates.
- **Input:** wheel, touch swipe, ← → ↑ ↓ and rail clicks all go through one `goTo`, one change at a time. Input unlocks once the new stone has mostly landed. Verified: mashing → exactly one change; drag ≠ swipe.
- **Rail underline** glides between stones with a Motion `layoutId` spring.
- Stones transition **sequentially, never both at once**, so the iGPU never ray-traces two stones in the same frame.
- **Context design:** exit tweens are made with `useGSAP`'s `contextSafe`, so they share one context with the arrival. A single revert per change resets everything before the next reveal, all in the same layout effect, so nothing flashes.

### Phase 4: Story below the fold ✅
- **Scroll architecture** (`src/useScrollStory.ts`):
  - Lenis smooth scroll drives the GSAP ticker.
  - The hero is **pinned for one screen per stone**, with directional snap: an 8% nudge commits to the next stone, so one wheel notch or a short swipe is enough. This replaces the wheel-to-switch handler, so a swipe is just native scroll on every device.
  - **One mapping function** turns trigger progress into everything visual: the wanted stone, `story.*` for the scene, and each section's `data-step`. It is deterministic in both directions.
  - Arrow keys step stones inside the hero. Nav links and rail clicks scroll with Lenis.
- **One fixed WebGL stage** behind every section. The stone *travels*: it slides right for the story and vanishes before the atelier. Sections pass pointer events through to it except where interactive.
- **Stone engine:** the scroll position states which stone it wants; the transition engine catches up one change at a time. Leaving the hero shatters the 7th stone and assembles the diamond.
- **From earth to light** (pinned, 3 steps):
  - I. An opaque **frosted octahedral rough** encloses the stone.
  - II. It turns translucent, with the planned brilliant's **facet wireframe drawn inside**.
  - III. The rough **shatters away** and the stone grows to full size.
  - *First attempt:* morphing the cut mesh into an octahedron. It couldn't reach the octahedron's tips (no vertices there), so it was replaced with a separate rough mesh.
- **The four Cs** (pinned, 4 steps), demonstrated live:
  - Cut: blueprint edges.
  - Colour: scroll drifts the stone D → K, with a live grade letter and marker.
  - Clarity: magnification.
  - Carat: 0.50 → 4.00 ct; the stone grows by the cube root of its weight.
- **Atelier:** a statement filled word by word on scroll (SplitText + scrub), then stat counters.
- **Private viewing:** a native form (required fields, email type, date `min` = today, stone select) with a Motion confirmation. *No backend*, marked with a `ponytail:` note.
- **Footer:** a giant wordmark whose tracking opens as you reach the end.
- **Verified** with a 14-stop scroll journey: correct stone/step at every stop, back-scroll restores the hero stone, drag ≠ scroll, one wheel notch → next stone, form validation and submit, no exceptions.

### Phase 5: Polish, accessibility, performance ✅
- **Bundle:**
  - Leva is aliased to a no-UI stub in production (`vite.config.ts` → `src/leva-stub.ts`).
  - The whole 3D stack (three / R3F / drei / postprocessing / bvh) is a **lazy chunk** that loads during the intro.
  - Latin-only font subsets.
  - Result: **main 184 KB gz** (React, GSAP, Motion, Lenis), under the 250 KB budget; **3D 338 KB gz**; total down from 590 → 522 KB.
- **Reduced motion** (OS setting):
  - The intro's lights are already on, stones cross-fade instead of shattering, and there's no idle spin, float, parallax, glints or sparkles.
  - Lenis smoothing is off, and snaps and jumps are immediate. Counters and the globe jump; CSS transitions and animations are off.
  - Drag-to-turn still works, because the visitor starts it.
  - **Bug found and fixed:** the usual `transition-duration: 0.01ms` snippet gives *every* property a transition. ScrollTrigger then measured pin spacing mid-transition (the story started one screen into the page) and GSAP read opacity mid-transition (the title stayed invisible). It is now `transition: none`.
- **Keyboard and semantics:**
  - Skip link and gold `:focus-visible` rings.
  - The rail is a labelled `<nav>`, and the 3D stage is `role="img"` with a label naming the current stone.
  - `document.title` follows the stone, and `aria-live` copy announces changes.
  - Arrow keys are ignored while typing in the form. Key stepping is deterministic: 3 presses = 3 stones (a snap-rounding bug that turned 1 press into 2 was also fixed).
  - OG/Twitter meta, `<noscript>` message.
- **Mobile:**
  - Portrait screens lift the stone into the upper part and fit it to the width (the rough crystal too), with copy below.
  - Specs move into a **Motion drag bottom sheet** with a handle (tap or drag, velocity-aware).
  - The rail shows numbers only, the header is compact, and sections stack in one column.
  - Touch: vertical swipes scroll (`touch-action: pan-y`), horizontal drags turn the stone.
- **Verified** (headless Chrome, real time): desktop + 390×844 touch + reduced-motion runs, tab order, sheet open, form, key/wheel/drag/rail tests, no exceptions. Unit checks: `node src/cut.check.ts`, `node src/gems.check.ts`.
- **Known:** LCP is ~4.1 s **by design**, because the largest text appears when the intro hands over (~4 s). Options if it matters for Lighthouse: a shorter intro, or letting any input skip it.
- **Skipped:** the optional sound design.

### Phase 6: Ship ✅
- **Live:** https://3danimatedsite.vercel.app (Vercel project `3d_animated_site`, static Vite build).
- **Repo:** https://github.com/DevVaradPatil/3d_animated_site (public). It is linked to Vercel, so pushes to `main` auto-deploy to production.
- `vercel.json`:
  - Hashed `/assets` cached for a year as `immutable`, `/fonts` for a week; HTML revalidates.
  - `nosniff`, `Referrer-Policy` and `Permissions-Policy` headers.
  - Plain JSON instead of `vercel.ts`, because `@vercel/config` pulls in 4 high-severity advisories with no fix, for three header rules.
- **Favicon:** the brilliant's top view in gold on ink (SVG), plus a 180 px Apple touch icon.
- **Social card:** a 1200×630 `og.jpg` rendered from the live scene by `scripts/og.mjs`. OG/Twitter tags use absolute URLs.
- **Verified live:** status and headers for HTML, JS, fonts and images; a real-time capture of the production build (61 fps, `#emerald` deep link, no exceptions).
- **Not done:** analytics (one line with `@vercel/analytics` if wanted), a custom domain, and a backend for the viewing form.

## 5. Known risks
- **Throttled preview:** the in-app browser pane throttles WebGL to ~1 fps when the window isn't focused. Judge visuals and fps with `scripts/shoot.mjs`, not the pane.
- **Refraction cost** grows with bounces × pixels. Keep the stone under ~40% of the viewport and use adaptive DPR.
- **Coloured stones** under exaggerated IOR are an artistic choice. The real RI is shown in the spec sheet; the render IOR is in `gems.ts → render`.

## Sources
- R3F v10 alpha, WebGPU-first: <https://newreleases.io/project/npm/@react-three/fiber/release/10.0.0-alpha.6>
- WebGPURenderer limits (no ShaderMaterial / EffectComposer): <https://threejs.org/manual/en/webgpurenderer.html>
- drei MeshRefractionMaterial: <https://drei.docs.pmnd.rs/shaders/mesh-refraction-material>
- Real-time diamond shader techniques: <https://discourse.threejs.org/t/i-made-two-real-time-diamond-shaders/92948>, <https://github.com/rubjo/gemrenderer>
- GSAP 100% free (SplitText etc.): <https://webflow.com/blog/gsap-becomes-free>
- Gem refractive indices: <https://gemsociety.org/article/table-refractive-index-double-refraction-gems>
- Jewellery WebGL inspiration: <https://www.awwwards.com/inspiration/thumbnail-floema-jewelry>, <https://www.awwwards.com/sites/extremely-piaget>
