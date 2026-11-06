import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, createPortal, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { PerformanceMonitor, Sparkles, Text } from '@react-three/drei'
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useControls } from 'leva'
import * as THREE from 'three'
import { cutGeometry } from './cut'
import { createGemMaterial } from './gemMaterial'
import type { Gem } from './gems'
import { intro, markSceneReady, pointer, reducedMotion, story, trans } from './stage'

const FONT = '/fonts/cormorant-300.woff'
const { damp, clamp } = THREE.MathUtils
/** Portrait screens: stone sits in the upper part (copy lives below) and is fitted to the width. */
const portraitLayout = (vp: { width: number; height: number; aspect: number }) => {
  const portrait = vp.aspect < 0.9
  return { portrait, lift: portrait ? vp.height * 0.2 : 0, fit: portrait ? Math.min(1, (vp.width * 0.66) / 1.44) : 1 }
}

const IDLE_SPIN = reducedMotion ? 0 : 0.35 // rad/s; reduced motion: still unless the visitor drags it

/** Giant engraved name floating behind the stone. */
function Name({ text, opacity, y = 0, z, size, color }: { text: string; opacity: number; y?: number; z: number; size: number; color: THREE.ColorRepresentation }) {
  const ref = useRef<THREE.Mesh & { fillOpacity: number }>(null!)
  useFrame((_, dt) => (ref.current.fillOpacity = damp(ref.current.fillOpacity, opacity * intro.level * (1 - trans.out) * story.hero, trans.out > 0 ? 6 : 1.6, dt)))
  return (
    <Text ref={ref} font={FONT} fontSize={size} letterSpacing={0.12}
      position={[0, y, z]} color={color} fillOpacity={0} anchorX="center" anchorY="middle">
      {text.toUpperCase()}
    </Text>
  )
}

type SoftboxProps = { w: number; h: number; at: [number, number, number]; intensity: number; order: number; color?: string }

/** Emissive panel. Switches on (with a brief fluorescent flicker) when intro.lights passes its `order`. */
function Softbox({ w, h, at, intensity, order, color = '#fff6ea' }: SoftboxProps) {
  const ref = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>>(null!)
  useLayoutEffect(() => ref.current.lookAt(0, 0, 0), [])
  const base = useMemo(() => new THREE.Color(color).multiplyScalar(intensity), [color, intensity])
  useFrame(() => {
    const t = intro.lights - order
    const on = t <= 0 ? 0 : t >= 0.4 ? 1 : Math.random() < 0.55 ? t / 0.4 : 0.08
    ref.current.material.color.copy(base).multiplyScalar(on)
  }, -1) // before Studio re-renders the cube
  return (
    <mesh ref={ref} position={at}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial side={THREE.DoubleSide} />
    </mesh>
  )
}

/** Tall bright strip that passes in front of the stone as it lands: the flash across the table. */
function Sweep() {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame(() => {
    const m = ref.current
    m.visible = trans.sweep > 0 && trans.sweep < 1
    m.position.set(THREE.MathUtils.lerp(-7, 7, trans.sweep), 1.5, 5)
    m.lookAt(0, 0, 0)
  }, -1)
  return (
    <mesh ref={ref} visible={false}>
      <planeGeometry args={[0.9, 12]} />
      <meshBasicMaterial color={new THREE.Color(7, 6.8, 6.5)} side={THREE.DoubleSide} />
    </mesh>
  )
}

/**
 * Procedural photo studio: emissive softboxes rendered into a cube map from the stone's position.
 * Zero image assets; anything placed in here shows up in the stone's reflections and refractions.
 */
function Studio({ children }: { children: (env: THREE.Texture) => ReactNode }) {
  const gl = useThree((s) => s.gl)
  const [{ scene, cam, rt }] = useState(() => {
    const rt = new THREE.WebGLCubeRenderTarget(512, { type: THREE.HalfFloatType })
    const scene = new THREE.Scene()
    scene.background = new THREE.Color()
    return { scene, rt, cam: new THREE.CubeCamera(0.1, 50, rt) }
  })
  // Re-render only while the intro is switching lights on (~2 ms/frame on an Intel UHD iGPU); static afterwards.
  const last = useRef('')
  useFrame(() => {
    const key = `${intro.lights}|${intro.level}|${trans.sweep}`
    if (key === last.current) return
    last.current = key
    ;(scene.background as THREE.Color).set('#14141a').multiplyScalar(intro.level * (1 - Math.max(trans.out, 1 - trans.in)))
    cam.update(gl, scene)
  })
  useEffect(() => () => rt.dispose(), [rt])

  const strips = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2
    return <Softbox key={i} order={1 + i} w={i % 3 ? 0.5 : 1.4} h={7} at={[Math.cos(a) * 6, 1, Math.sin(a) * 6]} intensity={i % 2 ? 3 : 7} />
  })

  return (
    <>
      {createPortal(
        <>
          <Softbox order={0} w={8} h={1.2} at={[0, 7, 0]} intensity={6} />
          {strips}
          <Softbox order={13} w={12} h={12} at={[0, -8, 0]} intensity={0.25} color="#c8c8d0" />
          <Softbox order={14} w={3} h={3} at={[4, -3, 4]} intensity={1.5} color="#cfe0ff" />
          <Softbox order={15} w={3} h={3} at={[-5, -2, -3]} intensity={1.2} color="#ffd9a8" />
          <Sweep />
        </>,
        scene,
      )}
      {children(rt.texture)}
    </>
  )
}

/** Star-burst glints that flare on crown facets, the "scintillation" a camera catches on a real stone. */
function Glints({ points, color }: { points: THREE.Vector3[]; color: string }) {
  const dpr = useThree((s) => s.viewport.dpr)
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(points)
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(points.map(() => Math.random()), 1))
    return g
  }, [points])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uSize: { value: 520 }, uColor: { value: new THREE.Color() } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          attribute float aPhase;
          uniform float uTime, uSize;
          varying float vI;
          void main() {
            vec4 wp = modelMatrix * vec4(position * 1.01, 1.0);
            vec3 n = normalize(mat3(modelMatrix) * position);
            float facing = smoothstep(0.15, 0.7, dot(n, normalize(cameraPosition - wp.xyz)));
            float t = fract(uTime * 0.16 + aPhase);
            vI = exp(-pow((t - 0.5) * 18.0, 2.0)) * facing;
            gl_Position = projectionMatrix * viewMatrix * wp;
            gl_PointSize = uSize * vI / gl_Position.w;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          varying float vI;
          void main() {
            vec2 p = gl_PointCoord - 0.5, a = abs(p);
            vec2 q = abs(mat2(0.7071, 0.7071, -0.7071, 0.7071) * p);
            float rays = exp(-a.y * 90.0) * exp(-a.x * 7.0) + exp(-a.x * 90.0) * exp(-a.y * 7.0);
            float diag = (exp(-q.y * 120.0) * exp(-q.x * 16.0) + exp(-q.x * 120.0) * exp(-q.y * 16.0)) * 0.5;
            float core = exp(-length(p) * 26.0);
            gl_FragColor = vec4(uColor * (rays + diag + core) * vI * 3.0, 1.0);
          }`,
      }),
    [],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame((s) => {
    material.uniforms.uTime.value = s.clock.elapsedTime
    material.uniforms.uSize.value = 520 * dpr
    material.uniforms.uColor.value.set('#ffffff').lerp(new THREE.Color(color), 0.35).multiplyScalar(intro.level * (1 - Math.max(trans.out, 1 - trans.in)))
  })
  return <points geometry={geometry} material={material} raycast={() => null} />
}

function Stone({ gem, env, hi }: { gem: Gem; env: THREE.Texture; hi: boolean }) {
  const { geometry, glints } = useMemo(() => cutGeometry(gem.cut), [gem.cut])
  const material = useMemo(() => createGemMaterial(geometry), [geometry])
  useEffect(() => () => (material.dispose(), geometry.dispose()), [material, geometry])
  const group = useRef<THREE.Group>(null!)
  const mesh = useRef<THREE.Mesh>(null!)
  const ctl = useControls(gem.name, {
    ior: { value: gem.render.ior, min: 1, max: 3.5, step: 0.01 },
    fire: { value: gem.render.fire, min: 0, max: 0.12, step: 0.001 },
    bounces: { value: gem.render.bounces, min: 1, max: 8, step: 1 },
    density: { value: gem.render.density, min: 0, max: 4, step: 0.05 },
    brightness: { value: 1, min: 0.2, max: 3, step: 0.05 },
  })
  const [a, b] = useMemo(() => [new THREE.Color(gem.color), new THREE.Color(gem.colorAlt ?? gem.color)], [gem])
  const isDiamond = gem.id === 'diamond'
  const kGrade = useMemo(() => new THREE.Color('#ffe7a0'), []) // a K-colour tint, for the Four Cs
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 1), [geometry])
  useEffect(() => () => edges.dispose(), [edges])
  const wire = useRef<THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>>(null!)
  const cut = useRef<THREE.Group>(null!)
  const viewport = useThree((s) => s.viewport)

  // Drag to spin: direct rotation while held, then inertia that eases back to the idle spin.
  const spin = useRef({ vel: IDLE_SPIN, tilt: 0 })
  const drag = useRef<{ x: number; y: number; t: number } | null>(null)
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    // capture so the release still arrives if the pointer leaves the canvas/window mid-drag
    const el = e.nativeEvent.target as Element
    el.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, t: performance.now() }
    pointer.dragging.set(true)
    const move = (ev: PointerEvent) => {
      const d = drag.current!
      const now = performance.now()
      const turn = (ev.clientX - d.x) * 0.008
      group.current.rotation.y += turn
      spin.current.tilt = clamp(spin.current.tilt + (ev.clientY - d.y) * 0.006, -0.7, 0.7)
      spin.current.vel = clamp(turn / Math.max((now - d.t) / 1000, 1 / 240), -12, 12)
      drag.current = { x: ev.clientX, y: ev.clientY, t: now }
    }
    const up = () => {
      drag.current = null
      pointer.dragging.set(false)
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', up)
      removeEventListener('pointercancel', up)
      el.removeEventListener('lostpointercapture', up)
    }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
    addEventListener('pointercancel', up)
    el.addEventListener('lostpointercapture', up)
  }
  useEffect(() => () => pointer.overStone.set(false), [])

  useFrame((s, dt) => {
    const g = group.current
    const sp = spin.current
    if (drag.current) {
      if (performance.now() - drag.current.t > 60) sp.vel = 0 // held still → no fling on release
    } else {
      sp.vel = damp(sp.vel, IDLE_SPIN, 1.1, dt)
      sp.tilt = damp(sp.tilt, 0, 2.5, dt)
      g.rotation.y += sp.vel * dt
    }
    const parallax = reducedMotion ? 0 : 1
    g.rotation.x = damp(g.rotation.x, 0.45 - s.pointer.y * 0.25 * parallax + sp.tilt, 3, dt)
    g.rotation.z = damp(g.rotation.z, -s.pointer.x * 0.2 * parallax, 3, dt)

    // transition: leaving = spin up, shrink, shatter; arriving = drop in, spin down, assemble
    const arrive = 1 - trans.in
    g.rotation.y += (trans.out * trans.out * 9 + arrive * arrive * 7) * dt
    const lay = portraitLayout(viewport)
    g.position.y = lay.lift + Math.sin(s.clock.elapsedTime * 0.8) * 0.06 * parallax + arrive * arrive * 1.1
    // scroll story: slide aside, grow/shrink, vanish
    g.position.x = lay.portrait ? 0 : story.x * (viewport.width / 2)
    g.scale.setScalar(0.72 * lay.fit * (lay.portrait ? 1 - 0.32 * story.rough : 1) * (1 - 0.25 * trans.out) * (1 - 0.25 * arrive) * story.size * story.show)
    g.visible = story.show > 0.002
    material.uniforms.uShatter.value = Math.max(trans.out, arrive)
    // inside the rough the cut stone sits smaller (a 1-radius girdle won't fit a 1.6 octahedron), growing as it's freed
    cut.current.scale.setScalar(isDiamond ? 1 - 0.22 * story.rough : 1)
    wire.current.material.opacity = story.wire * 0.55
    wire.current.visible = story.wire > 0.001

    const u = material.uniforms
    u.envMap.value = env
    u.ior.value = ctl.ior
    u.fire.value = ctl.fire
    u.bounces.value = hi ? ctl.bounces : Math.min(ctl.bounces, 2)
    u.density.value = isDiamond ? Math.max(ctl.density, story.grade * 0.9) : ctl.density
    u.brightness.value = ctl.brightness
    u.color.value.lerpColors(a, b, gem.colorAlt ? (Math.sin(s.clock.elapsedTime * 0.6) + 1) / 2 : 0)
    if (isDiamond) u.color.value.lerp(kGrade, story.grade)
  })

  return (
    <group ref={group} scale={0.72}>
      <group ref={cut}>
      <mesh
        ref={mesh}
        geometry={geometry}
        material={material}
        onBeforeRender={() => material.uniforms.modelMatrixInverse.value.copy(mesh.current.matrixWorld).invert()}
        onPointerDown={onDown}
        onPointerOver={() => pointer.overStone.set(true)}
        onPointerOut={() => pointer.overStone.set(false)}
      />
      <lineSegments ref={wire} geometry={edges} scale={1.003} raycast={() => null}>
        <lineBasicMaterial color="#ede6da" transparent depthWrite={false} />
      </lineSegments>
      {hi && !reducedMotion && <Glints points={glints} color={gem.colorAlt ?? gem.color} />}
      </group>
      {isDiamond && <Rough env={env} />}
    </group>
  )
}

/** Earth-to-light: a frosted octahedral rough (a diamond's natural habit) enclosing the cut stone. */
function Rough({ env }: { env: THREE.Texture }) {
  const geometry = useMemo(() => new THREE.OctahedronGeometry(1.6, 0), []) // non-indexed, flat normals
  const material = useMemo(() => {
    const m = createGemMaterial(geometry)
    Object.assign(m, { transparent: true })
    Object.assign(m.uniforms.uRough, { value: 1 })
    Object.assign(m.uniforms.ior, { value: 1.9 })
    Object.assign(m.uniforms.bounces, { value: 2 })
    return m
  }, [geometry])
  useEffect(() => () => (material.dispose(), geometry.dispose()), [material, geometry])
  const mesh = useRef<THREE.Mesh>(null!)
  useFrame(() => {
    const u = material.uniforms
    u.envMap.value = env
    u.uShatter.value = Math.max(1 - story.rough, 1 - trans.in, trans.out)
    u.uAlpha.value = story.roughAlpha
    material.depthWrite = story.roughAlpha > 0.99
    mesh.current.visible = u.uShatter.value < 0.999
  })
  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      material={material}
      raycast={() => null}
      onBeforeRender={() => material.uniforms.modelMatrixInverse.value.copy(mesh.current.matrixWorld).invert()}
    />
  )
}

/** Soft radial glow behind the stone that eases toward each gem's tint. */
function Backdrop({ tint }: { tint: string }) {
  const uniforms = useMemo(() => ({ uTint: { value: new THREE.Color(tint) }, uLevel: { value: 0 } }), [])
  const target = useMemo(() => new THREE.Color(), [])
  useFrame((_, dt) => {
    uniforms.uTint.value.lerp(target.set(tint), 1 - Math.exp(-2 * dt))
    uniforms.uLevel.value = intro.level
  })
  return (
    <mesh position={[0, 0, -4]}>
      <planeGeometry args={[40, 24]} />
      <shaderMaterial
        uniforms={uniforms}
        depthWrite={false}
        vertexShader={`varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`}
        fragmentShader={`uniform vec3 uTint; uniform float uLevel; varying vec2 vP;
          void main(){ float d = length(vP*vec2(.55,1.)); vec3 c = mix(uTint*.38*uLevel, vec3(.012,.012,.016), pow(smoothstep(0.,2.6,d),.7)); gl_FragColor = vec4(c,1.); }`}
      />
    </mesh>
  )
}

function World({ gem }: { gem: Gem }) {
  const viewport = useThree((s) => s.viewport)
  const lay = portraitLayout(viewport)
  // Adaptive quality: weak GPUs drop to dpr 1, 2 bounces, no MSAA, no glints.
  const [hi, setHi] = useState(true)
  const setDpr = useThree((s) => s.setDpr)
  const quality = (on: boolean) => (setHi(on), setDpr(on ? Math.min(2, devicePixelRatio) : 1))
  const frames = useRef(0)
  const sparkles = useRef<THREE.Group>(null!)
  useFrame((s) => {
    s.camera.position.z = 6 + intro.dolly * 1.8 - 0.5 * Math.max(trans.out, 1 - trans.in)
    sparkles.current.visible = intro.level > 0.5 && !reducedMotion
    if (++frames.current === 3) markSceneReady() // shaders compiled, font loaded, first frames drawn
  })
  return (
    <>
      <PerformanceMonitor onIncline={() => quality(true)} onDecline={() => quality(false)} onFallback={() => quality(false)} flipflops={3} />
      <Backdrop tint={gem.tint} />
      <Name key={gem.id} text={gem.name} opacity={0.05} z={-3} color="#ede6da"
        y={lay.lift * 1.5} size={Math.min(0.9, 5 / gem.name.length) * Math.min(1, viewport.aspect / 1.4)} />
      <Studio>{(env) => <Stone key={gem.id} gem={gem} env={env} hi={hi} />}</Studio>
      <group ref={sparkles}>
        <Sparkles count={70} scale={[9, 5, 4]} size={1.6} speed={0.25} opacity={0.5} color={gem.colorAlt ? '#fff' : gem.color} />
      </group>
      <EffectComposer multisampling={hi ? 4 : 0}>
        <Bloom mipmapBlur luminanceThreshold={0.9} intensity={0.9} />
        <ToneMapping mode={ToneMappingMode.AGX} />
        <Noise opacity={0.035} />
        <Vignette offset={0.25} darkness={0.7} />
      </EffectComposer>
    </>
  )
}

export function Scene({ gem }: { gem: Gem }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 6], fov: 30 }} gl={{ antialias: false }}>
      <World gem={gem} />
    </Canvas>
  )
}

