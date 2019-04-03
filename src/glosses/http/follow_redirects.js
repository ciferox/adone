const {
    assert,
    is,
    noop,
    std: { url, http, https, stream: { Writable } }
} = adone;
const URL = url.URL;

// RFC7231§4.2.1: Of the request methods defined by this specification,
// the GET, HEAD, OPTIONS, and TRACE methods are defined to be safe.
const SAFE_METHODS = { GET: true, HEAD: true, OPTIONS: true, TRACE: true };

// Create handlers that pass events from native requests
const eventHandlers = Object.create(null);
["abort", "aborted", "error", "socket", "timeout"].forEach((event) => {
    eventHandlers[event] = function (arg) {
        this._redirectable.emit(event, arg);
    };
});

const startTimer = (request, msecs) => {
    clearTimeout(request._timeout);
    request._timeout = setTimeout(() => {
        request.emit("timeout");
    }, msecs);
};

// An HTTP(S) request that can be redirected
class RedirectableRequest extends Writable {
    constructor(options, responseCallback) {
        // Initialize the request
        super();
        options.headers = options.headers || {};
        this._options = options;
        this._ended = false;
        this._ending = false;
        this._redirectCount = 0;
        this._redirects = [];
        this._requestBodyLength = 0;
        this._requestBodyBuffers = [];

        // Since http.request treats host as an alias of hostname,
        // but the url module interprets host as hostname plus port,
        // eliminate the host property to avoid confusion.
        if (options.host) {
            // Use hostname if set, because it has precedence
            if (!options.hostname) {
                options.hostname = options.host;
            }
            delete options.host;
        }

        // Attach a callback if passed
        if (responseCallback) {
            this.on("response", responseCallback);
        }

        // React to responses of native requests
        const self = this;
        this._onNativeResponse = function (response) {
            self._processResponse(response);
        };

        // Complete the URL object when necessary
        if (!options.pathname && options.path) {
            const searchPos = options.path.indexOf("?");
            if (searchPos < 0) {
                options.pathname = options.path;
            } else {
                options.pathname = options.path.substring(0, searchPos);
                options.search = options.path.substring(searchPos);
            }
        }

        // Perform the first request
        this._performRequest();
    }


    // Writes buffered data to the current native request
    write(data, encoding, callback) {
        // Writing is not allowed if end has been called
        if (this._ending) {
            throw new Error("write after end");
        }

        // Validate input and shift parameters if necessary
        if (!(is.string(data) || typeof data === "object" && ("length" in data))) {
            throw new Error("data should be a string, Buffer or Uint8Array");
        }
        if (is.function(encoding)) {
            callback = encoding;
            encoding = null;
        }

        // Ignore empty buffers, since writing them doesn't invoke the callback
        // https://github.com/nodejs/node/issues/22066
        if (data.length === 0) {
            if (callback) {
                callback();
            }
            return;
        }
        // Only write when we don't exceed the maximum body length
        if (this._requestBodyLength + data.length <= this._options.maxBodyLength) {
            this._requestBodyLength += data.length;
            this._requestBodyBuffers.push({ data, encoding });
            this._currentRequest.write(data, encoding, callback);
        }
        // Error when we exceed the maximum body length
        else {
            this.emit("error", new Error("Request body larger than maxBodyLength limit"));
            this.abort();
        }
    }

    // Ends the current native request
    end(data, encoding, callback) {
        // Shift parameters if necessary
        if (is.function(data)) {
            callback = data;
            data = encoding = null;
        } else if (is.function(encoding)) {
            callback = encoding;
            encoding = null;
        }

        // Write data if needed and end
        if (!data) {
            this._ended = this._ending = true;
            this._currentRequest.end(null, null, callback);
        } else {
            const self = this;
            const currentRequest = this._currentRequest;
            this.write(data, encoding, () => {
                self._ended = true;
                currentRequest.end(null, null, callback);
            });
            this._ending = true;
        }
    }

    // Sets a header value on the current native request
    setHeader(name, value) {
        this._options.headers[name] = value;
        this._currentRequest.setHeader(name, value);
    }

    // Clears a header value on the current native request
    removeHeader(name) {
        delete this._options.headers[name];
        this._currentRequest.removeHeader(name);
    }

    // Global timeout for all underlying requests
    setTimeout(msecs, callback) {
        if (callback) {
            this.once("timeout", callback);
        }

        if (this.socket) {
            startTimer(this, msecs);
        } else {
            const self = this;
            this._currentRequest.once("socket", () => {
                startTimer(self, msecs);
            });
        }

        this.once("response", () => clearTimeout(this._timeout));
        this.once("error", () => clearTimeout(this._timeout));

        return this;
    }


    // Executes the next native request (initial or redirect)
    _performRequest() {
        // Load the native protocol
        const protocol = this._options.protocol;
        const nativeProtocol = this._options.nativeProtocols[protocol];
        if (!nativeProtocol) {
            this.emit("error", new Error(`Unsupported protocol ${protocol}`));
            return;
        }

        // If specified, use the agent corresponding to the protocol
        // (HTTP and HTTPS use different types of agents)
        if (this._options.agents) {
            const scheme = protocol.substr(0, protocol.length - 1);
            this._options.agent = this._options.agents[scheme];
        }

        // Create the native request
        const request = this._currentRequest =
            nativeProtocol.request(this._options, this._onNativeResponse);
        this._currentUrl = url.format(this._options);

        // Set up event handlers
        request._redirectable = this;
        for (const event in eventHandlers) {
            /* istanbul ignore else */
            if (event) {
                request.on(event, eventHandlers[event]);
            }
        }

        // End a redirected request
        // (The first request must be ended explicitly with RedirectableRequest#end)
        if (this._isRedirect) {
            // Write the request entity and end.
            let i = 0;
            const self = this;
            const buffers = this._requestBodyBuffers;
            (function writeNext(error) {
                // Only write if this request has not been redirected yet
                /* istanbul ignore else */
                if (request === self._currentRequest) {
                    // Report any write errors
                    /* istanbul ignore if */
                    if (error) {
                        self.emit("error", error);
                    }
                    // Write the next buffer if there are still left
                    else if (i < buffers.length) {
                        const buffer = buffers[i++];
                        /* istanbul ignore else */
                        if (!request.finished) {
                            request.write(buffer.data, buffer.encoding, writeNext);
                        }
                    }
                    // End the request if `end` has been called on us
                    else if (self._ended) {
                        request.end();
                    }
                }
            }());
        }
    }

    // Processes a response from the current native request
    _processResponse(response) {
        // Store the redirected response
        if (this._options.trackRedirects) {
            this._redirects.push({
                url: this._currentUrl,
                headers: response.headers,
                statusCode: response.statusCode
            });
        }

        // RFC7231§6.4: The 3xx (Redirection) class of status code indicates
        // that further action needs to be taken by the user agent in order to
        // fulfill the request. If a Location header field is provided,
        // the user agent MAY automatically redirect its request to the URI
        // referenced by the Location field value,
        // even if the specific status code is not understood.
        const location = response.headers.location;
        if (location && this._options.followRedirects !== false &&
            response.statusCode >= 300 && response.statusCode < 400) {
            // Abort the current request
            this._currentRequest.removeAllListeners();
            this._currentRequest.on("error", noop);
            this._currentRequest.abort();

            // RFC7231§6.4: A client SHOULD detect and intervene
            // in cyclical redirections (i.e., "infinite" redirection loops).
            if (++this._redirectCount > this._options.maxRedirects) {
                this.emit("error", new Error("Max redirects exceeded"));
                return;
            }

            // RFC7231§6.4: Automatic redirection needs to done with
            // care for methods not known to be safe […],
            // since the user might not wish to redirect an unsafe request.
            // RFC7231§6.4.7: The 307 (Temporary Redirect) status code indicates
            // that the target resource resides temporarily under a different URI
            // and the user agent MUST NOT change the request method
            // if it performs an automatic redirection to that URI.
            let header;
            const headers = this._options.headers;
            if (response.statusCode !== 307 && !(this._options.method in SAFE_METHODS)) {
                this._options.method = "GET";
                // Drop a possible entity and headers related to it
                this._requestBodyBuffers = [];
                for (header in headers) {
                    if (/^content-/i.test(header)) {
                        delete headers[header];
                    }
                }
            }

            // Drop the Host header, as the redirect might lead to a different host
            if (!this._isRedirect) {
                for (header in headers) {
                    if (/^host$/i.test(header)) {
                        delete headers[header];
                    }
                }
            }

            // Perform the redirected request
            const redirectUrl = url.resolve(this._currentUrl, location);
            Object.assign(this._options, url.parse(redirectUrl));
            this._isRedirect = true;
            this._performRequest();

            // Discard the remainder of the response to avoid waiting for data
            response.destroy();
        } else {
            // The response is not a redirect; return it as-is
            response.responseUrl = this._currentUrl;
            response.redirects = this._redirects;
            this.emit("response", response);

            // Clean up
            this._requestBodyBuffers = [];
        }
    }
}

// Proxy all other public ClientRequest methods
[
    "abort", "flushHeaders", "getHeader",
    "setNoDelay", "setSocketKeepAlive"
].forEach((method) => {
    RedirectableRequest.prototype[method] = function (a, b) {
        return this._currentRequest[method](a, b);
    };
});

// Proxy all public ClientRequest properties
["aborted", "connection", "socket"].forEach((property) => {
    Object.defineProperty(RedirectableRequest.prototype, property, {
        get() {
            return this._currentRequest[property];
        }
    });
});


// from https://github.com/nodejs/node/blob/master/lib/internal/url.js
const urlToOptions = (urlObject) => {
    const options = {
        protocol: urlObject.protocol,
        hostname: urlObject.hostname.startsWith("[") ?
            /* istanbul ignore next */
            urlObject.hostname.slice(1, -1) :
            urlObject.hostname,
        hash: urlObject.hash,
        search: urlObject.search,
        pathname: urlObject.pathname,
        path: urlObject.pathname + urlObject.search,
        href: urlObject.href
    };
    if (urlObject.port !== "") {
        options.port = Number(urlObject.port);
    }
    return options;
};

// Wraps the key/value object of protocols with redirect functionality
const wrap = (protocols) => {
    // Default settings
    const exports = {
        maxRedirects: 21,
        maxBodyLength: 10 * 1024 * 1024
    };

    // Wrap each protocol
    const nativeProtocols = {};
    Object.keys(protocols).forEach((scheme) => {
        const protocol = `${scheme}:`;
        const nativeProtocol = nativeProtocols[protocol] = protocols[scheme];
        const wrappedProtocol = exports[scheme] = Object.create(nativeProtocol);

        // Executes a request, following redirects
        wrappedProtocol.request = function (input, options, callback) {
            // Parse parameters
            if (is.string(input)) {
                const urlStr = input;
                try {
                    input = urlToOptions(new URL(urlStr));
                } catch (err) {
                    /**
                     * istanbul ignore next
                     */
                    input = url.parse(urlStr);
                }
            } else if (URL && (input instanceof URL)) {
                input = urlToOptions(input);
            } else {
                callback = options;
                options = input;
                input = { protocol };
            }
            if (is.function(options)) {
                callback = options;
                options = null;
            }


            // Set defaults
            options = Object.assign({
                maxRedirects: exports.maxRedirects,
                maxBodyLength: exports.maxBodyLength
            }, input, options);
            options.nativeProtocols = nativeProtocols;

            assert.equal(options.protocol, protocol, "protocol mismatch");
            return new RedirectableRequest(options, callback);
        };

        // Executes a GET request, following redirects
        wrappedProtocol.get = function (input, options, callback) {
            const request = wrappedProtocol.request(input, options, callback);
            request.end();
            return request;
        };
    });
    return exports;
};

const wrapped = wrap({ http, https });
wrapped.wrap = wrap;

export default wrapped;
