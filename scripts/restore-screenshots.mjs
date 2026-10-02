import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const dir = path.join(root, 'media-parts/docs/screenshots')
const names = ['create.jpg', 'prompts.jpg', 'templates.jpg']

function mask(length, seed = 0xc0ffee) {
  let x = seed >>> 0
  const out = Buffer.alloc(length)
  for (let i = 0; i < length; i++) {
    x = (x ^ (x << 13)) >>> 0
    x = (x ^ (x >>> 17)) >>> 0
    x = (x ^ (x << 5)) >>> 0
    out[i] = x & 0xff
  }
  return out
}

if (!fs.existsSync(dir)) {
  console.log('No screenshot slices to decode.')
  process.exit(0)
}

let wrote = 0
for (const name of names) {
  const parts = []
  for (let index = 0; index < 200; index++) {
    const file = path.join(dir, `${name}.x64.${String(index).padStart(2, '0')}`)
    if (!fs.existsSync(file)) break
    parts.push(fs.readFileSync(file, 'utf8').replace(/\s+/g, ''))
  }
  if (parts.length === 0) {
    console.log(`missing slices for ${name}`)
    continue
  }
  const mixed = Buffer.from(parts.join(''), 'base64')
  const stream = mask(mixed.length)
  const bytes = Buffer.alloc(mixed.length)
  for (let i = 0; i < mixed.length; i++) bytes[i] = mixed[i] ^ stream[i]
  const jpeg =
    bytes.length > 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[bytes.length - 2] === 0xff &&
    bytes[bytes.length - 1] === 0xd9
  if (!jpeg) {
    console.log(`skip ${name}: decoded bytes are not a complete JPEG`)
    process.exitCode = 1
    continue
  }
  const target = path.join(root, 'docs/screenshots', name)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, bytes)
  wrote += 1
  console.log(`wrote docs/screenshots/${name} (${bytes.length} bytes)`)
}

if (wrote !== names.length) {
  console.log(`decoded ${wrote} of ${names.length} screenshots`)
  process.exitCode = 1
}
