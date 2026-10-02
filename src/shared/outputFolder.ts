import path from 'node:path'

export function homeForPictures(candidates: string[]): string {
  for (const candidate of candidates) {
    if (!candidate?.trim()) continue
    const resolved = path.resolve(candidate)
    if (resolved !== path.parse(resolved).root) return resolved
  }
  throw new Error('Could not choose an output folder.')
}

export function picturesFolder(home: string): string {
  return path.join(homeForPictures([home]), 'Pictures', 'Higgsfield')
}

export function usableFolder(directory: string, home: string): string {
  const fallback = picturesFolder(home)
  const trimmed = directory.trim()
  if (!trimmed) return fallback
  const resolved = path.resolve(trimmed)
  if (resolved === path.parse(resolved).root) return fallback
  return resolved
}
