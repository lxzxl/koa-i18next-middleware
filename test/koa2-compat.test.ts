import { createInstance } from 'i18next'
// @ts-expect-error - aliased to koa@2, typed via @types/koa 3
import Koa2 from 'koa2'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import i18nextMiddleware, { LanguageDetector } from '../src/index.js'

// The middleware must keep working on Koa 2 (still widely deployed).
describe('koa 2 compatibility', () => {
  it('detects and translates on a koa@2 app', async () => {
    const i18next = createInstance()
    await i18next.use(LanguageDetector).init({
      fallbackLng: 'en',
      supportedLngs: ['en', 'es'],
      resources: {
        en: { translation: { key: 'hello world' } },
        es: { translation: { key: 'hola mundo' } },
      },
      detection: { caches: ['cookie'] },
    })

    const app = new Koa2()
    app.use(i18nextMiddleware(i18next))
    app.use(async (ctx: { body: unknown; request: { lng?: string; t?: (k: string) => string } }) => {
      ctx.body = { lng: ctx.request.lng, translated: ctx.request.t?.('key') }
    })

    const res = await request(app.callback()).get('/?lng=es')
    expect(res.body).toEqual({ lng: 'es', translated: 'hola mundo' })
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? [])
    expect(cookies.some((c) => c.startsWith('i18next=es'))).toBe(true)
  })
})
