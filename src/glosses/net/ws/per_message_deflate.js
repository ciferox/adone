const {
    is,
    std: { zlib },
    util: { throttle },
    promise
} = adone;

const TRAILER = Buffer.from([0x00, 0x00, 0xff, 0xff]);
const EMPTY_BLOCK = Buffer.from([0x00]);
const kWriteInProgress = Symbol("write-in-progress");
const kPendingClose = Symbol("pending-close");
const kTotalLength = Symbol("total-length");
const kReject = Symbol("callback");
const kBuffers = Symbol("buffers");
const kError = Symbol("error");
const kOwner = Symbol("owner");

// We limit zlib concurrency, which prevents severe memory fragmentation
// as documented in https://github.com/nodejs/node/issues/8871#issuecomment-250915913
// and https://github.com/websockets/ws/issues/1202
//
// Intentionally global; it's the global thread pool that's
// an issue.
let zlibLimiter;


/**
 * The listener of the `zlib.DeflateRaw` stream `'data'` event.
 *
 * @param {Buffer} chunk A chunk of data
 * @private
 */
const deflateOnData = function (chunk) {
    this[kBuffers].push(chunk);
    this[kTotalLength] += chunk.length;
};

/**
 * The listener of the `zlib.InflateRaw` stream `'data'` event.
 *
 * @param {Buffer} chunk A chunk of data
 * @private
 */
const inflateOnData = function (chunk) {
    this[kTotalLength] += chunk.length;

    if (
        this[kOwner]._maxPayload < 1 ||
        this[kTotalLength] <= this[kOwner]._maxPayload
    ) {
        this[kBuffers].push(chunk);
        return;
    }

    this[kError] = new Error("Max payload size exceeded");
    this[kError].closeCode = 1009;
    this.removeListener("data", inflateOnData);
    this.reset();
};

/**
   * The listener of the `zlib.InflateRaw` stream `'error'` event.
   *
   * @param {Error} err The emitted error
   * @private
   */
const inflateOnError = function (err) {
    //
    // There is no need to call `Zlib#close()` as the handle is automatically
    // closed when an error is emitted.
    //
    this[kOwner]._inflate = null;
    this[kReject](err);
};


export default class PerMessageDeflate {
    constructor(options, isServer, maxPayload) {
        this._options = options || {};
        this._isServer = Boolean(isServer);
        this._inflate = null;
        this._deflate = null;
        this.params = null;
        this._maxPayload = maxPayload | 0;
        this._threshold = is.undefined(this._options.threshold) ? 1024 : this._options.threshold;

        if (!zlibLimiter) {
            const concurrency = !is.undefined(this._options.concurrencyLimit)
                ? this._options.concurrencyLimit
                : 10;
            zlibLimiter = throttle(concurrency);
        }
    }

    static get extensionName() {
        return "permessage-deflate";
    }

    offer() {
        const params = {};

        if (this._options.serverNoContextTakeover) {
            params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
            params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
            params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (is.nil(this._options.clientMaxWindowBits)) {
            params.client_max_window_bits = true;
        }

        return params;
    }

    accept(paramsList) {
        paramsList = this.normalizeParams(paramsList);

        let params;
        if (this._isServer) {
            params = this.acceptAsServer(paramsList);
        } else {
            params = this.acceptAsClient(paramsList);
        }

        this.params = params;
        return params;
    }

    cleanup() {
        if (this._inflate) {
            if (this._inflate[kWriteInProgress]) {
                this._inflate[kPendingClose] = true;
            } else {
                this._inflate.close();
                this._inflate = null;
            }
        }
        if (this._deflate) {
            if (this._deflate[kWriteInProgress]) {
                this._deflate[kPendingClose] = true;
            } else {
                this._deflate.close();
                this._deflate = null;
            }
        }
    }

    acceptAsServer(paramsList) {
        const accepted = {};
        const result = paramsList.some((params) => {
            if ((this._options.serverNoContextTakeover === false && params.server_no_context_takeover) ||
                (this._options.serverMaxWindowBits === false && params.server_max_window_bits) ||
                (is.number(this._options.serverMaxWindowBits) && is.number(params.server_max_window_bits) &&
                    this._options.serverMaxWindowBits > params.server_max_window_bits) ||
                (is.number(this._options.clientMaxWindowBits) && !params.client_max_window_bits)) {
                return undefined;
            }

            if (this._options.serverNoContextTakeover || params.server_no_context_takeover) {
                accepted.server_no_context_takeover = true;
            }
            if (this._options.clientNoContextTakeover || (this._options.clientNoContextTakeover !== false && params.client_no_context_takeover)) {
                accepted.client_no_context_takeover = true;
            }
            if (is.number(this._options.serverMaxWindowBits)) {
                accepted.server_max_window_bits = this._options.serverMaxWindowBits;
            } else if (is.number(params.server_max_window_bits)) {
                accepted.server_max_window_bits = params.server_max_window_bits;
            }
            if (is.number(this._options.clientMaxWindowBits)) {
                accepted.client_max_window_bits = this._options.clientMaxWindowBits;
            } else if (this._options.clientMaxWindowBits !== false && is.number(params.client_max_window_bits)) {
                accepted.client_max_window_bits = params.client_max_window_bits;
            }
            return true;
        });

        if (!result) {
            throw new Error("Doesn't support the offered configuration");
        }

        return accepted;
    }

    acceptAsClient(paramsList) {
        const params = paramsList[0];

        if (is.exist(this._options.clientNoContextTakeover)) {
            if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
                throw new Error('Invalid value for "client_no_context_takeover"');
            }
        }
        if (is.exist(this._options.clientMaxWindowBits)) {
            if (this._options.clientMaxWindowBits === false && params.client_max_window_bits) {
                throw new Error('Invalid value for "client_max_window_bits"');
            }
            if (is.number(this._options.clientMaxWindowBits) && (!params.client_max_window_bits || params.client_max_window_bits > this._options.clientMaxWindowBits)) {
                throw new Error('Invalid value for "client_max_window_bits"');
            }
        }

        return params;
    }

    normalizeParams(paramsList) {
        return paramsList.map((params) => {
            Object.keys(params).forEach((key) => {
                let value = params[key];
                if (value.length > 1) {
                    throw new Error(`Multiple extension parameters for ${key}`);
                }

                value = value[0];

                switch (key) {
                    case "server_no_context_takeover":
                    case "client_no_context_takeover":
                        if (value !== true) {
                            throw new Error(`Invalid extension parameter value for ${key} (${value})`);
                        }
                        params[key] = true;
                        break;
                    case "server_max_window_bits":
                    case "client_max_window_bits":
                        if (is.string(value)) {
                            value = parseInt(value, 10);
                            if (is.nan(value) || value < zlib.Z_MIN_WINDOWBITS || value > zlib.Z_MAX_WINDOWBITS) {
                                throw new Error(`Invalid extension parameter value for ${key} (${value})`);
                            }
                        }
                        if (!this._isServer && value === true) {
                            throw new Error(`Missing extension parameter value for ${key}`);
                        }
                        params[key] = value;
                        break;
                    default:
                        throw new Error(`Not defined extension parameter (${key})`);
                }
            });
            return params;
        });
    }

    decompress(data, fin, callback) {
        promise.nodeify(zlibLimiter(() => this._decompress(data, fin)), callback);
    }

    _decompress(data, fin) {
        return new Promise((resolve, reject) => {
            const endpoint = this._isServer ? "client" : "server";

            if (!this._inflate) {
                const key = `${endpoint}_max_window_bits`;
                const windowBits = !is.number(this.params[key])
                    ? zlib.Z_DEFAULT_WINDOWBITS
                    : this.params[key];

                this._inflate = zlib.createInflateRaw({ windowBits });
                this._inflate[kTotalLength] = 0;
                this._inflate[kBuffers] = [];
                this._inflate[kOwner] = this;
                this._inflate.on("error", inflateOnError);
                this._inflate.on("data", inflateOnData);
            }

            this._inflate[kReject] = reject;
            this._inflate[kWriteInProgress] = true;

            this._inflate.write(data);
            if (fin) {
                this._inflate.write(TRAILER);
            }

            this._inflate.flush(() => {
                const err = this._inflate[kError];

                if (err) {
                    this._inflate.close();
                    this._inflate = null;
                    reject(err);
                    return;
                }

                const data = adone.util.buffer.concat(
                    this._inflate[kBuffers],
                    this._inflate[kTotalLength]
                );

                if (
                    (fin && this.params[`${endpoint}_no_context_takeover`]) ||
                    this._inflate[kPendingClose]
                ) {
                    this._inflate.close();
                    this._inflate = null;
                } else {
                    this._inflate[kWriteInProgress] = false;
                    this._inflate[kTotalLength] = 0;
                    this._inflate[kBuffers] = [];
                }

                resolve(data);
            });
        });
    }

    compress(data, fin, callback) {
        promise.nodeify(zlibLimiter(() => this._compress(data, fin)), callback);
    }

    _compress(data, fin) {
        return new Promise((resolve, reject) => { // no reject, what?
            if (!data || data.length === 0) {
                resolve(EMPTY_BLOCK);
                return;
            }

            const endpoint = this._isServer ? "server" : "client";

            if (!this._deflate) {
                const key = `${endpoint}_max_window_bits`;
                const windowBits = !is.number(this.params[key])
                    ? zlib.Z_DEFAULT_WINDOWBITS
                    : this.params[key];

                this._deflate = zlib.createDeflateRaw({
                    memLevel: this._options.memLevel,
                    level: this._options.level,
                    flush: zlib.Z_SYNC_FLUSH,
                    windowBits
                });

                this._deflate[kTotalLength] = 0;
                this._deflate[kBuffers] = [];

                //
                // `zlib.DeflateRaw` emits an `'error'` event only when an attempt to use
                // it is made after it has already been closed. This cannot happen here,
                // so we only add a listener for the `'data'` event.
                //
                this._deflate.on("data", deflateOnData);
            }

            this._deflate[kWriteInProgress] = true;

            this._deflate.write(data);
            this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
                let data = adone.util.buffer.concat(
                    this._deflate[kBuffers],
                    this._deflate[kTotalLength]
                );

                if (fin) {
                    data = data.slice(0, data.length - 4);
                }

                if (
                    (fin && this.params[`${endpoint}_no_context_takeover`]) ||
                    this._deflate[kPendingClose]
                ) {
                    this._deflate.close();
                    this._deflate = null;
                } else {
                    this._deflate[kWriteInProgress] = false;
                    this._deflate[kTotalLength] = 0;
                    this._deflate[kBuffers] = [];
                }

                resolve(data);
            });
        });
    }
}
