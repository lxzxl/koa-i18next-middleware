# Changelog

## v2.0.0 (2026-06-10)

Modernization release — full rewrite in TypeScript.

### Breaking

- Requires Node.js >= 18 and i18next >= 19.6; `i18next` moved from `dependencies` to `peerDependencies`.
- Dual ESM/CJS package built with [tsdown](https://tsdown.dev) (rolldown). With `require`, use `const { i18nextMiddleware } = require('koa-i18next-middleware')`.
- The i18next instance is cloned with `initAsync: false` (the v24+ spelling; `initImmediate` is still passed for older i18next).

### Fixed

- `removeLngFromUrl` never worked: the middleware read `req.i18nextLookupName` while the detector sets it on `ctx`. URL rewriting now triggers correctly and preserves the querystring.
- `changeLanguage` and `loadLanguages` are now awaited, so translations are guaranteed ready before downstream middleware runs.
- The fallback language is resolved via `languageUtils.getFallbackCodes`, supporting string/array/object/function forms of `fallbackLng`.

### Added

- `i18nextMiddleware(i18next, options)` as the primary export (`getHandler` kept as a deprecated alias).
- Helpers exposed on `ctx.state` (`t`, `exists`, `i18n`, `language`, `languageDir`) in addition to the express-style response locals.
- `ignoreRoutes` accepts RegExps and a predicate function alongside substrings.
- TypeScript types, including Koa module augmentation for `ctx.request.t` / `ctx.request.i18n`.
- Test suite (vitest + supertest) against real Koa 3 and Koa 2 apps with i18next v26, including a concurrent-request language isolation test.

### Removed

- The bundled demo server (`index.js`, `register.js`) and unused `utils` helpers (`setPath`, `defaults`, `extend`).
- The `cookies` runtime dependency.

## v1.x

See git history.
