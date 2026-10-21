export function fileIcon(mime: string) {
  if (mime.startsWith('video/')) return 'solar:videocamera-record-bold-duotone'
  if (mime.startsWith('audio/')) return 'solar:music-note-bold-duotone'
  if (mime === 'application/pdf') return 'solar:document-text-bold-duotone'
  if (mime.includes('zip') || mime.includes('compressed') || mime.includes('archive')) return 'solar:archive-bold-duotone'
  if (mime.startsWith('text/') || mime.includes('json') || mime.includes('javascript')) return 'solar:code-bold-duotone'
  return 'solar:file-bold-duotone'
}
