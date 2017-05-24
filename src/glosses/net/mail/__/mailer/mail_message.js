const { is, util, net: { mail: { __: { shared, MimeNode } } } } = adone;

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
            this.data.attachments.forEach((alternative, i) => {
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
