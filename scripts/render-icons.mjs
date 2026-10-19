import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const ACCENT = [0x00, 0x46, 0x43, 255]
const PAPER = [0xf0, 0xed, 0xe5, 255]
const CLEAR = [0, 0, 0, 0]

const leaf = flatten([
  [16, 6],
  [16.4, 9.2, 17.6, 11.4, 19.4, 13.2],
  [21.6, 15.4, 23.4, 16, 23.4, 18.8],
  [23.4, 22.8, 20.1, 26.2, 16, 26.2],
  [11.9, 26.2, 8.6, 22.8, 8.6, 18.8],
  [8.6, 16, 10.4, 15.4, 12.6, 13.2],
  [14.4, 11.4, 15.6, 9.2, 16, 6],
])

function flatten(commands) {
  const points = []
  let cursor = { x: commands[0][0], y: commands[0][1] }
  points.push(cursor)
  for (const command of commands.slice(1)) {
    const [x1, y1, x2, y2, x, y] = command
    const start = cursor
    for (let step = 1; step <= 24; step += 1) {
      const t = step / 24
      const u = 1 - t
      points.push({
        x: u ** 3 * start.x + 3 * u ** 2 * t * x1 + 3 * u * t ** 2 * x2 + t ** 3 * x,
        y: u ** 3 * start.y + 3 * u ** 2 * t * y1 + 3 * u * t ** 2 * y2 + t ** 3 * y,
      })
    }
    cursor = { x, y }
  }
  return points
}

function inside(x, y) {
  let hit = false
  for (let index = 0, previous = leaf.length - 1; index < leaf.length; previous = index++) {
    const current = leaf[index]
    const prior = leaf[previous]
    if ((current.y > y) !== (prior.y > y) && x < ((prior.x - current.x) * (y - current.y)) / (prior.y - current.y) + current.x) {
      hit = !hit
    }
  }
  return hit
}

function inRoundRect(x, y) {
  const radius = 9
  if (x < 0 || y < 0 || x > 32 || y > 32) return false
  if (x >= radius && x <= 32 - radius) return true
  if (y >= radius && y <= 32 - radius) return true
  const cx = x < radius ? radius : 32 - radius
  const cy = y < radius ? radius : 32 - radius
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2
}

function onStem(x, y) {
  const dx = x - 16
  if (y < 13.2 || y > 23.4) return false
  return dx * dx <= 0.12
}

function sample(x, y) {
  if (!inRoundRect(x, y)) return null
  if (onStem(x, y)) return ACCENT
  if (inside(x, y)) return PAPER
  return ACCENT
}

function pixel(x, y, size, maskable) {
  if (!maskable) {
    return sample((x + 0.5) / size * 32, (y + 0.5) / size * 32) || CLEAR
  }
  const pad = size * 0.14
  const inner = size - pad * 2
  if (x < pad || y < pad || x >= size - pad || y >= size - pad) return PAPER
  return sample((x - pad) / inner * 32, (y - pad) / inner * 32) || PAPER
}

function crc32(buffer) {
  let crc = ~0
  for (const value of buffer) {
    crc ^= value
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, checksum])
}

function png(size, maskable) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x += 1) {
      const color = pixel(x, y, size, maskable)
      const offset = row + 1 + x * 4
      raw[offset] = color[0]
      raw[offset + 1] = color[1]
      raw[offset + 2] = color[2]
      raw[offset + 3] = color[3]
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.png', png(192, false))
writeFileSync('public/icons/icon-512.png', png(512, false))
writeFileSync('public/icons/icon-maskable-512.png', png(512, true))
