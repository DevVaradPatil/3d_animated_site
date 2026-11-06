import { Vector3 } from 'three'
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js'

// Every cut here is convex, so a gem = facet vertices + a convex hull. The hull triangulates for us;
// vertices are placed so each real facet comes out exactly planar (no modelling, no assets).

export type CutName = 'round' | 'oval' | 'cushion' | 'princess' | 'emerald' | 'pear' | 'marquise'

type Outline = (a: number) => [number, number]
const TAU = Math.PI * 2

const superellipse = (n: number, w: number, h: number): Outline => (a) => {
  const c = Math.cos(a), s = Math.sin(a)
  const r = (Math.abs(c / w) ** n + Math.abs(s / h) ** n) ** (-1 / n)
  return [r * c, r * s]
}

const outlines: Record<Exclude<CutName, 'emerald'>, Outline> = {
  round: (a) => [Math.cos(a), Math.sin(a)],
  oval: (a) => [Math.cos(a), 0.74 * Math.sin(a)],
  cushion: superellipse(3, 1, 0.92),
  princess: superellipse(14, 0.78, 0.78),
  pear: (a) => [Math.cos(a), 0.66 * Math.sin(a) * Math.abs(Math.sin(a / 2))], // point at +x
  marquise: (a) => [Math.cos(a), 0.48 * Math.sin(a) * Math.abs(Math.sin(a))],
}

/**
 * 57-facet brilliant (table, 8 star, 8 kite, 16 upper girdle | 16 lower girdle, 8 pavilion mains).
 * Tolkowsky-ish proportions with girdle radius 1: table 57%, crown 34.5°, pavilion 40.75°.
 */
function brilliant(outline: Outline, glints: Vector3[]) {
  const mains = 8, half = Math.PI / mains
  const rt = 0.57, hc = 0.3, g = 0.03, hp = 0.86, star = 0.5, lowerGirdle = 0.77
  const pts: Vector3[] = []
  const ring = (r: number, y: number, off: number, n = mains, out?: Vector3[]) => {
    for (let i = 0; i < n; i++) {
      const [x, z] = outline(((i + off) / n) * TAU)
      const p = new Vector3(x * r, y, z * r)
      pts.push(p)
      out?.push(p)
    }
  }
  // Star tip sits on the plane through table corner + girdle main, held level sideways,
  // which makes each kite (table corner, 2 star tips, girdle point) one flat facet.
  const rs = rt * Math.cos(half) + star * (1 - rt * Math.cos(half))
  const ys = hc + (rs * Math.cos(half) - rt) * ((g - hc) / (1 - rt))
  // Same trick on the pavilion: ridge points on the plane through girdle main + culet.
  const rr = 1 - lowerGirdle
  const yr = -g - (1 - rr * Math.cos(half)) * hp

  ring(rt, hc, 0, mains, glints)        // table corners
  ring(rs, ys, 0.5, mains, glints)      // star tips
  ring(1, g, 0, mains * 2)              // girdle
  ring(1, -g, 0, mains * 2)
  ring(rr, yr, 0.5)                     // lower-girdle / pavilion ridge
  pts.push(new Vector3(0, -g - hp, 0))  // culet
  return pts
}

/** Emerald step cut: chamfered rectangle, 3 crown steps, 3 pavilion steps, keel line. */
function step(glints: Vector3[]) {
  const a = 1, b = 0.72, c = 0.16
  const oct: [number, number][] = [
    [a, b - c], [a - c, b], [c - a, b], [-a, b - c], [-a, c - b], [c - a, -b], [a - c, -b], [a, c - b],
  ]
  const tiers: [sx: number, sz: number, y: number][] = [
    [0.62, 0.62, 0.22], [0.78, 0.78, 0.17], [0.9, 0.9, 0.1], [1, 1, 0.03],
    [1, 1, -0.03], [0.82, 0.82, -0.24], [0.62, 0.62, -0.45], [0.4, 0.4, -0.62], [0.3, 0.02, -0.72],
  ]
  const pts: Vector3[] = []
  tiers.forEach(([sx, sz, y], t) => {
    for (const [x, z] of oct) {
      const p = new Vector3(x * sx, y, z * sz)
      pts.push(p)
      if (t < 2) glints.push(p)
    }
  })
  return pts
}

export function cutGeometry(cut: CutName) {
  const glints: Vector3[] = []
  const pts = cut === 'emerald' ? step(glints) : brilliant(outlines[cut], glints)
  const geometry = new ConvexGeometry(pts)
  geometry.computeBoundingBox()
  const offset = geometry.boundingBox!.getCenter(new Vector3()).negate()
  geometry.translate(offset.x, offset.y, offset.z)
  // glint points share Vector3 instances with pts, so shift them the same way
  for (const p of glints) p.add(offset)
  return { geometry, glints }
}
