export function normalizeUrl(url: string): string {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:') || url.startsWith('/') || url.startsWith('#')) return url
  if (url.includes('@')) return `mailto:${url}`
  return `https://${url}`
}
