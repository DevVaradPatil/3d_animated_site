import * as THREE from 'three'
import { MeshBVH, MeshBVHUniformStruct, SAH, shaderIntersectFunction, shaderStructs } from 'three-mesh-bvh'

/**
 * Ray-traced gem shader. Forked from drei's MeshRefractionMaterial (N8Programs) and extended with:
 *  - Schlick Fresnel surface reflection (the glassy outer gloss drei lacks)
 *  - Beer–Lambert body colour from the real internal path length (pale at the edges, saturated in the core)
 *  - per-channel dispersion at the exit facet (true "fire" at ~1 trace instead of 3)
 * Cube env maps only, which also sidesteps the chunk three r187 removed.
 */
export function createGemMaterial(geometry: THREE.BufferGeometry) {
  const bvh = new MeshBVHUniformStruct()
  bvh.updateFrom(new MeshBVH(geometry.clone(), { strategy: SAH }))
  addShardAttributes(geometry)

  return new THREE.ShaderMaterial({
    uniforms: {
      envMap: { value: null as THREE.Texture | null },
      bvh: { value: bvh },
      modelMatrixInverse: { value: new THREE.Matrix4() },
      color: { value: new THREE.Color('white') },
      ior: { value: 2.4 },
      fire: { value: 0.02 },
      bounces: { value: 4 },
      uShatter: { value: 0 },
      uRough: { value: 0 }, // frosted skin of a rough crystal (0 = polished)
      uAlpha: { value: 1 },
      density: { value: 1 },
      brightness: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aCentroid;
      attribute float aRand;
      uniform float uShatter;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      void main() {
        vec3 base = position;
        vec3 nrm = normal;

        // shatter: each facet triangle shrinks to its centroid and flies outward, staggered per shard.
        // (The BVH stays intact, so flying shards still refract like the whole stone: reads as glitter.)
        float s = smoothstep(0.0, 1.0, clamp(uShatter * 1.6 - aRand * 0.6, 0.0, 1.0));
        vec3 p = mix(base, aCentroid, s);
        p += normalize(aCentroid + vec3(0.0, 0.001, 0.0)) * s * (1.0 + aRand * 2.2) + nrm * s * 0.3;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWorldPosition = wp.xyz;
        vNormal = normalize(mat3(modelMatrix) * nrm); // uniform scale only
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      precision highp isampler2D;
      precision highp usampler2D;
      ${shaderStructs}
      ${shaderIntersectFunction}
      uniform BVH bvh;
      uniform samplerCube envMap;
      uniform mat4 modelMatrix;
      uniform mat4 modelMatrixInverse;
      uniform vec3 color;
      uniform float ior, fire, bounces, density, brightness, uRough, uAlpha;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;

      vec3 env(vec3 localDir) { return texture(envMap, normalize(mat3(modelMatrix) * localDir)).rgb; }

      void main() {
        vec3 V = normalize(vWorldPosition - cameraPosition);
        vec3 N = normalize(vNormal);

        // outer gloss
        float f0 = pow((ior - 1.0) / (ior + 1.0), 2.0);
        float F = f0 + (1.0 - f0) * pow(1.0 - clamp(-dot(V, N), 0.0, 1.0), 5.0);
        vec3 reflection = texture(envMap, reflect(V, N)).rgb;

        // enter, then bounce around inside (BVH in model space)
        vec3 dir = refract(V, N, 1.0 / ior);
        vec3 ro = (modelMatrixInverse * vec4(vWorldPosition + dir * 0.001, 1.0)).xyz;
        dir = normalize(mat3(modelMatrixInverse) * dir);
        float path = 0.0;
        vec3 exitN = vec3(0.0);
        for (float i = 0.0; i < 8.0; i++) {
          if (i >= bounces) break;
          uvec4 faceIndices; vec3 faceNormal; vec3 bary; float side; float dist;
          bvhIntersectFirstHit(bvh, ro, dir, faceIndices, faceNormal, bary, side, dist);
          path += dist;
          vec3 hit = ro + dir * max(dist - 0.001, 0.0);
          // three-mesh-bvh returns faceNormal facing against the ray, as refract() expects
          vec3 t = refract(dir, faceNormal, ior);
          if (dot(t, t) > 0.0) { exitN = faceNormal; break; } // escapes (no total internal reflection)
          dir = reflect(dir, faceNormal);
          ro = hit + dir * 0.01;
        }

        vec3 light;
        if (exitN != vec3(0.0)) {
          // dispersion where it happens most: red bends less, blue more
          vec3 g = refract(dir, exitN, ior);
          vec3 r = refract(dir, exitN, ior * (1.0 - fire));
          vec3 b = refract(dir, exitN, ior * (1.0 + fire));
          if (length(r) == 0.0) r = g;
          if (length(b) == 0.0) b = g;
          light = vec3(env(r).r, env(g).g, env(b).b);
        } else {
          light = env(dir); // trapped after max bounces: best guess
        }

        vec3 absorb = -log(max(color, vec3(0.001))) * density;
        light *= exp(-absorb * path) * brightness;

        vec3 col = mix(light, reflection, F);
        if (uRough > 0.0) {
          // frosted, greasy skin of a rough diamond: soft env light along the normal + grain + a little rim
          float grain = fract(sin(dot(floor(vWorldPosition * 160.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
          vec3 frost = (texture(envMap, N).rgb * 0.09 + vec3(0.03, 0.03, 0.032)) * (0.75 + 0.5 * grain)
                     + texture(envMap, reflect(V, N)).rgb * F * 0.12;
          col = mix(col, frost, uRough * 0.88); // a little inner fire glows through the skin
        }
        gl_FragColor = vec4(col, uAlpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
}

export type GemMaterial = ReturnType<typeof createGemMaterial>

/** Per-vertex triangle centroid + per-triangle random, for the shatter. Geometry must be non-indexed (ConvexGeometry is). */
function addShardAttributes(geometry: THREE.BufferGeometry) {
  const pos = geometry.getAttribute('position')
  const centroid = new Float32Array(pos.count * 3)
  const rand = new Float32Array(pos.count)
  for (let t = 0; t < pos.count; t += 3) {
    const r = Math.random()
    for (let axis = 0; axis < 3; axis++) {
      const c = (pos.array[t * 3 + axis] + pos.array[t * 3 + 3 + axis] + pos.array[t * 3 + 6 + axis]) / 3
      for (let v = 0; v < 3; v++) centroid[(t + v) * 3 + axis] = c
    }
    rand[t] = rand[t + 1] = rand[t + 2] = r
  }
  geometry.setAttribute('aCentroid', new THREE.BufferAttribute(centroid, 3))
  geometry.setAttribute('aRand', new THREE.BufferAttribute(rand, 1))
}
