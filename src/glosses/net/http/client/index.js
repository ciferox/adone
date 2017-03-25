const imports = adone.lazify({
    defaults: "./defaults",
    InterceptorManager: "./interceptor_manager",
    dispatchRequest: "./dispatch_request"
}, null, require);

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
        if (adone.is.string(config)) {
            config = adone.vendor.lodash.merge({
                url: config
            }, arguments[1]);
        }

        config = adone.vendor.lodash.merge({}, imports.defaults, this.defaults, { method: "get" }, config);
        // Support baseURL config
        if (config.baseURL && !isAbsoluteURL(config.url)) {
            config.url = combineURLs(config.baseURL, config.url);
        }

        // Hook up interceptors middleware
        const chain = [imports.dispatchRequest, undefined];
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
        return this.request(adone.vendor.lodash.merge({}, config, { method: "get", url }));
    }

    head(url, config = {}) {
        return this.request(adone.vendor.lodash.merge({}, config, { method: "heade", url }));
    }

    post(url, data, config = {}) {
        return this.request(adone.vendor.lodash.merge({}, config, { method: "post", url, data }));
    }

    put(url, data, config = {}) {
        return this.request(adone.vendor.lodash.merge({}, config, { method: "put", url, data }));
    }

    patch(url, data, config = {}) {
        return this.request(adone.vendor.lodash.merge({}, config, { method: "patch", url, data }));
    }

}

Client.prototype.delete = function (url, config = {}) {
    return this.request(adone.vendor.lodash.merge({}, config, { method: "delete", url }));
};

const createInstance = (defaultConfig) => {
    const context = new Client(defaultConfig);
    const instance = context.request.bind(context);

    const ents = adone.util.entries(Client.prototype, { onlyEnumerable: false }).filter((x) => x[0] !== "constructor");
    for (const [name, method] of ents) {
        instance[name] = method.bind(context);
    }
    adone.vendor.lodash.extend(instance, context);

    return instance;
};

// Create the default instance to be exported
export const request = createInstance(imports.defaults);

// Factory for creating new instances
export const create = (instanceConfig) => createInstance(adone.vendor.lodash.merge({}, imports.defaults, instanceConfig));

// Expose Cancel & CancelToken
adone.lazify({
    Cancel: "./cancel/cancel",
    CancelToken: "./cancel/cancel_token",
    isCancel: "./cancel/is_cancel"
}, exports, require);
