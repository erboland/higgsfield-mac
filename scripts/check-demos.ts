import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { templates } from '../src/shared/starters.ts'

const dir = path.resolve('public/demos')
const missing: string[] = []

function magic(file: string, kind: 'jpeg' | 'mp4'): boolean {
  const bytes = readFileSync(file)
  if (kind === 'jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9
  return bytes.subarray(4, 8).toString() === 'ftyp'
}

for (const entry of templates) {
  const image = path.join(dir, `${entry.id}.jpg`)
  if (!existsSync(image) || !magic(image, 'jpeg')) missing.push(`${entry.id}.jpg`)
  if (entry.category === 'video') {
    const video = path.join(dir, `${entry.id}.mp4`)
    if (!existsSync(video) || !magic(video, 'mp4')) missing.push(`${entry.id}.mp4`)
  }
}

if (missing.length > 0) {
  console.error(`Template demos are not packed images: ${missing.join(', ')}`)
  process.exit(1)
}

console.log(`Packed ${templates.length} template demos.`)
