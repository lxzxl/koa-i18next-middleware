/**
 * Created by steven on 4/27/17.
 */
const utils = require('i18next-express-middleware/lib/utils');
exports.languageDetector = require('i18next-express-middleware').languageDetector;

exports.handle = function(i18next, options = {}) {
    return async function i18m(ctx, next) {
        let ignores = options.ignoreRoutes instanceof Array && options.ignoreRoutes || [];
        if (!ignores.some(ignore => ctx.request.path.includes(ignores[i]))) {
            let i18n = i18next.cloneInstance({ initImmediate: false });
            i18n.on('languageChanged', (lng) => { // Keep language in sync
                ctx.request.language = ctx.request.locale = ctx.request.lng = lng;
                ctx.request.languages = i18next.services.languageUtils.toResolveHierarchy(lng);
            });

            let lng = ctx.request.lng;
            if (!ctx.request.lng && i18next.services.languageDetector) lng = i18next.services.languageDetector.detect(ctx.request, ctx.response);

            // set locale
            ctx.request.language = ctx.request.locale = ctx.request.lng = lng;
            ctx.request.languages = i18next.services.languageUtils.toResolveHierarchy(lng);

            // trigger sync to instance - might trigger async load!
            i18n.changeLanguage(lng || i18next.options.fallbackLng[0]);

            if (ctx.request.i18nextLookupName === 'path' && options.removeLngFromUrl) {
                ctx.request.url = utils.removeLngFromUrl(ctx.request.url, i18next.services.languageDetector.options.lookupFromPathIndex);
            }

            let t = i18n.t.bind(i18n);
            let exists = i18n.exists.bind(i18n);

            // assert for ctx.request
            ctx.request.i18n = i18n;
            ctx.request.t = t;

            // assert for ctx.response -> template
            if (ctx.response) {
                ctx.response.i18n = {
                    t: t,
                    exists: exists,
                    i18n: i18n,
                    language: lng,
                    languageDir: i18next.dir(lng)
                }
            }

            if (i18next.services.languageDetector) {
                i18next.services.languageDetector.cacheUserLanguage(ctx.request, ctx.response, lng);
            }

            // load resources
            if (ctx.request.lng) {
                i18next.loadLanguages(ctx.request.lng, function() {
                    next();
                });
            }
        }
        await next();
    };
};

exports.getResourcesHandler = function(i18next, options) {
    options = options || {};
    let maxAge = options.maxAge || 60 * 60 * 24 * 30;

    return function(req, res) {
        if (!i18next.services.backendConnector) return ctx.response.status(404).send('i18next-koa-middleware:: no backend configured');

        let resources = {};

        ctx.response.contentType('json');
        if (options.cache !== undefined ? options.cache : process.env.NODE_ENV === 'production') {
            ctx.response.header('Cache-Control', 'public, max-age=' + maxAge);
            ctx.response.header('Expires', (new Date(new Date().getTime() + maxAge * 1000)).toUTCString());
        } else {
            ctx.response.header('Pragma', 'no-cache');
            ctx.response.header('Cache-Control', 'no-cache');
        }

        let languages = req.query[options.lngParam || 'lng'] ? req.query[options.lngParam || 'lng'].split(' ') : [];
        let namespaces = req.query[options.nsParam || 'ns'] ? req.query[options.nsParam || 'ns'].split(' ') : [];

        // extend ns
        namespaces.forEach(ns => {
            if (i18next.options.ns && i18next.options.ns.indexOf(ns) < 0) i18next.options.ns.push(ns);
        });

        i18next.services.backendConnector.load(languages, namespaces, function() {
            languages.forEach(lng => {
                namespaces.forEach(ns => {
                    utils.setPath(resources, [lng, ns], i18next.getResourceBundle(lng, ns));
                });
            });

            ctx.response.send(resources);
        });
    };
};

exports.missingKeyHandler = function(i18next, options) {
    options = options || {};

    return function(req, res) {
        let lng = req.params[options.lngParam || 'lng'];
        let ns = req.params[options.nsParam || 'ns'];

        if (!i18next.services.backendConnector) return ctx.response.status(404).send('i18next-koa-middleware:: no backend configured');

        for (var m in req.body) {
            i18next.services.backendConnector.saveMissing([lng], ns, m, req.body[m]);
        }
        ctx.response.send('ok');
    };
};

exports.addRoute = function(i18next, route, lngs, app, verb, fc) {
    if (typeof verb === 'function') {
        fc = verb;
        verb = 'get';
    }

    // Combine `fc` and possible more callbacks to one array
    var callbacks = [fc].concat(Array.prototype.slice.call(arguments, 6));

    for (var i = 0, li = lngs.length; i < li; i++) {
        var parts = String(route).split('/');
        var locRoute = [];
        for (var y = 0, ly = parts.length; y < ly; y++) {
            var part = parts[y];
            // if the route includes the parameter :lng
            // this is replaced with the value of the language
            if (part === ':lng') {
                locRoute.push(lngs[i]);
            } else if (part.indexOf(':') === 0 || part === '') {
                locRoute.push(part);
            } else {
                locRoute.push(i18next.t(part, { lng: lngs[i] }));
            }
        }

        var routes = [locRoute.join('/')];
        app[verb || 'get'].apply(app, routes.concat(callbacks));
    }
};