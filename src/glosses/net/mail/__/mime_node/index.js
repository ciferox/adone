const { is, x, std: { crypto, os, fs, punycode, stream: { PassThrough } }, net: { mail: { __ } } } = adone;

/**
 * Creates a new mime tree node. Assumes 'multipart/*' as the content type
 * if it is a branch, anything else counts as leaf. If rootNode is missing from
 * the options, assumes this is the root.
 *
 * @param {String} contentType Define the content type for the node. Can be left blank for attachments (derived from filename)
 * @param {Object} [options] optional options
 * @param {Object} [options.rootNode] root node for this tree
 * @param {Object} [options.parentNode] immediate parent for this node
 * @param {Object} [options.filename] filename for an attachment node
 * @param {String} [options.baseBoundary] shared part of the unique multipart boundary
 * @param {Boolean} [options.keepBcc] If true, do not exclude Bcc from the generated headers
 * @param {String} [options.textEncoding] either 'Q' (the default) or 'B'
 */
export default class MimeNode {
    constructor(contentType, options) {
        this.nodeCounter = 0;

        options = options || {};

        /**
         * shared part of the unique multipart boundary
         */
        this.baseBoundary = options.baseBoundary || crypto.randomBytes(8).toString("hex");
        this.boundaryPrefix = options.boundaryPrefix || "--_NmP";

        this.disableFileAccess = Boolean(options.disableFileAccess);
        this.disableUrlAccess = Boolean(options.disableUrlAccess);

        /**
         * If date headers is missing and current node is the root, this value is used instead
         */
        this.date = new Date();

        /**
         * Root node for current mime tree
         */
        this.rootNode = options.rootNode || this;

        /**
         * If true include Bcc in generated headers (if available)
         */
        this.keepBcc = Boolean(options.keepBcc);

        /**
         * If filename is specified but contentType is not (probably an attachment)
         * detect the content type from filename extension
         */
        if (options.filename) {
            /**
             * Filename for this node. Useful with attachments
             */
            this.filename = options.filename;
            if (!contentType) {
                contentType = __.mimeFuncs.detectMimeType(this.filename.split(".").pop());
            }
        }

        /**
         * Indicates which encoding should be used for header strings: "Q" or "B"
         */
        this.textEncoding = (options.textEncoding || "").toString().trim().charAt(0).toUpperCase();

        /**
         * Immediate parent for this node (or undefined if not set)
         */
        this.parentNode = options.parentNode;

        /**
         * Hostname for default message-id values
         */
        this.hostname = options.hostname;

        /**
         * An array for possible child nodes
         */
        this.childNodes = [];

        /**
         * Used for generating unique boundaries (prepended to the shared base)
         */
        this._nodeId = ++this.rootNode.nodeCounter;

        /**
         * A list of header values for this node in the form of [{key:'', value:''}]
         */
        this._headers = [];

        /**
         * True if the content only uses ASCII printable characters
         * @type {Boolean}
         */
        this._isPlainText = false;

        /**
         * True if the content is plain text but has longer lines than allowed
         * @type {Boolean}
         */
        this._hasLongLines = false;

        /**
         * If set, use instead this value for envelopes instead of generating one
         * @type {Boolean}
         */
        this._envelope = false;

        /**
         * If set then use this value as the stream content instead of building it
         * @type {String|Buffer|Stream}
         */
        this._raw = false;

        /**
         * Additional transform streams that the message will be piped before
         * exposing by createReadStream
         * @type {Array}
         */
        this._transforms = [];

        /**
         * Additional process functions that the message will be piped through before
         * exposing by createReadStream. These functions are run after transforms
         * @type {Array}
         */
        this._processFuncs = [];

        /**
         * If content type is set (or derived from the filename) add it to headers
         */
        if (contentType) {
            this.setHeader("Content-Type", contentType);
        }
    }

    /////// PUBLIC METHODS

    /**
     * Creates and appends a child node.Arguments provided are passed to MimeNode constructor
     *
     * @param {String} [contentType] Optional content type
     * @param {Object} [options] Optional options object
     * @return {Object} Created node object
     */
    createChild(contentType, options) {
        if (!options && is.object(contentType)) {
            options = contentType;
            contentType = undefined;
        }
        const node = new MimeNode(contentType, options);
        this.appendChild(node);
        return node;
    }

    /**
     * Appends an existing node to the mime tree. Removes the node from an existing
     * tree if needed
     *
     * @param {Object} childNode node to be appended
     * @return {Object} Appended node object
     */
    appendChild(childNode) {

        if (childNode.rootNode !== this.rootNode) {
            childNode.rootNode = this.rootNode;
            childNode._nodeId = ++this.rootNode.nodeCounter;
        }

        childNode.parentNode = this;

        this.childNodes.push(childNode);
        return childNode;
    }

    /**
     * Replaces current node with another node
     *
     * @param {Object} node Replacement node
     * @return {Object} Replacement node
     */
    replace(node) {
        if (node === this) {
            return this;
        }

        this.parentNode.childNodes.forEach((childNode, i) => {
            if (childNode === this) {

                node.rootNode = this.rootNode;
                node.parentNode = this.parentNode;
                node._nodeId = this._nodeId;

                this.rootNode = this;
                this.parentNode = undefined;

                node.parentNode.childNodes[i] = node;
            }
        });

        return node;
    }

    /**
     * Removes current node from the mime tree
     *
     * @return {Object} removed node
     */
    remove() {
        if (!this.parentNode) {
            return this;
        }

        for (let i = this.parentNode.childNodes.length - 1; i >= 0; i--) {
            if (this.parentNode.childNodes[i] === this) {
                this.parentNode.childNodes.splice(i, 1);
                this.parentNode = undefined;
                this.rootNode = this;
                return this;
            }
        }
    }

    /**
     * Sets a header value. If the value for selected key exists, it is overwritten.
     * You can set multiple values as well by using [{key:'', value:''}] or
     * {key: 'value'} as the first argument.
     *
     * @param {String|Array|Object} key Header key or a list of key value pairs
     * @param {String} value Header value
     * @return {Object} current node
     */
    setHeader(key, value) {
        let added = false;

        // Allow setting multiple headers at once
        if (!value && key && is.object(key)) {
            if (key.key && "value" in key) {
                // allow {key:'content-type', value: 'text/plain'}
                this.setHeader(key.key, key.value);
            } else if (is.array(key)) {
                // allow [{key:'content-type', value: 'text/plain'}]
                key.forEach((i) => {
                    this.setHeader(i.key, i.value);
                });
            } else {
                // allow {'content-type': 'text/plain'}
                Object.keys(key).forEach((i) => {
                    this.setHeader(i, key[i]);
                });
            }
            return this;
        }

        key = this._normalizeHeaderKey(key);

        const headerValue = {
            key,
            value
        };

        // Check if the value exists and overwrite
        for (let i = 0, len = this._headers.length; i < len; i++) {
            if (this._headers[i].key === key) {
                if (!added) {
                    // replace the first match
                    this._headers[i] = headerValue;
                    added = true;
                } else {
                    // remove following matches
                    this._headers.splice(i, 1);
                    i--;
                    len--;
                }
            }
        }

        // match not found, append the value
        if (!added) {
            this._headers.push(headerValue);
        }

        return this;
    }

    /**
     * Adds a header value. If the value for selected key exists, the value is appended
     * as a new field and old one is not touched.
     * You can set multiple values as well by using [{key:'', value:''}] or
     * {key: 'value'} as the first argument.
     *
     * @param {String|Array|Object} key Header key or a list of key value pairs
     * @param {String} value Header value
     * @return {Object} current node
     */
    addHeader(key, value) {

        // Allow setting multiple headers at once
        if (!value && key && is.object(key)) {
            if (key.key && key.value) {
                // allow {key:'content-type', value: 'text/plain'}
                this.addHeader(key.key, key.value);
            } else if (is.array(key)) {
                // allow [{key:'content-type', value: 'text/plain'}]
                key.forEach((i) => {
                    this.addHeader(i.key, i.value);
                });
            } else {
                // allow {'content-type': 'text/plain'}
                Object.keys(key).forEach((i) => {
                    this.addHeader(i, key[i]);
                });
            }
            return this;
        } else if (is.array(value)) {
            value.forEach((val) => {
                this.addHeader(key, val);
            });
            return this;
        }

        this._headers.push({
            key: this._normalizeHeaderKey(key),
            value
        });

        return this;
    }

    /**
     * Retrieves the first mathcing value of a selected key
     *
     * @param {String} key Key to search for
     * @retun {String} Value for the key
     */
    getHeader(key) {
        key = this._normalizeHeaderKey(key);
        for (let i = 0, len = this._headers.length; i < len; i++) {
            if (this._headers[i].key === key) {
                return this._headers[i].value;
            }
        }
    }

    /**
     * Sets body content for current node. If the value is a string, charset is added automatically
     * to Content-Type (if it is text/*). If the value is a Buffer, you need to specify
     * the charset yourself
     *
     * @param (String|Buffer) content Body content
     * @return {Object} current node
     */
    setContent(content) {
        this.content = content;
        if (is.stream(this.content)) {
            // pre-stream handler. might be triggered if a stream is set as content
            // and 'error' fires before anything is done with this stream
            this._contentErrorHandler = (err) => {
                this.content.removeListener("error", this._contentErrorHandler);
                this.content = err;
            };
            this.content.once("error", this._contentErrorHandler);
        } else if (is.string(this.content)) {
            this._isPlainText = __.mimeFuncs.isPlainText(this.content);
            if (this._isPlainText && __.mimeFuncs.hasLongerLines(this.content, 76)) {
                // If there are lines longer than 76 symbols/bytes do not use 7bit
                this._hasLongLines = true;
            }
        }
        return this;
    }

    build(callback) {
        const stream = this.createReadStream();
        const buf = [];
        let buflen = 0;
        let returned = false;

        stream.on("readable", () => {
            for (; ;) {
                const chunk = stream.read();
                if (is.null(chunk)) {
                    break;
                }
                buf.push(chunk);
                buflen += chunk.length;
            }
        });

        stream.once("error", (err) => {
            if (returned) {
                return;
            }
            returned = true;

            return callback(err);
        });

        stream.once("end", (chunk) => {
            if (returned) {
                return;
            }
            returned = true;

            if (chunk && chunk.length) {
                buf.push(chunk);
                buflen += chunk.length;
            }
            return callback(null, Buffer.concat(buf, buflen));
        });
    }

    getTransferEncoding() {
        let transferEncoding = false;
        const contentType = (this.getHeader("Content-Type") || "").toString().toLowerCase().trim();

        if (this.content) {
            transferEncoding = (this.getHeader("Content-Transfer-Encoding") || "").toString().toLowerCase().trim();
            if (!transferEncoding || !["base64", "quoted-printable"].includes(transferEncoding)) {
                if (/^text\//i.test(contentType)) {
                    // If there are no special symbols, no need to modify the text
                    if (this._isPlainText && !this._hasLongLines) {
                        transferEncoding = "7bit";
                    } else if (is.string(this.content) || is.buffer(this.content)) {
                        // detect preferred encoding for string value
                        transferEncoding = this._getTextEncoding(this.content) === "Q" ? "quoted-printable" : "base64";
                    } else {
                        // we can not check content for a stream, so either use preferred encoding or fallback to QP
                        transferEncoding = this.transferEncoding === "B" ? "base64" : "quoted-printable";
                    }
                } else if (!/^(multipart|message)\//i.test(contentType)) {
                    transferEncoding = transferEncoding || "base64";
                }
            }
        }
        return transferEncoding;
    }

    /**
     * Builds the header block for the mime node. Append \r\n\r\n before writing the content
     *
     * @returns {String} Headers
     */
    buildHeaders() {
        const transferEncoding = this.getTransferEncoding();
        const headers = [];

        if (transferEncoding) {
            this.setHeader("Content-Transfer-Encoding", transferEncoding);
        }

        if (this.filename && !this.getHeader("Content-Disposition")) {
            this.setHeader("Content-Disposition", "attachment");
        }

        // Ensure mandatory header fields
        if (this.rootNode === this) {
            if (!this.getHeader("Date")) {
                this.setHeader("Date", this.date.toUTCString().replace(/GMT/, "+0000"));
            }

            // ensure that Message-Id is present
            this.messageId();

            if (!this.getHeader("MIME-Version")) {
                this.setHeader("MIME-Version", "1.0");
            }
        }

        this._headers.forEach((header) => {
            const key = header.key;
            let value = header.value;
            let structured;
            let param;
            const options = {};
            const formattedHeaders = ["From", "Sender", "To", "Cc", "Bcc", "Reply-To", "Date", "References"];

            if (value && is.object(value) && !formattedHeaders.includes(key)) {
                Object.keys(value).forEach((key) => {
                    if (key !== "value") {
                        options[key] = value[key];
                    }
                });
                value = (value.value || "").toString();
                if (!value.trim()) {
                    return;
                }
            }

            if (options.prepared) {
                // header value is
                headers.push(`${key}: ${value}`);
                return;
            }

            switch (header.key) {
                case "Content-Disposition": {
                    structured = __.mimeFuncs.parseHeaderValue(value);
                    if (this.filename) {
                        structured.params.filename = this.filename;
                    }
                    value = __.mimeFuncs.buildHeaderValue(structured);
                    break;
                }
                case "Content-Type": {
                    structured = __.mimeFuncs.parseHeaderValue(value);

                    this._handleContentType(structured);

                    if (structured.value.match(/^text\/plain\b/) && is.string(this.content) && /[\u0080-\uFFFF]/.test(this.content)) {
                        structured.params.charset = "utf-8";
                    }

                    value = __.mimeFuncs.buildHeaderValue(structured);

                    if (this.filename) {
                        // add support for non-compliant clients like QQ webmail
                        // we can't build the value with buildHeaderValue as the value is non standard and
                        // would be converted to parameter continuation encoding that we do not want
                        param = this._encodeWords(this.filename);

                        if (param !== this.filename || /[\s'"\\;:\/=\(\),<>@\[\]\?]|^\-/.test(param)) {
                            // include value in quotes if needed
                            param = `"${param}"`;
                        }
                        value += `; name=${param}`;
                    }
                    break;
                }
                case "Bcc": {
                    if (!this.keepBcc) {
                        // skip BCC values
                        return;
                    }
                    break;
                }
            }

            value = this._encodeHeaderValue(key, value);

            // skip empty lines
            if (!(value || "").toString().trim()) {
                return;
            }

            headers.push(__.mimeFuncs.foldLines(`${key}: ${value}`, 76));
        });

        return headers.join("\r\n");
    }

    /**
     * Streams the rfc2822 message from the current node. If this is a root node,
     * mandatory header fields are set if missing (Date, Message-Id, MIME-Version)
     *
     * @return {String} Compiled message
     */
    createReadStream(options) {
        options = options || {};

        const stream = new PassThrough(options);
        let outputStream = stream;
        let transform;

        this.stream(stream, options, (err) => {
            if (err) {
                outputStream.emit("error", err);
                return;
            }
            stream.end();
        });

        const errcb = (err) => {
            transform.emit("error", err);
        };

        for (let i = 0, len = this._transforms.length; i < len; i++) {
            transform = is.function(this._transforms[i]) ? this._transforms[i]() : this._transforms[i];
            outputStream.once("error", errcb);
            outputStream = outputStream.pipe(transform);
        }

        // ensure terminating newline after possible user transforms
        transform = new adone.stream.LastNewline();
        outputStream.once("error", (err) => {
            transform.emit("error", err);
        });
        outputStream = outputStream.pipe(transform);

        // dkim and stuff
        for (let i = 0, len = this._processFuncs.length; i < len; i++) {
            transform = this._processFuncs[i];
            outputStream = transform(outputStream);
        }

        return outputStream;
    }

    /**
     * Appends a transform stream object to the transforms list. Final output
     * is passed through this stream before exposing
     *
     * @param {Object} transform Read-Write stream
     */
    transform(transform) {
        this._transforms.push(transform);
    }

    /**
     * Appends a post process function. The functon is run after transforms and
     * uses the following syntax
     *
     *   processFunc(input) -> outputStream
     *
     * @param {Object} processFunc Read-Write stream
     */
    processFunc(processFunc) {
        this._processFuncs.push(processFunc);
    }

    stream(outputStream, options, done) {
        const transferEncoding = this.getTransferEncoding();
        let contentStream;
        let localStream;

        // protect actual callback against multiple triggering
        let returned = false;
        const callback = (err) => {
            if (returned) {
                return;
            }
            returned = true;
            done(err);
        };

        // for multipart nodes, push child nodes
        // for content nodes end the stream
        const finalize = () => {
            let childId = 0;
            const processChildNode = () => {
                if (childId >= this.childNodes.length) {
                    outputStream.write(`\r\n--${this.boundary}--\r\n`);
                    return callback();
                }
                const child = this.childNodes[childId++];
                outputStream.write(`${childId > 1 ? "\r\n" : ""}--${this.boundary}\r\n`);
                child.stream(outputStream, options, (err) => {
                    if (err) {
                        return callback(err);
                    }
                    setImmediate(processChildNode);
                });
            };

            if (this.multipart) {
                setImmediate(processChildNode);
            } else {
                return callback();
            }
        };

        // pushes node content
        const sendContent = () => {
            if (this.content) {

                if (is.error(this.content)) {
                    // content is already errored
                    return callback(this.content);
                }

                if (is.stream(this.content)) {
                    this.content.removeListener("error", this._contentErrorHandler);
                    this._contentErrorHandler = (err) => callback(err);
                    this.content.once("error", this._contentErrorHandler);
                }

                const createStream = () => {

                    if (["quoted-printable", "base64"].includes(transferEncoding)) {
                        if (transferEncoding === "base64") {
                            contentStream = new adone.stream.base64.Encode(options);
                        } else {
                            contentStream = new __.qp.Encoder(options);
                        }

                        contentStream.pipe(outputStream, {
                            end: false
                        });
                        contentStream.once("end", finalize);
                        contentStream.once("error", (err) => callback(err));

                        localStream = this._getStream(this.content);
                        localStream.pipe(contentStream);
                    } else {
                        // anything that is not QP or Base54 passes as-is
                        localStream = this._getStream(this.content);
                        localStream.pipe(outputStream, {
                            end: false
                        });
                        localStream.once("end", finalize);
                    }

                    localStream.once("error", (err) => callback(err));
                };

                if (this.content._resolve) {
                    const chunks = [];
                    let chunklen = 0;
                    let returned = false;
                    const sourceStream = this._getStream(this.content);
                    sourceStream.on("error", (err) => {
                        if (returned) {
                            return;
                        }
                        returned = true;
                        callback(err);
                    });
                    sourceStream.on("readable", () => {
                        for ( ; ; ) {
                            const chunk = sourceStream.read();
                            if (is.null(chunk)) {
                                break;
                            }
                            chunks.push(chunk);
                            chunklen += chunk.length;
                        }
                    });
                    sourceStream.on("end", () => {
                        if (returned) {
                            return;
                        }
                        returned = true;
                        this.content._resolve = false;
                        this.content._resolvedValue = Buffer.concat(chunks, chunklen);
                        setImmediate(createStream);
                    });
                } else {
                    setImmediate(createStream);
                }

            } else {
                return setImmediate(finalize);
            }
        };

        if (this._raw) {
            setImmediate(() => {
                if (is.error(this._raw)) {
                    // content is already errored
                    return callback(this._raw);
                }

                // remove default error handler (if set)
                if (is.stream(this._raw)) {
                    this._raw.removeListener("error", this._contentErrorHandler);
                }

                const raw = this._getStream(this._raw);
                raw.pipe(outputStream, {
                    end: false
                });
                raw.on("error", (err) => outputStream.emit("error", err));
                raw.on("end", finalize);
            });
        } else {
            outputStream.write(`${this.buildHeaders()}\r\n\r\n`);
            setImmediate(sendContent);
        }
    }

    /**
     * Sets envelope to be used instead of the generated one
     *
     * @return {Object} SMTP envelope in the form of {from: 'from@example.com', to: ['to@example.com']}
     */
    setEnvelope(envelope) {
        let list;

        this._envelope = {
            from: false,
            to: []
        };

        if (envelope.from) {
            list = [];
            this._convertAddresses(this._parseAddresses(envelope.from), list);
            list = list.filter((address) => address && address.address);
            if (list.length && list[0]) {
                this._envelope.from = list[0].address;
            }
        }
        ["to", "cc", "bcc"].forEach((key) => {
            if (envelope[key]) {
                this._convertAddresses(this._parseAddresses(envelope[key]), this._envelope.to);
            }
        });

        this._envelope.to = this._envelope.to.map((to) => to.address).filter((address) => address);

        const standardFields = ["to", "cc", "bcc", "from"];
        Object.keys(envelope).forEach((key) => {
            if (!standardFields.includes(key)) {
                this._envelope[key] = envelope[key];
            }
        });

        return this;
    }

    /**
     * Generates and returns an object with parsed address fields
     *
     * @return {Object} Address object
     */
    getAddresses() {
        const addresses = {};

        this._headers.forEach((header) => {
            const key = header.key.toLowerCase();
            if (["from", "sender", "reply-to", "to", "cc", "bcc"].includes(key)) {
                if (!is.array(addresses[key])) {
                    addresses[key] = [];
                }

                this._convertAddresses(this._parseAddresses(header.value), addresses[key]);
            }
        });

        return addresses;
    }

    /**
     * Generates and returns SMTP envelope with the sender address and a list of recipients addresses
     *
     * @return {Object} SMTP envelope in the form of {from: 'from@example.com', to: ['to@example.com']}
     */
    getEnvelope() {
        if (this._envelope) {
            return this._envelope;
        }

        const envelope = {
            from: false,
            to: []
        };
        this._headers.forEach((header) => {
            const list = [];
            if (header.key === "From" || (!envelope.from && ["Reply-To", "Sender"].includes(header.key))) {
                this._convertAddresses(this._parseAddresses(header.value), list);
                if (list.length && list[0]) {
                    envelope.from = list[0].address;
                }
            } else if (["To", "Cc", "Bcc"].includes(header.key)) {
                this._convertAddresses(this._parseAddresses(header.value), envelope.to);
            }
        });

        envelope.to = envelope.to.map((to) => to.address);

        return envelope;
    }

    /**
     * Returns Message-Id value. If it does not exist, then creates one
     *
     * @return {String} Message-Id value
     */
    messageId() {
        let messageId = this.getHeader("Message-ID");
        // You really should define your own Message-Id field!
        if (!messageId) {
            messageId = this._generateMessageId();
            this.setHeader("Message-ID", messageId);
        }
        return messageId;
    }

    /**
     * Sets pregenerated content that will be used as the output of this node
     *
     * @param {String|Buffer|Stream} Raw MIME contents
     */
    setRaw(raw) {
        this._raw = raw;

        if (this._raw && is.stream(this._raw)) {
            // pre-stream handler. might be triggered if a stream is set as content
            // and 'error' fires before anything is done with this stream
            this._contentErrorHandler = (err) => {
                this._raw.removeListener("error", this._contentErrorHandler);
                this._raw = err;
            };
            this._raw.once("error", this._contentErrorHandler);
        }

        return this;
    }

    /////// PRIVATE METHODS

    /**
     * Detects and returns handle to a stream related with the content.
     *
     * @param {Mixed} content Node content
     * @returns {Object} Stream object
     */
    _getStream(content) {
        let contentStream;

        if (content._resolvedValue) {
            // pass string or buffer content as a stream
            contentStream = new PassThrough();
            setImmediate(() => contentStream.end(content._resolvedValue));
            return contentStream;
        } else if (is.stream(content)) {
            // assume as stream
            return content;
        } else if (content && is.string(content.path) && !content.href) {
            if (this.disableFileAccess) {
                contentStream = new PassThrough();
                setImmediate(() => contentStream.emit("error", new x.IllegalState(`File access rejected for ${content.path}`)));
                return contentStream;
            }
            // read file
            return fs.createReadStream(content.path);
        } else if (content && is.string(content.href)) {
            if (this.disableUrlAccess) {
                contentStream = new PassThrough();
                setImmediate(() => contentStream.emit("error", new x.IllegalState(`Url access rejected for ${content.href}`)));
                return contentStream;
            }
            // fetch URL
            return __.fetch(content.href);
        }
        // pass string or buffer content as a stream
        contentStream = new PassThrough();
        setImmediate(() => contentStream.end(content || ""));
        return contentStream;

    }

    /**
     * Parses addresses. Takes in a single address or an array or an
     * array of address arrays (eg. To: [[first group], [second group],...])
     *
     * @param {Mixed} addresses Addresses to be parsed
     * @return {Array} An array of address objects
     */
    _parseAddresses(addresses) {
        return [].concat.apply([], [].concat(addresses).map((address) => { // eslint-disable-line prefer-spread
            if (address && address.address) {
                address.address = this._normalizeAddress(address.address);
                address.name = address.name || "";
                return [address];
            }
            return __.addressparser(address);
        }));
    }

    /**
     * Normalizes a header key, uses Camel-Case form, except for uppercase MIME-
     *
     * @param {String} key Key to be normalized
     * @return {String} key in Camel-Case form
     */
    _normalizeHeaderKey(key) {
        return (key || "").toString().
            // no newlines in keys
            replace(/\r?\n|\r/g, " ").
            trim().toLowerCase().
            // use uppercase words, except MIME
            replace(/^X\-SMTPAPI$|^(MIME|DKIM)\b|^[a-z]|\-(SPF|FBL|ID|MD5)$|\-[a-z]/ig, (c) => c.toUpperCase()).
            // special case
            replace(/^Content\-Features$/i, "Content-features");
    }

    /**
     * Checks if the content type is multipart and defines boundary if needed.
     * Doesn't return anything, modifies object argument instead.
     *
     * @param {Object} structured Parsed header value for 'Content-Type' key
     */
    _handleContentType(structured) {
        this.contentType = structured.value.trim().toLowerCase();

        this.multipart = this.contentType.split("/").reduce((prev, value) => prev === "multipart" ? value : false);

        if (this.multipart) {
            this.boundary = structured.params.boundary = (
                structured.params.boundary ||
                this.boundary ||
                this._generateBoundary()
            );
        } else {
            this.boundary = false;
        }
    }

    /**
     * Generates a multipart boundary value
     *
     * @return {String} boundary value
     */
    _generateBoundary() {
        return `${this.rootNode.boundaryPrefix}-${this.rootNode.baseBoundary}-Part_${this._nodeId}`;
    }

    /**
     * Encodes a header value for use in the generated rfc2822 email.
     *
     * @param {String} key Header key
     * @param {String} value Header value
     */
    _encodeHeaderValue(key, value) {
        key = this._normalizeHeaderKey(key);

        switch (key) {

            // Structured headers
            case "From":
            case "Sender":
            case "To":
            case "Cc":
            case "Bcc":
            case "Reply-To": {
                return this._convertAddresses(this._parseAddresses(value));
            }
            // values enclosed in <>
            case "Message-ID":
            case "In-Reply-To":
            case "Content-Id": {
                value = (value || "").toString().replace(/\r?\n|\r/g, " ");

                if (value.charAt(0) !== "<") {
                    value = `<${value}`;
                }

                if (value.charAt(value.length - 1) !== ">") {
                    value = `${value}>`;
                }
                return value;
            }
            // space separated list of values enclosed in <>
            case "References": {
                value = [].concat.apply([], [].concat(value || "").map((elm) => { // eslint-disable-line prefer-spread
                    elm = (elm || "").toString().replace(/\r?\n|\r/g, " ").trim();
                    return elm.replace(/<[^>]*>/g, (str) => str.replace(/\s/g, "")).split(/\s+/);
                })).map((elm) => {
                    if (elm.charAt(0) !== "<") {
                        elm = `<${elm}`;
                    }
                    if (elm.charAt(elm.length - 1) !== ">") {
                        elm = `${elm}>`;
                    }
                    return elm;
                });

                return value.join(" ").trim();
            }
            case "Date": {
                if (is.date(value)) {
                    return value.toUTCString().replace(/GMT/, "+0000");
                }
                value = (value || "").toString().replace(/\r?\n|\r/g, " ");
                return this._encodeWords(value);
            }
            default: {
                value = (value || "").toString().replace(/\r?\n|\r/g, " ");
                // encodeWords only encodes if needed, otherwise the original string is returned
                return this._encodeWords(value);
            }
        }
    }

    /**
     * Rebuilds address object using punycode and other adjustments
     *
     * @param {Array} addresses An array of address objects
     * @param {Array} [uniqueList] An array to be populated with addresses
     * @return {String} address string
     */
    _convertAddresses(addresses, uniqueList) {
        const values = [];

        uniqueList = uniqueList || [];

        [].concat(addresses || []).forEach((address) => {
            if (address.address) {
                address.address = this._normalizeAddress(address.address);

                if (!address.name) {
                    values.push(address.address);
                } else if (address.name) {
                    values.push(`${this._encodeAddressName(address.name)} <${address.address}>`);
                }

                if (address.address) {
                    if (!uniqueList.filter((a) => a.address === address.address).length) {
                        uniqueList.push(address);
                    }
                }
            } else if (address.group) {
                values.push(`${this._encodeAddressName(address.name)}:${(address.group.length ? this._convertAddresses(address.group, uniqueList) : "").trim()};`);
            }
        });

        return values.join(", ");
    }

    /**
     * Normalizes an email address
     *
     * @param {Array} address An array of address objects
     * @return {String} address string
     */
    _normalizeAddress(address) {
        address = (address || "").toString().trim();

        const lastAt = address.lastIndexOf("@");
        const user = address.substr(0, lastAt);
        const domain = address.substr(lastAt + 1);

        // Usernames are not touched and are kept as is even if these include unicode
        // Domains are punycoded by default
        // 'jõgeva.ee' will be converted to 'xn--jgeva-dua.ee'
        // non-unicode domains are left as is

        return `${user}@${punycode.toASCII(domain.toLowerCase())}`;
    }

    /**
     * If needed, mime encodes the name part
     *
     * @param {String} name Name part of an address
     * @returns {String} Mime word encoded string if needed
     */
    _encodeAddressName(name) {
        if (!/^[\w ']*$/.test(name)) {
            if (/^[\x20-\x7e]*$/.test(name)) {
                return `"${name.replace(/([\\"])/g, "\\$1")}"`;
            }
            return __.mimeFuncs.encodeWord(name, this._getTextEncoding(name), 52);

        }
        return name;
    }

    /**
     * If needed, mime encodes the name part
     *
     * @param {String} name Name part of an address
     * @returns {String} Mime word encoded string if needed
     */
    _encodeWords(value) {
        return __.mimeFuncs.encodeWords(value, this._getTextEncoding(value), 52);
    }

    /**
     * Detects best mime encoding for a text value
     *
     * @param {String} value Value to check for
     * @return {String} either 'Q' or 'B'
     */
    _getTextEncoding(value) {
        value = (value || "").toString();

        let encoding = this.textEncoding;
        let latinLen;
        let nonLatinLen;

        if (!encoding) {
            // count latin alphabet symbols and 8-bit range symbols + control symbols
            // if there are more latin characters, then use quoted-printable
            // encoding, otherwise use base64
            nonLatinLen = (value.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\u0080-\uFFFF]/g) || []).length; // eslint-disable-line no-control-regex
            latinLen = (value.match(/[a-z]/gi) || []).length;
            // if there are more latin symbols than binary/unicode, then prefer Q, otherwise B
            encoding = nonLatinLen < latinLen ? "Q" : "B";
        }
        return encoding;
    }

    /**
     * Generates a message id
     *
     * @return {String} Random Message-ID value
     */
    _generateMessageId() {
        return `<${[2, 2, 2, 6].reduce(
            // crux to generate UUID-like random strings
            (prev, len) => `${prev}-${crypto.randomBytes(len).toString("hex")}`,
            crypto.randomBytes(4).toString("hex"))}@${
            // try to use the domain of the FROM address or fallback to server hostname
            (this.getEnvelope().from || this.hostname || os.hostname() || "localhost").split("@").pop()}>`;
    }
}