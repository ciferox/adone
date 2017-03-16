const { is, x, util, net: { http: { helper: { pathToRegexp } } } } = adone;

const safeDecodeURIComponent = (text) => {
    try {
        return decodeURIComponent(text);
    } catch (e) {
        return text;
    }
};

export default class Layer {
    constructor(path, methods, middleware, opts = {}) {
        this.opts = opts;
        this.name = this.opts.name || null;
        this.methods = [];
        this.paramNames = [];
        this.stack = util.arrify(middleware);

        for (const fn of this.stack) {
            if (!is.function(fn)) {
                throw new x.InvalidArgument(`${methods.toString()} \`${this.opts.name || path}\`: \`middleware\` must be a function, not \`${typeof fn}\``);
            }
        }

        for (const method of methods) {
            const l = this.methods.push(method.toUpperCase());
            if (this.methods[l - 1] === "GET") {
                this.methods.unshift("HEAD");
            }
        }

        this.path = path;
        this.regexp = pathToRegexp(path, this.paramNames, this.opts);
    }

    match(path) {
        return this.regexp.test(path);
    }

    // map of URL parameters for given `path` and `paramNames`.
    params(path, captures, existingParams) {
        const params = existingParams || {};

        for (let i = 0; i < captures.length; i++) {
            if (this.paramNames[i]) {
                const c = captures[i];
                params[this.paramNames[i].name] = c ? safeDecodeURIComponent(c) : c;
            }
        }

        return params;
    }

    // array of regexp url path captures
    captures(path) {
        if (this.opts.ignoreCaptures) {
            return [];
        }
        return path.match(this.regexp).slice(1);
    }

    //  URL for route using given `params`
    url(...args) {
        const { path: url } = this;
        const toPath = pathToRegexp.compile(url);

        if (is.object(args[0])) {
            return toPath(args[0]);
        }

        const tokens = pathToRegexp.parse(url);
        const replace = {};
        for (let len = tokens.length, i = 0, j = 0; i < len; i++) {
            if (tokens[i].name) {
                replace[tokens[i].name] = args[j++];
            }
        }
        return toPath(replace);
    }

    // run validations on route named parameters
    param(param, fn) {
        const { stack, paramNames: params } = this;
        const middleware = (ctx, next) => fn(ctx.params[param], ctx, next);
        middleware.param = param;

        const names = params.map((p) => p.name);

        const x = names.indexOf(param);
        if (x > -1) {
            // iterate through the stack, to figure out where to place the handler fn
            stack.some((fn, i) => {
                // param handlers are always first, so when we find an fn w/o a param property, stop here
                // if the param handler at this part of the stack comes after the one we are adding, stop here
                if (!fn.param || names.indexOf(fn.param) > x) {
                    // inject this param handler right before the current item
                    stack.splice(i, 0, middleware);
                    return true; // then break the loop
                }
                return false;
            });
        }

        return this;
    }

    setPrefix(prefix) {
        if (this.path) {
            this.path = prefix + this.path;
            this.paramNames = [];
            this.regexp = pathToRegexp(this.path, this.paramNames, this.opts);
        }

        return this;
    }
}
