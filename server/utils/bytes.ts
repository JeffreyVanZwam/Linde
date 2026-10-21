export function fileBlob(bytes: Uint8Array, type = 'application/octet-stream') {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Blob([copy], { type })
}
