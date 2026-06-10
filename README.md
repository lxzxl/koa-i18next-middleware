<h1 align="center">koa-i18next-middleware</h1>

<p align="center">
  <a href="https://npmjs.org/package/koa-i18next-middleware">
    <img src="https://img.shields.io/npm/v/koa-i18next-middleware.svg?style=flat-square"
         alt="NPM Version">
  </a>
  <a href="https://github.com/lxzxl/koa-i18next-middleware/actions/workflows/test.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/lxzxl/koa-i18next-middleware/test.yml?style=flat-square"
         alt="Build Status">
  </a>
  <a href="https://npmjs.org/package/koa-i18next-middleware">
    <img src="https://img.shields.io/npm/dm/koa-i18next-middleware.svg?style=flat-square"
         alt="Downloads">
  </a>
  <a href="https://github.com/lxzxl/koa-i18next-middleware/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/koa-i18next-middleware.svg?style=flat-square"
         alt="License">
  </a>
</p>

<p align="center"><big>
An i18next middleware for Koa 2 and Koa 3.
</big></p>

Detects the request language (querystring, path, cookie, `Accept-Language`
header, or session — via
[koa-i18next-detector](https://github.com/lxzxl/koa-i18next-detector)),
exposes a request-scoped `t`/`i18n` on `ctx.request`, `ctx.state`, and the
response locals, and can persist the language back to a cookie or session.
Ships ESM + CJS with TypeScript types.

## Install

```sh
npm i koa-i18next-middleware i18next
# or
pnpm add koa-i18next-middleware i18next
```

Requires Node.js >= 18, i18next >= 19.6 (tested against v26), and Koa 2 or 3.

## Usage

```ts
import Koa from 'koa'
import i18next from 'i18next'
import i18nextMiddleware, { LanguageDetector } from 'koa-i18next-middleware'
// CJS: const { i18nextMiddleware, LanguageDetector } = require('koa-i18next-middleware')

await i18next.use(LanguageDetector).init({
  fallbackLng: 'en',
  supportedLngs: ['en', 'es'],
  resources: {
    en: { translation: { key: 'hello world' } },
    es: { translation: { key: 'hola mundo' } },
  },
  detection: {
    order: ['querystring', 'path', 'cookie', 'header', 'session'],
    caches: ['cookie'], // persist the detected language
  },
})

const app = new Koa()

app.use(
  i18nextMiddleware(i18next, {
    // locals: 'locals',
    // ignoreRoutes: ['/healthz', /^\/static\//, (ctx) => ctx.path === '/skip'],
    // removeLngFromUrl: true, // strip '/es' from '/es/products' after detection
  })
)

app.use(async (ctx) => {
  ctx.body = ctx.state.t('key') // also: ctx.request.t, ctx.response.locals.t
})

app.listen(3000)
```

### What the middleware sets per request

| Where | Keys |
| ----- | ---- |
| `ctx.request` | `i18n`, `t`, `language`, `locale`, `lng`, `languages` |
| `ctx.state` | `t`, `exists`, `i18n`, `language`, `languageDir` |
| `ctx.response[locals]` (default `locals`) | `t`, `exists`, `i18n`, `language`, `languageDir` |

Each request gets its own cloned i18next instance, so concurrent requests
with different languages never interfere.

### Options

| Option | Type | Description |
| ------ | ---- | ----------- |
| `locals` | `string` | Response property for template helpers. Default `'locals'`. |
| `ignoreRoutes` | `Array<string \| RegExp>` or `(ctx) => boolean` | Skip the middleware for matching routes. Strings match as substrings of `ctx.path`. |
| `removeLngFromUrl` | `boolean` | When the language came from the URL path, strip that segment from `ctx.url` so downstream routers see the language-less route. |

Detection options (lookup order, cookie attributes, caches, custom detectors,
…) live in the `detection` block of `i18next.init` — see
[koa-i18next-detector](https://github.com/lxzxl/koa-i18next-detector#readme).

## Migrating from 1.x

- Dual ESM/CJS package with TypeScript types, built with
  [tsdown](https://tsdown.dev). With `require`, use
  `const { i18nextMiddleware } = require('koa-i18next-middleware')` —
  `getHandler` still works but is deprecated.
- Requires Node.js >= 18 and i18next >= 19.6. `i18next` is now a peer
  dependency instead of being bundled.
- `removeLngFromUrl` actually works now (v1 read the lookup name from the
  wrong object, so URLs were never rewritten) and preserves querystrings.
- `changeLanguage` and resource loading are awaited, so `ctx.request.t` is
  ready before your downstream middleware runs.
- Helpers are additionally exposed on `ctx.state` (the idiomatic Koa place);
  `ctx.response.locals` is kept for backwards compatibility.
- `ignoreRoutes` additionally accepts RegExps and a predicate function.

## License

MIT © [lxzxl](https://github.com/lxzxl)
