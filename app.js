const Koa = require('koa');
const i18next = require('i18next');
const app = new Koa();
const i18m = require('./src');

i18next.use(i18m.LanguageDetector).init({
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
    }
}, (err, t) => {
    // initialized and ready to go!
    const hw = i18next.t('key'); // hw = 'hello world'
    console.log(hw);
});

app.use(i18m.getHandler(i18next));

// response
app.use(async(ctx, next) => {
    await next();
    ctx.body = ctx.response.locals.t(`key`);
});

app.listen(3000, function() {
    console.log('server listening');
});