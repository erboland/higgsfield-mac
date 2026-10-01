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

for (const [relB64, parts] of groups) {
  parts.sort((a, b) => a.index - b.index)
  const encoded = parts.map((part) => fs.readFileSync(part.full, 'utf8')).join('').replace(/\s+/g, '')
  if (!relB64.endsWith('.b64')) continue
  const rel = relB64.slice(0, -4)
  if (rel.includes('..')) continue
  const target = path.join(root, rel)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, Buffer.from(encoded, 'base64'))
  console.log(`restored ${rel} (${fs.statSync(target).size} bytes)`)
}
