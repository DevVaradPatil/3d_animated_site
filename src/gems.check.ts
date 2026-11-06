// Run: node src/gems.check.ts   — every stone's coordinates parse to a sane lat/lon.
import { gems, parseCoords } from './gems.ts'

const assert = (ok: boolean, msg: string) => { if (!ok) throw new Error(msg) }
assert(JSON.stringify(parseCoords('24.53° S  24.73° E')) === '[-24.53,24.73]', 'S/E sign')
assert(JSON.stringify(parseCoords('5.53° N  74.10° W')) === '[5.53,-74.1]', 'N/W sign')
for (const g of gems) {
  const [lat, lon] = parseCoords(g.coords)
  assert(Math.abs(lat) <= 90 && Math.abs(lon) <= 180, `${g.id}: out of range`)
}
console.log('ok', gems.map((g) => `${g.id} ${parseCoords(g.coords)}`).join(' | '))
