import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { motion } from 'motion/react'
import { Leva } from 'leva'
import { gems } from './gems'
import { Loader } from './Loader'
import { Cursor, hasFinePointer } from './Cursor'
import { Globe } from './Globe'
import { pointer, reducedMotion, trans } from './stage'
import { Story } from './Story'
import { useScrollStory } from './useScrollStory'

gsap.registerPlugin(useGSAP, SplitText)

// three / R3F / drei / postprocessing load in their own chunk, so text and the intro paint first
const Scene = lazy(() => import('./Scene').then((m) => ({ default: m.Scene })))

const pad = (n: number) => String(n).padStart(2, '0')
const narrow = matchMedia('(max-width: 860px)')
const subscribeNarrow = (cb: () => void) => (narrow.addEventListener('change', cb), () => narrow.removeEventListener('change', cb))
const N = gems.length

export default function App() {
  // #ruby etc. deep-links to a stone
  const [initial] = useState(() => Math.max(0, gems.findIndex((g) => '#' + g.id === location.hash)))
  const [i, setI] = useState(initial)
  const root = useRef<HTMLElement>(null)
  const gem = gems[i]
  const current = useRef(i)
  current.current = i
  useEffect(() => {
    history.replaceState(null, '', '#' + gem.id)
    document.title = `${gem.name} · ${gem.epithet} — LITHOS`
  }, [gem])

  // Nothing moves until the intro hands over; the first stone's text reveal waits for it.
  const introDone = useRef(false)
  const pendingReveal = useRef<gsap.core.Timeline | null>(null)
  const onIntroDone = () => {
    if (introDone.current) return
    introDone.current = true
    pendingReveal.current?.play()
    document.documentElement.classList.add('intro-done') // nav + rail fade in via CSS
    scroll.current.start()
  }

  // One change at a time; `dir` decides which way text rolls (+1 next, -1 previous).
  const busy = useRef(false)
  const dir = useRef(1)
  // Scroll position says which stone it wants; the transitions catch up one change at a time.
  const want = useRef(initial)
  const sync = () => {
    const n = want.current
    if (n !== current.current) go.current(n, n > current.current ? 1 : -1)
  }
  const scroll = useScrollStory({ count: N, initial, onWant: (n) => ((want.current = n), sync()) })

  // ARRIVAL: runs for each stone. Everything here and in the exit below shares one context,
  // which is reverted on every change, so the new reveal always starts from a clean slate.
  const { contextSafe } = useGSAP(
    () => {
      const d = dir.current
      if (reducedMotion) {
        // cross-fade only; the stone just swaps
        const tl = gsap.timeline({ paused: !introDone.current })
        pendingReveal.current = tl
        tl.from('.name, .idx-num span, .reveal, .spec', { opacity: 0, duration: 0.35 })
        if (introDone.current) tl.call(() => ((busy.current = false), sync()), [], 0.2)
        return
      }
      const split = SplitText.create('.name', { type: 'words,chars', mask: 'chars', charsClass: 'char' })
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, paused: !introDone.current })
      pendingReveal.current = tl
      tl.from(split.chars, { yPercent: 115 * d, duration: 1.4, stagger: 0.035 })
        .from('.idx-num span', { yPercent: 100 * d, duration: 1.1 }, 0)
        .from('.reveal', { y: 18, opacity: 0, duration: 1.1, stagger: 0.06 }, 0.15)
        .from('.spec', { x: 40, opacity: 0, duration: 1.1, stagger: 0.05 }, 0.2)
        .from('.spec hr', { scaleX: 0, transformOrigin: 'right', duration: 1.4, stagger: 0.05 }, 0.25)
      if (introDone.current) {
        // a stone change (not the intro): the new stone assembles from shards, then a light passes over it
        gsap.set(trans, { out: 0 })
        tl.fromTo(trans, { in: 0 }, { in: 1, duration: 1.6, ease: 'expo.out' }, 0)
          .fromTo(trans, { sweep: 0 }, { sweep: 1, duration: 1.2, ease: 'power2.inOut' }, 0.5)
        tl.call(() => ((busy.current = false), sync()), [], 0.9) // once mostly landed, catch up with the scroll
      }
    },
    { scope: root, dependencies: [i], revertOnUpdate: true },
  )

  // EXIT: the current stone shatters while its text leaves, then the state change triggers the arrival above.
  const goTo = contextSafe((n: number, d: number) => {
    if (busy.current || !introDone.current || pointer.dragging.get() || n === current.current) return
    busy.current = true
    dir.current = d
    if (reducedMotion) return void gsap.to('.name, .idx-num span, .reveal, .spec', { opacity: 0, duration: 0.2, onComplete: () => setI(n) })
    gsap.timeline({ defaults: { ease: 'power3.in' }, onComplete: () => setI(n) })
      .to(trans, { out: 1, duration: 0.8, ease: 'power2.in' }, 0)
      .to('.name .char', { yPercent: -115 * d, duration: 0.55, stagger: 0.018 }, 0)
      .to('.idx-num span', { yPercent: -100 * d, duration: 0.5 }, 0)
      .to('.reveal', { y: -14, opacity: 0, duration: 0.45, stagger: 0.04 }, 0.05)
      .to('.spec', { x: -24, opacity: 0, duration: 0.45, stagger: 0.03 }, 0)
  })
  const go = useRef(goTo)
  go.current = goTo

  // On narrow screens the specs live in a bottom sheet: tap the handle or drag it up/down.
  const mobile = useSyncExternalStore(subscribeNarrow, () => narrow.matches)
  const [sheetOpen, setSheetOpen] = useState(false)
  const sheet = useRef<HTMLElement>(null)
  const [sheetClosedY, setSheetClosedY] = useState(0)
  useLayoutEffect(() => setSheetClosedY(mobile ? sheet.current!.offsetHeight - 56 : 0), [mobile, gem])

  const specs: [string, string, string?][] = [
    ['Cut', gem.cutLabel],
    ['Weight', gem.carat],
    ['Species', gem.mineral, gem.formula],
    ['Refractive index', gem.ri],
    ['Dispersion', gem.dispersion],
    ['Hardness', `${gem.hardness} Mohs`],
  ]

  return (
    <>
      <Leva hidden={!(import.meta.env.DEV && location.search.includes('tune'))} collapsed />
      <Loader onDone={onIntroDone} />
      {hasFinePointer && <Cursor />}
      <a className="skip" href="#collection">Skip to the collection</a>
      <header className="nav">
        <nav>
          <a href="#collection" onClick={(e) => (e.preventDefault(), scroll.current.toStone(0))}>Collection</a>
          <a href="#provenance" onClick={(e) => (e.preventDefault(), scroll.current.toSection('#provenance'))}>Provenance</a>
          <a href="#atelier" onClick={(e) => (e.preventDefault(), scroll.current.toSection('#atelier'))}>Atelier</a>
        </nav>
        <a className="wordmark" href="#collection" onClick={(e) => (e.preventDefault(), scroll.current.toStone(0))}>LITHOS</a>
        <a className="cta" href="#viewing" onClick={(e) => (e.preventDefault(), scroll.current.toSection('#viewing'))}>Private viewing</a>
      </header>

      <div className="stage" role="img" aria-label={`${gem.name}, ${gem.cutLabel}, rendered live in 3D. Drag to turn it.`}>
        <Suspense fallback={null}><Scene gem={gem} /></Suspense>
      </div>

      <main ref={root} className="hero" id="collection" tabIndex={-1}>

        <section className="intro" aria-live="polite">
          <p className="idx">
            <span className="idx-num"><span>{pad(i + 1)}</span></span>
            <span className="idx-of reveal"> / {pad(N)}</span>
          </p>
          <p className="eyebrow reveal">{gem.epithet}</p>
          <h1 className="name" key={gem.id} style={{ '--len': Math.max(...gem.name.split(' ').map((w) => w.length)) } as React.CSSProperties}>
            {gem.name}
          </h1>
          <p className="story reveal">{gem.story}</p>
        </section>

        <motion.aside
          ref={sheet}
          className="specs"
          drag={mobile ? 'y' : false}
          dragConstraints={{ top: 0, bottom: sheetClosedY }}
          dragElastic={0.15}
          onDragEnd={(_, { offset, velocity }) => {
            if (offset.y < -40 || velocity.y < -300) setSheetOpen(true)
            else if (offset.y > 40 || velocity.y > 300) setSheetOpen(false)
          }}
          animate={{ y: mobile && !sheetOpen ? sheetClosedY : 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        >
          <button className="sheet-handle" aria-expanded={sheetOpen} onClick={() => setSheetOpen((v) => !v)}>
            Origin &amp; specifications
          </button>
          <Globe coords={gem.coords} origin={gem.origin} />
          <dl>
            {specs.map(([k, v, sub]) => (
              <div className="spec" key={k}>
                <dt>{k}</dt>
                <dd>{v}{sub && <small>{sub}</small>}</dd>
                <hr />
              </div>
            ))}
          </dl>
        </motion.aside>

        <nav className="rail" aria-label="Stones">
          <ol>
            {gems.map((g, n) => (
              <li key={g.id}>
                <button aria-current={n === i} onClick={() => scroll.current.toStone(n)}>
                  {n === i && <motion.span layoutId="rail-line" className="rail-line" transition={{ type: 'spring', stiffness: 220, damping: 30 }} />}
                  <span>{pad(n + 1)}</span>{g.name}
                </button>
              </li>
            ))}
          </ol>
          <p className="hint" aria-hidden="true">Scroll · swipe · ← →</p>
        </nav>
      </main>

      <Story />
    </>
  )
}
