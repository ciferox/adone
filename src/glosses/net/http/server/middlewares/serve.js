import adone from "adone";
const {
    std: { path: { resolve } },
    net: { http: { helper: { send } } },
    is, x
} = adone;

export default function serve(root, opts = {}) {
    if (!root) {
        throw new x.InvalidArgument("root directory is required to serve files");
    }
    opts = adone.o(opts);

    opts.root = resolve(root);

    if (opts.index !== false) {
        opts.index = opts.index || "index.html";
    }

    let serve;
    if (!opts.defer) {
        serve = (ctx, next) => {
            if (ctx.method === "HEAD" || ctx.method === "GET") {
                return send(ctx, ctx.path, opts).then((done) => {
                    if (!done) {
                        return next();
                    }
                });
            }
            return next();
        };
    } else {
        serve = (ctx, next) => {
            return next().then(() => {
                if (ctx.method !== "HEAD" && ctx.method !== "GET") {
                    return;
                }
                // response is already handled
                if (!is.nil(ctx.body) || ctx.status !== 404) {
                    return;
                }

                return send(ctx, ctx.path, opts);
            });
        };
    }
    return serve;

}
