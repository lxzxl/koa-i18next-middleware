import { LanguageDetector } from 'koa-i18next-detector'
import { removeLngFromUrl } from './utils.js'
import type { i18n, TFunction } from 'i18next'
import type { Context, Middleware } from 'koa'

export interface MiddlewareOptions {
  /**
   * Property name on `ctx.response` that receives `t`, `exists`, `i18n`,
   * `language` and `languageDir` for templates. Default: 'locals'.
   * Everything is also always exposed on `ctx.state`.
   */
  locals?: string
  /**
   * Routes to skip: substrings or RegExps matched against `ctx.path`,
   * or a predicate receiving the Koa context.
   */
  ignoreRoutes?: Array<string | RegExp> | ((ctx: Context) => boolean)
  /**
   * When the language was detected from the URL path, strip that segment from
   * `ctx.url` so downstream routers see the language-less route.
   */
  removeLngFromUrl?: boolean
}

interface ServicesWithDetector {
  languageDetector?: LanguageDetector
  languageUtils: {
    toResolveHierarchy(lng: string): string[]
    getFallbackCodes(fallbacks: unknown, code?: string): string[]
  }
}

function shouldIgnore(ctx: Context, ignoreRoutes: MiddlewareOptions['ignoreRoutes']): boolean {
  if (!ignoreRoutes) return false
  if (typeof ignoreRoutes === 'function') return ignoreRoutes(ctx)
  return ignoreRoutes.some((route) =>
    typeof route === 'string' ? ctx.path.includes(route) : route.test(ctx.path)
  )
}

/**
 * Koa middleware wiring i18next into the request lifecycle: detects the
 * request language, exposes a request-scoped `t`/`i18n` on
 * `ctx.request`, `ctx.state` and the response locals, and persists the
 * language through the detector's configured caches.
 */
export function i18nextMiddleware(i18next: i18n, options: MiddlewareOptions = {}): Middleware {
  return async function i18nextHandler(ctx, next) {
    if (shouldIgnore(ctx, options.ignoreRoutes)) return next()

    const services = i18next.services as unknown as ServicesWithDetector
    const req = ctx.request
    const res = ctx.response as unknown as Record<string, unknown>

    // Request-scoped instance so concurrent requests can't race on language.
    // initImmediate is the pre-v24 spelling of initAsync, kept for older i18next.
    const i18nRequest = i18next.cloneInstance({
      initAsync: false,
      initImmediate: false,
    } as Parameters<i18n['cloneInstance']>[0])

    const setLanguage = (lng: string) => {
      req.language = lng
      req.locale = lng
      req.lng = lng
      req.languages = services.languageUtils.toResolveHierarchy(lng)
      ctx.state.language = lng
    }
    i18nRequest.on('languageChanged', setLanguage)

    let lng = req.lng
    if (!lng && services.languageDetector) {
      lng = services.languageDetector.detect(ctx)
    }
    if (lng) setLanguage(lng)

    const fallbackLng = services.languageUtils.getFallbackCodes(i18next.options.fallbackLng)[0]
    await i18nRequest.changeLanguage(lng ?? fallbackLng)

    if (ctx.i18nextLookupName === 'path' && options.removeLngFromUrl) {
      const pathIndex = services.languageDetector?.options.lookupFromPathIndex ?? 0
      req.url = removeLngFromUrl(req.url, pathIndex)
    }

    const t = i18nRequest.t.bind(i18nRequest)
    const exists = i18nRequest.exists.bind(i18nRequest)

    req.i18n = i18nRequest
    req.t = t

    ctx.state.t = t
    ctx.state.exists = exists
    ctx.state.i18n = i18nRequest
    ctx.state.language = lng
    ctx.state.languageDir = i18next.dir(lng)

    // Backwards-compatible express-style locals on the response object.
    const localsName = options.locals ?? 'locals'
    const locals = (res[localsName] ??= {}) as Record<string, unknown>
    locals.t = t
    locals.exists = exists
    locals.i18n = i18nRequest
    locals.language = lng
    locals.languageDir = i18next.dir(lng)

    if (lng && services.languageDetector) {
      services.languageDetector.cacheUserLanguage(ctx, lng)
    }

    if (req.lng) {
      await i18next.loadLanguages(req.lng)
    }

    return next()
  }
}

/** @deprecated Use `i18nextMiddleware` instead. */
export const getHandler = i18nextMiddleware

export { LanguageDetector }
export { removeLngFromUrl } from './utils.js'
export type {
  DetectorContext,
  DetectorOptions,
  LanguageLookup,
} from 'koa-i18next-detector'

export default i18nextMiddleware

declare module 'koa' {
  interface Request {
    i18n?: i18n
    t?: TFunction
    language?: string
    locale?: string
    lng?: string
    languages?: string[]
  }
  interface ExtendableContext {
    /** Set by koa-i18next-detector: name of the lookup that detected the language. */
    i18nextLookupName?: string
  }
}
