import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const partsRoot = path.join(root, 'media-parts')
if (!fs.existsSync(partsRoot)) process.exit(0)

function walk(dir, found = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    if (fs.statSync(full).isDirectory()) walk(full, found)
    else found.push(full)
  }
  return found
}

const groups = new Map()
for (const full of walk(partsRoot)) {
  const rel = path.relative(partsRoot, full)
  const match = rel.match(/^(.*)\.(\d+)$/)
  if (!match) continue
  const list = groups.get(match[1]) ?? []
  list.push({ full, index: Number(match[2]) })
  groups.set(match[1], list)
}

function contiguous(parts) {
  const indexes = parts.map((part) => part.index).sort((a, b) => a - b)
  return indexes.every((index, position) => index === position)
}

function validMedia(bytes) {
  if (bytes.length < 32) return false
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9
  const png = bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' && bytes.includes(Buffer.from('IEND'))
  const mp4 = bytes.subarray(4, 8).toString() === 'ftyp'
  return jpeg || png || mp4
}

for (const [relB64, parts] of groups) {
  if (!relB64.endsWith('.b64') || relB64.includes('..') || !contiguous(parts)) continue
  parts.sort((a, b) => a.index - b.index)
  const encoded = parts.map((part) => fs.readFileSync(part.full, 'utf8')).join('').replace(/\s+/g, '')
  const bytes = Buffer.from(encoded, 'base64')
  if (!validMedia(bytes)) {
    console.log(`skip ${relB64}: decoded bytes are not a complete image or video`)
    continue
  }
  const rel = relB64.slice(0, -4)
  const target = path.join(root, rel)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, bytes)
  console.log(`restored ${rel} (${bytes.length} bytes)`)
}
