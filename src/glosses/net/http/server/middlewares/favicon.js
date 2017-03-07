import adone from "adone";
const { std: { fs, path: { resolve } } } = adone;

export default function favicon(path, options = {}) {
    if (!path) {
        return (ctx, next) => {
            if (ctx.path !== "/favicon.ico") {
                return next();
            }
        };
    }

    path = resolve(path);

    let icon;
    const maxAge = options.maxAge == null ? 86400000 : Math.min(Math.max(0, options.maxAge), 31556926000);
    const cacheControl = `public, max-age=${maxAge / 1000 | 0}`;

    return (ctx, next) => {
        if (ctx.path !== "/favicon.ico") {
            return next();
        }

        if (ctx.method !== "GET" && ctx.method !== "HEAD") {
            ctx.status = ctx.method == "OPTIONS" ? 200 : 405;
            ctx.set("Allow", "GET, HEAD, OPTIONS");
        } else {
            // lazily read the icon
            if (!icon) {
                icon = fs.readFileSync(path);
            }
            ctx.set("Cache-Control", cacheControl);
            ctx.type = "image/x-icon";
            ctx.body = icon;
        }
    };
}
