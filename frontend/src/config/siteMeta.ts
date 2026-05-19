export const SITE_NAME = 'Multi-Store'

export function formatDocumentTitle(page: string): string {
  const trimmed = page.trim()
  if (!trimmed) {
    return SITE_NAME
  }
  return `${trimmed} | ${SITE_NAME}`
}
