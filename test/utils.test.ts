import { describe, expect, it } from 'vitest'
import { removeLngFromUrl } from '../src/utils.js'

describe('removeLngFromUrl', () => {
  it('removes the first segment by default', () => {
    expect(removeLngFromUrl('/en/products')).toBe('/products')
  })

  it('removes a segment at a given index', () => {
    expect(removeLngFromUrl('/products/en/list', 1)).toBe('/products/list')
  })

  it('preserves the querystring', () => {
    expect(removeLngFromUrl('/en/products?page=2&lng=en')).toBe('/products?page=2&lng=en')
  })

  it('does not split on slashes inside the querystring', () => {
    expect(removeLngFromUrl('/en/p?redirect=/a/b')).toBe('/p?redirect=/a/b')
  })

  it('returns the root path when the only segment is removed', () => {
    expect(removeLngFromUrl('/en')).toBe('/')
    expect(removeLngFromUrl('/en?x=1')).toBe('/?x=1')
  })

  it('handles urls without a leading slash', () => {
    expect(removeLngFromUrl('en/products')).toBe('products')
  })
})
