import { useRef } from 'react'
import gsap from 'gsap'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { useGSAP } from '@gsap/react'
import { parseCoords } from './gems'
import { reducedMotion } from './stage'

gsap.registerPlugin(ScrambleTextPlugin)

const R = 40
const rad = Math.PI / 180

/** Orthographic graticule (every 30°) centred on [lat0, lon0], as one SVG path; hidden hemisphere skipped. */
function graticule(lat0: number, lon0: number) {
  const sp0 = Math.sin(lat0 * rad), cp0 = Math.cos(lat0 * rad)
  const proj = (lat: number, lon: number) => {
    const p = lat * rad, l = (lon - lon0) * rad
    const visible = sp0 * Math.sin(p) + cp0 * Math.cos(p) * Math.cos(l) > 0
    return [R * Math.cos(p) * Math.sin(l), -R * (cp0 * Math.sin(p) - sp0 * Math.cos(p) * Math.cos(l)), visible] as const
  }
  let d = ''
  const line = (pts: (readonly [number, number])[]) => {
    let pen = false
    for (const [lat, lon] of pts) {
      const [x, y, v] = proj(lat, lon)
      if (v) d += `${pen ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
      pen = v
    }
  }
  const steps = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, k) => a + ((b - a) * k) / n)
  for (let lon = -180; lon < 180; lon += 30) line(steps(-90, 90, 36).map((lat) => [lat, lon] as const))
  for (let lat = -60; lat <= 60; lat += 30) line(steps(-180, 180, 72).map((lon) => [lat, lon] as const))
  return d
}

/** Small wireframe globe that turns to the mine; the pin sits at the centre. Coordinates scramble in. */
export function Globe({ coords, origin }: { coords: string; origin: string }) {
  const root = useRef<HTMLDivElement>(null)
  const path = useRef<SVGPathElement>(null)
  const view = useRef<{ lat: number; lon: number } | null>(null)

  useGSAP(
    () => {
      const [lat, lon] = parseCoords(coords)
      const first = !view.current
      const v = (view.current ??= { lat, lon })
      const draw = () => path.current!.setAttribute('d', graticule(v.lat, v.lon))
      if (first || reducedMotion) return void ((v.lat = lat), (v.lon = lon), draw()) // no travel
      // shortest way round
      const lonTarget = v.lon + ((((lon - v.lon) % 360) + 540) % 360) - 180
      gsap.to(v, { lat, lon: lonTarget, duration: 1.8, ease: 'power3.inOut', overwrite: true, onUpdate: draw })
      gsap.from('.pin', { scale: 0, transformOrigin: '50% 50%', duration: 0.9, ease: 'back.out(3)', delay: 1.3 })
      gsap.to('.coords', { duration: 1.4, delay: 0.4, scrambleText: { text: coords, chars: '0123456789°', speed: 0.5 } })
    },
    { scope: root, dependencies: [coords] },
  )

  return (
    <div ref={root} className="origin spec">
      <svg viewBox="-50 -50 100 100" aria-hidden="true">
        <circle className="globe-edge" r={R} />
        <path ref={path} className="globe-grid" />
        <g className="pin">
          <circle className="pin-pulse" r="7" />
          <circle r="2.2" />
        </g>
      </svg>
      <div>
        <p className="origin-k">Origin</p>
        <p className="origin-v">{origin}</p>
        <p className="coords" aria-label={coords}>{coords}</p>
      </div>
    </div>
  )
}
