// Headless rendering helpers shared by the hero/OG scripts and the
// serverless /api/og endpoint. Pure Node — a fake canvas captures pixels
// into a flat RGB buffer, and a minimal PNG encoder (node:zlib deflate +
// hand-rolled CRC) writes them out. No native canvas dependency.
//
// Browser code never imports this file, so node:zlib stays out of the
// client bundle; only the type-only import from render.ts is shared.

import { deflateSync } from 'node:zlib'
import type { PixelCanvas, PixelContext } from './render'

export type RGB = [number, number, number]

export function hexToRgb(c: string): RGB {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]
}

export interface HeadlessCanvas {
  canvas: PixelCanvas
  pixels: Uint8Array
  width: number
  height: number
}

// a PixelCanvas that draws into a plain RGB byte buffer
export function createPixelCanvas(width: number, height: number): HeadlessCanvas {
  const pixels = new Uint8Array(width * height * 3)
  let fill: RGB = [0, 0, 0]
  const ctx: PixelContext = {
    set fillStyle(c: string | CanvasGradient | CanvasPattern) {
      fill = hexToRgb(c as string)
    },
    fillRect(x: number, y: number, w: number, h: number) {
      for (let yy = y; yy < y + h; yy++) {
        for (let xx = x; xx < x + w; xx++) {
          if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue
          const i = (yy * width + xx) * 3
          pixels[i] = fill[0]
          pixels[i + 1] = fill[1]
          pixels[i + 2] = fill[2]
        }
      }
    },
  }
  const canvas: PixelCanvas = { width, height, getContext: () => ctx }
  return { canvas, pixels, width, height }
}

// nearest-neighbour upscale, preserving the chunky pixel look
export function upscale(src: Uint8Array, w: number, h: number, factor: number): HeadlessCanvas {
  const width = w * factor
  const height = h * factor
  const pixels = new Uint8Array(width * height * 3)
  for (let y = 0; y < height; y++) {
    const sy = (y / factor) | 0
    for (let x = 0; x < width; x++) {
      const sx = (x / factor) | 0
      const si = (sy * w + sx) * 3
      const di = (y * width + x) * 3
      pixels[di] = src[si]
      pixels[di + 1] = src[si + 1]
      pixels[di + 2] = src[si + 2]
    }
  }
  return { canvas: createPixelCanvas(0, 0).canvas, pixels, width, height }
}

// --- minimal PNG encoder -----------------------------------------------------

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})

function crc32(buf: Buffer): number {
  let c = -1
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

export function encodePng(pixels: Uint8Array, width: number, height: number): Buffer {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // truecolor RGB
  const raw = Buffer.alloc(height * (1 + width * 3))
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0 // filter: none
    const start = y * width * 3
    Buffer.from(pixels.subarray(start, start + width * 3)).copy(raw, y * (1 + width * 3) + 1)
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
