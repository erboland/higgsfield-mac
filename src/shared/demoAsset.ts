export function demoAsset(
  file: string,
  env: { dev: boolean; electron: boolean; base: string } = {
    dev: import.meta.env.DEV,
    electron: typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron'),
    base: import.meta.env.BASE_URL,
  },
): string {
  const safe = file.split('/').filter(Boolean).pop() ?? ''
  if (!/^[a-z0-9-]+\.(png|jpe?g|mp4)$/.test(safe)) return ''
  const base = env.base.endsWith('/') ? env.base : `${env.base}/`
  return `${base}demos/${safe}`
}
