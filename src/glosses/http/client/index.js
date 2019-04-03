/* eslint-disable adone/no-typeof */

import { buildURL, extend, forEach, deepMerge, merge, normalizeHeaderName } from "./helpers";

const {
    is,
    error,
    util
} = adone;

adone.lazify({
    createError: "./create_error",
    enhanceError: "./enhance_error",
    settle: "./settle",
    FormData: "./form_data"
}, exports, require);

const __ = adone.lazifyPrivate({
    InterceptorManager: "./interceptor_manager",
    httpAdapter: "./adapters/http",
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
            throw new adone.error.InvalidArgumentException("executor must be a function.");
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
    adapter: (!is.undefined(process) && Object.prototype.toString.call(process) === "[object process]")
        ? __.httpAdapter
        : (!is.undefined(XMLHttpRequest))
            ? __.xhrAdapter
            : undefined,
    transformRequest: [(data, headers = {}) => {
        normalizeHeaderName(headers, "Accept");
        normalizeHeaderName(headers, "Content-Type");

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

    /**
    * A timeout in milliseconds to abort a request. If set to 0 (default) a
    * timeout is not created.
    */
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

const mergeConfig = (config1, config2) => {
    // eslint-disable-next-line no-param-reassign
    config2 = config2 || {};
    const config = {};

    forEach(["url", "method", "params", "data"], (prop) => {
        if (!is.undefined(config2[prop])) {
            config[prop] = config2[prop];
        }
    });

    forEach(["headers", "auth", "proxy"], (prop) => {
        if (is.object(config2[prop])) {
            config[prop] = deepMerge(config1[prop], config2[prop]);
        } else if (!is.undefined(config2[prop])) {
            config[prop] = config2[prop];
        } else if (is.object(config1[prop])) {
            config[prop] = deepMerge(config1[prop]);
        } else if (!is.undefined(config1[prop])) {
            config[prop] = config1[prop];
        }
    });

    forEach([
        "baseURL", "formData", "transformRequest", "transformResponse", "paramsSerializer",
        "timeout", "withCredentials", "adapter", "responseType", "responseEncoding", "xsrfCookieName",
        "xsrfHeaderName", "onUploadProgress", "onDownloadProgress", "maxContentLength",
        "validateStatus", "maxRedirects", "httpAgent", "httpsAgent", "cancelToken",
        "socketPath"
    ], (prop) => {
        if (!is.undefined(config2[prop])) {
            config[prop] = config2[prop];
        } else if (!is.undefined(config1[prop])) {
            config[prop] = config1[prop];
        }
    });

    return config;
};

export class Client {
    constructor(options) {
        this.config = options;
        this.interceptors = {
            request: new __.InterceptorManager(),
            response: new __.InterceptorManager()
        };
    }

    getUri(config) {
        config = mergeConfig(this.config, config);
        return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, "");
    }

    request(...args) {
        let config;
        if (is.string(args[0])) {
            config = args[1] || {};
            config.url = args[0];
        } else {
            config = args[0] || {};
        }

        config = mergeConfig(this.config, config);
        config.method = config.method ? config.method.toLowerCase() : "get";

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
                        throw new error.InvalidArgument(`responseType can be either buffer, json, stream or string, but got: ${options.responseType}`);
                }

                // Flatten headers
                options.headers = merge(
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
        return this.request(merge({}, options, { method: "get", url }));
    }

    head(url, options = {}) {
        return this.request(merge({}, options, { method: "head", url }));
    }

    post(url, data, options = {}) {
        return this.request(merge({}, options, { method: "post", url, data }));
    }

    put(url, data, options = {}) {
        return this.request(merge({}, options, { method: "put", url, data }));
    }

    patch(url, data, options = {}) {
        return this.request(merge({}, options, { method: "patch", url, data }));
    }

    delete(url, options = {}) {
        return this.request(merge({}, options, { method: "delete", url }));
    }

    options(url, options = {}) {
        return this.request(merge({}, options, { method: "options", url }));
    }
}

const createInstance = (options) => {
    const context = new Client(options);
    const instance = Client.prototype.request.bind(context);

    extend(instance, Client.prototype, context);
    extend(instance, context);

    return instance;
};

// Create the default instance to be exported
export const request = createInstance(defaults);

// Factory for creating new instances
export const create = (options) => createInstance(mergeConfig(defaults, options));
