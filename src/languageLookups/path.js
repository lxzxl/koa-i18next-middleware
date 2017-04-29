export default {
    name: 'path',

    lookup(ctx, options) {
        let found;

        if (ctx === undefined) {
            return found;
        }

        if (ctx.params && options.lookupPath !== undefined) {
            found = ctx.params[options.lookupPath];
        }

        if (!found && options.lookupFromPathIndex !== undefined) {
            let parts = ctx.path.split('/').filter(p => p !== '');
            if (parts.length > options.lookupFromPathIndex) {
                found = parts[options.lookupFromPathIndex];
            }
        }

        return found;
    }
};