
import defaults from "../defaults";

const imports = adone.lazify({
    defaults: "../defaults",
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


export default class Request {
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

        config = adone.vendor.lodash.merge({}, defaults, this.defaults, { method: "get" }, config);
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
}

for (const method of ["delete", "get", "head"]) {
    Request.prototype[method] = function (url, config = {}) {
        return this.request(adone.vendor.lodash.merge({}, config, { method, url }));
    };
}

for (const method of ["post", "put", "patch"]) {
    Request.prototype[method] = function (url, data, config = {}) {
        return this.request(adone.vendor.lodash.merge({}, config, { method, url, data }));
    };
}
