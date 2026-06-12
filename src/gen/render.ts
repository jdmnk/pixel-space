import { mulberry32, pack, unpack, type WorldParams } from './seed.ts'

const TAU = Math.PI * 2

// Minimal canvas surface the renderer needs — satisfied by a real
// HTMLCanvasElement and by the fake pixel-capture canvas in scripts/hero.ts
export interface PixelContext {
  fillStyle: string | CanvasGradient | CanvasPattern
  fillRect(x: number, y: number, w: number, h: number): void
}
export interface PixelCanvas {
  width: number
  height: number
  getContext(contextId: '2d'): PixelContext | null
}

export interface RenderOpts {
  cx?: number
  cy?: number
  scale?: number
  bare?: boolean
}

type Put = (x: number, y: number, c: string) => void
type Rng = () => number

// --- deterministic value noise -------------------------------------------

function hash2(ix: number, iy: number, seed: number): number {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed | 0, 1442695041)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
const smooth = (t: number) => t * t * (3 - 2 * t)

function noise2(x: number, y: number, seed: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = smooth(x - ix)
  const fy = smooth(y - iy)
  const a = hash2(ix, iy, seed)
  const b = hash2(ix + 1, iy, seed)
  const c = hash2(ix, iy + 1, seed)
  const d = hash2(ix + 1, iy + 1, seed)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}

function fbm(x: number, y: number, seed: number): number {
  return noise2(x, y, seed) * 0.65 + noise2(x * 2.3 + 17.3, y * 2.3 + 9.1, seed ^ 0x9e37) * 0.35
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)

// --- palettes (dark -> light) ----------------------------------------------

const GAS = [
  ['#43274f', '#7e3f63', '#c75d6f', '#ee9476', '#f9d29d'],
  ['#2c2a54', '#44518f', '#5f86bf', '#8fc1dd', '#d3f0ea'],
  ['#4f2440', '#8f3a62', '#cd6189', '#ec96b4', '#fbcfdd'],
  ['#4f3a1d', '#8a6428', '#c39538', '#e7c267', '#f9e7ae'],
  ['#1d4039', '#2f6b4f', '#54a06a', '#8fcc8b', '#d8f3c0'],
  ['#33204f', '#5c3a85', '#8f5fb5', '#c393dd', '#ecd2f5'],
  ['#23404f', '#2f6b78', '#4fa3a0', '#8fd3c4', '#dcf7e8'],
  ['#4f2a24', '#8a4a30', '#c3763e', '#e7a85e', '#f9d9a0'],
]

const EARTH = [
  { sea: ['#16345f', '#2b5d9e', '#4f93cf'], land: ['#2e6b35', '#55a04a', '#93cc6b'], beach: '#e3cd86', cap: '#eef6fb' },
  { sea: ['#143c54', '#226e87', '#3fa3b0'], land: ['#5d7a32', '#8aa84b', '#c2d077'], beach: '#dbc77f', cap: '#f0f7f2' },
  { sea: ['#4a2d12', '#7a5022', '#b07f3a'], land: ['#6b4a2e', '#9c7547', '#cfa86a'], beach: '#e0bf86', cap: '#f3ead9' },
  { sea: ['#33175f', '#5c2b9e', '#8f54cf'], land: ['#1d6b5a', '#3aa084', '#7cccab'], beach: '#cfa8e0', cap: '#f1e9fb' },
  { sea: ['#0f2d4f', '#1f5586', '#3b84b8'], land: ['#3f6b2e', '#6ba04a', '#a8cc77'], beach: '#e3cd86', cap: '#ffffff' },
  { sea: ['#27104a', '#46247f', '#7048b3'], land: ['#a83a68', '#d0608f', '#eb98b8'], beach: '#e8b8d8', cap: '#f8eef6' },
  { sea: ['#11403b', '#1f6e62', '#3da38e'], land: ['#74722e', '#a8a64b', '#d4d077'], beach: '#dfd07f', cap: '#f0f7f0' },
  { sea: ['#3a1230', '#6e2358', '#a83f86'], land: ['#2e5d6b', '#4a92a0', '#77c2cc'], beach: '#c886c0', cap: '#fbeef6' },
]
const CLOUD = '#fdfbf2'

const ICE = [
  ['#3b5e8f', '#6f97c4', '#a3c4e3', '#cfe4f2', '#f2fbff'],
  ['#3b8f7a', '#6fc4a8', '#a3e3cb', '#d3f2e2', '#f2fff8'],
  ['#5e4a8f', '#8f7ac4', '#b8a8e3', '#dcd3f2', '#f6f2ff'],
  ['#5e6e7f', '#8a9cab', '#b4c4cf', '#d8e2e8', '#f4f8fa'],
  ['#8f3b6e', '#c46fa3', '#e3a3cb', '#f2d3e6', '#fff2fa'],
  ['#39728f', '#5fa8c4', '#92cfe3', '#c6e8f2', '#effbff'],
  ['#6e7f3b', '#9cab5f', '#c4cf92', '#e2e8c6', '#f8faef'],
  ['#46648f', '#7a8fc4', '#a8b8e3', '#d3dcf2', '#f2f6ff'],
]

const ROCK = [
  ['#3f3a47', '#6b6478', '#9a93a8', '#c5bfd0', '#ece8f2'],
  ['#4a3527', '#7a5a40', '#a8845e', '#cfae84', '#eed7b4'],
  ['#2f3b33', '#52645a', '#7c9184', '#aabcae', '#d8e6da'],
  ['#47323a', '#785662', '#a8838f', '#d0b2bb', '#f2e2e7'],
  ['#33363f', '#565d6b', '#848e9c', '#b2bcc8', '#e2e8f0'],
  ['#463c2a', '#776747', '#a6956b', '#d0c194', '#f0e7c2'],
  ['#3a2f47', '#645278', '#9181a8', '#bdb2d0', '#e8e2f2'],
  ['#40342e', '#6e5a4e', '#9c8474', '#c8b1a0', '#ecdccf'],
]

const LAVA = [
  ['#241318', '#46232a', '#b3402a', '#ef7d2f', '#ffd23f'],
  ['#1a1424', '#332346', '#7a2ab3', '#c12fef', '#ff8fe8'],
  ['#241a13', '#462f23', '#b3652a', '#efa12f', '#ffe23f'],
  ['#131c24', '#234046', '#2a8ab3', '#2fc9ef', '#8ffff4'],
  ['#241313', '#462323', '#b32a3c', '#ef2f5c', '#ff8f9d'],
  ['#1c1310', '#3d2a1c', '#a04515', '#e0701c', '#ffc14d'],
  ['#101810', '#23462b', '#2ab351', '#4fef62', '#c2ff8f'],
  ['#241a0f', '#46371f', '#b3852a', '#efc12f', '#fff48f'],
]

const SUN = [
  ['#8a4a1c', '#d07c2a', '#f4a93c', '#ffd45e', '#fff3b0'],
  ['#8a2a1c', '#d04a2a', '#f4743c', '#ffa55e', '#ffe3b0'],
  ['#6e1c30', '#b03048', '#e05560', '#ff8f7a', '#ffd9b8'],
  ['#1c4a8a', '#2a7cd0', '#3ca9f4', '#7ed4ff', '#defaff'],
  ['#6e5e1c', '#b09c30', '#e0ce55', '#fff08f', '#fffce0'],
  ['#5e1c6e', '#9c30b0', '#ce55e0', '#f08fff', '#fce0ff'],
  ['#7a3a10', '#c2641c', '#eb9128', '#ffc34d', '#ffeeb8'],
  ['#36648a', '#5c97c2', '#8fc6eb', '#c8ecff', '#f4fcff'],
]

const NEUT = [
  ['#1f4e8a', '#3a8fd0', '#7ed4f4', '#eafdff'],
  ['#6e1f8a', '#b03ad0', '#e57ef4', '#fdeaff'],
  ['#1f8a72', '#3ad0a8', '#7ef4d4', '#eafff8'],
  ['#8a5e1f', '#d0a03a', '#f4d97e', '#fffbea'],
]

const HOLE = [
  ['#7a2d12', '#e0701c', '#ffc14d'],
  ['#12537a', '#1ca8e0', '#7ce8ff'],
  ['#5e127a', '#a81ce0', '#e87cff'],
  ['#7a4a12', '#e09c1c', '#ffe97c'],
  ['#7a1230', '#e01c50', '#ff7ca0'],
  ['#0f6e4f', '#1cc28a', '#7cffd4'],
  ['#2d3a8a', '#5c7ae0', '#b8d0ff'],
  ['#8a2d5e', '#e05ca0', '#ffb8d9'],
]

const RING_COLORS = [
  ['#8a7a5e', '#e8d5a8'],
  ['#5e7a8a', '#bcdcec'],
  ['#8a5e7a', '#ecc2dc'],
  ['#6e6e8a', '#d0d0ec'],
]

export const BG = ['#171e38', '#1a2347', '#131a30', '#1f1a38']

function rampFor(type: number, palette: number): string[] {
  switch (type) {
    case 0: return GAS[palette]
    case 1: { const e = EARTH[palette]; return [e.sea[0], e.sea[1], e.land[0], e.land[1], e.land[2]] }
    case 2: return ICE[palette]
    case 3: return ROCK[palette]
    case 4: return LAVA[palette]
    default: return GAS[palette]
  }
}

// --- main ------------------------------------------------------------------

// opts: { cx, cy, scale, bare } — bare skips background + starfield so a
// body can be composed onto a larger scene (see renderSpace below)
export function renderScene(canvas: PixelCanvas, p: WorldParams, opts: RenderOpts = {}) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width
  const H = canvas.height
  const CX = opts.cx ?? W >> 1
  const CY = opts.cy ?? H >> 1
  const mul = opts.scale ?? 1
  const rnd = mulberry32(((p.packed >>> 0) ^ Math.imul(Math.floor(p.packed / 65536), 2654435761)) >>> 0)
  const nseed = (Math.imul(p.detail, 2654435761) ^ Math.imul(p.palette + 1, 374761393) ^ p.type * 97) | 0

  const put: Put = (x, y, c) => {
    x |= 0; y |= 0
    if (x >= 0 && y >= 0 && x < W && y < H) {
      ctx.fillStyle = c
      ctx.fillRect(x, y, 1, 1)
    }
  }

  if (!opts.bare) {
    ctx.fillStyle = BG[p.packed % 4]
    ctx.fillRect(0, 0, W, H)
    drawStarfield(put, rnd, W, H)
  }

  const planetlike = p.type <= 4
  const R =
    (planetlike
      ? 13 + p.size * 1.5
      : p.type === 5
        ? 15 + p.size
        : p.type === 6
          ? 5 + (p.size >> 1)
          : 9 + p.size) * mul

  const ringCount = planetlike ? [0, 1, 1, 2][p.rings] : 0
  const ringRx = R * 1.55 + 3
  const ringRy = 0.3 + p.ringStyle * 0.05

  // crumbling-world mask: carve a ragged bite out of the disk
  let mask: ((dx: number, dy: number) => boolean) | null = null
  let decayDir: [number, number] | null = null
  if (p.decay && planetlike) {
    const a = rnd() * TAU
    const dir: [number, number] = [Math.cos(a), Math.sin(a)]
    decayDir = dir
    mask = (dx, dy) =>
      dx * dir[0] + dy * dir[1] + (noise2(dx * 0.35 + 31, dy * 0.35 + 7, nseed ^ 77) - 0.5) * 9 < R * 0.5
  }

  const shadeOff = (nx: number, ny: number, x: number, y: number): number => {
    const light = -(nx + ny) * 0.55 + ((x + y) & 1 ? 0.06 : 0)
    if (light > 0.45) return 1
    if (light > -0.15) return 0
    if (light > -0.48) return -1
    return -2
  }

  function drawRings(front: boolean) {
    if (!ringCount) return
    const [dark, light] = RING_COLORS[p.ringStyle]
    for (let y = 0; y < H; y++) {
      const dy = y - CY
      if (front ? dy < 0 : dy >= 0) continue
      for (let x = 0; x < W; x++) {
        const dx = x - CX
        for (let i = 0; i < ringCount; i++) {
          const rx = ringRx + i * 5
          const ry = rx * ringRy
          const a = dx / rx
          const b = dy / ry
          const q = Math.sqrt(a * a + b * b)
          const w = (2.4 / rx) * (i === 0 && p.feature >= 2 ? 1.7 : 1)
          if (Math.abs(q - 1) < w) {
            const inner = q < 1 - w * 0.35
            put(x, y, front ? (inner ? dark : light) : dark)
            break
          }
        }
      }
    }
  }

  function drawDisk(
    surface: (x: number, y: number, nx: number, ny: number, r: number) => string,
    outline: string,
  ) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x - CX
        const dy = y - CY
        const r = Math.sqrt(dx * dx + dy * dy)
        if (r > R) continue
        if (mask && !mask(dx, dy)) continue
        if (outline && r > R - 1.1) {
          put(x, y, outline)
          continue
        }
        put(x, y, surface(x, y, dx / R, dy / R, r))
      }
    }
  }

  // --- body renderers ---

  function drawGas() {
    const ramp = GAS[p.palette]
    const bands = 3 + p.feature
    const pattern: number[] = []
    for (let i = 0; i < bands + 3; i++) {
      let c = 1 + Math.floor(rnd() * 3.99)
      if (c === pattern[i - 1]) c = 1 + (c % 4)
      pattern.push(c)
    }
    const spot: [number, number] | null = p.feature >= 2 ? [rnd() * 1.1 - 0.55, rnd() * 0.8 - 0.4] : null
    drawDisk((x, y, nx, ny) => {
      const wob = (fbm(nx * 1.6 + 4.2, ny * 1.6, nseed) - 0.5) * 1.4
      const t = (ny * 0.5 + 0.5) * bands + wob
      let idx = pattern[clamp(Math.floor(t + 1), 0, pattern.length - 1)]
      if (spot) {
        const sx = (nx - spot[0]) / 0.32
        const sy = (ny - spot[1]) / 0.2
        if (sx * sx + sy * sy < 1) idx = 0
      }
      return ramp[clamp(idx + shadeOff(nx, ny, x, y), 0, 4)]
    }, ramp[0])
  }

  function drawTerran() {
    const pal = EARTH[p.palette]
    drawDisk((x, y, nx, ny) => {
      const off = shadeOff(nx, ny, x, y)
      const capEdge = 0.72 + (noise2(nx * 3 + 5, ny * 3, nseed ^ 3) - 0.5) * 0.18
      if (Math.abs(ny) > capEdge) return pal.cap
      const c = fbm(nx * 1.8 - 6.1, ny * 1.8 + 3.3, nseed ^ 0x55)
      if (c > 0.68) return off < 0 ? '#cfd4e8' : CLOUD
      const v = fbm(nx * 2.2 + 1.7, ny * 2.2 + 8.4, nseed)
      if (v > 0.58) {
        const li = v > 0.72 ? 2 : v > 0.64 ? 1 : 0
        return pal.land[clamp(li + off, 0, 2)]
      }
      if (v > 0.545 && off >= 0) return pal.beach
      const si = v < 0.35 ? 0 : v < 0.47 ? 1 : 2
      return pal.sea[clamp(si + off, 0, 2)]
    }, EARTH[p.palette].sea[0])
  }

  function drawIce() {
    const ramp = ICE[p.palette]
    // cracks: a few jagged random walks across the surface
    const cracks = new Set<number>()
    const walks = 2 + (p.feature >> 1)
    for (let i = 0; i < walks; i++) {
      let wx = CX + (rnd() - 0.5) * R * 1.2
      let wy = CY + (rnd() - 0.5) * R * 1.2
      let ang = rnd() * TAU
      const steps = Math.floor(R * (1.2 + rnd() * 0.8))
      for (let s = 0; s < steps; s++) {
        cracks.add(((wx | 0) << 8) | (wy | 0))
        ang += (rnd() - 0.5) * 0.9
        wx += Math.cos(ang)
        wy += Math.sin(ang)
      }
    }
    drawDisk((x, y, nx, ny) => {
      if (cracks.has((x << 8) | y)) return ramp[0]
      const v = fbm(nx * 2 + 3.1, ny * 2 + 11.4, nseed)
      const idx = v > 0.66 ? 4 : v > 0.5 ? 3 : 2
      return ramp[clamp(idx + shadeOff(nx, ny, x, y), 0, 4)]
    }, ramp[0])
  }

  function drawMoon() {
    const ramp = ROCK[p.palette]
    const craters: [number, number, number][] = []
    const n = 3 + p.feature * 2
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU
      const d = rnd() * R * 0.72
      craters.push([CX + Math.cos(a) * d, CY + Math.sin(a) * d, 1.6 + rnd() * (R * 0.16)])
    }
    drawDisk((x, y, nx, ny) => {
      const off = shadeOff(nx, ny, x, y)
      for (const [cx2, cy2, cr] of craters) {
        const ddx = x - cx2
        const ddy = y - cy2
        const d = Math.sqrt(ddx * ddx + ddy * ddy)
        if (d < cr) return ramp[clamp(1 + off, 0, 4)]
        if (d < cr + 1.2 && ddx + ddy > 0) return ramp[clamp(3 + off, 0, 4)]
      }
      const v = fbm(nx * 2.4 + 7.7, ny * 2.4 + 2.2, nseed)
      const idx = v > 0.6 ? 3 : 2
      return ramp[clamp(idx + off, 0, 4)]
    }, ramp[0])
  }

  function drawMagma() {
    const ramp = LAVA[p.palette]
    drawDisk((x, y, nx, ny) => {
      const v = fbm(nx * 2.6 + 5.5, ny * 2.6 + 1.3, nseed)
      const band = Math.abs(v - 0.5)
      if (band < 0.04) return ramp[4]
      if (band < 0.085) return ramp[3]
      if (band < 0.125) return ramp[2]
      const off = shadeOff(nx, ny, x, y)
      const crust = fbm(nx * 3.4 - 2.2, ny * 3.4 + 6.6, nseed ^ 0xab) > 0.5 ? 1 : 0
      return ramp[clamp(crust + off, 0, 1)]
    }, ramp[0])
  }

  function drawSun() {
    const ramp = SUN[p.palette]
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x - CX
        const dy = y - CY
        const r = Math.sqrt(dx * dx + dy * dy)
        if (r > R * 1.35) continue
        if (r <= R) {
          let idx = r < R * 0.5 ? 4 : r < R * 0.78 ? 3 : 2
          const g = fbm((dx / R) * 2.4 + 3, (dy / R) * 2.4 + 8, nseed)
          if (idx === 2 && g > 0.62) idx = 3
          else if (idx >= 3 && g < 0.26) idx = 2
          if (r > R - 1.1) idx = 1
          put(x, y, ramp[idx])
        } else if (r <= R + 1.6 && (x + y) % 2 === 0) {
          put(x, y, ramp[1])
        }
      }
    }
    // rays — roughly proportional to the body so big suns shine far
    const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    if (p.feature >= 2) dirs.push([0.707, 0.707], [-0.707, 0.707], [0.707, -0.707], [-0.707, -0.707])
    const len = Math.round(R * 0.55) + 2
    for (const [ux, uy] of dirs) {
      const l = len * (0.75 + rnd() * 0.45)
      for (let s = 1; s <= l; s++) {
        const t = s / l
        put(CX + ux * (R + 1 + s), CY + uy * (R + 1 + s), t < 0.4 ? ramp[3] : t < 0.7 ? ramp[2] : ramp[1])
      }
    }
    // solar prominences when "deteriorating"
    if (p.decay) {
      for (let i = 0; i < 3; i++) {
        const a = rnd() * TAU
        const px2 = CX + Math.cos(a) * (R + 2.5)
        const py2 = CY + Math.sin(a) * (R + 2.5)
        put(px2, py2, ramp[3])
        put(px2 + 1, py2, ramp[2])
        put(px2, py2 - 1, ramp[2])
      }
    }
  }

  function drawNeutron() {
    const ramp = NEUT[p.palette % NEUT.length]
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x - CX
        const dy = y - CY
        const r = Math.sqrt(dx * dx + dy * dy)
        if (r <= R) {
          put(x, y, r < R * 0.55 ? ramp[3] : r < R * 0.85 ? ramp[2] : ramp[1])
        } else if (r <= R + 1.8 && (x + y) % 2 === 0) {
          put(x, y, ramp[1])
        }
      }
    }
    // polar jets
    const ja = ((p.ringStyle * 45 + 22.5) * Math.PI) / 180
    const len = (15 + p.size * 2) * mul
    for (const sgn of [1, -1]) {
      const ux = Math.cos(ja) * sgn
      const uy = Math.sin(ja) * sgn
      for (let s = 0; s < len; s++) {
        const jx = CX + ux * (R + 1 + s)
        const jy = CY + uy * (R + 1 + s)
        const t = s / len
        const col = t < 0.3 ? ramp[3] : t < 0.6 ? ramp[2] : ramp[1]
        if (t < 0.6 || (s & 1) === 0) {
          put(jx, jy, col)
          if (t < 0.35) put(jx + uy, jy - ux, ramp[1])
        }
      }
    }
    // pulse rings
    const radii = p.feature >= 2 ? [R * 2.4, R * 3.6] : [R * 2.6]
    for (const pr of radii) {
      const steps = Math.ceil(pr * 7)
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * TAU
        const x = Math.round(CX + Math.cos(a) * pr)
        const y = Math.round(CY + Math.sin(a) * pr * 0.92)
        if ((x + y) % 2 === 0) put(x, y, ramp[0])
      }
    }
  }

  // Black holes vary by seed: disk tilt (ringStyle), thin/blazing disk
  // (feature), single or double disk (rings), and a feeding state (decay)
  // that adds white-hot clumps and relativistic jets.
  function drawBlackHole() {
    const acc = HOLE[p.palette]
    const hot = '#fff3d6'
    const tilt = 0.2 + p.ringStyle * 0.07
    const disks = p.rings >= 2 ? 2 : 1
    const thick = p.feature >= 2 ? 4.4 : 2.9
    const rx0 = R * 1.9
    const disk = (front: boolean) => {
      for (let y = 0; y < H; y++) {
        const dy = y - CY
        if (front ? dy < 0 : dy >= 0) continue
        for (let x = 0; x < W; x++) {
          const dx = x - CX
          for (let d = 0; d < disks; d++) {
            const rx = rx0 + d * 7
            const ry = rx * tilt
            const a = dx / rx
            const b = dy / ry
            const q = Math.sqrt(a * a + b * b)
            const w = (thick / rx) * (d ? 0.55 : 1)
            if (Math.abs(q - 1) < w) {
              const inner = Math.abs(q - 1) < w * 0.45
              let col: string
              if (d > 0) col = front ? acc[1] : acc[0]
              else if (front) col = inner ? hot : acc[2]
              else col = inner ? acc[2] : acc[1]
              if (p.decay && d === 0 && hash2(x, y, nseed) > 0.8) col = hot
              put(x, y, col)
              break
            }
          }
        }
      }
    }
    disk(false)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x - CX
        const dy = y - CY
        const r = Math.sqrt(dx * dx + dy * dy)
        if (Math.abs(r - R * 0.8) <= 0.8) put(x, y, '#ffeec2')
        else if (r < R * 0.8) put(x, y, '#08070f')
        else if (r < R * 1.06 && dy < -R * 0.25) put(x, y, acc[1]) // lensed light above
        else if (r < R * 1.3 && (x + y) % 2 === 0 && r >= R * 1.06) put(x, y, acc[0])
      }
    }
    if (p.decay) {
      const len = R * 1.5
      for (const sgn of [1, -1]) {
        for (let s = 0; s < len; s++) {
          const t = s / len
          const jy = CY + sgn * Math.round(R * 1.05 + s)
          if (t < 0.45) {
            put(CX, jy, acc[2])
            put(CX + ((s & 1) ? 1 : -1), jy, acc[1])
          } else if ((s & 1) === 0) {
            put(CX, jy, acc[1])
          }
        }
      }
    }
    disk(true)
  }

  // --- compose ---

  drawRings(false)
  switch (p.type) {
    case 0: drawGas(); break
    case 1: drawTerran(); break
    case 2: drawIce(); break
    case 3: drawMoon(); break
    case 4: drawMagma(); break
    case 5: drawSun(); break
    case 6: drawNeutron(); break
    case 7: drawBlackHole(); break
  }
  drawRings(true)

  // drifting debris for crumbling worlds
  if (mask) {
    const ramp = rampFor(p.type, p.palette)
    const n = 8 + Math.floor(rnd() * 7)
    for (let i = 0; i < n; i++) {
      const d = R * (0.78 + rnd() * 1.15)
      const lat = (rnd() - 0.5) * R * 1.3
      const x = CX + decayDir![0] * d - decayDir![1] * lat
      const y = CY + decayDir![1] * d + decayDir![0] * lat
      const size = rnd() < 0.6 ? 1 : 2
      ctx.fillStyle = ramp[1 + Math.floor(rnd() * 3)]
      ctx.fillRect(x | 0, y | 0, size, size)
    }
  }

  // little companion star
  if (p.companion) {
    const a = rnd() * TAU
    const dist = Math.max(R, ringCount ? ringRx + 5 : 0) + 9 + rnd() * 4
    const x = clamp(Math.round(CX + Math.cos(a) * dist), 7, W - 8)
    const y = clamp(Math.round(CY + Math.sin(a) * dist * 0.85), 7, H - 8)
    const warm = p.detail & 1
    const core = warm ? '#fff6c8' : '#e8f8ff'
    const arm = warm ? '#ffd98a' : '#9cd4f0'
    put(x, y, core)
    put(x + 1, y, core)
    put(x, y + 1, core)
    put(x + 1, y + 1, core)
    put(x - 1, y, arm)
    put(x + 2, y, arm)
    put(x, y - 1, arm)
    put(x + 1, y + 2, arm)
    put(x + 2, y + 1, arm)
    put(x - 1, y + 1, arm)
    put(x + 1, y - 1, arm)
    put(x, y + 2, arm)
  }
}

// --- cosmos colour matching --------------------------------------------------

function hexToHs(hexcol: string): { h: number; s: number } {
  const r = parseInt(hexcol.slice(1, 3), 16) / 255
  const g = parseInt(hexcol.slice(3, 5), 16) / 255
  const b = parseInt(hexcol.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s }
}

// the colour that visually dominates a (type, palette) combination
function toneOf(type: number, palette: number): { h: number; s: number } {
  switch (type) {
    case 0: return hexToHs(GAS[palette][2])
    case 1: return hexToHs(EARTH[palette].sea[1])
    case 2: return hexToHs(ICE[palette][2])
    case 3: return hexToHs(ROCK[palette][2])
    case 4: return hexToHs(LAVA[palette][3])
    case 5: return hexToHs(SUN[palette][2])
    case 6: return hexToHs(NEUT[palette % NEUT.length][1])
    default: return hexToHs(HOLE[palette][1])
  }
}

const hueDist = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

// pick the palette of `type` that sits closest to the anchor hue, drifting
// up to one analogous step for variety; near-grey ramps act as wildcards
function matchPalette(type: number, anchorHue: number, rnd: Rng): number {
  const target = (anchorHue + [0, 0, -28, 28][Math.floor(rnd() * 4)] + 360) % 360
  const count = type === 6 ? NEUT.length : 8
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < count; i++) {
    const tone = toneOf(type, i)
    const d = (tone.s < 0.18 ? 38 : hueDist(tone.h, target)) + rnd() * 8
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

// True visual radius of a body in unscaled pixels — rings, rays, jets,
// debris and companions included — so cosmos placement never clips or
// crowds a world's furthest-reaching feature.
function bodyExtent(p: WorldParams): number {
  const base =
    p.type <= 4
      ? 13 + p.size * 1.5
      : p.type === 5
        ? 15 + p.size
        : p.type === 6
          ? 5 + (p.size >> 1)
          : 9 + p.size
  if (p.type <= 4) {
    let e = base + 1
    const rc = [0, 1, 1, 2][p.rings]
    if (rc) e = base * 1.55 + 3 + (rc - 1) * 5 + 2
    if (p.decay) e = Math.max(e, base * 1.95)
    if (p.companion) e += 15
    return e
  }
  if (p.type === 5) return base * 1.66 + 4 // corona rays
  if (p.type === 6) return Math.max(base * (p.feature >= 2 ? 3.7 : 2.7), base + 16 + p.size * 2) // pulse rings vs jets
  return Math.max(base * 1.9 + (p.rings >= 2 ? 7 : 0) + 2, p.decay ? base * 2.6 : 0) // disk vs jets
}

// Cosmos mode: the seed's own world plus a handful of deterministic
// neighbours, spaced out with best-candidate sampling so the sky reads
// as one cohesive scene. Same seed, same cosmos.
export function renderSpace(canvas: PixelCanvas, p: WorldParams) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width
  const H = canvas.height
  const rnd = mulberry32(((p.packed >>> 0) ^ 0x9e3779b9) >>> 0)

  const put: Put = (x, y, c) => {
    x |= 0; y |= 0
    if (x >= 0 && y >= 0 && x < W && y < H) {
      ctx.fillStyle = c
      ctx.fillRect(x, y, 1, 1)
    }
  }

  ctx.fillStyle = BG[p.packed % 4]
  ctx.fillRect(0, 0, W, H)
  drawStarfield(put, rnd, W, H)

  // featured world plus neighbours, larger bodies placed first; neighbour
  // palettes are colour-matched to the featured world's dominant hue so the
  // scene reads as one sky (a grey featured world anchors on a seeded hue)
  const anchor = toneOf(p.type, p.palette)
  const anchorHue = anchor.s < 0.18 ? rnd() * 360 : anchor.h
  const spots = [{ p, scale: 0.62 }]
  const neighbours = 2 + Math.floor(rnd() * 3)
  for (let i = 0; i < neighbours; i++) {
    const v = Math.floor(rnd() * 2 ** 17) * 2 ** 16 + Math.floor(rnd() * 2 ** 16)
    const raw = unpack(v)
    raw.palette = matchPalette(raw.type, anchorHue, rnd)
    spots.push({ p: unpack(pack(raw)), scale: 0.34 + rnd() * 0.16 })
  }
  spots.splice(1, spots.length, ...spots.slice(1).sort((a, b) => b.scale - a.scale))

  const placed: { x: number; y: number; ext: number }[] = []
  spots.forEach(({ p: body, scale }, idx) => {
    // visual extent in scene pixels, clamped so margins stay sane
    const ext = Math.min((bodyExtent(body) + 2) * scale, Math.min(W, H) * 0.42)
    // best-candidate sampling: take the spot with the most breathing room
    let bestX = 0
    let bestY = 0
    let bestScore = -Infinity
    for (let t = 0; t < 28; t++) {
      const x = ext + rnd() * (W - ext * 2)
      const y = ext + rnd() * (H - ext * 2)
      let score
      if (idx === 0) {
        // the featured world anchors the scene near the centre
        score = -Math.hypot(x - W / 2, y - H / 2)
      } else {
        score = Infinity
        for (const b of placed) score = Math.min(score, Math.hypot(b.x - x, b.y - y) - b.ext - ext)
        // gentle pull away from the edges keeps the composition balanced
        score = Math.min(score * 1.5, score + Math.min(x - ext, y - ext, W - ext - x, H - ext - y))
      }
      if (score > bestScore) {
        bestScore = score
        bestX = x
        bestY = y
      }
    }
    // skip a neighbour that simply cannot fit without overlap
    if (idx > 0 && bestScore < 1) return
    placed.push({ x: bestX, y: bestY, ext })
    renderScene(canvas, body, { cx: Math.round(bestX), cy: Math.round(bestY), scale, bare: true })
  })
}

function drawStarfield(put: Put, rnd: Rng, W: number, H: number) {
  const cx = W / 2
  const cy = H / 2
  const dots = ['#39456e', '#56689c', '#aab6e0', '#e8ecfa']
  const count = Math.round((W * H) / 350)
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rnd() * W)
    const y = Math.floor(rnd() * H)
    const c = dots[Math.floor(rnd() * rnd() * 4)]
    put(x, y, c)
  }
  // a couple of + sparkles
  const sparkles = 1 + Math.floor(rnd() * 2) + Math.floor((W * H) / 9216) - 1
  for (let i = 0; i < sparkles; i++) {
    const x = Math.floor(6 + rnd() * (W - 12))
    const y = Math.floor(6 + rnd() * (H - 12))
    if (W <= 96 && Math.hypot(x - cx, y - cy) < 34) continue
    put(x, y, '#ffffff')
    put(x - 1, y, '#9fb2e8')
    put(x + 1, y, '#9fb2e8')
    put(x, y - 1, '#9fb2e8')
    put(x, y + 1, '#9fb2e8')
  }
  // sometimes one big four-point star
  if (rnd() < 0.45) {
    const colors = ['#bfe8ff', '#ffe9a8', '#ffd7ef']
    const c = colors[Math.floor(rnd() * 3)]
    let x = Math.floor(10 + rnd() * (W - 20))
    let y = Math.floor(10 + rnd() * (H - 20))
    if (W <= 96 && Math.hypot(x - cx, y - cy) < 38) {
      x = x < cx ? 12 : W - 13
      y = y < cy ? 12 : H - 13
    }
    for (let k = -3; k <= 3; k++) {
      put(x + k, y, Math.abs(k) > 1 ? c : '#ffffff')
      put(x, y + k, Math.abs(k) > 1 ? c : '#ffffff')
    }
    put(x - 1, y - 1, c)
    put(x + 1, y - 1, c)
    put(x - 1, y + 1, c)
    put(x + 1, y + 1, c)
  }
}
