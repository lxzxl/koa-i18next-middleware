/**
 * Remove the language segment from a URL path, e.g. '/en/products?page=2'
 * with index 0 becomes '/products?page=2'.
 */
export function removeLngFromUrl(url: string, lookupFromPathIndex = 0): string {
  const queryIndex = url.indexOf('?')
  const pathname = queryIndex >= 0 ? url.slice(0, queryIndex) : url
  const query = queryIndex >= 0 ? url.slice(queryIndex) : ''

  const leading = pathname.startsWith('/') ? '/' : ''
  const parts = pathname.split('/').filter((p) => p !== '')
  parts.splice(lookupFromPathIndex, 1)

  const result = leading + parts.join('/')
  return (result || '/') + query
}
