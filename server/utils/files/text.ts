import { inflateRawSync } from 'node:zlib'

export function textFromBytes(bytes: Buffer, mime: string, name: string) {
  const lower = name.toLowerCase()
  if (mime.startsWith('text/') || /\.(txt|md|csv|json)$/.test(lower)) return bytes.toString('utf8').slice(0, 20_000)
  if (lower.endsWith('.docx') || mime.includes('wordprocessingml')) return docxText(bytes).slice(0, 20_000)
  if (lower.endsWith('.pdf') || mime === 'application/pdf') return pdfText(bytes).slice(0, 20_000)
  return ''
}

function docxText(bytes: Buffer) {
  const xml = zipEntry(bytes, 'word/document.xml')
  if (!xml) return ''
  return xml
    .replace(/<w:p[^>]*>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function pdfText(bytes: Buffer) {
  const raw = bytes.toString('latin1')
  const parts = raw.match(/\((?:\\.|[^\\)]){2,}\)/g) || []
  return parts
    .map(part => part.slice(1, -1).replace(/\\n/g, '\n').replace(/\\(.)/g, '$1'))
    .join(' ')
    .replace(/[^\S\n]+/g, ' ')
    .trim()
}

function zipEntry(bytes: Buffer, name: string) {
  let offset = 0
  while (offset + 30 < bytes.length) {
    if (bytes.readUInt32LE(offset) !== 0x04034b50) break
    const method = bytes.readUInt16LE(offset + 8)
    const compressed = bytes.readUInt32LE(offset + 18)
    const nameLength = bytes.readUInt16LE(offset + 26)
    const extra = bytes.readUInt16LE(offset + 28)
    const start = offset + 30 + nameLength + extra
    const entry = bytes.subarray(offset + 30, offset + 30 + nameLength).toString()
    const data = bytes.subarray(start, start + compressed)
    if (entry === name) {
      if (method === 0) return data.toString('utf8')
      if (method === 8) return inflateRawSync(data).toString('utf8')
      return ''
    }
    offset = start + compressed
  }
  return ''
}
