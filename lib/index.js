'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.LanguageDetector = undefined;exports.




getHandler = getHandler;var _utils = require('./utils');var utils = _interopRequireWildcard(_utils);var _src = require('../../koa-i18next-detector/src');var _src2 = _interopRequireDefault(_src);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}function _interopRequireWildcard(obj) {if (obj && obj.__esModule) {return obj;} else {var newObj = {};if (obj != null) {for (var key in obj) {if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];}}newObj.default = obj;return newObj;}}var LanguageDetector = exports.LanguageDetector = _src2.default;function getHandler(i18next, options = {}) {
    return async function (ctx, next) {
        let res = ctx.response;
        let req = ctx.request;
        let ignores = options.ignoreRoutes instanceof Array && options.ignoreRoutes || [];
        if (!ignores.some(ignore => ctx.path.includes(ignores[i]))) {
            let i18n = i18next.cloneInstance({ initImmediate: false });
            i18n.on('languageChanged', lng => {// Keep language in sync
                req.language = lng;
                req.locale = lng;
                req.lng = lng;
                req.languages = i18next.services.languageUtils.toResolveHierarchy(lng);
            });

            let lng = req.lng;
            if (!lng && i18next.services.languageDetector) {
                lng = i18next.services.languageDetector.detect(req, res);
            }

            // set request locale
            req.language = lng;
            req.locale = lng;
            req.lng = lng;
            req.languages = i18next.services.languageUtils.toResolveHierarchy(lng);

            // trigger sync to instance - might trigger async load!
            i18n.changeLanguage(lng || i18next.options.fallbackLng[0]);

            if (req.i18nextLookupName === 'path' && options.removeLngFromUrl) {
                req.url = utils.removeLngFromUrl(req.url, i18next.services.languageDetector.options.lookupFromPathIndex);
            }

            let t = i18n.t.bind(i18n);
            let exists = i18n.exists.bind(i18n);

            // assert for req
            req.i18n = i18n;
            req.t = t;

            // assert for res -> template
            let localsName = options.locals || 'locals';
            if (!res[localsName]) {
                res[localsName] = {};
            }

            res[localsName].t = t;
            res[localsName].exists = exists;
            res[localsName].i18n = i18n;
            res[localsName].language = lng;
            res[localsName].languageDir = i18next.dir(lng);

            if (i18next.services.languageDetector) {
                i18next.services.languageDetector.cacheUserLanguage(ctx, lng);
            }

            // load resources
            if (!req.lng) {
                await next();
            } else {
                i18next.loadLanguages(req.lng, async function () {
                    await next();
                });
            }
        } else {
            await next();
        }
    };
}exports.default =

{
    getHandler };