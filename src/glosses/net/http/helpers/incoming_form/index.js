import adone from "adone";
const {
    std: { string_decoder: { StringDecoder }, stream: { Stream }, os, path, crypto },
    EventEmitter, is, x, noop, fs, promise
} = adone;

const dummyParser = (self) => {
    return {
        end() {
            self.ended = true;
            self._maybeEnd();
            return null;
        }
    };
};

export default class IncomingForm extends EventEmitter {
    constructor(opts = {}) {
        super();

        this.error = null;
        this.ended = false;

        this.maxFields = opts.maxFields || 1000;
        this.maxFieldsSize = opts.maxFieldsSize || 2 * 1024 * 1024;
        this.maxFileSize = opts.maxFileSize || 2 * 1024 * 1024;
        this.keepExtensions = opts.keepExtensions || false;
        this.uploadDir = opts.uploadDir || os.tmpdir();
        this.encoding = opts.encoding || "utf-8";
        this.headers = null;
        this.type = null;
        this.hash = opts.hash || false;
        this.multiples = opts.multiples || false;

        this.bytesReceived = null;
        this.bytesExpected = null;

        this._parser = null;
        this._flushing = 0;
        this._fieldsSize = 0;
        this._fileSize = 0;
        this.openedFiles = [];
    }

    parse(req, cb) {
        this.pause = function pause() {
            try {
                req.pause();
            } catch (err) {
                // the stream was destroyed
                if (!this.ended) {
                    // before it was completed, crash & burn
                    this._error(err);
                }
                return false;
            }
            return true;
        };

        this.resume = function resume() {
            try {
                req.resume();
            } catch (err) {
                // the stream was destroyed
                if (!this.ended) {
                    // before it was completed, crash & burn
                    this._error(err);
                }
                return false;
            }

            return true;
        };

        // Setup callback first, so we don't miss anything from data events emitted
        // immediately.
        if (cb) {
            const fields = {};
            const files = {};
            this
                .on("field", (name, value) => {
                    fields[name] = value;
                })
                .on("file", (name, file) => {
                    if (this.multiples) {
                        if (files[name]) {
                            if (!is.array(files[name])) {
                                files[name] = [files[name]];
                            }
                            files[name].push(file);
                        } else {
                            files[name] = file;
                        }
                    } else {
                        files[name] = file;
                    }
                })
                .on("error", (err) => {
                    cb(err, fields, files);
                })
                .on("end", () => {
                    cb(null, fields, files);
                });
        }

        // Parse headers and setup the parser, ready to start listening for data.
        this.writeHeaders(req.headers);

        // Start listening for data.
        req
            .on("error", (err) => {
                this._error(err);
            })
            .on("aborted", () => {
                this.emit("aborted");
                this._error(new Error("Request aborted"));
            })
            .on("data", (buffer) => {
                this.write(buffer);
            })
            .on("end", () => {
                if (this.error) {
                    return;
                }

                const err = this._parser.end();
                if (err) {
                    this._error(err);
                }
            });

        return this;
    }

    writeHeaders(headers) {
        this.headers = headers;
        this._parseContentLength();
        this._parseContentType();
    }

    write(buffer) {
        if (this.error) {
            return;
        }
        if (!this._parser) {
            this._error(new x.IllegalState("uninitialized parser"));
            return;
        }

        this.bytesReceived += buffer.length;
        this.emit("progress", this.bytesReceived, this.bytesExpected);

        const bytesParsed = this._parser.write(buffer);
        if (bytesParsed !== buffer.length) {
            this._error(new x.IllegalState(`parser error, ${bytesParsed} of ${buffer.length} bytes parsed`));
        }

        return bytesParsed;
    }

    pause() {
        // this does nothing, unless overwritten in IncomingForm.parse
        return this;
    }

    resume() {
        // this does nothing, unless overwritten in IncomingForm.parse
        return this;
    }

    onPart(part) {
        // this method can be overwritten by the user
        this.handlePart(part);
    }

    handlePart(part) {
        if (is.undefined(part.filename)) {
            let value = "";
            const decoder = new StringDecoder(this.encoding);

            part.on("data", (buffer) => {
                this._fieldsSize += buffer.length;
                if (this._fieldsSize > this.maxFieldsSize) {
                    this._error(new x.IllegalState(`maxFieldsSize exceeded, received ${this._fieldsSize} bytes of field data`));
                    return;
                }
                value += decoder.write(buffer);
            });

            part.once("end", () => {
                this.emit("field", part.name, value);
            });
            return;
        }

        this._flushing++;

        const file = new IncomingForm.File({
            path: this._uploadPath(part.filename),
            name: part.filename,
            type: part.mime,
            hash: this.hash
        });

        this.emit("fileBegin", part.name, file);

        file.open();
        this.openedFiles.push(file);

        part.on("data", (buffer) => {
            this._fileSize += buffer.length;
            if (this._fileSize > this.maxFileSize) {
                this._error(new x.IllegalState(`maxFileSize exceeded, received ${this._fileSize} bytes of file data`));
                return;
            }
            if (buffer.length === 0) {
                return;
            }
            this.pause();
            file.write(buffer, () => {
                this.resume();
            });
        });

        part.on("end", () => {
            file.end(() => {
                this._flushing--;
                this.emit("file", part.name, file);
                this._maybeEnd();
            });
        });
    }

    _parseContentType() {
        if (this.bytesExpected === 0) {
            this._parser = dummyParser(this);
            return;
        }

        if (!this.headers["content-type"]) {
            this._error(new x.IllegalState("bad content-type header, no content-type"));
            return;
        }

        if (this.headers["content-type"].match(/octet-stream/i)) {
            this._initOctetStream();
            return;
        }

        if (this.headers["content-type"].match(/urlencoded/i)) {
            this._initUrlencoded();
            return;
        }

        if (this.headers["content-type"].match(/multipart/i)) {
            const m = this.headers["content-type"].match(/boundary=(?:"([^"]+)"|([^;]+))/i);
            if (m) {
                this._initMultipart(m[1] || m[2]);
            } else {
                this._error(new x.IllegalState("bad content-type header, no multipart boundary"));
            }
            return;
        }

        if (this.headers["content-type"].match(/json/i)) {
            this._initJSONencoded();
            return;
        }

        this._error(new x.Unknown(`bad content-type header, unknown content-type: ${this.headers["content-type"]}`));
    }

    _error(err) {
        if (this.error || this.ended) {
            return;
        }

        this.error = err;
        this.emit("error", err);

        if (is.array(this.openedFiles)) {
            this.openedFiles.forEach((file) => {
                file._writeStream.destroy();
                // delete files?
            });
        }
    }

    _parseContentLength() {
        this.bytesReceived = 0;
        if (this.headers["content-length"]) {
            this.bytesExpected = parseInt(this.headers["content-length"], 10);
        } else if (is.undefined(this.headers["transfer-encoding"])) {
            this.bytesExpected = 0;
        }

        if (!is.null(this.bytesExpected)) {
            this.emit("progress", this.bytesReceived, this.bytesExpected);
        }
    }

    _newParser() {
        return new IncomingForm.MultipartParser();
    }

    _initMultipart(boundary) {
        this.type = "multipart";

        const parser = new IncomingForm.MultipartParser();
        let headerField = null;
        let headerValue = null;
        let part = null;

        parser.initWithBoundary(boundary);

        parser.onPartBegin = () => {
            part = new Stream();
            part.readable = true;
            part.headers = {};
            part.name = null;
            part.filename = null;
            part.mime = null;

            part.transferEncoding = "binary";
            part.transferBuffer = "";

            headerField = "";
            headerValue = "";
        };

        parser.onHeaderField = (b, start, end) => {
            headerField += b.toString(this.encoding, start, end);
        };

        parser.onHeaderValue = (b, start, end) => {
            headerValue += b.toString(this.encoding, start, end);
        };

        parser.onHeaderEnd = () => {
            headerField = headerField.toLowerCase();
            part.headers[headerField] = headerValue;

            // matches either a quoted-string or a token (RFC 2616 section 19.5.1)
            const m = headerValue.match(/\bname=("([^"]*)"|([^\(\)<>@,;:\\"\/\[\]\?=\{\}\s\t/]+))/i);
            if (headerField === "content-disposition") {
                if (m) {
                    part.name = m[2] || m[3] || "";
                }

                part.filename = this._fileName(headerValue);
            } else if (headerField === "content-type") {
                part.mime = headerValue;
            } else if (headerField === "content-transfer-encoding") {
                part.transferEncoding = headerValue.toLowerCase();
            }

            headerField = "";
            headerValue = "";
        };

        parser.onHeadersEnd = () => {
            switch (part.transferEncoding) {
                case "binary":
                case "7bit":
                case "8bit": {
                    parser.onPartData = (b, start, end) => {
                        part.emit("data", b.slice(start, end));
                    };

                    parser.onPartEnd = () => {
                        part.emit("end");
                    };
                    break;
                }
                case "base64": {
                    parser.onPartData = (b, start, end) => {
                        part.transferBuffer += b.slice(start, end).toString("ascii");


                        // four bytes (chars) in base64 converts to three bytes in binary
                        // encoding. So we should always work with a number of bytes that
                        // can be divided by 4, it will result in a number of buytes that
                        // can be divided vy 3.
                        const offset = parseInt(part.transferBuffer.length / 4, 10) * 4;
                        part.emit("data", Buffer.from(part.transferBuffer.substring(0, offset), "base64"));
                        part.transferBuffer = part.transferBuffer.substring(offset);
                    };

                    parser.onPartEnd = function () {
                        part.emit("data", Buffer.from(part.transferBuffer, "base64"));
                        part.emit("end");
                    };
                    break;
                }
                default: {
                    return this._error(new x.Unknown(`unknown transfer-encoding: ${part.transferEncoding}`));
                }
            }

            this.onPart(part);
        };


        parser.onEnd = () => {
            this.ended = true;
            this._maybeEnd();
        };

        this._parser = parser;
    }

    _fileName(headerValue) {
        // matches either a quoted-string or a token (RFC 2616 section 19.5.1)
        const m = headerValue.match(/\bfilename=("(.*?)"|([^\(\)<>@,;:\\"\/\[\]\?=\{\}\s\t/]+))($|;\s)/i);
        if (!m) {
            return;
        }

        const match = m[2] || m[3] || "";
        let filename = match.substr(match.lastIndexOf("\\") + 1);
        filename = filename.replace(/%22/g, '"');
        filename = filename.replace(/&#([\d]{4});/g, (m, code) => String.fromCharCode(code));
        return filename;
    }

    _initUrlencoded() {
        this.type = "urlencoded";

        const parser = new IncomingForm.QuerystringParser(this.maxFields);

        parser.onField = (key, val) => {
            this.emit("field", key, val);
        };

        parser.onEnd = () => {
            this.ended = true;
            this._maybeEnd();
        };

        this._parser = parser;
    }

    _initOctetStream() {
        this.type = "octet-stream";
        const filename = this.headers["x-file-name"];
        const mime = this.headers["content-type"];

        const file = new IncomingForm.File({
            path: this._uploadPath(filename),
            name: filename,
            type: mime
        });

        this.emit("fileBegin", filename, file);
        file.open();

        this._flushing++;

        this._parser = new IncomingForm.OctetParser();

        //Keep track of writes that haven't finished so we don't emit the file before it's done being written
        let outstandingWrites = 0;

        this._parser.on("data", (buffer) => {
            this.pause();
            outstandingWrites++;

            file.write(buffer, () => {
                outstandingWrites--;
                this.resume();

                if (this.ended) {
                    this._parser.emit("doneWritingFile");
                }
            });
        });

        this._parser.on("end", () => {
            this._flushing--;
            this.ended = true;

            const done = () => {
                file.end(() => {
                    this.emit("file", "file", file);
                    this._maybeEnd();
                });
            };

            if (outstandingWrites === 0) {
                done();
            } else {
                this._parser.once("doneWritingFile", done);
            }
        });
    }

    _initJSONencoded = function () {
        this.type = "json";

        const parser = new IncomingForm.JSONParser(this);

        if (this.bytesExpected) {
            parser.initWithLength(this.bytesExpected);
        }

        parser.onField = (key, val) => {
            this.emit("field", key, val);
        };

        parser.onEnd = () => {
            this.ended = true;
            this._maybeEnd();
        };

        this._parser = parser;
    }

    _uploadPath(filename) {
        const buf = crypto.randomBytes(16);
        let name = `upload_${buf.toString("hex")}`;

        if (this.keepExtensions) {
            let ext = path.extname(filename);
            ext = ext.replace(/(\.[a-z0-9]+).*/i, "$1");

            name += ext;
        }

        return path.join(this.uploadDir, name);
    }

    _maybeEnd = function () {
        if (!this.ended || this._flushing || this.error) {
            return;
        }

        this.emit("end");
    }
}

adone.lazify({
    JSONParser: "./json_parser",
    MultipartParser: "./multipart_parser",
    OctetParser: "./octet_parser",
    QuerystringParser: "./querystring_parser",
    File: "./file"
}, IncomingForm, require);
