import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useSpring } from 'motion/react'
import { pointer } from './stage'

export const hasFinePointer = matchMedia('(pointer: fine)').matches

const SIZE = { idle: 34, link: 58, stone: 96, drag: 72 }
const spring = { stiffness: 420, damping: 34, mass: 0.5 }

/** Dot + trailing ring. Grows over links, offers "Drag" over the stone, tightens while dragging. */
export function Cursor() {
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const rx = useSpring(x, spring)
  const ry = useSpring(y, spring)
  const [over, setOver] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [link, setLink] = useState(false)
  const [shown, setShown] = useState(false)
  useMotionValueEvent(pointer.overStone, 'change', setOver)
  useMotionValueEvent(pointer.dragging, 'change', setDragging)

  useEffect(() => {
    const html = document.documentElement
    const move = (e: PointerEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
      setShown(true)
      setLink(!!(e.target as Element).closest?.('a, button'))
    }
    const leave = () => setShown(false)
    html.classList.add('has-cursor')
    addEventListener('pointermove', move)
    html.addEventListener('pointerleave', leave)
    return () => {
      html.classList.remove('has-cursor')
      removeEventListener('pointermove', move)
      html.removeEventListener('pointerleave', leave)
    }
  }, [x, y])

  const mode = dragging ? 'drag' : over ? 'stone' : link ? 'link' : 'idle'
  const labelled = mode === 'stone' || mode === 'drag'

  return (
    <>
      <motion.div className="cursor-dot" style={{ x, y }} animate={{ opacity: shown && !labelled ? 1 : 0 }} />
      <motion.div
        className="cursor-ring"
        style={{ x: rx, y: ry }}
        animate={{
          width: SIZE[mode],
          height: SIZE[mode],
          opacity: shown ? 1 : 0,
          backgroundColor: mode === 'drag' ? 'rgba(5,5,6,0.45)' : mode === 'stone' ? 'rgba(5,5,6,0.3)' : 'rgba(5,5,6,0)',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        <AnimatePresence>
          {labelled && (
            <motion.span key="label" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}>
              {mode === 'drag' ? '← →' : 'Drag'}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
}
