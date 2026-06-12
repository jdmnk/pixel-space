// Generates docs/preview.png — the README hero image — by compositing
// curated worlds straight from the app's own renderer. Pure Node, no deps:
// a tiny fake canvas context captures pixels and a minimal PNG encoder
// (node:zlib deflate + hand-rolled CRC) writes the file.
//
//   npm run hero

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderScene, BG } from '../src/gen/render.js'
import { pack, unpack, mulberry32 } from '../src/gen/seed.js'

const W = 1280
const H = 560
const TILE = 96

// --- curated worlds --------------------------------------------------------

const SCENES = [
  { center: [200, 185], scale: 3, p: { type: 5, palette: 0, size: 6, rings: 0, ringStyle: 0, companion: 0, decay: 0, feature: 3, detail: 7777 } },
  { center: [430, 105], scale: 2, p: { type: 6, palette: 2, size: 4, rings: 0, ringStyle: 1, companion: 0, decay: 0, feature: 2, detail: 61234 } },
  { center: [640, 255], scale: 3, p: { type: 0, palette: 2, size: 7, rings: 2, ringStyle: 1, companion: 0, decay: 0, feature: 3, detail: 31337 } },
  { center: [920, 100], scale: 2, p: { type: 2, palette: 0, size: 5, rings: 1, ringStyle: 2, companion: 0, decay: 0, feature: 1, detail: 42042 } },
  { center: [1080, 195], scale: 3, p: { type: 1, palette: 0, size: 6, rings: 0, ringStyle: 0, companion: 1, decay: 0, feature: 2, detail: 19191 } },
  { center: [180, 430], scale: 2, p: { type: 4, palette: 0, size: 5, rings: 0, ringStyle: 0, companion: 0, decay: 0, feature: 3, detail: 55123 } },
  { center: [520, 465], scale: 2, p: { type: 3, palette: 0, size: 5, rings: 0, ringStyle: 0, companion: 0, decay: 0, feature: 3, detail: 27182 } },
  { center: [820, 455], scale: 2, p: { type: 7, palette: 1, size: 5, rings: 0, ringStyle: 0, companion: 0, decay: 0, feature: 0, detail: 12321 } },
  { center: [1120, 440], scale: 2, p: { type: 3, palette: 1, size: 4, rings: 0, ringStyle: 0, companion: 0, decay: 1, feature: 2, detail: 9090 } },
]

// --- tiny rasteriser --------------------------------------------------------

const img = new Uint8Array(W * H * 3)

function hex(c) {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]
}

function set(x, y, [r, g, b]) {
  if (x < 0 || y < 0 || x >= W || y >= H) return
  const i = (y * W + x) * 3
  img[i] = r
  img[i + 1] = g
  img[i + 2] = b
}

// fake 2d context: renders a 96x96 scene into a flat RGB buffer
function renderTile(params) {
  const buf = new Uint8Array(TILE * TILE * 3)
  let fill = [0, 0, 0]
  const ctx = {
    set fillStyle(c) {
      fill = hex(c)
    },
    fillRect(x, y, w, h) {
      for (let yy = y; yy < y + h; yy++) {
        for (let xx = x; xx < x + w; xx++) {
          if (xx < 0 || yy < 0 || xx >= TILE || yy >= TILE) continue
          const i = (yy * TILE + xx) * 3
          buf[i] = fill[0]
          buf[i + 1] = fill[1]
          buf[i + 2] = fill[2]
        }
      }
    },
  }
  renderScene({ getContext: () => ctx }, params)
  return buf
}

// --- background: dithered radial navy gradient ------------------------------

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]
const NAVY = ['#0f152a', '#161e3c', '#1d2750'].map(hex)

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const dx = (x - W / 2) / (W / 2)
    const dy = (y - H / 2) / (H / 2)
    const t = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 0.95) * 2 // 0..2 center bright
    const level = t + (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.7
    set(x, y, NAVY[Math.max(0, Math.min(2, Math.round(level)))])
  }
}

// --- starfield ---------------------------------------------------------------

const rnd = mulberry32(42)
const DOTS = ['#39456e', '#56689c', '#aab6e0', '#e8ecfa'].map(hex)
for (let i = 0; i < 220; i++) {
  set(Math.floor(rnd() * W), Math.floor(rnd() * H), DOTS[Math.floor(rnd() * rnd() * 4)])
}
const PALE = hex('#9fb2e8')
const WHITE = hex('#ffffff')
for (let i = 0; i < 9; i++) {
  const x = Math.floor(rnd() * W)
  const y = Math.floor(rnd() * H)
  set(x, y, WHITE)
  set(x - 1, y, PALE)
  set(x + 1, y, PALE)
  set(x, y - 1, PALE)
  set(x, y + 1, PALE)
}
const SPARK = ['#bfe8ff', '#ffe9a8', '#ffd7ef'].map(hex)
for (let i = 0; i < 4; i++) {
  const x = 60 + Math.floor(rnd() * (W - 120))
  const y = 40 + Math.floor(rnd() * (H - 80))
  const c = SPARK[i % 3]
  for (let k = -3; k <= 3; k++) {
    set(x + k, y, Math.abs(k) > 1 ? c : WHITE)
    set(x, y + k, Math.abs(k) > 1 ? c : WHITE)
  }
  set(x - 1, y - 1, c)
  set(x + 1, y - 1, c)
  set(x - 1, y + 1, c)
  set(x + 1, y + 1, c)
}

// --- composite the worlds (chroma-key each tile's flat background) -----------

const seeds = []
for (const { center, scale, p } of SCENES) {
  const params = unpack(pack(p))
  seeds.push({ seed: params.packed.toString(36).padStart(7, '0'), type: params.type })
  const key = hex(BG[params.packed % 4])
  const tile = renderTile(params)
  const ox = center[0] - 48 * scale
  const oy = center[1] - 48 * scale
  for (let ty = 0; ty < TILE; ty++) {
    for (let tx = 0; tx < TILE; tx++) {
      const i = (ty * TILE + tx) * 3
      if (tile[i] === key[0] && tile[i + 1] === key[1] && tile[i + 2] === key[2]) continue
      const c = [tile[i], tile[i + 1], tile[i + 2]]
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          set(ox + tx * scale + sx, oy + ty * scale + sy, c)
        }
      }
    }
  }
}

// --- "PIXEL SPACE" in a hand-drawn 5x7 pixel font -----------------------------

const GLYPHS = {
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
}

function drawText(text, x0, y0, scale, color) {
  let cx = x0
  for (const ch of text) {
    const g = GLYPHS[ch]
    for (let gy = 0; gy < 7; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        if (g[gy][gx] !== '#') continue
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            set(cx + gx * scale + sx, y0 + gy * scale + sy, color)
          }
        }
      }
    }
    cx += 6 * scale
  }
}

const TITLE = 'PIXEL SPACE'
const TS = 4
const titleW = (TITLE.length * 6 - 1) * TS
const tx0 = Math.round((W - titleW) / 2)
drawText(TITLE, tx0 + 8, 36 + 8, TS, hex('#2d1f4e'))
drawText(TITLE, tx0 + 4, 36 + 4, TS, hex('#f298ad'))
drawText(TITLE, tx0, 36, TS, hex('#f4ecff'))

// --- minimal PNG encoder ------------------------------------------------------

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})

function crc32(buf) {
  let c = -1
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0)
ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 2 // truecolor RGB

const raw = Buffer.alloc(H * (1 + W * 3))
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 3)] = 0 // filter: none
  Buffer.from(img.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1)
}

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'preview.png')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, png)
console.log(`wrote ${out} (${(png.length / 1024).toFixed(1)} kB)`)
console.log('featured seeds:', seeds.map((s) => s.seed).join('  '))
