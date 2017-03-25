const { is, vendor: { lodash } } = adone;

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
        const token = this;
        executor((message) => {
            if (token.reason) {
                // has been requested
                return;
            }
            token.reason = new Cancel(message);
            resolvePromise(token.reason);
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
    if (is.null(fns) || is.undefined(fns)) {
        return data;
    }
    fns = adone.util.arrify(fns);
    for (const fn of fns) {
        data = fn(data, headers);
    }
    return data;
}

const DEFAULT_CONTENT_TYPE = {
    "Content-Type": "application/x-www-form-urlencoded"
};

function setContentTypeIfUnset(headers, value) {
    if (!is.undefined(headers) && is.undefined(headers["Content-Type"])) {
        headers["Content-Type"] = value;
    }
}

function normalizeHeaderName(headers = {}, normalizedName = null) {
    for (const name of Object.keys(headers)) {
        if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
            headers[normalizedName] = headers[name];
            delete headers[name];
        }
    }
}

import adapter from "./adapter";

export const defaults = {
    adapter,

    transformRequest: [(data, headers) => {
        normalizeHeaderName(headers, "Content-Type");
        if (is.arrayBuffer(data) || is.stream(data)) {
            return data;
        }
        if (is.arrayBufferView(data)) {
            return data.buffer;
        }
        if (is.object(data)) {
            setContentTypeIfUnset(headers, "application/json;charset=utf-8");
            return JSON.stringify(data);
        }
        return data;
    }],

    transformResponse: [(data) => {
        /*eslint no-param-reassign:0*/
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
    defaults.headers[method] = adone.vendor.lodash.merge({}, DEFAULT_CONTENT_TYPE);
}


/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
    if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
    }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
function dispatchRequest(config) {
    throwIfCancellationRequested(config);

    // Ensure headers exist
    config.headers = config.headers || {};

    // Transform request data
    config.data = transformData(
        config.data,
        config.headers,
        config.transformRequest
    );

    // Flatten headers
    config.headers = adone.vendor.lodash.merge(
        {},
        config.headers.common || {},
        config.headers[config.method] || {},
        config.headers || {}
    );

    for (const method of ["delete", "get", "head", "post", "put", "patch", "common"]) {
        delete config.headers[method];
    }

    const adapter = config.adapter || defaults.adapter;

    return adapter(config)
        .then((response) => {
            throwIfCancellationRequested(config);
            // Transform response data
            response.data = transformData(response.data, response.headers, config.transformResponse);
            return response;
        }, (reason) => {
            if (!isCancel(reason)) {
                throwIfCancellationRequested(config);

                // Transform response data
                if (reason && reason.response) {
                    reason.response.data = transformData(reason.response.data, reason.response.headers, config.transformResponse);
                }
            }
            return Promise.reject(reason);
        });
}

const isAbsoluteURL = (url) => /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
const combineURLs = (baseURL, relativeURL) => {
    if (relativeURL) {
        return `${baseURL.replace(/\/+$/, "")}/${relativeURL.replace(/^\/+/, "")}`;
    }
    return baseURL;
};

export class Client {
    constructor(instanceConfig) {
        this.defaults = instanceConfig;
        this.interceptors = {
            request: new imports.InterceptorManager(),
            response: new imports.InterceptorManager()
        };
    }

    request(config) {
        if (is.string(config)) {
            config = lodash.merge({
                url: config
            }, arguments[1]);
        }

        config = lodash.merge({}, defaults, this.defaults, { method: "get" }, config);
        // Support baseURL config
        if (config.baseURL && !isAbsoluteURL(config.url)) {
            config.url = combineURLs(config.baseURL, config.url);
        }

        // Hook up interceptors middleware
        const chain = [dispatchRequest, undefined];
        let promise = Promise.resolve(config);

        this.interceptors.request.forEach((interceptor) => {
            chain.unshift(interceptor.fulfilled, interceptor.rejected);
        });
        this.interceptors.response.forEach((interceptor) => {
            chain.push(interceptor.fulfilled, interceptor.rejected);
        });

        while (chain.length) {
            promise = promise.then(chain.shift(), chain.shift());
        }

        return promise;
    }

    get(url, config = {}) {
        return this.request(lodash.merge({}, config, { method: "get", url }));
    }

    head(url, config = {}) {
        return this.request(lodash.merge({}, config, { method: "heade", url }));
    }

    post(url, data, config = {}) {
        return this.request(lodash.merge({}, config, { method: "post", url, data }));
    }

    put(url, data, config = {}) {
        return this.request(lodash.merge({}, config, { method: "put", url, data }));
    }

    patch(url, data, config = {}) {
        return this.request(lodash.merge({}, config, { method: "patch", url, data }));
    }

    delete(url, config = {}) {
        return this.request(lodash.merge({}, config, { method: "delete", url }));
    }
}

const createInstance = (defaultConfig) => {
    const context = new Client(defaultConfig);
    const instance = context.request.bind(context);

    const ents = adone.util.entries(Client.prototype, { onlyEnumerable: false }).filter((x) => x[0] !== "constructor");
    for (const [name, method] of ents) {
        instance[name] = method.bind(context);
    }
    lodash.extend(instance, context);

    return instance;
};

// Create the default instance to be exported
export const request = createInstance(defaults);

// Factory for creating new instances
export const create = (instanceConfig) => createInstance(lodash.merge({}, defaults, instanceConfig));
