import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'

const archive =
  'https://github.com/astral-sh/python-build-standalone/releases/download/20260414/cpython-3.12.13+20260414-aarch64-apple-darwin-install_only.tar.gz'

if (process.platform !== 'darwin' || process.arch !== 'arm64') {
  console.log('The bundled runtime is built on the macOS arm64 release runner.')
  process.exit(0)
}

const root = path.resolve('vendor/python')
const python = path.join(root, 'bin', 'python3')
if (!existsSync(python)) {
  rmSync(root, { recursive: true, force: true })
  mkdirSync(path.resolve('vendor'), { recursive: true })
  const tar = path.resolve('vendor/python.tar.gz')
  execFileSync('curl', ['-fL', '--retry', '3', '-o', tar, archive], { stdio: 'inherit' })
  execFileSync('tar', ['-xzf', tar, '-C', path.resolve('vendor')], { stdio: 'inherit' })
  rmSync(tar, { force: true })
}
if (!existsSync(python)) {
  throw new Error('The standalone Python archive did not contain bin/python3.')
}
execFileSync('/usr/bin/xattr', ['-cr', root], { stdio: 'inherit' })

const pipEnv = { ...process.env, PIP_DISABLE_PIP_VERSION_CHECK: '1' }
execFileSync(python, ['-m', 'pip', 'install', '--upgrade', 'pip'], { stdio: 'inherit', env: pipEnv })
execFileSync(python, ['-m', 'pip', 'install', '--no-cache-dir', '-r', 'runner/requirements-mac.txt'], {
  stdio: 'inherit',
  env: pipEnv,
})
execFileSync(
  python,
  ['-c', 'import torch, diffusers, PIL, av, huggingface_hub, numpy'],
  { stdio: 'inherit' },
)
for (const name of ['test', 'ensurepip', 'idlelib', 'turtledemo']) {
  rmSync(path.join(root, 'lib', 'python3.12', name), { recursive: true, force: true })
}
function sweep(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    const info = lstatSync(full)
    if (info.isSymbolicLink()) continue
    if (!info.isDirectory()) continue
    if (name === '__pycache__') rmSync(full, { recursive: true, force: true })
    else sweep(full)
  }
}
sweep(root)
console.log(python)
