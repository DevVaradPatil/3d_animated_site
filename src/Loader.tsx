import { useRef } from 'react'
import gsap from 'gsap'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { useGSAP } from '@gsap/react'
import { intro, LIGHT_COUNT, reducedMotion, sceneReady } from './stage'

gsap.registerPlugin(DrawSVGPlugin)

// Top view of the 57-facet brilliant, same proportions as cut.ts (table 57%, star tips at 76%).
const facetLines = (() => {
  const R = 92, q = Math.PI / 4
  const p = (r: number, a: number) => `${(100 + R * r * Math.sin(a)).toFixed(2)} ${(100 - R * r * Math.cos(a)).toFixed(2)}`
  const T = (k: number) => p(0.57, k * q) // table corner
  const S = (k: number) => p(0.763, k * q + q / 2) // star tip
  const G = (k: number) => p(1, (k * q) / 2) // girdle point every 22.5°
  const out: string[] = []
  for (let k = 0; k < 8; k++) out.push(`M${T(k)}L${T(k + 1)}`) // table
  for (let k = 0; k < 8; k++) out.push(`M${T(k)}L${S(k)}L${T(k + 1)}`) // star facets
  for (let k = 0; k < 8; k++) out.push(`M${S(k - 1)}L${G(2 * k)}L${S(k)}`) // kites
  for (let k = 0; k < 8; k++) out.push(`M${S(k)}L${G(2 * k + 1)}`) // upper girdle split
  return out
})()

/** Full-screen intro: the brilliant is drawn facet by facet, then the studio lights switch on one by one. */
export function Loader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const count = useRef<HTMLSpanElement>(null)

  useGSAP(
    () => {
      if (reducedMotion) {
        Object.assign(intro, { lights: LIGHT_COUNT, level: 1, dolly: 0 })
        sceneReady.then(() => gsap.to(root.current, { autoAlpha: 0, duration: 0.4, onComplete: onDone }))
        return
      }
      let ready = false
      sceneReady.then(() => (ready = true))
      const n = { v: 0 }
      const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } })
      tl.from('.loader-girdle', { drawSVG: '50% 50%', duration: 1.5 }, 0)
        .from('.loader-line', { drawSVG: 0, duration: 0.8, stagger: 0.022 }, 0.2)
        .from('.loader-word span', { yPercent: 110, duration: 1.3, ease: 'expo.out' }, 0.5)
      tl.to(n, {
        v: 100, duration: tl.duration(), ease: 'power1.inOut',
        onUpdate: () => void (count.current!.textContent = String(Math.round(n.v)).padStart(3, '0')),
      }, 0)
        // hold here until shaders are compiled and the first frames are drawn
        .add(() => void (ready || (tl.pause(), sceneReady.then(() => tl.resume()))))
        .to('.loader-mark', { scale: 1.25, opacity: 0, filter: 'blur(8px)', duration: 1, ease: 'expo.in' })
        .to('.loader-meta', { opacity: 0, duration: 0.4 }, '<')
        .to(root.current, { autoAlpha: 0, duration: 0.9 }, '-=0.3')
        // lights come on slowly at first, then the rest of the rig in quick succession
        .to(intro, { lights: LIGHT_COUNT, duration: 2.4, ease: 'power1.in' }, '<0.2')
        .to(intro, { level: 1, duration: 2.6 }, '<0.5')
        .to(intro, { dolly: 0, duration: 3.4, ease: 'expo.out' }, '<-0.6')
        .add(onDone, '-=2.4')
    },
    { scope: root },
  )

  return (
    <div ref={root} className="loader" aria-hidden="true">
      <div className="loader-mark">
        <svg viewBox="0 0 200 200">
          <circle className="loader-girdle" cx="100" cy="100" r="92" />
          {facetLines.map((d, k) => <path key={k} className="loader-line" d={d} />)}
        </svg>
        <p className="loader-word"><span>LITHOS</span></p>
      </div>
      <p className="loader-meta">
        <span>Maison de Pierres</span>
        <span><span ref={count}>000</span> / 100</span>
      </p>
    </div>
  )
}
