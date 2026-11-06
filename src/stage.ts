import { motionValue } from 'motion/react'

/**
 * State shared between the DOM (GSAP timelines, cursor) and the R3F scene.
 * Plain mutable values read every frame, so no React re-renders and no store library.
 */

/** Intro choreography: GSAP tweens these, the scene reads them in useFrame. */
export const intro = {
  lights: 0, // softboxes switched on, 0..LIGHT_COUNT
  level: 0, // room glow / sparkles / glints, 0..1
  dolly: 1, // camera pull-back, 1 → 0
}
export const LIGHT_COUNT = 16

/**
 * Stone-to-stone transition, tweened by App's master timeline.
 * out: current stone shatters 0 → 1. in: next stone assembles 0 → 1. sweep: light pass across the new stone 0 → 1.
 */
export const trans = { out: 0, in: 1, sweep: 0 }

/**
 * Scroll story below the hero. Written by useScrollStory's single mapping function from scroll position,
 * read by the scene. Deterministic both ways: scrolling up undoes everything.
 */
export const story = {
  hero: 1, // 1 while in the hero, → 0 as the story begins (fades the giant name)
  x: 0, // stone's horizontal offset as a fraction of half the viewport width (+ = right)
  show: 1, // stone presence; 0 = gone (atelier / form / footer)
  rough: 0, // diamond only: rough octahedral crystal around the stone, 1 = whole, 0 = shattered away
  roughAlpha: 1, // its opacity (drops so the planned cut shows through)
  wire: 0, // facet wireframe overlay (Four Cs: cut)
  grade: 0, // diamond only: colour grade 0 = D (colourless) → 1 = K (faint yellow)
  size: 1, // extra scale (clarity zoom, carat)
}

/** Resolves once the scene has compiled shaders and drawn a few frames. */
export let markSceneReady: () => void
export const sceneReady = new Promise<void>((r) => (markSceneReady = r))

/** Pointer state over the stone, for the cursor and for blocking swipe-to-next while dragging. */
export const pointer = {
  overStone: motionValue(false),
  dragging: motionValue(false),
}

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
