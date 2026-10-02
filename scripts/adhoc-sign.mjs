import { execFileSync } from 'node:child_process'
import { lstatSync, openSync, readSync, closeSync, readdirSync } from 'node:fs'
import path from 'node:path'

const entitlements = path.resolve('build/entitlements.mac.plist')

const machoMagics = new Set([
  0xfeedface, 0xcefaedfe, 0xfeedfacf, 0xcffaedfe, 0xcafebabe, 0xbebafeca,
])

export function isMachO(file) {
  const handle = openSync(file, 'r')
  try {
    const header = Buffer.alloc(4)
    if (readSync(handle, header, 0, 4, 0) < 4) return false
    return machoMagics.has(header.readUInt32BE(0))
  } finally {
    closeSync(handle)
  }
}

function collect(dir, found = []) {
  for (const name of readdirSync(dir)) {
    if (name === '_CodeSignature' || name.endsWith('.cstemp')) continue
    const full = path.join(dir, name)
    const info = lstatSync(full)
    if (info.isSymbolicLink()) continue
    if (info.isDirectory()) {
      collect(full, found)
      if (name.endsWith('.app') || name.endsWith('.framework')) found.push(full)
      continue
    }
    if (info.isFile() && isMachO(full)) found.push(full)
  }
  return found
}

function sign(target) {
  const args = ['--force', '--sign', '-']
  if (target.endsWith('.app')) {
    args.push('--options', 'runtime', '--entitlements', entitlements)
  }
  try {
    execFileSync('/usr/bin/codesign', args.concat([target]), { stdio: 'pipe' })
  } catch (error) {
    const text = `${error.stderr ?? ''}\n${error.stdout ?? ''}\n${error.message ?? ''}`
    if (/unsupported format|not in an executable format/.test(text)) return
    throw error
  }
}

export function adhocSign(app) {
  execFileSync('/usr/bin/xattr', ['-cr', app], { stdio: 'inherit' })
  const items = collect(path.join(app, 'Contents'))
  items.sort((a, b) => b.split(path.sep).length - a.split(path.sep).length || a.localeCompare(b))
  for (const item of items) sign(item)
  sign(app)
  execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=2', app], {
    stdio: 'inherit',
  })
}
