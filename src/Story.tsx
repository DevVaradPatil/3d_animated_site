import { useRef, useState } from 'react'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { AnimatePresence, motion } from 'motion/react'
import { gems } from './gems'
import { reducedMotion } from './stage'

/** Pinned: the stone morphs from rough octahedron to brilliant while three steps of copy swap (driven by data-step). */
function Earth() {
  return (
    <section className="earth story-pin" id="provenance" data-step="0">
      <div className="story-col">
        <p className="kicker">From earth to light</p>
        <ol className="steps">
          <li>
            <span className="num">I · Rough</span>
            <h2>Three billion years <em>in the making.</em></h2>
            <p>An octahedron, exactly as the mantle grew it: frosted, greasy, unremarkable to anyone but a cutter.</p>
          </li>
          <li>
            <span className="num">II · Plan</span>
            <h2>Mapped <em>in light</em> before it is touched.</h2>
            <p>Every rough is scanned and modelled. The plan decides what survives, and it is often less than half.</p>
          </li>
          <li>
            <span className="num">III · Polish</span>
            <h2>Fifty-seven facets, <em>one direction for light:</em> back.</h2>
            <p>Weeks at the wheel, angles held to a tenth of a degree, until light that enters can only leave as fire.</p>
          </li>
        </ol>
      </div>
    </section>
  )
}

/** Pinned: four steps; the live diamond demonstrates each (wireframe, colour grade, magnification, weight). */
function FourCs() {
  return (
    <section className="cs story-pin" data-step="0">
      <div className="story-col">
        <p className="kicker">The four Cs</p>
        <ol className="steps">
          <li>
            <span className="num">01 · Cut</span>
            <h2>The only C <em>made by hand.</em></h2>
            <p>Proportion, symmetry, polish. Fifty-seven planes that decide whether light returns or leaks away.</p>
          </li>
          <li>
            <span className="num">02 · Colour</span>
            <h2>D is the <em>absence</em> of colour.</h2>
            <p>Graded against master stones under north light. Scroll, and watch a D drift towards K.</p>
            <div className="grade">
              <span className="grade-letter">D</span>
              <span className="grade-scale">
                {'DEFGHIJK'.split('').map((g) => <span key={g}>{g}</span>)}
                <i className="grade-marker" />
              </span>
            </div>
          </li>
          <li>
            <span className="num">03 · Clarity</span>
            <h2>Flawless <em>at ten times.</em></h2>
            <p>Under a 10× loupe, nothing. No crystal, no feather, no cloud: a grade fewer than one stone in a thousand earns.</p>
          </li>
          <li>
            <span className="num">04 · Carat</span>
            <h2>Weight, <em>not size.</em></h2>
            <p>One carat is a fifth of a gram. Rarity rises far faster than weight.</p>
            <p className="carat"><span className="carat-value">0.50</span><small>ct</small></p>
          </li>
        </ol>
      </div>
    </section>
  )
}

/** Scroll-scrubbed word fill + counters. */
function Atelier() {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      const split = SplitText.create('.statement', { type: 'words' })
      gsap.fromTo(split.words, { opacity: 0.14 }, {
        opacity: 1, stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: '.statement', start: 'top 80%', end: 'bottom 45%', scrub: true },
      })
      gsap.utils.toArray<HTMLElement>('.stat-value').forEach((el) => {
        const to = Number(el.dataset.to)
        const n = { v: 0 }
        gsap.to(n, {
          v: to, duration: reducedMotion ? 0 : 2, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          onUpdate: () => void (el.textContent = (to % 1 ? n.v.toFixed(1) : Math.round(n.v).toLocaleString('en'))),
        })
      })
    },
    { scope: root },
  )
  return (
    <section ref={root} className="atelier" id="atelier">
      <p className="kicker">The atelier</p>
      <p className="statement">
        We cut fewer than forty stones a year. Each is matched to its owner before the first facet is placed, and
        leaves with the map of where it was born.
      </p>
      <dl className="stats">
        <div><dt>Hours at the wheel, per stone</dt><dd><span className="stat-value" data-to="1200">0</span></dd></div>
        <div><dt>Angular tolerance</dt><dd><span className="stat-value" data-to="0.1">0</span>°</dd></div>
        <div><dt>Origins, every one traceable</dt><dd><span className="stat-value" data-to="7">0</span></dd></div>
      </dl>
    </section>
  )
}

function Viewing() {
  const [sent, setSent] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)
  return (
    <section className="viewing" id="viewing">
      <div className="viewing-copy">
        <p className="kicker">Private viewing</p>
        <h2>By appointment, <em>never by catalogue.</em></h2>
        <p>Antwerp · Geneva · Mumbai. Tell us which stone you would like to hold, and we will bring it to the light.</p>
      </div>
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.p key="ok" className="viewing-ok" role="status" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            Thank you, {sent}. <em>A concierge will write within a day.</em>
          </motion.p>
        ) : (
          <motion.form
            key="form"
            className="viewing-form"
            exit={{ opacity: 0, y: -16 }}
            onSubmit={(e) => {
              e.preventDefault()
              // ponytail: concept site, no backend. Wire to email/CRM (Vercel Marketplace) when it goes live.
              setSent(String(new FormData(e.currentTarget).get('name')).trim().split(' ')[0])
            }}
          >
            <label><span>Name</span><input name="name" required autoComplete="name" /></label>
            <label><span>Email</span><input name="email" type="email" required autoComplete="email" /></label>
            <label>
              <span>Stone</span>
              <select name="stone" defaultValue="diamond">
                {gems.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <label><span>Preferred date</span><input name="date" type="date" min={today} /></label>
            <label className="wide"><span>Anything we should know</span><textarea name="note" rows={3} /></label>
            <button type="submit" className="cta wide">Request a viewing</button>
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  )
}

function Footer() {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      gsap.fromTo('.footer-mark', { letterSpacing: '0.05em' }, {
        letterSpacing: '0.42em', ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom bottom', scrub: true },
      })
    },
    { scope: root },
  )
  return (
    <footer ref={root} className="site-footer">
      <p className="footer-mark" aria-hidden="true">LITHOS</p>
      <div className="footer-row">
        <span>Maison de Pierres · est. 2026</span>
        <span>Concept site. The geology is real; the pieces are imagined.</span>
        <span>Rendered live in WebGL, without a single image file</span>
      </div>
    </footer>
  )
}

export function Story() {
  return (
    <>
      <Earth />
      <FourCs />
      <Atelier />
      <Viewing />
      <Footer />
    </>
  )
}
