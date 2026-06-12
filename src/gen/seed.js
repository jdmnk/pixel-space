// The seed IS the artwork: a 33-bit parameter pack rendered as 7 base36 chars.
// Layout (LSB -> MSB):
//   type:3  palette:3  size:3  rings:2  ringStyle:2  companion:1  decay:1  feature:2  detail:16
// `detail` drives all surface noise, so mutating it slightly yields a sibling
// of the same world instead of a brand new one.

const FIELDS = [
  ['type', 3],
  ['palette', 3],
  ['size', 3],
  ['rings', 2],
  ['ringStyle', 2],
  ['companion', 1],
  ['decay', 1],
  ['feature', 2],
  ['detail', 16],
]
const TOTAL_BITS = FIELDS.reduce((n, [, b]) => n + b, 0) // 33
const MAX = 2 ** TOTAL_BITS

export const TYPE_NAMES = [
  'gas giant',
  'terran world',
  'ice world',
  'moon',
  'magma core',
  'star',
  'neutron star',
  'black hole',
]

export function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function unpack(value) {
  const p = { packed: value }
  let shift = 0
  for (const [name, bits] of FIELDS) {
    p[name] = Math.floor(value / 2 ** shift) % 2 ** bits
    shift += bits
  }
  return p
}

export function pack(p) {
  let value = 0
  let shift = 0
  for (const [name, bits] of FIELDS) {
    value += (p[name] % 2 ** bits) * 2 ** shift
    shift += bits
  }
  return value
}

const encode = (value) => value.toString(36).padStart(7, '0')

function hashString(str) {
  let h1 = 1779033703 ^ str.length
  let h2 = 3144134277
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
    h1 = (h1 << 13) | (h1 >>> 19)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) >>> 0
  h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909) >>> 0
  return ((h2 % 2) * 2 ** 32 + h1) % MAX
}

function valueFromInput(str) {
  const s = str.trim().toLowerCase()
  if (/^[0-9a-z]{1,7}$/.test(s)) return parseInt(s, 36) % MAX
  return hashString(s)
}

// Any text becomes a valid seed; canonical seeds round-trip unchanged.
export const canonicalSeed = (str) => encode(valueFromInput(str))

export const decodeSeed = (str) => unpack(valueFromInput(str))

export function randomSeed() {
  return encode(Math.floor(Math.random() * MAX))
}

const randInt = (n) => Math.floor(Math.random() * n)

export function mutateSeed(str) {
  const p = unpack(valueFromInput(str))
  const before = pack(p)
  // always jiggle the surface noise a little
  const flips = 1 + randInt(4)
  for (let i = 0; i < flips; i++) p.detail ^= 1 << randInt(16)
  if (Math.random() < 0.4) p.palette = randInt(8)
  if (Math.random() < 0.3) p.rings = randInt(4)
  if (Math.random() < 0.25) p.size = randInt(8)
  if (Math.random() < 0.2) p.feature = randInt(4)
  if (Math.random() < 0.18) p.ringStyle = randInt(4)
  if (Math.random() < 0.15) p.companion ^= 1
  if (Math.random() < 0.12) p.decay ^= 1
  if (Math.random() < 0.08) p.type = randInt(8)
  let value = pack(p)
  if (value === before) {
    p.detail ^= 1 << randInt(16)
    value = pack(p)
  }
  return encode(value)
}
