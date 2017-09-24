const { is, assert, std: { stream } } = adone;

const native = adone.bind("lzma.node");

const { Stream } = native;

const skipLeadingZeroes = (buffer) => {
    let i;
    for (i = 0; i < buffer.length; i++) {
        if (buffer[i] !== 0x00) {
            break;
        }
    }

    return buffer.slice(i);
};

const bufferIndexOfYZ = (chunk) => {
    if (!chunk) {
        return -1;
    }

    if (chunk.indexOf) {
        return chunk.indexOf("YZ");
    }

    let i;
    for (i = 0; i < chunk.length - 1; i++) {
        if (chunk[i] === 0x59 && chunk[i + 1] === 0x5a) {
            return i;
        }
    }

    return -1;
};

Stream.curAsyncStreamsCount = 0;

class JSLzmaStream extends stream.Transform {
    constructor(nativeStream, options) {
        super(options);

        this.nativeStream = nativeStream;
        this.sync = (options.sync || !native.asyncCodeAvailable) ? true : false;
        this.chunkCallbacks = [];

        this.totalIn_ = 0;
        this.totalOut_ = 0;

        this._writingLastChunk = false;
        this._isFinished = false;

        if (!this.sync) {
            Stream.curAsyncStreamsCount++;

            const oldCleanup = this.cleanup;
            let countedCleanup = false;
            this.cleanup = () => {
                if (countedCleanup === false) {
                    Stream.curAsyncStreamsCount--;
                    countedCleanup = true;
                }
                oldCleanup.call(this);
            };
        }

        // always clean up in case of error
        this.once("error-cleanup", this.cleanup);

        this.nativeStream.bufferHandler = (buf, processedChunks, err, totalIn, totalOut) => {
            if (!is.null(totalIn)) {
                this.totalIn_ = totalIn;
                this.totalOut_ = totalOut;
            }

            setImmediate(() => {
                if (err) {
                    this.push(null);
                    this.emit("error-cleanup", err);
                    this.emit("error", err);
                    return;
                }

                if (!is.null(totalIn)) {
                    this.emit("progress", {
                        totalIn: this.totalIn_,
                        totalOut: this.totalOut_
                    });
                }

                if (is.number(processedChunks)) {
                    assert.ok(processedChunks <= this.chunkCallbacks.length);

                    const chunkCallbacks = this.chunkCallbacks.splice(0, processedChunks);

                    while (chunkCallbacks.length > 0) {
                        chunkCallbacks.shift().call(this);
                    }
                } else if (is.null(buf)) {
                    if (this._writingLastChunk) {
                        this.push(null);
                    } else {
                        // There may be additional members in the file.
                        // Reset and set _isFinished to tell `_flush()` that nothing
                        // needs to be done.
                        this._isFinished = true;

                        if (this.nativeStream && this.nativeStream._restart) {
                            this.nativeStream._restart();
                        } else {
                            this.push(null);
                        }
                    }
                } else {
                    this.push(buf);
                }
            });
        };

        if (!is.undefined(options.bufsize)) {
            this.bufsize = options.bufsize;
        }
    }

    get bufsize() {
        return this.setBufsize(null);
    }

    set bufsize(n) {
        if (!is.number(n) || n <= 0) {
            throw new TypeError("bufsize must be a positive number");
        }

        return this.setBufsize(n);
    }

    totalIn() {
        return this.totalIn_;
    }

    totalOut() {
        return this.totalOut_;
    }

    cleanup() {
        if (this.nativeStream) {
            this.nativeStream.resetUnderlying();
        }

        this.nativeStream = null;
    }

    _transform(chunk, encoding, callback) {
        // Split the chunk at 'YZ'. This is used to have a clean boundary at the
        // end of each `.xz` file stream.
        let possibleEndIndex = bufferIndexOfYZ(chunk);
        if (possibleEndIndex !== -1) {
            possibleEndIndex += 2;
            if (possibleEndIndex !== chunk.length) {
                this._transform(chunk.slice(0, possibleEndIndex), encoding, () => {
                    this._transform(chunk.slice(possibleEndIndex), encoding, callback);
                });

                return;
            }
        }

        if (this._isFinished && chunk) {
            chunk = skipLeadingZeroes(chunk);

            if (chunk.length > 0) {
                // Real data from a second stream member in the file!
                this._isFinished = false;
            }
        }

        if (chunk && chunk.length === 0) {
            return callback();
        }

        this.chunkCallbacks.push(callback);

        try {
            this.nativeStream.code(chunk, !this.sync);
        } catch (e) {
            this.emit("error-cleanup", e);
            this.emit("error", e);
        }
    }

    _writev(chunks, callback) {
        chunks = chunks.map((chunk) => chunk.chunk);
        this._write(Buffer.concat(chunks), null, callback);
    }

    _flush(callback) {
        this._writingLastChunk = true;

        if (this._isFinished) {
            this.cleanup();
            callback(null);
            return;
        }

        this._transform(null, null, function (...args) {
            this.cleanup();
            callback.apply(this, args);
        });
    }
}

// add all methods from the native Stream
Object.keys(Stream.prototype).forEach((key) => {
    JSLzmaStream.prototype[key] = function (...args) {
        return this.nativeStream[key].apply(this.nativeStream, args);
    };
});

Stream.prototype.getStream = function (options) {
    options = options || {};

    return new JSLzmaStream(this, options);
};

Stream.prototype.rawEncoder = function (options) {
    return this.rawEncoder_(options.filters || []);
};

Stream.prototype.rawDecoder = function (options) {
    return this.rawDecoder_(options.filters || []);
};

Stream.prototype.easyEncoder = function (options) {
    const preset = options.preset || native.PRESET_DEFAULT;
    const check = options.check || native.CHECK_CRC32;

    if (!is.undefined(options.threads) && !is.null(options.threads)) {
        return this.mtEncoder_(Object.assign({
            preset,
            filters: null,
            check
        }, options));
    }
    return this.easyEncoder_(preset, check);
};

Stream.prototype.streamEncoder = function (options) {
    const filters = options.filters || [];
    const check = options.check || native.CHECK_CRC32;

    if (!is.undefined(options.threads) && !is.null(options.threads)) {
        return this.mtEncoder_(Object.assign({
            preset: null,
            filters,
            check
        }, options));
    }
    return this.streamEncoder_(filters, check);
};

Stream.prototype.streamDecoder = function (options) {
    this._initOptions = options;
    this._restart = function () {
        this.resetUnderlying();
        this.streamDecoder(this._initOptions);
    };

    return this.streamDecoder_(options.memlimit || null, options.flags || 0);
};

Stream.prototype.autoDecoder = function (options) {
    this._initOptions = options;
    this._restart = function () {
        this.resetUnderlying();
        this.autoDecoder(this._initOptions);
    };

    return this.autoDecoder_(options.memlimit || null, options.flags || 0);
};

Stream.prototype.aloneDecoder = function (options) {
    return this.aloneDecoder_(options.memlimit || null);
};

const xz = {
    asyncCodeAvailable: native.asyncCodeAvailable,
    versionNumber: native.versionNumber,
    versionString: native.versionString,
    checkIsSupported: native.checkIsSupported,
    checkSize: native.checkSize,
    filterEncoderIsSupported: native.filterEncoderIsSupported,
    filterDecoderIsSupported: native.filterDecoderIsSupported,
    mfIsSupported: native.mfIsSupported,
    modeIsSupported: native.modeIsSupported,
    rawEncoderMemusage: native.rawEncoderMemusage,
    rawDecoderMemusage: native.rawDecoderMemusage,
    easyEncoderMemusage: native.easyEncoderMemusage,
    easyDecoderMemusage: native.easyDecoderMemusage,

    /* helper functions for easy creation of streams */
    createStream: (coder, options) => {
        if (["number", "object"].indexOf(typeof (coder)) !== -1 && !options) {
            options = coder;
            coder = null;
        }

        if (parseInt(options) === parseInt(options)) {
            options = { preset: parseInt(options) };
        }

        coder = coder || "easyEncoder";
        options = options || {};

        const stream = new Stream();
        stream[coder](options);

        if (options.memlimit) {
            stream.memlimitSet(options.memlimit);
        }

        return stream.getStream(options);
    },

    /* compatibility: LZMA-JS (https://github.com/nmrugg/LZMA-JS) */
    singleStringCoding: (stream, string, onFinish, onProgress) => {
        onProgress = onProgress || adone.noop;
        onFinish = onFinish || adone.noop;

        // possibly our input is an array of byte integers
        // or a typed array
        if (!is.buffer(string)) {
            string = Buffer.from(string);
        }

        let failed = false;

        stream.once("error", (err) => {
            failed = true;
            onFinish(null, err);
        });

        const deferred = adone.promise.defer();

        // Since using the Promise API is optional, generating unhandled rejections is not okay.
        deferred.promise.catch(adone.noop);

        stream.once("error", (e) => {
            deferred.reject(e);
        });

        const buffers = [];

        stream.on("data", (b) => {
            buffers.push(b);
        });

        stream.once("end", () => {
            const result = Buffer.concat(buffers);

            if (!failed) {
                onProgress(1.0);
                onFinish(result);
            }

            if (deferred) {
                deferred.resolve(result);
            }
        });

        onProgress(0.0);

        stream.end(string);

        return deferred.promise;
    },

    CHECK_CRC32: native.CHECK_CRC32,
    CHECK_CRC64: native.CHECK_CRC64,
    CHECK_NONE: native.CHECK_NONE,
    CHECK_SHA256: native.CHECK_SHA256,

    LZMA_TELL_NO_CHECK: native.TELL_NO_CHECK,
    LZMA_TELL_UNSUPPORTED_CHECK: native.TELL_UNSUPPORTED_CHECK,
    LZMA_TELL_ANY_CHECK: native.TELL_ANY_CHECK,
    LZMA_CONCATENATED: native.CONCATENATED,

    FILTERS_MAX: native.FILTERS_MAX,
    FILTER_ARM: native.FILTER_ARM,
    FILTER_ARMTHUMB: native.FILTER_ARMTHUMB,
    FILTER_IA64: native.FILTER_IA64,
    FILTER_POWERPC: native.FILTER_POWERPC,
    FILTER_SPARC: native.FILTER_SPARC,
    FILTER_X86: native.FILTER_X86,
    FILTER_DELTA: native.FILTER_DELTA,
    FILTER_LZMA1: native.FILTER_LZMA1,
    FILTER_LZMA2: native.FILTER_LZMA2,

    PRESET_EXTREME: native.PRESET_EXTREME,
    PRESET_DEFAULT: native.PRESET_DEFAULT,
    PRESET_LEVEL_MASK: native.PRESET_LEVEL_MASK,

    MF_HC3: native.MF_HC3,
    MF_HC4: native.MF_HC4,
    MF_BT2: native.MF_BT2,
    MF_BT3: native.MF_BT3,
    MF_BT4: native.MF_BT4,

    MODE_FAST: native.MODE_FAST,
    MODE_NORMAL: native.MODE_NORMAL,

    STREAM_HEADER_SIZE: native.STREAM_HEADER_SIZE,

    compress: (buf, options = {}) => {
        return xz.singleStringCoding(xz.compressStream(options), buf);
    },
    compressStream: (options = {}) => {
        return xz.createStream("easyEncoder", options);
    },
    // eslint-disable-next-line no-unused-vars
    compressSync: (buf, options = {}) => {
        throw new adone.x.NotImplemented();
    },
    decompress: (buf, options = {}) => {
        return xz.singleStringCoding(xz.decompressStream(options), buf);
    },
    decompressStream: (options = {}) => {
        return xz.createStream("autoDecoder", options);
    },
    // eslint-disable-next-line no-unused-vars
    decompressSync: (buf, options = {}) => {
        throw new adone.x.NotImplemented();
    }
};

export default xz;
