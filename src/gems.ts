import type { CutName } from './cut.ts'

export type Gem = {
  id: string
  name: string
  epithet: string
  cut: CutName
  cutLabel: string
  carat: string
  origin: string
  coords: string
  mineral: string
  formula: string
  ri: string
  dispersion: string
  hardness: string
  story: string
  /** body colour fed to the refraction shader */
  color: string
  /** alexandrite-style colour change, lerped over time */
  colorAlt?: string
  /** backdrop glow */
  tint: string
  /** render-only optics (tuned by eye in Leva): ior/fire are nudged up from the real values for screen brilliance;
   *  density scales Beer-Lambert absorption of `color` per unit of path inside the stone */
  render: { ior: number; fire: number; bounces: number; density: number }
}

// Geology is real; the individual pieces are the maison's fictional collection.
export const gems: Gem[] = [
  {
    id: 'diamond', name: 'Diamond', epithet: 'The Unconquerable',
    cut: 'round', cutLabel: 'Round Brilliant · 57 facets', carat: '3.02 ct · D · IF',
    origin: 'Jwaneng, Botswana', coords: '24.53° S  24.73° E',
    mineral: 'Carbon · cubic', formula: 'C', ri: '2.417', dispersion: '0.044', hardness: '10',
    story: 'Born 150 kilometres beneath the Kalahari, carried up in a kimberlite eruption older than the dinosaurs. Its fire is light, split and returned.',
    color: '#ffffff', tint: '#5d6b7a', render: { ior: 2.42, fire: 0.035, bounces: 5, density: 0 },
  },
  {
    id: 'ruby', name: 'Ruby', epithet: "Pigeon's Blood",
    cut: 'oval', cutLabel: 'Oval Brilliant', carat: '2.48 ct · unheated',
    origin: 'Mogok, Myanmar', coords: '22.92° N  96.51° E',
    mineral: 'Corundum · trigonal', formula: 'Al₂O₃ : Cr', ri: '1.762 – 1.770', dispersion: '0.018', hardness: '9',
    story: 'Chromium in the marble of the Mogok valley lets it glow red even under ultraviolet — a stone that seems lit from within.',
    color: '#ff1438', tint: '#7a0f22', render: { ior: 1.95, fire: 0.012, bounces: 4, density: 1.3 },
  },
  {
    id: 'sapphire', name: 'Sapphire', epithet: 'Cornflower',
    cut: 'cushion', cutLabel: 'Cushion Brilliant', carat: '4.10 ct · unheated',
    origin: 'Ratnapura, Sri Lanka', coords: '6.68° N  80.40° E',
    mineral: 'Corundum · trigonal', formula: 'Al₂O₃ : Fe, Ti', ri: '1.762 – 1.770', dispersion: '0.018', hardness: '9',
    story: 'Washed from the gem gravels of the “City of Gems”, where iron and titanium trade electrons to paint it the colour of dusk.',
    color: '#2f62ff', tint: '#0f2470', render: { ior: 1.95, fire: 0.012, bounces: 4, density: 0.9 },
  },
  {
    id: 'emerald', name: 'Emerald', epithet: 'The Muzo Green',
    cut: 'emerald', cutLabel: 'Emerald Step Cut', carat: '3.65 ct · minor oil',
    origin: 'Muzo, Colombia', coords: '5.53° N  74.10° W',
    mineral: 'Beryl · hexagonal', formula: 'Be₃Al₂Si₆O₁₈ : Cr, V', ri: '1.577 – 1.583', dispersion: '0.014', hardness: '7.5 – 8',
    story: 'Grown from hot brines in black shale of the eastern Andes. The step cut was invented for it — long mirrors to show its depth.',
    color: '#13d27a', tint: '#0b4a2e', render: { ior: 1.8, fire: 0.008, bounces: 4, density: 0.7 },
  },
  {
    id: 'topaz', name: 'Imperial Topaz', epithet: 'Gold of the Tsars',
    cut: 'pear', cutLabel: 'Pear Brilliant', carat: '6.20 ct',
    origin: 'Ouro Preto, Brazil', coords: '20.38° S  43.50° W',
    mineral: 'Topaz · orthorhombic', formula: 'Al₂SiO₄(F,OH)₂', ri: '1.629 – 1.637', dispersion: '0.014', hardness: '8',
    story: 'Found only in the old gold country of Minas Gerais, its sherry-to-peach glow once reserved for the Russian court.',
    color: '#ffa13a', tint: '#6b3a0c', render: { ior: 1.85, fire: 0.01, bounces: 4, density: 1.1 },
  },
  {
    id: 'tanzanite', name: 'Tanzanite', epithet: 'Twilight of Kilimanjaro',
    cut: 'marquise', cutLabel: 'Marquise Brilliant', carat: '5.05 ct',
    origin: 'Merelani Hills, Tanzania', coords: '3.55° S  36.98° E',
    mineral: 'Zoisite · orthorhombic', formula: 'Ca₂Al₃(SiO₄)₃(OH) : V', ri: '1.691 – 1.700', dispersion: '0.021', hardness: '6.5',
    story: 'Mined in a single four-kilometre strip at the foot of Kilimanjaro. One generation of stone — and then the earth is done.',
    color: '#6d4dff', tint: '#2a1a6b', render: { ior: 1.95, fire: 0.014, bounces: 4, density: 1.4 },
  },
  {
    id: 'alexandrite', name: 'Alexandrite', epithet: 'Emerald by Day, Ruby by Night',
    cut: 'princess', cutLabel: 'Princess Cut', carat: '1.84 ct · strong change',
    origin: 'Ural Mountains, Russia', coords: '57.12° N  61.38° E',
    mineral: 'Chrysoberyl · orthorhombic', formula: 'BeAl₂O₄ : Cr', ri: '1.746 – 1.755', dispersion: '0.015', hardness: '8.5',
    story: 'Chromium sits on a knife-edge between absorbing red and green light, so the stone changes its mind with the lamp.',
    color: '#1fb9a0', colorAlt: '#c2185b', tint: '#2a3a3f', render: { ior: 1.95, fire: 0.012, bounces: 4, density: 0.8 },
  },
]

/** '24.53° S  24.73° E' → [-24.53, 24.73] */
export function parseCoords(coords: string): [lat: number, lon: number] {
  const m = coords.match(/([\d.]+)° ([NS])\s+([\d.]+)° ([EW])/)
  if (!m) throw new Error(`bad coords: ${coords}`)
  return [(m[2] === 'S' ? -1 : 1) * +m[1], (m[4] === 'W' ? -1 : 1) * +m[3]]
}
