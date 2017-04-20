const { is, std, net: { mime } } = adone;
const asynckit = require("asynckit");

class DelayedStream extends std.stream.Stream {
    constructor() {
        super();
        this.source = null;
        this.dataSize = 0;
        this.maxDataSize = 1024 * 1024;
        this.pauseStream = true;

        this._maxDataSizeExceeded = false;
        this._released = false;
        this._bufferedEvents = [];
    }

    static create(source, options) {
        const delayedStream = new this();

        options = options || {};
        for (const option in options) {
            delayedStream[option] = options[option];
        }

        delayedStream.source = source;

        const realEmit = source.emit;
        source.emit = function () {
            delayedStream._handleEmit(arguments);
            return realEmit.apply(source, arguments);
        };

        source.on("error", () => { });
        if (delayedStream.pauseStream) {
            source.pause();
        }

        return delayedStream;
    }

    get readable() {
        return this.source.readable;
    }

    setEncoding() {
        return this.source.setEncoding.apply(this.source, arguments);
    }

    resume() {
        if (!this._released) {
            this.release();
        }

        this.source.resume();
    }

    pause() {
        this.source.pause();
    }

    release() {
        this._released = true;

        this._bufferedEvents.forEach((args) => {
            this.emit.apply(this, args);
        });
        this._bufferedEvents = [];
    }

    pipe(...args) {
        const r = super.pipe(this, ...args);
        this.resume();
        return r;
    }

    _handleEmit(args) {
        if (this._released) {
            this.emit.apply(this, args);
            return;
        }

        if (args[0] === "data") {
            this.dataSize += args[1].length;
            this._checkIfMaxDataSizeExceeded();
        }

        this._bufferedEvents.push(args);
    }

    _checkIfMaxDataSizeExceeded() {
        if (this._maxDataSizeExceeded) {
            return;
        }

        if (this.dataSize <= this.maxDataSize) {
            return;
        }

        this._maxDataSizeExceeded = true;
        const message = `DelayedStream#maxDataSize of ${this.maxDataSize} bytes exceeded.`;
        this.emit("error", new Error(message));
    }
}

class CombinedStream extends std.stream.Stream {
    constructor() {
        super();
        this.writable = false;
        this.readable = true;
        this.dataSize = 0;
        this.maxDataSize = 2 * 1024 * 1024;
        this.pauseStreams = true;

        this._released = false;
        this._streams = [];
        this._currentStream = null;
    }

    static create(options) {
        const combinedStream = new this();

        options = options || {};
        for (const option in options) {
            combinedStream[option] = options[option];
        }

        return combinedStream;
    }

    static isStreamLike(stream) {
        return (typeof stream !== "function")
            && (typeof stream !== "string")
            && (typeof stream !== "boolean")
            && (typeof stream !== "number")
            && (!Buffer.isBuffer(stream));
    }

    append(stream) {
        const isStreamLike = CombinedStream.isStreamLike(stream);

        if (isStreamLike) {
            if (!(stream instanceof DelayedStream)) {
                const newStream = DelayedStream.create(stream, {
                    maxDataSize: Infinity,
                    pauseStream: this.pauseStreams
                });
                stream.on("data", this._checkDataSize.bind(this));
                stream = newStream;
            }

            this._handleErrors(stream);

            if (this.pauseStreams) {
                stream.pause();
            }
        }

        this._streams.push(stream);
        return this;
    }

    pipe(dest, options) {
        super.pipe(this, dest, options);
        this.resume();
        return dest;
    }

    _getNext() {
        this._currentStream = null;
        const stream = this._streams.shift();


        if (typeof stream === "undefined") {
            this.end();
            return;
        }

        if (typeof stream !== "function") {
            this._pipeNext(stream);
            return;
        }

        const getStream = stream;
        getStream((stream) => {
            const isStreamLike = CombinedStream.isStreamLike(stream);
            if (isStreamLike) {
                stream.on("data", this._checkDataSize.bind(this));
                this._handleErrors(stream);
            }

            this._pipeNext(stream);
        });
    }

    _pipeNext(stream) {
        this._currentStream = stream;

        const isStreamLike = CombinedStream.isStreamLike(stream);
        if (isStreamLike) {
            stream.on("end", this._getNext.bind(this));
            stream.pipe(this, { end: false });
            return;
        }

        const value = stream;
        this.write(value);
        this._getNext();
    }

    _handleErrors(stream) {
        const self = this;
        stream.on("error", (err) => {
            self._emitError(err);
        });
    }

    write(data) {
        this.emit("data", data);
    }

    pause() {
        if (!this.pauseStreams) {
            return;
        }

        if (this.pauseStreams && this._currentStream && typeof (this._currentStream.pause) === "function") {
            this._currentStream.pause();
        }
        this.emit("pause");
    }

    resume() {
        if (!this._released) {
            this._released = true;
            this.writable = true;
            this._getNext();
        }

        if (this.pauseStreams && this._currentStream && typeof (this._currentStream.resume) === "function") {
            this._currentStream.resume();
        }
        this.emit("resume");
    }

    end() {
        this._reset();
        this.emit("end");
    }

    destroy() {
        this._reset();
        this.emit("close");
    }

    _reset() {
        this.writable = false;
        this._streams = [];
        this._currentStream = null;
    }

    _checkDataSize() {
        this._updateDataSize();
        if (this.dataSize <= this.maxDataSize) {
            return;
        }

        const message = `DelayedStream#maxDataSize of ${this.maxDataSize} bytes exceeded.`;
        this._emitError(new Error(message));
    }

    _updateDataSize() {
        this.dataSize = 0;

        const self = this;
        this._streams.forEach((stream) => {
            if (!stream.dataSize) {
                return;
            }

            self.dataSize += stream.dataSize;
        });

        if (this._currentStream && this._currentStream.dataSize) {
            this.dataSize += this._currentStream.dataSize;
        }
    }

    _emitError(err) {
        this._reset();
        this.emit("error", err);
    }
}


export default class FormData extends CombinedStream {
    constructor() {
        super();
        this._overheadLength = 0;
        this._valueLength = 0;
        this._valuesToMeasure = [];
    }

    append(field, value, options = {}) {
        // allow filename as single option
        if (is.string(options)) {
            options = { filename: options };
        }

        // all that streamy business can't handle numbers
        if (is.number(value)) {
            value = String(value);
        }

        // https://github.com/felixge/node-form-data/issues/38
        if (is.array(value)) {
            // Please convert your array into string
            // the way web server expects it
            this._error(new Error("Arrays are not supported."));
            return;
        }

        const header = this._multiPartHeader(field, value, options);
        const footer = this._multiPartFooter();

        super.append(header);
        super.append(value);
        super.append(footer);

        // pass along options.knownLength
        this._trackLength(header, value, options);
    }

    _trackLength(header, value, options) {
        let valueLength = 0;

        // used w/ getLengthSync(), when length is known.
        // e.g. for streaming directly from a remote server,
        // w/ a known file a size, and not wanting to wait for
        // incoming file to finish to get its size.
        if (options.knownLength != null) {
            valueLength += Number(options.knownLength);
        } else if (Buffer.isBuffer(value)) {
            valueLength = value.length;
        } else if (typeof value === "string") {
            valueLength = Buffer.byteLength(value);
        }

        this._valueLength += valueLength;

        // @check why add CRLF? does this account for custom/multiple CRLFs?
        this._overheadLength +=
            Buffer.byteLength(header) +
            FormData.LINE_BREAK.length;

        // empty or either doesn't have path or not an http response
        if (!value || (!value.path && !(value.readable && value.hasOwnProperty("httpVersion")))) {
            return;
        }

        // no need to bother with the length
        if (!options.knownLength) {
            this._valuesToMeasure.push(value);
        }
    }

    _lengthRetriever(value, callback) {
        if (value.hasOwnProperty("fd")) {
            // take read range into a account
            // `end` = Infinity –> read file till the end
            //
            // TODO: Looks like there is bug in Node fs.createReadStream
            // it doesn't respect `end` options without `start` options
            // Fix it when node fixes it.
            // https://github.com/joyent/node/issues/7819
            if (value.end !== undefined && value.end !== Infinity && value.start !== undefined) {
                // when end specified
                // no need to calculate range
                // inclusive, starts with 0
                callback(null, value.end + 1 - (value.start ? value.start : 0));

                // not that fast snoopy
            } else {
                // still need to fetch file size from fs
                std.fs.stat(value.path, (err, stat) => {
                    if (err) {
                        callback(err);
                        return;
                    }

                    // update final size based on the range options
                    const fileSize = stat.size - (value.start ? value.start : 0);
                    callback(null, fileSize);
                });
            }
            // or http response
        } else if (value.hasOwnProperty("httpVersion")) {
            callback(null, Number(value.headers["content-length"]));

            // or request stream http://github.com/mikeal/request
        } else if (value.hasOwnProperty("httpModule")) {
            // wait till response come back
            value.on("response", (response) => {
                value.pause();
                callback(null, Number(response.headers["content-length"]));
            });
            value.resume();

            // something else
        } else {
            callback("Unknown stream");
        }
    }

    _multiPartHeader(field, value, options) {
        // custom header specified (as string)?
        // it becomes responsible for boundary
        // (e.g. to handle extra CRLFs on .NET servers)
        if (typeof options.header === "string") {
            return options.header;
        }

        const contentDisposition = this._getContentDisposition(value, options);
        const contentType = this._getContentType(value, options);

        let contents = "";
        let headers = {
            // add custom disposition as third element or keep it two elements if not
            "Content-Disposition": ["form-data", `name="${field}"`].concat(contentDisposition || []),
            // if no content type. allow it to be empty array
            "Content-Type": [].concat(contentType || [])
        };

        // allow custom headers.
        if (typeof options.header === "object") {
            headers = Object.assign({}, options.header, headers);
        }

        let header;
        for (const prop in headers) {
            header = headers[prop];

            // skip nullish headers.
            if (header == null) {
                continue;
            }

            // convert all headers to arrays.
            if (!Array.isArray(header)) {
                header = [header];
            }

            // add non-empty headers.
            if (header.length) {
                contents += `${prop}: ${header.join("; ")}${FormData.LINE_BREAK}`;
            }
        }

        return `--${this.getBoundary()}${FormData.LINE_BREAK}${contents}${FormData.LINE_BREAK}`;
    }

    _getContentDisposition(value, options) {
        let contentDisposition;

        // custom filename takes precedence
        // fs- and request- streams have path property
        // formidable and the browser add a name property.
        let filename = options.filename || value.name || value.path;

        // or try http response
        if (!filename && value.readable && value.hasOwnProperty("httpVersion")) {
            filename = value.client._httpMessage.path;
        }

        if (filename) {
            contentDisposition = `filename="${std.path.basename(filename)}"`;
        }

        return contentDisposition;
    }

    _getContentType(value, options) {
        // use custom content-type above all
        let contentType = options.contentType;

        // or try `name` from formidable, browser
        if (!contentType && value.name) {
            contentType = mime.lookup(value.name);
        }

        // or try `path` from fs-, request- streams
        if (!contentType && value.path) {
            contentType = mime.lookup(value.path);
        }

        // or if it's http-reponse
        if (!contentType && value.readable && value.hasOwnProperty("httpVersion")) {
            contentType = value.headers["content-type"];
        }

        // or guess it from the filename
        if (!contentType && options.filename) {
            contentType = mime.lookup(options.filename);
        }

        // fallback to the default content type if `value` is not simple value
        if (!contentType && typeof value === "object") {
            contentType = FormData.DEFAULT_CONTENT_TYPE;
        }

        return contentType;
    }

    _multiPartFooter() {
        return function (next) {
            let footer = FormData.LINE_BREAK;

            const lastPart = (this._streams.length === 0);
            if (lastPart) {
                footer += this._lastBoundary();
            }

            next(footer);
        }.bind(this);
    }

    _lastBoundary() {
        return `--${this.getBoundary()}--${FormData.LINE_BREAK}`;
    }

    getHeaders(userHeaders) {
        let header;
        const formHeaders = {
            "content-type": `multipart/form-data; boundary=${this.getBoundary()}`
        };

        for (header in userHeaders) {
            if (userHeaders.hasOwnProperty(header)) {
                formHeaders[header.toLowerCase()] = userHeaders[header];
            }
        }

        return formHeaders;
    }

    getBoundary() {
        if (!this._boundary) {
            this._generateBoundary();
        }

        return this._boundary;
    }

    _generateBoundary() {
        // This generates a 50 character boundary similar to those used by Firefox.
        // They are optimized for boyer-moore parsing.
        let boundary = "--------------------------";
        for (let i = 0; i < 24; i++) {
            boundary += Math.floor(Math.random() * 10).toString(16);
        }

        this._boundary = boundary;
    }

    // Note: getLengthSync DOESN'T calculate streams length
    // As workaround one can calculate file size manually
    // and add it as knownLength option
    getLengthSync() {
        let knownLength = this._overheadLength + this._valueLength;

        // Don't get confused, there are 3 "internal" streams for each keyval pair
        // so it basically checks if there is any value added to the form
        if (this._streams.length) {
            knownLength += this._lastBoundary().length;
        }

        // https://github.com/form-data/form-data/issues/40
        if (!this.hasKnownLength()) {
            // Some async length retrievers are present
            // therefore synchronous length calculation is false.
            // Please use getLength(callback) to get proper length
            this._error(new Error("Cannot calculate proper length in synchronous way."));
        }

        return knownLength;
    }

    // Public API to check if length of added values is known
    // https://github.com/form-data/form-data/issues/196
    // https://github.com/form-data/form-data/issues/262
    hasKnownLength() {
        let hasKnownLength = true;

        if (this._valuesToMeasure.length) {
            hasKnownLength = false;
        }

        return hasKnownLength;
    }

    getLength(cb) {
        let knownLength = this._overheadLength + this._valueLength;

        if (this._streams.length) {
            knownLength += this._lastBoundary().length;
        }

        if (!this._valuesToMeasure.length) {
            process.nextTick(cb.bind(this, null, knownLength));
            return;
        }

        asynckit.parallel(this._valuesToMeasure, this._lengthRetriever, (err, values) => {
            if (err) {
                cb(err);
                return;
            }

            values.forEach((length) => {
                knownLength += length;
            });

            cb(null, knownLength);
        });
    }

    _error(err) {
        if (!this.error) {
            this.error = err;
            this.pause();
            this.emit("error", err);
        }
    }
}
FormData.LINE_BREAK = "\r\n";
FormData.DEFAULT_CONTENT_TYPE = "application/octet-stream";
