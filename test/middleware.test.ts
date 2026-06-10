import { createInstance, type i18n } from 'i18next'
import Koa from 'koa'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import i18nextMiddleware, {
  LanguageDetector,
  getHandler,
  type MiddlewareOptions,
} from '../src/index.js'

async function createI18next(detection: Record<string, unknown> = {}): Promise<i18n> {
  const instance = createInstance()
  await instance.use(LanguageDetector).init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'zh'],
    resources: {
      en: { translation: { key: 'hello world', nested: { greeting: 'hi {{name}}' } } },
      es: { translation: { key: 'hola mundo', nested: { greeting: 'hola {{name}}' } } },
      zh: { translation: { key: '你好世界', nested: { greeting: '你好 {{name}}' } } },
    },
    detection,
  })
  return instance
}

describe('i18nextMiddleware', () => {
  let i18next: i18n

  beforeEach(async () => {
    i18next = await createI18next()
  })

  function createApp(options: MiddlewareOptions = {}, handler?: Koa.Middleware) {
    const app = new Koa()
    app.use(i18nextMiddleware(i18next, options))
    app.use(
      handler ??
        (async (ctx) => {
          ctx.body = {
            lng: ctx.request.lng,
            language: ctx.request.language,
            translated: ctx.request.t?.('key'),
          }
        })
    )
    return app.callback()
  }

  it('detects the language from the querystring', async () => {
    const res = await request(createApp()).get('/?lng=es')
    expect(res.body).toMatchObject({ lng: 'es', translated: 'hola mundo' })
  })

  it('detects the language from the accept-language header', async () => {
    const res = await request(createApp()).get('/').set('Accept-Language', 'zh;q=0.9,en;q=0.5')
    expect(res.body).toMatchObject({ lng: 'zh', translated: '你好世界' })
  })

  it('detects the language from a cookie', async () => {
    const res = await request(createApp()).get('/').set('Cookie', 'i18next=es')
    expect(res.body).toMatchObject({ lng: 'es', translated: 'hola mundo' })
  })

  it('falls back for unsupported languages', async () => {
    const res = await request(createApp()).get('/?lng=xx')
    expect(res.body).toMatchObject({ lng: 'en', translated: 'hello world' })
  })

  it('exposes t/i18n/language on ctx.state', async () => {
    const app = createApp({}, async (ctx) => {
      ctx.body = {
        translated: ctx.state.t('nested.greeting', { name: 'koa' }),
        language: ctx.state.language,
        dir: ctx.state.languageDir,
        hasI18n: Boolean(ctx.state.i18n),
        exists: ctx.state.exists('key'),
      }
    })
    const res = await request(app).get('/?lng=es')
    expect(res.body).toEqual({
      translated: 'hola koa',
      language: 'es',
      dir: 'ltr',
      hasI18n: true,
      exists: true,
    })
  })

  it('exposes express-style locals on the response', async () => {
    const app = createApp({}, async (ctx) => {
      const locals = (ctx.response as unknown as Record<string, any>).locals
      ctx.body = { translated: locals.t('key'), language: locals.language }
    })
    const res = await request(app).get('/?lng=es')
    expect(res.body).toEqual({ translated: 'hola mundo', language: 'es' })
  })

  it('honours a custom locals name', async () => {
    const app = createApp({ locals: 'viewBag' }, async (ctx) => {
      const locals = (ctx.response as unknown as Record<string, any>).viewBag
      ctx.body = { translated: locals.t('key') }
    })
    const res = await request(app).get('/?lng=zh')
    expect(res.body).toEqual({ translated: '你好世界' })
  })

  it('builds the resolve hierarchy on ctx.request.languages', async () => {
    const app = createApp({}, async (ctx) => {
      ctx.body = { languages: ctx.request.languages }
    })
    const res = await request(app).get('/?lng=es')
    expect(res.body.languages).toEqual(['es', 'en'])
  })

  it('isolates concurrent requests with different languages', async () => {
    const app = createApp({}, async (ctx) => {
      // Hold the request long enough for the other one to change language.
      await new Promise((resolve) => setTimeout(resolve, 20))
      ctx.body = { translated: ctx.request.t?.('key') }
    })
    const [es, zh] = await Promise.all([
      request(app).get('/?lng=es'),
      request(app).get('/?lng=zh'),
    ])
    expect(es.body.translated).toBe('hola mundo')
    expect(zh.body.translated).toBe('你好世界')
  })

  describe('ignoreRoutes', () => {
    const handler: Koa.Middleware = async (ctx) => {
      ctx.body = { handled: ctx.request.t !== undefined }
    }

    it('skips routes matching a substring', async () => {
      const app = createApp({ ignoreRoutes: ['/healthz'] }, handler)
      expect((await request(app).get('/healthz?lng=es')).body).toEqual({ handled: false })
      expect((await request(app).get('/other?lng=es')).body).toEqual({ handled: true })
    })

    it('skips routes matching a RegExp', async () => {
      const app = createApp({ ignoreRoutes: [/^\/static\//] }, handler)
      expect((await request(app).get('/static/app.css')).body).toEqual({ handled: false })
      expect((await request(app).get('/app/static')).body).toEqual({ handled: true })
    })

    it('skips routes matching a predicate', async () => {
      const app = createApp({ ignoreRoutes: (ctx) => ctx.path === '/skip' }, handler)
      expect((await request(app).get('/skip')).body).toEqual({ handled: false })
      expect((await request(app).get('/keep')).body).toEqual({ handled: true })
    })
  })

  describe('path detection', () => {
    it('detects from the path and strips the language segment', async () => {
      const pathI18next = await createI18next({ order: ['path'] })
      const app = new Koa()
      app.use(i18nextMiddleware(pathI18next, { removeLngFromUrl: true }))
      app.use(async (ctx) => {
        ctx.body = {
          lng: ctx.request.lng,
          url: ctx.request.url,
          path: ctx.path,
          translated: ctx.request.t?.('key'),
        }
      })

      const res = await request(app.callback()).get('/es/products?page=2')
      expect(res.body).toEqual({
        lng: 'es',
        url: '/products?page=2',
        path: '/products',
        translated: 'hola mundo',
      })
    })

    it('keeps the URL intact without removeLngFromUrl', async () => {
      const pathI18next = await createI18next({ order: ['path'] })
      const app = new Koa()
      app.use(i18nextMiddleware(pathI18next))
      app.use(async (ctx) => {
        ctx.body = { lng: ctx.request.lng, url: ctx.request.url }
      })

      const res = await request(app.callback()).get('/es/products')
      expect(res.body).toEqual({ lng: 'es', url: '/es/products' })
    })
  })

  describe('caching', () => {
    it('persists the detected language to a cookie', async () => {
      const cachingI18next = await createI18next({ caches: ['cookie'] })
      const app = new Koa()
      app.use(i18nextMiddleware(cachingI18next))
      app.use(async (ctx) => {
        ctx.body = { lng: ctx.request.lng }
      })

      const res = await request(app.callback()).get('/?lng=es')
      const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? [])
      expect(cookies.some((c) => c.startsWith('i18next=es'))).toBe(true)
    })

    it('persists the detected language to the session', async () => {
      const cachingI18next = await createI18next({ caches: ['session'] })
      const app = new Koa()
      const sessions: Record<string, unknown>[] = []
      app.use(async (ctx, next) => {
        const session: Record<string, unknown> = {}
        ;(ctx as unknown as Record<string, unknown>).session = session
        sessions.push(session)
        await next()
      })
      app.use(i18nextMiddleware(cachingI18next))
      app.use(async (ctx) => {
        ctx.body = { lng: ctx.request.lng }
      })

      await request(app.callback()).get('/?lng=zh')
      expect(sessions[0]).toEqual({ lng: 'zh' })
    })
  })

  it('keeps the deprecated getHandler alias working', async () => {
    const app = new Koa()
    app.use(getHandler(i18next))
    app.use(async (ctx) => {
      ctx.body = { translated: ctx.request.t?.('key') }
    })
    const res = await request(app.callback()).get('/?lng=es')
    expect(res.body).toEqual({ translated: 'hola mundo' })
  })
})
