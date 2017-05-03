const Koa = require('koa');
const i18next = require('i18next');
const app = new Koa();
import LD from "../koa-i18next-detector/src";
const i18m = require('./src');

i18next.use(LD).init({
    fallbackLng: 'en',
    preload: ['en', 'es'],
    resources: {
        en: {
            translation: {
                "key": "hello world"
            }
        },
        es: {
            translation: {
                "key": "es hello world es"
            }
        }
    },
    detection: {
        order: ['querystring', 'path', 'cookie', 'header', 'session'],

        lookupQuerystring: 'lng',

        lookupParam: 'lng', // for route like: 'path1/:lng/result'
        lookupFromPathIndex: 0,

        lookupCookie: 'i18next',
        // cookieExpirationDate: new Date(), // default: +1 year
        // cookieDomain: '', // default: current domain.

        lookupSession: 'lng',

        // cache user language
        caches: ['cookie']
    }
}, (err, t) => {
    // initialized and ready to go!
    const hw = i18next.t('key'); // hw = 'hello world'
    console.log(hw);
});

app.use(i18m.getHandler(i18next, { locals: 'locals' }));

// response
app.use(async(ctx, next) => {
    await next();
    ctx.body = ctx.response.locals.t(`key`);
});

app.listen(3000, function() {
    console.log('server listening');
});