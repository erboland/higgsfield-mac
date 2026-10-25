/** Bundled card art under public/covers. Vite copies it into the app. Nothing is fetched. */
export function coverUrl(name: string): string {
  const base = import.meta.env.BASE_URL || './'
  return `${base}covers/${name}.jpg`
}
