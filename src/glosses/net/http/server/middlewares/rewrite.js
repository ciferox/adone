export default function rewrite(src, dst) {
    const keys = [];
    const re = adone.net.http.server.helper.pathToRegexp(src, keys);
    const map = {};

    keys.forEach((param, i) => {
        param.index = i;
        map[param.name] = param;
    });

    return (ctx, next) => {
        const orig = ctx.url;
        const match = re.exec(orig);

        if (match) {
            ctx.url = dst.replace(/\$(\d+)|(?::(\w+))/g, (_, n, name) => {
                if (name) {
                    return match[map[name].index + 1];
                }
                return match[n];
            });

            return next().then(() => {
                ctx.url = orig;
            });
        }

        return next();
    };
}
