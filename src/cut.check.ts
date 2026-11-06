// Run: node src/cut.check.ts   — counts distinct facet planes per cut.
import { cutGeometry, type CutName } from './cut.ts'

const facets = (cut: CutName) => {
  const n = cutGeometry(cut).geometry.getAttribute('normal')
  const seen = new Set<string>()
  for (let i = 0; i < n.count; i += 3) seen.add([n.getX(i), n.getY(i), n.getZ(i)].map((v) => Math.round(v * 1000) / 1000 + 0).join())
  return seen.size
}

const round = facets('round')
console.log({ round, emerald: facets('emerald'), oval: facets('oval'), princess: facets('princess') })
// 57 brilliant facets + 16 girdle facets (culet is a point)
if (round !== 57 + 16) throw new Error(`round brilliant should have 73 planes, got ${round}`)
