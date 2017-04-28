import url from 'url';

export default {
    name: 'querystring',

    lookup(ctx, options) {
        let found;
        if (options.lookupQuerystring !== undefined) {
            if (ctx.query) {
                found = ctx.query[options.lookupQuerystring];
            } else {
                found = url.parse(ctx.url, true).query[options.lookupQuerystring];
            }
        }

        return found;
    }
};