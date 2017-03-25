const safeMethods = { GET: true, HEAD: true, OPTIONS: true, TRACE: true };
const schemes = {};
// RFC7231§4.2.1: Of the request methods defined by this specification,
// the GET, HEAD, OPTIONS, and TRACE methods are defined to be safe.

// Create handlers that pass events from native requests
const eventHandlers = Object.create(null);
for (const event of ["abort", "aborte", "error", "socket"]) {
    eventHandlers[event] = function (arg) {
        this._redirectable.emit(event, arg);
    };
}

// An HTTP(S) request that can be redirected
class RedirectableRequest extends adone.std.stream.Writable {
    constructor(options, responseCallback) {
        super();
        this._options = options;
        this._redirectCount = 0;
        this._bufferedWrites = [];

        // Attach a callback if passed
        if (responseCallback) {
            this.on("response", responseCallback);
        }

        // React to responses of native requests
        this._onNativeResponse = (response) => this._processResponse(response);

        // Perform the first request
        this._performRequest();
    }

    // Executes the next native request (initial or redirect)
    _performRequest() {
        // If specified, use the agent corresponding to the protocol
        // (HTTP and HTTPS use different types of agents)
        const protocol = this._options.protocol;
        if (this._options.agents) {
            this._options.agent = this._options.agents[schemes[protocol]];
        }

        // Create the native request
        const nativeProtocol = this._options.protocol === "http:" ? adone.std.http : adone.std.https;
        const request = this._currentRequest = nativeProtocol.request(this._options, this._onNativeResponse);
        this._currentUrl = adone.std.url.format(this._options);

        // Set up event handlers
        request._redirectable = this;
        for (const event in eventHandlers) {
            if (event) {
                request.on(event, eventHandlers[event]);
            }
        }

        // End a redirected request
        // (The first request must be ended explicitly with RedirectableRequest#end)
        if (this._currentResponse) {
            // If the request doesn't have en entity, end directly.
            const bufferedWrites = this._bufferedWrites;
            if (bufferedWrites.length === 0) {
                request.end();
                // Otherwise, write the request entity and end afterwards.
            } else {
                let i = 0;
                (function writeNext() {
                    if (i < bufferedWrites.length) {
                        const bufferedWrite = bufferedWrites[i++];
                        request.write(bufferedWrite.data, bufferedWrite.encoding, writeNext);
                    } else {
                        request.end();
                    }
                })();
            }
        }
    }

    // Processes a response from the current native request
    _processResponse(response) {
        // RFC7231§6.4: The 3xx (Redirection) class of status code indicates
        // that further action needs to be taken by the user agent in order to
        // fulfill the request. If a Location header field is provided,
        // the user agent MAY automatically redirect its request to the URI
        // referenced by the Location field value,
        // even if the specific status code is not understood.
        const location = response.headers.location;
        if (location && this._options.followRedirects !== false && response.statusCode >= 300 && response.statusCode < 400) {
            // RFC7231§6.4: A client SHOULD detect and intervene
            // in cyclical redirections (i.e., "infinite" redirection loops).
            if (++this._redirectCount > this._options.maxRedirects) {
                return this.emit("error", new Error("Max redirects exceeded."));
            }

            // RFC7231§6.4: Automatic redirection needs to done with
            // care for methods not known to be safe […],
            // since the user might not wish to redirect an unsafe request.
            // RFC7231§6.4.7: The 307 (Temporary Redirect) status code indicates
            // that the target resource resides temporarily under a different URI
            // and the user agent MUST NOT change the request method
            // if it performs an automatic redirection to that URI.
            if (response.statusCode !== 307 && !(this._options.method in safeMethods)) {
                this._options.method = "GET";
                // Drop a possible entity and headers related to it
                this._bufferedWrites = [];
                for (const header in this._options.headers) {
                    if (/^content-/i.test(header)) {
                        delete this._options.headers[header];
                    }
                }
            }

            // Perform the redirected request
            const redirectUrl = adone.std.url.resolve(this._currentUrl, location);
            Object.assign(this._options, adone.std.url.parse(redirectUrl));
            this._currentResponse = response;
            this._performRequest();
        } else {
            // The response is not a redirect; return it as-is
            response.responseUrl = this._currentUrl;
            this.emit("response", response);

            // Clean up
            delete this._options;
            delete this._bufferedWrites;
        }
    }

    // Aborts the current native request
    abort() {
        this._currentRequest.abort();
    }

    // Flushes the headers of the current native request
    flushHeaders() {
        this._currentRequest.flushHeaders();
    }

    // Sets the noDelay option of the current native request
    setNoDelay(noDelay) {
        this._currentRequest.setNoDelay(noDelay);
    }

    // Sets the socketKeepAlive option of the current native request
    setSocketKeepAlive(enable, initialDelay) {
        this._currentRequest.setSocketKeepAlive(enable, initialDelay);
    }

    // Sets the timeout option of the current native request
    setTimeout(timeout, callback) {
        this._currentRequest.setTimeout(timeout, callback);
    }

    // Writes buffered data to the current native request
    _write(data, encoding, callback) {
        this._currentRequest.write(data, encoding, callback);
        this._bufferedWrites.push({ data, encoding });
    }

    // Ends the current native request
    end(data, encoding, callback) {
        this._currentRequest.end(data, encoding, callback);
        if (data) {
            this._bufferedWrites.push({ data, encoding });
        }
    }
}

const followRedirects = adone.lazify({
    http: () => wrapProtocol("http:"),
    https: () => wrapProtocol("https:")
}, {
    maxRedirects: 21
});

export default followRedirects;

// Export a redirecting wrapper for each native protocol

function wrapProtocol(protocol) {
    const scheme = protocol.substr(0, protocol.length - 1);
    const nativeProtocol = adone.std[scheme];
    const wrappedProtocol = Object.create(nativeProtocol);

    // Executes an HTTP request, following redirects
    wrappedProtocol.request = function (options, callback) {
        if (adone.is.string(options)) {
            options = adone.std.url.parse(options);
            options.maxRedirects = followRedirects.maxRedirects;
        } else {
            options = Object.assign({ maxRedirects: followRedirects.maxRedirects, protocol }, options);
        }
        adone.std.assert.equal(options.protocol, protocol, "protocol mismatch");

        return new RedirectableRequest(options, callback);
    };

    // Executes a GET request, following redirects
    wrappedProtocol.get = function (options, callback) {
        const request = wrappedProtocol.request(options, callback);
        request.end();
        return request;
    };
    return wrappedProtocol;
}
