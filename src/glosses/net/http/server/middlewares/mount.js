const { is, net: { http: { server: { helper } } } } = adone;

export default function mount(mountPath, middleware) {
    if (is.array(middleware)) {
        middleware = helper.compose(middleware);
    }

    const { length: mountPathLength } = mountPath;
    const trailingSlash = mountPath.endsWith("/");

    const match = (path) => {
        if (!path.startsWith(mountPath)) {
            return false;
        }

        if (path.length === mountPathLength) {
            // the same strings
            return "/";
        }

        if (trailingSlash) {
            // /a/b -> /b
            return path.slice(mountPathLength - 1);
        }

        if (path[mountPathLength] !== "/") {
            // /abcdef, must be /a/bcdef
            return false;
        }

        return path.slice(mountPathLength);
    };

    return async (ctx, next) => {
        const { path } = ctx;
        const newPath = match(path);
        if (newPath === false) {
            return next();
        }
        ctx.path = newPath;
        await middleware(ctx, async () => {
            ctx.path = path;
            await next();
            ctx.path = newPath;
        });
        ctx.path = path;
    };
}

