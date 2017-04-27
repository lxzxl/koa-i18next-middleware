const Koa = require('koa');
const i18next = require('i18next');
const app = new Koa();
const i18m = require('./src');

i18next.init({
    lng: 'en',
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

app.use(i18m.handle(i18next));

// response
app.use(async(ctx, next) => {
    const start = new Date();
    await next();
    const ms = new Date() - start;
    ctx.body = `${ctx.method} ${ctx.url} - ${ms}ms`
});

app.listen(3000);