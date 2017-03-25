const { is, util, vendor: { lodash } } = adone;

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
            throw new adone.x.InvalidArgument("executor must be a function.");
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

const imports = adone.lazify({
    InterceptorManager: "./interceptor_manager",
    adapter: "./adapter"
}, null, require);



/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
export const transformData = (data, headers, fns) => {
    if (is.nil(fns)) {
        return data;
    }
    fns = util.arrify(fns);
    for (const fn of fns) {
        data = fn(data, headers);
    }
    return data;
};

export const defaults = {
    transformRequest: [(data, headers = {}) => {
        // Normalize headers
        for (const normalizedName of ["Content-Type"]) {
            for (const name of Object.keys(headers)) {
                if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
                    headers[normalizedName] = headers[name];
                    delete headers[name];
                }
            }
        }

        if (is.arrayBuffer(data) || is.stream(data)) {
            return data;
        }
        if (is.arrayBufferView(data)) {
            return data.buffer;
        }
        if (is.object(data)) {
            if (!is.undefined(headers) && is.undefined(headers["Content-Type"])) {
                headers["Content-Type"] = "application/json;charset=utf-8";
            }
            return JSON.stringify(data);
        }
        return data;
    }],

    transformResponse: [(data) => {
        if (is.string(data)) {  // TODO: check content-type?
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

    validateStatus: (status) => status >= 200 && status < 300
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
    defaults.headers[method] = {
        "Content-Type": "application/x-www-form-urlencoded"
    };
}


/**
 * Throws a `Cancel` if cancellation has been requested.
 */
const throwIfCancellationRequested = (options) => {
    if (options.cancelToken) {
        options.cancelToken.throwIfRequested();
    }
};

const isAbsoluteURL = (url) => /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
const combineURLs = (baseURL, relativeURL) => {
    if (relativeURL) {
        return `${baseURL.replace(/\/+$/, "")}/${relativeURL.replace(/^\/+/, "")}`;
    }
    return baseURL;
};

export class Client {
    constructor(options) {
        this.options = options;
        this.interceptors = {
            request: new imports.InterceptorManager(),
            response: new imports.InterceptorManager()
        };
    }

    request(options, ...args) {
        if (is.string(options)) {
            options = lodash.merge({
                url: options
            }, args[0]);
        }

        options = lodash.merge({}, defaults, this.options, {
            method: "get"
        }, options);
        // Support baseURL config
        if (options.baseURL && !isAbsoluteURL(options.url)) {
            options.url = combineURLs(options.baseURL, options.url);
        }

        // Hook up interceptors middleware
        const chain = [
            (options) => {
                throwIfCancellationRequested(options);

                // Ensure headers exist
                options.headers = options.headers || {};

                // Transform request data
                options.data = transformData(options.data, options.headers, options.transformRequest);

                // Flatten headers
                options.headers = lodash.merge(
                    {},
                    options.headers.common || {},
                    options.headers[options.method] || {},
                    options.headers || {}
                );

                for (const method of ["delete", "get", "head", "post", "put", "patch", "common"]) {
                    delete options.headers[method];
                }

                return imports.adapter(options).then((response) => {
                    throwIfCancellationRequested(options);
                    response.data = transformData(response.data, response.headers, options.transformResponse);
                    return response;
                }, (reason) => {
                    if (!isCancel(reason)) {
                        throwIfCancellationRequested(options);

                        if (reason && reason.response) {
                            reason.response.data = transformData(reason.response.data, reason.response.headers, options.transformResponse);
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

        let promise = Promise.resolve(options);
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
