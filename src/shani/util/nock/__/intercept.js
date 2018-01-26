const {
    is,
    shani: {
        util: { nock }
    },
    std: {
        http,
        util: { inherits },
        url: { parse }
    },
    util
} = adone;

const __ = adone.private(nock);

const {
    util: _util,
    globalEmitter,
    ClientRequest,
    OutgoingMessage
} = __;

/**
 * @name NetConnectNotAllowedError
 * @private
 * @desc Error trying to make a connection when disabled external access.
 * @class
 * @example
 * nock.disableNetConnect();
 * http.get('http://zombo.com');
 * // throw NetConnectNotAllowedError
 */
class NetConnectNotAllowedError extends Error {
    constructor(host, path) {
        super(`Not allow net connect for "${host}${path}"`);
        this.name = "NetConnectNotAllowedError";
        this.code = "ENETUNREACH";
        Error.captureStackTrace(this, this.constructor);
    }
}

let allInterceptors = {};
let allowNetConnect;

/**
 * Enabled real request.
 * @public
 * @param {String|RegExp} matcher=RegExp.new('.*') Expression to match
 * @example
 * // Enables all real requests
 * nock.enableNetConnect();
 * @example
 * // Enables real requests for url that matches google
 * nock.enableNetConnect('google');
 * @example
 * // Enables real requests for url that matches google and amazon
 * nock.enableNetConnect(/(google|amazon)/);
 */
add.enableNetConnect = (matcher) => {
    if (is.string(matcher)) {
        allowNetConnect = new RegExp(matcher);
    } else if (is.object(matcher) && is.function(matcher.test)) {
        allowNetConnect = matcher;
    } else {
        allowNetConnect = /.*/;
    }
};

const isEnabledForNetConnect = (options) => {
    _util.normalizeRequestOptions(options);

    const enabled = allowNetConnect && allowNetConnect.test(options.host);
    return enabled;
};

/**
 * Disable all real requests.
 * @public
 * @param {String|RegExp} matcher=RegExp.new('.*') Expression to match
 * @example
 * nock.disableNetConnect();
 */
add.disableNetConnect = () => {
    allowNetConnect = undefined;
};

const nockScope = Symbol.for("adone.shani.util.nock.nockScope");
const nockScopeKey = Symbol.for("adone.shani.util.nock.nockScopeKey");
const nockScopeOptions = Symbol.for("adone.shani.util.nock.nockScopeOptions");
const nockScopeHost = Symbol.for("adone.shani.util.nock.nockScopeHost");
const nockFilteredScope = Symbol.for("adone.shani.util.nock.nockFilterScope");

export default function add(key, interceptor, scope, scopeOptions, host) {
    if (!allInterceptors.hasOwnProperty(key)) {
        allInterceptors[key] = { key, scopes: [] };
    }
    interceptor[nockScope] = scope;

    //  We need scope's key and scope options for scope filtering function (if defined)
    interceptor[nockScopeKey] = key;
    interceptor[nockScopeOptions] = scopeOptions;
    //  We need scope's host for setting correct request headers for filtered scopes.
    interceptor[nockScopeHost] = host;
    interceptor.interceptionCounter = 0;

    if (scopeOptions.allowUnmocked) {
        allInterceptors[key].allowUnmocked = true;
    }

    allInterceptors[key].scopes.push(interceptor);
}

const remove = (interceptor) => {
    if (interceptor[nockScope].shouldPersist() || --interceptor.counter > 0) {
        return;
    }

    const basePath = interceptor.basePath;
    const interceptors = allInterceptors[basePath] && allInterceptors[basePath].scopes || [];

    interceptors.some((thisInterceptor, i) => {
        return (thisInterceptor === interceptor) ? interceptors.splice(i, 1) : false;
    });
};

add.removeAll = () => {
    Object.keys(allInterceptors).forEach((key) => {
        allInterceptors[key].scopes.forEach((interceptor) => {
            interceptor.scope.keyedInterceptors = {};
        });
    });
    allInterceptors = {};
};

const interceptorsFor = (options) => {
    let matchingInterceptor;

    _util.normalizeRequestOptions(options);

    const basePath = `${options.proto}://${options.host}`;

    //  First try to use filteringScope if any of the interceptors has it defined.

    for (const interceptor of Object.values(allInterceptors)) {
        for (const scope of interceptor.scopes) {
            const filteringScope = scope[nockScopeOptions].filteringScope;

            //  If scope filtering function is defined and returns a truthy value
            //  then we have to treat this as a match.
            if (filteringScope && filteringScope(basePath)) {
                //  Keep the filtered scope (its key) to signal the rest of the module
                //  that this wasn't an exact but filtered match.
                scope[nockFilteredScope] = scope[nockScopeKey];
                matchingInterceptor = interceptor.scopes;
                break;
            }
        }
        if (!matchingInterceptor && _util.matchStringOrRegexp(basePath, interceptor.key)) {
            if (interceptor.scopes.length === 0 && interceptor.allowUnmocked) {
                matchingInterceptor = [
                    {
                        options: { allowUnmocked: true },
                        matchIndependentOfBody() {
                            return false;
                        }
                    }
                ];
            } else {
                matchingInterceptor = interceptor.scopes;
            }
            break;
        }

        if (matchingInterceptor) {
            break;
        }
    }

    return matchingInterceptor;
};

add.removeInterceptor = (options) => {
    let baseUrl;
    let key;
    let method;
    let proto;
    if (options instanceof __.Interceptor) {
        baseUrl = options.basePath;
        key = options._key;
    } else {
        proto = options.proto ? options.proto : "http";

        _util.normalizeRequestOptions(options);
        baseUrl = `${proto}://${options.host}`;
        method = options.method && options.method.toUpperCase() || "GET";
        key = `${method} ${baseUrl}${options.path || "/"}`;
    }

    if (allInterceptors[baseUrl] && allInterceptors[baseUrl].scopes.length > 0) {
        if (key) {
            for (let i = 0; i < allInterceptors[baseUrl].scopes.length; i++) {
                const interceptor = allInterceptors[baseUrl].scopes[i];
                if (interceptor._key === key) {
                    allInterceptors[baseUrl].scopes.splice(i, 1);
                    interceptor.scope.remove(key, interceptor);
                    break;
                }
            }
        } else {
            allInterceptors[baseUrl].scopes.length = 0;
        }

        return true;
    }

    return false;
};
//  Variable where we keep the ClientRequest we have overridden
//  (which might or might not be node's original http.ClientRequest)
let originalClientRequest;

const ErroringClientRequest = function (error) {
    if (http.OutgoingMessage) {
        http.OutgoingMessage.call(this);
    }
    process.nextTick(() => {
        this.emit("error", error);
    });
};

inherits(ErroringClientRequest, http.ClientRequest);

add.overrideClientRequest = () => {
    if (originalClientRequest) {
        throw new Error("Nock already overrode http.ClientRequest");
    }

    // ----- Extending http.ClientRequest

    const OverriddenClientRequest = function (options, cb) {
        OutgoingMessage.call(this);

        //  Filter the interceptors per request options.
        const interceptors = interceptorsFor(options);

        if (interceptors) {
            //  Use filtered interceptors to intercept requests.
            const overrider = __.requestOverrider(this, options, interceptors, remove, cb);
            for (const propName in overrider) {
                if (overrider.hasOwnProperty(propName)) {
                    this[propName] = overrider[propName];
                }
            }
        } else {
            //  Fallback to original ClientRequest if nock is off or the net connection is enabled.
            if (isEnabledForNetConnect(options)) {
                originalClientRequest.call(this, options, cb);
            } else {
                setImmediate(() => {
                    const error = new NetConnectNotAllowedError(options.host, options.path);
                    this.emit("error", error);
                });
            }
        }
    };
    inherits(OverriddenClientRequest, ClientRequest);

    //  Override the http module's request but keep the original so that we can use it and later restore it.
    //  NOTE: We only override http.ClientRequest as https module also uses it.
    originalClientRequest = ClientRequest;
    http.ClientRequest = OverriddenClientRequest;
};

add.restoreOverriddenClientRequest = () => {
    //  Restore the ClientRequest we have overridden.
    if (originalClientRequest) {
        http.ClientRequest = originalClientRequest;
        originalClientRequest = undefined;
    }
};

add.isActive = () => {

    //  If ClientRequest has been overwritten by Nock then originalClientRequest is not undefined.
    //  This means that Nock has been activated.
    return !is.undefined(originalClientRequest);

};

const interceptorScopes = () => {
    return Object.values(allInterceptors).reduce((result, interceptors) => {
        for (const interceptor in interceptors.scopes) {
            result = result.concat(interceptors.scopes[interceptor][nockScope]);
        }

        return result;
    }, []);
};

add.isDone = () => {
    return interceptorScopes().every((scope) => {
        return scope.isDone();
    });
};

add.pendingMocks = () => {
    return util.flatten(interceptorScopes().map((scope) => {
        return scope.pendingMocks();
    }));
};

add.activeMocks = () => {
    return util.flatten(interceptorScopes().map((scope) => {
        return scope.activeMocks();
    }));
};

add.activate = () => {
    if (originalClientRequest) {
        throw new Error("Nock already active");
    }

    add.overrideClientRequest();

    // ----- Overriding http.request and https.request:

    _util.overrideRequests((proto, overriddenRequest, options, callback) => {
        //  NOTE: overriddenRequest is already bound to its module.
        let req;
        let res;

        if (is.string(options)) {
            options = parse(options);
        }
        options.proto = proto;

        const interceptors = interceptorsFor(options);

        if (interceptors) {
            let matches = false;
            let allowUnmocked = false;

            matches = Boolean(interceptors.find((interceptor) => {
                return interceptor.matchIndependentOfBody(options);
            }));

            allowUnmocked = Boolean(interceptors.find((interceptor) => {
                return interceptor.options.allowUnmocked;
            }));

            if (!matches && allowUnmocked) {
                if (proto === "https") {
                    const ClientRequest = http.ClientRequest;
                    http.ClientRequest = originalClientRequest;
                    req = overriddenRequest(options, callback);
                    http.ClientRequest = ClientRequest;
                } else {
                    req = overriddenRequest(options, callback);
                }
                globalEmitter.emit("no match", req);
                return req;
            }

            //  NOTE: Since we already overrode the http.ClientRequest we are in fact constructing
            //    our own OverriddenClientRequest.
            req = new http.ClientRequest(options);

            res = __.requestOverrider(req, options, interceptors, remove);
            if (callback) {
                res.on("response", callback);
            }
            return req;
        }
        globalEmitter.emit("no match", options);
        if (isEnabledForNetConnect(options)) {
            return overriddenRequest(options, callback);
        }
        const error = new NetConnectNotAllowedError(options.host, options.path);
        return new ErroringClientRequest(error);
    });

};

add.activate();
