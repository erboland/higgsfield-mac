import { execFile } from 'node:child_process'
import { constants as fsConstants } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { ToolchainStatus } from '../src/shared/types.ts'

export function searchDirs(): string[] {
  const home = os.homedir()
  const extras = [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    path.join(home, '.local', 'bin'),
    path.join(home, 'bin'),
  ]
  const fromPath = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean)
  return [...new Set([...extras, ...fromPath])]
}

export function toolchainEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: `${searchDirs().join(path.delimiter)}${path.delimiter}${process.env.PATH ?? ''}`,
  }
}

export async function findHiggsfield(): Promise<string | null> {
  for (const dir of searchDirs()) {
    const candidate = path.join(dir, process.platform === 'win32' ? 'higgsfield.exe' : 'higgsfield')
    try {
      await fs.access(candidate, fsConstants.X_OK)
      return candidate
    } catch {
      // keep looking
    }
  }
  return null
}

export async function inspectToolchain(): Promise<ToolchainStatus> {
  const bin = await findHiggsfield()
  if (!bin) {
    return {
      installed: false,
      path: null,
      version: null,
      detail: 'The Higgsfield CLI is not on PATH. Install it, then check again.',
    }
  }
  try {
    const version = await runVersion(bin)
    return {
      installed: true,
      path: bin,
      version,
      detail: version ? `Ready · ${version}` : 'CLI found.',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not read the CLI version.'
    return {
      installed: true,
      path: bin,
      version: null,
      detail: message,
    }
  }
}

function runVersion(bin: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(bin, ['version'], { timeout: 15000, env: toolchainEnv() }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr.trim() || error.message))
        return
      }
      resolve((stdout || stderr).trim().split('\n')[0] ?? '')
    })
  })
}
