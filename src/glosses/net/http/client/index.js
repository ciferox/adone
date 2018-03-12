const {
    is,
    error: x,
    util,
    lodash
} = adone;

adone.lazify({
    FormData: "./form_data"
}, exports, require);

const __ = adone.lazifyPrivate({
    InterceptorManager: "./interceptor_manager",
    nodeAdapter: "./node_adapter",
    createError: "./create_error",
    enhanceError: "./enhance_error",
    settle: "./settle"
}, exports, require);

/**
 * A `Cancel` is an object that is thrown when an operation is canceled.
 *
 * @class
 * @param {string=} message The message.
 */
export class Cancel {
    constructor(message) {
        this.message = message;
    }

    toString() {
        return `Cancel${this.message ? `: ${this.message}` : ""}`;
    }
}
Cancel.prototype[Symbol.for("adone:request:cancel")] = true;


/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
export class CancelToken {
    constructor(executor) {
        if (!is.function(executor)) {
            throw new adone.error.InvalidArgument("executor must be a function.");
        }
        let resolvePromise;
        this.promise = new Promise((resolve) => resolvePromise = resolve);
        executor((message) => {
            if (this.reason) {
                // has been requested
                return;
            }
            this.reason = new Cancel(message);
            resolvePromise(this.reason);
        });
    }

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    throwIfRequested() {
        if (this.reason) {
            throw this.reason;
        }

    }

    /**
     * Returns an object that contains a new `CancelToken` and a function that, when called,
     * cancels the `CancelToken`.
     */
    static source() {
        let cancel;
        const token = new CancelToken((c) => cancel = c);
        return { token, cancel };
    }
}

export const isCancel = (value) => Boolean(value && value[Symbol.for("adone:request:cancel")]);

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
export const transformData = (data, headers, config, fns) => {
    if (is.nil(fns)) {
        return data;
    }
    fns = util.arrify(fns);
    for (const fn of fns) {
        data = fn(data, headers, config);
    }
    return data;
};

export const defaults = {
    adapter: __.nodeAdapter,
    transformRequest: [(data, headers = {}) => {
        // Normalize headers
        const normalizedName = "Content-Type";
        for (const name of Object.keys(headers)) {
            if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
                headers[normalizedName] = headers[name];
                delete headers[name];
            }
        }

        if (/*isFormData(data) ||*/
            is.arrayBuffer(data) ||
            is.buffer(data) ||
            is.stream(data)) {
            if (is.undefined(headers["Content-Type"])) {
                headers["Content-Type"] = "application/x-www-form-urlencoded";
            }
            return data;
        }
        if (is.arrayBufferView(data)) {
            if (is.undefined(headers["Content-Type"])) {
                headers["Content-Type"] = "application/x-www-form-urlencoded";
            }
            return data.buffer;
        }
        if (is.object(data)) {
            if (is.undefined(headers["Content-Type"])) {
                headers["Content-Type"] = "application/json;charset=utf-8";
            } else if (headers["Content-Type"].startsWith("application/x-www-form-urlencoded")) {
                return adone.util.querystring.stringify(data);
            }
            return JSON.stringify(data); // TODO: must it return json if there is no content-type header?
        }

        // TODO: must it preserve content-type if there is no data?
        if (is.undefined(headers["Content-Type"])) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
        }
        return data;
    }],

    transformResponse: [(data, headers, config = {}) => {
        if (config.responseType === "json") { // TODO: do it here???
            try {
                data = JSON.parse(data);
            } catch (e) { /* Ignore */ }
        }
        return data;
    }],

    timeout: 0,

    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",

    maxContentLength: -1,

    validateStatus: (status) => status >= 200 && status < 300,

    responseType: "json",
    responseEncoding: "utf8"
};

defaults.headers = {
    common: {
        Accept: "application/json, text/plain, */*"
    }
};

for (const method of ["delete", "get", "head"]) {
    defaults.headers[method] = {};
}

for (const method of ["post", "put", "patch"]) {
    defaults.headers[method] = {};
}

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
const throwIfCancellationRequested = (options) => {
    if (options.cancelToken) {
        options.cancelToken.throwIfRequested();
    }
};

const isAbsoluteURL = (url) => /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
const combineURLs = (baseURL, relativeURL) => {
    if (relativeURL) {
        return `${baseURL.replace(/\/+$/, "")}/${relativeURL.replace(/^\/+/, "")}`;
    }
    return baseURL;
};

export class Client {
    constructor(options) {
        this.config = options;
        this.interceptors = {
            request: new __.InterceptorManager(),
            response: new __.InterceptorManager()
        };
    }

    request(config, ...args) {
        if (is.string(config)) {
            config = lodash.merge({
                url: config
            }, args[0]);
        }

        config = lodash.merge({}, defaults, this.config, {
            method: "get"
        }, config);
        config.method = config.method.toLowerCase();

        // Hook up interceptors middleware
        const chain = [
            (options) => {
                throwIfCancellationRequested(options);

                // Support baseURL config
                if (config.baseURL && !isAbsoluteURL(config.url)) {
                    config.url = combineURLs(config.baseURL, config.url);
                }

                // Ensure headers exist
                options.headers = options.headers || {};

                switch (options.responseType) {
                    case "buffer":
                    case "json":
                    case "stream":
                    case "string":
                        break;
                    default:
                        throw new x.InvalidArgument(`responseType can be either buffer, json, stream or string, but got: ${options.responseType}`);
                }

                // Flatten headers
                options.headers = lodash.merge(
                    {},
                    options.headers.common || {},
                    options.headers[options.method] || {},
                    options.headers || {}
                );

                // Transform request data
                options.data = transformData(options.data, options.headers, options, options.transformRequest);

                for (const method of ["delete", "get", "head", "post", "put", "patch", "common"]) {
                    delete options.headers[method];
                }

                const adapter = config.adapter || defaults.adapter;

                return adapter(options).then((response) => {
                    throwIfCancellationRequested(options);
                    response.data = transformData(response.data, response.headers, options, options.transformResponse);
                    return response;
                }, (reason) => {
                    if (!isCancel(reason)) {
                        throwIfCancellationRequested(options);

                        if (reason && reason.response) {
                            reason.response.data = transformData(reason.response.data, reason.response.headers, options, options.transformResponse);
                        }
                    }
                    return Promise.reject(reason);
                });
            },
            undefined
        ];

        this.interceptors.request.forEach((interceptor) => {
            chain.unshift(interceptor.fulfilled, interceptor.rejected);
        });
        this.interceptors.response.forEach((interceptor) => {
            chain.push(interceptor.fulfilled, interceptor.rejected);
        });

        let promise = Promise.resolve(config);
        while (chain.length) {
            promise = promise.then(chain.shift(), chain.shift());
        }
        return promise;
    }

    get(url, options = {}) {
        return this.request(lodash.merge({}, options, { method: "get", url }));
    }

    head(url, options = {}) {
        return this.request(lodash.merge({}, options, { method: "heade", url }));
    }

    post(url, data, options = {}) {
        return this.request(lodash.merge({}, options, { method: "post", url, data }));
    }

    put(url, data, options = {}) {
        return this.request(lodash.merge({}, options, { method: "put", url, data }));
    }

    patch(url, data, options = {}) {
        return this.request(lodash.merge({}, options, { method: "patch", url, data }));
    }

    delete(url, options = {}) {
        return this.request(lodash.merge({}, options, { method: "delete", url }));
    }

    options(url, options = {}) {
        return this.request(lodash.merge({}, options, { method: "options", url }));
    }
}

const createInstance = (options) => {
    const context = new Client(options);
    const instance = context.request.bind(context);

    const ents = util.entries(Client.prototype, { onlyEnumerable: false }).filter((x) => x[0] !== "constructor");
    for (const [name, method] of ents) {
        instance[name] = method.bind(context);
    }
    lodash.extend(instance, context);

    return instance;
};

// Create the default instance to be exported
export const request = createInstance(defaults);

// Factory for creating new instances
export const create = (options) => createInstance(lodash.merge({}, defaults, options));
