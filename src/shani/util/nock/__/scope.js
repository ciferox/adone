const {
    is,
    error,
    std: {
        url
    },
    shani: {
        util: { nock }
    }
} = adone;

const __ = adone.private(nock);

const {
    util: _util
} = __;

export default class Scope extends adone.std.events.EventEmitter {
    constructor(basePath, options) {
        super();
        this.keyedInterceptors = {};
        this.interceptors = [];
        this.transformPathFunction = null;
        this.transformRequestBodyFunction = null;
        this.matchHeaders = [];
        this.scopeOptions = options || {};
        this.urlParts = {};
        this._persist = false;
        this.contentLen = false;
        this.date = null;
        this.basePath = basePath;
        this.basePathname = "";
        this.port = null;

        if (!(basePath instanceof RegExp)) {
            this.urlParts = url.parse(basePath);
            this.port = this.urlParts.port || ((this.urlParts.protocol === "http:") ? 80 : 443);
            this.basePathname = this.urlParts.pathname.replace(/\/$/, "");
            this.basePath = `${this.urlParts.protocol}//${this.urlParts.hostname}:${this.port}`;
        }
    }

    add(key, interceptor) {
        if (!this.keyedInterceptors.hasOwnProperty(key)) {
            this.keyedInterceptors[key] = [];
        }
        this.keyedInterceptors[key].push(interceptor);
        __.intercept(this.basePath,
            interceptor,
            this,
            this.scopeOptions,
            this.urlParts.hostname);
    }

    remove(key, interceptor) {
        if (this._persist) {
            return;
        }
        const arr = this.keyedInterceptors[key];
        if (arr) {
            arr.splice(arr.indexOf(interceptor), 1);
            if (arr.length === 0) {
                delete this.keyedInterceptors[key];
            }
        }
    }

    intercept(uri, method, requestBody, interceptorOptions) {
        const ic = new __.Interceptor(this, uri, method, requestBody, interceptorOptions);

        this.interceptors.push(ic);
        return ic;
    }

    get(uri, requestBody, options) {
        return this.intercept(uri, "GET", requestBody, options);
    }

    post(uri, requestBody, options) {
        return this.intercept(uri, "POST", requestBody, options);
    }

    put(uri, requestBody, options) {
        return this.intercept(uri, "PUT", requestBody, options);
    }

    head(uri, requestBody, options) {
        return this.intercept(uri, "HEAD", requestBody, options);
    }

    patch(uri, requestBody, options) {
        return this.intercept(uri, "PATCH", requestBody, options);
    }

    merge(uri, requestBody, options) {
        return this.intercept(uri, "MERGE", requestBody, options);
    }

    delete(uri, requestBody, options) {
        return this.intercept(uri, "DELETE", requestBody, options);
    }

    options(uri, requestBody, options) {
        return this.intercept(uri, "OPTIONS", requestBody, options);
    }

    pendingMocks() {
        const self = this;

        const pendingInterceptorKeys = Object.keys(this.keyedInterceptors).filter((key) => {
            const interceptorList = self.keyedInterceptors[key];
            const pendingInterceptors = interceptorList.filter((interceptor) => {
                // TODO: This assumes that completed mocks are removed from the keyedInterceptors list
                // (when persistence is off). We should change that (and this) in future.
                const persistedAndUsed = self._persist && interceptor.interceptionCounter > 0;
                return !persistedAndUsed && !interceptor.optional;
            });
            return pendingInterceptors.length > 0;
        });

        return pendingInterceptorKeys;
    }

    // Returns all keyedInterceptors that are active.
    // This incomplete interceptors, persisted but complete interceptors, and
    // optional interceptors, but not non-persisted and completed interceptors.
    activeMocks() {
        return Object.keys(this.keyedInterceptors);
    }

    isDone() {
        return this.pendingMocks().length === 0;
    }

    done() {
        if (!this.isDone()) {
            throw new error.IllegalStateException(`Mocks not yet satisfied:\n${this.pendingMocks().join("\n")}`);
        }
    }

    buildFilter(...args) {
        if (args[0] instanceof RegExp) {
            return function (candidate) {
                if (candidate) {
                    candidate = candidate.replace(args[0], args[1]);
                }
                return candidate;
            };
        } else if (is.function(args[0])) {
            return args[0];
        }
    }

    filteringPath(...args) {
        this.transformPathFunction = this.buildFilter(...args);
        if (!this.transformPathFunction) {
            throw new Error("Invalid arguments: filtering path should be a function or a regular expression");
        }
        return this;
    }

    filteringRequestBody(...args) {
        this.transformRequestBodyFunction = this.buildFilter(...args);
        if (!this.transformRequestBodyFunction) {
            throw new Error("Invalid arguments: filtering request body should be a function or a regular expression");
        }
        return this;
    }

    matchHeader(name, value) {
        //  We use lower-case header field names throughout Nock.
        this.matchHeaders.push({ name: name.toLowerCase(), value });
        return this;
    }

    defaultReplyHeaders(headers) {
        this._defaultReplyHeaders = _util.headersFieldNamesToLowerCase(headers);
        return this;
    }

    log(newLogger) {
        this.logger = newLogger;
        return this;
    }

    persist(flag) {
        this._persist = is.nil(flag) ? true : flag;
        if (!is.boolean(this._persist)) {
            throw new Error("Invalid arguments: argument should be a boolean");
        }
        return this;
    }

    shouldPersist() {
        return this._persist;
    }

    replyContentLength() {
        this.contentLen = true;
        return this;
    }

    replyDate(d) {
        this.date = d || new Date();
        return this;
    }
}
