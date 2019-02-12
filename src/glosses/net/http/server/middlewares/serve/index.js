const {
    std: { path: { resolve, normalize: pNormalize }, url },
    net: { http: { server: { helper: { send } } } },
    is,
    error,
    lazify,
    o
} = adone;

const lazy = lazify({
    ListingTool: "./listing_tool"
}, null, require);

const BSLAH_RE = /\\/g;
const normalize = is.windows ? (s) => pNormalize(s).replace(BSLAH_RE, "/") : pNormalize;

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
        throw new error.InvalidArgumentException("root directory is required to serve files");
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

    const handleListing = async (ctx, path) => {
        const { pathname: orig, search } = url.parse(ctx.originalUrl);
        const trailingSlash = orig.endsWith("/");
        if (search) {
            if (!trailingSlash) {
                return ctx.redirect(`${orig}/`);
            }
            return ctx.redirect(orig);
        }
        if (!trailingSlash) {
            return ctx.redirect(`${orig}/`);
        }
        const format = ctx.get("accept") && ctx.accepts("text/html", "application/json", "text/plain");
        switch (format) {
            case "text/html": {
                ctx.body = await listing.renderHTML(path, orig);
                break;
            }
            case "application/json": {
                ctx.body = await listing.renderJSON(path, `${ctx.origin}${orig}`);
                break;
            }
            case "text/plain": {
                ctx.body = await listing.renderPlain(path, `${ctx.origin}${orig}`);
                break;
            }
            default: {
                ctx.body = await listing.renderPlain(path, `${ctx.origin}${orig}`);
            }
        }
    };

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
                    await handleListing(ctx, path);
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
                await handleListing(ctx, path);

            }
        };
    }
    return serve;

}
