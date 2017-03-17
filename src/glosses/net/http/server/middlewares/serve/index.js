
const {
    std: { path: { resolve, normalize } },
    net: { http: { helper: { send } } },
    is, x, lazify, o
} = adone;

const lazy = lazify({
    ListingTool: "./listing_tool"
}, null, require);

const strip = (path, n) => {
    let j = 0;
    for (let i = 1; i < path.length && n; ++i) {
        if (path[i] === "/") {
            j = i;
            --n;
        }
    }
    return j > 0 ? path.slice(j) : "/";
};

export default function serve(root, opts = {}) {
    if (!root) {
        throw new x.InvalidArgument("root directory is required to serve files");
    }
    opts = adone.o(opts);

    opts.root = resolve(root);

    const { strip: s = 0 } = opts;

    let listing = null;

    if (opts.listing) {
        const listingOpts = is.object(opts.listing) ? o(opts.listing) : {};
        listingOpts.hidden = opts.hidden;
        listing = new lazy.ListingTool(opts.root, listingOpts);
    }

    let serve;
    if (!opts.defer) {
        serve = async (ctx, next) => {
            if (ctx.method === "HEAD" || ctx.method === "GET") {
                const { sent, path, directory } = await send(
                    ctx,
                    s ? strip(normalize(ctx.path), s) : ctx.path,
                    opts
                );
                if (sent) {
                    return;
                }
                if (directory && listing) {
                    const { originalUrl: orig } = ctx;
                    if (!orig.endsWith("/")) {
                        return ctx.redirect(`${orig}/`);
                    }
                    ctx.body = await listing.render(path, orig);
                    return;
                }
            }
            return next();
        };
    } else {
        serve = async (ctx, next) => {
            await next();
            if (ctx.method !== "HEAD" && ctx.method !== "GET") {
                return;
            }
            // response is already handled
            if (!is.nil(ctx.body) || ctx.status !== 404) {
                return;
            }
            const { sent, path, directory } = await send(
                ctx,
                s ? strip(normalize(ctx.path), s) : ctx.path,
                opts
            );
            if (sent) {
                return;
            }
            if (directory && listing) {
                const { originalUrl: orig } = ctx;
                if (!orig.endsWith("/")) {
                    return ctx.redirect(`${orig}/`);
                }
                ctx.body = await listing.render(path, orig);
                return;
            }
        };
    }
    return serve;

}
