import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { reducedMotion, story } from './stage'

gsap.registerPlugin(ScrollTrigger)

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t) }
const GRADES = 'DEFGHIJK'

type Options = {
  count: number
  initial: number
  /** stone the scroll position asks for (hero step, or the diamond once the story starts) */
  onWant: (n: number) => void
}

/**
 * Lenis smooth scroll + ScrollTrigger pins. The hero is pinned for one screen per stone (snapping),
 * then the story sections follow. Everything visual is derived in one `update()` from trigger progress.
 */
export function useScrollStory({ count, initial, onWant }: Options) {
  const api = useRef({ toStone: (_n: number) => {}, toSection: (_sel: string) => {}, start: () => {} })
  const want = useRef(onWant)
  want.current = onWant

  useEffect(() => {
    history.scrollRestoration = 'manual'
    const lenis = new Lenis({ lerp: reducedMotion ? 1 : 0.085, autoRaf: false })
    const glide = (duration: number) => (reducedMotion ? { immediate: true } : { duration })
    const raf = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    lenis.stop() // until the intro hands over
    if (import.meta.env.DEV) Object.assign(window, { __lenis: lenis }) // for scripts/shoot-style captures

    // refreshPriority = page order, so each trigger measures after the pin spacing above it exists
    // (these are created after the sections' own triggers, and creation order isn't page order)
    const hero = ScrollTrigger.create({ trigger: '.hero', pin: true, start: 'top top', end: `+=${(count - 1) * 100}%`, refreshPriority: 5 })
    const earthIn = ScrollTrigger.create({ trigger: '.earth', start: 'top bottom', end: 'top top', refreshPriority: 4 })
    const earth = ScrollTrigger.create({ trigger: '.earth', pin: true, start: 'top top', end: '+=200%', refreshPriority: 3 })
    const cs = ScrollTrigger.create({ trigger: '.cs', pin: true, start: 'top top', end: '+=300%', refreshPriority: 2 })
    const atelierIn = ScrollTrigger.create({ trigger: '.atelier', start: 'top bottom', end: 'top 25%', refreshPriority: 1 })
    const triggers = [hero, earthIn, earth, cs, atelierIn]

    const earthEl = document.querySelector<HTMLElement>('.earth')!
    const csEl = document.querySelector<HTMLElement>('.cs')!
    const gradeEl = document.querySelector<HTMLElement>('.grade-letter')!
    const gradeMarker = document.querySelector<HTMLElement>('.grade-marker')!
    const caratEl = document.querySelector<HTMLElement>('.carat-value')!
    const setStep = (el: HTMLElement, p: number, n: number) => {
      const k = String(Math.min(n - 1, Math.floor(p * n)))
      if (el.dataset.step !== k) el.dataset.step = k
    }

    const update = () => {
      const inHero = earthIn.progress <= 0
      want.current(inHero ? Math.round(hero.progress * (count - 1)) : 0)

      const pe = earth.progress, pc = cs.progress
      story.hero = 1 - earthIn.progress
      story.x = 0.48 * smooth(0, 1, earthIn.progress)
      story.show = 1 - smooth(0, 1, atelierIn.progress)
      // Earth to light: I rough crystal · II it turns translucent, the planned cut drawn inside · III it shatters away
      story.rough = inHero ? 0 : 1 - smooth(0.62, 0.8, pe)
      story.roughAlpha = 1 - 0.78 * smooth(0.24, 0.42, pe) // fully opaque first: the HDR facets would glow through any gap
      const planWire = smooth(0.26, 0.42, pe) * (1 - smooth(0.6, 0.72, pe))
      // Four Cs: cut (wireframe) · colour (D→K) · clarity (magnify) · carat (grow)
      story.wire = Math.max(planWire, smooth(0.02, 0.08, pc) * (1 - smooth(0.2, 0.25, pc)))
      const grade = clamp01((pc - 0.28) / 0.17)
      story.grade = grade * (1 - smooth(0.47, 0.52, pc))
      const zoom = smooth(0.5, 0.56, pc) * (1 - smooth(0.7, 0.76, pc))
      const ct = 0.5 + 3.5 * clamp01((pc - 0.78) / 0.19)
      story.size = pc < 0.76 ? 1 + 0.45 * zoom : Math.cbrt(ct / 2)

      setStep(earthEl, pe, 3)
      setStep(csEl, pc, 4)
      gradeEl.textContent = GRADES[Math.round(grade * (GRADES.length - 1))]
      gradeMarker.style.setProperty('--g', String(grade))
      caratEl.textContent = ct.toFixed(2)
    }
    lenis.on('scroll', () => (ScrollTrigger.update(), update()))
    ScrollTrigger.addEventListener('refresh', update)

    const heroY = (n: number) => hero.start + (n / (count - 1)) * (hero.end - hero.start)

    // Directional snap once scrolling settles in the hero: a small nudge (8% of a step) commits to the next stone
    // in that direction, so one wheel notch or a short swipe is enough.
    let snapTimer = 0
    let settled = initial
    lenis.on('scroll', () => {
      clearTimeout(snapTimer)
      snapTimer = window.setTimeout(() => {
        const f = hero.progress * (count - 1)
        if (hero.progress <= 0 || hero.progress >= 1 || earthIn.progress > 0) return void (settled = Math.round(f))
        // ±0.01: landing exactly on a stone can read as 1.0000012 (sub-pixel trigger start) and must not ceil to 2
        const n = f - settled > 0.08 ? Math.ceil(f - 0.01) : settled - f > 0.08 ? Math.floor(f + 0.01) : Math.round(f)
        settled = n
        const y = heroY(n)
        if (Math.abs(lenis.scroll - y) > 2) lenis.scrollTo(y, glide(0.8))
      }, 140)
    })

    // arrow keys step stone by stone while in the hero
    let keyTarget = -1
    const key = (e: KeyboardEvent) => {
      if (earthIn.progress > 0 || !['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return
      if ((e.target as Element).closest?.('input, textarea, select')) return // typing, not navigating
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
      // while a key-driven glide is still running, step from its target (3 presses = 3 stones, every time)
      const base = keyTarget >= 0 && lenis.isScrolling ? keyTarget : Math.round(hero.progress * (count - 1))
      const n = base + d
      if (n < 0 || n > count - 1) return
      e.preventDefault()
      keyTarget = n
      lenis.scrollTo(heroY(n), glide(1.1))
    }
    addEventListener('keydown', key)

    ScrollTrigger.sort()
    ScrollTrigger.refresh()
    if (initial > 0) lenis.scrollTo(heroY(initial), { immediate: true, force: true })
    update()

    api.current = {
      toStone: (n) => lenis.scrollTo(heroY(n), glide(1.4)),
      toSection: (sel) => lenis.scrollTo(sel, glide(1.8)),
      start: () => lenis.start(),
    }

    return () => {
      removeEventListener('keydown', key)
      clearTimeout(snapTimer)
      gsap.ticker.remove(raf)
      ScrollTrigger.removeEventListener('refresh', update)
      triggers.forEach((t) => t.kill())
      lenis.destroy()
    }
  }, [count, initial])

  return api
}
