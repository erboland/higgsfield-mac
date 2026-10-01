import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'

const version = JSON.parse(readFileSync('package.json', 'utf8')).version

function findApps(dir, found = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (!statSync(full).isDirectory()) continue
    if (name === 'Higgsfield.app') found.push(full)
    else findApps(full, found)
  }
  return found
}

const apps = findApps('release')
if (apps.length !== 1) {
  throw new Error(`Expected one Higgsfield.app under release/, found ${apps.length}.`)
}

const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
const out = path.resolve('release', version, `Higgsfield-${version}-${arch}.dmg`)
rmSync(out, { force: true })

execFileSync(
  'hdiutil',
  ['create', '-volname', 'Higgsfield', '-srcfolder', apps[0], '-ov', '-format', 'UDZO', out],
  { stdio: 'inherit' },
)
execFileSync('hdiutil', ['verify', out], { stdio: 'inherit' })
console.log(out)
