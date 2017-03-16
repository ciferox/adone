
const {
    std: { path: { resolve, normalize } },
    net: { http: { helper: { send } } },
    is, x
} = adone;

const strip = (path, n) => {
    let j = 0;
    for (let i = 1; i < path.length && n; ++i) {
        if (path[i] === "/") {
            j = i;
            --n;
        }
    }
    return j > 0 ? path.slice(j) : path;
};

export default function serve(root, opts = {}) {
    if (!root) {
        throw new x.InvalidArgument("root directory is required to serve files");
    }
    opts = adone.o(opts);

    opts.root = resolve(root);

    if (opts.index !== false) {
        opts.index = opts.index || "index.html";
    }

    const { strip: s = 0 } = opts;

    let serve;
    if (!opts.defer) {
        serve = (ctx, next) => {
            if (ctx.method === "HEAD" || ctx.method === "GET") {
                return send(ctx, s ? strip(normalize(ctx.path), s) : ctx.path, opts)
                    .then((done) => {
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
                return send(ctx, s ? strip(normalize(ctx.path), s) : ctx.path, opts);
            });
        };
    }
    return serve;

}
