import { execFileSync } from 'node:child_process'
import { chmodSync, copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { adhocSign } from './adhoc-sign.mjs'

const version = JSON.parse(readFileSync('package.json', 'utf8')).version

function findApps(dir, found = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'dmg-root') continue
    const full = path.join(dir, name)
    let info
    try {
      info = statSync(full)
    } catch {
      continue
    }
    if (!info.isDirectory()) continue
    if (name === 'Higgsfield.app') found.push(full)
    else findApps(full, found)
  }
  return found
}

function assertSystemXattr(text, label) {
  if (!text.includes('/usr/bin/xattr -cr ')) {
    throw new Error(`${label} must call /usr/bin/xattr -cr.`)
  }
  if (/(?<!\/usr\/bin\/)xattr\s+-/.test(text)) {
    throw new Error(`${label} calls xattr without /usr/bin.`)
  }
}

const apps = findApps('release')
if (apps.length !== 1) {
  throw new Error(`Expected one Higgsfield.app under release/, found ${apps.length}: ${apps.join(', ')}`)
}

adhocSign(apps[0])

const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
const stage = path.resolve('release', version, 'dmg-root')
rmSync(stage, { recursive: true, force: true })
mkdirSync(stage, { recursive: true })
execFileSync('/usr/bin/ditto', [apps[0], path.join(stage, 'Higgsfield.app')])

const openerDest = path.join(stage, 'Open Higgsfield.command')
copyFileSync(path.resolve('scripts/open-higgsfield.command'), openerDest)
chmodSync(openerDest, 0o755)
assertSystemXattr(readFileSync(openerDest, 'utf8'), 'Open Higgsfield.command')

const out = path.resolve('release', version, `Higgsfield-${version}-${arch}.dmg`)
rmSync(out, { force: true })
execFileSync(
  '/usr/bin/hdiutil',
  ['create', '-volname', 'Higgsfield', '-srcfolder', stage, '-ov', '-format', 'UDZO', out],
  { stdio: 'inherit' },
)
execFileSync('/usr/bin/hdiutil', ['verify', out], { stdio: 'inherit' })

const attached = execFileSync('/usr/bin/hdiutil', ['attach', out, '-nobrowse'], { encoding: 'utf8' })
const mountLine = attached.split('\n').find((line) => line.includes('/Volumes/'))
if (!mountLine) throw new Error(`Could not mount ${out}.\n${attached}`)
const mountPoint = mountLine.trim().split(/\s+/).at(-1)
try {
  execFileSync(
    '/usr/bin/codesign',
    ['--verify', '--deep', '--strict', '--verbose=2', path.join(mountPoint, 'Higgsfield.app')],
    { stdio: 'inherit' },
  )
  assertSystemXattr(readFileSync(path.join(mountPoint, 'Open Higgsfield.command'), 'utf8'), 'Mounted opener')
} finally {
  execFileSync('/usr/bin/hdiutil', ['detach', mountPoint], { stdio: 'inherit' })
}

console.log(out)
