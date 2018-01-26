const {
    is,
    data: {
        json
    },
    util: {
        querystring: qs,
        clone
    },
    fs,
    shani: {
        util: { nock }
    }
} = adone;

const __ = adone.private(nock);

const {
    util: _util
} = __;

const nockScopeKey = Symbol.for("adone.shani.util.nock.nockScopeKey");
const nockFilteredScope = Symbol.for("adone.shani.util.nock.nockFilterScope");

export default class Interceptor {
    constructor(scope, uri, method, requestBody, interceptorOptions) {
        this.scope = scope;
        this.interceptorMatchHeaders = [];
        this.method = method.toUpperCase();
        this.uri = uri;
        this._key = `${this.method} ${scope.basePath}${scope.basePathname}${is.string(uri) ? "" : "/"}${uri}`;
        this.basePath = this.scope.basePath;
        this.path = (is.string(uri)) ? scope.basePathname + uri : uri;

        this.baseUri = `${this.method} ${scope.basePath}${scope.basePathname}`;
        this.options = interceptorOptions || {};
        this.counter = 1;
        this._requestBody = requestBody;

        //  We use lower-case header field names throughout Nock.
        this.reqheaders = _util.headersFieldNamesToLowerCase((scope.scopeOptions && scope.scopeOptions.reqheaders) || {});
        this.badheaders = _util.headersFieldsArrayToLowerCase((scope.scopeOptions && scope.scopeOptions.badheaders) || []);


        this.delayInMs = 0;
        this.delayConnectionInMs = 0;

        this.optional = false;
    }

    optionally() {
        this.optional = true;
        return this;
    }

    replyWithError(errorMessage) {
        this.errorMessage = errorMessage;

        Object.assign(this.options, this.scope.options);

        this.scope.add(this._key, this, this.scope, this.scopeOptions);
        return this.scope;
    }

    reply(statusCode, body, rawHeaders) {
        if (arguments.length <= 2 && is.function(statusCode)) {
            body = statusCode;
            statusCode = 200;
        }

        this.statusCode = statusCode;

        Object.assign(this.options, this.scope.scopeOptions);

        // convert rawHeaders from Array to Object
        let headers = _util.headersArrayToObject(rawHeaders);

        if (this.scope._defaultReplyHeaders) {
            headers = headers || {};
            headers = Object.assign(clone(this.scope._defaultReplyHeaders), headers);
        }

        if (this.scope.date) {
            headers = headers || {};
            headers.date = this.scope.date.toUTCString();
        }

        if (!is.undefined(headers)) {
            this.rawHeaders = [];

            // makes sure all keys in headers are in lower case
            for (const key in headers) {
                if (headers.hasOwnProperty(key)) {
                    this.rawHeaders.push(key);
                    this.rawHeaders.push(headers[key]);
                }
            }

            //  We use lower-case headers throughout Nock.
            this.headers = _util.headersFieldNamesToLowerCase(headers);
        }

        //  If the content is not encoded we may need to transform the response body.
        //  Otherwise we leave it as it is.
        if (!_util.isContentEncoded(this.headers)) {
            if (body && !is.string(body) &&
                !is.function(body) &&
                !is.buffer(body) &&
                !is.stream(body)) {
                try {
                    body = json.encodeSafe(body);
                    if (!this.headers) {
                        this.headers = {};
                    }
                    if (!this.headers["content-type"]) {
                        this.headers["content-type"] = "application/json";
                    }
                    if (this.scope.contentLen) {
                        this.headers["content-length"] = body.length;
                    }
                } catch (err) {
                    throw new Error("Error encoding response body into JSON");
                }
            }
        }

        this.body = body;

        this.scope.add(this._key, this, this.scope, this.scopeOptions);
        return this.scope;
    }

    replyWithFile(statusCode, filePath, headers) {
        if (!fs) {
            throw new Error("No fs");
        }
        const readStream = fs.createReadStream(filePath);
        readStream.pause();
        this.filePath = filePath;
        return this.reply(statusCode, readStream, headers);
    }

    // Also match request headers
    // https://github.com/pgte/nock/issues/163
    reqheaderMatches(options, key) {
        //  We don't try to match request headers if these weren't even specified in the request.
        if (!options.headers) {
            return true;
        }

        const reqHeader = this.reqheaders[key];
        let header = options.headers[key];
        if (header && (!is.string(header)) && header.toString) {
            header = header.toString();
        }

        //  We skip 'host' header comparison unless it's available in both mock and actual request.
        //  This because 'host' may get inserted by Nock itself and then get recorder.
        //  NOTE: We use lower-case header field names throughout Nock.
        if (key === "host" &&
            (is.undefined(header) ||
                is.undefined(reqHeader))) {
            return true;
        }

        if (!is.undefined(reqHeader) && !is.undefined(header)) {
            if (is.function(reqHeader)) {
                return reqHeader(header);
            } else if (_util.matchStringOrRegexp(header, reqHeader)) {
                return true;
            }
        }

        return false;
    }

    match(options, body, hostNameOnly) {
        if (hostNameOnly) {
            return options.hostname === this.scope.urlParts.hostname;
        }

        const method = (options.method || "GET").toUpperCase();
        let path = options.path;
        let matches;
        let matchKey;
        const proto = options.proto;

        if (this.scope.transformPathFunction) {
            path = this.scope.transformPathFunction(path);
        }
        if (!is.string(body)) {
            body = body.toString();
        }
        if (this.scope.transformRequestBodyFunction) {
            body = this.scope.transformRequestBodyFunction(body, this._requestBody);
        }

        const checkHeaders = function (header) {
            if (is.function(header.value)) {
                return header.value(options.getHeader(header.name));
            }
            return _util.matchStringOrRegexp(options.getHeader(header.name), header.value);
        };

        if (!this.scope.matchHeaders.every(checkHeaders) ||
            !this.interceptorMatchHeaders.every(checkHeaders)) {
            return false;
        }

        const reqHeadersMatch =
            !this.reqheaders ||
            Object.keys(this.reqheaders).every(this.reqheaderMatches.bind(this, options));

        if (!reqHeadersMatch) {
            return false;
        }

        const reqheaderContains = (header) => is.propertyDefined(options.headers, header);

        const reqContainsBadHeaders =
            this.badheaders &&
            this.badheaders.some(reqheaderContains);

        if (reqContainsBadHeaders) {
            return false;
        }

        //  If we have a filtered scope then we use it instead reconstructing
        //  the scope from the request options (proto, host and port) as these
        //  two won't necessarily match and we have to remove the scope that was
        //  matched (vs. that was defined).
        if (this[nockFilteredScope]) {
            matchKey = this[nockFilteredScope];
        } else {
            matchKey = `${proto}://${options.host}`;
            if (
                options.port && options.host.indexOf(":") < 0 &&
                (options.port !== 80 || options.proto !== "http") &&
                (options.port !== 443 || options.proto !== "https")
            ) {
                matchKey += `:${options.port}`;
            }
        }

        // Match query strings when using query()
        let matchQueries = true;
        let queryIndex = -1;
        let queryString;
        let queries;

        if (this.queries) {
            queryIndex = path.indexOf("?");
            queryString = (queryIndex !== -1) ? path.slice(queryIndex + 1) : "";
            queries = qs.parse(queryString);

            // Only check for query string matches if this.queries is an object
            if (is.object(this.queries)) {

                if (is.function(this.queries)) {
                    matchQueries = this.queries(queries);
                } else {
                    // Make sure that you have an equal number of keys. We are
                    // looping through the passed query params and not the expected values
                    // if the user passes fewer query params than expected but all values
                    // match this will throw a false positive. Testing that the length of the
                    // passed query params is equal to the length of expected keys will prevent
                    // us from doing any value checking BEFORE we know if they have all the proper
                    // params
                    if (Object.keys(this.queries).length !== Object.keys(queries).length) {
                        matchQueries = false;
                    } else {
                        const self = this;
                        Object.entries(queries).forEach(function matchOneKeyVal([key, val]) {
                            const expVal = self.queries[key];
                            let isMatch = true;
                            if (is.undefined(val) || is.undefined(expVal)) {
                                isMatch = false;
                            } else if (expVal instanceof RegExp) {
                                isMatch = _util.matchStringOrRegexp(val, expVal);
                            } else if (is.object(expVal)) {
                                isMatch = is.deepEqual(val, expVal);
                            } else {
                                isMatch = _util.matchStringOrRegexp(val, expVal);
                            }
                            matchQueries = matchQueries && Boolean(isMatch);
                        });
                    }
                }
            }

            // Remove the query string from the path
            if (queryIndex !== -1) {
                path = path.substr(0, queryIndex);
            }
        }

        if (is.function(this.uri)) {
            matches = matchQueries &&
                `${method.toUpperCase()} ${proto}://${options.host}` === this.baseUri &&
                this.uri(path);
        } else {
            matches = method === this.method &&
                _util.matchStringOrRegexp(matchKey, this.basePath) &&
                _util.matchStringOrRegexp(path, this.path) &&
                matchQueries;
        }

        if (matches) {
            matches = (__.matchBody.call(options, this._requestBody, body));
        }

        return matches;
    }

    matchIndependentOfBody(options) {
        const isRegex = is.regexp(this[nockScopeKey]) && is.regexp(this.path);

        const method = (options.method || "GET").toUpperCase();
        let path = options.path;
        const proto = options.proto;

        // NOTE: Do not split off the query params as the regex could use them
        if (!isRegex) {
            path = path ? path.split("?")[0] : "";
        }

        if (this.scope.transformPathFunction) {
            path = this.scope.transformPathFunction(path);
        }

        const checkHeaders = function (header) {
            return options.getHeader && _util.matchStringOrRegexp(options.getHeader(header.name), header.value);
        };

        if (!this.scope.matchHeaders.every(checkHeaders) ||
            !this.interceptorMatchHeaders.every(checkHeaders)) {
            return false;
        }

        const comparisonKey = isRegex ? this[nockScopeKey] : this._key;
        const matchKey = `${method} ${proto}://${options.host}${path}`;

        if (isRegex) {
            return Boolean(matchKey.match(comparisonKey)) && Boolean(path.match(this.path));
        }

        return comparisonKey === matchKey;
    }

    filteringPath(fn) {
        if (is.function(fn)) {
            this.scope.transformFunction = fn;
        }
        return this;
    }

    discard() {
        if ((this.scope.shouldPersist() || this.counter > 0) && this.filePath) {
            this.body = fs.createReadStream(this.filePath);
            this.body.pause();
        }

        if (!this.scope.shouldPersist() && this.counter < 1) {
            this.scope.remove(this._key, this);
        }
    }

    matchHeader(name, value) {
        this.interceptorMatchHeaders.push({ name, value });
        return this;
    }

    basicAuth(options) {
        const username = options.user;
        const password = options.pass || "";
        const name = "authorization";
        const value = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
        this.interceptorMatchHeaders.push({ name, value });
        return this;
    }

    /**
     * Set query strings for the interceptor
     * @name query
     * @param Object Object of query string name,values (accepts regexp values)
     * @public
     * @example
     * // Will match 'http://zombo.com/?q=t'
     * nock('http://zombo.com').get('/').query({q: 't'});
     */
    query(queries) {
        this.queries = this.queries || {};
        // Allow all query strings to match this route
        if (queries === true) {
            this.queries = queries;
            return this;
        }

        if (is.function(queries)) {
            this.queries = queries;
            return this;
        }

        let stringFormattingFn;
        if (this.scope.scopeOptions.encodedQueryParams) {
            stringFormattingFn = _util.percentDecode;
        }

        for (const key in queries) {
            if (is.undefined(this.queries[key])) {
                const formattedPair = _util.formatQueryValue(key, queries[key], stringFormattingFn);
                this.queries[formattedPair[0]] = formattedPair[1];
            }
        }

        return this;
    }

    /**
     * Set number of times will repeat the interceptor
     * @name times
     * @param Integer Number of times to repeat (should be > 0)
     * @public
     * @example
     * // Will repeat mock 5 times for same king of request
     * nock('http://zombo.com).get('/').times(5).reply(200, 'Ok');
     */
    times(newCounter) {
        if (newCounter < 1) {
            return this;
        }

        this.counter = newCounter;

        return this;
    }

    /**
     * An sugar syntax for times(1)
     * @name once
     * @see {@link times}
     * @public
     * @example
     * nock('http://zombo.com).get('/').once.reply(200, 'Ok');
     */
    once() {
        return this.times(1);
    }

    /**
     * An sugar syntax for times(2)
     * @name twice
     * @see {@link times}
     * @public
     * @example
     * nock('http://zombo.com).get('/').twice.reply(200, 'Ok');
     */
    twice() {
        return this.times(2);
    }

    /**
     * An sugar syntax for times(3).
     * @name thrice
     * @see {@link times}
     * @public
     * @example
     * nock('http://zombo.com).get('/').thrice.reply(200, 'Ok');
     */
    thrice() {
        return this.times(3);
    }

    /**
     * Delay the response by a certain number of ms.
     *
     * @param {(integer|object)} opts - Number of milliseconds to wait, or an object
     * @param {integer} [opts.head] - Number of milliseconds to wait before response is sent
     * @param {integer} [opts.body] - Number of milliseconds to wait before response body is sent
     * @return {interceptor} - the current interceptor for chaining
     */
    delay(opts) {
        let headDelay = 0;
        let bodyDelay = 0;
        if (is.number(opts)) {
            headDelay = opts;
        } else if (is.object(opts)) {
            headDelay = opts.head || 0;
            bodyDelay = opts.body || 0;
        } else {
            throw new Error(`Unexpected input opts${opts}`);
        }

        return this.delayConnection(headDelay)
            .delayBody(bodyDelay);
    }

    /**
     * Delay the response body by a certain number of ms.
     *
     * @param {integer} ms - Number of milliseconds to wait before response is sent
     * @return {interceptor} - the current interceptor for chaining
     */
    delayBody(ms) {
        this.delayInMs += ms;
        return this;
    }

    /**
     * Delay the connection by a certain number of ms.
     *
     * @param  {integer} ms - Number of milliseconds to wait
     * @return {interceptor} - the current interceptor for chaining
     */
    delayConnection(ms) {
        this.delayConnectionInMs += ms;
        return this;
    }

    getTotalDelay() {
        return this.delayInMs + this.delayConnectionInMs;
    }

    /**
     * Make the socket idle for a certain number of ms (simulated).
     *
     * @param  {integer} ms - Number of milliseconds to wait
     * @return {interceptor} - the current interceptor for chaining
     */
    socketDelay(ms) {
        this.socketDelayInMs = ms;
        return this;
    }
}



