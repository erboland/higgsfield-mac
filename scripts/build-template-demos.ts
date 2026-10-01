import fs from 'node:fs/promises'
import path from 'node:path'
import { generateLocal } from '../runner/generate.ts'
import { templates } from '../src/shared/starters.ts'

const publicDir = path.resolve('public/demos')
const scratch = path.resolve('runner/.cache/demo-scratch')

async function main() {
  await fs.mkdir(publicDir, { recursive: true })
  await fs.mkdir(scratch, { recursive: true })
  for (const entry of templates) {
    const prompt = (entry.demoPrompt || entry.patch.prompt || '').trim()
    if (!prompt) throw new Error(`Template ${entry.id} has no prompt for a demo.`)
    const kind = entry.category === 'video' ? 'video' : 'image'
    process.stderr.write(`\n${entry.id} (${kind})\n`)
    const result = await generateLocal({ prompt, kind, directory: scratch })
    if (kind === 'image') {
      await fs.copyFile(result.filePath, path.join(publicDir, `${entry.id}.png`))
    } else {
      await fs.copyFile(result.filePath, path.join(publicDir, `${entry.id}.mp4`))
      const poster = result.filePath.replace(/\.mp4$/, '-poster.png')
      await fs.copyFile(poster, path.join(publicDir, `${entry.id}.png`))
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
