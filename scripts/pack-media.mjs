import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const chunkSize = 15_000
const sources = []

function addDir(dir) {
  if (!fs.existsSync(dir)) return
  for (const name of fs.readdirSync(dir)) {
    if (!/\.(jpg|mp4)$/.test(name)) continue
    sources.push(path.join(dir, name))
  }
}

addDir(path.join(root, 'public', 'demos'))
addDir(path.join(root, 'docs', 'screenshots'))

const partsRoot = path.join(root, 'media-parts')
fs.rmSync(partsRoot, { recursive: true, force: true })

for (const file of sources) {
  const encoded = fs.readFileSync(file).toString('base64')
  const rel = `${path.relative(root, file)}.b64`
  const parts = Math.max(1, Math.ceil(encoded.length / chunkSize))
  for (let index = 0; index < parts; index += 1) {
    const slice = encoded.slice(index * chunkSize, (index + 1) * chunkSize)
    const part = path.join(partsRoot, `${rel}.${String(index).padStart(2, '0')}`)
    fs.mkdirSync(path.dirname(part), { recursive: true })
    fs.writeFileSync(part, slice)
  }
  console.log(`${path.relative(root, file)} -> ${parts} parts`)
}
