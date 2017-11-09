const {
    is,
    util,
    net: {
        mail: {
            __: {
                shared,
                MimeNode,
                mimeFuncs
            }
        }
    }
} = adone;

export default class MailMessage {
    constructor(mailer, data = {}) {
        this.mailer = mailer;
        this.data = {};
        this.message = null;

        const defaults = mailer._defaults || {};

        Object.assign(this.data, defaults, data);

        this.data.headers = Object.assign({}, defaults.headers, this.data.headers);

        const options = mailer.options || {};
        // force specific keys from transporter options
        for (const key of ["disableFileAccess", "disableUrlAccess"]) {
            if (key in options) {
                this.data[key] = options[key];
            }
        }
    }

    resolveContent(...args) {
        return shared.resolveContent(...args);
    }

    resolveAll(callback) {
        const keys = [
            [this.data, "html"],
            [this.data, "text"],
            [this.data, "watchHtml"],
            [this.data, "icalEvent"]
        ];

        if (this.data.alternatives && this.data.alternatives.length) {
            this.data.alternatives.forEach((alternative, i) => {
                keys.push([this.data.alternatives, i]);
            });
        }

        if (this.data.attachments && this.data.attachments.length) {
            this.data.attachments.forEach((attachment, i) => {
                if (!attachment.filename) {
                    attachment.filename =
                        (attachment.path || attachment.href || "")
                            .split("/")
                            .pop()
                            .split("?")
                            .shift() || `attachment-${i + 1}`;
                    if (!attachment.filename.includes(".")) {
                        attachment.filename += `.${mimeFuncs.detectExtension(attachment.contentType)}`;
                    }
                }

                if (!attachment.contentType) {
                    attachment.contentType = mimeFuncs.detectMimeType(attachment.filename || attachment.path || attachment.href || "bin");
                }

                keys.push([this.data.attachments, i]);
            });
        }

        const mimeNode = new MimeNode();

        for (const address of ["from", "to", "cc", "bcc", "sender", "replyTo"]) {
            let value;
            if (this.message) {
                value = [].concat(mimeNode._parseAddresses(this.message.getHeader(address === "replyTo" ? "reply-to" : address)) || []);
            } else if (this.data[address]) {
                value = [].concat(mimeNode._parseAddresses(this.data[address]) || []);
            }
            if (value && value.length) {
                this.data[address] = value;
            } else if (address in this.data) {
                this.data[address] = null;
            }
        }

        for (const address of ["from", "sender", "replyTo"]) {
            if (this.data[address]) {
                [this.data[address]] = this.data[address];
            }
        }

        let pos = 0;
        const resolveNext = () => {
            if (pos >= keys.length) {
                return callback(null, this.data);
            }
            const args = keys[pos++];
            if (!args[0] || !args[0][args[1]]) {
                return resolveNext();
            }
            shared.resolveContent(...args, (err, value) => {
                if (err) {
                    return callback(err);
                }
                const node = {
                    content: value
                };
                if (args[0][args[1]] && is.object(args[0][args[1]]) && !is.buffer(args[0][args[1]])) {
                    for (const key of util.keys(args[0][args[1]])) {
                        if (!(key in node) && !["content", "path", "href", "raw"].includes(key)) {
                            node[key] = args[0][args[1]][key];
                        }
                    }
                }

                args[0][args[1]] = node;
                resolveNext();
            });
        };

        setImmediate(() => resolveNext());
    }

    normalize(callback) {
        const envelope = this.data.envelope || this.message.getEnvelope();
        const messageId = this.message.messageId();

        this.resolveAll((err, data) => {
            if (err) {
                return callback(err);
            }

            data.envelope = envelope;
            data.messageId = messageId;

            ["html", "text", "watchHtml"].forEach((key) => {
                if (data[key] && data[key].content) {
                    if (is.string(data[key].content)) {
                        data[key] = data[key].content;
                    } else if (is.buffer(data[key].content)) {
                        data[key] = data[key].content.toString();
                    }
                }
            });

            if (data.icalEvent && is.buffer(data.icalEvent.content)) {
                data.icalEvent.content = data.icalEvent.content.toString("base64");
                data.icalEvent.encoding = "base64";
            }

            if (data.alternatives && data.alternatives.length) {
                data.alternatives.forEach((alternative) => {
                    if (alternative && alternative.content && is.buffer(alternative.content)) {
                        alternative.content = alternative.content.toString("base64");
                        alternative.encoding = "base64";
                    }
                });
            }

            if (data.attachments && data.attachments.length) {
                data.attachments.forEach((attachment) => {
                    if (attachment && attachment.content && is.buffer(attachment.content)) {
                        attachment.content = attachment.content.toString("base64");
                        attachment.encoding = "base64";
                    }
                });
            }

            data.normalizedHeaders = {};
            Object.keys(data.headers || {}).forEach((key) => {
                let value = [].concat(data.headers[key] || []).shift();
                value = (value && value.value) || value;
                if (value) {
                    if (["references", "in-reply-to", "message-id", "content-id"].includes(key)) {
                        value = this.message._encodeHeaderValue(key, value);
                    }
                    data.normalizedHeaders[key] = value;
                }
            });

            if (data.list && is.object(data.list)) {
                const listHeaders = this._getListHeaders(data.list);
                listHeaders.forEach((entry) => {
                    data.normalizedHeaders[entry.key] = entry.value.map((val) => (val && val.value) || val).join(", ");
                });
            }

            if (data.references) {
                data.normalizedHeaders.references = this.message._encodeHeaderValue("references", data.references);
            }

            if (data.inReplyTo) {
                data.normalizedHeaders["in-reply-to"] = this.message._encodeHeaderValue("in-reply-to", data.inReplyTo);
            }

            return callback(null, data);
        });
    }

    setMailerHeader() {
        if (!this.message || !this.data.xMailer) {
            return;
        }
        this.message.setHeader("X-Mailer", this.data.xMailer);
    }

    setPriorityHeaders() {
        if (!this.message || !this.data.priority) {
            return;
        }
        switch ((this.data.priority || "").toString().toLowerCase()) {
            case "high": {
                this.message.setHeader("X-Priority", "1 (Highest)");
                this.message.setHeader("X-MSMail-Priority", "High");
                this.message.setHeader("Importance", "High");
                break;
            }
            case "low": {
                this.message.setHeader("X-Priority", "5 (Lowest)");
                this.message.setHeader("X-MSMail-Priority", "Low");
                this.message.setHeader("Importance", "Low");
                break;
            }
            default:
                // do not add anything, since all messages are 'Normal' by default
        }
    }

    setListHeaders() {
        if (!this.message || !this.data.list || !is.object(this.data.list)) {
            return;
        }
        // add optional List-* headers
        if (this.data.list && is.object(this.data.list)) {
            for (const listHeader of this._getListHeaders(this.data.list)) {
                for (const value of listHeader) {
                    this.message.addHeader(listHeader.key, value);
                }
            }
        }
    }

    _getListHeaders(listData) {
        // make sure an url looks like <protocol:url>
        return util.keys(listData).map((key) => ({
            key: `list-${key.toLowerCase().trim()}`,
            value: util.arrify(listData[key] || []).map((value) => {
                if (is.string(value)) {
                    return this._formatListUrl(value);
                }
                return {
                    prepared: true,
                    value: util.arrify(value || []).map((value) => {
                        if (is.string(value)) {
                            return this._formatListUrl(value);
                        }
                        if (value && value.url) {
                            return this._formatListUrl(value.url) + (value.comment ? ` (${value.comment})` : "");
                        }
                        return "";
                    }).join(", ")
                };
            })
        }));
    }

    _formatListUrl(url) {
        url = url.replace(/[\s<]+|[\s>]+/g, "");
        if (/^(https?|mailto|ftp):/.test(url)) {
            return `<${url}>`;
        }
        if (/^[^@]+@[^@]+$/.test(url)) {
            return `<mailto:${url}>`;
        }

        return `<http://${url}>`;
    }

}
