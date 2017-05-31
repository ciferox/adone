const { is, std: { zlib } } = adone;
const TRAILER = Buffer.from([0x00, 0x00, 0xff, 0xff]);
const EMPTY_BLOCK = Buffer.from([0x00]);

export default class PerMessageDeflate {
    constructor(options, isServer, maxPayload) {
        this._options = options || {};
        this._isServer = Boolean(isServer);
        this._inflate = null;
        this._deflate = null;
        this.params = null;
        this._maxPayload = maxPayload | 0;
        this._threshold = is.undefined(this._options.threshold) ? 1024 : this._options.threshold;
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
            if (this._inflate.writeInProgress) {
                this._inflate.pendingClose = true;
            } else {
                this._inflate.close();
                this._inflate = null;
            }
        }
        if (this._deflate) {
            if (this._deflate.writeInProgress) {
                this._deflate.pendingClose = true;
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
                            throw new Error(`invalid extension parameter value for ${key} (${value})`);
                        }
                        params[key] = true;
                        break;
                    case "server_max_window_bits":
                    case "client_max_window_bits":
                        if (is.string(value)) {
                            value = parseInt(value, 10);
                            if (is.nan(value) || value < zlib.Z_MIN_WINDOWBITS || value > zlib.Z_MAX_WINDOWBITS) {
                                throw new Error(`invalid extension parameter value for ${key} (${value})`);
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
        const endpoint = this._isServer ? "client" : "server";

        if (!this._inflate) {
            const key = `${endpoint}_max_window_bits`;
            const windowBits = !is.number(this.params[key]) ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];

            this._inflate = zlib.createInflateRaw({ windowBits });
        }
        this._inflate.writeInProgress = true;

        let totalLength = 0;
        const buffers = [];
        let err;

        const onData = (data) => {
            totalLength += data.length;
            if (this._maxPayload < 1 || totalLength <= this._maxPayload) {
                return buffers.push(data);
            }

            err = new Error("max payload size exceeded");
            err.closeCode = 1009;
            this._inflate.reset();
        };

        let cleanup = null;
        const onError = (err) => {
            cleanup();
            callback(err);
        };

        cleanup = () => {
            if (!this._inflate) {
                return;
            }

            this._inflate.removeListener("error", onError);
            this._inflate.removeListener("data", onData);
            this._inflate.writeInProgress = false;

            if (
                (fin && this.params[`${endpoint}_no_context_takeover`]) ||
                this._inflate.pendingClose
            ) {
                this._inflate.close();
                this._inflate = null;
            }
        };

        this._inflate.on("error", onError).on("data", onData);
        this._inflate.write(data);
        if (fin) {
            this._inflate.write(TRAILER);
        }

        this._inflate.flush(() => {
            cleanup();
            if (err) {
                callback(err);
            } else {
                callback(null, adone.util.buffer.concat(buffers, totalLength));
            }
        });
    }

    compress(data, fin, callback) {
        if (!data || data.length === 0) {
            process.nextTick(callback, null, EMPTY_BLOCK);
            return;
        }

        const endpoint = this._isServer ? "server" : "client";

        if (!this._deflate) {
            const key = `${endpoint}_max_window_bits`;
            const windowBits = !is.number(this.params[key]) ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];

            this._deflate = zlib.createDeflateRaw({
                memLevel: this._options.memLevel,
                flush: zlib.Z_SYNC_FLUSH,
                windowBits
            });
        }
        this._deflate.writeInProgress = true;

        let totalLength = 0;
        const buffers = [];

        const onData = (data) => {
            totalLength += data.length;
            buffers.push(data);
        };

        let cleanup = null;
        const onError = (err) => {
            cleanup();
            callback(err);
        };

        cleanup = () => {
            if (!this._deflate) {
                return;
            }

            this._deflate.removeListener("error", onError);
            this._deflate.removeListener("data", onData);
            this._deflate.writeInProgress = false;

            if (
                (fin && this.params[`${endpoint}_no_context_takeover`]) ||
                this._deflate.pendingClose
            ) {
                this._deflate.close();
                this._deflate = null;
            }
        };

        this._deflate.on("error", onError).on("data", onData);
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
            cleanup();
            let data = adone.util.buffer.concat(buffers, totalLength);
            if (fin) {
                data = data.slice(0, data.length - 4);
            }
            callback(null, data);
        });
    }
}
