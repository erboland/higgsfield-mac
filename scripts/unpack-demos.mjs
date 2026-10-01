import fs from 'node:fs'
import path from 'node:path'

const dir = path.resolve('public/demos')
if (!fs.existsSync(dir)) process.exit(0)

function writeDecoded(b64Name, encoded) {
  const target = path.join(dir, b64Name.slice(0, -4))
  if (fs.existsSync(target)) return
  fs.writeFileSync(target, Buffer.from(encoded.replace(/\s+/g, ''), 'base64'))
}

const partsDir = path.join(dir, 'parts')
if (fs.existsSync(partsDir)) {
  const groups = new Map()
  for (const name of fs.readdirSync(partsDir)) {
    const match = name.match(/^(.*\.b64)\.(\d+)$/)
    if (!match) continue
    const list = groups.get(match[1]) ?? []
    list.push(name)
    groups.set(match[1], list)
  }
  for (const [b64Name, parts] of groups) {
    parts.sort()
    const encoded = parts.map((part) => fs.readFileSync(path.join(partsDir, part), 'utf8')).join('')
    writeDecoded(b64Name, encoded)
  }
  fs.rmSync(partsDir, { recursive: true, force: true })
}

for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith('.b64')) continue
  writeDecoded(name, fs.readFileSync(path.join(dir, name), 'utf8'))
}
