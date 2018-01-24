const {
    is,
    stream: {
        CombinedStream
    },
    net: {
        http: {
            server: {
                helper: {
                    parseURL: parseUrl // TODO: it mustnt be inside "server"
                }
            }
        },
        mime
    },
    std: {
        util,
        http,
        https,
        path,
        fs
    }
} = adone;

const populate = (dst, src) => {
    // populates missing values

    Object.keys(src).forEach((prop) => {
        dst[prop] = dst[prop] || src[prop];
    });

    return dst;
};

/**
 * Create readable "multipart/form-data" streams.
 * Can be used to submit forms
 * and file uploads to other web applications.
 *
 * @constructor
 * @param {Object} options - Properties to be added/overriden for FormData and CombinedStream
 */
export default class FormData extends CombinedStream {
    constructor(options) {
        super();
        this._overheadLength = 0;
        this._valueLength = 0;
        this._valuesToMeasure = [];

        options = options || {};
        for (const option in options) {
            this[option] = options[option];
        }
    }

    append(field, value, options) {

        options = options || {};

        // allow filename as single option
        if (is.string(options)) {
            options = { filename: options };
        }

        // all that streamy business can't handle numbers
        if (is.number(value)) {
            value = String(value);
        }

        // https://github.com/felixge/node-form-data/issues/38
        if (util.isArray(value)) {
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
        if (!is.nil(options.knownLength)) {
            valueLength += Number(options.knownLength);
        } else if (is.buffer(value)) {
            valueLength = value.length;
        } else if (is.string(value)) {
            valueLength = Buffer.byteLength(value);
        }

        this._valueLength += valueLength;

        // @check why add CRLF? does this account for custom/multiple CRLFs?
        this._overheadLength += Buffer.byteLength(header) + FormData.LINE_BREAK.length;

        // empty or either doesn't have path or not an http response
        if (!value || ( !value.path && !(value.readable && value.hasOwnProperty("httpVersion")) )) {
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
            if (!is.nil(value.end) && value.end !== Infinity && !is.nil(value.start)) {

            // when end specified
            // no need to calculate range
            // inclusive, starts with 0
                callback(null, value.end + 1 - (value.start ? value.start : 0));

            // not that fast snoopy
            } else {
            // still need to fetch file size from fs
                fs.stat(value.path, (err, stat) => {
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
        if (is.string(options.header)) {
            return options.header;
        }

        const contentDisposition = this._getContentDisposition(value, options);
        const contentType = this._getContentType(value, options);

        let contents = "";
        const headers = {
            // add custom disposition as third element or keep it two elements if not
            "Content-Disposition": ["form-data", `name="${field}"`].concat(contentDisposition || []),
            // if no content type. allow it to be empty array
            "Content-Type": [].concat(contentType || [])
        };

        // allow custom headers.
        if (is.object(options.header)) {
            populate(headers, options.header);
        }

        let header;
        for (const prop in headers) {
            if (!headers.hasOwnProperty(prop)) {
                continue;
            }
            header = headers[prop];

            // skip nullish headers.
            if (is.nil(header)) {
                continue;
            }

            // convert all headers to arrays.
            if (!is.array(header)) {
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
        let filename;
        let contentDisposition;
        if (is.string(options.filepath)) {
            // custom filepath for relative paths
            filename = path.normalize(options.filepath).replace(/\\/g, "/");
        } else if (options.filename || value.name || value.path) {
            // custom filename take precedence
            // formidable and the browser add a name property
            // fs- and request- streams have path property
            filename = path.basename(options.filename || value.name || value.path);
        } else if (value.readable && value.hasOwnProperty("httpVersion")) {
            // or try http response
            filename = path.basename(value.client._httpMessage.path);
        }

        if (filename) {
            contentDisposition = `filename="${filename}"`;
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

        // or guess it from the filepath or filename
        if (!contentType && (options.filepath || options.filename)) {
            contentType = mime.lookup(options.filepath || options.filename);
        }

        // fallback to the default content type if `value` is not simple value
        if (!contentType && is.object(value) && !is.array(value) && !is.function(value)) {
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

        let i = 0;
        let err = null;
        const _cb = (_err, len) => {
            err = err || _err;
            knownLength += len;
            if (++i === this._valuesToMeasure.length) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, knownLength);
                }
            }
        };

        this._valuesToMeasure.forEach((x) => this._lengthRetriever(x, _cb));
    }

    submit(params, cb) {
        let request;
        let options;
        const defaults = { method: "post" };

        // parse provided url if it's string
        // or treat it as options object
        if (is.string(params)) {
            params = parseUrl({ url: params });
            options = populate({
                port: params.port,
                path: params.pathname,
                host: params.hostname,
                protocol: params.protocol
            }, defaults);

        // use custom params
        } else {

            options = populate(params, defaults);
            // if no port provided use default one
            if (!options.port) {
                options.port = options.protocol === "https:" ? 443 : 80;
            }
        }

        // put that good code in getHeaders to some use
        options.headers = this.getHeaders(params.headers);

        // https if specified, fallback to http in any other case
        if (options.protocol === "https:") {
            request = https.request(options);
        } else {
            request = http.request(options);
        }

        // get content length and fire away
        this.getLength((err, length) => {
            if (err) {
                this._error(err);
                return;
            }

            // add content length
            request.setHeader("Content-Length", length);

            this.pipe(request);
            if (cb) {
                request.on("error", cb);
                request.on("response", cb.bind(this, null));
            }
        });

        return request;
    }

    _error(err) {
        if (!this.error) {
            this.error = err;
            this.pause();
            this.emit("error", err);
        }
    }

    toString() {
        return "[object FormData]";
    }
}

FormData.LINE_BREAK = "\r\n";
FormData.DEFAULT_CONTENT_TYPE = "application/octet-stream";
