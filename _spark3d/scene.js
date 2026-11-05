// WebGL layer of the Spark landing page: one fixed full-screen canvas that draws
//  - a dot terrain that ripples when someone "talks" (rings from the key, a standing wave while held),
//  - real 3D keycaps placed wherever the page has a [data-key] element (they scroll with the page).
// The page owns all state (hold, release, words); this file only draws it. Build: _spark3d/build.sh
import {
  ACESFilmicToneMapping, AdditiveBlending, BackSide, BoxGeometry, CanvasTexture, Color, DirectionalLight, DoubleSide,
  Float32BufferAttribute, BufferGeometry, Group, HalfFloatType, Mesh, MeshBasicMaterial, MeshPhysicalMaterial,
  PerspectiveCamera, PlaneGeometry, PMREMGenerator, PointLight, Points, Raycaster, Scene, ShaderMaterial, Sprite,
  SpriteMaterial, SRGBColorSpace, Vector2, Vector3, Vector4, WebGLRenderer, WebGLRenderTarget, Plane, LinearFilter,
} from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

const PLATE_W = 3.5
const TERRAIN_Y = -0.95
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/* ------------------------------------------------------------------ terrain */

const TERRAIN_VERT = /* glsl */ `
  uniform float uTime, uFlow, uLevel, uDim, uScale, uBaseY, uQuiet;
  uniform vec3 uOrigin;
  uniform vec4 uRing[6];
  uniform vec2 uPointer;
  uniform float uPointerW;
  attribute float aSeed;
  varying float vLift, vFade, vSeed, vShadow;

  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }

  void main() {
    vec3 p = position;
    p.xz += (vec2(hash(vec2(aSeed, 1.0)), hash(vec2(aSeed, 2.0))) - 0.5) * 0.09;
    float far = smoothstep(0.0, 26.0, -p.z);
    float n = fbm(vec2(p.x * 0.11, (p.z + uFlow) * 0.11) + uTime * 0.01);
    float h = (n - 0.42) * mix(1.1, 4.2, far) * uQuiet;
    float lift = max(0.0, (n - 0.5) * 1.1) * 0.5;
    float cloud = smoothstep(0.52, 0.8, fbm(vec2(p.x * 0.19 + 3.0, (p.z + uFlow * 0.6) * 0.19) + uTime * 0.02));
    lift += cloud * 0.5;

    for (int i = 0; i < 6; i++) {
      vec4 rg = uRing[i];
      if (rg.z >= 0.0) {
        float d = length(p.xz - rg.xy);
        float front = rg.z * 9.0;
        float w = exp(-pow((d - front) / (1.1 + rg.z * 0.8), 2.0)) * rg.w * exp(-rg.z * 0.9);
        h += w * 1.1; lift += w * 0.8;
      }
    }
    float d0 = length(p.xz - uOrigin.xz);
    float rip = uLevel * sin(d0 * 2.4 - uTime * 9.0) * exp(-d0 * 0.2);
    h += rip * 0.6; lift += abs(rip) * 0.6;
    float dp = length(p.xz - uPointer);
    float pw = uPointerW * exp(-dp * dp * 0.4);
    h += pw * 0.7; lift += pw * 0.8;

    p.y = uBaseY + h;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = -mv.z;
    float big = step(0.955, hash(vec2(aSeed, 3.0)));
    float size = 0.056 * (1.0 + lift * 1.5 + big * 0.8);
    gl_PointSize = clamp(uScale * size / dist, 1.2, 7.5);
    vLift = lift;
    vSeed = aSeed;
    // fade with distance and toward the top edge so the field melts into the page
    vFade = exp(-pow(dist / 34.0, 2.6)) * uDim;
    vShadow = 1.0 - 0.85 * exp(-d0 * d0 * 0.1) * (1.0 - clamp(lift * 0.6, 0.0, 1.0));
  }
`

const TERRAIN_FRAG = /* glsl */ `
  uniform float uTime, uRecMix, uOkMix;
  uniform vec3 uColA, uColB, uRec, uOk;
  varying float vLift, vFade, vSeed, vShadow;
  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float r = length(q);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.1, r);
    float l = clamp(vLift, 0.0, 1.0);
    vec3 c = mix(uColA, uColB, l);
    c = mix(c, uRec, uRecMix * smoothstep(0.4, 1.1, vLift));
    c = mix(c, uOk, uOkMix * smoothstep(0.3, 1.0, vLift));
    float tw = 0.78 + 0.22 * sin(uTime * 1.6 + vSeed * 60.0);
    float glow = 0.85 + min(vLift, 1.2) * 1.0;
    gl_FragColor = vec4(c * glow * tw, a * vFade * vShadow);
  }
`

function terrainGeometry(density) {
  const step = density, xs = 17, zNear = 11, zFar = -27
  const cols = Math.floor((xs * 2) / step) + 1, rows = Math.floor((zNear - zFar) / step) + 1
  const pos = new Float32Array(cols * rows * 3), seed = new Float32Array(cols * rows)
  let i = 0
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++, i++) {
      pos[i * 3] = -xs + c * step
      pos[i * 3 + 1] = 0
      pos[i * 3 + 2] = zNear - r * step
      seed[i] = Math.random() * 1000
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('aSeed', new Float32BufferAttribute(seed, 1))
  return g
}

/* ------------------------------------------------------------------ sparks */

const SPARK_VERT = /* glsl */ `
  uniform float uTime, uEnergy, uScale;
  uniform vec3 uOrigin;
  uniform float uSize;
  attribute float aSeed;
  varying float vA, vHeat;
  float h1(float x) { return fract(sin(x * 91.3458) * 47453.5453); }
  void main() {
    float s = aSeed;
    float life = 1.1 + h1(s + 1.0) * 1.5;
    float phase = fract(uTime / life + h1(s + 2.0));
    float age = phase * life;
    // a particle flies only while the energy is above its own threshold, so more light up as you speak
    float on = step(h1(s + 3.0), uEnergy);
    float ang = h1(s + 4.0) * 6.2831853;
    float spread = 0.3 + h1(s + 5.0) * 1.6;
    vec3 v = vec3(cos(ang) * spread * 0.6, 1.3 + h1(s + 6.0) * 2.4, sin(ang) * spread * 0.6);
    vec3 p = uOrigin + vec3((h1(s + 7.0) - 0.5) * 1.8, 0.9, (h1(s + 8.0) - 0.5) * 1.8) + v * age + vec3(0.0, -1.7, 0.0) * age * age * 0.5;
    p.x += sin(age * 2.0 + s * 10.0) * 0.22;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float fade = smoothstep(0.0, 0.08, phase) * (1.0 - smoothstep(0.55, 1.0, phase));
    vA = fade * on;
    vHeat = 1.0 - phase;
    gl_PointSize = clamp(uScale * uSize * (0.6 + h1(s + 9.0)) * (1.0 - phase * 0.6) / -mv.z, 1.0, 9.0) * on;
  }
`
const SPARK_FRAG = /* glsl */ `
  varying float vA, vHeat;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.0, r);
    vec3 hot = vec3(1.0, 0.8, 0.45), cool = vec3(1.0, 0.36, 0.24);
    gl_FragColor = vec4(mix(cool, hot, vHeat) * 1.35, a * vA * 0.85);
  }
`

/* ------------------------------------------------------------------ keycap */

/** A tapered keycap with a concave top, like the real thing. Face groups follow BoxGeometry: +x -x +y -y +z -z. */
function keycapGeometry() {
  const w = 2.6, h = 1.3
  const g = new RoundedBoxGeometry(w, h, w, 14, 0.32)
  const pos = g.attributes.position, nor = g.attributes.normal
  const v = new Vector3(), n = new Vector3()
  const dishR = 1.0, dish = 0.17
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    n.fromBufferAttribute(nor, i)
    const t = (v.y + h / 2) / h
    const k = 1 - 0.2 * t
    v.x *= k
    v.z *= k
    // the sides lean in with the taper
    n.y += 0.22 * (1 - Math.abs(n.y)) * (n.y < 0.9 ? 1 : 0)
    const top = smooth(0.55, 0.97, n.y)
    if (top > 0) {
      const d2 = (v.x * v.x + v.z * v.z) / (dishR * dishR)
      if (d2 < 1) {
        v.y -= dish * (1 - d2) * top
        const nx = (-2 * dish * v.x) / (dishR * dishR), nz = (-2 * dish * v.z) / (dishR * dishR)
        n.x += (nx - n.x) * top
        n.z += (nz - n.z) * top
        n.y += (1 - n.y) * top * 0
      }
    }
    n.normalize()
    pos.setXYZ(i, v.x, v.y, v.z)
    nor.setXYZ(i, n.x, n.y, n.z)
  }
  return g
}

function legendTexture(os, font) {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const x = c.getContext('2d')
  x.fillStyle = '#000'
  x.fillRect(0, 0, S, S)
  x.fillStyle = '#fff'
  x.strokeStyle = '#fff'
  x.textBaseline = 'alphabetic'
  if (os === 'mac') {
    x.font = `600 ${S * 0.32}px ${font}`
    x.fillText('fn', S * 0.16, S * 0.84)
    // the globe that shares the fn key on current Mac keyboards
    const cx = S * 0.8, cy = S * 0.21, r = S * 0.075
    x.lineWidth = S * 0.011
    x.beginPath(); x.arc(cx, cy, r, 0, 6.283); x.stroke()
    x.beginPath(); x.ellipse(cx, cy, r * 0.42, r, 0, 0, 6.283); x.stroke()
    x.beginPath(); x.moveTo(cx - r, cy); x.lineTo(cx + r, cy); x.stroke()
    x.beginPath(); x.ellipse(cx, cy, r, r * 0.45, 0, 0, 6.283); x.stroke()
  } else {
    x.font = `600 ${S * 0.22}px ${font}`
    x.fillText('ctrl', S * 0.16, S * 0.8)
    x.font = `500 ${S * 0.08}px ${font}`
    x.fillText('phải', S * 0.62, S * 0.22)
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  t.minFilter = LinearFilter
  t.center.set(0.5, 0.5)
  t.rotation = Math.PI
  return t
}

/* ------------------------------------------------------------------ start */

export function start(opts) {
  const canvas = opts.canvas
  const mobile = Math.min(innerWidth, innerHeight) < 700 || matchMedia('(pointer: coarse)').matches
  const reduced = !!opts.reduced
  let quality = 2 // 2: bloom + MSAA, 1: plain render, 0: bare. Drops by itself when the frame rate does.
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false })
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.outputColorSpace = SRGBColorSpace
  const BG = new Color(0x06080d)
  renderer.setClearColor(BG, 1)

  const scene = new Scene()
  scene.background = BG
  const camera = new PerspectiveCamera(32, 1, 0.1, 200)
  const camBase = new Vector3(0, 9.2, 14)
  camera.position.copy(camBase)
  camera.lookAt(0, 0, 0)

  // --- environment for the plastic: dark room with a blue strip, a coral strip and a soft white box
  const pmrem = new PMREMGenerator(renderer)
  const room = new Scene()
  room.background = new Color(0x04060a)
  const panel = (w, h, col, k, x, y, z) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(col).multiplyScalar(k), side: DoubleSide }))
    m.position.set(x, y, z)
    m.lookAt(0, 0, 0)
    room.add(m)
  }
  panel(12, 3, 0x6d8bff, 6, -9, 4, 3)
  panel(8, 2.5, 0xff7a6e, 5, 8, 3, -6)
  panel(18, 6, 0xdfe8ff, 1.5, 0, 8, -12)
  panel(14, 1.6, 0xcfdcff, 1.1, 0, 3, -13)
  panel(10, 3, 0xffffff, 0.5, 0, 11, 4)
  panel(30, 2, 0x3a4a8a, 1.2, 0, -3, -12)
  scene.environment = pmrem.fromScene(room, 0.03).texture
  scene.environmentIntensity = 0.8

  const key1 = new DirectionalLight(0xc8d6ff, 1.6)
  key1.position.set(-6, 10, 7)
  scene.add(key1)
  const rim = new PointLight(0xff7a6e, 55, 20, 2)
  rim.position.set(7, 3, -4)
  scene.add(rim)

  // --- terrain
  const tUniforms = {
    uTime: { value: 0 }, uFlow: { value: 0 }, uLevel: { value: 0 }, uDim: { value: 1 }, uScale: { value: 1000 },
    uBaseY: { value: TERRAIN_Y }, uQuiet: { value: 1 }, uOrigin: { value: new Vector3(0, 0, 0) },
    uRing: { value: Array.from({ length: 6 }, () => new Vector4(0, 0, -1, 0)) },
    uPointer: { value: new Vector2(999, 999) }, uPointerW: { value: 0 },
    uRecMix: { value: 0 }, uOkMix: { value: 0 },
    uColA: { value: new Color(0x3552e0) }, uColB: { value: new Color(0x9db9ff) },
    uRec: { value: new Color(0xff6a5c) }, uOk: { value: new Color(0x5ee8a6) },
  }
  const terrainMat = new ShaderMaterial({
    vertexShader: TERRAIN_VERT, fragmentShader: TERRAIN_FRAG, uniforms: tUniforms,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  })
  let terrain = new Points(terrainGeometry(mobile ? 0.24 : 0.135), terrainMat)
  terrain.frustumCulled = false
  scene.add(terrain)

  // sparks: tiny embers that leave the key while someone speaks
  const SPARKS = mobile ? 500 : 1100
  const sparkGeo = new BufferGeometry()
  sparkGeo.setAttribute('position', new Float32BufferAttribute(new Float32Array(SPARKS * 3), 3))
  sparkGeo.setAttribute('aSeed', new Float32BufferAttribute(Float32Array.from({ length: SPARKS }, () => Math.random() * 500), 1))
  const sUniforms = { uTime: { value: 0 }, uEnergy: { value: 0.04 }, uOrigin: { value: new Vector3() }, uScale: tUniforms.uScale, uSize: { value: 0.05 } }
  const sparks = new Points(sparkGeo, new ShaderMaterial({ vertexShader: SPARK_VERT, fragmentShader: SPARK_FRAG, uniforms: sUniforms, transparent: true, depthWrite: false, blending: AdditiveBlending }))
  sparks.frustumCulled = false
  scene.add(sparks)

  // soft glow far away, behind the field
  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = glowCanvas.height = 256
  {
    const x = glowCanvas.getContext('2d')
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128)
    g.addColorStop(0, 'rgba(120,150,255,.55)'); g.addColorStop(0.5, 'rgba(60,90,220,.16)'); g.addColorStop(1, 'rgba(0,0,0,0)')
    x.fillStyle = g; x.fillRect(0, 0, 256, 256)
  }
  const glow = new Sprite(new SpriteMaterial({ map: new CanvasTexture(glowCanvas), blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5, fog: false }))
  glow.position.set(0, 2, -34)
  glow.scale.set(90, 34, 1)
  scene.add(glow)

  // --- keycaps
  const capGeo = keycapGeometry()
  const plateGeo = new RoundedBoxGeometry(PLATE_W, 0.34, PLATE_W, 5, 0.2)
  const stripGeo = new RoundedBoxGeometry(PLATE_W - 0.04, 0.07, PLATE_W - 0.04, 4, 0.2)
  const leakGeo = new PlaneGeometry(4.6, 4.6)
  const leakTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128
    const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 4, 64, 64, 64)
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128)
    return new CanvasTexture(c)
  })()
  const capSide = new MeshPhysicalMaterial({ color: 0x10162c, roughness: 0.32, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.22, envMapIntensity: 0.55 })
  const plateMat = new MeshPhysicalMaterial({ color: 0x10162a, roughness: 0.34, metalness: 0.7, envMapIntensity: 0.45 })
  const legends = {}
  const font = '"Newsreader", "Iowan Old Style", Georgia, serif'
  const makeLegends = () => {
    for (const os of ['mac', 'win']) legends[os]?.dispose(), (legends[os] = legendTexture(os, font))
  }
  makeLegends()
  if (document.fonts?.load) document.fonts.load('600 200px Newsreader').then(() => { makeLegends(); keys.forEach((k) => (k.topMat.emissiveMap = legends[os])); invalidate() }).catch(() => {})
  let os = opts.os || 'mac'

  const keys = []
  function addKey(el, o = {}) {
    const group = new Group()
    const topMat = capSide.clone()
    topMat.emissive = new Color(0xffffff)
    topMat.emissiveMap = legends[os]
    topMat.emissiveIntensity = 4
    const stripMat = new MeshBasicMaterial({ color: new Color(0x4f6cff), toneMapped: false })
    const leakMat = new MeshBasicMaterial({ map: leakTex, color: new Color(0x4f6cff), toneMapped: false, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false })
    const plate = new Mesh(plateGeo, plateMat)
    plate.position.y = -0.17
    const strip = new Mesh(stripGeo, stripMat)
    strip.position.y = -0.31
    const leak = new Mesh(leakGeo, leakMat)
    leak.rotation.x = -Math.PI / 2
    leak.position.y = -0.36
    const cap = new Mesh(capGeo, [capSide, capSide, topMat, capSide, capSide, capSide])
    const lamp = new PointLight(0x4f6cff, 18, 4.2, 2)
    lamp.position.y = -0.55
    group.add(plate, strip, leak, cap, lamp)
    scene.add(group)
    const k = {
      el, group, cap, topMat, stripMat, leakMat, lamp, size: o.size || 1, main: !!o.main,
      drop: o.intro && !reduced ? 1 : 0, dropV: 0, dropAt: 0, landed: !(o.intro && !reduced),
      target: 0, p: 0, pv: 0, mode: 'idle', hot: new Color(0x4f6cff), tint: new Color(0xcfe0ff), tintI: 1.3,
      pos: new Vector3(), s: 1, visible: true, flash: 0, tilt: new Vector2(),
    }
    keys.push(k)
    invalidate()
    return {
      /** held (true) or released (false) */
      press(on) { k.target = on ? 1 : 0; invalidate() },
      /** idle | listening | writing | done */
      mode(m) { k.mode = m; if (m === 'done') k.flash = 1; invalidate() },
      /** a ring that leaves from this key */
      kick(a) { ring(k.pos.x, k.pos.z, a ?? 0.7) },
      remove() { scene.remove(group); keys.splice(keys.indexOf(k), 1) },
      get active() { return k.target > 0 },
    }
  }

  // --- post: bloom, so the legend, light strips and bright dots glow
  let composer, bloom, rt
  function buildComposer(w, h, pr) {
    rt?.dispose()
    rt = new WebGLRenderTarget(w * pr, h * pr, { type: HalfFloatType, samples: 4 })
    composer = new EffectComposer(renderer, rt)
    composer.setPixelRatio(pr)
    composer.setSize(w, h)
    composer.addPass(new RenderPass(scene, camera))
    bloom = new UnrealBloomPass(new Vector2(w / 2, h / 2), 0.55, 0.55, 0.42)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())
  }

  // --- sizing
  let W = 1, H = 1, pr = 1
  function resize() {
    W = innerWidth
    H = innerHeight
    pr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : quality >= 2 ? 2 : 1.5)
    renderer.setPixelRatio(pr)
    renderer.setSize(W, H, false)
    camera.aspect = W / H
    // portrait phones: a wider lens so the field still reads as a landscape
    camera.fov = W / H < 0.8 ? 40 : 32
    camera.updateProjectionMatrix()
    tUniforms.uScale.value = (H * pr) / (2 * Math.tan((camera.fov * Math.PI) / 360))
    if (quality >= 2) buildComposer(W, H, pr)
    invalidate()
  }

  // --- pointer
  const ptr = { x: 0, y: 0, sx: 0, sy: 0, ndc: new Vector2(), moved: 0 }
  addEventListener('pointermove', (e) => {
    ptr.x = (e.clientX / innerWidth) * 2 - 1
    ptr.y = (e.clientY / innerHeight) * 2 - 1
    ptr.ndc.set(ptr.x, -ptr.y)
    ptr.moved = performance.now()
    invalidate()
  }, { passive: true })

  // --- state shared with the page
  const rings = []
  function ring(x, z, amp) {
    if (reduced) return
    rings.push({ x, z, t0: performance.now() / 1000, amp })
    if (rings.length > 6) rings.shift()
    invalidate()
  }
  const g = { sonar: 0, energy: 0.04, burst: 0, level: 0, levelT: 0, mode: 'idle', rec: 0, ok: 0, dim: 1, dimAuto: true, flow: 0, lastScroll: scrollY, quiet: 1 }

  const ray = new Raycaster()
  const ground = new Plane(new Vector3(0, 1, 0), -TERRAIN_Y)
  const hit = new Vector3(), fwd = new Vector3(), dir = new Vector3(), tmp = new Vector3()
  const tintHot = { idle: new Color(0x6f8dff), listening: new Color(0xff6a5c), writing: new Color(0x9fb6ff), done: new Color(0x5ee8a6) }
  const tintLeg = { idle: new Color(0xd2e0ff), listening: new Color(0xffd9d2), writing: new Color(0xe6eeff), done: new Color(0xb8ffdc) }

  function place(k) {
    const r = k.el.getBoundingClientRect()
    k.visible = r.bottom > -140 && r.top < H + 140 && r.width > 4
    k.group.visible = k.visible
    if (!k.visible) return
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    let s = k.s
    camera.getWorldDirection(fwd)
    for (let i = 0; i < 3; i++) {
      tmp.set((cx / W) * 2 - 1, -((cy / H) * 2 - 1), 0.5).unproject(camera)
      dir.copy(tmp).sub(camera.position).normalize()
      const planeY = 0.58 * s
      const t = (planeY - camera.position.y) / dir.y
      k.pos.copy(camera.position).addScaledVector(dir, t)
      const depth = tmp.copy(k.pos).sub(camera.position).dot(fwd)
      const pxPerUnit = H / (2 * depth * Math.tan((camera.fov * Math.PI) / 360))
      s = r.width / (PLATE_W * pxPerUnit)
    }
    k.s = s
    k.group.position.copy(k.pos)
    k.group.position.y -= 0.58 * s
    k.group.scale.setScalar(s)
  }

  let shown = false
  let raf = 0, running = true, last = performance.now() / 1000, frames = 0, slow = 0, tAcc = 0
  function invalidate() {
    if (!raf && running) raf = requestAnimationFrame(frame)
  }

  function frame(nowMs) {
    raf = 0
    const now = nowMs / 1000
    const dt = Math.min(0.05, now - last)
    last = now
    tAcc += dt
    const time = reduced ? 0 : now

    // pointer parallax
    const idle = performance.now() - ptr.moved > 2500
    const tx = idle ? 0 : ptr.x, ty = idle ? 0 : ptr.y
    ptr.sx += (tx - ptr.sx) * Math.min(1, dt * 3)
    ptr.sy += (ty - ptr.sy) * Math.min(1, dt * 3)
    if (!reduced) {
      camera.position.set(camBase.x + ptr.sx * 1.3, camBase.y - ptr.sy * 0.7, camBase.z)
      camera.lookAt(ptr.sx * 0.4, 0, ptr.sy * -0.3)
    }
    camera.updateMatrixWorld()

    // scroll → terrain flow, and dim the field behind long text
    const sc = scrollY
    g.flow += (sc - g.lastScroll) * 0.012
    g.lastScroll = sc
    if (g.dimAuto) {
      const k = smooth(0.1 * H, 0.95 * H, sc)
      g.dim = 1 - 0.74 * k
    }

    // mixes
    const wantRec = g.mode === 'listening' ? 1 : g.mode === 'writing' ? 0.45 : 0
    g.rec += (wantRec - g.rec) * Math.min(1, dt * 7)
    g.level += (g.levelT - g.level) * Math.min(1, dt * 14)

    let activeKey = null
    for (const k of keys) {
      place(k)
      if (!k.visible) continue
      // spring: quick press, tiny overshoot on release
      const stiff = 380, damp = 22
      k.pv += ((k.target - k.p) * stiff - k.pv * damp) * dt
      k.p += k.pv * dt
      if (reduced) { k.p = k.target; k.pv = 0 }
      k.cap.position.y = 0.77 - k.p * 0.45
      if (k.drop > 0.0005 || k.dropV) {
        if (!k.dropAt) k.dropAt = now
        if (now - k.dropAt > 0.25) { k.dropV += ((0 - k.drop) * 95 - k.dropV * 9.5) * dt; k.drop += k.dropV * dt }
        if (!k.landed && k.drop < 0.04) { k.landed = true; ring(k.pos.x, k.pos.z, 0.9); g.burst = 1 }
        if (Math.abs(k.drop) < 0.0005 && Math.abs(k.dropV) < 0.01) { k.drop = 0; k.dropV = 0 }
        k.group.position.y += k.drop * 3.4 * k.s
      }
      k.flash = Math.max(0, k.flash - dt * 0.9)
      const m = k.mode
      const hotT = tintHot[m], legT = tintLeg[m]
      k.hot.lerp(hotT, Math.min(1, dt * 10))
      k.tint.lerp(legT, Math.min(1, dt * 10))
      const pulse = m === 'listening' ? 0.5 + g.level * 1.4 : m === 'writing' ? 0.5 + 0.35 * Math.sin(time * 9) : 0
      k.topMat.emissive.copy(k.tint)
      k.topMat.emissiveIntensity = 3.6 + pulse * 1.2 + k.flash * 1.4
      const stripI = 0.9 + pulse * 0.8 + k.flash * 1.4
      k.stripMat.color.copy(k.hot).multiplyScalar(stripI)
      k.leakMat.color.copy(k.hot).multiplyScalar(0.8 + pulse * 0.6)
      k.leakMat.opacity = 0.22 + 0.2 * k.p + k.flash * 0.25
      k.lamp.color.copy(k.hot)
      k.lamp.intensity = (10 + pulse * 18 + k.flash * 14) * k.s
      // float and lean toward the pointer
      const bob = reduced ? 0 : Math.sin(time * 1.3 + k.pos.x) * 0.03
      k.group.position.y += bob
      k.group.rotation.x = ptr.sy * 0.06
      k.group.rotation.z = -ptr.sx * 0.06
      // the key that speaks: one being held, else the main one, else whichever is on screen
      if (k.target > 0) activeKey = k
      else if (!activeKey || (k.main && !activeKey.target)) activeKey = k
    }
    if (activeKey) tUniforms.uOrigin.value.copy(activeKey.pos)

    // rings
    const R = tUniforms.uRing.value
    for (let i = 0; i < 6; i++) {
      const r = rings[i]
      if (r && now - r.t0 < 4) R[i].set(r.x, r.z, now - r.t0, r.amp)
      else R[i].set(0, 0, -1, 0)
    }
    while (rings.length && now - rings[0].t0 >= 4) rings.shift()

    // pointer on the ground
    ray.setFromCamera(ptr.ndc, camera)
    const onGround = ray.ray.intersectPlane(ground, hit)
    tUniforms.uPointer.value.set(onGround ? hit.x : 999, onGround ? hit.z : 999)
    const pw = idle || !onGround ? 0 : 0.5
    tUniforms.uPointerW.value += (pw - tUniforms.uPointerW.value) * Math.min(1, dt * 4)

    // at rest, a soft ring leaves the key now and then, so the field never looks dead
    if (!reduced && g.mode === 'idle' && activeKey && now - g.sonar > 4.2) { g.sonar = now; ring(activeKey.pos.x, activeKey.pos.z, 0.28) }
    // sparks: calm embers at rest, a stream while someone speaks, a burst when a word lands
    g.burst = Math.max(0, g.burst - dt * 2.2)
    const eT = g.mode === 'listening' ? 0.42 + g.level * 0.45 : g.mode === 'done' ? 0.22 : 0.04
    g.energy += (Math.min(1, activeKey ? eT + g.burst * 0.5 : 0) - g.energy) * Math.min(1, dt * 6)
    sUniforms.uEnergy.value = reduced ? 0 : g.energy
    sUniforms.uTime.value = time
    if (activeKey) sUniforms.uOrigin.value.copy(activeKey.pos).y += activeKey.s * 1.4

    tUniforms.uTime.value = time
    tUniforms.uFlow.value = reduced ? 0 : g.flow + time * 0.35
    tUniforms.uLevel.value = g.level
    tUniforms.uDim.value = g.dim
    tUniforms.uRecMix.value = g.rec
    let fl = 0
    for (const k of keys) if (k.flash > fl) fl = k.flash
    tUniforms.uOkMix.value = fl * 0.9
    tUniforms.uQuiet.value = 1

    if (composer && quality >= 2) composer.render()
    else renderer.render(scene, camera)
    if (!shown) { shown = true; opts.onFrame?.() }

    // keep the frame rate honest: drop effects before dropping frames
    frames++
    if (!reduced && tAcc > 2.5) {
      const fps = frames / tAcc
      frames = 0
      tAcc = 0
      if (fps < 40) slow++
      else slow = Math.max(0, slow - 1)
      if (slow >= 2 && quality > 0) {
        quality--
        slow = 0
        if (quality < 2) { composer = null; rt?.dispose() }
        resize()
      }
      api.fps = Math.round(fps)
    }

    const busy = !reduced || keys.some((k) => Math.abs(k.p - k.target) > 0.001 || Math.abs(k.pv) > 0.01) || rings.length
    if (running && busy) raf = requestAnimationFrame(frame)
  }

  addEventListener('resize', resize)
  addEventListener('scroll', invalidate, { passive: true })
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden
    if (running) { last = performance.now() / 1000; invalidate() }
  })
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); running = false; opts.onLost?.() })
  resize()

  const api = {
    fps: 0,
    addKey,
    /** 0..1: how loud the voice is right now */
    level(v) { g.levelT = v },
    mode(m) { g.mode = m; invalidate() },
    /** ring from the active key (a word landed) */
    kick(a) { const k = keys.find((x) => x.target > 0) || keys.find((x) => x.main); g.burst = 1; if (k) ring(k.pos.x, k.pos.z, a ?? 0.6) },
    setOS(v) { os = v; keys.forEach((k) => (k.topMat.emissiveMap = legends[os])); invalidate() },
    dim(v) { if (v == null) g.dimAuto = true; else { g.dimAuto = false; g.dim = v } invalidate() },
    get quality() { return quality },
    renderer, u: tUniforms, keys, camera, bloom: () => bloom,
  }
  return api
}
