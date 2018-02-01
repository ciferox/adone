const {
    is,
    util,
    exception,
    lazify,
    std: { http: { METHODS } },
    net: { http }
} = adone;
const { server: { helper } } = http;

const lazy = lazify({
    Layer: "./layer"
}, exports, require);

const methods = METHODS.map((x) => x.toLowerCase());

export class Router {
    constructor(opts = {}) {
        this.opts = opts;
        this.methods = this.opts.methods || [
            "HEAD",
            "OPTIONS",
            "GET",
            "PUT",
            "PATCH",
            "POST",
            "DELETE"
        ];

        this.params = {};
        this.stack = [];
    }

    use(...middlewares) {
        let path = "(.*)";

        // support array of paths
        if (is.array(middlewares[0]) && is.string(middlewares[0][0])) {
            const [paths, ..._middlewares] = middlewares;
            for (const p of paths) {
                this.use(p, ..._middlewares);
            }
            return this;
        }

        const hasPath = is.string(middlewares[0]);
        if (hasPath) {
            path = middlewares.shift();
        }

        for (const middleware of middlewares) {
            if (middleware.router) {
                middleware.router.stack.forEach((nestedLayer) => {
                    if (path) {
                        nestedLayer.setPrefix(path);
                    }
                    if (this.opts.prefix) {
                        nestedLayer.setPrefix(this.opts.prefix);
                    }
                    this.stack.push(nestedLayer);
                });

                if (this.params) {
                    for (const [key, value] of util.entries(this.params)) {
                        middleware.router.param(key, value);
                    }
                }
            } else {
                this.register(path, [], middleware, { end: false, ignoreCaptures: !hasPath });
            }
        }
        return this;
    }

    prefix(prefix) {
        prefix = prefix.replace(/\/$/, "");

        this.opts.prefix = prefix;

        for (const route of this.stack) {
            route.setPrefix(prefix);
        }

        return this;
    }

    routes() {
        const dispatch = (ctx, next) => {
            const path = this.opts.routerPath || ctx.routerPath || ctx.path;
            const matched = this.match(path, ctx.method);

            if (ctx.matched) {
                ctx.matched.push.apply(ctx.matched, matched.path);
            } else {
                ctx.matched = matched.path;
            }

            ctx.router = this;

            if (!matched.route) {
                return next();
            }

            const matchedLayers = matched.pathAndMethod;
            const mostSpecificLayer = matchedLayers[matchedLayers.length - 1];
            ctx._matchedRoute = mostSpecificLayer.path;
            if (mostSpecificLayer.name) {
                ctx._matchedRouteName = mostSpecificLayer.name;
            }

            const layerChain = matchedLayers.reduce((memo, layer) => {
                memo.push((ctx, next) => {
                    ctx.captures = layer.captures(path, ctx.captures);
                    ctx.params = layer.params(path, ctx.captures, ctx.params);
                    return next();
                });
                return memo.concat(layer.stack);
            }, []);

            return helper.compose(layerChain)(ctx, next);
        };

        dispatch.router = this;

        return dispatch;
    }

    allowedMethods(options = {}) {
        const { methods: implemented } = this;

        return (ctx, next) => {
            return next().then(() => {
                const allowed = {};

                if (!ctx.status || ctx.status === 404) {
                    for (const route of ctx.matched) {
                        for (const method of route.methods) {
                            allowed[method] = method;
                        }
                    }

                    const allowedArr = util.keys(allowed);

                    if (!implemented.includes(ctx.method)) {
                        if (options.throw) {
                            let notImplementedThrowable;
                            if (is.function(options.notImplemented)) {
                                notImplementedThrowable = options.notImplemented();
                            } else {
                                notImplementedThrowable = new http.exception.NotImplemented();
                            }
                            throw notImplementedThrowable;
                        } else {
                            ctx.status = 501;
                            ctx.set("Allow", allowedArr.join(", "));
                        }
                    } else if (allowedArr.length) {
                        if (ctx.method === "OPTIONS") {
                            ctx.status = 200;
                            ctx.body = "";
                            ctx.set("Allow", allowedArr.join(", "));
                        } else if (!allowed[ctx.method]) {
                            if (options.throw) {
                                let notAllowedThrowable;
                                if (is.function(options.methodNotAllowed)) {
                                    notAllowedThrowable = options.methodNotAllowed();
                                } else {
                                    notAllowedThrowable = new http.exception.MethodNotAllowed();
                                }
                                throw notAllowedThrowable;
                            } else {
                                ctx.status = 405;
                                ctx.set("Allow", allowedArr.join(", "));
                            }
                        }
                    }
                }
            });
        };
    }

    all(name, path, ...middlewares) {
        if (!is.string(path)) {
            [name, path, middlewares] = [null, name, [path, ...middlewares]];
        }

        this.register(path, methods, middlewares, {
            name
        });

        return this;
    }

    redirect(source, destination, code) {
        if (source[0] !== "/") {
            source = this.url(source);
        }

        if (destination[0] !== "/") {
            destination = this.url(destination);
        }

        return this.all(source, (ctx) => {
            ctx.redirect(destination);
            ctx.status = code || 301;
        });
    }

    register(path, methods, middleware, opts = {}) {
        const { stack } = this;

        // support array of paths
        if (is.array(path)) {
            for (const p of path) {
                this.register(p, methods, middleware, opts);
            }
            return this;
        }

        const route = new lazy.Layer(path, methods, middleware, {
            end: opts.end === false ? opts.end : true,
            name: opts.name,
            sensitive: opts.sensitive || this.opts.sensitive || false,
            strict: opts.strict || this.opts.strict || false,
            prefix: opts.prefix || this.opts.prefix || "",
            ignoreCaptures: opts.ignoreCaptures
        });

        if (this.opts.prefix) {
            route.setPrefix(this.opts.prefix);
        }

        for (const [key, value] of util.entries(this.params)) {
            route.param(key, value);
        }
        stack.push(route);

        return route;
    }

    route(name) {
        const { stack: routes } = this;

        for (const route of routes) {
            if (route.name && route.name === name) {
                return route;
            }
        }

        return false;
    }

    // Lookup route with given `name`.
    url(name, ...args) {
        const route = this.route(name);

        if (route) {
            return route.url(...args);
        }

        return new exception.NotFound(`No route found for name: ${name}`);
    }

    // Match given `path` and return corresponding routes.
    match(path, method) {
        const matched = {
            path: [],
            pathAndMethod: [],
            route: false
        };

        for (const layer of this.stack) {
            if (layer.match(path)) {
                matched.path.push(layer);

                if (layer.methods.length === 0 || layer.methods.includes(method)) {
                    matched.pathAndMethod.push(layer);
                    if (layer.methods.length) {
                        matched.route = true;
                    }
                }
            }
        }

        return matched;
    }

    // Run middleware for named route parameters
    param(param, middleware) {
        this.params[param] = middleware;
        for (const route of this.stack) {
            route.param(param, middleware);
        }
        return this;
    }

    static url(path, params) {
        return lazy.Layer.prototype.url.call({ path }, params);
    }
}

for (const method of methods) {
    Router.prototype[method] = function (name, path, ...middlewares) {
        if (!is.string(path) && !is.regexp(path)) {
            [name, path, middlewares] = [null, name, [path, ...middlewares]];
        }
        if (is.array(middlewares[0])) {
            middlewares = middlewares[0];
        }
        this.register(path, [method], middlewares, { name });
        return this;
    };
}
