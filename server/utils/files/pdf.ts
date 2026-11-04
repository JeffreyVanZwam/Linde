export function textPdf(title: string, body: string) {
  const lines = wrap(`${title}\n\n${body}`, 90)
  const pages: string[][] = []
  for (let index = 0; index < lines.length; index += 46) pages.push(lines.slice(index, index + 46))
  if (!pages.length) pages.push([''])
  const objects: string[] = []
  objects.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n')
  const pageIds: number[] = []
  let next = 3
  const pageObjects: string[] = []
  const contentObjects: string[] = []
  for (const page of pages) {
    const pageId = next
    const contentId = next + 1
    next += 2
    pageIds.push(pageId)
    const commands = ['BT', '/F1 11 Tf', '50 800 Td', '14 TL']
    for (const line of page) commands.push(`(${escapePdf(line)}) Tj`, 'T*')
    commands.push('ET')
    const stream = commands.join('\n')
    contentObjects.push(`${contentId} 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj\n`)
    pageObjects.push(`${pageId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${next} 0 R >> >> >> endobj\n`)
  }
  const fontId = next
  objects.push(`2 0 obj << /Type /Pages /Count ${pages.length} /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] >> endobj\n`)
  objects.push(...pageObjects, ...contentObjects)
  objects.push(`${fontId} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n`)
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf))
    pdf += object
  }
  const xref = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${offsets.length}\n`
  pdf += '0000000000 65535 f \n'
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  pdf += `trailer << /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(pdf)
}

function wrap(value: string, width: number) {
  const lines: string[] = []
  for (const paragraph of value.replace(/\r/g, '').split('\n')) {
    if (!paragraph.trim()) {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word
      if (next.length > width && line) {
        lines.push(line)
        line = word
      }
      else line = next
    }
    if (line) lines.push(line)
  }
  return lines
}

function escapePdf(value: string) {
  return value.replace(/[^\x20-\x7E]/g, ' ').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}
