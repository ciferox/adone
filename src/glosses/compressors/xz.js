const { assert, std: { stream, util } } = adone;

export const native = adone.bind("lzma.node");

const Stream = native.Stream;

Stream.curAsyncStreamsCount = 0;

Stream.prototype.getStream = function (options) {
    options = options || {};

    const _forceNextTickCb = function () {
        /* I know this looks like “magic/more magic”, but
         * apparently works around a bogus process.nextTick in
         * node v0.11. This probably does not affect real
         * applications which perform other I/O than LZMA compression. */
        setTimeout(function () { }, 1);
    };

    const Ret = function (nativeStream) {
        Ret.super_.call(this, options);
        const self = this;

        self.nativeStream = nativeStream;
        self.sync = (options.sync || !native.asyncCodeAvailable) ? true : false;
        self.chunkCallbacks = [];

        self.totalIn_ = 0;
        self.totalOut_ = 0;

        self._writingLastChunk = false;
        self._isFinished = false;

        self.totalIn = function () {
            return self.totalIn_;
        };
        self.totalOut = function () {
            return self.totalOut_;
        };

        self.cleanup = function () {
            if (self.nativeStream) {
                self.nativeStream.resetUnderlying();
            }

            self.nativeStream = null;
        };

        if (!self.sync) {
            Stream.curAsyncStreamsCount++;

            const oldCleanup = self.cleanup;
            let countedCleanup = false;
            self.cleanup = function () {
                if (countedCleanup === false) {
                    Stream.curAsyncStreamsCount--;
                    countedCleanup = true;
                }
                oldCleanup();
            };
        }

        // always clean up in case of error
        self.once("error-cleanup", self.cleanup);

        self.nativeStream.bufferHandler = function (buf, processedChunks, err, totalIn, totalOut) {
            if (totalIn !== null) {
                self.totalIn_ = totalIn;
                self.totalOut_ = totalOut;
            }

            process.nextTick(function () {
                if (err) {
                    self.push(null);
                    self.emit("error-cleanup", err);
                    self.emit("error", err);
                    _forceNextTickCb();
                }

                if (totalIn !== null) {
                    self.emit("progress", {
                        totalIn: self.totalIn_,
                        totalOut: self.totalOut_
                    });
                }

                if (typeof processedChunks === "number") {
                    assert.ok(processedChunks <= self.chunkCallbacks.length);

                    const chunkCallbacks = self.chunkCallbacks.splice(0, processedChunks);

                    while (chunkCallbacks.length > 0) {
                        chunkCallbacks.shift().apply(self);
                    }

                    _forceNextTickCb();
                } else if (buf === null) {
                    if (self._writingLastChunk) {
                        self.push(null);
                    } else {
                        // There may be additional members in the file.
                        // Reset and set _isFinished to tell `_flush()` that nothing
                        // needs to be done.
                        self._isFinished = true;

                        if (self.nativeStream && self.nativeStream._restart) {
                            self.nativeStream._restart();
                        } else {
                            self.push(null);
                        }
                    }
                } else {
                    self.push(buf);
                }
            });

            _forceNextTickCb();
        };

        // add all methods from the native Stream
        Object.keys(native.Stream.prototype).forEach(function (key) {
            self[key] = function () {
                return self.nativeStream[key].apply(self.nativeStream, arguments);
            };
        });

        Object.defineProperty(self, "bufsize", {
            get() {
                return self.setBufsize(null);
            },
            set(n) {
                if (typeof n !== "number" || n <= 0) {
                    throw new TypeError("bufsize must be a positive integer");
                }

                return self.setBufsize(parseInt(n));
            }
        });

        if (typeof options.bufsize !== "undefined") {
            return self.bufsize = options.bufsize;
        }
    };

    util.inherits(Ret, stream.Transform);

    Ret.prototype._transform = function (chunk, encoding, callback) {
        // Split the chunk at 'YZ'. This is used to have a clean boundary at the
        // end of each `.xz` file stream.
        let possibleEndIndex = bufferIndexOfYZ(chunk);
        if (possibleEndIndex !== -1) {
            possibleEndIndex += 2;
            if (possibleEndIndex !== chunk.length) {
                this._transform(chunk.slice(0, possibleEndIndex), encoding, function () {
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
    };

    Ret.prototype._writev = function (chunks, callback) {
        chunks = chunks.map(function (chunk) {
            return chunk.chunk;
        });
        this._write(Buffer.concat(chunks), null, callback);
    };

    Ret.prototype._flush = function (callback) {
        this._writingLastChunk = true;
        const cleanup = this.cleanup;

        if (this._isFinished) {
            cleanup();
            callback(null);
            return;
        }

        this._transform(null, null, function () {
            cleanup();
            callback.apply(this, arguments);
        });
    };

    return new Ret(this);
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

    if (typeof options.threads !== "undefined" && options.threads !== null) {
        return this.mtEncoder_(Object.assign({
            preset,
            filters: null,
            check
        }, options));
    } else {
        return this.easyEncoder_(preset, check);
    }
};

Stream.prototype.streamEncoder = function (options) {
    const filters = options.filters || [];
    const check = options.check || native.CHECK_CRC32;

    if (typeof options.threads !== "undefined" && options.threads !== null) {
        return this.mtEncoder_(Object.assign({
            preset: null,
            filters,
            check
        }, options));
    } else {
        return this.streamEncoder_(filters, check);
    }
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

/* helper functions for easy creation of streams */
export function createStream(coder, options) {
    if (["number", "object"].indexOf(typeof coder) !== -1 && !options) {
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
}

/* compatibility: LZMA-JS (https://github.com/nmrugg/LZMA-JS) */
export function singleStringCoding(stream, string, on_finish, on_progress) {
    on_progress = on_progress || function () { };
    on_finish = on_finish || function () { };

    // possibly our input is an array of byte integers
    // or a typed array
    if (!Buffer.isBuffer(string)) {
        string = new Buffer(string);
    }

    let failed = false;

    stream.once("error", function (err) {
        failed = true;
        on_finish(null, err);
    });

    const deferred = adone.promise.defer();

    stream.once("error", function (e) {
        deferred.reject(e);
    });

    const buffers = [];

    stream.on("data", function (b) {
        buffers.push(b);
    });

    stream.once("end", function () {
        const result = Buffer.concat(buffers);

        if (!failed) {
            on_progress(1.0);
            on_finish(result);
        }

        if (deferred) {
            deferred.resolve(result);
        }
    });

    on_progress(0.0);

    stream.end(string);

    return deferred.promise;
}

function skipLeadingZeroes(buffer) {
    let i;
    for (i = 0; i < buffer.length; i++) {
        if (buffer[i] !== 0x00) {
            break;
        }
    }

    return buffer.slice(i);
}

function bufferIndexOfYZ(chunk) {
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
}

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

    createStream,

    CHECK_CRC32: native.CHECK_CRC32,
    CHECK_CRC64: native.CHECK_CRC64,
    CHECK_NONE: native.CHECK_NONE,
    CHECK_SHA256: native.CHECK_SHA256,

    LZMA_TELL_NO_CHECK: native.LZMA_TELL_NO_CHECK,
    LZMA_TELL_UNSUPPORTED_CHECK: native.LZMA_TELL_UNSUPPORTED_CHECK,
    LZMA_TELL_ANY_CHECK: native.LZMA_TELL_ANY_CHECK,
    LZMA_CONCATENATED: native.LZMA_CONCATENATED,

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

    STREAM_HEADER_SIZE: native.STREAM_HEADER_SIZE
};

xz.compress = (buf, options = {}) => {
    return singleStringCoding(xz.compress.stream(options), buf);
};

xz.compress.stream = (options = {}) => {
    return createStream("easyEncoder", options);
};

// eslint-disable-next-line no-unused-vars
xz.compress.sync = (buf, options = {}) => {
    throw new adone.x.NotImplemented();
};

xz.decompress = (buf, options = {}) => {
    return singleStringCoding(xz.decompress.stream(options), buf);
};

xz.decompress.stream = (options = {}) => {
    return createStream("autoDecoder", options);
};

// eslint-disable-next-line no-unused-vars
xz.decompress.sync = (buf, options = {}) => {
    throw new adone.x.NotImplemented();
};

export default xz;
